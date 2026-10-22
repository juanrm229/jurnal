/**
 * Jejak otomatis — opsional, izin per sumber, semuanya dihitung di perangkat.
 * Cuaca diambil dari Open-Meteo memakai koordinat *kota* (bukan lokasi perangkat).
 */
import { COPY, type City, getCity, type Me, nearestCity, type WeatherSnap } from '@sehari/core';
import { type ReactNode, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Header, Toggle } from '@/ui/kit';
import { errMsg, IconRow, Note, SavedHint, useSaveSettings } from './kit';

const weatherCache = new Map<string, WeatherSnap>();

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

async function currentWeather(cityId: string | null): Promise<WeatherSnap | undefined> {
  const city = getCity(cityId);
  if (!city) return undefined;
  const key = `${city.id}:${new Date().toISOString().slice(0, 13)}`;
  const hit = weatherCache.get(key);
  if (hit) return hit;
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code`);
  if (!res.ok) return undefined;
  const j = (await res.json()) as { current?: { temperature_2m: number; weather_code: number } };
  if (!j.current) return undefined;
  const w = weatherFromCode(j.current.weather_code, j.current.temperature_2m);
  weatherCache.set(key, w);
  return w;
}

function Source({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="card" style={{ padding: '6px 16px', marginBottom: 10 }}>
      <IconRow icon={icon}>{children}</IconRow>
    </div>
  );
}

function Preview({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--paper)', borderRadius: 12, padding: 10, marginBottom: 10 }}>{children}</div>;
}

function WeatherPreview({ cityId }: { cityId: string | null }) {
  const [w, setW] = useState<WeatherSnap | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    currentWeather(cityId)
      .then((x) => live && setW(x ?? null))
      .catch(() => live && setW(null));
    return () => {
      live = false;
    };
  }, [cityId]);
  const city = getCity(cityId);
  return (
    <Preview>
      <span className="tiny soft">
        {w === undefined ? 'melihat langit…' : w ? `sekarang di ${city?.name ?? 'kotamu'}: ${w.label}, ${Math.round(w.tempC)}°C` : 'cuaca belum bisa diambil sekarang. nanti dicoba lagi saat kamu Drop.'}
      </span>
    </Preview>
  );
}

function CityGuess({ me }: { me: Me }) {
  const { setMe } = useSession();
  const [busy, setBusy] = useState(false);
  const [guess, setGuess] = useState<City | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = () => {
    setMsg(null);
    setGuess(null);
    if (!navigator.geolocation) {
      setMsg('Peramban ini tidak bisa menebak lokasi. Pilih kotamu sendiri di profil.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Koordinat berhenti di sini: hanya nama kota terdekat yang dipakai.
        setGuess(nearestCity(pos.coords.latitude, pos.coords.longitude));
        setBusy(false);
      },
      (e) => {
        setMsg(e.code === e.PERMISSION_DENIED ? 'Izin lokasi belum diberikan. Tidak apa-apa, kamu tetap bisa memilih kota sendiri di profil.' : 'Lokasi belum bisa dibaca sekarang. Coba lagi sebentar lagi.');
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  };

  const use = async (city: City) => {
    setBusy(true);
    try {
      setMe(await api.patch<Me>('/me', { cityId: city.id, tz: city.tz }));
      setMsg(`Kotamu sekarang ${city.name}.`);
      setGuess(null);
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="col" style={{ gap: 8, marginBottom: 10 }}>
      {guess ? (
        <Preview>
          {guess.id === me.user.cityId ? (
            <span className="tiny soft">Sepertinya kamu masih di {guess.name}. Tidak ada yang perlu diubah.</span>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              <span className="small">Sepertinya kamu di {guess.name}. Pakai sebagai kotamu?</span>
              <button className="btn soft sm" onClick={() => void use(guess)} disabled={busy}>
                {busy ? 'menyimpan…' : `ya, pakai ${guess.name}`}
              </button>
            </div>
          )}
        </Preview>
      ) : null}
      <button className="btn ghost sm" onClick={run} disabled={busy && !guess}>
        {busy && !guess ? 'menebak…' : 'tebak kotaku sekarang'}
      </button>
      {msg ? <span className="tiny soft">{msg}</span> : null}
    </div>
  );
}

export default function Jejak() {
  const me = useMe();
  const { save, saving, error, savedAt } = useSaveSettings();
  const s = me.user.settings;
  const city = getCity(me.user.cityId);

  return (
    <main className="screen">
      <Header title="jejak otomatis" backTo="/aku" right={<SavedHint saving={saving} error={null} savedAt={savedAt} />} />
      <p className="small soft" style={{ margin: '0 0 16px' }}>
        Hal-hal kecil yang bisa ikut tercatat tanpa kamu ketik. Semuanya mati secara bawaan, dihitung di perangkatmu, dan ikut terenkripsi bersama Drop.
      </p>
      {error ? (
        <Note color="peach" style={{ marginBottom: 12 }}>
          {error}
        </Note>
      ) : null}

      <Source icon="awan">
        <Toggle
          label="Cuaca"
          hint={`Diambil dari Open-Meteo memakai titik tengah kota ${city?.name ?? 'pilihanmu'}, bukan lokasi perangkatmu. Yang dikirim ke Open-Meteo hanya koordinat kota itu.`}
          value={s.autoWeather}
          onChange={(v) => void save({ autoWeather: v })}
        />
        {s.autoWeather ? <WeatherPreview cityId={me.user.cityId} /> : null}
      </Source>

      <Source icon="peta">
        <Toggle
          label="Kota"
          hint="Menebak kota terdekat di perangkat ini, hanya saat kamu menekan tombol. Koordinat tidak pernah meninggalkan perangkat; yang tersimpan cuma nama kota."
          value={s.autoCity}
          onChange={(v) => void save({ autoCity: v })}
        />
        {s.autoCity ? <CityGuess me={me} /> : null}
      </Source>

      <Source icon="sepeda">
        <Toggle label="Langkah" hint="Belum tersedia di versi web. Kalau dinyalakan, dipakai oleh aplikasi di HP: hanya jumlahnya yang ikut ke Drop otomatis." value={s.autoSteps} onChange={(v) => void save({ autoSteps: v })} />
      </Source>

      <Source icon="gitar">
        <Toggle
          label="Lagu teratas hari ini"
          hint="Lagu yang paling sering kamu putar hari ini, lewat sambungan Spotify. Sambungannya sedang kami siapkan; pilihanmu disimpan dulu dan baru dipakai setelah kamu menyambungkan akun sendiri."
          value={s.autoTopSong}
          onChange={(v) => void save({ autoTopSong: v })}
        />
      </Source>

      <Source icon="kamera">
        <Toggle
          label="Saran dari galeri"
          hint="Belum tersedia di versi web: peramban tidak bisa membaca galeri. Kalau dinyalakan, aplikasi di HP menyarankan foto hari ini saat Drop."
          value={s.gallerySuggestions}
          onChange={(v) => void save({ gallerySuggestions: v })}
        />
      </Source>

      <Note color="blue" icon="ui-lokasi" style={{ marginTop: 16 }}>
        {COPY.privacy.location}
      </Note>
    </main>
  );
}
