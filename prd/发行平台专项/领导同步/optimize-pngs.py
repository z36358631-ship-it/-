from pathlib import Path
from PIL import Image


SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "output"
EXPECTED_NAMES = [
    "01-product-landscape.png",
    "02-onboarding-and-game.png",
    "03-integration-test-release.png",
    "04-commerce-and-operation.png",
    "05-operations-and-scope.png",
    "06-enterprise-certification.png",
]
MAX_BYTES = 5 * 1024 * 1024


def main() -> None:
    if not OUTPUT_DIR.is_dir():
        raise SystemExit(f"缺少输出目录：{OUTPUT_DIR}")

    files = sorted(OUTPUT_DIR.glob("*.png"))
    if [file.name for file in files] != EXPECTED_NAMES:
        actual = ", ".join(file.name for file in files) or "(none)"
        raise SystemExit(f"PNG 文件应为固定 6 张，实际为：{actual}")

    for file in files:
        temporary = file.with_name(f".{file.stem}.optimized.png")
        try:
            with Image.open(file) as image:
                image.load()
                if image.format != "PNG":
                    raise SystemExit(f"{file.name}: 文件格式不是 PNG")
                if image.size != (1920, 1080):
                    raise SystemExit(
                        f"{file.name}: expected 1920x1080, got {image.size[0]}x{image.size[1]}"
                    )
                image.save(
                    temporary,
                    format="PNG",
                    optimize=True,
                    compress_level=9,
                )
            temporary.replace(file)
        finally:
            if temporary.exists():
                temporary.unlink()

        size = file.stat().st_size
        if size >= MAX_BYTES:
            raise SystemExit(f"{file.name}: {size} bytes，超过 5 MB")
        print(f"{file.name}\t1920x1080\t{size / 1024:.1f} KiB")

    print(f"Optimized {len(files)} PNG files; every file is below 5 MB.")


if __name__ == "__main__":
    main()
