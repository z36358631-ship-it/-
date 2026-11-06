from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out=Path(__file__).resolve().parent
W,H=2380,1300
im=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(im)
font=Path('C:/Windows/Fonts/msyh.ttc')
title=ImageFont.truetype(str(font),42)
body=ImageFont.truetype(str(font),31)
small=ImageFont.truetype(str(font),27)
cols=[30,620,1210,1800]
for x,label in zip(cols,['1 推荐首页','2 兼容游戏','3 游戏详情','4 原有游戏流程']):
    d.text((x,28),label,font=title,fill='#20242a')
for x,name in zip(cols,['home-top.png','compatibility.png','game.png']):
    pic=Image.open(out/name).convert('RGB')
    pic.thumbnail((450,865),Image.Resampling.LANCZOS)
    im.paste(pic,(x+(500-pic.width)//2,100))
for x in [515,1105,1695]:
    d.line((x,500,x+65,500),fill='#7b8089',width=6)
    d.polygon([(x+65,500),(x+46,488),(x+46,512)],fill='#7b8089')
for index,line in enumerate(['查看来源与准备状态','按现有流程完成准备','满足条件后启动游戏','','以实际运行结果为准','未完成准备不可直接开玩']):
    d.text((1810,235+index*65),line,font=body,fill='#30343b')
d.line((30,1015,2350,1015),fill='#d5d9df',width=2)
lines=[
    '日历 → 按月浏览 → 单游戏订阅／Steam原生详情；最新兼容 → 官方更新批次',
    '喜加一 → 按平台浏览 → 顶部整栏目订阅／前往领取；仅新增可领游戏提醒',
    '首页签到 → 连续签到（本周／更多展开整月）→ 同页每日／成长任务 → 完成任务',
    '系统添加小组件 → 显示整栏目可领数量与剩余时间 → 点击进入喜加一',
]
for index,line in enumerate(lines):d.text((30,1050+index*52),line,font=small,fill='#30343b')
im.save(out/'flow-revision.png')
print(out/'flow-revision.png')
