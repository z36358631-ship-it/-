# DST MODS 三端 Demo 重构设计

- 日期：2026-07-30
- 状态：设计已确认，待实施计划
- 业务游戏：《饥荒联机版》DST
- 游戏标识：`game_id = steam:322330`
- 交付形式：3 份无外部依赖的单文件 HTML Demo

## 1. 背景

当前三份 Demo 仍是 GTA 5、上古卷轴等多游戏的通用 Mod 中心，包含一级 Mod 导航、排行榜、点赞、收藏和跨游戏搜索。安装状态由按钮文案和定时器直接驱动，APP 横竖屏分别维护 DOM，旋转后不能保留同一任务和页面状态。

最终 PRD 已将本期范围收敛为 DST 外部非官方 MODS，并明确：

- Mac 从 DST 游戏详情中的独立 MODS 卡片进入。
- APP 从 DST 游戏详情“更多”菜单进入，不新增一级导航。
- 安装、启停、更新、卸载和下载任务只属于当前设备。
- APP 竖屏、横屏和运行中旋转共用同一业务状态。
- 安装成功、启用、本次计划加载和游戏实际加载是四个不同事实。
- 官方创意工坊不是本期需求，只保留既有业务位置和订阅语义，与 MODS 隔离。

因此本次不是视觉微调，而是按最终 PRD 重构三份 Demo 的信息架构、状态模型和交互链路。

## 2. 目标与非目标

### 2.1 目标

1. 原位更新三份旧 Demo，保持评审文件路径不变。
2. 三份文件使用同一版业务状态模型、动作语义和派生规则。
3. Mac、APP 主功能和 APP 场景联动分别承担明确的演示职责。
4. APP 旋转只改变布局，不重建任务或丢失页面状态。
5. 三份文件断网后可直接打开，图标、封面、样式和脚本全部内嵌。
6. 通过评审控制台快速切换依赖阻塞、更新失败、来源未知、系统暂停、日志缺失和异常退出等状态。

### 2.2 非目标

- 不实现真实下载、解包、文件写入、游戏启动和日志读取。
- 不连接真实 MOD 来源、客户端本地数据库或服务端接口。
- 不改造创意工坊订阅流程。
- 不实现 MOD 发布、审核、账号同步、跨设备同步、云游戏、点赞、收藏和排行榜。
- 不把 Demo 状态持久化能力包装成生产级进程恢复。

## 3. 方案选择

采用“原文件原位重构、每文件自包含、内嵌同一状态内核”的方案。

未采用的方案：

- 合并为一个总 Demo：会改变现有评审入口，难以分别验收 Mac、APP 和场景链路。
- 仅修文案与视觉：不能解决旋转、任务幂等和正交状态问题。
- 引用共享外部 JavaScript：会破坏单文件离线交付要求。

三份文件允许布局和演示场景不同，但必须包含相同的：

```text
DEMO_MODEL_VERSION = dst_mods_demo_v1
game_id = steam:322330
状态字段
动作名称
任务幂等规则
状态派生规则
只读调试接口
```

## 4. 文件职责

### 4.1 Mac 主 Demo

文件：`demos/Mod与发行人/Mod功能Mac端demo.html`

负责展示完整桌面端产品形态：

- DST 游戏详情。
- 官方创意工坊既有模块与非官方 MODS 卡片的隔离。
- 可用 MOD / 已安装双页签。
- 搜索、排序、列表加载和任务状态。
- 居中详情弹窗。
- 安装、启停、更新、卸载。
- 启动前检查、日志证据和恢复建议。

### 4.2 APP 主 Demo

文件：`demos/Mod与发行人/Mod功能APP端demo.html`

负责展示移动端页面与旋转连续性：

- DST 游戏详情“更多”菜单入口。
- 竖屏 390×844 单列页面。
- 横屏 874×402 双列页面。
- 竖屏全屏详情。
- 横屏左右分栏详情。
- 已安装页和任务暂停/续传面板。
- 运行中竖横屏切换。
- 同一任务、页面和弹层状态跨方向保留。

### 4.3 APP 场景联动 Demo

文件：`demos/Mod与发行人/Mod功能APP端-场景联动demo.html`

负责展示从游戏详情到实际加载证据的闭环：

```text
DST 游戏详情
→ 更多菜单
→ MODS
→ 安装与启用
→ 返回游戏详情
→ 点击启动
→ 启动前检查
→ 游戏启动结果
→ ActualLoadEvidence
→ 异常退出
→ 恢复建议
```

该文件不重复完整内容发现能力，只保留完成场景闭环所需的列表、详情和管理操作。

## 5. 统一状态模型

### 5.1 根状态

