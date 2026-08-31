# `/to-prd` Concise Writing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `/to-prd` 默认产出短、直、无重复且最多四列表格的 Markdown PRD，同时保留执行所需口径。

**Architecture:** `PRD-QUALITY-STANDARD.md` 保存详细简写门禁；`SKILL.md` 只保留执行摘要；模板提供四列表头和最小示例；问题模式保存匿名正反例；校验脚本只对客观结构报错，对疑似冗长和重复告警。工作区版先改并验证，再同步到全局版。

**Tech Stack:** Markdown、PowerShell、Codex Skill 包校验脚本、系统 `quick_validate.py`。

---

### Task 1: 固化简写门禁与 Markdown 默认交付

**Files:**
- Modify: `.agents/skills/to-prd/SKILL.md:95-166`
- Modify: `.agents/skills/to-prd/references/PRD-QUALITY-STANDARD.md:139-154`
- Modify: `.agents/skills/to-prd/references/FEISHU-MARKDOWN-IMAGES.md:46-54`

- [ ] **Step 1: 在质量门禁写入唯一详细规则**

用“删→并→归→缩→审”替换现有简洁段；明确同一页面、同一语境去重，C/B 端闭环可重述；未改区域按信息组写，改动元素和文案逐项写；短词产生歧义时保留完整词。

- [ ] **Step 2: 精简 Skill 入口规则**

`SKILL.md` 只保留以下执行摘要并指向质量门禁：

```markdown
- 写前执行“删、并、归、缩、审”；详细口径以 `PRD-QUALITY-STANDARD.md` 的“简写门禁”为准。
- 同一页面、同一语境只保留一份定义；C/B 端为各自闭环可必要重述。
- 未改内容按页面区域合并写；改动元素、具体文案、默认值、状态和异常逐项写。
- 所有成稿表格最多四列；合并表头不得删业务字段。
```

- [ ] **Step 3: 恢复 Markdown 默认交付**

将图片失败规则改为：默认交付 Markdown；外链失败时先对比可用文档、更新固定 SHA 并做单图真实导入；只有用户明确要求或同意备选格式时生成 DOCX。

- [ ] **Step 4: 检查规则无重复**

Run:

```powershell
rg -n "删、并、归、缩、审|默认同时交付.*DOCX|所有成稿表格最多四列" .agents/skills/to-prd
```

Expected: 详细规则只在质量门禁出现一次；Skill 仅有摘要；无“默认同时交付 DOCX”。

- [ ] **Step 5: 提交规则与交付修改**

```powershell
git add -- '.agents/skills/to-prd/SKILL.md' '.agents/skills/to-prd/references/PRD-QUALITY-STANDARD.md' '.agents/skills/to-prd/references/FEISHU-MARKDOWN-IMAGES.md'
git commit -m "docs(to-prd): enforce concise PRD writing"
```

### Task 2: 把唯一模板改为最多四列

**Files:**
- Modify: `.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md:134-151`
- Modify: `.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md:266-286`

- [ ] **Step 1: 改埋点和报表表头**

```markdown
| 事件 | 页面／类型 | 触发与成功 | 参数 |
| 参数 | 类型／必填 | 说明 | 枚举／示例 |
| 报表 | 指标 | 维度与频率 | 角色 |
```

- [ ] **Step 2: 改风险补充表**

```markdown
| 状态 | 进入／退出 | 表现与操作 | 结果与恢复 |
| 场景 | 共同行为 | 端／地区差异 | 限制与降级 |
| 角色 | 权限与范围 | 禁止与越权 | 日志 |
| 场景 | 资格与规则 | 状态与结果 | 异常与历史 |
| 阶段 | 输入与校验 | 操作与结果 | 重复与失败 |
```

- [ ] **Step 3: 调整页面描述提示**

把“逐元素覆盖”改成“按区域覆盖”；未改区域可合并，改动元素、具体文案和状态必须逐项写。输出只写终态，补充只写异常和冲突。

- [ ] **Step 4: 验证模板无宽表**

Run:

```powershell
$p='.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md'
$lines=Get-Content $p
for($i=0;$i -lt $lines.Count-1;$i++){if($lines[$i] -match '^\|' -and $lines[$i+1] -match '^\|(?:\s*:?-{3,}:?\s*\|)+$'){if($lines[$i].Trim('|').Split('|').Count -gt 4){$lines[$i]}}}
```

Expected: no output.

