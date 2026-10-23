/**
 * Suara Sehari: musik latar melankolis yang dibangkitkan (bukan rekaman) dan
 * efek suara tipis — semuanya disintesis dengan Web Audio, tanpa berkas.
 * Musik bawaannya mati; efek suara menyala pelan. Keduanya bisa diatur.
 */
import { useSyncExternalStore } from 'react';
import { store } from './storage';

export type Sfx = 'tap' | 'open' | 'close' | 'pop' | 'seal' | 'chime' | 'type' | 'turn' | 'soft' | 'error';

export interface SoundPrefs {
  music: boolean;
  sfx: boolean;
  typing: boolean;
  volume: number; // 0..1
}

const DEFAULT: SoundPrefs = { music: false, sfx: true, typing: false, volume: 0.7 };
let prefs: SoundPrefs = { ...DEFAULT, ...(store.json<SoundPrefs>('sound') ?? {}) };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

// La minor yang pelan: Am9 – Fmaj7 – Cadd9 – G6 – Dm9 – Am – Fmaj7 – Esus4/E
const CHORDS: number[][] = [
  [45, 57, 60, 64, 71],
  [41, 57, 60, 64, 69],
  [48, 55, 62, 64, 67],
  [43, 55, 59, 62, 64],
  [38, 53, 57, 60, 64],
  [45, 57, 60, 64, 67],
  [41, 53, 57, 60, 64],
  [40, 52, 57, 59, 64],
];
const SCALE = [57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76];
const BAR = 7.5; // detik per akor (sekitar 64 bpm, 2 ketuk lambat)

class Engine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  reverb!: ConvolverNode;
  verbSend!: GainNode;
  private timer = 0;
  private nextBar = 0;
  private bar = 0;
  private lastType = 0;
  private noise: AudioBuffer | null = null;

  ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC({ latencyHint: 'playback' });
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = prefs.volume;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0;
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.55;
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this.impulse(3.8, 2.6);
      this.verbSend = ctx.createGain();
      this.verbSend.gain.value = 0.9;
      this.verbSend.connect(this.reverb).connect(this.master);
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
    }
    return buf;
  }

  private noiseBuf() {
    if (this.noise) return this.noise;
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this.noise = buf);
  }

  // ── Musik ────────────────────────────────────────────────────────────────

  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.timer) return;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0.9, ctx.currentTime, 2.5);
    this.nextBar = ctx.currentTime + 0.2;
    const tick = () => {
      while (this.nextBar < ctx.currentTime + 1.5) {
        this.scheduleBar(this.nextBar, CHORDS[this.bar % CHORDS.length]!);
        this.nextBar += BAR;
        this.bar++;
      }
    };
    tick();
    this.timer = window.setInterval(tick, 400);
  }

  stopMusic() {
    if (!this.ctx) return;
    window.clearInterval(this.timer);
    this.timer = 0;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
  }

  /** Satu akor: pad hangat + beberapa nada piano yang jatuh pelan. */
  private scheduleBar(t: number, chord: number[]) {
    const ctx = this.ctx!;
    const [bass, ...upper] = chord;
    this.pad(t, [bass!, ...upper.slice(0, 3)], BAR + 2.5);
    this.piano(t, bass! - 12, 0.18, 5);
    const pool = SCALE.filter((n) => upper.some((u) => (n - u) % 12 === 0) || Math.random() < 0.25);
    const beats = [0.5, 1.6, 2.9, 3.7, 4.8, 6.1];
    let last = pool[Math.floor(Math.random() * pool.length)]!;
    for (const b of beats) {
      if (Math.random() < 0.42) continue;
      const step = Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? -1 : 1;
      const idx = Math.max(0, Math.min(pool.length - 1, pool.indexOf(last) + step + (Math.random() < 0.3 ? -2 : 0)));
      last = pool[idx]!;
      const human = (Math.random() - 0.5) * 0.08;
      this.piano(t + b + human, last + (Math.random() < 0.15 ? 12 : 0), 0.07 + Math.random() * 0.04, 3.6);
    }
    void ctx;
  }

  private pad(t: number, notes: number[], dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(520, t);
    f.frequency.linearRampToValueAtTime(900, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(480, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.022, t + 2.4);
    g.gain.setValueAtTime(0.022, t + dur - 2.5);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(f);
    f.connect(this.musicBus);
    f.connect(this.verbSend);
    for (const n of notes) {
      for (const det of [-6, 5]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = mtof(n);
        o.detune.value = det;
        o.connect(g);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
    }
  }

  /** Piano lembut: sinus + harmonik kecil, serangan cepat, luruh panjang. */
  private piano(t: number, note: number, vel: number, decay: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    g.connect(f);
    f.connect(this.musicBus);
    const send = ctx.createGain();
    send.gain.value = 0.6;
    f.connect(send).connect(this.verbSend);
    const freq = mtof(note);
    for (const [mult, amp] of [
      [1, 1],
      [2, 0.28],
      [3, 0.08],
    ] as const) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      o.detune.value = (Math.random() - 0.5) * 6;
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }

  // ── Efek suara ───────────────────────────────────────────────────────────

  play(kind: Sfx) {
    if (!prefs.sfx) return;
    if (kind === 'type' && !prefs.typing) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    switch (kind) {
      case 'tap':
        return this.blip(t, 1350 + Math.random() * 120, 0.035, 0.05, 'sine');
      case 'soft':
        return this.blip(t, 880, 0.025, 0.08, 'sine');
      case 'type': {
        if (t - this.lastType < 0.035) return;
        this.lastType = t;
        return this.noiseHit(t, 2600 + Math.random() * 1400, 0.018, 0.03, 'bandpass');
      }
      case 'open':
        this.noiseSweep(t, 500, 2200, 0.26, 0.05);
        return this.blip(t + 0.05, 660, 0.02, 0.18, 'sine');
      case 'close':
        return this.noiseSweep(t, 2000, 400, 0.18, 0.035);
      case 'turn':
        return this.noiseSweep(t, 300, 3400, 0.42, 0.06);
      case 'pop':
        this.blip(t, 420, 0.07, 0.09, 'sine', 980);
        return this.noiseHit(t, 3000, 0.02, 0.025, 'highpass');
      case 'chime':
        [76, 79, 83, 88].forEach((n, i) => this.bell(t + i * 0.09, n, 0.05 - i * 0.008));
        return;
      case 'seal':
        this.blip(t, 140, 0.16, 0.35, 'sine', 60);
        this.noiseHit(t, 600, 0.08, 0.12, 'lowpass');
        [72, 76, 79, 84].forEach((n, i) => this.bell(t + 0.32 + i * 0.12, n, 0.045));
        return;
      case 'error':
        return this.blip(t, 300, 0.04, 0.16, 'triangle', 220);
    }
  }

  private blip(t: number, freq: number, vol: number, dur: number, type: OscillatorType, toFreq?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private bell(t: number, note: number, vol: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    g.connect(this.sfxBus);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    g.connect(send).connect(this.verbSend);
    for (const [m, a] of [
      [1, 1],
      [2.76, 0.25],
      [5.4, 0.08],
    ] as const) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.frequency.value = mtof(note) * m;
      og.gain.value = a;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 1.9);
    }
  }

  private noiseHit(t: number, freq: number, vol: number, dur: number, type: BiquadFilterType) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  /** Desir kertas: noise yang disaring dengan frekuensi bergeser. */
  private noiseSweep(t: number, from: number, to: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.9;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t, Math.random() * 0.4);
    s.stop(t + dur + 0.02);
  }
}

