import type { TestHookRegistry } from "@gamehub/h5-testing";

export interface SnapshotSource<TSnapshot> {
  snapshot(): TSnapshot;
}

export function installNightMarketReadOnlyHooks<TSnapshot>(
  registry: TestHookRegistry,
  source: SnapshotSource<TSnapshot>,
): () => void {
  return registry.register(
    "nightMarket.snapshot",
    () => structuredClone(source.snapshot()),
  );
}
