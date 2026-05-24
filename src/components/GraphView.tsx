import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { RefreshCcw } from 'lucide-react';
import {
  Background,
  BackgroundVariant,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow
} from '@xyflow/react';
import { describeKinship } from '../domain/kinship';
import { buildTreeLayout } from '../domain/layout';
import { findMatchingPersonIds } from '../domain/visibility';
import { PERSON_NODE_HEIGHT, PERSON_NODE_WIDTH } from '../constants';
import {
  FamilyTreeDocument,
  Language,
  LayoutPersonToggle,
  LayoutSpouseShortcut,
  PersonRecord,
  TreeLayout
} from '../types';
import { LocaleStrings } from '../locales';
import { PersonToggleSummary, PersonNode, PersonNodeData, SpouseSummary } from './PersonNode';

interface GraphViewProps {
  readonly document: FamilyTreeDocument;
  readonly focusPersonId: string | null;
  readonly language: Language;
  readonly locale: LocaleStrings;
  readonly searchQuery: string;
  readonly collapsedFamilyIds: ReadonlySet<string>;
  readonly collapsedPersonIds: ReadonlySet<string>;
  readonly onFocusPerson: (personId: string) => void;
  readonly onToggleFamily: (familyId: string) => void;
  readonly onTogglePerson: (personId: string) => void;
  readonly onAddChild: (person: PersonRecord) => void;
  readonly onAddSpouse: (person: PersonRecord) => void;
}

const nodeTypes = {
  person: PersonNode
};

export function GraphView(props: GraphViewProps): ReactElement {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}

