# 首页 Demo r8 Implementation Plan

**Goal:** 在同一固定地址展示立体设备外壳和系统、地区能力差异。

**Architecture:** platform.js 集中判断能力；app.js 管理切换与路由回落；首页及后置模块使用同一能力集。外壳 HTML/CSS 与 App 内容分离，离线合并为单文件。

**Tech Stack:** 原生 HTML/CSS/JavaScript，Python 合并，Playwright 验证。

1. 修改 app.html 和新增 review-shell.css：保留 DOM ID，增加地区分组，左侧控制卡、右侧 hardware 包裹；不改业务内容。
2. 修改 platform.js、app.js、concepts.js、retention.js：落实规格中已确认的能力差异；海外弱设备采用无匹配状态，禁止残留云路径；iOS 未确认的合集/频道保持。
3. 修改 build.py：platform.js 先加载，review-shell.css 最后加载。执行 `python -X utf8 work/GUANWANGGAID-64/homepage-lab/build.py`。
4. 扩展 verify.cjs：四种组合、三形态、菜单切换、地区禁止服务、页面返回、外壳几何与窄视窗。执行 `node work/GUANWANGGAID-64/homepage-lab/verify.cjs`，失败则修复对应实现。
5. 原尺寸截图与独立用户/开发/商业评审；review.md 记录当前产物SHA、已验证范围与未确认项。
6. publish.py 加入本规格和计划，定向提交并推送；固定URL核对HTTP状态和SHA，线上交互按实际结果记录。更新状态卡与工作流。
