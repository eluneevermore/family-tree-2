import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_FAMILY_TREE_NAME, STORAGE_FAMILY_TREES_KEY, STORAGE_SITE_CONFIGURATION_KEY } from './constants';
import { locales } from './locales';
import { decodeSharedTreeText, encodeSharedTreeText, SHARE_QUERY_PARAMETER } from './services/share-link';

describe('App', () => {
  afterEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('autosaves text edits to local storage', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'text' }));
    await user.clear(screen.getByLabelText('Family tree source'));
    await user.type(screen.getByLabelText('Family tree source'), 'a:Alpha,g=u');

    await waitFor(() => {
      expect(readStoredActiveTreeText()).toBe('a:Alpha,g=u');
    });
  });

  it('creates and switches between multiple family trees', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'prompt').mockReturnValue('Second Tree');
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'text' }));
    await user.clear(screen.getByLabelText('Family tree source'));
    await user.type(screen.getByLabelText('Family tree source'), 'a:Alpha,g=u');

    await user.selectOptions(
      screen.getByLabelText(locales.en.familyTree),
      screen.getByRole('option', { name: locales.en.createFamilyTree })
    );
    expect(screen.getByLabelText('Family tree source')).toHaveValue('# people\n\n# relationships\n');

    await user.clear(screen.getByLabelText('Family tree source'));
    await user.type(screen.getByLabelText('Family tree source'), 'b:Beta,g=u');
    await user.selectOptions(screen.getByLabelText(locales.en.familyTree), DEFAULT_FAMILY_TREE_NAME);

    expect(screen.getByLabelText('Family tree source')).toHaveValue('a:Alpha,g=u');

    await user.selectOptions(screen.getByLabelText(locales.en.familyTree), 'Second Tree');

    expect(screen.getByLabelText('Family tree source')).toHaveValue('b:Beta,g=u');
  });

  it('renames and deletes saved family trees', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('Second Tree')
      .mockReturnValueOnce('Renamed Tree');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);

    expect(screen.getByRole('button', { name: locales.en.deleteFamilyTree })).toBeDisabled();

    await user.selectOptions(
      screen.getByLabelText(locales.en.familyTree),
      screen.getByRole('option', { name: locales.en.createFamilyTree })
    );
    await user.click(screen.getByRole('button', { name: locales.en.renameFamilyTree }));

    expect(screen.getByRole('option', { name: 'Renamed Tree' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: locales.en.deleteFamilyTree }));

    expect(screen.queryByRole('option', { name: 'Renamed Tree' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(locales.en.familyTree)).toHaveDisplayValue(DEFAULT_FAMILY_TREE_NAME);
  });

  it('shows parser diagnostics in the UI', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'text' }));
    await user.clear(screen.getByLabelText('Family tree source'));
    await user.type(screen.getByLabelText('Family tree source'), 'a:Alpha,g=u\na->missing');

    expect(await screen.findByText('Unknown person id "missing".')).toBeInTheDocument();
  });

  it('shows full language names', () => {
    render(<App />);

    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tiếng Việt (Miền bắc)' })).toBeInTheDocument();
  });

  it('uses querystring language as the initial language', () => {
    window.history.pushState({}, '', '/?lang=vi');

    render(<App />);

    expect(screen.getByLabelText('Language')).toHaveValue('vi');
    expect(screen.getByRole('heading', { name: locales.vi.appTitle })).toBeInTheDocument();
  });

  it('opens shared links as read-only previews without overwriting the active tree', () => {
    writeStoredFamilyTrees('local:Local,g=u');
    window.history.pushState({}, '', `/?${SHARE_QUERY_PARAMETER}=${encodeSharedTreeText('shared:Shared,g=u')}`);

    render(<App />);

    expect(screen.getByText(locales.en.sharedPreviewTitle)).toBeInTheDocument();
    expect(screen.getByLabelText('Family tree source')).toHaveValue('shared:Shared,g=u');
    expect(screen.getByLabelText('Family tree source')).toHaveAttribute('readonly');
    expect(readStoredActiveTreeText()).toBe('local:Local,g=u');
  });

  it('saves shared previews as new trees only after the user chooses to', async () => {
    const user = userEvent.setup();
    const sharedText = 'shared:Shared,g=u';
    vi.spyOn(window, 'prompt').mockReturnValue('Shared Copy');
    writeStoredFamilyTrees('local:Local,g=u');
    window.history.pushState({}, '', `/?${SHARE_QUERY_PARAMETER}=${encodeSharedTreeText(sharedText)}`);

    render(<App />);
    await user.click(screen.getByRole('button', { name: locales.en.saveSharedTreeAsNew }));

    expect(screen.queryByText(locales.en.sharedPreviewTitle)).not.toBeInTheDocument();
    expect(screen.getByLabelText(locales.en.familyTree)).toHaveDisplayValue('Shared Copy');
    expect(readStoredActiveTreeText()).toBe(sharedText);
    expect(window.location.search).toBe('');
  });

  it('replaces the active tree from a shared preview only after confirmation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const sharedText = 'shared:Shared,g=u';
    writeStoredFamilyTrees('local:Local,g=u');
    window.history.pushState({}, '', `/?${SHARE_QUERY_PARAMETER}=${encodeSharedTreeText(sharedText)}`);

    render(<App />);

    await user.click(screen.getByRole('button', { name: locales.en.replaceCurrentTree }));
    expect(readStoredActiveTreeText()).toBe('local:Local,g=u');

    await user.click(screen.getByRole('button', { name: locales.en.replaceCurrentTree }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(readStoredActiveTreeText()).toBe(sharedText);
    expect(screen.queryByText(locales.en.sharedPreviewTitle)).not.toBeInTheDocument();
  });

  it('copies a share link for the current tree text', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'text' }));
    await user.clear(screen.getByLabelText('Family tree source'));
    await user.type(screen.getByLabelText('Family tree source'), 'a:Nguyễn Văn A,g=m');
    await user.click(screen.getByRole('button', { name: locales.en.shareTree }));

    expect(writeText).toHaveBeenCalledTimes(1);
    const sharedUrl = new URL(String(writeText.mock.calls[0]?.[0]));
    expect(decodeSharedTreeText(sharedUrl.searchParams.get(SHARE_QUERY_PARAMETER) ?? '')).toBe('a:Nguyễn Văn A,g=m');
  });

  it('keeps the graph footer visible before selection', async () => {
    render(<App />);

    const graphWorkspace = await screen.findByTestId('graph-workspace');

    expect(within(graphWorkspace).getByRole('status', { name: 'Kinship' })).toHaveTextContent(locales.en.relationshipHint);
  });

  it('keeps graph settings as a shared footer control in split view', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: locales.en.splitGraphView }));
    const graphWorkspace = await screen.findByTestId('graph-workspace');

    expect(within(graphWorkspace).getAllByRole('button', { name: locales.en.graphSettings })).toHaveLength(1);
  });

  it('updates and persists graph settings from the graph footer popup', async () => {
    const user = userEvent.setup();
    render(<App />);

    const graphWorkspace = await screen.findByTestId('graph-workspace');
    await user.click(within(graphWorkspace).getByRole('button', { name: locales.en.graphSettings }));
    const settingsDialog = within(graphWorkspace).getByRole('dialog', { name: locales.en.graphSettings });
    fireEvent.change(within(settingsDialog).getByLabelText(locales.en.connectionStyle), {
      target: { value: 'straight' }
    });
    fireEvent.change(within(settingsDialog).getByLabelText(locales.en.nodeWidth), {
      target: { value: '220' }
    });
    fireEvent.change(within(settingsDialog).getByLabelText(locales.en.nodeHeight), {
      target: { value: '128' }
    });
    fireEvent.change(within(settingsDialog).getByLabelText(locales.en.nodeSpacing), {
      target: { value: '104' }
    });

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_SITE_CONFIGURATION_KEY)).toContain('"connectionStyle":"straight"');
      expect(localStorage.getItem(STORAGE_SITE_CONFIGURATION_KEY)).toContain('"personNodeWidth":220');
      expect(localStorage.getItem(STORAGE_SITE_CONFIGURATION_KEY)).toContain('"personNodeHeight":128');
      expect(localStorage.getItem(STORAGE_SITE_CONFIGURATION_KEY)).toContain('"personHorizontalGap":104');
    });
    expect(await screen.findByTestId('person-node-f')).toHaveStyle({ width: '220px' });
    expect(await screen.findByTestId('person-node-f')).toHaveStyle({ minHeight: '128px' });
  });

  it('resizes the editor panel in combined view', async () => {
    render(<App />);

    const workspace = screen.getByTestId('workspace');
    const resizeHandle = screen.getByRole('separator', { name: locales.en.resizeEditor });
    fireEvent(resizeHandle, new MouseEvent('pointerdown', { bubbles: true, clientX: 460 }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 540 }));
    window.dispatchEvent(new MouseEvent('pointerup'));

    await waitFor(() => {
      expect(workspace).toHaveStyle('--text-panel-width: 540px');
    });
  });

  it('shows search suggestions without changing focus until a person is selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByTestId('person-node-f')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search people'), 'c');

    expect(await screen.findByRole('listbox', { name: locales.en.searchSuggestions })).toBeInTheDocument();
    expect(screen.getByTestId('person-node-f')).toBeInTheDocument();

    await user.click(screen.getByTestId('search-suggestion-uncleInLaw'));

    await waitFor(() => {
      expect(screen.queryByTestId('person-node-f')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('person-node-uncleInLaw')).toBeInTheDocument();
  });

  it('shows kinship across split graph views', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: locales.en.splitGraphView }));
    const graphWorkspace = await screen.findByTestId('graph-workspace');
    const firstGraphView = await screen.findByTestId('graph-view-graph-1');
    const secondGraphView = await screen.findByTestId('graph-view-graph-2');

    fireEvent.click(await within(firstGraphView).findByTestId('person-node-me'));
    fireEvent.mouseEnter(await within(secondGraphView).findByTestId('person-node-f'));

    expect(await within(graphWorkspace).findByRole('status', { name: 'Kinship' })).toHaveTextContent('father');
    expect(within(firstGraphView).queryByText('father')).not.toBeInTheDocument();
    expect(within(secondGraphView).queryByText('father')).not.toBeInTheDocument();
  });
});

function readStoredActiveTreeText(): string | null {
  const storedValue = localStorage.getItem(STORAGE_FAMILY_TREES_KEY);
  if (!storedValue) {
    return null;
  }

  const parsedValue = JSON.parse(storedValue) as {
    readonly activeTreeId?: string;
    readonly trees?: readonly { readonly id: string; readonly text: string }[];
  };
  return parsedValue.trees?.find((tree) => tree.id === parsedValue.activeTreeId)?.text ?? null;
}

function writeStoredFamilyTrees(text: string): void {
  localStorage.setItem(STORAGE_FAMILY_TREES_KEY, JSON.stringify({
    activeTreeId: 'local-tree',
    trees: [{
      id: 'local-tree',
      name: 'Local Tree',
      text
    }]
  }));
}
