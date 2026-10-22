/**
 * Jejak otomatis — opsional, izin per sumber, semuanya dihitung di perangkat.
 * Cuaca diambil dari Open-Meteo memakai koordinat *kota* (bukan lokasi HP).
 */
import { getCity, type Me, type WeatherSnap } from '@sehari/core';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

const cache = new Map<string, WeatherSnap>();

function weatherFromCode(code: number, tempC: number): WeatherSnap {
  if (code === 0 || code === 1) return { code: 'cerah', tempC, label: 'cerah' };
  if (code === 2 || code === 3) return { code: 'berawan', tempC, label: 'berawan' };
  if (code === 45 || code === 48) return { code: 'kabut', tempC, label: 'berkabut' };
  if (code >= 51 && code <= 57) return { code: 'gerimis', tempC, label: 'gerimis' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { code: 'hujan', tempC, label: 'hujan' };
  if (code >= 95) return { code: 'badai', tempC, label: 'badai petir' };
  if (code >= 71 && code <= 77) return { code: 'salju', tempC, label: 'salju' };
  return { code: 'berawan', tempC, label: 'berawan' };
}

export async function currentWeather(cityId: string | null): Promise<WeatherSnap | undefined> {
  const city = getCity(cityId);
  if (!city) return undefined;
  const key = `${city.id}:${new Date().toISOString().slice(0, 13)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code`);
  if (!res.ok) return undefined;
  const j = (await res.json()) as { current?: { temperature_2m: number; weather_code: number } };
  if (!j.current) return undefined;
  const w = weatherFromCode(j.current.weather_code, j.current.temperature_2m);
  cache.set(key, w);
  return w;
}

export async function stepsToday(): Promise<number | undefined> {
  if (Platform.OS === 'web') return undefined;
  const ok = await Pedometer.isAvailableAsync();
  if (!ok) return undefined;
  const perm = await Pedometer.requestPermissionsAsync();
  if (!perm.granted) return undefined;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const r = await Pedometer.getStepCountAsync(start, new Date());
  return r.steps;
}

/** Tambahan otomatis untuk payload Drop sesuai izin pengguna. */
export async function autoTrail(me: Me): Promise<{ weather?: WeatherSnap; steps?: number }> {
  const s = me.user.settings;
  const [weather, steps] = await Promise.all([
    s.autoWeather ? currentWeather(me.user.cityId).catch(() => undefined) : undefined,
    s.autoSteps ? stepsToday().catch(() => undefined) : undefined,
  ]);
  return { ...(weather ? { weather } : {}), ...(steps !== undefined ? { steps } : {}) };
}
