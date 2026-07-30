import {
  applyCommand,
  validateTransferCommand,
  type BattleCommand,
  type CommandReason,
} from "../domain/applyCommand";
import { classifyFormation } from "../domain/antiIdle";
import { advanceBattle } from "../domain/advanceBattle";
import { advanceBoss } from "../domain/bossMachine";
import { createBattle, standardVariantForRun } from "../domain/createBattle";
import type { BattleState, GridPosition, HeroId } from "../domain/types";
import { advanceWaveDirector } from "../domain/waveDirector";
import { dailyChallengeForDate } from "../meta/dailyChallenge";
import { shouldOfferRecoveryRun } from "../meta/progression";
import { recordRun, type ThreeLaneSave } from "../meta/saveModel";
import {
  BattleScene,
  type TransferPreview,
} from "../presentation/BattleScene";
import { createHomeView } from "../presentation/HomeView";
import { createHud } from "../presentation/Hud";
import { createPauseOverlay, createResultOverlay } from "../presentation/OverlayViews";
import { createProgressView } from "../presentation/ProgressView";
import { variantLabel } from "../presentation/labels";
import { buildLocalRunReport, type LocalRunReport } from "../quality/localReport";

const SQUAD = ["guardian", "ranger", "mage", "engineer", "priest"] as const;

export type AppScreen = "home" | "battle" | "paused" | "result" | "progress";

export interface ThreeLaneAppSnapshot {
  screen: AppScreen;
  runOrdinal: number;
  selectedHeroId: HeroId | null;
  message: string;
  battle: BattleState | null;
  save: ThreeLaneSave;
  reports: LocalRunReport[];
  transferPreview: TransferPreview | null;
}

export interface ThreeLaneApp {
  snapshot(): ThreeLaneAppSnapshot;
  fixedUpdate(stepMs: number): void;
  render(): void;
  handleTap(point: { x: number; y: number }, atMs: number): void;
  handleDragStart(point: { x: number; y: number }, atMs: number): void;
  handleDragMove(origin: { x: number; y: number }, point: { x: number; y: number }, atMs: number): void;
  handleDragEnd(origin: { x: number; y: number }, point: { x: number; y: number }, atMs: number): void;
  handleDrag(origin: { x: number; y: number }, point: { x: number; y: number }, atMs: number): void;
  cancelDragPreview(): void;
  pause(): void;
  resume(): void;
  showHome(): void;
  dispose(): void;
}

export const TRANSFER_REASON_COPY: Record<CommandReason, string> = {
  ok: "可调往此处",
  "not-playing": "当前无法调兵",
  occupied: "目标位置已占用",
  "locked-lane": "目标路线已封锁",
  "insufficient-energy": "能量不足",
  "not-in-squad": "英雄不在小队中",
  "invalid-pair": "英雄组合无效",
  "max-tier": "英雄已达到最高阶",
  "undo-expired": "撤回时间已结束",
  cooldown: "调兵冷却中",
  moving: "英雄正在移动中",
  "invalid-target": "请拖到有效目标位置",
};

export function buildTransferPreview(
  state: BattleState,
  heroInstanceId: string,
  pointer: { x: number; y: number },
  hoveredCell: GridPosition | null,
  atMs: number,
  hasMoved = false,
): TransferPreview {
  const hero = state.heroes.find(({ instanceId }) => instanceId === heroInstanceId);
  if (!hero) throw new Error("TRANSFER_PREVIEW_HERO_MISSING");
  const cells = state.grid.map(({ position }) => ({
    position: { ...position },
    reason: validateTransferCommand(state, {
      type: "transfer",
      heroInstanceId,
      to: position,
      atMs,
    }),
  }));
  const hoveredReason = hoveredCell
    ? cells.find(({ position }) =>
      position.lane === hoveredCell.lane && position.column === hoveredCell.column,
    )?.reason ?? "invalid-target"
    : null;
  const unavailableReason = cells.find(({ reason }) =>
    reason === "moving" || reason === "cooldown" || reason === "not-playing",
  )?.reason;
  return {
    heroInstanceId,
    source: { ...hero.position },
    pointer: { ...pointer },
    hoveredCell: hoveredCell ? { ...hoveredCell } : null,
    hasMoved,
    cells,
    feedback: hoveredReason
      ? TRANSFER_REASON_COPY[hoveredReason]
      : unavailableReason
        ? TRANSFER_REASON_COPY[unavailableReason]
        : hasMoved
          ? TRANSFER_REASON_COPY["invalid-target"]
          : "拖到绿色目标位置",
  };
}

