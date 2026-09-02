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

- 六个正式 Page 均由对应 SVG 导入 Figma；文字、矩形、边框、状态标签和分组为独立矢量/文字图层，没有用整页 PNG 或截图替代。中文统一使用 Figma 可用的 `Noto Sans SC`，英数字体使用 `Arial`，避免中文降级为空白字形。
- 每个业务 Page 顶部均有文件导航用的青绿色中文标题条；其不属于产品 UI，不新增路由、字段、弹窗、Toast 或流程。
- `废弃／历史` 保留原 `gamehub-developer-backend-phase1`、本轮替换前的 P01—P04 与组件母版，以及既有云端诊断备份；未执行不可恢复删除。历史内容不参与正式评审。

## 验收结果

- Page 目录：`废弃／历史`、6 个正式 Page 均已在云端文件中可见。
- 导入根图层：`figma-page-00`、`figma-page-01`、`figma-page-02`、`figma-page-03`、`figma-page-04`、`figma-page-components` 各 1 个；正式业务根图层和组件母版均位于 `(0,0)`。
- 关键实测：P01 为 `14480 × 1280`、P03 为 `20880 × 1280`、P04 为 `14480 × 1280`、组件母版为 `6360 × 3910`。P01-09、P03-13、P04-09 均已在 Figma 中放大检查，中文可见，深色导航与浅色内容区不存在白底白字。
- 本地完整回归：43/43 通过；5 份正式业务／组件 SVG 结构校验全部 PASS，均含可编辑文字、形状与分组，无外部资源、主动内容或整页截图主实现。

## 证据

| 证据 | 说明 |
|---|---|
| [figma-canvas-final-pages.png](./evidence/figma-canvas-final-pages.png) | Page 目录、全局流程索引、4 个模块和 `5840 × 1160` 可编辑根图层 |
| [figma-final-P01-root-20260902.png](./evidence/figma-final-P01-root-20260902.png) | 开发者平台与资料域的横向 9 页根画布，`14480 × 1280`、坐标 `(0,0)` |
| [figma-page-01-platform.png](./evidence/figma-page-01-platform.png) | `P01-01` 首次介绍与受邀账号登录细节 |
| [figma-final-P01-09-20260902.png](./evidence/figma-final-P01-09-20260902.png) | `P01-09` 游戏资料审核页元素与中文可读性 |
| [figma-page-03-release.png](./evidence/figma-page-03-release.png) | 包体测试与发布域的横向 13 页根画布 |
| [figma-key-page-P03-13.png](./evidence/figma-key-page-P03-13.png) | `P03-13` 线上版本处置页的深浅色对比度证据 |
| [figma-page-04-targeting.png](./evidence/figma-page-04-targeting.png) | 精准投放数据域的横向 9 页根画布 |
| [figma-final-P04-09-20260902.png](./evidence/figma-final-P04-09-20260902.png) | `P04-09` 投放监控页的深浅色对比度证据 |
| [figma-final-components-20260902.png](./evidence/figma-final-components-20260902.png) | 组件母版正式根图层、坐标、尺寸与独立文字图层 |
| [evidence-manifest.json](./evidence/evidence-manifest.json) | 最新截图的实际尺寸、文件大小和 SHA-256 |

## 保留项

云端保留了原单根画板与 4 个历史导入诊断备份，未做删除：`ceRvGbsYvEIUnwVPXuVe8z`、`27DE2A31i7Qk2wWitmFXz2`、`rcDeX7c0fvx1dXAnyRGEBi`、`onsx8OyE9f4DFpyni3J4Yc`。它们不参与正式交付；如需删除，必须另行确认。

本地旧截图和 `evidence/font-compatibility-test.svg` 作为历史诊断材料保留，不影响本次正式 Page 结构。
