import "./style.css";
import { createAccessibilityController } from "@gamehub/h5-accessibility";
import { createInputController } from "@gamehub/h5-input";
import {
  bindRuntimeLifecycle,
  createGameRuntime,
} from "@gamehub/h5-runtime";
import {
  createLocalStorageSaveAdapter,
  createSaveStore,
} from "@gamehub/h5-save";
import {
  createLocalTelemetryQueue,
  createTelemetryClient,
} from "@gamehub/h5-telemetry";
import { createTestHarness } from "@gamehub/h5-testing";
import { createRicochetGame } from "./game/create-ricochet-game";
import type { HeroId } from "./game/contracts";
import {
  RicochetView,
  type ViewAction,
} from "./presentation/ricochet-view";
import {
  dailySeed,
  recentShanghaiDays,
} from "./run/daily";
import {
  applyRunProgress,
  createDefaultProgress,
  type RicochetProgressV1,
} from "./run/progression";
import { installRicochetReadOnlyHook } from "./testing/read-only-hook";

type RicochetGame = ReturnType<typeof createRicochetGame>;

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#app");
  const host = document.querySelector<HTMLElement>("#ui-layer");
  const liveRegion =
    document.querySelector<HTMLElement>("#live-region");
  if (!root || !host || !liveRegion) {
    throw new Error("RICOCHET_DOM_MISSING");
  }

  root.dataset.bootState = "loading";
  const view = new RicochetView(host);
  const accessibility = createAccessibilityController({
    root,
    liveRegion,
  });
  const testHarness = createTestHarness({
    search: location.search,
    gameId: "ricochet-crew",
    defaultSeed: 20260729,
    maxSpeed: 8,
  });
  const telemetry = createTelemetryClient({
    gameId: "ricochet-crew",
    testMode: testHarness.enabled,
    queue: createLocalTelemetryQueue({
      gameId: "ricochet-crew",
      maxEvents: 4_000,
    }),
  });
  const store = createSaveStore<RicochetProgressV1>({
    gameId: "ricochet-crew",
    currentSchemaVersion: 1,
    defaultValue: createDefaultProgress,
    migrations: {},
    adapter: createLocalStorageSaveAdapter(),
  });
  const loaded = await store.load();
  let progress = loaded.payload;
  if (loaded.recovered) {
    telemetry.emit("save_recovered", {
      source: loaded.source,
    });
    accessibility.announce("已恢复最近的有效进度");
  }

  const dailyOptions = recentShanghaiDays();
  let game: RicochetGame | null = null;
  let activeSeed = testHarness.seed;
  let activeDailyKey: string | null = null;
  let runSettled = false;
  let maxComboObserved = 0;
  let removeReadOnlyHook: (() => void) | null = null;

  const renderHome = () => {
    input.setEnabled(false);
    view.renderHome(progress, dailyOptions);
    accessibility.announce("弹珠暴走团首页");
  };

  const emitGameEvent = (message: {
    readonly event: string;
    readonly payload: Readonly<Record<string, unknown>>;
  }) => {
    if (message.event === "first_input") {
      telemetry.emit("first_input", { ...message.payload });
    } else if (message.event === "room_clear") {
      telemetry.emit("first_payoff", { ...message.payload });
      telemetry.emit("choice_presented", {
        ...message.payload,
      });
    } else if (message.event === "choice_selected") {
      telemetry.emit("choice_selected", {
        ...message.payload,
      });
    } else if (message.event === "skill_used") {
      telemetry.emit("strategy_changed", {
        kind: "hero-skill",
        ...message.payload,
      });
    }
  };

  const settleRun = (current: RicochetGame) => {
    if (runSettled) return;
    const snapshot = current.snapshot();
    if (snapshot.mode !== "won" && snapshot.mode !== "lost") return;
    runSettled = true;
    input.setEnabled(false);
    progress = applyRunProgress(progress, {
      won: snapshot.mode === "won",
      heroId: snapshot.heroId,
      maxCombo: maxComboObserved,
      buildTags: snapshot.buildTags,
    });
    void store.save(progress);
    if (activeDailyKey) {
      telemetry.emit("daily_end", {
        dateKey: activeDailyKey,
        result: snapshot.mode,
      });
    }
    telemetry.endRun({
      result: snapshot.mode,
      score: snapshot.score,
      roomIndex: snapshot.roomIndex,
      maxCombo: maxComboObserved,
    });
    view.renderResult(snapshot, progress);
    accessibility.announce(
      snapshot.mode === "won" ? "遗迹核心已击破" : "远征结束",
      "assertive",
    );
  };

  const startRun = (
    seed: number,
    dailyKey: string | null,
    replay: boolean,
  ) => {
    removeReadOnlyHook?.();
    activeSeed = seed >>> 0;
    activeDailyKey = dailyKey;
    runSettled = false;
    maxComboObserved = 0;
    const heroId = view.selectedHero();
    const runId = crypto.randomUUID();
    game = createRicochetGame({
      seed: activeSeed,
      heroId,
      runId,
      emit: emitGameEvent,
    });
    telemetry.beginRun(runId);
    if (replay) {
      telemetry.emit("replay_start", {
        seed: activeSeed,
        sameSeed: true,
      });
    }
    if (dailyKey) {
      telemetry.emit("daily_start", { dateKey: dailyKey });
    }
    if (testHarness.enabled) {
      removeReadOnlyHook = installRicochetReadOnlyHook(
        testHarness.registry,
        game,
      );
    }
    view.renderGame(game.snapshot());
    view.renderPreview(null);
    input.setEnabled(true);
    accessibility.announce(
      `${dailyKey ? "每日" : "随机"}遗迹开始，向后拖动瞄准`,
    );
  };

  const handleAction = (action: ViewAction) => {
    if (action.kind === "hero") {
      renderHome();
    } else if (action.kind === "start") {
      const seed = testHarness.enabled
        ? testHarness.seed
        : (Date.now() ^ Math.imul(progress.runCount + 1, 2654435761)) >>> 0;
      startRun(seed, null, false);
    } else if (action.kind === "daily") {
      startRun(dailySeed(action.dateKey), action.dateKey, false);
    } else if (action.kind === "skill") {
      game?.useSkill();
    } else if (action.kind === "choose") {
      game?.choose(action.modifierId);
      accessibility.announce("改造已装配，进入下一房间");
    } else if (action.kind === "retry") {
      startRun(activeSeed, activeDailyKey, true);
    } else if (action.kind === "fresh") {
      startRun(
        (Date.now() ^ crypto.getRandomValues(new Uint32Array(1))[0]!) >>> 0,
        null,
        false,
      );
    } else if (action.kind === "home") {
      renderHome();
    }
  };
  view.onAction(handleAction);

  const input = createInputController({
    element: view.inputElement(),
    logicalSize: { width: 390, height: 844 },
    // 弹珠需要全方向拖动；阈值保持足够大，避免共享输入层锁定单轴。
    axisLockThreshold: 10_000,
    tapRadius: 8,
  });
  input.setEnabled(false);
  input.subscribe((intent) => {
    if (!game) return;
    if (intent.kind === "drag-start") {
      game.beginAim(intent.point);
    } else if (intent.kind === "drag-move") {
      game.updateAim(intent.point);
      view.renderPreview(game.preview());
    } else if (intent.kind === "drag-end") {
      game.updateAim(intent.point);
      game.releaseAim();
      view.renderPreview(null);
    } else if (intent.kind === "swipe") {
      game.updateAim(intent.end);
      game.releaseAim();
      view.renderPreview(null);
    } else if (intent.kind === "cancel") {
      game.cancelAim();
      view.renderPreview(null);
    }
  });

  const runtime = createGameRuntime({
    fixedStepMs: 1_000 / 120,
    maxCatchUpSteps: 12,
    onFixedUpdate: (stepSeconds) => {
      if (!game) return;
      game.fixedUpdate(stepSeconds * testHarness.speed);
      const snapshot = game.snapshot();
      maxComboObserved = Math.max(
        maxComboObserved,
        snapshot.shot?.maxCombo ?? 0,
      );
      settleRun(game);
    },
    onRender: () => {
      if (!game || runSettled) return;
      view.update(game.snapshot());
      view.renderPreview(game.preview());
    },
    onPauseChange: (paused, reason) => {
      input.setEnabled(!paused && !runSettled && Boolean(game));
      telemetry.emit(
        paused ? "lifecycle_pause" : "lifecycle_resume",
        paused ? { reason: reason ?? "user" } : {},
      );
    },
  });
  const lifecycle = bindRuntimeLifecycle(runtime);

  if (testHarness.enabled) {
    testHarness.expose(window);
  }
  telemetry.emit("game_boot");
  renderHome();
  runtime.start();
  root.dataset.bootState = "ready";
  telemetry.emit("game_ready");

  window.addEventListener(
    "pagehide",
    () => {
      removeReadOnlyHook?.();
      lifecycle.dispose();
      input.destroy();
      runtime.dispose();
      telemetry.dispose();
      accessibility.dispose();
      testHarness.dispose();
    },
    { once: true },
  );
}

void boot().catch((error: unknown) => {
  const root = document.querySelector<HTMLElement>("#app");
  const host = document.querySelector<HTMLElement>("#ui-layer");
  if (root) root.dataset.bootState = "fatal";
  if (host) {
    host.innerHTML = `
      <main class="rc-result" role="alert">
        <span class="result-chip">启动失败</span>
        <h1>遗迹入口失联</h1>
        <p>${error instanceof Error ? error.message : String(error)}</p>
        <button class="rc-primary" data-reload>重新加载</button>
      </main>`;
    host.querySelector("[data-reload]")?.addEventListener(
      "click",
      () => location.reload(),
    );
  }
});
