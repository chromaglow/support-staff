#!/usr/bin/env node
// Research: run upstream's CLI over every .stl/.3mf in a folder and print a Markdown
// table: walls, tines, unserved, floating, seconds. Usage:
//   node scripts/survey.js <folder-or-file>... [--rot x,y,z] [--out <dir>]
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'upstream', 'plugins', 'cli', 'support-fins.js');

const args = process.argv.slice(2);
const rotIdx = args.indexOf('--rot');
const rot = rotIdx >= 0 ? args.splice(rotIdx, 2)[1] : null;
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? args.splice(outIdx, 2)[1] : fs.mkdtempSync(path.join(os.tmpdir(), 'survey-'));
fs.mkdirSync(outDir, { recursive: true });

const files = args.flatMap((a) => fs.statSync(a).isDirectory()
  ? fs.readdirSync(a).filter((f) => /\.(stl|3mf)$/i.test(f)).map((f) => path.join(a, f))
  : [a]);
if (!files.length) { console.error('no .stl/.3mf inputs'); process.exit(2); }

console.log(`| file | walls | tines | unserved | floating | s | note |\n|---|---|---|---|---|---|---|`);
for (const f of files) {
  const out = path.join(outDir, path.basename(f).replace(/\.(stl|3mf)$/i, '') + '-fins.3mf');
  const cliArgs = [CLI, f, '--json', '-o', out, ...(rot ? ['--rot', rot] : [])];
  const t0 = Date.now();
  const r = spawnSync(process.execPath, cliArgs, { encoding: 'utf8' });
  const s = ((Date.now() - t0) / 1000).toFixed(1);
  const line = (r.stdout || '').trim().split('\n').pop() || '';
  let row;
  try {
    const j = JSON.parse(line);
    const st = j.stats || {};
    row = `| ${path.basename(f)} | ${st.braces ?? ''} | ${st.tines ?? ''} | ${st.unserved ?? ''} | ${st.floating ?? ''} | ${s} | ${j.report ?? ''} |`;
  } catch {
    row = `| ${path.basename(f)} | | | | | ${s} | ERROR: ${(r.stderr || line).trim().split('\n').pop()} |`;
  }
  console.log(row);
}
console.error(`outputs in ${outDir}`);
