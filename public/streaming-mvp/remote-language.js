/* Presentation-only localization. Never rewrites account state, action IDs or input values. */
(()=>{
 const key='gamehub-remote-demo-language',originals=new WeakMap(),attributes=new WeakMap();
 const dictionary=Object.fromEntries(`
盖世远程|GameHub Remote
盖世游戏|GameHub
盖世游戏 App|GameHub App
盖世游戏 Logo|GameHub logo
我的设备|My devices
我的|Me
登录|Log in
登录并继续|Log in and continue
确认登录|Confirm login
取消登录|Cancel login
退出登录|Log out
退出登录？|Log out?
退出后需重新登录才能访问你的设备。|You will need to log in again to access your devices.
请先勾选协议|Please accept the agreements first
手机号验证码登录|Log in with phone number
邮箱验证码登录|Log in with email
盖世游戏 App 扫码登录|Scan with GameHub App
手机号|Phone number
邮箱|Email
验证码|Verification code
邮箱验证码|Email verification code
输入手机号|Enter phone number
请输入手机号|Enter phone number
输入邮箱地址|Enter email address
请输入邮箱|Enter email address
输入验证码|Enter verification code
请输入验证码|Enter verification code
获取验证码|Get code
重新获取|Resend code
验证码已发送（演示）|Verification code sent (demo)
验证码已发送。|Verification code sent.
请输入正确的手机号|Enter a valid phone number
请输入正确的手机号。|Enter a valid phone number.
请输入正确的邮箱地址|Enter a valid email address
请输入正确的邮箱。|Enter a valid email address.
请先获取验证码|Get a verification code first
请先获取验证码。|Get a verification code first.
验证码不正确，请重试|Incorrect code. Try again.
验证码错误，请重新输入。|Incorrect code. Enter it again.
其他登录方式|Other login methods
Google 登录|Log in with Google
盖世游戏 App 登录|Log in with GameHub App
同意登录协议|Accept login agreements
我已阅读并同意|I have read and accept
《用户协议》|Terms of Service
《隐私协议》|Privacy Policy
《中国移动认证服务协议》|China Mobile Authentication Agreement
用户协议|Terms of Service
隐私协议|Privacy Policy
中国移动认证服务协议|China Mobile Authentication Agreement
协议内容待接入|Agreement content is not available in this demo
正式协议待接入|Agreement content is not available in this demo
当前 Demo 尚未接入正式协议正文与地址。|Official agreement content and links are not connected in this demo.
此处仅预览协议入口。正式 URL、协议正文及适用主体尚未提供，Demo 不展示或编造条款。|This demo previews agreement links only. Official URLs, terms and legal entities have not been provided.
关闭协议|Close agreement
关闭协议预览|Close agreement preview
返回登录|Back to login
等待 Google 授权确认|Waiting for Google authorization
Google 登录未完成，请重试|Google login was not completed. Try again.
Google 登录已取消|Google login cancelled
未安装盖世游戏 App，请使用其他方式登录。|GameHub App is not installed. Use another login method.
已取消登录，可重新选择登录方式。|Login cancelled. Choose a login method to continue.
登录未完成，请重试或使用其他方式。|Login was not completed. Try again or use another method.
本次登录已超时，请重新发起。|Login timed out. Start again.
登录盖世远程|Log in to GameHub Remote
登录盖世游戏|Log in to GameHub
登录后继续授权盖世远程|Log in to authorize GameHub Remote
使用当前盖世游戏账号继续|Continue with your current GameHub account
使用当前Google账号继续|Continue with your current Google account
确认后，盖世远程将使用此盖世账号登录。|Confirm to log in to GameHub Remote with this GameHub account.
正在登录…|Logging in…
已扫码，请在手机确认|Scanned. Confirm on your phone.
二维码已过期|QR code expired
登录已取消|Login cancelled
登录未完成|Login was not completed
本次登录已完成|Login completed
刷新二维码|Refresh QR code
刷新二维码后可重新扫码|Refresh the QR code to scan again
取消本次登录|Cancel this login
使用|Use
扫一扫|Scan QR code
电脑端登录二维码|Desktop login QR code
盖世游戏 App 官网下载|Download GameHub App
远程自己的电脑|Access your own computer
两端安装并登录同一盖世账号|Install on both devices and use the same account
在两端安装盖世远程，并使用同一个盖世账号登录。|Install GameHub Remote on both devices and log in with the same GameHub account.
电脑开启远程控制并完成权限|Enable remote access and grant permissions
在电脑「设置」中开启允许远程控制；Mac 需允许屏幕录制和辅助功能。|Enable remote access in desktop Settings. On Mac, allow Screen Recording and Accessibility.
在另一台设备选择你的电脑|Select your computer on the other device
在主控端「我的设备」中选择你的电脑，主动发起连接。|Select your computer in My devices on the controlling device and connect.
知道了|Got it
跳过|Skip
关闭新手引导|Close introduction
添加你的电脑|Add your computer
在要访问的电脑上安装盖世远程，登录同一个盖世账号。|Install GameHub Remote on the computer you want to access and log in with the same GameHub account.
手机连接电脑|Connect from a phone
电脑连接电脑|Connect from a computer
手机安装独立的盖世远程 App。|Install GameHub Remote on your phone.
使用已有盖世账号登录，也可拉起盖世游戏 App 授权。|Log in with your GameHub account or authorize through GameHub App.
在「我的设备」选择要连接的电脑。|Select the computer to connect to in My devices.
另一台电脑安装盖世远程客户端。|Install GameHub Remote on the other computer.
登录同一盖世账号，或使用盖世游戏 App 扫码登录。|Log in with the same GameHub account, or scan with GameHub App.
在「我的设备」选择电脑并进入桌面。|Select your computer in My devices and open its desktop.
被控电脑需开启「允许同账号控制本设备」，Mac 还需允许屏幕录制和辅助功能；一期沿用局域网范围。|Enable access from the same account on the host computer. Mac also needs Screen Recording and Accessibility. This MVP requires the same local network.
关闭引导|Close guide
连接教程|Connection guide
帮助中心|Help center
帮助详情|Help article
关于|About
关于盖世远程|About GameHub Remote
账户|Account
个人账号|Account
账户头像|Account avatar
更多|More
更多菜单|More menu
设置|Settings
主导航|Main navigation
检查更新|Check for updates
正在检查…|Checking…
当前版本：MVP 演示版|Current version: MVP demo
有新的版本发布|A new version is available
盖世远程 · MVP 更新演示版|GameHub Remote · MVP update demo
本次更新|What's new
优化账户与检查更新入口。|Improved account and update controls.
支持手机和电脑端查看更新通知。|Update notifications on mobile and desktop.
完善 Mac 登录方式与登录后指引。|Improved Mac login and post-login guidance.
正在演示更新…|Simulating update…
下载并重启更新|Download and restart
稍后再说|Later
已是最新版本|You're up to date
更新演示完成|Update demo complete
个人信息收集清单|Personal data collection list
第三方信息共享清单|Third-party data sharing list
正式内容与地址待接入，当前 Demo 仅展示入口。|Official content and URLs are not connected. This demo shows the links only.
搜索问题|Search questions
搜索问题或关键词|Search questions or keywords
常见问题|Frequently asked questions
返回帮助中心|Back to help center
未找到这篇帮助，请返回帮助中心。|Article not found. Return to the help center.
没有找到相关问题|No matching questions
试试「登录」「扫码」「设备」等关键词。|Try keywords such as login, QR code or devices.
设备与连接|Devices and connections
账号与登录|Account and login
权限与安全|Permissions and security
远程操作|Remote controls
如何添加自己的电脑？|How do I add my computer?
为什么设备列表里看不到电脑？|Why is my computer missing from the device list?
电脑离线时如何处理？|What if my computer is offline?
如何使用扫一扫登录电脑端？|How do I scan to log in on desktop?
Mac 需要开启哪些权限？|Which permissions does Mac need?
仅观看和远程控制有什么区别？|What is the difference between view-only and remote control?
如何传输文件？|How do I transfer files?
手机号、邮箱和 Google 登录如何选择？|Which login method should I use?
退出登录后会怎样？|What happens when I log out?
在要访问的电脑上安装并打开盖世远程客户端。|Install and open GameHub Remote on the computer you want to access.
手机和电脑登录同一盖世账号，并连接同一局域网。|Log in with the same GameHub account on both devices and connect them to the same local network.
电脑端开启「允许同账号控制本设备」；Mac 还需授予屏幕录制和辅助功能权限。|Enable access from the same account on desktop. Mac also requires Screen Recording and Accessibility.
回到手机「我的设备」选择电脑，再主动发起连接。登录成功不会自动连接电脑。|Select your computer in My devices on your phone and connect. Logging in does not connect automatically.
先确认两端登录的是同一盖世账号。|Check that both devices use the same GameHub account.
确认电脑已经开机、联网，盖世远程客户端正在运行。|Check that your computer is on, online and running GameHub Remote.
一期连接沿用同一局域网范围；检查两端网络后返回设备列表刷新。|This MVP requires the same local network. Check both networks, then refresh the device list.
确认电脑电源和网络连接正常。|Check your computer's power and network connection.
远程开机仅适用于满足现有 Demo 条件且已配置的设备，不保证所有电脑都可被唤醒。|Wake-on-LAN requires a supported, configured device. Not all computers can be woken remotely.
电脑恢复在线后，再从设备详情发起连接。|Once your computer is online, connect from its details page.
电脑端登录页默认显示二维码，未勾选协议也可以扫码进入确认。|The desktop login page shows a QR code. You can scan it before accepting the agreements.
手机先登录盖世远程，在「我的」右上角进入「扫一扫」。|Log in on your phone, then open Scan QR code at the top right of Me.
扫描二维码后核对当前盖世账号和电脑登录提示，确认是本人操作再点击「确认登录」；电脑端未勾选协议时提示「请先勾选协议」，勾选后才可完成登录。|After scanning, verify the account and desktop login request, then confirm. If the desktop agreements are unchecked, accept them before completing login.
取消、过期或已使用的二维码需要在电脑端刷新。Demo 仅模拟授权，真实跨设备登录仍需账号服务。|Refresh cancelled, expired or used codes on desktop. Authorization is simulated; real cross-device login requires an account service.
在电脑端左侧「设置」开启允许同账号控制。|In desktop Settings, allow access from devices using the same account.
根据系统提示，在「隐私与安全性」中允许屏幕录制和辅助功能。|In system Privacy & Security, allow Screen Recording and Accessibility.
返回客户端确认权限状态后，再从另一端发起连接。网页 Demo 不会修改系统权限。|Return to the client to check permissions, then connect from the other device. This web demo cannot change system permissions.
仅观看用于查看电脑画面，不发送鼠标、键盘等输入。|View-only displays the computer screen without sending mouse or keyboard input.
需要操作时，按照已有会话入口切换到控制状态。|Switch to control mode in the session when you need to interact.
退出远控只结束本次连接，电脑上的程序继续运行。|Disconnecting ends the connection only. Programs on the computer keep running.
在现有设备详情或会话工具中打开文件传输。|Open file transfer from device details or session tools.
按页面提示选择文件与传输方向，查看任务状态。|Choose files and a transfer direction, then view task progress.
Demo 中的文件任务用于交互演示，不会把真实文件发送到远程电脑。|File tasks in this demo are simulated. No real files are sent to a remote computer.
国内使用手机号验证码，海外使用邮箱验证码或 Google 登录；电脑端还支持扫码登录。|The China region uses phone codes. The international region uses email codes or Google. Desktop also supports QR login.
移动端可拉起盖世游戏 App 完成盖世账号授权。|Mobile can open GameHub App to authorize your account.
登录前需主动阅读并同意适用协议。当前 Demo 的短信、邮件、Google 和跨 App 授权均为模拟。|Read and accept the applicable agreements before logging in. SMS, email, Google and cross-app authorization are simulated.
退出当前盖世远程客户端账号，回到未登录页面。|Log out of this GameHub Remote client and return to login.
当前会话相关的设备数据、草稿和文件任务会清理；再次登录后重新加载。|Session device data, drafts and file tasks are cleared. Data reloads after you log in again.
退出登录不等于注销盖世账号，也不会关闭电脑中正在运行的程序。|Logging out does not delete your GameHub account or close programs on your computer.
关闭扫一扫|Close scanner
登录电脑端盖世远程|Log in to GameHub Remote on desktop
请确认这是你本人发起的电脑登录|Confirm that you initiated this desktop login
当前盖世账号|Current GameHub account
确认仅用于登录，不会自动连接或控制电脑。|Confirmation logs you in only. It does not connect to or control the computer.
已确认本次登录|Login confirmed
请返回电脑查看登录结果|Return to your computer to view the login result
本次为演示授权，真实跨设备登录待接入账号服务。|This authorization is simulated. Real cross-device login requires an account service.
扫描电脑端盖世远程登录二维码|Scan the GameHub Remote desktop login QR code
将电脑登录二维码放入框内|Place the desktop login QR code inside the frame
扫码摄像头预览|Scanner camera preview
重新扫一扫|Scan again
开启摄像头|Turn on camera
关闭摄像头|Turn off camera
摄像头需你授权；二维码仅在本地识别，不上传画面。|Camera permission is required. QR codes are decoded locally; camera frames are not uploaded.
请扫描盖世远程电脑端的登录二维码。|Scan a GameHub Remote desktop login QR code.
登录地区不同，请在两端选择同一地区后重新扫码。|Regions do not match. Select the same region on both devices and scan again.
此码无法在当前演示中校验。真实跨设备扫码需要接入账号服务，可用页面外的模拟入口体验流程。|This code cannot be verified in this demo. Real cross-device login requires an account service. Use the demo controls to try the flow.
二维码已失效，请在电脑端刷新后重新扫描。|This QR code is no longer valid. Refresh it on desktop and scan again.
当前浏览器无法调用摄像头，请使用支持摄像头权限的 HTTPS 浏览器。|The camera is unavailable. Use an HTTPS browser that supports camera access.
未获得摄像头权限，请在浏览器中允许后重试。|Camera permission was denied. Allow it in your browser and try again.
全部设备|All devices
在线|Online
离线|Offline
被控中|In use
允许连接|Connections allowed
不允许被控|Remote access disabled
设备列表|Device list
设备详情|Device details
设备菜单|Device menu
设备属性|Device properties
设备名称|Device name
刷新|Refresh
重命名|Rename
删除设备|Remove device
快速启动|Quick launch
进入桌面|Open desktop
远程控制|Remote control
文件传输|File transfer
远程开机|Wake computer
远程重启|Restart computer
远程关机|Shut down computer
该设备不允许被控|Remote access is disabled
请在该设备的「设置」中开启允许远程控制。|Enable remote access in this device's Settings.
断开所有远控|Disconnect all sessions
当前有 1 台设备远程控制|One device is currently controlling this computer
收起|Collapse
展开|Expand
断开|Disconnect
本账号设备|Device on this account
仅观看|View only
返回|Back
取消|Cancel
关闭|Close
完成|Done
保存|Save
确认|Confirm
删除|Delete
重试|Retry
加载中…|Loading…
正在加载…|Loading…
加载失败|Loading failed
正在连接|Connecting
连接失败|Connection failed
未能建立连接，请检查电脑网络与远程控制权限。|Could not connect. Check your computer's network and remote-access permissions.
会话已结束|Session ended
与电脑的连接已结束|Disconnected from the computer
电脑上的程序继续运行。|Programs on the computer keep running.
电脑上的程序保持运行。|Programs on the computer keep running.
返回设备详情|Back to device details
这些设置只作用于这台 Mac|These settings apply to this Mac only
允许同账号控制本设备|Allow access from devices on the same account
开启后，同账号设备才可申请连接本机；还需完成以下系统权限。|Devices on the same account can request access once enabled. The system permissions below are also required.
屏幕录制|Screen Recording
辅助功能|Accessibility
已允许|Allowed
未允许|Not allowed
去系统设置|Open system settings
本机当前不接受远程控制。|Remote access to this computer is disabled.
系统权限未完成，本机暂不能被正常控制。|Required system permissions are missing. Remote control is not ready.
本机已具备被控条件，其他设备仍需主动发起连接。|This computer is ready for remote access. Connect from another device to begin.
运行与文件|Startup and files
开机自动启动|Launch at startup
允许通过远程开机启动|Allow Wake-on-LAN
防止电脑休眠|Prevent computer sleep
移动设备传输文件存储路径|Save files received from mobile devices to
选择存储文件夹|Choose save folder
开|On
关|Off
关闭窗口时|When closing the window
隐藏至菜单栏|Hide to menu bar
退出主程序|Quit application
前往系统设置|Open system settings
返回设置|Back to settings
系统权限|System permissions
主窗口已最小化，主程序继续运行。|The main window is minimized. The app is still running.
主窗口已隐藏至菜单栏，主程序继续运行。|The main window is hidden in the menu bar. The app is still running.
主程序已退出。|The app has quit.
重新打开应用|Reopen app
从 Dock 恢复|Restore from Dock
从菜单栏恢复|Restore from menu bar
此处模拟系统入口，不会关闭真实浏览器窗口。|These system controls are simulated and do not close the browser window.
最小化主窗口|Minimize main window
关闭主窗口|Close main window
退出远控|Disconnect
旋转屏幕|Rotate screen
声音|Sound
静音|Mute
恢复控制|Resume control
开启虚拟按键|Enable virtual keys
切换虚拟按键布局|Change virtual key layout
操作|Controls
操作方式|Input mode
屏幕触控|Direct touch
鼠标指针|Mouse pointer
平板触控|Tablet touch
显示|Display
安全|Security
键盘与快捷键|Keyboard and shortcuts
虚拟手柄映射|Virtual controller mapping
映射方案|Mapping profile
默认方案|Default profile
所有窗口|All windows
长文本|Long text
显示桌面|Show desktop
键盘|Keyboard
电脑声音|Computer audio
按键映射|Key mapping
启用按键映射|Enable key mapping
当前布局|Current layout
默认布局|Default layout
收起面板|Close panel
返回操作|Back to controls
返回显示|Back to display
帧率|Frame rate
画质|Image quality
自动|Auto
清晰 2M|Standard 2 Mbps
高清 8M|HD 8 Mbps
原画 20M|Original 20 Mbps
自定义|Custom
流量会随实际画面与网络变化|Data use varies with screen content and network conditions
显示屏 1|Display 1
虚拟屏 1|Virtual display 1
超级屏|Super display
虚拟屏幕|Virtual display
物理屏幕|Physical display
分辨率|Resolution
缩放|Scale
屏幕方向|Orientation
横向|Landscape
纵向|Portrait
切回物理显示屏|Switch to physical display
切换使用超级屏|Switch to super display
控制中心|Control center
全屏|Full screen
退出全屏|Exit full screen
最小化|Minimize
添加虚拟屏|Add virtual display
关闭虚拟屏|Close virtual display
关闭声音|Close audio settings
仅观看 · 不发送操作|View only · Input is not sent
发送文件|Send files
接收文件|Receive files
传输记录|Transfer history
本地文件|Local files
远程文件|Remote files
本机|This device
远程电脑|Remote computer
上传|Upload
下载|Download
新建文件夹|New folder
打开|Open
复制|Copy
粘贴|Paste
剪切|Cut
全选|Select all
取消全选|Deselect all
发送|Send
暂停|Pause
继续|Resume
重新传输|Retry transfer
传输中|Transferring
等待中|Waiting
已完成|Completed
已取消|Cancelled
传输失败|Transfer failed
文件大小|File size
修改时间|Modified
名称|Name
类型|Type
大小|Size
路径|Path
返回上级|Parent folder
清空记录|Clear history
更新结果模拟|Simulated update result
有新版本|Update available
已是最新|Up to date
更新服务未接入；下载和重启仅演示，不会下载软件或重启设备。|No update service is connected. Download and restart are simulated only.
交互评审 Demo|Interactive demo
电脑端|Desktop
地区预览|Region preview
国内|China
海外|International
预览页面与异常|Preview pages and exceptions
未登录首页|Login home
登录页|Login page
扫码待确认|QR confirmation pending
二维码过期|QR code expired
无设备|No devices
设备禁控|Remote access disabled
远控窗口|Remote session
重看首次引导|Replay introduction
登录链路模拟|Login simulation
填入示例号码／邮箱|Fill example phone / email
模拟盖世 App 扫码|Simulate GameHub App scan
模拟手机确认|Simulate phone confirmation
模拟手机取消|Simulate phone cancellation
模拟客户端取得会话|Simulate session retrieval
模拟二维码过期|Simulate QR expiration
模拟扫码授权失败|Simulate QR authorization failure
模拟 Google 授权成功|Simulate Google authorization success
模拟 Google 授权失败|Simulate Google authorization failure
模拟已授权|Simulate permission granted
模拟拒绝|Simulate permission denied
模拟扫描电脑登录码|Simulate scanning desktop login code
系统权限结果模拟：|Simulated system permission result:
演示验证码：任意6位数字。未调用短信、邮箱或 Google 接口；无需输入真实资料。|Demo code: any 6 digits. SMS, email and Google services are not connected. Do not enter real personal data.
未接真实登录、扫码、系统权限及远控接口。二维码可供本地 Demo 扫描；真实跨设备授权待接入账号服务。|Login, QR authorization, system permissions and remote access are simulated. QR codes work between local demo pages; real cross-device authorization requires an account service.
扫码流程演示 · 真实异机登录待接账号服务|QR login demo · Real cross-device login requires an account service
`.trim().split('\n').map(line=>line.split('|')));
 Object.assign(dictionary,Object.fromEntries(`
我的 Mac|My Mac
远端|Remote
修改日期|Modified
文件|File
磁盘|Disk
文件夹|Folder
发送 →|Send →
← 发送|← Send
返回上一页|Back
演示文件|Demo files
该设备暂不支持文件传输。|File transfer is unavailable for this device.
设备已离线，暂时无法传输文件。|This device is offline. File transfer is unavailable.
传输列表|Transfers
全部开始|Start all
全部暂停|Pause all
全部取消|Cancel all
清除完成任务|Clear completed tasks
状态|Status
发送路径|Source path
接收路径|Destination path
暂无传输任务 · 选择文件后点击发送|No transfers yet · Select files and click Send
请先打开远端目标文件夹，再发送本机文件。|Open a destination folder on the remote computer before sending files.
已暂停|Paused
已跳过|Skipped
等待设备上线|Waiting for device to come online
等待处理同名文件|Waiting to resolve file conflict
保留两者|Keep both
选择本机全部项目|Select all local items
选择远端全部项目|Select all remote items
主窗口操作|Main window controls
批量管理|Manage transfers
等待继续传输|Waiting to resume
继续传输|Resume transfer
暂停传输|Pause transfer
已发送|Sent
已接收|Received
设备已移除，无法传输文件。|This device was removed. File transfer is unavailable.
设备已离线，等待设备上线后手动继续。|This device is offline. Resume the transfer when it comes online.
该设备暂不允许文件传输。|File transfer is not allowed on this device.
连接中断，请重新传输。|Connection lost. Retry the transfer.
设备已恢复上线，请点击继续传输。|The device is back online. Click Resume transfer.
电脑文件|Computer files
选择照片与视频|Select photos and videos
选择文件|Select files
选择要下载的演示文件或文件夹|Select demo files or folders to download
选择要发送的演示文件或文件夹|Select demo files or folders to send
选择要发送的演示照片或视频|Select demo photos or videos to send
文件已存在|File already exists
仅清空已接收的传输记录，不删除已保存的文件。|Clear received transfer records only. Saved files will not be deleted.
仅清空已发送的传输记录，不删除已保存的文件。|Clear sent transfer records only. Saved files will not be deleted.
管理当前设备的传输任务。|Manage transfer tasks for this device.
暂停全部|Pause all
继续全部|Resume all
取消全部|Cancel all
设备已切换，请重新选择文件。|The selected device changed. Select the files again.
连接中…|Connecting…
未连接|Not connected
连接良好|Good connection
连接不稳定|Unstable connection
网络较弱|Weak network
连接已恢复|Connection restored
网络延时|Network latency
帧延时|Frame latency
带宽占用|Bandwidth usage
丢包率|Packet loss
连接方式|Connection type
当前画质|Current quality
编解码器|Codec
硬编 / 硬解|Hardware encode / decode
编码格式|Encoding format
连接时间与信号详情|Connection duration and signal details
信号详情|Signal details
演示数据|Demo data
网络已恢复，连接稳定。|Network restored. The connection is stable.
当前网络较弱，画面可能卡顿，建议降低画质。|The network is weak and video may stutter. Try lowering image quality.
连接不稳定，可能出现延迟或画面卡顿。|The connection is unstable. You may experience delay or video stutter.
恢复原画质|Restore previous quality
降低画质|Lower quality
查看信号|View signal details
关闭网络提示|Dismiss network message
流畅 2M|Smooth 2 Mbps
下拉刷新|Pull to refresh
添加你的其他电脑|Add your other computers
电脑安装盖世远程，登录同一盖世账号。|Install GameHub Remote on your computer and use the same GameHub account.
如何添加设备|How to add a device
关闭添加电脑提示|Dismiss add-computer tip
观看模式|View mode
添加应用|Add app
发送照片 & 视频|Send photos & videos
从电脑下载文件到手机|Download files from computer to phone
电脑文件保存位置|Computer save location
远程开机支持 Wake On LAN|Wake-on-LAN support
开启后，本机可辅助唤醒同一局域网内已配置远程开机的 Windows 电脑。请保持本机连接电源、网络，并允许盖世游戏在后台运行。|This device can help wake configured Windows computers on the same local network. Keep it powered and connected, and allow GameHub to run in the background.
如何设置远程开机？|How do I set up Wake-on-LAN?
允许本机共享屏幕|Allow screen sharing on this device
暂不支持手机作为被连接设备。|Phones cannot currently be used as host devices.
添加设备指南|Add-device guide
还没有添加电脑|No computers added yet
在电脑上安装盖世远程，登录同一盖世账号。|Install GameHub Remote on your computer and log in with the same GameHub account.
在电脑上安装盖世远程，登录同一账号。|Install GameHub Remote on your computer and log in with the same account.
查看添加指南|View setup guide
无法加载设备|Unable to load devices
请检查网络后重试。|Check your network and try again.
重新加载|Reload
设备已离线|Device is offline
自动解锁被控端|Automatically unlock the host
远控结束后，被控端自动锁屏|Lock the host when remote access ends
被控端静音运行|Mute audio on the host
被控端静音后，控制端仍可播放声音。|Audio can still play on your device when the host is muted.
结束后恢复被控端声音设置|Restore host audio settings when finished
被控端防窥模式|Host privacy mode
黑屏|Black screen
自定义屏保|Custom screensaver
输入法|Input method
电脑键盘|Computer keyboard
长文本输入|Long text input
使用手机系统输入法|Use the phone's input method
先在远程窗口中定位输入框。仅输入文字，不自动提交。|Focus a text field in the remote window first. Text is entered without submitting.
输入到电脑|Type on computer
收起后保留本次草稿|Your draft is kept when this panel closes
电脑上已打开的窗口|Open windows on the computer
没有找到需要的窗口？在电脑桌面打开应用。|Can't find the window? Open the app on the computer desktop.
切换下一个屏幕|Switch to next display
窗口|Window
外设|Peripherals
工具|Tools
快捷键|Shortcuts
在远控窗口中使用本机键盘输入。常用组合键可点击发送。|Type with your keyboard in the remote window. Click a shortcut to send it.
长文本草稿|Long text draft
在这里编辑，再输入到电脑|Edit here, then type on the computer
仅观看模式不能输入|Text input is unavailable in view-only mode
暂无打开的窗口|No open windows
可先在电脑桌面打开应用。|Open an app on the computer desktop first.
盖世授权|GameHub authorization
未安装|Not installed
盖世未登录|GameHub logged out
失败|Failed
超时|Timed out
设备|Devices
登录与设备评审状态|Login and device preview states
评审地区|Preview region
演示验证码：任意6位数字；地区切换仅用于评审，协议正式内容待接入|Demo code: any 6 digits. Region switching is for review only. Official agreements are not connected.

App 扫码登录|Scan with an App
使用盖世远程或|Use GameHub Remote or
盖世版本过低|Older GameHub version
盖世游戏 App 版本过低，请更新后重试，或使用其他方式登录。|Your GameHub App version is too old. Update it and try again, or use another login method.
更新盖世游戏 App|Update GameHub App
注销账号|Delete account
注销账号页面待接入，正式版本将打开盖世账号注销流程。|The account deletion page is not connected in this demo. The released app will open the GameHub account deletion process.
手机和电脑使用同一盖世账号，支持局域网与公网连接。|Use the same GameHub account on your phone and computer. Local and internet connections are supported.
手机和电脑登录同一盖世账号，支持局域网与公网连接。|Log in with the same GameHub account on your phone and computer. Local and internet connections are supported.
电脑可使用盖世远程或盖世游戏 App 扫码登录。|Scan with GameHub Remote or GameHub App to log in on the computer.
电脑需保持开机、联网，并允许远程控制。|Keep the computer powered on, connected to the internet, and allow remote control.
检查两端网络是否可用，确认电脑允许远程控制后返回设备列表刷新。|Check both internet connections and allow remote control on the computer, then refresh the device list.
手机可使用盖世远程或盖世游戏 App 扫码；盖世远程在「我的」右上角进入「扫一扫」。|Scan with GameHub Remote or GameHub App. In GameHub Remote, open Scan at the top right of Me.
登录同一盖世账号，或使用盖世远程或盖世游戏 App 扫码登录。|Use the same GameHub account, or scan with GameHub Remote or GameHub App to log in.
被控电脑需开启「允许同账号控制本设备」，Mac 还需允许屏幕录制和辅助功能；支持局域网与公网连接，电脑需保持开机、联网。|Allow control by the same account on the host. On Mac, also allow Screen Recording and Accessibility. Local and internet connections are supported; keep the computer powered on and online.
`.trim().split('\n').map(line=>line.split('|'))));
 Object.assign(dictionary,Object.fromEntries(`
AI 会话|AI sessions
AI 会话列表|AI sessions
电脑|Computers
找到电脑上的任务，打开对应应用继续工作。|Find a task on your computer and continue in its app.
搜索AI会话|Search AI sessions
搜索会话、应用或电脑|Search sessions, apps or computers
未允许被控|Control not allowed
没有找到相关会话|No matching sessions
暂无 AI 会话|No AI sessions
换个关键词，或清空搜索。|Try another keyword or clear the search.
电脑连接后，可查看已识别的应用会话。|Connect your computer to view detected app sessions.
查看我的设备|View my devices
选择串流画面|Choose stream source
关闭画面选择|Close source picker
全桌面|Entire desktop
显示电脑完整桌面|Show the entire desktop
应用窗口|App windows
仅显示此应用窗口|Show only this app window
暂无打开的窗口，可返回桌面打开应用。|No open windows. Return to the desktop to open an app.
此窗口已关闭或不可用|This window is closed or unavailable
切换到其他窗口，或返回桌面打开应用。|Switch windows or return to the desktop to open an app.
返回全桌面|Return to desktop
代码编辑器|Code editor
关闭远端窗口|Close remote window
最小化远控|Minimize remote session
缩小|Zoom out
放大|Zoom in
适应窗口|Fit to window
当前无法继续远控|Remote control is unavailable
设备已离线，请在电脑上线后重试。|The computer is offline. Try again when it is online.
该电脑未允许被控，请在电脑设置中开启权限。|Enable remote control in this computer's settings.
此设备暂不支持远程控制。|Remote control is not supported on this device.
关闭输入|Close input
先定位电脑应用的输入框，仅输入文字，不自动发送。|Focus an input in the remote app. Insert text without sending.
AI 办公交互演示|AI office interaction demo
会话与窗口为本地样例。会话识别、定位和真实串流待接入验证；手机原生 AI 对话需继续技术调研。|Sessions and windows are local samples. Detection, navigation and streaming require integration; native mobile chat needs further technical research.
模拟暂无会话|Simulate no sessions
恢复会话样例|Restore sample sessions
模拟无打开窗口|Simulate no open windows
恢复窗口样例|Restore sample windows
手机原生对话|Native mobile chat
手机对话|Mobile chat
（待继续技术调研，方案待确定）|(Further technical research required; solution to be determined)
`.trim().split('\n').map(line=>line.split('|'))));
 const skip='.rlc-user-content,.rlc-key,script,style,textarea,option:not([value]),[contenteditable],#remote-language-toolbar,.device-name,.computer-item strong,.mac-host-name strong,.mac-path-value,.personal-nickname-row strong,.mobile-auth-account strong,.remote-scan-account strong,.mac-account-popover small,.file-name,.mac-file-name,.file-item-name,.file-item h3,.app-file-picker-list strong,.office-window>span,.quick-installed .grow,.mac-file-pane:nth-child(2) .mac-file-device strong,.mac-file-path,.mac-file-task-table tbody td:first-child,.mac-file-task-table tbody td:nth-child(4),.mac-file-task-table tbody td:nth-child(5),.remote-window,.gpt-workspace,.game-scene';
 let language='zh',observer,scheduled=false;
 try{language=localStorage.getItem(key)==='en'?'en':'zh';}catch{}
 const requested=new URL(location.href).searchParams.get('lang');if(['zh','en'].includes(requested))language=requested;
 function translate(value){const text=value.trim();let result=dictionary[text];if(result===undefined&&/^\d+ 个会话$/.test(text))result=text.replace(' 个会话',' sessions');if(result===undefined&&text.startsWith('串流画面 · '))result='Stream source · '+(text.endsWith('全桌面')?'Entire desktop':'App window');
  if(result===undefined){const count=text.match(/^(\d+) 台电脑$/);if(count)result=count[1]+' computers';}
  if(result===undefined){const group=text.match(/^([▾▸] )?(在线|离线)设备（(\d+)）$/);if(group)result=(group[1]||'')+(group[2]==='在线'?'Online':'Offline')+' devices ('+group[3]+')';}
  if(result===undefined&&text.startsWith('盖世账号 · '))result='GameHub account · '+text.slice('盖世账号 · '.length);
  if(result===undefined){const items=text.match(/^(\d+) 项(?: · 已选择 (\d+) 个项目)?$/);if(items)result=items[1]+' items'+(items[2]?' · '+items[2]+' selected':'');}
  if(result===undefined){const task=text.match(/^传输中 (\d+)%$/);if(task)result='Transferring '+task[1]+'%';}
  if(result===undefined&&text.startsWith('选择 '))result='Select '+text.slice(3);
  if(result===undefined){const status=text.match(/^(● |Windows · |macOS · |Linux · )(在线|离线)$/);if(status)result=status[1]+(status[2]==='在线'?'Online':'Offline');}
  if(result===undefined){const tab=text.match(/^(传输中|已接收|已发送)（(\d+)）$/);if(tab)result=({传输中:'Transferring',已接收:'Received',已发送:'Sent'}[tab[1]])+' ('+tab[2]+')';}
  if(result===undefined&&text.startsWith('当前窗口：'))result='Current window: '+text.slice(5);
  if(result===undefined){const transfer=text.match(/^(.*?) · (传输中 \d+%|传输失败|等待继续传输|等待设备上线|已暂停|已发送|已接收)$/);if(transfer)result=transfer[1]+' · '+translate(transfer[2]);}
  if(result===undefined){const added=text.match(/^已添加「(.*)」$/);if(added)result='Added “'+added[1]+'”';}
  if(result===undefined){const conflict=text.match(/^目标位置已有「(.*)」，请选择本次传输的处理方式。$/);if(conflict)result='“'+conflict[1]+'” already exists at the destination. Choose how to continue.';}

  if(result===undefined){const preview=text.match(/^独立移动 App 交互评审 · (海外|国内)登录示例 · 登录、跨 App 授权及远控均为模拟，未连接账号服务$/);if(preview)result='Mobile app demo · '+(preview[1]==='国内'?'China':'International')+' login · Login, authorization and remote access are simulated.';}

  if(result===undefined&&/^在「隐私与安全性」中允许盖世远程的(屏幕录制|辅助功能)权限，完成后回到客户端。$/.test(text))result='Allow '+(text.includes('屏幕录制')?'Screen Recording':'Accessibility')+' for GameHub Remote in Privacy & Security, then return to the app.';
  return result===undefined?value:value.slice(0,value.indexOf(text))+result+value.slice(value.indexOf(text)+text.length);
 }
 // Search both source and translated article copy without changing the user's query.
 if(typeof remoteSupportResults==='function')remoteSupportResults=function(host){const q=remoteSupportState.query.trim().toLowerCase();const matches=remoteHelpArticles.filter(article=>[article.title,article.category,...article.body].some(value=>(value+' '+translate(value)).toLowerCase().includes(q)));return matches.length?'<section class="personal-panel">'+matches.map(article=>remoteSupportRow(article.title,(host==='mac'?'mac-article:':'mobile-article:')+article.id,'info',article.category)).join('')+'</section>':'<div class="support-empty"><h3>没有找到相关问题</h3><p>试试「登录」「扫码」「设备」等关键词。</p></div>';};
 function ignored(node){const element=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;if(!element||element.closest(skip))return true;
  // Preserve device names even when a user chooses words that match UI labels.
  if(element.closest('.head h1')&&typeof s!=='undefined'&&['detail','properties','files'].includes(s.page)&&typeof device==='function'&&node.textContent?.trim()===device()?.name)return true;
  return false;
 }
 function textNode(node){if(ignored(node))return;let record=originals.get(node);if(!record||node.data!==record.rendered)record={source:node.data,rendered:node.data};const target=language==='en'?translate(record.source):record.source;if(node.data!==target)node.data=target;record.rendered=target;originals.set(node,record);}
 function elementAttributes(element){if(ignored(element)&&element.tagName!=='TEXTAREA')return;let records=attributes.get(element);if(!records){records={};attributes.set(element,records);}for(const name of ['title','aria-label','placeholder','alt']){const value=element.getAttribute(name);if(value===null)continue;let record=records[name];if(!record||value!==record.rendered)record={source:value,rendered:value};const target=language==='en'?translate(record.source):record.source;if(value!==target)element.setAttribute(name,target);record.rendered=target;records[name]=record;}}
 function refresh(){const root=document.getElementById('app');if(!root)return;observer?.disconnect();const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){if(node.nodeType===Node.TEXT_NODE)textNode(node);else elementAttributes(node);}document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=language==='en'?'GameHub Remote · '+(typeof DEFAULT_PLATFORM!=='undefined'&&DEFAULT_PLATFORM==='mac'?'Desktop':'Mobile')+' Demo':'盖世远程 · '+(typeof DEFAULT_PLATFORM!=='undefined'&&DEFAULT_PLATFORM==='mac'?'独立电脑客户端':'独立移动 App')+' Demo';document.querySelectorAll('[data-remote-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.remoteLanguage===language)));observer?.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']});}
 function setLanguage(next){if(!['zh','en'].includes(next))return;language=next;try{localStorage.setItem(key,next);}catch{}try{const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState(history.state,'',url);}catch{}refresh();window.dispatchEvent(new Event('remote-language-change'));}
 const toolbar=document.createElement('nav');toolbar.id='remote-language-toolbar';toolbar.className='remote-language-toolbar';toolbar.setAttribute('aria-label','界面语言 / Interface language');toolbar.innerHTML='<span>界面语言 / Language</span><div role="group" aria-label="中文 / English"><button type="button" data-remote-language="zh" lang="zh-CN">中文</button><button type="button" data-remote-language="en" lang="en">English</button></div>';document.body.insertBefore(toolbar,document.getElementById('app'));
 toolbar.addEventListener('pointerdown',event=>event.preventDefault());
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-remote-language]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();setLanguage(button.dataset.remoteLanguage);},true);
 observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;refresh();});});
 window.RemoteLanguage={get current(){return language;},set:setLanguage,refresh,translate};
 window.addEventListener('storage',event=>{if(event.key===key&&['zh','en'].includes(event.newValue)){language=event.newValue;refresh();}});
 refresh();window.dispatchEvent(new Event('remote-language-change'));
})();
