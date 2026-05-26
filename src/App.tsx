import { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Columns2, Download, GitBranch, PanelLeftClose, PanelLeftOpen, Upload } from 'lucide-react';
import { TextEditor } from './components/TextEditor';
import { GraphView } from './components/GraphView';
import { EditModal, type EditMode } from './components/EditModal';
import {
  DEFAULT_TREE_TEXT,
  EXPORT_FILE_NAME,
  MAX_PERSON_NODE_WIDTH,
  MIN_PERSON_NODE_WIDTH,
  NEW_TREE_TEXT,
  PERSON_NODE_WIDTH_STEP,
  STORAGE_LANGUAGE_KEY,
  STORAGE_VIEW_MODE_KEY
} from './constants';
import { describeKinship } from './domain/kinship';
import { findAncestorFamilyIds, findInitialFocusPersonId } from './domain/visibility';
import { locales, type LocaleStrings } from './locales';
import { applyFamilyTreeEdit } from './services/editor';
import { FamilyTreeSummary, FamilyTreeStore, LocalStorageFamilyTreeStore } from './services/family-tree-store';
import { importLegacyFamilyText, looksLikeLegacyFamilyText } from './services/legacy-importer';
import { parseFamilyTreeText } from './services/parser';
import {
  clampPersonNodeWidth,
  LocalStorageSiteConfigurationStore
} from './services/site-configuration-store';
import { FamilyTreeDocument, FamilyTreeEdit, KinshipResult, Language, PersonRecord } from './types';

type ViewMode = 'both' | 'text' | 'graph';
type TextUpdate = string | ((currentText: string) => string);

interface PendingEdit {
  readonly mode: EditMode;
  readonly person: PersonRecord;
}

interface GraphViewState {
  readonly id: string;
  readonly focusPersonId: string | null;
  readonly collapsedFamilyIds: ReadonlySet<string>;
  readonly collapsedPersonIds: ReadonlySet<string>;
}

interface FamilyTreeAppState {
  readonly activeTreeId: string;
  readonly trees: readonly FamilyTreeSummary[];
  readonly text: string;
}

const PRIMARY_GRAPH_ID = 'graph-1';
const SECONDARY_GRAPH_ID = 'graph-2';
const CREATE_TREE_OPTION_VALUE = '__create_tree__';
const KINSHIP_STATUS_LABEL = 'Kinship';
const DEFAULT_TEXT_PANEL_WIDTH = 460;
const MIN_TEXT_PANEL_WIDTH = 320;
const MAX_TEXT_PANEL_WIDTH = 760;
const MIN_GRAPH_WORKSPACE_WIDTH = 420;

type WorkspaceStyle = CSSProperties & {
  readonly '--text-panel-width'?: string;
};

