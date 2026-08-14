from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops
from skimage.color import deltaE_ciede2000, rgb2lab
from skimage.feature import canny
from skimage.metrics import structural_similarity

SKILL = Path(__file__).resolve().parents[1]
WORKSPACE = SKILL.parents[2]
CONFIG = SKILL / "assets" / "visual-baselines.json"
CAPTURES = WORKSPACE / ".tmp" / "gamehub-app-ui" / "visual-captures"
COMPONENT_CAPTURES = WORKSPACE / ".tmp" / "gamehub-app-ui" / "component-captures"
GEOMETRY = WORKSPACE / ".tmp" / "gamehub-app-ui" / "geometry"
DIFFS = WORKSPACE / ".tmp" / "gamehub-app-ui" / "visual-diffs"
OVERLAYS = WORKSPACE / ".tmp" / "gamehub-app-ui" / "visual-overlays"
HEATMAPS = WORKSPACE / ".tmp" / "gamehub-app-ui" / "visual-heatmaps"
COMPONENT_DIFFS = WORKSPACE / ".tmp" / "gamehub-app-ui" / "component-diffs"
REPORT = SKILL / "assets" / "visual-report.json"


def image_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image.convert("RGB"), dtype=np.uint8)


def rgb_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(1.0 - np.abs(a.astype(np.int16) - b.astype(np.int16)).mean() / 255.0)


def edge_similarity(a: np.ndarray, b: np.ndarray) -> float:
    gray_a = np.dot(a[..., :3], [0.299, 0.587, 0.114]) / 255.0
    gray_b = np.dot(b[..., :3], [0.299, 0.587, 0.114]) / 255.0
    edges_a = canny(gray_a, sigma=0.0)
    edges_b = canny(gray_b, sigma=0.0)
    return float(1.0 - np.logical_xor(edges_a, edges_b).mean())


def structure_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(
        structural_similarity(
            a,
            b,
            data_range=255,
            channel_axis=2,
            gaussian_weights=False,
            win_size=7,
        )
    )


def delta_e_p95(a: np.ndarray, b: np.ndarray) -> float:
    lab_a = rgb2lab(a.astype(np.float32) / 255.0)
    lab_b = rgb2lab(b.astype(np.float32) / 255.0)
    return float(np.percentile(deltaE_ciede2000(lab_a, lab_b), 95))


def metrics(original: Image.Image, implementation: Image.Image) -> dict[str, float]:
    a = image_array(original)
    b = image_array(implementation)
    return {
        "rgbScore": round(rgb_similarity(a, b), 6),
        "edgeScore": round(edge_similarity(a, b), 6),
        "structureScore": round(structure_similarity(a, b), 6),
        "deltaE2000P95": round(delta_e_p95(a, b), 4),
    }


def automatic_pass(values: dict[str, float], thresholds: dict[str, float], geometry_passed: bool) -> bool:
    return bool(
        values["rgbScore"] >= thresholds["rgb"]
        and values["edgeScore"] >= thresholds["edge"]
        and values["structureScore"] >= thresholds["structure"]
        and values["deltaE2000P95"] <= thresholds["deltaE2000P95"]
        and geometry_passed
    )


def failure_reasons(values: dict[str, float], thresholds: dict[str, float], geometry_passed: bool) -> list[str]:
    reasons: list[str] = []
    if values["rgbScore"] < thresholds["rgb"]:
        reasons.append(f"RGB {values['rgbScore']:.2%} < {thresholds['rgb']:.2%}")
    if values["edgeScore"] < thresholds["edge"]:
        reasons.append(f"边缘 {values['edgeScore']:.2%} < {thresholds['edge']:.2%}")
    if values["structureScore"] < thresholds["structure"]:
        reasons.append(f"结构 {values['structureScore']:.2%} < {thresholds['structure']:.2%}")
    if values["deltaE2000P95"] > thresholds["deltaE2000P95"]:
        reasons.append(f"ΔE2000 P95 {values['deltaE2000P95']:.2f} > {thresholds['deltaE2000P95']:.2f}")
    if not geometry_passed:
        reasons.append("一个或多个组件边界框误差超过 2px")
    return reasons


def save_evidence(original: Image.Image, implementation: Image.Image, key: str) -> tuple[Path, Path, Path]:
    difference_path = DIFFS / f"{key}-difference.png"
    overlay_path = OVERLAYS / f"{key}-overlay.png"
    heatmap_path = HEATMAPS / f"{key}-heatmap.png"
    ImageChops.difference(original, implementation).save(difference_path)
    Image.blend(original, implementation, 0.5).save(overlay_path)
    diff = np.abs(image_array(original).astype(np.int16) - image_array(implementation).astype(np.int16)).max(axis=2).astype(np.uint8)
    heat = np.zeros((diff.shape[0], diff.shape[1], 3), dtype=np.uint8)
    heat[..., 0] = np.minimum(255, diff.astype(np.uint16) * 4).astype(np.uint8)
    heat[..., 1] = np.minimum(255, np.maximum(0, diff.astype(np.int16) - 32) * 2).astype(np.uint8)
    Image.fromarray(heat, "RGB").save(heatmap_path)
    return difference_path, overlay_path, heatmap_path


