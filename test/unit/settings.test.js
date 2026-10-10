const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { defaults, load, validate, save } = require('../../app/settings');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sfd-settings-'));

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

test('validate rejects relative folders and non-exe or missing bambuExe', () => {
  assert.deepEqual(validate({ outputFolder: 'relative' }), ['outputFolder must be an absolute path']);
  assert.deepEqual(validate({ bambuExe: 'C:\\nope\\bambu-studio.exe' }),
    ['bambuExe must be an absolute path to an existing .exe, or null']);
  assert.deepEqual(validate({ bambuExe: null }), []);
  assert.deepEqual(validate({ bambuExe: process.execPath }), []);
});

test('save writes the merged settings and returns them', () => {
  const dir = tmp();
  const file = path.join(dir, 'nested', 's.json');
  const cur = defaults(dir);
  const next = save(file, cur, { bambuExe: process.execPath });
  assert.equal(next.bambuExe, process.execPath);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).bambuExe, process.execPath);
  assert.throws(() => save(file, next, { outputFolder: 'nope' }), /absolute/);
});
