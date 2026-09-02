import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const outDir = path.join(root, 'Figma', '开发者后台一期');
const sourceDir = path.join(outDir, 'source');
const pageDir = path.join(sourceDir, 'pages');
const sectionDir = path.join(sourceDir, 'sections');
const figmaPageDir = path.join(sourceDir, 'figma-pages');
const routes = JSON.parse(fs.readFileSync(path.join(demoDir, 'src', 'routes.json'), 'utf8'));
const modules = JSON.parse(fs.readFileSync(path.join(demoDir, 'src', 'modules.json'), 'utf8'));
const frameMap = JSON.parse(fs.readFileSync(path.join(outDir, 'frame-map.json'), 'utf8'));
const figmaPageMap = JSON.parse(fs.readFileSync(path.join(outDir, 'figma-page-map.json'), 'utf8'));
const viewport = { width: 1440, height: 900 };
const browserCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

const escapeXml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const safeId = value => String(value).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'layer';
const retryWait = new Int32Array(new SharedArrayBuffer(4));
const writeTextFile = (file, content) => {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.writeFileSync(file, content, 'utf8');
      return;
    } catch (error) {
      lastError = error;
      Atomics.wait(retryWait, 0, 0, 50 + attempt * 10);
    }
  }
  throw lastError;
};

function routeUrl(route) {
  const module = modules.find(item => item.id === route.moduleId);
  if (!module) throw new Error(`missing module for ${route.id}`);
  const file = path.join(demoDir, module.output);
  const url = pathToFileURL(file);
  url.hash = `/${route.id}?role=${encodeURIComponent(route.role)}&state=default`;
  return url.href;
}

function svgColor(color, fallback = '#000000') {
  if (!color || color === 'transparent') return { color: fallback, opacity: 0 };
  const rgba = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgba) return { color, opacity: 1 };
  const values = rgba[1].split(',').map(value => Number.parseFloat(value.trim()));
  const [r, g, b, a = 1] = values;
  const hex = [r, g, b].map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('');
  return { color: `#${hex}`, opacity: Number.isFinite(a) ? a : 1 };
}

function renderRect(item, prefix, index) {
  const fill = svgColor(item.fill, '#FFFFFF');
  const stroke = svgColor(item.stroke, '#000000');
  const attrs = [
    `id="${safeId(`${prefix}-shape-${index}`)}"`,
    `x="${item.x.toFixed(2)}"`,
    `y="${item.y.toFixed(2)}"`,
    `width="${item.width.toFixed(2)}"`,
    `height="${item.height.toFixed(2)}"`,
    `rx="${Math.max(0, item.radius || 0).toFixed(2)}"`,
    `fill="${fill.color}"`,
    `fill-opacity="${Math.max(0, Math.min(1, fill.opacity * item.opacity)).toFixed(3)}"`,
  ];
  if (item.strokeWidth > 0 && stroke.opacity > 0) {
    attrs.push(`stroke="${stroke.color}"`, `stroke-opacity="${stroke.opacity.toFixed(3)}"`, `stroke-width="${item.strokeWidth.toFixed(2)}"`);
  }
  return `<rect ${attrs.join(' ')}/>`;
}

