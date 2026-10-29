/* ============================================================================
   scripts/ui/assistant.js  —  The AI assistant (Assistant tab)
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     Lets you ask questions in plain language. The assistant receives a
     summary of the current setup and results, and can use "tools" to act on
     the table: read the setup, change a node, place a detector, replace the
     input state, resize the grid, or run a sweep. Every change it makes can
     be undone with Undo.

   WHICH AI ANSWERS
     • Groq   – free API key, works in the downloaded copy (see config.js or
                Settings → AI assistant). The key is sent only to Groq.
     • Claude – used automatically when the page is opened inside Claude.
                Claude asks your permission the first time.

   SHOULD I EDIT IT?
     Only RULES (the instructions given to the AI) if you want a different
     tone or level of detail.
   ============================================================================ */

(() => {
  const { $, esc, icon } = OGS.dom;
  const app = OGS.app, norm360 = OGS.norm360;
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  // Instructions given to the AI before every conversation.
  const RULES = `You are the assistant built into "optics.quriosity", a linear quantum-optics simulator. Your reader may be a researcher or a student.
Conventions:
- Grid nodes (x,y), x to the right, y up. Edge modes: h(x,y) is the horizontal edge entering node (x,y) from the left; v(x,y) is the vertical edge entering node (x,y) from below. Suffix + means travelling right/up, − left/down. Creation operators are written a†h(x,y).
- Each node has θBS in {0,90,180,270} (0/180 = "/" plate, 90/270 = "\\" plate; the red tip marks the input side), θ (reflection angle in degrees: 0 = nothing, 90 = 50:50, 180 = mirror; reflectivity R = sin²(θ/2)), and φH, φV (phases in degrees on the horizontal and vertical ports). θ = 0 with φ = 0 is an empty node.
- Light can enter any of the four ports. One time step moves a photon along one edge. Detectors sit on edges and absorb photons from either direction.
- Probabilities include the n! factor for photons sharing a mode.
How to answer: be clear and concise, ground every number in the data given or in tool results, use short Markdown (paragraphs, bullet lists, **bold**, \`code\`), no LaTeX (write formulas with Unicode such as sin²(θ/2) or e^{iφ}). If you change the setup with tools, say exactly what you changed and what the new result is.`;

  const SUGGESTIONS = [
    ['Explain this setup and what it demonstrates', 'flask'],
    ['Interpret the current results', 'target'],
    ['Which angle shows the clearest interference? Run a sweep.', 'wave'],
    ['Why do some detectors never click?', 'info'],
  ];

  const chat = [];          // what is shown on screen
  const history = [];       // text sent back to the AI as conversation memory
  let claudeSample = null, claudeTools = false, ready = false, busy = null;

  /* ---------- Which provider to use right now ---------- */
  function activeProvider() {
    const pref = OGS.store.provider(), hasKey = !!OGS.store.groqKey();
    if (pref === 'groq') return hasKey ? 'groq' : 'none-groq';
    if (pref === 'claude') return claudeSample ? 'claude' : 'none-claude';
    if (hasKey) return 'groq';
    return claudeSample ? 'claude' : 'none';
  }

  /* ---------- Data handed to the AI ---------- */
  function setupSummary() {
    const S = app.S, comps = [];
    for (let x = 0; x < S.n; x++) for (let y = 0; y < S.m; y++) {
      const nd = S.grid[x][y], t = OGS.engine.classify(nd);
      if (t !== 'empty') comps.push({ x, y, type: t, name: nd.name || undefined, thetaBS: norm360(+nd.tbs), theta: +nd.th, phiH: +nd.phH, phiV: +nd.phV });
    }
    const M = S.model;
    return { title: S.title || 'custom setup', grid: [S.n, S.m], components: comps,
      detectors: S.dets.map(d => ({ name: d.name, edge: `${d.k}(${d.x},${d.y})`, eta: d.eta ?? M.eta })),
      input: S.input, normalize: S.normalize,
      model: { formula: OGS.formulas.MODELS[M.kernel].name, formulaText: M.kernel === 'custom' ? M.custom : OGS.formulas.MODELS[M.kernel].formula, timing: M.time, particles: M.stats, defaultEta: M.eta, maxSteps: S.maxT } };
  }
  function resultsSummary() {
    const sim = app.sim, last = sim.states[sim.states.length - 1], s = OGS.engine.stats(last, app.S), r = v => +v.toFixed(5);
    const det = {}; for (const [k, v] of Object.entries(s.det)) det[k] = r(v);
    return { steps: sim.states.length - 1, clickProbability: det, jointOutcomes: s.joint.slice(0, 14).map(([o, p]) => ({ outcome: o, p: r(p) })),
      inFlight: r(s.inflight), leftTableUnmonitored: r(s.exited), missedByEfficiency: r(s.lost), total: r(s.total), checks: OGS.drawer.checksItems().map(c => c.text) };
  }

  /* ---------- Tools the AI may use (each change can be undone) ---------- */
  const parseEdge = str => { const m = String(str).match(/([hv])\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i); return m ? { k: m[1].toLowerCase(), x: +m[2], y: +m[3] } : null; };
  function tools(actions) {
    const S = () => app.S, commit = OGS.store.commit;
    return [
      { name: 'get_setup', description: 'Returns the current setup: grid size, every non-empty node, detectors, input state and model settings.', parameters: { type: 'object', properties: {} }, run: () => setupSummary() },
      { name: 'get_results', description: 'Returns final detector click probabilities, joint outcomes, total probability and warnings for the current setup.', parameters: { type: 'object', properties: {} }, run: () => resultsSummary() },
      { name: 'set_component', description: 'Set parameters of node (x,y): any of thetaBS (0/90/180/270), theta (degrees), phiH (degrees), phiV (degrees), name. Returns the new results.',
        parameters: { type: 'object', properties: { x: { type: 'integer' }, y: { type: 'integer' }, thetaBS: { type: 'number' }, theta: { type: 'number' }, phiH: { type: 'number' }, phiV: { type: 'number' }, name: { type: 'string' } }, required: ['x', 'y'] },
        run: a => {
          const x = Number(a.x), y = Number(a.y);
          if (!(x >= 0 && x < S().n && y >= 0 && y < S().m)) throw new Error(`node (${x},${y}) is outside the ${S().n}×${S().m} grid`);
          const changed = [];
          commit(() => {
            const nd = S().grid[x][y];
            if (a.thetaBS != null && isFinite(a.thetaBS)) { nd.tbs = norm360(Math.round(Number(a.thetaBS) / 90) * 90); changed.push(`θBS ${nd.tbs}°`); }
            if (a.theta != null && isFinite(a.theta)) { nd.th = Number(a.theta); changed.push(`θ ${nd.th}°`); }
            if (a.phiH != null && isFinite(a.phiH)) { nd.phH = Number(a.phiH); changed.push(`φH ${nd.phH}°`); }
            if (a.phiV != null && isFinite(a.phiV)) { nd.phV = Number(a.phiV); changed.push(`φV ${nd.phV}°`); }
            if (a.name != null) nd.name = String(a.name).slice(0, 12);
          });
          actions.push(`Node (${x},${y}) ${changed.join(', ') || 'renamed'}`);
          return resultsSummary();
        } },
      { name: 'set_detector', description: 'Place, rename or remove a detector on an edge such as "h(4,3)" or "v(2,4)", optionally with efficiency eta between 0 and 1. Returns the new results.',
        parameters: { type: 'object', properties: { edge: { type: 'string' }, name: { type: 'string' }, remove: { type: 'boolean' }, eta: { type: 'number' } }, required: ['edge'] },
        run: a => {
          const e = parseEdge(a.edge); if (!e) throw new Error('edge must look like h(x,y) or v(x,y)');
          const ok = e.k === 'h' ? (e.x <= S().n && e.y < S().m) : (e.x < S().n && e.y <= S().m); if (!ok) throw new Error('that edge is outside the grid');
          commit(() => {
            const dets = S().dets, i = dets.findIndex(d => d.k === e.k && d.x === e.x && d.y === e.y);
            if (a.remove) { if (i >= 0) dets.splice(i, 1); return; }
            const name = String(a.name || (i >= 0 ? dets[i].name : OGS.canvas.nextDetectorName())).replace(/\s+/g, '_').slice(0, 12);
            const eta = a.eta != null && isFinite(a.eta) ? OGS.clamp(Number(a.eta), 0, 1) : null;
            if (i >= 0) { dets[i].name = name; if (eta != null) dets[i].eta = eta; } else dets.push({ ...e, name, eta });
          });
          actions.push(`${a.remove ? 'Removed detector' : 'Detector'} ${e.k}(${e.x},${e.y})`);
          return resultsSummary();
        } },
      { name: 'set_input', description: 'Replace the input state text. One term per line: "coefficient : modes", for example "1 : h(0,0)+ v(0,0)+". Returns the new results.',
        parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
        run: a => { commit(() => { S().input = String(a.text); }); actions.push('Input state'); if (app.sim.err) throw new Error(app.sim.err); return resultsSummary(); } },
      { name: 'resize_grid', description: 'Change the grid to n columns × m rows (1 to 14). Existing nodes are kept where they fit.',
        parameters: { type: 'object', properties: { n: { type: 'integer' }, m: { type: 'integer' } }, required: ['n', 'm'] },
        run: a => { OGS.render.resize(Number(a.n), Number(a.m)); actions.push(`Grid ${S().n}×${S().m}`); return { grid: [S().n, S().m] }; } },
      { name: 'run_sweep', description: 'Sweep one angle (theta, phiH or phiV, in degrees) of node (x,y) and return detector click probabilities at up to 25 sampled values. The chart is shown to the user.',
        parameters: { type: 'object', properties: { x: { type: 'integer' }, y: { type: 'integer' }, param: { type: 'string', enum: ['theta', 'phiH', 'phiV'] }, from: { type: 'number' }, to: { type: 'number' }, points: { type: 'integer' } }, required: ['x', 'y', 'param'] },
        run: a => {
          const x = Number(a.x), y = Number(a.y); if (!(x >= 0 && x < S().n && y >= 0 && y < S().m)) throw new Error('node is outside the grid');
          const param = { theta: 'th', phiH: 'phH', phiV: 'phV' }[a.param] || 'phH';
          const r = OGS.drawer.runSweep({ x, y, param, from: Number(a.from ?? 0), to: Number(a.to ?? (param === 'th' ? 180 : 360)), steps: OGS.clamp(Number(a.points) || 73, 3, 361) });
          OGS.drawer.show('sweep'); actions.push(`Sweep ${a.param} of (${x},${y})`);
          const stride = Math.max(1, Math.ceil(r.steps / 25)), values = [];
          for (let i = 0; i < r.steps; i += stride) values.push({ value: +r.series[0]?.pts[i][0].toFixed(2), p: Object.fromEntries(r.series.map(se => [se.name, +se.pts[i][1].toFixed(4)])) });
          return { param: a.param, node: [x, y], values };
        } },
    ];
  }

  /* ---------- Groq (OpenAI-compatible chat API with tool calls) ---------- */
  function friendlyGroqError(status, detail) {
    if (status === 401) return 'Groq rejected the key. Check that the whole key was copied (Settings → AI assistant).';
    if (status === 429) return 'The free Groq limit was reached for now. Wait a minute and try again.';
    if (status === 404 || (status === 400 && /model/i.test(detail))) return 'This Groq model is not available. Choose another model in Settings → AI assistant.';
    if (status === 413) return 'The request was too large for this model. Try a smaller setup or another model.';
    return `Groq returned an error${status ? ` (${status})` : ''}${detail ? `: ${detail}` : ''}.`;
  }
  async function groqCall(messages, toolSpecs, signal, toolChoice = 'auto') {
    let res;
    const body = { model: OGS.store.groqModel(), messages, temperature: 0.3, max_tokens: 1500 };
    if (toolSpecs) { body.tools = toolSpecs; body.tool_choice = toolChoice; }
    try {
      res = await fetch(GROQ_URL, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OGS.store.groqKey()}` }, body: JSON.stringify(body) });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      const inClaude = !!(window.claude && typeof window.claude.use === 'function');
      throw new Error(inClaude ? 'Claude blocks connections to Groq. Switch Settings → AI assistant → Use to Claude, or open the downloaded copy.' : 'Could not reach Groq. Check the internet connection and try again.');
    }
    if (!res.ok) { let detail = ''; try { detail = (await res.json())?.error?.message || ''; } catch (e) { /* no details */ } throw new Error(friendlyGroqError(res.status, detail)); }
    return res.json();
  }
  async function askGroq(context, bot, signal) {
    const list = tools(bot.actions);
    const specs = list.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
    const messages = [{ role: 'system', content: RULES }, ...history, { role: 'user', content: context }];
    for (let round = 0; round < 6; round++) {
      const data = await groqCall(messages, specs, signal, round === 5 ? 'none' : 'auto');
      const msg = data?.choices?.[0]?.message || {};
      if (msg.tool_calls?.length) {
        messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
        bot.status = 'Working on the table'; render();
        for (const call of msg.tool_calls) {
          const tool = list.find(t => t.name === call.function?.name);
          let out;
          try { const args = JSON.parse(call.function?.arguments || '{}'); out = tool ? await tool.run(args || {}) : { error: 'unknown tool' }; }
          catch (e) { out = { error: e.message }; }
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(out).slice(0, 12000) });
        }
        continue;
      }
      return msg.content || '(no answer)';
    }
    return '(the assistant stopped after several steps)';
  }
  async function testGroq() {
    if (!OGS.store.groqKey()) throw new Error('Save a key first.');
    const data = await groqCall([{ role: 'user', content: 'Reply with the single word: ready' }], null, undefined);
    const text = (data?.choices?.[0]?.message?.content || '').trim();
    return `Connected to Groq (${OGS.store.groqModel()}). Reply: “${text.slice(0, 40)}”`;
  }

  /* ---------- Claude (only when the page is opened inside Claude) ---------- */
  async function askClaude(context, bot, signal) {
    const list = tools(bot.actions);
    const opts = { signal, onText: ({ text }) => { bot.text = text; renderSoon(); } };
    if (claudeTools) opts.tools = list.map(t => ({ name: t.name, description: t.description, inputSchema: t.parameters, execute: a => { bot.status = 'Working on the table'; renderSoon(); return t.run(a || {}); } }));
    else opts.cache = false;
    try {
      const { text, truncated } = await claudeSample([{ role: 'user', content: RULES }, ...history, { role: 'user', content: context }], opts);
      return text + (truncated ? '\n\n*(answer was cut short)*' : '');
    } catch (e) {
      const code = e && e.code;
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) claudeSample = null;
      if (code === 'tools_unavailable') claudeTools = false;
      const messages = { not_granted: 'Claude was not allowed for this page.', rate_limited: 'Too many requests right now. Wait a moment and try again.', session_expired: 'Your Claude session expired. Sign in again.', refused: 'Claude declined this request. Try rephrasing it.', prompt_too_large: 'The setup is too large to send.' };
      if (code === 'cancelled') { const err = new Error('Stopped.'); err.name = 'AbortError'; err.partial = e.text; throw err; }
      const err = new Error(messages[code] || 'Something went wrong while asking Claude. Try again.'); err.partial = e.text; throw err;
    }
  }

  /* ---------- Sending a question ---------- */
  async function ask(question) {
    question = String(question || '').trim();
    const provider = activeProvider();
    if (!question || busy || provider.startsWith('none')) return;
    chat.push({ role: 'user', text: question });
    const bot = { role: 'bot', text: '', actions: [], status: 'Thinking', provider };
    chat.push(bot);
    const context = `${question}\n\n[Current setup]\n${JSON.stringify(setupSummary())}\n\n[Current results]\n${JSON.stringify(resultsSummary())}`;
    const ctl = new AbortController(); busy = ctl; render();
    try {
      bot.text = provider === 'groq' ? await askGroq(context, bot, ctl.signal) : await askClaude(context, bot, ctl.signal);
      history.push({ role: 'user', content: question }, { role: 'assistant', content: bot.text });
      while (history.length > 12) history.splice(0, 2);
    } catch (e) {
      if (e.partial) bot.text = e.partial;
      bot.error = e.name === 'AbortError' ? (bot.text ? '' : 'Stopped.') : e.message;
    } finally { busy = null; render(); }
  }

  /* ---------- Small Markdown reader for answers ---------- */
  function markdown(src) {
    const lines = String(src).replace(/\r/g, '').split('\n');
    let html = '', list = null, para = [], code = null;
    const inline = t => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:)!?]|$)/g, '$1<i>$2</i>');
    const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
    const flushList = () => { if (list) { html += `<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.t}>`; list = null; } };
    for (const ln of lines) {
      if (code !== null) { if (/^\s*```/.test(ln)) { html += `<pre class="code">${esc(code.join('\n'))}</pre>`; code = null; } else code.push(ln); continue; }
      if (/^\s*```/.test(ln)) { flushPara(); flushList(); code = []; continue; }
      const h = ln.match(/^#{1,4}\s+(.*)/); if (h) { flushPara(); flushList(); html += `<h4>${inline(h[1])}</h4>`; continue; }
      const ul = ln.match(/^\s*[-*•]\s+(.*)/), ol = ln.match(/^\s*\d+[.)]\s+(.*)/);
      if (ul || ol) { flushPara(); const t = ul ? 'ul' : 'ol'; if (!list || list.t !== t) { flushList(); list = { t, items: [] }; } list.items.push((ul || ol)[1]); continue; }
      if (!ln.trim()) { flushPara(); flushList(); continue; }
      if (list && /^\s{2,}/.test(ln)) { list.items[list.items.length - 1] += ' ' + ln.trim(); continue; }
      flushList(); para.push(ln.trim());
    }
    if (code) html += `<pre class="code">${esc(code.join('\n'))}</pre>`;
    flushPara(); flushList();
    return html;
  }

  /* ---------- Drawing the tab ---------- */
  function statusLine() {
    const p = activeProvider();
    if (!ready) return 'Connecting…';
    if (p === 'groq') return `Groq · ${OGS.store.groqModel()}`;
    if (p === 'claude') return claudeTools ? 'Claude · can read and edit your setup' : 'Claude';
    return 'Not connected';
  }
  function setupCard() {
    const p = activeProvider();
    const reason = p === 'none-claude' ? 'Claude is only available when this page is opened inside Claude.' : 'Add a free Groq API key to start. It takes about a minute.';
    return `<div class="ai-setup">${icon('key')}<div><b>Connect an AI</b><p class="hint">${reason}</p>
      <ol class="steps"><li>Get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>.</li><li>Paste it in Settings → AI assistant.</li></ol>
      <button class="btn btn-primary btn-sm" data-open-settings="ai">${icon('key')}Add Groq key</button></div></div>`;
  }
  function render() {
    const pane = $('pane-ai');
    if (!pane.dataset.built) {
      pane.dataset.built = '1';
      pane.innerHTML = `<div class="ai">
        <div class="ai-head"><span class="ai-mark">${icon('sparkles')}</span><div><b>Assistant</b><div class="hint" id="aiStatus"></div></div>
          <button class="icon-btn" data-open-settings="ai" aria-label="AI settings" title="AI settings" style="margin-left:auto">${icon('settings')}</button></div>
        <div class="ai-msgs" id="aiMsgs"></div>
        <div class="ai-suggest" id="aiSuggest">${SUGGESTIONS.map(([s, ic]) => `<button class="menu-item" data-suggest="${esc(s)}">${icon(ic)}<span>${esc(s)}</span></button>`).join('')}</div>
        <div class="ai-composer"><textarea id="aiInput" rows="2" placeholder="Ask about the setup, or ask for a change…" aria-label="Message the assistant"></textarea>
          <div class="ai-composer-bar"><span class="hint" id="aiHint">Enter to send · Shift+Enter for a new line</span><button class="icon-btn ai-send" id="aiSend" aria-label="Send">${icon('send')}</button></div></div>
      </div>`;
    }
    const provider = activeProvider(), can = !provider.startsWith('none') && ready;
    $('aiStatus').textContent = statusLine();
    const send = $('aiSend'); send.disabled = !can && !busy; send.innerHTML = icon(busy ? 'stop' : 'send'); send.setAttribute('aria-label', busy ? 'Stop' : 'Send');
    $('aiInput').disabled = !can;
    $('aiSuggest').hidden = !can || chat.length > 0;
    const box = $('aiMsgs');
    if (!can && ready && !chat.length) { box.innerHTML = setupCard(); return; }
    box.innerHTML = chat.map(m => m.role === 'user' ? `<div class="msg user">${esc(m.text)}</div>` :
      `<div class="msg bot">${m.actions.length ? `<div class="msg-actions">${m.actions.map(a => `<span class="tag blue">${icon('check')}${esc(a)}</span>`).join('')}</div>` : ''}
        ${m.text ? markdown(m.text) : (m.error ? '' : `<span class="thinking"><i></i><i></i><i></i>${esc(m.status)}</span>`)}
        ${m.error ? `<div class="callout bad" style="margin-top:6px">${icon('alert')}<div>${esc(m.error)}</div></div>` : ''}</div>`).join('') + (!can && ready ? setupCard() : '');
    if (app.ui.sideTab === 'ai') box.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }
  let frame = 0;
  function renderSoon() { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; render(); }); }

  function wire() {
    const pane = $('pane-ai');
    pane.addEventListener('click', e => {
      const s = e.target.closest('[data-suggest]'); if (s) { ask(s.dataset.suggest); return; }
      const o = e.target.closest('[data-open-settings]'); if (o) { OGS.settings.open(o.dataset.openSettings); return; }
      if (e.target.closest('#aiSend')) { if (busy) { busy.abort(); return; } const ta = $('aiInput'); const q = ta.value; if (q.trim()) { ta.value = ''; ask(q); } }
    });
    pane.addEventListener('keydown', e => {
      if (e.target.id === 'aiInput' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (busy) return; const q = e.target.value; if (q.trim()) { e.target.value = ''; ask(q); } }
    });
    // Find out whether Claude is available (only inside Claude).
    (async () => {
      try {
        if (window.claude && typeof window.claude.use === 'function') {
          claudeSample = await window.claude.use('sample');
          if (claudeSample) { const lim = await claudeSample.limits().catch(() => null); claudeTools = !!(lim && lim.tools); }
        }
      } catch (e) { claudeSample = null; }
      ready = true; render();
    })();
  }

  OGS.assistant = { render, wire, ask, testGroq, activeProvider };
})();
