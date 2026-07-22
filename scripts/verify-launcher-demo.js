const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'demos', 'macOS26盖世全屏启动台-交互标注版.html');
const html = fs.readFileSync(file, 'utf8');
const demoDir = path.dirname(file);
const scriptBlocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);

let scriptSyntax = true;
try {
  if (!scriptBlocks.length) throw new Error('inline script missing');
  scriptBlocks.forEach(source => new Function(source));
} catch (error) {
  scriptSyntax = false;
  console.error(error.message);
}

const requiredFlows = [
  'client', 'scanning', 'launchpad', 'search',
  'folder', 'settings', 'permission', 'launching', 'external', 'failure'
];
const forbiddenLegacy = [
  '游戏 / 全部应用', '添加到游戏', '从游戏中移除', 'game-cover-grid',
  'data-value="games"', 'reorderItem', 'drag_edge', '跨页拖动', '拖拽调整排序'
];
const localReferences = [...new Set(
  [...html.matchAll(/(?:src|url\()=['"]?([^'"\)]+\.(?:png|jpe?g|svg|webp))/gi)]
    .map(match => match[1])
    .filter(value => !value.startsWith('data:'))
)];

const checks = {
  title: html.includes('macOS 26 盖世全屏启动台 - 交互标注版'),
  shell: ['flow-list', 'demo-canvas', 'anno-scroll'].every(text => html.includes(text)),
  flows: requiredFlows.every(id => html.includes(`id:'${id}'`)),
  annotations: ['交互说明', '异常&amp;边界', '触发条件', '展示说明', '交互说明', '异常边界'].every(text => html.includes(text)),
  markerTabs: ['data-value="interaction"', 'data-value="edge"', 'annotationTab'].every(text => html.includes(text)),
  markerMapping: ['data-annotation-id', 'data-annotation-ref', 'flashAnnotation', 'annotation-flash'].every(text => html.includes(text)),
  markerControls: ['toggle-markers', 'toggle-panel', 'showMarkers'].every(text => html.includes(text)),
  iconOnlyEntry: ['launchpad-entry', 'data-action="enter-launchpad"', 'title="启动台"', 'aria-label="启动台"'].every(text => html.includes(text)),
  noLegacy: forbiddenLegacy.every(text => !html.includes(text)),
  allAppsDirect: ['全部应用启动台', '搜索应用', 'launchpad-screen'].every(text => html.includes(text)),
  pagination: ['pageDots', 'goToPage', 'data-action="page-dot"', 'page-dots'].every(text => html.includes(text)),
  search: ['launchpadSearch', 'flattenedApps', 'searchResults', 'toLocaleLowerCase'].every(text => html.includes(text)),
  folderDrag: ['dragstart', 'dragover', 'drop', 'createFolder', 'moveIntoFolder'].every(text => html.includes(text)),
  dragScope: [
    "canDrag=scope==='top'&&item.type==='app'",
    "scope=searching?'search':'top'",
    "source=layout.find(item=>item.id===appId&&item.type==='app')"
  ].every(text => html.includes(text)),
  fixedOrder: [
    '不支持自由调整顺序', '首次扫描按名称排序', 'navigator.language', 'a.id.localeCompare(b.id)',
    'items:[target,source].sort(byName)', 'folder.items.sort(byName)', 'normalizeLayout()'
  ].every(text => html.includes(text)),
  folders: ['createFolder', 'openFolder', 'renameFolder', 'removeFromFolder', 'dissolveFolderIfNeeded', '实用工具'].every(text => html.includes(text)),
  settings: ['自定义快捷键', 'F4 键', '触控板手势', '屏幕触发角', '自定义目录', '标准应用目录'].every(text => html.includes(text)),
  permissions: ['requestPermission', 'resolvePermission', 'granted', 'denied', 'unsupported', '去授权'].every(text => html.includes(text)),
  globalTriggers: ['shortcut', 'f4', 'trackpad', 'hot_corner', 'triggerLauncher'].every(text => html.includes(text)),
  clientState: ['foreground', 'background', 'minimized', 'quit', 'clientProcess'].every(text => html.includes(text)),
  launcherAvailability: ['盖世已彻底退出，全局入口不可用', '前台', '后台驻留', '最小化'].every(text => html.includes(text)),
  launchOutcomes: ['startLaunch', 'activateGameHub', 'back-launchpad', '启动失败', '激活已有窗口'].every(text => html.includes(text)),
  escPriority: ['editingFolder', 'state.drag', 'state.folderId', 'state.query', 'Escape'].every(text => html.includes(text)),
  edgeCoverage: ['多显示器', '目录失效', '快捷键冲突', '设备不支持', '文件夹拖放期间'].every(text => html.includes(text)),
  appVolume: (html.match(/id:'app-/g) || []).length >= 36,
  noExternal: !/https?:\/\//.test(html),
  localAssetsExist: localReferences.every(relative => fs.existsSync(path.resolve(demoDir, relative))),
  noPlaceholders: !/\b(?:TODO|TBD)\b/.test(html),
  scriptSyntax
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('FAIL', failed.join(', '));
  process.exit(1);
}

console.log('PASS macOS 26 launchpad v2 demo static checks');
