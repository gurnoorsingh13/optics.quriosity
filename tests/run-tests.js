#!/usr/bin/env node
/* ============================================================================
   tests/run-tests.js  —  Automatic physics checks
   ----------------------------------------------------------------------------
   Runs the simulation core (scripts/core/*.js) in Node.js, with no browser and
   no extra packages, and checks it against known results:
     • textbook experiments (beam splitter, Mach–Zehnder, Hong–Ou–Mandel,
       Elitzur–Vaidman bomb tester)
     • the Wigner's-friend setup of the notes, with probabilities checked
       against the original sympy code (main.py)
     • conservation of probability for every preset and formula
     • the formula reader, the unitarity check and the exporters

   HOW TO RUN
       node tests/run-tests.js        or        npm test
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load the core exactly as the browser does: plain scripts sharing one global "OGS".
globalThis.window = globalThis;
const root = path.join(__dirname, '..');
for (const file of ['config.js', 'scripts/core/math.js', 'scripts/core/project-info.js', 'scripts/core/formulas.js',
                    'scripts/core/engine.js', 'scripts/core/presets.js', 'scripts/core/exporters.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
}
const { engine, presets, formulas, exporters } = OGS;

let passed = 0, failed = 0;
function check(name, condition, detail = '') {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? `  (${detail})` : ''}`); }
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
function finalStats(setup) {
  const r = engine.simulate(setup);
  return { r, s: engine.stats(r.states[r.states.length - 1], setup) };
}

console.log('\nTextbook experiments');
{
  const { s } = finalStats(presets.build('bs'));
  check('50:50 beam splitter gives 1/2 and 1/2', near(s.det.D1, 0.5) && near(s.det.D2, 0.5));
}
{
  const { s } = finalStats(presets.build('mzi'));
  check('Mach–Zehnder with equal arms sends everything to D2', near(s.det.D1, 0) && near(s.det.D2, 1));
}
{
  const S = presets.build('mzi'); S.grid[1][0].phH = 180;
  const { s } = finalStats(S);
  check('Mach–Zehnder with a π phase sends everything to D1', near(s.det.D1, 1) && near(s.det.D2, 0));
}
{
  const S = presets.build('mzi'); S.grid[1][0].phH = 90;
  const { s } = finalStats(S);
  check('Mach–Zehnder with a π/2 phase splits 1/2 and 1/2', near(s.det.D1, 0.5) && near(s.det.D2, 0.5));
}
{
  const { s } = finalStats(presets.build('hom'));
  check('Hong–Ou–Mandel: photons always leave together (no coincidences)', near(s.pair['D1|D2'] || 0, 0) && near(s.det.D1, 0.5));
  const S = presets.build('hom'); S.model.stats = 'dist';
  const d = finalStats(S).s;
  check('Distinguishable particles: coincidence probability 1/2', near(d.pair['D1|D2'], 0.5));
}
{
  const { s } = finalStats(presets.build('bomb'));
  check('Bomb tester: 1/2 explodes, 1/4 bright port, 1/4 dark port', near(s.det.Bomb, 0.5) && near(s.det.D2, 0.25) && near(s.det.D1, 0.25));
}
{
  const S = presets.build('bs'); S.model.eta = 0.8;
  const { s } = finalStats(S);
  check('Detector efficiency 0.8 counts 40% at each detector and loses 20%', near(s.det.D1, 0.4) && near(s.det.D2, 0.4) && near(s.lost, 0.2));
}

console.log("\nWigner's friend, extended (values from the sympy code in main.py)");
{
  const { r, s } = finalStats(presets.build('wigner'));
  const expected = { D1: 1 / 6, D2: 1 / 3, D3: 1 / 4, D4: 1 / 4, D5: 1 / 3, D6: 1 / 6, D7: 1 / 4, D8: 1 / 4 };
  for (const [d, p] of Object.entries(expected)) check(`${d} clicks with probability ${p.toFixed(4)}`, near(s.det[d], p), `got ${s.det[d]}`);
  check('15 terms in the state at step 4, as in main.py', [...r.states[4]].length === 15);
  check('Total probability is 1', near(s.total, 1));
}

console.log('\nConservation of probability');
for (const [id] of presets.list) {
  for (const kernel of ['sym', 'real', 'out']) {
    const S = presets.build(id); S.model.kernel = kernel; S.maxT = 200;
    const { s } = finalStats(S);
    check(`${id} · ${kernel}: total probability is 1`, near(s.total, 1, 1e-9), `got ${s.total}`);
  }
}

console.log('\nFormula reader and unitarity check');
{
  const f = OGS.compileExpr('1/sqrt(2)');
  check('1/sqrt(2) = 0.70710678', near(f({})[0], Math.SQRT1_2));
  const g = OGS.compileExpr('2i * exp(i*pi/2)');
  check('2i·e^{iπ/2} = −2', near(g({})[0], -2) && near(g({})[1], 0));
  check('Built-in formulas are unitary', ['sym', 'real', 'out'].every(k => formulas.checkModel({ ...formulas.defaultModel(), kernel: k }).worst < 1e-12));
  const bad = { ...formulas.defaultModel(), kernel: 'custom', custom: { ...formulas.DEFAULT_CUSTOM, rH: '2*i*sin(th/2)' } };
  check('A non-unitary custom formula is detected', formulas.checkModel(bad).worst > 0.1);
  let threw = false; try { OGS.compileExpr('foo(th)', ['th']); } catch (e) { threw = true; }
  check('An unknown function gives a readable error', threw);
}

console.log('\nExports');
{
  const S = presets.build('wigner'), r = engine.simulate(S);
  const py = exporters.python(S, r, true);
  check('Python export sets up the OpticalTable', py.includes('T = OpticalTable(Size)') && py.includes('T.Theta[2,2] = sp.pi/2'));
  check('Python export includes the input state with exact coefficients', py.includes('sp.sqrt(3)/3'));
  check('CSV export has one row per step plus outcomes', exporters.csv(S, r).split('\n').length > r.states.length);
  check('Report export lists every detector', S.dets.every(d => exporters.report(S, r, 'test').includes(`| ${d.name} |`)));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
