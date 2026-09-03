import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const prd1 = fs.readFileSync('prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md', 'utf8');
const prd2 = fs.readFileSync('prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md', 'utf8');

test('PRD1 定义独立账号密码与盖世第三方双登录，并将开发者介绍并入注册流程', () => {
  for (const token of ['账号／邮箱', '忘记密码', '使用盖世游戏账号登录', '二维码', '自动创建独立 `account_id`', '开发者注册与厂商资料页', '共 10 个业务页面']) {
    assert.ok(prd1.includes(token), token);
  }
  assert.ok(prd1.includes('不展示独立注册按钮'));
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
