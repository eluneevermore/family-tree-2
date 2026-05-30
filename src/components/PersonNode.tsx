import { Baby, ChevronDown, ChevronRight, Heart, MoreHorizontal, UserPlus, Users } from 'lucide-react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { ChangeEvent, MouseEvent, ReactElement, useEffect, useRef, useState } from 'react';
import { GENDER_COLORS } from '../constants';
import { LocaleStrings } from '../locales';
import { PersonRecord } from '../types';

export interface SpouseSummary {
  readonly id: string;
  readonly name: string;
  readonly familyId: string;
  readonly parentIds: readonly string[];
  readonly relationshipIndex?: number;
  readonly hasChildren: boolean;
  readonly isChecked: boolean;
}

export interface PersonToggleSummary {
  readonly personId: string;
  readonly isCollapsed: boolean;
}

export interface PersonNodeData extends Record<string, unknown> {
  readonly person: PersonRecord;
  readonly nodeHeight: number;
  readonly nodeWidth: number;
  readonly spouses: readonly SpouseSummary[];
  readonly personToggle?: PersonToggleSummary;
  readonly isSearchMatch: boolean;
  readonly isSelected: boolean;
  readonly canEdit: boolean;
  readonly locale: LocaleStrings;
  readonly onAddChild: (person: PersonRecord) => void;
  readonly onAddParent: (person: PersonRecord) => void;
  readonly onAddSpouse: (person: PersonRecord) => void;
  readonly onFocusPerson: (personId: string) => void;
  readonly onHoverPerson: (personId: string | null) => void;
  readonly onSelectPerson: (personId: string) => void;
  readonly onToggleFamily: (familyId: string) => void;
  readonly onTogglePerson: (personId: string) => void;
}

