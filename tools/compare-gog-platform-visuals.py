from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CAPTURES = ROOT / ".tmp" / "gog-platform-demo-captures"
OUTPUT = ROOT / ".tmp" / "gog-platform-demo-visual-report"

REFERENCE_MAP = {
    "01-profile-portrait.png": "_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/30-我的.png",
    "03-library-home-portrait.png": "assets/reference/gog-platform-real-pages/01-library-home-portrait.png",
    "04-library-home-landscape.png": "assets/reference/gog-platform-real-pages/02-library-home-landscape.png",
    "05-gog-library-portrait.png": "assets/reference/gog-platform-real-pages/04-epic-library-portrait.png",
    "06-gog-library-landscape.png": "assets/reference/gog-platform-real-pages/03-epic-library-landscape.png",
    "07-search-portrait.png": "_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/09-竖版搜索默认页.png",
    "08-search-landscape.png": "_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/43-掌机模式-搜索.png",
    "09-detail-portrait.png": "_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/10-竖版游戏详情.png",
    "10-detail-landscape.png": "_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/44-掌机模式-游戏详情.png",
}

THRESHOLDS = {
    "rgb_similarity": 0.95,
    "edge_similarity": 0.95,
    "window_ssim": 0.95,
    "delta_e_2000_p95": 3.0,
}


