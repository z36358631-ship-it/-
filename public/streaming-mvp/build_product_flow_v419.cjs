const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname,out=path.join(root,'review/prd-v419');
const uri=p=>'data:image/png;base64,'+fs.readFileSync(path.join(root,p)).toString('base64');
const card=(n,title,file,desc)=>`<figure><h3>${n} ${title}</h3><img src="${uri(file)}"><p>${desc}</p></figure>`;
const line=cards=>'<div class="line">'+cards.join('<span class="arrow">→</span>')+'</div>';
const main=[
 card('1','登录盖世账号','prd-v417-images/standalone-mobile-login.png','完成账号与协议校验；登录不自动连接。'),
 card('2','选择使用场景','prd-v417-images/mobile-usage-choice.png','办公进入 AI 会话；非办公进入我的设备。'),
 card('3','筛选设备与主题','assets/standalone-mobile-office-device-sessions-v419.png','状态在标题左侧，时间在下；气泡进行对话，› 打开客户端。'),
 card('4','打开电脑 AI 软件','prd-v417-images/mobile-session.png','点击 ›，传入对应主题标识，展示电脑客户端画面。'),
 card('5','结束本次连接','assets/standalone-mobile-office-device-sessions-v419.png','返回 AI 会话列表；电脑程序继续运行。')
];
const other=[
 card('3','我的设备','prd-v417-images/mobile-devices.png','选择同账号电脑。'),
 card('4','查看详情并连接','prd-v417-images/mobile-detail.png','核对在线、被控权限及占用。'),
 card('5','操作电脑桌面','prd-v417-images/mobile-desktop.png','使用全桌面或独立窗口串流。'),
 card('6','结束本次连接','prd-v417-images/mobile-detail.png','回到详情；电脑程序继续运行。')
];
const markup=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f3f6fb;color:#233d59;font:16px/1.6 'Microsoft YaHei',sans-serif}main{width:1850px;padding:38px}h1{margin:0;font-size:30px}h2{font-size:23px;margin:22px 0 14px}header p{margin:8px 0 28px;color:#657b92}.line{display:flex;align-items:center;gap:13px}figure{width:290px;margin:0;padding:14px;background:white;border:1px solid #dbe4ef;border-radius:14px;flex-shrink:0}h3{font-size:17px;min-height:32px;margin:0 0 10px}figure img{display:block;width:260px;height:532px;object-fit:contain;background:#f7f9fc;border-radius:10px}figure p{font-size:14px;min-height:68px;margin:14px 0 0;color:#657b92}.arrow{font-size:32px;color:#4c8ac8;width:32px;flex-shrink:0}.other{margin-left:335px}footer{padding-top:24px;color:#8d743e;font-size:15px}</style><main><header><h1>盖世远程产品流程 V4.19</h1><p>电脑需登录同一盖世账号、允许被控并完成系统权限。以下界面来自 Demo 实际截图；不代表真实服务接通。</p></header><h2>办公：主题会话 → 电脑 AI 客户端</h2>${line(main)}<section class="other"><h2>非办公：我的设备 → 电脑桌面</h2>${line(other)}</section><footer>对话气泡进入适配对话演示（待继续技术调研，方案待确定）。离线或禁控不连接，占用按原确认流程处理；未读蓝点不等于完成。</footer></main>`;
(async()=>{fs.mkdirSync(out,{recursive:true});const file=path.join(out,'product-flow.html');fs.writeFileSync(file,markup);const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{const p=await b.newPage({viewport:{width:1850,height:1800},deviceScaleFactor:1.5});await p.goto(pathToFileURL(file).href);await p.locator('main').screenshot({path:path.join(root,'assets/product-flow-v419.png')});console.log('Built assets/product-flow-v419.png from actual Demo screenshots');}finally{await b.close();}})();
