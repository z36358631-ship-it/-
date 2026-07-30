import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readUtf8(root, relativePath) {
  try {
    return await readFile(resolve(root, relativePath), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function validateRules(root, rules) {
  const errors = [];

  for (const rule of rules) {
    const content = await readUtf8(root, rule.path);
    if (content === null) {
      errors.push(`${rule.path}: file not found`);
      continue;
    }

    for (const pattern of rule.required ?? []) {
      if (!pattern.test(content)) {
        errors.push(`${rule.path}: missing ${pattern}`);
      }
    }

    for (const pattern of rule.forbidden ?? []) {
      if (pattern.test(content)) {
        errors.push(`${rule.path}: forbidden ${pattern}`);
      }
    }
  }

  return errors;
}

export async function validateCsvHeader(root, relativePath, expectedColumns) {
  const content = await readUtf8(root, relativePath);
  if (content === null) return [`${relativePath}: file not found`];

  const firstLine = content.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0];
  return firstLine === expectedColumns.join(',')
    ? []
    : [`${relativePath}: CSV header mismatch`];
}
