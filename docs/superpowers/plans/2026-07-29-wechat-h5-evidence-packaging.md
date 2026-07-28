# 微信 H5 精品游戏证据溯源与交付包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让五类验收结果绑定固定 Git 提交并生成可核验的白名单交付压缩包、manifest 和 SHA-256 清单。

**Architecture:** 新增一个只使用 Node 内置模块的报告辅助库，为各工具提供 Git/环境元数据和原子 JSON 写入。最终打包脚本从固定白名单复制文件到临时目录、生成清单、压缩、解压并重新核验哈希；不读取或打包工作区其他文件。

**Tech Stack:** Node.js ESM、PowerShell、Git、SHA-256、Playwright Core、`Compress-Archive`。

---

### Task 1: 创建报告辅助库

**Files:**
- Create: `tools/lib/wechat-h5-reporting.mjs`
- Create: `tools/test-wechat-h5-reporting.mjs`

- [ ] **Step 1: 写失败测试**

```js
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  commandString,
  getGitCommit,
  writeJsonAtomic
} from './lib/wechat-h5-reporting.mjs';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wechat-h5-reporting-'));
const file = path.join(dir, 'report.json');
await writeJsonAtomic(file, { ok: true });
assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { ok: true });
assert.match(await getGitCommit(process.cwd()), /^[0-9a-f]{40}$|^unavailable$/);
assert.equal(commandString(['node', 'tool.mjs']), 'node tool.mjs');
await fs.rm(dir, { recursive: true, force: true });
process.stdout.write('wechat-h5-reporting PASS\n');
```

Run:

```powershell
node tools/test-wechat-h5-reporting.mjs
```

Expected: FAIL because module does not exist.

- [ ] **Step 2: 实现辅助库**

```js
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function commandString(argv = process.argv) {
  return argv.map(value => /\s/.test(value) ? JSON.stringify(value) : value).join(' ');
}

export async function getGitCommit(cwd) {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd });
    const value = stdout.trim();
    return /^[0-9a-f]{40}$/.test(value) ? value : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function baseMetadata({ root, browserVersion = 'not-used' }) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    gitCommit: await getGitCommit(root),
    command: commandString(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      browserVersion
    }
  };
}

export async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temp, file);
}
```

- [ ] **Step 3: 运行测试**

```powershell
node tools/test-wechat-h5-reporting.mjs
```

Expected: `wechat-h5-reporting PASS`。

- [ ] **Step 4: 提交**

```powershell
git add -- tools/lib/wechat-h5-reporting.mjs tools/test-wechat-h5-reporting.mjs
git commit -m "test: add atomic report metadata helper"
```

### Task 2: 升级主验收报告

**Files:**
- Modify: `tools/verify-wechat-h5-premium-games.mjs:1-12`
- Modify: `tools/verify-wechat-h5-premium-games.mjs:921-959`
- Test: `test-results/wechat-h5-premium-games/verification.json`

- [ ] **Step 1: 导入辅助库**

```js
import {
  baseMetadata,
  writeJsonAtomic
} from './lib/wechat-h5-reporting.mjs';
```

- [ ] **Step 2: 把报告从数组升级为对象**

```js
const hardFailures = results.flatMap(result => [
  ...result.errors.map(error => `${result.page}/${result.viewport}: ${error}`),
  ...result.externalRequests.map(url => `${result.page}/${result.viewport}: 外部请求 ${url}`)
]);
const report = {
  ...await baseMetadata({ root, browserVersion: await browser.version() }),
  scope: '本地 Edge/Playwright 功能、触摸、生命周期、直开与安全回归',
  exitCode: hardFailures.length ? 1 : 0,
  summary: {
    total: results.length,
    pass: results.length - hardFailures.length,
    fail: hardFailures.length
  },
  productionGuards,
  results
};
await writeJsonAtomic(path.join(outputDir, 'verification.json'), report);
```

所有内部读取主报告的代码改为优先读取 `report.results`，并兼容旧数组：

```js
const rows = Array.isArray(report) ? report : report.results;
```

- [ ] **Step 3: 确保异常仍写失败报告**

在主 `try` 外捕获异常，追加：

