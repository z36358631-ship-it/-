# 社区任务中心后台 Demo 兼容改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修改社区任务中心后台 Demo，使最终任务清单、发帖条件联动、跳转目标值和保存回显形成完整可操作闭环。

**Architecture:** 保持单文件 HTML 和现有全局 Mock 状态，通过任务元数据映射驱动任务条件、目的和落地页选项。弹窗使用统一表单状态与联动渲染，提交时写回 `mockTasks`；列表只负责展示持久化后的任务配置。

**Tech Stack:** 原生 HTML、CSS、JavaScript、现有 Font Awesome、浏览器手工验收。

---

### Task 1: 建立最终任务数据与元数据映射

**Files:**
- Modify: `demos/后台管理/任务中心后台demo.html:374-385`
- Test: 浏览器控制台/页面行为，确认任务清单渲染数量和字段

- [ ] **Step 1: 替换 Mock 任务结构**

将 `mockTasks` 的字段统一为 `id/type/conditionGroup/purpose/reward/dailyLimit/buttonText/landingPage/targetValue/topic/zone/status`，录入设计规格中的 17 条任务。连续签到保留 `reward: '2/8/20/50'` 与 `dailyLimit: '-'`，无配置统一使用空字符串或 `-`。

- [ ] **Step 2: 增加条件和落地页元数据**

在 Mock 数据后增加：

```js
const taskConditionGroups = {
  daily: [
    { value: 'app_active', label: 'APP活跃', purposes: ['每日签到', '连续签到（3/7/15/30天）'] },
    { value: 'app_feature_active', label: 'APP功能活跃', purposes: ['有效游玩游戏（秒玩/PC模拟器）'] },
    { value: 'app_community_active', label: 'APP社区活跃', purposes: ['完成3次点赞/收藏', '有效评论', '社区帖子发布'] },
    { value: 'app_external_exposure', label: 'APP外站曝光', purposes: ['社区帖子分享（微信/朋友圈/QQ/微博）'] },
    { value: 'app_revenue', label: 'APP收入', purposes: ['观看广告视频（3次）'] }
  ],
  once: [
    { value: 'personal_info', label: '个人信息', purposes: ['首次修改个人资料（头像/昵称/性别…）', '首次完成第三方账号绑定（微信/QQ）'] },
    { value: 'community_guide', label: '社区引导', purposes: ['首次加入社区分区', '首次发布社区帖子', '首次分享PC引擎设置（纯发布/挂帖子内）', '首次分享按键配置（纯发布/挂帖子内）'] },
    { value: 'app_settings', label: 'APP设置', purposes: ['开启通知弹窗', '首次绑定游戏平台账号（Steam/Epic/…）'] },
    { value: 'social_guide', label: '社媒引导', purposes: ['首次关注社媒（公众号）'] }
  ]
};
const landingPageOptions = [
  { value: 'none', label: '无跳转' }, { value: 'game_library', label: '游戏库' },
  { value: 'community', label: '社区' }, { value: 'create_post', label: '打开发帖' },
  { value: 'open_ad', label: '打开广告' }, { value: 'specific_post', label: '指定帖子' },
  { value: 'specific_topic', label: '指定话题' }
];
```

- [ ] **Step 3: Run the existing HTML in a browser and verify**

打开 `demos/后台管理/任务中心后台demo.html`，确认任务列表没有 JavaScript 报错，任务数据可被 `renderTasks()` 读取。

### Task 2: 扩展任务列表列与渲染

**Files:**
- Modify: `demos/后台管理/任务中心后台demo.html:210-222, 520-555`
- Test: 浏览器截图与横向滚动检查

- [ ] **Step 1: 更新表头顺序**

使用设计规格顺序：任务 ID、任务类型、任务条件、目的、积分、每日上限、按钮、跳转页面、目标值、状态、操作。

- [ ] **Step 2: 增加横向滚动容器样式**

给任务表外层增加 `overflow-x:auto`，保留现有表格样式，确保新增列不会压缩操作列。

- [ ] **Step 3: 更新 `renderTasks()`**

使用映射显示 `conditionGroup`、`purpose`、`landingPage`；目标值为空显示 `-`，topic/zone 作为任务条件摘要显示在目的列或指定条件列中，避免信息丢失。状态和操作沿用现有标签与链接。

