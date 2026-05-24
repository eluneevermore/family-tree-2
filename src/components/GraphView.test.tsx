import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('selects a person and shows kinship on hover', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText(GRAPH_TEXT);
    render(
      <GraphView
        collapsedFamilyIds={new Set()}
        collapsedPersonIds={new Set()}
        document={document}
        focusPersonId="me"
        language="en"
        locale={locales.en}
        onAddChild={vi.fn()}
        onAddSpouse={vi.fn()}
        onFocusPerson={vi.fn()}
        onToggleFamily={vi.fn()}
        onTogglePerson={vi.fn()}
        searchQuery=""
      />
    );

    fireEvent.click(await screen.findByTestId('person-node-me'));
    fireEvent.mouseEnter(await screen.findByTestId('person-node-dad'));

    expect(await screen.findByText('father')).toBeInTheDocument();
    expect(screen.getByText('son')).toBeInTheDocument();
  });

  it('fires node toggle, spouse checkbox, and spouse shortcut actions', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const onToggleFamily = vi.fn();
    const onTogglePerson = vi.fn();
    const onFocusPerson = vi.fn();
    render(
      <GraphView
        collapsedFamilyIds={new Set()}
        collapsedPersonIds={new Set()}
        document={document}
        focusPersonId="me"
        language="en"
        locale={locales.en}
        onAddChild={vi.fn()}
        onAddSpouse={vi.fn()}
        onFocusPerson={onFocusPerson}
        onToggleFamily={onToggleFamily}
        onTogglePerson={onTogglePerson}
        searchQuery=""
      />
    );

    const spouseItem = await screen.findByTestId('spouse-item-couple:dad+mom');
    fireEvent.click(await screen.findByTestId('person-toggle-dad'));
    fireEvent.click(within(spouseItem).getByTestId('spouse-family-checkbox-couple:dad+mom'));
    fireEvent.click(screen.getByTestId('spouse-shortcut-mom'));

    expect(onTogglePerson).toHaveBeenCalledWith('dad');
    expect(onToggleFamily).toHaveBeenCalledWith('couple:dad+mom');
    expect(onFocusPerson).toHaveBeenCalledWith('mom');
  });

  it('confirms before resetting manual graph positions', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <GraphView
        collapsedFamilyIds={new Set()}
        collapsedPersonIds={new Set()}
        document={document}
        focusPersonId="me"
        language="en"
        locale={locales.en}
        onAddChild={vi.fn()}
        onAddSpouse={vi.fn()}
        onFocusPerson={vi.fn()}
        onToggleFamily={vi.fn()}
        onTogglePerson={vi.fn()}
        searchQuery=""
      />
    );

    await user.click(await screen.findByRole('button', { name: locales.en.rearrangeGraph }));

    expect(confirm).toHaveBeenCalledWith(locales.en.confirmRearrangeGraph);
  });
});
