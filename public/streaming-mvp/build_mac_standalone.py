"""只构建独立电脑端，绝不改写移动端产物。"""
from pathlib import Path
import re

root = Path(__file__).parent
builder = (root / 'build_replica.py').read_text(encoding='utf-8')
css_section = builder.split('css=', 1)[1].split(';js=', 1)[0]
js_section = builder.split(';js=', 1)[1].split('\nfor name,platform', 1)[0]
names = lambda section: re.findall(r"R/'([^']+)'", section)
css = '\n'.join((root / name).read_text(encoding='utf-8') for name in names(css_section))
js = '\n'.join((root / name).read_text(encoding='utf-8') for name in names(js_section))
css += '\n' + (root / 'standalone-mac.css').read_text(encoding='utf-8') + '\n' + (root / 'remote-scan.css').read_text(encoding='utf-8') + '\n' + (root / 'remote-personal.css').read_text(encoding='utf-8') + '\n' + (root / 'mac-window.css').read_text(encoding='utf-8') + '\n' + (root / 'remote-language.css').read_text(encoding='utf-8')
# 为电脑端保存已有三个 UI 定时器句柄，退出账号时停止，登录后重启。
js = js.replace('setInterval(', 'standaloneMacInterval(')
interval_prelude = '''const standaloneMacIntervals=[];
function standaloneMacInterval(callback,delay){const entry={callback,delay,id:setInterval(callback,delay)};standaloneMacIntervals.push(entry);return entry.id;}
function stopStandaloneMacIntervals(){for(const entry of standaloneMacIntervals){clearInterval(entry.id);entry.id=null;}}
function resumeStandaloneMacIntervals(){for(const entry of standaloneMacIntervals){if(entry.id===null)entry.id=setInterval(entry.callback,entry.delay);}}
'''
js = interval_prelude + js + '\n' + (root / 'vendor/qrcode-generator.js').read_text(encoding='utf-8') + '\n' + (root / 'remote-qr-bridge.js').read_text(encoding='utf-8') + '\n' + (root / 'remote-support.js').read_text(encoding='utf-8') + '\n' + (root / 'standalone-mac.js').read_text(encoding='utf-8') + '\n' + (root / 'mac-personal.js').read_text(encoding='utf-8') + '\n' + (root / 'mac-window.js').read_text(encoding='utf-8') + '\n' + (root / 'remote-language.js').read_text(encoding='utf-8')
html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>盖世远程 · 独立电脑客户端 Demo</title><style>' + css + '</style></head><body><div id="app"></div><script>const DEFAULT_PLATFORM="mac";\n' + js + '</script></body></html>'
(root / 'mac.html').write_text(html, encoding='utf-8')
print('Built mac.html only: standalone remote client')
