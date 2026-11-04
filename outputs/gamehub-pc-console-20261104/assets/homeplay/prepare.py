from pathlib import Path
import urllib.request, json, hashlib, concurrent.futures, subprocess
OUT=Path(__file__).resolve().parent
BASE='https://video.akamai.steamstatic.com/store_trailers/1145360/312747/37b96035b5c9c7b12455eadc7bbc7d2b3afbd2fd/1750627553/'
parts=['dash_h264/init-stream3.m4s']+[f'dash_h264/chunk-stream3-{i:05}.m4s' for i in [5,6,7,8]]
def get(part):
    data=urllib.request.urlopen(BASE+part,timeout=25).read()
    (OUT/Path(part).name).write_bytes(data)
    return data
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    blobs=list(pool.map(get,parts))
original=b''.join(blobs)
(OUT/'hades-source-fragments.mp4').write_bytes(original)
ffmpeg='C:/Users/z3635/AppData/Local/kzip_sogou/ffmpeg.exe'
subprocess.run([ffmpeg,'-hide_banner','-loglevel','warning','-y','-i',str(OUT/'hades-source-fragments.mp4'),'-t','8','-an','-vf','trim=start=2:end=10,setpts=PTS-STARTPTS','-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'hades-gameplay.mp4')],check=True)
for sec in [0,3,6]:
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(sec),'-i',str(OUT/'hades-gameplay.mp4'),'-frames:v','1',str(OUT/f'hades-frame-{sec}.jpg')],check=True)
result=(OUT/'hades-gameplay.mp4').read_bytes()
record={'appId':1145360,'game':'Hades','title':'Hades - v1.0 Gameplay Showcase','movieId':256801288,'sourceApi':'https://store.steampowered.com/api/appdetails?appids=1145360&l=english','sourceHls':BASE+'hls_264_master.m3u8?t=1600353474','sourceVariant':BASE+'hls_264_3_video.m3u8','segments':[BASE+p for p in parts],'clipStartSeconds':14,'clipEndSeconds':22,'originalFragmentSha256':hashlib.sha256(original).hexdigest(),'output':'outputs/gamehub-pc-console-20261104/assets/homeplay/hades-gameplay.mp4','outputSha256':hashlib.sha256(result).hexdigest(),'bytes':len(result),'processing':'Official gameplay footage, excerpt only; audio removed; H264 recompression; 640x360. No generated frames or mobile emulator performance claims.','notMobileEmulatorTest':True}
(OUT/'source.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(record,ensure_ascii=True))