- [ ] **Step 4: 验证列表内容**

确认 17 条任务均出现；指定帖子/指定话题未配置目标值时显示 `-`；页面宽度不足时表格出现横向滚动而不覆盖操作列。

### Task 3: 重构任务配置弹窗为三段式联动表单

**Files:**
- Modify: `demos/后台管理/任务中心后台demo.html:529-575`
- Test: 浏览器交互验收

- [ ] **Step 1: 增加弹窗局部样式和字段容器**

保留 `.modal`、`.form-group` 等现有样式，增加分组标题、条件块、字段错误提示和可滚动表单样式；不新增页面或全局弹窗。

- [ ] **Step 2: 实现任务类型、条件和目的联动**

新增 `conditionGroup`、`purpose` 控件。任务类型变化时只展示对应条件组；条件变化时更新目的选项；如果原条件或目的失效，自动选中该类型的首个有效组合。

- [ ] **Step 3: 实现发帖类完成条件联动**

只有目的为 `社区帖子发布` 或 `首次发布社区帖子` 时渲染 `chip-topic` 与 `chip-zone`；其他目的隐藏并清空 `topic`、`zone`。保留预设话题、自定义话题和专区 chip 的现有交互。

- [ ] **Step 4: 实现跳转页面与目标值联动**

根据 `landingPageOptions` 渲染跳转页面。仅 `specific_post` 显示目标值并提示“请输入帖子 ID”；仅 `specific_topic` 显示目标值并提示“请输入话题名称”；切换到其他页面时隐藏并清空 `targetValue`。

- [ ] **Step 5: 实现编辑回显**

`openTaskModal(id)` 根据任务对象回显所有字段，并在首次渲染后调用统一的 `syncTaskFormVisibility()`，保证编辑旧数据时显隐状态与值一致。

### Task 4: 完成保存、校验和状态写回

**Files:**
- Modify: `demos/后台管理/任务中心后台demo.html:563-580`
- Test: 浏览器新增、编辑、错误提交和切换清空

- [ ] **Step 1: 增加表单读取函数**

实现 `readTaskForm()`，读取任务类型、条件、目的、积分、上限、按钮、落地页、目标值、话题和专区，统一返回任务对象字段。

- [ ] **Step 2: 增加校验函数**

实现 `validateTaskForm(data)`：检查任务条件/目的/奖励积分，奖励必须为正整数；指定帖子或指定话题时检查 `targetValue.trim()` 非空，并在目标值下方显示对应错误文本。

- [ ] **Step 3: 写回新增和编辑数据**

确认回调中新增时生成 `T_` 前缀的新 ID 并 `push` 到 `mockTasks`；编辑时按 ID 覆盖字段但保留原 `id` 和 `status`。成功后关闭弹窗、刷新列表并沿用成功 Toast。

- [ ] **Step 4: 验证异常路径**

逐项验证：奖励为空、奖励为 0、指定帖子无目标值、指定话题无目标值均阻止保存；切换到普通页面后目标值被清空；切离发帖类目的 topic/zone 被清空。

### Task 5: 回归验收与证据

**Files:**
- Modify: `demos/后台管理/任务中心后台demo.html` only if verification exposes a defect
- Test: 浏览器手工验收、截图

- [ ] **Step 1: 验收新增任务流程**

新增一条“每日任务 / APP社区活跃 / 社区帖子发布”，选择指定话题、指定专区、指定帖子并填写目标值，保存后确认列表完整展示。

- [ ] **Step 2: 验收联动清空**

编辑该任务：切换到“有效评论”确认完成条件隐藏且 topic/zone 清空；切换跳转页面到“社区”确认目标值隐藏且 targetValue 清空。

- [ ] **Step 3: 验收编辑回显**

重新打开保存后的任务，确认每个字段与列表数据一致，尤其是目的、跳转页面、目标值和发帖条件。

- [ ] **Step 4: 回归其他后台页面**

切换到奖品配置和兑换与发货，确认页面仍可打开、表格仍可渲染、现有按钮和弹窗未受影响。

- [ ] **Step 5: 保存验收证据并检查 diff**

执行 `git diff --check`，记录浏览器截图路径和通过/未通过项；只保留本次任务相关改动。

