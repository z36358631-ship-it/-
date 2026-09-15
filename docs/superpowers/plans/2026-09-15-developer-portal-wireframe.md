# Developer Portal Wireframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建一个可直接浏览和分享的开发者门户低保真单文件 Demo，保持现有开发者平台文件不变。

**Architecture:** 使用一份自包含 HTML 承载语义化页面结构、响应式 CSS 和最小交互脚本。所有全宽区块共享 `.container` 居中容器；页面入口通过相对链接连接现有开发者平台。

**Tech Stack:** HTML5、CSS3、原生 JavaScript

---

### Task 1: 创建独立门户页面

**Files:**
- Create: `demos/开发者后台一期/开发者门户线框demo.html`

- [ ] **Step 1: 建立语义化页面骨架**

  加入全局导航、首屏、三项平台数据、三个能力板块和生命周期模块。页面末尾停在经营数据能力板块，不加入页脚。

- [ ] **Step 2: 实现全宽背景和居中内容区**

  使用统一 `.container { width: min(1180px, calc(100% - 48px)); margin-inline: auto; }`，所有区块背景保持全宽；在 768px 以下切换为单列并收紧间距。

- [ ] **Step 3: 实现最小交互**

  为语言按钮添加中英文切换；顶部登录和“进入控制台”使用相对链接连接现有开发者平台，帮助中心打开盖世游戏官网常见问题区域。

### Task 2: 验证与发布

**Files:**
- Test: `demos/开发者后台一期/开发者门户线框demo.html`

- [ ] **Step 1: 静态结构校验**

  运行文本检查，确认三个数据口径、三个能力标题、1180px 容器和目标链接存在；确认首屏副标题、底部 CTA 和页脚不存在。

- [ ] **Step 2: 浏览器视觉检查**

  分别以桌面宽屏和窄屏打开页面，检查全局导航、左右留白、内容对齐、纵向堆叠和横向滚动。

- [ ] **Step 3: 精确提交并推送**

  只暂存本设计文档、计划文档和独立 Demo 文件，提交后推送当前分支；使用提交 SHA 生成 htmlpreview 一键预览链接。
