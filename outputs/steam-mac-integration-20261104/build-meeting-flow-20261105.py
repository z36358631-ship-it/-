from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=Path('outputs/steam-mac-integration-20261104/evidence-meeting-20261105')
im=Image.new('RGB',(3000,620),'#f5f7fa');d=ImageDraw.Draw(im)
f=lambda n:ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
d.text((40,22),'Mac Steam 首次进入流程',font=f(35),fill='#172536')
steps=[('new-library','1  点击 Steam','登录后入口显示昵称和头像'),('consent','2  勾选协议','不再选择启动模式'),('prepare','3  按需准备组件','下载 → 校验 → 启动服务'),('login','4  按需登录','扫码或密码；有效登录态可复用'),('big','5  默认进入大屏','模式切换在悬浮球右上设置内')]
for i,(name,title,note) in enumerate(steps):
 x=40+i*590
 d.rounded_rectangle((x,90,x+540,510),12,fill='white',outline='#d9e0e8',width=2)
 d.text((x+18,105),title,font=f(25),fill='#172536')
 shot=Image.open(p/(name+'.jpg')).convert('RGB');shot.thumbnail((516,314),Image.Resampling.LANCZOS)
 im.paste(shot,(x+12+(516-shot.width)//2,151+(314-shot.height)//2))
 d.text((x+18,474),note,font=f(20),fill='#536779')
 if i<4:d.text((x+550,270),'→',font=f(36),fill='#55738e')
d.text((40,548),'已同意：跳过第 2 步；组件可用：跳过第 3 步；登录有效：跳过第 4 步。',font=f(24),fill='#536779')
im.save(p/'flow.png')
