import { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Columns2, Download, GitBranch, PanelLeftClose, PanelLeftOpen, Upload } from 'lucide-react';
import { TextEditor } from './components/TextEditor';
import { GraphView } from './components/GraphView';
import { EditModal, type EditMode } from './components/EditModal';
import { DEFAULT_TREE_TEXT, EXPORT_FILE_NAME, STORAGE_KEY, STORAGE_LANGUAGE_KEY, STORAGE_VIEW_MODE_KEY } from './constants';
import { describeKinship } from './domain/kinship';
import { findAncestorFamilyIds, findInitialFocusPersonId } from './domain/visibility';
import { locales, type LocaleStrings } from './locales';
import { applyFamilyTreeEdit } from './services/editor';
import { importLegacyFamilyText, looksLikeLegacyFamilyText } from './services/legacy-importer';
import { parseFamilyTreeText } from './services/parser';
import { FamilyTreeDocument, FamilyTreeEdit, KinshipResult, Language, PersonRecord } from './types';

type ViewMode = 'both' | 'text' | 'graph';

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

const PRIMARY_GRAPH_ID = 'graph-1';
const SECONDARY_GRAPH_ID = 'graph-2';
const KINSHIP_STATUS_LABEL = 'Kinship';
const DEFAULT_TEXT_PANEL_WIDTH = 460;
const MIN_TEXT_PANEL_WIDTH = 320;
const MAX_TEXT_PANEL_WIDTH = 760;
const MIN_GRAPH_WORKSPACE_WIDTH = 420;

type WorkspaceStyle = CSSProperties & {
  readonly '--text-panel-width'?: string;
};

function App(): ReactElement {
  const [text, setText] = useState(() => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TREE_TEXT);
  const [viewMode, setViewMode] = useState<ViewMode>(() => readViewMode());
  const [language, setLanguage] = useState<Language>(() => readLanguage());
  const [graphViews, setGraphViews] = useState<readonly GraphViewState[]>(() => [createGraphViewState(PRIMARY_GRAPH_ID, null)]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [textPanelWidth, setTextPanelWidth] = useState(DEFAULT_TEXT_PANEL_WIDTH);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const document = useMemo(() => parseFamilyTreeText(text), [text]);
  const locale = locales[language];
  const hasSplitGraphView = graphViews.length > 1;
  const kinship = useMemo(() => {
    return describeKinship(document, selectedPersonId, hoveredPersonId, language);
  }, [document, hoveredPersonId, language, selectedPersonId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

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
    setText((currentText) => applyFamilyTreeEdit(currentText, edit));
    setPendingEdit(null);
  }, []);

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
      setText(looksLikeLegacyFamilyText(result) ? importLegacyFamilyText(result) : result);
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
          <TextEditor diagnostics={document.diagnostics} document={document} locale={locale} text={text} onTextChange={setText} />
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
            <KinshipFooter document={document} kinship={kinship} locale={locale} />
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
  const storedValue = localStorage.getItem(STORAGE_LANGUAGE_KEY);
  return storedValue === 'vi' ? 'vi' : 'en';
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
}

function KinshipFooter({
  document,
  kinship,
  locale
}: KinshipFooterProps): ReactElement | null {
  if (kinship) {
    return (
      <footer className="kinship-footer" role="status" aria-label={KINSHIP_STATUS_LABEL}>
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
      </footer>
    );
  }

  return (
    <footer className="kinship-footer kinship-footer-muted" role="status" aria-label={KINSHIP_STATUS_LABEL}>
      {locale.relationshipHint}
    </footer>
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
