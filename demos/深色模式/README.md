# 深色模式 · GUANWANGGAID-51

双击 `深色模式demo.html` 离线打开。我的→设置的设置页为演示起点；点击模式切换下「深色模式」选择跟随系统、开启、关闭。即时生效、本设备保存；不增加业务 Toast。其他原有设置条目为保留原稿结构，不扩展原业务交互。

产品之外的评审控件支持横竖切换、系统外观模拟、新用户/原深色老用户/原浅色老用户初始化。新用户默认跟随系统，老用户按原外观迁移；已有明确偏好优先。重新初始化只重置本 Demo 的存储键。浏览器阻止保存时回滚原选择，评审提示保存失败。

## 交付

- `evidence/portrait-dark.png`、`portrait-light.png`、`portrait-options.png`：竖屏深色、浅色、选择态。
- `evidence/landscape-dark.png`、`landscape-light.png`、`landscape-options.png`：独立横屏。
- `evidence/product-flow.png`：设置入口→选择偏好→浅色结果横向流程图。
- `evidence/verification.json`：17 项浏览器行为验证通过，无 JS 异常、无远程请求。
- `evidence/视觉证据.html`、`visual-report.json`：原尺寸原稿、DOM基线、50%叠加、绝对差异、热图、组件裁切及实测指标。

## 来源与限制

任务原图 `.tmp_taskboard/GUANWANGGAID-51-source.jpg`，1116×2480。设置骨架复用 `demos/帮助中心/src/app.css`；本次按任务图保留下载任务、移除帮助中心，局部图标来源与裁切登记见 `assets/source-manifest.json`。深色模式选择容器参照 screen-35 单选 Sheet 配方，按即时生效要求不增加确认步骤。浅色、横屏及新增三选项为派生设计。新增入口无已登记原始图标，保留图标位而不伪造；字体使用本地系统字体，未取得 Android 原字体。

严格视觉基线 **FAIL**：RGB 96.569%、边缘 96.970%、SSIM 90.283%、ΔE2000 P95 4.806；几何误差 0.125px 通过。SSIM 与色差未过门，不能声明像素一致。baseline 模式仅隐藏新增主题行，用于对齐原稿；正常演示含新增功能。人工已检查深浅竖屏、选择态和横屏浅色：新增入口对齐、三选状态明确、浅色图标变深、横屏独立布局；不替代机器失败结论。横屏列表可滚动，下载任务在下方。

事件仅本地内存展示，不联网。`theme_preference_change` 携带 `previous_preference`，`theme_view` 携带 `trigger_source`；两者均携带 `event_id`、实际 `user_mode=dark/light`、`theme_preference=system/on/off`。同偏好不重复报；仅偏好变化但实际外观未变时不报 theme_view；保存失败不报变更成功。后台系统变更不曝光，回前台重绘后上报。

## 重建与验证

```powershell
python demos/深色模式/build.py
node demos/深色模式/verify.mjs
python demos/深色模式/evidence.py
```

本地 Chrome + Playwright 验证；Python 依赖 Pillow、NumPy、scikit-image。仅演示新增设置与主题，未实现全 App 游戏页面换肤、账号同步或上线发布。
