import { CIRCLE_KIND_LABEL, COPY } from '@sehari/core';

const WRAP_TITLE: Record<string, string> = { week: 'Minggu Kita', month: 'Bulan Kita', year: 'Tahun Kita' };
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, View } from 'react-native';
import { useState } from 'react';
import { useCircles, useMe } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Flame } from '@/ui/Flame';
import { Button, Card, Empty, Gap, Growing, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

export default function Circles() {
  const me = useMe();
  const { c } = useTheme();
  const { circles, isLoading, refetch } = useCircles();
  const [refreshing, setRefreshing] = useState(false);
  const live = circles.filter((x) => x.status === 'active');
  const past = circles.filter((x) => x.status !== 'active');
  // Dibuka dari kabar "Minggu/Bulan Kita sudah jadi": ketukan kartu langsung membuka wrap-nya.
  const params = useLocalSearchParams<{ wrap?: string; periode?: string }>();
  const pickWrap = !!params.wrap && !!WRAP_TITLE[params.wrap] && !!params.periode;
  const open = (id: string) => router.push(pickWrap ? `/wrap/${id}/${params.wrap}/${params.periode}` : `/l/${id}`);
  const limitReached = live.filter((x) => x.kind !== 'moment').length >= me.limits.maxCircles;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor={c.ink} />}>
      <Gap h={SPACE.md} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="display" ink>
          lingkaran
        </Txt>
        <Button kind="soft" title="baru" icon="ui-tambah" onPress={() => router.push(limitReached ? '/plus' : '/l/baru')} style={{ width: 'auto', minHeight: 40 }} testID="new-circle" />
      </Row>
      <Txt v="small" soft>
        Kecil, dipilih, dan intim. Paling banyak delapan orang.
      </Txt>
      {pickWrap && live.length ? (
        <>
          <Gap h={SPACE.sm} />
          <Card style={{ backgroundColor: c.sticky.yellow }} testID="wrap-pick">
            <Row>
              <Doodle id={params.wrap === 'week' ? 'amplop' : params.wrap === 'month' ? 'pena' : 'buku'} size={28} />
              <Txt v="small" style={{ flex: 1 }}>
                {WRAP_TITLE[params.wrap!]} sudah jadi. Pilih lingkaran yang mau dibuka.
              </Txt>
            </Row>
          </Card>
        </>
      ) : null}
      <Gap />
      {isLoading ? (
        <Growing />
      ) : circles.length === 0 ? (
        <Empty doodle="ui-lingkaran" title="Belum ada lingkaran" body={COPY.onboarding.invite.body} action={<Button title="buat lingkaran" onPress={() => router.push('/l/baru')} />} />
      ) : (
        <View style={{ gap: SPACE.sm }}>
          {live.map((x) => (
            <Card key={x.id} onPress={() => open(x.id)} testID={`circle-${x.id}`}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ flex: 1 }}>
                  <Doodle id={x.doodle} size={34} />
                  <View style={{ flex: 1 }}>
                    <Txt v="h2" ink numberOfLines={1}>
                      {x.name}
                    </Txt>
                    <Txt v="tiny" soft>
                      {CIRCLE_KIND_LABEL[x.kind]} · {x.active.length} orang
                    </Txt>
                  </View>
                </Row>
                {x.kind !== 'moment' ? <Flame level={x.streak.flame} days={x.streak.current} /> : <Doodle id="kado" size={26} />}
              </Row>
              <Gap h={SPACE.sm} />
              <Row gap={6}>
                {x.active.map((m) => (
                  <Avatar key={m.userId} doodle={m.doodle} size={28} sealed={x.todaySealed[m.userId]} />
                ))}
              </Row>
              {x.rotationNeeded ? (
                <Txt v="tiny" ink soft style={{ marginTop: 6 }}>
                  memperbarui kunci lingkaran…
                </Txt>
              ) : null}
            </Card>
          ))}
        </View>
      )}
      {past.length ? (
        <Section title="arsip">
          <View style={{ gap: SPACE.sm }}>
            {past.map((x) => (
              <Card key={x.id} onPress={() => open(x.id)} tint={c.paper}>
                <Row>
                  <Doodle id={x.status === 'memorial' ? 'lilin' : x.status === 'split' ? 'daun-kering' : 'kado'} size={28} />
                  <View style={{ flex: 1 }}>
                    <Txt ink>{x.name}</Txt>
                    <Txt v="tiny" soft>
                      {x.status === 'memorial' ? 'kapsul kenangan' : x.status === 'split' ? 'arsip dibekukan' : 'acara selesai'}
                    </Txt>
                  </View>
                </Row>
              </Card>
            ))}
          </View>
        </Section>
      ) : null}
      <Gap h={SPACE.lg} />
      <Card onPress={() => router.push('/l/baru?kind=moment')} tint={c.sticky.green}>
        <Row>
          <Doodle id="kado" size={34} />
          <View style={{ flex: 1 }}>
            <Txt v="h2" ink>
              Kapsul Momen
            </Txt>
            <Txt v="tiny">Nikahan, reuni, wisuda, trip: semua tamu Drop, lalu jadi Wrap acara.</Txt>
          </View>
        </Row>
      </Card>
    </Screen>
  );
}
