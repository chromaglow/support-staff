const { test, expect, _electron: electron } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const SPHERE = path.join(ROOT, 'upstream', 'prototype', 'stress', 'models', 'sphere.stl');
const CSC = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
const FAKE_SRC = path.join(ROOT, 'test', 'fixtures', 'fake-bambu', 'FakeBambu.cs');

/** Compile the stand-in slicer into `dir`/bambu-studio.exe; returns its path. */
function buildFakeBambu(dir) {
  const exe = path.join(dir, 'bambu-studio.exe');
  execFileSync(CSC, ['/nologo', '/target:exe', `/out:${exe}`, FAKE_SRC], { stdio: 'pipe' });
  return exe;
}

/**
 * Launch the app with its own temp userData. `settings(tmp)` and `extraEnv(tmp)` are
 * callbacks receiving the temp folder: the first returns what is written as
 * settings.json, the second returns variables merged into the app's environment.
 * Set SUPPORT_STAFF_EXE to run a packaged build instead of app/main.js. SUPPORT_STAFF_EXE
 * must point at the real packaged binary (dist\win-unpacked\Support Staff.exe or the
 * installed Support Staff.exe), not the portable self-extracting exe, which Playwright
 * cannot attach to. Returns the temp folder so a test can put its output folder and
 * fake-slicer files beside the userData.
 */
async function launchApp(settings, extraEnv = () => ({})) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'support-staff-'));
  const userData = path.join(tmp, 'userData');
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify(settings(tmp)));
  const exe = process.env.SUPPORT_STAFF_EXE;
  const app = await electron.launch({
    executablePath: exe || undefined,
    args: exe ? [] : [path.join(ROOT, 'app', 'main.js')],
    env: { ...process.env, SUPPORT_STAFF_USERDATA: userData, ...extraEnv(tmp) },
  });
  return { app, tmp };
}

test('the upstream app loads under app://', async () => {
  const { app } = await launchApp(() => ({}), () => ({}));
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

test('load a part, add fins, send to Bambu', async () => {
  test.skip(process.platform !== 'win32', 'stand-in slicer is compiled with the Windows .NET Framework csc.exe');
  test.skip(!fs.existsSync(CSC), `csc.exe not found at ${CSC}`);
  // A stand-in slicer that passes the settings validator (basename bambu-studio.exe)
  // and records the argument it was launched with to FAKE_BAMBU_LOG.
  const { app, tmp } = await launchApp(
    (t) => ({ outputFolder: path.join(t, 'out'), bambuExe: buildFakeBambu(t) }),
    (t) => ({ FAKE_BAMBU_LOG: path.join(t, 'fake-bambu-argv.txt') }),
  );
  const outDir = path.join(tmp, 'out');
  const argvLog = path.join(tmp, 'fake-bambu-argv.txt');
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await expect(page.locator('#sfd-send')).toBeDisabled();

    await page.locator('#file').setInputFiles(SPHERE);
    await expect(page.locator('#s-name')).toContainText('sphere', { timeout: 30_000 });
    await page.locator('#fins-toggle').click();
    await expect(page.locator('#s-fins')).toContainText(/\d+ support fin/, { timeout: 60_000 });
    await expect(page.locator('#sfd-send')).toBeEnabled();

    await page.locator('#sfd-send').click();
    await expect(page.locator('.sfd-toast')).toContainText('Saved sphere-fins.3mf, opened in Bambu Studio', { timeout: 30_000 });

    const out = path.join(outDir, 'sphere-fins.3mf');
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.existsSync(`${out}.part`)).toBe(false);
    expect(fs.statSync(out).size).toBeGreaterThan(100_000);

    // The file is what upstream's own Export 3MF writes: two objects and the app tag.
    const { unzip } = await import(pathToFileURL(path.join(ROOT, 'upstream', 'web', 'zip.js')).href);
    const xml = new TextDecoder().decode((await unzip(new Uint8Array(fs.readFileSync(out)))).get('3D/3dmodel.model'));
    expect(xml).toContain('name="sphere"');
    expect(xml).toContain('name="sphere supports"');
    expect(xml).toContain('<metadata name="Application">Support Fins</metadata>');

    // The stand-in slicer was launched with exactly the saved file as its argument.
    await expect.poll(() => (fs.existsSync(argvLog) ? fs.readFileSync(argvLog, 'utf8').trim() : ''), { timeout: 15_000 }).toBe(out);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
  }
});
