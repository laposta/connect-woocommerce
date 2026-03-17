import { chromium, FullConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';

loadEnv({ path: '.env.local', override: true });
loadEnv();

async function globalSetup(config: FullConfig) {
  const baseURL = process.env.WP_BASE_URL || 'http://localhost:8889';
  const adminUser = process.env.WP_ADMIN_USER || 'admin';
  const adminPass = process.env.WP_ADMIN_PASS || 'password';
  const storageState = path.join('.playwright', '.auth', 'admin.json');

  fs.mkdirSync(path.dirname(storageState), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await page.goto('/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#user_login', { state: 'visible', timeout: 30_000 });
  await page.fill('#user_login', adminUser);
  await page.fill('#user_pass', adminPass);
  await Promise.all([
    page.waitForURL(/\/wp-admin/i, { timeout: 20_000, waitUntil: 'domcontentloaded' }),
    page.click('#wp-submit'),
  ]);
  await page.context().storageState({ path: storageState });

  await browser.close();
}

export default globalSetup;
