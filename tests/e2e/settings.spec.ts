import { expect, test } from '@playwright/test';
import { buildCheckboxLabel, ensurePluginActive, gotoSettingsPage, withCheckoutLabel } from './helpers';

test.beforeEach(async ({ page }) => {
  await ensurePluginActive(page);
});

test('settings page renders with expected fields', async ({ page }) => {
  await gotoSettingsPage(page);

  await expect(page.locator('#laposta-checkout-title')).toBeVisible();
  await expect(page.locator('#laposta-api_key')).toBeVisible();
  await expect(page.locator('form[action="options.php"]')).toBeVisible();
  await expect(page.locator('text=Tekst in Checkout')).toBeVisible();
  await expect(page.locator('text=In welke lijst moeten de inschrijvingen terecht komen?')).toBeVisible();
});

test('checkout title can be saved and remains persisted', async ({ page }) => {
  const value = buildCheckboxLabel();
  await withCheckoutLabel(page, value, async () => {
    await gotoSettingsPage(page);
    await expect(page.locator('#laposta-checkout-title')).toHaveValue(value);
  });
});
