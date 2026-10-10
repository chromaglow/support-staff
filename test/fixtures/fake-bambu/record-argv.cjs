// Stand-in for Bambu Studio in the smoke test. The test copies node.exe to
// <tmp>/bambu-studio.exe and sets NODE_OPTIONS=--require <this file>, so every Node
// process the app spawns loads this first. It only acts in a plain node process whose
// first argument is a .3mf, i.e. the "slicer" launch; in Electron or anything else it
// does nothing.
if (!process.versions.electron && /\.3mf$/i.test(process.argv[1] || '')) {
  require('fs').writeFileSync(process.env.FAKE_BAMBU_LOG, process.argv.slice(1).join('\n'));
  process.exit(0);
}
