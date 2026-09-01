const path = require('path');
const { chromium } = require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const pages = {
  'version-list': ['待现状盘点后定稿','当前线上版本','测试不通过','创建版本','单正式分支'],
  'version-editor': ['待现状盘点后定稿','版本号','更新说明','启动文件','启动参数','必要运行说明','保存草稿','上传包体'],
  'build-upload': ['待现状盘点后定稿','上传中断','继续上传','重新上传','上传失败不生成可测试版本'],
  'submit-test': ['提交测试确认','重复提交','测试中','确认提交测试'],
  'test-rejection': ['测试不通过','问题说明','重新提交','第 2 轮测试任务'],
  'test-task-list': ['测试工作台','只看分配给我','第 2 轮','发布权限'],
  'test-task-detail': ['获取测试包体','当前轮次','轮次记录','提交测试结果'],
  'test-result': ['测试通过','测试不通过','问题说明','提交不通过结果'],
  'ops-version-list': ['发行运营后台','属于签约项目','测试通过','版本审核'],
  'ops-version-detail': ['待发布前置','第 2 轮通过','设为待发布','操作记录'],
  'release-list': ['待发布列表','立即／定时发布','撤回版本','发布失败保护'],
  'release-config': ['立即发布','定时发布','当前线上版本','失败处理'],
  'live-disposal': ['下架游戏','暂停下载','暂停启动','开发者平台状态']
};
const developerPages = new Set(['version-list','version-editor','build-upload','submit-test','test-rejection']);
const testerPages = new Set(['test-task-list','test-task-detail','test-result']);

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const screens = path.resolve(__dirname, 'build-release-screens.html').replaceAll('\\', '/');
    for (const [pageKey, required] of Object.entries(pages)) {
      const page = await browser.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 1 });
      await page.goto(`file:///${screens}?page=${pageKey}`, { waitUntil: 'load' });
      const bodyText = await page.locator('body').innerText();
      const missing = required.filter((text) => !bodyText.includes(text));
      if (missing.length) throw new Error(`${pageKey} missing text: ${missing.join(', ')}`);

      const buttons = await page.locator('button').allTextContents();
      if (developerPages.has(pageKey) && buttons.some((text) => /发布|回滚|下架|暂停/.test(text))) {
        throw new Error(`${pageKey} exposes platform operation to developer: ${buttons.join(' / ')}`);
      }
      if (testerPages.has(pageKey) && buttons.some((text) => /发布|回滚|下架|撤回|暂停/.test(text))) {
        throw new Error(`${pageKey} exposes platform operation to tester: ${buttons.join(' / ')}`);
      }

      const outOfBounds = await page.locator('body *').evaluateAll((elements) => elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return [];
        if (rect.left < -0.5 || rect.top < -0.5 || rect.right > 1800.5 || rect.bottom > 1100.5) {
          return [{ tag: element.tagName, className: element.className, text: (element.textContent || '').trim().slice(0, 40), rect: rect.toJSON() }];
        }
        return [];
      }));
      if (outOfBounds.length) throw new Error(`${pageKey} out of bounds: ${JSON.stringify(outOfBounds.slice(0, 3))}`);
      console.log(`${pageKey}: content, role actions and bounds PASS`);
      await page.close();
    }

    const flow = await browser.newPage({ viewport: { width: 3200, height: 1000 }, deviceScaleFactor: 1 });
    const flowPath = path.resolve(__dirname, '04-build-release-flow.html').replaceAll('\\', '/');
    await flow.goto(`file:///${flowPath}`, { waitUntil: 'load' });
    const flowText = await flow.locator('body').innerText();
    const flowRequired = ['创建正式版本','上传 Windows 包体','测试人员取包','测试不通过与新轮次','测试通过','立即或定时发布','发布失败保护','用户获得新版本','重大问题','暂停下载或启动入口'];
    const flowMissing = flowRequired.filter((text) => !flowText.includes(text));
    if (flowMissing.length) throw new Error(`flow missing text: ${flowMissing.join(', ')}`);
    const flowDims = await flow.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
    if (flowDims.width !== 3200 || flowDims.height !== 1000) throw new Error(`flow overflow: ${JSON.stringify(flowDims)}`);
    console.log('04-build-release-flow: branches, user result and bounds PASS');
    await flow.close();
  } finally {
    await browser.close();
  }
})();
