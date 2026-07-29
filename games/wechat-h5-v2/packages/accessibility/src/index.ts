export interface AccessibilitySnapshot {
  reducedMotion: boolean;
}

export interface AccessibilityController {
  snapshot(): AccessibilitySnapshot;
  subscribe(
    listener: (snapshot: AccessibilitySnapshot) => void,
  ): () => void;
  setReducedMotion(value: boolean): void;
  announce(
    message: string,
    priority?: "polite" | "assertive",
  ): void;
  activateModal(layer: HTMLElement, initialFocus?: HTMLElement): void;
  deactivateModal(layer: HTMLElement, returnFocus?: HTMLElement): void;
  dispose(): void;
}

function focusableElements(layer: HTMLElement): HTMLElement[] {
  return [...layer.querySelectorAll<HTMLElement>(
    'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
  )].filter((node) => node.getClientRects().length > 0);
}

export function createAccessibilityController(options: {
  root: HTMLElement;
  liveRegion: HTMLElement;
  matchReducedMotion?: () => boolean;
}): AccessibilityController {
  let reducedMotion =
    options.matchReducedMotion?.() ??
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const listeners = new Set<
    (snapshot: AccessibilitySnapshot) => void
  >();
  let activeModal: HTMLElement | null = null;
  let previousFocus: HTMLElement | null = null;
  const apply = () => {
    options.root.dataset.reducedMotion = String(reducedMotion);
  };
  const snapshot = () => ({ reducedMotion });
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || !activeModal) return;
    const items = focusableElements(activeModal);
    if (items.length === 0) {
      event.preventDefault();
      activeModal.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  apply();
  return {
    snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setReducedMotion(value) {
      reducedMotion = value;
      apply();
      listeners.forEach((listener) => listener(snapshot()));
    },
    announce(message, priority = "polite") {
      options.liveRegion.setAttribute("aria-live", priority);
      options.liveRegion.textContent = "";
      queueMicrotask(() => {
        options.liveRegion.textContent = message;
      });
    },
    activateModal(layer, initialFocus) {
      previousFocus = document.activeElement as HTMLElement | null;
      activeModal = layer;
      layer.setAttribute("role", "dialog");
      layer.setAttribute("aria-modal", "true");
      document.addEventListener("keydown", keydown);
      queueMicrotask(() =>
        (initialFocus ?? focusableElements(layer)[0] ?? layer).focus(),
      );
    },
    deactivateModal(layer, returnFocus) {
      if (activeModal !== layer) return;
      document.removeEventListener("keydown", keydown);
      layer.removeAttribute("aria-modal");
      activeModal = null;
      (returnFocus ?? previousFocus)?.focus();
      previousFocus = null;
    },
    dispose() {
      document.removeEventListener("keydown", keydown);
      activeModal = null;
      listeners.clear();
    },
  };
}
