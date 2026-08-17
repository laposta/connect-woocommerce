import { expect, Page } from '@playwright/test';
import { access, mkdir, rm, rmdir, writeFile } from 'fs/promises';
import path from 'path';

export const PLUGIN_FILE = 'laposta-woocommerce/laposta.php';
export const WOO_PLUGIN_FILE = 'woocommerce/woocommerce.php';
export const SETTINGS_PAGE = 'laposta_woocommerce_options';
const CHECKOUT_URLS = parseCheckoutUrls(process.env.LWC_E2E_CHECKOUT_URLS, ['/checkout/', '/afrekenen/']);
const CHECKBOX_LABEL_PREFIX = process.env.LWC_E2E_CHECKBOX_LABEL_PREFIX || 'Laposta WooCommerce E2E';
const API_KEY_FALLBACK = process.env.LWC_API_KEY || '';
const TEST_LIST_ID_FALLBACK = process.env.LWC_TEST_LIST_ID || '';
const WP_CONTENT_PATH = process.env.WP_CONTENT_PATH || path.resolve(process.cwd(), '..', '..');
const PRIORITY_FIXTURE_PATH = path.join(WP_CONTENT_PATH, 'mu-plugins', 'laposta-woocommerce-e2e-priority.php');
const PRIORITY_FIXTURE_LABEL = 'Laposta priority E2E sentinel';
const PRIORITY_FIXTURE_CONTENT = `<?php
add_filter('laposta_woocommerce_checkout_block_field_priority', function() {
    return 5;
});

add_action('woocommerce_init', function() {
    if (!function_exists('woocommerce_register_additional_checkout_field')) {
        return;
    }

    woocommerce_register_additional_checkout_field(array(
        'id' => 'laposta-e2e/priority-sentinel',
        'label' => '${PRIORITY_FIXTURE_LABEL}',
        'optionalLabel' => '${PRIORITY_FIXTURE_LABEL}',
        'location' => 'order',
        'type' => 'checkbox',
        'required' => false,
        'show_in_order_confirmation' => false,
    ));
}, 10);
`;
const CHECKOUT_BLOCK_CONTENT = `<!-- wp:woocommerce/checkout -->
<div class="wp-block-woocommerce-checkout alignwide wc-block-checkout is-loading"><!-- wp:woocommerce/checkout-fields-block -->
<div class="wp-block-woocommerce-checkout-fields-block"><!-- wp:woocommerce/checkout-express-payment-block -->
<div class="wp-block-woocommerce-checkout-express-payment-block"></div>
<!-- /wp:woocommerce/checkout-express-payment-block -->

<!-- wp:woocommerce/checkout-contact-information-block -->
<div class="wp-block-woocommerce-checkout-contact-information-block"></div>
<!-- /wp:woocommerce/checkout-contact-information-block -->

<!-- wp:woocommerce/checkout-shipping-method-block -->
<div class="wp-block-woocommerce-checkout-shipping-method-block"></div>
<!-- /wp:woocommerce/checkout-shipping-method-block -->

<!-- wp:woocommerce/checkout-pickup-options-block -->
<div class="wp-block-woocommerce-checkout-pickup-options-block"></div>
<!-- /wp:woocommerce/checkout-pickup-options-block -->

<!-- wp:woocommerce/checkout-shipping-address-block -->
<div class="wp-block-woocommerce-checkout-shipping-address-block"></div>
<!-- /wp:woocommerce/checkout-shipping-address-block -->

<!-- wp:woocommerce/checkout-billing-address-block -->
<div class="wp-block-woocommerce-checkout-billing-address-block"></div>
<!-- /wp:woocommerce/checkout-billing-address-block -->

<!-- wp:woocommerce/checkout-shipping-methods-block -->
<div class="wp-block-woocommerce-checkout-shipping-methods-block"></div>
<!-- /wp:woocommerce/checkout-shipping-methods-block -->

<!-- wp:woocommerce/checkout-payment-block -->
<div class="wp-block-woocommerce-checkout-payment-block"></div>
<!-- /wp:woocommerce/checkout-payment-block -->

<!-- wp:woocommerce/checkout-additional-information-block -->
<div class="wp-block-woocommerce-checkout-additional-information-block"></div>
<!-- /wp:woocommerce/checkout-additional-information-block -->

<!-- wp:woocommerce/checkout-order-note-block -->
<div class="wp-block-woocommerce-checkout-order-note-block"></div>
<!-- /wp:woocommerce/checkout-order-note-block -->

<!-- wp:woocommerce/checkout-terms-block -->
<div class="wp-block-woocommerce-checkout-terms-block"></div>
<!-- /wp:woocommerce/checkout-terms-block -->

<!-- wp:woocommerce/checkout-actions-block -->
<div class="wp-block-woocommerce-checkout-actions-block"></div>
<!-- /wp:woocommerce/checkout-actions-block --></div>
<!-- /wp:woocommerce/checkout-fields-block -->

<!-- wp:woocommerce/checkout-totals-block -->
<div class="wp-block-woocommerce-checkout-totals-block"><!-- wp:woocommerce/checkout-order-summary-block -->
<div class="wp-block-woocommerce-checkout-order-summary-block"><!-- wp:woocommerce/checkout-order-summary-cart-items-block -->
<div class="wp-block-woocommerce-checkout-order-summary-cart-items-block"></div>
<!-- /wp:woocommerce/checkout-order-summary-cart-items-block -->

<!-- wp:woocommerce/checkout-order-summary-coupon-form-block -->
<div class="wp-block-woocommerce-checkout-order-summary-coupon-form-block"></div>
<!-- /wp:woocommerce/checkout-order-summary-coupon-form-block -->

<!-- wp:woocommerce/checkout-order-summary-subtotal-block -->
<div class="wp-block-woocommerce-checkout-order-summary-subtotal-block"></div>
<!-- /wp:woocommerce/checkout-order-summary-subtotal-block -->

<!-- wp:woocommerce/checkout-order-summary-fee-block -->
<div class="wp-block-woocommerce-checkout-order-summary-fee-block"></div>
<!-- /wp:woocommerce/checkout-order-summary-fee-block -->

<!-- wp:woocommerce/checkout-order-summary-discount-block -->
<div class="wp-block-woocommerce-checkout-order-summary-discount-block"></div>
<!-- /wp:woocommerce/checkout-order-summary-discount-block -->

<!-- wp:woocommerce/checkout-order-summary-shipping-block -->
<div class="wp-block-woocommerce-checkout-order-summary-shipping-block"></div>
<!-- /wp:woocommerce/checkout-order-summary-shipping-block -->

<!-- wp:woocommerce/checkout-order-summary-taxes-block -->
<div class="wp-block-woocommerce-checkout-order-summary-taxes-block"></div>
<!-- /wp:woocommerce/checkout-order-summary-taxes-block --></div>
<!-- /wp:woocommerce/checkout-order-summary-block --></div>
<!-- /wp:woocommerce/checkout-totals-block --></div>
<!-- /wp:woocommerce/checkout -->`;

