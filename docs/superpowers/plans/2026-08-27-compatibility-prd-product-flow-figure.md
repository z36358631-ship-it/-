# 兼容性查询 PRD 产品流程图实施计划

> **目标：** 将已验收的 3 张 Android Demo 截图合成一张横向流程图，并替换 PRD「2.2 产品流程」的文字流程。

**方案：** 通过本地 HTML 画布按 1920×1080 排版原始截图，再用浏览器生成 PNG。截图仅等比缩放，不裁切、不改色。流程图发布后，PRD 使用固定 Git 提交 SHA 的公开地址。

**技术：** HTML/CSS、Playwright/Chromium、PowerShell、Git、to-prd 校验脚本。

---

## 任务 1：核对输入与范围

**输入文件：**

- `public/prd/compatibility-query-share-code/01-filter-portrait.png`
- `public/prd/compatibility-query-share-code/02-record-list-portrait.png`
- `public/prd/compatibility-query-share-code/03-config-copy-android.png`
- `docs/superpowers/specs/2026-08-27-compatibility-prd-product-flow-figure-design.md`

1. 核对 3 张截图存在且为 Android 页面。
2. 核对流程顺序和文案与设计规格一致。
3. 确认不包含 Mac、导入页或新增交互状态。

## 任务 2：生成流程图

**输出文件：**

- `public/prd/compatibility-query-share-code/07-product-flow-android.png`

1. 建立 1920×1080 深色画布。
2. 横向放置三张完整截图，配黄色序号、步骤名和箭头。
3. 添加标题、Android 标签和范围注释。
4. 导出 PNG，并检查尺寸、截图完整性和文字可读性。

## 任务 3：发布图片并更新 PRD

**修改文件：**

- `prd/最终文档/【Prd】《盖世游戏》兼容性查询与启动配置分享码需求/【Prd】《盖世游戏》兼容性查询与启动配置分享码需求.md`
- `prd/workflow-state/LOCAL-20260825-compatibility-share-code.md`

1. 单独提交并推送流程图，取得固定提交 SHA。
2. 在 PRD「2.2 产品流程」引用该固定 SHA 图片，删除原文字流程。
3. 将状态卡更新为 Android-only、PRD V1.3，并登记流程图。
4. 检查 PRD 不含 Mac、Apple 或 Mac 图片链接。

## 任务 4：校验与发布

1. 运行 `validate-prd-quality.ps1`。
2. 运行 `validate-prd-images.ps1`，确认所有远程图片可访问。
3. 仅提交 PRD、状态卡、流程图及本实施计划。
4. 推送至 `codex/compatibility-prd-20260826`，记录最终提交 SHA。
