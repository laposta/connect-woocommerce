import { expect, Page } from '@playwright/test';

export const PLUGIN_FILE = 'laposta-woocommerce/laposta.php';
export const WOO_PLUGIN_FILE = 'woocommerce/woocommerce.php';
export const SETTINGS_PAGE = 'laposta_woocommerce_options';
const CHECKOUT_URLS = parseCheckoutUrls(process.env.LWC_E2E_CHECKOUT_URLS, ['/checkout/', '/afrekenen/']);
const CHECKBOX_LABEL_PREFIX = process.env.LWC_E2E_CHECKBOX_LABEL_PREFIX || 'Laposta WooCommerce E2E';
const API_KEY_FALLBACK = process.env.LWC_API_KEY || '';
const TEST_LIST_ID_FALLBACK = process.env.LWC_TEST_LIST_ID || '';

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

async function fillCheckoutField(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  await expect(field).toBeVisible();
  await field.fill(value);
}
