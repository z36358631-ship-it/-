from pathlib import Path
import base64,json,shutil
base=Path(__file__).resolve().parent
root=base.parents[1]
(base/'evidence').mkdir(exist_ok=True)
(base/'assets').mkdir(exist_ok=True)
icons={}
for p in (root/'demos/帮助中心/assets').glob('*.png'):
 if p.stem not in ['example']:
  shutil.copy2(p,base/'assets'/p.name)
  icons[p.stem]='data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
css=(root/'demos/帮助中心/src/app.css').read_text(encoding='utf-8')
html=(base/'src.html').read_text(encoding='utf-8').replace('/* BASE_CSS */',css).replace('/* ICON_DATA */',json.dumps(icons))
(base/'深色模式demo.html').write_text(html,encoding='utf-8')
manifest=json.loads((root/'demos/帮助中心/assets/source-manifest.json').read_text(encoding='utf-8-sig'))
manifest.update({'taskBaseline':'.tmp_taskboard/GUANWANGGAID-51-source.jpg','sourceSize':[1116,2480],'newThemeIcon':'缺少已登记原始资源，不增加独立图标，沿用文字行且保留标签对齐','lightTheme':'derived','landscape':'derived','selectionContainer':'screen-35 模式切换单选 Sheet 配方，按三项即时生效需求调整；无确认按钮'})
(base/'assets/source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(base/'深色模式demo.html')
