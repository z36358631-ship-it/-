from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
p=Path('串流功能/交付/assets'); im=Image.new('RGB',(2860,2460),'#f3f6fa');d=ImageDraw.Draw(im);font=lambda n:ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
d.text((40,25),'远程电脑｜APP 与 Mac 产品流程 · 一期局域网',font=font(36),fill='#132435')
lanes=[('APP 主控',[('1 游戏库 → 远程电脑','sync-entry'),('2 我的设备 / 旋转','devices-orientation-app'),('3 设备详情 / 快速启动','sync-detail'),('4 远程桌面','sync-desktop'),('5 操作 / 双页键盘','review-computer-keyboard'),('6 退出回详情','sync-detail')],'设备详情分支：文件传输（独立进入）｜ChatGPT 快速启动 → 对话 / 历史 / 文件 → 返回详情'),('Mac 主控',[('1 Mac 首页远程入口','sync-mac-entry'),('2 左列表 / 右详情','sync-mac-workspace'),('3 进入远控窗口','sync-mac-session'),('4 控制中心 / 信号','sync-mac-network'),('5 可选：文件传输','sync-mac-files'),('6 返回来源 / 退出','sync-mac-workspace')],'连接前检查：离线 / 无权限 → 留在详情；被控中 → 接管或取消。文件页返回来源；关闭远控直接退出，最小化保留连接。'),('Mac 本机设置',[('1 进入远程工作区','sync-mac-workspace'),('2 左下角设置','sync-mac-settings'),('3 调整五项偏好','sync-mac-settings'),('4 系统选择接收文件夹','sync-mac-settings'),('5 点击左侧设备','sync-mac-workspace'),('6 回到设备详情','sync-mac-workspace')],'设置仅作用于本机 Mac，不建立连接、不修改选中远端设备权限。APP 不提供该设置页。')]
lanes.append(('APP · ChatGPT 应用内流程',[('1 快速启动 ChatGPT','gpt-quick-launch'),('2 对话 ⇄ 桌面','gpt-mode-desktop-app'),('3 历史 / 新对话','gpt-history'),('4 输入 / 发送 / 停止','gpt-composer'),('5 查看关联文件','gpt-file'),('6 返回设备详情','sync-detail')],'在线且允许控制时启动；占用先接管。对话与桌面可随时切换，保留草稿和附件；对话横屏左侧常驻历史；返回不关闭电脑应用。'))
lanes.append(('APP · 游戏快速启动',[('1 选择盖世 / Steam 游戏','game-quick-app'),('2 打开客户端 / Steam 登录','steam-login-app'),('3 启动游戏 · 自动横屏','game-playing-landscape'),('4 虚拟按键操作','game-playing-landscape'),('5 鼠标移入底部黑区','game-landscape-mouse-black-area'),('6 退出回设备详情','devices-orientation-landscape')],'盖世：打开对应电脑客户端后启动；Steam：未登录先登录。均在所选电脑运行；离线或禁控不可启动，取消或失败不计成功。'))
for row,(label,cards,note) in enumerate(lanes):
 y=95+row*465;d.text((35,y),label,font=font(28),fill='#167599')
 for i,(title,name) in enumerate(cards):
  x=35+i*470;d.rounded_rectangle((x,y+48,x+435,y+365),radius=12,fill='white',outline='#cbd5e1');d.text((x+12,y+60),title,font=font(22),fill='#142b3d');pic=Image.open((p/(name+'.png') if (p/(name+'.png')).exists() else p/('sync-'+name+'.png'))).convert('RGB');pic.thumbnail((410,245));im.paste(pic,(x+(435-pic.width)//2,y+101));
  if i<5:d.text((x+439,y+180),'→',font=font(27),fill='#167599')
 d.text((35,y+384),note,font=font(21),fill='#43576c')
im.save(p/'prd-app-mac-flow.png')
