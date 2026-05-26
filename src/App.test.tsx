import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './constants';
import { locales } from './locales';

describe('App', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('autosaves text edits to local storage', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'text' }));
    await user.clear(screen.getByLabelText('Family tree source'));
    await user.type(screen.getByLabelText('Family tree source'), 'a:Alpha,g=u');

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBe('a:Alpha,g=u');
    });
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

  it('keeps the graph footer visible before selection', async () => {
    render(<App />);

    const graphWorkspace = await screen.findByTestId('graph-workspace');

    expect(within(graphWorkspace).getByRole('status', { name: 'Kinship' })).toHaveTextContent(locales.en.relationshipHint);
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
