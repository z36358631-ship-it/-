from pathlib import Path
import pypdfium2 as pdfium
from PIL import Image,ImageDraw
import json
out=Path(__file__).resolve().parent/'render-v17';pdf=pdfium.PdfDocument(str(next(out.glob('*.pdf'))));pages=out/'pages';pages.mkdir(exist_ok=True)
for old in pages.glob('page-*.png'):
 if int(old.stem.split('-')[-1])>len(pdf):old.unlink()
for old in out.glob('contact-*.png'):
 if int(old.stem.split('-')[-1])>len(pdf):old.unlink()
texts=[]
for i,p in enumerate(pdf):
 p.render(scale=1.5).to_pil().save(pages/f'page-{i+1:02}.png')
 texts.append({'page':i+1,'text':p.get_textpage().get_text_range()})
for start in range(0,len(pdf),6):
 sheet=Image.new('RGB',(1200,1120),'#ddd');d=ImageDraw.Draw(sheet)
 for j in range(start,min(len(pdf),start+6)):
  im=Image.open(pages/f'page-{j+1:02}.png');im.thumbnail((390,525));x=(j-start)%3*400;y=(j-start)//3*560
  sheet.paste(im,(x,y+25));d.text((x+10,y+5),str(j+1),fill='black')
 sheet.save(out/f'contact-{start+1:02}.png')
(out/'page-text.json').write_text(json.dumps(texts,ensure_ascii=False,indent=2),'utf-8')
print(len(pdf))
