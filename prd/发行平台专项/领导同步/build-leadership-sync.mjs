import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(currentDir, 'deck-data.json');
const outputFile = path.join(currentDir, 'leadership-sync.html');
const deck = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const statusById = new Map(deck.statusLegend.map(item => [item.id, item]));

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const statusLabel = (status, short = false) => {
  const item = statusById.get(status);
  return item ? (short ? item.shortLabel : item.label) : status;
};

const renderStatusBadge = (status, short = false) => `
  <span class="status-badge status-${escapeHtml(status)}">
    <span class="status-dot" aria-hidden="true"></span>
    ${escapeHtml(statusLabel(status, short))}
  </span>`;

const renderLegend = ({ compact = false } = {}) => `
  <div class="status-legend${compact ? ' is-compact' : ''}" aria-label="交付状态图例">
    ${deck.statusLegend.map(item => renderStatusBadge(item.id, compact)).join('')}
  </div>`;

const renderHeader = (slide, index) => `
  <header class="slide-header">
    <div class="slide-heading">
      <div class="slide-eyebrow">${escapeHtml(slide.subtitle)}</div>
      <h1 class="slide-title">${escapeHtml(slide.title)}</h1>
      <p class="slide-conclusion">${escapeHtml(slide.conclusion)}</p>
    </div>
    <div class="slide-index" aria-label="第 ${index + 1} 页，共 ${deck.slides.length} 页">
      <span>${String(index + 1).padStart(2, '0')}</span><i></i><small>${String(deck.slides.length).padStart(2, '0')}</small>
    </div>
  </header>`;

const renderFooter = (slide, index) => `
  <footer class="slide-footer">
    <span>${escapeHtml(deck.deckNote)}</span>
    <span>${escapeHtml(deck.version)} · ${escapeHtml(slide.id)} · ${String(index + 1).padStart(2, '0')}/${String(deck.slides.length).padStart(2, '0')}</span>
  </footer>`;

const renderFlowNode = node => `
  <div class="flow-node flow-${escapeHtml(node.flow)}${node.compact ? ' is-compact' : ''}">
    <span>${escapeHtml(node.text).replace(/\n/g, '<br />')}</span>
  </div>`;

const renderSwimlane = (slide, index) => {
  const grid = [
    '<div class="lane-corner"><b>核心交付</b><span>正向推进 →</span></div>',
    ...slide.stages.map(stage => `
      <div class="stage-head">
        <span>${escapeHtml(stage.number)}</span>
        <strong>${escapeHtml(stage.label)}</strong>
      </div>`)
  ];

  for (const lane of slide.lanes) {
    grid.push(`
      <div class="lane-head lane-${escapeHtml(lane.id)}">
        <strong>${escapeHtml(lane.label)}</strong>
        <span>${escapeHtml(lane.role)}</span>
      </div>`);

    lane.cells.forEach((cell, stageIndex) => {
      grid.push(`
        <div class="flow-cell lane-${escapeHtml(lane.id)}${stageIndex === lane.cells.length - 1 ? ' is-last' : ''}">
          <div class="flow-cell-line" aria-hidden="true"></div>
          <div class="flow-node-list">${cell.map(renderFlowNode).join('')}</div>
        </div>`);
    });
  }

  return `
    <section class="leadership-slide slide-swimlane" id="${escapeHtml(slide.id)}" data-slide-id="${escapeHtml(slide.id)}">
      ${renderHeader(slide, index)}
      <div class="swimlane-meta">
        <div class="flow-legend" aria-label="流程线图例">
          <span class="flow-key core"><i></i>${escapeHtml(deck.flowLegend[0].label)}</span>
          <span class="flow-key feedback"><i></i>${escapeHtml(deck.flowLegend[1].label)}</span>
        </div>
      </div>
      <div class="swimlane-grid">${grid.join('')}</div>
      <div class="return-track">
        <span class="return-arrow" aria-hidden="true"></span>
        <strong>结果／数据回流</strong>
        <span>${escapeHtml(slide.returnTrack)}</span>
      </div>
      ${renderFooter(slide, index)}
    </section>`;
};

