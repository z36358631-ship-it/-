from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
R=Path(__file__).parent;A=R/'assets'
font='C:/Windows/Fonts/msyh.ttc'
def f(n):return ImageFont.truetype(font,n)
im=Image.new('RGB',(3050,850),'#f4f6f9');d=ImageDraw.Draw(im)
d.text((52,30),'盖世远程 · 从独立登录到退出远控',font=f(36),fill='#1c2530')
d.text((52,88),'国内：手机号；海外：邮箱 / Google。盖世授权：手机拉起 App、电脑扫码。先同意协议，登录后不自动连接。',font=f(22),fill='#626d7a')
steps=[('1','电脑首次引导','desktop-onboarding','开始去登录，跳过去首页'),('2','同意协议并登录','mobile-login','双端取得各自有效会话'),('3','准备被控电脑','desktop-settings','同账号、开关与系统权限'),('4','选择电脑','mobile-devices','进入详情，不自动连接'),('5','检查并连接','mobile-detail','在线、权限、局域网及占用'),('6','进入桌面','mobile-session','首帧可显示且会话可用'),('7','退出回详情','mobile-detail','连接结束，远端程序保留')]
for i,(num,title,key,desc) in enumerate(steps):
 x=38+i*431;y=155
 d.rounded_rectangle((x,y,x+392,797),20,fill='white',outline='#dce2ea',width=2)
 d.ellipse((x+20,y+18,x+68,y+66),fill='#e7b72f');d.text((x+35,y+23),num,font=f(27),fill='#1e2023')
 d.text((x+84,y+25),title,font=f(26),fill='#1c2530')
 pic=Image.open(A/('standalone-'+key+'.png')).convert('RGB');pic=ImageOps.contain(pic,(350,457),Image.Resampling.LANCZOS)
 im.paste(pic,(x+int((392-pic.width)/2),y+95+int((457-pic.height)/2)))
 d.text((x+18,y+578),desc,font=f(20),fill='#626d7a')
 if i<6:
  ax=x+399;ay=y+320
  d.line((ax,ay,ax+22,ay),fill='#8895a4',width=4);d.polygon([(ax+17,ay-8),(ax+28,ay),(ax+17,ay+8)],fill='#8895a4')
d.text((50,815),'连接失败、取消、离线或缺权限：留在对应登录/设备流程，不展示成功桌面。页面均为本地交互模拟。',font=f(20),fill='#626d7a')
im.save(A/'standalone-flow.png')
print('Flow composed from current Demo screenshots')
