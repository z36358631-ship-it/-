"""Package an independent derived experience without touching the baseline."""
from pathlib import Path
import hashlib
import json
import re

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
BASE = ROOT / 'public/gamehub-70-home-demo/index.html'

def sha(data):
    return hashlib.sha256(data).hexdigest()

original = BASE.read_bytes()
document = original.decode('utf-8').replace('\r\n', '\n')
assert document.count('</style>') == 1, 'Unexpected CSS insertion point'
anchor = '\nrender();\nrestoreCompatibilityReturn();'
position = document.rfind(anchor)
assert position >= 0, 'Missing final application render'
script = (OUT / 'console.js').read_text(encoding='utf-8') + '\n' + (OUT / 'panel.js').read_text(encoding='utf-8')
document = document[:position] + '\n' + script + document[position:]
styles = (OUT / 'console.css').read_text(encoding='utf-8') + '\n' + (OUT / 'review.css').read_text(encoding='utf-8')
document = document.replace('</style>', '\n' + styles + '\n</style>', 1)
document = re.sub(r'<title>.*?</title>', '<title>盖世游戏 · PC 主机体验</title>', document, count=1)
shell = (OUT / 'shell.html').read_text(encoding='utf-8')
start = document.index('<body')
end = document.index('<script>', start)
document = document[:start] + shell + document[end:]
assert sha(BASE.read_bytes()) == sha(original), 'Baseline was unexpectedly modified'
for relative in ['public/gamehub-pc-console-demo/index.html', 'demos/gamehub-pc-console-demo.html']:
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document, encoding='utf-8')
(OUT / 'build-manifest.json').write_text(json.dumps({
    'baseline': str(BASE), 'baselineSha256': sha(original),
    'outputSha256': sha(document.encode('utf-8')), 'bytes': len(document.encode('utf-8')),
    'source': 'User supplied Emuly README and CSS; current published GameHub demo',
    'visualStatus': 'derived design exploration, not pixel replication',
    'capabilities': 'HTML interactions only; no actual PC game execution, save or compatibility proof',
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Built independent PC console demo:', len(document.encode('utf-8')), 'bytes')
