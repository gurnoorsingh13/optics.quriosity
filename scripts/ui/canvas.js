/* ============================================================================
   scripts/ui/canvas.js  —  The optical table drawing
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     • Draws the grid, components, detectors, photon sources and the orange
       photon beams for the time step being shown.
     • Handles clicking with the current tool (place a splitter, a detector…),
       dragging to pan, Ctrl + mouse wheel to zoom, and the hover tooltip.
     • Exports the drawing as an SVG image.

   DRAWING RULES (from the notes)
     beam splitter  cube; its diagonal follows "/" or "\" and the red corner marks the input side
       θBS = 0 → "/" red corner bottom-left    θBS = 90  → "\" top-left
       θBS = 180 → "/" top-right               θBS = 270 → "\" bottom-right
     mirror         mirror plate, silvered side towards the light
     phase shifter  phase plate (small plate at the corner when a splitter adds a phase)
     detector       photodiode facing the light; the halo grows with its click probability
     source         laser pointing along the photon's path
     photon         orange line (thicker = more likely)
     The drawings come from assets/components/ (packed into component-art.js).

   SHOULD I EDIT IT?
     To change sizes: CELL (distance between nodes) and PAD (margin) below.
     Colours are in styles/theme.css and styles/canvas.css.
   ============================================================================ */

