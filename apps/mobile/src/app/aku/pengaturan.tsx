import { COPY, getCity, sunsetUtc, type UserSettings } from '@sehari/core';
import { View } from 'react-native';
import { Choice, HourPicker, Note, SavedHint, useSaveSettings } from '@/features/account/kit';
import { useMe, useToday } from '@/lib/data';
import { Card, Gap, Header, Screen, Section, Toggle, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

const THEMES: { value: UserSettings['theme']; label: string }[] = [
  { value: 'system', label: 'ikut sistem' },
  { value: 'light', label: 'kertas terang' },
  { value: 'dark', label: 'malam' },
];

function sunsetLabel(day: string, cityId: string | null, tz: string): string | null {
  const city = getCity(cityId);
  if (!city) return null;
  const at = sunsetUtc(day, city.lat, city.lon);
  if (!at) return null;
  const time = new Intl.DateTimeFormat('id-ID', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
  return `Senja hari ini di ${city.name} sekitar pukul ${time.replace(':', '.')}.`;
}

export default function Reminders() {
  const me = useMe();
  const today = useToday();
  const { save, saving, error, savedAt } = useSaveSettings();
  const s = me.user.settings;
  const sunset = sunsetLabel(today, me.user.cityId, me.user.tz);
  const set = <K extends keyof UserSettings>(k: K, v: UserSettings[K]) => void save({ [k]: v } as Partial<UserSettings>);

  return (
    <Screen header={<Header title="pengingat & notifikasi" right={<SavedHint saving={saving} error={null} savedAt={savedAt} />} />}>
      {error ? (
        <>
          <Note color="peach">{error}</Note>
          <Gap h={SPACE.sm} />
        </>
      ) : null}
      <Txt v="small" soft>
        Pengingat yang lembut, sekali sehari. Tidak ada pesan yang membuat merasa bersalah, dan semuanya bisa dimatikan.
      </Txt>

      <Section title="pengingat menyegel">
        <Card style={{ paddingVertical: SPACE.sm }}>
          <Toggle
            label="Segel Saat Senja"
            hint={sunset ?? 'Pengingat datang saat matahari terbenam di kotamu.'}
            value={s.sunsetSeal}
            onChange={(v) => set('sunsetSeal', v)}
            testID="toggle-sunsetSeal"
          />
        </Card>
        {!s.sunsetSeal ? (
          <View style={{ marginTop: SPACE.md, gap: SPACE.sm }}>
            <Txt v="small">Ingatkan aku setiap hari pukul</Txt>
            <HourPicker value={s.sealHour} onChange={(h) => set('sealHour', h)} testID="seal-hour" />
            <Txt v="tiny" soft>
              Hari baru dimulai pukul 04.00, jadi menyegel lewat tengah malam tetap masuk hari kemarin.
            </Txt>
          </View>
        ) : null}
      </Section>

      <Section title="pagi">
        <Card style={{ paddingVertical: SPACE.sm }}>
          <Toggle label="Kartu pagi" hint={COPY.notifications.morningCard} value={s.morningCard} onChange={(v) => set('morningCard', v)} testID="toggle-morningCard" />
        </Card>
      </Section>

      <Section title="kabar dari lingkaran">
        <Card style={{ paddingVertical: SPACE.sm }}>
          <Toggle
            label="Saat orang yang kamu pilih menyegel"
            hint={`Contohnya: “${COPY.notifications.partnerSealed('Naya')}” Tidak ada jam, tidak ada “terakhir dilihat”.`}
            value={s.notifyPartnerSealed}
            onChange={(v) => set('notifyPartnerSealed', v)}
            testID="toggle-notifyPartnerSealed"
          />
          <Toggle label="Wrap sudah jadi" hint={COPY.notifications.weeklyWrapReady} value={s.notifyWraps} onChange={(v) => set('notifyWraps', v)} testID="toggle-notifyWraps" />
          <Toggle label="Surat yang tiba" hint={COPY.notifications.lostLetterArrived} value={s.notifyLetters} onChange={(v) => set('notifyLetters', v)} testID="toggle-notifyLetters" />
        </Card>
      </Section>

      <Section title="tampilan">
        <Choice options={THEMES} value={s.theme} onChange={(v) => set('theme', v)} testID="theme" />
        <Txt v="tiny" soft style={{ marginTop: 8 }}>
          Mode malam memakai latar hitam pekat supaya mata tetap tenang sebelum tidur.
        </Txt>
      </Section>
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
