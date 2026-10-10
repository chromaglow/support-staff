// The only door between the page and the main process. Every call resolves to
// { ok: true, ...data } or { ok: false, error }; nothing here throws.
const { contextBridge, ipcRenderer } = require('electron');

const call = (channel, ...args) =>
  ipcRenderer.invoke(channel, ...args).catch((e) => ({ ok: false, error: String(e?.message ?? e) }));

contextBridge.exposeInMainWorld('supportFinsDesktop', {
  saveAndOpenInBambu: (bytes, baseName) => call('desktop:saveAndOpen', bytes, baseName),
  getSettings: () => call('desktop:getSettings'),
  setSettings: (partial) => call('desktop:setSettings', partial),
  browseFolder: () => call('desktop:browseFolder'),
  browseBambuExe: () => call('desktop:browseBambuExe'),
  detectBambu: () => call('desktop:detectBambu'),
  showInFolder: (p) => call('desktop:showInFolder', p),
  log: (level, msg) => call('desktop:log', level, msg),
  onOpenSettings: (cb) => { ipcRenderer.on('desktop:openSettings', () => cb()); },
});
