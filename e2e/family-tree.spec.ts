import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('loads compact DSL and renders graph nodes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  await page.getByLabel('Family tree source').fill(`p:Parent,g=u,b=1950
c:Child,g=u,b=1980
p->c
`);
  await page.getByRole('button', { name: 'graph' }).click();

  await expect(page.getByTestId('person-node-p')).toContainText('Parent');
  await expect(page.getByTestId('person-node-c')).toContainText('Child');
});

test('search highlights and focuses a person', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Search people').fill('Chloe');

  await expect(page.getByTestId('person-node-sis')).toContainText('Chloe Smith');
});

test('collapses and expands descendants', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  await page.getByLabel('Family tree source').fill(`p:Parent,g=u
c:Child,g=u
g:Grandchild,g=u
p->c
c->g
`);
  await page.getByRole('button', { name: 'graph' }).click();

  await expect(page.getByTestId('person-node-g')).toBeVisible();
  await page.getByTestId('person-toggle-c').click();
  await expect(page.getByTestId('person-node-g')).toBeHidden();
  await page.getByTestId('person-toggle-c').click();
  await expect(page.getByTestId('person-node-g')).toBeVisible();
});

test('selects a person and shows localized kinship on hover', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  await page.getByLabel('Family tree source').fill(`dad:Dad,g=m,b=1970
mom:Mom,g=f,b=1972
me:Me,g=m,b=2000
dad+mom->me
`);
  await page.getByRole('button', { name: 'graph' }).click();

  await page.getByTestId('person-node-me').click();
  await page.getByTestId('person-node-dad').hover();
  await expect(page.getByText('father')).toBeVisible();

  await page.getByLabel('Language').selectOption('vi');
  await page.getByTestId('person-node-dad').hover();
  await expect(page.getByText('bố')).toBeVisible();
});

test('spouse shortcut switches graph focus to spouse ancestry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  await page.getByLabel('Family tree source').fill(`dad:Dad,g=m
mom:Mom,g=f
mgf:Maternal Grandpa,g=m
me:Me,g=u
mgf->mom
dad+mom->me
`);
  await page.getByRole('button', { name: 'graph' }).click();

  await expect(page.getByTestId('person-node-mgf')).toBeHidden();
  await page.getByTestId('spouse-shortcut-mom').click();
  await expect(page.getByTestId('person-node-mgf')).toBeVisible();
  await expect(page.getByTestId('person-node-dad')).toBeHidden();
});

test('suggests ids in the DSL editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  const source = page.getByLabel('Family tree source');
  await source.fill(`dad:Robert,g=m
mom:Linda,g=f
dad+mo`);
  await source.press('End');

  await expect(page.getByRole('listbox', { name: 'Person id suggestions' })).toBeVisible();
  await page.getByRole('button', { name: /mom Linda/ }).click();
  await expect(source).toHaveValue(`dad:Robert,g=m
mom:Linda,g=f
dad+mom`);
});

test('uses Enter for new lines and Tab for DSL id suggestions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  const source = page.getByLabel('Family tree source');
  await source.fill(`dad:Robert,g=m
mom:Linda,g=f
dad+mo`);
  await source.press('End');
  await source.press('Enter');

  await expect(source).toHaveValue(`dad:Robert,g=m
mom:Linda,g=f
dad+mo
`);

  await source.pressSequentially('mo');
  await source.press('Tab');

  await expect(source).toHaveValue(`dad:Robert,g=m
mom:Linda,g=f
dad+mo
mom`);
});

test('shows separate descendant toggles for multiple spouses', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  await page.getByLabel('Family tree source').fill(`a:Alpha,g=u
s1:Spouse One,g=u
s2:Spouse Two,g=u
c1:Child One,g=u
c2:Child Two,g=u
c3:Child Three,g=u
c4:Child Four,g=u
a+s1->c1,c2
a+s2->c3,c4
`);
  await page.getByRole('button', { name: 'graph' }).click();
  await page.getByLabel('Search people').fill('Alpha');

  const firstSpouseItem = page.getByTestId('spouse-item-couple:a+s1');
  const secondSpouseItem = page.getByTestId('spouse-item-couple:a+s2');
  await expect(firstSpouseItem).toBeVisible();
  await expect(secondSpouseItem).toBeVisible();
  await expect(page.getByTestId('person-toggle-a')).toBeVisible();
  await expect(firstSpouseItem.getByTestId('spouse-family-checkbox-couple:a+s1')).toBeChecked();
  await expect(secondSpouseItem.getByTestId('spouse-family-checkbox-couple:a+s2')).toBeChecked();

  await firstSpouseItem.getByTestId('spouse-family-checkbox-couple:a+s1').click();

  await expect(page.getByTestId('person-node-c1')).toBeHidden();
  await expect(page.getByTestId('person-node-c2')).toBeHidden();
  await expect(page.getByTestId('person-node-c3')).toBeVisible();
  await expect(page.getByTestId('person-node-c4')).toBeVisible();

  await firstSpouseItem.getByTestId('spouse-family-checkbox-couple:a+s1').click();
  await page.getByTestId('person-toggle-a').click();

  await expect(page.getByTestId('person-node-c1')).toBeHidden();
  await expect(page.getByTestId('person-node-c2')).toBeHidden();
  await expect(page.getByTestId('person-node-c3')).toBeHidden();
  await expect(page.getByTestId('person-node-c4')).toBeHidden();
});

test('suggests ids in graph edit forms', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  await page.getByLabel('Family tree source').fill(`a:Alpha,g=u
beta:Beta Person,g=f
`);
  await page.getByRole('button', { name: 'graph' }).click();
  await page.getByLabel('Search people').fill('Alpha');
  await page.getByTestId('person-actions-a').click();
  await page.getByTestId('person-action-add-spouse-a').click();
  await page.getByRole('button', { name: 'Existing' }).click();
  await page.getByLabel('Person id').fill('be');

  await expect(page.getByRole('button', { name: /Beta Person beta/ })).toBeVisible();
});
