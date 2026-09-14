# 开发者平台财务整合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 新建一个统一开发者平台单文件 Demo，在不修改原两个交付 HTML 的前提下接入财务主体、对账结算和对账流水。

**Architecture:** 现有开发者平台继续作为唯一应用壳。构建脚本增加 finance-integrated 变体，只在新输出中注入三个财务路由、财务样式和财务运行时；财务状态挂在现有会话内存的 finance 域。经营数据和厂商设置通过同一 Router 进入财务页面，不再外跳。

**Tech Stack:** Node.js ESM 构建、离线单文件 HTML、原生 CSS、原生 JavaScript、node:test、Playwright。

---

### Task 1: 增加整合版构建目标

**Files:**
- Modify: demos/开发者后台一期/build.mjs
- Modify: tests/developer-backend/build.test.mjs
- Create: demos/开发者后台一期/src/finance-routes.json
- Create: demos/开发者后台一期/src/finance-pages.json

- [ ] **Step 1: 写构建失败用例**

在 build.test.mjs 增加：

    test('按变体生成独立财务整合版且不覆盖原输出', () => {
      const original = fs.readFileSync(path.join(demoDir, '开发者平台demo.html'));
      const output = execFileSync(process.execPath, [
        path.join(demoDir, 'build.mjs'),
        '--module=02',
        '--variant=finance-integrated',
      ], { encoding:'utf8' });
      assert.match(output, /Built developer finance integration/);
      const integratedFile = path.join(demoDir, '开发者平台财务整合demo.html');
      const html = fs.readFileSync(integratedFile, 'utf8');
      assert.match(html, /P15-01/);
      assert.match(html, /P15-02/);
      assert.match(html, /P15-03/);
      assert.doesNotMatch(html, /<iframe/i);
      assert.deepEqual(fs.readFileSync(path.join(demoDir, '开发者平台demo.html')), original);
    });

- [ ] **Step 2: 运行用例并确认失败**

Run:

    node --test tests/developer-backend/build.test.mjs

Expected: FAIL，原因是 build.mjs 尚不识别 finance-integrated，且新 HTML 不存在。

- [ ] **Step 3: 建立整合版路由和页面数据**

finance-routes.json 固定为：

    [
      {"id":"P15-01","moduleId":"02","templateId":"FINANCE","role":"developer","title":"财务主体"},
      {"id":"P15-02","moduleId":"02","templateId":"FINANCE","role":"developer","title":"对账结算"},
      {"id":"P15-03","moduleId":"02","templateId":"FINANCE","role":"developer","title":"对账流水"}
    ]

finance-pages.json 固定为：

    {
      "P15-01":{"summary":"","status":"已生效","primaryAction":""},
      "P15-02":{"summary":"","status":"","primaryAction":""},
      "P15-03":{"summary":"","status":"","primaryAction":""}
    }

- [ ] **Step 4: 实现 build.mjs 变体**

在参数区增加：

    const requestedVariant = process.argv.find(argument => argument.startsWith('--variant='))?.split('=')[1] || '';
    const financeIntegrated = requestedModuleId === '02' && requestedVariant === 'finance-integrated';
    const financeRoutes = financeIntegrated ? readJson('finance-routes.json') : [];
    const financePages = financeIntegrated ? readJson('finance-pages.json') : {};

在 publisherStyleFiles 和 publisherRuntimeFiles 中只对整合版追加：

    const financeStyleFiles = financeIntegrated ? ['publisher-finance.css'] : [];
    const financeRuntimeFiles = financeIntegrated ? ['publisher-finance.js'] : [];
    const publisherStyles = [...publisherStyleFiles, ...financeStyleFiles]
      .map(file => read('styles', file).trim()).join('\n\n');
    const publisherRuntime = [...publisherRuntimeFiles, ...financeRuntimeFiles]
      .map(file => read('runtime', file).trim()).join('\n\n');

生成模块路由时使用：

    const pageRoutes = financeIntegrated
      ? [...routesForModule(module), ...financeRoutes]
      : routesForModule(module);

构建整合版时：

    const outputName = financeIntegrated ? '开发者平台财务整合demo.html' : module.output;
    fs.writeFileSync(path.join(demoDir, outputName), html, 'utf8');
    if (financeIntegrated) {
      process.stdout.write('Built developer finance integration with 6 routes.\n');
      continue;
    }