export function createThreeLaneApp(input: {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  save: ThreeLaneSave;
  today: string;
  timeScale: number;
  persist: (save: ThreeLaneSave) => void;
  onScreenChange: (screen: AppScreen) => void;
  onMeaningfulInput: (kind: string) => void;
  onFirstInput?: (payload: {
    kind: string;
    elapsedMs: number;
  }) => void;
  onFirstPayoff?: (payload: {
    kind: "enemy_defeated";
    enemyCount: number;
    elapsedMs: number;
  }) => void;
  onRunStart: (runId: string, daily: boolean) => void;
  onRunEnd: (result: "won" | "lost") => void;
  onPauseChange: (paused: boolean) => void;
  onMutedChange: (muted: boolean) => void;
  onReducedMotionChange: (reduced: boolean) => void;
  createRunId?: () => string;
}): ThreeLaneApp {
  const createRunId =
    input.createRunId ?? (() => crypto.randomUUID());
  const scene = new BattleScene(input.canvas);
  let screen: AppScreen = "home";
  let save = structuredClone(input.save);
  let battle: BattleState | null = null;
  let runOrdinal = save.runHistory.length;
  let selectedHeroId: HeroId | null = null;
  let message = "选择英雄卡，再点按部署位；也可以直接拖入战场";
  let lastHudRenderAt = -1;
  let lastDeployedId: string | null = null;
  let lastEventSeq = 0;
  let transferPreview: TransferPreview | null = null;
  let recoveryUsedInSession = false;
  let firstInputReported = false;
  let firstPayoffReported = false;
  const reports: LocalRunReport[] = [];

  const setScreen = (next: AppScreen): void => {
    screen = next;
    input.canvas.hidden = next !== "battle" && next !== "paused";
    input.onScreenChange(next);
  };

  const persist = (): void => {
    input.persist(structuredClone(save));
  };

  const renderScene = (): void => {
    if (!battle) return;
    if (transferPreview) {
      transferPreview = buildTransferPreview(
        battle,
        transferPreview.heroInstanceId,
        transferPreview.pointer,
        transferPreview.hoveredCell,
        battle.elapsedMs,
        transferPreview.hasMoved,
      );
    }
    scene.render(battle, selectedHeroId, transferPreview);
  };

  const attachHeroCardInput = (): void => {
    for (const button of input.host.querySelectorAll<HTMLButtonElement>("[data-hero-card]")) {
      const heroId = button.dataset.heroCard as HeroId;
      button.addEventListener("click", () => {
        selectedHeroId = selectedHeroId === heroId ? null : heroId;
        message = selectedHeroId ? `${button.textContent?.trim() ?? "英雄"}已选中，点按空位部署` : "已取消选择";
        renderHud();
      });
      button.addEventListener("pointerdown", (event) => {
        button.setPointerCapture(event.pointerId);
        const up = (upEvent: PointerEvent) => {
          button.removeEventListener("pointerup", up);
          const point = scene.logicalPoint(upEvent.clientX, upEvent.clientY);
          const cell = scene.cellAt(point);
          if (cell) dispatch({ type: "deploy", heroId, to: cell, atMs: battle?.elapsedMs ?? 0 });
        };
        button.addEventListener("pointerup", up);
      });
    }
  };

  const renderHud = (): void => {
    if (!battle || screen !== "battle") return;
    const hud = createHud({
      state: battle,
      selectedHeroId,
      message,
      onPause: pause,
      onUndo: undoLast,
      onEvolve: evolvePair,
    });
    input.host.replaceChildren(hud);
    attachHeroCardInput();
    renderScene();
    lastHudRenderAt = battle.elapsedMs;
  };

  const updateHudLive = (): void => {
    if (!battle || screen !== "battle") return;
    const energy = input.host.querySelector<HTMLOutputElement>('[data-live="energy"]');
    const timer = input.host.querySelector<HTMLTimeElement>('[data-live="timer"]');
    const base = input.host.querySelector<HTMLElement>('[data-live="base"]');
    const focus = input.host.querySelector<HTMLElement>('[data-live="focus"]');
    const laneLock = input.host.querySelector<HTMLElement>('[data-live="lane-lock"]');
    if (energy) energy.value = String(Math.floor(battle.energy));
    if (timer) {
      const seconds = Math.floor(battle.elapsedMs / 1000);
      timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    }
    if (base) {
      [...base.querySelectorAll("i")].forEach((node, index) =>
        node.classList.toggle("alive", index < battle!.baseHealth),
      );
    }
    if (focus) {
      const seconds = Math.max(0, Math.ceil((battle.focusFire.readyAtMs - battle.elapsedMs) / 1000));
      focus.textContent = `集火 ${seconds === 0 ? "就绪" : `${seconds}s`}`;
      focus.classList.toggle("ready", seconds === 0);
    }
    if (laneLock && battle.laneLock) {
      laneLock.textContent = `第 ${battle.laneLock.lane + 1} 路已封锁 · ${Math.max(0, Math.ceil((battle.laneLock.endsAtMs - battle.elapsedMs) / 1000))} 秒`;
    }
    lastHudRenderAt = battle.elapsedMs;
  };

  const showHome = (): void => {
    battle = null;
    selectedHeroId = null;
    transferPreview = null;
    setScreen("home");
    input.host.replaceChildren(createHomeView({
      nextRunOrdinal: runOrdinal,
      dailyDate: input.today,
      commanderLevel: save.commanderLevel,
      onStandard: () => startRun("standard"),
      onDaily: () => startRun("daily"),
      onProgress: showProgress,
    }));
  };

  const showProgress = (): void => {
    setScreen("progress");
    input.host.replaceChildren(createProgressView(save, showHome));
  };

  const startRun = (
    mode: "standard" | "daily",
    recovery = false,
  ): void => {
    const daily = dailyChallengeForDate(input.today);
    const seed = mode === "daily" ? daily.seed : 73_029 + runOrdinal * 97;
    const recoveryActive = mode === "standard" && recovery;
    if (recoveryActive) recoveryUsedInSession = true;
    battle = createBattle({
      seed,
      runId: createRunId(),
      runOrdinal,
      squad: SQUAD,
      mode,
      recovery: recoveryActive,
    });
    battle.mode = "playing";
    selectedHeroId = null;
    transferPreview = null;
    message =
      mode === "daily"
        ? `每日挑战：${variantLabel(daily.variant)}，重试不会改变敌序`
        : recoveryActive
          ? `整备演练：${variantLabel(battle.variant)}，基地耐久提升为 4`
          : `第 ${runOrdinal + 1} 局：${variantLabel(battle.variant)}`;
    lastDeployedId = null;
    lastEventSeq = 0;
    firstInputReported = false;
    firstPayoffReported = false;
    setScreen("battle");
    input.onRunStart(battle.runId, mode === "daily");
    renderHud();
  };

  const dispatch = (command: BattleCommand): void => {
    if (!battle || screen !== "battle") return;
    const result = applyCommand(battle, command, {
      rapidRelay: save.unlockedDoctrineIds.includes("rapid-relay"),
    });
    if (!result.ok) {
      const reasonCopy: Record<string, string> = {
        occupied: "该位置已被占用",
        "locked-lane": "该路线暂时封锁",
        "insufficient-energy": "能源不足",
        cooldown: "战术仍在冷却",
        "invalid-pair": "需要两名相同的一阶英雄",
        "undo-expired": "部署超过 3 秒，无法撤回",
        moving: "英雄正在跨路移动",
        "invalid-target": "目标已失效",
      };
      message = reasonCopy[result.reason] ?? "当前无法执行";
      renderHud();
      return;
    }
    battle = result.state;
    if (!firstInputReported) {
      firstInputReported = true;
      input.onFirstInput?.({
        kind: command.type,
        elapsedMs: command.atMs,
      });
    }
    if (command.type === "deploy") {
      lastDeployedId = battle.heroes.at(-1)?.instanceId ?? null;
      selectedHeroId = null;
      message = "部署成功；拖动英雄可以跨路驰援";
    } else if (command.type === "transfer") {
      message = "跨路接应中，800ms 后重新投入战斗";
    } else if (command.type === "focus-fire") {
      message = "全队集火 5 秒；把握 Boss 蓄力窗口";
    } else if (command.type === "evolve") {
      message = "进化完成：规则能力已改变";
    } else {
      message = "已撤回并返还能量";
    }
    input.onMeaningfulInput(command.type);
    renderHud();
  };

  const undoLast = (): void => {
    if (!battle || !lastDeployedId) {
      message = "没有可撤回的最近部署";
      renderHud();
      return;
    }
    dispatch({ type: "undo-deploy", heroInstanceId: lastDeployedId, atMs: battle.elapsedMs });
  };

  const evolvePair = (): void => {
    if (!battle) return;
    const source = battle.heroes.find((hero, index) =>
      hero.tier === 1 && battle!.heroes.some((other, otherIndex) =>
        otherIndex !== index && other.tier === 1 && other.heroId === hero.heroId,
      ),
    );
    const target = source
      ? battle.heroes.find((hero) => hero !== source && hero.tier === 1 && hero.heroId === source.heroId)
      : undefined;
    if (!source || !target) {
      message = "部署两名相同英雄后才能进化";
      renderHud();
      return;
    }
    dispatch({ type: "evolve", sourceId: source.instanceId, targetId: target.instanceId, atMs: battle.elapsedMs });
  };

  const finish = (): void => {
    if (!battle || (battle.mode !== "won" && battle.mode !== "lost")) return;
    const result = battle.mode === "won" ? "won" : "lost";
    battle.formationTag = classifyFormation(battle);
    const defeated = battle.events.filter(({ type }) => type === "enemy_defeated").length;
    const report = buildLocalRunReport({
      runId: battle.runId,
      variant: battle.variant,
      result,
      elapsedMs: battle.elapsedMs,
      meaningfulActionCount: battle.meaningfulActionCount,
      longestDecisionGapMs: battle.longestDecisionGapMs,
      formationTag: battle.formationTag,
    });
    reports.push(report);
    save = recordRun(save, {
      runId: battle.runId,
      result,
      formationTag: battle.formationTag,
      variant: battle.variant,
      elapsedMs: battle.elapsedMs,
      date: input.today,
    });
    persist();
    input.onRunEnd(result);
    const finished = battle;
    setScreen("result");
    input.host.replaceChildren(createResultOverlay({
      result,
      variant: finished.variant,
      formation: finished.formationTag,
      failureLane: finished.failureLane,
      elapsedMs: finished.elapsedMs,
      defeated,
      longestDecisionGapMs: finished.longestDecisionGapMs,
      nextVariant: standardVariantForRun(runOrdinal + 1),
      recoveryAvailable:
        result === "lost" &&
        !recoveryUsedInSession &&
        shouldOfferRecoveryRun(save),
      onReplay: (recovery) => {
        runOrdinal += 1;
        startRun("standard", recovery);
      },
      onProgress: showProgress,
      onHome: showHome,
    }));
  };

  const fixedUpdate = (stepMs: number): void => {
    if (!battle || screen !== "battle") return;
    const scaled = stepMs * input.timeScale;
    battle = advanceBattle(battle, scaled);
    battle = advanceWaveDirector(battle);
    battle = advanceBoss(battle);
    const newEvents = battle.events.filter(({ seq }) => seq > lastEventSeq);
    let needsFullHud = false;
    for (const event of newEvents) {
      lastEventSeq = event.seq;
      if (
        event.type === "enemy_defeated" &&
        !firstPayoffReported
      ) {
        firstPayoffReported = true;
        input.onFirstPayoff?.({
          kind: "enemy_defeated",
          enemyCount: 1,
          elapsedMs: event.atMs,
        });
      }
      if (event.type === "boss_charge") {
        message = "危险：Boss 蓄力！立即点按 Boss 集火";
        needsFullHud = true;
      }
      if (event.type === "boss_interrupt") {
        message = "完美打断！Boss 进入长时间虚弱";
        needsFullHud = true;
      }
      if (event.type === "lane_locked") needsFullHud = true;
      if (event.type === "lane_breached") {
        message = `第 ${Number(event.payload.lane) + 1} 路失守，立即调兵`;
        needsFullHud = true;
      }
    }
    if (battle.mode === "won" || battle.mode === "lost") {
      finish();
      return;
    }
    if (needsFullHud) {
      renderHud();
    } else {
      if (battle.elapsedMs - lastHudRenderAt >= 200 * input.timeScale) updateHudLive();
      renderScene();
    }
  };

  const handleTap = (point: { x: number; y: number }, atMs: number): void => {
    if (!battle || screen !== "battle") return;
    transferPreview = null;
    const enemyId = scene.enemyAt(battle, point);
    if (enemyId) {
      dispatch({ type: "focus-fire", enemyInstanceId: enemyId, atMs });
      return;
    }
    if (selectedHeroId) {
      const cell = scene.cellAt(point);
      if (cell) dispatch({ type: "deploy", heroId: selectedHeroId, to: cell, atMs });
    }
  };

  const handleDragStart = (
    point: { x: number; y: number },
    atMs: number,
  ): void => {
    if (!battle || screen !== "battle") return;
    const heroInstanceId = scene.heroAt(battle, point);
    transferPreview = heroInstanceId
      ? buildTransferPreview(battle, heroInstanceId, point, null, atMs)
      : null;
    renderScene();
  };

  const handleDragMove = (
    origin: { x: number; y: number },
    point: { x: number; y: number },
    atMs: number,
  ): void => {
    if (!battle || screen !== "battle") return;
    const heroInstanceId = transferPreview?.heroInstanceId ?? scene.heroAt(battle, origin);
    if (!heroInstanceId) return;
    const cell = scene.cellAt(point);
    transferPreview = buildTransferPreview(
      battle,
      heroInstanceId,
      point,
      cell,
      atMs,
      true,
    );
    scene.render(battle, selectedHeroId, transferPreview);
  };

  const handleDragEnd = (
    origin: { x: number; y: number },
    point: { x: number; y: number },
    atMs: number,
  ): void => {
    if (!battle || screen !== "battle") return;
    const heroInstanceId = transferPreview?.heroInstanceId ?? scene.heroAt(battle, origin);
    const cell = scene.cellAt(point);
    transferPreview = null;
    if (heroInstanceId && cell) {
      dispatch({ type: "transfer", heroInstanceId, to: cell, atMs });
    } else {
      renderScene();
    }
  };

  const cancelDragPreview = (): void => {
    if (!transferPreview) return;
    transferPreview = null;
    renderScene();
  };

  const handleDrag = handleDragEnd;

  const pause = (): void => {
    if (!battle || screen !== "battle") return;
    transferPreview = null;
    battle.mode = "paused";
    setScreen("paused");
    input.onPauseChange(true);
    input.host.append(createPauseOverlay({
      muted: save.settings.muted,
      reducedMotion: save.settings.reducedMotion,
      onResume: resume,
      onMuted: (muted) => {
        save.settings.muted = muted;
        persist();
        input.onMutedChange(muted);
      },
      onReducedMotion: (reduced) => {
        save.settings.reducedMotion = reduced;
        persist();
        input.onReducedMotionChange(reduced);
      },
      onHome: () => {
        input.onPauseChange(false);
        showHome();
      },
    }));
  };

  const resume = (): void => {
    if (!battle || screen !== "paused") return;
    battle.mode = "playing";
    setScreen("battle");
    input.onPauseChange(false);
    renderHud();
  };

  const api: ThreeLaneApp = {
    snapshot: () => structuredClone({
      screen,
      runOrdinal,
      selectedHeroId,
      message,
      battle,
      save,
      reports,
      transferPreview,
    }),
    fixedUpdate,
    render: renderScene,
    handleTap,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDrag,
    cancelDragPreview,
    pause,
    resume,
    showHome,
    dispose: () => input.host.replaceChildren(),
  };

  showHome();
  return api;
}
