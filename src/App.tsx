import { ChangeEvent, CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Columns2, Download, GitBranch, PanelLeftClose, PanelLeftOpen, Pencil, Share2, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { TextEditor } from './components/TextEditor';
import { GraphView } from './components/GraphView';
import { EditModal, type EditMode } from './components/EditModal';
import {
  DEFAULT_TREE_TEXT,
  EXPORT_FILE_NAME,
  MAX_PERSON_HORIZONTAL_GAP,
  MAX_PERSON_NODE_HEIGHT,
  MAX_PERSON_NODE_WIDTH,
  MIN_PERSON_HORIZONTAL_GAP,
  MIN_PERSON_NODE_HEIGHT,
  MIN_PERSON_NODE_WIDTH,
  NEW_TREE_TEXT,
  PERSON_HORIZONTAL_GAP_STEP,
  PERSON_NODE_HEIGHT_STEP,
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
  createSharedTreeUrl,
  readSharedTreeTextFromSearch,
  removeSharedTreeParameterFromUrl
} from './services/share-link';
import {
  clampPersonHorizontalGap,
  clampPersonNodeHeight,
  clampPersonNodeWidth,
  LocalStorageSiteConfigurationStore
} from './services/site-configuration-store';
import { FamilyTreeDocument, FamilyTreeEdit, GraphConnectionStyle, KinshipResult, Language, PersonRecord } from './types';

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
  readonly source: 'local' | 'shared-preview';
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
  const connectionStyle = siteConfiguration.connectionStyle;
  const nodeHeight = siteConfiguration.personNodeHeight;
  const nodeSpacing = siteConfiguration.personHorizontalGap;
  const nodeWidth = siteConfiguration.personNodeWidth;
  const document = useMemo(() => parseFamilyTreeText(text), [text]);
  const locale = locales[language];
  const isSharedPreview = familyTreeState.source === 'shared-preview';
  const hasSplitGraphView = graphViews.length > 1;
  const canDeleteFamilyTree = !isSharedPreview && familyTreeState.trees.length > 1;
  const kinship = useMemo(() => {
    return describeKinship(document, selectedPersonId, hoveredPersonId, language);
  }, [document, hoveredPersonId, language, selectedPersonId]);

  useEffect(() => {
    if (familyTreeState.source !== 'local') {
      return;
    }

    familyTreeStore.saveTreeText(familyTreeState.activeTreeId, familyTreeState.text);
  }, [familyTreeState.activeTreeId, familyTreeState.source, familyTreeState.text, familyTreeStore]);

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
      text: currentState.source === 'local'
        ? resolveTextUpdate(update, currentState.text)
        : currentState.text
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
    if (isSharedPreview) {
      return;
    }

    updateText((currentText) => applyFamilyTreeEdit(currentText, edit));
    setPendingEdit(null);
  }, [isSharedPreview, updateText]);

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
    if (isSharedPreview) {
      event.target.value = familyTreeState.activeTreeId;
      return;
    }

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
        source: 'local',
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
      source: 'local',
      trees: familyTreeStore.listTrees(),
      text: tree.text
    });
    resetGraphContext(null);
  }, [familyTreeState.activeTreeId, familyTreeStore, isSharedPreview, locale.newFamilyTreeName, resetGraphContext]);

  const handleRenameActiveFamilyTree = useCallback((): void => {
    if (isSharedPreview) {
      return;
    }

    const activeTree = familyTreeState.trees.find((tree) => tree.id === familyTreeState.activeTreeId);
    if (!activeTree) {
      return;
    }

    const name = window.prompt(locale.renameFamilyTreeName, activeTree.name)?.trim();
    if (!name) {
      return;
    }

    const renamedTree = familyTreeStore.renameTree(activeTree.id, name);
    if (!renamedTree) {
      return;
    }

    setFamilyTreeState({
      activeTreeId: renamedTree.id,
      source: 'local',
      trees: familyTreeStore.listTrees(),
      text: familyTreeState.text
    });
  }, [
    familyTreeState.activeTreeId,
    familyTreeState.text,
    familyTreeState.trees,
    familyTreeStore,
    isSharedPreview,
    locale.renameFamilyTreeName
  ]);

  const handleDeleteActiveFamilyTree = useCallback((): void => {
    if (isSharedPreview) {
      return;
    }

    const activeTree = familyTreeState.trees.find((tree) => tree.id === familyTreeState.activeTreeId);
    if (!activeTree || !canDeleteFamilyTree || !window.confirm(locale.confirmDeleteFamilyTree(activeTree.name))) {
      return;
    }

    const nextActiveTree = familyTreeStore.deleteTree(activeTree.id);
    if (!nextActiveTree) {
      return;
    }

    setFamilyTreeState({
      activeTreeId: nextActiveTree.id,
      source: 'local',
      trees: familyTreeStore.listTrees(),
      text: nextActiveTree.text
    });
    resetGraphContext(null);
  }, [
    canDeleteFamilyTree,
    familyTreeState.activeTreeId,
    familyTreeStore,
    isSharedPreview,
    locale,
    resetGraphContext
  ]);

  const handleNodeWidthChange = useCallback((nextWidth: number): void => {
    setSiteConfiguration((currentConfiguration) => ({
      ...currentConfiguration,
      personNodeWidth: clampPersonNodeWidth(nextWidth)
    }));
  }, []);

  const handleNodeHeightChange = useCallback((nextHeight: number): void => {
    setSiteConfiguration((currentConfiguration) => ({
      ...currentConfiguration,
      personNodeHeight: clampPersonNodeHeight(nextHeight)
    }));
  }, []);

  const handleConnectionStyleChange = useCallback((nextConnectionStyle: GraphConnectionStyle): void => {
    setSiteConfiguration((currentConfiguration) => ({
      ...currentConfiguration,
      connectionStyle: nextConnectionStyle
    }));
  }, []);

  const handleNodeSpacingChange = useCallback((nextSpacing: number): void => {
    setSiteConfiguration((currentConfiguration) => ({
      ...currentConfiguration,
      personHorizontalGap: clampPersonHorizontalGap(nextSpacing)
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

  function handleShareTree(): void {
    const sharedUrl = createSharedTreeUrl(text, window.location.href);
    const writeText = navigator.clipboard?.writeText(sharedUrl);
    if (!writeText) {
      window.prompt(locale.shareLinkPrompt, sharedUrl);
      return;
    }

    writeText.catch((error) => {
      console.error('Failed to copy shared family tree link.', error);
      window.prompt(locale.shareLinkPrompt, sharedUrl);
    });
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>): void {
    if (isSharedPreview) {
      event.target.value = '';
      return;
    }

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

  function handleSaveSharedPreviewAsNewTree(): void {
    if (!isSharedPreview) {
      return;
    }

    const name = window.prompt(locale.sharedTreeName)?.trim();
    if (!name) {
      return;
    }

    const tree = familyTreeStore.createTree(name, familyTreeState.text);
    setFamilyTreeState({
      activeTreeId: tree.id,
      source: 'local',
      trees: familyTreeStore.listTrees(),
      text: tree.text
    });
    clearSharedPreviewUrl();
    resetGraphContext(null);
  }

  function handleReplaceCurrentTree(): void {
    if (!isSharedPreview) {
      return;
    }

    const activeTreeName = familyTreeState.trees.find((tree) => tree.id === familyTreeState.activeTreeId)?.name ?? locale.familyTree;
    if (!window.confirm(locale.confirmReplaceCurrentTree(activeTreeName))) {
      return;
    }

    familyTreeStore.saveTreeText(familyTreeState.activeTreeId, familyTreeState.text);
    familyTreeStore.setActiveTreeId(familyTreeState.activeTreeId);
    setFamilyTreeState({
      activeTreeId: familyTreeState.activeTreeId,
      source: 'local',
      trees: familyTreeStore.listTrees(),
      text: familyTreeState.text
    });
    clearSharedPreviewUrl();
    resetGraphContext(null);
  }

  function handleDiscardSharedPreview(): void {
    if (!isSharedPreview) {
      return;
    }

    const activeTree = familyTreeStore.readTree(familyTreeState.activeTreeId) ?? familyTreeStore.ensureReady(DEFAULT_TREE_TEXT);
    familyTreeStore.setActiveTreeId(activeTree.id);
    setFamilyTreeState({
      activeTreeId: activeTree.id,
      source: 'local',
      trees: familyTreeStore.listTrees(),
      text: activeTree.text
    });
    clearSharedPreviewUrl();
    resetGraphContext(null);
  }

  function clearSharedPreviewUrl(): void {
    window.history.replaceState({}, '', removeSharedTreeParameterFromUrl(window.location.href));
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
          <div className="tree-controls">
            <select
              aria-label={locale.familyTree}
              className="tree-select"
              disabled={isSharedPreview}
              onChange={handleFamilyTreeSelection}
              value={familyTreeState.activeTreeId}
            >
              {familyTreeState.trees.map((tree) => (
                <option key={tree.id} value={tree.id}>{tree.name}</option>
              ))}
              <option value={CREATE_TREE_OPTION_VALUE}>{locale.createFamilyTree}</option>
            </select>
            <button
              aria-label={locale.renameFamilyTree}
              className="toolbar-button tree-action-button"
              disabled={isSharedPreview}
              onClick={handleRenameActiveFamilyTree}
              title={locale.renameFamilyTree}
              type="button"
            >
              <Pencil size={15} />
            </button>
            <button
              aria-label={locale.deleteFamilyTree}
              className="toolbar-button tree-action-button"
              disabled={!canDeleteFamilyTree}
              onClick={handleDeleteActiveFamilyTree}
              title={locale.deleteFamilyTree}
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </div>
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
          <button
            aria-label={locale.import}
            className="toolbar-button"
            disabled={isSharedPreview}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            title={locale.import}
          >
            <Upload size={17} />
          </button>
          <button aria-label={locale.export} className="toolbar-button" onClick={handleDownload} type="button" title={locale.export}>
            <Download size={17} />
          </button>
          <button aria-label={locale.shareTree} className="toolbar-button" onClick={handleShareTree} type="button" title={locale.shareTree}>
            <Share2 size={17} />
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

      {isSharedPreview ? (
        <section className="shared-preview-banner" aria-label={locale.sharedPreviewTitle}>
          <div>
            <strong>{locale.sharedPreviewTitle}</strong>
            <span>{locale.sharedPreviewDescription}</span>
          </div>
          <div className="shared-preview-actions">
            <button className="toolbar-text-button" onClick={handleSaveSharedPreviewAsNewTree} type="button">
              {locale.saveSharedTreeAsNew}
            </button>
            <button className="toolbar-text-button" onClick={handleReplaceCurrentTree} type="button">
              {locale.replaceCurrentTree}
            </button>
            <button className="toolbar-text-button toolbar-text-button-muted" onClick={handleDiscardSharedPreview} type="button">
              {locale.discardSharedPreview}
            </button>
          </div>
        </section>
      ) : null}

      <main className="workspace" data-testid="workspace" style={workspaceStyle}>
        {viewMode !== 'graph' ? (
          <TextEditor
            diagnostics={document.diagnostics}
            document={document}
            isReadOnly={isSharedPreview}
            locale={locale}
            text={text}
            onTextChange={updateText}
          />
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
                    canEdit={!isSharedPreview}
                    collapsedFamilyIds={graphView.collapsedFamilyIds}
                    collapsedPersonIds={graphView.collapsedPersonIds}
                    connectionStyle={connectionStyle}
                    document={document}
                    focusPersonId={graphView.focusPersonId}
                    locale={locale}
                    nodeHeight={nodeHeight}
                    nodeSpacing={nodeSpacing}
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
              connectionStyle={connectionStyle}
              document={document}
              kinship={kinship}
              locale={locale}
              nodeHeight={nodeHeight}
              nodeSpacing={nodeSpacing}
              nodeWidth={nodeWidth}
              onConnectionStyleChange={handleConnectionStyleChange}
              onNodeHeightChange={handleNodeHeightChange}
              onNodeSpacingChange={handleNodeSpacingChange}
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
  const sharedText = readSharedTreeTextFromSearch(window.location.search);
  return {
    activeTreeId: activeTree.id,
    source: sharedText === null ? 'local' : 'shared-preview',
    trees: familyTreeStore.listTrees(),
    text: sharedText ?? activeTree.text
  };
}

function resolveTextUpdate(update: TextUpdate, currentText: string): string {
  return typeof update === 'function' ? update(currentText) : update;
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
  readonly connectionStyle: GraphConnectionStyle;
  readonly document: FamilyTreeDocument;
  readonly kinship: KinshipResult | null;
  readonly locale: LocaleStrings;
  readonly nodeHeight: number;
  readonly nodeSpacing: number;
  readonly nodeWidth: number;
  readonly onConnectionStyleChange: (connectionStyle: GraphConnectionStyle) => void;
  readonly onNodeHeightChange: (height: number) => void;
  readonly onNodeSpacingChange: (spacing: number) => void;
  readonly onNodeWidthChange: (width: number) => void;
}

function KinshipFooter({
  connectionStyle,
  document,
  kinship,
  locale,
  nodeHeight,
  nodeSpacing,
  nodeWidth,
  onConnectionStyleChange,
  onNodeHeightChange,
  onNodeSpacingChange,
  onNodeWidthChange
}: KinshipFooterProps): ReactElement | null {
  const graphSettings = (
    <GraphSettingsControl
      connectionStyle={connectionStyle}
      locale={locale}
      nodeHeight={nodeHeight}
      nodeSpacing={nodeSpacing}
      nodeWidth={nodeWidth}
      onConnectionStyleChange={onConnectionStyleChange}
      onNodeHeightChange={onNodeHeightChange}
      onNodeSpacingChange={onNodeSpacingChange}
      onNodeWidthChange={onNodeWidthChange}
    />
  );

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
        {graphSettings}
      </footer>
    );
  }

  return (
    <footer className="kinship-footer kinship-footer-muted" role="status" aria-label={KINSHIP_STATUS_LABEL}>
      <div className="kinship-footer-body">{locale.relationshipHint}</div>
      {graphSettings}
    </footer>
  );
}

interface GraphSettingsControlProps {
  readonly connectionStyle: GraphConnectionStyle;
  readonly locale: LocaleStrings;
  readonly nodeHeight: number;
  readonly nodeSpacing: number;
  readonly nodeWidth: number;
  readonly onConnectionStyleChange: (connectionStyle: GraphConnectionStyle) => void;
  readonly onNodeHeightChange: (height: number) => void;
  readonly onNodeSpacingChange: (spacing: number) => void;
  readonly onNodeWidthChange: (width: number) => void;
}

function GraphSettingsControl({
  connectionStyle,
  locale,
  nodeHeight,
  nodeSpacing,
  nodeWidth,
  onConnectionStyleChange,
  onNodeHeightChange,
  onNodeSpacingChange,
  onNodeWidthChange
}: GraphSettingsControlProps): ReactElement {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      setIsSettingsOpen(false);
    }
  }

  return (
    <div className="graph-settings">
      <button
        aria-expanded={isSettingsOpen}
        aria-label={locale.graphSettings}
        className="graph-settings-button"
        onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
        title={locale.graphSettings}
        type="button"
      >
        <SlidersHorizontal size={15} />
      </button>
      {isSettingsOpen ? (
        <div
          aria-label={locale.graphSettings}
          className="graph-settings-popover"
          onKeyDown={handleKeyDown}
          role="dialog"
        >
          <label className="graph-setting-field">
            <span>{locale.connectionStyle}</span>
            <select
              aria-label={locale.connectionStyle}
              onChange={(event) => onConnectionStyleChange(event.target.value as GraphConnectionStyle)}
              value={connectionStyle}
            >
              <option value="curve">{locale.connectionCurve}</option>
              <option value="smoothstep">{locale.connectionSmoothStep}</option>
              <option value="straight">{locale.connectionStraight}</option>
              <option value="step">{locale.connectionStep}</option>
            </select>
          </label>
          <label className="graph-setting-field">
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
          <label className="graph-setting-field">
            <span>{locale.nodeHeight}</span>
            <input
              aria-label={locale.nodeHeight}
              max={MAX_PERSON_NODE_HEIGHT}
              min={MIN_PERSON_NODE_HEIGHT}
              onChange={(event) => onNodeHeightChange(Number(event.target.value))}
              step={PERSON_NODE_HEIGHT_STEP}
              type="number"
              value={nodeHeight}
            />
          </label>
          <label className="graph-setting-field">
            <span>{locale.nodeSpacing}</span>
            <input
              aria-label={locale.nodeSpacing}
              max={MAX_PERSON_HORIZONTAL_GAP}
              min={MIN_PERSON_HORIZONTAL_GAP}
              onChange={(event) => onNodeSpacingChange(Number(event.target.value))}
              step={PERSON_HORIZONTAL_GAP_STEP}
              type="number"
              value={nodeSpacing}
            />
          </label>
        </div>
      ) : null}
    </div>
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
