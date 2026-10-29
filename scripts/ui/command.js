/* ============================================================================
   scripts/ui/command.js  —  Search and commands (Ctrl K)
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     A search box listing every action in the app: open an experiment, pick a
     tool, open a panel, export, change the theme… Type a few letters, use the
     arrow keys, press Enter.

   SHOULD I EDIT IT?
     Only to add a new command to the list in commands().
   ============================================================================ */

(() => {
  const { $, esc, icon } = OGS.dom;
  const app = OGS.app;
  let items = [], active = 0;
  const R_icon = name => OGS.render.toolIcon(name);

  function commands() {
    const R = OGS.render, list = [];
    for (const [id, title] of OGS.presets.list) list.push({ group: 'Experiments', label: title, icon: 'flask', run: () => R.openPreset(id) });
    for (const s of OGS.store.saved.list()) list.push({ group: 'My setups', label: s.name, icon: 'file', run: () => OGS.store.saved.open(s.id) });
    for (const [id, label, ic, key] of R.TOOLS) list.push({ group: 'Tools', label, icon: ic, hint: key, run: () => R.setTool(id) });
    list.push({ group: 'Help', label: 'About the project and team', icon: 'info', run: () => OGS.settings.open('about') });
    list.push(
      { group: 'Run', label: 'Play / pause', icon: 'play', hint: 'Space', run: () => R.play() },
      { group: 'Run', label: 'Go to the first step', icon: 'first', hint: 'Home', run: () => R.goto(0) },
      { group: 'Run', label: 'Go to the last step', icon: 'last', hint: 'End', run: () => R.goto(Infinity) },
      { group: 'Run', label: 'Run a parameter sweep', icon: 'wave', run: () => OGS.drawer.show('sweep') },
      { group: 'Panels', label: 'Results', icon: 'target', run: () => OGS.drawer.show('results') },
      { group: 'Panels', label: 'Time evolution', icon: 'chart', run: () => OGS.drawer.show('evolution') },
      { group: 'Panels', label: 'Python code', icon: 'code', run: () => OGS.drawer.show('code') },
      { group: 'Panels', label: 'Checks', icon: 'shield', run: () => OGS.drawer.show('checks') },
      { group: 'Panels', label: 'Edit the input state', icon: 'photon', run: () => R.showSide('input') },
      { group: 'Panels', label: 'Ask the assistant', icon: 'sparkles', run: () => { R.showSide('ai'); setTimeout(() => $('aiInput')?.focus(), 50); } },
      { group: 'Settings', label: 'Change the formula', icon: 'sigma', run: () => OGS.settings.open('formula') },
      { group: 'Settings', label: 'Simulation settings', icon: 'sliders', run: () => OGS.settings.open('simulation') },
      { group: 'Settings', label: 'Add or change the Groq API key', icon: 'key', run: () => OGS.settings.open('ai') },
      { group: 'Settings', label: 'Theme: light', icon: 'sun', run: () => R.setTheme('light') },
      { group: 'Settings', label: 'Theme: dark', icon: 'moon', run: () => R.setTheme('dark') },
      { group: 'Settings', label: 'Theme: follow the system', icon: 'monitor', run: () => R.setTheme('system') },
      { group: 'Settings', label: 'Keyboard shortcuts', icon: 'keyboard', run: () => OGS.settings.open('shortcuts') },
      { group: 'File', label: 'Save to My setups', icon: 'save', run: () => R.saveCurrent() },
      { group: 'File', label: 'Download report (.md)', icon: 'download', run: () => R.exportAs('report') },
      { group: 'File', label: 'Download results table (.csv)', icon: 'download', run: () => R.exportAs('csv') },
      { group: 'File', label: 'Download table drawing (.svg)', icon: 'download', run: () => R.exportAs('svg') },
      { group: 'File', label: 'Download setup file (.json)', icon: 'download', run: () => R.exportAs('json') },
      { group: 'File', label: 'Open a setup file', icon: 'upload', run: () => R.exportAs('open') },
      { group: 'Edit', label: 'Undo', icon: 'undo', hint: 'Ctrl Z', run: () => OGS.store.undo() },
      { group: 'Edit', label: 'Redo', icon: 'redo', hint: 'Ctrl ⇧ Z', run: () => OGS.store.redo() },
      { group: 'Edit', label: 'Fit the table to the screen', icon: 'fit', hint: '0', run: () => OGS.canvas.fit() },
      { group: 'Help', label: 'Open the guide', icon: 'book', run: () => window.open('docs/guide.html', '_blank', 'noopener') },
    );
    return list;
  }

  function render() {
    const q = $('cmdInput').value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    items = commands().filter(c => words.every(w => (c.label + ' ' + c.group).toLowerCase().includes(w)));
    if (active >= items.length) active = Math.max(0, items.length - 1);
    let html = '', group = '';
    items.forEach((c, i) => {
      if (c.group !== group) { group = c.group; html += `<div class="menu-label">${esc(group)}</div>`; }
      html += `<button class="menu-item ${i === active ? 'active' : ''}" data-i="${i}" role="option" aria-selected="${i === active}">${R_icon(c.icon)}<span>${esc(c.label)}</span>${c.hint ? `<span class="hint-r">${c.hint.split(' ').map(k => `<kbd>${esc(k)}</kbd>`).join(' ')}</span>` : ''}</button>`;
    });
    $('cmdList').innerHTML = html || `<div class="cmd-empty">No command matches “${esc(q)}”.</div>`;
    $('cmdList').querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }
  function open() { const d = $('cmdk'); $('cmdInput').value = ''; active = 0; render(); if (!d.open) d.showModal(); $('cmdInput').focus(); }
  function run(i) { const c = items[i]; if (!c) return; $('cmdk').close(); setTimeout(c.run, 0); }

  function wire() {
    $('cmdInput').addEventListener('input', () => { active = 0; render(); });
    $('cmdInput').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
    });
    $('cmdList').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); });
    $('cmdList').addEventListener('mousemove', e => { const b = e.target.closest('[data-i]'); if (b && +b.dataset.i !== active) { active = +b.dataset.i; $('cmdList').querySelectorAll('.menu-item').forEach(x => x.classList.toggle('active', +x.dataset.i === active)); } });
    $('cmdk').addEventListener('click', e => { if (e.target === $('cmdk')) $('cmdk').close(); });
  }

  OGS.command = { open, wire };
})();
