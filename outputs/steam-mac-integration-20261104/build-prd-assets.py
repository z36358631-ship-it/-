from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import shutil

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent.parent / 'public/prd/steam-mac-integration'
OUT.mkdir(parents=True, exist_ok=True)
SRC = ROOT / 'evidence-v4'
MEETING = ROOT / 'evidence-meeting-20261105'
UPDATED = {'consent', 'panel', 'panel-settings', 'new-steam-settings'}
def source(name, flow=False):
    return (MEETING if flow or name in UPDATED else SRC) / (name+'.jpg')
names = ['new-library','consent','prepare','login','window','big','panel','account','new-settings','new-steam-settings','detail-achievements','detail-reviews','detail-dlc','detail-mods','panel-settings']
for name in names:
    shutil.copyfile(source(name), OUT / (name+'.jpg'))
font_path = 'C:/Windows/Fonts/msyh.ttc'
def font(n): return ImageFont.truetype(font_path, n)
def paste_fit(canvas, name, box, flow=False):
    im = Image.open(source(name, flow)).convert('RGB')
    im.thumbnail((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS)
    canvas.paste(im,(box[0]+(box[2]-box[0]-im.width)//2,box[1]+(box[3]-box[1]-im.height)//2))

im=Image.new('RGB',(3000,620),'#f5f7fa');d=ImageDraw.Draw(im)
d.text((40,22),'Mac Steam 首次进入流程',font=font(35),fill='#172536')
steps=[('new-library','1  点击 Steam','登录后入口显示昵称和头像'),('consent','2  勾选协议','不再选择启动模式'),('prepare','3  按需准备组件','下载 → 校验 → 启动服务'),('login','4  按需登录','扫码或密码；有效登录态可复用'),('big','5  默认进入大屏','模式切换在悬浮球右上设置内')]
for i,(name,title,note) in enumerate(steps):
    x=40+i*590
    d.rounded_rectangle((x,90,x+540,510),12,fill='white',outline='#d9e0e8',width=2)
    d.text((x+18,105),title,font=font(25),fill='#172536')
    paste_fit(im,name,(x+12,151,x+528,465),flow=True)
    d.text((x+18,474),note,font=font(20),fill='#536779')
    if i<4:d.text((x+550,270),'→',font=font(36),fill='#55738e')
d.text((40,548),'已同意：跳过第 2 步；组件可用：跳过第 3 步；登录有效：跳过第 4 步。',font=font(24),fill='#536779')
im.save(OUT/'flow.png')

im=Image.new('RGB',(1600,630),'white');d=ImageDraw.Draw(im)
for i,(name,title) in enumerate([('window','窗口模式'),('big','大屏模式')]):
    d.text((i*800+25,10),title,font=font(30),fill='#172536');paste_fit(im,name,(i*800+10,60,(i+1)*800-10,620))
im.save(OUT/'modes.jpg',quality=90)
im=Image.new('RGB',(1600,1140),'white');d=ImageDraw.Draw(im)
for i,(name,title) in enumerate([('detail-achievements','成就'),('detail-reviews','评价'),('detail-dlc','DLC'),('detail-mods','MOD 与工坊')]):
    x=(i%2)*800;y=(i//2)*570
    d.text((x+18,y+8),title,font=font(28),fill='#172536');paste_fit(im,name,(x+10,y+48,x+790,y+560))
im.save(OUT/'detail-tabs.jpg',quality=90)
print(OUT)
