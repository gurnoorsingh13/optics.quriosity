/* ============================================================================
   scripts/core/presets.js  —  The ready-made experiments
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     Defines the experiments listed in the sidebar under "Experiments" and
     describes what a "setup" contains.

   A SETUP CONTAINS
     n, m        grid size (columns × rows of nodes)
     grid[x][y]  each node: { tbs, th, phH, phV, name }
                   tbs = θBS orientation (0/90/180/270)
                   th  = θ reflection angle in degrees
                   phH, phV = phases in degrees
                   name = optional label shown on the table
     dets        detectors: { k: 'h'|'v', x, y, name, eta }
     input       the input state as text (see the Input tab)
     maxT        maximum number of steps
     normalize   rescale the input state so probabilities add to 1
     model       computation settings (see formulas.js)

   SHOULD I EDIT IT?
     Only if you want a new built-in experiment. Easier: build it in the app
     and click "+" next to "My setups" in the sidebar to save it.
   ============================================================================ */

(() => {
  const emptyGrid = (n, m) => Array.from({ length: n }, () => Array.from({ length: m }, () => ({ tbs: 0, th: 0, phH: 0, phV: 0, name: '' })));

  function blankSetup(n, m) {
    const cfg = window.OGS_CONFIG || {};
    return { v: 3, n, m, grid: emptyGrid(n, m), dets: [], input: '', maxT: OGS.clamp(+cfg.DEFAULT_MAX_STEPS || 40, 1, 400), normalize: true,
             model: OGS.formulas.defaultModel(), preset: '', title: '', desc: '', modified: false };
  }
  const place = (S, x, y, props) => Object.assign(S.grid[x][y], props);
  const detector = (S, k, x, y, name) => S.dets.push({ k, x, y, name, eta: null });

  // [id, title, short description, function that builds the setup]
  const PRESETS = [
    ['wigner', 'Wigner\'s friend, extended',
      'The 4 × 4 setup from the notes. Two crystals feed a Hardy-type state into Wigner\'s and the friends\' interferometers; detectors D1–D8 as in the figure. The phase φ between BS5 and BS7 is φH of node (3,3).',
      () => {
        const S = blankSetup(4, 4);
        place(S, 0, 3, { th: 180, name: 'M1' }); place(S, 3, 0, { th: 180, name: 'M2' });
        place(S, 1, 2, { th: 90, name: 'BS2' }); place(S, 2, 1, { th: 90, name: 'BS3' }); place(S, 2, 2, { th: 90, name: 'BS4' });
        place(S, 2, 3, { th: 90, name: 'BS5' }); place(S, 3, 2, { th: 90, name: 'BS6' }); place(S, 3, 3, { th: 90, name: 'BS7' });
        detector(S, 'v', 1, 3, 'D1'); detector(S, 'h', 3, 1, 'D2'); detector(S, 'v', 2, 3, 'D3'); detector(S, 'h', 3, 2, 'D4');
        detector(S, 'v', 2, 4, 'D5'); detector(S, 'h', 4, 2, 'D6'); detector(S, 'v', 3, 4, 'D7'); detector(S, 'h', 4, 3, 'D8');
        S.input = '1 : h(1,2)+ v(0,3)+   # s0 i0  (BBO1)\n1 : v(2,1)+ h(3,0)+   # s1 i1  (BBO2)\n1 : v(0,3)+ v(2,1)+   # i0 s1';
        return S;
      }],
    ['mzi', 'Mach–Zehnder interferometer',
      'Two 50:50 splitters and two mirrors. With equal arms every photon leaves through D2. Sweep φH of M2 to see the interference fringe.',
      () => {
        const S = blankSetup(2, 2);
        place(S, 0, 0, { th: 90, name: 'BS1' }); place(S, 1, 1, { th: 90, name: 'BS2' });
        place(S, 0, 1, { th: 180, name: 'M1' }); place(S, 1, 0, { th: 180, name: 'M2' });
        detector(S, 'v', 1, 2, 'D1'); detector(S, 'h', 2, 1, 'D2');
        S.input = '1 : h(0,0)+';
        return S;
      }],
    ['hom', 'Hong–Ou–Mandel',
      'One photon in each input of a 50:50 splitter. Identical photons always leave together. Switch Settings → Simulation → Particles to distinguishable to remove the dip.',
      () => {
        const S = blankSetup(1, 1);
        place(S, 0, 0, { th: 90, name: 'BS' }); detector(S, 'h', 1, 0, 'D1'); detector(S, 'v', 0, 1, 'D2');
        S.input = '1 : h(0,0)+ v(0,0)+';
        return S;
      }],
    ['bomb', 'Elitzur–Vaidman bomb tester',
      'A Mach–Zehnder with a "Bomb" detector in the lower arm. D1 clicks a quarter of the time: the bomb is found without being touched.',
      () => { const S = PRESETS[1][3](); detector(S, 'h', 1, 0, 'Bomb'); return S; }],
    ['bs', 'Single beam splitter',
      'One photon on a 50:50 splitter. Change θ to tune the reflectivity R = sin²(θ/2).',
      () => {
        const S = blankSetup(1, 1);
        place(S, 0, 0, { th: 90, name: 'BS' }); detector(S, 'h', 1, 0, 'D1'); detector(S, 'v', 0, 1, 'D2');
        S.input = '1 : h(0,0)+';
        return S;
      }],
    ['dc', 'Delayed choice',
      'The delayed-choice setup from the notebook: an entangled photon pair, with the final splitter at (2,2) acting as the choice.',
      () => {
        const S = blankSetup(3, 3);
        place(S, 1, 1, { th: 90 }); place(S, 2, 2, { th: 90, name: 'choice' }); place(S, 0, 2, { th: 180 }); place(S, 2, 0, { th: 180 });
        place(S, 1, 2, { th: 90 }); place(S, 2, 1, { th: 90 });
        detector(S, 'v', 1, 2, 'D1'); detector(S, 'h', 2, 1, 'D2'); detector(S, 'v', 1, 3, 'D3'); detector(S, 'h', 3, 1, 'D4');
        detector(S, 'v', 2, 3, 'D5'); detector(S, 'h', 3, 2, 'D6');
        S.input = '1 : h(1,1)+ v(0,2)+\n1 : v(1,1)+ h(2,0)+';
        return S;
      }],
    ['qs', 'Loop / quantum switch',
      'The loop from the notebook. Light circulates and leaks out through a 50:50 splitter on every round. Try continuous-wave timing in Settings.',
      () => {
        const S = blankSetup(4, 3);
        place(S, 0, 0, { tbs: 90, th: 180 }); place(S, 0, 2, { tbs: 180, th: 180 });
        for (const [x, y] of [[1, 1], [2, 2], [1, 2], [2, 1], [3, 1]]) place(S, x, y, { tbs: 270 });
        for (const [x, y] of [[2, 2], [1, 1], [3, 1], [3, 0]]) place(S, x, y, { th: 180 });
        place(S, 1, 2, { th: 90, phV: 60, name: 'A' }); place(S, 2, 1, { th: 90 }); place(S, 2, 2, { phV: 30, name: 'B' });
        detector(S, 'v', 1, 3, 'D');
        S.input = '1 : v(2,0)+'; S.maxT = 80;
        return S;
      }],
    ['empty', 'Blank 4 × 4 table',
      'An empty table with one photon entering at the bottom left. Build your own setup with the tools in the sidebar.',
      () => { const S = blankSetup(4, 4); S.input = '1 : h(0,0)+'; return S; }],
  ];

  // Builds a fresh copy of a preset by id.
  function build(id) {
    const p = PRESETS.find(x => x[0] === id) || PRESETS[0];
    const S = p[3]();
    S.preset = p[0]; S.title = p[1]; S.desc = p[2]; S.modified = false;
    return S;
  }

  /* Makes any loaded setup safe to use: fills missing fields, fixes types,
     and limits sizes. Used for saved setups and files the user opens. */
  function isValid(o) {
    return o && Number.isInteger(o.n) && Number.isInteger(o.m) && o.n >= 1 && o.m >= 1 && o.n <= 14 && o.m <= 14 &&
      Array.isArray(o.grid) && o.grid.length === o.n && o.grid.every(c => Array.isArray(c) && c.length === o.m) &&
      Array.isArray(o.dets) && typeof o.input === 'string';
  }
  function repair(o) {
    o.v = 3;
    o.model = Object.assign(OGS.formulas.defaultModel(), o.model || {});
    if (!OGS.formulas.MODELS[o.model.kernel]) o.model.kernel = 'sym';
    o.model.custom = Object.assign({ ...OGS.formulas.DEFAULT_CUSTOM }, o.model.custom || {});
    o.maxT = OGS.clamp(+o.maxT || 40, 1, 400);
    if (o.normalize === undefined) o.normalize = true;
    for (const col of o.grid) for (const nd of col) {
      nd.tbs = OGS.norm360(Math.round((+nd.tbs || 0) / 90) * 90); nd.th = +nd.th || 0; nd.phH = +nd.phH || 0; nd.phV = +nd.phV || 0;
      nd.name = String(nd.name || '').slice(0, 12);
    }
    o.dets = o.dets.map(d => ({ k: d.k === 'v' ? 'v' : 'h', x: d.x | 0, y: d.y | 0, name: String(d.name || 'D').replace(/\s+/g, '_').slice(0, 12), eta: d.eta == null ? null : OGS.clamp(+d.eta, 0, 1) }));
    o.title = String(o.title || ''); o.desc = String(o.desc || ''); o.preset = String(o.preset || '');
    return o;
  }

  OGS.presets = { list: PRESETS, build, blankSetup, emptyGrid, isValid, repair };
})();
