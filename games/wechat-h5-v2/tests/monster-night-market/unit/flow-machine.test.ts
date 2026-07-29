import { describe, expect, it } from "vitest";
import {
  createFlow,
  finishRun,
  openMeta,
  openTutorial,
  replay,
  startRun,
} from "../../../apps/monster-night-market/src/app/flow-machine";
import { createDefaultSave } from "../../../apps/monster-night-market/src/meta/night-market-save";

describe("怪兽夜市完整流程", () => {
  it("首页经过教学进入营业，结算后无需刷新即可重玩", () => {
    let flow = createFlow(createDefaultSave());
    expect(flow.screen).toBe("home");
    flow = openTutorial(flow, "normal-1", "normal");
    expect(flow.screen).toBe("tutorial");
    flow = startRun(flow);
    expect(flow.screen).toBe("playing");
    flow = finishRun(flow, {
      seed: "normal-1",
      score: 700,
      completedRecipeIds: ["emberTofu"],
      metCustomerIds: ["fireCub"],
      nearMisses: [],
    });
    expect(flow.screen).toBe("result");
    flow = replay(flow);
    expect(flow.screen).toBe("playing");
    expect(flow.activeSeed).toContain("retry");
    expect(openMeta(flow).screen).toBe("meta");
  });

  it("每日挑战重玩保持同一日期种子", () => {
    let flow = createFlow(createDefaultSave());
    flow = openTutorial(
      flow,
      "monster-night-market:daily:v1:2026-07-29",
      "daily",
    );
    flow = startRun(flow);
    flow = finishRun(flow, {
      seed: flow.activeSeed!,
      score: 500,
      completedRecipeIds: [],
      metCustomerIds: [],
      nearMisses: [],
    });
    expect(replay(flow).activeSeed).toBe(flow.activeSeed);
  });
});