```js
} catch (error) {
  const report = {
    ...await baseMetadata({ root, browserVersion: browser ? await browser.version() : 'launch-failed' }),
    scope: '本地 Edge/Playwright 功能、触摸、生命周期、直开与安全回归',
    exitCode: 1,
    summary: { total: results.length, pass: 0, fail: 1 },
    fatalError: error.stack || error.message,
    results
  };
  await writeJsonAtomic(path.join(outputDir, 'verification.json'), report);
  process.exitCode = 1;
}
```

- [ ] **Step 4: 运行**

```powershell
node tools/verify-wechat-h5-premium-games.mjs
```

Expected: 退出码 0；JSON 包含 `schemaVersion/generatedAt/gitCommit/command/environment/exitCode/summary/results`。

- [ ] **Step 5: 提交**

```powershell
git add -- tools/verify-wechat-h5-premium-games.mjs test-results/wechat-h5-premium-games/verification.json
git commit -m "test: bind main verification to source commit"
```

### Task 3: 升级性能与无障碍报告

**Files:**
- Modify: `tools/profile-wechat-h5-premium-games.mjs:1-18`
- Modify: `tools/profile-wechat-h5-premium-games.mjs:497-537`
- Modify: `tools/profile-wechat-h5-longrun.mjs:1-20`
- Modify: `tools/profile-wechat-h5-longrun.mjs:645-693`
- Modify: `tools/verify-wechat-h5-accessibility.mjs:1-12`
- Modify: `tools/verify-wechat-h5-accessibility.mjs:687-719`

- [ ] **Step 1: 导入元数据与原子写入**

三个工具都加入：

```js
import {
  baseMetadata,
  writeJsonAtomic
} from './lib/wechat-h5-reporting.mjs';
```

- [ ] **Step 2: 合并元数据**

报告构造改为：

```js
const metadata = await baseMetadata({ root, browserVersion });
const report = {
  ...metadata,
  scope,
  disclaimer,
  exitCode: hardFailures.length ? 1 : 0,
  environment: {
    ...metadata.environment,
    viewport,
    headless: true
  },
  thresholds,
  summary,
  games: results
};
```

无障碍报告增加 `schemaVersion`、`gitCommit`、`command`、`exitCode` 和 `unexpectedFailures`；仅三个允许的 zoom 失败时 `exitCode=0`。

- [ ] **Step 3: 全部使用原子写入**

```js
await writeJsonAtomic(outputFile, report);
```

- [ ] **Step 4: 运行三类工具**

```powershell
node tools/profile-wechat-h5-premium-games.mjs
node tools/verify-wechat-h5-accessibility.mjs
node tools/profile-wechat-h5-longrun.mjs
```

Expected: 四份报告的 `gitCommit` 完全相同；短时/长时无硬失败；无障碍只保留三个允许失败且退出码 0。

- [ ] **Step 5: 提交**

```powershell
git add -- tools/profile-wechat-h5-premium-games.mjs tools/profile-wechat-h5-longrun.mjs tools/verify-wechat-h5-accessibility.mjs test-results/wechat-h5-premium-games
git commit -m "test: add traceable performance and accessibility reports"
```

### Task 4: 为小程序壳生成机读报告

**Files:**
- Modify: `tools/verify-wechat-miniprogram-shell.mjs:1-12`
- Modify: `tools/verify-wechat-miniprogram-shell.mjs:150-162`
- Create: `test-results/wechat-h5-premium-games/miniprogram-shell-verification.json`

- [ ] **Step 1: 收集检查结果**

用统一记录器替代只打印：

```js
const checks = [];
function record(id, pass, detail) {
  checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
  assert(pass, detail);
}
```

- [ ] **Step 2: 写入报告**

```js
const metadata = await baseMetadata({ root, browserVersion: 'not-used' });
const failures = checks.filter(check => check.status === 'FAIL');
const report = {
  ...metadata,
  scope: '微信小程序 web-view 试玩壳静态与 VM 行为验收',
  exitCode: failures.length ? 1 : 0,
  summary: {
    total: checks.length,
    pass: checks.length - failures.length,
    fail: failures.length
  },
  checks
};
await writeJsonAtomic(
  path.join(root, 'test-results', 'wechat-h5-premium-games', 'miniprogram-shell-verification.json'),
  report
);
```

