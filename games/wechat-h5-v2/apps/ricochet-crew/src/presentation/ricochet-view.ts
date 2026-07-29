import { HEROES } from "../content/catalog";
import type {
  AimPreview,
  HeroId,
  RicochetSnapshot,
} from "../game/contracts";
import type { RicochetProgressV1 } from "../run/progression";
import type { DailyRunOption } from "../run/daily";

export type ViewAction =
  | { readonly kind: "hero"; readonly heroId: HeroId }
  | { readonly kind: "start" }
  | { readonly kind: "daily"; readonly dateKey: string }
  | { readonly kind: "skill" }
  | { readonly kind: "choose"; readonly modifierId: string }
  | { readonly kind: "retry" }
  | { readonly kind: "fresh" }
  | { readonly kind: "home" };

export class RicochetView {
  private readonly frame: HTMLElement;
  private readonly screen: HTMLElement;
  private readonly play: HTMLElement;
  private readonly arena: HTMLElement;
  private readonly world: HTMLElement;
  private readonly trajectory: SVGPolylineElement;
  private readonly choice: HTMLElement;
  private action: (action: ViewAction) => void =
    () => undefined;
  private heroId: HeroId = "tuo";

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="rc-frame" data-screen="home">
        <div class="rc-screen"></div>
        <section class="rc-play" hidden>
          <header class="rc-hud">
            <div class="rc-hud-portrait" data-role="hero-portrait" role="img"></div>
            <div><span>ROOM</span><strong data-role="room">1 / 5</strong></div>
            <div><span>SCORE</span><strong data-role="score">0</strong></div>
            <div><span>SHOTS</span><strong data-role="shots">● ● ● ● ●</strong></div>
          </header>
          <div class="rc-arena" role="application" aria-label="弹珠反弹战场">
            <svg class="trajectory" viewBox="0 0 390 844" preserveAspectRatio="none" aria-hidden="true"><polyline points=""></polyline></svg>
            <div class="rc-world"></div>
            <div class="launcher"><i></i><span>向后拖动瞄准</span></div>
          </div>
          <div class="flight-bar">
            <div><span data-role="hero">岩铠·拓</span><strong data-role="combo">COMBO ×0</strong></div>
            <button data-action="skill">途中技能</button>
          </div>
          <section class="choice-panel" hidden></section>
        </section>
      </div>`;
    this.frame = root.querySelector(".rc-frame")!;
    this.screen = root.querySelector(".rc-screen")!;
    this.play = root.querySelector(".rc-play")!;
    this.arena = root.querySelector(".rc-arena")!;
    this.world = root.querySelector(".rc-world")!;
    this.trajectory = root.querySelector(".trajectory polyline")!;
    this.choice = root.querySelector(".choice-panel")!;
    root.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<
        HTMLButtonElement
      >("[data-action]");
      if (!button) return;
      const kind = button.dataset.action;
      if (kind === "hero") {
        this.heroId = button.dataset.hero as HeroId;
        this.action({ kind: "hero", heroId: this.heroId });
      } else if (kind === "choose") {
        this.action({
          kind: "choose",
          modifierId: button.dataset.modifier!,
        });
      } else if (kind === "daily") {
        this.action({
          kind: "daily",
          dateKey: button.dataset.date!,
        });
      } else if (
        kind === "start" ||
        kind === "skill" ||
        kind === "retry" ||
        kind === "fresh" ||
        kind === "home"
      ) {
        this.action({ kind });
      }
    });
  }

  onAction(handler: (action: ViewAction) => void): void {
    this.action = handler;
  }

  inputElement(): HTMLElement {
    return this.arena;
  }

  selectedHero(): HeroId {
    return this.heroId;
  }

  private setScreen(value: string): void {
    this.frame.dataset.screen = value;
    this.play.hidden = value !== "playing";
    this.screen.hidden = value === "playing";
  }

  renderHome(
    progress: RicochetProgressV1,
    dailyOptions: readonly DailyRunOption[],
  ): void {
    this.setScreen("home");
    this.screen.innerHTML = `
      <section class="rc-home">
        <div class="rc-home-top"><span>遗迹远征 · 第 ${progress.runCount + 1} 次</span></div>
        <div class="rc-logo"><small>SWEEP RICOCHET ROGUELITE</small><h1>弹珠<br><em>暴走团</em></h1><p>瞄准不是等待——弹珠飞行途中，你仍能改变战局。</p></div>
        <div class="hero-select">
          ${Object.entries(HEROES).map(([id, hero], index) => {
            const unlocked = progress.unlockedHeroIds.includes(id as HeroId) || index === 0;
            const selected = id === this.heroId;
            const description = unlocked
              ? `${hero.title} · ${hero.skill}`
              : "通关后解锁";
            return `<button data-action="hero" data-hero="${id}" ${unlocked ? "" : "disabled"} class="${selected ? "selected" : ""}" aria-label="${hero.name}，${description}" aria-pressed="${selected}">
              <span class="hero-portrait" data-portrait-position="${hero.portraitPosition}" aria-hidden="true"></span>
              <span class="hero-copy"><strong>${hero.name}</strong><small>${description}</small></span>
            </button>`;
          }).join("")}
        </div>
        <button class="rc-primary" data-action="start">进入遗迹 <small>五房间 · 三选一改造 · 三部位Boss</small></button>
        <div class="daily-wrap">
          <div><strong>七日遗迹</strong><span>固定布局，可反复磨路线</span></div>
          <div class="daily-strip">
            ${dailyOptions.map((day) => `
              <button data-action="daily" data-date="${day.key}" class="${day.today ? "today" : ""}">
                <small>${day.weekday}</small><strong>${day.day}</strong>
              </button>`).join("")}
          </div>
        </div>
      </section>`;
  }

  renderGame(snapshot: RicochetSnapshot): void {
    this.setScreen("playing");
    this.choice.hidden = true;
    this.update(snapshot);
  }

  update(snapshot: RicochetSnapshot): void {
    if (snapshot.mode !== "choosing") {
      this.choice.hidden = true;
      delete this.choice.dataset.offerKey;
    }
    const read = (role: string) =>
      this.play.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
    read("room").textContent =
      snapshot.roomIndex < 5
        ? `${snapshot.roomIndex + 1} / 5`
        : "BOSS";
    read("score").textContent = snapshot.score.toLocaleString("zh-CN");
    const hero = HEROES[snapshot.heroId];
    const heroPortrait = read("hero-portrait");
    heroPortrait.dataset.portraitPosition =
      hero.portraitPosition;
    heroPortrait.setAttribute("aria-label", `${hero.name}头像`);
    read("shots").textContent = Array.from(
      { length: 5 },
      (_, index) =>
        index < snapshot.shotsRemaining ? "●" : "○",
    ).join(" ");
    read("hero").textContent = snapshot.build.length
      ? `${hero.name} · ${snapshot.build
          .slice(-2)
          .map((item) => item.name)
          .join(" / ")}`
      : hero.name;
    read("combo").textContent = `COMBO ×${snapshot.shot?.combo ?? 0}`;
    const skill = this.play.querySelector<HTMLButtonElement>('[data-action="skill"]')!;
    skill.disabled =
      snapshot.mode !== "flying" ||
      !snapshot.shot?.skillAvailable;
    skill.textContent =
      snapshot.mode === "flying"
        ? snapshot.shot?.skillAvailable
          ? `${hero.skill.split("，")[0]}`
          : "技能已用"
        : "发射后可用";
    this.world.innerHTML = `
      ${snapshot.roomIndex === 5 ? '<img class="boss-art" src="./assets/fallback/boss-core.svg" alt="遗迹巨像">' : ""}
      ${snapshot.targets.map((target) => `
        <div class="target ${target.kind} ${target.active ? "" : "broken"}"
          data-target="${target.id}"
          style="left:${(target.position.x / 390) * 100}%;top:${(target.position.y / 844) * 100}%;--size:${target.radius * 2}px;--hp:${(target.hp / target.maxHp) * 100}%">
          <i></i><span>${target.id.startsWith("boss-") ? target.id.slice(5).toUpperCase() : target.kind === "mechanism" ? "⚡" : "◆"}</span>
        </div>`).join("")}
      ${snapshot.shot ? `<div class="projectile" style="left:${(snapshot.shot.position.x / 390) * 100}%;top:${(snapshot.shot.position.y / 844) * 100}%"><i></i></div>` : ""}
    `;
    if (snapshot.mode === "choosing") {
      this.renderChoice(snapshot);
    }
  }

  renderPreview(preview: AimPreview | null): void {
    this.trajectory.setAttribute(
      "points",
      preview?.points
        .map((point) => `${point.x},${point.y}`)
        .join(" ") ?? "",
    );
  }

  renderChoice(snapshot: RicochetSnapshot): void {
    const offerKey = snapshot.offer.map((item) => item.id).join("|");
    this.choice.hidden = false;
    if (this.choice.dataset.offerKey === offerKey) return;
    this.choice.dataset.offerKey = offerKey;
    this.choice.innerHTML = `
      <div class="choice-head"><span>房间突破</span><h2>选一项，改变下一发</h2></div>
      <div class="choice-grid">${snapshot.offer.map((item) => `
        <button data-action="choose" data-modifier="${item.id}">
          <span>${item.tag === "bank" ? "↗" : item.tag === "skill" ? "✦" : "×5"}</span>
          <strong>${item.name}</strong><small>${item.description}</small>
        </button>`).join("")}</div>`;
  }

  renderResult(
    snapshot: RicochetSnapshot,
    progress: RicochetProgressV1,
  ): void {
    this.setScreen("result");
    const won = snapshot.mode === "won";
    this.screen.innerHTML = `
      <section class="rc-result">
        <span class="result-chip">${won ? "核心崩解" : "远征中断"}</span>
        <h2>${snapshot.score.toLocaleString("zh-CN")}</h2><p>遗迹积分</p>
        <div class="result-stats"><div><strong>${snapshot.roomIndex < 5 ? snapshot.roomIndex + 1 : 5}</strong><span>抵达房间</span></div><div><strong>${snapshot.build.length}</strong><span>本局改造</span></div><div><strong>${progress.bestCombo}</strong><span>历史连击</span></div></div>
        <div class="last-shot"><strong>最后一发复盘</strong><p>${won ? "护甲 → 武器 → 核心，破坏顺序正确。" : "尝试换一个反弹角度，并把途中技能留给弹道偏离时。"}</p></div>
        <button class="rc-primary" data-action="retry">按原种子再试 <small>保留布局，换一种构筑</small></button>
        <button class="rc-secondary" data-action="fresh">换一局新遗迹</button>
        <button class="rc-text" data-action="home">返回暴走团</button>
      </section>`;
  }
}
