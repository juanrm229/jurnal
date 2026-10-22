import { getCity, type Me, zoneLabel } from '@sehari/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { errMsg, Note } from '@/features/account/kit';
import { api } from '@/lib/api';
import { useMe } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Avatar } from '@/ui/Avatar';
import { CityPicker } from '@/ui/CityPicker';
import { Doodle } from '@/ui/Doodle';
import { Button, Field, Gap, Header, Pill, Row, Screen, Section, Toggle, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const AVATARS = [
  'tunas', 'bunga-matahari', 'kaktus', 'jamur', 'siput', 'lebah', 'kucing', 'apel', 'labu', 'tulip', 'kupu-kupu', 'burung',
  'kelinci', 'landak', 'katak', 'bebek', 'ikan', 'kepik', 'capung', 'teratai', 'anggrek', 'semanggi', 'cangkir', 'gitar',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function EditProfile() {
  const me = useMe();
  const { setMe } = useSession();
  const { c } = useTheme();
  const u = me.user;
  const [penName, setPenName] = useState(u.penName ?? '');
  const [doodle, setDoodle] = useState(u.doodle);
  const [cityId, setCityId] = useState<string | null>(u.cityId);
  const [tz, setTz] = useState(u.tz);
  const [homeSame, setHomeSame] = useState(!u.homeCityId || u.homeCityId === u.cityId);
  const [homeCityId, setHomeCityId] = useState<string | null>(u.homeCityId);
  const [bMonth, setBMonth] = useState<number | null>(u.birthday ? Number(u.birthday.slice(0, 2)) : null);
  const [bDay, setBDay] = useState(u.birthday ? String(Number(u.birthday.slice(3, 5))) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dayNum = Number(bDay);
  const birthdayValid = bMonth === null ? bDay === '' : dayNum >= 1 && dayNum <= DAYS_IN[bMonth - 1]!;
  const birthday = bMonth !== null && birthdayValid ? `${String(bMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : null;
  const valid = penName.trim().length > 0 && !!cityId && birthdayValid;
  const city = getCity(cityId);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const updated = await api.patch<Me>('/me', {
        penName: penName.trim(),
        doodle,
        cityId,
        tz,
        homeCityId: homeSame ? cityId : (homeCityId ?? cityId),
        birthday,
      });
      setMe(updated);
      router.back();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<Header title="profil" />} footer={<Button title="simpan" onPress={save} loading={busy} disabled={!valid} testID="profile-edit-save" />}>
      <View style={{ alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm }}>
        <Avatar doodle={doodle} size={84} sealed />
        <Txt v="hand" center>
          {penName.trim() || 'tanpa nama'}
        </Txt>
      </View>

      <Section title="nama pena">
        <Field value={penName} onChangeText={setPenName} placeholder="misalnya: Naya, atau Kucing Oranye" maxLength={40} testID="profile-pen-name" />
        <Txt v="tiny" soft style={{ marginTop: 6 }}>
          Nama yang muncul di kitab lingkaranmu. Julukan tokoh diberikan teman-temanmu di pengaturan lingkaran.
        </Txt>
      </Section>

      <Section title="doodle-mu">
        <Row style={{ flexWrap: 'wrap', gap: 10 }}>
          {AVATARS.map((a) => (
            <Pressable
              key={a}
              onPress={() => setDoodle(a)}
              accessibilityLabel={a}
              accessibilityState={{ selected: a === doodle }}
              testID={`avatar-${a}`}
              style={{ padding: 8, borderRadius: 16, backgroundColor: a === doodle ? c.pill : c.card, borderWidth: 1, borderColor: a === doodle ? c.ink : c.cardEdge }}>
              <Doodle id={a} size={32} />
            </Pressable>
          ))}
        </Row>
      </Section>

      <Section title="kota sekarang">
        <Txt v="small" soft style={{ marginBottom: 8 }}>
          Untuk zona waktu dan jam senja. Hanya nama kota, tidak pernah lokasi persis.
        </Txt>
        <CityPicker
          value={cityId}
          onChange={(x) => {
            setCityId(x.id);
            setTz(x.tz);
          }}
        />
        {city && tz !== u.tz ? (
          <Txt v="tiny" soft style={{ marginTop: 6 }}>
            zona waktu ikut berubah: {zoneLabel(tz)}
          </Txt>
        ) : null}
      </Section>

      <Section title="kota asal">
        <Txt v="small" soft style={{ marginBottom: 4 }}>
          Kampung halaman, atau kota yang terasa seperti rumah. Saat kamu menyimpan hari dari kota lain, mungkin ada tiket kecil yang mampir ke Lemari Benda.
        </Txt>
        <Toggle label="sama dengan kota sekarang" value={homeSame} onChange={setHomeSame} testID="home-same" />
        {!homeSame ? <CityPicker label="kota asal" value={homeCityId} onChange={(x) => setHomeCityId(x.id)} /> : null}
      </Section>

      <Section
        title="ulang tahun (opsional)"
        right={
          bMonth !== null ? (
            <Pill
              onPress={() => {
                setBMonth(null);
                setBDay('');
              }}>
              kosongkan
            </Pill>
          ) : undefined
        }>
        <Txt v="small" soft style={{ marginBottom: 8 }}>
          Hanya tanggal dan bulan, tanpa tahun. Di hari itu lingkaranmu bisa menarik kartu langka untukmu.
        </Txt>
        <Row style={{ flexWrap: 'wrap' }} gap={6}>
          {MONTHS.map((m, i) => (
            <Pill key={m} active={bMonth === i + 1} onPress={() => setBMonth(i + 1)} testID={`bmonth-${i + 1}`}>
              {m}
            </Pill>
          ))}
        </Row>
        {bMonth !== null ? (
          <View style={{ marginTop: SPACE.sm, width: 140 }}>
            <Field label="tanggal" value={bDay} onChangeText={(v) => setBDay(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="1–31" testID="bday" />
          </View>
        ) : null}
        {!birthdayValid ? (
          <Txt v="tiny" style={{ marginTop: 6, color: c.danger }}>
            Tanggalnya belum pas untuk bulan itu.
          </Txt>
        ) : null}
        <Gap h={SPACE.sm} />
        <Note color="blue">Tanggal ini terlihat oleh orang-orang di lingkaranmu, supaya mereka bisa ikut merayakan. Tidak pernah ditampilkan ke luar.</Note>
      </Section>

      {err ? (
        <Txt v="small" center style={{ marginTop: 12, color: c.danger }}>
          {err}
        </Txt>
      ) : null}
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
