/**
 * Synthesized Web Audio & Haptic Sound Engine
 * 100% Offline, zero external audio assets, zero network calls.
 * Works seamlessly in browser and Capacitor Android WebView.
 */

import { storage } from '../../data/storage/storageDriver';

const SOUND_MUTE_KEY = 'sound_muted';
const HAPTICS_KEY = 'haptics_enabled';

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private hapticsEnabled: boolean = true;

  constructor() {
    this.isMuted = storage.getItem<boolean>(SOUND_MUTE_KEY, false);
    this.hapticsEnabled = storage.getItem<boolean>(HAPTICS_KEY, true);
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    storage.setItem(SOUND_MUTE_KEY, this.isMuted);
    return this.isMuted;
  }

  getHaptics(): boolean {
    return this.hapticsEnabled;
  }

  toggleHaptics(): boolean {
    this.hapticsEnabled = !this.hapticsEnabled;
    storage.setItem(HAPTICS_KEY, this.hapticsEnabled);
    return this.hapticsEnabled;
  }

  triggerHaptic(pattern: number | number[] = 15): void {
    if (!this.hapticsEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Haptics not supported or blocked
    }
  }

  /**
   * Crisp tactile tap
   */
  playClick(freq = 460): void {
    this.triggerHaptic(12);
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {
      // AudioContext blocked
    }
  }

  /**
   * Playful mascot tap chirp
   */
  playChirp(): void {
    this.triggerHaptic([15, 20]);
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1080, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // ignore
    }
  }

  /**
   * Tactile punch for candidate drop impact
   */
  playPunch(): void {
    this.triggerHaptic([25, 30]);
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // ignore
    }
  }

  /**
   * Question answered feedback
   */
  playAnswer(type: 'yes' | 'probably' | 'unknown' | 'no'): void {
    this.triggerHaptic(type === 'yes' ? 18 : type === 'no' ? 22 : 14);
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      let startFreq = 580;
      let endFreq = 720;
      if (type === 'no') {
        startFreq = 340;
        endFreq = 220;
      } else if (type === 'probably') {
        startFreq = 520;
        endFreq = 620;
      } else if (type === 'unknown') {
        startFreq = 420;
        endFreq = 420;
      }

      osc.type = type === 'no' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // AudioContext error
    }
  }

  /**
   * Mascot thinking hum
   */
  playThought(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // ignore
    }
  }

  /**
   * Dramatic reveal build-up
   */
  playReveal(): void {
    this.triggerHaptic([30, 40, 50]);
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {
      // ignore
    }
  }

  /**
   * Victory / Success fanfare chime
   */
  playVictory(): void {
    this.triggerHaptic([50, 40, 80, 40, 120]);
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.09;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
    } catch {
      // ignore
    }
  }
}

export const audio = new AudioSynthesizer();