export type LapostaConfig = {
  apiKey: string;
  listId: string;
};

export async function ensurePluginActive(page: Page) {
  await ensurePluginFileActive(page, PLUGIN_FILE);
}

export async function ensureWooCommerceActive(page: Page) {
  await ensurePluginFileActive(page, WOO_PLUGIN_FILE);
}

async function ensurePluginFileActive(page: Page, pluginFile: string) {
  await page.goto('/wp-admin/plugins.php');

  const pluginRow = page.locator(`tr[data-plugin="${pluginFile}"]:not(.plugin-update-tr)`);
  await expect(pluginRow).toBeVisible();

  const activateLink = pluginRow.locator(`a[href*="action=activate"][href*="${encodeURIComponent(pluginFile)}"]`);
  if (await activateLink.count()) {
    await Promise.all([page.waitForLoadState('domcontentloaded'), activateLink.first().click()]);
    await expect(pluginRow).toHaveClass(/active/);
  }
}

export async function gotoSettingsPage(page: Page) {
  const urls = [
    `/wp-admin/admin.php?page=${SETTINGS_PAGE}`,
    `/wp-admin/options-general.php?page=${SETTINGS_PAGE}`,
  ];

  for (const url of urls) {
    await page.goto(url);
    const heading = page.getByRole('heading', { name: /Laposta Woocommerce instellingen/i });
    if (await heading.count()) {
      await expect(heading).toBeVisible();
      return;
    }
  }

  throw new Error(`Could not open Laposta settings page with slug "${SETTINGS_PAGE}".`);
}

export async function saveSettings(page: Page) {
  const saveButton = page.getByRole('button', { name: /(Save Changes|Wijzigingen opslaan)/i });
  await Promise.all([page.waitForURL(/laposta_woocommerce_options/), saveButton.click()]);
  await page.waitForLoadState('domcontentloaded');
}

