/* ============================================================================
   scripts/ui/inspector.js  —  Right panel: "Properties" and "Input" tabs
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     Properties tab
       • Nothing selected → a summary of the experiment.
       • A node selected  → its label, orientation θBS, reflection θ, phases
         φH and φV, and the amplitudes the current formula gives.
       • A detector selected → its name and efficiency.
     Input tab
       • The input state as text, the list of photons it contains, and help.

   SHOULD I EDIT IT?
     No.
   ============================================================================ */

(() => {
  const { $, esc, icon, sliderFill, fillAllSliders } = OGS.dom;
  const app = OGS.app, RAD = OGS.RAD, norm360 = OGS.norm360, fmt = OGS.fmt;
  const TYPE_TAG = { empty: ['Empty node', ''], bs: ['Beam splitter', 'blue'], mirror: ['Mirror', ''], phase: ['Phase shifter', 'green'] };

  /* Preview of a component with arrows for its input and output sides. */
  const PORTS = { 0: { in: ['W', 'S'], out: ['E', 'N'] }, 90: { in: ['W', 'N'], out: ['E', 'S'] }, 180: { in: ['N', 'E'], out: ['S', 'W'] }, 270: { in: ['E', 'S'], out: ['W', 'N'] } };
  const DIRS = { W: [-1, 0], E: [1, 0], N: [0, -1], S: [0, 1] };
  function previewSVG(node, key) {
    const W = 260, H = 150, cx = 130, cy = 75, L = 56;
    let g = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Component with its input and output sides"><defs>
      <marker id="pa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="port-ar"/></marker>
      <marker id="po" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="port-out-ar"/></marker></defs>`;
    const P = PORTS[norm360(+node.tbs)] || PORTS[0];
    for (const d of P.in) { const [dx, dy] = DIRS[d]; g += `<line x1="${cx + dx * L}" y1="${cy + dy * L}" x2="${cx + dx * 13}" y2="${cy + dy * 13}" class="port" marker-end="url(#pa)"/>`; }
    for (const d of P.out) { const [dx, dy] = DIRS[d]; g += `<line x1="${cx + dx * 11}" y1="${cy + dy * 11}" x2="${cx + dx * L}" y2="${cy + dy * L}" class="port port-out" marker-end="url(#po)"/>`; }
    g += `<text x="14" y="${H - 12}" class="port-lab">inputs</text><text x="${W - 14}" y="20" text-anchor="end" class="port-lab" style="fill:var(--beam)">outputs</text>`;
    return g + OGS.canvas.componentSVG(node, cx, cy, 1.3, app.sim?.hits?.get(key)) + '</svg>';
  }

  const slider = (id, value, min, max, step = 1) =>
    `<div class="slider-row"><input type="range" id="r-${id}" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${id}"><input type="number" id="n-${id}" step="any" value="${+(+value).toFixed(4)}" aria-label="${id} value"></div>`;
  const quick = (field, values, labels, current) =>
    `<div class="seg">${values.map((v, i) => `<button data-quick="${field}" data-val="${v}" class="${Math.abs(current - v) < 1e-9 ? 'on' : ''}">${labels ? labels[i] : v + '°'}</button>`).join('')}</div>`;
  const prop = (iconName, label, body, forId) => `<div class="prop"><${forId ? `label for="${forId}"` : 'div class="k"'}>${icon(iconName)}${label}</${forId ? 'label' : 'div'}><div class="v">${body}</div></div>`;

  /* ----- Properties tab ----- */
  function render() {
    const pane = $('pane-props'), S = app.S, sel = app.ui.sel, mode = S.model.fmt;

    // A node is selected
    if (sel?.type === 'node' && sel.x < S.n && sel.y < S.m) {
      const nd = S.grid[sel.x][sel.y], type = OGS.engine.classify(nd), [typeName, typeColour] = TYPE_TAG[type];
      const R = Math.sin(nd.th * RAD / 2) ** 2;
      let matrix = '', uerr = 0, kerr = '';
      try {
        const k = OGS.formulas.makeKernel(S.model);
        const a = type === 'empty' ? { h: { t: OGS.C.ONE, r: OGS.C.ZERO }, v: { t: OGS.C.ONE, r: OGS.C.ZERO } } : k(nd.th * RAD, nd.phH * RAD, nd.phV * RAD);
        uerr = OGS.formulas.unitarityError(a);
        matrix = `<div class="matrix"><span></span><span class="h">a†h in</span><span class="h">a†v in</span>
          <span class="h">transmitted</span><span>${fmt.complex(a.h.t, mode)}</span><span>${fmt.complex(a.v.t, mode)}</span>
          <span class="h">reflected</span><span>${fmt.complex(a.h.r, mode)}</span><span>${fmt.complex(a.v.r, mode)}</span></div>`;
      } catch (e) { kerr = e.message; }
      pane.innerHTML = `
        <div class="prop-head"><h2>Node (${sel.x}, ${sel.y})</h2><span class="tag ${typeColour}">${typeName}${type === 'bs' ? ` · R ${(R * 100).toFixed(1).replace(/\.0$/, '')}%` : ''}</span></div>
        <div class="callout" style="padding:6px;justify-content:center">${previewSVG(nd, sel.x + ',' + sel.y)}</div>
        <div class="props" style="margin-top:10px">
          ${prop('tag', 'Label', `<input type="text" id="nname" value="${esc(nd.name)}" placeholder="Empty" maxlength="12">`, 'nname')}
          ${prop('rotate', 'Orientation', `<div class="seg">${[0, 90, 180, 270].map(v => `<button data-tbs="${v}" class="${norm360(+nd.tbs) === v ? 'on' : ''}">${v}°</button>`).join('')}</div>`)}
          ${prop('bs', 'Reflection θ', slider('th', nd.th, 0, 180) + quick('th', [0, 90, 180], ['None', '50:50', 'Mirror'], nd.th), 'n-th')}
          ${prop('phase', 'Phase φH', slider('phH', nd.phH, 0, 360) + quick('phH', [0, 90, 180, 270], null, nd.phH), 'n-phH')}
          ${prop('phase', 'Phase φV', slider('phV', nd.phV, 0, 360) + quick('phV', [0, 90, 180, 270], null, nd.phV), 'n-phV')}
        </div>
        <div class="sub-title">Amplitudes <button class="btn btn-ghost btn-sm" data-open-settings="formula">${esc(OGS.formulas.MODELS[S.model.kernel].name)} ${icon('right')}</button></div>
        ${kerr ? `<p class="error-text">${esc(kerr)}</p>` : matrix}
        <p class="hint" style="margin-top:8px">${uerr > 1e-9 ? `<span style="color:var(--bad)">Not unitary here (deviation ${uerr.toExponential(2)}).</span>` :
          type === 'empty' ? 'θ = 0 and φ = 0: no component. Light passes straight through.' :
          `R = sin²(θ/2) = ${R.toFixed(3)}. Light can enter from any side; 0° and 180° are the same “/” plate, 90° and 270° the same “\\”.`}</p>
        <div class="divider"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="sweepNode">${icon('wave')}Sweep this node</button><button class="btn btn-ghost" id="clearNode">${icon('eraser')}Clear</button></div>`;
      fillAllSliders(pane);
      return;
    }

    // A detector is selected
    if (sel?.type === 'det') {
      const i = S.dets.findIndex(d => d.k === sel.k && d.x === sel.x && d.y === sel.y);
      if (i < 0) { app.ui.sel = null; return render(); }
      const d = S.dets[i], p = app.sim ? OGS.engine.stats(app.sim.states[app.t], S).det[d.name] || 0 : 0, own = d.eta != null, eta = own ? d.eta : S.model.eta;
      pane.innerHTML = `
        <div class="prop-head"><h2>Detector ${esc(d.name)}</h2><span class="tag purple">Edge ${d.k}(${d.x},${d.y})</span></div>
        <div class="props">
          ${prop('tag', 'Name', `<input type="text" id="dname" value="${esc(d.name)}" maxlength="12">`, 'dname')}
          ${prop('target', 'Click chance', `<span class="mono">${fmt.prob(p, mode)}${mode === 'exact' && p > 1e-10 ? ` <span class="faint">≈ ${p.toFixed(4)}</span>` : ''}</span><span class="hint">after ${app.t} step${app.t === 1 ? '' : 's'}</span>`)}
          ${prop('sliders', 'Efficiency η', `<label class="switch"><input type="checkbox" id="ownEta" ${own ? 'checked' : ''}><span class="track"></span>Own value</label>${slider('eta', eta, 0, 1, 0.01).replace(/<input type="range"/, `<input type="range" ${own ? '' : 'disabled'}`).replace(/<input type="number"/, `<input type="number" ${own ? '' : 'disabled'}`)}`)}
        </div>
        <p class="hint" style="margin-top:6px">A photon reaching this edge from either direction is absorbed. It is counted with probability η.</p>
        <div class="divider"></div>
        <button class="btn btn-ghost" id="delDet">${icon('trash')}Remove detector</button>`;
      fillAllSliders(pane);
      return;
    }

    // Nothing selected: summary of the experiment
    const count = { bs: 0, mirror: 0, phase: 0 };
    for (const col of S.grid) for (const nd of col) { const t = OGS.engine.classify(nd); if (t in count) count[t]++; }
    const photons = (app.sim?.terms || []).reduce((m, t) => Math.max(m, t.modes.length), 0);
    pane.innerHTML = `
      <input type="text" id="setupTitle" value="${esc(S.title || 'Untitled setup')}" aria-label="Setup name" style="border:0;padding:0;height:auto;font-size:20px;font-weight:650;letter-spacing:-.015em;width:100%;background:transparent;box-shadow:none">
      ${S.desc ? `<p class="hint" style="margin:8px 0 0">${esc(S.desc)}</p>` : ''}
      <div class="props" style="margin-top:14px">
        ${prop('grid', 'Grid', `<span>${S.n} × ${S.m} nodes</span>`)}
        ${prop('bs', 'Splitters', `<span>${count.bs}</span>`)}
        ${prop('mirror', 'Mirrors', `<span>${count.mirror}</span>`)}
        ${prop('phase', 'Phase shifters', `<span>${count.phase}</span>`)}
        ${prop('detector', 'Detectors', `<span>${S.dets.length}</span>`)}
        ${prop('photon', 'Photons', `<span>${photons} per term · ${app.sim?.terms.length || 0} term${app.sim?.terms.length === 1 ? '' : 's'}</span>`)}
        ${prop('sigma', 'Formula', `<button class="btn btn-sm" data-open-settings="formula" style="align-self:flex-start">${esc(OGS.formulas.MODELS[S.model.kernel].name)}</button>`)}
      </div>
      <div class="sub-title" style="margin-top:22px">Getting around</div>
      <div class="callout">${icon('info')}<div>Click a node to edit it. Pick a tool in the sidebar to place splitters, mirrors, phase shifters, detectors or photons. Drag the table to move it; hold Ctrl and scroll to zoom. Press <kbd>Ctrl K</kbd> for every command.</div></div>`;
  }

  /* ----- Input tab ----- */
  function renderInput() {
    const pane = $('pane-input'), S = app.S, sim = app.sim, mode = S.model.fmt;
    if (!pane.dataset.built) {
      pane.dataset.built = '1';
      pane.innerHTML = `
        <div class="prop-head"><h2>Input state</h2><span class="tag" id="termCount"></span></div>
        <p class="hint" style="margin-bottom:10px">One term per line, written as <span class="mono">coefficient : photons</span>.</p>
        <textarea id="inputText" rows="7" spellcheck="false" aria-label="Input state"></textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
          <label class="switch"><input type="checkbox" id="normalize"><span class="track"></span>Normalise</label>
          <span class="hint mono" id="inNorm"></span></div>
        <p class="error-text" id="inErr" style="margin-top:8px"></p>
        <div class="sub-title" style="margin-top:18px">Photons in each term</div>
        <div id="termList"></div>
        <div class="sub-title" style="margin-top:22px">How to write it</div>
        <div class="callout">${icon('info')}<div>
          <div><span class="mono">h(x,y)</span> is the edge entering node (x,y) from the left, <span class="mono">v(x,y)</span> the edge entering from below. Add <span class="mono">+</span> to travel right/up or <span class="mono">−</span> for left/down.</div>
          <div style="margin-top:6px">Example: <span class="mono">1/sqrt(2) : h(1,2)+ v(0,3)+</span>. Coefficients understand <span class="mono">i, pi, sqrt(), exp(), cos(), sin()</span>. Text after <span class="mono">#</span> is a note.</div>
          <div style="margin-top:6px">Tip: choose <b>Add photon</b> in the sidebar and click an edge to append it here.</div></div></div>`;
    }
    const ta = $('inputText');
    if (document.activeElement !== ta && ta.value !== S.input) ta.value = S.input;
    $('normalize').checked = S.normalize;
    $('inErr').textContent = sim?.err || '';
    $('inNorm').textContent = sim && sim.inNorm ? `‖ψ₀‖² = ${fmt.real(sim.inNorm, mode)}` : '';
    $('termCount').textContent = `${sim?.terms.length || 0} term${sim?.terms.length === 1 ? '' : 's'}`;
    const f = S.normalize && sim?.inNorm ? 1 / Math.sqrt(sim.inNorm) : 1;
    const arrow = md => md.s === '+' ? (md.k === 'h' ? '→' : '↑') : (md.k === 'h' ? '←' : '↓');
    $('termList').innerHTML = (sim?.terms || []).map(t => `
      <div style="display:flex;align-items:center;gap:10px;min-height:34px;border-bottom:1px solid var(--border)">
        <span class="mono" style="min-width:76px;color:var(--text-2)">${fmt.complex([t.coef[0] * f, t.coef[1] * f], mode)}</span>
        <span style="display:flex;gap:6px;flex-wrap:wrap">${t.modes.map((md, i) => `<span class="tag orange mono">${S.model.stats === 'dist' ? `γ${i + 1} ` : ''}${md.k}(${md.x},${md.y})${arrow(md)}</span>`).join('')}</span>
      </div>`).join('') || '<p class="hint">No photons yet.</p>';
  }

  /* ----- Reacting to the user ----- */
  function wire() {
    const props = $('pane-props'), store = OGS.store;
    const selectedDetIndex = () => { const s = app.ui.sel; return app.S.dets.findIndex(d => d.k === s.k && d.x === s.x && d.y === s.y); };

    props.addEventListener('input', e => {
      const id = e.target.id, sel = app.ui.sel;
      if (e.target.type === 'range') sliderFill(e.target);
      if (id === 'setupTitle') { store.remember('title'); app.S.title = e.target.value.slice(0, 60); store.saveSetup(); OGS.render.top(); return; }
      if (id === 'nname' && sel?.type === 'node') { store.remember('name' + sel.x + ',' + sel.y); app.S.grid[sel.x][sel.y].name = e.target.value.slice(0, 12); app.S.modified = true; store.saveSetup(); OGS.canvas.render(); OGS.render.top(); return; }
      if (id === 'dname' && sel?.type === 'det') {
        const i = selectedDetIndex(), v = e.target.value.replace(/\s+/g, '_').slice(0, 12);
        if (!v || app.S.dets.some((d, j) => j !== i && d.name === v)) return;
        store.commitLive(() => { app.S.dets[i].name = v; }, 'dname' + i); return;
      }
      const m = id.match(/^[rn]-(th|phH|phV|eta)$/);
      if (!m) return;
      const v = parseFloat(e.target.value);
      if (!isFinite(v)) return;
      const twin = $((id[0] === 'r' ? 'n-' : 'r-') + m[1]);
      if (twin && twin !== e.target) { twin.value = v; sliderFill(twin); }
      if (m[1] === 'eta' && sel?.type === 'det') { const i = selectedDetIndex(); store.commitLive(() => { app.S.dets[i].eta = OGS.clamp(v, 0, 1); }, 'eta' + i); return; }
      if (sel?.type === 'node') store.commitLive(() => { app.S.grid[sel.x][sel.y][m[1]] = v; }, m[1] + sel.x + ',' + sel.y);
    });
    props.addEventListener('change', e => {
      if (/^[rn]-/.test(e.target.id)) render();
      if (e.target.id === 'ownEta') { const i = selectedDetIndex(); store.commit(() => { app.S.dets[i].eta = e.target.checked ? +app.S.model.eta : null; }); }
    });
    props.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const sel = app.ui.sel;
      if (b.dataset.openSettings) { OGS.settings.open(b.dataset.openSettings); return; }
      if (sel?.type === 'node') {
        const nd = app.S.grid[sel.x][sel.y];
        if (b.dataset.tbs) store.commit(() => { nd.tbs = +b.dataset.tbs; });
        else if (b.dataset.quick) store.commit(() => { nd[b.dataset.quick] = +b.dataset.val; });
        else if (b.id === 'clearNode') store.commit(() => Object.assign(nd, { tbs: 0, th: 0, phH: 0, phV: 0, name: '' }));
        else if (b.id === 'sweepNode') OGS.drawer.sweepNode(sel.x, sel.y);
      } else if (sel?.type === 'det' && b.id === 'delDet') { const i = selectedDetIndex(); app.ui.sel = null; store.commit(() => app.S.dets.splice(i, 1)); }
    });

    let typing = 0;
    $('pane-input').addEventListener('input', e => {
      if (e.target.id !== 'inputText') return;
      const v = e.target.value; clearTimeout(typing);
      typing = setTimeout(() => store.commitLive(() => { app.S.input = v; }, 'input'), 220);
    });
    $('pane-input').addEventListener('change', e => { if (e.target.id === 'normalize') store.commit(() => { app.S.normalize = e.target.checked; }); });
  }

  OGS.inspector = { render, renderInput, wire };
})();
