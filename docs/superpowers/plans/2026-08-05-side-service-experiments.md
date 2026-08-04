# 两套产品化服务实验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `github/four-experiment-pilot` 中交付 `/ai-product-team` 与 `/prototype-sprint` 两个可体验、可测量、可提交真实试点咨询的产品化服务页。

**Architecture:** 两个应用各自导出平台约定的异步 `mount` 函数，并保留独立的案例交互；`src/apps/service-shared` 只共享服务页骨架、价格选择、咨询表单和视觉样式。页面通过主管计划提供的 `AnalyticsClient` 与 `submitLead` 接入数据层，不直接访问 Worker API；案例、文案和素材全部虚构或原创，不使用雇主内部资产。

**Tech Stack:** Vite、TypeScript、原生 DOM API、CSS、Vitest（jsdom）、Playwright

---

## 文件结构

- `github/four-experiment-pilot/src/apps/service-shared/service-page.ts`：共享内容模型、服务页静态区块和价格卡渲染。
- `github/four-experiment-pilot/src/apps/service-shared/lead-form.ts`：咨询表单、校验、提交状态和 `submitLead` 适配。
- `github/four-experiment-pilot/src/apps/service-shared/service-page.css`：两页共用的响应式、焦点和状态样式。
- `github/four-experiment-pilot/src/apps/service-shared/service-page.test.ts`：共享价格与表单行为测试。
- `github/four-experiment-pilot/src/apps/ai-product-team/demo.ts`：虚构会议记录到六类产物的顺序案例。
- `github/four-experiment-pilot/src/apps/ai-product-team/index.ts`：AI 产品部页面组合与平台挂载契约。
- `github/four-experiment-pilot/src/apps/ai-product-team/mount.ts`：主平台入口到 `mountAiProductTeam` 的稳定转导出。
- `github/four-experiment-pilot/src/apps/ai-product-team/index.test.ts`：AI 产品部事件、案例和边界测试。
- `github/four-experiment-pilot/src/apps/prototype-sprint/cases.ts`：两款游戏入口、通用产品案例和范围展开交互。
- `github/four-experiment-pilot/src/apps/prototype-sprint/index.ts`：原型冲刺页面组合与平台挂载契约。
- `github/four-experiment-pilot/src/apps/prototype-sprint/mount.ts`：主平台入口到 `mountPrototypeSprint` 的稳定转导出。
- `github/four-experiment-pilot/src/apps/prototype-sprint/index.test.ts`：原型冲刺事件、案例和边界测试。
- `github/four-experiment-pilot/tests/e2e/service-pages.spec.ts`：三条公开主链路、移动端、失败保留输入和 UTM 的端到端验收。

平台前置契约（由主管计划创建，本计划只消费）：

```ts
export type AnalyticsEventName =
  | 'service_view' | 'demo_start' | 'demo_complete' | 'case_open'
  | 'scope_expand' | 'pricing_view' | 'pricing_click'
  | 'lead_start' | 'lead_submit';

export interface AnalyticsClient {
  track(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>): void;
  flush(): Promise<void>;
}

export type LeadPayload = {
  experiment: 'ai-product-team' | 'prototype-sprint';
  contact: string;
  need: string;
  consent: true;
  pricingTier?: 'diagnosis' | 'standard' | 'custom' | 'single-page' | 'interactive' | 'game-slice';
};

export declare function submitLead(payload: LeadPayload): Promise<{ leadId: string; submittedAt: string }>;
```

### Task 1: 共享服务页骨架与价格意愿交互

**Files:**
- Create: `github/four-experiment-pilot/src/apps/service-shared/service-page.test.ts`
- Create: `github/four-experiment-pilot/src/apps/service-shared/service-page.ts`
- Create: `github/four-experiment-pilot/src/apps/service-shared/service-page.css`

- [ ] **Step 1: 写价格卡失败测试**

```ts
// src/apps/service-shared/service-page.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPriceCards } from './service-page';

describe('renderPriceCards', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="prices"></div>'; });

  it('记录价格查看与点击，只选择方案而不创建支付跳转', () => {
    const track = vi.fn();
    const analytics = { track, flush: vi.fn() };
    const selected: string[] = [];
    const cleanup = renderPriceCards(document.querySelector('#prices')!, [
      { id: 'diagnosis', name: '需求诊断', price: '¥299', note: '一次诊断沟通' },
    ], analytics, (id) => selected.push(id));
    expect(track).toHaveBeenCalledWith('pricing_view');
    document.querySelector<HTMLButtonElement>('[data-price-id="diagnosis"]')!.click();
    expect(track).toHaveBeenCalledWith('pricing_click', { pricing_tier: 'diagnosis' });
    expect(selected).toEqual(['diagnosis']);
    expect(document.querySelector('a[href*="pay"]')).toBeNull();
    cleanup();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/service-shared/service-page.test.ts`

Expected: FAIL，提示无法解析 `./service-page`。

- [ ] **Step 3: 实现共享骨架与价格卡**

