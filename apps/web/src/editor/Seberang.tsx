/**
 * Cuaca Seberang: kalau di kota orang terdekatmu sedang hujan, tepi halamanmu
 * ikut bertetes. Cuaca diambil dari Open-Meteo memakai koordinat *kota* yang
 * memang sudah kalian bagikan di lingkaran; tidak ada lokasi perangkat.
 */
import { getCity, type WeatherSnap } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import type { CircleView } from '@/lib/data';
import { currentWeather } from '@/lib/weather';
import { Doodle } from '@/ui/kit';

export interface Seberang {
  name: string;
  city: string;
  weather: WeatherSnap;
}

/** Orang terdekat yang tinggal di kota lain (duo didahulukan), dan cuaca di sana. */
export function useSeberang(circles: CircleView[], myCityId: string | null | undefined, on: boolean): Seberang | null {
  const sorted = [...circles].sort((a, b) => Number(b.kind === 'duo') - Number(a.kind === 'duo'));
  const far = sorted.flatMap((c) => c.others).find((m) => m.state === 'active' && m.cityId && m.cityId !== myCityId && getCity(m.cityId));
  const q = useQuery({ queryKey: ['weather', far?.cityId ?? '-'], queryFn: async () => (await currentWeather(far!.cityId)) ?? null, enabled: on && !!far, staleTime: 30 * 60_000, retry: false });
  if (!far || !q.data) return null;
  return { name: far.penName, city: getCity(far.cityId)!.name, weather: q.data };
}

const WET = { gerimis: 9, hujan: 18, badai: 26 } as Record<string, number>;
const ICON: Record<string, string> = { cerah: 'matahari', berawan: 'awan', kabut: 'awan', gerimis: 'hujan', hujan: 'hujan', badai: 'petir', salju: 'awan' };

/** Lapisan cuaca di tepi kertas; dirender di dalam <Page>, tidak menangkap ketukan. */
export function SeberangLayer({ s }: { s: Seberang }) {
  const code = s.weather.code;
  const drops = WET[code] ?? 0;
  return (
    <div className={`sbr sbr-${code}`} aria-hidden data-testid="seberang-layer">
      {Array.from({ length: drops }, (_, i) => {
        // Hanya di dua tepi kertas, supaya tulisan di tengah tetap bersih.
        const left = i % 2 === 0;
        const x = (left ? 1 : 87) + ((i * 37) % 12);
        return <i key={i} style={{ left: `${x}%`, animationDelay: `${((i * 0.37) % 2.4).toFixed(2)}s`, animationDuration: `${(1.5 + ((i * 13) % 9) / 10).toFixed(2)}s` } as CSSProperties} />;
      })}
      {code === 'badai' ? <b className="sbr-flash" /> : null}
      {code === 'cerah' ? <b className="sbr-sun" /> : null}
      {code === 'berawan' || code === 'kabut' ? (
        <>
          <span className="sbr-cloud a">
            <Doodle id="awan" size={64} />
          </span>
          <span className="sbr-cloud b">
            <Doodle id="awan-kecil" size={44} />
          </span>
        </>
      ) : null}
    </div>
  );
}

export function SeberangChip({ s, on, onToggle }: { s: Seberang; on: boolean; onToggle: () => void }) {
  return (
    <button className="kalkir-chip-btn sbr-chip" onClick={onToggle} aria-pressed={on} data-testid="seberang-chip" title={on ? 'sembunyikan cuaca seberang' : 'tampilkan cuaca seberang'}>
      <Doodle id={ICON[s.weather.code] ?? 'awan'} size={16} color="currentColor" />
      <span>
        di {s.city} <b>{s.weather.label}</b> · {Math.round(s.weather.tempC)}°
      </span>
      <span className="kalkir-eye">{s.name}</span>
    </button>
  );
}