def load_rgb(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def fit_reference(reference: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(reference, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def grayscale(array: np.ndarray) -> np.ndarray:
    return array[..., 0] * 0.2126 + array[..., 1] * 0.7152 + array[..., 2] * 0.0722


def edge_mask(array: np.ndarray) -> np.ndarray:
    gray = grayscale(array)
    dx = np.zeros_like(gray)
    dy = np.zeros_like(gray)
    dx[:, 1:] = np.abs(gray[:, 1:] - gray[:, :-1])
    dy[1:, :] = np.abs(gray[1:, :] - gray[:-1, :])
    return np.hypot(dx, dy) >= 24.0


def window_ssim(left: np.ndarray, right: np.ndarray, window: int = 32) -> float:
    a = grayscale(left)
    b = grayscale(right)
    c1 = (0.01 * 255.0) ** 2
    c2 = (0.03 * 255.0) ** 2
    scores: list[float] = []
    for y in range(0, a.shape[0], window):
        for x in range(0, a.shape[1], window):
            wa = a[y : y + window, x : x + window]
            wb = b[y : y + window, x : x + window]
            if wa.size < 16:
                continue
            ma = float(wa.mean())
            mb = float(wb.mean())
            va = float(wa.var())
            vb = float(wb.var())
            cov = float(((wa - ma) * (wb - mb)).mean())
            score = ((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2))
            scores.append(score)
    return float(np.mean(scores)) if scores else 0.0


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    value = rgb.astype(np.float64) / 255.0
    value = np.where(value <= 0.04045, value / 12.92, ((value + 0.055) / 1.055) ** 2.4)
    matrix = np.array(
        [
            [0.4124564, 0.3575761, 0.1804375],
            [0.2126729, 0.7151522, 0.0721750],
            [0.0193339, 0.1191920, 0.9503041],
        ]
    )
    xyz = value @ matrix.T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    epsilon = 216 / 24389
    kappa = 24389 / 27
    f = np.where(xyz > epsilon, np.cbrt(xyz), (kappa * xyz + 16) / 116)
    return np.stack((116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])), axis=-1)


def delta_e_2000(lab1: np.ndarray, lab2: np.ndarray) -> np.ndarray:
    l1, a1, b1 = np.moveaxis(lab1, -1, 0)
    l2, a2, b2 = np.moveaxis(lab2, -1, 0)
    c1 = np.hypot(a1, b1)
    c2 = np.hypot(a2, b2)
    c_bar = (c1 + c2) / 2
    g = 0.5 * (1 - np.sqrt((c_bar**7) / (c_bar**7 + 25**7 + 1e-12)))
    a1p = (1 + g) * a1
    a2p = (1 + g) * a2
    c1p = np.hypot(a1p, b1)
    c2p = np.hypot(a2p, b2)
    h1p = np.mod(np.degrees(np.arctan2(b1, a1p)), 360)
    h2p = np.mod(np.degrees(np.arctan2(b2, a2p)), 360)
    dl = l2 - l1
    dc = c2p - c1p
    dh_raw = h2p - h1p
    dh = np.where(c1p * c2p == 0, 0, np.where(dh_raw > 180, dh_raw - 360, np.where(dh_raw < -180, dh_raw + 360, dh_raw)))
    dh_term = 2 * np.sqrt(c1p * c2p) * np.sin(np.radians(dh / 2))
    l_bar = (l1 + l2) / 2
    c_bar_p = (c1p + c2p) / 2
    h_sum = h1p + h2p
    h_bar = np.where(
        c1p * c2p == 0,
        h_sum,
        np.where(np.abs(h1p - h2p) <= 180, h_sum / 2, np.where(h_sum < 360, (h_sum + 360) / 2, (h_sum - 360) / 2)),
    )
    t = 1 - 0.17 * np.cos(np.radians(h_bar - 30)) + 0.24 * np.cos(np.radians(2 * h_bar)) + 0.32 * np.cos(np.radians(3 * h_bar + 6)) - 0.20 * np.cos(np.radians(4 * h_bar - 63))
    delta_theta = 30 * np.exp(-((h_bar - 275) / 25) ** 2)
    rc = 2 * np.sqrt((c_bar_p**7) / (c_bar_p**7 + 25**7 + 1e-12))
    sl = 1 + (0.015 * (l_bar - 50) ** 2) / np.sqrt(20 + (l_bar - 50) ** 2)
    sc = 1 + 0.045 * c_bar_p
    sh = 1 + 0.015 * c_bar_p * t
    rt = -np.sin(np.radians(2 * delta_theta)) * rc
    return np.sqrt((dl / sl) ** 2 + (dc / sc) ** 2 + (dh_term / sh) ** 2 + rt * (dc / sc) * (dh_term / sh))


def save_heatmap(diff: np.ndarray, path: Path) -> None:
    magnitude = np.linalg.norm(diff, axis=-1)
    normalized = np.clip(magnitude / 110.0, 0, 1)
    heat = np.zeros((*normalized.shape, 3), dtype=np.uint8)
    heat[..., 0] = (normalized * 255).astype(np.uint8)
    heat[..., 1] = (np.sqrt(normalized) * 128).astype(np.uint8)
    Image.fromarray(heat, "RGB").save(path)


def compare(capture_name: str, reference_relative: str) -> dict[str, object]:
    capture_path = CAPTURES / capture_name
    reference_path = ROOT / reference_relative
    implementation = load_rgb(capture_path)
    reference = fit_reference(load_rgb(reference_path), implementation.size)
    left = np.asarray(reference, dtype=np.float64)
    right = np.asarray(implementation, dtype=np.float64)
    diff = np.abs(left - right)
    rgb_similarity = float(1 - diff.mean() / 255.0)
    edge_similarity = float(1 - np.logical_xor(edge_mask(left), edge_mask(right)).mean())
    ssim = window_ssim(left, right)
    delta = delta_e_2000(rgb_to_lab(left), rgb_to_lab(right))
    delta_p95 = float(np.percentile(delta, 95))
    automatic_pass = (
        rgb_similarity >= THRESHOLDS["rgb_similarity"]
        and edge_similarity >= THRESHOLDS["edge_similarity"]
        and ssim >= THRESHOLDS["window_ssim"]
        and delta_p95 <= THRESHOLDS["delta_e_2000_p95"]
    )

    slug = capture_name.removesuffix(".png")
    page_output = OUTPUT / slug
    page_output.mkdir(parents=True, exist_ok=True)
    reference.save(page_output / "01-reference.png")
    implementation.save(page_output / "02-implementation.png")
    Image.blend(reference, implementation, 0.5).save(page_output / "03-overlay-50.png")
    Image.fromarray(np.clip(diff, 0, 255).astype(np.uint8), "RGB").save(page_output / "04-absolute-diff.png")
    save_heatmap(diff, page_output / "05-heatmap.png")

    result = {
        "capture": capture_name,
        "reference": reference_relative,
        "comparisonSize": list(implementation.size),
        "metrics": {
            "rgbSimilarity": round(rgb_similarity, 6),
            "edgeSimilarity": round(edge_similarity, 6),
            "windowSsim": round(ssim, 6),
            "deltaE2000P95": round(delta_p95, 4),
        },
        "automaticStatus": "pass" if automatic_pass else "fail",
        "manualReview": {"status": "needs-review" if automatic_pass else "blocked-by-machine-fail"},
    }
    (page_output / "metrics.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    results = [compare(capture, reference) for capture, reference in REFERENCE_MAP.items()]
    missing_source = {
        "capture": "02-gog-login.png",
        "automaticStatus": "missing-source",
        "manualReview": {"status": "not-eligible-for-1-to-1"},
        "reason": "未提供 GOG 官方授权页的同版本真实原稿。",
    }
    report = {
        "thresholds": THRESHOLDS,
        "results": results + [missing_source],
        "summary": {
            "pass": sum(item["automaticStatus"] == "pass" for item in results),
            "fail": sum(item["automaticStatus"] == "fail" for item in results),
            "missingSource": 1,
        },
        "manualReviewNote": "机器通过不等于人工通过；原尺寸肉眼审图完成前不得标记 manualReview=pass。",
    }
    (OUTPUT / "visual-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    for item in report["results"]:
        metrics = item.get("metrics", {})
        print(f"{item['automaticStatus'].upper():14} {item['capture']} {metrics}")


if __name__ == "__main__":
    main()
