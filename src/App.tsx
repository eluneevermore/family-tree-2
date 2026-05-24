import { ChangeEvent, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, GitBranch, PanelLeftClose, PanelLeftOpen, Search, Upload } from 'lucide-react';
import { TextEditor } from './components/TextEditor';
import { GraphView } from './components/GraphView';
import { EditModal, type EditMode } from './components/EditModal';
import { DEFAULT_TREE_TEXT, EXPORT_FILE_NAME, STORAGE_KEY, STORAGE_LANGUAGE_KEY, STORAGE_VIEW_MODE_KEY } from './constants';
import { findAncestorFamilyIds, findInitialFocusPersonId, findMatchingPersonIds } from './domain/visibility';
import { locales } from './locales';
import { applyFamilyTreeEdit } from './services/editor';
import { importLegacyFamilyText, looksLikeLegacyFamilyText } from './services/legacy-importer';
import { parseFamilyTreeText } from './services/parser';
import { FamilyTreeDocument, FamilyTreeEdit, Language, PersonRecord } from './types';

type ViewMode = 'both' | 'text' | 'graph';

interface PendingEdit {
  readonly mode: EditMode;
  readonly person: PersonRecord;
}

function App(): ReactElement {
  const [text, setText] = useState(() => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TREE_TEXT);
  const [viewMode, setViewMode] = useState<ViewMode>(() => readViewMode());
  const [language, setLanguage] = useState<Language>(() => readLanguage());
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFamilyIds, setCollapsedFamilyIds] = useState<ReadonlySet<string>>(new Set());
  const [collapsedPersonIds, setCollapsedPersonIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const document = useMemo(() => parseFamilyTreeText(text), [text]);
  const locale = locales[language];

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
    if (focusPersonId && document.people.has(focusPersonId)) {
      return;
    }

    setFocusPersonId(findInitialFocusPersonId(document));
  }, [document, focusPersonId]);

  useEffect(() => {
    const firstMatch = findMatchingPersonIds(document, searchQuery)[0];
    if (!firstMatch) {
      return;
    }

    const ancestors = findAncestorFamilyIds(document, firstMatch);
    setFocusPersonId(firstMatch);
    setCollapsedFamilyIds((previousIds) => removeIds(previousIds, ancestors));
    setCollapsedPersonIds((previousIds) => removeIds(previousIds, collectParentIds(document, ancestors)));
  }, [document, searchQuery]);

  const handleToggleFamily = useCallback((familyId: string): void => {
    setCollapsedFamilyIds((previousIds) => toggleId(previousIds, familyId));
  }, []);

  const handleTogglePerson = useCallback((personId: string): void => {
    setCollapsedPersonIds((previousIds) => toggleId(previousIds, personId));
  }, []);

  const handleSubmitEdit = useCallback((edit: FamilyTreeEdit): void => {
    setText((currentText) => applyFamilyTreeEdit(currentText, edit));
    setPendingEdit(null);
  }, []);

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
  return (
    <div className={appClassName}>
      <header className="app-header">
        <div className="brand">
          <GitBranch size={20} />
          <h1>{locale.appTitle}</h1>
        </div>

        <label className="header-search">
          <Search size={16} />
          <input
            aria-label="Search people"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={locale.searchPeople}
            value={searchQuery}
          />
        </label>

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
            <option value="en">EN</option>
            <option value="vi">VI</option>
          </select>
          <button className="toolbar-button" onClick={() => fileInputRef.current?.click()} type="button" title={locale.import}>
            <Upload size={17} />
          </button>
          <button className="toolbar-button" onClick={handleDownload} type="button" title={locale.export}>
            <Download size={17} />
          </button>
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

      <main className="workspace">
        {viewMode !== 'graph' ? (
          <TextEditor diagnostics={document.diagnostics} document={document} locale={locale} text={text} onTextChange={setText} />
        ) : null}

        {viewMode !== 'text' ? (
          <GraphView
            collapsedFamilyIds={collapsedFamilyIds}
            collapsedPersonIds={collapsedPersonIds}
            document={document}
            focusPersonId={focusPersonId}
            language={language}
            locale={locale}
            onAddChild={(person) => setPendingEdit({ mode: 'add-child', person })}
            onAddParent={(person) => setPendingEdit({ mode: 'add-parent', person })}
            onAddSpouse={(person) => setPendingEdit({ mode: 'add-spouse', person })}
            onFocusPerson={setFocusPersonId}
            onToggleFamily={handleToggleFamily}
            onTogglePerson={handleTogglePerson}
            searchQuery={searchQuery}
          />
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
