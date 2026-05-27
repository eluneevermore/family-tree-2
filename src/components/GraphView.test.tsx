import { ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { locales } from '../locales';
import { parseFamilyTreeText } from '../services/parser';
import { FamilyTreeDocument } from '../types';
import { GraphView } from './GraphView';

const GRAPH_TEXT = `
dad:Dad,g=m,b=1970,d=2010,n=Dad note
mom:Mom,g=f,b=1972
me:Me,g=m,b=2000
sis:Sister,g=f,b=1998
dad+mom->sis,me
`;

type GraphViewProps = ComponentProps<typeof GraphView>;

interface RenderGraphViewOptions extends Partial<GraphViewProps> {
  readonly document: FamilyTreeDocument;
}

describe('GraphView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('notifies when a person is selected and hovered', async () => {
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const onHoverPerson = vi.fn();
    const onSelectPerson = vi.fn();
    renderGraphView({ document, onHoverPerson, onSelectPerson });

    fireEvent.click(await screen.findByTestId('person-node-me'));
    fireEvent.mouseEnter(await screen.findByTestId('person-node-dad'));

    expect(onSelectPerson).toHaveBeenCalledWith('me');
    expect(onHoverPerson).toHaveBeenCalledWith('dad');
  });

  it('notifies when a spouse shortcut item is hovered', async () => {
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const onHoverPerson = vi.fn();
    renderGraphView({ document, onHoverPerson });

    fireEvent.mouseEnter(await screen.findByTestId('spouse-item-couple:dad+mom'));

    expect(onHoverPerson).toHaveBeenCalledWith('mom');
  });

  it('shows birth and death years in person nodes', async () => {
    const document = parseFamilyTreeText(GRAPH_TEXT);
    renderGraphView({ document });

    expect(await screen.findByText('[1970 - 2010]')).toBeInTheDocument();
  });

  it('applies configured person node dimensions', async () => {
    const document = parseFamilyTreeText(GRAPH_TEXT);
    renderGraphView({ document, nodeHeight: 128, nodeWidth: 220 });

    expect(await screen.findByTestId('person-node-dad')).toHaveStyle({
      minHeight: '128px',
      width: '220px'
    });
  });

  it('shows a hoverable note mark on person nodes with notes', async () => {
    const document = parseFamilyTreeText(GRAPH_TEXT);
    renderGraphView({ document });

    const dadNode = await screen.findByTestId('person-node-dad');
    const noteMark = within(dadNode).getByTestId('person-note-dad');

    expect(noteMark).toHaveAttribute('title', 'Dad note');
    expect(noteMark).toHaveAttribute('aria-label', 'Note: Dad note');
    expect(within(dadNode).queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseEnter(noteMark);

    expect(within(dadNode).getByRole('tooltip', { hidden: true })).toHaveTextContent('Dad note');
  });

  it('fires node toggle, spouse checkbox, and spouse shortcut actions', async () => {
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const onToggleFamily = vi.fn();
    const onTogglePerson = vi.fn();
    const onFocusPerson = vi.fn();
    renderGraphView({ document, onFocusPerson, onToggleFamily, onTogglePerson });

    const spouseItem = await screen.findByTestId('spouse-item-couple:dad+mom');
    fireEvent.click(await screen.findByTestId('person-toggle-dad'));
    fireEvent.click(within(spouseItem).getByTestId('spouse-family-checkbox-couple:dad+mom'));
    fireEvent.click(screen.getByTestId('spouse-shortcut-mom'));

    expect(onTogglePerson).toHaveBeenCalledWith('dad');
    expect(onToggleFamily).toHaveBeenCalledWith('couple:dad+mom');
    expect(onFocusPerson).toHaveBeenCalledWith('mom');
  });

  it('shows spouse indexes when a person has multiple spouse shortcuts', async () => {
    const document = parseFamilyTreeText(`
a:Alpha,g=u
s1:Spouse One,g=u
s2:Spouse Two,g=u
c1:Child One,g=u
c2:Child Two,g=u
a+s1->c1
a+s2->c2
`);
    renderGraphView({ document, focusPersonId: 'a' });

    const firstSpouse = await screen.findByTestId('spouse-item-couple:a+s1');
    const secondSpouse = await screen.findByTestId('spouse-item-couple:a+s2');

    expect(within(firstSpouse).getByTestId('spouse-index-couple:a+s1')).toHaveTextContent('1');
    expect(within(secondSpouse).getByTestId('spouse-index-couple:a+s2')).toHaveTextContent('2');
  });

  it('shows a spouse item when that spouse is also visible as a person node', async () => {
    const document = parseFamilyTreeText(`
p:Parent,g=u
a:Alpha,g=u
s:Spouse,g=u
c:Child,g=u
p->a,s
a+s->c
`);
    renderGraphView({ document, focusPersonId: 'a' });

    const alphaNode = await screen.findByTestId('person-node-a');

    expect(await screen.findByTestId('person-node-s')).toBeInTheDocument();
    expect(within(alphaNode).getByTestId('spouse-item-couple:a+s')).toBeInTheDocument();
  });

  it('confirms before resetting manual graph positions', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderGraphView({ document });

    await user.click(await screen.findByRole('button', { name: locales.en.rearrangeGraph }));

    expect(confirm).toHaveBeenCalledWith(locales.en.confirmRearrangeGraph);
  });

  it('groups add actions into a menu and fires add parent', async () => {
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const onAddParent = vi.fn();
    renderGraphView({ document, onAddParent });

    const dadNode = await screen.findByTestId('person-node-dad');
    fireEvent.click(within(dadNode).getByTestId('person-actions-dad'));
    expect(within(dadNode).getByTestId('person-action-add-spouse-dad')).toHaveTextContent(locales.en.addSpouse);
    expect(within(dadNode).getByTestId('person-action-add-spouse-dad')).not.toHaveTextContent('Dad');
    expect(within(dadNode).getByTestId('person-action-add-child-dad')).toHaveTextContent(locales.en.addChild);
    expect(within(dadNode).getByTestId('person-action-add-parent-dad')).toHaveTextContent(locales.en.addParent);
    fireEvent.click(within(dadNode).getByTestId('person-action-add-parent-dad'));

    expect(onAddParent).toHaveBeenCalledWith(document.people.get('dad'));
  });

  it('closes the node action menu when the graph pane is clicked', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const { container } = renderGraphView({ document });

    const dadNode = await screen.findByTestId('person-node-dad');
    await user.click(within(dadNode).getByTestId('person-actions-dad'));
    expect(within(dadNode).getByTestId('person-action-add-spouse-dad')).toBeInTheDocument();

    fireEvent.pointerDown(container.querySelector('.react-flow__pane') as Element);

    expect(screen.queryByTestId('person-action-add-spouse-dad')).not.toBeInTheDocument();
  });

  it('clears selected person when the graph pane is clicked', async () => {
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const onClearSelection = vi.fn();
    const { container } = renderGraphView({ document, onClearSelection, selectedPersonId: 'me' });

    fireEvent.click(container.querySelector('.react-flow__pane') as Element);

    expect(onClearSelection).toHaveBeenCalled();
  });

  it('keeps search local to the graph and supports clearing it', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText(GRAPH_TEXT);
    const onRevealPerson = vi.fn();
    renderGraphView({ document, onRevealPerson });

    await user.type(screen.getByLabelText('Search people'), 'mo');

    expect(await screen.findByRole('listbox', { name: locales.en.searchSuggestions })).toBeInTheDocument();
    await user.click(screen.getByTestId('search-suggestion-mom'));
    expect(onRevealPerson).toHaveBeenCalledWith('mom');

    await user.click(screen.getByRole('button', { name: locales.en.clearSearch }));

    expect(screen.getByLabelText('Search people')).toHaveValue('');
    expect(screen.queryByRole('listbox', { name: locales.en.searchSuggestions })).not.toBeInTheDocument();
  });
});

