import { expect, test } from '@playwright/test';
import {
  buildCheckboxLabel,
  ensurePluginActive,
  ensureWooCommerceActive,
  getFirstStoreProductId,
  gotoSettingsPage,
  openCheckoutWithProduct,
  saveSettings,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await ensureWooCommerceActive(page);
  await ensurePluginActive(page);
});

test('adds newsletter checkbox to WooCommerce checkout form', async ({ page }) => {
  await gotoSettingsPage(page);

  const checkboxLabel = buildCheckboxLabel();
  await page.locator('#laposta-checkout-title').fill(checkboxLabel);
  await saveSettings(page);

  const productId = await getFirstStoreProductId(page);
  await openCheckoutWithProduct(page, productId);

  const checkbox = page.locator('input#nieuwsbrief_signup[name="nieuwsbrief_signup"]');
  await expect(checkbox).toBeVisible();
  await expect(checkbox.locator('xpath=ancestor::p[1]')).toContainText(checkboxLabel);
});
