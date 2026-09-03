# 盖世游戏开发者后台一期 Demo

本目录是依据 2026-09-03 最新 4 份开发者后台 PRD 构建的对外产品 Demo。最新 PRD 是当前唯一业务基线；Figma 保持冻结，本轮不使用旧 Figma 页面数量或 Frame 映射约束 Demo。

## 当前页面契约

| 模块 | 页面数 | 主要范围 |
|---|---:|---|
| 01 开发者平台与资料 | 10 | 独立账号密码／盖世第三方登录、开发者注册、Game／APPID、三系统 SDK、线下结果 |
| 02 CDKEY 商品与供给 | 6 | 外部 Key 入站、盖世 Key 计划／批次、渠道 API、接口说明与双账本对账 |
| 03 包体测试与版本发布 | 13 | Windows／macOS／Linux Build、Manifest、测试、Release Pointer、发布与回滚 |
| 04 发行经营与渠道归因 | 8 | 经营看板、Campaign／UTM、人工资源执行、渠道归因与聚合导出 |

合计 37 个业务页，口径为 `10／6／13／8`。

## 四个入口

| 入口文件 | 用途 | 默认路由 |
|---|---|---|
| `01-开发者平台与资料demo.html` | 双登录、注册、资料、APPID／SDK 与结果 | P01-01 |
| `02-CDKEY商品与供给demo.html` | 双链 Key 供给、批次、渠道 API 与异常 | P02-01 |
| `03-包体测试与发布demo.html` | 三系统 Build、测试、发布、回滚与线上处置 | P03-01 |
| `04-精准投放与数据demo.html` | 经营分析、轻量 Campaign／UTM、人工资源和导出 | P04-01 |

文件名 `04-精准投放与数据demo.html` 为兼容既有入口保留，模块在页面内已按最新 PRD 命名为“发行经营与渠道归因”。

## 关键交互

- P01-01 默认展示平台账号／邮箱＋密码的登录／注册入口；可在当前卡片切换盖世游戏扫码登录、刷新二维码并返回账号登录。未注册账号自动创建后进入 P01-03 开发者认证；已注册且已确认开发者资格的账号进入 P01-02 工作台。
- P01-03 将平台介绍并入开发者注册第一步，不增加单独介绍 Tab；包含主体类型、注册地区、法定名称、登记编号、品牌和联系人。
- P01-06 展示唯一 APPID、Windows／macOS／Linux SDK 下载、SHA-256 校验和 Google Docs 接入文档入口。
- P01-09、P01-10、P03-10 只录入已经在线下完成的结果，不模拟在线“通过／驳回审核”。
- P02-01 保留“商品与供给、Key 批次、渠道 API、接口说明”四个任务 Tab；Key 和 Secret 仅在创建结果中展示一次。
- P03-12 按 `app_id + OS + CPU 架构` 配置 Release Pointer，并支持把 Pointer 原子回滚到历史 Build；Build、Manifest 和 Chunk 永久保留。
- P04-05 只做轻量 Campaign／UTM；P04-06 记录人工资源需求与运营实际执行结果；P04-08 按同一 `query_snapshot_id` 生成脱敏聚合导出。
- 顶栏帮助中心提供常见问题和联系我们，返回后保留原路由、任务 Tab 和滚动位置。

## Hash 路由与角色

路由格式：

    #/Pxx-xx?role=<developer|operations|tester>&state=<default|loading|empty|error|permission>

角色边界：

- `developer`：维护自身资料、Game、APPID、SDK、Build、CDKEY、Campaign 和聚合数据。
- `operations`：维护账号映射、录入线下结果、配置供给、发布版本和处置线上状态。
- `tester`：只处理分配给本人的测试任务并提交不可覆盖的测试结果。

越权访问统一展示无权限状态，不泄露目标厂商、Game、版本、Campaign 或 Key 对象是否存在。

## 离线与演示边界

- 四个 HTML 均为可双击打开的离线单文件，不加载外部脚本、样式、字体、图片、接口或 iframe。
- 所有页面操作只保留在当前浏览器会话；刷新后恢复初始数据，不使用本地或远程持久化。
- Demo 用于展示对外页面和操作结果；实际登录、建号、上传、Key 生成、SDK 下载、发布、回滚、资源投放和文件导出由正式服务端处理。
- 设计基准为 1440×900，最小支持 1280×800；不提供移动端布局。
- 一期不包含在线合同、财税银行卡、自动结算、广告竞价、算法推荐、复杂人群圈选或用户级明细。

## 构建与验收

在仓库根目录执行：

    node demos/开发者后台一期/build.mjs
    node --test tests/developer-backend/*.test.mjs
    node tests/developer-backend/capture-evidence.mjs

构建会读取并校验 4 份最新 PRD 的页面标题、顺序和 `10／6／13／8` 数量，成功时输出：

    Latest PRD contract verified: 4 documents, 37 pages (10/6/13/8), version 2026-09-03.

浏览器验收覆盖 37 路由、两种桌面尺寸、五种通用状态、权限隔离、关键交互、控制台／页面错误、远程请求和水平溢出。