export function buildCheckboxLabel(): string {
  return `${CHECKBOX_LABEL_PREFIX} ${Date.now()}`;
}

export function buildRandomEmail(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `laposta-woocommerce-e2e+${Date.now()}-${randomPart}@example.com`;
}

export async function withCheckoutLabel<T>(page: Page, label: string, action: () => Promise<T>): Promise<T> {
  await gotoSettingsPage(page);
  const labelInput = page.locator('#laposta-checkout-title');
  const originalLabel = await labelInput.inputValue();

  await labelInput.fill(label);
  await saveSettings(page);

  try {
    return await action();
  } finally {
    await gotoSettingsPage(page);
    await page.locator('#laposta-checkout-title').fill(originalLabel);
    await saveSettings(page);
  }
}

export async function resolveLapostaConfig(page: Page): Promise<LapostaConfig> {
  await gotoSettingsPage(page);

  const apiKeyInput = page.locator('#laposta-api_key');
  let apiKey = (await apiKeyInput.inputValue()).trim();
  let didUpdateSettings = false;

  if (!apiKey && API_KEY_FALLBACK) {
    await apiKeyInput.fill(API_KEY_FALLBACK);
    apiKey = API_KEY_FALLBACK;
    didUpdateSettings = true;
  }

  const selectedList = page.locator('input[name="laposta-checkout-list"]:checked').first();
  let listId = '';
  if (await selectedList.count()) {
    listId = (await selectedList.inputValue()).trim();
  }

  if (!listId && TEST_LIST_ID_FALLBACK) {
    const fallbackRadio = page.locator(`input[name="laposta-checkout-list"][value="${TEST_LIST_ID_FALLBACK}"]`).first();
    if (await fallbackRadio.count()) {
      await fallbackRadio.check();
      listId = TEST_LIST_ID_FALLBACK;
      didUpdateSettings = true;
    }
  }

  if (didUpdateSettings) {
    await saveSettings(page);
    await gotoSettingsPage(page);

    apiKey = (await page.locator('#laposta-api_key').inputValue()).trim();
    const refreshedSelectedList = page.locator('input[name="laposta-checkout-list"]:checked').first();
    if (await refreshedSelectedList.count()) {
      listId = (await refreshedSelectedList.inputValue()).trim();
    }
  }

  if (!apiKey) {
    throw new Error('No Laposta API key configured for the WooCommerce plugin.');
  }

  if (!listId) {
    throw new Error('No Laposta list configured for the WooCommerce plugin.');
  }

  return { apiKey, listId };
}

export async function getFirstStoreProductId(page: Page): Promise<number> {
  const response = await page.request.get('/wp-json/wc/store/v1/products?per_page=1');
  expect(response.ok()).toBeTruthy();
  const products = (await response.json()) as Array<{ id: number }>;
  if (!products.length || !products[0].id) {
    throw new Error('No published WooCommerce products found for checkout test.');
  }
  return products[0].id;
}

export async function openCheckoutWithProduct(page: Page, productId: number) {
  await page.goto(`/?add-to-cart=${productId}`, { waitUntil: 'domcontentloaded' });

  for (const url of CHECKOUT_URLS) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const classicCheckout = page.locator('form.checkout');
    if (await classicCheckout.count()) {
      await expect(classicCheckout.first()).toBeVisible();
      return;
    }
  }

  throw new Error('Could not open a classic WooCommerce checkout form.');
}

export async function withCheckoutBlock<T>(page: Page, action: (checkoutPageId: number) => Promise<T>): Promise<T> {
  const nonce = await getWordPressRestNonce(page);
  const checkoutPage = await getCheckoutPage(page, nonce);

  await updatePageContent(page, nonce, checkoutPage.id, CHECKOUT_BLOCK_CONTENT);

  try {
    return await action(checkoutPage.id);
  } finally {
    await updatePageContent(page, nonce, checkoutPage.id, checkoutPage.content);
  }
}

export async function withCheckoutPriorityFixture<T>(action: (sentinelLabel: string) => Promise<T>): Promise<T> {
  const fixtureDirectory = path.dirname(PRIORITY_FIXTURE_PATH);
  let createdFixtureDirectory = false;

  try {
    await access(fixtureDirectory);
  } catch {
    createdFixtureDirectory = true;
  }

  await mkdir(fixtureDirectory, { recursive: true });

  try {
    await writeFile(PRIORITY_FIXTURE_PATH, PRIORITY_FIXTURE_CONTENT, 'utf8');
    return await action(PRIORITY_FIXTURE_LABEL);
  } finally {
    await rm(PRIORITY_FIXTURE_PATH, { force: true });
    if (createdFixtureDirectory) {
      await rmdir(fixtureDirectory);
    }
  }
}

