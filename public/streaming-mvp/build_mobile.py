"""Build only the independent mobile demo, preserving the historical shared sources."""
from pathlib import Path
import base64
import re

root = Path(__file__).parent
source = (root / 'build_replica.py').read_text(encoding='utf-8')
css_line = source[source.index('css='):source.index(';js=')]
js_line = source[source.index(';js='):source.index('\nfor name,platform')]
css_names = re.findall(r"R/'([^']+\.css)'", css_line)
js_names = re.findall(r"R/'([^']+\.js)'", js_line)
css = '\n'.join((root / name).read_text(encoding='utf-8') for name in css_names + ['mobile-independent.css', 'remote-scan.css', 'remote-personal.css', 'remote-office-mobile.css', 'remote-language.css'])
js = '\n'.join((root / name).read_text(encoding='utf-8') for name in js_names + ['vendor/jsqr.js', 'remote-qr-bridge.js', 'remote-support.js', 'mobile-independent.js', 'remote-scan.js', 'mobile-personal.js', 'remote-office-mobile.js', 'remote-language.js'])
# Real repository brand asset; embed unchanged for the offline single-file preview.
logo = 'data:image/svg+xml;base64,' + base64.b64encode((root.parents[1] / 'demos' / 'logo.svg').read_bytes()).decode('ascii')
html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>盖世远程 · 独立移动 App Demo</title><style>' + css + '</style></head><body><div id="app"></div><script>const DEFAULT_PLATFORM="app";const MOBILE_GAMEHUB_LOGO="' + logo + '";\n' + js + '</script></body></html>'
(root / 'mobile.html').write_text(html, encoding='utf-8')
print('Built mobile.html only; mac.html and demo.html unchanged.')
