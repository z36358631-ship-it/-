import { createAccessibilityController } from "@gamehub/h5-accessibility";
import { createAssetLoader, createBrowserAssetAdapter, type AssetManifest } from "@gamehub/h5-assets";
import { createAudioBus, createWebAudioBackend } from "@gamehub/h5-audio";
import { createInputController, type InputController } from "@gamehub/h5-input";
import { bindRuntimeLifecycle, createGameRuntime } from "@gamehub/h5-runtime";
import { createLocalStorageSaveAdapter, createSaveStore } from "@gamehub/h5-save";
import { createLocalTelemetryQueue, createTelemetryClient } from "@gamehub/h5-telemetry";
import { createTestHarness } from "@gamehub/h5-testing";
import { createThreeLaneApp, type ThreeLaneApp } from "./app/createThreeLaneApp";
import { createDefaultSave, type ThreeLaneSave } from "./meta/saveModel";
import { BATTLE_LOGICAL_SIZE } from "./presentation/BattleScene";
import { installThreeLaneDebugApi } from "./testing/debugApi";
import "./style.css";

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#app");
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  const host = document.querySelector<HTMLElement>("#ui-layer");
  const liveRegion = document.querySelector<HTMLElement>("#live-region");
  if (!root || !canvas || !host || !liveRegion) throw new Error("THREE_LANE_DOM_MISSING");

  root.dataset.bootState = "loading";
  const harness = createTestHarness({
    search: location.search,
    gameId: "three-lane-squad",
    defaultSeed: 73_029,
    maxSpeed: 20,
  });
  const accessibility = createAccessibilityController({ root, liveRegion });
  const audio = createAudioBus({ backend: createWebAudioBackend(), maxVoices: 8 });
  const telemetry = createTelemetryClient({
    gameId: "three-lane-squad",
    testMode: harness.enabled,
    queue: createLocalTelemetryQueue({ gameId: "three-lane-squad" }),
  });
  telemetry.emit("game_boot");

  const store = createSaveStore<ThreeLaneSave>({
    gameId: "three-lane-squad",
    currentSchemaVersion: 1,
    defaultValue: createDefaultSave,
    migrations: {},
    adapter: createLocalStorageSaveAdapter(),
  });
  const loaded = await store.load();
  if (loaded.recovered) {
    telemetry.emit("save_recovered", { source: loaded.source });
    accessibility.announce("已恢复最近的有效存档");
  }
  audio.setMuted(loaded.payload.settings.muted);
  accessibility.setReducedMotion(loaded.payload.settings.reducedMotion);

  const manifestResponse = await fetch("./assets/asset-manifest.json", { cache: "no-cache" });
  if (!manifestResponse.ok) throw new Error(`ASSET_MANIFEST_HTTP_${manifestResponse.status}`);
  const rawManifest = await manifestResponse.json() as AssetManifest;
  const manifest: AssetManifest = {
    ...rawManifest,
    groups: rawManifest.groups.map((group) => ({
      ...group,
      assets: group.assets.map((entry) => ({
        ...entry,
        url: `./assets/${entry.url.replace(/^\.\//, "")}`,
      })),
    })),
  };
  const assets = createAssetLoader({
    manifest,
    adapter: createBrowserAssetAdapter({
      async decodeBlob(_entry, _url, bytes) {
        return bytes;
      },
      releaseDecoded() {},
    }),
  });
  await assets.loadGroup("boot");

  let app: ThreeLaneApp;
  let inputController: InputController;
  const runtime = createGameRuntime({
    fixedStepMs: 50,
    maxCatchUpSteps: 8,
    onFixedUpdate: (seconds) => app.fixedUpdate(seconds * 1_000),
    onRender: () => app.render(),
    onPauseChange: (paused, reason) => {
      inputController.setEnabled(!paused && app.snapshot().screen === "battle");
      if (paused) {
        void audio.suspend();
        telemetry.emit("lifecycle_pause", { reason: reason ?? "user" });
      } else {
        telemetry.emit("lifecycle_resume");
      }
    },
    onPerformanceTierChange: (tier) => {
      root.dataset.performanceTier = tier;
      telemetry.emit("performance_tier_changed", { tier });
    },
  });

  app = createThreeLaneApp({
    host,
    canvas,
    save: loaded.payload,
    today: new Date().toISOString().slice(0, 10),
    timeScale: harness.speed,
    persist: (save) => { void store.save(save); },
    onScreenChange: (screen) => {
      root.dataset.screen = screen;
      if (typeof inputController !== "undefined") inputController.setEnabled(screen === "battle");
      if (screen === "home") accessibility.announce("三路小队首页");
      if (screen === "result") accessibility.announce("本局已结算", "assertive");
    },
    onMeaningfulInput: (kind) => {
      telemetry.emit("strategy_changed", { kind });
      void audio.unlockFromGesture();
    },
    onFirstInput: (payload) => {
      telemetry.emit("first_input", payload);
    },
    onFirstPayoff: (payload) => {
      telemetry.emit("first_payoff", payload);
    },
    onRunStart: (runId, daily) => {
      telemetry.beginRun(runId);
      if (daily) telemetry.emit("daily_start");
    },
    onRunEnd: (result) => {
      telemetry.endRun({ result });
    },
    onPauseChange: (paused) => paused ? runtime.pause("user") : runtime.resume(),
    onMutedChange: (muted) => audio.setMuted(muted),
    onReducedMotionChange: (reduced) => accessibility.setReducedMotion(reduced),
  });

  inputController = createInputController({
    element: canvas,
    logicalSize: BATTLE_LOGICAL_SIZE,
    axisLockThreshold: 10,
    tapRadius: 8,
  });
  inputController.setEnabled(false);
  inputController.subscribe((intent) => {
    const battle = app.snapshot().battle;
    const atMs = battle?.elapsedMs ?? 0;
    if (intent.kind === "drag-start") {
      app.handleDragStart(intent.point, atMs);
    } else if (intent.kind === "drag-move") {
      app.handleDragMove(intent.origin, intent.point, atMs);
    } else if (intent.kind === "tap") {
      app.handleTap(intent.point, atMs);
    } else if (intent.kind === "drag-end") {
      app.handleDragEnd(intent.origin, intent.point, atMs);
    } else if (intent.kind === "swipe") {
      app.handleDragEnd(intent.start, intent.end, atMs);
    } else if (intent.kind === "cancel") {
      app.cancelDragPreview();
    }
  });

  const lifecycle = bindRuntimeLifecycle(runtime);
  root.addEventListener("pointerdown", () => { void audio.unlockFromGesture(); }, { once: true });

  if (harness.enabled) {
    installThreeLaneDebugApi(window, app.snapshot);
    harness.registry.register("snapshot", app.snapshot);
    harness.expose(window);
  }

  window.addEventListener("pagehide", () => {
    lifecycle.dispose();
    inputController.destroy();
    app.dispose();
    telemetry.dispose();
    accessibility.dispose();
    harness.dispose();
    void assets.dispose();
    void audio.dispose();
    runtime.dispose();
  }, { once: true });

  root.dataset.bootState = "ready";
  telemetry.emit("game_ready");
  accessibility.announce("三路小队已就绪");
  runtime.start();
}

void boot().catch((error: unknown) => {
  const root = document.querySelector<HTMLElement>("#app");
  const host = document.querySelector<HTMLElement>("#ui-layer");
  if (root) root.dataset.bootState = "fatal";
  if (host) {
    host.innerHTML = `
      <main class="fatal-view" role="alert">
        <span class="result-sigil lost">!</span>
        <h1>启动失败</h1>
        <p>${error instanceof Error ? error.message : String(error)}</p>
        <button type="button" class="primary-action" data-action="reload">重新加载</button>
        <a href="../hub/" class="secondary-action">返回游戏大厅</a>
      </main>`;
    host.querySelector('[data-action="reload"]')?.addEventListener("click", () => location.reload());
  }
});
