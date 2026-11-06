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
SOURCE=OUT/'prd-v1.4-Draft.md'
TARGET=ROOT/'prd/最终文档/【PRD】《盖世游戏》7.0首页改版需求/盖世游戏7.0首页改版PRD_V1.6_飞书导入版.docx'
doc=Document();sec=doc.sections[0]
sec.page_width,sec.page_height=Inches(8.27),Inches(11.69)
sec.left_margin=sec.right_margin=Inches(.7)
sec.top_margin=sec.bottom_margin=Inches(.65)
WIDTH=6.87
for name,size in [('Normal',10.5),('Title',22),('Heading 1',17),('Heading 2',14),('Heading 3',12),('Heading 4',11),('Heading 5',10.5),('Caption',9.5)]:
 st=doc.styles[name];st.font.name='Microsoft YaHei';st.font.size=Pt(size);st.font.color.rgb=RGBColor(0,0,0)
 st.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Microsoft YaHei')
 st.paragraph_format.space_after=Pt(5);st.paragraph_format.line_spacing=1.15
 if name.startswith('Heading'):st.paragraph_format.keep_with_next=True
for el in list(doc.styles.element.xpath('.//w:pBdr')):el.getparent().remove(el)
doc.core_properties.title='盖世游戏7.0首页改版需求'
doc.core_properties.author='郑群超';doc.core_properties.subject='V1.6 本机开玩首页改版'
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

def image_block(alt,url,caption=None):
 path=ROOT/'public'/unquote(url.split('/public/',1)[1]) if '/public/' in url else Path(unquote(url));assert path.exists(),path
 iw,ih=Image.open(path).size
 max_height=3.2 if ih>iw else 3.6
 width=min(WIDTH,max_height*iw/ih)
 if ih>iw:width=min(width,1.45)
 elif path.name not in ('flow-overview.png','flow-revision.png','home-overview.png','home-overview-updated.png') and not path.name.startswith('admin-review-'):width=min(width,4.0)
 p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
 p.paragraph_format.keep_together=True;p.paragraph_format.keep_with_next=True
 p.paragraph_format.line_spacing=1;p.paragraph_format.space_before=Pt(5);p.paragraph_format.space_after=Pt(3)
 shape=p.add_run().add_picture(str(path),width=Inches(width))
 shape._inline.docPr.set('descr',alt);shape._inline.docPr.set('name',alt)
 cp=doc.add_paragraph(caption or alt,style='Caption');cp.alignment=WD_ALIGN_PARAGRAPH.CENTER
 cp.paragraph_format.keep_with_next=path.name not in ('flow-overview.png','flow-revision.png');cp.paragraph_format.keep_together=True;cp.paragraph_format.space_after=Pt(8)
 figures.append({'alt':alt,'file':str(path),'widthInches':width,'heightInches':width*ih/iw,'source':url})

def paragraphs(cell,value):
 for index,part in enumerate(re.split(r'<br\s*/?>',value)):
  part=part.strip()
  if not part:continue
  if part.startswith('*图'):part=part.strip('*')
  p=cell.paragraphs[0] if index==0 and not cell.paragraphs[0].text else cell.add_paragraph()
  p.paragraph_format.space_after=Pt(2);p.paragraph_format.line_spacing=1.05;p.paragraph_format.keep_with_next=False
  inline(p,part)

def table(rows,widths=None):
 n=len(rows[0]);assert all(len(row)==n for row in rows)
 if widths is None:
  widths=[1.12,5.75] if n==2 else [1.2,2.25,3.42] if n==3 else [1.25,2.1,1.6,1.92]
  if rows[0][0]=='修订日期':widths=[1.05,3.65,1.3,.87]
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
  no_split=OxmlElement('w:cantSplit');row._tr.get_or_add_trPr().append(no_split)
  if idx==0:
   repeat=OxmlElement('w:tblHeader');row._tr.get_or_add_trPr().append(repeat)
  for col,(cell,width,value) in enumerate(zip(row.cells,widths,values)):
   cell.width=Inches(width);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   props=cell._tc.get_or_add_tcPr();m=OxmlElement('w:tcMar')
   for side in ['top','left','bottom','right']:
    el=OxmlElement('w:'+side);el.set(qn('w:w'),'85');el.set(qn('w:type'),'dxa');m.append(el)
   props.append(m)
   paragraphs(cell,value)
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

def remove_picture(value):
 # The original figure/caption becomes a standalone block immediately before
 # its relevant table. Leave its stable figure number in the table.
 m=re.search(r'\*?(图[0-9.]+-\d+)[：:]([^*<]+)\*?',value)
 ref=m[1] if m else ''
 value=IMAGES.sub('',value)
 value=re.sub(r'\*图[0-9][^*]*\*','',value)
 value=re.sub(r'\*\*图示：\*\*(?:<br>)*',f'**图示：**{ref}<br>',value)
 value=re.sub(r'(?:<br>){2,}','<br>',value).strip()
 return ref if not value.replace('<br>','').strip() else value

def render_table(rows):
 header=rows[0]
 if header==['类型','图示','内容','说明']:
  # Use one self-contained record at a time so each standalone figure remains
  # next to its own module, without trapping raster pictures in narrow cells.
  for row in rows[1:]:
   pics=IMAGES.findall(row[1])
   if pics:
    caption=re.search(r'\*([^*]+)\*',row[1]);caption=caption[1] if caption else None
    for alt,url in pics:image_block(alt,url,caption)
   ref=remove_picture(row[1]) or row[1]
   table([['子功能','展示与交互'],[f'**{row[2]}**<br>类型：{row[0]}<br>{ref}',row[3]]],[1.2,5.67])
 else:
  cleaned=[]
  for row in rows:
   vals=[]
   for value in row:
    for pic in IMAGES.finditer(value):
     tail=value[pic.end():]
     caption=re.match(r'(?:<br\s*/?>)*\s*\*(图[0-9][^*]+)\*',tail)
     image_block(pic[1],pic[2],caption[1] if caption else None)
    vals.append(remove_picture(value) if IMAGES.search(value) else value)
   cleaned.append(vals)
  table(cleaned)

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
assert audit['floatingImages']==audit['picturesInTables']==audit['externalImageRelationships']==audit['fixedRowHeights']==0
report={'output':str(TARGET),'source':str(SOURCE),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'checkedTextSegments':checked,'missing':missing,'tables':len(doc.tables),'images':figures,'audit':audit,'feishuImportVerified':False,'renderStatus':'pending'}
(OUT/'home-prd-word-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='images'},ensure_ascii=False))
