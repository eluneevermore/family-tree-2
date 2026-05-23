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
    await user.click(screen.getByRole('button', { name: 'Update text' }));

    expect(onSubmitEdit).toHaveBeenCalledWith({
      type: 'add-spouse',
      personId: 'a',
      spouseId: 'betaperson',
      spouse: { id: 'betaperson', name: 'Beta Person', gender: 'female', born: undefined }
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
      childId: 'childperson',
      child: { id: 'childperson', name: 'Child Person', gender: 'unknown', born: undefined }
    });
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
