import type { ThreeLaneAppSnapshot } from "../app/createThreeLaneApp";

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
};

declare global {
  interface Window {
    __THREE_LANE_SQUAD_DEBUG__?: {
      snapshot(): ThreeLaneAppSnapshot;
    };
  }
}

export function installThreeLaneDebugApi(
  target: Window,
  read: () => ThreeLaneAppSnapshot,
): () => void {
  Object.defineProperty(target, "__THREE_LANE_SQUAD_DEBUG__", {
    configurable: true,
    enumerable: false,
    writable: false,
    value: Object.freeze({
      snapshot: () => deepFreeze(structuredClone(read())),
    }),
  });
  return () => {
    delete target.__THREE_LANE_SQUAD_DEBUG__;
  };
}
