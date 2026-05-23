import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './constants';

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
});
