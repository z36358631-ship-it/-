import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(root, 'test-results', 'segmented-first-play-onboarding');
const compareDir = path.join(evidenceDir, 'visual-compare');
const geometryPath = path.join(evidenceDir, 'dom-geometry.json');
const sourceRoot = path.join(root, '_outputs', '盖世游戏V6.1.1使用说明手册', '图片和附件');
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);

const entries = [
  {
    id: '01-start-method-domestic-portrait', screenshot: '01-start-method-domestic-portrait.png',
    reference: path.join(sourceRoot, '04-导入或绑定Steam.png'),
    sourceRefs: ['screen-04', 'screen-02 (supplemental welcome structure)'], comparison: 'structure-only',
    referenceComponent: { label: 'legacy source choices', x: 40, y: 470, width: 1000, height: 430 },
    visibleDeviation: 'The implementation consolidates three asset states; screen-04 contains only the older local-import and Steam choices.',
  },
  {
    id: '02-steam-library-portrait', screenshot: '02-steam-library-portrait.png',
    reference: path.join(root, '回归-葡语-Steam游戏列表竖屏.png'),
    sourceRefs: ['回归-葡语-Steam游戏列表竖屏.png', '回归-葡语-Steam个人游戏竖屏.png', '回归-葡语-Steam排序竖屏.png'], comparison: 'structure-only',
    referenceComponent: { label: 'account summary and library toolbar', x: 36, y: 340, width: 1044, height: 440 },
    visibleDeviation: 'The source is Portuguese live-app evidence with different localized account and game data.',
  },
  {
    id: '03-local-import-portrait', screenshot: '03-local-import-portrait.png',
    reference: path.join(sourceRoot, '22-导入游戏.png'),
    sourceRefs: ['screen-22'], comparison: 'structure-only',
    referenceComponent: { label: 'add-game dialog', x: 245, y: 985, width: 590, height: 425 },
    visibleDeviation: 'The implementation preserves the real PC library background and adds the dialog, but the scaled dialog geometry is not pixel-homologous.',
  },
  {
    id: '04-instant-play-portrait', screenshot: '04-instant-play-portrait.png',
    reference: path.join(sourceRoot, '11-玩游戏-云游戏.png'),
    sourceRefs: ['screen-11'], comparison: 'structure-only',
    referenceComponent: { label: 'account benefit and hot games', x: 24, y: 198, width: 1032, height: 510 },
    visibleDeviation: 'The first-play account card changes the entitlement value to a granted 15-minute trial and uses different curated games.',
  },
  {
    id: '05-home-continue-portrait', screenshot: '05-home-continue-portrait.png',
    reference: path.join(sourceRoot, '08-竖版首页.png'),
    sourceRefs: ['screen-08'], comparison: 'structure-only',
    referenceComponent: { label: 'home hero region', x: 14, y: 124, width: 1052, height: 735 },
    visibleDeviation: 'The implementation retains the home hierarchy and inserts one contextual Continue row after the hero; content assets differ.',
  },
  {
    id: '06-start-method-domestic-landscape', screenshot: '06-start-method-domestic-landscape.png',
    reference: path.join(sourceRoot, '41-掌机模式-游戏库.png'),
    sourceRefs: ['screen-41 (landscape shell only)', 'screen-04 (onboarding semantics)'], comparison: 'shell-only',
    referenceComponent: { label: 'handheld content workspace', x: 0, y: 0, width: 2400, height: 1080 },
    visibleDeviation: 'There is no same-state handheld onboarding reference; screen-41 establishes only the 2400×1080 workspace.',
  },
  {
    id: '07-home-continue-landscape', screenshot: '07-home-continue-landscape.png',
    reference: path.join(sourceRoot, '36-掌机模式-首页.png'),
    sourceRefs: ['screen-36'], comparison: 'structure-only',
    referenceComponent: { label: 'handheld home hero workspace', x: 20, y: 70, width: 2360, height: 720 },
    visibleDeviation: 'The independent handheld home shell is retained, but current hero content and the Continue row differ.',
  },
  {
    id: '08-free-download-overseas-landscape', screenshot: '08-free-download-overseas-landscape.png',
    reference: path.join(sourceRoot, '41-掌机模式-游戏库.png'),
    sourceRefs: ['screen-41 (landscape shell only)'], comparison: 'shell-only',
    referenceComponent: { label: 'handheld content workspace', x: 0, y: 0, width: 2400, height: 1080 },
    visibleDeviation: 'No same-state overseas free-download source exists; screen-41 is used only for handheld shell and density.',
    assetProvenance: [
      { name: 'Counter-Strike 2', appId: 730, source: 'external-official', url: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg', runtime: 'embedded WebP data URI' },
      { name: 'Dota 2', appId: 570, source: 'external-official', url: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg', runtime: 'embedded WebP data URI' },
    ],
  },
];

assert(executablePath, 'Local Chrome not found');
assert(fs.existsSync(geometryPath), 'Missing DOM geometry; run verifier with --capture first');
const domGeometry = JSON.parse(fs.readFileSync(geometryPath, 'utf8'));
for (const entry of entries) {
  assert(fs.existsSync(entry.reference), `Missing reference: ${entry.reference}`);
  assert(fs.existsSync(path.join(evidenceDir, entry.screenshot)), `Missing implementation: ${entry.screenshot}`);
  assert(domGeometry.screenshots?.[entry.screenshot]?.implementationComponent, `Missing implementation DOM component: ${entry.screenshot}`);
}

function dataUrl(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mime = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function writeBase64(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(value, 'base64'));
}

let browser = null;
try {
  fs.mkdirSync(compareDir, { recursive: true });
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const results = [];

  for (const entry of entries) {
    const geometry = domGeometry.screenshots[entry.screenshot];
    const implementationComponent = geometry.implementationComponent;
    const implementationPath = path.join(evidenceDir, entry.screenshot);
    const output = await page.evaluate(async payload => {
      const loadImage = source => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      });
      const [implementationImage, referenceImage] = await Promise.all([loadImage(payload.implementation), loadImage(payload.reference)]);
      const width = implementationImage.naturalWidth;
      const height = implementationImage.naturalHeight;
      const makeCanvas = (w = width, h = height) => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w));
        canvas.height = Math.max(1, Math.round(h));
        return canvas;
      };
      const drawCover = (context, image, targetWidth, targetHeight) => {
        const scale = Math.max(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight);
      };
      const referenceCanvas = makeCanvas();
      drawCover(referenceCanvas.getContext('2d'), referenceImage, width, height);
      const implementationCanvas = makeCanvas();
      implementationCanvas.getContext('2d').drawImage(implementationImage, 0, 0);

      const srgbToLab = (red, green, blue) => {
        const linear = value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        };
        const r = linear(red), g = linear(green), b = linear(blue);
        const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
        const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
        const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
        const f = value => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
        const fx = f(x), fy = f(y), fz = f(z);
        return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
      };
      const deltaE2000 = (lab1, lab2) => {
        const [l1, a1, b1] = lab1, [l2, a2, b2] = lab2;
        const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2), cBar = (c1 + c2) / 2;
        const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
        const ap1 = (1 + g) * a1, ap2 = (1 + g) * a2;
        const cp1 = Math.hypot(ap1, b1), cp2 = Math.hypot(ap2, b2);
        const hp = (b, a) => { const angle = Math.atan2(b, a) * 180 / Math.PI; return angle >= 0 ? angle : angle + 360; };
        const hp1 = hp(b1, ap1), hp2 = hp(b2, ap2);
        const dLp = l2 - l1, dCp = cp2 - cp1;
        let dhp = 0;
        if (cp1 * cp2 !== 0) {
          dhp = hp2 - hp1;
          if (dhp > 180) dhp -= 360;
          if (dhp < -180) dhp += 360;
        }
        const dHp = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dhp * Math.PI / 180) / 2);
        const lBar = (l1 + l2) / 2, cBarP = (cp1 + cp2) / 2;
        let hBar = hp1 + hp2;
        if (cp1 * cp2 === 0) hBar = hp1 + hp2;
        else if (Math.abs(hp1 - hp2) <= 180) hBar /= 2;
        else if (hBar < 360) hBar = (hBar + 360) / 2;
        else hBar = (hBar - 360) / 2;
        const radians = degrees => degrees * Math.PI / 180;
        const t = 1 - 0.17 * Math.cos(radians(hBar - 30)) + 0.24 * Math.cos(radians(2 * hBar)) + 0.32 * Math.cos(radians(3 * hBar + 6)) - 0.20 * Math.cos(radians(4 * hBar - 63));
        const dTheta = 30 * Math.exp(-1 * (((hBar - 275) / 25) ** 2));
        const rc = 2 * Math.sqrt(cBarP ** 7 / (cBarP ** 7 + 25 ** 7));
        const sl = 1 + 0.015 * (lBar - 50) ** 2 / Math.sqrt(20 + (lBar - 50) ** 2);
        const sc = 1 + 0.045 * cBarP;
        const sh = 1 + 0.015 * cBarP * t;
        const rt = -Math.sin(radians(2 * dTheta)) * rc;
        const lTerm = dLp / sl, cTerm = dCp / sc, hTerm = dHp / sh;
        return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rt * cTerm * hTerm);
      };

      const analyse = (canvasA, canvasB) => {
        const w = canvasA.width, h = canvasA.height;
        const a = canvasA.getContext('2d').getImageData(0, 0, w, h);
        const b = canvasB.getContext('2d').getImageData(0, 0, w, h);
        const overlay = new ImageData(w, h), difference = new ImageData(w, h), heat = new ImageData(w, h), edgeXor = new ImageData(w, h);
        const grayA = new Float64Array(w * h), grayB = new Float64Array(w * h);
        const diffHistogram = new Uint32Array(256), deltaHistogram = new Uint32Array(2001);
        let absoluteTotal = 0;
        for (let pixel = 0, offset = 0; pixel < w * h; pixel += 1, offset += 4) {
          let meanDiff = 0;
          for (let channel = 0; channel < 3; channel += 1) {
            const delta = Math.abs(a.data[offset + channel] - b.data[offset + channel]);
            absoluteTotal += delta; meanDiff += delta;
            overlay.data[offset + channel] = Math.round((a.data[offset + channel] + b.data[offset + channel]) / 2);
            difference.data[offset + channel] = delta;
          }
          meanDiff = Math.round(meanDiff / 3);
          diffHistogram[meanDiff] += 1;
          const intensity = Math.min(255, meanDiff * 3);
          heat.data[offset] = intensity;
          heat.data[offset + 1] = intensity > 128 ? Math.min(255, (intensity - 128) * 2) : 0;
          heat.data[offset + 2] = Math.max(0, 96 - intensity);
          overlay.data[offset + 3] = difference.data[offset + 3] = heat.data[offset + 3] = 255;
          grayA[pixel] = a.data[offset] * 0.2126 + a.data[offset + 1] * 0.7152 + a.data[offset + 2] * 0.0722;
          grayB[pixel] = b.data[offset] * 0.2126 + b.data[offset + 1] * 0.7152 + b.data[offset + 2] * 0.0722;
          const deltaE = deltaE2000(srgbToLab(a.data[offset], a.data[offset + 1], a.data[offset + 2]), srgbToLab(b.data[offset], b.data[offset + 1], b.data[offset + 2]));
          deltaHistogram[Math.min(2000, Math.round(deltaE * 10))] += 1;
        }
        let edgeXorCount = 0;
        for (let y = 1; y < h - 1; y += 1) {
          for (let x = 1; x < w - 1; x += 1) {
            const index = y * w + x;
            const gradient = gray => Math.abs(gray[index + 1] - gray[index - 1]) + Math.abs(gray[index + w] - gray[index - w]);
            const xor = (gradient(grayA) >= 48) !== (gradient(grayB) >= 48);
            if (xor) edgeXorCount += 1;
            const offset = index * 4;
            edgeXor.data[offset] = xor ? 255 : 0;
            edgeXor.data[offset + 1] = xor ? 64 : 0;
            edgeXor.data[offset + 2] = xor ? 64 : 0;
            edgeXor.data[offset + 3] = 255;
          }
        }
        const buildIntegral = values => {
          const integral = new Float64Array((w + 1) * (h + 1));
          for (let y = 1; y <= h; y += 1) {
            let row = 0;
            for (let x = 1; x <= w; x += 1) {
              row += values[(y - 1) * w + (x - 1)];
              integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + row;
            }
          }
          return integral;
        };
        const squareA = Float64Array.from(grayA, value => value * value), squareB = Float64Array.from(grayB, value => value * value);
        const cross = Float64Array.from(grayA, (value, index) => value * grayB[index]);
        const ia = buildIntegral(grayA), ib = buildIntegral(grayB), isa = buildIntegral(squareA), isb = buildIntegral(squareB), ic = buildIntegral(cross);
        const sum = (integral, left, top, right, bottom) => integral[(bottom + 1) * (w + 1) + right + 1] - integral[top * (w + 1) + right + 1] - integral[(bottom + 1) * (w + 1) + left] + integral[top * (w + 1) + left];
        const half = 5, count = 121, c1 = (0.01 * 255) ** 2, c2 = (0.03 * 255) ** 2;
        let ssimTotal = 0, ssimWindows = 0;
        for (let y = half; y < h - half; y += 2) for (let x = half; x < w - half; x += 2) {
          const left = x - half, top = y - half, right = x + half, bottom = y + half;
          const ma = sum(ia, left, top, right, bottom) / count, mb = sum(ib, left, top, right, bottom) / count;
          const va = Math.max(0, sum(isa, left, top, right, bottom) / count - ma ** 2), vb = Math.max(0, sum(isb, left, top, right, bottom) / count - mb ** 2);
          const covariance = sum(ic, left, top, right, bottom) / count - ma * mb;
          ssimTotal += ((2 * ma * mb + c1) * (2 * covariance + c2)) / ((ma ** 2 + mb ** 2 + c1) * (va + vb + c2));
          ssimWindows += 1;
        }
        const percentile = (histogram, targetCount, scale = 1) => {
          let cumulative = 0;
          for (let value = 0; value < histogram.length; value += 1) {
            cumulative += histogram[value];
            if (cumulative >= targetCount) return value / scale;
          }
          return (histogram.length - 1) / scale;
        };
        const imageCanvas = imageData => { const canvas = makeCanvas(w, h); canvas.getContext('2d').putImageData(imageData, 0, 0); return canvas; };
        return {
          metrics: {
            rgbMae: absoluteTotal / (w * h * 3),
            rgbAgreementPercent: (1 - absoluteTotal / (w * h * 3 * 255)) * 100,
            ssimUniform11: ssimTotal / ssimWindows,
            absoluteDifferenceP95: percentile(diffHistogram, Math.ceil(w * h * 0.95)),
            edgeXorPercent: edgeXorCount / Math.max(1, (w - 2) * (h - 2)) * 100,
            edgeAgreementPercent: 100 - edgeXorCount / Math.max(1, (w - 2) * (h - 2)) * 100,
            ciede2000P95: percentile(deltaHistogram, Math.ceil(w * h * 0.95), 10),
            ssimWindowCount: ssimWindows,
          },
          images: { overlay: imageCanvas(overlay), difference: imageCanvas(difference), heatmap: imageCanvas(heat), edgeXor: imageCanvas(edgeXor) },
        };
      };

      const clampBounds = (bounds, maxWidth, maxHeight) => ({
        x: Math.max(0, Math.min(maxWidth - 1, bounds.x)), y: Math.max(0, Math.min(maxHeight - 1, bounds.y)),
        width: Math.max(1, Math.min(bounds.width, maxWidth - Math.max(0, bounds.x))),
        height: Math.max(1, Math.min(bounds.height, maxHeight - Math.max(0, bounds.y))),
      });
      const refBounds = clampBounds(payload.referenceComponent, referenceImage.naturalWidth, referenceImage.naturalHeight);
      const implBounds = clampBounds(payload.implementationComponent, width, height);
      const refRatio = refBounds.height / refBounds.width, implRatio = implBounds.height / implBounds.width;
      const componentWidth = 480, componentHeight = Math.max(160, Math.min(640, Math.round(componentWidth * (refRatio + implRatio) / 2)));
      const cropTo = (source, bounds) => {
        const canvas = makeCanvas(componentWidth, componentHeight);
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
        context.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, componentWidth, componentHeight);
        return canvas;
      };
      const componentReferenceCanvas = cropTo(referenceImage, refBounds);
      const componentImplementationCanvas = cropTo(implementationCanvas, implBounds);
      const full = analyse(referenceCanvas, implementationCanvas);
      const component = analyse(componentReferenceCanvas, componentImplementationCanvas);
      const encode = canvas => canvas.toDataURL('image/png').split(',')[1];
      return {
        width, height,
        referenceOriginal: { width: referenceImage.naturalWidth, height: referenceImage.naturalHeight },
        componentNormalized: { width: componentWidth, height: componentHeight },
        metrics: full.metrics, componentMetrics: component.metrics,
        images: {
          reference: encode(referenceCanvas), implementation: encode(implementationCanvas),
          overlay: encode(full.images.overlay), difference: encode(full.images.difference), heatmap: encode(full.images.heatmap), edgeXor: encode(full.images.edgeXor),
          componentReference: encode(componentReferenceCanvas), componentImplementation: encode(componentImplementationCanvas),
          componentOverlay: encode(component.images.overlay), componentDifference: encode(component.images.difference), componentHeatmap: encode(component.images.heatmap), componentEdgeXor: encode(component.images.edgeXor),
        },
      };
    }, {
      reference: dataUrl(entry.reference), implementation: dataUrl(implementationPath),
      referenceComponent: entry.referenceComponent, implementationComponent,
    });

    const entryDir = path.join(compareDir, entry.id);
    const imageFiles = {
      'reference.png': output.images.reference, 'implementation.png': output.images.implementation,
      'overlay-50.png': output.images.overlay, 'absolute-diff.png': output.images.difference,
      'heatmap.png': output.images.heatmap, 'edge-xor.png': output.images.edgeXor,
      'component/reference-key.png': output.images.componentReference, 'component/implementation-key.png': output.images.componentImplementation,
      'component/overlay-50.png': output.images.componentOverlay, 'component/absolute-diff.png': output.images.componentDifference,
      'component/heatmap.png': output.images.componentHeatmap, 'component/edge-xor.png': output.images.componentEdgeXor,
    };
    for (const [name, value] of Object.entries(imageFiles)) writeBase64(path.join(entryDir, name), value);

    const ref = entry.referenceComponent, impl = implementationComponent;
    const normalizedGeometryErrorPercent = Math.max(
      Math.abs(ref.x / output.referenceOriginal.width - impl.x / output.width),
      Math.abs(ref.y / output.referenceOriginal.height - impl.y / output.height),
      Math.abs(ref.width / output.referenceOriginal.width - impl.width / output.width),
      Math.abs(ref.height / output.referenceOriginal.height - impl.height / output.height),
    ) * 100;
    results.push({
      id: entry.id, primaryScreenshot: entry.screenshot,
      referencePath: path.relative(root, entry.reference).replaceAll('\\', '/'), sourceRefs: entry.sourceRefs,
      implementationState: 'real accessible DOM reached through the verifier user journey',
      dimensions: {
        referenceOriginal: output.referenceOriginal, implementation: { width: output.width, height: output.height },
        normalizedReference: { width: output.width, height: output.height }, componentNormalized: output.componentNormalized,
        normalizationStrategy: 'full reference uses aspect-preserving cover normalization; semantic components use independent original-bounds crops scaled to a shared diagnostic canvas',
      },
      comparison: entry.comparison, metrics: output.metrics, componentMetrics: output.componentMetrics,
      geometry: {
        referenceComponentBoundsOriginalPx: entry.referenceComponent,
        implementationDomRectPx: implementationComponent,
        implementationSelectorRectsPx: geometry.selectors,
        normalizedGeometryErrorPercent,
        keyComponentGeometryErrorPx: null,
        status: 'not-comparable',
        reason: 'The sources do not provide the same state, localized content, data, and original component box; normalized geometry is diagnostic only.',
      },
      assetProvenance: entry.assetProvenance || [], visibleDeviation: entry.visibleDeviation,
      manualReview: {
        reviewer: 'Codex original-size review', usabilityStatus: 'pass', referenceFidelityStatus: 'FAIL',
        checks: ['no clipping of primary controls', 'no ghosting', 'no overlapping controls', 'correct page', 'real DOM geometry captured', 'phone Shell excludes external controls'],
      },
      strict95Eligible: false, automaticStatus: 'FAIL',
      failureReason: 'The reference and implementation are not pixel-homologous; diagnostic RGB/edge/SSIM/ΔE metrics cannot establish the GameHub ≥95% machine gate.',
    });
  }

  const review = {
    schemaVersion: 2, generatedAt: new Date().toISOString(), target: 'demos/新手首玩按游戏资产分流demo.html',
    policy: {
      machineGate: 'RGB agreement, edge agreement, and SSIM ≥95%; CIEDE2000 P95 ≤3; homologous component geometry ≤2 px; manual original-size review must pass.',
      result: 'FAIL',
      reason: '0/8 comparisons have same-state, same-content, same-resolution source evidence. All reported metrics remain diagnostic.',
    },
    externalAssets: entries.flatMap(entry => entry.assetProvenance || []), primaryEvidenceCount: entries.length, results,
  };
  fs.writeFileSync(path.join(evidenceDir, 'visual-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  const markdown = [
    '# Segmented first-play visual review', '', `Generated: ${review.generatedAt}`, '', '## Conclusion', '',
    '**Strict machine 95% gate: FAIL.** None of the eight references is pixel-homologous to the implemented state. RGB, edge, SSIM, CIEDE2000, and geometry values below are diagnostic only.', '',
    '| ID | Comparison | RGB agree | Edge XOR | Edge agree | SSIM | ΔE2000 P95 | Component RGB | Component edge XOR | Fidelity |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...results.map(result => `| ${result.id} | ${result.comparison} | ${result.metrics.rgbAgreementPercent.toFixed(2)}% | ${result.metrics.edgeXorPercent.toFixed(2)}% | ${result.metrics.edgeAgreementPercent.toFixed(2)}% | ${result.metrics.ssimUniform11.toFixed(4)} | ${result.metrics.ciede2000P95.toFixed(1)} | ${result.componentMetrics.rgbAgreementPercent.toFixed(2)}% | ${result.componentMetrics.edgeXorPercent.toFixed(2)}% | FAIL |`),
    '', '## Evidence contract', '',
    '- Every comparison contains full-frame reference/implementation, overlay, absolute difference, heatmap, and edge-XOR images.',
    '- `component/` uses separate reference-original bounds and implementation DOM bounds for a semantically corresponding crop; it never reuses one same-coordinate crop.',
    '- `dom-geometry.json` records the real implementation selector rectangles relative to the phone Shell.',
    '- Component geometry remains `not-comparable`; no fabricated ≤2 px claim is emitted.',
    '- Counter-Strike 2 (App 730) and Dota 2 (App 570) use official Steam header sources embedded as WebP data URIs for offline runtime.',
    '', '## Visible deviations', '',
    ...results.flatMap(result => [`### ${result.id}`, '', result.visibleDeviation, '']),
  ].join('\n');
  fs.writeFileSync(path.join(evidenceDir, 'visual-review.md'), `${markdown}\n`, 'utf8');
  console.log(`PASS visual evidence generated: ${entries.length} comparisons`);
  console.log('Strict machine 95% gate: FAIL (non-homologous references)');
  console.log(`Review: ${path.join(evidenceDir, 'visual-review.json')}`);
} finally {
  if (browser) {
    try { await browser.close(); } catch {}
  }
}