主流程用 `try/catch/finally` 保证失败报告仍被写出。

- [ ] **Step 3: 运行**

```powershell
node tools/verify-wechat-miniprogram-shell.mjs
```

Expected: 退出码 0；报告至少包含现有文件、JSON、JS、路由、HTTPS 门禁、未知游戏和返回降级检查。

- [ ] **Step 4: 提交**

```powershell
git add -- tools/verify-wechat-miniprogram-shell.mjs test-results/wechat-h5-premium-games/miniprogram-shell-verification.json
git commit -m "test: persist mini program shell verification"
```

### Task 5: 创建白名单交付包工具

**Files:**
- Create: `tools/build-wechat-h5-delivery.ps1`
- Create: `tools/verify-wechat-h5-delivery.mjs`
- Create: `dist/.gitkeep`

- [ ] **Step 1: 写交付包验证器**

验证器接收解压目录：

```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

assert(process.argv[2], '用法：node tools/verify-wechat-h5-delivery.mjs <解压目录>');
const root = path.resolve(process.argv[2]);
async function walk(directory) {
  const output = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(absolute));
    else output.push(path.relative(root, absolute).replaceAll('\\', '/'));
  }
  return output;
}
function sha256(body) {
  return createHash('sha256').update(body).digest('hex');
}

const manifestBody = await fs.readFile(path.join(root, 'DELIVERY-MANIFEST.json'));
const manifest = JSON.parse(manifestBody.toString('utf8').replace(/^\uFEFF/, ''));
assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/);
assert.equal(manifest.scope, 'non-production-review-package');
for (const file of manifest.files) {
  const absolute = path.join(root, ...file.path.split('/'));
  const body = await fs.readFile(absolute);
  assert.equal(body.length, file.bytes, `${file.path} 长度不一致`);
  assert.equal(sha256(body), file.sha256, `${file.path} SHA-256 不一致`);
}

const sumsBody = await fs.readFile(path.join(root, 'SHA256SUMS.txt'), 'utf8');
const sums = new Map(
  sumsBody.replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(line => {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    assert(match, `SHA256SUMS 行格式错误：${line}`);
    return [match[2], match[1]];
  })
);
const expectedSumFiles = [
  ...manifest.files.map(file => file.path),
  'DELIVERY-MANIFEST.json'
].sort();
assert.deepEqual([...sums.keys()].sort(), expectedSumFiles);
for (const relative of expectedSumFiles) {
  const body = await fs.readFile(path.join(root, ...relative.split('/')));
  assert.equal(sha256(body), sums.get(relative), `${relative} SHA256SUMS 不一致`);
}

const actualFiles = (await walk(root)).sort();
const expectedFiles = [...expectedSumFiles, 'SHA256SUMS.txt'].sort();
assert.deepEqual(actualFiles, expectedFiles, '解压文件集合与 manifest 不一致');
process.stdout.write(`delivery PASS ${manifest.files.length} files\n`);
```

- [ ] **Step 2: 写 PowerShell 白名单**

脚本完整实现：

