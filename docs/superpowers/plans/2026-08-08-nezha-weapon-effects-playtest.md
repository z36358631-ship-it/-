# 哪吒与陈塘关武器效果与试玩收尾 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让普通/专属武器在真实对局中正确触发控制、直线贯穿、火焰区与冰冻减速区，并让局外装备在下一局真正生效，随后发布并完成新版 AI 玩家验证。

**Architecture:** `app/game-engine.mjs` 保持为确定性战斗核心，装备只保存 ID，并由统一的武器触发器处理单一核心词条。`app/page.tsx` 负责装备库与英雄配装，把配装映射传入新战局；Node 测试验证规则，浏览器验证移动端可见反馈。

**Tech Stack:** React 19、TypeScript、vinext/Vite、Node test、OpenAI Sites。

---

### Task 1: 固化装备战斗合同

**Files:**
- Modify: `h5游戏/nezha-chen-tang-demo/test/game-engine.test.mjs`
- Modify: `h5游戏/nezha-chen-tang-demo/app/game-engine.mjs`

- [ ] **Step 1: 写失败测试**

新增三组确定性用例：`loadouts` 会赋给新生成英雄；`piercing-bow` 只伤害主目标身后同一直线单位；`flame-spear`/`frost-blade` 会生成 3.5 秒区域并分别造成伤害/减速。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test`

Expected: 新增的直线贯穿与局外配装用例失败。

- [ ] **Step 3: 实现最小规则**

在 `game-engine.mjs` 中新增直线判定，条件为候选单位与“攻击者→主目标”向量共线且位于主目标之后；创建战局时复制 `loadouts`，生成英雄时读取对应装备 ID。保留每件武器一个 `effect`，不增加叠词条。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm.cmd test`

Expected: 全部测试通过。

### Task 2: 打通局外装备到下一局

**Files:**
- Modify: `h5游戏/nezha-chen-tang-demo/app/page.tsx`
- Test: `h5游戏/nezha-chen-tang-demo/test/ui-contract.test.mjs`

- [ ] **Step 1: 以装备 ID 保存配装**

把 `loadouts` 改为 `Record<string, string | null>`；UI 展示时由 `EQUIPMENT.find(item => item.id === id)` 解析名称，点击装备时保存 `item.id`。

- [ ] **Step 2: 创建战局时传入配装**

`startBattle` 调用 `createInitialState({ seed, activeItem, passiveItem, loadouts })`，让已拥有并配置的武器在下一局生成英雄时生效。

- [ ] **Step 3: 增加 UI 合同测试**

断言装备操作传递 `item.id`，并且 `loadouts` 被传入 `createInitialState`。

### Task 3: 验证、发布与 AI 试玩

**Files:**
- Modify: `h5游戏/nezha-chen-tang-demo/.openai/hosting.json`（仅在托管信息需要更新时）
- Create: `h5游戏/nezha-chen-tang-demo/docs/ai-playtest-report-v2.md`

- [ ] **Step 1: 完整验证**

Run: `npm.cmd test`

Run: `npm.cmd run build`

Expected: 测试全绿，构建退出码 0。

- [ ] **Step 2: 移动端浏览器验收**

以 390×844 验证征兵、拖入亮格、铲子解锁、英雄进化、自动行军、武器拾取、贯穿、火焰区、冰冻区和装备限制，确认控制/区域有可见文字反馈。

- [ ] **Step 3: 发布新版**

保存并部署同一 Sites 项目的新版本，保持公开免登录访问，直到部署状态成功。

- [ ] **Step 4: 运行 10 名 AI 玩家新版样本**

报告必须区分“实验室模拟”与“真实跨天留存”，并输出 D1、D7、人均/中位数单日游戏时长、人均/中位数每局时长、人均/中位数单日场次；真实 D1/D7 不得由模拟数据冒充。
