import { COPY, daysInYear } from '@sehari/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useCircles, useLetters, useMe, useMyDays, useToday } from '@/lib/data';
import { YearGarden } from '@/features/YearGarden';
import { Doodle } from '@/ui/Doodle';
import { Card, Gap, IconButton, ListItem, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

/** Kenangan: taman tahunan milikmu, surat, rak perpustakaan, dan Wrap. */
export default function Memories() {
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const days = useMyDays(`${year}-01-01`, `${year}-12-31`);
  const { circles } = useCircles();
  const letters = useLetters('inbox');
  const sealed = new Set((days.data ?? []).filter((d) => d.sealedAt).map((d) => d.day));
  const total = daysInYear(year);
  const left = Math.max(0, total - (year === Number(today.slice(0, 4)) ? Number(new Date(`${today}T00:00:00Z`).getTime() - new Date(`${year}-01-01T00:00:00Z`).getTime()) / 86_400_000 + 1 : total));
  const firstYear = Number(me.user.createdAt.slice(0, 4));

  return (
    <Screen>
      <Gap h={SPACE.md} />
      <Txt v="display" ink>
        kenangan
      </Txt>
      <Gap />
      <Card style={{ paddingVertical: SPACE.lg }} testID="year-garden">
        <Row style={{ justifyContent: 'space-between', marginBottom: SPACE.md }}>
          <Row gap={0}>
            {year > firstYear ? <IconButton icon="ui-kembali" label="tahun sebelumnya" onPress={() => setYear(year - 1)} size={18} /> : null}
            <Txt v="title" ink>
              {year}
            </Txt>
            {year < Number(today.slice(0, 4)) ? <IconButton icon="ui-panah-kanan" label="tahun berikutnya" onPress={() => setYear(year + 1)} size={18} /> : null}
          </Row>
          <Txt v="small" ink>
            {sealed.size} <Txt v="small" ink soft>{left > 0 ? `· ${Math.round(left)} hari untuk tumbuh` : 'hari tumbuh'}</Txt>
          </Txt>
        </Row>
        <YearGarden year={year} sealed={sealed} seedOwner={me.user.id} today={today} onPressDay={(d) => router.push(`/hari/${d}`)} />
        <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
          watch your year grow — satu tanaman untuk setiap hari yang disegel
        </Txt>
      </Card>

      <Section title="surat & kapsul waktu">
        <Card onPress={() => router.push('/surat')} testID="letters">
          <Row>
            <Doodle id="surat-botol" size={34} />
            <View style={{ flex: 1 }}>
              <Txt ink>Kotak surat</Txt>
              <Txt v="tiny" soft>
                {letters.data?.length ? `${letters.data.length} surat sudah sampai` : 'Surat Tersesat, Surat Wasiat Kecil, kapsul waktu'}
              </Txt>
            </View>
          </Row>
        </Card>
      </Section>

      <Section title="cerita per lingkaran">
        {circles.length === 0 ? (
          <Txt v="small" soft>
            {COPY.empty.memories}
          </Txt>
        ) : (
          circles.map((x) => (
            <ListItem key={x.id} icon={x.doodle} title={x.name} subtitle={`${x.streak.togetherDays} hari bersama`} onPress={() => router.push(`/l/${x.id}`)} />
          ))
        )}
      </Section>

      <Section title="rak">
        <ListItem icon="rak-buku" title="Rak Perpustakaan" subtitle="setiap jilid Tahun Kita, bisa dicetak" onPress={() => router.push('/rak')} testID="shelf" />
        <ListItem icon="peta" title="Kapsul Indonesia & Musim Bersama" subtitle="peta mood anonim, Ramadan, mudik, 17-an" onPress={() => router.push('/musim')} />
        <ListItem icon="buku" title="Jurnal pribadi" subtitle="hanya Drop “hanya aku”" onPress={() => router.push(`/hari/${today}`)} />
      </Section>
      <View style={{ height: 40, backgroundColor: c.paper }} />
    </Screen>
  );
}
