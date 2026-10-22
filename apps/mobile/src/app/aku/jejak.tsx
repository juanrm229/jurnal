import { COPY, type City, getCity, type Me, nearestCity, type WeatherSnap } from '@sehari/core';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { errMsg, Note, SavedHint, useSaveSettings } from '@/features/account/kit';
import { api } from '@/lib/api';
import { currentWeather, stepsToday } from '@/lib/auto';
import { useMe } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Gap, Header, Row, Screen, Section, Toggle, Txt } from '@/ui/kit';
import { RADIUS, SPACE, useTheme } from '@/ui/theme';

const isWeb = Platform.OS === 'web';

function Source({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <Card style={{ paddingVertical: SPACE.sm, marginBottom: SPACE.sm }}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={{ paddingTop: 10 }}>
          <Doodle id={icon} size={28} />
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Row>
    </Card>
  );
}

function Preview({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={{ backgroundColor: c.paper, borderRadius: 12, padding: 10, marginBottom: 8 }}>{children}</View>;
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
      <Txt v="tiny" soft>
        {w === undefined ? 'melihat langit…' : w ? `sekarang di ${city?.name ?? 'kotamu'}: ${w.label}, ${Math.round(w.tempC)}°C` : 'cuaca belum bisa diambil sekarang. nanti dicoba lagi saat kamu Drop.'}
      </Txt>
    </Preview>
  );
}

function StepsPreview() {
  const [n, setN] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    stepsToday()
      .then((x) => setN(x ?? null))
      .catch(() => setN(null));
  }, []);
  return (
    <Preview>
      <Txt v="tiny" soft>
        {n === undefined ? 'menghitung langkah…' : n === null ? 'sensor langkah belum tersedia atau izinnya belum diberikan.' : `${n.toLocaleString('id-ID')} langkah sejak pagi.`}
      </Txt>
    </Preview>
  );
}

function GalleryPreview() {
  const { c } = useTheme();
  const [state, setState] = useState<'loading' | 'denied' | 'ready' | 'error'>('loading');
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
        if (!perm.granted) return setState('denied');
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const page = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', createdAfter: start, sortBy: [['creationTime', false]], first: 12 });
        setAssets(page.assets);
        setState('ready');
      } catch {
        setState('error');
      }
    })();
  }, []);
  if (state === 'loading') return <Preview><Txt v="tiny" soft>membuka galeri…</Txt></Preview>;
  if (state === 'denied') return <Preview><Txt v="tiny" soft>Izin galeri belum diberikan. Kamu bisa mengizinkannya dari pengaturan HP kapan saja.</Txt></Preview>;
  if (state === 'error') return <Preview><Txt v="tiny" soft>Galeri belum bisa dibuka sekarang.</Txt></Preview>;
  if (!assets.length) return <Preview><Txt v="tiny" soft>Belum ada foto hari ini. Nanti, foto yang kamu ambil hari ini muncul di sini.</Txt></Preview>;
  return (
    <View style={{ marginBottom: 8 }}>
      <Txt v="tiny" soft style={{ marginBottom: 6 }}>
        foto hari ini (hanya terlihat olehmu):
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {assets.map((a) => (
          <Image key={a.id} source={{ uri: a.uri }} style={{ width: 72, height: 72, borderRadius: RADIUS.sm, backgroundColor: c.fog }} contentFit="cover" />
        ))}
      </ScrollView>
    </View>
  );
}

function CityGuess({ me }: { me: Me }) {
  const { setMe } = useSession();
  const [busy, setBusy] = useState(false);
  const [guess, setGuess] = useState<City | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    setGuess(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setMsg('Izin lokasi belum diberikan. Tidak apa-apa, kamu tetap bisa memilih kota sendiri di profil.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      // Koordinat berhenti di sini: hanya nama kota terdekat yang dipakai.
      setGuess(nearestCity(pos.coords.latitude, pos.coords.longitude));
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setBusy(false);
    }
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
    <View style={{ gap: 8, marginBottom: 8 }}>
      {guess ? (
        guess.id === me.user.cityId ? (
          <Preview>
            <Txt v="tiny" soft>
              Sepertinya kamu masih di {guess.name}. Tidak ada yang perlu diubah.
            </Txt>
          </Preview>
        ) : (
          <Preview>
            <Txt v="small">Sepertinya kamu di {guess.name}. Pakai sebagai kotamu?</Txt>
            <Gap h={8} />
            <Button kind="soft" title={`ya, pakai ${guess.name}`} onPress={() => void use(guess)} loading={busy} testID="city-guess-use" />
          </Preview>
        )
      ) : null}
      <Button kind="ghost" title="tebak kotaku sekarang" icon="ui-lokasi" onPress={() => void run()} loading={busy && !guess} testID="city-guess" />
      {msg ? (
        <Txt v="tiny" soft>
          {msg}
        </Txt>
      ) : null}
    </View>
  );
}

