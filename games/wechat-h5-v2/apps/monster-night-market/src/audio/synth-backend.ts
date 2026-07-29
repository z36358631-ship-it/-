import type {
  AudioBackend,
  AudioPlayOptions,
  AudioVoice,
} from "@gamehub/h5-audio";

const CUE: Record<
  string,
  readonly [number, number, OscillatorType]
> = {
  "audio.start": [392, 0.16, "sine"],
  "audio.serve": [660, 0.18, "triangle"],
  "audio.festival": [880, 0.34, "sawtooth"],
  "audio.result": [523, 0.3, "triangle"],
};

export function createSynthAudioBackend(): AudioBackend {
  let context: AudioContext | null = null;
  const active = new Set<OscillatorNode>();

  const ensure = (): AudioContext => {
    if (!context) {
      const AudioContextConstructor =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error("WEB_AUDIO_UNAVAILABLE");
      }
      context = new AudioContextConstructor();
    }
    return context;
  };

  return {
    async unlock() {
      const current = ensure();
      if (current.state === "suspended") {
        await current.resume();
      }
      return current.state === "running";
    },
    play(
      cueId: string,
      options: AudioPlayOptions,
    ): AudioVoice {
      const current = ensure();
      const cue = CUE[cueId] ?? [
        440,
        0.12,
        "sine",
      ];
      const oscillator = current.createOscillator();
      const gain = current.createGain();
      oscillator.type = cue[2];
      oscillator.frequency.value =
        cue[0] * options.playbackRate;
      gain.gain.setValueAtTime(
        0.0001,
        current.currentTime,
      );
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, 0.15 * options.volume),
        current.currentTime + 0.015,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        current.currentTime + cue[1],
      );
      oscillator.connect(gain);
      gain.connect(current.destination);
      let resolveEnded: () => void = () => undefined;
      const ended = new Promise<void>((resolve) => {
        resolveEnded = resolve;
      });
      let finished = false;
      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        active.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
        resolveEnded();
      };
      oscillator.onended = finish;
      active.add(oscillator);
      oscillator.start();
      oscillator.stop(
        current.currentTime + cue[1] + 0.02,
      );
      return {
        ended,
        stop() {
          if (finished) {
            return;
          }
          try {
            oscillator.stop();
          } catch {
            finish();
          }
        },
      };
    },
    async suspend() {
      if (context?.state === "running") {
        await context.suspend();
      }
    },
    async resume() {
      const current = ensure();
      if (current.state === "suspended") {
        await current.resume();
      }
    },
    async dispose() {
      active.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // 已结束的节点无需再次停止。
        }
      });
      active.clear();
      if (context && context.state !== "closed") {
        await context.close();
      }
      context = null;
    },
  };
}
