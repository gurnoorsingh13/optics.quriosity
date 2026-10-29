/* ============================================================================
   scripts/core/engine.js  —  The simulation itself
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     Takes a setup (grid, components, detectors, input photons, settings) and
     moves the photons forward one step at a time until every photon has been
     detected or has left the table. It records the full quantum state after
     every step, so the app can play the evolution back.

   THE GRID IN WORDS
     • Nodes sit at whole-number points (x, y); x grows to the right, y upward.
     • Light travels along the edges between nodes:
         h(x,y)  = the horizontal edge that ENTERS node (x,y) from the left
         v(x,y)  = the vertical edge that ENTERS node (x,y) from below
       A "+" means travelling right or up; "−" means left or down.
       This is exactly the a†h(x,y) / a†v(x,y) labelling of the notes.
     • One time step moves a photon along one edge, through one node.

   HOW A PHOTON IS STORED
     Each photon is a short piece of text with 8 parts separated by spaces:
         type  k  x  y  s  t  name  tag
       type  A = still moving · F = counted by a detector
             L = reached a detector but was not counted (efficiency < 1)
             X = left the table where there was no detector
       k     h or v (which kind of edge)
       x y   edge position
       s     + or − (direction of travel)
       t     step when it was detected or left ("-" when not recorded)
       name  detector name ("-" when none)
       tag   photon label for distinguishable particles (0 for identical photons)
     A "term" of the quantum state is a list of photons (joined with §), and
     the state is a table  term → complex amplitude.

   SHOULD I EDIT IT?
     No. This is the physics core. It was checked term-by-term against the
     original sympy code (main.py) and agrees to about 10⁻¹⁶.
   ============================================================================ */

