export type SoundCue = 'move' | 'hit' | 'defeat' | 'warning' | 'coreImpact';

export interface FeedbackAudio {
  readonly supported: boolean;
  readonly muted: boolean;
  arm(): void;
  play(cue: SoundCue): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

type AudioContextLike = AudioContext;

const CUE: Record<SoundCue, { frequency: number; endFrequency: number; duration: number; gain: number }> = {
  move: { frequency: 330, endFrequency: 470, duration: 0.09, gain: 0.035 },
  hit: { frequency: 180, endFrequency: 120, duration: 0.055, gain: 0.025 },
  defeat: { frequency: 520, endFrequency: 760, duration: 0.085, gain: 0.03 },
  warning: { frequency: 240, endFrequency: 240, duration: 0.14, gain: 0.025 },
  coreImpact: { frequency: 95, endFrequency: 52, duration: 0.18, gain: 0.045 },
};

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  const audioWindow = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext ?? audioWindow.webkitAudioContext;
}

export function createFeedbackAudio(): FeedbackAudio {
  const Context = getAudioContextConstructor();
  let context: AudioContextLike | null = null;
  let muted = false;
  let disposed = false;

  const ensureContext = (): AudioContextLike | null => {
    if (!Context || disposed) return null;
    try {
      context ??= new Context();
      if (context.state === 'suspended') void context.resume().catch(() => undefined);
      return context;
    } catch {
      return null;
    }
  };

  return {
    get supported() {
      return Boolean(Context);
    },
    get muted() {
      return muted;
    },
    arm() {
      if (!muted) ensureContext();
    },
    play(cue) {
      if (muted || disposed) return;
      const activeContext = ensureContext();
      if (!activeContext) return;

      try {
        const definition = CUE[cue];
        const now = activeContext.currentTime;
        const oscillator = activeContext.createOscillator();
        const gain = activeContext.createGain();
        oscillator.type = cue === 'coreImpact' ? 'sawtooth' : 'sine';
        oscillator.frequency.setValueAtTime(definition.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(
          definition.endFrequency,
          now + definition.duration,
        );
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(definition.gain, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + definition.duration);
        oscillator.connect(gain);
        gain.connect(activeContext.destination);
        oscillator.start(now);
        oscillator.stop(now + definition.duration + 0.01);
      } catch {
        // Audio is optional. A rejected or partially supported context never blocks play.
      }
    },
    setMuted(nextMuted) {
      muted = nextMuted;
    },
    dispose() {
      disposed = true;
      const activeContext = context;
      context = null;
      if (activeContext) void activeContext.close().catch(() => undefined);
    },
  };
}
