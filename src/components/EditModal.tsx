import { FormEvent, ReactElement, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { LocaleStrings } from '../locales';
import { createUniquePersonId } from '../services/editor';
import { suggestPeople } from '../services/suggestions';
import { FamilyTreeEdit, FamilyTreeDocument, Gender, PersonDraft, PersonRecord } from '../types';

export type EditMode = 'add-spouse' | 'add-child' | 'add-parent';
type MemberMode = 'existing' | 'new';

interface EditModalProps {
  readonly document: FamilyTreeDocument;
  readonly locale: LocaleStrings;
  readonly mode: EditMode;
  readonly person: PersonRecord;
  readonly onClose: () => void;
  readonly onSubmitEdit: (edit: FamilyTreeEdit) => void;
}

export function EditModal({ document, locale, mode, person, onClose, onSubmitEdit }: EditModalProps): ReactElement {
  const [memberMode, setMemberMode] = useState<MemberMode>('new');
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('unknown');
  const [born, setBorn] = useState('');
  const [familyContext, setFamilyContext] = useState<string>('single');
  const existingIds = useMemo(() => new Set(document.people.keys()), [document.people]);
  const memberFamilies = useMemo(() => {
    return Array.from(document.families.values()).filter((family) => family.parents.includes(person.id));
  }, [document.families, person.id]);
  const matchingPeople = useMemo(() => {
    return suggestPeople(document, search)
      .filter((candidate) => candidate.id !== person.id)
      .slice(0, 6);
  }, [document, person.id, search]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const personDraft = memberMode === 'new' ? createPersonDraft(name, gender, born, existingIds) : null;
    const targetPersonId = personDraft?.id ?? selectedPersonId;
    if (!targetPersonId) {
      return;
    }

    onSubmitEdit(mode === 'add-spouse'
      ? { type: 'add-spouse', personId: person.id, spouseId: targetPersonId, spouse: personDraft ?? undefined }
      : createRelativeEdit(targetPersonId, personDraft));
  }

  function getSelectedParents(): readonly [string] | readonly [string, string] {
    const family = document.families.get(familyContext);
    return family?.parents ?? [person.id];
  }

  function createRelativeEdit(targetPersonId: string, personDraft: PersonDraft | null): FamilyTreeEdit {
    if (mode === 'add-parent') {
      return {
        type: 'add-parent',
        childId: person.id,
        parentId: targetPersonId,
        parent: personDraft ?? undefined
      };
    }

    return {
      type: 'add-child',
      parents: getSelectedParents(),
      childId: targetPersonId,
      child: personDraft ?? undefined
    };
  }

  const modalLabel = getModalLabel(locale, mode);
  const modalHeading = getModalHeading(locale, mode, person.name);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={modalLabel}>
      <form className="edit-modal" onSubmit={handleSubmit}>
        <div className="modal-heading">
          <h2>{modalHeading}</h2>
          <button className="icon-button" onClick={onClose} type="button" aria-label={locale.closeDialog}>
            <X size={16} />
          </button>
        </div>

        {mode === 'add-child' ? (
          <label className="field-label">
            {locale.relationship}
            <select value={familyContext} onChange={(event) => setFamilyContext(event.target.value)}>
              <option value="single">{locale.singleParent(person.name)}</option>
              {memberFamilies.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.parents.map((parentId) => document.people.get(parentId)?.name ?? parentId).join(' + ')}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="segmented-control" role="tablist" aria-label="Member source">
          <button className={memberMode === 'new' ? 'segment-active' : ''} type="button" onClick={() => setMemberMode('new')}>
            {locale.newPerson}
          </button>
          <button className={memberMode === 'existing' ? 'segment-active' : ''} type="button" onClick={() => setMemberMode('existing')}>
            {locale.existing}
          </button>
        </div>

        {memberMode === 'new' ? (
          <div className="form-grid">
            <label className="field-label">
              {locale.name}
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="field-label">
              {locale.gender}
              <select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
                <option value="unknown">{locale.unknown}</option>
                <option value="male">{locale.male}</option>
                <option value="female">{locale.female}</option>
                <option value="other">{locale.other}</option>
              </select>
            </label>
            <label className="field-label">
              {locale.born}
              <input value={born} onChange={(event) => setBorn(event.target.value)} placeholder="1950" />
            </label>
          </div>
        ) : (
          <div className="existing-picker">
            <label className="field-label">
              {locale.personId}
              <span className="search-field">
                <Search size={15} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={locale.typeIdOrName} />
              </span>
            </label>
            <div className="result-list">
              {matchingPeople.map((candidate) => (
                <button
                  className={selectedPersonId === candidate.id ? 'result-item result-selected' : 'result-item'}
                  key={candidate.id}
                  onClick={() => setSelectedPersonId(candidate.id)}
                  type="button"
                >
                  <span>{candidate.name}</span>
                  <small>{candidate.id}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} type="button">{locale.cancel}</button>
          <button className="primary-button" disabled={memberMode === 'existing' && !selectedPersonId} type="submit">
            {locale.updateText}
          </button>
        </div>
      </form>
    </div>
  );
}

function getModalLabel(locale: LocaleStrings, mode: EditMode): string {
  if (mode === 'add-spouse') {
    return locale.addSpouse;
  }

  return mode === 'add-child' ? locale.addChild : locale.addParent;
}

function getModalHeading(locale: LocaleStrings, mode: EditMode, name: string): string {
  if (mode === 'add-spouse') {
    return locale.addSpouseFor(name);
  }

  return mode === 'add-child' ? locale.addChildFor(name) : locale.addParentFor(name);
}

function createPersonDraft(
  name: string,
  gender: Gender,
  born: string,
  existingIds: ReadonlySet<string>
): PersonDraft {
  return {
    id: createUniquePersonId(name, existingIds),
    name,
    gender,
    born: born.trim() || undefined
  };
}