publicFixtureFor 将 financePages 合入 pages，确保三个路由不走加载失败占位。

- [ ] **Step 5: 验证构建**

Run:

    node --test tests/developer-backend/build.test.mjs

Expected: PASS；默认构建断言和整合版断言均通过。

- [ ] **Step 6: 提交**

    git add demos/开发者后台一期/build.mjs demos/开发者后台一期/src/finance-routes.json demos/开发者后台一期/src/finance-pages.json tests/developer-backend/build.test.mjs
    git commit -m "build: add developer finance integration target"

### Task 2: 建立财务运行时与数据审计

**Files:**
- Create: demos/开发者后台一期/src/runtime/publisher-finance.js
- Create: tests/developer-backend/publisher-finance-model.test.mjs
- Reference: demos/开发者后台一期/15-开发者财务结算demo.html

- [ ] **Step 1: 写财务模型失败用例**

publisher-finance-model.test.mjs 使用 vm 执行运行时并断言：

    test('财务模块公开统一接口并保持三本账及整数金额', () => {
      const api = loadPublisherFinance();
      assert.deepEqual(api.routeIds, ['P15-01','P15-02','P15-03']);
      const state = api.createState();
      assert.equal(state.scenario, 'exhaustive');
      assert.deepEqual(api.ledgerSources, ['direct_sale','external_key','gamehub_key']);
      assert.equal(api.auditLedger(state).valid, true);
      assert.equal(api.auditPayments(state).valid, true);
      for (const value of api.auditLedger(state).minorValues) assert.equal(Number.isInteger(value), true);
    });

- [ ] **Step 2: 运行用例并确认失败**

    node --test tests/developer-backend/publisher-finance-model.test.mjs

Expected: FAIL，publisher-finance.js 尚不存在。

- [ ] **Step 3: 实现模块外壳**

publisher-finance.js 使用单一 IIFE，并仅公开一个全局对象：

    (function registerPublisherFinance(scope) {
      'use strict';
      const routeIds = Object.freeze(['P15-01','P15-02','P15-03']);
      const ledgerSources = Object.freeze(['direct_sale','external_key','gamehub_key']);
      const PAGE_SIZE = 20;
      const clone = value => JSON.parse(JSON.stringify(value));

      const createState = () => ({
        scenario:'exhaustive',
        entityDraft:null,
        entityValidation:{ message:'', fields:[] },
        settlementFilters:{ keyword:'', period:'all', source:'all', statement:'all', invoice:'all', payment:'all' },
        appliedSettlementFilters:{ keyword:'', period:'all', source:'all', statement:'all', invoice:'all', payment:'all' },
        flowFilters:{ keyword:'', range:'all', game:'all', sku:'all', source:'all', fulfillment:'all', type:'all' },
        appliedFlowFilters:{ keyword:'', range:'all', game:'all', sku:'all', source:'all', fulfillment:'all', type:'all' },
        settlementPage:1,
        flowPage:1,
        drawer:null,
        modal:null,
        expandedSections:[],
      });
      const setScenario = (state, scenario) => {
        state.scenario = scenario === 'empty' ? 'empty' : 'exhaustive';
        state.settlementPage = 1;
        state.flowPage = 1;
        state.drawer = null;
        state.modal = null;
        state.expandedSections = [];
      };

      scope.PublisherFinance = Object.freeze({
        routeIds,
        ledgerSources,
        createState,
        render,
        bind,
        closeOverlays,
        applyEntryContext,
        setScenario,
        auditLedger,
        auditPayments,
      });
    })(window);

- [ ] **Step 4: 迁移财务数据与计算**

从 15-开发者财务结算demo.html 迁移以下内容，不迁移 topbar、nav、pageHead、render 和全局事件：

- 币种精度、minor、money、decimal、allocateMinor。
- entitySeed、entityHistory、statementSeeds、flows、disputeSeeds、payments。
- deepFreeze、makeDisputeSeed、makePaymentOrder。
- auditLedgerData、auditPaymentData 及付款尝试状态校验。
- 三种场景数据访问函数和账单金额还原规则。

