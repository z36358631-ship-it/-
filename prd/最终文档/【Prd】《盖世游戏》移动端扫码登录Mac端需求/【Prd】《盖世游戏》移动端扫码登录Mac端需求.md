# 【Prd】《盖世游戏》移动端扫码登录Mac端需求

## 一、版本信息

|时间|版本|变更人|主要变更内容|备注|
|---|---|---|---|---|
|2026\.08\.10|V1\.0|陈晓力|创建文档||
|2026\.08\.11|V1\.0|郑群超|更新文档，简化描述，优化说明||
|<span style="background-color: #FEF794;">2026\.08\.17 //2026.8.17修改</span>|<span style="background-color: #FEF794;">V1\.1 //2026.8.17修改</span>|<span style="background-color: #FEF794;">郑群超 //2026.8.17修改</span>|<span style="background-color: #FEF794;">增加扫描结果页、同地区校验和平台账号选择；调整分阶段有效期、设备信息来源及端到端加密边界 //2026.8.17修改</span>|<span style="background-color: #FEF794;">影响 2\.1、2\.2、3\.1、4\.1、4\.2、4\.3、五、六 //2026.8.17修改</span>|

## 二、背景、目标与范围

### 2\.1 背景与目标

盖世游戏 App 已支持账号登录及 Steam、Epic 绑定。用户在 Mac 端登录时，需要通过已登录 App 扫码确认，免去输入账号密码和重复绑定平台账号。

<span style="background-color: #FEF794;">当前处理方式（评审修改前）：非盖世登录二维码仅短暂提示；平台账号授权范围由系统直接决定；有效期未按等待扫码与等待确认分段。评审反馈表明，这些处理方式不利于用户持续阅读扫码结果、控制本次授权范围和理解有效期。 //2026.8.17修改</span>

<span style="background-color: #FEF794;">目标：在保留既有 App“我的”页扫码入口和 Mac 登录页骨架的前提下，跑通“扫码内容/地区校验 → 用户确认本次平台账号范围 → Mac 安全领取”闭环；盖世账号固定登录，仅同步用户本次选中的 Steam、Epic 具体账号。 //2026.8.17修改</span>

<span style="background-color: #FEF794;">成功结果：普通二维码可在结果页安全阅读；跨区扫码不占用 challenge；用户可按本次 challenge 选择平台账号；完成后 Mac 仅保存盖世账号会话及本次选中平台凭证，服务端无法解密平台凭证。 //2026.8.17修改</span>

<span style="background-color: #FEF794;">数据验证：通过扫描结果曝光、地区不一致、平台账号选择变化、登录状态流转及成败事件验证链路，不采集账号昵称、第三方账号 ID 或选中账号明细。 //2026.8.17修改</span>

### 2\.2 范围

|类型|内容|
|---|---|
|本期范围|<span style="background-color: #FEF794;">Mac 扫码登录页；App 扫码入口、相机权限、扫描结果页、同地区校验、本次平台账号选择、登录确认和结果反馈；服务端状态、授权与密文领取 //2026.8.17修改</span>|
|平台范围|<span style="background-color: #FEF794;">盖世账号固定登录；Steam、Epic 具体账号默认全选，用户可取消任意部分或全部平台账号；全部取消后仅登录盖世账号 //2026.8.17修改</span>|
|地区范围|<span style="background-color: #FEF794;">国内 App 仅登录国内 Mac，海外 App 仅登录海外 Mac；按 `cn/global` 产品地区字段判断，不使用 IP、登录位置、手机号或邮箱判断 //2026.8.17修改</span>|
|保留不变|<span style="background-color: #FEF794;">App“我的”页扫码入口、相机权限处理、Mac 二维码与账号密码同屏布局、手动刷新二维码和原返回路径 //2026.8.17修改</span>|
|不做事项|<span style="background-color: #FEF794;">不新增后台配置、账号绑定/解绑、账号排序、平台登录流程、会员能力或密码学算法指定 //2026.8.17修改</span>|



## 三、核心流程

### 3\.1 用户流程

<span style="background-color: #FEF794;">`Mac 展示二维码 → App 扫码并校验内容/地区 → App 选择本次平台账号并确认 → 平台凭证端到端加密中转 → Mac 领取、解密并持久化 → Mac ACK → 双端返回结果` //2026.8.17修改</span>

![核心流程](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/01-flow.png)



## 四、功能设计

### 4\.1 功能入口与 Demo

