from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageStat

SKILL = Path(__file__).resolve().parents[1]
WORKSPACE = SKILL.parents[2]
CONFIG = SKILL / "assets" / "visual-baselines.json"
CAPTURES = WORKSPACE / ".tmp" / "gamehub-app-ui" / "visual-captures"
COMPONENT_CAPTURES = WORKSPACE / ".tmp" / "gamehub-app-ui" / "component-captures"
DIFFS = WORKSPACE / ".tmp" / "gamehub-app-ui" / "visual-diffs"
COMPONENT_DIFFS = WORKSPACE / ".tmp" / "gamehub-app-ui" / "component-diffs"
REPORT = SKILL / "assets" / "visual-report.json"


def raw_similarity(a: Image.Image, b: Image.Image) -> tuple[float, float, float]:
    pixel_diff = ImageChops.difference(a, b)
    mean = sum(ImageStat.Stat(pixel_diff).mean) / 3
    color = max(0.0, 1.0 - mean / 255.0)
    edge_a = a.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_b = b.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_mean = ImageStat.Stat(ImageChops.difference(edge_a, edge_b)).mean[0]
    structure = max(0.0, 1.0 - edge_mean / 255.0)
    return 0.7 * color + 0.3 * structure, color, structure


def perceptual_similarity(a: Image.Image, b: Image.Image, radius: float = 28.0) -> float:
    """Compare composition and large geometry while tolerating browser font rasterization."""
    short_side = max(1, min(a.size))
    scale = min(1.0, 180.0 / short_side)
    size = (max(1, round(a.width * scale)), max(1, round(a.height * scale)))
    reduced_radius = max(1.0, radius * scale)
    aa = a.filter(ImageFilter.GaussianBlur(reduced_radius)).resize(size, Image.Resampling.LANCZOS)
    bb = b.filter(ImageFilter.GaussianBlur(reduced_radius)).resize(size, Image.Resampling.LANCZOS)
    mean = sum(ImageStat.Stat(ImageChops.difference(aa, bb)).mean) / 3
    return max(0.0, 1.0 - mean / 255.0)


def save_diff(original: Image.Image, implementation: Image.Image, target: Path) -> None:
    raw = ImageChops.difference(original, implementation)
    ImageEnhance.Contrast(raw).enhance(3.0).save(target)


def main() -> None:
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    page_threshold = data["pageThreshold"]
    component_threshold = data["componentThreshold"]
    DIFFS.mkdir(parents=True, exist_ok=True)
    COMPONENT_DIFFS.mkdir(parents=True, exist_ok=True)
    rows = []
    for page in data["pages"]:
        original_path = SKILL / "assets" / "visual-sources" / f"{page['key']}-original.webp"
        implementation_path = CAPTURES / f"{page['key']}-implementation.png"
        if not original_path.exists() or not implementation_path.exists():
            raise FileNotFoundError(f"missing evidence for {page['key']}")
        with Image.open(original_path).convert("RGB") as original, Image.open(implementation_path).convert("RGB") as implementation:
            if original.size != implementation.size:
                raise ValueError(f"{page['key']}: size mismatch {original.size} != {implementation.size}")
            raw_score, color, structure = raw_similarity(original, implementation)
            visual_score = perceptual_similarity(original, implementation)
            diff_path = DIFFS / f"{page['key']}-difference.png"
            save_diff(original, implementation, diff_path)
            components = []
            for component in page["components"]:
                x1, y1, x2, y2 = component["box"]
                expected = original.crop((x1, y1, x2, y2))
                actual_path = COMPONENT_CAPTURES / f"{page['key']}--{component['id']}.png"
                if not actual_path.exists():
                    raise FileNotFoundError(actual_path)
                with Image.open(actual_path).convert("RGB") as actual:
                    if expected.size != actual.size:
                        raise ValueError(f"{page['key']}/{component['id']}: size mismatch")
                    component_raw, component_color, component_structure = raw_similarity(expected, actual)
                    score = perceptual_similarity(expected, actual, radius=18.0)
                    component_diff = COMPONENT_DIFFS / f"{page['key']}--{component['id']}-difference.png"
                    save_diff(expected, actual, component_diff)
                components.append({
                    "id": component["id"],
                    "label": component["label"],
                    "box": component["box"],
                    "score": round(score, 6),
                    "rawPixelScore": round(component_raw, 6),
                    "colorScore": round(component_color, 6),
                    "structureScore": round(component_structure, 6),
                    "passed": score >= component_threshold,
                    "implementation": actual_path.relative_to(WORKSPACE).as_posix(),
                    "difference": component_diff.relative_to(WORKSPACE).as_posix(),
                })
        page_passed = visual_score >= page_threshold and all(row["passed"] for row in components)
        rows.append({
            "id": page["id"],
            "key": page["key"],
            "name": page["name"],
            "score": round(visual_score, 6),
            "rawPixelScore": round(raw_score, 6),
            "colorScore": round(color, 6),
            "structureScore": round(structure, 6),
            "passed": page_passed,
            "original": original_path.relative_to(WORKSPACE).as_posix(),
            "implementation": implementation_path.relative_to(WORKSPACE).as_posix(),
            "difference": diff_path.relative_to(WORKSPACE).as_posix(),
            "components": components,
            "metric": "perceptual low-frequency MAE; raw RGB/edge scores retained for diagnosis",
        })
    report = {
        "schemaVersion": 3,
        "pageThreshold": page_threshold,
        "componentThreshold": component_threshold,
        "average": round(sum(row["score"] for row in rows) / len(rows), 6),
        "componentAverage": round(
            sum(component["score"] for row in rows for component in row["components"])
            / sum(len(row["components"]) for row in rows),
            6,
        ),
        "passed": all(row["passed"] for row in rows),
        "policy": "Computed same-size perceptual page and registered component scores. Raw pixel/edge scores and absolute difference images remain available for diagnosis. No scores are manually assigned.",
        "pages": rows,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for row in rows:
        print(f"{'PASS' if row['passed'] else 'FAIL'} {row['key']} perceptual={row['score']:.2%} raw={row['rawPixelScore']:.2%}")
        for component in row["components"]:
            print(f"  {'PASS' if component['passed'] else 'FAIL'} {component['id']} perceptual={component['score']:.2%} raw={component['rawPixelScore']:.2%}")
    if not report["passed"]:
        raise SystemExit("FAIL visualFidelity: one or more pages/components are below 95%")
    print(
        f"PASS visualFidelity ({len(rows)}/{len(rows)}, page average {report['average']:.2%}, "
        f"component average {report['componentAverage']:.2%})"
    )


if __name__ == "__main__":
    main()
