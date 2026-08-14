from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

SKILL = Path(__file__).resolve().parents[1]
WORKSPACE = SKILL.parents[2]
CONFIG = SKILL / "assets" / "visual-baselines.json"
OUTPUT = SKILL / "assets" / "visual-sources"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    generated: list[dict[str, object]] = []
    for page in data["pages"]:
        source = WORKSPACE / page["source"]
        if not source.exists():
            raise FileNotFoundError(source)
        with Image.open(source) as source_image:
            image = source_image.convert("RGB")
            if image.size != (page["width"], page["height"]):
                raise ValueError(
                    f"{page['id']}: expected {(page['width'], page['height'])}, got {image.size}"
                )
            original = OUTPUT / f"{page['key']}-original.webp"
            image.save(original, "WEBP", lossless=True, method=6)
            generated.append(
                {
                    "key": f"{page['key']}:original",
                    "file": original.name,
                    "source": page["source"],
                    "crop": [0, 0, page["width"], page["height"]],
                    "sha256": digest(original),
                }
            )
            for media_key, box in page.get("media", {}).items():
                x1, y1, x2, y2 = box
                if not (0 <= x1 < x2 <= page["width"] and 0 <= y1 < y2 <= page["height"]):
                    raise ValueError(f"{page['key']}:{media_key}: invalid crop {box}")
                crop = image.crop((x1, y1, x2, y2))
                target = OUTPUT / f"{page['key']}--{media_key}.webp"
                crop.save(target, "WEBP", lossless=True, method=6)
                generated.append(
                    {
                        "key": f"{page['key']}:media:{media_key}",
                        "file": target.name,
                        "source": page["source"],
                        "crop": box,
                        "sha256": digest(target),
                    }
                )
    manifest = OUTPUT / "media-manifest.json"
    manifest.write_text(
        json.dumps({"schemaVersion": 1, "assets": generated}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"WROTE {len(generated)} immutable visual assets")
    print(f"WROTE {manifest}")


if __name__ == "__main__":
    main()