function renderGraphView(options: RenderGraphViewOptions): ReturnType<typeof render> {
  return render(
    <GraphView
      collapsedFamilyIds={options.collapsedFamilyIds ?? new Set()}
      collapsedPersonIds={options.collapsedPersonIds ?? new Set()}
      document={options.document}
      focusPersonId={options.focusPersonId ?? 'me'}
      locale={options.locale ?? locales.en}
      connectionStyle={options.connectionStyle ?? 'smoothstep'}
      nodeHeight={options.nodeHeight ?? 88}
      nodeWidth={options.nodeWidth ?? 172}
      nodeSpacing={options.nodeSpacing ?? 72}
      selectedPersonId={options.selectedPersonId ?? null}
      onAddChild={options.onAddChild ?? vi.fn()}
      onAddParent={options.onAddParent ?? vi.fn()}
      onAddSpouse={options.onAddSpouse ?? vi.fn()}
      onClearSelection={options.onClearSelection ?? vi.fn()}
      onFocusPerson={options.onFocusPerson ?? vi.fn()}
      onHoverPerson={options.onHoverPerson ?? vi.fn()}
      onRevealPerson={options.onRevealPerson ?? vi.fn()}
      onSelectPerson={options.onSelectPerson ?? vi.fn()}
      onToggleFamily={options.onToggleFamily ?? vi.fn()}
      onTogglePerson={options.onTogglePerson ?? vi.fn()}
    />
  );
}
