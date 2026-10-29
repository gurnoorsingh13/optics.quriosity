/* ============================================================================
   scripts/core/formulas.js  —  How a node changes a photon
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     Every non-empty node is a beam splitter. When a photon arrives it leaves
     in two possible directions:
       • "transmitted" – keeps going the same way
       • "reflected"   – turns 90°, following the "/" or "\" orientation
     Each direction gets an amplitude (a complex number). This file holds the
     formulas that compute those amplitudes from the node's angles:
       θ  (theta)   reflection angle: 0 = nothing, 90 = 50:50, 180 = mirror
       φH (phiH)    phase added on the horizontal port
       φV (phiV)    phase added on the vertical port
     Angles are given here in radians (the app converts from degrees).

   THE FOUR FORMULAS
     sym     Symmetric — the convention used by the original main.py
     real    Real (Hadamard) convention
     out     Phase applied after splitting
     custom  Typed by the user in Settings → Formula

   SHOULD I EDIT IT?
     Not needed: custom formulas can be typed in the app. A developer who wants
     a new built-in formula adds an entry to MODELS following the same shape.
   ============================================================================ */

(() => {
  const C = OGS.C;

  /* Each model returns, for one node:
       { h: { t: amplitude, r: amplitude },    ← photon arriving horizontally
         v: { t: amplitude, r: amplitude } }   ← photon arriving vertically
     t = transmitted, r = reflected. */
  const MODELS = {
    sym: {
      name: 'Symmetric', tag: 'main.py',
      desc: 'Phase on the input port; reflection gains a factor i. The convention used by your main.py.',
      formula: 'a†(in) → e^{iφ(in)} [ cos(θ/2)·a†(trans) + i·sin(θ/2)·a†(refl) ]',
      kernel: (th, ph, pv) => {
        const c = Math.cos(th / 2), s = Math.sin(th / 2), eH = C.cis(ph), eV = C.cis(pv);
        return { h: { t: C.mul(eH, [c, 0]), r: C.mul(eH, [0, s]) }, v: { t: C.mul(eV, [c, 0]), r: C.mul(eV, [0, s]) } };
      },
    },
    real: {
      name: 'Real (Hadamard)', tag: 'real',
      desc: 'Real amplitudes with a sign flip on the vertical transmitted port. At θ = 90° the node is a Hadamard gate.',
      formula: 'a†h → e^{iφH} [ cos(θ/2)·a†(trans) + sin(θ/2)·a†(refl) ]\na†v → e^{iφV} [ −cos(θ/2)·a†(trans) + sin(θ/2)·a†(refl) ]',
      kernel: (th, ph, pv) => {
        const c = Math.cos(th / 2), s = Math.sin(th / 2), eH = C.cis(ph), eV = C.cis(pv);
        return { h: { t: C.mul(eH, [c, 0]), r: C.mul(eH, [s, 0]) }, v: { t: C.mul(eV, [-c, 0]), r: C.mul(eV, [s, 0]) } };
      },
    },
    out: {
      name: 'Phase after splitting', tag: 'phase-out',
      desc: 'The splitter acts first; φH then multiplies light leaving horizontally and φV light leaving vertically.',
      formula: 'a†(in) → cos(θ/2)·e^{iφ(out)}·a†(trans) + i·sin(θ/2)·e^{iφ(out)}·a†(refl)',
      kernel: (th, ph, pv) => {
        const c = Math.cos(th / 2), s = Math.sin(th / 2), eH = C.cis(ph), eV = C.cis(pv);
        return { h: { t: C.mul(eH, [c, 0]), r: C.mul(eV, [0, s]) }, v: { t: C.mul(eV, [c, 0]), r: C.mul(eH, [0, s]) } };
      },
    },
    custom: {
      name: 'Custom formula', tag: 'custom',
      desc: 'Type the four amplitudes yourself in terms of th, phH and phV (radians). Unitarity is checked as you type.',
      formula: '', kernel: null,
    },
  };

  // Starting text for the custom formula boxes (equal to the Symmetric model).
  const DEFAULT_CUSTOM = { tH: 'exp(i*phH)*cos(th/2)', rH: 'i*exp(i*phH)*sin(th/2)', tV: 'exp(i*phV)*cos(th/2)', rV: 'i*exp(i*phV)*sin(th/2)' };
  // "Start from" templates offered under the custom boxes.
  const CUSTOM_TEMPLATES = {
    sym: DEFAULT_CUSTOM,
    real: { tH: 'exp(i*phH)*cos(th/2)', rH: 'exp(i*phH)*sin(th/2)', tV: '-exp(i*phV)*cos(th/2)', rV: 'exp(i*phV)*sin(th/2)' },
    out: { tH: 'exp(i*phH)*cos(th/2)', rH: 'i*exp(i*phV)*sin(th/2)', tV: 'exp(i*phV)*cos(th/2)', rV: 'i*exp(i*phH)*sin(th/2)' },
  };

  // The complete set of computation settings, with defaults taken from config.js.
  function defaultModel() {
    const cfg = window.OGS_CONFIG || {};
    const fmt = ['exact', 'decimal', 'polar'].includes(cfg.NUMBER_FORMAT) ? cfg.NUMBER_FORMAT : 'exact';
    return {
      kernel: 'sym',                 // which formula (see MODELS)
      custom: { ...DEFAULT_CUSTOM }, // text of the custom formula
      time: 'pulsed',                // 'pulsed' = arrival times kept apart; 'cw' = continuous wave
      stats: 'boson',                // 'boson' = identical photons; 'dist' = distinguishable particles
      eta: 1,                        // default detector efficiency (0…1)
      prune: 1e-13,                  // amplitudes smaller than this are dropped
      fmt,                           // how numbers are shown
    };
  }

  // Returns the function (th, phH, phV) → amplitudes for the chosen model.
  // Throws a readable error if a custom formula cannot be read.
  function makeKernel(model) {
    if (model.kernel !== 'custom') return (MODELS[model.kernel] || MODELS.sym).kernel;
    const vars = ['th', 'phH', 'phV'], c = model.custom;
    const f = { tH: OGS.compileExpr(c.tH, vars), rH: OGS.compileExpr(c.rH, vars), tV: OGS.compileExpr(c.tV, vars), rV: OGS.compileExpr(c.rV, vars) };
    return (th, ph, pv) => { const e = { th, phH: ph, phV: pv }; return { h: { t: f.tH(e), r: f.rH(e) }, v: { t: f.tV(e), r: f.rV(e) } }; };
  }

  /* Unitarity check. A physical beam splitter never creates or destroys
     probability. Mathematically its 2×2 matrix must satisfy U†U = 1.
     This returns how far a node is from that (0 = perfect). */
  function unitarityError(a) {
    const col1 = [a.h.t, a.h.r], col2 = [a.v.r, a.v.t];
    const dot = (u, w) => C.add(C.mul(C.conj(u[0]), w[0]), C.mul(C.conj(u[1]), w[1]));
    const n1 = dot(col1, col1), n2 = dot(col2, col2), o = dot(col1, col2);
    return Math.max(Math.abs(n1[0] - 1) + Math.abs(n1[1]), Math.abs(n2[0] - 1) + Math.abs(n2[1]), C.abs(o));
  }

  // Tests a model at 48 random angle combinations; used by Settings to show a green/red status.
  function checkModel(model) {
    try {
      const k = makeKernel(model); let worst = 0;
      for (let i = 0; i < 48; i++) worst = Math.max(worst, unitarityError(k(Math.random() * 6.2832, Math.random() * 6.2832, Math.random() * 6.2832)));
      return { ok: true, worst };
    } catch (e) { return { ok: false, message: e.message }; }
  }

  OGS.formulas = { MODELS, DEFAULT_CUSTOM, CUSTOM_TEMPLATES, defaultModel, makeKernel, unitarityError, checkModel };
})();
