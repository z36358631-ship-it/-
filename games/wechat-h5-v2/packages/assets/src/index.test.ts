import { describe, expect, it, vi } from "vitest";
import type { AssetManifest } from "@gamehub/h5-contracts";
import {
  createAssetLoader,
  inferAssetMimeType,
  type AssetAdapter,
} from "./index";

const manifest: AssetManifest = {
  schemaVersion: 1,
  gameId: "ricochet-crew",
  revision: "fixture-1",
  groups: [
    {
      id: "boot",
      required: true,
      assets: [
        {
          id: "hero",
          groupId: "boot",
          type: "texture",
          url: "/hero.webp",
          bytes: 4,
          sha256:
            "e12e115acf4552b2568b55e93cbd39394c4ef81c82447fa8541d36c52077e7f9",
          width: 1,
          height: 1,
        },
      ],
    },
  ],
};

describe("asset loader", () => {
  it("retries once and releases the decoded group", async () => {
    const adapter: AssetAdapter = {
      fetchBytes: vi
        .fn()
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
      decode: vi.fn(async () => ({ texture: true })),
      release: vi.fn(async () => undefined),
    };
    const loader = createAssetLoader({
      manifest,
      adapter,
      digest: async () =>
        "e12e115acf4552b2568b55e93cbd39394c4ef81c82447fa8541d36c52077e7f9",
      maxAttempts: 2,
    });
    await loader.loadGroup("boot");
    expect(loader.get("hero")).toEqual({ texture: true });
    expect(adapter.fetchBytes).toHaveBeenCalledTimes(2);
    await loader.releaseGroup("boot");
    expect(loader.snapshot().loadedAssetIds).toEqual([]);
  });

  it("rejects a hash mismatch instead of decoding corrupt bytes", async () => {
    const adapter: AssetAdapter = {
      fetchBytes: vi.fn(async () => new Uint8Array([9])),
      decode: vi.fn(),
      release: vi.fn(),
    };
    const loader = createAssetLoader({
      manifest,
      adapter,
      digest: async () => "bad-hash",
    });
    await expect(loader.loadGroup("boot")).rejects.toThrow(
      "ASSET_HASH_MISMATCH:hero",
    );
    expect(adapter.decode).not.toHaveBeenCalled();
  });

  it.each([
    ["/cover-art.svg", "image/svg+xml"],
    ["/hero.PNG?revision=2", "image/png"],
    ["/scene.webp", "image/webp"],
    ["/scene.avif", "image/avif"],
    ["/atlas.json", "application/json"],
    ["/music.ogg", "audio/ogg"],
    ["/music.mp3", "audio/mpeg"],
    ["/music.wav", "audio/wav"],
  ])("infers a browser-decodable MIME for %s", (url, expected) => {
    expect(inferAssetMimeType({
      id: "fixture",
      groupId: "boot",
      type: expected.startsWith("audio/") ? "audio" : "texture",
      url,
      bytes: 1,
      sha256: "0".repeat(64),
    })).toBe(expected);
  });
});
