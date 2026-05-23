import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { locales } from '../locales';
import { parseFamilyTreeText } from '../services/parser';
import { GraphView } from './GraphView';

const GRAPH_TEXT = `
dad:Dad,g=m,b=1970
mom:Mom,g=f,b=1972
me:Me,g=m,b=2000
sis:Sister,g=f,b=1998
dad+mom->sis,me
`;

describe('GraphView', () => {
  it('selects a person and shows kinship on hover', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText(GRAPH_TEXT);
    render(
      <GraphView
        collapsedFamilyIds={new Set()}
        document={document}
        focusPersonId="me"
        language="en"
        locale={locales.en}
        onAddChild={vi.fn()}
        onAddSpouse={vi.fn()}
        onFocusPerson={vi.fn()}
        onToggleFamily={vi.fn()}
        searchQuery=""
      />
    );

    fireEvent.click(await screen.findByTestId('person-node-me'));
    fireEvent.mouseEnter(await screen.findByTestId('person-node-dad'));

    expect(await screen.findByText('father')).toBeInTheDocument();
    expect(screen.getByText('son')).toBeInTheDocument();
  });

  it('fires descendant toggle and spouse shortcut actions', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const onToggleFamily = vi.fn();
    const onFocusPerson = vi.fn();
    render(
      <GraphView
        collapsedFamilyIds={new Set()}
        document={document}
        focusPersonId="me"
        language="en"
        locale={locales.en}
        onAddChild={vi.fn()}
        onAddSpouse={vi.fn()}
        onFocusPerson={onFocusPerson}
        onToggleFamily={onToggleFamily}
        searchQuery=""
      />
    );

    fireEvent.click(await screen.findByTestId('family-toggle-couple:dad+mom'));
    fireEvent.click(screen.getByTestId('spouse-shortcut-mom'));

    expect(onToggleFamily).toHaveBeenCalledWith('couple:dad+mom');
    expect(onFocusPerson).toHaveBeenCalledWith('mom');
  });
});
