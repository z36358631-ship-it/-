import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {marked} from 'file:///C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/marked/lib/marked.esm.js';
const dir=path.dirname(fileURLToPath(import.meta.url));
const input=fs.readFileSync(path.join(dir,'【PRD】盖世游戏深色模式.md'),'utf8');
const html=marked.parse(input);
fs.writeFileSync(path.join(dir,'深色模式PRD预览.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>盖世游戏 · 深色模式 PRD</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f5f7;color:#20242b;font:15px/1.8 -apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif}main{max-width:1200px;margin:36px auto;padding:44px 52px;background:#fff;border:1px solid #e4e7ec;border-radius:16px}h1{font-size:30px;line-height:1.4}h2{margin-top:46px;border-bottom:1px solid #e4e7ec;padding-bottom:10px}h3{margin-top:32px}h4{font-size:17px}table{border-collapse:collapse;width:100%;margin:18px 0;font-size:14px}th,td{border:1px solid #dfe3e8;padding:12px 14px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f3f5f8;font-weight:600}td:first-child{min-width:110px}a{color:#315fd7}img{max-width:100%;height:auto;border:1px solid #e1e4e8;border-radius:8px}td img{max-height:510px;width:auto;max-width:100%;margin:10px 12px 16px 0;vertical-align:top}td br:has(+img){display:none}strong{font-weight:650}p,li{max-width:100%}em{font-size:13px;color:#697386}.note{padding:10px 15px;background:#eef3ff;border-radius:8px;font-size:13px}@media(max-width:700px){main{margin:0;padding:24px 16px;border-radius:0}table{font-size:12px}td,th{padding:8px}h1{font-size:25px}}@media print{body{background:white}main{border:0;margin:0;padding:0}h2,h3,h4{break-after:avoid}img{max-height:400px}}
</style><main><div class="note">V1.3 · 图片已发布到 Git 固定提交 · 仅完成公网验证，飞书转存未验证</div>${html}</main></html>`,'utf8');
console.log('PRD preview generated');
