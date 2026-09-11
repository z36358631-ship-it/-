import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const demoDir = path.join(process.cwd(), 'demos', '开发者后台一期');
const outputs = [
  '发行平台运营后台demo.html',
  '开发者平台demo.html',
  '03-包体测试与发布demo.html',
  '04-精准投放与数据demo.html',
];
const developerAliases = ['01-开发者平台与资料demo.html', '02-游戏创建与发行demo.html', '02-CDKEY商品与供给demo.html'];
const developerRoutes = ['P01-01', 'P01-03', 'P02-01'];
const operationsRoutes = ['P01-08', 'P01-09', 'P01-10'];
const internalCopy = /开发者后台一期|评审工具|这是评审场景|示例厂商|首款签约游戏|example\.com|vendor_revision_002|当前页面内存|仅用于本次演示|演示服务|模拟下载|不发起真实请求|prdSource|prdHeading|sourceOfTruth|demo-password/i;

test('构建前验证 4 个 Demo 与最新 PRD 的 37 页契约一致', () => {
  const output = execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  assert.match(output, /Latest PRD contract verified: 4 documents, 10\/6\/13\/8 PRD page units; 37 demo routes \(10\/6\/13\/8\), version 2026-09-07-v2\.5\./);
  assert.match(output, /Built 4 public-facing self-contained HTML files with 27 routes; emitted 3 compatibility aliases\./);
});

test('开发者平台与运营后台可分别构建独立入口', () => {
  const p01Output = execFileSync(process.execPath, [path.join(demoDir, 'build.mjs'), '--module=01'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const p02Output = execFileSync(process.execPath, [path.join(demoDir, 'build.mjs'), '--module=02'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  for (const output of [p01Output, p02Output]) {
    assert.match(output, /Latest PRD contract verified: 2 documents, 10\/6 PRD page units;/);
    assert.match(output, /Built 1 public-facing self-contained HTML files with 3 routes;/);
  }
  assert.match(p01Output, /emitted 0 compatibility aliases\./);
  assert.match(p02Output, /emitted 3 compatibility aliases\./);
});

test('仅校验 outputs 中 4 个正式 HTML 自包含且可重复构建', () => {
  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], { stdio: 'pipe' });
  assert.equal(fs.existsSync(path.join(demoDir, '开发者后台一期总览demo.html')), false);
  assert.equal(new Set(outputs).size, 4);
  for (const alias of developerAliases) assert.equal(fs.existsSync(path.join(demoDir, alias)), true, alias);

  const first = new Map();
  for (const output of outputs) {
    assert.equal(fs.existsSync(path.join(demoDir, output)), true, output);
    const html = fs.readFileSync(path.join(demoDir, output), 'utf8');
    first.set(output, html);
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<style>[\s\S]+<\/style>/i);
    assert.match(html, /<script>[\s\S]+<\/script>/i);
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel=["']stylesheet["'][^>]+href=|<img[^>]+src=["']https?:\/\//i);
    assert.doesNotMatch(html, /<iframe|type=["']module["']/i);
    assert.doesNotMatch(html, internalCopy, output);
  }

  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], { stdio: 'pipe' });
  for (const output of outputs) {
    assert.equal(fs.readFileSync(path.join(demoDir, output), 'utf8'), first.get(output), output);
  }
  for (const alias of developerAliases) {
    assert.equal(fs.readFileSync(path.join(demoDir, alias), 'utf8'), fs.readFileSync(path.join(demoDir, outputs[1]), 'utf8'), alias);
  }
});

test('两个正式页面保留各自业务路由、共享组件与对外功能内容', () => {
  const operations = fs.readFileSync(path.join(demoDir, outputs[0]), 'utf8');
  const developer = fs.readFileSync(path.join(demoDir, outputs[1]), 'utf8');
  const p04 = fs.readFileSync(path.join(demoDir, outputs[3]), 'utf8');

  for (const component of ['Button', 'Input', 'StatusTag', 'NavItem']) {
    assert.match(developer, new RegExp(`data-component=["']${component}["']|["']data-component["']:\\s*["']${component}["']`), component);
  }
  for (const token of ['企业认证审核', '游戏发布审核', '游戏资质审核', '企业认证内容配置', '帮助中心']) assert.ok(operations.includes(token), token);
  for (const token of ['登录／注册', '使用盖世游戏账号登录', '后台项目名称', '游戏资料', '发行设置', '资质认证', '版本记录']) assert.ok(developer.includes(token), token);
  for (const html of [operations, developer]) {
    for (const runtime of ['PublisherAccessPolicy', 'PublisherAccountContext', 'PublisherGameProfile', 'PublisherGameReview']) {
      assert.ok(html.includes(runtime), runtime);
    }
  }
  for (const token of ['精准化投放与发行数据', 'Campaign／UTM 管理', '数据口径']) assert.ok(p04.includes(token), token);
});

test('开发者平台与运营后台公开隔离路由，四个正式 HTML 合计 27 个路由', () => {
  const routeIds = outputs.map(output => {
    const html = fs.readFileSync(path.join(demoDir, output), 'utf8');
    const match = html.match(/<textarea id="portal-routes"[^>]*>([\s\S]*?)<\/textarea>/i);
    assert.ok(match, output);
    return JSON.parse(match[1]).map(route => route.id);
  });
  assert.deepEqual(routeIds[0], operationsRoutes);
  assert.deepEqual(routeIds[1], developerRoutes);
  assert.deepEqual(routeIds.map(ids => ids.length), [3, 3, 13, 8]);
  assert.equal(routeIds.reduce((total, ids) => total + ids.length, 0), 27);
});
