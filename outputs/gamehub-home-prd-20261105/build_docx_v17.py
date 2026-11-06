from pathlib import Path
import re,json,zipfile,hashlib
from urllib.parse import unquote
from docx import Document
from docx.shared import Inches,Pt,RGBColor
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
SOURCE=OUT/'prd-v1.7-Draft.md'
TARGET=ROOT/'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求/盖世游戏7.0首页改版PRD_V1.7_飞书导入版.docx'
doc=Document();sec=doc.sections[0]
sec.page_width,sec.page_height=Inches(8.27),Inches(11.69)
sec.left_margin=sec.right_margin=Inches(.7)
sec.top_margin=sec.bottom_margin=Inches(.65)
WIDTH=6.87
for name,size in [('Normal',10.5),('Title',22),('Heading 1',17),('Heading 2',14),('Heading 3',12),('Heading 4',11),('Heading 5',10.5),('Caption',9.5)]:
 st=doc.styles[name];st.font.name='Microsoft YaHei';st.font.size=Pt(size);st.font.color.rgb=RGBColor(0,0,0);st.font.italic=False
 st.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Microsoft YaHei')
 st.paragraph_format.space_after=Pt(5);st.paragraph_format.line_spacing=1.15
 if name.startswith('Heading'):st.paragraph_format.keep_with_next=True
for el in list(doc.styles.element.xpath('.//w:pBdr')):el.getparent().remove(el)
doc.core_properties.title='盖世游戏7.0首页改版需求'
doc.core_properties.author='郑群超';doc.core_properties.subject='V1.7 本机开玩首页改版'
doc.core_properties.comments=''
TOKEN=re.compile(r'(!?\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|https?://[^\s<>]+)')
IMAGES=re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
figures=[];source_segments=[]

def inline(p,text):
 for token in TOKEN.split(text):
  if not token:continue
  if token.startswith('!['):raise ValueError('Images must be standalone body paragraphs')
  if re.fullmatch(r'\[([^\]]*)\]\(([^)]+)\)',token):
   label,url=re.match(r'\[([^\]]*)\]\(([^)]+)\)',token).groups();link(p,label,url)
  elif token.startswith('**'):p.add_run(token[2:-2]).bold=True
  elif token.startswith('`'):p.add_run(token[1:-1])
  elif token.startswith(('https://','http://')):link(p,token,token)
  else:p.add_run(token)

def link(p,label,url):
 if not url.startswith(('http://','https://')):p.add_run(label);return
 el=OxmlElement('w:hyperlink');el.set(qn('r:id'),p.part.relate_to(url,RT.HYPERLINK,is_external=True))
 r=OxmlElement('w:r');props=OxmlElement('w:rPr');c=OxmlElement('w:color');c.set(qn('w:val'),'175CD3');props.append(c);r.append(props)
 t=OxmlElement('w:t');t.text=label;r.append(t);el.append(r);p._p.append(el)

def image_block(alt,url,caption=None,target=None,max_width=WIDTH):
 target=doc if target is None else target
 in_table=target is not doc
 if in_table and caption:
  parent_cell=target
  frame=target.add_table(rows=1,cols=1);frame.autofit=False
  spacer=parent_cell.paragraphs[-1];spacer.paragraph_format.space_before=Pt(0);spacer.paragraph_format.space_after=Pt(0);spacer.paragraph_format.line_spacing=Pt(1);spacer.add_run().font.size=Pt(1)
  frame.columns[0].width=Inches(max_width)
  nosplit=OxmlElement('w:cantSplit');frame.rows[0]._tr.get_or_add_trPr().append(nosplit)
  target=frame.cell(0,0);target.width=Inches(max_width)
  mar=OxmlElement('w:tcMar')
  for side in ['top','left','bottom','right']:
   e=OxmlElement('w:'+side);e.set(qn('w:w'),'0');e.set(qn('w:type'),'dxa');mar.append(e)
  target._tc.get_or_add_tcPr().append(mar)
 path=ROOT/'public'/unquote(url.split('/public/',1)[1]) if '/public/' in url else Path(unquote(url));assert path.exists(),path
 iw,ih=Image.open(path).size
 width=min(max_width,(3.2 if ih>iw else 3.6)*iw/ih)
 if ih>iw and not path.name.startswith('module-'):width=min(width,1.65)
 elif path.name not in ('flow-overview.png','flow-revision.png','home-overview.png','home-overview-updated.png') and not path.name.startswith('admin-review-'):width=min(width,4.0)
 p=target.paragraphs[0] if in_table and caption else target.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
 p.paragraph_format.keep_together=True;p.paragraph_format.keep_with_next=False
 p.paragraph_format.line_spacing=1;p.paragraph_format.space_before=Pt(3);p.paragraph_format.space_after=Pt(3)
 shape=p.add_run().add_picture(str(path),width=Inches(width))
 shape._inline.docPr.set('descr',alt);shape._inline.docPr.set('name',alt)
 if caption:
  p.add_run().add_break()
  cr=p.add_run(caption);cr.font.size=Pt(9.5)
  p.paragraph_format.space_after=Pt(5)
 figures.append({'alt':alt,'file':str(path),'widthInches':width,'heightInches':width*ih/iw,'source':url,'inTable':in_table})

