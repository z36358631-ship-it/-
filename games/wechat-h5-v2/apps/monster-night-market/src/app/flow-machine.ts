import {
  applyRunSummary,
  type NightMarketSaveV1,
  type RunSummary,
} from "../meta/night-market-save";

export type FlowScreen =
  | "home"
  | "tutorial"
  | "playing"
  | "result"
  | "meta";

export interface NightMarketFlow {
  readonly screen: FlowScreen;
  readonly save: NightMarketSaveV1;
  readonly activeSeed: string | null;
  readonly activeMode: "normal" | "daily" | null;
  readonly lastSummary: RunSummary | null;
}

export function createFlow(
  save: NightMarketSaveV1,
): NightMarketFlow {
  return {
    screen: "home",
    save,
    activeSeed: null,
    activeMode: null,
    lastSummary: null,
  };
}

export function openTutorial(
  flow: NightMarketFlow,
  seed: string,
  mode: "normal" | "daily",
): NightMarketFlow {
  return {
    ...flow,
    screen: "tutorial",
    activeSeed: seed,
    activeMode: mode,
  };
}

export function startRun(
  flow: NightMarketFlow,
): NightMarketFlow {
  if (!flow.activeSeed || !flow.activeMode) {
    throw new Error("Cannot start without a prepared run");
  }
  return { ...flow, screen: "playing" };
}

export function finishRun(
  flow: NightMarketFlow,
  summary: RunSummary,
): NightMarketFlow {
  return {
    ...flow,
    screen: "result",
    save: applyRunSummary(flow.save, summary),
    lastSummary: summary,
  };
}

export function replay(
  flow: NightMarketFlow,
): NightMarketFlow {
  if (!flow.activeSeed || !flow.activeMode) {
    throw new Error("Cannot replay without an active run");
  }
  const activeSeed =
    flow.activeMode === "daily"
      ? flow.activeSeed
      : `${flow.activeSeed}:retry:${flow.save.runCount + 1}`;
  return {
    ...flow,
    screen: "playing",
    activeSeed,
  };
}

export function openMeta(
  flow: NightMarketFlow,
): NightMarketFlow {
  return { ...flow, screen: "meta" };
}

export function returnHome(
  flow: NightMarketFlow,
): NightMarketFlow {
  return {
    ...flow,
    screen: "home",
    activeSeed: null,
    activeMode: null,
  };
}
