from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops
from skimage import color, feature
from skimage.metrics import structural_similarity


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "docs" / "evidence" / "publisher-plan-v2"
VISUAL_DIR = EVIDENCE_DIR / "visual"
REPORT_PATH = EVIDENCE_DIR / "verification.json"

PAIRS = [
    {
        "name": "wallet-intentional-change",
        "original": EVIDENCE_DIR / "baseline" / "07-wallet-v1.png",
        "implementation": ROOT / "public" / "prd" / "publisher-plan-v2" / "07-wallet.png",
        "expected": "intentional-change",
        "note": "钱包内容区预期从人民币提现改为盖世币总余额和京东卡入口，整页不应追求与 V1 像素一致。",
    },
    {
        "name": "dashboard-shell-regression",
        "original": EVIDENCE_DIR / "baseline" / "13-dashboard-v1.png",
        "implementation": ROOT / "public" / "prd" / "publisher-plan-v2" / "13-dashboard.png",
        "expected": "preserve-shell",
        "note": "后台数据看板主体应保留，但侧边栏预期新增两个管理入口。",
    },
    {
        "name": "wallet-topbar-regression",
        "original": EVIDENCE_DIR / "components" / "c-topbar-wallet-v1.png",
        "implementation": EVIDENCE_DIR / "components" / "c-topbar-wallet.png",
        "expected": "strict-match",
        "note": "钱包顶部栏不在本轮视觉改动范围，应进行严格回归比较。",
    },
]

THRESHOLDS = {
    "rgbSimilarityMin": 0.95,
    "edgeSimilarityMin": 0.95,
    "ssimMin": 0.95,
    "deltaE2000P95Max": 3.0,
}


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def save_heatmap(diff: np.ndarray, output: Path) -> None:
    magnitude = diff.max(axis=2)
    intensity = np.clip(magnitude * 4.0, 0.0, 1.0)
    heat = np.zeros((*intensity.shape, 3), dtype=np.uint8)
    heat[..., 0] = (255 * intensity).astype(np.uint8)
    heat[..., 1] = (96 * (1.0 - intensity)).astype(np.uint8)
    heat[..., 2] = (180 * (1.0 - intensity)).astype(np.uint8)
    Image.fromarray(heat, "RGB").save(output)


def compare(pair: dict[str, object]) -> dict[str, object]:
    name = str(pair["name"])
    original_path = Path(pair["original"])
    implementation_path = Path(pair["implementation"])
    if not original_path.exists() or not implementation_path.exists():
        raise FileNotFoundError(f"Missing visual pair input: {name}")

    original_image = Image.open(original_path).convert("RGB")
    implementation_image = Image.open(implementation_path).convert("RGB")
    if original_image.size != implementation_image.size:
        raise AssertionError(
            f"Strict comparison requires equal dimensions for {name}: "
            f"{original_image.size} != {implementation_image.size}"
        )

    original = np.asarray(original_image, dtype=np.float32) / 255.0
    implementation = np.asarray(implementation_image, dtype=np.float32) / 255.0
    diff = np.abs(original - implementation)
    rgb_similarity = float(1.0 - diff.mean())

    original_gray = color.rgb2gray(original)
    implementation_gray = color.rgb2gray(implementation)
    original_edges = feature.canny(original_gray, sigma=0)
    implementation_edges = feature.canny(implementation_gray, sigma=0)
    edge_similarity = float(1.0 - np.logical_xor(original_edges, implementation_edges).mean())

    ssim_value = float(
        structural_similarity(
            original,
            implementation,
            data_range=1.0,
            channel_axis=2,
            gaussian_weights=False,
            win_size=7,
        )
    )
    delta_e = color.deltaE_ciede2000(color.rgb2lab(original), color.rgb2lab(implementation))
    delta_e_p95 = float(np.percentile(delta_e, 95))

    automatic_passed = (
        rgb_similarity >= THRESHOLDS["rgbSimilarityMin"]
        and edge_similarity >= THRESHOLDS["edgeSimilarityMin"]
        and ssim_value >= THRESHOLDS["ssimMin"]
        and delta_e_p95 <= THRESHOLDS["deltaE2000P95Max"]
    )

    pair_dir = VISUAL_DIR / name
    pair_dir.mkdir(parents=True, exist_ok=True)
    original_output = pair_dir / "original.png"
    implementation_output = pair_dir / "implementation.png"
    overlay_output = pair_dir / "overlay-50.png"
    difference_output = pair_dir / "absolute-difference.png"
    heatmap_output = pair_dir / "heatmap.png"
    shutil.copyfile(original_path, original_output)
    shutil.copyfile(implementation_path, implementation_output)
    Image.blend(original_image, implementation_image, 0.5).save(overlay_output)
    ImageChops.difference(original_image, implementation_image).save(difference_output)
    save_heatmap(diff, heatmap_output)

    return {
        "name": name,
        "expected": pair["expected"],
        "note": pair["note"],
        "dimensions": {"width": original_image.width, "height": original_image.height},
        "metrics": {
            "rgbSimilarity": round(rgb_similarity, 6),
            "edgeSimilarity": round(edge_similarity, 6),
            "ssim": round(ssim_value, 6),
            "deltaE2000P95": round(delta_e_p95, 6),
        },
        "thresholds": THRESHOLDS,
        "automaticPassed": automatic_passed,
        "files": {
            "original": relative(original_output),
            "implementation": relative(implementation_output),
            "overlay50": relative(overlay_output),
            "absoluteDifference": relative(difference_output),
            "heatmap": relative(heatmap_output),
        },
    }


def main() -> None:
    if not REPORT_PATH.exists():
        raise FileNotFoundError("Run verify-publisher-plan-v2-ui.mjs before visual comparison")
    VISUAL_DIR.mkdir(parents=True, exist_ok=True)
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    results = [compare(pair) for pair in PAIRS]
    strict_match = next(item for item in results if item["expected"] == "strict-match")
    geometry_error = float(report.get("geometry", {}).get("maxErrorPx", 999))
    strict_component_passed = bool(strict_match["automaticPassed"] and geometry_error <= 2)
    report["visualComparison"] = {
        "status": "pass" if strict_component_passed else "fail",
        "checkedAt": report["checkedAt"],
        "method": "full-resolution RGB MAE similarity, Canny edge XOR, uniform-window SSIM, CIEDE2000 P95 and component geometry",
        "noResize": True,
        "geometryThresholdPx": 2,
        "strictComponentPassed": strict_component_passed,
        "manualReview": {"status": "pending", "reviewer": None},
        "pairs": results,
        "interpretation": "整页钱包和后台侧边栏存在本轮预期改动，不用它们的整页分数覆盖组件结论；钱包顶部栏作为未改组件单独严格判定。新增兑换页没有同版本实机原稿，不声称像素级 PASS。",
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "PASS: visual evidence generated; strict component "
        + ("passed" if strict_component_passed else "failed")
    )


if __name__ == "__main__":
    main()