三份文件内嵌同一结构：

```javascript
const state = {
  contractVersion: 'dst_mods_demo_v1',
  game_id: 'steam:322330',
  device_installation_id: '',
  platform: 'mac',
  orientation: 'not_applicable',
  mods: {},
  tasks: {},
  ui: {},
  launch: {},
  recovery: {},
  metrics: {
    taskCreateCount: 0,
    detailRequestCount: 0
  }
};
```

### 5.2 MOD 设备事实

每个 MOD 分开保存：

```text
installation_fact = not_installed | installed
enabled_value = enabled | disabled
update_fact = no_update | update_available | source_unknown
install_gate = allowed | dependency_blocked | incompatible | space_blocked
installed_version
latest_version
installed_package_hash
active_version_pointer
current_task_id
```

安装事实、启用值、更新事实、门禁和任务状态不能互相覆盖。

### 5.3 任务事实

任务使用以下幂等键：

```text
device_installation_id + game_id + root_mod_id
```

任务字段：

```text
task_id
root_mod_id
task_state
progress_percent
downloaded_bytes
failure_code
operation_attempt
created_at
```

支持状态：

```text
queued
downloading
paused_by_system
verifying
installing
succeeded
failed
cancelled
```

重复点击安装必须返回原 `task_id`，不能创建第二个任务。`render()`、方向切换和窗口尺寸变化不得创建任务或启动新的进度计时器。

### 5.4 页面状态

APP 跨方向保持：

```text
current_screen
active_tab
search_text
sort_key
filter_key
current_mod_id
selected_preview_id
reading_section_id
list_anchor_mod_id
detail_anchor_section_id
active_dialog
```

列表和详情位置使用稳定元素 ID 与元素内偏移恢复，不直接复用不同布局下的原始 `scrollTop`。

### 5.5 启动与证据状态

```text
manifest_id
launch_id
manifest_items
preflight_result
load_decision
actual_load_evidence
manifest_changed
exit_type
recovery_action
```

页面必须区分：

- `effective + load`
- `skipped + skip`
- `risk + load`
- `loaded_match`
- `missing`
- `version_mismatch`
- `unexpected_loaded`
- `log_unreadable`
- `parser_failed`

进入启动清单不能替代 `loaded_match`。

## 6. 核心交互

### 6.1 入口与隔离

Mac：

```text
DST 游戏详情 → MODS 卡片 → 查看全部
```

APP：

```text
DST 游戏详情 → 更多 → MODS
```

创意工坊保留为独立既有模块：

- 使用“官方”“订阅”“我的订阅”。
- 不读取 MODS 状态。
- 不响应 MODS 安装、下架、任务和回滚动作。

MODS 固定展示：

```text
非官方来源
当前设备本地管理
仅此设备
```

### 6.2 安装

正常链路：

```text
安装
→ 创建唯一 task_id
→ queued
→ downloading
→ verifying
→ installing
→ succeeded
→ installation_fact = installed
→ enabled_value = enabled
```

依赖可用时按钮显示：

```text
安装（含 N 个必要依赖）
```

硬依赖缺失或不兼容时禁止安装，并显示最短原因链。

### 6.3 系统暂停与续传

评审控制台可把 APP 下载任务切换为 `paused_by_system`。

返回前台：

- 自动续传一次。
- 沿用原 `task_id` 和已下载字节。
- 自动续传失败后显示“继续”“取消”。
- 继续仍使用原任务。

### 6.4 启停、更新和卸载

- 启停控件读取并写入 `enabled_value`。
- 更新进行中，旧版启停控件保持可用。
- 更新成功后继承最后一次启用值。
- 更新失败保留旧版指针、文件清单、启用值和 `update_available`。
- `source_unknown` 时不显示可执行更新按钮。
- 卸载确认必须展示“仅此设备”和受影响依赖项。
- 卸载不删除存档或用户 MOD 配置。

### 6.5 启动检查

启动页按三组展示：

- 本次生效。
- 本次跳过。
- 需确认风险。

没有已启用 MOD 时生成空清单并直接启动，不增加额外确认页。

### 6.6 日志证据与恢复

游戏启动后展示 `ActualLoadEvidence` 结果。

只有清单相对最近成功清单发生变化并异常退出时显示恢复建议：

1. 停用本次变化后重试。
2. 无 MOD 启动。
3. 保持当前设置继续尝试。

默认不执行任何一项，不自动修改用户状态。

## 7. 评审控制台

评审控制台位于产品画布之外，不属于正式产品界面。

统一提供：

- 重置 Demo。
- 正常安装。
- 硬依赖阻塞。
- 空间不足。
- 来源状态未知。
- 系统暂停。
- 更新失败保留旧版。
- 日志证据缺失。
- 清单变化后异常退出。