```ts
// src/apps/service-shared/service-page.ts
import type { AnalyticsClient } from '../../shared/analytics';

export type PriceId = 'diagnosis' | 'standard' | 'custom' | 'single-page' | 'interactive' | 'game-slice';
export type PriceOption = { id: PriceId; name: string; price: string; note: string };
export type Section = { title: string; items: string[] };

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
})[char]!);

export function sectionMarkup(section: Section): string {
  return `<section class="service-section"><h2>${escapeHtml(section.title)}</h2><ul>${section.items
    .map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
}

export function renderPriceCards(
  root: Element,
  prices: PriceOption[],
  analytics: AnalyticsClient,
  onSelect: (id: PriceId) => void,
): () => void {
  root.innerHTML = prices.map((price) => `<article class="price-card">
    <h3>${escapeHtml(price.name)}</h3><p class="price">${escapeHtml(price.price)}</p>
    <p>${escapeHtml(price.note)}</p>
    <button type="button" data-price-id="${price.id}">选择并咨询</button>
  </article>`).join('');
  analytics.track('pricing_view');
  const controller = new AbortController();
  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-price-id]');
    if (!button) return;
    const id = button.dataset.priceId as PriceId;
    analytics.track('pricing_click', { pricing_tier: id });
    onSelect(id);
  }, { signal: controller.signal });
  return () => controller.abort();
}
```

```css
/* src/apps/service-shared/service-page.css */
:root { color-scheme: dark; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: #080b12; color: #f4f7fb; }
button, input, textarea { font: inherit; }
button { cursor: pointer; border: 0; border-radius: 12px; padding: 12px 18px; background: #72e0bd; color: #07110d; font-weight: 700; }
button:focus-visible, input:focus-visible, textarea:focus-visible, summary:focus-visible, a:focus-visible { outline: 3px solid #f7c86b; outline-offset: 3px; }
.service-page { min-height: 100vh; background: radial-gradient(circle at 80% 0, #173553 0, transparent 35%); }
.service-main { width: min(1120px, calc(100% - 32px)); margin: auto; padding: 72px 0; }
.hero { max-width: 820px; padding: 48px 0; }
.eyebrow { color: #72e0bd; font-weight: 700; letter-spacing: .08em; }
h1 { margin: 12px 0; font-size: clamp(2.3rem, 6vw, 4.8rem); line-height: 1.02; }
h2 { margin-top: 0; font-size: clamp(1.5rem, 3vw, 2.2rem); }
.lede, .muted { color: #b9c4d2; line-height: 1.7; }
.service-section, .demo-panel, .lead-panel { margin: 24px 0; padding: 28px; border: 1px solid #263549; border-radius: 20px; background: #101722; }
.grid, .price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.price-card { padding: 22px; border: 1px solid #30425b; border-radius: 16px; background: #151f2c; }
.price { font-size: 2rem; font-weight: 800; }
.stage-list { display: grid; gap: 12px; padding: 0; list-style: none; }
.stage-list li { padding: 16px; border-left: 3px solid #72e0bd; background: #151f2c; }
.lead-form { display: grid; gap: 14px; }
.lead-form label { display: grid; gap: 8px; font-weight: 700; }
.lead-form input, .lead-form textarea { width: 100%; border: 1px solid #40516a; border-radius: 10px; padding: 12px; background: #090e16; color: #fff; }
.field-error { min-height: 1.3em; color: #ff9c9c; }
.status[data-state="success"] { color: #72e0bd; }
.status[data-state="error"] { color: #ff9c9c; }
@media (max-width: 760px) { .grid, .price-grid { grid-template-columns: 1fr; } .service-main { padding: 36px 0; } .service-section, .demo-panel, .lead-panel { padding: 20px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; } }
```

- [ ] **Step 4: 运行测试并提交**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/service-shared/service-page.test.ts`

Expected: PASS，1 个测试通过。

```bash
git add github/four-experiment-pilot/src/apps/service-shared
git commit -m "feat: add shared service page pricing"
```

### Task 2: 可恢复的试点咨询表单

**Files:**
- Modify: `github/four-experiment-pilot/src/apps/service-shared/service-page.test.ts`
- Create: `github/four-experiment-pilot/src/apps/service-shared/lead-form.ts`

- [ ] **Step 1: 在共享测试文件末尾加入表单失败、成功和事件测试**

```ts
import { mountLeadForm } from './lead-form';
import { submitLead } from '../../shared/leads';
vi.mock('../../shared/leads', () => ({ submitLead: vi.fn() }));

describe('mountLeadForm', () => {
  it('校验失败不提交，网络失败保留输入，成功显示非付款声明', async () => {
    document.body.innerHTML = '<div id="form"></div>';
    const analytics = { track: vi.fn(), flush: vi.fn() };
    const form = mountLeadForm(document.querySelector('#form')!, 'ai-product-team', analytics);
    form.element.dispatchEvent(new Event('focusin', { bubbles: true }));
    form.element.requestSubmit();
    expect(submitLead).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith('lead_start');

    form.contact.value = 'wechat-demo';
    form.need.value = '希望把零散会议记录稳定转成可执行任务。';
    form.consent.checked = true;
    form.selectPrice('diagnosis');
    vi.mocked(submitLead).mockRejectedValueOnce(new Error('offline'));
    form.element.requestSubmit();
    await vi.waitFor(() => expect(form.status.dataset.state).toBe('error'));
    expect(form.contact.value).toBe('wechat-demo');

    vi.mocked(submitLead).mockResolvedValueOnce({ leadId: 'lead-1', submittedAt: '2026-08-05T00:00:00Z' });
    form.element.requestSubmit();
    await vi.waitFor(() => expect(form.status.dataset.state).toBe('success'));
    expect(form.status.textContent).toContain('不代表已付款或自动成交');
    expect(analytics.track).toHaveBeenCalledWith('lead_submit', { pricing_tier: 'diagnosis' });
    form.cleanup();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/service-shared/service-page.test.ts`

Expected: FAIL，提示无法解析 `./lead-form`。

- [ ] **Step 3: 实现完整表单**

```ts
// src/apps/service-shared/lead-form.ts
import type { AnalyticsClient } from '../../shared/analytics';
import { submitLead } from '../../shared/leads';
import type { PriceId } from './service-page';

type Experiment = 'ai-product-team' | 'prototype-sprint';

export function mountLeadForm(root: Element, experiment: Experiment, analytics: AnalyticsClient) {
  root.innerHTML = `<form class="lead-form" novalidate>
    <label>联系方式<input name="contact" maxlength="120" autocomplete="email" required></label>
    <p class="field-error" data-error="contact"></p>
    <label>需求摘要<textarea name="need" minlength="10" maxlength="1000" rows="5" required></textarea></label>
    <p class="field-error" data-error="need"></p>
    <label><span><input name="consent" type="checkbox" required> 同意仅将以上信息用于本次试点联系与需求评估</span></label>
    <p class="field-error" data-error="consent"></p>
    <p class="muted">请勿提交雇主内部 PRD、数据、用户反馈、设计稿、账号、客户名单或未公开经验。</p>
    <input name="pricingTier" type="hidden">
    <button type="submit">提交试点申请</button><p class="status" role="status" aria-live="polite"></p>
  </form>`;
  const element = root.querySelector<HTMLFormElement>('form')!;
  const contact = element.elements.namedItem('contact') as HTMLInputElement;
  const need = element.elements.namedItem('need') as HTMLTextAreaElement;
  const consent = element.elements.namedItem('consent') as HTMLInputElement;
  const pricingTier = element.elements.namedItem('pricingTier') as HTMLInputElement;
  const status = element.querySelector<HTMLElement>('.status')!;
  const submit = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const controller = new AbortController();
  let started = false;

  element.addEventListener('focusin', () => {
    if (!started) { analytics.track('lead_start'); started = true; }
  }, { signal: controller.signal });

  element.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errors = {
      contact: contact.value.trim() ? '' : '请填写联系方式。',
      need: need.value.trim().length >= 10 ? '' : '请用至少 10 个字描述需求。',
      consent: consent.checked ? '' : '请确认同意联系与评估。',
    };
    (Object.keys(errors) as Array<keyof typeof errors>).forEach((key) => {
      element.querySelector<HTMLElement>(`[data-error="${key}"]`)!.textContent = errors[key];
    });
    if (Object.values(errors).some(Boolean)) { status.dataset.state = 'error'; status.textContent = '请检查表单。'; return; }
    submit.disabled = true; status.dataset.state = ''; status.textContent = '正在提交…';
    try {
      await submitLead({
        experiment, contact: contact.value.trim(), need: need.value.trim(), consent: true,
        ...(pricingTier.value ? { pricingTier: pricingTier.value as PriceId } : {}),
      });
      analytics.track('lead_submit', pricingTier.value ? { pricing_tier: pricingTier.value } : undefined);
      status.dataset.state = 'success';
      status.textContent = '提交成功。当前为首批试点申请，不代表已付款或自动成交。';
    } catch {
      status.dataset.state = 'error';
      status.textContent = '网络暂时不可用，请稍后重试；已填写内容仍保留。';
    } finally { submit.disabled = false; }
  }, { signal: controller.signal });

  return {
    element, contact, need, consent, status,
    selectPrice(id: PriceId) { pricingTier.value = id; element.scrollIntoView?.({ block: 'center' }); contact.focus(); },
    cleanup() { controller.abort(); },
  };
}
```

- [ ] **Step 4: 运行测试并提交**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/service-shared/service-page.test.ts`

Expected: PASS，2 个测试通过。

```bash
git add github/four-experiment-pilot/src/apps/service-shared
git commit -m "feat: add resilient pilot lead form"
```

### Task 3: AI 产品部虚构协作案例

**Files:**
- Create: `github/four-experiment-pilot/src/apps/ai-product-team/index.test.ts`
- Create: `github/four-experiment-pilot/src/apps/ai-product-team/demo.ts`

- [ ] **Step 1: 写案例顺序与事件失败测试**

```ts
// src/apps/ai-product-team/index.test.ts
import { describe, expect, it, vi } from 'vitest';
import { mountAiDemo } from './demo';

describe('AI 产品部案例', () => {
  it('无需登录展示六类协作结果并完成事件漏斗', async () => {
    document.body.innerHTML = '<div id="demo"></div>';
    const analytics = { track: vi.fn(), flush: vi.fn() };
    const cleanup = mountAiDemo(document.querySelector('#demo')!, analytics);
    document.querySelector<HTMLButtonElement>('[data-demo-start]')!.click();
    await vi.waitFor(() => expect(document.querySelectorAll('.stage-list li')).toHaveLength(6));
    expect(document.body.textContent).toContain('社区活动报名工具');
    expect(document.body.textContent).not.toContain('盖世游戏');
    expect(analytics.track).toHaveBeenCalledWith('demo_start');
    expect(analytics.track).toHaveBeenCalledWith('demo_complete');
    document.querySelector<HTMLButtonElement>('[data-case-open]')!.click();
    expect(analytics.track).toHaveBeenCalledWith('case_open', { artifact: 'acceptance' });
    cleanup();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/ai-product-team/index.test.ts`

Expected: FAIL，提示无法解析 `./demo`。

- [ ] **Step 3: 实现虚构案例**

```ts
// src/apps/ai-product-team/demo.ts
import type { AnalyticsClient } from '../../shared/analytics';

const stages = [
  ['任务识别', '识别目标：降低社区活动报名遗漏；约束：仅做网页表单，不接支付。'],
  ['产品经理', '用户故事：居民可在 2 分钟内完成报名并收到可保存的报名编号。'],
  ['用户研究', '风险假设：长者可能不理解“场次”；验证问题：他们当前如何电话报名？'],
  ['评审', '范围裁剪：首版不做账号、候补队列、自动短信和活动推荐。'],
  ['原型', '三屏流程：活动说明 → 联系方式与场次 → 编号确认。'],
  ['任务板', '拆成表单校验、名额接口、确认页和移动端验收四项可交付任务。'],
] as const;

export function mountAiDemo(root: Element, analytics: AnalyticsClient): () => void {
  root.innerHTML = `<div class="demo-panel"><p class="eyebrow">完全虚构案例</p>
    <h2>把一段会议记录转成可执行需求</h2>
    <blockquote>“我们想做一个社区活动报名工具，减少电话登记遗漏；先验证移动网页，不做支付。”</blockquote>
    <button type="button" data-demo-start>开始协作演示</button><ol class="stage-list" aria-live="polite"></ol>
    <button type="button" data-case-open hidden>打开验收产物</button><div data-artifact hidden>验收：必填错误明确、名额不足不提交、成功生成报名编号。</div>
  </div>`;
  const controller = new AbortController();
  const list = root.querySelector<HTMLOListElement>('.stage-list')!;
  root.querySelector('[data-demo-start]')!.addEventListener('click', () => {
    if (list.children.length) return;
    analytics.track('demo_start');
    stages.forEach(([role, output]) => list.insertAdjacentHTML('beforeend', `<li><strong>${role}</strong><p>${output}</p></li>`));
    (root.querySelector('[data-case-open]') as HTMLButtonElement).hidden = false;
    analytics.track('demo_complete');
  }, { signal: controller.signal });
  root.querySelector('[data-case-open]')!.addEventListener('click', () => {
    (root.querySelector('[data-artifact]') as HTMLElement).hidden = false;
    analytics.track('case_open', { artifact: 'acceptance' });
  }, { signal: controller.signal });
  return () => controller.abort();
}
```

- [ ] **Step 4: 运行测试并提交**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/ai-product-team/index.test.ts`

Expected: PASS，1 个测试通过。

```bash
git add github/four-experiment-pilot/src/apps/ai-product-team
git commit -m "feat: add fictional ai product team demo"
```

### Task 4: AI 产品部完整服务页与挂载契约

**Files:**
- Modify: `github/four-experiment-pilot/src/apps/ai-product-team/index.test.ts`
- Create: `github/four-experiment-pilot/src/apps/ai-product-team/index.ts`
- Modify: `github/four-experiment-pilot/src/apps/ai-product-team/mount.ts`

- [ ] **Step 1: 在测试文件末尾加入页面内容与挂载失败测试**

```ts
import { mountAiProductTeam } from './mount';

it('呈现适配边界、部署对比、交付信息与三档价格', async () => {
  document.body.innerHTML = '<main id="app"></main>';
  const analytics = { track: vi.fn(), flush: vi.fn() };
  const cleanup = await mountAiProductTeam(document.querySelector('#app')!, analytics);
  expect(document.body.textContent).toContain('个人产品经理、创业者、5–30 人产品研发团队');
  expect(document.body.textContent).toContain('不出售提示词包');
  expect(document.body.textContent).toContain('¥2999 起');
  expect(document.body.textContent).toContain('不适合');
  expect(analytics.track).toHaveBeenCalledWith('service_view');
  cleanup();
  expect(document.querySelector('#app')!.innerHTML).toBe('');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/ai-product-team/index.test.ts`

Expected: FAIL，平台现有 `mount.ts` 仍挂载占位页，未从 `./index` 导出 `mountAiProductTeam`，或 `./index` 尚不存在。

- [ ] **Step 3: 实现页面组合并让主平台入口转导出真实页面**

```ts
// src/apps/ai-product-team/index.ts
import type { AnalyticsClient } from '../../shared/analytics';
import { mountLeadForm } from '../service-shared/lead-form';
import { renderPriceCards, sectionMarkup } from '../service-shared/service-page';
import '../service-shared/service-page.css';
import { mountAiDemo } from './demo';

export async function mountAiProductTeam(root: HTMLElement, analytics: AnalyticsClient): Promise<() => void> {
  root.innerHTML = `<div class="service-page"><main class="service-main">
    <header class="hero"><p class="eyebrow">AI 产品部部署服务</p><h1>把中文 AI 产品部安装进现有工作环境</h1>
    <p class="lede">面向个人产品经理、创业者、5–30 人产品研发团队。不出售提示词包，交付可持续工作的 PRD、研究、评审、Demo、优先级和任务跟踪流程。</p></header>
    <div data-demo></div>
    <div class="grid">
      ${sectionMarkup({ title: '适合', items: ['已有明确产品工作流，希望减少重复解释与手工拆解', '愿意提供可公开或已脱敏的流程样例'] })}
      ${sectionMarkup({ title: '不适合', items: ['希望一次生成替代业务判断', '要求使用雇主机密材料作为展示案例'] })}
      ${sectionMarkup({ title: '部署前后', items: ['部署前：背景散落、工具切换、产物口径不一', '部署后：固定入口、角色分工、产物模板和任务追踪一致'] })}
    </div>
    ${sectionMarkup({ title: 'AI 员工与产物', items: ['产品经理：问题定义与 PRD', '用户研究：证据、假设与访谈问题', '评审与原型：风险清单和可操作 Demo', '任务板：负责人、验收标准与状态'] })}
    ${sectionMarkup({ title: '固定交付边界与周期', items: ['需求诊断：材料齐备后 1 个工作日；标准部署：范围确认后 3 个工作日', '团队定制周期在付费诊断后书面确认，不承诺未评估的即时上线', '客户需提供目标、现有流程、可用工具权限和已脱敏样例', '不包含无限修改、代替决策、外部账号验证或未经确认的系统集成'] })}
    <section class="service-section"><h2>首轮测试价格</h2><div class="price-grid" data-prices></div><p class="muted">点击仅表达咨询意愿，不进入支付或自动成交。</p></section>
    <section class="lead-panel"><h2>申请首批试点</h2><div data-lead></div></section>
    <p class="muted">正式收费和扩大投放前，将对名称与首屏表达进行定向法律检查；本说明不构成法律保证。</p>
  </main></div>`;
  analytics.track('service_view');
  const lead = mountLeadForm(root.querySelector('[data-lead]')!, 'ai-product-team', analytics);
  const cleanups = [
    mountAiDemo(root.querySelector('[data-demo]')!, analytics),
    renderPriceCards(root.querySelector('[data-prices]')!, [
      { id: 'diagnosis', name: '需求诊断', price: '¥299', note: '定位问题与部署建议' },
      { id: 'standard', name: '标准部署', price: '¥999', note: '安装固定产品工作流' },
      { id: 'custom', name: '团队定制', price: '¥2999 起', note: '按团队环境评估范围' },
    ], analytics, (id) => lead.selectPrice(id)),
    lead.cleanup,
  ];
  return () => { cleanups.forEach((cleanup) => cleanup()); root.innerHTML = ''; };
}
```

```ts
// src/apps/ai-product-team/mount.ts
export { mountAiProductTeam } from "./index";
```

- [ ] **Step 4: 先验证主平台入口已脱离占位页，再运行测试并提交**

Run: `cd github/four-experiment-pilot && rg -n -F 'export { mountAiProductTeam } from "./index";' src/apps/ai-product-team/mount.ts`

Expected: 命中且仅命中 `export { mountAiProductTeam } from "./index";`，`mount.ts` 中不再存在占位页 DOM 或占位挂载函数。

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/ai-product-team/index.test.ts`

Expected: PASS，2 个测试通过。

```bash
git add github/four-experiment-pilot/src/apps/ai-product-team
git commit -m "feat: compose ai product team service page"
```

### Task 5: 48 小时原型冲刺案例与范围交互

**Files:**
- Create: `github/four-experiment-pilot/src/apps/prototype-sprint/index.test.ts`
- Create: `github/four-experiment-pilot/src/apps/prototype-sprint/cases.ts`

- [ ] **Step 1: 写案例入口与范围事件失败测试**

```ts
// src/apps/prototype-sprint/index.test.ts
import { describe, expect, it, vi } from 'vitest';
import { mountCases } from './cases';

describe('原型冲刺案例', () => {
  it('提供两款游戏和虚构通用产品案例，并记录打开与范围展开', () => {
    document.body.innerHTML = '<div id="cases"></div>';
    const analytics = { track: vi.fn(), flush: vi.fn() };
    const cleanup = mountCases(document.querySelector('#cases')!, analytics);
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-case]')].map((link) => link.pathname);
    expect(links).toEqual(['/nine-grid-beasts', '/paper-town']);
    document.querySelector<HTMLElement>('[data-generic-case]')!.click();
    expect(document.body.textContent).toContain('社区工具借用预约页');
    expect(analytics.track).toHaveBeenCalledWith('case_open', { case_id: 'generic-booking' });
    document.querySelector<HTMLDetailsElement>('[data-scope]')!.open = true;
    document.querySelector('[data-scope]')!.dispatchEvent(new Event('toggle'));
    expect(analytics.track).toHaveBeenCalledWith('scope_expand');
    cleanup();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/prototype-sprint/index.test.ts`

Expected: FAIL，提示无法解析 `./cases`。

- [ ] **Step 3: 实现原创案例入口和范围说明**

```ts
// src/apps/prototype-sprint/cases.ts
import type { AnalyticsClient } from '../../shared/analytics';

export function mountCases(root: Element, analytics: AnalyticsClient): () => void {
  root.innerHTML = `<section class="service-section"><h2>直接体验案例</h2><div class="grid">
    <a data-case="nine-grid-beasts" href="/nine-grid-beasts">九格异兽：原创异兽构筑单局</a>
    <a data-case="paper-town" href="/paper-town">纸镇失控：主动划屏剪纸塔防</a>
    <button type="button" data-generic-case>打开通用产品页面案例</button>
  </div><article data-generic-output hidden><h3>社区工具借用预约页</h3><p>虚构流程：选择工具与时段 → 填写联系方式 → 查看预约编号。首版不含支付、账号和信用评分。</p></article></section>
  <details class="service-section" data-scope><summary>查看 48 小时适用边界</summary>
    <p>仅适用于需求已锁定、素材和账号不构成阻塞的标准范围。复杂系统先进行付费诊断，不承诺无限修改。</p>
  </details>`;
  const controller = new AbortController();
  root.addEventListener('click', (event) => {
    const caseLink = (event.target as Element).closest<HTMLElement>('[data-case]');
    if (caseLink) analytics.track('case_open', { case_id: caseLink.dataset.case! });
    if ((event.target as Element).closest('[data-generic-case]')) {
      (root.querySelector('[data-generic-output]') as HTMLElement).hidden = false;
      analytics.track('case_open', { case_id: 'generic-booking' });
    }
  }, { signal: controller.signal });
  root.querySelector('[data-scope]')!.addEventListener('toggle', (event) => {
    if ((event.target as HTMLDetailsElement).open) analytics.track('scope_expand');
  }, { signal: controller.signal });
  return () => controller.abort();
}
```

- [ ] **Step 4: 运行测试并提交**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/prototype-sprint/index.test.ts`

Expected: PASS，1 个测试通过。

```bash
git add github/four-experiment-pilot/src/apps/prototype-sprint
git commit -m "feat: add prototype sprint cases and scope"
```

### Task 6: 48 小时原型冲刺完整服务页与挂载契约

**Files:**
- Modify: `github/four-experiment-pilot/src/apps/prototype-sprint/index.test.ts`
- Create: `github/four-experiment-pilot/src/apps/prototype-sprint/index.ts`
- Modify: `github/four-experiment-pilot/src/apps/prototype-sprint/mount.ts`

- [ ] **Step 1: 在测试文件末尾加入完整页面失败测试**

```ts
import { mountPrototypeSprint } from './mount';

it('呈现四步流程、交付边界、三档价格和服务事件', async () => {
  document.body.innerHTML = '<main id="app"></main>';
  const analytics = { track: vi.fn(), flush: vi.fn() };
  const cleanup = await mountPrototypeSprint(document.querySelector('#app')!, analytics);
  expect(document.body.textContent).toContain('创业者、产品负责人、独立开发者、小游戏团队和营销互动项目负责人');
  expect(document.body.textContent).toContain('输入 → 锁定范围 → 制作验证 → 交付建议');
  expect(document.body.textContent).toContain('¥5999 起');
  expect(document.body.textContent).toContain('1 轮范围内修改');
  expect(analytics.track).toHaveBeenCalledWith('service_view');
  cleanup();
  expect(document.querySelector('#app')!.innerHTML).toBe('');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/prototype-sprint/index.test.ts`

Expected: FAIL，平台现有 `mount.ts` 仍挂载占位页，未从 `./index` 导出 `mountPrototypeSprint`，或 `./index` 尚不存在。

- [ ] **Step 3: 实现页面组合并让主平台入口转导出真实页面**

```ts
// src/apps/prototype-sprint/index.ts
import type { AnalyticsClient } from '../../shared/analytics';
import { mountLeadForm } from '../service-shared/lead-form';
import { renderPriceCards, sectionMarkup } from '../service-shared/service-page';
import '../service-shared/service-page.css';
import { mountCases } from './cases';

export async function mountPrototypeSprint(root: HTMLElement, analytics: AnalyticsClient): Promise<() => void> {
  root.innerHTML = `<div class="service-page"><main class="service-main">
    <header class="hero"><p class="eyebrow">48 小时可玩验证冲刺</p><h1>先让关键人实际操作，再决定是否正式开发</h1>
    <p class="lede">面向创业者、产品负责人、独立开发者、小游戏团队和营销互动项目负责人；在固定范围内交付高保真 H5 垂直切片、需求说明、AI 模拟评审和下一步投入建议。</p></header>
    ${sectionMarkup({ title: '四步流程', items: ['输入 → 锁定范围 → 制作验证 → 交付建议', '开始前确认目标、核心路径、素材与账号条件'] })}
    <div data-cases></div>
    <div class="grid">
      ${sectionMarkup({ title: '包含', items: ['一条已锁定核心路径', '高保真 H5 垂直切片', '需求说明、AI 模拟评审、下一步投入建议', '1 轮范围内修改'] })}
      ${sectionMarkup({ title: '不包含', items: ['正式生产系统与长期运维', '无限修改、支付接入、外部账号代验证', '未经诊断的复杂后台与多角色权限'] })}
      ${sectionMarkup({ title: '交付格式', items: ['可访问 H5 链接', 'Markdown 需求说明与评审记录', '范围、风险与下一步投入清单'] })}
    </div>
    <section class="service-section"><h2>首轮测试价格</h2><div class="price-grid" data-prices></div><p class="muted">点击仅表达咨询意愿，不进入支付或自动成交。</p></section>
    <section class="lead-panel"><h2>提交需求进行报价</h2><div data-lead></div></section>
    <p class="muted">案例不使用公司内部项目。正式收费和扩大投放前将进行定向法律检查；本说明不构成法律保证。</p>
  </main></div>`;
  analytics.track('service_view');
  const lead = mountLeadForm(root.querySelector('[data-lead]')!, 'prototype-sprint', analytics);
  const cleanups = [
    mountCases(root.querySelector('[data-cases]')!, analytics),
    renderPriceCards(root.querySelector('[data-prices]')!, [
      { id: 'single-page', name: '单页面产品 Demo', price: '¥999', note: '单路径页面验证' },
      { id: 'interactive', name: '完整交互验证', price: '¥2999', note: '完整核心路径验证' },
      { id: 'game-slice', name: '游戏可玩切片', price: '¥5999 起', note: '按玩法范围评估' },
    ], analytics, (id) => lead.selectPrice(id)),
    lead.cleanup,
  ];
  return () => { cleanups.forEach((cleanup) => cleanup()); root.innerHTML = ''; };
}
```

```ts
// src/apps/prototype-sprint/mount.ts
export { mountPrototypeSprint } from "./index";
```

- [ ] **Step 4: 先验证主平台入口已脱离占位页，再运行测试并提交**

Run: `cd github/four-experiment-pilot && rg -n -F 'export { mountPrototypeSprint } from "./index";' src/apps/prototype-sprint/mount.ts`

Expected: 命中且仅命中 `export { mountPrototypeSprint } from "./index";`，`mount.ts` 中不再存在占位页 DOM 或占位挂载函数。

Run: `cd github/four-experiment-pilot && npm test -- --run src/apps/prototype-sprint/index.test.ts`

Expected: PASS，2 个测试通过。

```bash
git add github/four-experiment-pilot/src/apps/prototype-sprint
git commit -m "feat: compose prototype sprint service page"
```

### Task 7: 两个服务页的端到端主链路

**Files:**
- Create: `github/four-experiment-pilot/tests/e2e/service-pages.spec.ts`

- [ ] **Step 1: 写公开页面、咨询成功和网络失败 E2E 测试**

```ts
// tests/e2e/service-pages.spec.ts
import { expect, test } from '@playwright/test';

test('AI 产品部完成案例、查看价格并提交试点咨询', async ({ page }) => {
  await page.route('**/api/leads', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ leadId: 'e2e-ai', submittedAt: '2026-08-05T00:00:00Z' }),
  }));
  await page.goto('/ai-product-team');
  await page.getByRole('button', { name: '开始协作演示' }).click();
  await expect(page.locator('.stage-list li')).toHaveCount(6);
  await page.locator('[data-price-id="standard"]').click();
  await page.getByLabel('联系方式').fill('demo@example.com');
  await page.getByLabel('需求摘要').fill('希望安装稳定的中文产品需求与评审流程。');
  await page.getByLabel(/同意仅将以上信息/).check();
  await page.getByRole('button', { name: '提交试点申请' }).click();
  await expect(page.getByRole('status')).toContainText('不代表已付款或自动成交');
});

test('原型冲刺在移动端可打开案例，失败提交保留内容', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/leads', (route) => route.abort('failed'));
  await page.goto('/prototype-sprint');
  await expect(page.locator('[data-case]')).toHaveCount(2);
  await page.getByRole('button', { name: '打开通用产品页面案例' }).click();
  await expect(page.getByText('社区工具借用预约页')).toBeVisible();
  await page.locator('[data-price-id="interactive"]').click();
  await page.getByLabel('联系方式').fill('prototype-contact');
  await page.getByLabel('需求摘要').fill('需要验证一个移动端预约产品的完整核心路径。');
  await page.getByLabel(/同意仅将以上信息/).check();
  await page.getByRole('button', { name: '提交试点申请' }).click();
  await expect(page.getByRole('status')).toContainText('已填写内容仍保留');
  await expect(page.getByLabel('联系方式')).toHaveValue('prototype-contact');
});

test('UTM：三类产品化服务入口保留独立投放参数', async ({ page }) => {
  const entries = [
    '/ai-product-team?utm_source=xianyu&utm_medium=marketplace&utm_campaign=service_pilot',
    '/ai-product-team?utm_source=product_community&utm_medium=community&utm_campaign=service_pilot',
    '/prototype-sprint?utm_source=v2ex&utm_medium=social&utm_campaign=service_pilot',
  ];
  for (const entry of entries) {
    await page.goto(entry);
    await expect(page.locator('h1')).toBeVisible();
    expect(new URL(page.url()).searchParams.get('utm_campaign')).toBe('service_pilot');
  }
});
```

- [ ] **Step 2: 运行 E2E 并修正集成问题**

Run: `cd github/four-experiment-pilot && npx playwright test tests/e2e/service-pages.spec.ts --project=chromium`

Expected: PASS，3 个测试通过；两个页面无未处理的浏览器错误。

- [ ] **Step 3: 运行全量验证并提交**

Run: `cd github/four-experiment-pilot && npm test -- --run && npx playwright test tests/e2e/service-pages.spec.ts --project=chromium`

Expected: Vitest 全部 PASS；服务页 Playwright 3 个测试全部 PASS。

```bash
git add github/four-experiment-pilot/tests/e2e/service-pages.spec.ts
git commit -m "test: cover service experiment journeys"
```

### Task 8: 规格、接口和原创边界验收

**Files:**
- Verify: `github/four-experiment-pilot/src/apps/service-shared/**`
- Verify: `github/four-experiment-pilot/src/apps/ai-product-team/**`
- Verify: `github/four-experiment-pilot/src/apps/prototype-sprint/**`
- Verify: `github/four-experiment-pilot/tests/e2e/service-pages.spec.ts`

- [ ] **Step 1: 验证两个平台导出契约与共享 API 名称**

Run: `cd github/four-experiment-pilot && rg "export async function mount(AiProductTeam|PrototypeSprint)|AnalyticsClient|submitLead" src/apps`

Expected: 仅出现 `mountAiProductTeam(root: HTMLElement, analytics: AnalyticsClient): Promise<() => void>`、`mountPrototypeSprint(root: HTMLElement, analytics: AnalyticsClient): Promise<() => void>`、从 `src/shared/analytics.ts` 对应相对路径导入的 `AnalyticsClient`，以及从 `src/shared/leads.ts` 对应相对路径导入并调用的 `submitLead`。

- [ ] **Step 2: 验证事件、价格、边界和禁止内容**

Run: `cd github/four-experiment-pilot && rg "service_view|demo_start|demo_complete|case_open|scope_expand|pricing_view|pricing_click|lead_start|lead_submit|¥299|¥999|¥2999|¥5999|不代表已付款或自动成交|雇主内部|不构成法律保证" src/apps`

Expected: AI 页包含其 8 个事件、三档价格和试点声明；原型页包含其 7 个事件、三档价格、48 小时边界和法律提示；虚构案例不包含真实雇主名称、内部数据或客户标识。

- [ ] **Step 3: 执行类型、单元和浏览器回归**

Run: `cd github/four-experiment-pilot && npm run typecheck && npm test -- --run && npx playwright test tests/e2e/service-pages.spec.ts --project=chromium`

Expected: TypeScript 零错误；Vitest 全部 PASS；服务页 Playwright 3 个测试全部 PASS。

- [ ] **Step 4: 只读验证三类真实投放入口的 UTM 保留能力**

Run: `cd github/four-experiment-pilot && npx playwright test tests/e2e/service-pages.spec.ts --project=chromium --grep "UTM"`

Expected: PASS，服务页 UTM 用例证明三类入口参数在路由加载后仍保留；`service_view` 携带 UTM 的上报正确性由主管计划的平台 analytics 测试负责，本计划不重复实现采集逻辑。

- [ ] **Step 5: 完成人工投放交接，不代用户执行外部发布**

确认交接清单：闲鱼或其他允许数字服务的平台、产品经理/创业者/独立开发者社群、V2EX/即刻/小红书分别使用独立 UTM；所有发帖、商品创建和潜在客户联系仅由用户本人账号执行；首次登录的验证码、设备确认和平台协议由用户本人完成；不得规避平台限制或批量骚扰陌生用户。

Expected: 交接清单逐项确认，实施者未登录、未发布、未联系任何外部账号或人员。

- [ ] **Step 6: 提交只读验收结果对应的最终代码状态**

```bash
git status --short
git log --oneline -7
```

Expected: 工作区无未提交的服务页改动；最近提交包含共享价格、咨询表单、AI 案例、AI 页面、原型案例、原型页面和 E2E 七个独立提交。