function App(): ReactElement {
  const familyTreeStore = useMemo(() => new LocalStorageFamilyTreeStore(localStorage), []);
  const siteConfigurationStore = useMemo(() => new LocalStorageSiteConfigurationStore(localStorage), []);
  const [familyTreeState, setFamilyTreeState] = useState(() => readInitialFamilyTreeState(familyTreeStore));
  const [siteConfiguration, setSiteConfiguration] = useState(() => siteConfigurationStore.read());
  const [viewMode, setViewMode] = useState<ViewMode>(() => readViewMode());
  const [language, setLanguage] = useState<Language>(() => readLanguage());
  const [graphViews, setGraphViews] = useState<readonly GraphViewState[]>(() => [createGraphViewState(PRIMARY_GRAPH_ID, null)]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [textPanelWidth, setTextPanelWidth] = useState(DEFAULT_TEXT_PANEL_WIDTH);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const text = familyTreeState.text;
  const nodeWidth = siteConfiguration.personNodeWidth;
  const document = useMemo(() => parseFamilyTreeText(text), [text]);
  const locale = locales[language];
  const hasSplitGraphView = graphViews.length > 1;
  const kinship = useMemo(() => {
    return describeKinship(document, selectedPersonId, hoveredPersonId, language);
  }, [document, hoveredPersonId, language, selectedPersonId]);

  useEffect(() => {
    familyTreeStore.saveTreeText(familyTreeState.activeTreeId, familyTreeState.text);
  }, [familyTreeState.activeTreeId, familyTreeState.text, familyTreeStore]);

  useEffect(() => {
    siteConfigurationStore.save(siteConfiguration);
  }, [siteConfiguration, siteConfigurationStore]);

  useEffect(() => {
    localStorage.setItem(STORAGE_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    setGraphViews((currentViews) => {
      const fallbackPersonId = findInitialFocusPersonId(document);
      return currentViews.map((graphView) => {
        if (graphView.focusPersonId && document.people.has(graphView.focusPersonId)) {
          return graphView;
        }

        return { ...graphView, focusPersonId: fallbackPersonId };
      });
    });
  }, [document]);

  useEffect(() => {
    if (selectedPersonId && !document.people.has(selectedPersonId)) {
      setSelectedPersonId(null);
    }

    if (hoveredPersonId && !document.people.has(hoveredPersonId)) {
      setHoveredPersonId(null);
    }
  }, [document, hoveredPersonId, selectedPersonId]);

  const updateGraphView = useCallback((
    graphViewId: string,
    update: (graphView: GraphViewState) => GraphViewState
  ): void => {
    setGraphViews((currentViews) => currentViews.map((graphView) => {
      return graphView.id === graphViewId ? update(graphView) : graphView;
    }));
  }, []);

  const updateText = useCallback((update: TextUpdate): void => {
    setFamilyTreeState((currentState) => ({
      ...currentState,
      text: typeof update === 'function' ? update(currentState.text) : update
    }));
  }, []);

  const handleToggleFamily = useCallback((graphViewId: string, familyId: string): void => {
    updateGraphView(graphViewId, (graphView) => ({
      ...graphView,
      collapsedFamilyIds: toggleId(graphView.collapsedFamilyIds, familyId)
    }));
  }, [updateGraphView]);

  const handleTogglePerson = useCallback((graphViewId: string, personId: string): void => {
    updateGraphView(graphViewId, (graphView) => ({
      ...graphView,
      collapsedPersonIds: toggleId(graphView.collapsedPersonIds, personId)
    }));
  }, [updateGraphView]);

  const handleSubmitEdit = useCallback((edit: FamilyTreeEdit): void => {
    updateText((currentText) => applyFamilyTreeEdit(currentText, edit));
    setPendingEdit(null);
  }, [updateText]);

  const handleFocusPerson = useCallback((graphViewId: string, personId: string): void => {
    updateGraphView(graphViewId, (graphView) => ({ ...graphView, focusPersonId: personId }));
  }, [updateGraphView]);

  const handleRevealPerson = useCallback((graphViewId: string, personId: string): void => {
    const ancestors = findAncestorFamilyIds(document, personId);
    updateGraphView(graphViewId, (graphView) => ({
      ...graphView,
      focusPersonId: personId,
      collapsedFamilyIds: removeIds(graphView.collapsedFamilyIds, ancestors),
      collapsedPersonIds: removeIds(graphView.collapsedPersonIds, collectParentIds(document, ancestors))
    }));
  }, [document, updateGraphView]);

  const handleClearGraphSelection = useCallback((): void => {
    setSelectedPersonId(null);
    setHoveredPersonId(null);
  }, []);

  const handleSelectPerson = useCallback((personId: string): void => {
    setSelectedPersonId(personId);
  }, []);

  const handleHoverPerson = useCallback((personId: string | null): void => {
    setHoveredPersonId(personId);
  }, []);

  const handleToggleGraphSplit = useCallback((): void => {
    setGraphViews((currentViews) => {
      const primaryGraphView = currentViews[0] ?? createGraphViewState(PRIMARY_GRAPH_ID, findInitialFocusPersonId(document));
      if (currentViews.length > 1) {
        return [primaryGraphView];
      }

      return [
        primaryGraphView,
        createGraphViewState(
          SECONDARY_GRAPH_ID,
          primaryGraphView.focusPersonId ?? findInitialFocusPersonId(document),
          primaryGraphView
        )
      ];
    });
  }, [document]);

  const resetGraphContext = useCallback((focusPersonId: string | null): void => {
    setGraphViews([createGraphViewState(PRIMARY_GRAPH_ID, focusPersonId)]);
    setSelectedPersonId(null);
    setHoveredPersonId(null);
  }, []);

  const handleFamilyTreeSelection = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    const selectedTreeId = event.target.value;
    if (selectedTreeId === CREATE_TREE_OPTION_VALUE) {
      event.target.value = familyTreeState.activeTreeId;
      const name = window.prompt(locale.newFamilyTreeName)?.trim();
      if (!name) {
        return;
      }

      const tree = familyTreeStore.createTree(name, NEW_TREE_TEXT);
      setFamilyTreeState({
        activeTreeId: tree.id,
        trees: familyTreeStore.listTrees(),
        text: tree.text
      });
      resetGraphContext(null);
      return;
    }

    const tree = familyTreeStore.readTree(selectedTreeId);
    if (!tree) {
      return;
    }

    familyTreeStore.setActiveTreeId(tree.id);
    setFamilyTreeState({
      activeTreeId: tree.id,
      trees: familyTreeStore.listTrees(),
      text: tree.text
    });
    resetGraphContext(null);
  }, [familyTreeState.activeTreeId, familyTreeStore, locale.newFamilyTreeName, resetGraphContext]);

  const handleNodeWidthChange = useCallback((nextWidth: number): void => {
    setSiteConfiguration((currentConfiguration) => ({
      ...currentConfiguration,
      personNodeWidth: clampPersonNodeWidth(nextWidth)
    }));
  }, []);

  const handleEditorResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    if (viewMode !== 'both') {
      return;
    }

    event.preventDefault();
    const startClientX = getFiniteClientX(event.clientX, 0);
    const startWidth = textPanelWidth;
    const body = documentGlobal().body;
    body.style.cursor = 'col-resize';
    body.style.userSelect = 'none';

    function stopResize(): void {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      body.style.cursor = '';
      body.style.userSelect = '';
    }

    function resize(moveEvent: PointerEvent): void {
      setTextPanelWidth(clampTextPanelWidth(startWidth + getFiniteClientX(moveEvent.clientX, startClientX) - startClientX));
    }

    window.addEventListener('pointermove', resize);
    window.addEventListener('pointerup', stopResize, { once: true });
    window.addEventListener('pointercancel', stopResize, { once: true });
  }, [textPanelWidth, viewMode]);

  function handleDownload(): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = documentGlobal().createElement('a');
    anchor.href = url;
    anchor.download = EXPORT_FILE_NAME;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      updateText(looksLikeLegacyFamilyText(result) ? importLegacyFamilyText(result) : result);
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  const appClassName = `app-shell view-${viewMode}`;
  const workspaceStyle: WorkspaceStyle | undefined = viewMode === 'both'
    ? { '--text-panel-width': `${textPanelWidth}px` }
    : undefined;
  return (
    <div className={appClassName}>
      <header className="app-header">
        <div className="brand">
          <GitBranch size={20} />
          <h1>{locale.appTitle}</h1>
          <select
            aria-label={locale.familyTree}
            className="tree-select"
            onChange={handleFamilyTreeSelection}
            value={familyTreeState.activeTreeId}
          >
            {familyTreeState.trees.map((tree) => (
              <option key={tree.id} value={tree.id}>{tree.name}</option>
            ))}
            <option value={CREATE_TREE_OPTION_VALUE}>{locale.createFamilyTree}</option>
          </select>
        </div>

        <div className="view-switcher" aria-label={locale.viewMode}>
          {(['both', 'text', 'graph'] as const).map((mode) => (
            <button
              className={viewMode === mode ? 'view-active' : ''}
              key={mode}
              onClick={() => setViewMode(mode)}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="header-actions">
          <select
            aria-label="Language"
            className="language-select"
            onChange={(event) => setLanguage(event.target.value as Language)}
            value={language}
          >
            <option value="en">English</option>
            <option value="vi">Tiếng Việt (Miền bắc)</option>
          </select>
          <button className="toolbar-button" onClick={() => fileInputRef.current?.click()} type="button" title={locale.import}>
            <Upload size={17} />
          </button>
          <button className="toolbar-button" onClick={handleDownload} type="button" title={locale.export}>
            <Download size={17} />
          </button>
          {viewMode !== 'text' ? (
            <button
              aria-label={hasSplitGraphView ? locale.closeSplitGraphView : locale.splitGraphView}
              className="toolbar-button"
              onClick={handleToggleGraphSplit}
              type="button"
              title={hasSplitGraphView ? locale.closeSplitGraphView : locale.splitGraphView}
            >
              <Columns2 size={17} />
            </button>
          ) : null}
          <button
            className="toolbar-button"
            onClick={() => setViewMode(viewMode === 'both' ? 'graph' : 'both')}
            type="button"
            title={locale.toggleSplitView}
          >
            {viewMode === 'both' ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
          <input ref={fileInputRef} className="hidden-input" type="file" accept=".txt,.family,.family.txt,.md" onChange={handleUpload} />
        </div>
      </header>

      <main className="workspace" data-testid="workspace" style={workspaceStyle}>
        {viewMode !== 'graph' ? (
          <TextEditor diagnostics={document.diagnostics} document={document} locale={locale} text={text} onTextChange={updateText} />
        ) : null}

        {viewMode === 'both' ? (
          <div
            aria-label={locale.resizeEditor}
            aria-orientation="vertical"
            className="editor-resize-handle"
            onPointerDown={handleEditorResizeStart}
            role="separator"
            tabIndex={0}
          />
        ) : null}

        {viewMode !== 'text' ? (
          <div className="graph-workspace" data-testid="graph-workspace">
            <div className={hasSplitGraphView ? 'graph-views graph-views-two' : 'graph-views graph-views-one'}>
              {graphViews.map((graphView) => (
                <div className="graph-view-frame" data-testid={`graph-view-${graphView.id}`} key={graphView.id}>
                  <GraphView
                    collapsedFamilyIds={graphView.collapsedFamilyIds}
                    collapsedPersonIds={graphView.collapsedPersonIds}
                    document={document}
                    focusPersonId={graphView.focusPersonId}
                    locale={locale}
                    nodeWidth={nodeWidth}
                    selectedPersonId={selectedPersonId}
                    onAddChild={(person) => setPendingEdit({ mode: 'add-child', person })}
                    onAddParent={(person) => setPendingEdit({ mode: 'add-parent', person })}
                    onAddSpouse={(person) => setPendingEdit({ mode: 'add-spouse', person })}
                    onClearSelection={handleClearGraphSelection}
                    onFocusPerson={(personId) => handleFocusPerson(graphView.id, personId)}
                    onHoverPerson={handleHoverPerson}
                    onRevealPerson={(personId) => handleRevealPerson(graphView.id, personId)}
                    onSelectPerson={handleSelectPerson}
                    onToggleFamily={(familyId) => handleToggleFamily(graphView.id, familyId)}
                    onTogglePerson={(personId) => handleTogglePerson(graphView.id, personId)}
                  />
                </div>
              ))}
            </div>
            <KinshipFooter
              document={document}
              kinship={kinship}
              locale={locale}
              nodeWidth={nodeWidth}
              onNodeWidthChange={handleNodeWidthChange}
            />
          </div>
        ) : null}
      </main>

      {pendingEdit ? (
        <EditModal
          document={document}
          locale={locale}
          mode={pendingEdit.mode}
          onClose={() => setPendingEdit(null)}
          onSubmitEdit={handleSubmitEdit}
          person={pendingEdit.person}
        />
      ) : null}
    </div>
  );
}

function readViewMode(): ViewMode {
  const storedValue = localStorage.getItem(STORAGE_VIEW_MODE_KEY);
  return storedValue === 'text' || storedValue === 'graph' || storedValue === 'both' ? storedValue : 'both';
}

function readLanguage(): Language {
  const queryLanguage = new URLSearchParams(window.location.search).get('lang')
    ?? new URLSearchParams(window.location.search).get('language');
  if (queryLanguage === 'en' || queryLanguage === 'vi') {
    return queryLanguage;
  }

  const storedValue = localStorage.getItem(STORAGE_LANGUAGE_KEY);
  return storedValue === 'vi' ? 'vi' : 'en';
}

function readInitialFamilyTreeState(familyTreeStore: FamilyTreeStore): FamilyTreeAppState {
  const activeTree = familyTreeStore.ensureReady(DEFAULT_TREE_TEXT);
  return {
    activeTreeId: activeTree.id,
    trees: familyTreeStore.listTrees(),
    text: activeTree.text
  };
}

function createGraphViewState(
  id: string,
  focusPersonId: string | null,
  sourceGraphView?: GraphViewState
): GraphViewState {
  return {
    id,
    focusPersonId,
    collapsedFamilyIds: sourceGraphView ? new Set(sourceGraphView.collapsedFamilyIds) : new Set(),
    collapsedPersonIds: sourceGraphView ? new Set(sourceGraphView.collapsedPersonIds) : new Set()
  };
}

function clampTextPanelWidth(width: number): number {
  const maxWidth = Math.max(MIN_TEXT_PANEL_WIDTH, Math.min(MAX_TEXT_PANEL_WIDTH, window.innerWidth - MIN_GRAPH_WORKSPACE_WIDTH));
  return Math.min(Math.max(width, MIN_TEXT_PANEL_WIDTH), maxWidth);
}

function getFiniteClientX(clientX: number, fallbackClientX: number): number {
  return Number.isFinite(clientX) ? clientX : fallbackClientX;
}

interface KinshipFooterProps {
  readonly document: FamilyTreeDocument;
  readonly kinship: KinshipResult | null;
  readonly locale: LocaleStrings;
  readonly nodeWidth: number;
  readonly onNodeWidthChange: (width: number) => void;
}

function KinshipFooter({
  document,
  kinship,
  locale,
  nodeWidth,
  onNodeWidthChange
}: KinshipFooterProps): ReactElement | null {
  if (kinship) {
    return (
      <footer className="kinship-footer" role="status" aria-label={KINSHIP_STATUS_LABEL}>
        <div className="kinship-footer-body">
          <div className="kinship-footer-title">{locale.relationship}</div>
          <KinshipFooterLine
            label={kinship.selectedToHovered}
            locale={locale}
            sourceName={document.people.get(kinship.selectedPersonId)?.name}
            targetName={document.people.get(kinship.hoveredPersonId)?.name}
          />
          <KinshipFooterLine
            label={kinship.hoveredToSelected}
            locale={locale}
            sourceName={document.people.get(kinship.hoveredPersonId)?.name}
            targetName={document.people.get(kinship.selectedPersonId)?.name}
          />
        </div>
        <NodeWidthControl locale={locale} nodeWidth={nodeWidth} onNodeWidthChange={onNodeWidthChange} />
      </footer>
    );
  }

  return (
    <footer className="kinship-footer kinship-footer-muted" role="status" aria-label={KINSHIP_STATUS_LABEL}>
      <div className="kinship-footer-body">{locale.relationshipHint}</div>
      <NodeWidthControl locale={locale} nodeWidth={nodeWidth} onNodeWidthChange={onNodeWidthChange} />
    </footer>
  );
}

interface NodeWidthControlProps {
  readonly locale: LocaleStrings;
  readonly nodeWidth: number;
  readonly onNodeWidthChange: (width: number) => void;
}

function NodeWidthControl({
  locale,
  nodeWidth,
  onNodeWidthChange
}: NodeWidthControlProps): ReactElement {
  return (
    <label className="node-width-control">
      <span>{locale.nodeWidth}</span>
      <input
        aria-label={locale.nodeWidth}
        max={MAX_PERSON_NODE_WIDTH}
        min={MIN_PERSON_NODE_WIDTH}
        onChange={(event) => onNodeWidthChange(Number(event.target.value))}
        step={PERSON_NODE_WIDTH_STEP}
        type="number"
        value={nodeWidth}
      />
    </label>
  );
}

interface KinshipFooterLineProps {
  readonly label: string;
  readonly locale: LocaleStrings;
  readonly sourceName: string | undefined;
  readonly targetName: string | undefined;
}

function KinshipFooterLine({
  label,
  locale,
  sourceName,
  targetName
}: KinshipFooterLineProps): ReactElement {
  return (
    <p>
      <strong>{sourceName ?? locale.unknown}</strong>
      {' '}
      {locale.calls}
      {' '}
      <strong>{targetName ?? locale.unknown}</strong>
      {': '}
      <span>{label}</span>
    </p>
  );
}

function removeIds(sourceIds: ReadonlySet<string>, idsToRemove: ReadonlySet<string>): ReadonlySet<string> {
  const nextIds = new Set(Array.from(sourceIds).filter((id) => !idsToRemove.has(id)));
  return nextIds.size === sourceIds.size ? sourceIds : nextIds;
}

function toggleId(sourceIds: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const nextIds = new Set(sourceIds);
  if (nextIds.has(id)) {
    nextIds.delete(id);
  } else {
    nextIds.add(id);
  }
  return nextIds;
}

function collectParentIds(
  document: FamilyTreeDocument,
  familyIds: ReadonlySet<string>
): ReadonlySet<string> {
  const parentIds = new Set<string>();
  familyIds.forEach((familyId) => {
    document.families.get(familyId)?.parents.forEach((parentId) => parentIds.add(parentId));
  });
  return parentIds;
}

function documentGlobal(): Document {
  return window.document;
}

export default App;