(() => {
  const { $, esc, toast } = OGS.dom;
  const app = OGS.app, RAD = OGS.RAD, norm360 = OGS.norm360;
  const CELL = 84, PAD = 40;

  // Colours for detectors in charts and tables.
  const DETECTOR_COLOURS = ['#4f7cff', '#14a88f', '#d64fc4', '#7cb83a', '#f05252', '#8b6cff', '#0ea5c6', '#f08a24', '#c9a20a', '#7a8798', '#e05a8a', '#3fae9f'];
  const detColor = i => DETECTOR_COLOURS[i % DETECTOR_COLOURS.length];

  // Grid coordinates → drawing coordinates (y grows upward on the table).
  const sx = x => PAD + (x + 1) * CELL;
  const sy = y => PAD + (app.S.m - y) * CELL;
  const width = () => PAD * 2 + (app.S.n + 1) * CELL;
  const height = () => PAD * 2 + (app.S.m + 1) * CELL;
  const edgeEnds = (k, x, y) => k === 'h' ? [[x - 1, y], [x, y]] : [[x, y - 1], [x, y]];
  function allEdges() {
    const S = app.S, e = [];
    for (let x = 0; x <= S.n; x++) for (let y = 0; y < S.m; y++) e.push(['h', x, y]);
    for (let x = 0; x < S.n; x++) for (let y = 0; y <= S.m; y++) e.push(['v', x, y]);
    return e;
  }

  /* Places one drawing from assets/components (see component-art.js),
     centred at (cx, cy), h units tall, turned by `angle` degrees. */
  function art(id, cx, cy, h, angle = 0, dx = 0) {
    const w = h * (OGS.art?.ratio[id] || 1);
    return `<g class="art-g" transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${angle})"><use href="#sym-${id}" x="${(-w / 2 + dx).toFixed(2)}" y="${(-h / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}"/></g>`;
  }

  /* Which faces of a mirror the light actually hits, so its silvered side faces the light.
     For a "/" plate the upper-left face is hit by light moving right (h+) or down (v−),
     the lower-right face by light moving up (v+) or left (h−). For "\" likewise. */
  function mirrorFaces(slash, dirs) {
    const A = slash ? ['h+', 'v-'] : ['v-', 'h-'], B = slash ? ['v+', 'h-'] : ['h+', 'v+'];
    const a = [...dirs].some(d => A.includes(d)), b = [...dirs].some(d => B.includes(d));
    const angA = slash ? 45 : 135, angB = slash ? -135 : -45;     // rotation that points the silvered side that way
    if (a && b) return [angA, angB];
    if (b) return [angB];
    return [angA];
  }

  /* One component at drawing position (cx, cy). scale enlarges it (inspector preview).
     Drawing rules (from the notes, using the component drawings):
       beam splitter → cube; its diagonal follows "/" (θBS 0°, 180°) or "\" (90°, 270°);
                       a red corner marks the input side; "R nn%" shows when not 50:50
       mirror        → mirror plate along the same diagonal, silvered side facing the light
       phase shifter → phase plate (also shown small on a splitter that adds a phase)     */
  function componentSVG(node, cx, cy, scale = 1, dirs = null) {
    const type = OGS.engine.classify(node);
    if (type === 'empty') return `<circle cx="${cx}" cy="${cy}" r="${3.2 * scale}" class="n-dot"/>`;
    const tbs = norm360(+node.tbs), slash = tbs % 180 === 0, U = CELL * scale;
    const corner = { 0: [-1, 1], 90: [-1, -1], 180: [1, -1], 270: [1, 1] }[tbs] || [-1, 1];   // screen direction of the input corner
    const hasPhase = Math.abs(Math.sin(node.phH * RAD / 2)) > 1e-9 || Math.abs(Math.sin(node.phV * RAD / 2)) > 1e-9;
    let g = '';
    if (type === 'phase') return art('phase', cx, cy, 0.46 * U);
    if (type === 'bs') {
      const size = 0.44 * U, h = size / 2, t = size * 0.3;
      g += art('bsp', cx, cy, size, slash ? 90 : 0);
      const X = cx + corner[0] * h, Y = cy + corner[1] * h;
      g += `<path d="M${X} ${Y} L${X - corner[0] * t} ${Y} L${X} ${Y - corner[1] * t} Z" class="tip-fill"/>`;
      const R = Math.sin(node.th * RAD / 2) ** 2;
      if (Math.abs(R - 0.5) > 1e-6) g += `<text x="${cx}" y="${cy + h + 11 * scale}" text-anchor="middle" class="r-lab">R ${(R * 100).toFixed(R * 100 % 1 ? 1 : 0)}%</text>`;
    } else {
      const h = 0.5 * U, w = h * (OGS.art?.ratio.mir || 0.37);
      const faces = mirrorFaces(slash, dirs || new Set());
      if (faces.length === 2) for (const a of faces) g += art('mir', cx, cy, h, a, -w / 2);
      else g += art('mir', cx, cy, h, faces[0]);
      const e = h / 2 * 0.707;
      g += `<circle cx="${cx + corner[0] * e}" cy="${cy + corner[1] * e}" r="${2.6 * scale}" class="tip-fill"/>`;
    }
    if (hasPhase) g += art('phase', cx + 0.3 * U, cy - 0.3 * U, 0.2 * U);
    return g;
  }

  /* ----- View (zoom and pan) ----- */
  function viewBox() { const z = app.ui.zoom.z, w = width() / z, h = height() / z; return [app.ui.zoom.cx - w / 2, app.ui.zoom.cy - h / 2, w, h]; }
  function applyView() { $('table').setAttribute('viewBox', viewBox().map(v => v.toFixed(2)).join(' ')); }
  function fit() { app.ui.zoom = { z: 0.95, cx: width() / 2, cy: height() / 2 + CELL * 0.18 }; applyView(); }
  function toContent(clientX, clientY) {
    const vb = viewBox(), r = $('table').getBoundingClientRect(), sc = Math.max(vb[2] / r.width, vb[3] / r.height);
    return [vb[0] + (vb[2] - r.width * sc) / 2 + (clientX - r.left) * sc, vb[1] + (vb[3] - r.height * sc) / 2 + (clientY - r.top) * sc];
  }
  function zoomAt(factor, clientX, clientY) {
    const z0 = app.ui.zoom.z, z1 = OGS.clamp(z0 * factor, 0.35, 5);
    if (clientX != null) { const [px, py] = toContent(clientX, clientY), k = z0 / z1; app.ui.zoom.cx = px + (app.ui.zoom.cx - px) * k; app.ui.zoom.cy = py + (app.ui.zoom.cy - py) * k; }
    app.ui.zoom.z = z1; applyView();
  }

  /* ----- Draw everything ----- */
  function render() {
    const S = app.S, sim = app.sim, ui = app.ui, W = width(), H = height();
    if (!ui.zoom.cx) fit();
    applyView();
    let s = `<defs>
      <marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="beam-ar"/></marker>
      <pattern id="dots" width="${CELL / 4}" height="${CELL / 4}" patternUnits="userSpaceOnUse" x="${PAD}" y="${PAD}"><circle cx="${CELL / 8}" cy="${CELL / 8}" r="1.1" class="dotgrid"/></pattern>
    </defs>`;
    s += `<rect x="${-W * 4}" y="${-H * 4}" width="${W * 9}" height="${H * 9}" fill="url(#dots)"/>`;

    const edges = allEdges();
    for (const [k, x, y] of edges) { const [[ax, ay], [bx, by]] = edgeEnds(k, x, y); s += `<line x1="${sx(ax)}" y1="${sy(ay)}" x2="${sx(bx)}" y2="${sy(by)}" class="g-line"/>`; }

    // Photon beams: faint trail of earlier steps, bright lines for the current step.
    const cur = sim?.occ[app.t] || new Map();
    const segment = key => {
      const [k, xs, ys, dir] = key.split(' '), x = +xs, y = +ys;
      let [[ax, ay], [bx, by]] = edgeEnds(k, x, y);
      if (dir === '-') [ax, ay, bx, by] = [bx, by, ax, ay];
      const both = cur.has(`${k} ${x} ${y} ${dir === '+' ? '-' : '+'}`), off = both ? (dir === '+' ? -3.5 : 3.5) : 0;
      return [sx(ax) + (k === 'v' ? off : 0), sy(ay) + (k === 'h' ? off : 0), sx(bx) + (k === 'v' ? off : 0), sy(by) + (k === 'h' ? off : 0)];
    };
    const trail = new Set();
    if (sim) for (let t = 0; t <= app.t; t++) for (const k of sim.occ[t].keys()) if (!cur.has(k)) trail.add(k);
    for (const k of trail) { const [a, b, c, d] = segment(k); s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="trail" stroke-width="3"/>`; }
    for (const [k, pr] of cur) {
      if (pr < 1e-9) continue;
      const [a, b, c, d] = segment(k), w = 2 + 4 * Math.sqrt(Math.min(pr, 1)), op = Math.min(1, 0.32 + 0.68 * Math.sqrt(pr));
      s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="beam-glow" stroke-width="${(w * 3).toFixed(1)}"/>`;
      s += `<polyline points="${a},${b} ${(a + c) / 2},${(b + d) / 2} ${c},${d}" class="beam" stroke-width="${w.toFixed(2)}" opacity="${op.toFixed(2)}" marker-mid="url(#ar)"/>`;
      if (ui.playing) s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="beam-flow" stroke-width="${Math.max(1.4, w * 0.45).toFixed(2)}"/>`;
    }

    // Photon sources: a small laser where each input photon starts, pointing along its path.
    const sources = new Set();
    for (const t of (sim?.terms || [])) for (const md of t.modes) sources.add(`${md.k} ${md.x} ${md.y} ${md.s}`);
    for (const k of sources) {
      const [kk, xs, ys, dir] = k.split(' ');
      let [[ax, ay], [bx, by]] = edgeEnds(kk, +xs, +ys);
      if (dir === '-') [ax, ay, bx, by] = [bx, by, ax, ay];
      const px = sx(ax) + (sx(bx) - sx(ax)) * 0.3, py = sy(ay) + (sy(by) - sy(ay)) * 0.3;
      const angle = kk === 'h' ? (dir === '+' ? 0 : 180) : (dir === '+' ? -90 : 90);
      s += art('laser1', px, py, CELL * 0.24, angle);
    }

    // a† labels on edges (toggle in the zoom bar).
    if (app.prefs.labels) for (const [k, x, y] of edges) {
      const [[ax, ay], [bx, by]] = edgeEnds(k, x, y), mx = (sx(ax) + sx(bx)) / 2, my = (sy(ay) + sy(by)) / 2;
      s += k === 'h' ? `<text x="${mx}" y="${my - 7}" text-anchor="middle" class="e-lab-h">a†h(${x},${y})</text>` : `<text x="${mx - 6}" y="${my + 3}" text-anchor="end" class="e-lab-v">a†v(${x},${y})</text>`;
    }

    // Detectors, with their click probability so far.
    const clicks = sim ? OGS.engine.stats(sim.states[app.t], S).det : {};
    // Which way light reaches each detector, so the photodiode faces it.
    const arriving = {};
    if (sim) for (const k of sim.states[sim.states.length - 1].keys()) for (const p of (k ? k.split('§') : [])) { const f = p.split(' '); if (f[0] === 'F' || f[0] === 'L') (arriving[f[6]] = arriving[f[6]] || new Set()).add(f[4]); }
    for (const d of S.dets) {
      const [[ax, ay], [bx, by]] = edgeEnds(d.k, d.x, d.y), mx = (sx(ax) + sx(bx)) / 2, my = (sy(ay) + sy(by)) / 2, h = 11, p = clicks[d.name] || 0, horiz = d.k === 'h';
      const from = arriving[d.name] || new Set(['+']), onlyMinus = from.has('-') && !from.has('+');
      const angle = horiz ? (onlyMinus ? 180 : 0) : (onlyMinus ? 90 : -90);
      if (p > 1e-9) s += `<circle cx="${mx}" cy="${my}" r="${h + 5}" class="det-halo" opacity="${(0.12 + 0.5 * p).toFixed(2)}"/>`;
      s += art('pd1', mx, my, h * 2.1, angle);
      if (horiz) {   // detector on a horizontal edge: name above, probability below
        s += `<text x="${mx}" y="${my - h - 6}" text-anchor="middle" class="det-lab">${esc(d.name)}</text>`;
        if (p > 1e-9) s += `<text x="${mx}" y="${my + h + 13}" text-anchor="middle" class="det-p">${OGS.fmt.pct(p)}</text>`;
      } else {       // on a vertical edge: name and probability on one line to the right
        s += `<text x="${mx + h + 5}" y="${my + 4}" class="det-lab">${esc(d.name)}${p > 1e-9 ? `<tspan class="det-p" dx="4">${OGS.fmt.pct(p)}</tspan>` : ''}</text>`;
      }
      if (ui.sel?.type === 'det' && ui.sel.k === d.k && ui.sel.x === d.x && ui.sel.y === d.y) s += `<rect x="${mx - h - 5}" y="${my - h - 5}" width="${2 * h + 10}" height="${2 * h + 10}" rx="5" class="det-sel"/>`;
    }

    // Nodes.
    const detEdges = new Set(S.dets.map(d => `${d.k},${d.x},${d.y}`)), hasDet = (k, x, y) => detEdges.has(`${k},${x},${y}`);
    for (let x = 0; x < S.n; x++) for (let y = 0; y < S.m; y++) {
      const nd = S.grid[x][y], cx = sx(x), cy = sy(y);
      if (ui.sel?.type === 'node' && ui.sel.x === x && ui.sel.y === y) s += `<circle cx="${cx}" cy="${cy}" r="${CELL * 0.38}" class="n-sel-halo"/><circle cx="${cx}" cy="${cy}" r="${CELL * 0.38}" class="n-sel"/>`;
      s += componentSVG(nd, cx, cy, 1, sim?.hits?.get(x + ',' + y));
      // Labels avoid the places used by detector labels: a detector on the left edge h(x,y) labels
      // above-left and below-left of this node, one on the right edge h(x+1,y) above-right and
      // below-right, one on the top edge v(x,y+1) to the right. Coordinates are skipped when their
      // corner is taken (hovering a node still shows them).
      const off = CELL * 0.24, busyL = hasDet('h', x, y), busyR = hasDet('h', x + 1, y), busyT = hasDet('v', x, y + 1);
      const lx = cx + off + 2;
      if (!busyR) s += `<text x="${lx}" y="${cy + off + 10}" class="n-lab">${x},${y}</text>`;
      if (nd.name) {
        // Above-left by default; above-right if a detector sits on the left; below the node if both sides are taken.
        const spot = !busyL ? [cx - off - 3, cy - off - 4, 'end'] : (!busyR && !busyT) ? [cx + off + 3, cy - off - 4, 'start'] : [cx, cy + off + 24, 'middle'];
        s += `<text x="${spot[0]}" y="${spot[1]}" text-anchor="${spot[2]}" class="n-name">${esc(nd.name)}</text>`;
      }
      if (+nd.phH || +nd.phV) {
        const t = [+nd.phH ? `φH ${+(+nd.phH).toFixed(1)}°` : '', +nd.phV ? `φV ${+(+nd.phV).toFixed(1)}°` : ''].filter(Boolean).join(' ');
        s += `<text x="${busyR ? cx - off - 2 : lx}" y="${cy + off + (busyR ? 10 : 21)}" text-anchor="${busyR ? 'end' : 'start'}" class="ps-lab">${t}</text>`;
      }
    }

    // Invisible click targets, depending on the tool.
    const tool = ui.tool;
    if (['det', 'src', 'erase', 'select'].includes(tool)) for (const [k, x, y] of edges) {
      const isDet = S.dets.some(d => d.k === k && d.x === x && d.y === y);
      if ((tool === 'select' || tool === 'erase') && !isDet) continue;
      const [[ax, ay], [bx, by]] = edgeEnds(k, x, y);
      s += `<line x1="${sx(ax) + (k === 'h' ? 16 : 0)}" y1="${sy(ay) - (k === 'v' ? 16 : 0)}" x2="${sx(bx) - (k === 'h' ? 16 : 0)}" y2="${sy(by) + (k === 'v' ? 16 : 0)}" class="e-hit" data-edge="${k},${x},${y}"/>`;
    }
    if (['select', 'bs', 'mirror', 'phase', 'erase'].includes(tool)) for (let x = 0; x < S.n; x++) for (let y = 0; y < S.m; y++) s += `<circle cx="${sx(x)}" cy="${sy(y)}" r="${CELL * 0.33}" class="n-hit" data-node="${x},${y}"/>`;
    $('table').innerHTML = s;
  }

  /* ----- What a click does with each tool ----- */
  function nextDetectorName() { const names = new Set(app.S.dets.map(d => d.name)); let j = 1; while (names.has('D' + j)) j++; return 'D' + j; }
  function clickNode(x, y) {
    const tool = app.ui.tool;
    app.ui.sel = { type: 'node', x, y };
    if (tool === 'select') { OGS.render.showSide('props'); OGS.render.inspector(); render(); return; }
    OGS.store.commit(() => {
      const nd = app.S.grid[x][y];
      if (tool === 'bs') Object.assign(nd, { th: 90, tbs: app.ui.orient });
      else if (tool === 'mirror') Object.assign(nd, { th: 180, tbs: app.ui.orient });
      else if (tool === 'phase') { nd.th = 0; if (!+nd.phH && !+nd.phV) nd.phH = 90; }
      else if (tool === 'erase') Object.assign(nd, { tbs: 0, th: 0, phH: 0, phV: 0, name: '' });
    });
    OGS.render.showSide('props');
  }
  function clickEdge(k, x, y) {
    const tool = app.ui.tool, S = app.S, i = S.dets.findIndex(d => d.k === k && d.x === x && d.y === y);
    if (tool === 'select') { if (i >= 0) { app.ui.sel = { type: 'det', k, x, y }; OGS.render.showSide('props'); OGS.render.inspector(); render(); } return; }
    if (tool === 'det') { app.ui.sel = i >= 0 ? null : { type: 'det', k, x, y }; OGS.store.commit(() => { if (i >= 0) S.dets.splice(i, 1); else S.dets.push({ k, x, y, name: nextDetectorName(), eta: null }); }); return; }
    if (tool === 'erase') { if (i >= 0) { app.ui.sel = null; OGS.store.commit(() => S.dets.splice(i, 1)); } return; }
    if (tool === 'src') {
      OGS.store.commit(() => {
        const lines = S.input.replace(/\s+$/, '').split('\n');
        let li = lines.length - 1;
        while (li >= 0 && !lines[li].replace(/#.*/, '').trim()) li--;
        const mode = `${k}(${x},${y})${app.ui.srcDir}`;
        if (li < 0) lines.push(`1 : ${mode}`);
        else { const h = lines[li].indexOf('#'); lines[li] = h >= 0 ? lines[li].slice(0, h).trimEnd() + ' ' + mode + '   ' + lines[li].slice(h) : lines[li].trimEnd() + ' ' + mode; }
        S.input = lines.join('\n');
      });
      toast(`Added photon ${k}(${x},${y})${app.ui.srcDir}`);
    }
  }

  /* ----- Hover tooltip ----- */
  const TYPE_NAME = { empty: 'Empty node', bs: 'Beam splitter', mirror: 'Mirror', phase: 'Phase shifter' };
  const TOOL_HINT = { bs: 'Click to place a 50:50 splitter', mirror: 'Click to place a mirror', phase: 'Click to make a phase shifter', erase: 'Click to clear' };
  function hover(e) {
    const tip = $('tip'), coords = $('coords');
    const n = e.target.closest && e.target.closest('[data-node]'), ed = e.target.closest && e.target.closest('[data-edge]');
    let html = '';
    if (n) {
      const [x, y] = n.dataset.node.split(',').map(Number), nd = app.S.grid[x][y], t = OGS.engine.classify(nd);
      coords.textContent = `node (${x}, ${y})`;
      html = `<b>${TYPE_NAME[t]}${nd.name ? ' · ' + esc(nd.name) : ''}</b><div class="m">θBS ${norm360(+nd.tbs)}° · θ ${+(+nd.th).toFixed(2)}° · φH ${+(+nd.phH).toFixed(1)}° · φV ${+(+nd.phV).toFixed(1)}°</div>${TOOL_HINT[app.ui.tool] ? `<div class="act">${TOOL_HINT[app.ui.tool]}</div>` : ''}`;
    } else if (ed) {
      const [k, xs, ys] = ed.dataset.edge.split(','), x = +xs, y = +ys, d = app.S.dets.find(q => q.k === k && q.x === x && q.y === y);
      const [[ax, ay], [bx, by]] = edgeEnds(k, x, y), occ = app.sim?.occ[app.t];
      const here = (occ?.get(`${k} ${x} ${y} +`) || 0) + (occ?.get(`${k} ${x} ${y} -`) || 0);
      coords.textContent = `edge ${k}(${x}, ${y})`;
      const act = app.ui.tool === 'det' ? (d ? 'Click to remove the detector' : 'Click to place a detector') : app.ui.tool === 'src' ? `Click to add photon ${k}(${x},${y})${app.ui.srcDir}` : app.ui.tool === 'erase' ? 'Click to remove the detector' : '';
      html = `<b>a†${k}(${x},${y})${d ? ' · detector ' + esc(d.name) : ''}</b><div class="m">between (${ax},${ay}) and (${bx},${by})</div>${here > 1e-9 ? `<div class="m">photon here at step ${app.t}: ${OGS.fmt.pct(here)}</div>` : ''}${act ? `<div class="act">${act}</div>` : ''}`;
    } else {
      const [px, py] = toContent(e.clientX, e.clientY);
      coords.textContent = `x ${((px - PAD) / CELL - 1).toFixed(2)}   y ${(app.S.m - (py - PAD) / CELL).toFixed(2)}`;
    }
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html; tip.hidden = false;
    const box = $('stage').getBoundingClientRect();
    let lx = e.clientX - box.left + 14, ly = e.clientY - box.top + 14;
    if (lx + tip.offsetWidth > box.width - 8) lx = e.clientX - box.left - tip.offsetWidth - 14;
    if (ly + tip.offsetHeight > box.height - 8) ly = e.clientY - box.top - tip.offsetHeight - 14;
    tip.style.left = Math.max(6, lx) + 'px'; tip.style.top = Math.max(6, ly) + 'px';
  }

  /* ----- Mouse / touch handling: click, drag to pan, Ctrl+wheel to zoom ----- */
  function wire() {
    const svg = $('table');
    let drag = null;
    svg.addEventListener('pointerdown', e => { if (e.button > 1) return; drag = { x: e.clientX, y: e.clientY, cx: app.ui.zoom.cx, cy: app.ui.zoom.cy, moved: false, target: e.target, id: e.pointerId }; });
    svg.addEventListener('pointermove', e => {
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; try { svg.setPointerCapture(drag.id); } catch (_) {} svg.classList.add('panning'); $('tip').hidden = true; }
        if (drag.moved) { const vb = viewBox(), r = svg.getBoundingClientRect(), sc = Math.max(vb[2] / r.width, vb[3] / r.height); app.ui.zoom.cx = drag.cx - dx * sc; app.ui.zoom.cy = drag.cy - dy * sc; applyView(); return; }
      }
      hover(e);
    });
    svg.addEventListener('pointerup', () => {
      const d = drag; drag = null; svg.classList.remove('panning');
      if (!d || d.moved) return;
      const n = d.target.closest && d.target.closest('[data-node]'), ed = d.target.closest && d.target.closest('[data-edge]');
      if (n) { const [x, y] = n.dataset.node.split(',').map(Number); clickNode(x, y); }
      else if (ed) { const [k, x, y] = ed.dataset.edge.split(','); clickEdge(k, +x, +y); }
      else if (app.ui.sel) { app.ui.sel = null; OGS.render.inspector(); render(); }
    });
    svg.addEventListener('pointercancel', () => { drag = null; svg.classList.remove('panning'); });
    svg.addEventListener('pointerleave', () => { $('tip').hidden = true; $('coords').textContent = ''; });
    svg.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY); }, { passive: false });
    window.addEventListener('resize', applyView);
  }

  /* ----- SVG export: the drawing with its colours built in ----- */
  function exportSVG() {
    const original = $('table'), clone = original.cloneNode(true);
    // Copy each shape's final colours into the copy, so the file looks the same anywhere.
    const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight'];
    const a = original.querySelectorAll('*'), b = clone.querySelectorAll('*');
    a.forEach((el, i) => {
      if (!el.getAttribute('class')) return;
      const cs = getComputedStyle(el);
      b[i].setAttribute('style', PROPS.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';'));
    });
    clone.querySelectorAll('.e-hit,.n-hit,.beam-flow,.n-sel,.n-sel-halo,.det-sel').forEach(el => el.remove());
    const defs = clone.querySelector('defs'); if (defs && OGS.art) defs.insertAdjacentHTML('beforeend', OGS.art.sprite);   // drawings travel with the file
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', `0 0 ${width()} ${height()}`);
    clone.setAttribute('width', width()); clone.setAttribute('height', height());
    clone.setAttribute('style', `background:${getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim()}`);
    clone.removeAttribute('id'); clone.removeAttribute('class');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }

  OGS.canvas = { render, fit, zoomAt, applyView, wire, componentSVG, exportSVG, detColor, nextDetectorName, TYPE_NAME };
})();