createState 内保存数据副本：

    state.data = {
      exhaustive:{ entity, entityHistory, statements, flows, disputes, invoices, payments },
      empty:{ entity:null, entityHistory:[], statements:[], flows:[], disputes:[], invoices:[], payments:[] },
    };

所有金额继续使用整数最小单位；展示阶段才调用 money。

- [ ] **Step 5: 运行模型测试**

    node --check demos/开发者后台一期/src/runtime/publisher-finance.js
    node --test tests/developer-backend/publisher-finance-model.test.mjs

Expected: PASS；三本账、账单还原、付款尝试和整数金额审计全部通过。

- [ ] **Step 6: 提交**

    git add demos/开发者后台一期/src/runtime/publisher-finance.js tests/developer-backend/publisher-finance-model.test.mjs
    git commit -m "feat: add publisher finance runtime model"

### Task 3: 接入统一路由、侧栏和页面框架

**Files:**
- Modify: demos/开发者后台一期/src/runtime/app.js
- Modify: demos/开发者后台一期/src/runtime/shell.js
- Modify: demos/开发者后台一期/src/runtime/publisher-finance.js
- Create: demos/开发者后台一期/src/styles/publisher-finance.css
- Create: tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

- [ ] **Step 1: 写路由与框架失败用例**

新浏览器测试先执行整合版构建，然后写入已认证会话，依次访问三个路由：

    test('财务整合版复用唯一平台壳和厂商级导航', async () => {
      await openApprovedDeveloper('/P15-02');
      assert.equal(await page.locator('.topbar').count(), 1);
      assert.equal(await page.locator('.side-nav').count(), 1);
      assert.deepEqual(
        await page.locator('.side-nav .nav-item').allTextContents(),
        ['游戏管理','财务主体','对账结算','厂商设置'],
      );
      assert.equal(await page.getByRole('heading', { level:1, name:'对账结算' }).count(), 1);
      assert.equal(await page.locator('.developer-demo-state-fab').count(), 1);
    });

    test('流水为次级路由且侧栏仍高亮对账结算', async () => {
      await openApprovedDeveloper('/P15-03');
      assert.equal(await page.locator('.side-nav .nav-item.is-active').innerText(), '对账结算');
      assert.match(await page.locator('.context-bar').innerText(), /开发者平台\s*\/\s*财务\s*\/\s*对账结算\s*\/\s*对账流水/);
    });

    const openApprovedDeveloper = async routePath => {
      await page.goto(url('/P01-01'), { waitUntil:'load' });
      await page.evaluate(() => {
        sessionStorage.setItem('gamehub-developer-session-v1', JSON.stringify({ authenticated:true, accountKey:'finance:approved' }));
        localStorage.setItem('gamehub-developer-account-states-v1', JSON.stringify({
          'finance:approved':{
            registration:{ accountTier:'enterprise', registeredAt:'2026-09-01 09:00', consoleTab:'games' },
            qualification:{ status:'approved', step:5, view:'intro', editing:false, revision:1, submittedAt:'2026-09-01 09:00', form:{ agreementAccepted:true }, history:[], submissions:[] },
          },
        }));
        history.replaceState(null, '', '#/P15-01');
      });
      await page.reload({ waitUntil:'load' });
      if (routePath !== '/P15-01') {
        await page.evaluate(path => { location.hash = '#' + path; }, routePath);
        await page.waitForFunction(path => location.hash === '#' + path, routePath);
      }
    };

    const selectFinanceScenario = async scenario => {
      await page.locator('.developer-demo-state-fab').click();
      await page.locator(`[data-finance-scenario="${scenario}"]`).click();
    };

    const openGameAnalytics = async () => {
      await page.locator('[data-portal-action="enter-publisher-game"][data-publisher-game="existing"]').click();
      await page.locator('[data-portal-action="game-console-section"][data-game-section="analytics"]').click();
      await page.locator('[data-publisher-dashboard]').waitFor();
    };

    const openVendorFinanceSummary = async () => {
      await page.locator('[data-portal-action="publisher-sidebar-view"][data-publisher-view="vendor"]').click();
      await page.locator('[data-portal-action="vendor-settings-tab"][data-vendor-settings-tab="finance"]').click();
      await page.locator('[data-vendor-settings-panel="finance"]').waitFor();
    };

