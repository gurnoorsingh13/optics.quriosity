# Contributing

Thank you for helping build **optics.quriosity**, an open platform for programmable photonics. Contributions from physicists, educators, students and developers are all welcome: bug reports, new experiments, better explanations, new components and code.

## Ways to help

- **Report a problem.** Open an issue with the *Bug report* template and attach the setup file (Export → Setup file).
- **Suggest a feature.** Use the *Feature request* template. Physics references or a sketch of the setup help a lot.
- **Add an experiment.** Build it in the app, save it (Export → Setup file), and either attach the file to an issue or add it to `scripts/core/presets.js`.
- **Improve the guide.** Edit `docs/GUIDE.md`, then run `pip install markdown` (once) and `python tools/build_guide.py` to refresh `docs/guide.html`.
- **Write code.** See below.

## Project layout

| Path | Contents |
| --- | --- |
| `scripts/core/` | Physics and data, with no screen code: complex maths and the formula reader (`math.js`), beam-splitter formulas (`formulas.js`), the simulation (`engine.js`), experiments (`presets.js`), file exports (`exporters.js`), About text (`project-info.js`) |
| `scripts/ui/` | Everything on screen: table drawing (`canvas.js`), right panel (`inspector.js`), analysis panel (`drawer.js`), settings, assistant, command search, app state (`store.js`) |
| `scripts/app.js` | Starts the app and connects the modules |
| `styles/` | `theme.css` holds every colour and font as tokens; the other files use only those tokens |
| `assets/components/` | Component drawings (third-party, CC BY-NC 3.0) |
| `assets/brand/` | The Quriosity logo (not MIT; see its LICENSE.md) |
| `assets/team/` | Team photos for the About page |
| `tools/` | Small Python scripts that rebuild generated files |
| `tests/` | Physics tests that run in Node.js without dependencies |

There is no build step and no framework. Every file is a plain script loaded by `index.html` in a fixed order and shares one global object, `OGS`. This keeps the project runnable by double-clicking `index.html`, including offline.

## Development

```bash
git clone https://github.com/gurnoorsingh13/optics.quriosity.git
cd optics.quriosity
npm test            # physics tests (Node 18 or newer, no install needed)
npm start           # optional local web server on http://localhost:8080
```

Opening `index.html` directly works too. A local server is only needed if your browser blocks something on `file://` pages.

### Guidelines

- **Keep physics and screen apart.** Anything that changes results belongs in `scripts/core/` and must work in Node (no `document`, no `window` APIs beyond the `OGS` global).
- **Add a test** in `tests/run-tests.js` for any change to the physics, and say in the pull request which known result it reproduces.
- **Write for non-programmers.** Each file starts with a plain-English header saying what it does and whether it is safe to edit. Keep that up to date, and keep comments in plain language.
- **Use the theme tokens** from `styles/theme.css`; do not write colours directly into components. Check both light and dark themes.
- **Generated files.** Do not edit `scripts/ui/component-art.js`, `scripts/ui/brand-art.js` or `docs/guide.html` by hand. Run `python tools/build_component_art.py`, `python tools/build_brand.py` or `python tools/build_guide.py`.
- **Never commit an API key.** `config.js` must keep the placeholder `PASTE_YOUR_GROQ_KEY_HERE`.
- Style: 2-space indentation, single quotes, semicolons, UTF-8 (see `.editorconfig`).

### Pull requests

1. Fork the repository and create a branch, for example `feature/polarising-beam-splitter`.
2. Make your change, run `npm test`, and try it in a browser.
3. Add a line under *Unreleased* in `CHANGELOG.md`.
4. Open the pull request and fill in the checklist.

## Code of conduct

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
