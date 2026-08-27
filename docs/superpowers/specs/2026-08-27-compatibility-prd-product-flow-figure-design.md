# 兼容性查询 PRD 产品流程图设计规格

**日期：** 2026-08-27
**状态：** 用户已确认版式

## 1. 目标

把兼容性查询的本期链路合成一张图，放在 PRD「2.2 产品流程」，让研发、测试和评审者不翻页也能看懂主流程。

## 2. 范围

- 仅展示 Android。
- 流程止于复制分享码成功。
- 使用 3 张已验收 Demo 原图，不重绘页面。
- 导入为现有功能，只作图下注释，不画新页面。

## 3. 画布与布局

- 输出：PNG，1920×1080。
- 排列：从左到右，共 3 步。
- 背景：深色，沿用 Demo 视觉。
- 顶部：标题“兼容性查询使用流程”，右侧标记“Android”。
- 每步由完整页面截图、黄色序号和步骤名组成；步骤间使用黄色右箭头。
- 底部注释：“复制后可用盖世游戏现有功能导入；导入不属于本期新增范围。”

## 4. 流程内容

| 步骤 | 文案 | 图片 |
|---|---|---|
| 1 | 选择游戏、机型或评级 | `public/prd/compatibility-query-share-code/01-filter-portrait.png` |
| 2 | 查看兼容记录 | `public/prd/compatibility-query-share-code/02-record-list-portrait.png` |
| 3 | 查看兼容性评价并复制分享码 | `public/prd/compatibility-query-share-code/03-config-copy-android.png` |

## 5. PRD 更新

- 输出路径：`public/prd/compatibility-query-share-code/07-product-flow-android.png`。
- 将流程图放入 PRD「2.2 产品流程」，替换现有文字流程。
- 图片使用固定 Git 提交 SHA 的 jsDelivr 地址，并做远程校验。

## 6. 不做事项

- 不展示 Mac。
- 不新增导入页、Toast、按钮或其他状态。
- 不裁切、改色或改写截图内页面。
- 不把流程拆成多张 PRD 图片。

## 7. 验收

- 三步顺序、文案和截图对应。
- 原图完整，无变形、裁切或重绘。
- 画布宽度不低于 1600px，飞书内可放大辨认页面文字。
- 最后一步清楚展示“✓ 已复制”。
- PRD 只引用一张流程图，远程图片校验通过。
