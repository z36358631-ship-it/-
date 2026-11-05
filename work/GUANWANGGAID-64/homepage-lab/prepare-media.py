import base64
import hashlib
import io
import json
import pathlib
import re
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[3]
HERE = pathlib.Path(__file__).resolve().parent
SOURCE = ROOT / 'public/gamehub-pc-console-demo/index.html'
text = SOURCE.read_text(encoding='utf-8')

def object_value(name):
    match = re.search(r'const ' + re.escape(name) + r'\s*=\s*(\{[^\n]+\});', text)
    if not match:
        raise ValueError(name)
    return json.loads(match.group(1))

def string_value(name):
    match = re.search(r'const ' + re.escape(name) + r'\s*=\s*("[^\n]+?");', text)
    if not match:
        raise ValueError(name)
    return json.loads(match.group(1))

assets = object_value('ASSETS')
scenes = object_value('CONSOLE_SCENES')
media = {}
for key in ['elden', 'hades', 'cyber', 'wukong', 'village', 'horizon']:
    media['cover-' + key] = assets[key]
for key, uri in scenes.items():
    media['scene-' + key] = uri
for key in ['icon-home', 'icon-community', 'icon-library', 'icon-profile', 'icon-ranking', 'icon-search', 'icon-bell', 'icon-device']:
    media[key] = assets[key]
media['compatibility'] = string_value('HOME_PLAY_COMPATIBILITY_ICONS')
media['clip-hades'] = string_value('HOME_PLAY_CLIP')
media['poster-hades'] = string_value('HOME_PLAY_POSTER')
records = []
for key, uri in media.items():
    raw = base64.b64decode(uri.split(',', 1)[1])
    item = {'key': key, 'mime': uri[5:uri.index(';')], 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'source': str(SOURCE.relative_to(ROOT))}
    if uri.startswith('data:image/'):
        with Image.open(io.BytesIO(raw)) as image:
            item['dimensions'] = list(image.size)
    records.append(item)
(HERE / 'media.json').write_text(json.dumps(media, ensure_ascii=False), encoding='utf-8')
(HERE / 'sources.json').write_text(json.dumps({
    'date': '2026-11-05', 'kind': 'candidate-homepage-directions',
    'baseline': 'public/gamehub-pc-console-demo/index.html',
    'referenceScreens': ['screen-08', 'screen-15', 'screen-36'],
    'components': {'C-SHELL-P': 'measured baseline / derived concept', 'C-SHELL-L': 'measured baseline / derived concept', 'D-GAME-CARD': 'derived', 'C-BUTTON-GLOW': 'derived'},
    'claims': {'media': 'Existing registered local game artwork/official gameplay, not proof of Android/iOS compatibility or cloud supply.', 'compatibility': 'Reference visual only; all game/device results in this lab are fixtures.', 'paidService': 'screen-15 proves a time/recharge entry, but no confirmed package price. No invented memberships or payment.', 'feedback': 'AI scenario walkthroughs, not recruited users or observed retention.'},
    'assets': records
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'assets': len(records), 'bytes': sum(x['bytes'] for x in records)}))