export function PersonNode({ data }: NodeProps): ReactElement {
  const nodeData = data as PersonNodeData;
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isNoteTooltipOpen, setIsNoteTooltipOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const borderColor = GENDER_COLORS[nodeData.person.gender];
  const lifeYears = formatLifeYears(nodeData.person);
  const noteTooltipId = `person-note-tooltip-${nodeData.person.id}`;
  const nodeClassName = [
    'person-node',
    nodeData.isSearchMatch ? 'person-node-match' : '',
    nodeData.isSelected ? 'person-node-selected' : ''
  ].filter(Boolean).join(' ');

  function stopClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
  }

  useEffect(() => {
    if (!isActionMenuOpen) {
      return;
    }

    function closeActionMenuOnOutsidePointer(event: PointerEvent): void {
      if (!isNodeTarget(event.target)) {
        return;
      }

      if (actionsRef.current?.contains(event.target)) {
        return;
      }

      setIsActionMenuOpen(false);
    }

    document.addEventListener('pointerdown', closeActionMenuOnOutsidePointer);

    return () => {
      document.removeEventListener('pointerdown', closeActionMenuOnOutsidePointer);
    };
  }, [isActionMenuOpen]);

  return (
    <div
      className={nodeClassName}
      data-testid={`person-node-${nodeData.person.id}`}
      onClick={() => nodeData.onSelectPerson(nodeData.person.id)}
      onMouseEnter={() => nodeData.onHoverPerson(nodeData.person.id)}
      onMouseLeave={() => nodeData.onHoverPerson(null)}
      style={{ borderColor, minHeight: nodeData.nodeHeight, width: nodeData.nodeWidth }}
    >
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
      <Handle type="source" position={Position.Left} id="left" className="flow-handle" />
      <Handle type="target" position={Position.Right} id="right" className="flow-handle" />
      {nodeData.person.note ? (
        <>
          <span
            aria-describedby={isNoteTooltipOpen ? noteTooltipId : undefined}
            aria-label={`Note: ${nodeData.person.note}`}
            className="person-note-mark"
            data-testid={`person-note-${nodeData.person.id}`}
            onBlur={() => setIsNoteTooltipOpen(false)}
            onFocus={() => setIsNoteTooltipOpen(true)}
            onMouseEnter={() => setIsNoteTooltipOpen(true)}
            onMouseLeave={() => setIsNoteTooltipOpen(false)}
            tabIndex={0}
            title={nodeData.person.note}
          />
          {isNoteTooltipOpen ? (
            <span className="person-note-tooltip" id={noteTooltipId} role="tooltip">
              {nodeData.person.note}
            </span>
          ) : null}
        </>
      ) : null}

      <div className="person-main">
        <div className="person-name" title={nodeData.person.name}>{nodeData.person.name}</div>
        <div className="person-meta">
          <span>{nodeData.person.id}</span>
          {lifeYears ? <span>{lifeYears}</span> : null}
        </div>
      </div>

      {nodeData.spouses.length > 0 ? (
        <div className="spouse-list" aria-label={nodeData.locale.spousesOf(nodeData.person.name)}>
          {nodeData.spouses.map((spouse) => (
            <div
              className="spouse-item nodrag nopan"
              data-testid={`spouse-item-${spouse.familyId}`}
              key={`${spouse.familyId}:${spouse.id}`}
              onMouseEnter={() => nodeData.onHoverPerson(spouse.id)}
              onMouseLeave={() => nodeData.onHoverPerson(nodeData.person.id)}
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
                {spouse.relationshipIndex ? (
                  <span
                    className="spouse-index"
                    data-testid={`spouse-index-${spouse.familyId}`}
                  >
                    {spouse.relationshipIndex}
                  </span>
                ) : null}
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

      {nodeData.canEdit ? (
        <div
          aria-label={nodeData.locale.nodeActionsFor(nodeData.person.name)}
          className="node-actions nodrag nopan"
          ref={actionsRef}
        >
          <button
            aria-expanded={isActionMenuOpen}
            aria-haspopup="menu"
            aria-label={nodeData.locale.nodeActionsFor(nodeData.person.name)}
            className="icon-button"
            data-testid={`person-actions-${nodeData.person.id}`}
            onClick={(event) => {
              stopClick(event);
              setIsActionMenuOpen((isOpen) => !isOpen);
            }}
            title={nodeData.locale.nodeActionsFor(nodeData.person.name)}
            type="button"
          >
            <MoreHorizontal size={15} />
          </button>
          {isActionMenuOpen ? (
            <div className="node-action-menu" role="menu">
              <NodeActionMenuButton
                actionTestId={`person-action-add-spouse-${nodeData.person.id}`}
                icon={<UserPlus size={13} />}
                label={nodeData.locale.addSpouse}
                onClick={() => nodeData.onAddSpouse(nodeData.person)}
                stopClick={stopClick}
              />
              <NodeActionMenuButton
                actionTestId={`person-action-add-child-${nodeData.person.id}`}
                icon={<Baby size={13} />}
                label={nodeData.locale.addChild}
                onClick={() => nodeData.onAddChild(nodeData.person)}
                stopClick={stopClick}
              />
              <NodeActionMenuButton
                actionTestId={`person-action-add-parent-${nodeData.person.id}`}
                icon={<Users size={13} />}
                label={nodeData.locale.addParent}
                onClick={() => nodeData.onAddParent(nodeData.person)}
                stopClick={stopClick}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface NodeActionMenuButtonProps {
  readonly actionTestId: string;
  readonly icon: ReactElement;
  readonly label: string;
  readonly onClick: () => void;
  readonly stopClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function NodeActionMenuButton({
  actionTestId,
  icon,
  label,
  onClick,
  stopClick
}: NodeActionMenuButtonProps): ReactElement {
  return (
    <button
      className="node-action-menu-item"
      data-testid={actionTestId}
      onClick={(event) => {
        stopClick(event);
        onClick();
      }}
      role="menuitem"
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function isNodeTarget(target: EventTarget | null): target is Node {
  return target instanceof Node;
}

function formatLifeYears(person: PersonRecord): string | null {
  if (!person.born && !person.died) {
    return null;
  }

  return `[${person.born ?? ''} - ${person.died ?? ''}]`;
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
