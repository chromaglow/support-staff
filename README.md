# Support Staff

A Windows desktop app around [Support Fins](https://github.com/gittrahan/support-fins)
(printfins.com): bake breakaway support fins into a 3D print, then send the 3MF straight
to Bambu Studio.

The upstream app lives unmodified in `upstream/` as a git submodule. Everything else here
is the Electron shell, the Send to Bambu button, settings, tests and packaging.

- Design: [docs/specs/2026-10-10-support-fins-desktop-design.md](docs/specs/2026-10-10-support-fins-desktop-design.md)
- First survey of the upstream repo: [docs/LOCAL-TOOL-PLAN.md](docs/LOCAL-TOOL-PLAN.md)
- Research findings: `docs/research/`

```
git clone --recurse-submodules https://github.com/chromaglow/support-staff
```