export default function AutoTrail() {
  const me = useMe();
  const { save, saving, error, savedAt } = useSaveSettings();
  const s = me.user.settings;
  const city = getCity(me.user.cityId);

  return (
    <Screen header={<Header title="jejak otomatis" right={<SavedHint saving={saving} error={null} savedAt={savedAt} />} />}>
      <Txt v="small" soft>
        Hal-hal kecil yang bisa ikut tercatat tanpa kamu ketik. Semuanya mati secara bawaan, dihitung di perangkatmu, dan ikut terenkripsi bersama Drop.
      </Txt>
      {error ? (
        <>
          <Gap h={SPACE.sm} />
          <Note color="peach">{error}</Note>
        </>
      ) : null}
      <Gap />

      <Source icon="awan">
        <Toggle
          label="Cuaca"
          hint={`Diambil dari Open-Meteo memakai titik tengah kota ${city?.name ?? 'pilihanmu'}, bukan lokasi HP-mu. Yang dikirim ke Open-Meteo hanya koordinat kota itu.`}
          value={s.autoWeather}
          onChange={(v) => void save({ autoWeather: v })}
          testID="toggle-autoWeather"
        />
        {s.autoWeather ? <WeatherPreview cityId={me.user.cityId} /> : null}
      </Source>

      <Source icon="peta">
        <Toggle
          label="Kota"
          hint="Menebak kota terdekat di perangkat ini, hanya saat kamu menekan tombol. Koordinat tidak pernah meninggalkan HP; yang tersimpan cuma nama kota."
          value={s.autoCity}
          onChange={(v) => void save({ autoCity: v })}
          testID="toggle-autoCity"
        />
        {s.autoCity ? <CityGuess me={me} /> : null}
      </Source>

      <Source icon="sepeda">
        <Toggle
          label="Langkah"
          hint={isWeb ? 'Belum tersedia di versi web. Nyalakan dari aplikasi di HP.' : 'Dari sensor langkah HP. Hanya jumlahnya yang ikut ke Drop otomatis.'}
          value={s.autoSteps}
          onChange={(v) => void save({ autoSteps: v })}
          testID="toggle-autoSteps"
        />
        {s.autoSteps && !isWeb ? <StepsPreview /> : null}
      </Source>

      <Source icon="gitar">
        <Toggle
          label="Lagu teratas hari ini"
          hint="Lagu yang paling sering kamu putar hari ini, lewat sambungan Spotify. Sambungannya sedang kami siapkan; pilihanmu disimpan dulu dan baru dipakai setelah kamu menyambungkan akun sendiri."
          value={s.autoTopSong}
          onChange={(v) => void save({ autoTopSong: v })}
          testID="toggle-autoTopSong"
        />
      </Source>

      <Source icon="kamera">
        <Toggle
          label="Saran dari galeri"
          hint={
            isWeb
              ? 'Belum tersedia di versi web: browser tidak bisa membaca galeri.'
              : 'Foto yang kamu ambil hari ini muncul sebagai saran saat Drop. Tidak ada yang diunggah sampai kamu memilihnya sendiri.'
          }
          value={s.gallerySuggestions}
          onChange={(v) => void save({ gallerySuggestions: v })}
          testID="toggle-gallerySuggestions"
        />
        {s.gallerySuggestions && !isWeb ? <GalleryPreview /> : null}
      </Source>

      <Gap h={SPACE.sm} />
      <Note color="blue" icon="ui-lokasi">
        {COPY.privacy.location}
      </Note>
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
