"""
tools/build_brand.py — rebuilds scripts/ui/brand-art.js from the logo files in
assets/brand/.

WHEN TO RUN IT
  Only after replacing the logo. Run from the project folder:
      python tools/build_brand.py

WHAT IT READS
  assets/brand/quriosity-logo-black.svg   the full logo (wordmark and "begins here")
  assets/brand/quriosity-mark-black.svg   the Q question-mark on its own
  Each must be a single-colour SVG: one or more <path> elements with a
  viewBox. Colours in the files are ignored; the app draws the logo in the
  text colour of the current theme, so it works in light and dark mode.

WHAT IT WRITES
  scripts/ui/brand-art.js, which the page loads. Keeping the logo in a script
  (rather than loading the .svg files) lets the page work when it is opened
  directly from the folder.
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'brand'
OUT = ROOT / 'scripts' / 'ui' / 'brand-art.js'


def read(name):
    text = (SRC / name).read_text(encoding='utf-8')
    view_box = re.search(r'viewBox="([^"]+)"', text).group(1)
    paths = re.findall(r'<path[^>]*\sd="([^"]+)"', text)
    if not paths:
        raise SystemExit(f'{name}: no <path> found')
    return {'viewBox': view_box, 'd': ' '.join(paths)}


art = {'logo': read('quriosity-logo-black.svg'), 'mark': read('quriosity-mark-black.svg')}

header = '''/* ============================================================================
   scripts/ui/brand-art.js  —  The Quriosity logo, ready to draw
   ----------------------------------------------------------------------------
   GENERATED FILE: do not edit by hand. To change the logo, replace the files
   in assets/brand/ and run   python tools/build_brand.py

   OGS.brand.svg('logo' | 'mark', { height, className, label }) returns an
   inline <svg> drawn in the current text colour (currentColor).
   ============================================================================ */
'''

body = '''(() => {
  const ART = %s;
  function svg(id, opts = {}) {
    const a = ART[id];
    const h = opts.height ? ` height="${opts.height}"` : '';
    const label = opts.label ? `role="img" aria-label="${opts.label}"` : 'aria-hidden="true"';
    return `<svg class="brand-${id} ${opts.className || ''}" viewBox="${a.viewBox}"${h} ${label} xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="${a.d}"/></svg>`;
  }
  OGS.brand = { svg, ART };
})();
''' % json.dumps(art, separators=(',', ':'))

OUT.write_text(header + body, encoding='utf-8')
print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)')
