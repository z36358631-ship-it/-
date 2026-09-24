from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[2]
folder=root/'public/prd/app-help-center-20260924'
canvas=Image.new('RGB',(1344,1110),'#f3f4f6');draw=ImageDraw.Draw(canvas)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',30)
label=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',21)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
draw.text((42,24),'盖世游戏 · 帮助中心',font=font,fill='#26282d')
draw.text((42,70),'前端页面方案  /  2026.09.24',font=small,fill='#777c86')
for i,(name,file) in enumerate([('01  设置入口','01-settings.png'),('02  帮助列表','02-help.png'),('03  文章详情','03-article.png')]):
    x=42+i*434
    draw.text((x,118),name,font=label,fill='#333740')
    shot=Image.open(folder/file).convert('RGB');shot=shot.resize((390,867),Image.Resampling.LANCZOS)
    canvas.paste(shot,(x,162))
draw.text((42,1060),'沿用设置页面结构；帮助内容由后台配置；示例图文及视频仅用于呈现阅读效果。',font=small,fill='#6b707a')
canvas.save(folder/'前端页面总览.png')
print(folder/'前端页面总览.png')