- [ ] **Step 2: 运行并确认失败**

    node --test tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

Expected: FAIL，财务路由尚未由 app.js 和 shell.js 渲染。

- [ ] **Step 3: 在 app.js 注册财务状态和路由**

在初始化区增加：

    const financeRouteIds = new Set(window.PublisherFinance?.routeIds || []);
    const hasFinanceRoutes = routes.some(route => financeRouteIds.has(route.id));
    memory.finance = hasFinanceRoutes
      ? window.PublisherFinance.createState()
      : null;

parseLocation 的开发者门禁改为：

    const requestedFinanceRoute = requested && financeRouteIds.has(requested.id);
    if (requestedFinanceRoute && !memory.session.authenticated) {
      memory.session.pendingRoute = requested.id;
      route = routes.find(item => item.id === 'P01-01') || route;
    } else if (requestedFinanceRoute && memory.registration?.accountTier === 'unselected') {
      memory.session.pendingRoute = requested.id;
      route = routes.find(item => item.id === 'P01-03') || route;
    } else if (requestedFinanceRoute && memory.qualification.status !== 'approved') {
      memory.session.pendingRoute = requested.id;
      route = routes.find(item => item.id === 'P01-03') || route;
    }

登录、注册或认证完成时：

    const pendingRoute = memory.session.pendingRoute;
    if (pendingRoute && routes.some(item => item.id === pendingRoute)) {
      memory.session.pendingRoute = '';
      navigate({ routeId:pendingRoute, state:'default' });
      return;
    }

- [ ] **Step 4: 使用财务渲染器**

render 中在模板渲染前分流：

    const isFinanceRoute = financeRouteIds.has(route.id);
    const content = isFinanceRoute
      ? window.PublisherFinance.render(memory.finance, {
          routeId:route.id,
          language:memory.shell.language,
          qualificationStatus:qualificationForView.status,
          access,
        })
      : namespace.templates.render(existingTemplateArguments);

渲染后绑定：

    if (isFinanceRoute) {
      window.PublisherFinance.bind(root, {
        state:memory.finance,
        routeId:route.id,
        language:memory.shell.language,
        navigate:routeId => navigate({ routeId, state:'default' }),
        onChange:options => render({ preserveScroll:Boolean(options?.preserveScroll) }),
      });
    }

