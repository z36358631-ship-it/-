import { describe, expect, it, vi } from "vitest";
import {
  createAudioBus,
  type AudioBackend,
  type AudioVoice,
} from "./index";

function createVoice(): AudioVoice {
  return {
    stop: vi.fn(),
    ended: new Promise<void>(() => undefined),
  };
}

function backend(): AudioBackend & {
  unlock: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
} {
  return {
    unlock: vi.fn(async () => true),
    play: vi.fn(() => createVoice()),
    suspend: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
  };
}

describe("audio bus", () => {
  it("does not unlock or play before an explicit gesture", async () => {
    const fake = backend();
    const bus = createAudioBus({
      backend: fake,
      maxVoices: 2,
    });
    expect(bus.play("launch")).toBe(false);
    expect(fake.unlock).not.toHaveBeenCalled();
    await bus.unlockFromGesture();
    expect(bus.play("launch")).toBe(true);
    expect(bus.snapshot().activeVoices).toBe(1);
  });

  it("caps simultaneous voices and suspends in background", async () => {
    const fake = backend();
    const bus = createAudioBus({
      backend: fake,
      maxVoices: 2,
    });
    await bus.unlockFromGesture();
    bus.play("hit");
    bus.play("hit");
    expect(bus.play("hit")).toBe(false);
    expect(fake.play).toHaveBeenCalledTimes(2);
    await bus.suspend();
    expect(bus.snapshot()).toMatchObject({
      activeVoices: 0,
      suspended: true,
    });
  });

  it("muting prevents playback without creating another context", async () => {
    const fake = backend();
    const bus = createAudioBus({
      backend: fake,
    });
    await bus.unlockFromGesture();
    bus.setMuted(true);
    expect(bus.play("win")).toBe(false);
    expect(fake.unlock).toHaveBeenCalledTimes(1);
  });
});
