/* ============================================================================
   scripts/app.js  —  Starts the app and connects all the pieces
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     • Draws the sidebar (experiments, my setups, tools) and the top bar.
     • Runs the timeline (play, pause, step).
     • Handles keyboard shortcuts and the Export menu.
     • Decides what to redraw after each change (OGS.render).
     • Starts everything when the page has loaded.

   LOADING ORDER (see index.html)
     config.js → core/*.js (physics) → ui/*.js (screen) → app.js (this file)

   SHOULD I EDIT IT?
     No.
   ============================================================================ */

(() => {
  if (!window.OGS || !OGS.engine || !OGS.dom) {
    document.body.innerHTML = '<p style="font:15px system-ui;padding:40px;max-width:560px">The simulator could not start because some of its files are missing. Keep the whole folder together (index.html, config.js, styles and scripts) and open index.html again.</p>';
    return;
  }
  const { $, esc, icon, toast } = OGS.dom;
  const app = OGS.app, store = OGS.store;

  const TOOLS = [
    ['select', 'Select / edit', 'cursor', 'V'], ['bs', 'Beam splitter 50:50', 'art:bsp', 'B'], ['mirror', 'Mirror', 'art:mir', 'M'],
    ['phase', 'Phase shifter', 'art:phase', 'P'], ['det', 'Detector', 'art:pd1', 'D'], ['src', 'Add photon (laser)', 'art:laser1', 'S'], ['erase', 'Erase', 'eraser', 'E'],
  ];
  // Icons: "art:<id>" uses a component drawing, anything else a line icon.
  const toolIcon = name => name.startsWith('art:') && OGS.art ? OGS.art.artIcon(name.slice(4)) : icon(name);
  const fileBase = () => (app.S.title || 'optical-setup').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'optical-setup';

  /* ---------- Theme ---------- */
  function applyTheme() {
    const t = app.prefs.theme, root = document.documentElement;
    if (t === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
    const label = { system: 'System', light: 'Light', dark: 'Dark' }[t];
    $('themeBtn').innerHTML = `${icon(t === 'dark' ? 'moon' : t === 'light' ? 'sun' : 'monitor')}<span class="lbl">Theme</span><span class="faint" style="font-size:12px">${label}</span>`;
  }
  function setTheme(t) { app.prefs.theme = t; store.savePrefs(); applyTheme(); toast(`Theme: ${{ system: 'follows the system', light: 'light', dark: 'dark' }[t]}`); }

  /* ---------- Sidebar ---------- */
  function renderSidebar() {
    const S = app.S;
    $('sbPresets').innerHTML = OGS.presets.list.map(([id, title]) =>
      `<button class="sb-item ${S.preset === id && !S.savedId ? 'on' : ''}" data-preset="${id}">${icon('flask')}<span class="lbl">${esc(title)}</span></button>`).join('');
    const saved = store.saved.list();
    $('sbSaved').innerHTML = saved.length ? saved.map(s =>
      `<div class="sb-item ${S.savedId === s.id ? 'on' : ''}" data-saved="${s.id}" role="button" tabindex="0">${icon('file')}<span class="lbl" title="Saved ${new Date(s.savedAt).toLocaleString()}">${esc(s.name)}</span>
        <button class="icon-btn x" data-rename="${s.id}" aria-label="Rename ${esc(s.name)}" title="Rename">${icon('tag')}</button><button class="icon-btn x" data-delete="${s.id}" aria-label="Delete ${esc(s.name)}" title="Delete">${icon('trash')}</button></div>`).join('')
      : `<div class="sb-empty">Save the current setup with +</div>`;
    $('sbTools').innerHTML = TOOLS.map(([id, label, ic, key]) =>
      `<button class="sb-item ${app.ui.tool === id ? 'on' : ''}" data-tool="${id}" aria-pressed="${app.ui.tool === id}">${toolIcon(ic)}<span class="lbl">${label}</span><kbd>${key}</kbd></button>`).join('') +
      `<div class="sb-orient"><span>New parts face (θBS)</span><div class="seg">${[0, 90, 180, 270].map(v => `<button data-orient="${v}" class="${app.ui.orient === v ? 'on' : ''}" title="θBS ${v}°">${v}°</button>`).join('')}</div></div>` +
      (app.ui.tool === 'src' ? `<div class="sb-orient"><span>Photon direction</span><div class="seg"><button data-dir="+" class="${app.ui.srcDir === '+' ? 'on' : ''}">→ ↑</button><button data-dir="-" class="${app.ui.srcDir === '-' ? 'on' : ''}">← ↓</button></div></div>` : '');
  }
  function setTool(t) { app.ui.tool = t; renderSidebar(); OGS.canvas.render(); }
  function openPreset(id) { store.replaceSetup(OGS.presets.build(id)); closeSidebar(); }
  function saveCurrent() {
    const name = app.S.title || 'Untitled setup';
    const id = store.saved.add(name);
    app.S.savedId = id; store.saveSetup(); renderSidebar(); toast(`Saved “${name}” to My setups`);
    startRename(id);
  }
  function startRename(id) {
    const row = document.querySelector(`[data-saved="${id}"]`); if (!row) return;
    const item = store.saved.list().find(s => s.id === id);
    row.innerHTML = `${icon('file')}<input type="text" value="${esc(item?.name || '')}" aria-label="Setup name" maxlength="60">`;
    const input = row.querySelector('input'); input.focus(); input.select();
    const done = () => { store.saved.rename(id, input.value.trim()); if (app.S.savedId === id) { app.S.title = input.value.trim() || app.S.title; store.saveSetup(); } renderAll(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = item?.name || ''; input.blur(); } e.stopPropagation(); });
    input.addEventListener('blur', done, { once: true });
  }
  const openSidebar = () => { $('sidebar').classList.add('open'); $('scrim').hidden = false; };
  const closeSidebar = () => { $('sidebar').classList.remove('open'); $('scrim').hidden = true; };

  /* ---------- Top bar ---------- */
  function renderTop() {
    const S = app.S, sim = app.sim;
    $('crumbSection').textContent = S.savedId ? 'My setups' : 'Experiments';
    $('crumbTitle').textContent = S.title || 'Untitled setup';
    $('crumbEdited').hidden = !(S.modified && (S.preset || S.savedId));
    $('gn').value = S.n; $('gm').value = S.m;
    $('undo').disabled = !store.canUndo(); $('redo').disabled = !store.canRedo();
    const items = OGS.drawer.checksItems(), bad = items.some(i => i.sev === 'bad'), warn = items.some(i => i.sev === 'warn');
    $('statusDot').className = 'dot ' + (bad ? 'bad' : warn ? 'warn' : 'ok');
    $('statusText').textContent = bad ? 'Needs attention' : sim.truncated ? `Step limit · ${sim.states.length - 1} steps` : `${sim.states.length - 1} steps · ${sim.ms < 10 ? sim.ms.toFixed(1) : sim.ms.toFixed(0)} ms`;
    $('status').title = bad || warn ? 'Open Checks for details' : 'Every photon is accounted for';
    $('formulaBtn').innerHTML = `${icon('sigma')}<span>${esc(OGS.formulas.MODELS[S.model.kernel].name)}</span>`;
    $('legend').hidden = !app.prefs.legend;
    if (!$('legend').dataset.built && OGS.art) {
      $('legend').dataset.built = '1';
      const A = OGS.art.artIcon;
      $('legend').innerHTML = `<span>${A('bsp', 18)}Beam splitter</span><span>${A('mir', 18)}Mirror</span><span>${A('phase', 18)}Phase shifter</span><span>${A('pd1', 18)}Detector</span><span>${A('laser1', 18)}Source</span>` +
        `<span><svg width="22" height="14" aria-hidden="true"><line x1="2" y1="7" x2="20" y2="7" style="stroke:var(--beam)" stroke-width="3" stroke-linecap="round"/></svg>Photon</span>`;
    }
    $('lblBtn').classList.toggle('on', app.prefs.labels);
    document.title = `${S.title || 'Untitled setup'} · optics.quriosity`;
  }

  /* ---------- Timeline ---------- */
  function renderTimeline() {
    const T = app.sim.states.length - 1, sl = $('tslider');
    sl.max = T; sl.value = app.t; OGS.dom.sliderFill(sl);
    $('tlabel').textContent = `${app.t} / ${T}`;
  }
  function stopPlay() {
    if (!app.ui.playing) return;
    clearInterval(app.ui.playing); app.ui.playing = null;
    $('play').innerHTML = icon('play'); $('play').setAttribute('aria-label', 'Play');
    OGS.canvas.render();
  }
  function play() {
    if (app.ui.playing) { stopPlay(); return; }
    if (app.t >= app.sim.states.length - 1) app.t = 0;
    $('play').innerHTML = icon('pause'); $('play').setAttribute('aria-label', 'Pause');
    app.ui.playing = setInterval(() => { if (app.t >= app.sim.states.length - 1) { stopPlay(); return; } app.t++; renderTime(); }, +$('speed').value);
    renderTime();
  }
  function goto(t) { stopPlay(); app.t = Math.max(0, Math.min(app.sim.states.length - 1, t)); renderTime(); }

  /* ---------- Grid size ---------- */
  function resize(n, m) {
    n = OGS.clamp(n | 0, 1, 14); m = OGS.clamp(m | 0, 1, 14);
    if (n === app.S.n && m === app.S.m) { renderTop(); return; }
    store.commit(() => {
      const S = app.S, g = OGS.presets.emptyGrid(n, m);
      for (let x = 0; x < Math.min(n, S.n); x++) for (let y = 0; y < Math.min(m, S.m); y++) g[x][y] = S.grid[x][y];
      S.grid = g; S.n = n; S.m = m;
      S.dets = S.dets.filter(d => d.k === 'h' ? (d.x <= n && d.y < m) : (d.x < n && d.y <= m));
    });
    store.fixSelection(); OGS.canvas.fit(); OGS.canvas.render();
  }

  /* ---------- Export menu ---------- */
  function exportAs(kind) {
    const S = app.S, sim = app.sim;
    if (kind === 'report') OGS.dom.saveFile(fileBase() + '-report.md', OGS.exporters.report(S, sim, OGS.settings.summary()));
    else if (kind === 'csv') OGS.dom.saveFile(fileBase() + '-results.csv', OGS.exporters.csv(S, sim));
    else if (kind === 'svg') OGS.dom.saveFile(fileBase() + '.svg', OGS.canvas.exportSVG());
    else if (kind === 'json') OGS.dom.saveFile(fileBase() + '.json', JSON.stringify(S, null, 1));
    else if (kind === 'open') $('fileIn').click();
    else if (kind === 'copy') OGS.dom.copyText(JSON.stringify(S), 'Setup');
    else if (kind === 'python') OGS.dom.copyText(OGS.exporters.python(S, sim, app.prefs.patch), 'Python code');
  }
  function openExportMenu(button) {
    const m = $('exportMenu');
    m.innerHTML = `<div class="menu-label">Download</div>
      <button class="menu-item" data-x="report">${icon('file')}Report<span class="hint-r">.md</span></button>
      <button class="menu-item" data-x="csv">${icon('list')}Results table<span class="hint-r">.csv</span></button>
      <button class="menu-item" data-x="svg">${icon('grid')}Table drawing<span class="hint-r">.svg</span></button>
      <button class="menu-item" data-x="json">${icon('save')}Setup file<span class="hint-r">.json</span></button>
      <div class="menu-sep"></div>
      <button class="menu-item" data-x="open">${icon('upload')}Open a setup file…</button>
      <button class="menu-item" data-x="copy">${icon('copy')}Copy setup as text</button>
      <button class="menu-item" data-x="python">${icon('code')}Copy Python for main.py</button>`;
    m.hidden = false;
    const r = button.getBoundingClientRect();
    m.style.top = (r.bottom + 6) + 'px';
    m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    m.querySelector('button').focus();
  }
  const closeMenu = () => { $('exportMenu').hidden = true; };
  function loadSetupText(text) {
    try {
      const o = JSON.parse(text);
      if (!OGS.presets.isValid(o)) throw new Error('not a setup');
      const s = OGS.presets.repair(o); s.savedId = ''; store.replaceSetup(s); toast('Setup opened');
    } catch (e) { toast('That file is not a simulator setup.'); }
  }

  /* ---------- What to redraw ---------- */
  function renderAll() {
    renderTop(); renderSidebar(); OGS.canvas.render(); renderTimeline();
    OGS.inspector.render(); OGS.inspector.renderInput(); OGS.drawer.render();
    OGS.settings.rerenderIfOpen();
  }
  let inspectorTimer = 0;
  function renderLive() {                          // while dragging a slider: keep the inspector in place
    renderTop(); OGS.canvas.render(); renderTimeline(); OGS.drawer.render(); OGS.inspector.renderInput();
    clearTimeout(inspectorTimer);
    inspectorTimer = setTimeout(() => { const a = document.activeElement; if (!(a && a.type === 'range' && $('pane-props').contains(a))) OGS.inspector.render(); }, 600);
  }
  function renderTime() { OGS.canvas.render(); renderTimeline(); OGS.drawer.renderTime(); if (app.ui.sel?.type === 'det') OGS.inspector.render(); }
  function showSide(tab) {
    app.ui.sideTab = tab;
    document.querySelectorAll('[data-side]').forEach(b => { b.classList.toggle('on', b.dataset.side === tab); b.setAttribute('aria-selected', b.dataset.side === tab); });
    ['props', 'input', 'ai'].forEach(t => { $('pane-' + t).hidden = t !== tab; });
    if (tab === 'ai') OGS.assistant.render();
  }

  OGS.render = { all: renderAll, live: renderLive, time: renderTime, top: renderTop, inspector: () => OGS.inspector.render(), showSide, stopPlay, play, goto,
                 setTool, openPreset, saveCurrent, exportAs, setTheme, applyTheme, resize, fileBase, TOOLS, toolIcon };

  /* ---------- Events ---------- */
  function wire() {
    $('openCmd').addEventListener('click', () => { closeSidebar(); OGS.command.open(); });
    $('openSettings').addEventListener('click', () => { closeSidebar(); OGS.settings.open(); });
    $('openAbout').addEventListener('click', () => { closeSidebar(); OGS.settings.open('about'); });
    $('themeBtn').addEventListener('click', () => { const order = ['system', 'light', 'dark']; setTheme(order[(order.indexOf(app.prefs.theme) + 1) % 3]); });
    $('menuBtn').addEventListener('click', openSidebar);
    $('sbClose').addEventListener('click', closeSidebar);
    $('scrim').addEventListener('click', closeSidebar);
    $('saveSetup').addEventListener('click', saveCurrent);

    $('sidebar').addEventListener('click', e => {
      const el = e.target.closest('[data-preset],[data-saved],[data-tool],[data-orient],[data-dir],[data-delete],[data-rename]');
      if (!el || e.target.closest('input')) return;
      if (el.dataset.delete) { e.stopPropagation(); const s = store.saved.list().find(i => i.id === el.dataset.delete); store.saved.remove(el.dataset.delete); if (app.S.savedId === el.dataset.delete) app.S.savedId = ''; renderAll(); toast(`Deleted “${s?.name || 'setup'}”`); return; }
      if (el.dataset.rename) { e.stopPropagation(); startRename(el.dataset.rename); return; }
      if (el.dataset.preset) openPreset(el.dataset.preset);
      else if (el.dataset.saved) { store.saved.open(el.dataset.saved); closeSidebar(); }
      else if (el.dataset.tool) setTool(el.dataset.tool);
      else if (el.dataset.orient) { app.ui.orient = +el.dataset.orient; renderSidebar(); }
      else if (el.dataset.dir) { app.ui.srcDir = el.dataset.dir; renderSidebar(); }
    });
    $('sidebar').addEventListener('keydown', e => { const el = e.target.closest('[data-saved]'); if (el && e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); store.saved.open(el.dataset.saved); } });

    $('gn').addEventListener('change', e => resize(+e.target.value, app.S.m));
    $('gm').addEventListener('change', e => resize(app.S.n, +e.target.value));
    $('undo').addEventListener('click', store.undo);
    $('redo').addEventListener('click', store.redo);
    $('formulaBtn').addEventListener('click', () => OGS.settings.open('formula'));
    $('status').addEventListener('click', () => OGS.drawer.show('checks'));
    $('exportBtn').addEventListener('click', e => { e.stopPropagation(); $('exportMenu').hidden ? openExportMenu(e.currentTarget) : closeMenu(); });
    $('exportMenu').addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; closeMenu(); exportAs(b.dataset.x); });
    document.addEventListener('click', e => { if (!$('exportMenu').hidden && !e.target.closest('#exportMenu')) closeMenu(); });
    $('fileIn').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => loadSetupText(String(r.result)); r.readAsText(f); e.target.value = ''; });

    $('play').addEventListener('click', play);
    $('stepBack').addEventListener('click', () => goto(app.t - 1));
    $('stepFwd').addEventListener('click', () => goto(app.t + 1));
    $('tslider').addEventListener('input', e => { OGS.dom.sliderFill(e.target); goto(+e.target.value); });
    $('speed').addEventListener('change', () => { if (app.ui.playing) { stopPlay(); play(); } });
    $('zoomIn').addEventListener('click', () => OGS.canvas.zoomAt(1.25));
    $('zoomOut').addEventListener('click', () => OGS.canvas.zoomAt(0.8));
    $('zoomFit').addEventListener('click', OGS.canvas.fit);
    $('lblBtn').addEventListener('click', () => { app.prefs.labels = !app.prefs.labels; store.savePrefs(); renderTop(); OGS.canvas.render(); });
    $('sideTabs').addEventListener('click', e => { const b = e.target.closest('[data-side]'); if (b) showSide(b.dataset.side); });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      const typing = e.target.closest && e.target.closest('input:not([type=range]):not([type=checkbox]),textarea,select,[contenteditable]');
      const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
      if (mod && key === 'k') { e.preventDefault(); OGS.command.open(); return; }
      if (mod && key === 'z') { if (typing) return; e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); return; }
      if (mod && key === 'y') { if (typing) return; e.preventDefault(); store.redo(); return; }
      if (typing || mod || e.altKey || document.querySelector('dialog[open]')) return;
      if (e.target.type === 'range' && (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End')) return;
      const toolKeys = { v: 'select', b: 'bs', m: 'mirror', p: 'phase', d: 'det', s: 'src', e: 'erase' };
      if (toolKeys[key]) { setTool(toolKeys[key]); return; }
      if (key === 'r') { rotate(); return; }
      if (key === ',') { OGS.settings.open(); return; }
      if (key === '0') { OGS.canvas.fit(); return; }
      if (e.key === ' ' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); play(); return; }
      if (e.key === 'ArrowRight') { goto(app.t + 1); return; }
      if (e.key === 'ArrowLeft') { goto(app.t - 1); return; }
      if (e.key === 'Home') { goto(0); return; }
      if (e.key === 'End') { goto(Infinity); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && app.ui.sel) {
        e.preventDefault(); const sel = app.ui.sel;
        if (sel.type === 'node') store.commit(() => Object.assign(app.S.grid[sel.x][sel.y], { tbs: 0, th: 0, phH: 0, phV: 0, name: '' }));
        else { const i = app.S.dets.findIndex(d => d.k === sel.k && d.x === sel.x && d.y === sel.y); app.ui.sel = null; if (i >= 0) store.commit(() => app.S.dets.splice(i, 1)); }
        return;
      }
      if (e.key === 'Escape') { closeMenu(); closeSidebar(); if (app.ui.sel) { app.ui.sel = null; OGS.inspector.render(); OGS.canvas.render(); } }
    });
  }
  function rotate() {
    const sel = app.ui.sel;
    if (app.ui.tool === 'select' && sel?.type === 'node') { store.commit(() => { const nd = app.S.grid[sel.x][sel.y]; nd.tbs = OGS.norm360(+nd.tbs + 90); }); return; }
    app.ui.orient = (app.ui.orient + 90) % 360; renderSidebar(); toast(`New parts face θBS = ${app.ui.orient}°`);
  }

  /* ---------- Start ---------- */
  function start() {
    $('sbVersion').textContent = 'v' + OGS.VERSION;
    if (OGS.brand) $('wsLogo').innerHTML = OGS.brand.svg('mark');
    applyTheme();
    store.boot();
    OGS.canvas.wire(); OGS.inspector.wire(); OGS.drawer.wire(); OGS.settings.wire(); OGS.assistant.wire(); OGS.command.wire(); wire();
    OGS.canvas.fit();
    renderAll();
    OGS.drawer.show('results');
    showSide('props');
    OGS.drawer.setOpen(true);
    // Test hook (used by automated checks; harmless otherwise).
    window.__ogs = { app, store, engine: OGS.engine, presets: OGS.presets, exporters: OGS.exporters, assistant: OGS.assistant };
    if (!window.OGS_CONFIG) setTimeout(() => toast('config.js could not be read, so default settings are used. Check the last change made to it.'), 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
