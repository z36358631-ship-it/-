"""Package an independent derived experience without touching the baseline."""
from pathlib import Path
import hashlib
import json
import re
import base64

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
scene_sources=json.loads((OUT/'scene-sources.json').read_text(encoding='utf-8-sig'))
scenes={key:'data:image/jpeg;base64,'+base64.b64encode((ROOT/source['path']).read_bytes()).decode('ascii') for key,source in scene_sources.items()}
clip='data:video/mp4;base64,'+base64.b64encode((OUT/'assets/homeplay/hades-gameplay.mp4').read_bytes()).decode('ascii')
poster='data:image/jpeg;base64,'+base64.b64encode((OUT/'assets/homeplay/hades-frame-0.jpg').read_bytes()).decode('ascii')
script = 'const CONSOLE_SCENES='+json.dumps(scenes)+';\nconst HOME_PLAY_CLIP='+json.dumps(clip)+';\nconst HOME_PLAY_POSTER='+json.dumps(poster)+';\n'+'\n'.join((OUT/name).read_text(encoding='utf-8') for name in ['console.js','immersive.js','device.js','header.js','homeplay.js','panel.js'])
document = document[:position] + '\n' + script + document[position:]
styles = '\n'.join((OUT/name).read_text(encoding='utf-8') for name in ['console.css','immersive.css','device.css','header.css','review.css','homeplay.css'])
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
    target.write_text(document, encoding='utf-8', newline='\n')
(OUT / 'build-manifest.json').write_text(json.dumps({
    'baseline': str(BASE), 'baselineSha256': sha(original),
    'outputSha256': sha(document.encode('utf-8')), 'bytes': len(document.encode('utf-8')),
    'source': 'User supplied Emuly README/CSS, native header and device screenshots; existing GameHub demo; official Steam scenes and Hades gameplay excerpt',
    'homepage': 'Play-first homepage, review-only new/returning profiles; installation and history fixtures; wide navigation library first',
    'gameplay': '8-second muted official Hades footage, embedded; not a mobile emulator benchmark',
    'forms': ['portrait','landscape','tablet','duo'],
    'systems': 'Android and iOS appearance; conceptual Duo uses iOS',
    'visualStatus': 'derived design exploration, not pixel replication',
    'capabilities': 'HTML interactions only; no actual PC game execution, save or compatibility proof',
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Built independent PC console demo:', len(document.encode('utf-8')), 'bytes')
