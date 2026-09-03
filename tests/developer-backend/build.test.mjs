import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const demoDir = path.join(process.cwd(), 'demos', '开发者后台一期');
const outputs = [
  '01-开发者平台与资料demo.html',
  '02-CDKEY商品与供给demo.html',
  '03-包体测试与发布demo.html',
  '04-精准投放与数据demo.html',
];
const internalCopy = /开发者后台一期|评审工具|这是评审场景|示例厂商|首款签约游戏|example\.com|_demo_|demo-|fixture|vendor_revision_002|当前页面内存|仅用于本次演示|演示服务|模拟下载|不发起真实请求|prdSource|prdHeading|sourceOfTruth|data-review|data-frame-id|data-template-id|demo-password|一期/i;

test('构建前验证 4 个 Demo 与最新 PRD 的 37 页契约一致', () => {
  const output = execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  assert.match(output, /Latest PRD contract verified: 4 documents, 37 pages \(10\/6\/13\/8\), version 2026-09-03\./);
  assert.match(output, /Built 4 public-facing self-contained HTML files with 37 routes\./);
});

test('只交付 4 个自包含、可重复构建的正式 HTML', () => {
  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], { stdio: 'pipe' });
  assert.equal(fs.existsSync(path.join(demoDir, '开发者后台一期总览demo.html')), false);
  const actual = fs.readdirSync(demoDir).filter(file => file.endsWith('demo.html')).sort();
  assert.deepEqual(actual, [...outputs].sort());

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
    assert.doesNotMatch(html, internalCopy, output);
  }

  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], { stdio: 'pipe' });
  for (const output of outputs) {
    assert.equal(fs.readFileSync(path.join(demoDir, output), 'utf8'), first.get(output), output);
  }
});

test('正式页面保留业务路由、共享组件与对外功能内容', () => {
  const p01 = fs.readFileSync(path.join(demoDir, outputs[0]), 'utf8');
  const p02 = fs.readFileSync(path.join(demoDir, outputs[1]), 'utf8');
  const p04 = fs.readFileSync(path.join(demoDir, outputs[3]), 'utf8');

  for (const component of ['Button', 'Input', 'StatusTag', 'NavItem']) {
    assert.match(p01, new RegExp(`data-component=["']${component}["']|["']data-component["']:\\s*["']${component}["']`), component);
  }
  for (const token of ['账号密码登录', '使用盖世游戏账号登录', '未注册的账号将在登录时自动注册。', '帮助中心']) assert.ok(p01.includes(token), token);
  for (const token of ['Key 批次', '渠道 API', '接口说明', 'HMAC-SHA256', '下载 CSV']) assert.ok(p02.includes(token), token);
  for (const token of ['精准化投放与发行数据', 'Campaign／UTM 管理', '数据口径']) assert.ok(p04.includes(token), token);
});
