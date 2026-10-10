const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createLogger, MAX } = require('../../app/log');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sfd-log-'));

test('writes timestamped lines and creates the folder', () => {
  const file = path.join(tmp(), 'nested', 'app.log');
  const log = createLogger(file);
  log.info('hello');
  log.error('bad');
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^\d{4}-\d\d-\d\dT.* INFO hello$/);
  assert.match(lines[1], / ERROR bad$/);
});

test('rotates to .1 when the file passes MAX', () => {
  const file = path.join(tmp(), 'app.log');
  fs.writeFileSync(file, 'x'.repeat(MAX + 1));
  createLogger(file).info('after');
  assert.ok(fs.existsSync(file + '.1'));
  assert.match(fs.readFileSync(file, 'utf8'), /INFO after/);
});
