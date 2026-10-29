/* ============================================================================
   scripts/ui/store.js  —  The app's memory
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     • Holds the current setup (OGS.app.S) and its simulation result (OGS.app.sim).
     • Records every change so Undo / Redo work.
     • Remembers your work in the browser, so it is still there next time:
         ogs.setup.v3   the setup you were working on
         ogs.prefs.v3   theme, AI key and other preferences
         ogs.saved.v3   setups saved under "My setups"
       (Browser memory belongs to one browser on one computer. Clearing the
        browser's site data erases it. Use Export → Save setup to keep a file.)

   SHOULD I EDIT IT?
     No.
   ============================================================================ */

(() => {
  const KEYS = { setup: 'ogs.setup.v3', prefs: 'ogs.prefs.v3', saved: 'ogs.saved.v3' };
  const cfg = window.OGS_CONFIG || {};

  // Reading and writing browser storage can fail (private windows etc.); never crash on it.
  const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: keep working without it */ } };

  /* Everything the screen needs to know. */
  const app = OGS.app = {
    S: null,          // current setup
    sim: null,        // result of simulating S
    t: 0,             // time step shown on the table
    ui: {
      tool: 'select', orient: 0, srcDir: '+', sel: null,
      drawerTab: 'results', sideTab: 'props', drawerOpen: true, drawerH: 300,
      zoom: { z: 1, cx: 0, cy: 0 }, playing: null, hiddenSeries: new Set(),
      sweep: null, sweepCfg: null,
    },
    prefs: Object.assign({
      theme: ['light', 'dark', 'system'].includes(cfg.THEME) ? cfg.THEME : 'system',
      labels: false,        // show a† labels on edges
      patch: false,         // include the main.py patch in Python export
      groqKey: '',          // key typed in Settings (wins over config.js)
      groqModel: '',        // model chosen in Settings (wins over config.js)
      provider: '',         // 'auto' | 'groq' | 'claude' chosen in Settings
      legend: true,
    }, read(KEYS.prefs, {})),
  };
  const hist = { past: [], future: [] };
  let coalesce = { key: null, time: 0 };

  function savePrefs() { write(KEYS.prefs, app.prefs); }
  function saveSetup() { write(KEYS.setup, app.S); }

  // Re-run the simulation for the current setup and jump to its last step.
  function resim() {
    OGS.render?.stopPlay?.();
    app.sim = OGS.engine.simulate(app.S);
    app.t = app.sim.states.length - 1;
    saveSetup();
  }

  /* Remember the current setup before a change (for Undo).
     Rapid changes to the same control within ~1 second count as one step. */
  function remember(key) {
    const now = Date.now();
    if (!(key && coalesce.key === key && now - coalesce.time < 900)) {
      hist.past.push(JSON.stringify(app.S));
      if (hist.past.length > 200) hist.past.shift();
      hist.future = [];
    }
    coalesce = { key: key || null, time: now };
  }

  // Make a change, re-simulate and redraw everything.
  function commit(change, key) {
    remember(key);
    change();
    app.S.modified = true;
    resim();
    app.ui.sweep = null;
    OGS.render.all();
  }
  // Same, but redraws only what must change while a slider is being dragged.
  function commitLive(change, key) {
    remember(key);
    change();
    app.S.modified = true;
    resim();
    OGS.render.live();
  }

  function fixSelection() {
    const s = app.ui.sel, S = app.S;
    if (!s) return;
    if (s.type === 'node' && (s.x >= S.n || s.y >= S.m)) app.ui.sel = null;
    if (s.type === 'det' && !S.dets.some(d => d.k === s.k && d.x === s.x && d.y === s.y)) app.ui.sel = null;
  }
  function undo() {
    if (!hist.past.length) return;
    hist.future.push(JSON.stringify(app.S));
    app.S = JSON.parse(hist.past.pop());
    coalesce = { key: null, time: 0 };
    fixSelection(); resim(); app.ui.sweep = null; OGS.render.all(); OGS.dom.toast('Undone');
  }
  function redo() {
    if (!hist.future.length) return;
    hist.past.push(JSON.stringify(app.S));
    app.S = JSON.parse(hist.future.pop());
    coalesce = { key: null, time: 0 };
    fixSelection(); resim(); app.ui.sweep = null; OGS.render.all(); OGS.dom.toast('Redone');
  }
  const canUndo = () => hist.past.length > 0;
  const canRedo = () => hist.future.length > 0;

  // Replace the whole setup (opening a preset, a saved setup or a file).
  function replaceSetup(newSetup) {
    remember();
    app.S = newSetup;
    app.ui.sel = null; app.ui.sweep = null; app.ui.sweepCfg = null; app.ui.hiddenSeries.clear();
    resim();
    OGS.canvas.fit();
    OGS.render.all();
  }

  // Load the last setup, or the starting experiment from config.js.
  function boot() {
    const stored = read(KEYS.setup, null);
    app.S = (stored && OGS.presets.isValid(stored)) ? OGS.presets.repair(stored) : OGS.presets.build(cfg.START_EXPERIMENT || 'wigner');
    resim();
  }

  /* ----- "My setups": named copies kept in the browser ----- */
  const saved = {
    list: () => read(KEYS.saved, []),
    add(name) {
      const items = saved.list();
      const id = 's' + Date.now().toString(36);
      items.unshift({ id, name: (name || 'Untitled setup').slice(0, 60), savedAt: Date.now(), setup: JSON.parse(JSON.stringify(app.S)) });
      write(KEYS.saved, items.slice(0, 50));
      return id;
    },
    rename(id, name) { const items = saved.list(); const it = items.find(i => i.id === id); if (it) { it.name = (name || 'Untitled setup').slice(0, 60); write(KEYS.saved, items); } },
    remove(id) { write(KEYS.saved, saved.list().filter(i => i.id !== id)); },
    open(id) {
      const it = saved.list().find(i => i.id === id);
      if (!it || !OGS.presets.isValid(it.setup)) { OGS.dom.toast('This saved setup could not be opened.'); return; }
      const s = OGS.presets.repair(JSON.parse(JSON.stringify(it.setup)));
      s.title = it.name; s.preset = ''; s.savedId = id; s.modified = false;
      replaceSetup(s);
    },
  };

  /* ----- AI key and provider: the app setting wins, then config.js ----- */
  const PLACEHOLDER = /PASTE_YOUR_GROQ_KEY_HERE/i;
  function groqKey() {
    if (app.prefs.groqKey) return app.prefs.groqKey.trim();
    const k = String(cfg.GROQ_API_KEY || '').trim();
    return (!k || PLACEHOLDER.test(k)) ? '' : k;
  }
  const groqKeySource = () => app.prefs.groqKey ? 'settings' : (groqKey() ? 'config' : '');
  const groqModel = () => app.prefs.groqModel || cfg.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const provider = () => app.prefs.provider || (['auto', 'groq', 'claude'].includes(cfg.AI_PROVIDER) ? cfg.AI_PROVIDER : 'auto');

  OGS.store = { KEYS, savePrefs, saveSetup, resim, remember, commit, commitLive, undo, redo, canUndo, canRedo, replaceSetup, boot, fixSelection, saved, groqKey, groqKeySource, groqModel, provider };
})();
