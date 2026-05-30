import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { locales } from '../locales';
import { parseFamilyTreeText } from '../services/parser';
import { EditModal } from './EditModal';

describe('EditModal', () => {
  it('submits a new spouse edit', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText('a:Alpha,g=u\n');
    const onSubmitEdit = vi.fn();
    render(
      <EditModal
        document={document}
        locale={locales.en}
        mode="add-spouse"
        person={document.people.get('a')!}
        onClose={vi.fn()}
        onSubmitEdit={onSubmitEdit}
      />
    );

    await user.type(screen.getByLabelText('Name'), 'Beta Person');
    await user.selectOptions(screen.getByLabelText('Gender'), 'female');
    await user.type(screen.getByLabelText('Note'), 'Met at school');
    await user.click(screen.getByRole('button', { name: 'Update text' }));

    expect(onSubmitEdit).toHaveBeenCalledWith({
      type: 'add-spouse',
      personId: 'a',
      spouseId: 'bp',
      spouse: {
        id: 'bp',
        name: 'Beta Person',
        gender: 'female',
        born: undefined,
        died: undefined,
        note: 'Met at school'
      }
    });
  });

  it('submits a child edit for an existing couple', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText('a:Alpha,g=u\nb:Beta,g=u\na+b\n');
    const onSubmitEdit = vi.fn();
    render(
      <EditModal
        document={document}
        locale={locales.en}
        mode="add-child"
        person={document.people.get('a')!}
        onClose={vi.fn()}
        onSubmitEdit={onSubmitEdit}
      />
    );

    await user.selectOptions(screen.getByLabelText('Relationship'), 'couple:a+b');
    await user.type(screen.getByLabelText('Name'), 'Child Person');
    await user.click(screen.getByRole('button', { name: 'Update text' }));

    expect(onSubmitEdit).toHaveBeenCalledWith({
      type: 'add-child',
      parents: ['a', 'b'],
      childId: 'cp',
      child: {
        id: 'cp',
        name: 'Child Person',
        gender: 'unknown',
        born: undefined,
        died: undefined,
        note: undefined
      }
    });
  });

  it('submits a parent edit', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText('c:Child,g=u\n');
    const onSubmitEdit = vi.fn();
    render(
      <EditModal
        document={document}
        locale={locales.en}
        mode="add-parent"
        person={document.people.get('c')!}
        onClose={vi.fn()}
        onSubmitEdit={onSubmitEdit}
      />
    );

    await user.type(screen.getByLabelText('Name'), 'Parent Person');
    await user.click(screen.getByRole('button', { name: 'Update text' }));

    expect(onSubmitEdit).toHaveBeenCalledWith({
      type: 'add-parent',
      childId: 'c',
      parentId: 'pp',
      parent: {
        id: 'pp',
        name: 'Parent Person',
        gender: 'unknown',
        born: undefined,
        died: undefined,
        note: undefined
      }
    });
  });

  it('increments generated initials when adding a new person with a used id', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText('a:Alpha,g=u\nbp:Beta Prime,g=u\nbp2:Beta Previous,g=u\n');
    const onSubmitEdit = vi.fn();
    render(
      <EditModal
        document={document}
        locale={locales.en}
        mode="add-spouse"
        person={document.people.get('a')!}
        onClose={vi.fn()}
        onSubmitEdit={onSubmitEdit}
      />
    );

    await user.type(screen.getByLabelText('Name'), 'Beta Person');
    await user.click(screen.getByRole('button', { name: 'Update text' }));

    expect(onSubmitEdit).toHaveBeenCalledWith(expect.objectContaining({
      spouseId: 'bp3',
      spouse: expect.objectContaining({ id: 'bp3' })
    }));
  });

  it('suggests existing people by id', async () => {
    const user = userEvent.setup();
    const document = parseFamilyTreeText('a:Alpha,g=u\nbeta:Beta Person,g=f\n');
    render(
      <EditModal
        document={document}
        locale={locales.en}
        mode="add-spouse"
        person={document.people.get('a')!}
        onClose={vi.fn()}
        onSubmitEdit={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Existing' }));
    await user.type(screen.getByLabelText('Person id'), 'be');

    expect(screen.getByRole('button', { name: /Beta Person beta/ })).toBeInTheDocument();
  });
});
