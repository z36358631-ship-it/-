"""同步Push开关及账号注销的真实界面，保留其余方案结构。"""
from pathlib import Path
from lxml import html, etree
import base64, json, shutil, re
R=Path(__file__).resolve().parent
A=R/'assets'
def uri(p):return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode('ascii')
def img(name,alt):return '<img class="screen" src="'+uri(A/name)+'" alt="'+alt+'" onclick="zoom(this)">'
for side in ['mobile','mac']:
    shutil.copyfile(R/f'review/prd-v422/account/{side}-deleted-login.png',A/f'standalone-{side}-deleted-login-v422.png')
d=html.fromstring((R/'review.html').read_text(encoding='utf-8'))
for old in list(A.glob('*v420.png'))+list(A.glob('*v421.png')):
    fresh=A/re.sub(r'v42[01]', 'v422',old.name)
    if fresh.exists():
        for node in d.xpath('//img[@src=$v]',v=uri(old)):node.set('src',uri(fresh))
for x in json.loads((R/'review/prd-v422/prd-image-replacements.json').read_text(encoding='utf-8'))['replacements']:
    name=x['old'].rsplit('/',1)[-1]
    for old in [A/name,R/'prd-v417-images'/name]:
        if old.exists():
            for node in d.xpath('//img[@src=$v]',v=uri(old)):node.set('src',uri(R/x['new']))
for node in d.xpath('//*[@class="tag"]'):node.text='V4.22 · 国内版界面流程评审 · 2026.10.30'
for node in d.xpath('//section[@id="notifications" or @id="account-delete"]'):node.getparent().remove(node)
def section(id,title,desc,cards,wide):
    text=f'<section id="{id}" class="flow-board"><div class="flow-title"><h2>{title}</h2><p>{desc}</p></div><div class="flow">'
    for i,(t,f,v) in enumerate(cards):
        if i:text+='<div class="arrow">→</div>'
        text+='<figure class="step"><figcaption><strong>'+t+'</strong><p>'+v+'</p></figcaption>'+img(f,t)+'</figure>'
    text+='</div>'
    for t,f,v in wide:text+='<div class="wide-shot"><div><h3>'+t+'</h3><p>'+v+'</p></div>'+img(f,t)+'</div>'
    return html.fragment_fromstring(text+'</section>')
summary=d.xpath('//section[contains(@class,"summary")]')[0]
summary.addprevious(section('notifications','消息通知：仅 Push','设置控制本端提醒；不设置站内消息列表。会话自身的任务状态保留。',[
 ('01 开启消息通知','standalone-mobile-profile-v422.png','我的页设置分组内控制 Push。'),
 ('02 允许系统通知','notifications-mobile-permission-v422.png','主动开启时询问；拒绝后开关保持关闭。'),
 ('03 后台收到 Push','notifications-mobile-push-v422.png','任务完成、失败、待输入、待批准；仅显示通用文案。'),
 ('04 打开对应电脑主题','notifications-mobile-client-v422.png','点击打开客户端；保留账号、权限及占用检查。')
],[('电脑设置','standalone-desktop-settings-v422.png','消息通知开关在原设置页；关闭立即停止 Push。'),('电脑 Push 演示','notifications-mac-push-v422.png','同事件去重，历史不补发；真实系统通道待接入。')]))
summary.addprevious(section('account-delete','账号注销','注销与退出登录分开；必须二次确认。以下仅演示本地注销，不删除真实账号。',[
 ('01 账号区选择注销','standalone-mobile-profile-v422.png','账号信息下方显示注销账号。'),
 ('02 二次确认','standalone-mobile-account-deletion-v422.png','取消保留当前账号；确认注销后清理当前会话。'),
 ('03 返回登录页','standalone-mobile-deleted-login-v422.png','注销演示完成，当前账号退出。')
],[('电脑账号入口','standalone-desktop-account-v422.png','账户弹层提供注销账号。'),('电脑二次确认','standalone-mac-account-deletion-v422.png','确认后返回登录；真实注销规则与后端接口待确认。')]))
table=summary.xpath('.//table')[0]
for row in table.xpath('.//tr[td[1][text()="消息通知" or text()="账号注销"]]'):row.getparent().remove(row)
for label,text in [('消息通知','仅保留四类 Push：任务完成、失败、待输入、待批准。设置中控制开启；后台且系统允许时提醒，同事件去重，历史不补发。移除站内信及通知未读，点击 Push 打开对应电脑软件主题。/2026.10.30修改'),('账号注销','手机账号区、电脑账户弹层增加注销账号。二次确认后清理当前会话并返回登录；取消不变。Demo仅模拟注销，真实账号删除与数据处理待后端确认。/2026.10.30修改')]:
    table.append(html.fragment_fromstring('<tr><td>'+label+'</td><td>'+text+'</td></tr>'))
for nav in d.xpath('//main/nav'):
    for n in nav.xpath('a[@href="#notifications"]'):n.text='Push 通知'
    if not nav.xpath('a[@href="#account-delete"]'):nav.append(html.fragment_fromstring('<a href="#account-delete">账号注销</a>'))
style=d.xpath('//head/style')[0]
style.text=(style.text or '')+'\n#account-delete .flow{display:flex;align-items:center;gap:14px;overflow:auto;padding:8px 0 20px}#account-delete .step{min-width:230px;flex:1}#account-delete .step::after{display:none}#account-delete .arrow{color:#7b9cbf;font-size:25px;flex-shrink:0}\n'
payload='<!doctype html>'+etree.tostring(d,encoding='unicode',method='html')
for f in ['review.html','方案评审-V4.14/盖世远程方案评审稿.html']:(R/f).write_text(payload,encoding='utf-8')
rows=['| '+' | '.join(c.text_content().strip() for c in tr.findall('td'))+' |' for tr in table.xpath('.//tr') if len(tr.findall('td'))==2]
(R/'方案评审-V4.14/盖世远程方案评审稿.md').write_text('# 盖世远程方案评审 V4.22\n\n| 功能 | 说明 |\n|---|---|\n'+'\n'.join(rows)+'\n',encoding='utf-8')
p=R/'index.html'
text=p.read_text(encoding='utf-8').replace('V4.21','V4.22').replace('assets/product-flow-v421.png','assets/product-flow-v422.png')
p.write_text(text,encoding='utf-8')
print(json.dumps({'version':'V4.22','reviewImages':len(d.xpath('//img[@src]'))}))
