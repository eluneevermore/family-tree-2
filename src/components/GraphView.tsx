import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { RefreshCcw, Search, X } from 'lucide-react';
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
import { buildTreeLayout } from '../domain/layout';
import { findMatchingPersonIds } from '../domain/visibility';
import { PERSON_NODE_HEIGHT } from '../constants';
import { suggestPeople } from '../services/suggestions';
import {
  FamilyTreeDocument,
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
  readonly locale: LocaleStrings;
  readonly nodeWidth: number;
  readonly selectedPersonId: string | null;
  readonly collapsedFamilyIds: ReadonlySet<string>;
  readonly collapsedPersonIds: ReadonlySet<string>;
  readonly onClearSelection: () => void;
  readonly onFocusPerson: (personId: string) => void;
  readonly onHoverPerson: (personId: string | null) => void;
  readonly onRevealPerson: (personId: string) => void;
  readonly onSelectPerson: (personId: string) => void;
  readonly onToggleFamily: (familyId: string) => void;
  readonly onTogglePerson: (personId: string) => void;
  readonly onAddChild: (person: PersonRecord) => void;
  readonly onAddParent: (person: PersonRecord) => void;
  readonly onAddSpouse: (person: PersonRecord) => void;
}

const nodeTypes = {
  person: PersonNode
};

interface NodePosition {
  readonly x: number;
  readonly y: number;
}

function GraphViewComponent(props: GraphViewProps): ReactElement {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}

export const GraphView = memo(GraphViewComponent, areGraphViewPropsEqual);

