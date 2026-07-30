import type { AccessibilityController } from "@gamehub/h5-accessibility";
import type { AssetLoader } from "@gamehub/h5-assets";
import type { AudioBus } from "@gamehub/h5-audio";
import type { InputController } from "@gamehub/h5-input";
import type { GameRuntime } from "@gamehub/h5-runtime";
import type { SaveStore } from "@gamehub/h5-save";
import type { TelemetryClient } from "@gamehub/h5-telemetry";
import type { TestHarness } from "@gamehub/h5-testing";
import {
  createNightMarketController,
  type NightMarketController,
} from "./create-night-market-controller";
import {
  createFlow,
  finishRun,
  openMeta,
  openTutorial,
  replay,
  returnHome,
  startRun,
  type NightMarketFlow,
} from "./flow-machine";
import { dailyKeyAt, resolveDailySeed } from "../meta/daily-challenge";
import type { NightMarketSaveV1 } from "../meta/night-market-save";
import { mapInputIntent } from "../input/map-input-intent";
import {
  NightMarketView,
  type ViewAction,
} from "../presentation/night-market-view";
import { installNightMarketReadOnlyHooks } from "../testing/install-read-only-hooks";
import type { ShiftAction } from "../domain/types";

export interface BootstrapDeps {
  readonly view: NightMarketView;
  readonly assets: AssetLoader;
  readonly runtime: GameRuntime;
  readonly input: InputController;
  readonly audio: AudioBus;
  readonly save: SaveStore<NightMarketSaveV1>;
  readonly telemetry: TelemetryClient;
  readonly accessibility: AccessibilityController;
  readonly testHarness: TestHarness;
  readonly now: () => number;
  readonly createRunId?: () => string;
}

export interface NightMarketAppSnapshot {
  readonly screen: NightMarketFlow["screen"];
  readonly runCount: number;
  readonly unlockedRecipeIds: readonly string[];
  readonly unlockedStallIds: readonly string[];
  readonly run:
    | ReturnType<NightMarketController["snapshot"]>
    | null;
}

export interface BootstrappedNightMarket {
  tick(stepSeconds: number): void;
  startNormal(): void;
  startDaily(): void;
  snapshot(): NightMarketAppSnapshot;
  dispose(): Promise<void>;
}