def paragraphs(cell,value,width):
 value=re.sub(r'(\*\*详细说明：\*\*)<br>(\*\*展示说明：\*\*)<br>',r'\1\n\2\n',value)
 value=value.replace('**交互说明：**<br>','**交互说明：**\n')
 parts=re.split(r'<br\s*/?>',value)
 i=0
 while i<len(parts):
  part=parts[i].strip();i+=1
  if not part:continue
  pic=IMAGES.fullmatch(part)
  if pic:
   caption=None
   if i<len(parts) and parts[i].strip().startswith('*图'):
    caption=parts[i].strip().strip('*');i+=1
   image_block(*pic.groups(),caption,target=cell,max_width=width-.18)
   continue
  if part.startswith('*图'):part=part.strip('*')
  p=cell.paragraphs[0] if len(cell.paragraphs)==1 and not cell.paragraphs[0].text and not cell.paragraphs[0]._p.xpath('.//w:drawing') else cell.add_paragraph()
  p.paragraph_format.space_after=Pt(2);p.paragraph_format.line_spacing=1.05;p.paragraph_format.keep_with_next=False
  if part in ('**图示：**','**详细说明：**','**展示说明：**','**交互说明：**'):p.paragraph_format.keep_with_next=True
  inline(p,part)
  if '\n' in part:p.paragraph_format.keep_together=True
 # Empty initial cell paragraph is not required when other paragraphs exist.
 if len(cell.paragraphs)>1 and not cell.paragraphs[0].text and not cell.paragraphs[0]._p.xpath('.//w:drawing'):
  cell._tc.remove(cell.paragraphs[0]._p)

def table(rows,widths=None):
 n=len(rows[0]);assert all(len(row)==n for row in rows)
 if widths is None:
  widths=[1.12,5.75] if n==2 else [1.2,2.25,3.42] if n==3 else [1.25,2.1,1.6,1.92]
  if rows[0]==['类型','图示','内容','说明']:widths=[.45,1.85,.8,3.77]
  elif rows[0][0]=='修订日期':widths=[1.05,3.65,1.3,.87]
  elif rows[0][0]=='事件':widths=[1.7,.9,2.5,1.77]
  elif rows[0][0]=='参数':widths=[1.1,1,2.1,2.67]
  elif rows[0][0]=='待确认问题':widths=[1.5,2.65,1.32,1.4]
 t=doc.add_table(rows=0,cols=n);t.autofit=False
 for col,width in zip(t.columns,widths):col.width=Inches(width)
 pr=t._tbl.tblPr
 layout=OxmlElement('w:tblLayout');layout.set(qn('w:type'),'fixed');pr.append(layout)
 borders=OxmlElement('w:tblBorders')
 for side in ['top','left','bottom','right','insideH','insideV']:
  el=OxmlElement('w:'+side);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'4');el.set(qn('w:color'),'D9D9D9');borders.append(el)
 pr.append(borders)
 for idx,values in enumerate(rows):
  row=t.add_row()
  if not (n==2 and values[0]=='需求描述'):
   no_split=OxmlElement('w:cantSplit');row._tr.get_or_add_trPr().append(no_split)
  if idx==0:
   repeat=OxmlElement('w:tblHeader');row._tr.get_or_add_trPr().append(repeat)
  for col,(cell,width,value) in enumerate(zip(row.cells,widths,values)):
   cell.width=Inches(width);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.TOP
   props=cell._tc.get_or_add_tcPr();m=OxmlElement('w:tcMar')
   for side in ['top','left','bottom','right']:
    el=OxmlElement('w:'+side);el.set(qn('w:w'),'85');el.set(qn('w:type'),'dxa');m.append(el)
   props.append(m)
   paragraphs(cell,value,width)
   if idx==0:
    shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'E8EEF4');props.append(shade)
    for p in cell.paragraphs:
     p.paragraph_format.keep_with_next=True
     for r in p.runs:r.bold=True
   elif n==2 and col==0:
    for p in cell.paragraphs:
     for r in p.runs:r.bold=True
 doc.add_paragraph().paragraph_format.space_after=Pt(2)

def parse_rows(lines):
 rows=[[c.strip() for c in line.strip().strip('|').split('|')] for line in lines]
 return [row for row in rows if not all(re.fullmatch(r'[:\- ]+',c) for c in row)]

def render_table(rows):
 table(rows)

