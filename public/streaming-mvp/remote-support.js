paths.scan='M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M8 8h3v3H8z M14 8h2v3h-2z M8 14h3v2H8z M14 14h2v2h-2z';
// Shared support content for the independent MVP demos; no production services.
const remoteSupportState={query:'',article:'',update:'idle',updateTimer:null,updateGeneration:0};
const remoteHelpArticles=[
 {id:'add',title:'如何添加自己的电脑？',category:'设备与连接',body:['在要访问的电脑上安装并打开盖世远程客户端。','手机和电脑登录同一盖世账号，并连接同一局域网。','电脑端开启「允许同账号控制本设备」；Mac 还需授予屏幕录制和辅助功能权限。','回到手机「我的设备」选择电脑，再主动发起连接。登录成功不会自动连接电脑。']},
 {id:'missing',title:'为什么设备列表里看不到电脑？',category:'设备与连接',body:['先确认两端登录的是同一盖世账号。','确认电脑已经开机、联网，盖世远程客户端正在运行。','一期连接沿用同一局域网范围；检查两端网络后返回设备列表刷新。']},
 {id:'offline',title:'电脑离线时如何处理？',category:'设备与连接',body:['确认电脑电源和网络连接正常。','远程开机仅适用于满足现有 Demo 条件且已配置的设备，不保证所有电脑都可被唤醒。','电脑恢复在线后，再从设备详情发起连接。']},
 {id:'scan',title:'如何使用扫一扫登录电脑端？',category:'账号与登录',body:['电脑端未登录首页或登录页默认显示二维码，阅读并同意适用协议后可扫码登录。','手机先登录盖世远程，在「我的」右上角进入「扫一扫」。','扫描二维码后核对当前盖世账号和电脑登录提示，确认是本人操作再点击「确认登录」。','取消、过期或已使用的二维码需要在电脑端刷新。Demo 仅模拟授权，真实跨设备登录仍需账号服务。']},
 {id:'permission',title:'Mac 需要开启哪些权限？',category:'权限与安全',body:['在电脑端左侧「设置」开启允许同账号控制。','根据系统提示，在「隐私与安全性」中允许屏幕录制和辅助功能。','返回客户端确认权限状态后，再从另一端发起连接。网页 Demo 不会修改系统权限。']},
 {id:'view',title:'仅观看和远程控制有什么区别？',category:'远程操作',body:['仅观看用于查看电脑画面，不发送鼠标、键盘等输入。','需要操作时，按照已有会话入口切换到控制状态。','退出远控只结束本次连接，电脑上的程序继续运行。']},
 {id:'files',title:'如何传输文件？',category:'远程操作',body:['在现有设备详情或会话工具中打开文件传输。','按页面提示选择文件与传输方向，查看任务状态。','Demo 中的文件任务用于交互演示，不会把真实文件发送到远程电脑。']},
 {id:'login',title:'手机号、邮箱和 Google 登录如何选择？',category:'账号与登录',body:['国内使用手机号验证码，海外使用邮箱验证码或 Google 登录；电脑端还支持扫码登录。','移动端可拉起盖世游戏 App 完成盖世账号授权。','登录前需主动阅读并同意适用协议。当前 Demo 的短信、邮件、Google 和跨 App 授权均为模拟。']},
 {id:'logout',title:'退出登录后会怎样？',category:'账号与登录',body:['退出当前盖世远程客户端账号，回到未登录页面。','当前会话相关的设备数据、草稿和文件任务会清理；再次登录后重新加载。','退出登录不等于注销盖世账号，也不会关闭电脑中正在运行的程序。']}
];
function remoteSupportRow(title,actionName,iconName='info',detail=''){return '<button class="personal-row" data-action="'+actionName+'">'+icon(iconName)+'<span class="grow"><strong>'+title+'</strong>'+(detail?'<small>'+detail+'</small>':'')+'</span>'+icon('chevron')+'</button>';}
function remoteSupportPage(kind,host){
 const prefix=host==='mac'?'mac-support:':'mobile-support:';
 const title={help:'帮助中心',article:'帮助详情',about:'关于盖世远程'}[kind];
 const heading=host==='mac'?'<header class="head"><h1>'+title+'</h1></header>':'<header class="head personal-head">'+ib('返回','mobile-personal-back','back')+'<h1>'+title+'</h1></header>';
 if(kind==='help')return heading+'<main class="content support-page"><label class="support-search">'+icon('search')+'<input id="support-search" type="search" aria-label="搜索问题" placeholder="搜索问题或关键词" value="'+esc(remoteSupportState.query)+'"></label><h2>常见问题</h2><div id="support-results">'+remoteSupportResults(host)+'</div></main>';
 if(kind==='article'){const item=remoteHelpArticles.find(x=>x.id===remoteSupportState.article);return heading+'<main class="content support-page support-article">'+(item?'<small>'+item.category+'</small><h2>'+item.title+'</h2><ol>'+item.body.map(t=>'<li>'+t+'</li>').join('')+'</ol>':'<p>未找到这篇帮助，请返回帮助中心。</p>')+btn('返回帮助中心',prefix+'help','ghost')+'</main>';}
 const policies=['用户协议','隐私协议','个人信息收集清单','第三方信息共享清单'];
 return heading+'<main class="content support-page support-about"><section class="personal-panel">'+policies.map((t,i)=>remoteSupportRow(t,prefix+'policy-'+i,'info')).join('')+'</section><div id="support-policy-note" role="status"></div></main>';
}
function remoteSupportResults(host){const q=remoteSupportState.query.trim().toLowerCase();const matches=remoteHelpArticles.filter(a=>(a.title+a.category+a.body.join('')).toLowerCase().includes(q));return matches.length?'<section class="personal-panel">'+matches.map(a=>remoteSupportRow(a.title,(host==='mac'?'mac-article:':'mobile-article:')+a.id,'info',a.category)).join('')+'</section>':'<div class="support-empty"><h3>没有找到相关问题</h3><p>试试「登录」「扫码」「设备」等关键词。</p></div>';}
document.addEventListener('input',e=>{if(e.target.id!=='support-search')return;remoteSupportState.query=e.target.value;const results=document.getElementById('support-results');if(results)results.innerHTML=remoteSupportResults(s.platform==='mac'?'mac':'mobile');});


