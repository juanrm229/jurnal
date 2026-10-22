import { CIRCLE_KIND_LABEL, COPY, findCard, isoWeek, monthKey, nightQuestionFor, penHolderFor, prevMonth, type SceneWire } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { api } from '@/lib/api';
import { openCircleText, useCircle, useMe, useToday } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Flame } from '@/ui/Flame';
import { Button, Card, Gap, Growing, Header, IconButton, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const FEATURES: { path: string; label: string; doodle: string; hint: string }[] = [
  { path: 'papan', label: 'Papan Tahun', doodle: 'peta', hint: '365 petak, berjalan berdampingan' },
  { path: 'kitab', label: 'Kitab', doodle: 'buku', hint: 'bab, adegan, jilid' },
  { path: 'langit', label: 'Langit', doodle: 'ui-bintang-rasi', hint: 'hari-hari jadi rasi bintang' },
  { path: 'lemari', label: 'Lemari Benda', doodle: 'kunci', hint: 'token kenangan' },
  { path: 'ekspedisi', label: 'Ekspedisi', doodle: 'kompas', hint: 'misi bersama 7 hari' },
  { path: 'kamus', label: 'Kamus & Motif', doodle: 'ui-kata', hint: 'bahasa kalian sendiri' },
  { path: 'puisi', label: 'Puisi Temuan', doodle: 'pena', hint: 'hitamkan kata seminggu' },
  { path: 'dadu', label: 'Dadu Kenangan', doodle: 'dadu', hint: 'sekali seminggu' },
];

export default function CircleHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const circle = useCircle(id);
  const scenes = useQuery({ queryKey: ['scenes', id], queryFn: () => api.get<SceneWire[]>(`/circles/${id}/scenes`), enabled: !!circle });

  if (!circle) return <Screen header={<Header />}><Growing /></Screen>;

  const week = isoWeek(today);
  const holderId = scenes.data?.find((s) => s.week === week)?.penHolderId ?? penHolderFor(circle.active.map((m) => m.userId), week, circle.id);
  const holder = circle.members.find((m) => m.userId === holderId);
  const scene = scenes.data?.find((s) => s.week === week);
  const sharedCard = scene?.cardId ? findCard(scene.cardId)?.card : undefined;
  const sceneTitle = scene?.titleEnc ? openCircleText(circle, scene.titleEnc, '') : '';
  const q = circle.settings.nightQuestion && circle.kind !== 'moment' ? nightQuestionFor(circle.id, today, circle.kind) : null;
  const frozen = circle.status !== 'active';

  return (
    <Screen header={<Header title={circle.name} subtitle={CIRCLE_KIND_LABEL[circle.kind].toLowerCase()} right={<IconButton icon="ui-pengaturan" label="pengaturan" onPress={() => router.push(`/l/${id}/pengaturan`)} testID="circle-settings" />} />}>
      {circle.status === 'memorial' ? (
        <Card tint={c.paper} style={{ alignItems: 'center', gap: 6, borderStyle: 'dashed' }}>
          <Doodle id="lilin" size={40} />
          <Txt center>{COPY.modes.memorial.body}</Txt>
        </Card>
      ) : circle.status === 'split' ? (
        <Card tint={c.paper} style={{ alignItems: 'center', gap: 6 }}>
          <Doodle id="daun-kering" size={40} />
          <Txt center>{COPY.modes.split.done}</Txt>
        </Card>
      ) : null}

      <Card style={{ marginTop: SPACE.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt v="label" ink soft>
              api bersama
            </Txt>
            <Flame level={circle.streak.flame} days={circle.streak.current} size={36} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt v="tiny" soft>
              terpanjang {circle.streak.longest} · {circle.streak.togetherDays} hari bersama
            </Txt>
            {circle.streak.next ? (
              <Txt v="tiny" ink soft>
                {circle.streak.next.remaining} hari lagi ke {circle.streak.next.name}
              </Txt>
            ) : null}
          </View>
        </Row>
        <Gap h={SPACE.md} />
        <Row style={{ flexWrap: 'wrap' }} gap={12}>
          {circle.members
            .filter((m) => m.state !== 'left')
            .map((m) => (
              <View key={m.userId} style={{ alignItems: 'center', width: 64 }}>
                <Avatar doodle={m.doodle} size={44} sealed={circle.todaySealed[m.userId]} dim={m.state === 'remembered'} />
                <Txt v="tiny" ink={m.userId === me.user.id} numberOfLines={1}>
                  {m.userId === me.user.id ? 'kamu' : m.penName}
                </Txt>
                <Txt v="tiny" soft>
                  {m.state === 'remembered' ? 'dikenang' : circle.todaySealed[m.userId] ? 'tersegel' : '·'}
                </Txt>
              </View>
            ))}
        </Row>
      </Card>

      <Gap />
      <Button title="buka hari ini" icon="amplop" onPress={() => router.push(`/l/${id}/hari/${today}`)} testID="open-today" />
      {!frozen && circle.active.length < (circle.kind === 'duo' ? 2 : circle.kind === 'moment' ? 400 : 8) ? (
        <Button kind="ghost" title={circle.kind === 'moment' ? 'QR & tautan untuk tamu' : 'undang'} icon="ui-qr" onPress={() => router.push(`/l/${id}/undang`)} style={{ marginTop: SPACE.sm }} testID="invite" />
      ) : null}

      {circle.kind !== 'moment' ? (
        <Section title="minggu ini">
          <Card onPress={() => router.push(`/l/${id}/kitab`)}>
            <Row>
              <Doodle id="pena" size={30} />
              <View style={{ flex: 1 }}>
                <Txt v="small">
                  Pena minggu ini dipegang <Txt v="small" ink>{holder?.userId === me.user.id ? 'kamu' : (holder?.penName ?? '…')}</Txt>.
                </Txt>
                <Txt v="tiny" soft>
                  Pemegang pena memberi judul adegan dan memilih kartu bersama.
                </Txt>
              </View>
            </Row>
          </Card>
          {sceneTitle ? (
            <Txt v="hand" center style={{ marginTop: SPACE.sm }}>
              Adegan minggu ini: {sceneTitle}
            </Txt>
          ) : null}
          {sharedCard ? (
            <Card
              tint={c.sticky.yellow}
              style={{ marginTop: SPACE.sm }}
              onPress={() => router.push({ pathname: '/drop', params: { prompt: sharedCard.body, cardId: sharedCard.id, kind: sharedCard.kind === 'tantangan' ? 'photo' : 'card', circleId: circle.id } })}>
              <Row style={{ alignItems: 'flex-start' }}>
                <Doodle id={sharedCard.doodle ?? 'kartu'} size={30} />
                <View style={{ flex: 1 }}>
                  <Txt v="label" ink soft>
                    kartu bersama · {sharedCard.title}
                  </Txt>
                  <Txt v="small">{sharedCard.body}</Txt>
                </View>
              </Row>
            </Card>
          ) : null}
          {q ? (
            <Card style={{ marginTop: SPACE.sm }} onPress={() => router.push({ pathname: '/drop', params: { prompt: q.text, questionId: q.id, kind: 'answer', circleId: circle.id } })}>
              <Row>
                <Doodle id="bulan" size={30} />
                <Txt v="small" style={{ flex: 1 }}>
                  {q.text}
                </Txt>
              </Row>
            </Card>
          ) : null}
        </Section>
      ) : null}

      <Section title="cerita kita">
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          <WrapChip label="Minggu Kita" onPress={() => router.push(`/wrap/${id}/week/${week}`)} doodle="amplop" />
          <WrapChip label="Bulan Kita" onPress={() => router.push(`/wrap/${id}/month/${prevMonth(monthKey(today))}`)} doodle="pena" />
          <WrapChip label="Tahun Kita" onPress={() => router.push(`/wrap/${id}/year/${today.slice(0, 4)}`)} doodle="buku" />
          {circle.kind === 'moment' ? <WrapChip label="Wrap Acara" onPress={() => router.push(`/wrap/${id}/moment/${id}`)} doodle="kado" /> : null}
        </Row>
      </Section>

      <Section title="papan & kitab">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
          {FEATURES.filter((f) => circle.kind !== 'moment' || ['langit', 'puisi'].includes(f.path)).map((f) => (
            <Card key={f.path} onPress={() => router.push(`/l/${id}/${f.path}`)} style={{ width: 160, flexGrow: 1, gap: 6 }} testID={`feature-${f.path}`}>
              <Doodle id={f.doodle} size={32} />
              <Txt v="small" ink>
                {f.label}
              </Txt>
              <Txt v="tiny" soft>
                {f.hint}
              </Txt>
            </Card>
          ))}
        </View>
      </Section>

      <Section title="surat">
        <Row gap={8}>
          <Button kind="soft" title="Surat Tersesat" icon="surat-botol" onPress={() => router.push({ pathname: '/surat/tulis', params: { circleId: id, kind: 'lost' } })} style={{ flex: 1 }} />
          <Button kind="soft" title="untuk nanti" icon="jam-pasir" onPress={() => router.push({ pathname: '/surat/tulis', params: { circleId: id, kind: 'future' } })} style={{ flex: 1 }} />
        </Row>
      </Section>
    </Screen>
  );
}

function WrapChip({ label, onPress, doodle }: { label: string; onPress: () => void; doodle: string }) {
  return (
    <Card onPress={onPress} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 }} testID={`wrap-${label}`}>
      <Row gap={6}>
        <Doodle id={doodle} size={20} />
        <Txt v="small" ink>
          {label}
        </Txt>
      </Row>
    </Card>
  );
}
