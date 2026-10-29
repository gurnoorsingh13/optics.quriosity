"""
tools/build_component_art.py — rebuilds scripts/ui/component-art.js from the
SVG drawings in assets/components/.

WHEN TO RUN IT
  Only after replacing or adding a drawing in assets/components/.
  Run from the project folder:   python tools/build_component_art.py

WHAT IT DOES
  Each SVG becomes a <symbol> with the id "sym-<file name>", so the table can
  draw, rotate and resize it. Gradient ids are made unique per drawing.
  Illustrator exports are cleaned (metadata and editor-only attributes removed).
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'components'
OUT = ROOT / 'scripts' / 'ui' / 'component-art.js'

def clean(text, stem):
    view_box = re.search(r'viewBox="([^"]+)"', text).group(1)
    body = text.split('</metadata>', 1)[1] if '</metadata>' in text else re.sub(r'^.*?<svg[^>]*>', '', text, flags=re.S)
    body = body.rsplit('</svg>', 1)[0]
    body = re.sub(r'<a:midPointStop[^>]*/>', '', body)
    body = re.sub(r'\s(i|a|x|graph):[\w-]+="[^"]*"', '', body)
    body = re.sub(r'\s+', ' ', body).replace('> <', '><').strip()
    for gid in set(re.findall(r'id="([^"]+)"', body)):
        if gid.startswith(stem + '_'):
            continue
        body = body.replace(f'id="{gid}"', f'id="{stem}_{gid}"').replace(f'url(#{gid})', f'url(#{stem}_{gid})')
    return view_box, body

symbols = {}
for svg in sorted(SRC.glob('*.svg')):
    stem = svg.stem.split('-', 1)[-1]           # "b-bsp" -> "bsp", "e-pd1" -> "pd1"
    vb, body = clean(svg.read_text(encoding='utf-8', errors='replace'), stem)
    symbols[stem] = {'viewBox': vb, 'body': body, 'file': svg.name}

header = '''/* ============================================================================
   scripts/ui/component-art.js  —  Drawings of the optical components
   ----------------------------------------------------------------------------
   GENERATED FILE. Do not edit by hand: change the SVG files in
   assets/components/ and run   python tools/build_component_art.py

   The drawings come from ComponentLibrary by Alexander Franzen, licensed
   CC BY-NC 3.0 (see assets/components/LICENSE.md). They are placed once in
   the page as <symbol> elements; the table draws them with <use>.
   ============================================================================ */
'''
js = header + '''
(() => {
  const ART = ''' + json.dumps(symbols, indent=2, ensure_ascii=False) + ''';

  // Size of each drawing (width / height) so the table can keep proportions.
  const ratio = {};
  let sprite = '';
  for (const [id, a] of Object.entries(ART)) {
    const [, , w, h] = a.viewBox.split(/\\s+/).map(Number);
    ratio[id] = w / h;
    sprite += `<symbol id="sym-${id}" viewBox="${a.viewBox}">${a.body}</symbol>`;
  }
  // Put the symbols into the page once (hidden), so every drawing can use them.
  function install() {
    if (document.getElementById('component-sprite')) return;
    const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    holder.id = 'component-sprite';
    holder.setAttribute('aria-hidden', 'true');
    holder.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    holder.innerHTML = sprite;
    document.body.prepend(holder);
  }
  if (document.body) install(); else document.addEventListener('DOMContentLoaded', install);

  // A small icon (for menus and the legend) showing one drawing.
  const artIcon = (id, size = 16) => {
    const r = ratio[id] || 1, w = r >= 1 ? 20 : 20 * r, h = r >= 1 ? 20 / r : 20;
    return `<svg class="i art" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><use href="#sym-${id}" x="${(24 - w) / 2}" y="${(24 - h) / 2}" width="${w}" height="${h}"/></svg>`;
  };

  OGS.art = { ratio, sprite, artIcon, ids: Object.keys(ART) };
})();
'''
OUT.write_text(js, encoding='utf-8')
print(f'wrote {OUT.relative_to(ROOT)} with symbols: ' + ', '.join(symbols))
