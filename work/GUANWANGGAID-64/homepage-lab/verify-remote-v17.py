import concurrent.futures,hashlib,json,time,urllib.request
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
r=json.loads((HERE/'publication-v17.json').read_text('utf-8'))
def verify(relative):
 local=ROOT/relative;url=r['imageBase']+'/'+local.name
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=35) as response:
    data=response.read();mime=response.headers.get('Content-Type','')
    assert response.status==200 and mime.startswith('image/'),mime
    assert data==local.read_bytes(),'remote bytes mismatch'
    return {'file':relative,'url':url,'http':200,'mime':mime,'sha256':hashlib.sha256(data).hexdigest(),'status':'passed'}
  except Exception as e:
   if attempt==2:return {'file':relative,'url':url,'status':'failed','error':str(e)}
   time.sleep(2)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:checks=list(pool.map(verify,r['imageFiles']))
result={'status':'passed' if all(x['status']=='passed' for x in checks) else 'failed','checks':checks,'imageCommit':r['imageCommit']}
(HERE/'remote-images-v17.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps({'status':result['status'],'images':len(checks),'failed':[c for c in checks if c['status']!='passed']},ensure_ascii=False))
assert result['status']=='passed'
