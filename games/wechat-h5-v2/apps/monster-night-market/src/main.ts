import "./styles.css";
import { createAccessibilityController } from "@gamehub/h5-accessibility";
import {
  createAssetLoader,
  createBrowserAssetAdapter,
  type AssetManifest,
} from "@gamehub/h5-assets";
import { createAudioBus } from "@gamehub/h5-audio";
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
import { bootstrapNightMarket } from "./app/bootstrap-night-market";
import { createSynthAudioBackend } from "./audio/synth-backend";
import {
  createDefaultSave,
  migrateNightMarketSave,
  type NightMarketSaveV1,
} from "./meta/night-market-save";
import { NightMarketView } from "./presentation/night-market-view";

async function main(): Promise<void> {
  const root =
    document.querySelector<HTMLElement>("#app");
  const uiRoot =
    document.querySelector<HTMLElement>("#ui-layer");
  const liveRegion =
    document.querySelector<HTMLElement>(
      "#live-region",
    );
  if (!root || !uiRoot || !liveRegion) {
    throw new Error("NIGHT_MARKET_ROOT_MISSING");
  }

  const view = new NightMarketView(uiRoot);
  const manifestResponse = await fetch(
    "./assets/asset-manifest.json",
  );
  if (!manifestResponse.ok) {
    throw new Error(
      `NIGHT_MARKET_MANIFEST_HTTP_${manifestResponse.status}`,
    );
  }
  const manifestJson =
    (await manifestResponse.json()) as AssetManifest;
  const assets = createAssetLoader({
  manifest: manifestJson,
  adapter: createBrowserAssetAdapter({
    decodeBlob: async (entry, url) => {
      if (entry.type === "json") {
        return fetch(url).then((response) =>
          response.json(),
        );
      }
      return url;
    },
    releaseDecoded: () => undefined,
  }),
  maxAttempts: 2,
  });
  const audio = createAudioBus({
  backend: createSynthAudioBackend(),
  maxVoices: 12,
  });
  const input = createInputController({
  element: view.inputElement(),
  logicalSize: { width: 320, height: 320 },
  axisLockThreshold: 10,
  tapRadius: 8,
  });
  const save = createSaveStore<NightMarketSaveV1>({
  gameId: "monster-night-market",
  currentSchemaVersion: 1,
  defaultValue: createDefaultSave,
  migrations: {
    0: (payload) =>
      migrateNightMarketSave(0, payload),
  },
  adapter: createLocalStorageSaveAdapter(),
  });
  const testHarness = createTestHarness({
  search: location.search,
  gameId: "monster-night-market",
  defaultSeed: 20260729,
  maxSpeed: 8,
  });
  const telemetry = createTelemetryClient({
  gameId: "monster-night-market",
  testMode: testHarness.enabled,
  queue: createLocalTelemetryQueue({
    gameId: "monster-night-market",
    maxEvents: 4_000,
  }),
  });
  const accessibility =
    createAccessibilityController({
      root: uiRoot,
      liveRegion,
    });

  let app:
    | Awaited<
        ReturnType<typeof bootstrapNightMarket>
      >
    | null = null;
  const runtime = createGameRuntime({
    fixedStepMs: 1000 / 30,
    onFixedUpdate: (stepSeconds) => {
      app?.tick(stepSeconds);
    },
    onRender: () => undefined,
    onPauseChange: (paused) => {
      if (paused) {
        input.cancelActive("pause");
        void audio.suspend();
      }
    },
  });
  const lifecycle = bindRuntimeLifecycle(runtime);
  app = await bootstrapNightMarket({
    view,
    assets,
    runtime,
    input,
    audio,
    save,
    telemetry,
    accessibility,
    testHarness,
    now: () => Date.now(),
  });
  runtime.start();

  window.addEventListener(
    "pagehide",
    () => {
      lifecycle.dispose();
      void app?.dispose();
    },
    { once: true },
  );
}

void main();
