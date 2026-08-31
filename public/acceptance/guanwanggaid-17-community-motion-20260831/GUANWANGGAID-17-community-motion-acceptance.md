# GUANWANGGAID-17 社区动效专项验收问题

结论：验收不通过。GameHub 6.2.0（125）共确认 5 条问题、1 条体验嫌疑；图片为原始页面截图，无红框，且每个问题仅在表格单元格内放 1 张图。

| 模块 | 问题描述 | 期望表现 | 截图 | 提交人 | 优先级 | 指派给 | 状态 | 环境/机型 |
|---|---|---|---|---|---|---|---|---|
| 社区-刷新/首次加载 | 【加载动画/骨架屏】断网刷新、进入社区前断网再恢复时均没有失败提示或重试入口；延迟恢复网络后骨架屏可持续 25 秒以上，页面不会自动恢复 | 保留原列表或骨架结构并提示加载失败；恢复网络后自动重试，或提供明确重试入口，加载状态及时结束 | ![断网刷新](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@b8d40845ba889c8308225a73da6f87999374c6c1/public/acceptance/guanwanggaid-17-community-motion-20260831/images/01-offline-refresh.png) | 郑群超 | P1 | 客户端/服务端 | 待处理 | 测试环境 / NX729J Android 15 + MuMu Android 12 / Official、Global / 中文、英文 / 横竖屏 |
| 社区-举报原因标签 | 【按钮按下动画】点击举报原因时只有青色描边和文字颜色变化，标签没有轻微缩放 | 点击标签时出现轻微缩放，结束后仅最后一项高亮 | ![举报原因](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@b8d40845ba889c8308225a73da6f87999374c6c1/public/acceptance/guanwanggaid-17-community-motion-20260831/images/02-report-tag.png) | 郑群超 | P3 | 客户端 | 待处理 | 测试环境 / NX729J / Android 15 / GameHub 6.2.0（125）/ Official / 中文 / 竖屏 |
| 社区-评论输入层 | 【过渡动画】打开评论输入层后，第一次物理返回只收起键盘，第二次返回没有反应，第三次才关闭输入层 | 键盘收起后再次返回应立即关闭评论输入层，不出现无反馈的空操作 | ![评论输入层](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@b8d40845ba889c8308225a73da6f87999374c6c1/public/acceptance/guanwanggaid-17-community-motion-20260831/images/03-comment-back.png) | 郑群超 | P2 | 客户端 | 待处理；连续两轮复现 | 测试环境 / NX729J / Android 15 / GameHub 6.2.0（125）/ Official / 中文 / 竖屏 |
| 社区-关注Tab加载 | 【加载动画/骨架屏】首次切到关注Tab时约 0.45 秒只剩Header、底栏和黑色内容区，没有加载状态 | 加载期间保留页面框架并显示可识别的加载状态，避免内容区短暂纯黑 | ![关注Tab空白](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@b8d40845ba889c8308225a73da6f87999374c6c1/public/acceptance/guanwanggaid-17-community-motion-20260831/images/04-following-blank.png) | 郑群超 | P2 | 客户端 | 体验嫌疑，待研发确认/优化 | 测试环境 / NX729J / Android 15 / GameHub 6.2.0（125）/ Official / 中文 / 竖屏 |
| 社区-列表分页 | 【加载动画】下一页加载期间断网，页面没有失败提示或重试入口；恢复网络后不会自动继续加载，需要再次上滑才会加载下一页 | 分页失败后结束加载态并提示失败；恢复网络后自动续载，或在列表底部提供明确重试入口 | ![分页失败](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@b8d40845ba889c8308225a73da6f87999374c6c1/public/acceptance/guanwanggaid-17-community-motion-20260831/images/05-pagination-failure.png) | 郑群超 | P2 | 客户端/服务端 | 待处理 | 测试环境 / MuMu Android 12 / GameHub 6.2.0（125）/ Global / 英文 / 竖屏 |
| 社区-发布提交 | 【加载动画/按钮状态】断网点击发布后按钮禁用并持续转圈；恢复网络 5 秒后仍不结束，约 30 秒后静默恢复为可发布状态，没有失败提示，也不会自动重试；草稿保留且重复点击被拦截 | 提交失败后及时结束加载态，保留草稿并提示失败；恢复网络后自动重试，或恢复可点击按钮并提供明确重试入口 | ![发布失败](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@b8d40845ba889c8308225a73da6f87999374c6c1/public/acceptance/guanwanggaid-17-community-motion-20260831/images/06-publish-stuck.png) | 郑群超 | P1 | 客户端/服务端 | 待处理；失败帖未发布，测试成功帖已删除 | 测试环境 / MuMu Android 12 / GameHub 6.2.0（125）/ Global / 英文 / 竖屏 |

补测通过：系统三类动画比例为 0、切后台草稿保留、在线连续三页分页、真机主 Tab/分区快速切换、帖子与个人页进退；真实响应乱序、慢网媒体、上传进度和后台特殊数据仍需 Mock 或造数。
