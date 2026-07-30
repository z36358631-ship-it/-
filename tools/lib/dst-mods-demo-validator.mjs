import { readFile } from 'node:fs/promises';

const requiredText = [
  'DEMO_MODEL_VERSION',
  'dst_mods_demo_v1',
  'steam:322330',
  'device_installation_id',
  'task_id',
  'source_unknown',
  'paused_by_system',
  'loaded_match',
  '__DST_MODS_DEMO__'
];

const oldScope = [
  /GTA\s*5/i,
  /上古卷轴/,
  /排行榜/,
  /点赞/,
  /收藏/,
  />\s*Mod\s*中心\s*</i
];

const externalPatterns = [
  /<(?:script|link|img)\b[^>]*(?:src|href)\s*=\s*["']https?:\/\//i,
  /url\(\s*["']?https?:\/\//i,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /<iframe\b/i
];

export async function validateStandaloneDemo(file) {
  const content = await readFile(file, 'utf8');
  const errors = [];
  for (const pattern of externalPatterns) {
    if (pattern.test(content)) errors.push(`${file}: external resource ${pattern}`);
  }
  for (const pattern of oldScope) {
    if (pattern.test(content)) errors.push(`${file}: old scope ${pattern}`);
  }
  for (const text of requiredText) {
    if (!content.includes(text)) errors.push(`${file}: missing ${text}`);
  }
  return errors;
}

export async function validateSharedContract(files) {
  const versions = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const match = content.match(/DEMO_MODEL_VERSION\s*=\s*['"]([^'"]+)['"]/);
    versions.push(match?.[1] ?? 'missing');
  }
  return new Set(versions).size === 1
    ? []
    : [`model version mismatch: ${versions.join(', ')}`];
}
