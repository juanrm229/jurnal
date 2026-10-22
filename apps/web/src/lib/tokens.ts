/**
 * Token Kenangan yang syaratnya ada di isi terenkripsi diputuskan di perangkat,
 * lalu diklaim ke server (server memeriksa syarat yang bisa ia lihat).
 */
import { isFullMoonNight, isIdulFitri, type TokenCode } from '@sehari/core';
import { api } from '@/lib/api';
import type { CircleView, OpenDrop } from '@/lib/data';

const claimed = new Set<string>();

export function tokenCandidates(opts: {
  circle: CircleView;
  day: string;
  mine: OpenDrop[];
  homeCityId: string | null;
  allSealed: boolean;
  yellowed: boolean;
}): TokenCode[] {
  const out: TokenCode[] = [];
  const payloads = opts.mine.map((d) => d.payload).filter(Boolean);
  if (payloads.some((p) => p!.weather && ['hujan', 'gerimis', 'badai'].includes(p!.weather.code)) || payloads.some((p) => p!.tags?.includes('hujan'))) out.push('payung');
  if (payloads.some((p) => p!.tags?.includes('laut'))) out.push('kerang');
  if (opts.homeCityId && payloads.some((p) => p!.cityId && p!.cityId !== opts.homeCityId)) out.push('tiket');
  if (opts.mine.some((d) => d.wire.kind === 'silent' && d.wire.reactions.some((r) => r.kind === 'candle'))) out.push('lilin');
  if (opts.yellowed) out.push('daun_kering');
  const mmdd = opts.day.slice(5);
  if (mmdd === '08-17') out.push('bendera');
  if (mmdd === '12-31' || mmdd === '01-01') out.push('kembang_api');
  if (isIdulFitri(opts.day)) out.push('ketupat');
  if (isFullMoonNight(opts.day)) out.push('bulan');
  if (opts.allSealed) out.push('kunci');
  if (mmdd === opts.circle.createdDay.slice(5) && opts.day > opts.circle.createdDay) out.push('pita');
  return out;
}

/** Klaim diam-diam; token yang sudah ada atau tak memenuhi syarat diabaikan. */
export async function claimTokens(circleId: string, day: string, codes: TokenCode[]): Promise<TokenCode[]> {
  const won: TokenCode[] = [];
  for (const code of codes) {
    const key = `${circleId}:${day}:${code}`;
    if (claimed.has(key)) continue;
    claimed.add(key);
    try {
      const r = await api.post<{ awarded: boolean }>(`/circles/${circleId}/tokens`, { code, day });
      if (r.awarded) won.push(code);
    } catch {
      // Syarat belum terpenuhi menurut server — tidak apa-apa.
    }
  }
  return won;
}
