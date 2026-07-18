import { expect, test } from '@playwright/test';

test('plays a question and persists the score after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Die große Geburtstagsrunde' })).toBeVisible();
  await expect(page.getByText('Süße Belohnung')).toHaveCount(0);
  await expect(page.getByText('Geheimer Preis')).toHaveCount(5);

  await page.getByRole('button', { name: 'Food & Drinks für 100 Punkte' }).click();
  await expect(page.getByRole('heading', { name: /Welche drei Farben/ })).toBeVisible();
  await page.getByRole('button', { name: 'Antwort aufdecken' }).click();
  await expect(page.getByText(/Rot, Weiß und Grün/)).toBeVisible();
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
  await page.getByLabel('Punktestand festlegen').press('Enter');
  await expect(page.getByRole('heading', { name: 'Du hast einen Preis freigeschaltet!' })).toBeVisible();
  await expect(page.getByText('Süße Belohnung')).toHaveCount(0);
  await page.getByRole('button', { name: 'Preis enthüllen' }).click();
  await expect(page.getByRole('heading', { name: 'Süße Belohnung' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiterfeiern' }).click();
  await expect(page.getByText('1.600', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.prize-card.unlocked')).toHaveCount(1);

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Gesamten Fortschritt zurücksetzen' }).click();
  await expect(page.getByText('0', { exact: true }).first()).toBeVisible();
});

test('a joker pauses and resets the timer and persists its use', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Food & Drinks für 100 Punkte' }).click();
  await expect(page.getByRole('timer')).toHaveAttribute('aria-label', /Sekunden verbleiben/);
  await page.waitForTimeout(2100);

  await page.getByRole('button', { name: /3 Antworten/ }).click();
  await expect(page.getByRole('dialog', { name: 'Joker aktiv' })).toContainText('Timer pausiert');
  await expect(page.getByRole('timer')).toHaveAttribute('aria-label', '60 Sekunden verbleiben');
  await page.getByRole('button', { name: 'Timer neu starten' }).click();
  await expect(page.getByLabel('Antwortmöglichkeiten')).toContainText('Tomate, Mozzarella, Basilikum');
  await expect(page.getByRole('button', { name: /3 Antworten/ })).toContainText('2 übrig');

  await page.getByRole('button', { name: 'Frage schließen' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Food & Drinks für 100 Punkte' }).click();
  await expect(page.getByRole('button', { name: /3 Antworten/ })).toContainText('2 übrig');
});

test('admin can override and persist the question timer', async ({ page }) => {
  await page.goto('/?admin=true');
  await page.getByText('Admin-Werkzeuge').click();
  await page.getByLabel('Zeit pro Frage').fill('12');
  await page.getByLabel('Zeit pro Frage').press('Enter');
  await page.reload();

  await page.getByRole('button', { name: 'Food & Drinks für 100 Punkte' }).click();
  await expect(page.getByRole('timer')).toHaveAttribute('aria-label', /(?:11|12) Sekunden verbleiben/);
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