(() => {
  const C = OGS.C, RAD = OGS.RAD, clamp = OGS.clamp, norm360 = OGS.norm360;

  // Where a reflected photon goes, for "/" (θBS 0° or 180°) and "\" (90° or 270°).
  const REFLECT_SLASH = { 'h+': 'v+', 'v+': 'h+', 'h-': 'v-', 'v-': 'h-' };
  const REFLECT_BACKSLASH = { 'h+': 'v-', 'v-': 'h+', 'h-': 'v+', 'v+': 'h-' };
  // The two input sides drawn in the notes for each θBS (used only for an informative note).
  const DESIGNATED_INPUTS = { 0: ['h+', 'v+'], 90: ['h+', 'v-'], 180: ['h-', 'v-'], 270: ['h-', 'v+'] };

  /* What kind of component a node is, following the rules in the notes:
       θ = 0 and φ = 0   → empty (no beam splitter)
       θ = 0 and φ ≠ 0   → phase shifter
       θ = 180           → mirror
       anything else     → beam splitter                                     */
  function classify(node) {
    const th = norm360(+node.th);
    const hasPhase = Math.abs(Math.sin(node.phH * RAD / 2)) > 1e-9 || Math.abs(Math.sin(node.phV * RAD / 2)) > 1e-9;
    if (Math.abs(Math.sin(th * RAD / 2)) < 1e-9) return hasPhase ? 'phase' : 'empty';
    if (Math.abs(Math.cos(th * RAD / 2)) < 1e-9) return 'mirror';
    return 'bs';
  }

  // The node a moving photon is about to enter.
  function nodeAhead(k, x, y, s) { return k === 'h' ? (s === '+' ? [x, y] : [x - 1, y]) : (s === '+' ? [x, y] : [x, y - 1]); }

  // The photon text for a photon leaving node (bx,by) in direction dir.
  function leaving(dir, bx, by, tag) {
    switch (dir) {
      case 'h+': return `A h ${bx + 1} ${by} + - - ${tag}`;
      case 'v+': return `A v ${bx} ${by + 1} + - - ${tag}`;
      case 'h-': return `A h ${bx} ${by} - - - ${tag}`;
      default: return `A v ${bx} ${by} - - - ${tag}`;
    }
  }

  /* Photons in the same mode are bosons: a term with n identical photons
     has an extra weight n! (n factorial) when probabilities are computed. */
  function boseFactor(key) {
    if (!key) return 1;
    const count = {};
    for (const p of key.split('§')) count[p] = (count[p] || 0) + 1;
    let f = 1;
    for (const n of Object.values(count)) for (let j = 2; j <= n; j++) f *= j;
    return f;
  }
  const probability = (key, amp) => C.abs2(amp) * boseFactor(key);

  /* ---------------------------------------------------------------------------
     INPUT STATE
     Reads the text typed in the Input tab. One term per line:
         coefficient : modes          e.g.   1/sqrt(2) : h(1,2)+ v(0,3)+
     Returns the terms found and a list of readable error messages.
     --------------------------------------------------------------------------- */
  const MODE_PATTERN = /([hv])\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*([+\-−])?/gi;
  function parseInput(setup) {
    const terms = [], errors = [];
    setup.input.split('\n').forEach((raw, index) => {
      const line = raw.replace(/#.*/, '').trim();           // text after # is a comment
      if (!line) return;
      let coefText = '1', modeText = line;
      const colon = line.indexOf(':');
      if (colon >= 0) { coefText = line.slice(0, colon).trim() || '1'; modeText = line.slice(colon + 1); }
      let coef;
      try { coef = OGS.compileExpr(coefText)({}); }
      catch (e) { errors.push(`Line ${index + 1}: the coefficient has a problem (${e.message}).`); return; }
      const modes = []; let rest = modeText, m;
      MODE_PATTERN.lastIndex = 0;
      while ((m = MODE_PATTERN.exec(modeText))) {
        const k = m[1].toLowerCase(), x = +m[2], y = +m[3], s = (m[4] || '+').replace('−', '-');
        rest = rest.replace(m[0], '');
        const onGrid = k === 'h' ? (x >= 0 && x <= setup.n && y >= 0 && y < setup.m) : (x >= 0 && x < setup.n && y >= 0 && y <= setup.m);
        if (!onGrid) { errors.push(`Line ${index + 1}: ${k}(${x},${y}) is not an edge of a ${setup.n} × ${setup.m} grid.`); continue; }
        modes.push({ k, x, y, s });
      }
      const before = errors.length;
      if (rest.replace(/[\s,*·]/g, '')) errors.push(`Line ${index + 1}: could not read "${rest.trim()}". Write modes like h(1,2)+`);
      if (!modes.length) { if (errors.length === before && !/[hv]\s*\(/i.test(modeText)) errors.push(`Line ${index + 1}: no photon modes. Write modes like h(1,2)+`); return; }
      terms.push({ coef, modes, line: index + 1 });
    });
    return { terms, errors };
  }

  /* ---------------------------------------------------------------------------
     SIMULATE
     options.light = true skips extra bookkeeping (used for fast sweeps).
     Returns:
       states    the quantum state after each step (states[0] = input)
       occ       how much probability sits on each edge at each step (for drawing)
       warnings  list of {sev: 'info'|'warn'|'bad', text}
       err       input or formula errors (text), terms, ms (run time) …
     --------------------------------------------------------------------------- */
  function simulate(setup, options = {}) {
    const started = performance.now();
    const M = setup.model;
    const R = { states: [], occ: [], warnings: [], err: '', inNorm: 0, ms: 0, terms: [], kernelOK: true, truncated: false, hits: new Map() };
    const fail = msg => { R.err = msg; R.kernelOK = false; R.states = [new Map()]; R.occ = [new Map()]; R.ms = performance.now() - started; return R; };

    // 1. Work out every node's amplitudes once.
    let kernel;
    try { kernel = OGS.formulas.makeKernel(M); } catch (e) { return fail(`Custom formula: ${e.message}`); }
    const n = setup.n, m = setup.m, amps = [];
    let worstU = 0, worstAt = null;
    for (let x = 0; x < n; x++) {
      amps.push([]);
      for (let y = 0; y < m; y++) {
        const node = setup.grid[x][y];
        if (classify(node) === 'empty') { amps[x].push(null); continue; }     // empty nodes let light straight through
        let a;
        try { a = kernel(node.th * RAD, node.phH * RAD, node.phV * RAD); } catch (e) { return fail(`Custom formula at node (${x},${y}): ${e.message}`); }
        for (const q of [a.h.t, a.h.r, a.v.t, a.v.r]) if (!q || !isFinite(q[0]) || !isFinite(q[1])) return fail(`The custom formula gives a value that is not a number at node (${x},${y}).`);
        const u = OGS.formulas.unitarityError(a);
        if (u > worstU) { worstU = u; worstAt = [x, y]; }
        amps[x].push(a);
      }
    }
    if (worstU > 1e-9) R.warnings.push({ sev: 'bad', text: `The formula is not unitary at node (${worstAt}) (deviation ${worstU.toExponential(2)}), so probabilities will not add up to 1.` });

    // 2. Read the input photons.
    const { terms, errors } = parseInput(setup);
    R.terms = terms;
    if (errors.length) R.err = errors.join('\n');
    const detectors = new Map(setup.dets.map(d => [d.k + d.x + ',' + d.y, d]));
    const cw = M.time === 'cw', distinguishable = M.stats === 'dist', prune = M.prune || 1e-13;
    const backSideNodes = new Set();
    const hits = new Map();          // node "x,y" → directions of light arriving there (used to draw mirrors)

    let state = new Map();
    for (const t of terms) {
      const key = t.modes.map((md, i) => `A ${md.k} ${md.x} ${md.y} ${md.s} - - ${distinguishable ? i + 1 : 0}`).sort().join('§');
      const prev = state.get(key);
      state.set(key, prev ? C.add(prev, t.coef) : t.coef);
    }
    let norm = 0;
    for (const [k, a] of state) norm += probability(k, a);
    R.inNorm = norm;
    if (setup.normalize && norm > 0) { const f = 1 / Math.sqrt(norm); for (const [k, a] of state) state.set(k, [a[0] * f, a[1] * f]); }
    R.states.push(state);

    // 3. What happens to ONE photon during one step: a list of [new photon, amplitude].
    function stepPhoton(p, t) {
      const f = p.split(' ');
      if (f[0] !== 'A') return [[p, C.ONE]];                       // already finished
      const k = f[1], x = +f[2], y = +f[3], s = f[4], tag = f[7], when = cw ? '-' : t;
      const d = detectors.get(k + x + ',' + y);
      if (d) {                                                      // on a detector edge: absorbed
        const eta = clamp(d.eta == null ? +M.eta : +d.eta, 0, 1), out = [];
        if (eta > 0) out.push([`F ${k} ${x} ${y} ${s} ${when} ${d.name} ${tag}`, [Math.sqrt(eta), 0]]);
        if (eta < 1) out.push([`L ${k} ${x} ${y} ${s} ${when} ${d.name} ${tag}`, [Math.sqrt(1 - eta), 0]]);
        return out;
      }
      const [bx, by] = nodeAhead(k, x, y, s);
      if (bx < 0 || by < 0 || bx >= n || by >= m) return [[`X ${k} ${x} ${y} ${s} ${when} - ${tag}`, C.ONE]];   // leaves the table
      const a = amps[bx][by], dir = k + s;
      if (!a) return [[leaving(dir, bx, by, tag), C.ONE]];           // empty node: straight through
      const tbs = norm360(+setup.grid[bx][by].tbs);
      const hk = bx + ',' + by; if (!hits.has(hk)) hits.set(hk, new Set()); hits.get(hk).add(dir);
      if (!(DESIGNATED_INPUTS[tbs] || DESIGNATED_INPUTS[0]).includes(dir)) backSideNodes.add(bx + ',' + by);
      const reflected = (tbs % 180 === 0 ? REFLECT_SLASH : REFLECT_BACKSLASH)[dir], q = a[k], out = [];
      if (C.abs2(q.t) > 1e-30) out.push([leaving(dir, bx, by, tag), q.t]);
      if (C.abs2(q.r) > 1e-30) out.push([leaving(reflected, bx, by, tag), q.r]);
      return out;
    }
    const anyMoving = s => { for (const [k, a] of s) if (k && k.split('§').some(p => p[0] === 'A') && probability(k, a) > prune * prune) return true; return false; };

    // 4. Step the whole state forward until nothing moves.
    try {
      for (let t = 0; t < setup.maxT; t++) {
        if (!anyMoving(state)) break;
        const next = new Map();
        for (const [key, amp] of state) {
          let partial = [[[], amp]];
          for (const p of (key ? key.split('§') : [])) {
            const options2 = stepPhoton(p, t), grown = [];
            for (const [list, a] of partial) for (const [q, b] of options2) grown.push([list.concat(q), C.mul(a, b)]);
            partial = grown;
          }
          for (const [list, a] of partial) { const k = list.sort().join('§'); const prev = next.get(k); next.set(k, prev ? C.add(prev, a) : a); }
          if (next.size > 80000) throw new Error('The state grew past 80,000 terms. Use fewer photons or fewer steps.');
        }
        for (const [k, a] of next) if (C.abs2(a) < prune * prune) next.delete(k);
        state = next;
        R.states.push(state);
      }
    } catch (e) { R.warnings.push({ sev: 'bad', text: e.message }); }

    // 5. Bookkeeping and plain-language checks.
    R.hits = hits;
    if (!options.light) R.occ = R.states.map(occupancy);
    const last = R.states[R.states.length - 1];
    if (anyMoving(last)) {
      R.truncated = true;
      if (!options.light) R.warnings.push({ sev: 'warn', text: `Stopped at the ${setup.maxT}-step limit with ${OGS.fmt.pct(stats(last, setup).inflight)} of the probability still on the table. Raise “Max steps” in Settings → Simulation.` });
    }
    if (!options.light) {
      for (const b of backSideNodes) {
        const [x, y] = b.split(',').map(Number), label = setup.grid[x][y].name;
        R.warnings.push({ sev: 'info', text: `Light reaches ${label ? label + ' ' : ''}(${x},${y}) from its back side. All four ports work here; the original main.py would stop with an error at this node.` });
      }
      const s = stats(last, setup);
      for (const [edge, p] of s.exitEdges) if (p > 1e-6) R.warnings.push({ sev: 'warn', text: `${OGS.fmt.pct(p)} of the probability leaves the table through ${edge}, where there is no detector.` });
      if (s.lost > 1e-9) R.warnings.push({ sev: 'info', text: `Detector efficiency loses ${OGS.fmt.pct(s.lost)} of the probability (a photon reached a detector but was not counted).` });
      if (Math.abs(s.total - 1) > 1e-6 && R.kernelOK && !errors.length && last.size && worstU <= 1e-9) {
        R.warnings.push(cw
          ? { sev: 'info', text: `The total probability is ${s.total.toFixed(4)}. With continuous-wave timing, amplitudes arriving at different steps add together, so the total need not be 1 after a finite number of steps.` }
          : { sev: 'warn', text: `The total probability is ${s.total.toFixed(6)} instead of 1.` });
      }
      if (!setup.normalize && Math.abs(R.inNorm - 1) > 1e-9 && R.inNorm > 0) R.warnings.push({ sev: 'info', text: `The input state is not normalised (norm² = ${R.inNorm.toFixed(4)}). Tick “Normalise” in the Input tab to rescale it.` });
    }
    R.ms = performance.now() - started;
    return R;
  }

  // Probability of finding a moving photon on each edge (used to draw the orange beams).
  function occupancy(state) {
    const o = new Map();
    for (const [k, a] of state) {
      if (!k) continue;
      const pr = probability(k, a);
      if (pr < 1e-14) continue;
      for (const p of k.split('§')) if (p[0] === 'A') { const f = p.split(' '), key = `${f[1]} ${f[2]} ${f[3]} ${f[4]}`; o.set(key, (o.get(key) || 0) + pr); }
    }
    return o;
  }

  /* ---------------------------------------------------------------------------
     STATS — turns a quantum state into numbers people care about:
       det        probability that each detector clicks
       pair       probability that two detectors click together
       joint      probability of each complete outcome ("D5 + D8", …)
       inflight   probability that photons are still moving
       exited     probability lost through edges without detectors
       lost       probability missed because of detector efficiency
       total      sum of everything (should be 1)
     --------------------------------------------------------------------------- */
  function stats(state, setup) {
    const det = {}; for (const d of setup.dets) det[d.name] = 0;
    const pair = {}, joint = new Map(), exitEdges = new Map();
    let inflight = 0, exited = 0, lost = 0, total = 0;
    const distinguishable = setup.model.stats === 'dist';
    for (const [k, a] of state) {
      const pr = probability(k, a);
      if (pr < 1e-15) continue;
      total += pr;
      const fired = new Set(), labels = [];
      let moving = 0, exit = false, missed = false;
      for (const p of (k ? k.split('§') : [])) {
        const f = p.split(' ');
        if (f[0] === 'F') { fired.add(f[6]); labels.push(distinguishable ? `${f[6]}·γ${f[7]}` : f[6]); }
        else if (f[0] === 'L') { missed = true; labels.push(`missed by ${f[6]}`); }
        else if (f[0] === 'X') { exit = true; const e = `${f[1]}(${f[2]},${f[3]})`; labels.push(`exit ${e}`); exitEdges.set(e, (exitEdges.get(e) || 0) + pr); }
        else moving++;
      }
      for (const name of fired) det[name] = (det[name] || 0) + pr;
      const list = [...fired];
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const key = [list[i], list[j]].sort().join('|'); pair[key] = (pair[key] || 0) + pr; }
      if (moving) { inflight += pr; labels.push(moving > 1 ? `${moving} photons in flight` : 'photon in flight'); }
      if (exit) exited += pr;
      if (missed) lost += pr;
      const label = labels.sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).join(' + ') || 'nothing';
      joint.set(label, (joint.get(label) || 0) + pr);
    }
    return { det, pair, inflight, exited, lost, total, joint: [...joint].sort((a, b) => b[1] - a[1]), exitEdges: [...exitEdges] };
  }

  /* ---------------------------------------------------------------------------
     SWEEP — runs the experiment many times while changing one angle of one
     node, and records every detector's click probability. Used for fringes.
       cfg = { x, y, param: 'th'|'phH'|'phV', from, to, steps }
     --------------------------------------------------------------------------- */
  function sweep(setup, cfg, colorOf) {
    const started = performance.now();
    const steps = clamp(cfg.steps | 0, 3, 361);
    const copy = JSON.parse(JSON.stringify(setup));
    const series = setup.dets.map((d, i) => ({ name: d.name, color: colorOf(i), pts: [] }));
    for (let i = 0; i < steps; i++) {
      const v = cfg.from + (cfg.to - cfg.from) * i / (steps - 1);
      copy.grid[cfg.x][cfg.y][cfg.param] = v;
      const r = simulate(copy, { light: true });
      const s = stats(r.states[r.states.length - 1], copy);
      series.forEach(se => se.pts.push([v, s.det[se.name] || 0]));
    }
    return { ...cfg, steps, series, ms: performance.now() - started };
  }

  OGS.engine = { classify, simulate, stats, occupancy, parseInput, probability, sweep, nodeAhead };
})();
