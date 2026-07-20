import fs from 'node:fs';
import vm from 'node:vm';

const file = 'demos/社区/社区文章与马甲号运营后台demo.html';
const html = fs.readFileSync(file, 'utf8');
const required = [
  'page-official-post',
  'page-vest-account',
  'page-log',
  'article-editor-workspace',
  'editor-vest-selector',
  'content-type-tabs',
  'phone-preview',
  'copyArticle',
  'useVestToPublish',
  'switchEditorContentType',
  'validateArticle',
  'syncArticlePreview',
  'submitArticle',
  'renderArticleTable',
  'renderVestTable',
  'renderAuditTable'
];

for (const token of required) {
  if (!html.includes(token)) {
    throw new Error(`Missing required token: ${token}`);
  }
}

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]);

if (scripts.length === 0) {
  throw new Error('No inline scripts found');
}

for (const [index, source] of scripts.entries()) {
  new vm.Script(source, { filename: `${file}#script-${index + 1}` });
}

const forbidden = ['批量点赞', '批量评论', '批量转发', '自动定时互动'];
for (const text of forbidden) {
  const executablePattern = new RegExp(`onclick=["'][^"']*${text}`, 'i');
  if (executablePattern.test(html)) {
    throw new Error(`Forbidden executable capability found: ${text}`);
  }
}

const forbiddenStructure = [
  'id="ops-menu-drafts"',
  'id="page-drafts"',
  'id="ops-menu-risk"',
  'id="page-risk"',
  'id="acting-identity-bar"',
  'onclick="saveDraft()"'
];

for (const token of forbiddenStructure) {
  if (html.includes(token)) {
    throw new Error(`Removed structure still exists: ${token}`);
  }
}

console.log(`PASS: community operations structure validated (${required.length} tokens, ${scripts.length} scripts)`);
