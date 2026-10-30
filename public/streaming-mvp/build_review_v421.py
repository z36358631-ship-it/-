"""将国内版登录和范围同步到既有评审页与导航页。"""
from pathlib import Path
from lxml import html,etree
import base64,json,shutil
R=Path(__file__).resolve().parent
A=R/'assets'
shots=R/'review/prd-v421/domestic'
for side,old in [('mobile','mobile'),('mac','desktop')]:
    for state in ['login','login-en','help','help-article']:
        shutil.copyfile(shots/f'{side}-{state}.png',A/f'standalone-{old}-{state}-v421.png')
def uri(p):return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode('ascii')
d=html.fromstring((R/'review.html').read_text(encoding='utf-8'))
for n in d.xpath('//*[@class="tag"]'):n.text='V4.21 · 国内版界面流程评审 · 2026.10.30'
for n in d.xpath('//img[@alt="01 登录盖世远程"]'):n.set('src',uri(A/'standalone-mobile-login-v421.png'))
for n in d.xpath('//p[@class="intro"]'):n.text='本期仅面向国内，聚焦 AI 办公与通用远控。下方使用当前可操作 Demo 的真实界面截图串起操作流程，截图可点击放大；内容为演示数据。'
for n in d.xpath('//section[@id="default"]//figure[1]//figcaption/p'):n.text='手机号验证码或盖世游戏 App 授权；电脑端可扫码登录。'
table=d.xpath('//section[contains(@class,"summary")]//table')[0]
for n in table.xpath('.//tr[td[1][text()="登录与场景分流"]]/td[2]'):
    n.text='本期只做国内：手机号验证码、手机盖世游戏 App 授权、电脑扫码登录；移除海外邮箱、Google 登录及地区切换。中文/English只切换展示文案。登录后选择办公或非办公，分别进入 AI 会话和设备列表，可通过导航切换。/2026.10.30修改'
payload='<!doctype html>'+etree.tostring(d,encoding='unicode',method='html')
for target in ['review.html','方案评审-V4.14/盖世远程方案评审稿.html']:(R/target).write_text(payload,encoding='utf-8')
rows=[]
for tr in table.xpath('.//tr'):
    cells=tr.findall('td')
    if len(cells)==2:rows.append('| '+cells[0].text_content().strip()+' | '+cells[1].text_content().strip()+' |')
(R/'方案评审-V4.14/盖世远程方案评审稿.md').write_text('# 盖世远程方案评审 V4.21 国内版\n\n| 功能 | 说明 |\n|---|---|\n'+'\n'.join(rows)+'\n',encoding='utf-8')

p=R/'index.html';d=html.fromstring(p.read_text(encoding='utf-8'))
for n in d.xpath('//a[contains(@href,"region=overseas")]'):n.getparent().remove(n)
for n in d.xpath('//a[contains(@href,"AI会话补充说明")]'):n.getparent().remove(n)
for n in d.xpath('//a[@href="prd.html"]'):n.text='PRD V4.21'
for n in d.xpath('//*[@class="tag"]'):n.text='独立产品 · V4.21 国内版 · 2026.10.30'
for n in d.xpath('//p[@class="lead"]'):
    n.text='本期面向国内用户，移动 App 与电脑客户端共用盖世账号。登录后先选择办公或非办公，分别进入 AI 会话和设备列表。AI 会话按软件连续分组，可筛选电脑；点击 › 打开对应电脑客户端，点击气泡预览对话。手机适配直接对话按技术方案确定。'
for n in d.xpath('//img'):
    src=n.get('src','')
    if src.endswith('standalone-mobile-login.png'):n.set('src','assets/standalone-mobile-login-v421.png')
    if src.endswith('standalone-desktop-login.png'):n.set('src','assets/standalone-desktop-login-v421.png')
    if src.endswith('standalone-flow.png'):n.set('src','assets/product-flow-v421.png')
for n in d.xpath('//p[@class="note"]'):
    text=n.text_content()
    if text.startswith('演示登录：'):
        n.text='演示登录：手机号13600008000，先获取验证码，填写任意6位数字，勾选协议后登录。其他格式正确的手机号也可模拟登录，不发送真实短信。顶部中文/English只切换展示语言。'
    elif text.startswith('当前以双端'):
        n.text='当前为 V4.21 国内版。双端 Demo、方案、PRD和图片内嵌Word已同步；真实服务接入与手机适配直聊仍待技术方案确定。'
    elif 'VS Code' in text:
        n.text=text.replace('VS Code','ChatGPT')
p.write_text('<!doctype html>'+etree.tostring(d,encoding='unicode',method='html'),encoding='utf-8')
print(json.dumps({'version':'V4.21','reviewImages':len(d.xpath('//img'))}))
