# Changelog

All notable changes to this project are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Introduction film (`docs/media/optics-quriosity-intro.mp4`), README teaser and animated interferometer diagram.
- Team GitHub profiles and contact details on the About page.

## [1.0.0] — 2026-10-23

First public release of **optics.quriosity**.

### Added
- Grid editor for beam splitters, mirrors, phase shifters, detectors and photon sources, with the θBS, θ, φH, φV parameters of the original notes.
- Exact simulation of multi-photon states, step by step, with bosonic statistics; verified against the sympy `OpticalTable` code to about 10⁻¹⁶.
- Four-port beam splitters, safe table edges and plain-language checks (light lost through open edges, non-unitary formulas, step limit).
- Choice of beam-splitter formula (Symmetric, Real/Hadamard, phase after splitting, or a custom formula with a live unitarity check).
- Pulsed or continuous-wave timing, identical or distinguishable photons, detector efficiency.
- Analysis panel: click probabilities, joint outcomes, coincidences, time evolution, parameter sweeps with fringe visibility, Python export, checks.
- AI assistant with tool use, through a free Groq API key or Claude.
- Exports: Markdown report, CSV results, SVG drawing, JSON setup, Python for `main.py`.
- Component drawings from ComponentLibrary by Alexander Franzen.
- About page with the team, their photos and the project vision.
- Light and dark themes, command search (Ctrl K), keyboard shortcuts, undo/redo, saved setups.
- Complete user guide (`docs/GUIDE.md`, `docs/guide.html`) and automatic physics tests.
