from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1] / 'public/prd/compatibility-review-v1.2'
canvas = Image.new('RGB', (3000, 1320), '#edf1f5')
draw = ImageDraw.Draw(canvas)
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 26)
heading = ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc', 34)
lanes = [
 ('Android：详情 → 评价 → 配置 → 运行 → 正常退出 → 邀评 → 已发表',
  [('详情', 'c01-game-detail.png'),('评价列表', 'c02-review-list.png'),('配置详情','c03-config-detail.png'),('启动游戏','c04-game-running.png'),('正常退出','c05-exit-confirm.png'),('填写评价','c06-review-dialog.png'),('我的评价','c07-my-review.png')]),
 ('Mac：从详情查看、手动评价与配置参考（本轮不含退出邀评）',
  [('详情入口','m01-detail.png'),('查看评价','m02-reviews.png'),('填写／编辑评价','m03-compose.png'),('查看配置','m04-snapshot.png')])
]
for row, (title, steps) in enumerate(lanes):
 y = 40 + row * 640
 draw.text((35,y), title, font=heading, fill='#152538')
 width = (2930 - 26*(len(steps)-1))//len(steps)
 for i,(label,file) in enumerate(steps):
  x=35+i*(width+26)
  draw.rounded_rectangle((x,y+65,x+width,y+575),radius=14,fill='white')
  draw.text((x+15,y+78),f'{i+1}  {label}',font=font,fill='#233a51')
  image=Image.open(root/file).convert('RGB')
  image.thumbnail((width-24,440))
  canvas.paste(image,(x+(width-image.width)//2,y+130+(430-image.height)//2))
  if i<len(steps)-1:draw.text((x+width+1,y+300),'→',font=font,fill='#57809d')
canvas.save(root/'flow-compatibility-review-v1.2.png')
print('Android/Mac flow generated')