function renderText(item, prefix, index) {
  const fill = svgColor(item.fill, '#111827');
  const extractedFamily = String(item.fontFamily || 'Microsoft YaHei').split(',')[0].replace(/["']/g, '').trim();
  // Figma imports the SVG text as editable layers, but does not have the
  // Demo-only MiSans / D-DIN web fonts. Use fonts available in the Windows
  // design environment so Chinese text remains visible after cloud import.
  const family = /^(MiSans(?: VF)?|PingFang SC)$/i.test(extractedFamily)
    ? 'Microsoft YaHei'
    : /^D-DIN-PRO$/i.test(extractedFamily)
      ? 'Arial'
      : extractedFamily;
  // Figma uses a text node's SVG id as its layer name. On large imported
  // SVGs this causes CJK glyphs to disappear while Latin glyphs remain.
  // Let Figma derive the layer name from the visible text instead; stable
  // IDs remain on page groups and vector shapes for page-level traceability.
  return `<text x="${item.x.toFixed(2)}" y="${item.y.toFixed(2)}" font-family="${escapeXml(family)}" font-size="${Math.max(8, item.fontSize).toFixed(2)}" font-weight="${escapeXml(item.fontWeight || '400')}" fill="${fill.color}" fill-opacity="${Math.max(0, Math.min(1, fill.opacity * item.opacity)).toFixed(3)}">${escapeXml(item.text)}</text>`;
}

function renderPageSvg(route, extracted) {
  const clipId = `clip-${route.id}`;
  const nodePrefix = `node-${route.id}`;
  const shapes = extracted.rects.map((item, index) => renderRect(item, nodePrefix, index)).join('');
  const texts = extracted.texts.map((item, index) => renderText(item, nodePrefix, index)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900"><defs><clipPath id="${clipId}"><rect width="1440" height="900"/></clipPath></defs><g id="${route.id}" data-frame-id="${route.id}" data-role="${route.role}" data-template="${route.templateId}" clip-path="url(#${clipId})">${shapes}${texts}</g></svg>`;
}

function sectionLayout(section, startY) {
  const columns = 3;
  const gapX = 120;
  const gapY = 150;
  const paddingX = 100;
  const header = 150;
  const rows = Math.ceil(section.frames.length / columns);
  return {
    ...section,
    x: 80,
    y: startY,
    width: paddingX * 2 + columns * viewport.width + (columns - 1) * gapX,
    height: header + rows * viewport.height + Math.max(0, rows - 1) * gapY + 100,
    columns,
    gapX,
    gapY,
    paddingX,
    header,
  };
}

function horizontalPageLayout(frames) {
  const gapX = 160;
  const left = 120;
  const top = 260;
  return {
    width: left * 2 + frames.length * viewport.width + Math.max(0, frames.length - 1) * gapX,
    height: top + viewport.height + 120,
    left,
    top,
    gapX,
  };
}

function text(x, y, value, size = 24, fill = '#0F172A', weight = 400, id = '') {
  return `<text x="${x}" y="${y}" font-family="Microsoft YaHei, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text>`;
}

function titleBar(name, frameCount, width) {
  const countLabel = frameCount > 0 ? `${frameCount} 个业务页` : 'Figma 文件导航';
  return `<g id="page-title-${safeId(name)}"><rect x="80" y="80" width="${width - 160}" height="96" rx="16" fill="#2FD7EF"/><text x="120" y="140" font-family="Microsoft YaHei, Arial, sans-serif" font-size="32" font-weight="800" fill="#101828">${escapeXml(name)}</text><text x="${width - 300}" y="140" font-family="Microsoft YaHei, Arial, sans-serif" font-size="20" font-weight="600" fill="#0B6271">${countLabel}</text></g>`;
}

function designSystemSection() {
  const chips = [
    ['品牌深蓝', '#101C33'], ['工作区', '#F5F7FB'], ['品牌青', '#2FD7EF'], ['成功', '#18A66A'],
    ['警告', '#D88A10'], ['危险', '#E0515D'], ['正文', '#101C33'], ['弱文字', '#667085'],
  ];
  const chipSvg = chips.map(([label, color], index) => {
    const x = 150 + (index % 4) * 350;
    const y = 390 + Math.floor(index / 4) * 110;
    return `<rect id="DS-color-${index}" x="${x}" y="${y}" width="68" height="68" rx="14" fill="${color}"/>${text(x + 90, y + 30, label, 20, '#101828', 600)}${text(x + 90, y + 58, color, 16, '#667085', 400)}`;
  }).join('');
  const components = ['App Shell', 'Top Bar', 'Side Nav', 'Context Bar', 'Page Header', 'Button', 'Input', 'Select', 'Upload', 'Status Tag', 'Table', 'Pagination', 'Tabs', 'Stepper', 'Review Panel', 'Timeline', 'Metric Card', 'Chart', 'Empty / Error / Permission'];
  const componentSvg = components.map((label, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 1700 + col * 700;
    const y = 280 + row * 180;
    return `<g id="DS-component-${safeId(label)}"><rect x="${x}" y="${y}" width="620" height="130" rx="20" fill="#FFFFFF" stroke="#D9E0EA" stroke-width="2"/>${text(x + 28, y + 48, label, 22, '#101828', 700)}${text(x + 28, y + 88, '可编辑基础组件 / 状态变体', 17, '#667085', 400)}<rect x="${x + 470}" y="${y + 36}" width="112" height="54" rx="12" fill="#DFF8FC" stroke="#2FD7EF" stroke-width="2"/>${text(x + 526, y + 70, '示例', 17, '#0B6271', 650)}</g>`;
  }).join('');
  const roles = [
    ['受邀开发者', '仅唯一厂商与单款游戏；不可发布、回滚或启动投放'],
    ['平台发行运营', '审核、商品供给、版本发布与精准投放配置'],
    ['平台测试人员', '仅本人待测任务与不可覆盖的测试结果'],
  ];
  const roleSvg = roles.map(([label, detail], index) => {
    const y = 820 + index * 120;
    return `<rect x="150" y="${y}" width="1320" height="92" rx="18" fill="#FFFFFF" stroke="#D9E0EA" stroke-width="2"/>${text(185, y + 38, label, 21, '#101828', 700)}${text(185, y + 70, detail, 17, '#667085', 400)}`;
  }).join('');
  return `<g id="DS-00-Design-System-Architecture"><rect x="80" y="80" width="4660" height="1500" rx="32" fill="#F3F6FA" stroke="#CBD5E1" stroke-width="2"/>${text(150, 175, '00 Design System & Architecture', 42, '#101828', 800)}${text(150, 222, '开发者后台一期｜深色品牌导航壳 + 浅色工作区｜1440 × 900', 21, '#667085', 400)}${text(150, 320, '设计 Token', 28, '#101828', 750)}${chipSvg}${text(150, 750, '角色与数据边界', 28, '#101828', 750)}${roleSvg}${text(1700, 220, '共享组件与状态', 28, '#101828', 750)}${componentSvg}</g>`;
}

function componentMasterSection() {
  const groups = [
    ['基础骨架', ['应用框架', '顶部栏', '侧边导航', '上下文栏', '页面标题区']],
    ['输入与操作', ['按钮', '输入框', '下拉选择', '上传', '分页', '标签页']],
    ['数据与流程', ['表格', '步骤条', '审核面板', '时间线', '指标卡', '图表']],
    ['状态', ['状态标签', '空状态', '异常状态', '无权限状态']],
    ['CDKEY 自助发行', ['任务 Tabs（4 态）', '授权摘要', 'Key 批次表单', '渠道 API 凭据', '接口说明', '帮助中心 FAQ']],
  ];
  const cards = groups.flatMap(([group, labels], groupIndex) => labels.map((label, labelIndex) => {
    const index = groups.slice(0, groupIndex).reduce((sum, item) => sum + item[1].length, 0) + labelIndex;
    const x = 160 + (index % 4) * 720;
    const y = 330 + Math.floor(index / 4) * 190;
    return `${text(x, y - 28, group, 16, '#667085', 650)}<g id="component-${safeId(label)}"><rect x="${x}" y="${y}" width="640" height="138" rx="20" fill="#FFFFFF" stroke="#D9E0EA" stroke-width="2"/>${text(x + 30, y + 50, label, 24, '#101828', 700)}${text(x + 30, y + 92, '跨业务页复用的可编辑组件 / 状态变体', 17, '#667085', 400)}<rect x="${x + 500}" y="${y + 36}" width="110" height="54" rx="12" fill="#DFF8FC" stroke="#2FD7EF" stroke-width="2"/>${text(x + 555, y + 70, '示例', 17, '#0B6271', 650)}</g>`;
  })).join('');
  return `<g id="components-master"><rect x="80" y="220" width="${4 * 720 - 80}" height="${Math.ceil(groups.reduce((sum, item) => sum + item[1].length, 0) / 4) * 190 + 80}" rx="32" fill="#F3F6FA" stroke="#CBD5E1" stroke-width="2"/>${cards}</g>`;
}

function componentStateGallery(variants) {
  const columns = 4;
  const gapX = 120;
  const gapY = 150;
  const left = 120;
  const top = 1840;
  const rows = Math.ceil(variants.length / columns);
  const defs = variants.map((item, index) => `<clipPath id="clip-component-state-${index}"><rect width="1440" height="900"/></clipPath>`).join('');
  const frames = variants.map((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = left + col * (viewport.width + gapX);
    const y = top + row * (viewport.height + gapY);
    const prefix = `component-state-${safeId(item.componentSet)}-${safeId(item.variant)}`;
    const shapes = item.extracted.rects.map((shape, shapeIndex) => renderRect(shape, prefix, shapeIndex)).join('');
    const texts = item.extracted.texts.map((label, textIndex) => renderText(label, prefix, textIndex)).join('');
    return `${text(x, y - 54, item.componentSet, 22, '#344054', 700)}${text(x, y - 22, item.variant, 17, '#667085', 600)}<g id="${prefix}" data-component-set="${escapeXml(item.componentSet)}" data-variant="${escapeXml(item.variant)}" transform="translate(${x} ${y})" clip-path="url(#clip-component-state-${index})"><rect id="${prefix}-background" width="1440" height="900" fill="#FFFFFF"/>${shapes}${texts}</g>`;
  }).join('');
  const width = left * 2 + columns * viewport.width + (columns - 1) * gapX;
  const height = top + rows * viewport.height + Math.max(0, rows - 1) * gapY + 120;
  return { defs, frames, width, height };
}

function renderBusinessFigmaPage(pageDefinition, section, extractedById) {
  const layout = horizontalPageLayout(section.frames);
  const width = layout.width;
  const defs = section.frames.map(frame => `<clipPath id="clip-figma-page-${frame.id}"><rect width="1440" height="900"/></clipPath>`).join('');
  const frames = section.frames.map((frame, index) => {
    const route = routes.find(item => item.id === frame.id);
    const extracted = extractedById.get(frame.id);
    const x = layout.left + index * (viewport.width + layout.gapX);
    const nodePrefix = `node-${frame.id}`;
    const shapes = extracted.rects.map((item, shapeIndex) => renderRect(item, nodePrefix, shapeIndex)).join('');
    const texts = extracted.texts.map((item, textIndex) => renderText(item, nodePrefix, textIndex)).join('');
    return `${text(x, layout.top - 34, `${frame.id}｜${frame.title}`, 22, '#344054', 700)}<g id="${frame.id}" data-frame-id="${frame.id}" data-role="${route.role}" data-template="${route.templateId}" transform="translate(${x} ${layout.top})" clip-path="url(#clip-figma-page-${frame.id})"><rect id="frame-bg-${frame.id}" width="1440" height="900" fill="#FFFFFF"/>${shapes}${texts}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" id="figma-page-${pageDefinition.id}" width="${width}" height="${layout.height}" viewBox="0 0 ${width} ${layout.height}"><defs>${defs}</defs><rect id="canvas-background-${pageDefinition.id}" width="${width}" height="${layout.height}" fill="#E7EBF1"/>${titleBar(pageDefinition.name, section.frames.length, width)}${frames}</svg>`;
}

function renderGlobalIndexFigmaPage(pageDefinition) {
  const modules = frameMap.sections.filter(section => section.kind === 'business');
  const width = 5840;
  const moduleCards = modules.map((section, index) => {
    const x = 160 + index * 1400;
    const labels = section.frames.map(frame => `${frame.id} ${frame.title}`).join('　');
    const pageName = figmaPageMap.pages.find(page => page.moduleId === section.moduleId)?.name || section.name;
    return `<g id="index-module-${section.id}"><rect x="${x}" y="280" width="1280" height="720" rx="28" fill="#FFFFFF" stroke="#D9E0EA" stroke-width="2"/>${text(x + 44, 360, pageName, 28, '#101828', 800)}${text(x + 44, 410, `${section.frames.length} 个业务页`, 18, '#667085', 500)}${text(x + 44, 500, labels, 17, '#344054', 500)}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" id="figma-page-${pageDefinition.id}" width="${width}" height="1160" viewBox="0 0 ${width} 1160"><rect id="canvas-background-${pageDefinition.id}" width="${width}" height="1160" fill="#E7EBF1"/>${titleBar(pageDefinition.name, 0, width)}${text(160, 230, '受邀开发者资料 → CDKEY 商品供给 → 包体测试发布 → 精准投放与发行数据', 22, '#344054', 600)}${moduleCards}</svg>`;
}

function renderComponentMasterFigmaPage(pageDefinition, variants) {
  const gallery = componentStateGallery(variants);
  return `<svg xmlns="http://www.w3.org/2000/svg" id="figma-page-${pageDefinition.id}" width="${gallery.width}" height="${gallery.height}" viewBox="0 0 ${gallery.width} ${gallery.height}"><defs>${gallery.defs}</defs><rect id="canvas-background-${pageDefinition.id}" width="${gallery.width}" height="${gallery.height}" fill="#E7EBF1"/>${titleBar(pageDefinition.name, 0, gallery.width)}${componentMasterSection()}${text(120, 1768, '业务状态组件集', 30, '#101828', 800)}${gallery.frames}</svg>`;
}

async function extractRoute(page, route, beforeExtract) {
  const targetUrl = routeUrl(route);
  if (page.url() === targetUrl) await page.reload({ waitUntil: 'load' });
  else await page.goto(targetUrl, { waitUntil: 'load' });
  const frame = page.locator('.product-frame[data-frame-id]').first();
  await frame.waitFor({ state: 'visible' });
  await page.addStyleTag({ content: '[data-review-only="true"] { display: none !important; } * { animation: none !important; transition: none !important; }' });
  if (route.id === 'P01-01') await page.locator('[data-onboarding-intro]').waitFor({ state: 'visible' });
  if (route.id === 'P02-01') await page.locator('[data-cdkey-panel="supply"]').waitFor({ state: 'visible' });
  if (beforeExtract) await beforeExtract(page);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return frame.evaluate(rootElement => {
    const rootRect = rootElement.getBoundingClientRect();
    const rects = [];
    const texts = [];
    const visible = (element, style, rect) => style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number.parseFloat(style.opacity || '1') > 0.01
      && rect.width > 0.5
      && rect.height > 0.5
      && rect.right > rootRect.left
      && rect.bottom > rootRect.top
      && rect.left < rootRect.right
      && rect.top < rootRect.bottom;
    const opacityOf = element => {
      let opacity = 1;
      let current = element;
      while (current && current !== rootElement.parentElement) {
        opacity *= Number.parseFloat(getComputedStyle(current).opacity || '1');
        current = current.parentElement;
      }
      return opacity;
    };
    const rgbaAlpha = color => {
      if (!color || color === 'transparent') return 0;
      const match = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/i);
      return match ? Number.parseFloat(match[1]) : 1;
    };
    const backgroundFill = style => {
      const image = style.backgroundImage || '';
      const linearStart = image.match(/linear-gradient\([^,]+,\s*(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i);
      return linearStart?.[1] || style.backgroundColor;
    };
    for (const element of [rootElement, ...rootElement.querySelectorAll('*')]) {
      if (element.closest('[data-review-only="true"]')) continue;
      if (element.matches('script,style,svg,svg *')) continue;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (!visible(element, style, rect)) continue;
      const background = backgroundFill(style);
      const borderWidth = Number.parseFloat(style.borderTopWidth || '0');
      const borderColor = style.borderTopColor;
      const hasFill = rgbaAlpha(background) > 0.01;
      const hasStroke = borderWidth > 0.01 && rgbaAlpha(borderColor) > 0.01 && style.borderTopStyle !== 'none';
      if (hasFill || hasStroke) {
        rects.push({
          x: Math.max(0, rect.left - rootRect.left),
          y: Math.max(0, rect.top - rootRect.top),
          width: Math.min(rootRect.width, rect.right - rootRect.left) - Math.max(0, rect.left - rootRect.left),
          height: Math.min(rootRect.height, rect.bottom - rootRect.top) - Math.max(0, rect.top - rootRect.top),
          radius: Number.parseFloat(style.borderTopLeftRadius || '0') || 0,
          fill: hasFill ? background : 'rgba(0,0,0,0)',
          stroke: hasStroke ? borderColor : 'rgba(0,0,0,0)',
          strokeWidth: hasStroke ? borderWidth : 0,
          opacity: opacityOf(element),
        });
      }
      if (element.matches('input:not([type="radio"]):not([type="checkbox"]), textarea, select')) {
        const value = element.matches('select')
          ? element.options[element.selectedIndex]?.textContent
          : (element.value || element.placeholder || '');
        if (String(value || '').trim()) {
          const fontSize = Number.parseFloat(style.fontSize || '14');
          texts.push({
            text: String(value).replace(/\s+/g, ' ').trim(),
            x: rect.left - rootRect.left + 12,
            y: rect.top - rootRect.top + Math.min(rect.height - 8, (rect.height + fontSize) / 2),
            fontFamily: style.fontFamily,
            fontSize,
            fontWeight: style.fontWeight,
            fill: style.color,
            opacity: opacityOf(element),
          });
        }
      }
    }
    const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (!parent || parent.closest('[data-review-only="true"]') || parent.closest('svg') || parent.matches('option')) {
        node = walker.nextNode();
        continue;
      }
      const style = getComputedStyle(parent);
      const parentRect = parent.getBoundingClientRect();
      if (!visible(parent, style, parentRect)) {
        node = walker.nextNode();
        continue;
      }
      const raw = node.textContent || '';
      if (!raw.trim()) {
        node = walker.nextNode();
        continue;
      }
      const lines = [];
      let active = null;
      for (let index = 0; index < raw.length; index += 1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const charRect = range.getBoundingClientRect();
        const char = raw[index];
        if (charRect.width < 0.01 || charRect.height < 0.01) continue;
        if (!active || Math.abs(active.top - charRect.top) > 2) {
          active = { top: charRect.top, left: charRect.left, bottom: charRect.bottom, text: '' };
          lines.push(active);
        }
        active.text += /\s/.test(char) ? ' ' : char;
        active.left = Math.min(active.left, charRect.left);
        active.bottom = Math.max(active.bottom, charRect.bottom);
      }
      const fontSize = Number.parseFloat(style.fontSize || '14');
      for (const line of lines) {
        const value = line.text.replace(/\s+/g, ' ').trim();
        if (!value) continue;
        texts.push({
          text: value,
          x: line.left - rootRect.left,
          y: line.top - rootRect.top + fontSize,
          fontFamily: style.fontFamily,
          fontSize,
          fontWeight: style.fontWeight,
          fill: style.color,
          opacity: opacityOf(parent),
        });
      }
      node = walker.nextNode();
    }
    return { rects, texts, width: rootRect.width, height: rootRect.height };
  });
}

async function main() {
  if (routes.length !== 37) throw new Error(`expected 37 routes, received ${routes.length}`);
  const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
  if (!executablePath) throw new Error('Chrome or Edge is required');
  fs.mkdirSync(pageDir, { recursive: true });
  fs.mkdirSync(sectionDir, { recursive: true });
  fs.mkdirSync(figmaPageDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
  const page = await browser.newPage({ viewport });
  const extractedById = new Map();
  let componentVariants = [];
  try {
    for (const route of routes) {
      const extracted = await extractRoute(page, route);
      if (Math.round(extracted.width) !== 1440 || Math.round(extracted.height) !== 900) {
        throw new Error(`${route.id}: extracted ${extracted.width}x${extracted.height}`);
      }
      extractedById.set(route.id, extracted);
      writeTextFile(path.join(pageDir, `${route.id}.svg`), `${renderPageSvg(route, extracted)}\n`);
    }
    const p01 = routes.find(route => route.id === 'P01-01');
    const p02 = routes.find(route => route.id === 'P02-01');
    const cdkeyVariants = [];
    for (const [index, variant] of ['Tab=Supply', 'Tab=KeyBatches', 'Tab=ChannelAPI', 'Tab=APIDocs'].entries()) {
      const extracted = index === 0
        ? extractedById.get('P02-01')
        : await extractRoute(page, p02, async currentPage => {
          await currentPage.locator(`[data-tab-index="${index}"]`).click();
          await currentPage.locator(`[data-cdkey-panel="${['supply', 'batches', 'credentials', 'api-docs'][index]}"]`).waitFor({ state: 'visible' });
        });
      cdkeyVariants.push({ componentSet: 'P02-01 / Task State', variant, extracted });
    }
    const login = await extractRoute(page, p01, async currentPage => {
      await currentPage.locator('[data-demo-action="start-onboarding"]').click();
      await currentPage.locator('[data-login-panel]').waitFor({ state: 'visible' });
    });
    const help = await extractRoute(page, p02, async currentPage => {
      await currentPage.locator('[data-help-open]').click();
      await currentPage.locator('[data-help-center]').waitFor({ state: 'visible' });
    });
    componentVariants = [
      ...cdkeyVariants,
      { componentSet: 'P01-01 / Onboarding', variant: 'Step=Intro', extracted: extractedById.get('P01-01') },
      { componentSet: 'P01-01 / Onboarding', variant: 'Step=Login', extracted: login },
      { componentSet: 'Global Help', variant: 'Global Help', extracted: help },
    ];
  } finally {
    await page.close();
    await browser.close();
  }

  let y = 1760;
  const layouts = frameMap.sections.filter(section => section.kind === 'business').map(section => {
    const layout = sectionLayout(section, y);
    y += layout.height + 140;
    return layout;
  });
  const canvasWidth = 4820;
  const canvasHeight = y + 80;
  const defs = layouts.flatMap(layout => layout.frames.map(frame => `<clipPath id="clip-combined-${frame.id}"><rect width="1440" height="900"/></clipPath>`)).join('');
  const sectionSvg = layouts.map(layout => {
    const pages = layout.frames.map((frame, index) => {
      const route = routes.find(item => item.id === frame.id);
      const extracted = extractedById.get(frame.id);
      const col = index % layout.columns;
      const row = Math.floor(index / layout.columns);
      const x = layout.x + layout.paddingX + col * (viewport.width + layout.gapX);
      const pageY = layout.y + layout.header + row * (viewport.height + layout.gapY);
      const nodePrefix = `node-${frame.id}`;
      const shapes = extracted.rects.map((item, shapeIndex) => renderRect(item, nodePrefix, shapeIndex)).join('');
      const texts = extracted.texts.map((item, textIndex) => renderText(item, nodePrefix, textIndex)).join('');
      return `${text(x, pageY - 34, frame.name, 22, '#344054', 700, `label-${frame.id}`)}<g id="${frame.id}" data-frame-id="${frame.id}" data-role="${route.role}" data-template="${route.templateId}" transform="translate(${x} ${pageY})" clip-path="url(#clip-combined-${frame.id})"><rect id="frame-bg-${frame.id}" width="1440" height="900" fill="#FFFFFF"/>${shapes}${texts}</g>`;
    }).join('');
    return `<g id="section-${layout.id}"><rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" rx="32" fill="#EEF2F7" stroke="#CBD5E1" stroke-width="2"/>${text(layout.x + 70, layout.y + 78, layout.name, 34, '#101828', 800)}${text(layout.x + 70, layout.y + 116, `${layout.frames.length} 个业务 Frame · 1440 × 900`, 19, '#667085', 400)}${pages}</g>`;
  }).join('');
  const combined = `<svg xmlns="http://www.w3.org/2000/svg" id="gamehub-developer-backend-phase1" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><defs>${defs}</defs><rect id="canvas-background" width="${canvasWidth}" height="${canvasHeight}" fill="#E7EBF1"/>${designSystemSection()}${sectionSvg}</svg>`;
  const combinedPath = path.join(sourceDir, 'gamehub-developer-backend-phase1.svg');
  writeTextFile(combinedPath, `${combined}\n`);

  const designSystemPath = path.join(sectionDir, '00-design-system-architecture.svg');
  const designSystem = `<svg xmlns="http://www.w3.org/2000/svg" id="section-00" width="4820" height="1660" viewBox="0 0 4820 1660"><rect id="canvas-background-00" width="4820" height="1660" fill="#E7EBF1"/>${designSystemSection()}</svg>`;
  writeTextFile(designSystemPath, `${designSystem}\n`);

  const sectionSources = [];
  for (const section of frameMap.sections.filter(item => item.kind === 'business')) {
    const layout = sectionLayout(section, 80);
    const sectionDefs = layout.frames.map(frame => `<clipPath id="clip-section-${frame.id}"><rect width="1440" height="900"/></clipPath>`).join('');
    const pages = layout.frames.map((frame, index) => {
      const route = routes.find(item => item.id === frame.id);
      const extracted = extractedById.get(frame.id);
      const col = index % layout.columns;
      const row = Math.floor(index / layout.columns);
      const x = layout.x + layout.paddingX + col * (viewport.width + layout.gapX);
      const pageY = layout.y + layout.header + row * (viewport.height + layout.gapY);
      const nodePrefix = `node-${frame.id}`;
      const shapes = extracted.rects.map((item, shapeIndex) => renderRect(item, nodePrefix, shapeIndex)).join('');
      const texts = extracted.texts.map((item, textIndex) => renderText(item, nodePrefix, textIndex)).join('');
      return `${text(x, pageY - 34, frame.name, 22, '#344054', 700)}<g id="${frame.id}" data-frame-id="${frame.id}" data-role="${route.role}" data-template="${route.templateId}" transform="translate(${x} ${pageY})" clip-path="url(#clip-section-${frame.id})"><rect id="frame-bg-${frame.id}" width="1440" height="900" fill="#FFFFFF"/>${shapes}${texts}</g>`;
    }).join('');
    const sectionWidth = layout.x + layout.width + 80;
    const sectionHeight = layout.y + layout.height + 80;
    const sectionSvg = `<svg xmlns="http://www.w3.org/2000/svg" id="section-${layout.id}" width="${sectionWidth}" height="${sectionHeight}" viewBox="0 0 ${sectionWidth} ${sectionHeight}"><defs>${sectionDefs}</defs><rect id="canvas-background-${layout.id}" width="${sectionWidth}" height="${sectionHeight}" fill="#E7EBF1"/><g id="section-${layout.id}-content"><rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" rx="32" fill="#EEF2F7" stroke="#CBD5E1" stroke-width="2"/>${text(layout.x + 70, layout.y + 78, layout.name, 34, '#101828', 800)}${text(layout.x + 70, layout.y + 116, `${layout.frames.length} 个业务 Frame · 1440 × 900`, 19, '#667085', 400)}${pages}</g></svg>`;
    const sectionFile = `${layout.id}-${safeId(layout.name)}.svg`;
    const sectionPath = path.join(sectionDir, sectionFile);
    writeTextFile(sectionPath, `${sectionSvg}\n`);
    sectionSources.push({ id: layout.id, name: layout.name, frameCount: layout.frames.length, svg: `sections/${sectionFile}` });
  }
  const figmaPages = [];
  for (const pageDefinition of figmaPageMap.pages) {
    let svg;
    let frameIds = [];
    if (pageDefinition.kind === 'index') {
      svg = renderGlobalIndexFigmaPage(pageDefinition);
    } else if (pageDefinition.kind === 'business') {
      const section = frameMap.sections.find(item => item.moduleId === pageDefinition.moduleId);
      if (!section) throw new Error(`missing business section for Figma page ${pageDefinition.id}`);
      frameIds = section.frames.map(frame => frame.id);
      svg = renderBusinessFigmaPage(pageDefinition, section, extractedById);
    } else if (pageDefinition.kind === 'components') {
      svg = renderComponentMasterFigmaPage(pageDefinition, componentVariants);
    } else {
      throw new Error(`unsupported Figma page kind: ${pageDefinition.kind}`);
    }
    const outputPath = path.join(sourceDir, pageDefinition.source);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    writeTextFile(outputPath, `${svg}\n`);
    figmaPages.push({
      id: pageDefinition.id,
      name: pageDefinition.name,
      kind: pageDefinition.kind,
      frameIds,
      svg: pageDefinition.source,
    });
  }
  const manifest = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    source: path.relative(root, combinedPath).replaceAll('\\', '/'),
    frameCount: routes.length,
    sectionCount: frameMap.sections.length,
    frameSize: viewport,
    canvas: { width: canvasWidth, height: canvasHeight },
    figmaPages,
    history: figmaPageMap.history,
    sectionSources: [
      { id: '00', name: 'Design System & Architecture', frameCount: 0, svg: 'sections/00-design-system-architecture.svg' },
      ...sectionSources,
    ],
    pages: routes.map(route => ({ id: route.id, title: route.title, role: route.role, templateId: route.templateId, svg: `pages/${route.id}.svg` })),
  };
  writeTextFile(path.join(sourceDir, 'source-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ combinedPath, ...manifest }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
