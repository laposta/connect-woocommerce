import { expect, test } from '@playwright/test';
import {
  buildCheckboxLabel,
  buildRandomEmail,
  deleteLapostaMemberIfExists,
  ensurePluginActive,
  ensureWooCommerceActive,
  expectLapostaMemberState,
  getFirstStoreProductId,
  gotoSettingsPage,
  openCheckoutWithProduct,
  placeWooOrder,
  resolveLapostaConfig,
  saveSettings,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await ensureWooCommerceActive(page);
  await ensurePluginActive(page);
});

async function getLapostaConfigOrSkip(page: Parameters<typeof resolveLapostaConfig>[0]) {
  try {
    return await resolveLapostaConfig(page);
  } catch (error) {
    test.skip(true, `Laposta API config unavailable: ${(error as Error).message}`);
    throw error;
  }
}

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

test('does not subscribe checkout email when newsletter checkbox is left unchecked', async ({ page }) => {
  const config = await getLapostaConfigOrSkip(page);
  const email = buildRandomEmail();
  const productId = await getFirstStoreProductId(page);

  try {
    await deleteLapostaMemberIfExists(config, email);
  } catch (error) {
    test.skip(true, `Laposta API unavailable: ${(error as Error).message}`);
  }

  try {
    await openCheckoutWithProduct(page, productId);
    await placeWooOrder(page, email, { subscribe: false });
    await expectLapostaMemberState(config, email, false);
  } finally {
    await deleteLapostaMemberIfExists(config, email);
  }
});

test('subscribes checkout email when newsletter checkbox is checked', async ({ page }) => {
  const config = await getLapostaConfigOrSkip(page);
  const email = buildRandomEmail();
  const productId = await getFirstStoreProductId(page);

  try {
    await deleteLapostaMemberIfExists(config, email);
  } catch (error) {
    test.skip(true, `Laposta API unavailable: ${(error as Error).message}`);
  }

  try {
    await openCheckoutWithProduct(page, productId);
    await placeWooOrder(page, email, { subscribe: true });
    await expectLapostaMemberState(config, email, true);
  } finally {
    await deleteLapostaMemberIfExists(config, email);
  }
});
