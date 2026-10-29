/* ============================================================================
   config.js  —  YOUR SETTINGS for optics.quriosity
   ----------------------------------------------------------------------------
   This is the only file you normally need to change.

   HOW TO EDIT
     1. Right-click this file → Open with → Notepad (or any text editor).
     2. Change a value between the quote marks "like this".
     3. Save the file, then refresh the simulator page in your browser (F5).

   RULES
     • Keep the quote marks around text values.
     • Keep the comma at the end of each line.
     • Lines that start with  //  are notes for you; the computer ignores them.
     • If something breaks, undo your change: the page shows a message when
       this file cannot be read.

   Everything here can ALSO be changed inside the app (Settings, bottom-left).
   Values typed in the app are remembered by your browser and win over the
   values below.
   ============================================================================ */

window.OGS_CONFIG = {

  /* --------------------------------------------------------------------------
     1. AI ASSISTANT  (free, optional)
     --------------------------------------------------------------------------
     The Assistant tab can explain your setup and change it for you. It runs on
     Groq, which offers a free API key:

       a) Open  https://console.groq.com/keys  and sign in (Google works).
       b) Click "Create API Key", give it any name, and copy the key.
          It starts with  gsk_
       c) Paste it between the quotes below, replacing PASTE_YOUR_GROQ_KEY_HERE.

     PRIVACY: anyone who receives this folder can read a key written here.
     If you share the folder, paste the key in the app instead
     (Settings → AI assistant): that copy stays in your browser only.
     -------------------------------------------------------------------------- */
  GROQ_API_KEY: "PASTE_YOUR_GROQ_KEY_HERE",

  // Which Groq model answers. "llama-3.3-70b-versatile" is a good free default.
  // Other free choices: "openai/gpt-oss-120b", "openai/gpt-oss-20b",
  //                     "llama-3.1-8b-instant" (fastest, less precise).
  GROQ_MODEL: "llama-3.3-70b-versatile",

  // Which AI to use:
  //   "auto"   → Groq if a key is set, otherwise Claude (when opened inside Claude)
  //   "groq"   → always Groq
  //   "claude" → always Claude (works only when the page is opened inside Claude)
  AI_PROVIDER: "auto",

  /* --------------------------------------------------------------------------
     2. START-UP
     -------------------------------------------------------------------------- */
  // Experiment shown the first time the page opens. Choose one of:
  //   "wigner", "mzi", "hom", "bomb", "bs", "dc", "qs", "empty"
  START_EXPERIMENT: "wigner",

  // Colour theme: "system" (follows your computer), "light" or "dark".
  THEME: "system",

  /* --------------------------------------------------------------------------
     3. SIMULATION DEFAULTS
     -------------------------------------------------------------------------- */
  // Largest number of time steps a run may take before it stops by itself.
  DEFAULT_MAX_STEPS: 40,

  // How numbers are written: "exact" (√2/2), "decimal" (0.7071) or "polar" (0.7071∠90°).
  NUMBER_FORMAT: "exact",
};
