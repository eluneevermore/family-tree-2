import { ChevronDown, ChevronRight } from 'lucide-react';
import { NodeProps } from '@xyflow/react';
import { MouseEvent, ReactElement } from 'react';
import { LocaleStrings } from '../locales';
import { FamilyRecord } from '../types';

export interface FamilyToggleData extends Record<string, unknown> {
  readonly family: FamilyRecord;
  readonly isCollapsed: boolean;
  readonly locale: LocaleStrings;
  readonly onToggle: (familyId: string) => void;
}

export function FamilyToggleNode({ data }: NodeProps): ReactElement {
  return <FamilyToggleButton data={data as FamilyToggleData} />;
}

interface FamilyToggleButtonProps {
  readonly data: FamilyToggleData;
}

export function FamilyToggleButton({ data: nodeData }: FamilyToggleButtonProps): ReactElement {
  const label = nodeData.isCollapsed ? nodeData.locale.showDescendants : nodeData.locale.hideDescendants;

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    nodeData.onToggle(nodeData.family.id);
  }

  return (
    <button
      aria-label={`${label} for ${nodeData.family.parents.join('+')}`}
      className={nodeData.isCollapsed ? 'family-toggle family-toggle-collapsed nodrag nopan' : 'family-toggle nodrag nopan'}
      data-testid={`family-toggle-${nodeData.family.id}`}
      onClick={handleClick}
      title={label}
      type="button"
    >
      {nodeData.isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
    </button>
  );
}
