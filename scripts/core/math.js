/* ============================================================================
   scripts/core/math.js  —  Numbers, formulas and how they are written
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     1. Complex numbers. Quantum amplitudes are complex numbers (a + b·i).
        JavaScript has none built in, so a complex number is stored here as a
        pair  [real part, imaginary part].  Example: [0.5, -0.5] = 0.5 − 0.5i
     2. A small formula reader. It turns text such as "1/sqrt(2)" or
        "i*exp(i*phH)*sin(th/2)" into a function the simulator can evaluate.
        It is used for input-state coefficients and for custom formulas.
     3. Number formatting: shows values as exact (√2/2), decimal or polar.

   SHOULD I EDIT IT?
     No. Nothing in this file is a setting.
   ============================================================================ */

window.OGS = window.OGS || {};
OGS.VERSION = '1.0.0';                                   // release number shown in the app

/* ---------------------------------------------------------------------------
   1. COMPLEX NUMBERS
   --------------------------------------------------------------------------- */
OGS.C = (() => {
  const ONE = [1, 0];
  const ZERO = [0, 0];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const div = (a, b) => {
    const d = b[0] * b[0] + b[1] * b[1];
    if (!d) throw new Error('division by zero');
    return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
  };
  const abs2 = a => a[0] * a[0] + a[1] * a[1];          // |z|²  (probability weight)
  const abs = a => Math.hypot(a[0], a[1]);              // |z|
  const conj = a => [a[0], -a[1]];                      // complex conjugate
  const cis = t => [Math.cos(t), Math.sin(t)];          // e^{i·t}
  const exp = a => { const r = Math.exp(a[0]); return [r * Math.cos(a[1]), r * Math.sin(a[1])]; };
  const sqrt = a => { const r = Math.sqrt(abs(a)), t = Math.atan2(a[1], a[0]) / 2; return [r * Math.cos(t), r * Math.sin(t)]; };
  const pow = (a, b) => (!a[0] && !a[1]) ? [0, 0] : exp(mul([Math.log(abs(a)), Math.atan2(a[1], a[0])], b));
  const cos = a => [Math.cos(a[0]) * Math.cosh(a[1]), -Math.sin(a[0]) * Math.sinh(a[1])];
  const sin = a => [Math.sin(a[0]) * Math.cosh(a[1]), Math.cos(a[0]) * Math.sinh(a[1])];
  const tan = a => div(sin(a), cos(a));
  return { ONE, ZERO, add, sub, mul, div, abs2, abs, conj, cis, exp, sqrt, pow, cos, sin, tan };
})();

OGS.RAD = Math.PI / 180;                                 // degrees → radians
OGS.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
OGS.norm360 = a => ((a % 360) + 360) % 360;              // any angle → 0…359.99°

/* ---------------------------------------------------------------------------
   2. FORMULA READER
   compileExpr("1/sqrt(2)")              → function returning [0.7071, 0]
   compileExpr("cos(th/2)", ["th"])      → function of {th: …}
   Understands: numbers, i, pi, + − * / ^, brackets, and the functions
   sqrt exp cos sin tan conj abs re im. "2i" is read as 2·i.
   --------------------------------------------------------------------------- */
