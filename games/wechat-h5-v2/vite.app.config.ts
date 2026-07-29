import path from "node:path";
import { defineConfig, type UserConfig } from "vite";
import type { GameId } from "@gamehub/h5-contracts";

const PORTS: Record<GameId, number> = {
  hub: 5173,
  "ricochet-crew": 5174,
  "monster-night-market": 5175,
  "three-lane-squad": 5176,
};

export function createAppViteConfig(
  appDir: string,
  gameId: GameId,
): UserConfig {
  return defineConfig({
    root: appDir,
    base: "./",
    publicDir: path.resolve(appDir, "public"),
    server: {
      host: "127.0.0.1",
      port: PORTS[gameId],
      strictPort: true,
    },
    build: {
      outDir: path.resolve(appDir, "../../dist", gameId),
      emptyOutDir: true,
      assetsInlineLimit: 0,
      sourcemap: false,
      target: "es2020",
      rollupOptions: {
        output: {
          entryFileNames: "assets/app-[hash].js",
          chunkFileNames: "assets/chunk-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  });
}
