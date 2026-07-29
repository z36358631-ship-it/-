import type { ThreeLaneSave } from "../meta/saveModel";
import { nextProgressionGoal } from "../meta/progression";
import { formationLabel, variantLabel } from "./labels";

const DOCTRINES = {
  "opening-scout": ["开局侦察", "首页提前公布下一场规则，帮助决定初始落位"],
  "rapid-relay": ["快速接力", "每局首次跨路调兵冷却由 4 秒缩短为 3 秒"],
  "reserve-slot": ["预备席", "完成一次三路均衡阵型后解锁的战术荣誉"],
} as const;

export function createProgressView(save: ThreeLaneSave, onBack: () => void): HTMLElement {
  const goal = nextProgressionGoal(save);
  const root = document.createElement("main");
  root.className = "progress-view";
  root.innerHTML = `
    <header class="page-header">
      <button type="button" data-action="back" class="back-button" aria-label="返回首页">‹</button>
      <div><p>COMMAND ARCHIVE</p><h1>战术成长</h1></div>
      <span class="level-badge">${save.commanderLevel}</span>
    </header>
    <section class="progress-hero">
      <p>你的成长改变<strong>可选策略</strong>，不会增加永久攻击或生命。</p>
      <div class="level-track"><span style="width:${save.commanderLevel * 10}%"></span></div>
      <small>指挥官等级 ${save.commanderLevel} / 10</small>
    </section>
    <aside class="next-goal" aria-label="下一成长目标">
      <span>下一目标</span>
      <div><h2>${goal.title}</h2><p>${goal.detail}</p></div>
      <strong>${goal.progress}</strong>
    </aside>
    <section class="progress-section">
      <div class="section-heading"><h2>战术条令</h2><span>${save.unlockedDoctrineIds.length}/3</span></div>
      <div class="doctrine-list">
        ${Object.entries(DOCTRINES).map(([id, [name, detail]]) => {
          const unlocked = save.unlockedDoctrineIds.includes(id as keyof typeof DOCTRINES);
          return `<article class="doctrine-card ${unlocked ? "is-unlocked" : "is-locked"}">
            <span class="doctrine-icon">${unlocked ? "✦" : "◇"}</span>
            <div><h3>${name}</h3><p>${unlocked ? detail : "继续完成远征后解锁"}</p></div>
          </article>`;
        }).join("")}
      </div>
    </section>
    <section class="progress-section">
      <div class="section-heading"><h2>最近远征</h2><span>${save.runHistory.length} 局</span></div>
      <div class="history-list">
        ${save.runHistory.length === 0
          ? '<p class="empty-state">完成第一局后，这里会记录你的阵型与结果。</p>'
          : save.runHistory.slice(-5).reverse().map((run) => `
            <article><b>${run.result === "won" ? "胜利" : "失守"}</b>
              <span>${variantLabel(run.variant)}</span><span>${formationLabel(run.formationTag)}</span>
              <time>${Math.ceil(run.elapsedMs / 1000)} 秒</time>
            </article>`).join("")}
      </div>
    </section>
  `;
  root.querySelector('[data-action="back"]')!.addEventListener("click", onBack);
  return root;
}
