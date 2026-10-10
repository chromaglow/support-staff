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
  const hash = m ? ` 'sha256-${crypto.createHash('sha256').update(text).digest('base64')}'` : '';
  return `${CSP_BASE}; script-src 'self'${hash}`;
}

const INJECT = '<link rel="stylesheet" href="/__desktop/desktop.css">\n'
  + '<script type="module" src="/__desktop/desktop.js"></script>\n</body>';

async function serve(request) {
  const url = new URL(request.url);
  if (url.host !== HOST) return new Response('not found', { status: 404 });
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const desktop = rel.startsWith('/__desktop/');
  const base = desktop ? DESKTOP : WEB;
  const file = path.normalize(path.join(base, desktop ? rel.slice('/__desktop/'.length) : rel));
  if (!file.startsWith(base + path.sep)) return new Response('forbidden', { status: 403 });
  let data;
  try { data = await fs.promises.readFile(file); } catch { return new Response('not found', { status: 404 }); }
  const headers = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
                    'Cache-Control': 'no-store' };
  if (rel === '/index.html') {
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
  }
}

/** Window bounds from settings, with anything non-numeric replaced by a default. */
function windowBounds(w = {}) {
  const int = (v, d) => (Number.isInteger(v) && v > 0 ? v : d);
  const opt = (v) => (Number.isInteger(v) ? v : undefined);
  return { width: int(w.width, 1400), height: int(w.height, 900), x: opt(w.x), y: opt(w.y), maximized: w.maximized === true };
}

function createWindow() {
  const w = windowBounds(settings.window);
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

app.whenReady().then(() => {
  const userData = app.getPath('userData');
  log = createLogger(path.join(userData, 'logs', 'support-fins-desktop.log'));
  settingsFile = path.join(userData, 'settings.json');
  settings = settingsMod.load(settingsFile, app.getPath('documents'));
  log.info(`start v${app.getVersion()} electron ${process.versions.electron} upstream ${upstreamCommit()} userData ${userData}`);
  protocol.handle('app', serve);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
