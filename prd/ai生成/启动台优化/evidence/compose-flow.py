from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

root=Path(__file__).resolve().parent.parent
items=[('00-client-home','1 首页介绍，去设置'),('16-settings-highlight-off','2 手动开启程序坞入口'),('02-dock-activation','3 添加成功并激活'),('03-opening-feedback','4 正在打开启动台'),('04-launchpad-intro','5 了解启动台用途'),('06-launchpad-menu','6 找到设置入口'),('07-launchpad-settings','7 完成使用引导')]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
width=620;gap=52;height=570
canvas=Image.new('RGB',(width*len(items)+gap*(len(items)-1)+48,height),'#f4f5f7')
d=ImageDraw.Draw(canvas)
d.text((24,15),'盖世启动台 · 首次启用主流程',font=font,fill='#181a20')
for i,(name,label) in enumerate(items):
 x=24+i*(width+gap)
 im=Image.open(root/'images'/f'{name}.png').convert('RGB')
 thumb=ImageOps.contain(im,(width,425),Image.Resampling.LANCZOS)
 canvas.paste(thumb,(x,76+(425-thumb.height)//2))
 d.text((x,516),label,font=small,fill='#20222a')
 if i<len(items)-1:
  ax=x+width+13;ay=280
  d.line((ax,ay,ax+26,ay),fill='#858895',width=3)
  d.polygon([(ax+26,ay),(ax+17,ay-7),(ax+17,ay+7)],fill='#858895')
canvas.save(root/'images'/'flow.png')
print('Flow image:',canvas.size)
