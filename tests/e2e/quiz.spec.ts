import { expect, test } from '@playwright/test';

test('plays a question and persists the score after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Die große Geburtstagsrunde' })).toBeVisible();
  await expect(page.getByText('Süße Belohnung')).toHaveCount(0);
  await expect(page.getByText('Geheimer Preis')).toHaveCount(4);

  await page.getByRole('button', { name: 'Food & Drinks für 100 Punkte' }).click();
  await expect(page.getByRole('heading', { name: /Welche Frucht/ })).toBeVisible();
  await page.getByRole('button', { name: 'Antwort aufdecken' }).click();
  await expect(page.getByText('Die Avocado.')).toBeVisible();
  await page.getByRole('button', { name: 'Richtig' }).click();

  await expect(page.getByRole('status')).toContainText('Richtig! Plus 100 Punkte.');
  await expect(page.locator('.correct-celebration')).toBeVisible();
  await expect(page.getByText('100', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Food & Drinks für 100 Punkte, richtig beantwortet/ })).toBeDisabled();

  await page.reload();
  await expect(page.getByRole('button', { name: /Food & Drinks für 100 Punkte, richtig beantwortet/ })).toBeDisabled();
});

test('admin mode can correct the score and reset the game', async ({ page }) => {
  await page.goto('/?admin=true');
  await page.getByText('Admin-Werkzeuge').click();

  await page.getByLabel('Punktestand festlegen').fill('1600');
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.getByText('1.600', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.prize-card.unlocked')).toHaveCount(1);

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Gesamten Fortschritt zurücksetzen' }).click();
  await expect(page.getByText('0', { exact: true }).first()).toBeVisible();
});

test('the hidden star gesture enables admin mode without a reload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'The decorative star is intentionally hidden on narrow screens.');
  await page.goto('/');

  await expect(page.getByText('Korrekturmodus:')).toHaveCount(0);
  await expect(page.getByText('Admin-Werkzeuge')).toHaveCount(0);
  await page.locator('[data-admin-trigger]').dblclick();

  await expect(page).toHaveURL(/admin=true/);
  await expect(page.getByText('Admin-Werkzeuge')).toBeVisible();
});

test('shows the celebration automatically after the final answer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'The complete flow is identical at both breakpoints.');
  await page.goto('/');

  for (let index = 0; index < 30; index += 1) {
    await page.locator('.question-list button:not(:disabled)').first().click();
    await page.getByRole('button', { name: 'Antwort aufdecken' }).click();
    await page.getByRole('button', { name: 'Falsch', exact: true }).click();
  }

  await expect(page.getByRole('heading', { name: 'Großartig gemacht!' })).toBeVisible();
  await expect(page.getByText('Alle Fragen sind gespielt')).toBeVisible();
});
