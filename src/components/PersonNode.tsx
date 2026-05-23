import { Baby, Plus, UserPlus } from 'lucide-react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { MouseEvent, ReactElement } from 'react';
import { GENDER_COLORS } from '../constants';
import { LocaleStrings } from '../locales';
import { PersonRecord } from '../types';

export interface SpouseSummary {
  readonly id: string;
  readonly name: string;
}

export interface PersonNodeData extends Record<string, unknown> {
  readonly person: PersonRecord;
  readonly spouses: readonly SpouseSummary[];
  readonly isSearchMatch: boolean;
  readonly isSelected: boolean;
  readonly locale: LocaleStrings;
  readonly onAddChild: (person: PersonRecord) => void;
  readonly onAddSpouse: (person: PersonRecord) => void;
  readonly onFocusPerson: (personId: string) => void;
  readonly onHoverPerson: (personId: string | null) => void;
  readonly onSelectPerson: (personId: string) => void;
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
            <button
              aria-label={`${nodeData.locale.focus} ${spouse.name}`}
              className="spouse-chip"
              data-testid={`spouse-shortcut-${spouse.id}`}
              key={spouse.id}
              onClick={(event) => {
                stopClick(event);
                nodeData.onFocusPerson(spouse.id);
              }}
              type="button"
            >
              <span>{nodeData.locale.focus}</span>
              {spouse.name}
            </button>
          ))}
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
