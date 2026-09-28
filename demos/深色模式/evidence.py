from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json
from skimage.metrics import structural_similarity
from skimage.feature import canny
from skimage.color import rgb2lab,deltaE_ciede2000
base=Path(__file__).resolve().parent;root=base.parents[1];ev=base/'evidence'
a=Image.open(root/'.tmp_taskboard/GUANWANGGAID-51-source.jpg').convert('RGB');b=Image.open(ev/'settings-baseline-dom.png').convert('RGB');assert a.size==b.size
a.save(ev/'settings-original.png');Image.blend(a,b,.5).save(ev/'settings-overlay.png')
diff=np.abs(np.asarray(a).astype(float)-np.asarray(b).astype(float));Image.fromarray(diff.astype('uint8')).save(ev/'settings-difference.png')
heat=np.zeros((*diff.shape[:2],3),dtype='uint8');heat[:,:,0]=np.clip(diff.mean(axis=2)*5,0,255);heat[:,:,1]=np.clip(diff.mean(axis=2)-30,0,180);Image.fromarray(heat).save(ev/'settings-heatmap.png')
def metrics(original,actual):
 x=np.asarray(original).astype('float32')/255;y=np.asarray(actual).astype('float32')/255
 rgb=(1-float(np.abs(x-y).mean()))*100;ssim=float(structural_similarity(x,y,channel_axis=2,data_range=1,gaussian_weights=False,win_size=7))*100
 edge=(1-float(np.logical_xor(canny(x.mean(axis=2),sigma=0),canny(y.mean(axis=2),sigma=0)).mean()))*100
 delta=float(np.percentile(deltaE_ciede2000(rgb2lab(x),rgb2lab(y)),95))
 return {'rgbSimilarity':round(rgb,3),'edgeXorSimilarity':round(edge,3),'ssim':round(ssim,3),'deltaE2000P95':round(delta,3),'pixelGatePassed':rgb>=95 and edge>=95 and ssim>=95 and delta<=3}
report={'nativeSize':a.size,'method':'native RGB, no resize or preblur, Canny sigma=0, uniform 7x7 SSIM, CIEDE2000 P95','thresholds':{'rgb':95,'edge':95,'ssim':95,'deltaE2000P95':3,'geometryPixels':2},'page':metrics(a,b),'components':{}}
boxes={'settings-main':(44,254,1072,1502),'settings-support':(44,1546,1072,1856),'header':(44,139,1072,224)}
for name,box in boxes.items():
 ca=a.crop(box);cb=b.crop(box);ca.save(ev/f'{name}-original.png');cb.save(ev/f'{name}-dom.png');report['components'][name]={'box':box,**metrics(ca,cb)}
g=json.loads((ev/'geometry.json').read_text());actual=[g['settings-main'][k] for k in ('x','y','width','height')];source=[44,254,1028,1248]
report['geometry']={'sourceMain':source,'actualMain':actual,'maxError':max(abs(x-y) for x,y in zip(source,actual))}
report['passed']=report['page']['pixelGatePassed'] and all(c['pixelGatePassed'] for c in report['components'].values()) and report['geometry']['maxError']<=2
report['manualReview']={'status':'pending','scope':'仅新增功能人工审图；严格基线是否通过仍按指标单项裁决'}
report['limitations']=['新增深色模式入口不参与原稿基线比较，baseline参数只隐藏新增行。','Android原字体和系统栏资源未取得，原稿文字、图标栅格差异未消除。','浅色主题、深色模式三选一内容、横屏为derived，无同版原稿，不声明像素一致。','新增入口无已登记图标，保留空图标位且标签与原行对齐。']
(ev/'visual-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',26);small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
flow=Image.new('RGB',(1320,1040),'#f3f4f6');d=ImageDraw.Draw(flow)
for i,(label,file,caption) in enumerate([('01 设置入口','portrait-dark.png','模式切换下新增深色模式'),('02 选择偏好','portrait-options.png','跟随系统 / 开启 / 关闭'),('03 即时生效','portrait-light.png','选择关闭后呈现浅色')]):
 x=20+i*440;d.rounded_rectangle((x,16,x+400,1020),16,fill='white',outline='#d7dbe0');d.text((x+18,33),label,font=font,fill='#22252b');d.text((x+18,76),caption,font=small,fill='#676d76');im=Image.open(ev/file).convert('RGB');im.thumbnail((370,895));flow.paste(im,(x+200-im.width//2,122))
 if i<2:d.line((x+405,510,x+430,510),fill='#8994a2',width=3);d.polygon([(x+426,502),(x+436,510),(x+426,518)],fill='#8994a2')
flow.save(ev/'product-flow.png')
html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>深色模式视觉证据</title><style>body{font:15px Microsoft YaHei;background:#f3f4f6;color:#252932;margin:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}figure{margin:0;background:white;padding:16px}img{width:100%;height:500px;object-fit:contain}pre{white-space:pre-wrap}</style><h1>深色模式 · 原稿与实现证据</h1><p>原稿证据并非实现。严格比较仅针对不含新增入口的原设置基线。失败项如实保留。</p><div class="grid">'
for label,file in [('任务原稿','settings-original.png'),('原设置DOM基线','settings-baseline-dom.png'),('50%叠加','settings-overlay.png'),('绝对差异','settings-difference.png'),('差异热图','settings-heatmap.png')]:html+=f'<figure><a href="{file}"><img src="{file}"></a><figcaption>{label}</figcaption></figure>'
for name in boxes:
 for mode in ['original','dom']:html+=f'<figure><img src="{name}-{mode}.png"><figcaption>{name} · {mode}</figcaption></figure>'
html+='</div><pre>'+json.dumps(report,ensure_ascii=False,indent=2)+'</pre></html>';(ev/'视觉证据.html').write_text(html,encoding='utf-8')
print(json.dumps({'passed':report['passed'],'page':report['page'],'geometry':report['geometry']},ensure_ascii=False))
