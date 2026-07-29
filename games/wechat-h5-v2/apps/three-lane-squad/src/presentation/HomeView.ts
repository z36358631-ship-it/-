import { standardVariantForRun } from "../domain/createBattle";

const VARIANT_COPY = {
  "balanced-front": {
    title: "均衡前线",
    detail: "三路轮番压境，考验基础阵型与资源分配",
    icon: "Ⅲ",
  },
  lockdown: {
    title: "封锁战",
    detail: "中路将在 45 秒封锁，必须提前跨路接应",
    icon: "⌁",
  },
  "elite-rush": {
    title: "精英突袭",
    detail: "高威胁单位提前登场，集火时机决定成败",
    icon: "✦",
  },
} as const;

export function createHomeView(input: {
  nextRunOrdinal: number;
  dailyDate: string;
  commanderLevel: number;
  onStandard: () => void;
  onDaily: () => void;
  onProgress: () => void;
}): HTMLElement {
  const variant = standardVariantForRun(input.nextRunOrdinal);
  const copy = VARIANT_COPY[variant];
  const root = document.createElement("main");
  root.className = "home-view";
  root.innerHTML = `
    <div class="home-atmosphere" aria-hidden="true">
      <span class="lane-beam lane-beam-a"></span>
      <span class="lane-beam lane-beam-b"></span>
      <span class="lane-beam lane-beam-c"></span>
      <span class="fortress-mark">Ⅲ</span>
    </div>
    <header class="home-topbar">
      <span class="brand-chip">GAMEHUB · 战术实验室</span>
      <button type="button" class="icon-button" data-action="progress" aria-label="查看战术成长">
        <span>指挥官 ${input.commanderLevel}</span><b>⌁</b>
      </button>
    </header>
    <section class="hero-copy" aria-labelledby="game-title">
      <p class="eyebrow">六分钟 · 三路实时调度</p>
      <h1 id="game-title"><span>三路</span>小队</h1>
      <p class="tagline">部署不是答案，<strong>及时改变阵型</strong>才是。</p>
      <div class="feature-row" aria-label="核心玩法">
        <span>拖放部署</span><span>一次进化</span><span>跨路驰援</span><span>集火打断</span>
      </div>
    </section>
    <section class="mission-card" aria-labelledby="next-mission">
      <div class="mission-icon" aria-hidden="true">${copy.icon}</div>
      <div>
        <p>下一场 · 第 ${input.nextRunOrdinal + 1} 局</p>
        <h2 id="next-mission">${copy.title}</h2>
        <p>${copy.detail}</p>
      </div>
      <span class="mission-arrow" aria-hidden="true">›</span>
    </section>
    <section class="home-actions">
      <button type="button" data-action="standard" class="primary-action">
        <span>开始出征</span><small>进入 ${copy.title}</small>
      </button>
      <button type="button" data-action="daily" class="secondary-action">
        <span>每日挑战</span><small>${input.dailyDate} · 固定敌序</small>
      </button>
    </section>
    <p class="ethical-note">无体力 · 无永久战力 · 最近七日均可补玩</p>
  `;
  root.querySelector('[data-action="standard"]')!.addEventListener("click", input.onStandard);
  root.querySelector('[data-action="daily"]')!.addEventListener("click", input.onDaily);
  root.querySelector('[data-action="progress"]')!.addEventListener("click", input.onProgress);
  return root;
}
