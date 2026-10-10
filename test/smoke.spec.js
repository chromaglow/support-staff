const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

async function launchApp(settings) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'support-staff-'));
  const userData = path.join(tmp, 'userData');
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify(settings));
  const exe = process.env.SUPPORT_STAFF_EXE;
  const app = await electron.launch({
    executablePath: exe || undefined,
    args: exe ? [] : [path.join(ROOT, 'app', 'main.js')],
    env: { ...process.env, SUPPORT_STAFF_USERDATA: userData },
  });
  return { app, tmp };
}

test('the upstream app loads under app://', async () => {
  const { app } = await launchApp({});
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await expect(page.locator('#export')).toBeVisible();
  await expect(page.locator('#file')).toBeEnabled();
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
  expect(page.url()).toBe('app://support-fins/');
  await app.close();
});