function GraphCanvas({
  document,
  focusPersonId,
  language,
  locale,
  searchQuery,
  collapsedFamilyIds,
  collapsedPersonIds,
  onFocusPerson,
  onToggleFamily,
  onTogglePerson,
  onAddChild,
  onAddSpouse
}: GraphViewProps): ReactElement {
  const [layout, setLayout] = useState<TreeLayout>({ people: [], families: [], edges: [] });
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const reactFlow = useReactFlow();
  const matchingPersonIds = useMemo(() => new Set(findMatchingPersonIds(document, searchQuery)), [document, searchQuery]);
  const kinship = useMemo(() => {
    return describeKinship(document, selectedPersonId, hoveredPersonId, language);
  }, [document, hoveredPersonId, language, selectedPersonId]);
  const defaultNodes = useMemo(() => buildFlowNodes({
    layout,
    document,
    matchingPersonIds,
    selectedPersonId,
    locale,
    onAddChild,
    onAddSpouse,
    onFocusPerson,
    onHoverPerson: setHoveredPersonId,
    onSelectPerson: setSelectedPersonId,
    onToggleFamily,
    onTogglePerson
  }), [
    document,
    layout,
    locale,
    matchingPersonIds,
    onAddChild,
    onAddSpouse,
    onFocusPerson,
    onToggleFamily,
    onTogglePerson,
    selectedPersonId
  ]);

  useEffect(() => {
    let isCurrent = true;
    buildTreeLayout(document, collapsedFamilyIds, focusPersonId, collapsedPersonIds).then((nextLayout) => {
      if (isCurrent) {
        setLayout(nextLayout);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [document, collapsedFamilyIds, collapsedPersonIds, focusPersonId]);

  const focusPerson = useCallback((personId: string): void => {
    const node = reactFlow.getNode(personId);
    if (!node) {
      return;
    }

    reactFlow.setCenter(node.position.x + PERSON_NODE_WIDTH / 2, node.position.y + PERSON_NODE_HEIGHT / 2, {
      duration: 350,
      zoom: 1.15
    });
  }, [reactFlow]);

  useEffect(() => {
    setNodes((currentNodes) => preserveCurrentPositions(defaultNodes, currentNodes));
  }, [defaultNodes, setNodes]);

  const rearrangeGraph = useCallback((): void => {
    if (!window.confirm(locale.confirmRearrangeGraph)) {
      return;
    }

    setNodes(defaultNodes);
    window.requestAnimationFrame(() => reactFlow.fitView({ padding: 0.2, duration: 250 }));
  }, [defaultNodes, locale.confirmRearrangeGraph, reactFlow, setNodes]);

  useEffect(() => {
    const firstMatch = Array.from(matchingPersonIds)[0];
    if (firstMatch) {
      window.requestAnimationFrame(() => focusPerson(firstMatch));
      return;
    }

    if (layout.people.length > 0) {
      window.requestAnimationFrame(() => reactFlow.fitView({ padding: 0.2, duration: 250 }));
    }
  }, [focusPerson, layout.people.length, matchingPersonIds, reactFlow]);

  const edges = useMemo(() => buildFlowEdges(layout), [layout]);

  return (
    <section className="graph-panel" aria-label="Family tree graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable
        onNodesChange={onNodesChange}
        fitView
        minZoom={0.15}
        maxZoom={2}
      >
        <Background color="#dbe3ef" gap={22} variant={BackgroundVariant.Dots} />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <button
        aria-label={locale.rearrangeGraph}
        className="graph-rearrange-button"
        onClick={rearrangeGraph}
        title={locale.rearrangeGraph}
        type="button"
      >
        <RefreshCcw size={15} />
        <span>{locale.rearrangeGraph}</span>
      </button>
      {kinship ? (
        <div className="kinship-card" role="status" aria-label="Kinship">
          <div className="kinship-title">{locale.relationship}</div>
          <p>
            <strong>{document.people.get(kinship.selectedPersonId)?.name}</strong>
            {' '}
            {locale.calls}
            {' '}
            <strong>{document.people.get(kinship.hoveredPersonId)?.name}</strong>
            {': '}
            <span>{kinship.selectedToHovered}</span>
          </p>
          <p>
            <strong>{document.people.get(kinship.hoveredPersonId)?.name}</strong>
            {' '}
            {locale.calls}
            {' '}
            <strong>{document.people.get(kinship.selectedPersonId)?.name}</strong>
            {': '}
            <span>{kinship.hoveredToSelected}</span>
          </p>
        </div>
      ) : selectedPersonId ? (
        <div className="kinship-card kinship-card-muted" role="status">
          {locale.relationshipHint}
        </div>
      ) : null}
    </section>
  );
}

interface BuildFlowNodesOptions {
  readonly layout: TreeLayout;
  readonly document: FamilyTreeDocument;
  readonly matchingPersonIds: ReadonlySet<string>;
  readonly selectedPersonId: string | null;
  readonly locale: LocaleStrings;
  readonly onAddChild: (person: PersonRecord) => void;
  readonly onAddSpouse: (person: PersonRecord) => void;
  readonly onFocusPerson: (personId: string) => void;
  readonly onHoverPerson: (personId: string | null) => void;
  readonly onSelectPerson: (personId: string) => void;
  readonly onToggleFamily: (familyId: string) => void;
  readonly onTogglePerson: (personId: string) => void;
}

function buildFlowNodes({
  layout,
  document,
  matchingPersonIds,
  selectedPersonId,
  locale,
  onAddChild,
  onAddSpouse,
  onFocusPerson,
  onHoverPerson,
  onSelectPerson,
  onToggleFamily,
  onTogglePerson
}: BuildFlowNodesOptions): Node[] {
  const personNodes = layout.people.map<Node<PersonNodeData>>((layoutNode) => ({
    id: layoutNode.id,
    type: 'person',
    position: { x: layoutNode.x, y: layoutNode.y },
    zIndex: 5,
    data: {
      person: layoutNode.person,
      spouses: buildSpouseSummaries(document, layoutNode.spouseShortcuts),
      personToggle: buildPersonToggleSummary(layoutNode.childLineToggle),
      isSearchMatch: matchingPersonIds.has(layoutNode.id),
      isSelected: selectedPersonId === layoutNode.id,
      locale,
      onAddChild,
      onAddSpouse,
      onFocusPerson,
      onHoverPerson,
      onSelectPerson,
      onToggleFamily,
      onTogglePerson
    }
  }));

  return personNodes;
}

function buildSpouseSummaries(
  document: FamilyTreeDocument,
  spouseShortcuts: readonly LayoutSpouseShortcut[]
): readonly SpouseSummary[] {
  return spouseShortcuts.flatMap((shortcut) => {
    const spouse = document.people.get(shortcut.personId);
    return spouse ? [{
      id: spouse.id,
      name: spouse.name,
      familyId: shortcut.family.id,
      parentIds: shortcut.family.parents,
      hasChildren: shortcut.family.children.length > 0,
      isChecked: shortcut.isChecked
    }] : [];
  });
}

function buildPersonToggleSummary(personToggle: LayoutPersonToggle | undefined): PersonToggleSummary | undefined {
  return personToggle
    ? {
        personId: personToggle.personId,
        isCollapsed: personToggle.isCollapsed
      }
    : undefined;
}

function buildFlowEdges(layout: TreeLayout): Edge[] {
  return layout.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type === 'marriage' ? 'straight' : 'smoothstep',
    interactionWidth: 4,
    markerEnd: edge.type === 'child'
      ? { type: MarkerType.ArrowClosed, color: '#2563eb', width: 18, height: 18 }
      : undefined,
    style: edge.type === 'marriage'
      ? { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '7 8', opacity: 0.55 }
      : { stroke: '#2563eb', strokeWidth: 2 }
  }));
}

function preserveCurrentPositions(defaultNodes: readonly Node[], currentNodes: readonly Node[]): Node[] {
  const currentPositions = new Map(currentNodes.map((node) => [node.id, node.position]));
  return defaultNodes.map((node) => {
    const currentPosition = currentPositions.get(node.id);
    return currentPosition ? { ...node, position: currentPosition } : node;
  });
}
