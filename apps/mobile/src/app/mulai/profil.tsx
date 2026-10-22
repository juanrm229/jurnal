import { COPY, type Me, MIN_AGE } from '@sehari/core';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { CityPicker } from '@/ui/CityPicker';
import { Doodle } from '@/ui/Doodle';
import { Button, Field, Gap, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const AVATARS = ['tunas', 'bunga-matahari', 'kaktus', 'jamur', 'siput', 'lebah', 'kucing', 'apel', 'labu', 'tulip', 'kupu-kupu', 'burung'];

export default function Profile() {
  const { me, setMe } = useSession();
  const { c } = useTheme();
  const t = COPY.onboarding;
  const [penName, setPenName] = useState(me?.user.penName ?? '');
  const [birthYear, setBirthYear] = useState(me?.user.birthYear ? String(me.user.birthYear) : '');
  const [cityId, setCityId] = useState<string | null>(me?.user.cityId ?? null);
  const [tz, setTz] = useState(me?.user.tz ?? Localization.getCalendars()[0]?.timeZone ?? 'Asia/Jakarta');
  const [doodle, setDoodle] = useState(me?.user.doodle ?? 'tunas');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const year = Number(birthYear);
  const tooYoung = birthYear.length === 4 && new Date().getFullYear() - year < MIN_AGE;
  const valid = penName.trim().length > 0 && birthYear.length === 4 && !tooYoung && !!cityId;

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const updated = await api.patch<Me>('/me', { penName: penName.trim(), birthYear: year, cityId, homeCityId: me?.user.homeCityId ?? cityId, tz, doodle });
      setMe(updated);
      router.replace('/');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Lanjut" onPress={save} loading={busy} disabled={!valid} testID="profile-save" />}>
      <Gap h={SPACE.xl} />
      <Txt v="title" ink center>
        {t.penName.title}
      </Txt>
      <Gap h={SPACE.sm} />
      <Txt soft center>
        {t.penName.body}
      </Txt>
      <Gap h={SPACE.lg} />
      <Field value={penName} onChangeText={setPenName} placeholder={t.penName.placeholder} maxLength={40} testID="pen-name" />
      <Txt v="tiny" soft style={{ marginTop: 6 }}>
        {t.penName.note}
      </Txt>

      <Section title="doodle-mu">
        <Row style={{ flexWrap: 'wrap', gap: 10 }}>
          {AVATARS.map((a) => (
            <Pressable key={a} onPress={() => setDoodle(a)} accessibilityLabel={a} style={{ padding: 8, borderRadius: 16, backgroundColor: a === doodle ? c.pill : c.card }}>
              <Doodle id={a} size={34} />
            </Pressable>
          ))}
        </Row>
      </Section>

      <Section title="tahun lahir">
        <Field value={birthYear} onChangeText={(v) => setBirthYear(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="1999" testID="birth-year" />
        {tooYoung ? (
          <Txt v="small" style={{ marginTop: 8 }}>
            {COPY.onboarding.ageGate.declined}
          </Txt>
        ) : (
          <Txt v="tiny" soft style={{ marginTop: 6 }}>
            Hanya untuk memastikan usia 18+. Tidak ditampilkan ke siapa pun.
          </Txt>
        )}
      </Section>

      <Section title={t.city.title}>
        <Txt v="small" soft style={{ marginBottom: 8 }}>
          {t.city.body}
        </Txt>
        <CityPicker
          value={cityId}
          onChange={(city) => {
            setCityId(city.id);
            setTz(city.tz);
          }}
        />
        <Txt v="tiny" soft style={{ marginTop: 8 }}>
          {t.city.sunsetNote}
        </Txt>
      </Section>
      {err ? (
        <Txt v="small" center style={{ marginTop: 12 }}>
          {err}
        </Txt>
      ) : null}
      <View style={{ height: 40 }} />
    </Screen>
  );
}