export async function openCheckoutBlockEditor(page: Page, checkoutPageId: number) {
  await page.goto(`/wp-admin/post.php?post=${checkoutPageId}&action=edit`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/block-editor-page/, { timeout: 30000 });

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const editorWindow = window as typeof window & {
            wp?: {
              data?: {
                select: (store: string) => {
                  getBlocks?: () => Array<{ name: string; innerBlocks?: unknown[] }>;
                };
              };
            };
          };
          const blocks = editorWindow.wp?.data?.select('core/block-editor')?.getBlocks?.() || [];

          const hasAdditionalInformationBlock = (items: Array<{ name: string; innerBlocks?: unknown[] }>): boolean =>
            items.some(
              (block) =>
                block.name === 'woocommerce/checkout-additional-information-block' ||
                hasAdditionalInformationBlock(
                  (block.innerBlocks || []) as Array<{ name: string; innerBlocks?: unknown[] }>,
                ),
            );

          return hasAdditionalInformationBlock(blocks);
        }),
      { timeout: 30000 },
    )
    .toBe(true);
}

export async function expectCheckoutBlockEditorLabel(page: Page, checkboxLabel: string) {
  const editorCanvas = page.locator('iframe[name="editor-canvas"]');
  if (await editorCanvas.count()) {
    await expect(page.frameLocator('iframe[name="editor-canvas"]').getByText(checkboxLabel, { exact: true })).toBeVisible({
      timeout: 30000,
    });
    return;
  }

  await expect(page.getByText(checkboxLabel, { exact: true })).toBeVisible({ timeout: 30000 });
}

export async function openCheckoutBlockWithProduct(page: Page, productId: number) {
  await page.goto(`/?add-to-cart=${productId}`, { waitUntil: 'domcontentloaded' });

  for (const url of CHECKOUT_URLS) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const checkoutBlock = page.locator('.wc-block-checkout');
    if (await checkoutBlock.count()) {
      await expect(checkoutBlock.first()).toBeVisible();
      await expect(checkoutBlock.first()).not.toHaveClass(/is-loading/, { timeout: 30000 });
      return;
    }
  }

  throw new Error('Could not open a WooCommerce Checkout Block.');
}

export async function placeWooOrder(page: Page, email: string, options: { subscribe: boolean }) {
  await fillCheckoutField(page, '#billing_first_name', 'Laposta');
  await fillCheckoutField(page, '#billing_last_name', 'E2E');
  await fillCheckoutField(page, '#billing_address_1', 'Teststraat 1');
  await fillCheckoutField(page, '#billing_postcode', '1011AB');
  await fillCheckoutField(page, '#billing_city', 'Amsterdam');
  await fillCheckoutField(page, '#billing_phone', '0612345678');
  await fillCheckoutField(page, '#billing_email', email);

  const checkbox = page.locator('#nieuwsbrief_signup');
  await expect(checkbox).toBeVisible();
  if (options.subscribe) {
    await checkbox.check();
  } else {
    await checkbox.uncheck();
  }

  await Promise.all([
    page.waitForURL(/order-received|bestelling-ontvangen/i, { timeout: 30000 }),
    page.locator('#place_order').click(),
  ]);
}

export async function placeWooBlockOrder(
  page: Page,
  email: string,
  checkboxLabel: string,
  options: { subscribe: boolean },
) {
  await fillFirstVisibleCheckoutField(page, ['#email'], email);

  const editAddressButton = page.getByRole('button', {
    name: /(Edit (shipping|billing) address|Verzendadres bewerken|Factuuradres bewerken)/i,
  });
  if (await editAddressButton.first().isVisible()) {
    await editAddressButton.first().click();
  }

  await fillFirstVisibleCheckoutField(page, ['#shipping-first_name', '#billing-first_name'], 'Laposta');
  await fillFirstVisibleCheckoutField(page, ['#shipping-last_name', '#billing-last_name'], 'E2E');
  await fillFirstVisibleCheckoutField(page, ['#shipping-address_1', '#billing-address_1'], 'Teststraat 1');
  await fillFirstVisibleCheckoutField(page, ['#shipping-postcode', '#billing-postcode'], '1011AB');
  await fillFirstVisibleCheckoutField(page, ['#shipping-city', '#billing-city'], 'Amsterdam');

  const phone = page.locator('#billing-phone');
  if (await phone.isVisible()) {
    await phone.fill('0612345678');
  }

  const checkbox = page.getByRole('checkbox', { name: checkboxLabel, exact: true });
  await expect(checkbox).toBeVisible();
  if (options.subscribe) {
    await checkbox.check();
  } else {
    await checkbox.uncheck();
  }

  await Promise.all([
    page.waitForURL(/order-received|bestelling-ontvangen/i, { timeout: 30000 }),
    page.getByRole('button', { name: /(Place Order|Bestelling plaatsen|Plaats bestelling)/i }).click(),
  ]);
}

