import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(root, 'test-results', 'segmented-first-play-onboarding');
const compareDir = path.join(evidenceDir, 'visual-compare');
const sourceRoot = path.join(root, '_outputs', '盖世游戏V6.1.1使用说明手册', '图片和附件');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);

const entries = [
  {
    id: '01-start-method-domestic-portrait',
    screenshot: '01-start-method-domestic-portrait.png',
    reference: path.join(sourceRoot, '04-导入或绑定Steam.png'),
    sourceRefs: ['screen-04', 'screen-02 (supplemental welcome structure)'],
    comparison: 'structure-only',
    component: { label: 'asset choices', x: 18, y: 218, width: 354, height: 340 },
    visibleDeviation: 'The implementation consolidates Steam, local file, and no-asset routing into three cards; screen-04 contains the older two-choice source step.',
  },
  {
    id: '02-steam-library-portrait',
    screenshot: '02-steam-library-portrait.png',
    reference: path.join(root, '回归-葡语-Steam游戏列表竖屏.png'),
    sourceRefs: ['回归-葡语-Steam游戏列表竖屏.png', '回归-葡语-Steam个人游戏竖屏.png', '回归-葡语-Steam排序竖屏.png'],
    comparison: 'structure-only',
    component: { label: 'account summary and toolbar', x: 18, y: 128, width: 354, height: 198 },
    visibleDeviation: 'The reference is Portuguese live-app evidence with different account and game data; comparison is limited to library hierarchy, card density, and controls.',
  },
  {
    id: '03-local-import-portrait',
    screenshot: '03-local-import-portrait.png',
    reference: path.join(sourceRoot, '22-导入游戏.png'),
    sourceRefs: ['screen-22'],
    comparison: 'structure-only',
    component: { label: 'add game dialog', x: 30, y: 292, width: 330, height: 260 },
    visibleDeviation: 'The implementation uses the existing PC library plus add-game dialog as the main-chain state; wording and card geometry are not pixel-homologous to screen-22.',
  },
  {
    id: '04-instant-play-portrait',
    screenshot: '04-instant-play-portrait.png',
    reference: path.join(sourceRoot, '11-玩游戏-云游戏.png'),
    sourceRefs: ['screen-11'],
    comparison: 'structure-only',
    component: { label: 'trial benefit and hot games', x: 14, y: 132, width: 362, height: 248 },
    visibleDeviation: 'The first-play channel adds a 15-minute benefit and curated games while retaining the cloud-game page hierarchy; content is intentionally different.',
  },
  {
    id: '05-home-continue-portrait',
    screenshot: '05-home-continue-portrait.png',
    reference: path.join(sourceRoot, '08-竖版首页.png'),
    sourceRefs: ['screen-08'],
    comparison: 'structure-only',
    component: { label: 'hero and first-play continue', x: 10, y: 106, width: 370, height: 306 },
    visibleDeviation: 'The implementation retains the live home feed skeleton but uses current content assets and inserts one contextual Continue row after the hero.',
  },
  {
    id: '06-start-method-domestic-landscape',
    screenshot: '06-start-method-domestic-landscape.png',
    reference: path.join(sourceRoot, '41-掌机模式-游戏库.png'),
    sourceRefs: ['screen-41 (landscape Shell only)', 'screen-04 (onboarding semantics)'],
    comparison: 'shell-only',
    component: { label: 'three landscape asset cards', x: 310, y: 88, width: 594, height: 252 },
    visibleDeviation: 'No same-content landscape onboarding source exists; screen-41 proves only the independent 2400×1080 handheld shell and density.',
  },
  {
    id: '07-home-continue-landscape',
    screenshot: '07-home-continue-landscape.png',
    reference: path.join(sourceRoot, '36-掌机模式-首页.png'),
    sourceRefs: ['screen-36'],
    comparison: 'structure-only',
    component: { label: 'top navigation and dual heroes', x: 28, y: 14, width: 876, height: 266 },
    visibleDeviation: 'The implementation follows the independent handheld home shell and adds the first-play Continue row; hero content differs from the V6.1.1 capture.',
  },
  {
    id: '08-free-download-overseas-landscape',
    screenshot: '08-free-download-overseas-landscape.png',
    reference: path.join(sourceRoot, '41-掌机模式-游戏库.png'),
    sourceRefs: ['screen-41 (landscape Shell only)'],
    comparison: 'shell-only',
    component: { label: 'download game grid', x: 28, y: 88, width: 596, height: 168 },
    visibleDeviation: 'No same-content overseas free-download source exists; screen-41 is used only for handheld shell, margins, and multi-column density.',
  },
];

