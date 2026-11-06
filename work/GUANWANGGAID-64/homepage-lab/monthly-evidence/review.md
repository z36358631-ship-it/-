# 签到周／月展示专项复核

- 审核者：checkin_reference；日期：2026-11-06。
- 对应 HTML SHA256：ec7bdb1f29cb95b21cb34fd252806fabd0de0cc5ce02b2c7fda1550c4c295aeb。
- 复现：`node work/GUANWANGGAID-64/homepage-lab/verify-monthly.cjs`。
- 最终结果：verification.json 28 组通过，浏览器异常0、外部运行时请求0；浏览器直接运行构建产物，未注入替代源码。

## 检查范围

默认周一至周日7格，更多展开实际当月28／29／30／31天及周一首列偏移，收起恢复7格；跨月周保留完整日期键并淡显其他月份，当月累计只计当前月。上海零点、同日幂等、跨日／跨月派生今日状态、旧布尔值不伪造历史、余额不变均已覆盖。默认真实签到时钟独立于优惠演示的历史 demoNow。

签到页直接展示每日／成长任务，切换后仍在 ret-task，无更多积分跳转按钮；畅玩、社区互动、评论、分享跳转后返回保留签到页面上下文。竖屏、横屏、平板与390px视窗无横向溢出。

## 三视角快速复核

- 用户：默认一周减少占高，更多可看整月；同页直接展示任务分类，符合最新反馈。已实际审看 signin-portrait.png、signin-expanded-portrait.png、signin-landscape.png 和 signin-inline-daily.png，标题、选中日、更多／收起及任务内容无重叠。
- 开发：日期键按上海日历生成，周跨月使用真实年月日，签到状态由日期记录派生；既有任务返回不丢签到上下文，未发现本轮范围内硬伤。
- 商业：复用现有积分与任务配置，未加入补签、连续倍奖或新消费任务；本地日期演示不代表积分到账或真实用户留存效果。

## 截图

- signin-portrait.png／signin-landscape.png／signin-tablet.png：最终默认本周。
- signin-expanded-portrait.png／signin-expanded-landscape.png／signin-expanded-tablet.png：更多展开整月；较高内容按真实页面滚动呈现。
- signin-inline-daily.png／signin-inline-growth.png：同页任务区真实DOM局部，供文档使用。
- daily-*、growth-*：各形态任务区；signin-narrow.png：390px视窗。

verification-attempt1.json 为修改验证脚本前的历史失败记录：旧断言错误假定 setScenario 保留当前页，而该API实际返回首页。最终脚本通过既有签到任务入口重新进入后核查日期，不改变产品门槛。

未验证真实积分到账、账户历史同步、跨会话持久化或真实任务完成服务。