export async function findLapostaMember(config: LapostaConfig, email: string) {
  const response = await fetch(`https://api.laposta.nl/v2/member?list_id=${encodeURIComponent(config.listId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
    },
  });

  const body = (await response.json()) as {
    data?: Array<{ member?: { member_id?: string; email?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(`Laposta API request failed: ${body.error?.message || response.statusText}`);
  }

  return body.data?.find((entry) => entry.member?.email === email) || null;
}

export async function deleteLapostaMemberIfExists(config: LapostaConfig, email: string) {
  const member = await findLapostaMember(config, email);
  const memberId = member?.member?.member_id;
  if (!memberId) {
    return;
  }

  const response = await fetch(
    `https://api.laposta.nl/v2/member/${encodeURIComponent(memberId)}?list_id=${encodeURIComponent(config.listId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
      },
    },
  );

  if (!response.ok) {
    const body = (await response.json()) as { error?: { message?: string } };
    throw new Error(`Laposta member cleanup failed: ${body.error?.message || response.statusText}`);
  }
}

export async function expectLapostaMemberState(config: LapostaConfig, email: string, shouldExist: boolean) {
  await expect
    .poll(async () => {
      const member = await findLapostaMember(config, email);
      return Boolean(member?.member?.member_id);
    }, { timeout: 15000, intervals: [500, 1000, 2000] })
    .toBe(shouldExist);
}

function parseCheckoutUrls(rawValue: string | undefined, fallback: string[]): string[] {
  if (!rawValue) {
    return fallback;
  }

  const parsed = rawValue
    .split(',')
    .map((item) => normalizePath(item))
    .filter(Boolean);

  return parsed.length ? parsed : fallback;
}

function normalizePath(input: string): string {
  const value = input.trim();
  if (!value) {
    return '';
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

async function getWordPressRestNonce(page: Page): Promise<string> {
  await page.goto('/wp-admin/post-new.php?post_type=page', { waitUntil: 'domcontentloaded' });

  const nonce = await page.evaluate(() => {
    const settings = (window as typeof window & { wpApiSettings?: { nonce?: string } }).wpApiSettings;
    return settings?.nonce || '';
  });

  if (!nonce) {
    throw new Error('Could not resolve the WordPress REST API nonce.');
  }

  return nonce;
}

async function getCheckoutPage(page: Page, nonce: string): Promise<{ id: number; content: string }> {
  const response = await page.request.get('/wp-json/wp/v2/pages?context=edit&per_page=100', {
    headers: { 'X-WP-Nonce': nonce },
  });
  expect(response.ok()).toBeTruthy();

  const pages = (await response.json()) as Array<{
    id: number;
    link: string;
    content: { raw: string };
  }>;
  const checkoutPage = pages.find(({ link }) => CHECKOUT_URLS.includes(normalizePath(new URL(link).pathname)));

  if (!checkoutPage) {
    throw new Error(`Could not resolve a checkout page for: ${CHECKOUT_URLS.join(', ')}`);
  }

  return { id: checkoutPage.id, content: checkoutPage.content.raw };
}

async function updatePageContent(page: Page, nonce: string, pageId: number, content: string) {
  const response = await page.request.post(`/wp-json/wp/v2/pages/${pageId}`, {
    headers: { 'X-WP-Nonce': nonce },
    data: { content },
  });
  expect(response.ok()).toBeTruthy();
}

async function fillCheckoutField(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  await expect(field).toBeVisible();
  await field.fill(value);
}

async function fillFirstVisibleCheckoutField(page: Page, selectors: string[], value: string) {
  for (const selector of selectors) {
    const field = page.locator(selector);
    if (await field.isVisible()) {
      await field.fill(value);
      return;
    }
  }

  throw new Error(`Could not find a visible Checkout Block field: ${selectors.join(', ')}`);
}
