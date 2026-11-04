from pathlib import Path
import hashlib
import json
import subprocess
import time
import urllib.request

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
publication=json.loads((OUT/'publication.json').read_text(encoding='utf-8-sig'))
target='public/gamehub-pc-console-demo/index.html'
local=(ROOT/target).read_bytes()
git=subprocess.check_output(['git','show',publication['commit']+':'+target],cwd=ROOT)
assert local==git, 'Published Git blob differs from local HTML'
attempts=[]
for attempt in range(12):
    try:
        request=urllib.request.Request(publication['url'],headers={'Cache-Control':'no-cache','Pragma':'no-cache','User-Agent':'GameHub-preview-verification'})
        with urllib.request.urlopen(request,timeout=20) as response:
            data=response.read()
            current={'attempt':attempt+1,'status':response.status,'mime':response.headers.get_content_type(),'sha256':hashlib.sha256(data).hexdigest()}
        attempts.append(current)
        if data==local and current['mime']=='text/html':
            record={'url':publication['url'],'commit':publication['commit'],'status':200,'mime':current['mime'],'bytes':len(data),'sha256':current['sha256'],'localAndGitMatch':True,'attempts':attempts}
            (OUT/'live-verification.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps(record,ensure_ascii=False))
            break
    except Exception as error:
        attempts.append({'attempt':attempt+1,'error':str(error)})
    if attempt==11:
        raise RuntimeError('Public preview has not reached published version: '+json.dumps(attempts))
    time.sleep(8)
