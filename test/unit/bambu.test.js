const { test } = require('node:test');
const assert = require('node:assert/strict');
const { exeFromCommand, detectBambu } = require('../../app/bambu');

test('exeFromCommand handles quoted and bare commands', () => {
  assert.equal(exeFromCommand('"C:\\Program Files\\Bambu Studio\\bambu-studio.exe" "%1"'),
    'C:\\Program Files\\Bambu Studio\\bambu-studio.exe');
  assert.equal(exeFromCommand('C:\\BS\\bambu-studio.exe %1'), 'C:\\BS\\bambu-studio.exe');
  assert.equal(exeFromCommand(null), null);
  assert.equal(exeFromCommand('notepad %1'), null);
});

test('detectBambu tries candidates, then App Paths, then the URL handler', () => {
  const calls = [];
  const query = (key) => { calls.push(key); return key.includes('App Paths') ? 'C:\\AP\\bambu-studio.exe' : '"C:\\URL\\bambu-studio.exe" "%1"'; };
  const only = (ok) => (p) => p === ok;
  assert.equal(detectBambu({ candidates: ['C:\\A\\b.exe', 'C:\\B\\b.exe'], exists: only('C:\\B\\b.exe'), query }), 'C:\\B\\b.exe');
  assert.equal(detectBambu({ candidates: ['C:\\A\\b.exe'], exists: only('C:\\AP\\bambu-studio.exe'), query }), 'C:\\AP\\bambu-studio.exe');
  assert.equal(detectBambu({ candidates: [], exists: only('C:\\URL\\bambu-studio.exe'), query }), 'C:\\URL\\bambu-studio.exe');
  assert.equal(detectBambu({ candidates: [], exists: () => false, query }), null);
  assert.ok(calls.some((k) => k.includes('App Paths')) && calls.some((k) => k.includes('bambustudio\\shell')));
});
