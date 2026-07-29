import type {
  Board,
  IngredientId,
  Order,
  RecipeId,
  ShiftPreview,
} from "../domain/types";
import type { ControllerSnapshot } from "../app/create-night-market-controller";
import type {
  NearMiss,
  NightMarketSaveV1,
} from "../meta/night-market-save";
import type { BoardRect } from "../input/map-input-intent";
import {
  buildAnimationTimeline,
  playAnimationTimeline,
} from "./presentation-rules";
import {
  INGREDIENTS,
  RECIPES,
} from "../content/catalog";

const INGREDIENT: Record<
  IngredientId,
  { readonly label: string }
> = Object.fromEntries(
  INGREDIENTS.map((ingredient) => [
    ingredient.id,
    { label: ingredient.label },
  ]),
) as Record<IngredientId, { readonly label: string }>;

const RECIPE_LABEL = Object.fromEntries(
  RECIPES.map((recipe) => [recipe.id, recipe.label]),
) as Record<RecipeId, string>;

export type ViewAction =
  | "start"
  | "daily"
  | "tutorialContinue"
  | "finishEarly"
  | "replay"
  | "meta"
  | "home";

export interface ResultViewModel {
  readonly score: number;
  readonly servedOrders: number;
  readonly nearMisses: readonly NearMiss[];
  readonly runCount: number;
  readonly unlockedStalls: number;
  readonly unlockedRecipes: number;
}

