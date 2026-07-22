const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'demos', 'macOS26盖世全屏启动台-交互标注版.html');
const html = fs.readFileSync(file, 'utf8');
const demoDir = path.dirname(file);
const scriptBlocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
const functionSource = name => (html.match(new RegExp(`function ${name}\\([^\\n]*`)) || [''])[0];
const dockGuideSource = functionSource('renderDockGuide');
const moreMenuSource = functionSource('renderMoreMenu');
const settingsSource = functionSource('renderSettings');
const createFolderSource = functionSource('createFolder');
const deleteDialogSource = functionSource('renderDeleteDialog');

let scriptSyntax = true;
try {
  if (!scriptBlocks.length) throw new Error('inline script missing');
  scriptBlocks.forEach(source => new Function(source));
} catch (error) {
  scriptSyntax = false;
  console.error(error.message);
}

const requiredFlows = [
  'client', 'launchpad', 'search', 'edit', 'folder',
  'deleteConfirm', 'deleteBlocked', 'settings', 'permission',
  'launching', 'failure'
];
const forbiddenLegacy = [
  '游戏 / 全部应用', '添加到游戏', '从游戏中移除', 'game-cover-grid',
  'data-value="games"', 'reorderItem', 'drag_edge', '跨页拖动', '拖拽调整排序',
  "id:'scanning'", "id:'external'", 'external-app', 'back-launchpad',
  'data-action="clear-search"', 'data-action="edit-folder"', '退出启动台',
  '正在查找应用', '模拟首次扫描'
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
  layoutPolicy: [
    '首次发现按名称生成布局', '保留原槽位', 'navigator.language', 'a.id.localeCompare(b.id)',
    'items:[target,source].sort(byName)', 'folder.items.sort(byName)'
  ].every(text => html.includes(text)) && !html.includes('function normalizeLayout()'),
  folders: ['createFolder', 'openFolder', 'renameFolder', 'removeFromFolder', 'dissolveFolderIfNeeded', '实用工具', 'folder-title'].every(text => html.includes(text)),
  folderPreview: [
    'folder-mini', 'grid-template-columns:repeat(3,14px)',
    'grid-template-rows:repeat(3,14px)', 'width:14px;height:14px;aspect-ratio:1',
    '等比方形缩略图'
  ].every(text => html.includes(text)),
  folderExplicitControls: [
    'class="folder-close" data-action="close-folder" aria-label="关闭文件夹"',
    'class="move-out" data-action="remove-from-folder"',
    '>移出</button>', '<div class="overlay-shade" data-action="close-folder"></div>'
  ].every(text => html.includes(text)),
  folderTargetSlot: [
    'const sourceIndex=layout.indexOf(source)',
    'const targetIndex=layout.findIndex(item=>item.id===targetId)',
    'layout.splice(targetIndex,1,folder)',
    '后续应用已前移一格'
  ].every(text => createFolderSource.includes(text)) && !createFolderSource.includes('layout.push(folder)'),
  folderDropStaysOnPage: [
    '已在目标位置创建文件夹', '文件夹位置保持不变',
    "state.folderId=null;state.screen=state.editing?'edit':'launchpad'"
  ].every(text => html.includes(text)) && !html.includes('state.page=Math.floor(newIndex/PAGE_SIZE)'),
  folderMoveOutRefreshes: ['放在文件夹后一位', 'layout.splice(folderIndex+1,0,app)'].every(text => html.includes(text)),
  editMode: ['LONG_PRESS_MS', 'MOVE_TOLERANCE', 'enterEditMode', 'editing-mode', 'icon-jiggle'].every(text => html.includes(text)),
  deleteControls: ['delete-app', 'deletable', 'deleteDialog', 'trashApp', 'app-delete-badge'].every(text => html.includes(text)),
  deleteCopy: [
    '<span class="delete-primary-line">确认要删除“',
    '<small class="delete-data-note">应用将被移到废纸篓。</small>',
    '<span class="delete-primary-line">不能将项目“',
    '<span class="delete-primary-line">因为它已打开。</span>',
    '>取消<', '>删除<', '>好<'
  ].every(text => html.includes(text)) && !deleteDialogSource.includes('仅移动应用包'),
  deleteDialogSize: ['width:420px', 'width:136px'].every(text => html.includes(text)),
  settings: ['自定义快捷键', 'F4 键', '触控板手势', '屏幕触发角', '自定义目录', '标准应用目录', '添加到程序坞'].every(text => html.includes(text)),
  dockEntry: ['dockGuide', 'dockAdded', 'add-to-dock', 'dismiss-dock-guide', 'open-dock-launcher', '已添加启动台到程序坞'].every(text => html.includes(text)),
  dockGuideContent: [
    '添加启动台到程序坞？', 'class="dock-guide-add"',
    '>确认</button>', 'class="dock-guide-close"', 'aria-label="关闭">×</button>'
  ].every(text => dockGuideSource.includes(text)) &&
    !dockGuideSource.includes('dock-guide-icon') &&
    !dockGuideSource.includes('<small>') &&
    !dockGuideSource.includes('点击图标可直接打开全屏启动台'),
  moreMenu: ['设置', '退出'].every(text => moreMenuSource.includes(text)) &&
    !moreMenuSource.includes('add-to-dock') && !moreMenuSource.includes('dockAdded'),
  settingsSwitches: [
    "resident:false", "settingToggle('resident',state.settingsDraft.resident)",
    "settingToggle('dock',state.dockAdded)", "if(key==='dock')"
  ].every(text => html.includes(text)) && !settingsSource.includes('dock-guide-icon'),
  permissions: ['requestPermission', 'resolvePermission', 'granted', 'denied', 'unsupported', '去授权'].every(text => html.includes(text)),
  globalTriggers: ['shortcut', 'f4', 'trackpad', 'hot_corner', 'triggerLauncher'].every(text => html.includes(text)),
  clientState: ['foreground', 'background', 'minimized', 'quit', 'clientProcess'].every(text => html.includes(text)),
  launcherAvailability: ['盖世已彻底退出，全局入口不可用', '前台', '后台驻留', '最小化'].every(text => html.includes(text)),
  launchOutcomes: ['startLaunch', 'activateGameHub', 'NSWorkspace', 'Demo 不展示目标应用', '启动失败', '激活已有窗口'].every(text => html.includes(text)),
  escPriority: ['deleteDialog', 'editingFolder', 'state.drag', 'state.editing', 'state.folderId', 'state.query', 'Escape'].every(text => html.includes(text)),
  edgeCoverage: ['多显示器', '目录失效', '快捷键冲突', '设备不支持', '文件夹拖放期间', '只读卷'].every(text => html.includes(text)),
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

console.log('PASS macOS 26 launchpad v2.4 demo static checks');
