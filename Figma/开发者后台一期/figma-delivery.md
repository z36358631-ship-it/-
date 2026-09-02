# 盖世游戏｜开发者后台一期 Figma 交付记录

## 交付链接

- Figma 文件：[盖世游戏｜开发者后台一期](https://www.figma.com/design/arz12KT0WQ7UsHHglFtReN/)
- 正式设计结构：6 个正式 Figma Page；旧单根画板仅保留在 `废弃／历史`，不再是交付锚点。

## 正式文件结构

| Figma Page | 内容 | 业务画板数 | 实际画布尺寸 |
|---|---|---:|---:|
| `00 全局流程索引` | 四模块闭环、37 页编号索引 | 0 | `5840 × 1160` |
| `01 开发者平台与资料` | `P01-01`—`P01-09` | 9 | `14480 × 1280` |
| `02 CDKEY 商品与供给` | `P02-01`—`P02-06` | 6 | `9680 × 1280` |
| `03 包体测试与发布` | `P03-01`—`P03-13` | 13 | `20880 × 1280` |
| `04 精准投放与数据` | `P04-01`—`P04-09` | 9 | `14480 × 1280` |
| `组件母版` | 现有跨页基础、输入、数据流程与状态组件 | 0 | `6360 × 3910` |

四个业务域共 37 个 `1440 × 900` 页面画板，仍按 `9／6／13／9` 保持原路由、角色、字段、状态和 Demo 交互；同一任务流从左到右阅读。完整映射见 [frame-map.json](./frame-map.json)，Page 与源文件映射见 [figma-page-map.json](./figma-page-map.json)。

## 可编辑性与来源

- 六个正式 Page 均由对应 SVG 直接粘贴导入 Figma；文字、矩形、边框、状态标签和分组为独立矢量/文字图层，没有用整页 PNG 或截图替代。
- 每个业务 Page 顶部均有文件导航用的青绿色中文标题条；其不属于产品 UI，不新增路由、字段、弹窗、Toast 或流程。
- `废弃／历史` 保留原 `gamehub-developer-backend-phase1`；另有四份云端诊断备份保留未删。历史内容不参与正式评审。

## 验收结果

- Page 目录：`废弃／历史`、6 个正式 Page 均已在云端文件中可见。
- 导入根图层：`figma-page-00`、`figma-page-01`、`figma-page-02`、`figma-page-03`、`figma-page-04`、`figma-page-components` 各 1 个。
- 关键实测：`04 精准投放与数据` 根画布为 `14480 × 1280`；图层树显示 `P04-01`—`P04-09` 的独立可编辑页面内容。
- 本地组织契约：2/2 通过；既有 Demo：17 条通过；37 条路由浏览器校验与 41 张截图回归均无页面错误、控制台错误、远程请求或横向溢出。

## 证据

| 证据 | 说明 |
|---|---|
| [figma-canvas-final-pages.png](./evidence/figma-canvas-final-pages.png) | Page 目录、全局流程索引、4 个模块和 `5840 × 1160` 可编辑根图层 |
| [figma-page-01-platform.png](./evidence/figma-page-01-platform.png) | 开发者资料域的横向 9 页画布 |
| [figma-page-03-release.png](./evidence/figma-page-03-release.png) | 包体测试与发布域的横向 13 页画布 |
| [figma-page-04-targeting.png](./evidence/figma-page-04-targeting.png) | 精准投放数据域、`P04-01`—`P04-09` 图层和根尺寸 |
| [evidence-manifest.json](./evidence/evidence-manifest.json) | 最新截图的实际尺寸、文件大小和 SHA-256 |

## 保留项

云端保留了原单根画板与 4 个历史导入诊断备份，未做删除：`ceRvGbsYvEIUnwVPXuVe8z`、`27DE2A31i7Qk2wWitmFXz2`、`rcDeX7c0fvx1dXAnyRGEBi`、`onsx8OyE9f4DFpyni3J4Yc`。它们不参与正式交付；如需删除，必须另行确认。

本地旧截图和 `evidence/font-compatibility-test.svg` 作为历史诊断材料保留，不影响本次正式 Page 结构。