const renderScreen = (item, { compact = false } = {}) => `
  <article class="screen-card${compact ? ' is-compact' : ''}">
    <header class="screen-card-header">
      <span class="screen-number">${escapeHtml(item.number)}</span>
      <h3 class="screen-title">${escapeHtml(item.title)}</h3>
      ${renderStatusBadge(item.status, true)}
    </header>
    <div class="screen-frame">
      <span class="screen-placeholder">当前 Demo 截图生成中</span>
      <img src="assets/screens/${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
    </div>
    <p class="screen-caption">${escapeHtml(item.caption)}</p>
    ${item.route ? `<p class="screen-route">${escapeHtml(item.route)}</p>` : ''}
  </article>`;

const renderCallouts = callouts => {
  if (!callouts?.length) return '';
  return `
    <div class="slide-callouts">
      ${callouts.map(item => `
        <div class="slide-callout status-${escapeHtml(item.status)}">
          ${renderStatusBadge(item.status, true)}
          <span>${escapeHtml(item.text)}</span>
        </div>`).join('')}
    </div>`;
};

const renderEvidence = (slide, index) => `
  <section class="leadership-slide slide-evidence" id="${escapeHtml(slide.id)}" data-slide-id="${escapeHtml(slide.id)}">
    ${renderHeader(slide, index)}
    <div class="evidence-grid">${slide.screens.map(item => renderScreen(item)).join('')}</div>
    ${renderCallouts(slide.callouts)}
    ${slide.footnote ? `<div class="slide-footnote"><strong>口径</strong><span>${escapeHtml(slide.footnote)}</span></div>` : ''}
    ${renderFooter(slide, index)}
  </section>`;

const renderScopeGroup = group => `
  <article class="scope-group status-${escapeHtml(group.status)}">
    <header>${renderStatusBadge(group.status)}</header>
    <ul>${group.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  </article>`;

const renderScope = (slide, index) => `
  <section class="leadership-slide slide-scope" id="${escapeHtml(slide.id)}" data-slide-id="${escapeHtml(slide.id)}">
    ${renderHeader(slide, index)}
    <div class="scope-layout">
      <div class="scope-evidence">
        <div class="section-kicker"><span>运营审核证据</span><em>4 个关键控制面</em></div>
        <div class="scope-screen-grid">${slide.screens.map(item => renderScreen(item, { compact: true })).join('')}</div>
      </div>
      <aside class="scope-boundary">
        <div class="section-kicker"><span>交付状态</span><em>目标形态 ≠ 已上线</em></div>
        <div class="scope-group-grid">${slide.scopeGroups.map(renderScopeGroup).join('')}</div>
      </aside>
    </div>
    ${renderFooter(slide, index)}
  </section>`;

const renderCertification = (slide, index) => `
  <section class="leadership-slide slide-certification" id="${escapeHtml(slide.id)}" data-slide-id="${escapeHtml(slide.id)}">
    ${renderHeader(slide, index)}
    <div class="cert-steps" aria-label="企业认证六步流程">
      ${slide.steps.map((step, stepIndex) => `
        <div class="cert-step${stepIndex === slide.steps.length - 1 ? ' is-last' : ''}">
          <span>${escapeHtml(step.number)}</span>
          <strong>${escapeHtml(step.label)}</strong>
          ${stepIndex > 0 ? `<em>${escapeHtml(step.action)}</em>` : '<em>开始</em>'}
        </div>`).join('')}
    </div>
    <div class="cert-screen-grid">${slide.screens.map(item => renderScreen(item, { compact: true })).join('')}</div>
    <div class="cert-exceptions">
      <strong>${escapeHtml(slide.successNote)}</strong>
      ${slide.exceptions.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
    </div>
    ${renderFooter(slide, index)}
  </section>`;

const renderers = {
  swimlane: renderSwimlane,
  evidence: renderEvidence,
  scope: renderScope,
  certification: renderCertification
};

const slideMarkup = deck.slides.map((slide, index) => {
  const renderer = renderers[slide.type];
  if (!renderer) throw new Error(`Unsupported slide type: ${slide.type}`);
  return renderer(slide, index);
}).join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${deck.canvas.width}, initial-scale=1" />
  <title>${escapeHtml(deck.deckTitle)}｜领导同步</title>
  <link rel="stylesheet" href="leadership-sync.css" />
</head>
<body>
  <main class="deck" aria-label="${escapeHtml(deck.deckTitle)}领导同步材料">
${slideMarkup}
  </main>
</body>
</html>
`;

const normalizedHtml = html.replace(/[ \t]+$/gm, '');
fs.writeFileSync(outputFile, normalizedHtml, 'utf8');
console.log(`Built ${deck.slides.length} leadership slides.`);
