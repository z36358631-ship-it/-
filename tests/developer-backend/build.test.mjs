import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const demoDir = path.join(process.cwd(), 'demos', '开发者后台一期');
const outputs = [
  '开发者后台一期总览demo.html',
  '01-开发者平台与资料demo.html',
  '02-CDKEY商品与供给demo.html',
  '03-包体测试与发布demo.html',
  '04-精准投放与数据demo.html',
];

test('构建前验证 Demo 与 4 份最新 PRD 的页面契约一致', () => {
  const output = execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  assert.match(
    output,
    /Latest PRD contract verified: 4 documents, 37 pages \(10\/6\/13\/8\), version 2026-09-03\./,
  );
});

test('构建 5 个完全自包含 HTML 且结果可重复', () => {
  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], { stdio: 'pipe' });
  const first = new Map();
  for (const output of outputs) {
    const html = fs.readFileSync(path.join(demoDir, output), 'utf8');
    first.set(output, html);
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<style>[\s\S]+<\/style>/i);
    assert.match(html, /<script>[\s\S]+<\/script>/i);
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel=["']stylesheet["'][^>]+href=|<img[^>]+src=["']https?:\/\//i);
    assert.doesNotMatch(html, /<iframe|type=["']module["']/i);
    assert.doesNotMatch(html, /localStorage|sessionStorage/i);
  }
  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], { stdio: 'pipe' });
  for (const output of outputs) {
    assert.equal(fs.readFileSync(path.join(demoDir, output), 'utf8'), first.get(output), output);
  }
});

test('构建产物包含总览索引、Hash 路由和共享组件契约', () => {
  const overview = fs.readFileSync(path.join(demoDir, outputs[0]), 'utf8');
  assert.match(overview, /37 个业务页/);
  for (const label of ['开发者', '发行运营', '测试人员']) assert.match(overview, new RegExp(label));
  const html = fs.readFileSync(path.join(demoDir, outputs[1]), 'utf8');
  assert.match(html, /#\/P01-02\?role=developer&amp;state=default|#\/P01-02\?role=developer&state=default/);
  for (const component of ['Button', 'Input', 'StatusTag', 'NavItem']) {
    assert.match(html, new RegExp(`data-component=["']${component}["']|["']data-component["']:\\s*["']${component}["']`), component);
  }
  assert.match(html, /class=["'][^"']*review-tools/);
  assert.match(html, /class=["'][^"']*product-frame/);
  assert.match(html, /data-frame-id/);
});

test('CDKEY 自助与帮助内容进入离线构建产物且没有远程依赖', () => {
  const p01 = fs.readFileSync(path.join(demoDir, '01-开发者平台与资料demo.html'), 'utf8');
  const p02 = fs.readFileSync(path.join(demoDir, '02-CDKEY商品与供给demo.html'), 'utf8');
  for (const token of ['账号密码登录', '使用盖世游戏账号登录', '二维码已失效', '帮助中心']) assert.ok(p01.includes(token), token);
  for (const token of ['Key 批次', '渠道 API', '接口说明', 'HMAC-SHA256']) assert.ok(p02.includes(token), token);
  for (const html of [p01, p02]) {
    assert.doesNotMatch(html, /<script[^>]+src=/i);
    assert.doesNotMatch(html, /<link[^>]+href=/i);
    assert.doesNotMatch(html, /https?:\/\/[^\s"'<]+\.(?:js|css|woff2?)/i);
  }
});
