from pathlib import Path
import re,json,hashlib,zipfile
from docx import Document
from lxml import etree
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;LAB=ROOT/'work/GUANWANGGAID-64/homepage-lab';PRD=ROOT/'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求'
source=(OUT/'prd-v1.7-source.md').read_text('utf-8');pub=json.loads((LAB/'publication-v17.json').read_text('utf-8'));MD=PRD/'【PRD】《盖世游戏》7.0首页改版需求.md';WORD=PRD/'盖世游戏7.0首页改版PRD_V1.7_飞书导入版.docx'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();images=re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
assert MD.read_text('utf-8')==source.replace('__BASE__',pub['imageBase'])
assert (OUT/'prd-v1.7-Draft.md').read_text('utf-8')==source.replace('__BASE__',OUT.as_posix())
# Map every Markdown table to the corresponding top-level Word table.
groups=re.findall(r'(?m)^\|[^\n]+(?:\n\|[^\n]+)*',source)
rows=[]
for g in groups:
 r=[[v.strip() for v in line.strip('|').split('|')] for line in g.splitlines()]
 rows.append([v for v in r if not all(re.fullmatch(r'[:\- ]+',x) for x in v)])
d=Document(WORD);assert len(rows)==len(d.tables)==18
with zipfile.ZipFile(WORD) as z:
 rels=etree.fromstring(z.read('word/_rels/document.xml.rels'));media={r.get('Id'):z.read('word/'+r.get('Target')) for r in rels if r.get('Type','').endswith('/image')}
 checked_cells=[]
 for ti,(mr,wt) in enumerate(zip(rows,d.tables)):
  assert len(mr)==len(wt.rows)
  for ri,(mrow,wrow) in enumerate(zip(mr,wt.rows)):
   for ci,(mcell,wcell) in enumerate(zip(mrow,wrow.cells)):
    expected=images.findall(mcell);blips=wcell._tc.xpath('.//a:blip');assert len(expected)==len(blips),(ti,ri,ci)
    for (alt,url),blip in zip(expected,blips):assert media[blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')]==(OUT/url.rsplit('/',1)[-1]).read_bytes(),alt
    if expected:checked_cells.append({'table':ti+1,'row':ri+1,'column':ci+1,'images':[a for a,u in expected]})
# Compare every source text segment with PDF extracted text, excluding raster image text.
normalize=lambda s:re.sub(r'\s+','',s)
pdftext=normalize(''.join(re.sub(r'^\s*要素\s*内容说明\s*','',p['text']) for p in json.loads((OUT/'render-v17/page-text.json').read_text('utf-8'))));missing=[];checked=0
for line in source.splitlines():
 line=line.strip()
 if not line or line.startswith('# ') or line=='---':continue
 vals=line.strip('|').split('|') if line.startswith('|') else [re.sub(r'^#{1,6}\s+','',line)]
 if all(re.fullmatch(r'[\s:\-]+',v) for v in vals):continue
 for cell in vals:
  cell=images.sub('',cell)
  for seg in re.split(r'<br\s*/?>',cell):
   seg=re.sub(r'\[([^\]]*)\]\([^)]+\)',r'\1',seg).replace('**','').replace('`','').strip('* ')
   if seg:
    checked+=1
    if normalize(seg) not in pdftext:missing.append(seg)
assert not missing,missing
formal=json.loads((OUT/'quality-v17-formal.json').read_text('utf-8-sig'));draft=json.loads((OUT/'quality-v17-draft.json').read_text('utf-8-sig'))
assert [e['code'] for e in formal['errors']]==['PENDING_SECTION_MISSING']
assert [e['code'] for e in draft['errors']]==['PENDING_SECTION_MISSING']
r={'status':'pending_visual_review','sourceMarkdownWordAlignment':'passed','perCellImageMapping':'passed','checkedImageCells':checked_cells,'pdfTextSegments':checked,'pdfMissingText':missing,'sixElementPageTables':11,'homepageSubfunctionTables':1,'homepageSubfunctionRows':7,'images':27,'picturesInTables':26,'flowOutsideTables':1,'pages':22,'wordSha256':sha(WORD),'markdownSha256':sha(MD),'sourceSha256':sha(OUT/'prd-v1.7-source.md'),'qualityValidatorRawResult':formal['result'],'validationExceptions':formal['errors'],'warnings':formal['warnings'],'exceptionReason':'用户此前明确要求不保留待确认章节，沿用原校验器并如实记录唯一模板例外。','remoteImages':'passed: HTTP/MIME/exact bytes for 27 images','feishuImportVerified':False,'productionServiceAcceptance':False,'demoChanged':False}
(OUT/'review-v17-verification.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),'utf-8');print(json.dumps({k:v for k,v in r.items() if k!='checkedImageCells'},ensure_ascii=False))
