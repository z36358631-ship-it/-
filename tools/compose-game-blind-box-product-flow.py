from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "test-results" / "game-blind-box" / "product-flow-source"
OUTPUT_PATH = ROOT / "public" / "prd" / "game-blind-box" / "05-product-flow.png"
STEPS = [
    ("01-library.png", "1  游戏库入口"),
    ("02-modal-open.png", "2  打开盲盒"),
    ("03-random-switch.png", "3  随机切换"),
    ("04-result.png", "4  命中游戏"),
    ("05-details.png", "5  游戏详情"),
]

BACKGROUND = "#101216"
PANEL = "#1A1D23"
BORDER = "#343943"
TEXT = "#F5F6F8"
ACCENT = "#F5C451"
PANEL_WIDTH = 440
SCREEN_HEIGHT = 940
TITLE_HEIGHT = 74
PANEL_PADDING = 14
GAP = 72
OUTER_PADDING = 42


def load_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/msyhbd.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
    ]
    for font_path in candidates:
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size=size)
    return ImageFont.load_default()


def fit_screen(image: Image.Image) -> Image.Image:
    max_width = PANEL_WIDTH - PANEL_PADDING * 2
    scale = min(max_width / image.width, SCREEN_HEIGHT / image.height)
    size = (round(image.width * scale), round(image.height * scale))
    return image.convert("RGB").resize(size, Image.Resampling.LANCZOS)


def main() -> None:
    missing = [name for name, _ in STEPS if not (SOURCE_DIR / name).exists()]
    if missing:
        raise FileNotFoundError(f"Missing source images: {', '.join(missing)}")

    title_font = load_font(30)
    arrow_font = load_font(52)
    screens = [(fit_screen(Image.open(SOURCE_DIR / name)), title) for name, title in STEPS]
    panel_height = TITLE_HEIGHT + SCREEN_HEIGHT + PANEL_PADDING * 2
    width = OUTER_PADDING * 2 + PANEL_WIDTH * len(STEPS) + GAP * (len(STEPS) - 1)
    height = OUTER_PADDING * 2 + panel_height
    canvas = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    for index, (screen, title) in enumerate(screens):
        x = OUTER_PADDING + index * (PANEL_WIDTH + GAP)
        y = OUTER_PADDING
        draw.rounded_rectangle(
            (x, y, x + PANEL_WIDTH, y + panel_height),
            radius=20,
            fill=PANEL,
            outline=BORDER,
            width=2,
        )
        title_box = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_box[2] - title_box[0]
        draw.text(
            (x + (PANEL_WIDTH - title_width) / 2, y + 20),
            title,
            font=title_font,
            fill=TEXT,
        )
        screen_x = x + (PANEL_WIDTH - screen.width) // 2
        screen_y = y + TITLE_HEIGHT + PANEL_PADDING + (SCREEN_HEIGHT - screen.height) // 2
        canvas.paste(screen, (screen_x, screen_y))

        if index < len(screens) - 1:
            arrow = "→"
            arrow_box = draw.textbbox((0, 0), arrow, font=arrow_font)
            arrow_width = arrow_box[2] - arrow_box[0]
            arrow_height = arrow_box[3] - arrow_box[1]
            arrow_x = x + PANEL_WIDTH + (GAP - arrow_width) / 2
            arrow_y = y + panel_height / 2 - arrow_height / 2 - arrow_box[1]
            draw.text((arrow_x, arrow_y), arrow, font=arrow_font, fill=ACCENT)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT_PATH, format="PNG", optimize=True)
    print(f"{OUTPUT_PATH} | {canvas.width}x{canvas.height} | {OUTPUT_PATH.stat().st_size} bytes")


if __name__ == "__main__":
    main()
