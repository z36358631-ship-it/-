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
    ("02-dashboard-overview.png", "01 进入单游戏数据", "从游戏管理进入当前游戏的经营数据", 0.24),
    ("02-dashboard-overview.png", "02 查看曝光转化", "查看六项指标与按日详情", 0.58),
    ("03-dashboard-calendar.png", "03 筛选与理解指标", "按时间、来源与地区筛选", 0.34),
    ("06-dashboard-users.png", "04 查看用户数据", "查看活跃、新增、留存和时长", 0.58),
]

canvas = Image.new("RGB", (2960, 760), "#f5f7fa")
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((36, 36, 2924, 724), radius=24, fill="#ffffff", outline="#e4e7ec", width=2)
draw.text((76, 66), "发行平台开发者数据看板主流程", fill="#182230", font=font(32, True))
draw.text((76, 112), "进入单游戏 → 查看曝光转化 → 筛选并理解指标 → 查看用户数据", fill="#667085", font=font(20))

card_width, card_height = 640, 500
start_x, top, step_gap = 70, 172, 710
for index, (file_name, title, subtitle, focus_y) in enumerate(steps):
    x = start_x + index * step_gap
    draw.rounded_rectangle((x, top, x + card_width, top + card_height), radius=18, fill="#ffffff", outline="#d0d5dd", width=2)
    source = Image.open(SOURCE_DIR / file_name).convert("RGB")
    target_width, target_height = 592, 310
    ratio = max(target_width / source.width, target_height / source.height)
    resized = source.resize((round(source.width * ratio), round(source.height * ratio)), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_width) // 2)
    upper = max(0, min(resized.height - target_height, round(resized.height * focus_y - target_height / 2)))
    crop = resized.crop((left, upper, left + target_width, upper + target_height))
    canvas.paste(crop, (x + 24, top + 24))
    draw.rounded_rectangle((x + 24, top + 24, x + 616, top + 334), radius=10, outline="#e4e7ec", width=2)
    draw.text((x + 28, top + 362), title, fill="#182230", font=font(24, True))
    draw.text((x + 28, top + 406), subtitle, fill="#667085", font=font(17))
    if index < len(steps) - 1:
        arrow_x = x + card_width + 22
        arrow_y = top + 248
        draw.line((arrow_x, arrow_y, arrow_x + 30, arrow_y), fill="#d5a400", width=6)
        draw.polygon([(arrow_x + 30, arrow_y - 10), (arrow_x + 48, arrow_y), (arrow_x + 30, arrow_y + 10)], fill="#d5a400")

canvas.save(OUTPUT, optimize=True)
print(f"Built {OUTPUT}")