OGS.compileExpr = function compileExpr(src, vars = []) {
  const C = OGS.C;
  const s = String(src).replace(/−/g, '-').replace(/×|·/g, '*');

  // Step 1: split the text into tokens (numbers, names, symbols).
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const num = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
    if (num) { toks.push({ t: 'n', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const id = s.slice(i).match(/^[a-zA-Zπ_][a-zA-Z0-9_]*/);
    if (id) { toks.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    if ('+-*/^()√'.includes(ch)) { toks.push({ t: ch }); i++; continue; }
    throw new Error(`unexpected "${ch}"`);
  }
  if (!toks.length) throw new Error('empty expression');

  // Step 2: read the tokens with the usual order of operations.
  let p = 0;
  const peek = () => toks[p];
  const eat = t => { if (!toks[p] || toks[p].t !== t) throw new Error(`expected "${t}"`); return toks[p++]; };
  const startsAtom = k => k && (k.t === 'n' || k.t === 'id' || k.t === '(' || k.t === '√');
  const FUNCS = { sqrt: C.sqrt, exp: C.exp, cos: C.cos, sin: C.sin, tan: C.tan, conj: C.conj,
                  abs: a => [C.abs(a), 0], re: a => [a[0], 0], im: a => [a[1], 0] };

  function sum() {
    let f = product();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = toks[p++].t, a = f, b = product();
      f = op === '+' ? (e => C.add(a(e), b(e))) : (e => C.sub(a(e), b(e)));
    }
    return f;
  }
  function product() {
    let f = unary();
    for (;;) {
      const k = peek();
      if (k && (k.t === '*' || k.t === '/')) { p++; const a = f, b = unary(); f = k.t === '*' ? (e => C.mul(a(e), b(e))) : (e => C.div(a(e), b(e))); }
      else if (startsAtom(k)) { const a = f, b = power(); f = e => C.mul(a(e), b(e)); }   // "2i", "2 sqrt(2)"
      else break;
    }
    return f;
  }
  function unary() {
    const k = peek();
    if (k && k.t === '-') { p++; const a = unary(); return e => { const v = a(e); return [-v[0], -v[1]]; }; }
    if (k && k.t === '+') { p++; return unary(); }
    return power();
  }
  function power() {
    const a = atom();
    if (peek() && peek().t === '^') { p++; const b = unary(); return e => C.pow(a(e), b(e)); }
    return a;
  }
  function atom() {
    const k = toks[p++];
    if (!k) throw new Error('expression ends too early');
    if (k.t === 'n') { const v = [k.v, 0]; return () => v; }
    if (k.t === '(') { const f = sum(); eat(')'); return f; }
    if (k.t === '√') { const a = atom(); return e => C.sqrt(a(e)); }
    if (k.t === 'id') {
      const name = k.v, lo = name.toLowerCase();
      if (vars.includes(name)) return e => [e[name], 0];
      if (lo === 'i' || lo === 'j') return () => [0, 1];
      if (lo === 'pi' || name === 'π') return () => [Math.PI, 0];
      if (FUNCS[lo]) { eat('('); const a = sum(); eat(')'); return e => FUNCS[lo](a(e)); }
      throw new Error(`unknown name "${name}"${vars.length ? ` (variables are ${vars.join(', ')})` : ''}`);
    }
    throw new Error(`unexpected "${k.t}"`);
  }
  const f = sum();
  if (p < toks.length) throw new Error(`unexpected "${toks[p].v ?? toks[p].t}"`);
  return f;
};

/* ---------------------------------------------------------------------------
   3. NUMBER FORMATTING
   --------------------------------------------------------------------------- */
OGS.fmt = (() => {
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };

  // Tries to write |x| as  p·√r / q  with small whole numbers (e.g. 0.7071 → √2/2).
  function exactParts(x) {
    const ax = Math.abs(x);
    for (const r of [1, 2, 3, 6, 5, 10, 15, 30]) {
      const v = ax / Math.sqrt(r);
      for (let q = 1; q <= 64; q++) {
        const pp = Math.round(v * q);
        if (pp >= 1 && pp <= 128 && Math.abs(v * q - pp) < 1e-9 * q) { const g = gcd(pp, q); return { p: pp / g, q: q / g, r }; }
      }
    }
    return null;
  }
  // A real number as text. mode = "exact" | "decimal" | "polar"
  function real(x, mode) {
    if (Math.abs(x) < 1e-10) return '0';
    const sign = x < 0 ? '−' : '';
    if (mode === 'exact') {
      const e = exactParts(x);
      if (e) { const num = e.r === 1 ? String(e.p) : (e.p === 1 ? '√' + e.r : e.p + '√' + e.r); return sign + (e.q === 1 ? num : num + '/' + e.q); }
    }
    return sign + Math.abs(x).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }
  // A complex number as text.
  function complex(c, mode) {
    const [a, b] = c;
    if (mode === 'polar') {
      const r = OGS.C.abs(c); if (r < 1e-10) return '0';
      let d = Math.atan2(b, a) / OGS.RAD; if (Math.abs(d) < 1e-7) d = 0;
      return `${real(r, 'decimal')}∠${+d.toFixed(2)}°`;
    }
    const za = Math.abs(a) < 1e-10, zb = Math.abs(b) < 1e-10;
    if (zb) return real(a, mode);
    const im = v => { const t = real(Math.abs(v), mode); return t === '1' ? 'i' : 'i·' + t; };
    if (za) return (b < 0 ? '−' : '') + im(b);
    return `(${real(a, mode)} ${b < 0 ? '−' : '+'} ${im(b)})`;
  }
  // A probability as text (exact fraction when possible).
  const prob = (p, mode) => p < 1e-10 ? '0' : (mode === 'exact' ? real(p, 'exact') : p.toFixed(4));
  // A probability as a percentage.
  const pct = p => (p > 0 && p < 0.0005) ? '<0.1%' : (p * 100).toFixed(1).replace(/\.0$/, '') + '%';
  return { exactParts, real, complex, prob, pct };
})();
