import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const cases = [
  {
    file: path.join(root, 'index.html'),
    expected: 'href="demos/开发者后台一期/01-开发者平台与资料demo.html#/P01-01"',
  },
  {
    file: path.join(root, '官网改动', 'index.html'),
    expected: 'href="../demos/开发者后台一期/01-开发者平台与资料demo.html#/P01-01"',
  },
];

for (const item of cases) {
  test(`${path.relative(root, item.file)} 的开发者平台入口指向一期登录页`, () => {
    const html = fs.readFileSync(item.file, 'utf8');
    assert.ok(html.includes(item.expected));
    assert.equal(html.includes('developer-screens.html?page=developer-login'), false);
  });
}
