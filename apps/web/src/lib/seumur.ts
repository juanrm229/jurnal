/**
 * Klien SEUMUR: ruang meja, napas bersama (disinkronkan jam server), lagu
 * kehidupan (nada pentatonik, makin rendah seiring usia), Seumur Harian,
 * almanak, dan garis hidup pribadi. Semua kemajuan pribadi disimpan di perangkat.
 */
import { seumur } from '@sehari/core';
import { callGame, useGameRoom } from './sidik';
import { store } from './storage';

export type View = seumur.View;

export const createMeja = (p: { name: string; avatar: string }) => callGame<View>('seumur', 'POST', '/rooms', p);
export const joinMeja = (code: string, p: { name: string; avatar: string }) => callGame<View>('seumur', 'POST', `/rooms/${code}/join`, p);
export const sendSeumur = (code: string, action: seumur.Action) => callGame<View>('seumur', 'POST', `/rooms/${code}/act`, { action });
export const leaveMeja = (code: string) => callGame('seumur', 'POST', `/rooms/${code}/leave`);
/** Saat bermain, tanya lebih sering supaya kartu teman terasa langsung jatuh. */
export const useMeja = (code: string, opts: { tv?: boolean } = {}) => useGameRoom<View>('seumur', code, { ...opts, ms: (v) => (v?.phase === 'main' || v?.phase === 'fokus' ? 550 : 900) });

// ── Napas bersama ───────────────────────────────────────────────────────────

