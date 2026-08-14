# 核心组件契约

所有组件均使用稳定 `data-component-id`；默认状态需要原尺寸回归，其他状态至少完成可见反馈、键盘/手柄路径与异常边界。

## C-SHELL-P：竖屏应用框架

- Anatomy：状态安全区、顶部工具栏、滚动正文、底部五栏导航。
- Variants：standard / immersive / flow。
- States：default / scroll-collapsed / modal-locked。
- Events：底栏切页、返回、搜索、滚动。
- Source refs：screen-08、screen-18、screen-20、screen-30。
- 约束：业务流程页才可移除底栏；底栏不得遮挡正文。

## C-SHELL-L：掌机横屏应用框架

- Anatomy：顶部导航、状态区、内容轨道、手柄提示。
- Variants：catalog / split / immersive。
- States：default / focused / modal-locked。
- Events：LB/RB 切页、方向键移动、A 确认、B 返回。
- Source refs：screen-36、screen-41、screen-44。
- 约束：不能旋转或整体缩放 C-SHELL-P。

## C-TOPBAR：顶部栏

- Anatomy：状态区、标题/平台 Tab、右侧设备或页面操作。
- Variants：standard / transparent / search / collapsed。
- States：default / sticky / input。
- Events：返回、搜索、更多、设备切换。
- Source refs：screen-09、screen-10、screen-16、screen-20、figma-09 `5504-639`。
- 回归登记：`epic-unbound-portrait/C-TOPBAR`。

## C-NAV-P：竖屏五栏导航

- Anatomy：5 个图标、标签和选中态。
- Variants：首页 / 玩游戏 / 排行榜 / 游戏库 / 我的。
- States：default / selected。
- Events：切换一级页面，不额外触发 Toast。
- Source refs：screen-08、screen-20、screen-30、figma-09 `5504-639`。
- 源尺寸：`1080×148`，单栏 216px。
- 回归登记：`epic-unbound-portrait/C-NAV-P`。

## C-NAV-L：掌机顶部导航

- Anatomy：一级入口、当前标题、设备/手柄、时间、网络和电量。
- Variants：catalog / detail。
- States：default / selected / focused。
- Events：LB/RB 切换、方向键聚焦、A 确认。
- Source refs：screen-36、screen-41、screen-43。
- 回归登记：`library-landscape/C-NAV-L`。

## C-BUTTON-GLOW：青蓝流光主按钮

- Anatomy：来源化边框、纵向渐变、标签、可选平台图标。
- Variants：primary / platform-login / start。
- States：default / pressed / focused / loading / disabled。
- Events：点击、Enter、A 键；loading 时防重复提交。
- Source refs：screen-20、screen-44、figma-09 `5504-639`。
- 源尺寸：竖屏 `270×71`；实测边框约 `rgb(43,195,223)`。
- 回归登记：`epic-unbound-portrait/C-BUTTON-GLOW`。

## C-BUTTON-SECONDARY：深色次按钮

- Anatomy：深色表面、文字或图标、可见焦点。
- Variants：secondary / icon / danger。
- States：default / pressed / focused / disabled。
- Events：点击、Enter、A 键。
- Source refs：screen-10、screen-22、screen-41、screen-44、figma-09。
- 回归登记：`library-landscape/C-BUTTON-SECONDARY`。

## C-TAB：文字 Tab

- Anatomy：文本和选中指示条。
- Variants：platform / content。
- States：default / selected / focused / disabled。
- Events：切换同一页面的数据集，保留滚动与焦点语义。
- Source refs：screen-18、screen-19、screen-20、screen-21。
- 源尺寸：竖屏高度 71px，指示条 `24×4`。

## C-INPUT-SEARCH：搜索输入

- Anatomy：搜索图标、输入区、清除按钮、可选错误说明。
- Variants：portrait / landscape。
- States：default / focused / filled / error / disabled。
- Events：输入、提交、清除。
- Source refs：screen-08、screen-09、screen-43、figma-09。

## C-DIALOG：居中弹窗

- Anatomy：遮罩、容器、标题、正文、操作组。
- Variants：confirm / danger / two-entry。
- States：open / submitting / failed。
- Events：确认、取消；高风险弹窗禁止点遮罩关闭。
- Source refs：screen-01、screen-22、screen-27、figma-09 `5504-639`。
- 已取得 Figma 组件组“流光边框菜单-弹窗按钮”外框 `130×265`；该值不是所有弹窗的页面尺寸。

## C-SHEET：底部操作面板

- Anatomy：遮罩、圆角容器、标题/拖拽区、内容、固定操作。
- Variants：login / menu / radio-confirm / mode。
- States：open / selected / loading / disabled。
- Events：取消、确认、菜单项选择。
- Source refs：screen-05、screen-06、screen-24、screen-26、screen-35。

## C-FEEDBACK：反馈状态

- Anatomy：状态图形、标题、说明、主/次操作。
- Variants：loading / empty / failed / disabled / syncing / conflict。
- States：visible。
- Events：重试、绑定、刷新、解决冲突。
- Source refs：screen-19、screen-20、screen-21、screen-34、figma-09。
- 约束：未知值不显示 0；空白不能代替状态说明。
- 回归登记：`epic-unbound-portrait/C-FEEDBACK`。

## 组件使用规则

- `measured`：已有可复核尺寸/像素，可直接用作基准。
- `derived`：从页面或混合证据推导，必须保留来源和置信度。
- `missing-source`：不得生成近似图标或宣称完成。
- 组件展厅左栏是原稿，右栏是实现；两者不能互换。
- 组件结果查看 `assets/visual-report.json`，不以整页分数替代。
