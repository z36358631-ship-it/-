# APP Rental PRD Flow Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only section 2.2 of the APP rental PRD with a readable seven-step screenshot-card flow diagram and publish the refreshed PRD package.

**Architecture:** Reuse the existing Sharp-based flow builder, but compose seven cropped Demo screenshots into a 4＋3 card grid with a return connector and an exception strip. Commit the image first to obtain an immutable SHA, then update the PRD image URL and rebuild the existing ZIP without changing unrelated attachments.

**Tech Stack:** Node.js CommonJS, Sharp, PNG, Markdown, PowerShell validation scripts, ZIP archive tooling, Git.

---

### Task 1: Add a deterministic flow-image contract

**Files:**
- Create: `scripts/verify-app-rental-prd-flow.js`
- Test: `public/prd/app-rental/app-rental-current-flow.png`

- [ ] **Step 1: Write the failing verifier**

Create a verifier that reads `scripts/build-app-rental-prd-flow.js`, checks the seven ordered titles and source screenshots, then uses Sharp metadata to require one PNG between 2400—3000 px wide and 1350—1900 px high.

```js
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const builderPath = path.join(root, 'scripts', 'build-app-rental-prd-flow.js');
const outputPath = path.join(root, 'public', 'prd', 'app-rental', 'app-rental-current-flow.png');
const required = [
  '发现租号', '游戏详情', '选择权益', '确认并支付',
  '权益生效', '登录与启动', '订单管理／续租／售后（按需）',
  '01-discovery-portrait.png', '02-detail-portrait.png',
  '03-checkout-portrait.png', '17-payment-success-portrait.png',
  '06-steam-login-portrait.png', '05-orders-portrait.png',
];

(async () => {
  const source = fs.readFileSync(builderPath, 'utf8');
  const missing = required.filter((value) => !source.includes(value));
  if (missing.length) throw new Error(`缺少流程契约：${missing.join('、')}`);
  const meta = await sharp(outputPath).metadata();
  if (meta.format !== 'png' || meta.width < 2400 || meta.width > 3000 || meta.height < 1350 || meta.height > 1900) {
    throw new Error(`流程图尺寸不合格：${meta.width}x${meta.height}`);
  }
  process.stdout.write(`FLOW_CONTRACT 20/20 PASS ${meta.width}x${meta.height}\n`);
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
```

- [ ] **Step 2: Run the verifier and confirm it fails on the old text-only flow**

Run: `node scripts/verify-app-rental-prd-flow.js`

Expected: `FAIL` because the old builder does not contain the new screenshot assets or “按需” title.

### Task 2: Build the 4＋3 screenshot-card diagram

**Files:**
- Modify: `scripts/build-app-rental-prd-flow.js`
- Modify: `public/prd/app-rental/app-rental-current-flow.png`
- Read: `public/prd/app-rental/01-discovery-portrait.png`
- Read: `public/prd/app-rental/02-detail-portrait.png`
- Read: `public/prd/app-rental/03-checkout-portrait.png`
- Read: `public/prd/app-rental/17-payment-success-portrait.png`
- Read: `public/prd/app-rental/06-steam-login-portrait.png`
- Read: `public/prd/app-rental/05-orders-portrait.png`

- [ ] **Step 1: Replace tuple steps with screenshot-card definitions**

Use two entries from the checkout image with different crops so “选择权益” and “确认并支付” remain distinct.

```js
const steps = [
  { num: '01', title: '发现租号', detail: '识别租号价格与当前权益', image: '01-discovery-portrait.png', crop: { left: 0, top: 70, width: 390, height: 330 } },
  { num: '02', title: '游戏详情', detail: '核验权益与商品可售状态', image: '02-detail-portrait.png', crop: { left: 0, top: 230, width: 390, height: 600 } },
  { num: '03', title: '选择权益', detail: '体验、永久或开会员畅玩', image: '03-checkout-portrait.png', crop: { left: 0, top: 210, width: 390, height: 360 } },
  { num: '04', title: '确认并支付', detail: '核对金额与支付方式后购买', image: '03-checkout-portrait.png', crop: { left: 0, top: 560, width: 390, height: 280 } },
  { num: '05', title: '权益生效', detail: '支付成功后计时或发放权益', image: '17-payment-success-portrait.png', crop: { left: 0, top: 70, width: 390, height: 360 } },
  { num: '06', title: '登录与启动', detail: '登录成功进入详情下载或启动', image: '06-steam-login-portrait.png', crop: { left: 0, top: 70, width: 390, height: 620 } },
  { num: '07', title: '订单管理／续租／售后（按需）', detail: '查看有效期、续租与售后进度', image: '05-orders-portrait.png', crop: { left: 0, top: 80, width: 390, height: 470 } },
];
```

- [ ] **Step 2: Compose each card and the single flow canvas**

Create a 2560 px canvas. Render cards 01—04 on row one and 05—07 on row two; connect 04 to 05 with a down-and-left return line. Each screenshot is cropped with Sharp, resized without stretching, and placed below the title.

```js
const layout = Object.freeze({ columns: 4, rows: [4, 3], width: 2560, cardWidth: 560, cardHeight: 590 });
const shot = await sharp(path.join(assetDir, step.image))
  .extract(step.crop)
  .resize({ width: 512, height: 360, fit: 'contain', background: '#0b0e13' })
  .png()
  .toBuffer();
```

The bottom exception strip must contain this exact rule:

```text
异常恢复：支付、权益发放、登录启动或售后结果未知时，按订单号查询服务端真值；禁止重复扣款、重复发放和重复退款。
```

