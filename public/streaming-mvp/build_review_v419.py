"""从当前 Demo 截图更新既有评审稿，不重画产品界面。"""
from pathlib import Path
from lxml import html, etree
import base64, json, re

R=Path(__file__).resolve().parent
A=R/'assets'
source=R/'review.html'
doc=html.fromstring(source.read_text(encoding='utf-8'))
def uri(name):
    return 'data:image/png;base64,'+base64.b64encode((A/name).read_bytes()).decode('ascii')
def image(name,alt):
    return '<img class="screen" src="'+uri(name)+'" alt="'+alt+'" onclick="zoom(this)">'
def text(el,value):
    for c in list(el):el.remove(c)
    el.text=value
def step(alt,title,desc,new_image=None):
    imgs=doc.xpath('//img[@alt=$alt or @alt=$title]',alt=alt,title=title)
    for img in imgs:
        fig=img.getparent();cap=fig.find('figcaption')
        if cap is not None:
            text(cap.find('strong'),title);text(cap.find('p'),desc)
        img.set('alt',title)
        if new_image:img.set('src',uri(new_image))
for el in doc.xpath('//*[@class="tag"]'):text(el,'V4.19 · 界面流程评审 · 2026.10.29')
for el in doc.xpath('//*[@id="default"]/*[@class="flow-note"]'):
    text(el,'默认路径：选择设备与主题，点击右侧 ›，将会话标识传至对应电脑，打开 AI 软件与会话。气泡是独立的适配对话入口。')
step('03 点击 AI 会话','03 选择主题，点击 ›','顶部设备 Tab 筛选，按 AI 连续分组；右侧 › 打开该电脑客户端。','standalone-mobile-office-sessions-v419.png')
step('01 保留次级入口','01 点击对话气泡','从主题右侧气泡进入适配对话演示，与打开客户端分开。','standalone-mobile-office-device-sessions-v419.png')
step('01 打开 AI 账号','01 打开 AI 账号','AI 会话页右上角管理账号。','standalone-mobile-office-device-sessions-v419.png')
step('04 查看对应账号会话','04 查看对应账号会话','按设备和软件切换账号，保留会话与草稿隔离。','standalone-mobile-office-device-sessions-v419.png')
for section in doc.xpath('//section[contains(concat(" ",@class," ")," client-lists ")]'):
    section.clear();section.set('class','client-lists');section.set('id','session-list')
    section.append(html.fragment_fromstring('<h2>会话列表与双入口</h2>'))
    section.append(html.fragment_fromstring('<p class="flow-note">状态在标题左侧，时间在下；右侧气泡进行对话，› 打开对应电脑客户端，两个图标垂直居中。每条仅一个标题，同一 AI 连续排列，软件图标每组一次。/2026.10.29修改</p>'))
    grid=html.Element('div',{'class':'list-examples'})
    for name,title,desc in [
        ('standalone-mobile-office-sessions-v419.png','全部会话','通过设备 Tab 筛选，同一 AI 连续排列。'),
        ('standalone-mobile-office-device-sessions-v419.png','当前电脑的会话','保留会话标题和数量，不重复设备在线栏或连接卡片。'),
        ('standalone-mac-office-sessions-v419.png','电脑端会话列表','沿用相同状态与双入口；远端软件内部结构保留。')]:
        fig=html.fragment_fromstring('<figure class="step"><figcaption><strong>'+title+'</strong><p>'+desc+'</p></figcaption>'+image(name,title)+'</figure>');grid.append(fig)
    section.append(grid)
    states=html.fragment_fromstring('''<table class="task-status-guide"><thead><tr><th>状态</th><th>显示</th><th>含义</th></tr></thead><tbody>
    <tr><td>运行中</td><td>深灰旋转圆环</td><td>当前任务仍在处理。</td></tr>
    <tr><td>待输入</td><td>蓝色标签</td><td>需要用户补充信息。</td></tr>
    <tr><td>待批准</td><td>绿色标签</td><td>需要用户确认操作。</td></tr>
    <tr><td>任务失败</td><td>红圈 i</td><td>当前任务执行失败。</td></tr>
    <tr><td>有未读内容</td><td>蓝点</td><td>有新内容尚未查看；未读不等于完成。</td></tr>
    <tr><td>空闲／已结束且已读</td><td>不显示标记</td><td>查看内容只清未读，不改变其他任务状态。</td></tr></tbody></table>''')
    section.append(states)
    wide=html.fragment_fromstring('<div class="wide-shot"><div><h3>窗口串流独立展示</h3><p>可选择全桌面、浏览器、文件、文档或 AI 窗口；这些窗口不混入 AI 会话列表。</p></div>'+image('standalone-mobile-window-picker-v419.png','独立窗口串流')+'</div>')
    section.append(wide)
updates={
 'AI 会话列表':'顶部设备 Tab 筛选，按 ChatGPT、Claude、WorkBuddy 连续分组；每组只显示一个软件图标，每条只有标题与时间，不再展开电脑、软件和文件夹。/2026.10.29修改',
 '连接指引':'无设备、无会话时保留连接帮助；设备子 Tab 不重复显示连接卡片或设备在线栏。/2026.10.29修改',
 '三款客户端电脑画面':'点击会话右侧 ›，将会话标识传至对应电脑，打开 ChatGPT、Claude 或 WorkBuddy 与主题；窗口串流另行选择全桌面或指定窗口。/2026.10.29修改',
 'Demo 评审状态':'保留缺省、穷举、无会话、加载、失败、离线、禁控和占用；穷举包含运行中、待输入、待批准、任务失败、未读与无标记六种会话状态。/2026.10.29修改'
}
for row in doc.xpath('//section[contains(@class,"summary")]//tr'):
    cells=row.findall('td')
    if len(cells)==2 and cells[0].text_content().strip() in updates:text(cells[1],updates[cells[0].text_content().strip()])
table=doc.xpath('//section[contains(@class,"summary")]//table')
if table:
    existing=[r.text_content() for r in table[0].xpath('.//tr')]
    if not any('会话状态与双入口' in s for s in existing):
        row=html.fragment_fromstring('<tr><td>会话状态与双入口</td><td>状态在标题左侧，时间在下；右侧依次对话气泡、›。气泡进入适配对话演示（待继续技术调研，方案待确定），› 打开电脑客户端。未读蓝点与任务完成区分。/2026.10.29修改</td></tr>')
        table[0].append(row)
for nav in doc.xpath('//main/nav'):
    if not nav.xpath('./a[@href="#session-list"]'):nav.append(html.fragment_fromstring('<a href="#session-list">会话与任务状态</a>'))
# 原页面内嵌图片，继续保持单文件可离线阅读。
payload='<!doctype html>'+etree.tostring(doc,encoding='unicode',method='html')
source.write_text(payload,encoding='utf-8')
offline=R/'方案评审-V4.14'/'盖世远程方案评审稿.html'
offline.write_text(payload,encoding='utf-8')
print(json.dumps({'version':'V4.19','output':str(source),'offline':str(offline),'images':len(doc.xpath('//img[@src]'))},ensure_ascii=False))
