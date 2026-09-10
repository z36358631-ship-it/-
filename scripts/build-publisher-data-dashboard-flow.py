from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = REPO_ROOT / "public" / "prd" / "publisher-data-dashboard"
OUTPUT = SOURCE_DIR / "01-product-flow.png"


def font(size: int, bold: bool = False):
    candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


steps = [
    ("02-dashboard-overview.png", "01 进入数据看板", "统一查看经营结果"),
    ("03-order-list.png", "02 筛选与查看", "同一快照联动指标和列表"),
    ("04-order-detail.png", "03 定位异常订单", "查看脱敏订单与资金影响"),
    ("05-income-settlement.png", "04 进入正式对账", "核对预估收入与待结算"),
]

canvas = Image.new("RGB", (2400, 760), "#f5f7fa")
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((36, 36, 2364, 724), radius=24, fill="#ffffff", outline="#e4e7ec", width=2)
draw.text((76, 66), "发行平台开发者数据看板主流程", fill="#182230", font=font(32, True))
draw.text((76, 112), "经营概览 → 脱敏订单 → 资金影响 → 财务结算", fill="#667085", font=font(20))

card_width, card_height = 500, 500
start_x, top = 76, 172
for index, (file_name, title, subtitle) in enumerate(steps):
    x = start_x + index * 570
    draw.rounded_rectangle((x, top, x + card_width, top + card_height), radius=18, fill="#ffffff", outline="#d0d5dd", width=2)
    source = Image.open(SOURCE_DIR / file_name).convert("RGB")
    target_width, target_height = 452, 310
    ratio = max(target_width / source.width, target_height / source.height)
    resized = source.resize((round(source.width * ratio), round(source.height * ratio)), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_width) // 2)
    upper = max(0, (resized.height - target_height) // 2)
    crop = resized.crop((left, upper, left + target_width, upper + target_height))
    canvas.paste(crop, (x + 24, top + 24))
    draw.rounded_rectangle((x + 24, top + 24, x + 476, top + 334), radius=10, outline="#e4e7ec", width=2)
    draw.text((x + 28, top + 362), title, fill="#182230", font=font(24, True))
    draw.text((x + 28, top + 406), subtitle, fill="#667085", font=font(17))
    if index < len(steps) - 1:
        arrow_x = x + card_width + 22
        arrow_y = top + 248
        draw.line((arrow_x, arrow_y, arrow_x + 30, arrow_y), fill="#d5a400", width=6)
        draw.polygon([(arrow_x + 30, arrow_y - 10), (arrow_x + 48, arrow_y), (arrow_x + 30, arrow_y + 10)], fill="#d5a400")

canvas.save(OUTPUT, optimize=True)
print(f"Built {OUTPUT}")
