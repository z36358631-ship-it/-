from pathlib import Path
import pypdfium2 as pdf
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'prd-render-final'
OUT.mkdir(exist_ok=True)
d=pdf.PdfDocument(ROOT/'prd-render/prd.pdf')
for i,page in enumerate(d):
    im=page.render(scale=1.5).to_pil()
    im.save(OUT/f'page-{i+1}.png')
    (OUT/f'page-{i+1}.txt').write_text(page.get_textpage().get_text_range(),encoding='utf-8')
for start in range(0,len(d),9):
    n=min(9,len(d)-start);sheet=Image.new('RGB',(1020,((n+2)//3)*490),'#ddd');dr=ImageDraw.Draw(sheet)
    for j in range(n):
        im=Image.open(OUT/f'page-{start+j+1}.png');im.thumbnail((328,465));x=(j%3)*340;y=(j//3)*490
        sheet.paste(im,(x+6,y+22));dr.text((x+10,y+3),str(start+j+1),fill='black')
    sheet.save(OUT/f'contact-{start//9+1}.png')
print(f'Rendered {len(d)} page PNGs')
