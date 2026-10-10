// Find Bambu Studio on this machine and open a file in it.
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const candidates = () => [
  process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Bambu Studio', 'bambu-studio.exe'),
  process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Bambu Studio', 'bambu-studio.exe'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Bambu Studio', 'bambu-studio.exe'),
].filter(Boolean);

/** `"C:\x\bambu-studio.exe" "%1"` or `C:\x\bambu-studio.exe %1` -> the exe path, else null. */
function exeFromCommand(cmd) {
  if (typeof cmd !== 'string') return null;
  const m = cmd.trim().match(/^"?(.+?\.exe)"?(?:\s|$)/i);
  return m ? m[1] : null;
}

/** Default value of a registry key via `reg query`, or null. */
function regQuery(key) {
  try {
    const out = execFileSync('reg', ['query', key, '/ve'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    const line = out.split(/\r?\n/).find((l) => /REG_(SZ|EXPAND_SZ)/.test(l));
    if (!line) return null;
    const v = line.split(/REG_(?:SZ|EXPAND_SZ)\s+/)[1]?.trim() ?? null;
    return v === '(value not set)' ? null : v;
  } catch {
    return null;
  }
}

function detectBambu({ exists = fs.existsSync, query = regQuery, candidates: list = candidates() } = {}) {
  for (const c of list) if (exists(c)) return c;
  const appPath = query('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\bambu-studio.exe');
  if (appPath && exists(appPath)) return appPath;
  const open = exeFromCommand(query('HKCR\\bambustudio\\shell\\open\\command'));
  if (open && exists(open)) return open;
  return null;
}

/**
 * Open `file` in Bambu Studio, detached so closing this app leaves the slicer running.
 * Resolves with the pid once the process has started; rejects if it cannot start.
 */
function launchBambu(exe, file) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, [file], { detached: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(child.pid); });
  });
}

module.exports = { candidates, exeFromCommand, regQuery, detectBambu, launchBambu };
