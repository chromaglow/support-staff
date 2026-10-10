const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { defaults, load, validate, save } = require('../../app/settings');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sfd-settings-'));
/** An empty file named like the real slicer: validate checks the name and existence, not the bytes. */
const fakeBambu = () => { const p = path.join(tmp(), 'bambu-studio.exe'); fs.writeFileSync(p, ''); return p; };

test('defaults put the output folder under Documents', () => {
  const d = defaults('C:\\Users\\me\\Documents');
  assert.equal(d.outputFolder, path.join('C:\\Users\\me\\Documents', 'Support Fins'));
  assert.equal(d.bambuExe, null);
  assert.equal(d.window.width, 1400);
});

test('load returns defaults when the file is missing or corrupt', () => {
  const dir = tmp();
  assert.equal(load(path.join(dir, 'none.json'), dir).bambuExe, null);
  fs.writeFileSync(path.join(dir, 'bad.json'), '{not json');
  assert.equal(load(path.join(dir, 'bad.json'), dir).bambuExe, null);
});

test('load merges the file over defaults, including nested window', () => {
  const dir = tmp();
  const file = path.join(dir, 's.json');
  fs.writeFileSync(file, JSON.stringify({ outputFolder: 'D:\\x', window: { width: 800 } }));
  const s = load(file, dir);
  assert.equal(s.outputFolder, 'D:\\x');
  assert.equal(s.window.width, 800);
  assert.equal(s.window.height, 900);
});

test('validate rejects relative folders and wrongly named or missing bambuExe', () => {
  assert.deepEqual(validate({ outputFolder: 'relative' }), ['outputFolder must be an absolute path on a local drive']);
  assert.deepEqual(validate({ bambuExe: 'C:\\nope\\bambu-studio.exe' }),
    ['bambuExe must be an absolute local path to an existing bambu-studio.exe, or null']);
  assert.deepEqual(validate({ bambuExe: process.execPath }),
    ['bambuExe must be an absolute local path to an existing bambu-studio.exe, or null']);
  assert.deepEqual(validate({ bambuExe: null }), []);
});

test('validate accepts an existing bambu-studio.exe on a local drive', () => {
  assert.deepEqual(validate({ bambuExe: fakeBambu() }), []);
});

test('validate rejects UNC paths for the output folder', () => {
  assert.deepEqual(validate({ outputFolder: '\\\\host\\share\\x' }), ['outputFolder must be an absolute path on a local drive']);
});

test('save writes the merged settings and returns them', () => {
  const dir = tmp();
  const file = path.join(dir, 'nested', 's.json');
  const exe = fakeBambu();
  const cur = defaults(dir);
  const next = save(file, cur, { bambuExe: exe });
  assert.equal(next.bambuExe, exe);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).bambuExe, exe);
  assert.throws(() => save(file, next, { outputFolder: 'nope' }), /absolute/);
});