function GraphCanvas({
  document,
  focusPersonId,
  locale,
  nodeWidth,
  selectedPersonId,
  collapsedFamilyIds,
  collapsedPersonIds,
  onClearSelection,
  onFocusPerson,
  onHoverPerson,
  onRevealPerson,
  onSelectPerson,
  onToggleFamily,
  onTogglePerson,
  onAddChild,
  onAddParent,
  onAddSpouse
}: GraphViewProps): ReactElement {
  const [layout, setLayout] = useState<TreeLayout>({ people: [], families: [], edges: [] });
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const defaultNodePositionsRef = useRef<ReadonlyMap<string, NodePosition>>(new Map());
  const reactFlow = useReactFlow();
  const matchingPersonIds = useMemo(() => new Set(findMatchingPersonIds(document, searchQuery)), [document, searchQuery]);
  const searchSuggestions = useMemo(() => suggestPeople(document, searchQuery), [document, searchQuery]);
  const defaultNodes = useMemo(() => buildFlowNodes({
    layout,
    document,
    matchingPersonIds,
    selectedPersonId,
    locale,
    nodeWidth,
    onAddChild,
    onAddParent,
    onAddSpouse,
    onFocusPerson,
    onHoverPerson,
    onSelectPerson,
    onToggleFamily,
    onTogglePerson
  }), [
    document,
    layout,
    locale,
    matchingPersonIds,
    nodeWidth,
    onAddChild,
    onAddParent,
    onAddSpouse,
    onFocusPerson,
    onHoverPerson,
    onSelectPerson,
    onToggleFamily,
    onTogglePerson,
    selectedPersonId
  ]);

  useEffect(() => {
    let isCurrent = true;
    buildTreeLayout(document, collapsedFamilyIds, focusPersonId, collapsedPersonIds, nodeWidth).then((nextLayout) => {
      if (isCurrent) {
        setLayout(nextLayout);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [document, collapsedFamilyIds, collapsedPersonIds, focusPersonId, nodeWidth]);

  const focusPerson = useCallback((personId: string): void => {
    const node = reactFlow.getNode(personId);
    if (!node) {
      return;
    }

    reactFlow.setCenter(node.position.x + nodeWidth / 2, node.position.y + PERSON_NODE_HEIGHT / 2, {
      duration: 350,
      zoom: 1.15
    });
  }, [nodeWidth, reactFlow]);

  useEffect(() => {
    setNodes((currentNodes) => {
      return preserveCurrentPositions(defaultNodes, currentNodes, defaultNodePositionsRef.current);
    });
    defaultNodePositionsRef.current = mapNodePositions(defaultNodes);
  }, [defaultNodes, setNodes]);

  const rearrangeGraph = useCallback((): void => {
    if (!window.confirm(locale.confirmRearrangeGraph)) {
      return;
    }

    setNodes(defaultNodes);
    window.requestAnimationFrame(() => reactFlow.fitView({ padding: 0.2, duration: 250 }));
  }, [defaultNodes, locale.confirmRearrangeGraph, reactFlow, setNodes]);

  const selectSearchPerson = useCallback((person: PersonRecord): void => {
    setSearchQuery(person.name);
    setIsSearchFocused(false);
    onRevealPerson(person.id);
  }, [onRevealPerson]);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      setIsSearchFocused(false);
      return;
    }

    if ((event.key === 'Enter' || event.key === 'Tab') && searchSuggestions.length > 0) {
      event.preventDefault();
      selectSearchPerson(searchSuggestions[0]);
    }
  }

  function clearSearch(): void {
    setSearchQuery('');
    setIsSearchFocused(false);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  useEffect(() => {
    if (focusPersonId) {
      window.requestAnimationFrame(() => focusPerson(focusPersonId));
      return;
    }

    if (layout.people.length > 0) {
      window.requestAnimationFrame(() => reactFlow.fitView({ padding: 0.2, duration: 250 }));
    }
  }, [focusPerson, focusPersonId, layout.people.length, reactFlow]);

  const edges = useMemo(() => buildFlowEdges(layout), [layout]);

  return (
    <section className="graph-panel" aria-label="Family tree graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable
        onPaneClick={onClearSelection}
        onNodesChange={onNodesChange}
        fitView
        minZoom={0.15}
        maxZoom={2}
      >
        <Background color="#dbe3ef" gap={22} variant={BackgroundVariant.Dots} />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <div className="graph-search">
        <div className="graph-search-field">
          <Search size={16} />
          <input
            ref={searchInputRef}
            aria-label="Search people"
            onBlur={() => setIsSearchFocused(false)}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder={locale.searchPeople}
            value={searchQuery}
          />
          {searchQuery ? (
            <button
              aria-label={locale.clearSearch}
              className="graph-search-clear"
              onClick={clearSearch}
              onMouseDown={(event) => event.preventDefault()}
              title={locale.clearSearch}
              type="button"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        {isSearchFocused && searchSuggestions.length > 0 ? (
          <div className="search-suggestions" role="listbox" aria-label={locale.searchSuggestions}>
            {searchSuggestions.map((person) => (
              <button
                data-testid={`search-suggestion-${person.id}`}
                key={person.id}
                onClick={() => selectSearchPerson(person)}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                <span>{person.name}</span>
                <small>{person.id}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
    </section>
  );
}

function areGraphViewPropsEqual(previousProps: GraphViewProps, nextProps: GraphViewProps): boolean {
  return previousProps.document === nextProps.document
    && previousProps.focusPersonId === nextProps.focusPersonId
    && previousProps.locale === nextProps.locale
    && previousProps.nodeWidth === nextProps.nodeWidth
    && previousProps.selectedPersonId === nextProps.selectedPersonId
    && previousProps.collapsedFamilyIds === nextProps.collapsedFamilyIds
    && previousProps.collapsedPersonIds === nextProps.collapsedPersonIds;
}

interface BuildFlowNodesOptions {
  readonly layout: TreeLayout;
  readonly document: FamilyTreeDocument;
  readonly matchingPersonIds: ReadonlySet<string>;
  readonly selectedPersonId: string | null;
  readonly locale: LocaleStrings;
  readonly nodeWidth: number;
  readonly onAddChild: (person: PersonRecord) => void;
  readonly onAddParent: (person: PersonRecord) => void;
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
  nodeWidth,
  onAddChild,
  onAddParent,
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
      nodeWidth,
      spouses: buildSpouseSummaries(document, layoutNode.spouseShortcuts),
      personToggle: buildPersonToggleSummary(layoutNode.childLineToggle),
      isSearchMatch: matchingPersonIds.has(layoutNode.id),
      isSelected: selectedPersonId === layoutNode.id,
      locale,
      onAddChild,
      onAddParent,
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

function preserveCurrentPositions(
  defaultNodes: readonly Node[],
  currentNodes: readonly Node[],
  previousDefaultPositions: ReadonlyMap<string, NodePosition>
): Node[] {
  const currentPositions = new Map(currentNodes.map((node) => [node.id, node.position]));
  return defaultNodes.map((node) => {
    const currentPosition = currentPositions.get(node.id);
    const previousDefaultPosition = previousDefaultPositions.get(node.id);
    if (!currentPosition || hasDefaultPositionChanged(node.position, previousDefaultPosition)) {
      return node;
    }

    return { ...node, position: currentPosition };
  });
}

function hasDefaultPositionChanged(
  nextPosition: NodePosition,
  previousPosition: NodePosition | undefined
): boolean {
  return !previousPosition || previousPosition.x !== nextPosition.x || previousPosition.y !== nextPosition.y;
}

function mapNodePositions(nodes: readonly Node[]): ReadonlyMap<string, NodePosition> {
  return new Map(nodes.map((node) => [node.id, node.position]));
}
