import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const prd1 = fs.readFileSync('prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md', 'utf8');
const prd2 = fs.readFileSync('prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md', 'utf8');

test('PRD1 将介绍并入 P01-01 且帮助中心不增加业务路由', () => {
  for (const token of ['盖世发行合作说明', '四步流程', '准备事项', '开始入驻', '全局帮助中心', '不计入 9 个业务页面']) {
    assert.ok(prd1.includes(token), token);
  }
  assert.ok(prd1.includes('不新增公众注册入口'));
});

test('PRD2 定义四 Tab、自助权限和渠道 API 安全边界', () => {
  for (const token of [
    '商品与供给', 'Key 批次', '渠道 API', '接口说明',
    'gamehub_generated', 'external_imported', 'client_secret',
    'POST /openapi/v1/cdkeys/allocate',
    'GET /openapi/v1/cdkeys/allocations/{request_id}',
    'POST /openapi/v1/cdkeys/allocations/{request_id}/confirm',
    'HMAC-SHA256', '幂等', '一次性下载',
  ]) assert.ok(prd2.includes(token), token);
  assert.ok(!prd2.includes('开发者只读查看自身游戏结果'));
});
