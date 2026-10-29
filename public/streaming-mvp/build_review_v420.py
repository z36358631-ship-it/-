"""用本轮真实Demo截图同步既有方案，保留原章节及交互。"""
from pathlib import Path
from lxml import html, etree
import base64,json,shutil,re
R=Path(__file__).resolve().parent
A=R/'assets'
for side in ['mobile','mac']:
    for state in ['inbox','push','entry','client','empty']:
        source=R/'review/prd-v420/notifications'/f'{side}-{state}.png'
        if source.exists():shutil.copyfile(source,A/f'notifications-{side}-{state}-v420.png')
def uri(p):return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode('ascii')
def img(name,alt):return '<img class="screen" src="'+uri(A/name)+'" alt="'+alt+'" onclick="zoom(this)">'
d=html.fromstring((R/'review.html').read_text(encoding='utf-8'))
for p in A.glob('*v419.png'):
    fresh=A/p.name.replace('v419','v420')
    if fresh.exists():
        old=uri(p)
        for el in d.xpath('//img[@src=$value]',value=old):el.set('src',uri(fresh))
for el in d.xpath('//img[@src=$value]',value=uri(R/'prd-v417-images/mobile-devices.png')):el.set('src',uri(A/'notifications-mobile-devices-v420.png'))
for el in d.xpath('//*[@class="tag"]'):el.text='V4.20 · 界面流程评审 · 2026.10.29'
for old in d.xpath('//section[@id="notifications"]'):old.getparent().remove(old)
cards=[('01 查看任务提醒','notifications-mobile-entry-v420.png','铃铛显示站内信未读数量；与任务状态分开。'),('02 查看站内信','notifications-mobile-inbox-v420.png','完成、失败、待输入、待批准；可筛选未读、全部已读。'),('03 后台收到 Push','notifications-mobile-push-v420.png','用户允许后提醒，锁屏仅显示通用文案。'),('04 打开对应电脑主题','notifications-mobile-client-v420.png','默认打开电脑客户端；连接失败或取消不清未读。')]
markup='<section id="notifications" class="flow-board"><div class="flow-title"><h2>消息通知：站内信与 Push</h2><p>同一事件去重；正在看的主题不重复 Push。通知已读不等于任务完成或批准操作。</p></div><div class="flow">'
for i,(title,file,desc) in enumerate(cards):
    if i:markup+='<div class="arrow">→</div>'
    markup+='<figure class="step"><figcaption><strong>'+title+'</strong><p>'+desc+'</p></figcaption>'+img(file,title)+'</figure>'
markup+='</div><div class="wide-shot"><div><h3>电脑端站内信</h3><p>顶栏铃铛进入；保留账号、权限、占用守卫及原工作区。</p></div>'+img('notifications-mac-inbox-v420.png','电脑端站内信')+'</div><div class="wide-shot"><div><h3>电脑端 Push 演示</h3><p>拒绝权限不影响站内信。演示不连接真实系统服务。</p></div>'+img('notifications-mac-push-v420.png','电脑端 Push 演示')+'</div></section>'
section=html.fragment_fromstring(markup)
summary=d.xpath('//section[contains(@class,"summary")]')[0];summary.addprevious(section)
table=summary.xpath('.//table')[0]
for row in table.xpath('.//tr[td[1][text()="消息通知"]]'):row.getparent().remove(row)
table.append(html.fragment_fromstring('<tr><td>消息通知</td><td>双端站内信与 Push 覆盖任务完成、失败、待输入、待批准；铃铛未读、筛选、全部已读及精确主题跳转。用户允许后才提醒，当前主题不重复；拒绝权限仍留站内信。真实消息与系统渠道待技术方案确定。/2026.10.29修改</td></tr>'))
for nav in d.xpath('//main/nav'):
    if not nav.xpath('a[@href="#notifications"]'):nav.append(html.fragment_fromstring('<a href="#notifications">站内信与 Push</a>'))
style=d.xpath('//head/style')[0];style.text=re.sub(r'#notifications [^{}]+\{[^{}]*\}','',style.text or '')+'\n#notifications .flow{display:flex;align-items:center;gap:14px;overflow:auto;padding:8px 0 20px}#notifications .step{min-width:230px;flex:1}#notifications .step::after{display:none}#notifications .arrow{color:#7b9cbf;font-size:25px;flex-shrink:0}\n'
payload='<!doctype html>'+etree.tostring(d,encoding='unicode',method='html')
(R/'review.html').write_text(payload,encoding='utf-8');(R/'方案评审-V4.14/盖世远程方案评审稿.html').write_text(payload,encoding='utf-8')
rows=[]
for row in table.xpath('.//tr'):
    cells=row.findall('td')
    if len(cells)==2:rows.append('| '+cells[0].text_content().strip()+' | '+cells[1].text_content().strip()+' |')
(R/'方案评审-V4.14/盖世远程方案评审稿.md').write_text('# 盖世远程方案评审 V4.20\n\n| 功能 | 说明 |\n|---|---|\n'+'\n'.join(rows)+'\n',encoding='utf-8')
print(json.dumps({'version':'V4.20','images':len(d.xpath('//img[@src]'))}))