assert(executablePath, 'Local Chrome not found');
for (const entry of entries) {
  assert(fs.existsSync(entry.reference), `Missing reference: ${entry.reference}`);
  assert(fs.existsSync(path.join(evidenceDir, entry.screenshot)), `Missing implementation: ${entry.screenshot}`);
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
    const implementationPath = path.join(evidenceDir, entry.screenshot);
    const output = await page.evaluate(async payload => {
      const loadImage = source => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      });
      const implementationImage = await loadImage(payload.implementation);
      const referenceImage = await loadImage(payload.reference);
      const width = implementationImage.naturalWidth;
      const height = implementationImage.naturalHeight;
      const makeCanvas = (w = width, h = height) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
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
      const referencePixels = referenceCanvas.getContext('2d').getImageData(0, 0, width, height);
      const implementationPixels = implementationCanvas.getContext('2d').getImageData(0, 0, width, height);
      const overlayPixels = new ImageData(width, height);
      const diffPixels = new ImageData(width, height);
      const heatPixels = new ImageData(width, height);
      const referenceGray = new Float64Array(width * height);
      const implementationGray = new Float64Array(width * height);
      const diffHistogram = new Uint32Array(256);
      let absoluteTotal = 0;
      for (let pixel = 0, offset = 0; pixel < width * height; pixel += 1, offset += 4) {
        let meanDiff = 0;
        for (let channel = 0; channel < 3; channel += 1) {
          const referenceValue = referencePixels.data[offset + channel];
          const implementationValue = implementationPixels.data[offset + channel];
          const difference = Math.abs(referenceValue - implementationValue);
          absoluteTotal += difference;
          meanDiff += difference;
          overlayPixels.data[offset + channel] = Math.round((referenceValue + implementationValue) / 2);
          diffPixels.data[offset + channel] = difference;
        }
        meanDiff = Math.round(meanDiff / 3);
        diffHistogram[meanDiff] += 1;
        const intensity = Math.min(255, meanDiff * 3);
        heatPixels.data[offset] = intensity;
        heatPixels.data[offset + 1] = intensity > 128 ? Math.min(255, (intensity - 128) * 2) : 0;
        heatPixels.data[offset + 2] = Math.max(0, 96 - intensity);
        overlayPixels.data[offset + 3] = 255;
        diffPixels.data[offset + 3] = 255;
        heatPixels.data[offset + 3] = 255;
        referenceGray[pixel] = referencePixels.data[offset] * 0.2126 + referencePixels.data[offset + 1] * 0.7152 + referencePixels.data[offset + 2] * 0.0722;
        implementationGray[pixel] = implementationPixels.data[offset] * 0.2126 + implementationPixels.data[offset + 1] * 0.7152 + implementationPixels.data[offset + 2] * 0.0722;
      }
      const buildIntegral = values => {
        const integral = new Float64Array((width + 1) * (height + 1));
        for (let y = 1; y <= height; y += 1) {
          let rowTotal = 0;
          for (let x = 1; x <= width; x += 1) {
            rowTotal += values[(y - 1) * width + (x - 1)];
            integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowTotal;
          }
        }
        return integral;
      };
      const referenceSquared = Float64Array.from(referenceGray, value => value * value);
      const implementationSquared = Float64Array.from(implementationGray, value => value * value);
      const cross = Float64Array.from(referenceGray, (value, index) => value * implementationGray[index]);
      const refIntegral = buildIntegral(referenceGray);
      const implIntegral = buildIntegral(implementationGray);
      const refSquaredIntegral = buildIntegral(referenceSquared);
      const implSquaredIntegral = buildIntegral(implementationSquared);
      const crossIntegral = buildIntegral(cross);
      const sumWindow = (integral, left, top, right, bottom) => {
        const stride = width + 1;
        return integral[(bottom + 1) * stride + (right + 1)] - integral[top * stride + (right + 1)] - integral[(bottom + 1) * stride + left] + integral[top * stride + left];
      };
      const halfWindow = 5;
      const sampleCount = 121;
      const c1 = (0.01 * 255) ** 2;
      const c2 = (0.03 * 255) ** 2;
      let ssimTotal = 0;
      let ssimWindows = 0;
      for (let y = halfWindow; y < height - halfWindow; y += 1) {
        for (let x = halfWindow; x < width - halfWindow; x += 1) {
          const left = x - halfWindow;
          const top = y - halfWindow;
          const right = x + halfWindow;
          const bottom = y + halfWindow;
          const meanReference = sumWindow(refIntegral, left, top, right, bottom) / sampleCount;
          const meanImplementation = sumWindow(implIntegral, left, top, right, bottom) / sampleCount;
          const varianceReference = Math.max(0, sumWindow(refSquaredIntegral, left, top, right, bottom) / sampleCount - meanReference ** 2);
          const varianceImplementation = Math.max(0, sumWindow(implSquaredIntegral, left, top, right, bottom) / sampleCount - meanImplementation ** 2);
          const covariance = sumWindow(crossIntegral, left, top, right, bottom) / sampleCount - meanReference * meanImplementation;
          ssimTotal += ((2 * meanReference * meanImplementation + c1) * (2 * covariance + c2)) /
            ((meanReference ** 2 + meanImplementation ** 2 + c1) * (varianceReference + varianceImplementation + c2));
          ssimWindows += 1;
        }
      }
      let cumulative = 0;
      const p95Target = Math.ceil(width * height * 0.95);
      let differenceP95 = 255;
      for (let value = 0; value < diffHistogram.length; value += 1) {
        cumulative += diffHistogram[value];
        if (cumulative >= p95Target) {
          differenceP95 = value;
          break;
        }
      }
      const overlayCanvas = makeCanvas();
      overlayCanvas.getContext('2d').putImageData(overlayPixels, 0, 0);
      const diffCanvas = makeCanvas();
      diffCanvas.getContext('2d').putImageData(diffPixels, 0, 0);
      const heatCanvas = makeCanvas();
      heatCanvas.getContext('2d').putImageData(heatPixels, 0, 0);
      const crop = payload.component;
      const cropCanvas = sourceCanvas => {
        const canvas = makeCanvas(crop.width, crop.height);
        canvas.getContext('2d').drawImage(sourceCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
        return canvas;
      };
      const encode = canvas => canvas.toDataURL('image/png').split(',')[1];
      return {
        width,
        height,
        referenceOriginal: { width: referenceImage.naturalWidth, height: referenceImage.naturalHeight },
        metrics: {
          rgbMae: absoluteTotal / (width * height * 3),
          rgbAgreementPercent: (1 - absoluteTotal / (width * height * 3 * 255)) * 100,
          ssimUniform11: ssimTotal / ssimWindows,
          absoluteDifferenceP95: differenceP95,
          ssimWindowCount: ssimWindows,
        },
        images: {
          reference: encode(referenceCanvas),
          implementation: encode(implementationCanvas),
          overlay: encode(overlayCanvas),
          difference: encode(diffCanvas),
          heatmap: encode(heatCanvas),
          componentReference: encode(cropCanvas(referenceCanvas)),
          componentImplementation: encode(cropCanvas(implementationCanvas)),
          componentOverlay: encode(cropCanvas(overlayCanvas)),
          componentDifference: encode(cropCanvas(diffCanvas)),
        },
      };
    }, {
      reference: dataUrl(entry.reference),
      implementation: dataUrl(implementationPath),
      component: entry.component,
    });

    const entryDir = path.join(compareDir, entry.id);
    writeBase64(path.join(entryDir, 'reference.png'), output.images.reference);
    writeBase64(path.join(entryDir, 'implementation.png'), output.images.implementation);
    writeBase64(path.join(entryDir, 'overlay-50.png'), output.images.overlay);
    writeBase64(path.join(entryDir, 'absolute-diff.png'), output.images.difference);
    writeBase64(path.join(entryDir, 'heatmap.png'), output.images.heatmap);
    writeBase64(path.join(entryDir, 'component', 'reference-key.png'), output.images.componentReference);
    writeBase64(path.join(entryDir, 'component', 'implementation-key.png'), output.images.componentImplementation);
    writeBase64(path.join(entryDir, 'component', 'overlay-50.png'), output.images.componentOverlay);
    writeBase64(path.join(entryDir, 'component', 'absolute-diff.png'), output.images.componentDifference);
    results.push({
      id: entry.id,
      primaryScreenshot: entry.screenshot,
      referencePath: path.relative(root, entry.reference).replaceAll('\\', '/'),
      sourceRefs: entry.sourceRefs,
      implementationState: 'real DOM reached through the verifier user journey; no full-page screenshot is used in the target HTML',
      dimensions: {
        referenceOriginal: output.referenceOriginal,
        implementation: { width: output.width, height: output.height },
        normalizedReference: { width: output.width, height: output.height },
        normalizationStrategy: 'aspect-preserving browser high-quality cover crop to the phone Shell dimensions; metrics are diagnostic and are not strict original-resolution scores',
      },
      comparison: entry.comparison,
      metrics: output.metrics,
      geometry: {
        shellAnchorErrorPxAfterNormalization: 0,
        keyComponent: entry.component,
        keyComponentGeometryErrorPx: null,
        status: 'not-comparable',
        reason: 'No source supplies the same localized content, data, state, and component bounds; a numeric ≤2 px component claim would be fabricated.',
      },
      visibleDeviation: entry.visibleDeviation,
      manualReview: {
        reviewer: 'Codex Task6 original-size review',
        usabilityStatus: 'pass',
        referenceFidelityStatus: 'FAIL',
        checks: ['no clipping of primary controls', 'no ghosting', 'no overlapping controls', 'correct page', 'no temporary wordmark or Emoji icon', 'phone Shell excludes the external control panel'],
      },
      strict95Eligible: false,
      automaticStatus: 'FAIL',
      failureReason: 'The reference and implementation are not pixel-homologous; normalized MAE/SSIM cannot establish the GameHub ≥95% machine gate.',
    });
  }

  const review = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    target: 'demos/新手首玩按游戏资产分流demo.html',
    policy: {
      machineGate: 'RGB, edge, and SSIM ≥95%; ΔE2000 P95 ≤3; component geometry ≤2 px; manual original-size review must pass.',
      result: 'FAIL',
      reason: '0/8 comparisons have same-state, same-content, same-resolution source evidence. Diagnostic normalized metrics are retained but cannot be promoted to strict scores.',
    },
    primaryEvidenceCount: entries.length,
    results,
  };
  fs.writeFileSync(path.join(evidenceDir, 'visual-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  const markdown = [
    '# Segmented first-play visual review',
    '',
    `Generated: ${review.generatedAt}`,
    '',
    '## Conclusion',
    '',
    '**Strict machine 95% gate: FAIL.** None of the eight references is pixel-homologous to the implemented state. Metrics below are diagnostic after an aspect-preserving cover normalization and must not be described as 95% fidelity.',
    '',
    '| ID | Reference | Comparison | RGB MAE | RGB agreement | SSIM (uniform 11×11) | Diff P95 | Manual usability | Reference fidelity |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
    ...results.map(result => `| ${result.id} | ${result.sourceRefs.join('<br>')} | ${result.comparison} | ${result.metrics.rgbMae.toFixed(3)} | ${result.metrics.rgbAgreementPercent.toFixed(3)}% | ${result.metrics.ssimUniform11.toFixed(5)} | ${result.metrics.absoluteDifferenceP95} | PASS | FAIL |`),
    '',
    '## Evidence contract',
    '',
    '- Each `visual-compare/<id>/` contains `reference.png`, `implementation.png`, `overlay-50.png`, `absolute-diff.png`, `heatmap.png`, and a `component/` crop set.',
    '- Implementation images are screenshots of accessible DOM states reached by the verifier through real user actions.',
    '- Reference normalization uses an aspect-preserving cover crop to the 390×844 or 932×430 phone Shell. It is not an original-resolution strict comparison.',
    '- Shell anchor error is 0 px only because the reference is normalized to the Shell; component geometry remains not comparable and is never presented as ≤2 px.',
    '',
    '## Visible deviations',
    '',
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