function formatTime(remainingMs: number): string {
  const seconds = Math.max(
    0,
    Math.ceil(remainingMs / 1_000),
  );
  return `${Math.floor(seconds / 60)}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function orderMarkup(order: Order): string {
  const recipes = order.recipeIds
    .map((recipeId) => RECIPE_LABEL[recipeId])
    .join(" → ");
  const vip = order.mode === "sequence";
  return `
    <article class="order-card ${vip ? "is-vip" : ""}">
      <div class="order-head">
        <span>${vip ? "VIP 顺序单" : order.mode === "shared" ? "共享单" : "怪客订单"}</span>
        <strong>${order.expiresAfterMoves}步</strong>
      </div>
      <p>${recipes}</p>
      <div class="patience" style="--patience:${Math.min(100, order.expiresAfterMoves * 14)}%"></div>
    </article>`;
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export class NightMarketView {
  private readonly frame: HTMLElement;
  private readonly screen: HTMLElement;
  private readonly playLayer: HTMLElement;
  private readonly board: HTMLElement;
  private readonly orders: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly score: HTMLElement;
  private readonly servedOrders: HTMLElement;
  private readonly chain: HTMLElement;
  private readonly preview: HTMLElement;
  private readonly toast: HTMLElement;
  private actionHandler: (
    action: ViewAction,
  ) => void = () => undefined;

  constructor(
    private readonly root: HTMLElement,
  ) {
    root.innerHTML = `
      <div class="game-frame" data-screen="home">
        <div class="keyart" aria-hidden="true"></div>
        <div class="ambient-glow" aria-hidden="true"></div>
        <div class="screen-layer"></div>
        <section class="play-layer" hidden aria-label="怪兽夜市营业中">
          <header class="run-header">
            <div class="brand-lockup">
              <span class="brand-dot"></span>
              <span>怪兽夜市</span>
            </div>
            <button class="icon-button" data-action="finishEarly" aria-label="提前收摊结算">收摊</button>
          </header>
          <section class="run-stats" aria-label="营业状态">
            <div><span>烟火币</span><strong data-role="score">0</strong></div>
            <div><span>已出餐</span><strong data-role="served-orders">0</strong></div>
            <div class="timer"><span>剩余</span><strong data-role="timer">5:00</strong></div>
            <div><span>连灶</span><strong data-role="chain">○ ○ ○</strong></div>
          </section>
          <section class="orders" data-role="orders" aria-label="当前最多两张订单"></section>
          <div class="preview-pill" data-role="preview" aria-live="polite">拖动整行或整列，先看结果再松手</div>
          <div class="board-wrap">
            <div class="board-aura" aria-hidden="true"></div>
            <div class="board" data-role="board" role="grid" aria-label="4乘4怪兽夜市案板"></div>
          </div>
          <footer class="stall-rule">
            <span class="stall-icon" aria-hidden="true"><i></i></span>
            <div><strong>连灶秘诀</strong><small>连续三步出餐，触发夜市庆典</small></div>
            <span class="swipe-cue" aria-hidden="true">↔</span>
          </footer>
        </section>
        <div class="toast" data-role="toast" aria-live="polite"></div>
      </div>`;
    this.frame = root.querySelector(".game-frame")!;
    this.screen = root.querySelector(".screen-layer")!;
    this.playLayer = root.querySelector(".play-layer")!;
    this.board = root.querySelector("[data-role='board']")!;
    this.orders = root.querySelector("[data-role='orders']")!;
    this.timer = root.querySelector("[data-role='timer']")!;
    this.score = root.querySelector("[data-role='score']")!;
    this.servedOrders = root.querySelector(
      "[data-role='served-orders']",
    )!;
    this.chain = root.querySelector("[data-role='chain']")!;
    this.preview = root.querySelector("[data-role='preview']")!;
    this.toast = root.querySelector("[data-role='toast']")!;
    root.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<
        HTMLButtonElement
      >("[data-action]");
      if (!button) {
        return;
      }
      this.actionHandler(
        button.dataset.action as ViewAction,
      );
    });
  }

  onAction(
    handler: (action: ViewAction) => void,
  ): void {
    this.actionHandler = handler;
  }

  inputElement(): HTMLElement {
    return this.board;
  }

  boardRect(): BoardRect {
    return {
      x: 0,
      y: 0,
      size: 320,
    };
  }

  setKeyArt(url: string): void {
    this.frame.style.setProperty(
      "--keyart",
      `url("${url}")`,
    );
  }

  private setScreen(screen: string): void {
    this.frame.dataset.screen = screen;
    this.playLayer.hidden = screen !== "playing";
    this.screen.hidden = screen === "playing";
  }

  renderHome(save: NightMarketSaveV1): void {
    this.setScreen("home");
    this.screen.innerHTML = `
      <section class="home-screen">
        <div class="home-top">
          <span class="season-tag">今夜开市 · 第 ${save.runCount + 1} 回</span>
          <button class="round-link" data-action="meta" aria-label="查看摊位成长">成长</button>
        </div>
        <div class="title-lockup">
          <p>东方妖怪 · 策略滑动料理</p>
          <h1>怪兽<br><em>夜市</em></h1>
          <span>MONSTER NIGHT MARKET</span>
        </div>
        <div class="home-bottom">
          <div class="promise-row">
            <span>4×4 循环案板</span><i></i>
            <span>一滑多单</span><i></i>
            <span>三连庆典</span>
          </div>
          <button class="hero-button" data-action="start">
            <span>开始营业</span>
            <small>先预演，再松手出餐</small>
          </button>
          <button class="daily-button" data-action="daily">
            <span><i class="ui-symbol lantern" aria-hidden="true"></i>今日案板</span>
            <strong>固定布局 · 可补玩近 7 天</strong>
          </button>
        </div>
      </section>`;
  }

  renderTutorial(): void {
    this.setScreen("tutorial");
    this.screen.innerHTML = `
      <section class="tutorial-screen">
        <div class="tutorial-card">
          <span class="step-chip">第一单 · 10 秒学会</span>
          <h2>不是点方块，<br>是拖动整行或整列</h2>
          <div class="mini-board" aria-hidden="true">
            <span class="ingredient-art mini-ingredient-art" data-ingredient-art="chili"></span>
            <span class="ingredient-art mini-ingredient-art" data-ingredient-art="mushroom"></span>
            <span class="ingredient-art mini-ingredient-art" data-ingredient-art="lotus"></span>
            <span class="ingredient-art mini-ingredient-art" data-ingredient-art="tofu"></span>
            <span class="ingredient-art mini-ingredient-art" data-ingredient-art="fish"></span>
            <span class="ingredient-art mini-ingredient-art" data-ingredient-art="riceCake"></span>
            <span class="ingredient-art mini-ingredient-art" data-ingredient-art="ice"></span>
            <span class="ingredient-art mini-ingredient-art" data-ingredient-art="broth"></span>
            <b class="gesture-line">向右滑 →</b>
          </div>
          <div class="tutorial-order">
            <span>首位客人想吃</span>
            <strong class="tutorial-recipe">
              <i class="ingredient-art recipe-ingredient-art" data-ingredient-art="chili" aria-hidden="true"></i>
              <b>+</b>
              <i class="ingredient-art recipe-ingredient-art" data-ingredient-art="tofu" aria-hidden="true"></i>
              火纹豆腐
            </strong>
          </div>
          <p>拖动时先看“将完成几单”，松手才正式出餐。连续三步成单会点燃整条夜市。</p>
          <button class="hero-button" data-action="tutorialContinue">
            <span>我来试一单</span>
            <small>首步一定能完成火纹豆腐</small>
          </button>
        </div>
      </section>`;
  }

  renderPlaying(snapshot: ControllerSnapshot): void {
    this.setScreen("playing");
    this.renderBoard(snapshot.board);
    this.updateRun(snapshot);
  }

  updateRun(snapshot: ControllerSnapshot): void {
    this.timer.textContent = formatTime(
      snapshot.remainingMs,
    );
    this.score.textContent =
      snapshot.score.toLocaleString("zh-CN");
    this.servedOrders.textContent =
      snapshot.servedOrderCount.toLocaleString("zh-CN");
    this.chain.textContent = [0, 1, 2]
      .map((index) =>
        index < snapshot.chain ? "●" : "○",
      )
      .join(" ");
    this.orders.innerHTML = snapshot.orders
      .slice(0, 2)
      .map(orderMarkup)
      .join("");
  }

  renderBoard(board: Board): void {
    this.board.innerHTML = board
      .flatMap((row, rowIndex) =>
        row.map((cell, columnIndex) => {
          const ingredient = INGREDIENT[cell.ingredient];
          return `
            <div class="ingredient-cell ${cell.frozen > 0 ? "is-frozen" : ""}"
              role="gridcell"
              data-row="${rowIndex}"
              data-column="${columnIndex}"
              data-ingredient="${cell.ingredient}"
              aria-label="${ingredient.label}${cell.frozen > 0 ? "，已冻结" : ""}">
              <span class="ingredient-art" data-ingredient-art="${cell.ingredient}" aria-hidden="true"></span>
              <small>${ingredient.label}</small>
            </div>`;
        }),
      )
      .join("");
  }

  renderPreview(preview: ShiftPreview): void {
    this.board
      .querySelectorAll(".is-preview")
      .forEach((cell) =>
        cell.classList.remove("is-preview"),
      );
    const selector =
      preview.action.axis === "row"
        ? `[data-row="${preview.action.index}"]`
        : `[data-column="${preview.action.index}"]`;
    this.board
      .querySelectorAll(selector)
      .forEach((cell) =>
        cell.classList.add("is-preview"),
      );
    const count = preview.completedOrderIds.length;
    this.preview.className = `preview-pill ${count > 0 ? "is-success" : "is-planning"}`;
    this.preview.textContent =
      count > 0
        ? `松手将完成 ${count} 单`
        : "这步不成单：可继续换方向";
  }

  clearPreview(): void {
    this.board
      .querySelectorAll(".is-preview")
      .forEach((cell) =>
        cell.classList.remove("is-preview"),
      );
    this.preview.className = "preview-pill";
    this.preview.textContent =
      "拖动整行或整列，先看结果再松手";
  }

  showMessage(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add("is-visible");
    window.setTimeout(
      () => this.toast.classList.remove("is-visible"),
      1_600,
    );
  }

  async animate(
    preview: ShiftPreview,
    input: {
      readonly festivalTriggered: boolean;
      readonly reducedMotion: boolean;
    },
  ): Promise<void> {
    const timeline = buildAnimationTimeline({
      completedOrders:
        preview.completedOrderIds.length,
      festivalTriggered: input.festivalTriggered,
      reducedMotion: input.reducedMotion,
    });
    await playAnimationTimeline(
      timeline,
      async (step) => {
        this.frame.dataset.animation = step.id;
        await wait(step.durationMs);
        delete this.frame.dataset.animation;
      },
    );
  }

  renderResult(input: ResultViewModel): void {
    this.setScreen("result");
    const misses = input.nearMisses
      .slice(0, 3)
      .map(
        (item) => `
          <li>
            <span>差一步</span>
            <strong>${RECIPE_LABEL[item.missingRecipeId]}</strong>
            <small>再调整一行就可能完成</small>
          </li>`,
      )
      .join("");
    this.screen.innerHTML = `
      <section class="result-screen">
        <div class="result-card">
          <span class="result-badge">营业完成</span>
          <h2>${input.score.toLocaleString("zh-CN")}</h2>
          <p>烟火币 · 本局完成 ${input.servedOrders} 单</p>
          <div class="unlock-strip">
            <div><strong>${input.unlockedRecipes}</strong><span>配方图鉴</span></div>
            <div><strong>${input.unlockedStalls}</strong><span>可选摊位</span></div>
            <div><strong>${input.runCount}</strong><span>累计营业</span></div>
          </div>
          <section class="near-misses">
            <h3>差一点就更精彩</h3>
            <ul>${misses || "<li class='perfect'><strong>本局没有遗憾订单</strong><small>试试更高连灶纪录</small></li>"}</ul>
          </section>
          <button class="hero-button" data-action="replay">
            <span>再开一局</span>
            <small>新案板 · 保留已发现规则</small>
          </button>
          <button class="secondary-button" data-action="meta">查看摊位成长</button>
          <button class="text-button" data-action="home">先收摊，回到夜市</button>
        </div>
      </section>`;
  }

  renderMeta(save: NightMarketSaveV1): void {
    this.setScreen("meta");
    const next =
      save.runCount < 2
        ? "再营业 1 局，解锁甜品摊"
        : save.runCount < 3
          ? "再营业 1 局，解锁订单二选一"
          : save.runCount < 4
            ? "再营业 1 局，解锁火锅摊"
            : "继续发现新配方与夜市外观";
    this.screen.innerHTML = `
      <section class="meta-screen">
        <div class="meta-head">
          <button class="back-button" data-action="home">← 夜市</button>
          <span>规则侧移成长</span>
        </div>
        <div class="meta-card hero-meta">
          <span>摊位等级 ${Math.min(6, save.runCount + 1)}</span>
          <h2>${next}</h2>
          <div class="progress-track"><i style="width:${Math.min(100, (save.runCount / 6) * 100)}%"></i></div>
          <p>只解锁新规则、选择和外观，不出售永久攻击倍率。</p>
        </div>
        <div class="codex-grid">
          <article><span class="codex-icon recipes" aria-hidden="true"></span><strong>${save.unlockedRecipeIds.length}/12</strong><small>配方图鉴</small></article>
          <article><span class="codex-icon customers" aria-hidden="true"></span><strong>${save.customerCodexIds.length}/8</strong><small>怪客图鉴</small></article>
          <article><span class="codex-icon stalls" aria-hidden="true"></span><strong>${save.unlockedStallIds.length}/3</strong><small>摊位规则</small></article>
          <article><span class="codex-icon cosmetics" aria-hidden="true"></span><strong>${save.cosmeticIds.length}</strong><small>夜市外观</small></article>
        </div>
        <button class="hero-button compact" data-action="start"><span>继续营业</span></button>
      </section>`;
  }
}
