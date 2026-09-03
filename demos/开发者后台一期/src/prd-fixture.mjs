import fs from 'node:fs';
import path from 'node:path';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const unique = items => [...new Set(items.filter(Boolean))];

function stripMarkup(value = '') {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\*图[^*]*\*/g, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function tableValue(section, label) {
  const safe = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = section.match(new RegExp(`^\\|\\s*${safe}\\s*\\|\\s*(.*?)\\s*\\|\\s*$`, 'm'));
  return match?.[1]?.trim() || '';
}

function labeledBlock(raw, label, followingLabels = []) {
  const marker = `**${label}：**`;
  const start = raw.indexOf(marker);
  if (start < 0) return '';
  const bodyStart = start + marker.length;
  const ends = followingLabels
    .map(item => raw.indexOf(`**${item}：**`, bodyStart))
    .filter(index => index >= 0);
  const end = ends.length ? Math.min(...ends) : raw.length;
  return raw.slice(bodyStart, end);
}

function listItems(value) {
  return unique(stripMarkup(value)
    .split('\n')
    .map(item => item.replace(/^\d+[.、]\s*/, '').trim())
    .filter(item => item.length > 1));
}

function parsePageSections(section) {
  const requirement = tableValue(section, '需求描述');
  const intro = stripMarkup(tableValue(section, '功能简介'));
  const scenario = stripMarkup(tableValue(section, '场景描述'));
  const input = stripMarkup(tableValue(section, '输入／前置条件'));
  const detail = listItems(labeledBlock(requirement, '详细说明', ['展示说明', '交互说明']));
  const display = listItems(labeledBlock(requirement, '展示说明', ['交互说明']));
  const interaction = listItems(labeledBlock(requirement, '交互说明'));
  const output = stripMarkup(tableValue(section, '输出／后置条件'));
  const notes = listItems(tableValue(section, '补充说明'));
  return {
    summary: intro || scenario,
    sections: [
      { title: '页面目标与场景', items: unique([intro, scenario, input]).slice(0, 4) },
      { title: '展示与业务字段', items: unique([...detail, ...display]).slice(0, 8) },
      { title: '交互与动作', items: interaction.slice(0, 8) },
      { title: '结果与边界', items: unique([output, ...notes]).slice(0, 6) },
    ].map(item => ({ ...item, items: item.items.length ? item.items : ['以当前 PRD 页面规则为准'] })),
  };
}

function extractPages(markdown, module) {
  if (module.headingStyle === 'all-decimal') {
    const expression = /^#### 3\.([12])\.(\d+)\s+(.+)$/gm;
    const matches = [...markdown.matchAll(expression)];
    return matches.map((match, index) => ({
      key: `3.${match[1]}.${match[2]}`,
      order: Number(match[2]),
      title: match[3].trim(),
      section: markdown.slice(match.index, matches[index + 1]?.index ?? markdown.length),
    }));
  }
  const expression = module.headingStyle === 'decimal'
    ? /^#### 3\.2\.(\d+)\s+(.+)$/gm
    : new RegExp(`^#### P${module.id}-(\\d+)\\s+(.+)$`, 'gm');
  const matches = [...markdown.matchAll(expression)];
  return matches.map((match, index) => ({
    key: module.headingStyle === 'decimal' ? `3.2.${match[1]}` : `P${module.id}-${String(match[1]).padStart(2, '0')}`,
    order: Number(match[1]),
    title: match[2].trim(),
    section: markdown.slice(match.index, matches[index + 1]?.index ?? markdown.length),
  }));
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`PRD contract mismatch: ${label}; expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

export function loadLatestPrdFixture({ repoRoot, demoDir }) {
  const srcDir = path.join(demoDir, 'src');
  const routes = readJson(path.join(srcDir, 'routes.json'));
  const map = readJson(path.join(srcDir, 'prd-page-map.json'));
  const base = readJson(path.join(srcDir, 'fixtures.json'));
  assertEqual(map.sourceOfTruth, 'latest-prd', 'source of truth');
  assertEqual(routes.length, 37, 'route count');

  const pages = {};
  const counts = {};
  const documentCounts = {};
  const sourceFiles = [];
  for (const module of map.modules) {
    const sourcePath = path.join(repoRoot, ...module.file.split('/'));
    if (!fs.existsSync(sourcePath)) throw new Error(`PRD contract mismatch: missing ${module.file}`);
    const markdown = fs.readFileSync(sourcePath, 'utf8');
    const parsed = extractPages(markdown, module);
    const moduleRoutes = routes.filter(route => route.moduleId === module.id);
    counts[module.id] = parsed.length;
    documentCounts[module.id] = parsed.length;
    sourceFiles.push(module.file);
    assertEqual(parsed.length, map.expectedDocumentCounts?.[module.id] ?? map.expectedCounts[module.id], `${module.id} document page count`);
    assertEqual(moduleRoutes.length, map.expectedCounts[module.id], `${module.id} route count`);
    if (module.expectedPageKeys) assertEqual(parsed.map(page => page.key), module.expectedPageKeys, `${module.id} document page keys`);
    if (!module.routePageMap) {
      assertEqual(parsed.map(page => page.order), Array.from({ length: parsed.length }, (_, index) => index + 1), `${module.id} page order`);
      assertEqual(parsed.map(page => page.title), moduleRoutes.map(route => route.title), `${module.id} page titles`);
    }

    for (let index = 0; index < parsed.length; index += 1) {
      if (module.routePageMap) break;
      const route = moduleRoutes[index];
      const current = base.pages?.[route.id] || {};
      pages[route.id] = {
        ...current,
        ...parsePageSections(parsed[index].section),
        ...map.pageMeta[route.id],
        states: Array.isArray(current.states) && current.states.length >= 5
          ? current.states
          : ['default', 'loading', 'empty', 'error', 'permission'],
        audience: route.role,
        prdSource: module.file,
        prdHeading: parsed[index].title,
      };
    }
    if (module.routePageMap) {
      for (const route of moduleRoutes) {
        const pageKey = module.routePageMap[route.id];
        const sourcePage = parsed.find(page => page.key === pageKey);
        if (!sourcePage) throw new Error(`PRD contract mismatch: ${module.id} route ${route.id} maps to missing page ${pageKey}`);
        const current = base.pages?.[route.id] || {};
        pages[route.id] = {
          ...current,
          ...parsePageSections(sourcePage.section),
          ...map.pageMeta[route.id],
          states: Array.isArray(current.states) && current.states.length >= 5
            ? current.states
            : ['default', 'loading', 'empty', 'error', 'permission'],
          audience: route.role,
          prdSource: module.file,
          prdHeading: sourcePage.title,
        };
      }
    }
  }

  assertEqual(Object.keys(pages), routes.map(route => route.id), 'page and route order');
  const fixture = {
    ...base,
    accounts: {
      ...base.accounts,
      developer: {
        ...base.accounts?.developer,
        roleName: '已确认开发者',
        scope: '唯一绑定星海互动，可管理其 Game 与发行数据',
      },
    },
    context: {
      ...base.context,
      appId: 'APP-7F3A9C',
      querySnapshotId: 'QRY-20260903-001',
      environment: '全球正式环境',
    },
    rules: {
      ...base.rules,
      sourceOfTruth: '4 份最新 PRD',
      platformBoundary: '新发行平台与原盖世游戏主体、域名、数据库和账号隔离，仅通过受控接口交换必要结果',
      sdkRule: 'Windows／macOS／Linux 能力一致；首次授权成功后允许离线，不做心跳、并发或即时踢线',
      buildRule: 'Build、Manifest 与 Chunk 永久保留；Release Pointer 按 app_id + OS + CPU 架构切换并可回滚',
      campaignMode: '轻量 Campaign／UTM、人工资源需求与渠道归因',
      campaignExecution: '开发者管理 Campaign 与人工资源需求；平台运营回填实际执行结果',
      additionalOutOfScope: ['自动结算', '广告竞价', '算法推荐', '用户级画像与多触点归因'],
    },
    objects: {
      ...base.objects,
      game: {
        ...base.objects.game,
        platforms: ['Windows', 'macOS', 'Linux'],
      },
      version: {
        ...base.objects.version,
        platform: 'Windows／macOS／Linux',
        releaseVersionId: 'REL-100',
        manifestId: 'MANIFEST-003',
        pointerKey: 'APP-7F3A9C + OS + CPU 架构',
      },
      campaign: {
        ...base.objects.campaign,
        mode: '轻量 Campaign／UTM',
        querySnapshotId: 'QRY-20260903-001',
      },
    },
    pages,
  };

  return {
    routes,
    fixture,
    contract: {
      version: map.version,
      counts,
      documentCounts,
      countText: map.modules.map(module => documentCounts[module.id]).join('/'),
      routeCountText: map.modules.map(module => routes.filter(route => route.moduleId === module.id).length).join('/'),
      sourceFiles,
    },
  };
}
