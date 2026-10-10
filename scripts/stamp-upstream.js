// Writes app/upstream-commit.json so the app can show which upstream commit it runs.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let commit = 'unknown';
try {
  commit = execFileSync('git', ['-C', path.join(root, 'upstream'), 'rev-parse', '--short=12', 'HEAD'],
    { encoding: 'utf8' }).trim();
} catch { /* no git: keep 'unknown' */ }
fs.writeFileSync(path.join(root, 'app', 'upstream-commit.json'),
  JSON.stringify({ commit, stamped: new Date().toISOString() }) + '\n');
console.log(`upstream ${commit}`);
