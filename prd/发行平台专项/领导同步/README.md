# 盖世游戏 PC 发行平台领导同步材料

本目录生成 6 张 `1920×1080` 横版 PNG，用于公司内部说明平台目标形态、业务闭环、Demo 证据和交付边界。

本材料展示目标产品形态与当前 Demo 证据，不代表全部能力已上线。

## 本地预览

- HTML：`prd/发行平台专项/领导同步/leadership-sync.html`
- 图片目录：`prd/发行平台专项/领导同步/output/`

## 输出文件

1. `01-product-landscape.png`：产品功能全景
2. `02-onboarding-and-game.png`：厂商准入与游戏建档
3. `03-integration-test-release.png`：开发接入、测试与发布
4. `04-commerce-and-operation.png`：商品交易与发行经营
5. `05-operations-and-scope.png`：平台运营与交付边界
6. `06-enterprise-certification.png`：企业认证详细流程

## 状态标记

- `已有 PRD＋Demo`：专项需求和可操作原型均已形成，不代表已上线。
- `已有 Demo，待 PRD`：产品形态已有原型，规则及研发范围待收口。
- `依赖专项／外部确认`：依赖玩家端、支付、法务、财务、CDN 或协作团队。
- `后续能力`：不纳入当前核心闭环。

## 生成与验收

在仓库根目录依次执行：

```powershell
node 'prd/发行平台专项/领导同步/capture-demo-pages.mjs'
node 'prd/发行平台专项/领导同步/build-leadership-sync.mjs'
node 'prd/发行平台专项/领导同步/export-slides.mjs'
& 'C:\Users\z3635\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'prd/发行平台专项/领导同步/optimize-pngs.py'
node --test 'tests/developer-backend/leadership-sync.test.mjs'
```

导出脚本会检查页面数量、尺寸、缺图、远程请求和浏览器错误；测试另查禁用文案、截图映射、PNG 数量与单图体积。

## Demo 证据来源

- `demos/开发者后台一期/01-开发者平台与资料demo.html`
- `demos/开发者后台一期/02-CDKEY商品与供给demo.html`
- `demos/开发者后台一期/03-包体测试与发布demo.html`
- `demos/开发者后台一期/04-精准投放与数据demo.html`
- `demos/开发者后台一期/06-游戏创建与发行资料demo.html`
- `demos/开发者后台一期/07-开发接入与资源中心demo.html`

最终图片只使用仓库内截图和系统字体，不依赖远程图片、字体、脚本或样式，可直接上传飞书。
