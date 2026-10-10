// Support Staff renderer shim. The app:// handler injects this after upstream's own
// module, so upstream's modules are already evaluated and these imports reuse them.
// It never patches upstream; it imports what upstream's Export 3MF path imports.
const bridge = window.supportFinsDesktop;

// [specifier relative to /__desktop/, export that must be a function (null = module only)]
const NEEDED = [
  ['../ui/export.js', 'buildExportGeometry'],
  ['../threemf.js', 'writeThreeMF'],
  ['../prop.js', 'splitInterface'],
  ['../ui/session.js', 'sessionOf'],
  ['../ui/part.js', null],
];

async function loadUpstream() {
  const mods = {};
  const missing = [];
  for (const [spec, name] of NEEDED) {
    let m;
    try { m = await import(spec); } catch (e) { missing.push(`${spec}: ${e.message}`); continue; }
    if (name && typeof m[name] !== 'function') missing.push(`${spec} has no export ${name}()`);
    mods[spec] = m;
  }
  const partMod = mods['../ui/part.js'];
  for (const k of ['part', 'topology', 'lastResult']) {
    if (partMod && !(k in partMod)) missing.push(`../ui/part.js has no export ${k}`);
  }
  return { mods, missing };
}

// --- tiny DOM helper ---------------------------------------------------------
function $(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  n.append(...kids);
  return n;
}

// --- toast -------------------------------------------------------------------
let toastEl;
let toastTimer;
function toast(text, link) {
  toastEl?.remove();
  toastEl = $('div', { class: 'sfd-toast', role: 'status' }, text);
  if (link) toastEl.append(' ', $('button', { class: 'sfd-link', type: 'button', onclick: link.onclick }, link.label));
  document.body.append(toastEl);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl?.remove(), 8000);
}

// --- settings dialog ---------------------------------------------------------
let dlg;
async function openSettings() {
  const r = await bridge.getSettings();
  if (!r.ok) { toast(`Settings unavailable: ${r.error}`); return; }
  dlg?.remove();
  const out = $('input', { type: 'text', id: 'sfd-out', value: r.settings.outputFolder, readonly: '' });
  const exe = $('input', { type: 'text', id: 'sfd-exe', value: r.settings.bambuExe ?? '', readonly: '', placeholder: 'not set' });
  const err = $('p', { class: 'sfd-err', id: 'sfd-err' });
  const browse = (input, fn) => $('button', { type: 'button', class: 'btn sm', onclick: async () => {
    const b = await fn(); if (b.ok && b.path) input.value = b.path; else if (!b.ok) err.textContent = b.error;
  } }, 'Browse');
  dlg = $('dialog', { class: 'sfd-dialog', id: 'sfd-settings' },
    $('h2', {}, 'Support Staff settings'),
    $('label', {}, 'Output folder', $('div', { class: 'sfd-row' }, out, browse(out, bridge.browseFolder))),
    $('label', {}, 'Bambu Studio', $('div', { class: 'sfd-row' }, exe, browse(exe, bridge.browseBambuExe),
      $('button', { type: 'button', class: 'btn sm', id: 'sfd-detect', onclick: async () => {
        const d = await bridge.detectBambu();
        if (d.ok && d.path) exe.value = d.path;
        else err.textContent = d.ok ? 'Bambu Studio not found in the usual places; use Browse.' : d.error;
      } }, 'Detect'))),
    $('p', { class: 'sfd-meta' }, `upstream ${r.upstreamCommit} · log: ${r.logFile}`),
    err,
    $('div', { class: 'sfd-row sfd-actions' },
      $('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, 'Cancel'),
      $('button', { type: 'button', class: 'btn primary', id: 'sfd-save', onclick: async () => {
        const s = await bridge.setSettings({ outputFolder: out.value, bambuExe: exe.value || null });
        if (!s.ok) { err.textContent = s.error; return; }
        dlg.close();
        toast('Settings saved');
      } }, 'Save')));
  document.body.append(dlg);
  dlg.showModal();
}

// --- Send to Bambu -----------------------------------------------------------
async function sendToBambu(mods) {
  const { buildExportGeometry } = mods['../ui/export.js'];
  const { writeThreeMF } = mods['../threemf.js'];
  const { splitInterface } = mods['../prop.js'];
  const { sessionOf } = mods['../ui/session.js'];
  const g = buildExportGeometry();
  if (!g) { toast('Load a part and add fins first'); return; }
  // Exactly upstream's export-3mf: part and supports as separate objects, interface
  // crest split when that material is on, the session embedded for reopening.
  const { body, iface } = splitInterface(g.finTris);
  const blob = writeThreeMF(g.partTris, body, g.base, { separate: true, iface, session: sessionOf(g.partTris) });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const r = await bridge.saveAndOpenInBambu(bytes, g.base);
  if (!r.ok) { toast(`Could not save: ${r.error}`); return; }
  const name = r.path.split(/[\\/]/).pop();
  if (r.opened) toast(`Saved ${name}, opened in Bambu Studio`, { label: 'Show in folder', onclick: () => bridge.showInFolder(r.path) });
  else toast(`Saved ${name}. Bambu Studio not found, set it in settings`, { label: 'Settings', onclick: openSettings });
}

async function showBroken(missing) {
  const r = await bridge.getSettings();
  const commit = r.ok ? r.upstreamCommit : 'unknown';
  const d = $('dialog', { class: 'sfd-dialog' },
    $('h2', {}, 'Send to Bambu is unavailable'),
    $('p', {}, `The upstream app (commit ${commit}) no longer exposes what the desktop shim needs:`),
    $('ul', {}, ...missing.map((m) => $('li', {}, m))),
    $('p', {}, 'Everything else works. Export still saves files through the normal menu.'),
    $('div', { class: 'sfd-row sfd-actions' }, $('button', { type: 'button', class: 'btn', onclick: () => d.close() }, 'OK')));
  document.body.append(d);
  d.showModal();
}

function mount(mods, missing) {
  const anchor = document.querySelector('#topbar .menu-wrap') || document.querySelector('#topbar');
  const send = $('button', { class: 'btn', id: 'sfd-send', type: 'button', disabled: '',
    title: 'Save the part and fins as a 3MF in the output folder and open it in Bambu Studio' }, 'Send to Bambu');
  const gear = $('button', { class: 'btn', id: 'sfd-settings-btn', type: 'button', title: 'Support Staff settings',
    'aria-label': 'Settings', onclick: openSettings }, '⚙');
  if (anchor.classList.contains('menu-wrap')) anchor.after(send, gear); else anchor.append(send, gear);
  if (missing.length) {
    send.title = `Send to Bambu is unavailable: ${missing.join('; ')}`;
    bridge.log('error', `startup export check failed: ${missing.join('; ')}`);
    showBroken(missing);
    return;
  }
  send.addEventListener('click', () => sendToBambu(mods).catch((e) => {
    toast(`Send to Bambu failed: ${e.message}`);
    bridge.log('error', e.stack || e.message);
  }));
  // Same readiness rule as upstream's Export menu, polled so upstream stays untouched.
  const partMod = mods['../ui/part.js'];
  setInterval(() => { send.disabled = !(partMod.part && partMod.topology && partMod.lastResult); }, 500);
}

(async () => {
  if (!bridge) return;   // served outside Electron: do nothing
  const { mods, missing } = await loadUpstream();
  mount(mods, missing);
  bridge.onOpenSettings(openSettings);
})();
