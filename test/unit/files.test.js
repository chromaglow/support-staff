const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { safeBase, uniquePath, writeAtomic } = require('../../app/files');

test('safeBase keeps letters, digits, dot, dash, space, underscore; trims; caps at 80', () => {
  assert.equal(safeBase('L-bracket v2.1'), 'L-bracket v2.1');
  assert.equal(safeBase('  ../..\\evil:name?*  '), 'evilname');
  assert.equal(safeBase(''), 'part');
  assert.equal(safeBase(null), 'part');
  assert.equal(safeBase('a'.repeat(100)).length, 80);
  assert.equal(safeBase('...'), 'part');
});

test('uniquePath appends -2, -3 while the name is taken', () => {
  const taken = new Set([path.join('D:\\out', 'x-fins.3mf'), path.join('D:\\out', 'x-fins-2.3mf')]);
  const exists = (p) => taken.has(p);
  assert.equal(uniquePath('D:\\out', 'y-fins', '.3mf', exists), path.join('D:\\out', 'y-fins.3mf'));
  assert.equal(uniquePath('D:\\out', 'x-fins', '.3mf', exists), path.join('D:\\out', 'x-fins-3.3mf'));
});

test('uniquePath gives up after 999', () => {
  assert.throws(() => uniquePath('D:\\out', 'x', '.3mf', () => true), /no free name/);
});

test('writeAtomic writes via a .part file and leaves no .part behind', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfd-files-'));
  const target = path.join(dir, 'sub', 'a.3mf');
  await writeAtomic(target, new Uint8Array([1, 2, 3]));
  assert.deepEqual([...fs.readFileSync(target)], [1, 2, 3]);
  assert.ok(!fs.existsSync(`${target}.part`));
});
