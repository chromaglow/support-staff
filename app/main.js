// Support Staff main process. Serves upstream/web/ over app://, never edits it.
const { app, BrowserWindow, protocol, shell, session, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createLogger } = require('./log');
const settingsMod = require('./settings');
const { safeBase, uniquePath, writeAtomic } = require('./files');
const { detectBambu, launchBambu } = require('./bambu');

const DEV = process.argv.includes('--dev');
const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'upstream', 'web');
const DESKTOP = __dirname;
const HOST = 'support-fins';
const ORIGIN = `app://${HOST}`;

if (process.env.SUPPORT_STAFF_USERDATA) app.setPath('userData', process.env.SUPPORT_STAFF_USERDATA);

// Must run before app.whenReady: a standard, secure scheme behaves like https for
// ES modules, workers, fetch and localStorage.
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

let log, settings, settingsFile, win;

const upstreamCommit = () => {
  try { return JSON.parse(fs.readFileSync(path.join(DESKTOP, 'upstream-commit.json'), 'utf8')).commit; }
  catch { return 'unknown'; }
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.stl': 'application/octet-stream', '.3mf': 'application/octet-stream',
};

// No remote origin, ever. Upstream's one GitHub fetch (plugin labels) fails into its
// own catch. The import map is an inline script, so it gets a hash, not 'unsafe-inline'.
const CSP_BASE = "default-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:; "
  + "style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'";

function cspFor(html) {
  const m = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  // The HTML parser normalizes CRLF to LF before hashing, so hash what the browser sees:
  // a Windows checkout of upstream (git autocrlf) is CRLF on disk.
  const text = m ? m[1].replace(/\r\n?/g, '\n') : '';
  if (!m) log.warn('no inline import map found in index.html; script-src hash omitted');
  const hash = m ? ` 'sha256-${crypto.createHash('sha256').update(text).digest('base64')}'` : '';
  return `${CSP_BASE}; script-src 'self'${hash}`;
}

const INJECT = '<link rel="stylesheet" href="/__desktop/desktop.css">\n'
  + '<script type="module" src="/__desktop/desktop.js"></script>\n</body>';

async function serve(request) {
  const url = new URL(request.url);
  if (url.host !== HOST) return new Response('not found', { status: 404 });
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return new Response('bad request', { status: 400 }); }
  if (rel === '/' || rel === '') rel = '/index.html';
  const desktop = rel.startsWith('/__desktop/');
  const base = desktop ? DESKTOP : WEB;
  const file = path.normalize(path.join(base, desktop ? rel.slice('/__desktop/'.length) : rel));
  if (!file.startsWith(base + path.sep)) return new Response('forbidden', { status: 403 });
  let data;
  try { data = await fs.promises.readFile(file); } catch { return new Response('not found', { status: 404 }); }
  const headers = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
                    'Cache-Control': 'no-store' };
  if (!desktop && file.toLowerCase() === path.join(WEB, 'index.html').toLowerCase()) {
    const html = data.toString('utf8').replace('</body>', INJECT);
    headers['Content-Security-Policy'] = cspFor(html);
    return new Response(html, { headers });
  }
  return new Response(data, { headers });
}

function saveSettings(partial) {
  settings = settingsMod.save(settingsFile, settings, partial);
  return settings;
}

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) {
    log.info(`open external ${url}`);
    shell.openExternal(url);
  } else log.warn(`blocked external URL (not http/https): ${url}`);
}

/** Window bounds from settings, with anything non-numeric replaced by a default. */
function windowBounds(w = {}) {
  const int = (v, d) => (Number.isInteger(v) && v > 0 ? v : d);
  const opt = (v) => (Number.isInteger(v) ? v : undefined);
  return { width: int(w.width, 1400), height: int(w.height, 900), x: opt(w.x), y: opt(w.y), maximized: w.maximized === true };
}