- [ ] **Step 3: Generate and verify the image**

Run: `node scripts/build-app-rental-prd-flow.js`

Expected: `public/prd/app-rental/app-rental-current-flow.png` is regenerated without errors.

Run: `node scripts/verify-app-rental-prd-flow.js`

Expected: `FLOW_CONTRACT 20/20 PASS`.

- [ ] **Step 4: Inspect the PNG at original size**

Open the PNG with the image viewer and check: card boundaries contain all content, no screenshot is stretched, titles are readable, 04→05 is unambiguous, 07 says “按需”, and the exception strip is complete. Adjust only crop rectangles or spacing until these checks pass.

- [ ] **Step 5: Commit the immutable image revision**

```powershell
git add -- 'scripts/build-app-rental-prd-flow.js' 'scripts/verify-app-rental-prd-flow.js' 'public/prd/app-rental/app-rental-current-flow.png'
git commit -m 'docs: redesign APP rental product flow'
git rev-parse HEAD
```

Expected: one commit containing only the builder, verifier and PNG; save its 40-character SHA for the PRD URL.

### Task 3: Update only PRD section 2.2 and the final ZIP

**Files:**
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Modify: `prd/最终文档/【Prd】《盖世游戏APP》游戏租号需求.zip`

- [ ] **Step 1: Append the revision record and replace the 2.2 image URL**

Append this row without removing previous history:

```markdown
| 2026.09.10 | 重制2.2产品流程图，改为7步真实页面截图流程，并明确订单管理、续租与售后为按需路径 | V3.1 | 郑群超 |
```

Keep the 2.2 heading and descriptive paragraph. Capture the image commit and replace only the old 40-character SHA in the 2.2 image URL:

```powershell
$flowImageCommit = git rev-parse HEAD
# The resulting Markdown line must be:
"![首期主流程](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${flowImageCommit}/public/prd/app-rental/app-rental-current-flow.png)"
```

- [ ] **Step 2: Run PRD structure and image validation**

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path 'prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md'`

Expected: validation passes with no missing 2.2 image or structure error.

After the image commit is pushed, run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-images.ps1 -PrdPath 'prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md' -VerifyRemote`

Expected: every remote image returns HTTP 200 and an `image/*` content type.

- [ ] **Step 3: Refresh the existing ZIP without dropping attachments**

Use an archive script to copy every existing entry unchanged except the root Markdown entry, which is replaced with the updated UTF-8 PRD. Write to a temporary ZIP, verify its entry count equals the original, then atomically replace the final ZIP.

```powershell
$sourcePrd = Resolve-Path -LiteralPath 'prd\【盖世游戏APP】游戏租号需求\【Prd】《盖世游戏APP》游戏租号需求.md'
$targetZip = Resolve-Path -LiteralPath 'prd\最终文档\【Prd】《盖世游戏APP》游戏租号需求.zip'
$archiveWork = Join-Path $env:TEMP ('app-rental-prd-' + [guid]::NewGuid().ToString('N'))
$expanded = Join-Path $archiveWork 'expanded'
$nextZip = Join-Path $archiveWork 'next.zip'
New-Item -ItemType Directory -Path $expanded | Out-Null
Expand-Archive -LiteralPath $targetZip -DestinationPath $expanded
$oldCount = (Get-ChildItem -LiteralPath $expanded -Recurse -File).Count
$embeddedPrd = Get-ChildItem -LiteralPath $expanded -Filter '*.md' -File | Select-Object -First 1
Copy-Item -LiteralPath $sourcePrd -Destination $embeddedPrd.FullName -Force
Compress-Archive -Path (Join-Path $expanded '*') -DestinationPath $nextZip
Expand-Archive -LiteralPath $nextZip -DestinationPath (Join-Path $archiveWork 'verify')
$newCount = (Get-ChildItem -LiteralPath (Join-Path $archiveWork 'verify') -Recurse -File).Count
if ($newCount -ne $oldCount) { throw "ZIP条目数变化：$oldCount -> $newCount" }
Copy-Item -LiteralPath $nextZip -Destination $targetZip -Force
```

Expected: the ZIP still contains the PRD and all existing `图片和附件/` entries, and the embedded PRD contains `V3.1` and the new fixed SHA.

- [ ] **Step 4: Commit PRD and ZIP**

```powershell
git add -- 'prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md' 'prd/最终文档/【Prd】《盖世游戏APP》游戏租号需求.zip'
git commit -m 'docs: refresh APP rental PRD flow'
```

Expected: the commit changes only the Markdown and final ZIP.

### Task 4: Publish and perform delivery checks

**Files:**
- Verify: `public/prd/app-rental/app-rental-current-flow.png`
- Verify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Verify: `prd/最终文档/【Prd】《盖世游戏APP》游戏租号需求.zip`

- [ ] **Step 1: Push the two implementation commits to the selected publication branch**

Run: `git push -u origin HEAD:codex/app-rental-prd-flow-20260910` from an isolated publication worktree based on the latest APP rental artifact commit; do not push unrelated local commits.

Expected: remote branch advances to the PRD/ZIP commit.

- [ ] **Step 2: Verify the immutable public image**

Run an HTTP HEAD request against the exact jsDelivr URL stored in 2.2.

Expected: HTTP 200, `Content-Type: image/png`, and non-zero content length.

- [ ] **Step 3: Final consistency check**

Confirm the local PNG hash matches the image commit blob, the PRD references that commit, the ZIP embeds the same PRD, and `git status --short` shows no task-owned uncommitted files.

Expected: source image, PRD, ZIP, Git revision and remote URL all point to the same 2.2 flow version.
