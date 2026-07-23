import fs from 'node:fs';
import path from 'node:path';

const prdPath = path.resolve('docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md');
const assetRoot = 'https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@fd9a99ed999ab201eb243886aefec51bb1b0c327/prd/ai%E7%94%9F%E6%88%90/macos26-launchpad-v2.6';

const image = (file, figure, alt) =>
  `![${figure}：${alt}](${assetRoot}/${file})`;

const diagrams = new Map([
  ['F001', image('01-client-entry.png', '图4.2.1-1', '盖世客户端侧边栏启动台入口')],
  ['F002', image('02-all-apps.png', '图4.2.2-1', '进入启动台后直接展示全部应用')],
  ['F003', [
    image('02-all-apps.png', '图4.2.3-1', '启动台应用网格与横向分页'),
    image('03-search-empty.png', '图4.2.3-2', '搜索无结果状态')
  ].join('<br>')],
  ['F004', [
    image('04-edit-mode.png', '图4.2.4-1', '长按进入应用编辑模式'),
    image('05-folder.png', '图4.2.4-2', '启动台文件夹展开状态')
  ].join('<br>')],
  ['F005', image('06-app-launching.png', '图4.2.5-1', '应用启动中的进度状态')],
  ['F006', image('07-global-entry.png', '图4.2.6-1', '全局快捷入口与盖世进程状态')],
  ['F007', image('08-settings-sources.png', '图4.2.7-1', '启动台设置与应用来源')],
  ['F008', image('09-edge-cases.png', '图4.2.8-1', '启动台异常与边界状态')],
  ['F011', [
    image('10-delete-confirm.png', '图4.2.11-1', '删除应用二次确认'),
    image('11-delete-blocked.png', '图4.2.11-2', '运行中应用禁止删除')
  ].join('<br>')],
  ['F012', image('12-dock-guide.png', '图4.2.12-1', '首次进入时添加到程序坞引导')]
]);

const source = fs.readFileSync(prdPath, 'utf8');
let replaced = 0;
const lines = source.split(/\r?\n/).map(line => {
  if (!line.startsWith('| F')) return line;
  const cells = line.split(' | ');
  const moduleTokens = cells[0].replace(/^\|\s*/, '').trim().split(/\s+/);
  const moduleId = moduleTokens[0];
  if (moduleTokens.length < 2) return line;
  if (!diagrams.has(moduleId)) return line;
  if (cells.length < 3) throw new Error(`Malformed PRD table row: ${moduleId}`);
  cells[1] = diagrams.get(moduleId);
  replaced += 1;
  return cells.join(' | ');
});

if (replaced !== diagrams.size) {
  throw new Error(`Expected to update ${diagrams.size} rows, updated ${replaced}`);
}

fs.writeFileSync(prdPath, `${lines.join('\n').replace(/\n+$/, '')}\n`, 'utf8');
console.log(`Updated ${replaced} PRD diagram rows in ${prdPath}`);
