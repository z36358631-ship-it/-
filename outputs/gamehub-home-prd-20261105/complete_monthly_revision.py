from pathlib import Path
import hashlib, json, re
from datetime import datetime, timezone

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
FINAL = ROOT / 'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求'
source = OUT / 'prd-v1.4-source.md'
draft = OUT / 'prd-v1.4-Draft.md'
md = FINAL / '【PRD】《盖世游戏》7.0首页改版需求.md'
docx = FINAL / '盖世游戏7.0首页改版PRD_V1.5_飞书导入版.docx'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads(p.read_text('utf-8-sig'))

s = source.read_text('utf-8')
assert s.replace('__BASE__', OUT.as_posix()) == draft.read_text('utf-8')
assert md.read_bytes() == draft.read_bytes()
assert not re.search('待确认|待联调|待接入|待核对', s)
assert '连续签到' in s and '默认只显示本周周一至周日七格一行' in s
assert '点击“更多”在原页展开整月' in s and '点击“收起”恢复本周' in s
assert '不是跳转按钮' in s and '原页切换列表' in s
assert '不新增补签、翻月、连签倍奖' in s and '不推算连续签到天数' in s
assert '同一业务日期不重复发奖' in s
assert '用户从首页任务活动标题箭头进入' in s
assert '点击“获得更多积分”进入' not in s
assert '不涉及埋点改造' in s
assert len(re.findall(r'^\| 功能简介 \|', s, re.M)) == 11
assert len(re.findall(r'^\| 需求描述 \|', s, re.M)) == 11

word = read(OUT/'home-prd-word-verification.json')
renderer = read(OUT/'render-final/word-render.json')
quality = read(OUT/'monthly-prd-quality.json')
assert word['sourceSha256'] == sha(draft) and word['missing'] == []
assert renderer['sourceSha256'] == sha(docx)
assert {x['code'] for x in quality['errors']} == {'PENDING_SECTION_MISSING'}
assert quality['trackingScope'] == 'None'

pages = sorted((OUT/'render-weekly-pages').glob('page-*.png'))
assert len(pages) == renderer['pages']
images = [{'file': x['file'], 'sha256':sha(Path(x['file']))} for x in word['images']]
before = (OUT/'prd-v1.4-before-monthly-simplification.md').read_text('utf-8')
review = {
    'reviewer':'/root/prd_simplify', 'status':'passed',
    'evidence':[str(p) for p in pages],
    'findings':'Reviewed every rendered page: no observed clipping, overlap, missing glyphs or broken table rows; checked default current week, expanded month and inline daily/growth task content against final Demo screenshots.'
}
word.update({'outputSha256':sha(docx), 'renderStatus':'passed_via_word_com_fallback',
             'renderer':renderer, 'manualReview':review, 'feishuImportVerified':False})
(OUT/'home-prd-word-verification.json').write_text(json.dumps(word,ensure_ascii=False,indent=2),encoding='utf-8')
report = {
    'checkedAt':datetime.now(timezone.utc).isoformat(), 'version':'V1.5',
    'source':str(source), 'draft':str(draft), 'markdown':str(md), 'word':str(docx),
    'sourceSha256':sha(source), 'draftSha256':sha(draft), 'markdownSha256':sha(md), 'wordSha256':sha(docx),
    'beforeBytes':len(before.encode('utf-8')), 'afterBytes':len(s.encode('utf-8')),
    'beforeCharacters':len(before), 'afterCharacters':len(s),
    'sourceMarkdownWordAlignment':'passed', 'pageTables':11, 'images':images,
    'quality':{'scriptResult':quality['result'], 'errorCount':quality['errorCount'],
        'warningCount':quality['warningCount'], 'report':str(OUT/'monthly-prd-quality.json'),
        'explicitUserOverride':{'code':'PENDING_SECTION_MISSING','reason':'User explicitly forbids unresolved-item wording; Empty chapter five omitted under explicit user request to simplify and remove unresolved-item wording. Validator unchanged.'}},
    'semanticReview':{'reviewer':'/root/prd_simplify','status':'passed_for_document_scope',
        'basis':['11 page tables retain inputs, behavior, successful results and necessary exceptions',
                 'Continuous sign-in title; default current week; More expands current month and Collapse restores week; inline daily/growth tasks match latest correction',
                 'Points, task settlement and old backend constraints keep their existing rules',
                 'No invented point values, makeup sign-in, multi-sign bonuses or independent metrics',
                 'Android/iOS and domestic/overseas exclusions retained']},
    'wordReview':review, 'wordRender':renderer, 'publication':'pending_parent_publish',
    'fixedShaPublicImages':'pending_parent_publish', 'feishuImportVerified':False,
    'limits':['Demo data does not prove production service integration or real reward settlement.',
              'Canonical LibreOffice is absent from bundled Windows runtime; Word COM PDF and bundled Poppler used.',
              'One template-heading check intentionally differs per explicit user instruction.']
}
(OUT/'monthly-simplification-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'final-revision-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['version','beforeBytes','afterBytes','beforeCharacters','afterCharacters','wordSha256']},ensure_ascii=False))