APP 额外提供：

- 切换竖屏。
- 切换横屏。
- 模拟进入后台。
- 模拟回到前台。

场景联动额外提供：

- 上一步。
- 下一步。
- 直接跳转指定场景。

控制台只派发动作，不直接改 DOM。

## 8. 页面与视觉

### 8.1 视觉基线

- 主背景：黑色。
- 卡片：深灰。
- 选中态与重点数字：品牌金。
- 主操作：蓝色渐变。
- 成功：绿色。
- 警告与非官方来源：橙色文字标签。
- 官方创意工坊：蓝色文字标签。
- 信息区别同时使用文字与图标，不能只靠颜色。

移除旧 Demo 的大面积紫色光晕、外部 Font Awesome、Unsplash 和远程占位图。

### 8.2 图标与封面

- 图标使用文件内的 SVG sprite 或 CSS 图形。
- MOD 封面使用内联 SVG 或 CSS 渐变插画。
- 不使用网络型 `src`、`href`、CSS `url()`、`fetch`、XHR、iframe 或 CDN。

### 8.3 尺寸与可用性

- APP 竖屏画布：390×844。
- APP 横屏画布：874×402。
- 触控热区不小于 44×44。
- 正文使用 14–16px 层级。
- 页面允许浏览器缩放。
- 列表和详情独立滚动，隐藏滚动条但保留滚动能力。
- 主要按钮提供 hover、active、disabled 和 loading 反馈。

## 9. 渲染与动作边界

采用单向数据流：

```text
用户操作
→ dispatch(action)
→ reducer(state, action)
→ derive(state)
→ render(viewModel)
```

禁止：

- 在 `render()` 中推进任务。
- 在方向切换回调中创建任务。
- 通过修改按钮 class 代表业务状态提交。
- 横竖屏分别保存两份安装事实。
- 打开详情时重置安装状态。

允许任务推进器在首次创建任务时启动一次。推进器按 `task_id` 注册，任务结束、取消或重置后销毁。

## 10. 只读调试接口

三份文件都暴露：

```javascript
window.__DST_MODS_DEMO__ = {
  version,
  getState,
  dispatch,
  derive,
  reset
};
```

该接口用于自动化验证，不在产品画布中展示。

## 11. 验收与测试

### 11.1 静态门禁

三份 HTML 必须满足：

- 无网络型资源地址。
- 无 iframe。
- 无 `fetch` 和 XHR。
- 包含 `DEMO_MODEL_VERSION`。
- 包含 `steam:322330`。
- 包含 `device_installation_id`、`task_id`、`source_unknown`、`paused_by_system` 和 `loaded_match`。
- 不包含 GTA 5、上古卷轴、一级 Mod 导航、排行榜、点赞和收藏。

### 11.2 状态合同

三份文件使用同一组测试向量：

1. 首次安装依次进入下载、校验、安装和成功。
2. 安装进行中重复点击仍只有一个 `task_id`。
3. 安装成功后默认启用。
4. 启停与更新任务正交。
5. 更新失败保留旧版、启用值和 `update_available`。
6. `source_unknown` 不展示可执行更新。
7. 日志缺失不计入实际生效。

### 11.3 APP 连续性

两个 APP Demo 执行：

```text
设置页签、搜索和排序
→ 打开详情
→ 切到更新记录
→ 开始下载
→ 竖屏切横屏
→ 横屏切竖屏
```

断言：

- 页面与当前 MOD 不变。
- 阅读章节与列表锚点不变。
- `task_id` 不变。
- 进度不倒退。
- 任务创建数为 1。
- 详情请求数不因旋转增加。

### 11.4 浏览器验收

使用 Playwright 以 `file://` 和离线模式打开三份文件：

- 页面无外部请求。
- 控制台无错误。
- 图标和封面可见。
- Mac、APP 竖屏和 APP 横屏无横向溢出。
- Tab、搜索、排序、详情、安装、启停、更新、卸载、启动检查和恢复操作可点击。
- 截取 Mac、APP 竖屏、APP 横屏和场景联动关键页面作为视觉证据。

## 12. 完成标准

只有同时满足以下条件才算完成：

1. 三份旧文件均已原位更新。
2. 三份文件离线可用且无外部请求。
3. 三份文件使用同一模型版本和状态语义。
4. Mac 与 APP 页面符合最终 PRD。
5. APP 旋转不丢页面或任务状态。
6. 场景联动覆盖启动检查、实际加载证据和恢复建议。
7. 创意工坊与 MODS 在入口、术语和状态上隔离。
8. 自动化、截图审查和多角色体验评审均通过。
