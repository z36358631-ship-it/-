import { pathToFileURL } from 'node:url';
import { validateRules } from './lib/dst-mods-delivery-validator.mjs';

const rules = [
  {
    path: 'prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md',
    required: [
      /^# 【PRD】《盖世游戏》DST本地MODS跨平台需求$/m,
      /^## 1\. 文档信息$/m,
      /^## 4\. 范围与非目标$/m,
      /^## 6\. 业务规则$/m,
      /^## 7\. Mac 页面与交互$/m,
      /^## 8\. APP 竖屏页面与交互$/m,
      /^## 9\. APP 横屏页面与交互$/m,
      /^## 10\. 横竖屏切换规则$/m,
      /^## 11\. 状态与异常$/m,
      /^## 12\. 验收标准$/m,
      /Steam App ID：322330/,
      /仅此设备/,
      /安装（含 N 个必要依赖）/,
      /resolved_launch_manifest/,
      /不自动修改用户状态/
    ]
  }
];

export async function verifyDstModsDelivery(root = process.cwd()) {
  return validateRules(root, rules);
}

async function main() {
  const errors = await verifyDstModsDelivery();
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log('DST MODS delivery verified');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
