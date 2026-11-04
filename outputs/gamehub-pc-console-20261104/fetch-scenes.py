"""Collect unmodified official Steam screenshots for the derived prototype."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import urllib.request

OUT=Path(__file__).resolve().parent
DEST=OUT/'assets/scenes'
DEST.mkdir(parents=True,exist_ok=True)
GAMES={'elden':1245620,'hades':1145360,'cyber':1091500,'wukong':2358720}

def request(url):
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept-Language':'en-US,en;q=0.9'})
    with urllib.request.urlopen(req,timeout=35) as response:
        return response.read()

def collect(item):
    key,appid=item
    details=json.loads(request(f'https://store.steampowered.com/api/appdetails?appids={appid}&cc=us&l=english'))
    assert details[str(appid)]['success'],key
    screenshots=details[str(appid)]['data']['screenshots']
    source=screenshots[0]['path_full']
    data=request(source)
    assert data[:2]==b'\xff\xd8',f'{key}: expected JPEG'
    (DEST/(key+'.jpg')).write_bytes(data)
    return key,{'appid':appid,'path':f'outputs/gamehub-pc-console-20261104/assets/scenes/{key}.jpg','source':source,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'kind':'official store scene screenshot, static preview only'}

with ThreadPoolExecutor(max_workers=4) as pool:
    sources=dict(pool.map(collect,GAMES.items()))
(OUT/'scene-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({key:{'bytes':value['bytes'],'source':value['source']} for key,value in sources.items()}))