/** Satu siklus napas ≈ 11 detik (5,5 napas per menit): tarik, tahan sejenak, hembus. */
export const NAPAS_MS = 11_000;
export function napasFase(serverNow: number): { t: number; fase: 'tarik' | 'tahan' | 'hembus'; skala: number } {
  const t = (serverNow % NAPAS_MS) / NAPAS_MS;
  if (t < 0.4) return { t, fase: 'tarik', skala: ease(t / 0.4) };
  if (t < 0.5) return { t, fase: 'tahan', skala: 1 };
  return { t, fase: 'hembus', skala: 1 - ease((t - 0.5) / 0.5) };
}
const ease = (x: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;

// ── Suara ───────────────────────────────────────────────────────────────────

let ac: AudioContext | null = null;
let wet: GainNode | null = null;
function ctx() {
  if (!ac) {
    ac = new AudioContext();
    // Gema sederhana: dua tunda berumpan balik, lembut.
    const d1 = ac.createDelay(1);
    const d2 = ac.createDelay(1);
    d1.delayTime.value = 0.31;
    d2.delayTime.value = 0.47;
    const fb = ac.createGain();
    fb.gain.value = 0.32;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    wet = ac.createGain();
    wet.gain.value = 0.5;
    wet.connect(d1).connect(lp).connect(d2).connect(fb).connect(d1);
    d2.connect(ac.destination);
  }
  if (ac.state === 'suspended') void ac.resume();
  return ac;
}

const PENTA = [0, 2, 4, 7, 9];
/** Nada untuk usia: muda tinggi dan terang, tua rendah dan hangat. */
export function nadaUsia(usia: number): number {
  const step = Math.round(((95 - Math.min(95, usia)) / 95) * 15);
  const semi = Math.floor(step / 5) * 12 + PENTA[step % 5]!;
  return 174.6 * 2 ** (semi / 12);
}

export function bunyi(freq: number, opts: { dur?: number; vol?: number; type?: OscillatorType } = {}) {
  try {
    const a = ctx();
    const t = a.currentTime;
    const dur = opts.dur ?? 2.6;
    for (const [mult, v] of [
      [1, 1],
      [2, 0.18],
    ] as const) {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = mult === 1 ? (opts.type ?? 'sine') : 'triangle';
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime((opts.vol ?? 0.16) * v, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(a.destination);
      g.connect(wet!);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  } catch {}
}

/** Lilin padam: desir napas lembut. */
export function bunyiPadam() {
  try {
    const a = ctx();
    const t = a.currentTime;
    const len = a.sampleRate * 1.2;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(260, t + 1.1);
    const g = a.createGain();
    g.gain.value = 0.22;
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
    setTimeout(() => bunyi(nadaUsia(80) / 2, { dur: 3, vol: 0.12 }), 250);
  } catch {}
}

/** Lagu kehidupan: putar nada seluruh garis hidup berurutan. */
export function laguKehidupan(usia: number[], onStep?: (i: number) => void, gap = 520): () => void {
  let stop = false;
  usia.forEach((u, i) =>
    setTimeout(() => {
      if (stop) return;
      bunyi(nadaUsia(u), { dur: 2.2, vol: 0.13 });
      onStep?.(i);
    }, i * gap),
  );
  setTimeout(() => !stop && onStep?.(-1), usia.length * gap + 400);
  return () => {
    stop = true;
  };
}

// ── Kemajuan pribadi ────────────────────────────────────────────────────────

/** Almanak: momen yang pernah kamu lihat usianya. */
export const almanak = {
  get: (): Record<string, number> => store.json<Record<string, number>>('seumurAlmanak') ?? {},
  add(ids: string[]) {
    const a = almanak.get();
    for (const id of ids) {
      const m = seumur.momenOf(id);
      if (m) a[id] = m.usia;
    }
    store.set('seumurAlmanak', JSON.stringify(a));
  },
};

/** Garis hidupku: momen yang sudah kamu alami, dengan usiamu saat itu. */
export const garisku = {
  get: (): Record<string, number | null> => store.json<Record<string, number | null>>('seumurGarisku') ?? {},
  set(id: string, usia: number | null | undefined) {
    const g = garisku.get();
    if (usia === undefined) delete g[id];
    else g[id] = usia;
    store.set('seumurGarisku', JSON.stringify(g));
  },
};

export interface Rekor {
  kehidupan: number;
  utuh: number;
  terjauh: number;
}
export const rekor = {
  get: (): Rekor => store.json<Rekor>('seumurRekor') ?? { kehidupan: 0, utuh: 0, terjauh: 0 },
  add(utuh: boolean, usia: number) {
    const r = rekor.get();
    r.kehidupan++;
    if (utuh) r.utuh++;
    r.terjauh = Math.max(r.terjauh, utuh ? 90 : usia);
    store.set('seumurRekor', JSON.stringify(r));
  },
};

// ── Seumur Harian ───────────────────────────────────────────────────────────

export const tanggalWIB = (now = Date.now()) => new Date(now + 7 * 3600_000).toISOString().slice(0, 10);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Delapan momen hari ini, sama untuk semua orang: dua dari setiap bab, usia tidak kembar. */
export function momenHarian(tanggal: string): seumur.Momen[] {
  const r = rng([...`seumur:${tanggal}`].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7));
  const out: seumur.Momen[] = [];
  for (const b of seumur.BAB) {
    const pool = seumur.MOMEN.filter((m) => m.usia >= b.dari && m.usia <= b.sampai);
    for (let i = 0; i < 2; i++) {
      for (let t = 0; t < 50; t++) {
        const m = pool[Math.floor(r() * pool.length)]!;
        if (!out.some((x) => x.id === m.id || Math.abs(x.usia - m.usia) < 2)) {
          out.push(m);
          break;
        }
      }
    }
  }
  // Acak urutan awal.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Panjang urutan terpanjang yang benar (tidak harus berdampingan). */
export function urutBenar(usia: number[]): number {
  const tails: number[] = [];
  for (const u of usia) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid]! <= u) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = u;
  }
  return tails.length;
}
export const bintangHarian = (benar: number, total = 8) => (benar >= total ? 3 : benar >= total - 2 ? 2 : benar >= total / 2 ? 1 : 0);

export interface HasilHarian {
  urut: string[];
  benar: number;
  bintang: number;
}
export const harian = {
  all: (): Record<string, HasilHarian> => store.json<Record<string, HasilHarian>>('seumurHarian') ?? {},
  get: (tgl: string) => harian.all()[tgl] ?? null,
  set(tgl: string, h: HasilHarian) {
    const a = harian.all();
    a[tgl] = h;
    store.set('seumurHarian', JSON.stringify(a));
  },
  streak(today: string): number {
    const a = harian.all();
    let n = 0;
    const d = new Date(`${today}T00:00:00Z`);
    if (!a[today]) d.setUTCDate(d.getUTCDate() - 1);
    while (a[d.toISOString().slice(0, 10)]) {
      n++;
      d.setUTCDate(d.getUTCDate() - 1);
    }
    return n;
  },
};
