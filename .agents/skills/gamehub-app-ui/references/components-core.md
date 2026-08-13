# 核心组件契约

## C-SHELL-P：竖屏应用框架

- Anatomy：状态安全区、顶部工具栏、滚动正文、底部五栏导航。
- Variants：普通、沉浸媒体、无底栏流程页。
- States：默认、滚动收缩、弹层锁定。
- Events：底栏切页、返回、搜索、滚动。
- Source refs：screen-08, screen-18, screen-30, screen-45。
- 约束：底栏不能遮挡正文；业务流程页才可移除底栏。

## C-SHELL-L：掌机横屏框架

- Anatomy：顶部导航、状态区、内容轨道、手柄提示。
- Variants：目录、双面板、沉浸详情。
- States：默认、焦点、滚动、遮罩。
- Events：LB/RB 切页、方向键移动、A 确认、B 返回。
- Source refs：screen-36 至 screen-44。
- 约束：不得通过旋转或整体缩放 C-SHELL-P 实现。

## C-TOPBAR：顶部栏

- Anatomy：返回/品牌、标题或搜索、右侧操作。
- Variants：标准、透明沉浸、搜索、滚动收缩。
- States：默认、吸顶、输入中。
- Events：返回、搜索、更多。
- Source refs：screen-09, screen-10, screen-16, screen-25, figma-09 (`5504-639`)。

## C-NAV：导航

- Anatomy：图标、标签、选中指示、可选角标。
- Variants：竖屏底栏、横屏顶栏、二级 Tab。
- States：默认、选中、聚焦、禁用、带提醒。
- Events：选择后切换页面或同页内容，不额外弹 Toast。
- Source refs：screen-08, screen-11, screen-18, screen-36, figma-09 (`5504-639`)。

## C-BUTTON：按钮

- Anatomy：可选前图标、标签、可选后状态。
- Variants：品牌主按钮、业务青蓝按钮、次按钮、文字按钮、危险按钮、图标按钮。
- States：默认、悬停/按下、聚焦、加载、禁用。
- Events：点击、键盘/手柄确认；加载时防重复提交。
- Source refs：screen-01, screen-05, screen-19, screen-26, figma-09 (`5504-639`)。
- 约束：一组操作只保留一个主按钮；不得用 Emoji 作图标。

## C-TAB-CHIP：Tab 与筛选 Chip

- Anatomy：文本、选中指示，可选数量。
- Variants：平台 Tab、内容 Tab、胶囊 Chip。
- States：默认、选中、聚焦、禁用。
- Events：切换数据或视图；保持焦点与滚动位置可预测。
- Source refs：screen-09, screen-16, screen-18, screen-29, screen-42。

## C-SECTION：区块标题与内容容器

- Anatomy：标题、可选说明、可选“查看全部”、内容槽位。
- Variants：普通、紧凑、沉浸叠加。
- States：默认、加载、空、失败。
- Events：查看全部。
- Source refs：screen-08, screen-11, screen-30, screen-37。

## C-DIALOG：居中弹窗

- Anatomy：遮罩、容器、标题、说明、正文、操作组。
- Variants：确认、危险确认、双入口选择。
- States：打开、提交中、失败。
- Events：确认、取消、遮罩关闭（高风险弹窗禁用遮罩关闭）。
- Source refs：screen-01, screen-22, screen-27, figma-09 (`5504-639`)。

## C-SHEET：底部操作面板

- Anatomy：遮罩、圆角容器、标题/拖拽区、内容、固定操作。
- Variants：登录、更多菜单、单选确认、模式选择。
- States：打开、选中、禁用、加载。
- Events：取消、确认、菜单项选择。
- Source refs：screen-05, screen-06, screen-24, screen-26, screen-35。

## C-MENU：更多菜单

- Anatomy：触发按钮、菜单、图标项、危险项。
- Variants：下拉、底部宫格。
- States：关闭、打开、聚焦、禁用。
- Events：打开、选择、关闭；低频账号操作收纳在此。
- Source refs：screen-24, figma-02 (`51374-15897`), figma-09 (`5504-639`)。

## C-FEEDBACK：反馈状态

- Anatomy：状态图形、标题、说明、主/次操作。
- Variants：加载骨架、空、失败、禁用、同步中、冲突。
- States：与变体一致；支持重试和去绑定等业务动作。
- Events：重试、绑定、刷新、解决冲突。
- Source refs：screen-19, screen-20, screen-21, screen-34, figma-09 (`5504-639`)。
- 约束：未知值不得显示为 0；空白不能代替状态说明。

## C-INPUT：输入与搜索

- Anatomy：标签/占位、输入区、前图标、清除、错误说明。
- Variants：文本、验证码、搜索、带筛选。
- States：默认、聚焦、已填、错误、禁用。
- Events：输入、提交、清除。
- Source refs：screen-05, screen-06, screen-09, screen-28, screen-43。