|模块|职责|
|---|---|
|Mac|生成二维码、展示扫码状态、领取并保存独立会话、返回扫码前页面|
|App|<span style="background-color: #FEF794;">提供扫码入口、内容与地区分流、扫描结果页、本次平台账号选择、确认登录和最终结果反馈 //2026.8.17修改</span>|
|服务端|<span style="background-color: #FEF794;">校验请求与产品地区、签发盖世账号设备会话、中转选中平台凭证密文包、控制状态并处理幂等与回收 //2026.8.17修改</span>|

### 4\.2 C 端页面与状态

demo:[扫码登录 Mac 端交互 Demo](https://htmlpreview.github.io/?https://raw.githubusercontent.com/z36358631-ship-it/-/65cb55ec4b83c257960da78edbbd52a6c63c9e4f/public/prd/mac-qr-login/demo.html)

|模块名称|图示|展示\&交互说明|
|---|---|---|
|**Mac－登录页（等待扫码）**|![等待扫码](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/02-mac-wait.png)|<span style="background-color: #FEF794;">1\. **触发条件：** 进入登录页并成功生成一次性 challenge。<br>2\. **页面展示：** 保留左侧扫码登录、右侧账号密码登录布局；扫码区展示一次性二维码及现有提示。<br>3\. **数据与计时：** Mac 创建 challenge 时写入设备名称、`cn/global` 产品地区和登录位置快照，进入 `waiting_scan` 并开始独立 2 分钟计时。<br>4\. **状态反馈：** 普通二维码或地区不一致不占用 challenge，Mac 继续处于 `waiting_scan`。<br>5\. **异常与恢复：** `waiting_scan` 超过 2 分钟进入 `expired`；不自动刷新，用户点击“刷新二维码”后生成新 challenge，旧 challenge 保持失效。 //2026.8.17修改</span>|
|**App－“我的”页（扫码入口）**|![扫码入口](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/03-app-profile.png)|1\. **触发条件：** 盖世账号已登录。<br>2\. **页面展示：** 右上角依次显示扫一扫、下载、设置；扫一扫位于下载左侧。<br>3\. **操作流程：** 点击扫一扫 → 校验相机权限 → 进入扫码页或权限处理。<br>4\. **状态反馈：** 未登录不显示扫一扫入口。<br>5\. **异常处理：** 登录态过期时按现有登录流程处理。|
|**App－相机权限申请与引导**|![相机权限](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/04-permission-guide.png)|1\. **触发条件：** 首次申请相机权限、用户拒绝或系统不再询问。<br>2\. **页面展示：** 首次由系统申请；不再询问时展示“去设置/取消”引导。<br>3\. **操作流程：** 去设置 → 打开系统设置；取消 → 返回“我的”页；完成授权后再次点击扫一扫进入扫码页。<br>4\. **状态反馈：** 首次拒绝后返回“我的”页，仅显示一次 Toast“摄像头权限未获取，请重新授权”。<br>5\. **异常处理：** 未获得权限时不进入扫码页。|
|**App－扫码页**|![扫码页](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/05-scanner.png)|<span style="background-color: #FEF794;">1\. **触发条件：** 相机权限可用并进入 `scanning`。<br>2\. **页面展示：** 保留取景区、扫描框和返回入口。<br>3\. **分流顺序：** 无法解析时停留扫码页并提示无法识别；可解析但不是盖世登录二维码时进入“扫描结果”页；是盖世登录二维码但地区不一致时进入地区不一致结果；首个有效且同地区的扫码才占用 challenge 并进入登录确认。<br>4\. **状态反馈：** 登录二维码过期、已使用或已被其他设备占用时，按对应登录异常处理，不作为普通内容展示。<br>5\. **异常与恢复：** 网络异常时提示“网络异常，请重试”并停留本页；主动返回时回“我的”页，Mac 在 `waiting_scan` 剩余有效期内继续等待。 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">**App－扫描结果** //2026.8.17修改</span>|![扫描结果](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/18-scan-result.png)|<span style="background-color: #FEF794;">1\. **触发条件：** 识别到可解析但非盖世登录二维码，进入 App 本地页态 `scan_result`。<br>2\. **页面展示：** 顶部左侧为关闭按钮，居中标题为“扫描结果”，下方正文区展示完整解析内容。<br>3\. **内容规则：** `http://` 或 `https://` 内容以可换行链接展示，仅用户主动点击后打开系统默认浏览器；其他内容按纯文本展示并保留换行；长内容超过一屏时正文区纵向滚动。<br>4\. **安全边界：** `javascript:`、`file:`、`data:` 和自定义 Scheme 只展示纯文本，不提供跳转；页面不自动打开任何链接。<br>5\. **关闭与恢复：** 关闭后结束本次扫一扫并返回“我的”页；不占用、不取消 Mac challenge，Mac 保持 `waiting_scan`。 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">**App－区服不一致** //2026.8.17修改</span>|![区服不一致](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/19-region-mismatch.png)|<span style="background-color: #FEF794;">1\. **触发条件：** 盖世登录二维码的 `cn/global` 产品地区与当前 App 不一致，进入 App 本地结果态 `region_mismatch`。<br>2\. **页面展示：** 复用“扫描结果”页，展示“当前 App 与 Mac 端地区版本不一致，无法登录，请使用同地区版本重新扫码。”<br>3\. **校验规则：** 仅比较 App 产品地区与 challenge 地区，不使用 IP、登录位置、手机号或邮箱判断。<br>4\. **状态反馈：** 不占用 challenge，不进入 `authorization_failed`，不生成平台账号会话；正确地区 App 在 `waiting_scan` 剩余有效期内仍可继续扫码。<br>5\. **关闭与恢复：** 关闭后返回“我的”页，Mac challenge 保持不变。 //2026.8.17修改</span>|
|**App－登录确认**|![登录确认](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/06-confirm-account-selection.png)|<span style="background-color: #FEF794;">1\. **触发条件：** 首个有效且同地区的 App 扫码原子占用成功，请求进入 `pending_confirm` 并重新开始独立 2 分钟确认计时。<br>2\. **设备与位置：** 弹窗保留“登录至MacOS设备”、安全提示和双按钮结构；App 只展示服务端返回的 Mac challenge 快照。设备名称为空时显示“Mac 设备”，超长时单行省略；国内版有市级位置时显示位置行，位置缺失时不显示；海外版始终不显示登录位置。<br>3\. **账号选择：** 盖世账号固定登录且不放入可取消列表；Steam、Epic 下每个具体账号为独立选项，默认全部选中，点击整行或选择控件可取消/恢复。账号容器最多可见 5 行，超过后容器内滚动；展示高度或已加载行数不得截断完整账号数据和本次授权范围。<br>4\. **摘要与提交：** 选中数大于 0 时显示“本次将登录 X 个平台账号”；选中 0 个时显示“本次仅登录盖世账号”，“确认登录”仍可用。点击后锁定列表和按钮，提交完整可用数量及本次选中集合；选择仅对当前 challenge 生效，不改变 App 内绑定、默认账号或排序。<br>5\. **异常与恢复：** 确认时复核账号、设备、session 和请求；状态变化时提示重新扫码；网络异常时停留弹窗并允许幂等重试；超时、确认与取消并发时，以服务端首次成功的原子状态变更为准。 //2026.8.17修改</span>|
|**Mac－扫码登录（等待确认）**|![等待确认](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/07-mac-pending-confirm.png)|<span style="background-color: #FEF794;">1\. **触发条件：** 首个有效且同地区的 App 扫码原子占用成功，请求进入 `pending_confirm`。<br>2\. **页面展示：** 二维码覆盖半透明遮罩，显示“二维码已识别”“请尽快在手机上确认”。<br>3\. **计时规则：** 进入 `pending_confirm` 时不继续沿用 `waiting_scan` 剩余时间，重新开始独立 2 分钟确认计时。<br>4\. **操作与状态：** App 确认后进入 `authorizing`，遮罩文案改为“正在同步账号”；App 取消后进入 `cancelled`。<br>5\. **异常与恢复：** `pending_confirm` 超过 2 分钟进入 `expired`；超时、确认和取消并发时以服务端首次原子状态变更为准，旧 request ID 回调不得覆盖新请求。 //2026.8.17修改</span>|
|**App－授权中与待领取**|![授权中](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/08-app-authorizing.png)<br><br>![待 Mac 领取](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/09-app-ready-to-claim.png)|<span style="background-color: #FEF794;">1\. **触发条件：** 点击“确认登录”后提交本次选中账号集合并进入 `authorizing`；盖世账号设备会话和选中平台凭证密文包就绪后进入 `ready_to_claim`。<br>2\. **页面展示：** 显示“正在登录 Mac 端”；`authorizing` 保持 15 秒上限，`ready_to_claim` 保持 30 秒领取与 ACK 上限。<br>3\. **操作流程：** 服务端签发盖世账号设备会话并仅中转平台凭证密文 → Mac 领取、解密并持久化 → Mac ACK → 服务端核销领取凭证并删除临时密文。<br>4\. **安全边界：** 选中平台凭证使用只有目标 Mac 可解密的端到端加密包，服务端不可解密，数据库、缓存、日志、埋点和错误报告不记录明文凭证。<br>5\. **异常与恢复：** 弱网时按同一 request ID 幂等查询，不创建新授权；授权、领取或 ACK 超时/失败后进入失败或回收，不留存可继续使用的临时凭证。 //2026.8.17修改</span>|
|**App－“我的”页（登录成功）**|![登录成功](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/10-app-success.png)|1\. **触发条件：** 服务端进入 `used`。<br>2\. **页面展示：** 返回“我的”页，不展示结果页、弹窗或平台列表。<br>3\. **操作流程：** Mac 完成持久化并 ACK → App 返回“我的”页。<br>4\. **状态反馈：** 每个请求仅显示一次 2 秒 Toast“Mac端登录成功”。<br>5\. **异常处理：** 按请求 ID 去重；重复轮询、ACK 或页面恢复不得重复提示。|
|**App－“我的”页（授权失败）**|![授权失败](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/11-app-auth-failed.png)|1\. **触发条件：** 服务端进入 `authorization_failed`。<br>2\. **页面展示：** 返回“我的”页，不展示结果页或弹窗。<br>3\. **操作流程：** 授权失败 → 返回“我的”页。<br>4\. **状态反馈：** 每个请求仅显示一次 2 秒 Toast“登录未完成，请重新扫码”。<br>5\. **异常处理：** 按请求 ID 去重；新二维码对应的新请求可再次提示。|
|**App－“我的”页（取消授权）**|![登录取消](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/12-app-cancelled.png)|1\. **触发条件：** 用户取消且服务端进入 `cancelled`。<br>2\. **页面展示：** 返回“我的”页，不展示结果页或弹窗。<br>3\. **操作流程：** 点击取消授权 → 服务端确认取消 → 返回“我的”页。<br>4\. **状态反馈：** 每个请求仅显示一次 2 秒 Toast“登录已取消，请重新扫码”。<br>5\. **异常处理：** 确认与取消并发时，以服务端首次原子状态变更为准。|
|**App－“我的”页（二维码过期）**|![二维码过期](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/13-app-expired.png)|<span style="background-color: #FEF794;">1\. **触发条件：** `waiting_scan` 自二维码生成起超过 2 分钟，或 `pending_confirm` 自有效同地区扫码占用成功起超过 2 分钟，服务端进入 `expired`。<br>2\. **页面展示：** 已进入确认页的 App 结束确认并返回“我的”页，不展示额外结果页或弹窗。<br>3\. **操作流程：** 请求过期 → App 返回“我的”页 → 用户扫描 Mac 手动刷新后的新二维码。<br>4\. **状态反馈：** 每个请求仅显示一次 2 秒 Toast“二维码已过期，请重新扫码”。<br>5\. **异常与恢复：** 旧 challenge/request ID 不可继续扫码、确认或覆盖新请求状态。 //2026.8.17修改</span>|
|**Mac－登录成功（返回业务页）**|![返回业务页](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/14-mac-return.png)|1\. **触发条件：** Mac 持久化会话并 ACK，服务端进入 `used`。<br>2\. **页面展示：** 关闭扫码登录界面，恢复经过校验的 `returnTo` 页面；无成功页、Toast 或弹窗。<br>3\. **操作流程：** 持久化会话 → ACK → 关闭登录界面 → 返回扫码前页面。<br>4\. **状态反馈：** 刷新登录态、用户信息和当前页面依赖数据。<br>5\. **异常处理：** `returnTo` 缺失、失效或无权限时进入默认登录后页面，不增加兜底弹窗。|
|**Mac－扫码登录（授权失败）**|![Mac 授权失败](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/15-mac-auth-failed.png)|1\. **触发条件：** 服务端进入 `authorization_failed`。<br>2\. **页面展示：** 标题保持“扫码登录”；二维码遮罩内显示“登录未完成”和唯一“刷新二维码”按钮；二维码容器不可点击、不可聚焦。<br>3\. **操作流程：** 点击、按 Enter 或按 Space 刷新 → 生成全新 challenge → 返回等待扫码。<br>4\. **状态反馈：** 旧请求保持失败终态，二维码外不重复显示结果或按钮。<br>5\. **异常处理：** 刷新失败时保留当前终态，并在二维码遮罩内提示重试。<br>|
|**Mac－扫码登录（登录取消）**|![Mac 登录取消](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/16-mac-cancelled.png)|1\. **触发条件：** 服务端进入 `cancelled`。<br>2\. **页面展示：** 标题保持“扫码登录”；二维码遮罩内显示“登录已取消”和唯一“刷新二维码”按钮；二维码容器不可点击、不可聚焦；二维码外不重复显示结果或按钮。<br>3\. **操作流程：** 点击、按 Enter 或按 Space 刷新 → 生成全新 challenge → 返回等待扫码。<br>4\. **状态反馈：** 旧 challenge 保持取消终态，不可复用。<br>5\. **异常处理：** 刷新失败时保留当前终态，并在二维码遮罩内提示重试。|
|**Mac－扫码登录（二维码过期）**|![Mac 二维码过期](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a1aa690333ce09972aa42c2611498a2e1cda613e/public/prd/mac-qr-login/17-mac-expired.png)|<span style="background-color: #FEF794;">1\. **触发条件：** `waiting_scan` 或 `pending_confirm` 当前阶段独立超过 2 分钟，服务端进入 `expired`。<br>2\. **页面展示：** 标题保持“扫码登录”；二维码遮罩内显示“二维码已过期”和唯一“刷新二维码”按钮；二维码容器不可点击、不可聚焦。<br>3\. **操作流程：** 点击、按 Enter 或按 Space 刷新 → 生成全新 challenge/request ID → 返回 `waiting_scan`。<br>4\. **状态反馈：** 保留手动刷新，不自动替换二维码；旧 challenge 保持过期终态，不可复用。<br>5\. **异常与恢复：** 刷新失败时保留当前终态并提示重试；刷新后的旧请求回调按 request ID 丢弃。 //2026.8.17修改</span>|

### 4\.3 服务端状态与关键规则

<span style="background-color: #FEF794;">App 本地页态为 `scanning`、`scan_result`、`region_mismatch`，不改变服务端 challenge 状态；服务端请求只使用下表状态枚举。 //2026.8.17修改</span>

|当前状态|触发与条件|下一状态|关键处理|
|---|---|---|---|
|<span style="background-color: #FEF794;">`waiting_scan` //2026.8.17修改</span>|<span style="background-color: #FEF794;">Mac 生成二维码后进入；首个有效且同地区 App 扫码才可原子占用 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`pending_confirm` 或 `expired` //2026.8.17修改</span>|<span style="background-color: #FEF794;">自二维码生成起独立计时 2 分钟；普通二维码、无法解析内容和地区不一致均不占用 challenge，正确地区 App 在剩余时间内仍可扫码 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">`pending_confirm` //2026.8.17修改</span>|<span style="background-color: #FEF794;">首个有效且同地区扫码占用成功；用户确认时账号、设备、session、确认 nonce 和请求状态均有效 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`authorizing`、`cancelled`、`expired` 或 `invalid` //2026.8.17修改</span>|<span style="background-color: #FEF794;">占用成功时重新开始独立 2 分钟确认计时；提交本次完整可用账号数量及选中账号集合，0 个平台账号时仍可确认并仅登录盖世账号 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">`authorizing` //2026.8.17修改</span>|<span style="background-color: #FEF794;">App 提交确认和本次选中账号集合 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`ready_to_claim` 或 `authorization_failed` //2026.8.17修改</span>|<span style="background-color: #FEF794;">上限 15 秒；服务端签发盖世账号设备会话，只中转本次选中平台凭证的端到端密文包，服务端不可解密 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">`ready_to_claim` //2026.8.17修改</span>|<span style="background-color: #FEF794;">盖世账号设备会话和选中平台凭证密文包就绪 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`used` 或 `authorization_failed` //2026.8.17修改</span>|<span style="background-color: #FEF794;">30 秒内对同一领取凭证幂等返回同一密文包；Mac 解密、保存并 ACK 后核销领取凭证并删除临时密文；领取或 ACK 失败时回收本次临时数据 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">`used` //2026.8.17修改</span>|<span style="background-color: #FEF794;">Mac 保存结果并 ACK 成功 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`used` //2026.8.17修改</span>|<span style="background-color: #FEF794;">终态；重复扫码、确认、领取或 ACK 均不重复签发、不重复返回密文包和结果提示 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">`authorization_failed` //2026.8.17修改</span>|<span style="background-color: #FEF794;">授权、密文生成、领取或必需会话处理失败 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`authorization_failed` //2026.8.17修改</span>|<span style="background-color: #FEF794;">终态；回收本次临时会话和密文，Mac 保留手动“刷新二维码”，刷新后新建 challenge //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">`expired` //2026.8.17修改</span>|<span style="background-color: #FEF794;">`waiting_scan` 或 `pending_confirm` 当前阶段超过各自 2 分钟上限 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`expired` //2026.8.17修改</span>|<span style="background-color: #FEF794;">终态；禁止继续扫码或确认，新二维码必须由 Mac 用户手动刷新生成 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">`cancelled` //2026.8.17修改</span>|<span style="background-color: #FEF794;">用户在 `pending_confirm` 取消且服务端原子变更成功 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`cancelled` //2026.8.17修改</span>|<span style="background-color: #FEF794;">终态；旧 challenge 立即失效，重复取消幂等返回同一结果 //2026.8.17修改</span>|
|<span style="background-color: #FEF794;">`invalid` //2026.8.17修改</span>|<span style="background-color: #FEF794;">账号、设备、session、签名、协议或页面生命周期等安全校验不满足要求 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`invalid` //2026.8.17修改</span>|<span style="background-color: #FEF794;">终态；禁止继续授权或领取，不把该结果当作普通二维码内容展示 //2026.8.17修改</span>|

关键约束：

- <span style="background-color: #FEF794;">二维码只包含 challenge 标识、签名、有效期和协议版本，不包含账号 Token、平台 Token、账号明细或领取凭证；设备名称、登录位置和产品地区快照由 Mac 创建 challenge 时提供给服务端，App 只展示服务端返回的快照。 //2026.8.17修改</span>

- <span style="background-color: #FEF794;">地区校验只使用 `cn/global` 产品地区字段，与登录位置无关；地区不一致不占用 challenge、不进入 `authorization_failed`、不生成平台账号会话。 //2026.8.17修改</span>

- <span style="background-color: #FEF794;">可选账号数据源为当前盖世账号下完整可用的 Steam、Epic 具体账号集合；默认全选，用户选择仅对当前 challenge 生效，可见 DOM、已加载行数和 5 行展示高度不得决定账号数据源或密文传输范围。 //2026.8.17修改</span>

- <span style="background-color: #FEF794;">盖世账号设备会话由服务端签发；选中平台凭证使用目标 Mac 可解密的端到端密文包中转，服务端只能中转密文，不得在数据库、缓存、日志、埋点或错误报告中记录明文凭证。加密算法、密钥交换和轮换由研发与安全评审确定。 //2026.8.17修改</span>

- <span style="background-color: #FEF794;">重复扫码、确认、取消、领取和 ACK 分别使用 challenge/request ID、确认 nonce、领取凭证和会话包摘要做幂等与防重放；超时竞态以服务端首次成功的原子状态变更为准，旧回调按 request ID 丢弃。 //2026.8.17修改</span>

- <span style="background-color: #FEF794;">登录记录可保留状态变化、失败阶段、领取、ACK、补偿和网络异常，但不记录设备完整名称、平台账号明细、选中账号集合或任何明文凭证。 //2026.8.17修改</span>

## 五、非功能需求

|类型|要求|验收方式|
|---|---|---|
|性能|二维码生成接口小于 500ms；客户端状态刷新 P95 不超过 3 秒；授权结果不超过 15 秒|压测并统计 P95|
|兼容性|Mac 支持 macOS 12 及以上；App 支持当前线上主版本及后续版本|覆盖最低版本和当前版本|
|安全|<span style="background-color: #FEF794;">设备绑定、一次性 challenge、确认 nonce、防重放和失败回收均生效；平台凭证端到端加密，服务端只中转密文且不可解密 //2026.8.17修改</span>|<span style="background-color: #FEF794;">执行重放、串号、越权、篡改密文、服务端解密和日志/抓包明文凭证检查 //2026.8.17修改</span>|
|弱网|扫码、确认、授权查询、领取和 ACK 可按同一请求幂等重试|分别模拟断网、超时和响应丢失|
|隐私|<span style="background-color: #FEF794;">国内版仅在 Mac challenge 位置快照存在时展示市级粗定位，缺失时不显示位置行；海外版不展示登录位置；不展示第三方 ID、Token 或密码，设备完整名称不进入埋点 //2026.8.17修改</span>|<span style="background-color: #FEF794;">分别检查国内位置有值/无值、海外版本、页面、日志、埋点和错误报告 //2026.8.17修改</span>|
|降级|扫码登录可关闭，账号密码登录保持可用|执行普通回滚与安全紧急回滚|

## 六、埋点

<span style="background-color: #FEF794;">公共参数沿用现有设备、版本、区服和网络字段；`qr_id`、`uid` 等敏感标识按现有数据规范脱敏和控权。本需求的平台账号选择只上报可用数量和选中数量，不上报账号昵称、第三方账号 ID、选中账号明细、完整设备名称或平台凭证。 //2026.8.17修改</span>

### 6\.1 埋点事件表

|事件ID|事件名称|触发时机|关键参数|
|---|---|---|---|
|`mac_qr_login_page_view`|Mac扫码登录页曝光|Mac 端进入扫码登录页|`device_id`, `app_version`|
|`mac_qr_code_show`|二维码展示|二维码生成成功|`qr_id`, `expire_seconds`|
|`mobile_scan_button_click`|移动端扫码按钮点击|用户点击“我的”页右上角扫码按钮|`uid`, `app_version`|
|<span style="background-color: #FEF794;">`mobile_qr_scan_result_show` //2026.8.17修改</span>|<span style="background-color: #FEF794;">普通二维码结果页曝光 //2026.8.17修改</span>|<span style="background-color: #FEF794;">识别到可解析但非盖世登录二维码并成功展示“扫描结果”页时 //2026.8.17修改</span>|`scanned_content_type`|
|<span style="background-color: #FEF794;">`mobile_qr_region_mismatch` //2026.8.17修改</span>|<span style="background-color: #FEF794;">扫码地区不一致 //2026.8.17修改</span>|<span style="background-color: #FEF794;">盖世登录二维码的产品地区与 App 产品地区不一致并展示地区不一致结果时 //2026.8.17修改</span>|`source_region`, `target_region`|
|`mobile_qr_scan_success`|首次有效扫码成功|<span style="background-color: #FEF794;">首个有效且同地区 App 扫码使二维码由 `waiting_scan` 原子进入 `pending_confirm` 时 //2026.8.17修改</span>|`qr_id`, `uid`, `mobile_device_id`, `qr_state`|
|`mobile_qr_scan_conflict`|二维码扫码冲突|非首次扫码设备扫描待确认二维码|`qr_id`, `uid`, `conflict_reason`|
|<span style="background-color: #FEF794;">`mobile_qr_account_selection_change` //2026.8.17修改</span>|<span style="background-color: #FEF794;">本次平台账号选择变化 //2026.8.17修改</span>|<span style="background-color: #FEF794;">用户选中或取消任一具体平台账号且界面选择结果已更新时；每次变更记录一次 //2026.8.17修改</span>|`available_platform_account_count`, `selected_platform_account_count`|
|`mobile_qr_login_confirm`|移动端确认登录|<span style="background-color: #FEF794;">用户点击“确认登录”并提交本次选中账号数量时 //2026.8.17修改</span>|`qr_id`, `uid`, `mobile_device_id`, `session_valid`, `qr_state`, `available_platform_account_count`, `selected_platform_account_count`|
|`mobile_qr_login_cancel`|移动端取消确认|用户点击“取消授权”|`qr_id`, `uid`, `device_id`|
|`mobile_qr_confirm_rejected`|确认校验未通过|确认时账号、登录态、设备、session 或二维码状态不满足要求|`qr_id`, `uid`, `fail_reason`, `qr_state`|
|`mac_qr_login_success`|Mac扫码登录成功|Mac 端完成登录|`qr_id`, `uid`, `has_steam_bind`, `has_epic_bind`|
|`mac_qr_login_fail`|Mac扫码登录失败|二维码过期、无效、网络失败等|`qr_id`, `fail_reason`|
|`mac_qr_result_retry`|Mac登录结果重试|Mac 接收或拉取结果失败后重试|`qr_id`, `network_stage`, `retry_count`|
|`qr_login_state_change`|二维码状态变化|二维码状态发生流转|`qr_id`, `from_state`, `to_state`, `state_reason`|
|`mobile_confirm_platform_status_show`|平台绑定状态展示|移动端扫码确认页展示 Steam/Epic 状态|`uid`, `platform`, `bind_status`|

### 6\.2 埋点参数表

|参数名|类型|必填|说明|枚举/示例|
|---|---|---|---|---|
|`qr_id`|string|是|二维码唯一标识|QR\_202607150001|
|`uid`|string|否|盖世账号 UID|100001|
|`device_id`|string|否|Mac 端设备标识|MAC\_001|
|`app_version`|string|否|<span style="background-color: #FEF794;">产生事件的 Mac 或 App 版本号 //2026.8.17修改</span>|<span style="background-color: #FEF794;">6\.1\.2 //2026.8.17修改</span>|
|`expire_seconds`|integer|否|<span style="background-color: #FEF794;">当前生成二维码的 `waiting_scan` 阶段有效秒数 //2026.8.17修改</span>|<span style="background-color: #FEF794;">120 //2026.8.17修改</span>|
|`mobile_device_id`|string|否|移动端设备标识|MOBILE\_001|
|`qr_state`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">服务端 challenge 当前状态，不记录 App 本地页态 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`waiting_scan`：等待扫码；`pending_confirm`：等待 App 确认；`authorizing`：正在授权；`ready_to_claim`：密文包待 Mac 领取；`used`：Mac 已保存并 ACK；`authorization_failed`：授权或领取失败；`expired`：当前阶段超时；`cancelled`：用户取消；`invalid`：校验不通过 //2026.8.17修改</span>|
|`from_state`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">状态流转前的服务端 challenge 状态，取值同 `qr_state` //2026.8.17修改</span>|<span style="background-color: #FEF794;">`waiting_scan`：示例，含义同 `qr_state` //2026.8.17修改</span>|
|`to_state`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">状态流转后的服务端 challenge 状态，取值同 `qr_state` //2026.8.17修改</span>|<span style="background-color: #FEF794;">`pending_confirm`：示例，含义同 `qr_state` //2026.8.17修改</span>|
|`state_reason`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">本次状态流转的业务原因 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`first_scan`：首个有效同地区扫码；`user_confirm`：用户确认；`user_cancel`：用户取消；`timeout`：当前阶段超时；`authorization_complete`：授权与密文就绪；`claim_complete`：Mac 领取并 ACK；`validation_fail`：安全校验失败；`authorization_fail`：授权或领取失败 //2026.8.17修改</span>|
|`fail_reason`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">登录失败或确认被拒绝的原因 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`expired`：当前阶段超时；`invalid`：请求校验无效；`account_changed`：盖世账号状态变化；`session_invalid`：App 登录 session 无效；`network_error`：网络失败；`encryption_failed`：密文包生成失败；`claim_timeout`：Mac 领取或 ACK 超时 //2026.8.17修改</span>|
|`conflict_reason`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">扫码冲突原因 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`already_scanned`：challenge 已被其他移动设备原子占用 //2026.8.17修改</span>|
|`network_stage`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">网络异常所在阶段 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`scan_validate`：扫码校验；`confirm_submit`：确认提交；`mac_result_sync`：Mac 领取、保存或 ACK //2026.8.17修改</span>|
|`retry_count`|integer|否|当前阶段重试次数|1|
|`session_valid`|boolean|否|确认时移动端登录 session 是否有效|true|
|`platform`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|第三方平台|<span style="background-color: #FEF794;">`steam`：Steam 平台；`epic`：Epic 平台 //2026.8.17修改</span>|
|`bind_status`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|绑定状态|<span style="background-color: #FEF794;">`bound`：已绑定；`unbound`：未绑定 //2026.8.17修改</span>|
|`has_steam_bind`|boolean|否|是否有 Steam 绑定|true/false|
|`has_epic_bind`|boolean|否|是否有 Epic 绑定|true/false|
|`scanned_content_type`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">非盖世登录二维码的结果内容类型，不上报原始内容 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`http_url`：HTTP/HTTPS 链接；`plain_text`：普通纯文本；`blocked_scheme`：只展示且不可点击的非白名单 Scheme //2026.8.17修改</span>|
|`source_region`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">执行扫码的 App 产品地区 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`cn`：国内版；`global`：海外版 //2026.8.17修改</span>|
|`target_region`|<span style="background-color: #FEF794;">enum&lt;string&gt; //2026.8.17修改</span>|否|<span style="background-color: #FEF794;">Mac challenge 的产品地区 //2026.8.17修改</span>|<span style="background-color: #FEF794;">`cn`：国内版；`global`：海外版 //2026.8.17修改</span>|
|`available_platform_account_count`|integer|否|<span style="background-color: #FEF794;">当前 challenge 可供用户选择的平台账号总数，基于完整数据源计算，不受 5 行展示高度影响 //2026.8.17修改</span>|<span style="background-color: #FEF794;">7 //2026.8.17修改</span>|
|`selected_platform_account_count`|integer|否|<span style="background-color: #FEF794;">当前 challenge 本次选中的平台账号数量，可为 0，不上报选中账号明细 //2026.8.17修改</span>|<span style="background-color: #FEF794;">5 //2026.8.17修改</span>|
