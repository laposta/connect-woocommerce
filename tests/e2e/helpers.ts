import { expect, Page } from '@playwright/test';

export const PLUGIN_FILE = 'laposta-woocommerce/laposta.php';
export const WOO_PLUGIN_FILE = 'woocommerce/woocommerce.php';
export const SETTINGS_PAGE = 'laposta_woocommerce_options';
const CHECKOUT_URLS = parseCheckoutUrls(process.env.LWC_E2E_CHECKOUT_URLS, ['/checkout/', '/afrekenen/']);
const CHECKBOX_LABEL_PREFIX = process.env.LWC_E2E_CHECKBOX_LABEL_PREFIX || 'Laposta WooCommerce E2E';

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
