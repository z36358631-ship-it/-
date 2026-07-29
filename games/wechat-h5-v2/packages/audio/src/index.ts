export interface AudioVoice {
  stop(): void;
  ended: Promise<void>;
}

export interface AudioBackend {
  unlock(): Promise<boolean>;
  play(cueId: string, options: AudioPlayOptions): AudioVoice;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;
}

export interface AudioPlayOptions {
  volume: number;
  playbackRate: number;
}

export interface AudioBusSnapshot {
  unlocked: boolean;
  muted: boolean;
  suspended: boolean;
  activeVoices: number;
  maxVoices: number;
}

export interface AudioBus {
  unlockFromGesture(): Promise<boolean>;
  play(
    cueId: string,
    options?: Partial<AudioPlayOptions>,
  ): boolean;
  setMuted(muted: boolean): void;
  suspend(): Promise<void>;
  resumeFromGesture(): Promise<boolean>;
  snapshot(): AudioBusSnapshot;
  dispose(): Promise<void>;
}

export function createAudioBus(options: {
  backend: AudioBackend;
  maxVoices?: number;
}): AudioBus {
  const maxVoices = options.maxVoices ?? 12;
  if (!Number.isInteger(maxVoices) || maxVoices < 1) {
    throw new Error("AUDIO_MAX_VOICES_INVALID");
  }
  const voices = new Set<AudioVoice>();
  let unlocked = false;
  let muted = false;
  let suspended = false;

  const stopAll = () => {
    voices.forEach((voice) => {
      try {
        voice.stop();
      } catch {
        // A voice that ended between snapshot and stop is already released.
      }
    });
    voices.clear();
  };

  return {
    async unlockFromGesture() {
      if (muted) return false;
      try {
        unlocked = await options.backend.unlock();
        suspended = false;
        return unlocked;
      } catch {
        unlocked = false;
        return false;
      }
    },
    play(cueId, partial = {}) {
      if (
        !unlocked ||
        muted ||
        suspended ||
        voices.size >= maxVoices
      ) {
        return false;
      }
      try {
        const voice = options.backend.play(cueId, {
          volume: partial.volume ?? 1,
          playbackRate: partial.playbackRate ?? 1,
        });
        voices.add(voice);
        void voice.ended.finally(() => voices.delete(voice));
        return true;
      } catch {
        return false;
      }
    },
    setMuted(next) {
      muted = next;
      if (muted) stopAll();
    },
    async suspend() {
      suspended = true;
      stopAll();
      await options.backend.suspend();
    },
    async resumeFromGesture() {
      if (muted) return false;
      try {
        await options.backend.resume();
        unlocked = true;
        suspended = false;
        return true;
      } catch {
        return false;
      }
    },
    snapshot: () => ({
      unlocked,
      muted,
      suspended,
      activeVoices: voices.size,
      maxVoices,
    }),
    async dispose() {
      stopAll();
      await options.backend.dispose();
      unlocked = false;
      suspended = true;
    },
  };
}

export interface WebAudioBackend extends AudioBackend {
  register(cueId: string, buffer: AudioBuffer): void;
  unregister(cueId: string): void;
}

export function createWebAudioBackend(options: {
  contextFactory?: () => AudioContext;
} = {}): WebAudioBackend {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  const buffers = new Map<string, AudioBuffer>();
  const factory =
    options.contextFactory ??
    (() => {
      const Constructor =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!Constructor) throw new Error("WEB_AUDIO_UNAVAILABLE");
      return new Constructor();
    });

  const ensure = () => {
    if (!context) {
      context = factory();
      master = context.createGain();
      master.gain.value = 0.7;
      master.connect(context.destination);
    }
    return context;
  };

  return {
    register(cueId, buffer) {
      buffers.set(cueId, buffer);
    },
    unregister(cueId) {
      buffers.delete(cueId);
    },
    async unlock() {
      try {
        const current = ensure();
        if (current.state === "suspended") await current.resume();
        return current.state === "running";
      } catch {
        return false;
      }
    },
    play(cueId, playOptions) {
      const current = ensure();
      const buffer = buffers.get(cueId);
      if (!buffer || !master) {
        throw new Error(`AUDIO_CUE_MISSING:${cueId}`);
      }
      const source = current.createBufferSource();
      const gain = current.createGain();
      source.buffer = buffer;
      source.playbackRate.value = playOptions.playbackRate;
      gain.gain.value = playOptions.volume;
      source.connect(gain);
      gain.connect(master);
      let resolveEnded: () => void = () => undefined;
      const ended = new Promise<void>((resolve) => {
        resolveEnded = resolve;
      });
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        source.disconnect();
        gain.disconnect();
        resolveEnded();
      };
      source.onended = finish;
      source.start();
      return {
        ended,
        stop() {
          if (finished) return;
          try {
            source.stop();
          } catch {
            finish();
          }
        },
      };
    },
    async suspend() {
      if (context?.state === "running") await context.suspend();
    },
    async resume() {
      const current = ensure();
      if (current.state === "suspended") await current.resume();
      if (current.state !== "running") {
        throw new Error(`WEB_AUDIO_NOT_RUNNING:${current.state}`);
      }
    },
    async dispose() {
      buffers.clear();
      master?.disconnect();
      if (context && context.state !== "closed") await context.close();
      context = null;
      master = null;
    },
  };
}