// 原页面完成更新检查；离页或退出后不接收旧结果。
function remoteUpdateCancel(){clearTimeout(remoteSupportState.updateTimer);remoteSupportState.updateTimer=null;remoteSupportState.updateGeneration++;remoteSupportState.update='idle';}
function remoteUpdateRow(host){const busy=remoteSupportState.update==='checking',done=remoteSupportState.update==='done';return '<button class="personal-row update-inline-row" data-action="'+(host==='mac'?'mac':'mobile')+'-support:update" '+(busy?'disabled aria-busy="true"':'')+'>'+icon('refresh')+'<span class="grow"><strong>'+(busy?'正在检查…':'检查更新')+'</strong><small>当前版本：MVP 演示版</small><small class="update-inline-result" role="status" aria-live="polite">'+(done?'当前演示版无可用更新':'')+'</small></span></button>';}
function remoteUpdateCheck(host){const allowed=()=>host==='mac'?standaloneMac.signed:mobileAuth.loggedIn;if(!allowed()||remoteSupportState.update==='checking')return;remoteUpdateCancel();const generation=remoteSupportState.updateGeneration,page=s.page;remoteSupportState.update='checking';render();remoteSupportState.updateTimer=setTimeout(()=>{if(generation!==remoteSupportState.updateGeneration||!allowed()||s.page!==page)return;remoteSupportState.updateTimer=null;remoteSupportState.update='done';render();},450);}

