# Support Staff

A Windows desktop app around [Support Fins](https://github.com/gittrahan/support-fins)
(printfins.com): bake breakaway support fins into a 3D print, then send the 3MF straight
to Bambu Studio.

The upstream app lives unmodified in `upstream/` as a git submodule. Everything else here
is the Electron shell, the Send to Bambu button, settings, tests and packaging.

## Use

Download `Support Staff Setup 0.1.0.exe` (installer) or `Support Staff 0.1.0.exe`
(portable) from the latest green run's `windows-build` artifact on the
[Actions page](https://github.com/chromaglow/support-staff/actions), or build it with
`npm run dist`.

1. Import a part (STL, 3MF or STEP), rotate it, click **Add fins**.
2. Click **Send to Bambu**. The 3MF is saved to your output folder (default
   `Documents\Support Fins`, never overwriting an earlier file) and opened in Bambu
   Studio. Slice with supports off.
3. **Export** still saves STL, 3MF or fins-only through a normal save dialog, without
   launching Bambu.

Settings live behind the gear button right of Export (or File > Settings…): the output
folder and the Bambu Studio path, which is detected on first run. Logs are in
`%APPDATA%\support-staff\logs\`.

**Bambu already open?** Each Send to Bambu starts Bambu Studio with the new file. If
Bambu's *Preferences > Single instance* is off (its default), that means a second Bambu
window, which takes about 25 seconds to appear. Turn *Single instance* on and Bambu
loads the file into the window you already have. Details and the alternatives that
were tested and rejected are in [docs/research/2026-10-findings.md](docs/research/2026-10-findings.md).

## Develop

```
git clone --recurse-submodules https://github.com/chromaglow/support-staff
npm install
npm run dev            # Electron with DevTools, no renderer cache
npm test               # unit tests, then the Playwright smoke tests
npm run dist           # installer + portable exe into dist/
npm run test:upstream  # upstream's own Deno suite
npm run bump-upstream  # move upstream/ to its main, run the tests, then you commit
```

To smoke-test a packaged build: `SUPPORT_STAFF_EXE="dist/win-unpacked/Support Staff.exe" npx playwright test`.
Point it at the real binary (win-unpacked or the installed exe), not the portable exe,
which is a self-extracting wrapper Playwright cannot attach to.

Upstream's suite on Windows: one STEP test fails for a Deno module-detection reason,
and the path fix is pending upstream in
[gittrahan/support-fins#228](https://github.com/gittrahan/support-fins/pull/228)
(our duplicate [#230](https://github.com/gittrahan/support-fins/pull/230)). CI runs that
suite on Linux, where it is green.

- Design: [docs/specs/2026-10-10-support-fins-desktop-design.md](docs/specs/2026-10-10-support-fins-desktop-design.md)
- Plan: [docs/plans/2026-10-10-support-fins-desktop.md](docs/plans/2026-10-10-support-fins-desktop.md)
- Research findings: [docs/research/2026-10-findings.md](docs/research/2026-10-findings.md)
- First survey of the upstream repo: [docs/LOCAL-TOOL-PLAN.md](docs/LOCAL-TOOL-PLAN.md)

## Licenses

This repo is MIT. Support Fins is MIT (gittrahan). STEP import uses occt-import-js
(Open CASCADE), LGPL-2.1, vendored unmodified under `upstream/web/vendor/`; the packaged
app ships the license texts in `resources/licenses/`.