```powershell
param(
  [string]$OutputDirectory = "dist"
)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$commit = (git -C $root rev-parse HEAD).Trim()
if ($commit -notmatch "^[0-9a-f]{40}$") { throw "无法取得固定 Git SHA" }
$short = $commit.Substring(0, 8)
$paths = @(
  "demos/微信H5精品游戏",
  "docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-design.md",
  "docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-qa.md",
  "docs/superpowers/specs/2026-07-28-wechat-h5-first-session-test-guide.md",
  "docs/superpowers/specs/2026-07-28-wechat-h5-release-checklist.md",
  "docs/superpowers/specs/2026-07-29-wechat-h5-accessibility-audio-hardening-design.md",
  "docs/superpowers/plans/2026-07-28-wechat-h5-premium-games.md",
  "docs/superpowers/plans/2026-07-29-wechat-h5-accessibility-hardening.md",
  "docs/superpowers/plans/2026-07-29-wechat-h5-audio-test-gates.md",
  "docs/superpowers/plans/2026-07-29-wechat-h5-evidence-packaging.md",
  "prd/ai生成/【Prd】《微信H5精品游戏》三款游戏制作人总方案.md",
  "tools/verify-wechat-h5-premium-games.mjs",
  "tools/verify-wechat-h5-accessibility.mjs",
  "tools/verify-wechat-miniprogram-shell.mjs",
  "tools/profile-wechat-h5-premium-games.mjs",
  "tools/profile-wechat-h5-longrun.mjs",
  "tools/lib/wechat-h5-reporting.mjs",
  "tools/verify-wechat-h5-delivery.mjs",
  "test-results/wechat-h5-premium-games",
  "package.json",
  "package-lock.json"
)

$dirty = & git -C $root status --porcelain -- @paths
if ($LASTEXITCODE -ne 0) { throw "git status 执行失败" }
if ($dirty) {
  throw "交付白名单存在未提交变更：`n$($dirty -join "`n")"
}

$outputRoot = Join-Path $root $OutputDirectory
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$zip = Join-Path $outputRoot "wechat-h5-premium-games-review-$short.zip"
if (Test-Path -LiteralPath $zip) { throw "拒绝覆盖已有交付包：$zip" }

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stage = Join-Path $tempRoot ("wechat-h5-stage-" + [guid]::NewGuid())
$verify = Join-Path $tempRoot ("wechat-h5-verify-" + [guid]::NewGuid())

function Assert-TempDirectory([string]$Path) {
  $resolved = [IO.Path]::GetFullPath($Path)
  if (-not $resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "拒绝操作非临时目录：$resolved"
  }
  return $resolved
}

