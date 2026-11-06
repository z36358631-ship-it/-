from pathlib import Path
import re,json,hashlib
from datetime import datetime,timezone

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
FINAL=ROOT/'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=OUT/'prd-v1.4-source.md'
draft=OUT/'prd-v1.4-Draft.md'
md=FINAL/'【PRD】《盖世游戏》7.0首页改版需求.md'
docx=FINAL/'盖世游戏7.0首页改版PRD_V1.6_飞书导入版.docx'
s=source.read_text('utf-8');body=s.split('## 一、文档概述',1)[1]
assert s.replace('__BASE__',OUT.as_posix())==draft.read_text('utf-8')
base=re.search(r'!\[首页产品流程\]\((.+)/flow-revision.png\)',md.read_text('utf-8'))[1]
assert s.replace('__BASE__',base)==md.read_text('utf-8')
assert '正文以V1.6为准' in s
assert not re.search('待确认|待联调|待接入|待核对',s)
assert len(re.findall(r'^\| 功能简介 \|',s,re.M))==11
assert len(re.findall(r'^\| 需求描述 \|',s,re.M))==11
for clause in ['默认只显示本周周一至周日七格一行','点击“更多”在原页展开整月','点击“收起”恢复本周','不是跳转按钮','原页切换列表','不新增补签、翻月、连签倍奖','不推算连续签到天数','同一业务日期不重复发奖','用户从首页任务活动标题箭头进入','不涉及埋点改造','整栏目订阅','单游戏订阅','拒绝仍保存订阅并发站内信','无法再次申请时提示到系统设置开启','按已有排行榜热度降序取前6款','最多6条','展示时间','不展示已删除的社区评论任务','本窗口不发帖','Steam原生详情','服务端获取官方数据']:
 assert clause in body,clause
for stale in ['分别订阅平台提醒','订阅或取消只作用于当前平台','本期不含GOG','候选由运营配置','每日汇总当日发售内容','点击“获得更多积分”进入']:
 assert stale not in body,stale

word=json.loads((OUT/'home-prd-word-verification.json').read_text('utf-8-sig'))
render=json.loads((OUT/'render-v16/word-render.json').read_text('utf-8-sig'))
quality=json.loads((OUT/'review-v16-prd-quality.json').read_text('utf-8-sig'))
assert word['sourceSha256']==sha(draft) and word['missing']==[]
assert render['sourceSha256']==sha(docx)
assert {e['code'] for e in quality['errors']}=={'PENDING_SECTION_MISSING'}
pages=sorted((OUT/'render-v16/final-pages').glob('page-*.png'))
assert len(pages)==render['pages']
historical=FINAL/'盖世游戏7.0首页改版PRD_V1.5_飞书导入版.docx'
assert sha(historical)=='cc004435b1637bd2be7bdd5d37273dc0f957687f9d45cf39b262843f0dc3ed40'
images=[{'file':i['file'],'sha256':sha(Path(i['file']))} for i in word['images']]
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'version':'V1.6','source':str(source),'draft':str(draft),'markdown':str(md),'word':str(docx),'sourceSha256':sha(source),'draftSha256':sha(draft),'markdownSha256':sha(md),'wordSha256':sha(docx),'historicalV15Preserved':True,'sourceMarkdownWordAlignment':'passed','markedChanges':s.count('2026.11.6修改'),'pageTables':11,'images':images,'wordRender':render,'wordReview':{'reviewer':'/root/prd_simplify','status':'pending_manual_review','pages':[str(p) for p in pages]},'quality':{'scriptResult':quality['result'],'errorCount':quality['errorCount'],'warningCount':quality['warningCount'],'report':str(OUT/'review-v16-prd-quality.json'),'userOverride':{'code':'PENDING_SECTION_MISSING','reason':'User explicitly requested no unresolved-items heading or wording; validator left unchanged.'}},'publicImageBase':base,'publication':'pending_parent_publish','feishuImportVerified':False,'limits':['Screenshots and Demo do not prove production API, auto-claim, SDK, notifications or reward integration.','Exact overseas language-to-country mappings and initial compatibility-badge list are not invented.','Canonical bundled LibreOffice is unavailable; Word COM fallback and bundled Poppler used.']}
review_file=OUT/'review-v16-manual-evidence.json'
if review_file.exists():
 review=json.loads(review_file.read_text('utf-8'))
 assert review['wordSha256']==sha(docx), 'Word changed since visual review'
 assert review['pageHashes']=={p.name:sha(p) for p in pages}, 'Rendered pages changed since visual review'
 assert review['status']=='passed'
 report['status']='passed_with_user_template_override'
 report['wordReview']=review
 report['semanticReview']={'reviewer':'/root/prd_simplify','status':'passed_for_homepage_document_scope','findings':['11 page tables retain the six required elements and production behavior versus Demo limitations.','Unified giveaway subscription; individual release subscription; denied notification permissions preserve in-app delivery.','Automatic compatibility content and heat ordering; official update batches; configurable shortcuts and scheduled existing posts.','Latest weekly/monthly sign-in and inline tasks are retained; removed comment task is absent.','All source wording is present in Word; image/table layout, date examples and independent task-center entry corrected.']}
 report['dates']={'signInAndTimeline':'2026-11-06 Shanghai business-date screenshot','releaseSubscriptionExample':'2026-11-02 historical simulation, explicitly captioned','giveaways':'2026-11-02 promotion snapshot, explicitly captioned','unchangedBaselineImages':['compatibility.png','game.png','widget-desktop.png']}
 remote_file=ROOT/'work/GUANWANGGAID-64/homepage-lab/remote-images-r11.json'
 remote=json.loads(remote_file.read_text('utf-8-sig'))
 checks=remote['checks']
 assert remote['status']=='passed' and len(checks)==len(images)==20
 local_hashes={Path(i['file']).name:i['sha256'] for i in images}
 for item in checks:
  name=Path(item['file']).name
  assert item['status']=='passed' and item['http']==200 and item['mime']=='image/png'
  assert item['url']==base+'/'+name and item['sha256']==local_hashes[name]
 report['publicImages']={'status':'passed','base':base,'count':len(checks),'httpMimeAndByteEquality':'passed','evidence':str(remote_file),'evidenceSha256':sha(remote_file),'imageCommit':remote['imageCommit']}
 report['publication']={'status':'tracked_separately','evidence':str(ROOT/'work/GUANWANGGAID-64/homepage-lab/http-r11-verification.json'),'note':'Demo publication verified separately; final document Git receipt is maintained by the parent publication workflow.'}
 word.update({'outputSha256':sha(docx),'renderStatus':'passed_via_word_com_fallback','renderer':render,'manualReview':review,'version':'V1.6'})
 (OUT/'home-prd-word-verification.json').write_text(json.dumps(word,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'review-v16-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['version','wordSha256','historicalV15Preserved','markedChanges']},ensure_ascii=False))
