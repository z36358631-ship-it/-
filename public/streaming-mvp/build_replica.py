from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).parent
S=R.parent/'真机体验-20260924/screenshots'
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',30)
sources={1:'list',2:'all',8:'busy',11:'takeover',18:'more',83:'detail',85:'operation',87:'display',130:'keyboard',181:'files',203:'file-done',968:'offline'}
manifest=[]
for n,name in sources.items():
    f=next(S.glob(f'{n:03}-*.png'));im=Image.open(f).convert('RGB');d=ImageDraw.Draw(im)
    def redact(box,text='测试设备'):
        d.rectangle(box,fill='#edf2f5')
        if text:d.text((box[0]+5,box[1]+3),text,font=font,fill='#515a64')
    if n==1:
        for i,(y,h) in enumerate([(415,105),(660,105),(905,105),(1280,130),(1530,130)]):redact((428,y,1040,y+h),'测试设备 '+str(i+1))
    elif n==2:
        for y in [415,580,745,910,1075,1410,1575,1740,1905]:redact((205,y,900,y+68))
    elif n in [8,11,83,968]:
        redact((330,145,928,231),'测试 Mac' if n==968 else '测试电脑')
        if n in [8,11]:redact((184,635,872,776),'测试主控设备')
    elif n in [85,87]:
        redact((0,875,1116,1430),'远程桌面内容已遮挡')
    elif n==130:redact((0,875,1116,1570),'远程桌面内容已遮挡')
    elif n in [181,203]:
        redact((375,105,850,220),'测试电脑')
        redact((0,2260,1116,2440),'电脑文件保存位置（路径已脱敏）')
        if n==203:
            redact((230,870,1025,935),'测试文件 A.txt')
            redact((230,1190,1025,1255),'测试文件 B.txt')
    im.save(R/'assets'/('uu-'+name+'.png'),optimize=True)
    manifest.append({'file':'uu-'+name+'.png','step':n,'source':f.name,'redacted':True})
(R/'replica-source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
css=(R/'replica.css').read_text(encoding='utf8')+'\n'+(R/'integration.css').read_text(encoding='utf8')+'\n'+(R/'entry-options.css').read_text(encoding='utf8')+'\n'+(R/'mac-split.css').read_text(encoding='utf8')+'\n'+(R/'remote-controls.css').read_text(encoding='utf8')+'\n'+(R/'mac-home.css').read_text(encoding='utf8')+'\n'+(R/'mac-session.css').read_text(encoding='utf8');js=(R/'replica-icons.js').read_text(encoding='utf8')+'\n'+(R/'home-media.js').read_text(encoding='utf8')+'\n'+(R/'integration.js').read_text(encoding='utf8')+'\n'+(R/'entry-options.js').read_text(encoding='utf8')+'\n'+(R/'mac-split.js').read_text(encoding='utf8')+'\n'+(R/'remote-controls.js').read_text(encoding='utf8')+'\n'+(R/'mac-home-media.js').read_text(encoding='utf8')+'\n'+(R/'mac-home.js').read_text(encoding='utf8')+'\n'+(R/'mac-session-media.js').read_text(encoding='utf8')+'\n'+(R/'mac-session.js').read_text(encoding='utf8')+'\n'+(R/'replica.js').read_text(encoding='utf8')
for name,platform in [('demo','app'),('mobile','app'),('mac','mac')]:
    html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>盖世远程 · UU 流程对照</title><style>'+css+'</style></head><body><div id="app"></div><script>const DEFAULT_PLATFORM="'+platform+'";\n'+js+'</script></body></html>'
    (R/(name+'.html')).write_text(html,encoding='utf8')
print('Built 3 standalone demos and '+str(len(manifest))+' redacted reference images')
