import type { FormationTag, RunVariant } from "../domain/types";
import { formationLabel, variantLabel } from "./labels";

export function createPauseOverlay(input: {
  muted: boolean;
  reducedMotion: boolean;
  onResume: () => void;
  onMuted: (value: boolean) => void;
  onReducedMotion: (value: boolean) => void;
  onHome: () => void;
}): HTMLElement {
  const root = document.createElement("section");
  root.className = "modal-overlay";
  root.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <p class="modal-kicker">TACTICAL PAUSE</p>
      <h2 id="pause-title">战斗暂停</h2>
      <p>阵型和冷却已经冻结，继续后从当前时刻恢复。</p>
      <label class="setting-row"><span>静音</span><input type="checkbox" data-setting="muted" ${input.muted ? "checked" : ""}></label>
      <label class="setting-row"><span>减少动态效果</span><input type="checkbox" data-setting="motion" ${input.reducedMotion ? "checked" : ""}></label>
      <button type="button" class="primary-action" data-action="resume">继续战斗</button>
      <button type="button" class="secondary-action" data-action="home">返回首页</button>
    </div>`;
  root.querySelector('[data-action="resume"]')!.addEventListener("click", input.onResume);
  root.querySelector('[data-action="home"]')!.addEventListener("click", input.onHome);
  root.querySelector('[data-setting="muted"]')!.addEventListener("change", (event) =>
    input.onMuted((event.currentTarget as HTMLInputElement).checked),
  );
  root.querySelector('[data-setting="motion"]')!.addEventListener("change", (event) =>
    input.onReducedMotion((event.currentTarget as HTMLInputElement).checked),
  );
  return root;
}

const LANE_NAMES = ["左路", "中路", "右路"] as const;
export function createResultOverlay(input: {
  result: "won" | "lost";
  variant: RunVariant;
  formation: FormationTag;
  failureLane: 0 | 1 | 2 | null;
  elapsedMs: number;
  defeated: number;
  longestDecisionGapMs: number;
  nextVariant: RunVariant;
  recoveryAvailable: boolean;
  onReplay: (recovery: boolean) => void;
  onProgress: () => void;
  onHome: () => void;
}): HTMLElement {
  const root = document.createElement("section");
  root.className = "result-view";
  const correction =
    input.result === "won"
      ? `你用「${formationLabel(input.formation)}」守住了三路。下一局规则将改变。`
      : `${input.failureLane === null ? "防线" : LANE_NAMES[input.failureLane]}失守；最长 ${Math.ceil(input.longestDecisionGapMs / 1000)} 秒没有有效调度。下一局只做一件事：三路各留 1 名英雄。`;
  root.innerHTML = `
    <div class="result-sigil ${input.result}" aria-hidden="true">${input.result === "won" ? "✦" : "◇"}</div>
    <p class="modal-kicker">${variantLabel(input.variant)}</p>
    <h1>${input.result === "won" ? "远征成功" : "防线失守"}</h1>
    <p class="result-correction">${correction}</p>
    <div class="result-stats">
      <article><b>${Math.floor(input.elapsedMs / 60_000)}:${String(Math.floor(input.elapsedMs / 1000) % 60).padStart(2, "0")}</b><small>坚持时间</small></article>
      <article><b>${input.defeated}</b><small>击破敌军</small></article>
      <article><b>${formationLabel(input.formation)}</b><small>阵型风格</small></article>
    </div>
    <div class="next-rule"><span>下一局</span><b>${variantLabel(input.nextVariant)}</b><small>敌序与最佳策略将真实变化</small></div>
    ${input.recoveryAvailable
      ? `<section class="recovery-offer">
          <b>连续两次失守，已备好一次整备演练</b>
          <p>下局基地耐久 4（原 3）；敌序、敌人强度和操作规则不变。</p>
        </section>
        <button type="button" class="primary-action" data-action="replay-recovery">带整备再战</button>
        <button type="button" class="secondary-action" data-action="replay">按原难度再战</button>`
      : '<button type="button" class="primary-action" data-action="replay">立即再战</button>'}
    <div class="split-actions">
      <button type="button" class="secondary-action" data-action="progress">查看成长</button>
      <button type="button" class="secondary-action" data-action="home">返回首页</button>
    </div>`;
  root.querySelector('[data-action="replay"]')!.addEventListener("click", () => input.onReplay(false));
  root.querySelector('[data-action="replay-recovery"]')?.addEventListener("click", () => input.onReplay(true));
  root.querySelector('[data-action="progress"]')!.addEventListener("click", input.onProgress);
  root.querySelector('[data-action="home"]')!.addEventListener("click", input.onHome);
  return root;
}
