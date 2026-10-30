"""收敛当前独立产品的共用入口和说明，保留历史资料。"""
from pathlib import Path
R=Path(__file__).resolve().parent

def replace(name, changes):
    p=R/name;s=p.read_text(encoding='utf-8')
    for old,new in changes:s=s.replace(old,new)
    p.write_text(s,encoding='utf-8')

replace('remote-office-mobile.js',[("+button('国内','Domestic','mobile-region:domestic')+button('海外','Overseas','mobile-region:overseas')",'')])
replace('remote-support.js',[
 ('手机号、邮箱和 Google 登录如何选择？','支持哪些登录方式？'),
 ('国内使用手机号验证码，海外使用邮箱验证码或 Google 登录；电脑端还支持扫码登录。','使用手机号验证码登录；电脑端还支持扫码登录。'),
 ('当前 Demo 的短信、邮件、Google 和跨 App 授权均为模拟。','当前 Demo 的短信和跨 App 授权均为模拟。')])
replace('remote-qr-bridge.js',[
 ("function create(region,consent=true){const id=", "function create(region,consent=true){region='domestic';const id="),
 ("['domestic','overseas'].includes(p.region)","p.region==='domestic'")])
replace('remote-scan.js',[
 ('登录地区不同，请在两端选择同一地区后重新扫码。','二维码已失效，请在电脑端刷新后重新扫描。')])
replace('remote-language.js',[
 ('手机号、邮箱和 Google 登录如何选择？|Which login method should I use?','支持哪些登录方式？|Which login methods are supported?'),
 ('国内使用手机号验证码，海外使用邮箱验证码或 Google 登录；电脑端还支持扫码登录。|The China region uses phone codes. The international region uses email codes or Google. Desktop also supports QR login.','使用手机号验证码登录；电脑端还支持扫码登录。|Log in with a phone verification code. Desktop also supports QR login.'),
 ('当前 Demo 的短信、邮件、Google 和跨 App 授权均为模拟。','当前 Demo 的短信和跨 App 授权均为模拟。'),
 ('SMS, email, Google and cross-app authorization are simulated.','SMS and cross-app authorization are simulated.'),
 ('演示验证码：任意6位数字。未调用短信、邮箱或 Google 接口；无需输入真实资料。|Demo code: any 6 digits. SMS, email and Google services are not connected. Do not enter real personal data.','演示验证码：任意6位数字。未调用短信接口；无需输入真实资料。|Demo code: any 6 digits. SMS services are not connected. Do not enter real personal data.'),
 ('填入示例号码／邮箱|Fill example phone / email','填入示例号码|Fill example phone'),
 ("(海外|国内)登录示例", "国内登录示例"),
 ("(preview[1]==='国内'?'China':'International')", "'China'")])
p=R/'remote-language.js';lines=p.read_text(encoding='utf-8').splitlines()
lines=[line for line in lines if not ('|' in line and not line.lstrip().startswith('if(') and any(x in line.split('|')[0] for x in ['Google','海外','邮箱验证码','输入邮箱','正确的邮箱','登录地区不同','评审地区']))]
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Updated shared domestic-only sources')