source=SOURCE.read_text(encoding='utf-8-sig');lines=source.splitlines();i=0
while i<len(lines):
 line=lines[i].strip()
 if not line or line=='---':i+=1;continue
 if line.startswith('|'):
  group=[]
  while i<len(lines) and lines[i].strip().startswith('|'):group.append(lines[i]);i+=1
  render_table(parse_rows(group));continue
 h=re.match(r'^(#{1,6})\s+(.*)',line)
 if h:
  if len(h[1])==1:doc.add_paragraph('盖世游戏7.0首页改版需求',style='Title')
  else:doc.add_heading(h[2],level=min(len(h[1])-1,5))
 elif IMAGES.fullmatch(line):
  alt,url=IMAGES.fullmatch(line).groups();caption=None
  if i+2<len(lines) and lines[i+2].strip().startswith('*图'):
   caption=lines[i+2].strip().strip('*');i+=2
  image_block(alt,url,caption)
 else:
  p=doc.add_paragraph();inline(p,line.removeprefix('- '))
 i+=1

# Keep the mandatory paragraph after the final table from creating a blank page.
if doc.paragraphs and not doc.paragraphs[-1].text:
 p=doc.paragraphs[-1]
 p.paragraph_format.space_before=Pt(0);p.paragraph_format.space_after=Pt(0)
 p.paragraph_format.line_spacing=Pt(1);p.paragraph_format.keep_with_next=False
 p.paragraph_format.keep_together=False
 p.add_run().font.size=Pt(1)
 mark=OxmlElement('w:rPr');size=OxmlElement('w:sz');size.set(qn('w:val'),'2');mark.append(size)
 p._p.get_or_add_pPr().append(mark)

# Deterministic checks cover all source rule text, allowing only figure-caption
# relocation and Markdown syntax removal. Image source URLs are embedded files.
actual=''.join(n.text or '' for n in doc._element.xpath('.//w:t'))
def norm(s):return re.sub(r'\s+','',s)
actual=norm(actual);missing=[];checked=0
for line in lines:
 line=line.strip()
 if not line or line.startswith('# ') or line=='---':continue
 cells=line.strip('|').split('|') if line.startswith('|') else [re.sub(r'^#{1,6}\s+','',line).removeprefix('- ')]
 if all(re.fullmatch(r'[\s:\-]+',v) for v in cells):continue
 for cell in cells:
  cell=IMAGES.sub('',cell)
  for segment in re.split(r'<br\s*/?>',cell):
   segment=re.sub(r'\[([^\]]*)\]\([^)]+\)',r'\1',segment).replace('**','').replace('`','').strip('* ')
   # The figure label is kept once outside the table, and the local reference
   # remains in the table in the import layout.
   if segment=='图示：':continue
   if segment.startswith('图示：图'):segment=segment[3:]
   if segment:
    checked+=1
    if norm(segment) not in actual:missing.append(segment[:180])
assert not missing,missing
doc.save(TARGET)
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
from lxml import etree
with zipfile.ZipFile(TARGET) as z:
 xml=etree.fromstring(z.read('word/document.xml'));rels=etree.fromstring(z.read('word/_rels/document.xml.rels'))
 image_rels=[r for r in rels if r.get('Type','').endswith('/image')]
 audit={'inlineImages':len(xml.xpath('//wp:inline',namespaces=ns)),'floatingImages':len(xml.xpath('//wp:anchor',namespaces=ns)),'picturesInTables':len(xml.xpath('//w:tbl//a:blip',namespaces=ns)),'externalImageRelationships':sum(r.get('TargetMode')=='External' for r in image_rels),'fixedRowHeights':len(xml.xpath('//w:trHeight[@w:hRule="exact"]',namespaces=ns)),'sections':len(xml.xpath('//w:sectPr',namespaces=ns)),'mediaFiles':len([n for n in z.namelist() if n.startswith('word/media/')])}
assert audit['inlineImages']==len(IMAGES.findall(source))
assert audit['floatingImages']==audit['externalImageRelationships']==audit['fixedRowHeights']==0
assert audit['picturesInTables']==len(figures)-1
subtables=[t for t in doc.tables if [c.text for c in t.rows[0].cells]==['类型','图示','内容','说明']]
assert len(subtables)==1 and len(subtables[0].rows)==8
assert all(len(row.cells[1]._tc.xpath('.//a:blip'))==1 for row in subtables[0].rows[1:])
pages=[t for t in doc.tables if t.rows[0].cells[0].text=='要素']
assert len(pages)==11
assert all(len(t.rows[4].cells[1]._tc.xpath('.//a:blip'))>=1 for t in pages)
report={'output':str(TARGET),'source':str(SOURCE),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'checkedTextSegments':checked,'missing':missing,'tables':len(doc.tables),'images':figures,'audit':audit,'feishuImportVerified':False,'renderStatus':'pending'}
(OUT/'word-v17-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='images'},ensure_ascii=False))
