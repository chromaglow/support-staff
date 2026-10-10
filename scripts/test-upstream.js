// Run upstream's own Deno suite. DENO_NO_PACKAGE_JSON keeps Deno from treating this
// repo's package.json as a workspace root (it would then look for node_modules and
// write a stray deno.lock here). Same setting as CI.
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync('deno', ['test', '-A'], {
  cwd: path.join(__dirname, '..', 'upstream'), stdio: 'inherit', shell: true,
  env: { ...process.env, DENO_NO_PACKAGE_JSON: '1' },
});
process.exit(r.status ?? 1);
