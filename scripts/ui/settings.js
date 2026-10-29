/* ============================================================================
   scripts/ui/settings.js  —  The Settings window
   ----------------------------------------------------------------------------
   SECTIONS
     Formula        which beam-splitter formula is used, or your own
     Simulation     timing, identical vs distinguishable photons, detector
                    efficiency, maximum steps
     Display        theme, number format, labels
     AI assistant   Groq API key (free), model, connection test
     Shortcuts      keyboard shortcuts
     About          version and how the files are organised

   SHOULD I EDIT IT?
     No. Default values live in config.js.
   ============================================================================ */

(() => {
  const { $, esc, icon, toast, sliderFill, fillAllSliders } = OGS.dom;
  const app = OGS.app;
  const SECTIONS = [['formula', 'Formula', 'sigma'], ['simulation', 'Simulation', 'sliders'], ['display', 'Display', 'palette'], ['ai', 'AI assistant', 'sparkles'], ['shortcuts', 'Shortcuts', 'keyboard'], ['about', 'About', 'info']];
  const GROQ_MODELS = [
    ['llama-3.3-70b-versatile', 'Llama 3.3 70B · recommended'],
    ['openai/gpt-oss-120b', 'GPT-OSS 120B · strongest reasoning'],
    ['openai/gpt-oss-20b', 'GPT-OSS 20B · fast'],
    ['llama-3.1-8b-instant', 'Llama 3.1 8B · fastest, simplest'],
  ];
  let section = 'formula';

  // One-line description of the current computation settings.
  function summary() {
    const M = app.S.model;
    return `${OGS.formulas.MODELS[M.kernel].name} · ${M.time === 'cw' ? 'continuous wave' : 'pulsed'} · ${M.stats === 'dist' ? 'distinguishable' : 'identical photons'} · η ${(+M.eta).toFixed(2)}`;
  }
  function checkBadge() {
    const c = OGS.formulas.checkModel(app.S.model);
    if (!c.ok) return `<span class="tag red">${esc(c.message)}</span>`;
    return c.worst < 1e-9 ? `<span class="tag green">${icon('check')}Unitary at every tested angle</span>` : `<span class="tag red">Not unitary (deviation ${c.worst.toExponential(2)}): probabilities will not add up to 1</span>`;
  }
  const card = (attr, value, on, title, desc, extra = '') =>
    `<button class="set-card ${on ? 'on' : ''}" data-${attr}="${value}"><span class="set-card-h"><b>${title}</b>${extra}</span><span class="hint">${desc}</span></button>`;
  const row = (title, desc, control) => `<div class="set-row"><div><div class="set-row-t">${title}</div>${desc ? `<div class="hint">${desc}</div>` : ''}</div><div class="set-row-c">${control}</div></div>`;

  function body() {
    const S = app.S, M = S.model, F = OGS.formulas;
    if (section === 'formula') {
      return `<h2>Formula</h2><p class="hint">How every non-empty node turns an incoming photon into a transmitted and a reflected part. Changes apply immediately.</p>
        <div class="set-cards">${Object.entries(F.MODELS).map(([id, m]) => card('kernel', id, M.kernel === id, esc(m.name), esc(m.desc), `<span class="tag">${esc(m.tag)}</span>`) ).join('')}</div>
        ${M.kernel !== 'custom' ? `<div class="set-sub">Formula in use</div><pre class="code">${esc(F.MODELS[M.kernel].formula)}</pre>` : `
        <div class="set-sub">Your formula <span class="faint" style="font-weight:400">· variables th, phH, phV in radians · functions sqrt exp cos sin tan conj</span></div>
        <div class="set-formula">
          <label for="cf-tH">Horizontal in → transmitted</label><input type="text" id="cf-tH" value="${esc(M.custom.tH)}" spellcheck="false">
          <label for="cf-rH">Horizontal in → reflected</label><input type="text" id="cf-rH" value="${esc(M.custom.rH)}" spellcheck="false">
          <label for="cf-tV">Vertical in → transmitted</label><input type="text" id="cf-tV" value="${esc(M.custom.tV)}" spellcheck="false">
          <label for="cf-rV">Vertical in → reflected</label><input type="text" id="cf-rV" value="${esc(M.custom.rV)}" spellcheck="false">
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px"><span id="cfStatus">${checkBadge()}</span><span class="spacer"></span><span class="hint">Start from</span>${[['sym', 'Symmetric'], ['real', 'Real'], ['out', 'Phase after']].map(([k, l]) => `<button class="btn btn-sm" data-template="${k}">${l}</button>`).join('')}</div>`}
        <div class="callout" style="margin-top:16px">${icon('info')}<div>“Transmitted” keeps the direction of travel; “reflected” turns 90° along the “/” or “\\” plate. A node with θ = 0 and φ = 0 is always empty, whatever the formula, as in the notes.</div></div>`;
    }
    if (section === 'simulation') {
      return `<h2>Simulation</h2><p class="hint">How detection, timing and photon identity are treated.</p>
        <div class="set-sub">Arrival time</div>
        <div class="set-cards two">${card('time', 'pulsed', M.time === 'pulsed', 'Pulsed', 'Each detection keeps its arrival step, so paths of different length never interfere. Same as main.py.')}
          ${card('time', 'cw', M.time === 'cw', 'Continuous wave', 'Arrival times are not resolved: amplitudes reaching the same detector at different steps add together.')}</div>
        <div class="set-sub">Photons</div>
        <div class="set-cards two">${card('stats', 'boson', M.stats === 'boson', 'Identical photons', 'Bosonic statistics with the n! bunching factor. Shows the Hong–Ou–Mandel dip.')}
          ${card('stats', 'dist', M.stats === 'dist', 'Distinguishable particles', 'Each photon is labelled γ1, γ2… in the order written on its input line, so two-photon interference disappears.')}</div>
        <div class="set-sub">Numbers</div>
        ${row('Detector efficiency η', 'Chance that a detector counts a photon that reaches it. Detectors can override it.', `<div class="slider-row" style="width:230px"><input type="range" id="r-geta" min="0" max="1" step="0.01" value="${M.eta}"><input type="number" id="n-geta" min="0" max="1" step="0.01" value="${M.eta}" aria-label="efficiency"></div>`)}
        ${row('Maximum steps', 'A run stops after this many steps even if photons are still moving.', `<input type="number" id="maxT" min="1" max="400" value="${S.maxT}">`)}
        ${row('Ignore amplitudes below', 'Smaller amplitudes are dropped to keep runs fast.', `<select id="prune">${[[1e-13, '10⁻¹³'], [1e-10, '10⁻¹⁰'], [1e-7, '10⁻⁷'], [1e-5, '10⁻⁵']].map(([v, l]) => `<option value="${v}" ${Math.abs(M.prune - v) < v * 1e-3 ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
        <div style="margin-top:18px"><button class="btn" id="resetModel">${icon('undo')}Reset formula and simulation to main.py defaults</button></div>`;
    }
    if (section === 'display') {
      const th = app.prefs.theme;
      return `<h2>Display</h2><p class="hint">How the app looks. These choices are remembered by this browser.</p>
        ${row('Theme', 'System follows your computer.', `<div class="seg">${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button data-theme-set="${v}" class="${th === v ? 'on' : ''}">${l}</button>`).join('')}</div>`)}
        ${row('Numbers', 'Exact uses fractions and roots when possible.', `<div class="seg">${[['exact', '√2/2'], ['decimal', '0.7071'], ['polar', '0.71∠90°']].map(([v, l]) => `<button data-fmt="${v}" class="${M.fmt === v ? 'on' : ''}">${l}</button>`).join('')}</div>`)}
        ${row('Operator labels', 'Write a†h(x,y) and a†v(x,y) on every edge.', `<label class="switch"><input type="checkbox" id="prefLabels" ${app.prefs.labels ? 'checked' : ''}><span class="track"></span></label>`)}
        ${row('Legend', 'Show the colour key on the table.', `<label class="switch"><input type="checkbox" id="prefLegend" ${app.prefs.legend ? 'checked' : ''}><span class="track"></span></label>`)}`;
    }
    if (section === 'ai') {
      const src = OGS.store.groqKeySource(), model = OGS.store.groqModel(), prov = OGS.store.provider();
      const known = GROQ_MODELS.some(m => m[0] === model);
      const inClaude = !!(window.claude && typeof window.claude.use === 'function');
      return `<h2>AI assistant</h2><p class="hint">The Assistant tab explains your setup, interprets results and can change components or run sweeps when you ask.</p>
        <div class="set-sub">Free Groq API key</div>
        <ol class="steps">
          <li>Open <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a> ${icon('external')} and sign in (a Google account works).</li>
          <li>Click <b>Create API Key</b>, name it anything, and copy the key. It starts with <span class="mono">gsk_</span>.</li>
          <li>Paste it below and click <b>Save key</b>.</li></ol>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
          <div style="position:relative;flex:1"><input type="password" id="groqKey" placeholder="${src === 'config' ? 'Using the key from config.js' : 'gsk_…'}" value="${esc(app.prefs.groqKey)}" autocomplete="off" spellcheck="false" style="width:100%;padding-right:34px;font-family:var(--mono)" aria-label="Groq API key">
            <button class="icon-btn" id="showKey" style="position:absolute;right:2px;top:0;width:28px;height:30px" aria-label="Show or hide the key">${icon('eye')}</button></div>
          <button class="btn btn-primary" id="saveKey">Save key</button>${app.prefs.groqKey ? `<button class="btn btn-ghost" id="clearKey">Remove</button>` : ''}</div>
        <p class="hint" style="margin-top:8px">${src === 'settings' ? `${icon('check')} A key is saved in this browser.` : src === 'config' ? `${icon('check')} Using the key written in config.js.` : 'No key yet.'} The key is stored only in this browser and sent only to Groq. You can also write it in <span class="mono">config.js</span> (see the guide).</p>
        <div class="set-sub">Model and provider</div>
        ${row('Groq model', 'Every listed model is free with a Groq account.', `<select id="groqModel">${GROQ_MODELS.map(([v, l]) => `<option value="${v}" ${v === model ? 'selected' : ''}>${l}</option>`).join('')}${known ? '' : `<option value="${esc(model)}" selected>${esc(model)}</option>`}</select>`)}
        ${row('Use', 'Auto uses Groq when a key is set, otherwise Claude when the page is opened inside Claude.', `<div class="seg">${[['auto', 'Auto'], ['groq', 'Groq'], ['claude', 'Claude']].map(([v, l]) => `<button data-provider="${v}" class="${prov === v ? 'on' : ''}">${l}</button>`).join('')}</div>`)}
        <div style="display:flex;gap:8px;align-items:center;margin-top:14px"><button class="btn" id="testGroq">${icon('check')}Test the connection</button><span class="hint" id="testResult"></span></div>
        ${inClaude ? `<div class="callout warn" style="margin-top:16px">${icon('info')}<div>You are inside Claude, which blocks connections to outside services such as Groq. Here the assistant uses Claude instead. Groq works in the downloaded copy opened from your computer.</div></div>` : ''}`;
    }
    if (section === 'shortcuts') {
      const keys = [['Search and commands', 'Ctrl K'], ['Select / edit', 'V'], ['Beam splitter', 'B'], ['Mirror', 'M'], ['Phase shifter', 'P'], ['Detector', 'D'], ['Add photon', 'S'], ['Erase', 'E'],
        ['Rotate θBS 90°', 'R'], ['Clear the selected item', 'Delete'], ['Play / pause', 'Space'], ['Previous / next step', '← →'], ['First / last step', 'Home End'],
        ['Undo', 'Ctrl Z'], ['Redo', 'Ctrl Shift Z'], ['Settings', ','], ['Fit table to screen', '0'], ['Zoom', 'Ctrl + scroll'], ['Move the table', 'Drag']];
      return `<h2>Keyboard shortcuts</h2><p class="hint">Shortcuts work when you are not typing in a box. On a Mac use ⌘ for Ctrl.</p>
        <div class="set-keys">${keys.map(([l, k]) => `<div><span>${l}</span><span>${k.split(' ').map(x => `<kbd>${x}</kbd>`).join(' ')}</span></div>`).join('')}</div>`;
    }
    // ----- About: logo, mission, what the platform does, team, vision, credits -----
    const P = OGS.PROJECT || { team: [], mission: [], pillars: [], vision: [], credits: [] };
    const initials = n => n.replace(/^Dr\.\s*/, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('');
    const logo = OGS.brand ? OGS.brand.svg('logo', { label: esc(P.slogan || 'Quriosity') }) : `<b>${esc(P.brand || 'Quriosity')}</b>`;
    const [visionLead, ...visionRest] = P.vision || [];
    return `<div class="ab">
      <section class="ab-hero">
        <div class="ab-logo">${logo}</div>
        <div class="ab-kicker">${esc(P.name || 'optics.quriosity')} <span>v${esc(OGS.VERSION)}</span></div>
        <h2 class="ab-title">${esc(P.tagline || '')}</h2>
        ${(P.mission || []).map(t => `<p>${esc(t)}</p>`).join('')}
      </section>

      <section class="ab-pillars">${(P.pillars || []).map(x => `<div class="ab-pillar"><span class="ab-ic">${icon(x.icon)}</span><b>${esc(x.title)}</b><p>${esc(x.text)}</p></div>`).join('')}</section>

      <section>
        <div class="ab-h">The team</div>
        <div class="ab-team">${(P.team || []).map(m => `<article class="ab-member">
          <div class="ab-photo" aria-hidden="true">${m.photo ? `<img src="${esc(m.photo)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span>${esc(initials(m.name))}</span></div>
          <div><div class="ab-name">${esc(m.name)}</div><div class="ab-role">${esc(m.role)}${m.github ? ` · <a class="ab-gh" href="https://github.com/${esc(m.github)}" target="_blank" rel="noopener">@${esc(m.github)}</a>` : ''}</div><p>${esc(m.bio)}</p></div></article>`).join('')}</div>
      </section>

      ${visionLead ? `<section class="ab-vision"><div class="ab-h">Our vision</div><p class="ab-quote">${esc(visionLead)}</p>${visionRest.map(t => `<p>${esc(t)}</p>`).join('')}</section>` : ''}

      ${P.affiliation ? `<p class="ab-place">${icon('target')}${esc(P.group ? P.group + ' · ' : '')}${esc(P.affiliation)}</p>` : ''}
      ${(P.contact || []).length ? `<p class="ab-place" style="margin-top:-18px">${P.contact.map(c => `<a class="ab-gh" href="mailto:${esc(c)}">${esc(c)}</a>`).join(' · ')}${P.repo ? ` · <a class="ab-gh" href="${esc(P.repo)}" target="_blank" rel="noopener">GitHub</a>` : ''}</p>` : ''}

      <section>
        <div class="ab-h">Credits and licences</div>
        <div class="ab-credits">${(P.credits || []).map(c => `<div><span>${esc(c.what)}</span><span>${esc(c.who)} · <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.licence)}</a></span></div>`).join('')}</div>
        <p class="hint" style="margin-top:10px">${esc(P.licence || '')}</p>
        <div style="margin-top:16px"><a class="btn" href="docs/guide.html" target="_blank" rel="noopener">${icon('book')}Open the guide</a></div>
      </section>
    </div>`;
  }

  function render() {
    const nav = SECTIONS.map(([id, label, ic]) => `<button class="sb-item ${section === id ? 'on' : ''}" data-section="${id}">${icon(ic)}<span class="lbl">${label}</span></button>`).join('');
    $('settingsNav').innerHTML = nav;
    $('settingsBody').innerHTML = body();
    fillAllSliders($('settingsBody'));
  }
  function open(which) { if (which) section = which; render(); const d = $('settings'); if (!d.open) d.showModal(); }
  function rerenderIfOpen() { if ($('settings').open) { const focused = document.activeElement?.id; render(); if (focused && $(focused)) $(focused).focus(); } }

  function wire() {
    const d = $('settings'), store = OGS.store;
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) { d.close(); return; }
      const b = e.target.closest('button, a'); if (!b) return;
      if (b.dataset.section) { section = b.dataset.section; render(); return; }
      const M = app.S.model;
      if (b.dataset.kernel) store.commit(() => { M.kernel = b.dataset.kernel; });
      else if (b.dataset.template) store.commit(() => { M.custom = { ...OGS.formulas.CUSTOM_TEMPLATES[b.dataset.template] }; });
      else if (b.dataset.time) store.commit(() => { M.time = b.dataset.time; });
      else if (b.dataset.stats) store.commit(() => { M.stats = b.dataset.stats; });
      else if (b.dataset.fmt) store.commit(() => { M.fmt = b.dataset.fmt; });
      else if (b.dataset.themeSet) { app.prefs.theme = b.dataset.themeSet; store.savePrefs(); OGS.render.applyTheme(); render(); }
      else if (b.dataset.provider) { app.prefs.provider = b.dataset.provider; store.savePrefs(); render(); OGS.assistant.render(); }
      else if (b.id === 'resetModel') { store.commit(() => { app.S.model = OGS.formulas.defaultModel(); }); toast('Formula and simulation reset'); }
      else if (b.id === 'showKey') { const k = $('groqKey'); k.type = k.type === 'password' ? 'text' : 'password'; b.innerHTML = icon(k.type === 'password' ? 'eye' : 'eyeOff'); }
      else if (b.id === 'saveKey') {
        const v = $('groqKey').value.trim();
        if (v && !/^gsk_/.test(v)) toast('Groq keys usually start with gsk_. Saved anyway.'); else toast(v ? 'Key saved in this browser' : 'Key cleared');
        app.prefs.groqKey = v; store.savePrefs(); render(); OGS.assistant.render();
      }
      else if (b.id === 'clearKey') { app.prefs.groqKey = ''; store.savePrefs(); toast('Key removed from this browser'); render(); OGS.assistant.render(); }
      else if (b.id === 'testGroq') {
        const out = $('testResult'); out.textContent = 'Testing…';
        OGS.assistant.testGroq().then(msg => { out.innerHTML = `<span style="color:var(--ok)">${esc(msg)}</span>`; }, err => { out.innerHTML = `<span style="color:var(--bad)">${esc(err.message || String(err))}</span>`; });
      }
    });
    let typing = 0;
    d.addEventListener('input', e => {
      const id = e.target.id;
      if (e.target.type === 'range') sliderFill(e.target);
      const cf = id.match(/^cf-(tH|rH|tV|rV)$/);
      if (cf) {
        const v = e.target.value; clearTimeout(typing);
        typing = setTimeout(() => { store.remember('cf' + cf[1]); app.S.model.custom[cf[1]] = v; app.S.modified = true; store.resim(); OGS.render.live(); $('cfStatus').innerHTML = checkBadge(); }, 260);
        return;
      }
      if (/^[rn]-geta$/.test(id)) {
        const v = OGS.clamp(parseFloat(e.target.value), 0, 1); if (!isFinite(v)) return;
        const twin = $(id[0] === 'r' ? 'n-geta' : 'r-geta'); if (twin && twin !== e.target) { twin.value = v; sliderFill(twin); }
        store.commitLive(() => { app.S.model.eta = v; }, 'geta');
      }
    });
    d.addEventListener('change', e => {
      const id = e.target.id;
      if (id === 'maxT') store.commit(() => { app.S.maxT = OGS.clamp(+e.target.value || 40, 1, 400); });
      else if (id === 'prune') store.commit(() => { app.S.model.prune = +e.target.value; });
      else if (id === 'prefLabels') { app.prefs.labels = e.target.checked; store.savePrefs(); OGS.render.all(); }
      else if (id === 'prefLegend') { app.prefs.legend = e.target.checked; store.savePrefs(); OGS.render.top(); }
      else if (id === 'groqModel') { app.prefs.groqModel = e.target.value; store.savePrefs(); OGS.assistant.render(); }
    });
  }

  OGS.settings = { open, render, rerenderIfOpen, wire, summary };
})();
