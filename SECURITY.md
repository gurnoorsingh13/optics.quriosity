# Security

## API keys

The optional AI assistant uses a Groq API key.

- **Never commit a real key.** `config.js` in the repository must contain the placeholder `PASTE_YOUR_GROQ_KEY_HERE`.
- The recommended place for a key is the app itself (Settings → AI assistant). It is stored in that browser's local storage only and is sent only to `api.groq.com`.
- A key written into `config.js` is readable by anyone who receives that copy of the folder, and by every visitor if the folder is published as a website (for example on GitHub Pages). Do not publish a site with a key in `config.js`.
- If a key has been exposed, revoke it at https://console.groq.com/keys and create a new one.

## What the app sends over the network

- Nothing, unless you use the AI assistant. Simulation, exports and saved setups all stay on your computer.
- With Groq: the question, a summary of the current setup and its results are sent to Groq.
- Inside Claude: the same summary is sent to Claude, after you give permission.
- Fonts are loaded from Google Fonts when online; the app works without them.

## Reporting a vulnerability

Please report security problems privately, using GitHub's *Report a vulnerability* button on the repository's Security tab, rather than in a public issue. You can also email **contact@quriositygroup.in** (or **quriositygroup@gmail.com**). We will reply as soon as we can.
