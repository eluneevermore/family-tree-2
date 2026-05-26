import { expect, test, type Page } from '@playwright/test';

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

test('search suggests people before focusing a selected person', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('person-node-f')).toBeVisible();
  await page.getByLabel('Search people').fill('c');

  await expect(page.getByRole('listbox', { name: 'Search suggestions' })).toBeVisible();
  await expect(page.getByTestId('person-node-f')).toBeVisible();
  const settledTransform = await waitForStableViewportTransform(page);
  await page.getByLabel('Search people').fill('ch');
  await expect(page.locator('.react-flow__viewport')).toHaveCSS('transform', settledTransform);
  await page.getByTestId('search-suggestion-sis').click();
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

test('shows kinship between people in split graph views', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'text' }).click();
  await page.getByLabel('Family tree source').fill(`pa:Alpha Parent,g=u
pb:Beta Parent,g=u
ac:Alpha Child,g=u
bc:Beta Child,g=u
pa->ac
pb->bc
`);
  await page.getByRole('button', { name: 'graph' }).click();

  const firstGraphView = page.getByTestId('graph-view-graph-1');
  await firstGraphView.getByLabel('Search people').fill('Alpha Child');
  await firstGraphView.getByTestId('search-suggestion-ac').click();
  await page.getByRole('button', { name: 'Split graph view' }).click();

  const secondGraphView = page.getByTestId('graph-view-graph-2');
  await secondGraphView.getByLabel('Search people').fill('Beta Child');
  await secondGraphView.getByTestId('search-suggestion-bc').click();

  await firstGraphView.getByTestId('person-node-ac').click();
  await secondGraphView.getByTestId('person-node-bc').locator('.person-main').hover();

  await expect(page.getByRole('status', { name: 'Kinship' })).toContainText('relative');
  await page.getByLabel('Language').selectOption('vi');
  await secondGraphView.getByTestId('person-node-bc').dispatchEvent('mouseover');
  await expect(page.getByRole('status', { name: 'Kinship' })).toContainText('họ hàng');
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
  await page.getByTestId('search-suggestion-a').click();

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
  await page.getByTestId('search-suggestion-a').click();
  await page.getByTestId('person-actions-a').click();
  await page.getByTestId('person-action-add-spouse-a').click();
  await page.getByRole('button', { name: 'Existing' }).click();
  await page.getByLabel('Person id').fill('be');

  await expect(page.getByRole('button', { name: /Beta Person beta/ })).toBeVisible();
});

async function waitForStableViewportTransform(page: Page): Promise<string> {
  let previousTransform = await getViewportTransform(page);
  await expect.poll(async () => {
    const currentTransform = await getViewportTransform(page);
    if (currentTransform === previousTransform) {
      return currentTransform;
    }

    previousTransform = currentTransform;
    return '';
  }).not.toBe('');
  return previousTransform;
}

async function getViewportTransform(page: Page): Promise<string> {
  return page.locator('.react-flow__viewport').evaluate((element) => {
    return window.getComputedStyle(element).transform;
  });
}
