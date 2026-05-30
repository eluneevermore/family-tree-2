import { AlertCircle, CheckCircle2, FileText, HelpCircle, X } from 'lucide-react';
import { KeyboardEvent, ReactElement, useMemo, useRef, useState } from 'react';
import { LocaleStrings } from '../locales';
import { getCurrentDslIdToken, replaceCurrentDslIdToken, suggestPeople } from '../services/suggestions';
import { FamilyTreeDocument, ParseDiagnostic } from '../types';

interface TextEditorProps {
  readonly text: string;
  readonly document: FamilyTreeDocument;
  readonly diagnostics: readonly ParseDiagnostic[];
  readonly isReadOnly?: boolean;
  readonly locale: LocaleStrings;
  readonly onTextChange: (text: string) => void;
}

export function TextEditor({ text, document, diagnostics, isReadOnly = false, locale, onTextChange }: TextEditorProps): ReactElement {
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [caretPosition, setCaretPosition] = useState(0);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const token = useMemo(() => getCurrentDslIdToken(text, caretPosition), [caretPosition, text]);
  const suggestions = useMemo(() => isReadOnly ? [] : suggestPeople(document, token?.query ?? ''), [document, isReadOnly, token?.query]);

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
          <button
            aria-label={locale.dslHelp}
            className="dsl-help-button"
            onClick={() => setIsLegendOpen(true)}
            title={locale.dslHelp}
            type="button"
          >
            <HelpCircle size={15} />
          </button>
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
          className={isReadOnly ? 'tree-textarea tree-textarea-readonly' : 'tree-textarea'}
          readOnly={isReadOnly}
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

      {isLegendOpen ? (
        <DslLegendDialog locale={locale} onClose={() => setIsLegendOpen(false)} />
      ) : null}
    </section>
  );
}

interface DslLegendDialogProps {
  readonly locale: LocaleStrings;
  readonly onClose: () => void;
}

function DslLegendDialog({ locale, onClose }: DslLegendDialogProps): ReactElement {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="dsl-legend-title"
        aria-modal="true"
        className="dsl-legend-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="dsl-legend-title">{locale.dslLegendTitle}</h2>
          <button aria-label={locale.closeDialog} className="icon-button" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>
        <div className="dsl-legend-body">
          <p>{locale.dslLegendIntro}</p>
          <ul>
            <li><code>{locale.dslLegendPersonLine}</code></li>
            <li><code>{locale.dslLegendRelationshipLine}</code></li>
            <li><code>{locale.dslLegendMarriageLine}</code></li>
            <li><code>{locale.dslLegendSingleParentLine}</code></li>
          </ul>
          <p>{locale.dslLegendAliases}</p>
          <p>{locale.dslLegendSpacing}</p>
          <div className="dsl-legend-example">
            <div>{locale.dslLegendExample}</div>
            <pre>{`gf:John Smith,g=m,b=1950
gm:Mary Smith,g=f,b=1952
gf+gm->f,u`}</pre>
          </div>
        </div>
      </section>
    </div>
  );
}
