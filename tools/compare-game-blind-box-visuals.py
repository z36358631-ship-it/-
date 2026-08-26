from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "game-blind-box" / "visual"
CASES = {
    "portrait": Path(r"C:\Users\z3635\AppData\Local\Temp\codex-clipboard-af9038d6-ce4f-4fa4-9d0b-1c14d848fb79.png"),
    "landscape": Path(r"C:\Users\z3635\AppData\Local\Temp\codex-clipboard-61c609d6-e6a9-45d9-b0e9-f652b64533e3.png"),
}
THRESHOLDS = {"rgb": 0.95, "edge": 0.95, "ssim": 0.95, "deltaE2000P95": 3.0}


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    value = rgb.astype(np.float64) / 255.0
    linear = np.where(value <= 0.04045, value / 12.92, ((value + 0.055) / 1.055) ** 2.4)
    x = linear[..., 0] * 0.4124564 + linear[..., 1] * 0.3575761 + linear[..., 2] * 0.1804375
    y = linear[..., 0] * 0.2126729 + linear[..., 1] * 0.7151522 + linear[..., 2] * 0.0721750
    z = linear[..., 0] * 0.0193339 + linear[..., 1] * 0.1191920 + linear[..., 2] * 0.9503041
    xyz = np.stack([x / 0.95047, y, z / 1.08883], axis=-1)
    epsilon = 216 / 24389
    kappa = 24389 / 27
    f = np.where(xyz > epsilon, np.cbrt(xyz), (kappa * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def delta_e_76_p95(a: np.ndarray, b: np.ndarray) -> float:
    # The target already differs structurally. CIE76 is retained as a conservative
    # color-distance signal; the report does not claim strict CIEDE2000 PASS.
    lab_a = rgb_to_lab(a[::4, ::4])
    lab_b = rgb_to_lab(b[::4, ::4])
    return float(np.percentile(np.linalg.norm(lab_a - lab_b, axis=-1), 95))


def global_ssim(a: np.ndarray, b: np.ndarray) -> float:
    gray_a = np.dot(a[..., :3], [0.299, 0.587, 0.114]).astype(np.float64)
    gray_b = np.dot(b[..., :3], [0.299, 0.587, 0.114]).astype(np.float64)
    mu_a, mu_b = gray_a.mean(), gray_b.mean()
    var_a, var_b = gray_a.var(), gray_b.var()
    cov = ((gray_a - mu_a) * (gray_b - mu_b)).mean()
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    return float(((2 * mu_a * mu_b + c1) * (2 * cov + c2)) / ((mu_a**2 + mu_b**2 + c1) * (var_a + var_b + c2)))


def edge_score(original: Image.Image, implementation: Image.Image) -> float:
    edge_a = np.asarray(original.convert("L").filter(ImageFilter.FIND_EDGES), dtype=np.uint8) > 36
    edge_b = np.asarray(implementation.convert("L").filter(ImageFilter.FIND_EDGES), dtype=np.uint8) > 36
    return float(1 - np.logical_xor(edge_a, edge_b).mean())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"policy": "Exact source-size comparison without blur or downsampling for RGB/edge/SSIM. Color P95 is CIE76 diagnostic only; strict CIEDE2000 gate remains unverified.", "thresholds": THRESHOLDS, "pages": []}
    for key, baseline_path in CASES.items():
        implementation_path = OUT / f"implementation-{key}.png"
        with Image.open(baseline_path).convert("RGB") as baseline, Image.open(implementation_path).convert("RGB") as captured:
            implementation = captured
            if captured.width == baseline.width and 0 < captured.height - baseline.height <= 4:
                trim = captured.height - baseline.height
                top = trim // 2
                implementation = captured.crop((0, top, captured.width, top + baseline.height))
                implementation.save(implementation_path)
            if baseline.size != implementation.size:
                raise ValueError(f"{key}: {baseline.size} != {implementation.size}")
            baseline.save(OUT / f"baseline-{key}.png")
            a = np.asarray(baseline, dtype=np.uint8)
            b = np.asarray(implementation, dtype=np.uint8)
            rgb = float(1 - np.abs(a.astype(np.int16) - b.astype(np.int16)).mean() / 255)
            edge = edge_score(baseline, implementation)
            ssim = global_ssim(a, b)
            de76 = delta_e_76_p95(a, b)
            Image.blend(baseline, implementation, 0.5).save(OUT / f"overlay-{key}.png")
            ImageChops.difference(baseline, implementation).save(OUT / f"difference-{key}.png")
            diff = np.abs(a.astype(np.int16) - b.astype(np.int16)).max(axis=2).astype(np.uint8)
            heat = np.zeros((*diff.shape, 3), dtype=np.uint8)
            heat[..., 0] = np.minimum(255, diff.astype(np.uint16) * 4).astype(np.uint8)
            heat[..., 1] = np.minimum(255, np.maximum(0, diff.astype(np.int16) - 32) * 2).astype(np.uint8)
            Image.fromarray(heat, "RGB").save(OUT / f"heatmap-{key}.png")
            strict_pass = rgb >= 0.95 and edge >= 0.95 and ssim >= 0.95 and False
            report["pages"].append({"id": key, "canvas": list(baseline.size), "rgbScore": round(rgb, 6), "edgeScore": round(edge, 6), "globalSsimDiagnostic": round(ssim, 6), "deltaE76P95Diagnostic": round(de76, 4), "strictPassed": strict_pass, "manualReview": "pending", "reason": "Current-version shell is compared with the user-provided screenshot; the required blind-box shortcut, different demo library data, strict CIEDE2000 and component geometry gates remain expected differences or unverified."})
    report["strictPassed"] = all(page["strictPassed"] for page in report["pages"])
    (OUT / "visual-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
