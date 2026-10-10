// Move upstream/ to its origin main, run our tests, and say what changed. The commit
// of the new pin is left to the developer.
const { execFileSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const up = path.join(root, 'upstream');
const git = (...a) => execFileSync('git', ['-C', up, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

const before = git('rev-parse', 'HEAD');
git('fetch', 'origin', 'main');
git('checkout', '--detach', 'origin/main');
const after = git('rev-parse', 'HEAD');
if (before === after) { console.log('upstream already current'); process.exit(0); }

console.log(`upstream ${before.slice(0, 12)} -> ${after.slice(0, 12)}`);
console.log(git('log', '--oneline', `${before}..${after}`));
execFileSync('npm', ['test'], { cwd: root, stdio: 'inherit', shell: true });
console.log('\ntests passed. Review, then:  git add upstream && git commit -m "chore: bump upstream"');