const engine = new Engine();

export const sound = {
  play: (k: Sfx) => {
    try {
      engine.play(k);
    } catch {
      /* suara tidak boleh pernah merusak apa pun */
    }
  },
  get prefs() {
    return prefs;
  },
  set(next: Partial<SoundPrefs>) {
    prefs = { ...prefs, ...next };
    store.set('sound', JSON.stringify(prefs));
    if (engine.ctx) engine.master.gain.setTargetAtTime(prefs.volume, engine.ctx.currentTime, 0.1);
    if ('music' in next) next.music ? engine.startMusic() : engine.stopMusic();
    emit();
  },
  /** Dipanggil pada gestur pertama: browser hanya mengizinkan audio setelah interaksi. */
  unlock() {
    if (prefs.music) engine.startMusic();
    else if (prefs.sfx) engine.ensure();
  },
};

export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => prefs,
  );
}

/** Ketukan ringan untuk semua tombol & tautan; elemen bisa memilih suara lain lewat data-sound. */
export function installGlobalSounds() {
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    sound.unlock();
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  window.addEventListener(
    'click',
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('button, a, [role="tab"], [role="switch"]');
      if (!el || (el as HTMLButtonElement).disabled) return;
      const s = el.dataset.sound as Sfx | 'none' | undefined;
      if (s === 'none') return;
      sound.play(s ?? 'tap');
    },
    { capture: true },
  );
  document.addEventListener('visibilitychange', () => {
    if (!prefs.music) return;
    // Musik ikut berhenti saat aplikasi ditinggalkan, menyala lagi saat kembali.
    document.hidden ? engine.stopMusic() : engine.startMusic();
  });
}