- [ ] **Step 5: 提交模板修改**

```powershell
git add -- '.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md'
git commit -m "docs(to-prd): limit PRD tables to four columns"
```

### Task 3: 增加标杆式精简例并升级机械校验

**Files:**
- Modify: `.agents/skills/to-prd/references/PRD-QUALITY-PATTERNS.md:139-181`
- Modify: `.agents/skills/to-prd/scripts/validate-prd-quality.ps1:101-355`

- [ ] **Step 1: 增加匿名精简例**

新增“逐元素复述”和“六要素错位重复”两个模式，使用文件库 PRD 的匿名改写方式：长背景缩成“背景／现状／本期”，功能简介改名词短语，输出只保留终态，补充只保留异常。

- [ ] **Step 2: 让校验器拒绝宽表**

在解析表格后增加：

```powershell
foreach ($table in $tables) {
    if ($table.headers.Count -gt 4) {
        Add-Issue -List $errors -Code 'TABLE_TOO_WIDE' -Message "Table at line $($table.line) has more than four columns."
    }
}
```

- [ ] **Step 3: 改四列埋点解析**

事件参数改读 `$row[3]`；参数名、类型／必填、说明、枚举依次读 `$row[0..3]`；错误文案改为 four-column。

- [ ] **Step 4: 增加文风告警**

对“通过……实现、从而、进一步提升、全面提升、有效提升、全方位、本功能将、系统将会”只报 `AI_STYLE_SUSPECT`；对过多“现有／保留／用户点击／当前页面”报 `VERBOSE_SCAFFOLDING`；改进 `<br>` 分段后的精确重复告警。不得自动改文。

- [ ] **Step 5: 运行三份 PRD 只读回归**

Run:

```powershell
$v='.agents/skills/to-prd/scripts/validate-prd-quality.ps1'
& $v -Path 'prd/最终文档/【Prd】《盖世游戏》文件库竖屏文件管理MVP需求/【Prd】《盖世游戏》文件库竖屏文件管理MVP需求.md' -Json
& $v -Path 'prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md' -Json
& $v -Path 'prd/云时长限时包需求/【Prd】《盖世游戏》云游戏时段次卡与限时套餐需求.md' -Json
```

Expected: 旧宽表返回 `TABLE_TOO_WIDE`；GOG 的重复脚手架告警多于文件库；脚本正常输出 JSON，不修改三份 PRD。

- [ ] **Step 6: 提交模式与校验修改**

```powershell
git add -- '.agents/skills/to-prd/references/PRD-QUALITY-PATTERNS.md' '.agents/skills/to-prd/scripts/validate-prd-quality.ps1'
git commit -m "test(to-prd): detect wide and verbose PRDs"
```

### Task 4: 同步全局版并验证 Skill 包

**Files:**
- Modify: `C:/Users/z3635/.codex/skills/to-prd/SKILL.md`
- Modify: `C:/Users/z3635/.codex/skills/to-prd/references/PRD-QUALITY-STANDARD.md`
- Modify: `C:/Users/z3635/.codex/skills/to-prd/references/FEISHU-MARKDOWN-IMAGES.md`
- Modify: `C:/Users/z3635/.codex/skills/to-prd/references/MERGED-PRD-TEMPLATE.md`
- Modify: `C:/Users/z3635/.codex/skills/to-prd/references/PRD-QUALITY-PATTERNS.md`
- Modify: `C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-quality.ps1`

- [ ] **Step 1: 将工作区版相同文件同步到全局版**

只同步 Task 1—3 修改的文件，不改其他 Skill。

- [ ] **Step 2: 运行包一致性校验**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File '.agents/skills/to-prd/scripts/validate-skill-package.ps1' -SkillPath '.agents/skills/to-prd' -InstalledPath 'C:/Users/z3635/.codex/skills/to-prd'
```

Expected: `status=PASS`，无 `HASH_MISMATCH`。

- [ ] **Step 3: 运行系统 Skill 校验**

Run:

```powershell
& 'C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' 'C:/Users/z3635/.codex/skills/.system/skill-creator/scripts/quick_validate.py' 'C:/Users/z3635/.codex/skills/to-prd'
```

Expected: validation passes with no frontmatter or placeholder errors.

- [ ] **Step 4: 最终检查**

确认所有 Skill 表头最多四列、Markdown 为默认交付、全局与工作区 Hash 一致，且未改三份业务 PRD。