def relative(path: Path) -> str:
    return path.relative_to(WORKSPACE).as_posix()


def main() -> None:
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    if data.get("schemaVersion", 0) < 4:
        raise RuntimeError("visual baseline schema is legacy")
    thresholds = data["thresholds"]
    for directory in [DIFFS, OVERLAYS, HEATMAPS, COMPONENT_DIFFS]:
        directory.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, object]] = []
    for page in data["pages"]:
        original_path = SKILL / "assets" / "visual-sources" / f"{page['key']}-original.webp"
        implementation_path = CAPTURES / f"{page['key']}-implementation.png"
        geometry_path = GEOMETRY / f"{page['key']}.json"
        if not original_path.exists() or not implementation_path.exists() or not geometry_path.exists():
            raise FileNotFoundError(f"missing strict evidence for {page['key']}")
        geometry = json.loads(geometry_path.read_text(encoding="utf-8"))
        geometry_passed = all(component["passed"] for component in geometry["components"])
        with Image.open(original_path).convert("RGB") as original, Image.open(implementation_path).convert("RGB") as implementation:
            if original.size != implementation.size:
                raise ValueError(f"{page['key']}: size mismatch {original.size} != {implementation.size}")
            values = metrics(original, implementation)
            difference_path, overlay_path, heatmap_path = save_evidence(original, implementation, page["key"])
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
                    component_values = metrics(expected, actual)
                    component_diff = COMPONENT_DIFFS / f"{page['key']}--{component['id']}-difference.png"
                    ImageChops.difference(expected, actual).save(component_diff)
                geometry_row = next(row for row in geometry["components"] if row["id"] == component["id"])
                component_auto = automatic_pass(component_values, thresholds, geometry_row["passed"])
                components.append({
                    "id": component["id"],
                    "label": component["label"],
                    "box": component["box"],
                    "metrics": component_values,
                    "geometry": geometry_row,
                    "automaticPassed": component_auto,
                    "failureReasons": failure_reasons(component_values, thresholds, geometry_row["passed"]),
                    "implementation": relative(actual_path),
                    "difference": relative(component_diff),
                })
        page_auto = automatic_pass(values, thresholds, geometry_passed) and all(component["automaticPassed"] for component in components)
        manual = page["manualReview"]
        passed = page_auto and manual["status"] == "pass"
        reasons = failure_reasons(values, thresholds, geometry_passed)
        if any(not component["automaticPassed"] for component in components):
            reasons.append("一个或多个登记组件未通过独立门槛")
        if manual["status"] != "pass":
            reasons.append(f"人工审图状态为 {manual['status']}")
        rows.append({
            "id": page["id"],
            "key": page["key"],
            "name": page["name"],
            "canvas": [page["width"], page["height"]],
            "metrics": values,
            "geometryPassed": geometry_passed,
            "geometry": relative(geometry_path),
            "automaticPassed": page_auto,
            "manualReview": manual,
            "passed": passed,
            "failureReasons": reasons,
            "original": relative(original_path),
            "implementation": relative(implementation_path),
            "overlay": relative(overlay_path),
            "difference": relative(difference_path),
            "heatmap": relative(heatmap_path),
            "components": components,
        })
    report = {
        "schemaVersion": 4,
        "metricPolicy": "Exact-size, full-resolution RGB MAE, Canny edge XOR, uniform-window SSIM, CIEDE2000 P95 and component geometry. No pre-blur or downsampling.",
        "thresholds": thresholds,
        "automaticPassed": all(row["automaticPassed"] for row in rows),
        "passed": all(row["passed"] for row in rows),
        "pages": rows,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for row in rows:
        values = row["metrics"]
        print(
            f"{'PASS' if row['passed'] else 'FAIL'} {row['key']} "
            f"RGB={values['rgbScore']:.2%} edge={values['edgeScore']:.2%} "
            f"SSIM={values['structureScore']:.2%} dE95={values['deltaE2000P95']:.2f} "
            f"geometry={'PASS' if row['geometryPassed'] else 'FAIL'} manual={row['manualReview']['status']}"
        )
        for component in row["components"]:
            component_values = component["metrics"]
            print(
                f"  {'PASS' if component['automaticPassed'] else 'FAIL'} {component['id']} "
                f"RGB={component_values['rgbScore']:.2%} edge={component_values['edgeScore']:.2%} "
                f"SSIM={component_values['structureScore']:.2%} dE95={component_values['deltaE2000P95']:.2f}"
            )
    if not report["passed"]:
        raise SystemExit("FAIL visualFidelity: strict automatic and manual gates are not all passing")
    print(f"PASS visualFidelity ({len(rows)}/{len(rows)})")


if __name__ == "__main__":
    main()
