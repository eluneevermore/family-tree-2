import { Baby, ChevronDown, ChevronRight, Heart, Plus, UserPlus } from 'lucide-react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { ChangeEvent, MouseEvent, ReactElement } from 'react';
import { GENDER_COLORS } from '../constants';
import { LocaleStrings } from '../locales';
import { PersonRecord } from '../types';

export interface SpouseSummary {
  readonly id: string;
  readonly name: string;
  readonly familyId: string;
  readonly parentIds: readonly string[];
  readonly hasChildren: boolean;
  readonly isChecked: boolean;
}

export interface PersonToggleSummary {
  readonly personId: string;
  readonly isCollapsed: boolean;
}

export interface PersonNodeData extends Record<string, unknown> {
  readonly person: PersonRecord;
  readonly spouses: readonly SpouseSummary[];
  readonly personToggle?: PersonToggleSummary;
  readonly isSearchMatch: boolean;
  readonly isSelected: boolean;
  readonly locale: LocaleStrings;
  readonly onAddChild: (person: PersonRecord) => void;
  readonly onAddSpouse: (person: PersonRecord) => void;
  readonly onFocusPerson: (personId: string) => void;
  readonly onHoverPerson: (personId: string | null) => void;
  readonly onSelectPerson: (personId: string) => void;
  readonly onToggleFamily: (familyId: string) => void;
  readonly onTogglePerson: (personId: string) => void;
}

export function PersonNode({ data }: NodeProps): ReactElement {
  const nodeData = data as PersonNodeData;
  const borderColor = GENDER_COLORS[nodeData.person.gender];
  const nodeClassName = [
    'person-node',
    nodeData.isSearchMatch ? 'person-node-match' : '',
    nodeData.isSelected ? 'person-node-selected' : ''
  ].filter(Boolean).join(' ');

  function stopClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
  }

  return (
    <div
      className={nodeClassName}
      data-testid={`person-node-${nodeData.person.id}`}
      onClick={() => nodeData.onSelectPerson(nodeData.person.id)}
      onMouseEnter={() => nodeData.onHoverPerson(nodeData.person.id)}
      onMouseLeave={() => nodeData.onHoverPerson(null)}
      style={{ borderColor }}
    >
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
      <Handle type="source" position={Position.Left} id="left" className="flow-handle" />
      <Handle type="target" position={Position.Right} id="right" className="flow-handle" />

      <div className="person-main">
        <div className="person-name" title={nodeData.person.name}>{nodeData.person.name}</div>
        <div className="person-meta">
          <span>{nodeData.person.id}</span>
          {nodeData.person.born ? <span>{nodeData.person.born}</span> : null}
        </div>
      </div>

      {nodeData.spouses.length > 0 ? (
        <div className="spouse-list" aria-label={nodeData.locale.spousesOf(nodeData.person.name)}>
          {nodeData.spouses.map((spouse) => (
            <div
              className="spouse-item nodrag nopan"
              data-testid={`spouse-item-${spouse.familyId}`}
              key={`${spouse.familyId}:${spouse.id}`}
            >
              <button
                aria-label={`${nodeData.locale.focus} ${spouse.name}`}
                className="spouse-chip"
                data-testid={`spouse-shortcut-${spouse.id}`}
                onClick={(event) => {
                  stopClick(event);
                  nodeData.onFocusPerson(spouse.id);
                }}
                type="button"
              >
                <Heart aria-hidden="true" className="spouse-chip-icon" size={12} />
                {spouse.name}
              </button>
              {spouse.hasChildren ? (
                <SpouseFamilyCheckbox
                  familyId={spouse.familyId}
                  isChecked={spouse.isChecked}
                  locale={nodeData.locale}
                  onToggleFamily={nodeData.onToggleFamily}
                  spouseName={spouse.name}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {nodeData.personToggle ? (
        <div className="person-family-toggles">
          <PersonToggleControl
            isCollapsed={nodeData.personToggle.isCollapsed}
            locale={nodeData.locale}
            onTogglePerson={nodeData.onTogglePerson}
            personId={nodeData.personToggle.personId}
            personName={nodeData.person.name}
          />
        </div>
      ) : null}

      <div className="node-actions" aria-label={`Actions for ${nodeData.person.name}`}>
        <button
          aria-label={nodeData.locale.addSpouseFor(nodeData.person.name)}
          className="icon-button"
          onClick={(event) => {
            stopClick(event);
            nodeData.onAddSpouse(nodeData.person);
          }}
          title={nodeData.locale.addSpouse}
          type="button"
        >
          <UserPlus size={14} />
        </button>
        <button
          aria-label={nodeData.locale.addChildFor(nodeData.person.name)}
          className="icon-button"
          onClick={(event) => {
            stopClick(event);
            nodeData.onAddChild(nodeData.person);
          }}
          title={nodeData.locale.addChild}
          type="button"
        >
          <Baby size={14} />
        </button>
        <span className="node-action-anchor" aria-hidden="true">
          <Plus size={12} />
        </span>
      </div>
    </div>
  );
}

interface SpouseFamilyCheckboxProps {
  readonly familyId: string;
  readonly spouseName: string;
  readonly isChecked: boolean;
  readonly locale: LocaleStrings;
  readonly onToggleFamily: (familyId: string) => void;
}

function SpouseFamilyCheckbox({
  familyId,
  spouseName,
  isChecked,
  locale,
  onToggleFamily
}: SpouseFamilyCheckboxProps): ReactElement {
  const label = locale.showDescendantsWith(spouseName);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    event.stopPropagation();
    onToggleFamily(familyId);
  }

  return (
    <input
      aria-label={label}
      checked={isChecked}
      className="spouse-family-checkbox nodrag nopan"
      data-testid={`spouse-family-checkbox-${familyId}`}
      onChange={handleChange}
      onClick={(event) => event.stopPropagation()}
      title={label}
      type="checkbox"
    />
  );
}

interface PersonToggleControlProps {
  readonly personId: string;
  readonly personName: string;
  readonly isCollapsed: boolean;
  readonly locale: LocaleStrings;
  readonly onTogglePerson: (personId: string) => void;
}

function PersonToggleControl({
  personId,
  personName,
  isCollapsed,
  locale,
  onTogglePerson
}: PersonToggleControlProps): ReactElement {
  const label = isCollapsed ? locale.showDescendants : locale.hideDescendants;
  const className = isCollapsed
    ? 'inline-family-toggle inline-family-toggle-collapsed nodrag nopan'
    : 'inline-family-toggle nodrag nopan';

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onTogglePerson(personId);
  }

  return (
    <button
      aria-label={`${label} for ${personName}`}
      className={className}
      data-testid={`person-toggle-${personId}`}
      onClick={handleClick}
      title={label}
      type="button"
    >
      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
    </button>
  );
}
