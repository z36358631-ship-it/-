import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const files = {
  demo06: path.join(demoDir, '06-游戏创建与发行资料demo.html'),
  demo07: path.join(demoDir, '07-开发接入与资源中心demo.html'),
  demo08: path.join(demoDir, '08-消息通知中心demo.html'),
};

test('三份 Demo 均为单文件离线 HTML', () => {
  for (const [name, file] of Object.entries(files)) {
    assert.equal(fs.existsSync(file), true, `${name} 未生成`);
    const html = fs.readFileSync(file, 'utf8');
    assert.equal(/<script\s+[^>]*src=/i.test(html), false, `${name} 不应加载外部脚本`);
    assert.equal(/<link\s+[^>]*rel=["']stylesheet/i.test(html), false, `${name} 不应加载外部样式`);
    assert.equal(/<iframe\b/i.test(html), false, `${name} 不应使用 iframe`);
    assert.match(html, /@media \(max-width: 720px\)/, `${name} 缺少手机布局`);
    assert.match(html, /gamehub\.developer\.next\.v1/, `${name} 未包含共享上下文`);
  }
});

test('Demo 06 只覆盖游戏创建与发行资料', () => {
  const html = fs.readFileSync(files.demo06, 'utf8');
  for (const value of ['P06-01','P06-02','P06-03','P06-04','P06-05','P06-06','P06-07','P06-08','P06-09','P06-10','新建游戏','商店展示资料','游戏资质','发行范围','合同状态','资质状态将纳入运营审核','不影响测试或发行申请','要求补充']) {
    assert.ok(html.includes(value), `Demo 06 缺少：${value}`);
  }
  for (const value of ['新增商品','编辑价格','提交审核快照','仅提交海外范围','申请平台测试／发行','上传新 Build','立即上线','下架游戏']) {
    assert.equal(html.includes(value), false, `Demo 06 越界：${value}`);
  }
});

test('Demo 07 覆盖接入、凭据、账号、文档和资源发布', () => {
  const html = fs.readFileSync(files.demo07, 'utf8');
  for (const value of ['P07-01','P07-02','P07-03','P07-04','P07-05','P07-06','P07-07','接入概览','APPID 与环境','测试账号与权限','开发文档','下载中心','SDK 资源管理','重置 API 密钥','保存草稿','发布','下线']) {
    assert.ok(html.includes(value), `Demo 07 缺少：${value}`);
  }
  for (const value of ['docs.example.invalid','上传游戏包体','创建测试任务','API 调用监控','CI/CD 配置']) {
    assert.equal(html.includes(value), false, `Demo 07 越界或含无效内容：${value}`);
  }
});

test('Demo 08 只展示消息并管理系统公告', () => {
  const html = fs.readFileSync(files.demo08, 'utf8');
  for (const value of ['P08-01','P08-02','P08-03','P08-04','消息通知中心','全部消息','未读消息','全部标为已读','消息详情','系统公告','新建公告','中文','English','草稿','发布','下线']) {
    assert.ok(html.includes(value), `Demo 08 缺少：${value}`);
  }
  for (const value of ['修改审核结果','重新发布游戏','调整结算金额','通知模板配置','订阅偏好']) {
    assert.equal(html.includes(value), false, `Demo 08 越界：${value}`);
  }
});