将 render 签名改为接收滚动选项：

    const render = (options = {}) => {
      const workspace = root.querySelector('.workspace');
      const previousScrollTop = workspace?.scrollTop || 0;

在现有 render 的绑定流程结束后增加：

    if (options.preserveScroll) {
      requestAnimationFrame(() => root.querySelector('.workspace')?.scrollTo({ top:previousScrollTop, left:0 }));
    }

hashchange 前调用：

    window.PublisherFinance?.closeOverlays(memory.finance);

- [ ] **Step 5: 在 shell.js 输出厂商级财务导航**

增加 financeTitles，并让 P15-03 的主导航路由映射到 P15-02：

    const financeRouteIds = new Set(['P15-01','P15-02','P15-03']);
    const financePrimaryRoute = routeId => routeId === 'P15-03' ? 'P15-02' : routeId;

财务路由侧栏固定输出：

    游戏：游戏管理 → #/P02-01
    财务：财务主体 → #/P15-01；对账结算 → #/P15-02
    厂商管理：厂商设置 → #/P02-01?view=vendor

P15-01、P15-02 的 context-bar 分别为“开发者平台 / 财务 / 当前页”；P15-03 使用完整四级面包屑。

- [ ] **Step 6: 建立统一样式根节点**

publisher-finance.css 所有选择器以 .publisher-finance 为根：

    .publisher-finance {
      --finance-accent: var(--brand-cyan);
      color: var(--text-primary);
    }
    .publisher-finance .finance-page-head h1 {
      margin:0;
      font-size:28px;
      line-height:1.3;
      color:#0f1f3d;
    }
    .publisher-finance .finance-card {
      background:#fff;
      border:1px solid var(--border-default);
      border-radius:12px;
      box-shadow:0 8px 24px rgba(15,31,61,.05);
    }
    .publisher-finance .finance-button.is-primary {
      background:var(--brand-cyan);
      border-color:var(--brand-cyan);
      color:#062b35;
    }

不得定义 body、#app、顶栏、侧栏或 Logo。

- [ ] **Step 7: 验证并提交**

    node demos/开发者后台一期/build.mjs --module=02 --variant=finance-integrated
    node --test tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
    git add demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/shell.js demos/开发者后台一期/src/runtime/publisher-finance.js demos/开发者后台一期/src/styles/publisher-finance.css tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
    git commit -m "feat: integrate finance routes into developer shell"

Expected: 新地址三个路由共用唯一平台壳；原 Demo 未被构建覆盖。

### Task 4: 迁移财务主体完整交互

**Files:**
- Modify: demos/开发者后台一期/src/runtime/publisher-finance.js
- Modify: demos/开发者后台一期/src/styles/publisher-finance.css
- Modify: tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

- [ ] **Step 1: 写财务主体失败用例**

覆盖：

    test('财务主体支持首次配置、变更、校验、审核撤销和历史快照', async () => {
      await openApprovedDeveloper('/P15-01');
      await selectFinanceScenario('empty');
      await page.getByRole('button', { name:'配置财务主体' }).click();
      await page.getByLabel('财务邮箱').fill('bad-mail');
      await page.getByRole('button', { name:'提交审核' }).click();
      assert.equal(await page.getByLabel('财务邮箱').getAttribute('aria-invalid'), 'true');
      await page.getByLabel('财务邮箱').fill('finance@example.com');
      await page.getByLabel('银行国家或地区').selectOption('SG');
      await page.getByLabel('SWIFT / BIC').fill('');
      await page.getByRole('button', { name:'提交审核' }).click();
      assert.equal(await page.getByLabel('SWIFT / BIC').getAttribute('aria-invalid'), 'true');
    });

另写用例验证银行地区、账号或 SWIFT 变化后必须重传账户证明；撤销审核存在二次确认；历史版本只读。

- [ ] **Step 2: 运行并确认失败**

    node --test --test-name-pattern="财务主体" tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

Expected: FAIL，主体表单及动作尚未完整迁移。

- [ ] **Step 3: 迁移主体渲染和动作**

从原财务 Demo 迁移并改名为模块私有函数：

- entitySummary、currentApplicationSection、historyTable、entityForm、entityPage。
- entityFieldA11y、field、selectField、uploadField、showFormError。
- start-initial、start-change、entity-submit、entity-withdraw、modal-confirm、modal-cancel、view-entity-history。
- bindBankProofToDraft 和 SWIFT／BIC 联动校验。

所有动作统一使用 data-finance-action，bind 只在 .publisher-finance 内监听。撤销确认使用统一平台确认框样式，不产生第二层抽屉。

- [ ] **Step 4: 验证并提交**

    node --check demos/开发者后台一期/src/runtime/publisher-finance.js
    node --test --test-name-pattern="财务主体" tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
    git add demos/开发者后台一期/src/runtime/publisher-finance.js demos/开发者后台一期/src/styles/publisher-finance.css tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
    git commit -m "feat: integrate finance entity workflow"

Expected: 财务主体状态、字段、校验、二次确认和历史快照全部通过。

### Task 5: 迁移对账结算、流水和详情

**Files:**
- Modify: demos/开发者后台一期/src/runtime/publisher-finance.js
- Modify: demos/开发者后台一期/src/styles/publisher-finance.css
- Modify: tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

- [ ] **Step 1: 写结算闭环失败用例**

至少覆盖：

    test('结算记录每页20条并在单层抽屉完成对账发票付款追踪', async () => {
      await openApprovedDeveloper('/P15-02');
      assert.match(await page.locator('.finance-pagination').innerText(), /每页\s*20\s*条/);
      await page.getByRole('button', { name:'查看' }).first().click();
      assert.equal(await page.getByRole('dialog').count(), 1);
      const detailText = await page.getByRole('dialog').innerText();
      for (const label of ['账单汇总','来源构成','对账流水','差异记录','发票','付款']) assert.match(detailText, new RegExp(label));
    });

再覆盖账单二次确认、四类差异、发票退回重提、失败／退回／部分付款、多次付款尝试、凭证门禁、三本账筛选及安全导出。

- [ ] **Step 2: 运行并确认失败**

    node --test --test-name-pattern="结算|流水|差异|发票|付款" tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

Expected: FAIL，结算页面和详情尚未完整迁移。

- [ ] **Step 3: 迁移列表与流水**

迁移并适配：

- filteredSettlementRecords、filteredFlows、filterSelect、pagination。
- statementList、settlementPage、flowList、flowQueryPage。
- P15-02 查询流水进入 P15-03；P15-03 返回进入 P15-02。
- settlementFilters 和 flowFilters 必须区分编辑值与 applied 值；导出只读取 applied 值并导出全部命中记录。
- CSV 使用标准转义，并在单元格以 =、+、-、@ 开头时加单引号。

- [ ] **Step 4: 迁移单层详情和业务动作**

迁移并适配：

- settlementDrawer、detailSection、statementSection、sourceSection、flowSection、disputeSection、invoiceSection、paymentSection。
- disputeForm、invoiceForm、confirmStatementModal。
- confirm-statement、start-dispute、submit-dispute、supplement-dispute、submit-invoice、download-statement、download-proof、go-entity。
- 详情只创建一个 role=dialog；当前待办区块默认展开，底部 .finance-drawer-foot 固定。
- 财务主体未生效时禁用确认与差异；付款暂停不禁用历史核账。

- [ ] **Step 5: 完整验证并提交**

    node --check demos/开发者后台一期/src/runtime/publisher-finance.js
    node --test tests/developer-backend/publisher-finance-model.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
    git add demos/开发者后台一期/src/runtime/publisher-finance.js demos/开发者后台一期/src/styles/publisher-finance.css tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
    git commit -m "feat: integrate settlement reconciliation workflow"

Expected: 对账、流水、差异、发票和付款的主要正常及异常路径通过。

### Task 6: 收口经营数据和厂商设置入口

**Files:**
- Modify: demos/开发者后台一期/src/runtime/app.js
- Modify: demos/开发者后台一期/src/runtime/publisher-data-dashboard.js
- Modify: demos/开发者后台一期/src/runtime/publisher-vendor-settings.js
- Modify: demos/开发者后台一期/src/styles/publisher-vendor-settings.css
- Modify: tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
- Modify: tests/developer-backend/developer-portal-state-matrix.browser.test.mjs

- [ ] **Step 1: 写站内联动失败用例**

    test('经营数据和厂商设置均在同一文件进入财务模块', async () => {
      await openApprovedDeveloper('/P02-01');
      await openGameAnalytics();
      await page.getByRole('button', { name:'查看正式对账' }).click();
      await page.waitForURL(/开发者平台财务整合demo\.html#\/P15-02/);
      assert.equal(new URL(page.url()).pathname.endsWith('15-开发者财务结算demo.html'), false);

      await openVendorFinanceSummary();
      await page.getByRole('button', { name:'前往财务主体' }).click();
      await page.waitForURL(/#\/P15-01$/);
    });

- [ ] **Step 2: 运行并确认失败**

    node --test --test-name-pattern="经营数据|厂商设置" tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

Expected: FAIL，经营数据仍跳旧 HTML，厂商财务信息仍可编辑提交。

- [ ] **Step 3: 改造经营数据回调**

app.js 的 onFinance 改为：

    onFinance: (target, filters) => {
      const routeId = target === 'settlement/flows' ? 'P15-03' : 'P15-02';
      window.PublisherFinance.applyEntryContext(memory.finance, {
        source:'publisher-data-dashboard',
        target,
        game:dashboardGame?.gameId || '',
        filters,
      });
      navigate({ routeId, state:'default' });
    }

删除 location.href 指向 15-开发者财务结算demo.html 和 window.name 交接。

- [ ] **Step 4: 将厂商财务页签改为只读摘要**

publisher-vendor-settings.js 对 finance 单独渲染：

    <section data-vendor-settings-panel="finance">
      <dl>
        <div><dt>财务主体状态</dt><dd>已生效</dd></div>
        <div><dt>结算币种</dt><dd>USD</dd></div>
        <div><dt>收款账户</dt><dd>•••• 7718</dd></div>
      </dl>
      <button data-portal-action="open-finance-entity">前往财务主体</button>
    </section>

英文同步显示 Finance entity status、Settlement currency、Payout account、Open finance entity。

app.js 处理 open-finance-entity：

    window.PublisherFinance.applyEntryContext(memory.finance, { source:'vendor-settings' });
    navigate({ routeId:'P15-01', state:'default' });

从 vendor-settings-submit 的可提交组中移除 finance；企业主体信息和厂商资料审核流程不变。

- [ ] **Step 5: 验证并提交**

    node --test tests/developer-backend/developer-platform-finance-integration.browser.test.mjs tests/developer-backend/developer-portal-state-matrix.browser.test.mjs
    git add demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/publisher-data-dashboard.js demos/开发者后台一期/src/runtime/publisher-vendor-settings.js demos/开发者后台一期/src/styles/publisher-vendor-settings.css tests/developer-backend/developer-platform-finance-integration.browser.test.mjs tests/developer-backend/developer-portal-state-matrix.browser.test.mjs
    git commit -m "fix: unify developer finance entry points"

Expected: 两个入口均在新 HTML 内跳转；厂商设置不再保存第二份结算资料。

### Task 7: 统一中英文、场景和浏览器状态

**Files:**
- Modify: demos/开发者后台一期/src/runtime/app.js
- Modify: demos/开发者后台一期/src/runtime/shell.js
- Modify: demos/开发者后台一期/src/runtime/publisher-finance.js
- Modify: tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

- [ ] **Step 1: 写语言、场景和历史失败用例**

覆盖：

    test('财务页面中英文同步且切换不丢状态', async () => {
      await openApprovedDeveloper('/P15-02');
      await page.getByLabel('结算单').fill('STMT-2026');
      await page.getByRole('button', { name:'英语' }).click();
      assert.equal(await page.getByRole('heading', { name:'Reconciliation & settlement' }).isVisible(), true);
      assert.equal(await page.getByLabel('Statement').inputValue(), 'STMT-2026');
      assert.equal(await page.locator('main').getByText('查询流水').count(), 0);
    });

    test('财务场景共用唯一悬浮球并支持往返', async () => {
      await openApprovedDeveloper('/P15-01');
      assert.equal(await page.locator('.developer-demo-state-fab').count(), 1);
      await selectFinanceScenario('empty');
      assert.equal(await page.getByText('尚未配置财务主体').isVisible(), true);
      await selectFinanceScenario('exhaustive');
      assert.equal(await page.getByText('已生效').first().isVisible(), true);
    });

再写前进后退、刷新恢复目标路由、路由变化关闭覆盖层和焦点恢复用例。

- [ ] **Step 2: 运行并确认失败**

    node --test --test-name-pattern="中英文|场景|前进|后退|刷新" tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

Expected: FAIL，财务翻译和场景尚未接入统一壳。

- [ ] **Step 3: 补齐财务词典**

publisher-finance.js 使用统一 text 函数：

    const text = (zh, en, language) => language === 'en' ? en : zh;

所有可见财务文案均提供中英文，包括：

- 页面标题、侧栏、面包屑。
- 状态、筛选、表头、分页。
- 表单、按钮、缺省、错误。
- 抽屉、确认框、差异、发票和付款时间线。

数据值、ID、币种和日期保持原值。

- [ ] **Step 4: 复用全局场景悬浮球**

app.js 的 demoState 增加：

    financeMode:financeRouteIds.has(route.id),
    financeScenario:memory.finance?.scenario || 'exhaustive',

shell.js 在 financeMode 为 true 时，原悬浮面板只显示：

    穷举态 / Exhaustive
    缺省态 / Empty

app.js 处理 finance-scenario：

    window.PublisherFinance.setScenario(memory.finance, event.currentTarget.dataset.financeScenario);
    render();
    resetRouteScroll();

不得渲染第二个财务悬浮球。

- [ ] **Step 5: 验证并提交**

    node --test tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
    git add demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/shell.js demos/开发者后台一期/src/runtime/publisher-finance.js tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
    git commit -m "feat: align finance language and demo scenarios"

Expected: 中英文无混杂，场景单入口，浏览器历史和刷新稳定。

### Task 8: 全量回归、视觉验收与发布

**Files:**
- Modify: demos/开发者后台一期/README.md
- Create: tests/developer-backend/evidence/developer-platform-finance-integration/
- Verify: demos/开发者后台一期/开发者平台财务整合demo.html
- Verify: demos/开发者后台一期/开发者平台demo.html
- Verify: demos/开发者后台一期/15-开发者财务结算demo.html

- [ ] **Step 1: 生成最终整合版**

    node demos/开发者后台一期/build.mjs --module=02 --variant=finance-integrated

Expected: 输出“Built developer finance integration with 6 routes.”，生成 开发者平台财务整合demo.html。

- [ ] **Step 2: 运行语法和模型测试**

    node --check demos/开发者后台一期/src/runtime/publisher-finance.js
    node --check demos/开发者后台一期/src/runtime/app.js
    node --check demos/开发者后台一期/src/runtime/shell.js
    node --test tests/developer-backend/publisher-finance-model.test.mjs

Expected: 全部 PASS。

- [ ] **Step 3: 运行开发者平台和财务回归**

    node --test tests/developer-backend/build.test.mjs tests/developer-backend/manifest.test.mjs tests/developer-backend/developer-portal-front-back-shell.browser.test.mjs tests/developer-backend/developer-portal-state-matrix.browser.test.mjs tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs

Expected: 全部业务断言 PASS。若 Windows 截图写入出现 UNKNOWN，单独重跑截图用例；不能以截图文件错误替代业务失败。

- [ ] **Step 4: 截图审查**

使用 Playwright 截取：

- 1440×900：游戏管理、财务主体、对账结算、对账流水、结算详情。
- 1280×800：对账结算和详情。
- 390×844：财务主体、对账结算和场景面板。
- 英文：对账结算和财务主体。

保存到 tests/developer-backend/evidence/developer-platform-finance-integration/，逐项检查：

- 深蓝顶栏、白色侧栏和青色主操作一致。
- 每页只有一个 H1。
- 表格、固定操作区、分页和悬浮球无遮挡。
- 390px 无根节点横向溢出。
- 英文无中文残留和控件截断。

- [ ] **Step 5: 更新 README**

增加“开发者平台财务整合版”说明、构建命令、三个财务路由和范围边界。明确原 Demo 继续保留，整合版为本次新地址。

- [ ] **Step 6: 最终提交**

    git add demos/开发者后台一期/build.mjs demos/开发者后台一期/src/finance-routes.json demos/开发者后台一期/src/finance-pages.json demos/开发者后台一期/src/styles/publisher-finance.css demos/开发者后台一期/src/styles/publisher-vendor-settings.css demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/shell.js demos/开发者后台一期/src/runtime/publisher-finance.js demos/开发者后台一期/src/runtime/publisher-data-dashboard.js demos/开发者后台一期/src/runtime/publisher-vendor-settings.js demos/开发者后台一期/开发者平台财务整合demo.html demos/开发者后台一期/README.md tests/developer-backend/build.test.mjs tests/developer-backend/publisher-finance-model.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs tests/developer-backend/developer-portal-state-matrix.browser.test.mjs tests/developer-backend/evidence/developer-platform-finance-integration
    git commit -m "feat: publish integrated developer finance demo"

提交前使用 git diff --cached --name-status 检查，只包含本计划相关文件。

- [ ] **Step 7: 推送并验证公网地址**

    git push origin HEAD

推送后生成并验证固定提交地址：

    $financeCommit = git rev-parse HEAD
    $financeUrl = "https://htmlpreview.github.io/?https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$financeCommit/demos/%E5%BC%80%E5%8F%91%E8%80%85%E5%90%8E%E5%8F%B0%E4%B8%80%E6%9C%9F/%E5%BC%80%E5%8F%91%E8%80%85%E5%B9%B3%E5%8F%B0%E8%B4%A2%E5%8A%A1%E6%95%B4%E5%90%88demo.html#/P15-01"
    Invoke-WebRequest -Uri $financeUrl -Method Get -TimeoutSec 30 -UseBasicParsing

Expected: HTTP 200，页面可进入 P15-01、P15-02、P15-03；最终向用户提供一个主地址和三个可直达路由。
