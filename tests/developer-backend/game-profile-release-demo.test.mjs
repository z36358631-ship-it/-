import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const demoFile = path.join(root, 'demos', '开发者后台一期', '06-游戏商品资料与发行范围demo.html');

test('Demo 06 为单路由离线 HTML，并覆盖资料线到发行申请的完整交接', () => {
  assert.equal(fs.existsSync(demoFile), true, 'Demo 06 文件尚未生成');
  const html = fs.readFileSync(demoFile, 'utf8');
  for (const content of [
    'P06-01',
    '发行准备',
    '游戏资料',
    '游戏资质',
    '商品与 SKU',
    '发行范围',
    '中国大陆发行资质',
    '提交平台人工复核',
    '常用市场',
    '版号申请中',
    '仅提交海外范围',
    '申请平台测试／发行',
    '企业认证',
    'PC 包体状态',
    '价格状态',
    'dev@xiaoji.com',
  ]) {
    assert.equal(html.includes(content), true, `Demo 06 缺少关键内容：${content}`);
  }
  assert.equal(/<script\s+[^>]*src=/i.test(html), false, 'Demo 06 不应加载外部脚本');
  assert.equal(/<link\s+[^>]*rel=["']stylesheet["']/i.test(html), false, 'Demo 06 不应加载外部样式');
  assert.equal(/<iframe\b/i.test(html), false, 'Demo 06 不应使用 iframe');
  assert.equal(/name=["']regions["']/i.test(html), false, '发行范围不应继续使用旧的大区复选框');
  for (const obsoleteRegion of ['北美', '欧洲', '东南亚']) {
    assert.equal(html.includes(`value="${obsoleteRegion}"`), false, `不应保留旧大区选项：${obsoleteRegion}`);
  }
});

test('Demo 06 不复制包体、价格与上下架编辑能力', () => {
  assert.equal(fs.existsSync(demoFile), true, 'Demo 06 文件尚未生成');
  const html = fs.readFileSync(demoFile, 'utf8');
  for (const forbidden of ['上传新 Build', '编辑价格', '立即上线', '下架游戏']) {
    assert.equal(html.includes(forbidden), false, `Demo 06 不应包含同事负责的编辑动作：${forbidden}`);
  }
});
