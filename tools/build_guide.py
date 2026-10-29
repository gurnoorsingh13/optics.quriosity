"""
tools/build_guide.py — turns docs/GUIDE.md into docs/guide.html (the guide
opened by the app's Guide button).

Run from the project folder after editing docs/GUIDE.md:
    pip install markdown        (once)
    python tools/build_guide.py
"""
import pathlib, re
import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / 'docs' / 'GUIDE.md').read_text(encoding='utf-8')
title_line, _, rest = src.partition('\n')
lead, _, body_md = rest.strip().partition('\n\n')

md = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc'], extension_configs={'toc': {'toc_depth': '2'}})
body = md.convert(body_md)
nav = ''.join(f'<a href="#{i}">{t}</a>' for i, t in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body))

STYLE = """
:root{--bg:#fff;--side:#f8f8f7;--text:#2f2e2b;--text2:#6f6e69;--text3:#a19f9a;--border:rgba(55,53,47,.1);--code:#f6f6f4;--accent:#2383e2;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#000;--side:#0a0a0a;--text:#ededed;--text2:#a1a1a1;--text3:#6b6b6b;--border:rgba(255,255,255,.09);--code:#111;--accent:#3b9eff;color-scheme:dark}}
*{box-sizing:border-box} html{scroll-behavior:smooth;scroll-padding-top:20px}
body{margin:0;background:var(--bg);color:var(--text);font:15.5px/1.7 Inter,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:100vh}
nav{position:sticky;top:0;height:100vh;overflow:auto;background:var(--side);border-right:1px solid var(--border);padding:28px 18px}
nav .brand{font-weight:600;font-size:14px;margin:0 8px 18px}
nav a{display:block;padding:5px 8px;border-radius:6px;color:var(--text2);text-decoration:none;font-size:13.5px}
nav a:hover{background:rgba(127,127,127,.12);color:var(--text)}
main{max-width:820px;padding:56px 56px 120px;margin:0 auto;width:100%}
h1{font-size:38px;line-height:1.15;letter-spacing:-.025em;margin:0 0 8px;font-weight:700}
.lead{color:var(--text2);font-size:16.5px;margin:0 0 36px}
h2{font-size:24px;letter-spacing:-.015em;margin:56px 0 12px;padding-top:8px;border-top:1px solid var(--border);font-weight:650}
p{margin:0 0 14px} ul,ol{margin:0 0 16px;padding-left:22px} li{margin:4px 0}
a{color:var(--accent)} strong{font-weight:600}
code{font:13px "JetBrains Mono",Consolas,monospace;background:var(--code);padding:2px 5px;border-radius:4px;border:1px solid var(--border)}
pre{background:var(--code);border:1px solid var(--border);border-radius:8px;padding:14px 16px;overflow:auto} pre code{border:0;padding:0;background:none}
.team-photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;margin:8px 0 24px}.team-photos figure{margin:0}.team-photos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;border:1px solid var(--border);display:block}.team-photos figcaption{margin-top:8px;font-size:13.5px;line-height:1.4}.team-photos figcaption b{display:block}.team-photos figcaption span{color:var(--text2)}
table{border-collapse:collapse;width:100%;margin:6px 0 20px;font-size:14px;display:block;overflow-x:auto}
th{text-align:left;font-weight:500;color:var(--text3);font-size:12.5px;border-bottom:1px solid var(--border);padding:8px 12px 8px 0;white-space:nowrap}
td{border-bottom:1px solid var(--border);padding:9px 12px 9px 0;vertical-align:top}
.formula{font:16px "Cambria Math","Times New Roman",serif;background:var(--code);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin:0 0 16px;overflow-x:auto}
@media (max-width:860px){.wrap{grid-template-columns:1fr} nav{position:static;height:auto;border-right:0;border-bottom:1px solid var(--border)} main{padding:32px 18px 80px} h1{font-size:30px}}
"""
# The Q mark from assets/brand, drawn in the text colour so it suits light and dark mode.
import re as _re
_mark = (ROOT / 'assets' / 'brand' / 'quriosity-mark-black.svg').read_text(encoding='utf-8')
LOGO = '<svg viewBox="%s" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="%s"/></svg>' % (
    _re.search(r'viewBox="([^"]+)"', _mark).group(1), ' '.join(_re.findall(r'<path[^>]*\sd="([^"]+)"', _mark)))
STYLE += ".brand{display:flex;align-items:center;gap:9px;color:var(--text);text-decoration:none;margin-bottom:18px}.brand svg{height:24px;width:auto}.brand span{font-weight:650;font-size:15px;letter-spacing:-.015em}.brand b{font-weight:450;color:var(--text2)}"
html = f"""<!doctype html>
<!-- docs/guide.html — GENERATED from docs/GUIDE.md by tools/build_guide.py. Edit GUIDE.md, then rebuild. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Guide · optics.quriosity</title>
<link rel="icon" type="image/svg+xml" href="../assets/brand/favicon.svg">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>{STYLE}</style></head><body><div class="wrap">
<nav aria-label="Contents"><a class="brand" href="../index.html" aria-label="optics.quriosity: back to the simulator">{LOGO}<span>optics<b>.quriosity</b></span></a>{nav}<a href="../index.html" style="margin-top:14px;color:var(--text)">← Back to the simulator</a></nav>
<main><h1>Complete guide</h1><p class="lead">{lead}</p>
{body}</main></div></body></html>
"""
(ROOT / 'docs' / 'guide.html').write_text(html, encoding='utf-8')
print('wrote docs/guide.html')
