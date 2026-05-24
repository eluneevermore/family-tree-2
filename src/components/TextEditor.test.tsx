import { ReactElement, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { locales } from '../locales';
import { parseFamilyTreeText } from '../services/parser';
import { TextEditor } from './TextEditor';

describe('TextEditor', () => {
  it('shows diagnostics and propagates text edits', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    render(
      <TextEditor
        diagnostics={[{ severity: 'error', line: 2, code: 'unknown-reference', message: 'Unknown person id "x".' }]}
        document={parseFamilyTreeText('a:Alpha,g=u')}
        locale={locales.en}
        text="a:Alpha,g=u"
        onTextChange={onTextChange}
      />
    );

    await user.type(screen.getByLabelText('Family tree source'), '{End}\n');

    expect(screen.getByText('Unknown person id "x".')).toBeInTheDocument();
    expect(onTextChange).toHaveBeenCalled();
  });

  it('suggests and inserts ids while editing a relationship line', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    const document = parseFamilyTreeText('dad:Robert,g=m\nmom:Linda,g=f\n');
    render(
      <TextEditor
        diagnostics={[]}
        document={document}
        locale={locales.en}
        text="dad+mo"
        onTextChange={onTextChange}
      />
    );

    const textarea = screen.getByLabelText('Family tree source');
    await user.click(textarea);
    await user.keyboard('{End}');

    expect(screen.getByRole('listbox', { name: 'Person id suggestions' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /mom Linda/ }));

    expect(onTextChange).toHaveBeenCalledWith('dad+mom');
  });

  it('keeps Enter for new lines and uses Tab to accept suggestions', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText('dad:Robert,g=m\nmom:Linda,g=f\n');
    render(<ControlledTextEditor document={document} initialText="dad+mo" />);

    const textarea = screen.getByLabelText('Family tree source');
    await user.click(textarea);
    await user.keyboard('{End}{Enter}');

    expect(textarea).toHaveValue('dad+mo\n');

    await user.type(textarea, 'mo');
    await user.keyboard('{Tab}');

    expect(textarea).toHaveValue('dad+mo\nmom');
  });
});

interface ControlledTextEditorProps {
  readonly document: ReturnType<typeof parseFamilyTreeText>;
  readonly initialText: string;
}

function ControlledTextEditor({ document, initialText }: ControlledTextEditorProps): ReactElement {
  const [text, setText] = useState(initialText);
  return (
    <TextEditor
      diagnostics={[]}
      document={document}
      locale={locales.en}
      text={text}
      onTextChange={setText}
    />
  );
}
