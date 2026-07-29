import { HEROES } from "../content/heroes";
import type { BattleState, HeroId } from "../domain/types";
import { HERO_ATLAS } from "./heroAtlas";
import { heroRoleLabel, variantLabel } from "./labels";

export function createHud(input: {
  state: BattleState;
  selectedHeroId: HeroId | null;
  message: string;
  onPause: () => void;
  onUndo: () => void;
  onEvolve: () => void;
}): HTMLElement {
  const { state } = input;
  const root = document.createElement("section");
  root.className = "battle-hud";
  root.setAttribute("aria-label", "战斗状态");
  const seconds = Math.floor(state.elapsedMs / 1000);
  const focusSeconds = Math.max(0, Math.ceil((state.focusFire.readyAtMs - state.elapsedMs) / 1000));
  const availablePair = state.heroes.some((hero, index) =>
    hero.tier === 1 && state.heroes.some((other, otherIndex) =>
      otherIndex !== index && other.tier === 1 && other.heroId === hero.heroId,
    ),
  );
  root.innerHTML = `
    <div class="battle-topbar">
      <div class="resource-pill"><span>✦</span><output data-live="energy" aria-label="能源">${Math.floor(state.energy)}</output></div>
      <div class="timer-pill"><small>${variantLabel(state.variant)}</small><time data-live="timer">${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}</time></div>
      <div class="base-pill" data-live="base" aria-label="基地耐久">${Array.from({ length: state.baseMaxHealth }, (_, index) => `<i class="${index < state.baseHealth ? "alive" : ""}"></i>`).join("")}</div>
      <button type="button" class="pause-button" data-action="pause" aria-label="暂停游戏">Ⅱ</button>
    </div>
    ${state.laneLock ? `<div class="lane-warning" data-live="lane-lock" role="status">第 ${state.laneLock.lane + 1} 路已封锁 · ${Math.ceil((state.laneLock.endsAtMs - state.elapsedMs) / 1000)} 秒</div>` : ""}
    ${state.boss.phase === "charge" ? `<div class="boss-warning" role="alert">首领正在第 ${state.boss.lane + 1} 路蓄力！点按首领集火打断</div>` : ""}
    <div class="battle-message" aria-live="polite">${input.message}</div>
    <div class="tactical-actions">
      <button type="button" data-action="undo">撤回 <small>3秒</small></button>
      <button type="button" data-action="evolve" ${availablePair ? "" : "disabled"}>合并进化</button>
      <span class="focus-readiness ${focusSeconds === 0 ? "ready" : ""}" data-live="focus">集火 ${focusSeconds === 0 ? "就绪" : `${focusSeconds}s`}</span>
    </div>
    <div class="hero-tray" aria-label="英雄卡牌">
      ${(Object.keys(HEROES) as HeroId[]).map((heroId) => {
        const hero = HEROES[heroId];
        const atlas = HERO_ATLAS[heroId];
        const selected = input.selectedHeroId === heroId;
        return `<button type="button" class="hero-card ${selected ? "is-selected" : ""}" data-hero-card="${heroId}" aria-pressed="${selected}">
          <span
            class="portrait"
            aria-hidden="true"
            style="--hero-color:${hero.color};--hero-sprite-x:${atlas.cssX};--hero-sprite-y:${atlas.cssY}"
          ></span>
          <span class="hero-info"><b>${hero.name}</b><small>${heroRoleLabel(hero.role)}</small></span>
          <span class="cost">${hero.cost}</span>
        </button>`;
      }).join("")}
    </div>
  `;
  root.querySelector('[data-action="pause"]')!.addEventListener("click", input.onPause);
  root.querySelector('[data-action="undo"]')!.addEventListener("click", input.onUndo);
  root.querySelector('[data-action="evolve"]')!.addEventListener("click", input.onEvolve);
  return root;
}
