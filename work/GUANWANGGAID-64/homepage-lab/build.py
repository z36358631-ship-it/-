import hashlib
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TARGET = ROOT / 'public/gamehub-home-lab/index.html'

def build():
    template = (HERE / 'app.html').read_text(encoding='utf-8')
    css = '\n'.join((HERE / name).read_text(encoding='utf-8') for name in ['app.css','retention.css','concepts.css','purchase.css','conversion.css'])
    js = '\n;\n'.join((HERE / name).read_text(encoding='utf-8') for name in ['retention.js','purchase.js','conversion.js','concepts.js','app.js'])
    media = (HERE / 'media.json').read_text(encoding='utf-8')
    for marker in ['<!--STYLE-->', '<!--MEDIA-->', '<!--SCRIPT-->']:
        if template.count(marker) != 1:
            raise ValueError('Missing or repeated marker: ' + marker)
    html = template.replace('<!--STYLE-->', css).replace('<!--MEDIA-->', 'window.LAB_MEDIA=' + media.replace('</', '<\\/') + ';').replace('<!--SCRIPT-->', js)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(html, encoding='utf-8',newline='\n')
    record = {'version': '2026-11-05-home-lab-r5', 'target': str(TARGET.relative_to(ROOT)), 'bytes': TARGET.stat().st_size, 'sha256': hashlib.sha256(TARGET.read_bytes()).hexdigest(), 'runtime': 'offline single HTML, no external assets', 'directions': ['value', 'play', 'content']}
    (HERE / 'build-manifest.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(record, ensure_ascii=False))

if __name__ == '__main__':
    build()
