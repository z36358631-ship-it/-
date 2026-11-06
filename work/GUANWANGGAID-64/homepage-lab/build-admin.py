# 2026.11.6修改：保留后台单文件离线构建，新增类型配置一并内嵌。
from pathlib import Path
import hashlib,json
p=Path(__file__).resolve().parent
html=(p/'admin.template.html').read_text(encoding='utf-8').replace('/*CSS*/',(p/'admin.css').read_text(encoding='utf-8')).replace('/*JS*/',(p/'admin.js').read_text(encoding='utf-8'))
(p/'admin.html').write_text(html,encoding='utf-8')
(p/'admin-build.json').write_text(json.dumps({'output':str(p/'admin.html'),'sha256':hashlib.sha256(html.encode()).hexdigest(),'sources':['admin.template.html','admin.css','admin.js'],'externalResources':0,'revision':'2026.11.6修改'},ensure_ascii=False,indent=2),encoding='utf-8')
print('Built admin.html')