function Relative-ForwardPath([string]$Base, [string]$Path) {
  return [IO.Path]::GetRelativePath($Base, $Path).Replace("\", "/")
}

try {
  New-Item -ItemType Directory -Path $stage | Out-Null
  foreach ($relative in $paths) {
    $source = Join-Path $root $relative
    if (-not (Test-Path -LiteralPath $source)) { throw "白名单文件不存在：$relative" }
    $destination = Join-Path $stage $relative
    $parent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    if ((Get-Item -LiteralPath $source).PSIsContainer) {
      Copy-Item -LiteralPath $source -Destination $destination -Recurse
    } else {
      Copy-Item -LiteralPath $source -Destination $destination
    }
  }

  $forbidden = Get-ChildItem -LiteralPath $stage -Recurse -File | Where-Object {
    $_.Name -eq "project.private.config.json" -or
    $_.Name -like ".env*" -or
    $_.Extension -in @(".key", ".pem", ".pfx", ".zip")
  }
  if ($forbidden) {
    throw "白名单包含禁止文件：$($forbidden.FullName -join ', ')"
  }

  $payload = Get-ChildItem -LiteralPath $stage -Recurse -File |
    Sort-Object { Relative-ForwardPath $stage $_.FullName }
  $manifestFiles = @(
    foreach ($file in $payload) {
      [ordered]@{
        path = Relative-ForwardPath $stage $file.FullName
        bytes = $file.Length
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
      }
    }
  )
  $manifest = [ordered]@{
    schemaVersion = 1
    scope = "non-production-review-package"
    disclaimer = "浏览器评审包；不代表微信生产 GO"
    sourceCommit = $commit
    buildTime = [DateTimeOffset]::UtcNow.ToString("o")
    files = $manifestFiles
  }
  $manifestPath = Join-Path $stage "DELIVERY-MANIFEST.json"
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8

  $sumTargets = @($payload) + @(Get-Item -LiteralPath $manifestPath)
  $sumLines = foreach ($file in $sumTargets | Sort-Object { Relative-ForwardPath $stage $_.FullName }) {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
    $relative = Relative-ForwardPath $stage $file.FullName
    "$hash  $relative"
  }
  Set-Content -LiteralPath (Join-Path $stage "SHA256SUMS.txt") -Value $sumLines -Encoding utf8

  Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -CompressionLevel Optimal
  New-Item -ItemType Directory -Path $verify | Out-Null
  Expand-Archive -LiteralPath $zip -DestinationPath $verify

  & node (Join-Path $root "tools/verify-wechat-h5-delivery.mjs") $verify
  if ($LASTEXITCODE -ne 0) { throw "交付包解压复验失败" }
  Write-Output "交付包：$zip"
} finally {
  foreach ($candidate in @($stage, $verify)) {
    if (Test-Path -LiteralPath $candidate) {
      $safe = Assert-TempDirectory $candidate
      Remove-Item -LiteralPath $safe -Recurse -Force
    }
  }
}
```

该实现对白名单运行洁净检查，保持相对路径，拒绝敏感/临时文件，生成 manifest 与 SHA 清单，压缩后在第二个临时目录复验，并只删除已经验证位于系统临时根目录下的两个目录。

- [ ] **Step 3: 运行空包失败测试**

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-wechat-h5-delivery.ps1
```

Expected: 若白名单存在未提交变更则明确拒绝；不得生成 ZIP。

- [ ] **Step 4: 提交工具**

```powershell
git add -- tools/build-wechat-h5-delivery.ps1 tools/verify-wechat-h5-delivery.mjs dist/.gitkeep
git commit -m "build: add traceable H5 review package"
```

### Task 6: 最终证据冻结与打包

**Files:**
- Modify: `demos/微信H5精品游戏/README.md`
- Modify: `docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-qa.md`
- Create: `dist/wechat-h5-premium-games-review-{脚本计算的 8 位 Git SHA}.zip`

- [ ] **Step 1: 从当前提交运行全部验收**

```powershell
node tools/verify-wechat-miniprogram-shell.mjs
node tools/verify-wechat-h5-premium-games.mjs
node tools/verify-wechat-h5-accessibility.mjs
node tools/profile-wechat-h5-premium-games.mjs
node tools/profile-wechat-h5-longrun.mjs
```

Expected:

- 小程序壳退出码 0。
- 主验收退出码 0。
- 无障碍 25/28 且仅三个允许失败，退出码 0。
- 短时与长时无硬失败。
- 五份报告 `gitCommit` 完全相同。

- [ ] **Step 2: 更新边界文档并提交证据**

README、QA 与 manifest 必须使用相同措辞：

```text
本包是非生产评审包。浏览器 H5 已通过功能回归；三款 200% CSS zoom 模拟仍为已知限制。微信开发者工具、正式 AppID、业务域名、iOS/Android 真机、CDN、灰度、监控、回滚和审核未完成，不能声明生产 GO。
```

```powershell
git add -- demos/微信H5精品游戏/README.md docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-qa.md test-results/wechat-h5-premium-games
git diff --cached --check
git commit -m "test: freeze premium H5 review evidence"
```

- [ ] **Step 3: 重新跑快速验收绑定最终提交**

由于提交后 SHA 已变化，重新运行不含 6 分钟长测的四个工具：

```powershell
node tools/verify-wechat-miniprogram-shell.mjs
node tools/verify-wechat-h5-premium-games.mjs
node tools/verify-wechat-h5-accessibility.mjs
node tools/profile-wechat-h5-premium-games.mjs
```

把新报告提交；长时报告保留其源码文件哈希，并在 manifest 标明运行所对应的前一证据提交。

- [ ] **Step 4: 生成交付包**

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-wechat-h5-delivery.ps1
```

Expected: 生成唯一的 `dist/wechat-h5-premium-games-review-{脚本计算的 8 位 Git SHA}.zip`，且解压哈希复验通过。

- [ ] **Step 5: 最终人工核对**

从解压目录直接打开四个 HTML，确认：

- 大厅和三款均可离线打开。
- 普通入口无测试标记、无 `window.__GAME_TEST__`。
- 三款开始、暂停、结算和重玩可操作。
- README、QA、manifest 都没有生产 GO 表述。

- [ ] **Step 6: 提交清单，不提交 ZIP**

ZIP 作为本地交付物保留，不加入主仓库。提交生成工具和清单模板：

```powershell
git status --short -- dist
```

Expected: 仅 ZIP 为未跟踪或被 `.gitignore` 排除；源码工作区无其他任务文件改动。
