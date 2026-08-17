import { expect, test } from '@playwright/test';
import {
  buildCheckboxLabel,
  buildRandomEmail,
  deleteLapostaMemberIfExists,
  ensurePluginActive,
  ensureWooCommerceActive,
  expectCheckoutBlockEditorLabel,
  expectLapostaMemberState,
  getFirstStoreProductId,
  gotoSettingsPage,
  openCheckoutBlockEditor,
  openCheckoutBlockWithProduct,
  openCheckoutWithProduct,
  placeWooBlockOrder,
  placeWooOrder,
  resolveLapostaConfig,
  withCheckoutBlock,
  withCheckoutLabel,
  withCheckoutPriorityFixture,
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
  const checkboxLabel = buildCheckboxLabel();
  const productId = await getFirstStoreProductId(page);
  await withCheckoutLabel(page, checkboxLabel, async () => {
    await openCheckoutWithProduct(page, productId);

    const checkbox = page.locator('input#nieuwsbrief_signup[name="nieuwsbrief_signup"]');
    await expect(checkbox).toBeVisible();
    await expect(checkbox.locator('xpath=ancestor::p[1]')).toContainText(checkboxLabel);
  });
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

test('adds newsletter checkbox to WooCommerce Checkout Block', async ({ page }) => {
  const checkboxLabel = buildCheckboxLabel();
  const productId = await getFirstStoreProductId(page);
  await withCheckoutLabel(page, checkboxLabel, async () => {
    await withCheckoutBlock(page, async () => {
      await openCheckoutBlockWithProduct(page, productId);

      const checkbox = page.getByRole('checkbox', { name: checkboxLabel, exact: true });
      await expect(checkbox).toBeVisible();
      await expect(checkbox).not.toBeChecked();
    });
  });
});

test('shows the configured newsletter checkbox in the Checkout Block editor', async ({ page }) => {
  const checkboxLabel = buildCheckboxLabel();
  await withCheckoutLabel(page, checkboxLabel, async () => {
    await withCheckoutBlock(page, async (checkoutPageId) => {
      await openCheckoutBlockEditor(page, checkoutPageId);
      await expectCheckoutBlockEditorLabel(page, checkboxLabel);
    });
  });
});

test('applies the field priority filter before other order fields', async ({ page }) => {
  const checkboxLabel = buildCheckboxLabel();
  const productId = await getFirstStoreProductId(page);

  await withCheckoutPriorityFixture(async (sentinelLabel) => {
    await withCheckoutLabel(page, checkboxLabel, async () => {
      await withCheckoutBlock(page, async () => {
        await openCheckoutBlockWithProduct(page, productId);

        const lapostaCheckbox = page.getByRole('checkbox', { name: checkboxLabel, exact: true });
        const sentinelCheckbox = page.getByRole('checkbox', { name: sentinelLabel, exact: true });
        await expect(lapostaCheckbox).toBeVisible();
        await expect(sentinelCheckbox).toBeVisible();

        const lapostaBox = await lapostaCheckbox.boundingBox();
        const sentinelBox = await sentinelCheckbox.boundingBox();
        expect(lapostaBox).not.toBeNull();
        expect(sentinelBox).not.toBeNull();
        expect(lapostaBox!.y).toBeLessThan(sentinelBox!.y);
      });
    });
  });
});

test('does not subscribe Checkout Block email when newsletter checkbox is left unchecked', async ({ page }) => {
  const config = await getLapostaConfigOrSkip(page);
  const email = buildRandomEmail();
  const productId = await getFirstStoreProductId(page);

  try {
    await deleteLapostaMemberIfExists(config, email);
  } catch (error) {
    test.skip(true, `Laposta API unavailable: ${(error as Error).message}`);
  }

  try {
    await withCheckoutBlock(page, async () => {
      await gotoSettingsPage(page);
      const checkboxLabel = (await page.locator('#laposta-checkout-title').inputValue()).trim();

      await openCheckoutBlockWithProduct(page, productId);
      await placeWooBlockOrder(page, email, checkboxLabel, { subscribe: false });
      await expectLapostaMemberState(config, email, false);
    });
  } finally {
    await deleteLapostaMemberIfExists(config, email);
  }
});

test('subscribes Checkout Block email when newsletter checkbox is checked', async ({ page }) => {
  const config = await getLapostaConfigOrSkip(page);
  const email = buildRandomEmail();
  const productId = await getFirstStoreProductId(page);

  try {
    await deleteLapostaMemberIfExists(config, email);
  } catch (error) {
    test.skip(true, `Laposta API unavailable: ${(error as Error).message}`);
  }

  try {
    await withCheckoutBlock(page, async () => {
      await gotoSettingsPage(page);
      const checkboxLabel = (await page.locator('#laposta-checkout-title').inputValue()).trim();

      await openCheckoutBlockWithProduct(page, productId);
      await placeWooBlockOrder(page, email, checkboxLabel, { subscribe: true });
      await expectLapostaMemberState(config, email, true);
    });
  } finally {
    await deleteLapostaMemberIfExists(config, email);
  }
});
