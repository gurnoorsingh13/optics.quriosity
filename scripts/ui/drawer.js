/* ============================================================================
   scripts/ui/drawer.js  —  The analysis panel under the table
   ----------------------------------------------------------------------------
   TABS
     Results     click probability of each detector, joint outcomes, and a
                 coincidence grid (how often two detectors click together)
     Evolution   chart of click probabilities step by step
     Sweep       change one angle over a range and plot the fringes
     Python      ready-to-run code for the original main.py
     Checks      automatic warnings (lost light, non-unitary formula, …)

   The panel can be resized by dragging its top edge, or folded away.

   SHOULD I EDIT IT?
     No.
   ============================================================================ */

(() => {
  const { $, esc, icon } = OGS.dom;
  const app = OGS.app, fmt = OGS.fmt;
  const detColor = i => OGS.canvas.detColor(i);
  const TABS = ['results', 'evolution', 'sweep', 'code', 'checks'];

  /* ----- Results ----- */
  function results() {
    const S = app.S, s = OGS.engine.stats(app.sim.states[app.t], S), mode = S.model.fmt, D = S.dets;
    const rows = D.map((d, i) => { const p = s.det[d.name] || 0; return `<tr><td><span class="swatch" style="background:${detColor(i)}"></span>${esc(d.name)}</td><td class="mono faint">${d.k}(${d.x},${d.y})</td><td class="num">${fmt.prob(p, mode)}</td><td style="width:36%"><div class="bar"><i style="width:${(p * 100).toFixed(2)}%;background:${detColor(i)}"></i></div></td><td class="num faint">${fmt.pct(p)}</td></tr>`; }).join('')
      || `<tr><td colspan="5" class="faint">No detectors yet. Choose Detector in the sidebar and click an edge.</td></tr>`;
    const joint = s.joint.slice(0, 40).map(([label, p]) => `<tr><td>${esc(label)}</td><td class="num">${fmt.prob(p, mode)}</td><td class="num faint">${fmt.pct(p)}</td></tr>`).join('');
    let grid = '';
    if (D.length >= 2 && D.length <= 12) {
      grid = `<div class="table-wrap"><div style="display:grid;grid-template-columns:auto repeat(${D.length},minmax(34px,1fr));gap:2px;font:11px var(--mono)"><div></div>${D.map(d => `<div class="faint" style="text-align:center;padding:4px 0">${esc(d.name)}</div>`).join('')}`;
      D.forEach((a, i) => {
        grid += `<div class="faint" style="text-align:right;padding:6px 6px 6px 0">${esc(a.name)}</div>`;
        D.forEach((b, j) => {
          const p = i === j ? (s.det[a.name] || 0) : (s.pair[[a.name, b.name].sort().join('|')] || 0);
          const bg = p > 1e-9 ? `background:color-mix(in srgb, ${i === j ? 'var(--det)' : 'var(--accent)'} ${Math.round(10 + 62 * Math.min(1, p * (i === j ? 1 : 2)))}%, var(--bg-subtle))` : 'background:var(--bg-subtle)';
          grid += `<div style="${bg};text-align:center;padding:6px 0;border-radius:3px" title="P(${esc(a.name)}${i === j ? '' : ' and ' + esc(b.name)})">${p > 1e-9 ? p.toFixed(3) : '·'}</div>`;
        });
      });
      grid += `</div></div><p class="hint" style="margin-top:8px">Diagonal: the detector clicks. Elsewhere: both detectors click in the same run.</p>`;
    }
    return `<div class="cols">
      <div><div class="panel-title"><h3>Click probability</h3><small>after step ${app.t} · total ${s.total.toFixed(6)}</small></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Detector</th><th>Edge</th><th class="num">P</th><th></th><th class="num">%</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="chips"><span class="tag orange">In flight ${fmt.pct(s.inflight)}</span><span class="tag ${s.exited > 1e-6 ? 'red' : ''}">Left the table ${fmt.pct(s.exited)}</span>${s.lost > 1e-9 ? `<span class="tag">Missed by detectors ${fmt.pct(s.lost)}</span>` : ''}</div></div>
      <div><div class="panel-title"><h3>Joint outcomes</h3><small>${s.joint.length} outcome${s.joint.length === 1 ? '' : 's'}</small></div>
        <div class="table-wrap" style="max-height:170px"><table class="data"><thead><tr><th>Which detectors click</th><th class="num">P</th><th class="num">%</th></tr></thead><tbody>${joint}</tbody></table></div>
        ${grid ? `<div class="panel-title" style="margin-top:18px"><h3>Coincidences</h3></div>${grid}` : ''}</div></div>`;
  }

  /* ----- Line chart used by Evolution and Sweep ----- */
  function lineChart(el, cfg) {
    // Draw at the real width of the box, so the axis text keeps its normal size on any screen.
    const W = Math.max(300, Math.round(el.clientWidth || 760)), H = Math.round(Math.min(220, Math.max(170, W * 0.3))), L = 46, Rr = 14, T = 12, B = 34, iw = W - L - Rr, ih = H - T - B;
    const X = v => L + (v - cfg.xMin) / ((cfg.xMax - cfg.xMin) || 1) * iw, Y = v => T + ih - (v / (cfg.yMax || 1)) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.aria || 'chart')}" style="display:block;width:100%;height:auto">`;
    for (const f of [0, .25, .5, .75, 1]) { const v = f * (cfg.yMax || 1); s += `<line x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${L - 8}" y="${Y(v) + 3.5}" text-anchor="end" class="axl">${+v.toFixed(2)}</text>`; }
    for (const v of cfg.xTicks) s += `<text x="${X(v)}" y="${T + ih + 17}" text-anchor="middle" class="axl">${cfg.fmtX ? cfg.fmtX(v) : v}</text>`;
    s += `<line x1="${L}" x2="${W - Rr}" y1="${T + ih}" y2="${T + ih}" class="ax"/>`;
    s += `<text x="${L + iw / 2}" y="${H - 1}" text-anchor="middle" class="axl">${esc(cfg.xLabel)}</text>`;
    if (cfg.marker != null && isFinite(cfg.marker) && cfg.marker >= cfg.xMin && cfg.marker <= cfg.xMax) s += `<line x1="${X(cfg.marker)}" x2="${X(cfg.marker)}" y1="${T}" y2="${T + ih}" class="cur"/>`;
    for (const se of cfg.series) {
      if (app.ui.hiddenSeries.has(se.name) || !se.pts.length) continue;
      s += `<path d="${se.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('')}" fill="none" stroke="${se.color}" stroke-width="${se.dash ? 1.5 : 1.8}" ${se.dash ? 'stroke-dasharray="4 4"' : ''} stroke-linejoin="round"/>`;
      const lp = se.pts[se.pts.length - 1]; s += `<circle cx="${X(lp[0])}" cy="${Y(lp[1])}" r="2.6" fill="${se.color}"/>`;
    }
    s += `<line class="guide cur" x1="0" x2="0" y1="${T}" y2="${T + ih}" visibility="hidden"/><rect x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent" class="hit" style="cursor:${cfg.onPick ? 'crosshair' : 'default'}"/></svg>`;
    el.innerHTML = `<div style="position:relative">${s}<div class="tooltip ctip" hidden style="top:6px"></div></div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px;font-size:12px;color:var(--text-2)">${cfg.series.map(se => `<button data-series="${esc(se.name)}" style="border:0;background:none;padding:0;cursor:pointer;color:inherit;font:inherit;display:inline-flex;align-items:center;${app.ui.hiddenSeries.has(se.name) ? 'opacity:.35' : ''}"><span class="swatch" style="background:${se.color}"></span>${esc(se.name)}</button>`).join('')}</div>`;
    const svg = el.querySelector('svg'), tip = el.querySelector('.ctip'), guide = svg.querySelector('.guide'), hit = svg.querySelector('.hit');
    const xs = cfg.series[0]?.pts.map(p => p[0]) || [];
    const nearest = e => { const r = svg.getBoundingClientRect(), v = cfg.xMin + ((e.clientX - r.left) / r.width * W - L) / iw * (cfg.xMax - cfg.xMin); let bi = 0, bd = Infinity; xs.forEach((x, i) => { const d = Math.abs(x - v); if (d < bd) { bd = d; bi = i; } }); return bi; };
    hit.addEventListener('mousemove', e => {
      if (!xs.length) return;
      const i = nearest(e), xv = xs[i];
      guide.setAttribute('x1', X(xv)); guide.setAttribute('x2', X(xv)); guide.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.innerHTML = `<div class="m">${esc(cfg.xLabel)} = ${cfg.fmtX ? cfg.fmtX(xv) : xv}</div>` + cfg.series.filter(se => !app.ui.hiddenSeries.has(se.name)).map(se => `<div class="mono" style="font-size:11.5px"><span class="swatch" style="background:${se.color}"></span>${esc(se.name)} ${se.pts[i] ? se.pts[i][1].toFixed(4) : ''}</div>`).join('');
      const r = svg.getBoundingClientRect(), px = X(xv) / W * r.width;
      tip.style.left = Math.max(4, Math.min(px + 12, r.width - tip.offsetWidth - 4)) + 'px';
    });
    hit.addEventListener('mouseleave', () => { tip.hidden = true; guide.setAttribute('visibility', 'hidden'); });
    if (cfg.onPick) hit.addEventListener('click', e => { if (xs.length) cfg.onPick(xs[nearest(e)]); });
    el.querySelectorAll('[data-series]').forEach(b => b.addEventListener('click', () => { const n = b.dataset.series; app.ui.hiddenSeries.has(n) ? app.ui.hiddenSeries.delete(n) : app.ui.hiddenSeries.add(n); lineChart(el, cfg); }));
  }

  /* ----- Evolution ----- */
  function evolution() {
    const pane = $('drawer-evolution'), S = app.S, T = app.sim.states.length - 1, per = app.sim.states.map(st => OGS.engine.stats(st, S));
    const series = S.dets.map((d, i) => ({ name: d.name, color: detColor(i), pts: per.map((s, t) => [t, s.det[d.name] || 0]) }));
    series.push({ name: 'in flight', color: 'var(--beam)', dash: true, pts: per.map((s, t) => [t, s.inflight]) });
    const step = Math.max(1, Math.ceil(T / 12)), ticks = [];
    for (let t = 0; t <= T; t += step) ticks.push(t);
    if (ticks[ticks.length - 1] !== T) ticks.push(T);
    pane.innerHTML = `<div class="panel-title"><h3>Click probability over time</h3><small>Click the chart to jump to a step</small></div><div id="evoChart"></div>`;
    lineChart($('evoChart'), { series, xMin: 0, xMax: Math.max(1, T), yMax: 1, xLabel: 'time step', xTicks: ticks, marker: app.t, aria: 'Click probability over time',
      onPick: v => { OGS.render.stopPlay(); app.t = v; OGS.render.time(); } });
  }

  /* ----- Sweep ----- */
  function defaultSweep() {
    const S = app.S;
    if (S.preset === 'wigner' && S.n > 3 && S.m > 3) return { x: 3, y: 3, param: 'phH', from: 0, to: 360, steps: 73 };
    if ((S.preset === 'mzi' || S.preset === 'bomb') && S.n > 1) return { x: 1, y: 0, param: 'phH', from: 0, to: 360, steps: 73 };
    for (let x = 0; x < S.n; x++) for (let y = 0; y < S.m; y++) if (OGS.engine.classify(S.grid[x][y]) === 'bs') return { x, y, param: 'th', from: 0, to: 180, steps: 73 };
    return { x: 0, y: 0, param: 'phH', from: 0, to: 360, steps: 73 };
  }
  function runSweep(cfg) { app.ui.sweepCfg = cfg; app.ui.sweep = OGS.engine.sweep(app.S, cfg, detColor); return app.ui.sweep; }
  function sweepNode(x, y) {
    const isBS = OGS.engine.classify(app.S.grid[x][y]) === 'bs';
    runSweep({ x, y, param: isBS ? 'th' : 'phH', from: 0, to: isBS ? 180 : 360, steps: 73 });
    show('sweep');
  }
  function sweepView() {
    const pane = $('drawer-sweep'), S = app.S;
    if (!app.ui.sweepCfg || app.ui.sweepCfg.x >= S.n || app.ui.sweepCfg.y >= S.m) app.ui.sweepCfg = defaultSweep();
    const c = app.ui.sweepCfg, nodes = [];
    for (let x = 0; x < S.n; x++) for (let y = 0; y < S.m; y++) { const nd = S.grid[x][y]; nodes.push({ x, y, label: `(${x},${y})${nd.name ? ' ' + nd.name : ''}${OGS.engine.classify(nd) === 'empty' ? ' · empty' : ''}` }); }
    pane.innerHTML = `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px;font-size:13px;color:var(--text-2)">
        <label style="display:flex;align-items:center;gap:6px">Node <select id="swNode">${nodes.map(n => `<option value="${n.x},${n.y}" ${n.x === c.x && n.y === c.y ? 'selected' : ''}>${esc(n.label)}</option>`).join('')}</select></label>
        <label style="display:flex;align-items:center;gap:6px">Angle <select id="swParam">${[['th', 'θ reflection'], ['phH', 'φH phase'], ['phV', 'φV phase']].map(([v, l]) => `<option value="${v}" ${c.param === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label style="display:flex;align-items:center;gap:6px">From <input type="number" id="swFrom" value="${c.from}" step="any"></label>
        <label style="display:flex;align-items:center;gap:6px">To <input type="number" id="swTo" value="${c.to}" step="any"></label>
        <label style="display:flex;align-items:center;gap:6px">Points <input type="number" id="swSteps" value="${c.steps}" min="3" max="361"></label>
        <button class="btn btn-primary" id="swRun">${icon('wave')}Run sweep</button></div>
      <div id="swOut">${app.ui.sweep ? '' : `<div class="callout">${icon('info')}<div>A sweep runs the experiment many times while one angle of one node changes, and plots every detector's click probability. It is the quickest way to see interference fringes. Click the chart afterwards to set the angle to that value.</div></div>`}</div>`;
    if (!app.ui.sweep) return;
    const r = app.ui.sweep;
    const vis = r.series.map(se => { const ys = se.pts.map(p => p[1]), mx = Math.max(...ys), mn = Math.min(...ys); return { name: se.name, color: se.color, V: mx + mn > 1e-12 ? (mx - mn) / (mx + mn) : 0, mx, mn }; });
    $('swOut').innerHTML = `<div class="cols"><div id="swChart"></div><div><div class="panel-title"><h3>Fringe visibility</h3><small>${r.steps} runs · ${r.ms.toFixed(0)} ms</small></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Detector</th><th class="num">min</th><th class="num">max</th><th class="num">V</th></tr></thead><tbody>${vis.map(v => `<tr><td><span class="swatch" style="background:${v.color}"></span>${esc(v.name)}</td><td class="num">${v.mn.toFixed(3)}</td><td class="num">${v.mx.toFixed(3)}</td><td class="num">${v.V.toFixed(3)}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint" style="margin-top:8px">V = (max − min) / (max + min). V = 1 means perfect interference.</p></div></div>`;
    const span = r.to - r.from, ticks = []; for (let i = 0; i <= 6; i++) ticks.push(+(r.from + span * i / 6).toFixed(2));
    const nd = S.grid[r.x]?.[r.y], label = { th: 'θ', phH: 'φH', phV: 'φV' }[r.param];
    lineChart($('swChart'), { series: r.series, xMin: Math.min(r.from, r.to), xMax: Math.max(r.from, r.to), yMax: 1, xLabel: `${label} of node (${r.x},${r.y}), degrees`, xTicks: ticks, fmtX: v => +(+v).toFixed(1) + '°', marker: nd ? +nd[r.param] : null, aria: 'Parameter sweep',
      onPick: v => { const keep = app.ui.sweep; OGS.store.commit(() => { app.S.grid[r.x][r.y][r.param] = +(+v).toFixed(3); }); app.ui.sweep = keep; sweepView(); OGS.dom.toast(`${label} of (${r.x},${r.y}) set to ${(+v).toFixed(1)}°`); } });
  }

  /* ----- Python ----- */
  function highlightPython(src) {
    return src.split('\n').map(line => {
      const ci = line.indexOf('#'), code = ci >= 0 ? line.slice(0, ci) : line, comment = ci >= 0 ? line.slice(ci) : '';
      const c = esc(code).replace(/\b(from|import|def|return|if|else|not|in|and|or|for|True|False|None)\b/g, '<span class="kw">$1</span>').replace(/(?<![\w\]&#;])(\d+\.?\d*)/g, '<span class="nu">$1</span>');
      return c + (comment ? `<span class="cm">${esc(comment)}</span>` : '');
    }).join('\n');
  }
  function codeView() {
    const code = OGS.exporters.python(app.S, app.sim, app.prefs.patch);
    $('drawer-code').innerHTML = `<div class="panel-title"><h3>Notebook cell for main.py</h3>
      <div style="display:flex;align-items:center;gap:8px"><label class="switch"><input type="checkbox" id="withPatch" ${app.prefs.patch ? 'checked' : ''}><span class="track"></span>Include fix for main.py</label>
      <button class="btn btn-sm" id="copyPy">${icon('copy')}Copy</button><button class="btn btn-sm" id="dlPy">${icon('download')}Download</button></div></div>
      <pre class="code">${highlightPython(code)}</pre>`;
  }

  /* ----- Checks ----- */
  function checksItems() { return [...(app.sim.err ? [{ sev: 'bad', text: app.sim.err }] : []), ...app.sim.warnings]; }
  function checks() {
    const items = checksItems(), sim = app.sim;
    const label = { bad: ['Error', 'red'], warn: ['Warning', 'orange'], info: ['Note', 'blue'] };
    $('drawer-checks').innerHTML = `<div class="cols"><div><div class="panel-title"><h3>Checks</h3><small>${items.length || 'none'}</small></div>
      ${items.length ? items.map(i => `<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)"><span class="tag ${label[i.sev][1]}" style="flex:none">${label[i.sev][0]}</span><span style="font-size:13px">${esc(i.text)}</span></div>`).join('')
        : `<div class="callout">${icon('check')}<div>No problems found. Probability is conserved and every photon is accounted for.</div></div>`}</div>
      <div><div class="panel-title"><h3>Run details</h3></div><div class="props">
        <div class="prop"><div class="k">Run time</div><div class="v mono">${sim.ms.toFixed(2)} ms</div></div>
        <div class="prop"><div class="k">Steps</div><div class="v mono">${sim.states.length - 1}</div></div>
        <div class="prop"><div class="k">Largest state</div><div class="v mono">${Math.max(...sim.states.map(s => s.size))} terms</div></div>
        <div class="prop"><div class="k">Model</div><div class="v">${esc(OGS.settings.summary())}</div></div></div></div></div>`;
  }
  function updateCounts() {
    const items = checksItems(), bad = items.some(i => i.sev === 'bad'), warn = items.some(i => i.sev === 'warn');
    const c = $('countChecks'); c.textContent = items.length || ''; c.className = 'count' + (bad ? ' bad' : warn ? ' warn' : '');
  }

  /* ----- Show / redraw ----- */
  function render() {
    const tab = app.ui.drawerTab;
    if (tab === 'results') $('drawer-results').innerHTML = results();
    else if (tab === 'evolution') evolution();
    else if (tab === 'sweep') sweepView();
    else if (tab === 'code') codeView();
    else if (tab === 'checks') checks();
    updateCounts();
  }
  // Called when only the time step changed (skips the slow tabs).
  function renderTime() { if (['results', 'evolution'].includes(app.ui.drawerTab)) render(); else updateCounts(); }
  function show(tab) {
    if (!TABS.includes(tab)) tab = 'results';   // e.g. a tab remembered from an older version
    app.ui.drawerTab = tab;
    if (!app.ui.drawerOpen) setOpen(true);
    document.querySelectorAll('[data-drawer]').forEach(b => { b.classList.toggle('on', b.dataset.drawer === tab); b.setAttribute('aria-selected', b.dataset.drawer === tab); });
    TABS.forEach(t => { $('drawer-' + t).hidden = t !== tab; });
    render();
  }
  function setOpen(open) {
    app.ui.drawerOpen = open;
    $('drawer').classList.toggle('collapsed', !open);
    $('drawerToggle').innerHTML = icon(open ? 'down' : 'up');
    $('drawerToggle').setAttribute('aria-label', open ? 'Fold the analysis panel' : 'Open the analysis panel');
    requestAnimationFrame(() => OGS.canvas.applyView());
  }

  function wire() {
    $('drawerTabs').addEventListener('click', e => { const b = e.target.closest('[data-drawer]'); if (b) show(b.dataset.drawer); });
    $('drawerToggle').addEventListener('click', () => setOpen(!app.ui.drawerOpen));
    // Redraw the charts at their new width when the window changes size.
    let resizeTimer = null;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (app.ui.drawerTab === 'evolution') evolution(); else if (app.ui.drawerTab === 'sweep') sweepView(); }, 150); });
    // Resize by dragging the top edge.
    const grip = $('drawerGrip'); let start = null;
    grip.addEventListener('pointerdown', e => { start = { y: e.clientY, h: $('drawer').getBoundingClientRect().height }; grip.setPointerCapture(e.pointerId); grip.classList.add('drag'); });
    grip.addEventListener('pointermove', e => { if (!start) return; const h = OGS.clamp(start.h - (e.clientY - start.y), 120, window.innerHeight * 0.7); $('drawer').style.setProperty('--drawer-h', h + 'px'); OGS.canvas.applyView(); });
    grip.addEventListener('pointerup', () => { start = null; grip.classList.remove('drag'); });

    $('drawer-sweep').addEventListener('change', e => {
      const c = app.ui.sweepCfg, id = e.target.id; if (!c) return;
      if (id === 'swNode') { const [x, y] = e.target.value.split(',').map(Number); c.x = x; c.y = y; }
      else if (id === 'swParam') { c.param = e.target.value; c.from = 0; c.to = c.param === 'th' ? 180 : 360; sweepView(); }
      else if (id === 'swFrom') c.from = +e.target.value || 0;
      else if (id === 'swTo') c.to = +e.target.value || 0;
      else if (id === 'swSteps') c.steps = OGS.clamp(+e.target.value || 73, 3, 361);
    });
    $('drawer-sweep').addEventListener('click', e => {
      const b = e.target.closest('#swRun'); if (!b) return;
      const c = app.ui.sweepCfg;
      if (c.from === c.to) { OGS.dom.toast('Choose different start and end values.'); return; }
      b.disabled = true; b.textContent = 'Running…';
      setTimeout(() => { runSweep(c); sweepView(); }, 20);
    });
    $('drawer-code').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const code = OGS.exporters.python(app.S, app.sim, app.prefs.patch);
      if (b.id === 'copyPy') OGS.dom.copyText(code, 'Python code');
      if (b.id === 'dlPy') OGS.dom.saveFile(OGS.render.fileBase() + '-main_py.txt', code);
    });
    $('drawer-code').addEventListener('change', e => { if (e.target.id === 'withPatch') { app.prefs.patch = e.target.checked; OGS.store.savePrefs(); codeView(); } });
  }

  OGS.drawer = { render, renderTime, show, setOpen, wire, sweepNode, runSweep, checksItems };
})();
