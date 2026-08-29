import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = join(process.cwd(), 'src');
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html']);
const FORBIDDEN_IDENTIFIERS = /zhaoyun|nezha|adou|changban|hero_formed|battle-v5/i;
const FORBIDDEN_IMPORT = /(?:from\s*|import\s*)['"][^'"]*nezha-chen-tang-demo[^'"]*['"]/i;

async function collectTextFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectTextFiles(path);
      return TEXT_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

describe('isolated graybox source', () => {
  it('contains no legacy identifiers or imports', async () => {
    const violations: string[] = [];
    for (const file of await collectTextFiles(SOURCE_ROOT)) {
      const source = await readFile(file, 'utf8');
      if (FORBIDDEN_IDENTIFIERS.test(source) || FORBIDDEN_IMPORT.test(source)) {
        violations.push(relative(process.cwd(), file));
      }
    }

    expect(violations).toEqual([]);
  });
});