export async function bootstrapNightMarket(
  deps: BootstrapDeps,
): Promise<BootstrappedNightMarket> {
  const createRunId =
    deps.createRunId ?? (() => crypto.randomUUID());
  await deps.assets.loadGroup("boot");
  const loaded = await deps.save.load();
  let flow = createFlow(loaded.payload);
  let controller: NightMarketController | null = null;
  let finishing = false;
  let committing = false;
  let pendingAction: ShiftAction | null = null;
  let runStartedAt = 0;

  deps.view.setKeyArt(
    deps.assets.get<string>("concept.keyart"),
  );
  deps.view.renderHome(flow.save);
  deps.input.setEnabled(false);

  const snapshot = (): NightMarketAppSnapshot => ({
    screen: flow.screen,
    runCount: flow.save.runCount,
    unlockedRecipeIds: [
      ...flow.save.unlockedRecipeIds,
    ],
    unlockedStallIds: [
      ...flow.save.unlockedStallIds,
    ],
    run: controller?.snapshot() ?? null,
  });

  const finishActiveRun = async (): Promise<void> => {
    if (!controller || finishing) {
      return;
    }
    finishing = true;
    deps.input.setEnabled(false);
    await controller.awaitSettled();
    const summary = controller.summary();
    const finalSnapshot = controller.snapshot();
    flow = finishRun(flow, summary);
    await deps.save.save(flow.save);
    deps.telemetry.endRun({
      result:
        finalSnapshot.servedOrderCount > 0
          ? "won"
          : "lost",
      score: summary.score,
      completedRecipeIds:
        summary.completedRecipeIds,
      moveCount: controller.snapshot().moveCount,
    });
    deps.audio.play("audio.result");
    deps.view.renderResult({
      score: summary.score,
      servedOrders: finalSnapshot.servedOrderCount,
      nearMisses: summary.nearMisses,
      runCount: flow.save.runCount,
      unlockedStalls:
        flow.save.unlockedStallIds.length,
      unlockedRecipes:
        flow.save.unlockedRecipeIds.length,
    });
    deps.accessibility.announce(
      `营业结束，获得 ${summary.score} 烟火币`,
      "assertive",
    );
    finishing = false;
  };

  const commit = async (
    action: ShiftAction,
  ): Promise<void> => {
    if (!controller) {
      return;
    }
    if (committing) {
      pendingAction = action;
      return;
    }
    committing = true;
    await controller.commit(action, deps.now());
    committing = false;
    const next = pendingAction;
    pendingAction = null;
    if (next) {
      await commit(next);
    }
  };

  const activateRun = async (): Promise<void> => {
    const activeSeed = flow.activeSeed;
    if (!activeSeed) {
      return;
    }
    await deps.audio.unlockFromGesture();
    await deps.assets.loadGroup("run");
    if (flow.screen === "tutorial") {
      flow = startRun(flow);
    }
    runStartedAt = deps.now();
    deps.telemetry.beginRun(createRunId());
    const unlockedStalls =
      flow.save.unlockedStallIds;
    const stallId =
      unlockedStalls[
        flow.save.runCount % unlockedStalls.length
      ] ?? "grill";
    controller = createNightMarketController({
      seed: activeSeed,
      stallId,
      upgrades: [
        "rushOrder",
        "festivalSpark",
        "patientQueue",
        ...(flow.save.runCount >= 1
          ? (["sharedPlate"] as const)
          : []),
      ],
      scene: deps.view,
      telemetry: deps.telemetry,
      audio: deps.audio,
      accessibility: deps.accessibility,
      animate: (preview, result) =>
        deps.view.animate(preview, {
          festivalTriggered:
            result.festivalTriggered,
          reducedMotion:
            deps.accessibility.snapshot()
              .reducedMotion,
        }),
      onUpdate: (runSnapshot) => {
        if (flow.screen === "playing") {
          deps.view.updateRun(runSnapshot);
        }
      },
      onFirstInput: ({ action, moveCount }) => {
        deps.telemetry.emit("first_input", {
          kind: "shift",
          axis: action.axis,
          moveCount,
          elapsedMs: Math.max(0, deps.now() - runStartedAt),
        });
      },
      onFirstPayoff: ({
        completedOrderCount,
        servedOrderCount,
      }) => {
        deps.telemetry.emit("first_payoff", {
          kind: "order_served",
          completedOrderCount,
          servedOrderCount,
          elapsedMs: Math.max(0, deps.now() - runStartedAt),
        });
      },
    });
    deps.view.renderPlaying(controller.snapshot());
    deps.input.setEnabled(true);
    deps.audio.play("audio.start");
  };

  const prepareNormal = (): void => {
    flow = openTutorial(
      flow,
      `normal:${deps.now()}`,
      "normal",
    );
    deps.input.setEnabled(false);
    deps.view.renderTutorial();
  };

  const prepareDaily = (): void => {
    const key = dailyKeyAt(new Date(deps.now()));
    flow = openTutorial(
      flow,
      resolveDailySeed(key),
      "daily",
    );
    deps.input.setEnabled(false);
    deps.view.renderTutorial();
  };

  const handleAction = (
    action: ViewAction,
  ): void => {
    if (action === "start") {
      prepareNormal();
    } else if (action === "daily") {
      prepareDaily();
    } else if (action === "tutorialContinue") {
      void activateRun();
    } else if (action === "finishEarly") {
      if (controller?.endNow()) {
        void finishActiveRun();
      }
    } else if (action === "replay") {
      flow = replay(flow);
      void activateRun();
    } else if (action === "meta") {
      flow = openMeta(flow);
      deps.input.setEnabled(false);
      deps.view.renderMeta(flow.save);
    } else if (action === "home") {
      flow = returnHome(flow);
      deps.input.setEnabled(false);
      deps.view.renderHome(flow.save);
    }
  };
  deps.view.onAction(handleAction);

  const unsubscribeInput = deps.input.subscribe(
    (intent) => {
      const mapped = mapInputIntent(
        intent,
        deps.view.boardRect(),
      );
      if (!mapped || !controller) {
        return;
      }
      if (mapped.phase === "preview") {
        controller.preview(
          mapped.action,
          deps.now(),
        );
      } else if (mapped.phase === "commit") {
        void commit(mapped.action);
      } else {
        controller.clearPreview();
      }
    },
  );

  let removeHooks: (() => void) | null = null;
  if (deps.testHarness.enabled) {
    removeHooks = installNightMarketReadOnlyHooks(
      deps.testHarness.registry,
      { snapshot },
    );
    deps.testHarness.expose(window);
  }

  return {
    tick(stepSeconds) {
      if (
        flow.screen === "playing" &&
        controller?.tick(
          stepSeconds * deps.testHarness.speed,
        )
      ) {
        void finishActiveRun();
      }
    },
    startNormal: prepareNormal,
    startDaily: prepareDaily,
    snapshot,
    async dispose() {
      removeHooks?.();
      unsubscribeInput();
      deps.input.destroy();
      deps.telemetry.dispose();
      deps.accessibility.dispose();
      deps.testHarness.dispose();
      await deps.audio.dispose();
      await deps.assets.dispose();
      deps.runtime.dispose();
    },
  };
}
