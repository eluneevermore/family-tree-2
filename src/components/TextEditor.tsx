import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { KeyboardEvent, ReactElement, useMemo, useRef, useState } from 'react';
import { LocaleStrings } from '../locales';
import { getCurrentDslIdToken, replaceCurrentDslIdToken, suggestPeople } from '../services/suggestions';
import { FamilyTreeDocument, ParseDiagnostic } from '../types';

interface TextEditorProps {
  readonly text: string;
  readonly document: FamilyTreeDocument;
  readonly diagnostics: readonly ParseDiagnostic[];
  readonly locale: LocaleStrings;
  readonly onTextChange: (text: string) => void;
}

export function TextEditor({ text, document, diagnostics, locale, onTextChange }: TextEditorProps): ReactElement {
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [caretPosition, setCaretPosition] = useState(0);
  const token = useMemo(() => getCurrentDslIdToken(text, caretPosition), [caretPosition, text]);
  const suggestions = useMemo(() => suggestPeople(document, token?.query ?? ''), [document, token?.query]);

  function handleSelectionChange(): void {
    setCaretPosition(textareaRef.current?.selectionStart ?? 0);
  }

  function insertSuggestion(personId: string): void {
    const replacement = replaceCurrentDslIdToken(text, caretPosition, personId);
    if (!replacement) {
      return;
    }

    onTextChange(replacement.text);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(replacement.caretPosition, replacement.caretPosition);
      setCaretPosition(replacement.caretPosition);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Escape' && suggestions.length > 0) {
      event.preventDefault();
      setCaretPosition(-1);
      return;
    }

    if (event.key === 'Tab' && suggestions.length > 0) {
      event.preventDefault();
      insertSuggestion(suggestions[0].id);
    }
  }

  return (
    <section className="text-panel" aria-label="Family tree text editor">
      <div className="panel-heading">
        <div className="panel-title">
          <FileText size={16} />
          <span>{locale.compactDsl}</span>
        </div>
        <div className={hasErrors ? 'status-pill status-error' : 'status-pill status-ok'}>
          {hasErrors ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{hasErrors ? locale.needsFixes : locale.valid}</span>
        </div>
      </div>

      <div className="textarea-wrap">
        <textarea
          ref={textareaRef}
          aria-label="Family tree source"
          className="tree-textarea"
          value={text}
          onBlur={handleSelectionChange}
          onChange={(event) => {
            onTextChange(event.target.value);
            setCaretPosition(event.target.selectionStart);
          }}
          onClick={handleSelectionChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleSelectionChange}
          spellCheck={false}
        />
        {suggestions.length > 0 ? (
          <div className="dsl-suggestions" role="listbox" aria-label="Person id suggestions">
            {suggestions.map((person) => (
              <button key={person.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertSuggestion(person.id)}>
                <strong>{person.id}</strong>
                <span>{person.name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="diagnostics" aria-label={locale.parserDiagnostics}>
        {diagnostics.length === 0 ? (
          <p className="diagnostic-empty">{locale.noDiagnostics}</p>
        ) : (
          diagnostics.map((diagnostic, index) => (
            <div className={`diagnostic diagnostic-${diagnostic.severity}`} key={`${diagnostic.code}-${diagnostic.line}-${index}`}>
              <span className="diagnostic-line">{diagnostic.line > 0 ? `L${diagnostic.line}` : 'Doc'}</span>
              <span>{locale.formatDiagnostic(diagnostic)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