function createWindow() {
  const w = windowBounds(settings.window);
  if (w.x !== undefined && w.y !== undefined) {
    const { screen } = require('electron');
    const onScreen = screen.getAllDisplays().some(({ workArea: a }) =>
      w.x >= a.x && w.y >= a.y && w.x < a.x + a.width && w.y < a.y + a.height);
    if (!onScreen) { log.warn(`saved window position ${w.x},${w.y} is off every display; centering`); w.x = w.y = undefined; }
  }
  win = new BrowserWindow({
    width: w.width, height: w.height, x: w.x, y: w.y, show: false, title: 'Support Staff',
    webPreferences: {
      preload: path.join(DESKTOP, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  if (w.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`${ORIGIN}/`)) {
      e.preventDefault();
      log.warn(`navigation denied: ${url}`);
      openExternal(url);
    }
  });
  win.on('close', () => {
    try {
      const b = win.getNormalBounds();
      saveSettings({ window: { width: b.width, height: b.height, x: b.x, y: b.y, maximized: win.isMaximized() } });
    } catch (e) { log.error(`window state: ${e.message}`); }
  });
  win.loadURL(`${ORIGIN}/`);
  if (DEV) win.webContents.openDevTools({ mode: 'detach' });
}

function wireDownloads() {
  session.defaultSession.on('will-download', (event, item) => {
    item.setSaveDialogOptions({
      title: 'Save export',
      defaultPath: path.join(settings.outputFolder, item.getFilename()),
      filters: [{ name: '3D model', extensions: ['3mf', 'stl'] }],
    });
    item.once('done', (e, state) => log.info(`export ${state}: ${item.getSavePath() || item.getFilename()}`));
  });
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: () => win?.webContents.send('desktop:openSettings') },
      { type: 'separator' },
      { label: 'Open output folder', click: () => { try { fs.mkdirSync(settings.outputFolder, { recursive: true }); } catch (e) { log.error(`output folder: ${e.message}`); } shell.openPath(settings.outputFolder).then((err) => { if (err) log.error(`open output folder: ${err}`); }); } },
      { label: 'Open log folder', click: () => shell.showItemInFolder(log.file) },
      { type: 'separator' },
      { role: 'quit' },
    ] },
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' },
    ] },
    { label: 'Help', submenu: [
      { label: 'About Support Staff', click: () => dialog.showMessageBox(win, {
        type: 'info', title: 'About Support Staff', message: `Support Staff ${app.getVersion()}`,
        detail: `Electron ${process.versions.electron}\nSupport Fins upstream commit ${upstreamCommit()}\n\n`
          + 'Support Fins is MIT licensed (github.com/gittrahan/support-fins). STEP import uses '
          + 'occt-import-js (Open CASCADE), LGPL-2.1, vendored unmodified. License texts ship in '
          + 'resources/licenses.',
      }) },
      { label: 'Support Fins on GitHub', click: () => shell.openExternal('https://github.com/gittrahan/support-fins') },
    ] },
  ]);
}

const ok = (data) => ({ ok: true, ...data });
function fail(e) {
  const msg = String(e?.message ?? e);
  log.error(`${msg}${e?.stack ? `\n${e.stack}` : ''}`);
  return { ok: false, error: msg };
}
// Handlers never throw across the bridge: the renderer always gets { ok, ... }.
function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    try { return ok((await fn(...args)) ?? {}); } catch (e) { return fail(e); }
  });
}

function wireIpc() {
  handle('desktop:saveAndOpen', async (bytes, baseName) => {
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new Error('no file data');
    if (bytes.length > 512 * 1024 * 1024) throw new Error('file is over 512 MB');
    const target = uniquePath(settings.outputFolder, `${safeBase(baseName)}-fins`, '.3mf');
    try { await writeAtomic(target, bytes); } catch (e) { throw new Error(`could not write ${target}: ${e.message}`); }
    log.info(`saved ${target} (${bytes.length} bytes)`);
    const exe = settings.bambuExe;
    let opened = false;
    if (exe && fs.existsSync(exe)) {
      try {
        const pid = await launchBambu(exe, target);
        log.info(`launched ${exe} ${target} pid ${pid}`);
        opened = true;
      } catch (e) {
        log.error(`Bambu Studio failed to start: ${exe}: ${e.message}`);
      }
    } else {
      log.warn(`Bambu Studio not launched: ${exe ? `missing at ${exe}` : 'path not set'}`);
    }
    return { path: target, opened };
  });

  handle('desktop:getSettings', () => ({ settings, upstreamCommit: upstreamCommit(), logFile: log.file }));

  handle('desktop:setSettings', (partial) => {
    if (!partial || typeof partial !== 'object') throw new Error('bad settings');
    const allowed = {};
    for (const k of ['outputFolder', 'bambuExe']) if (k in partial) allowed[k] = partial[k];
    saveSettings(allowed);
    log.info(`settings saved: ${JSON.stringify(allowed)}`);
    return { settings };
  });

  handle('desktop:browseFolder', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], defaultPath: settings.outputFolder });
    return { path: r.canceled ? null : r.filePaths[0] };
  });

  handle('desktop:browseBambuExe', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Bambu Studio', extensions: ['exe'] }] });
    return { path: r.canceled ? null : r.filePaths[0] };
  });

  handle('desktop:detectBambu', () => ({ path: detectBambu() }));

  handle('desktop:showInFolder', (p) => {
    if (typeof p !== 'string' || !path.isAbsolute(p)) throw new Error('bad path');
    shell.showItemInFolder(p);
  });

  handle('desktop:log', (level, msg) => {
    const l = ['info', 'warn', 'error'].includes(level) ? level : 'info';
    log[l](`renderer: ${String(msg).slice(0, 2000)}`);
  });
}

app.whenReady().then(() => {
  const userData = app.getPath('userData');
  log = createLogger(path.join(userData, 'logs', 'support-fins-desktop.log'));
  settingsFile = path.join(userData, 'settings.json');
  settings = settingsMod.load(settingsFile, app.getPath('documents'));
  log.info(`start v${app.getVersion()} electron ${process.versions.electron} upstream ${upstreamCommit()} userData ${userData}`);
  if (!settings.bambuExe) {
    const found = detectBambu();
    if (found) { saveSettings({ bambuExe: found }); log.info(`detected Bambu Studio at ${found}`); }
  }
  wireIpc();
  protocol.handle('app', serve);
  wireDownloads();
  Menu.setApplicationMenu(buildMenu());
  createWindow();
});

app.on('window-all-closed', () => app.quit());
