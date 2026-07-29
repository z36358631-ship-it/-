import type { TestHookRegistry } from "@gamehub/h5-testing";

export function installRicochetReadOnlyHook<T>(
  registry: TestHookRegistry,
  source: { snapshot(): T },
): () => void {
  return registry.register(
    "ricochet.snapshot",
    () => structuredClone(source.snapshot()),
  );
}
