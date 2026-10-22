/**
 * Layar pertama hanya menjawab tiga hal: apa yang sudah kamu simpan hari ini,
 * siapa yang menjalaninya bersamamu, dan apakah hari ini siap disegel.
 */
import {
  activeSeason,
  COPY,
  dailyCardFor,
  dayName,
  dayOfYear,
  formatDayShort,
  getCity,
  MOODS,
  type MoodCode,
  nightQuestionFor,
  sunsetUtc,
  tzOffsetMinutes,
  zoneLabel,
} from '@sehari/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { type CircleView, nowParts, useCircles, useCreateDrop, useLetters, useMe, useMyDay, useOnThisDay, useOpenDrops, useToday } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { audienceLabel, DropCard } from '@/ui/DropCard';
import { Flame } from '@/ui/Flame';
import { Button, Card, Empty, Gap, Growing, Row, Screen, Section, Txt } from '@/ui/kit';
import { MoodPicker } from '@/ui/Mood';
import { SPACE, useTheme } from '@/ui/theme';
import { DayStrip } from '@/features/DayStrip';

function sealLine(c: CircleView, meId: string): string {
  const others = c.others;
  const sealedOthers = others.filter((m) => c.todaySealed[m.userId]);
  if (c.kind === 'duo' && others[0]) {
    return c.todaySealed[others[0].userId] ? `${others[0].penName} sudah menyegel harinya.` : COPY.seal.waitingPartner(others[0].penName);
  }
  const done = sealedOthers.length + (c.todaySealed[meId] ? 1 : 0);
  return COPY.seal.circleProgress(done, c.active.length);
}

export default function Today() {
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const day = useMyDay(today);
  const { circles, refetch: refetchCircles, isLoading: circlesLoading } = useCircles();
  const drops = useOpenDrops(day.data?.drops);
  const memories = useOnThisDay(today);
  const letters = useLetters('inbox');
  const createDrop = useCreateDrop();
  const [quickMood, setQuickMood] = useState<MoodCode | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const city = getCity(me.user.cityId);
  const sealed = !!day.data?.sealedAt;
  const activeCircles = circles.filter((x) => x.status === 'active' && x.me?.state === 'active');
  const primary = activeCircles[0];
  const card = useMemo(
    () =>
      dailyCardFor({
        userId: me.user.id,
        day: today,
        kind: primary?.kind ?? 'duo',
        ownedDecks: me.ownedDecks,
        rare: { circleCreatedDay: primary?.createdDay, birthdays: primary?.members.map((m) => m.birthday ?? '').filter(Boolean), tzOffsetMin: tzOffsetMinutes(me.user.tz) },
      }),
    [me, today, primary],
  );
  const question = primary && primary.settings.nightQuestion ? nightQuestionFor(primary.id, today, primary.kind) : null;
  const season = activeSeason(today);
  const unopened = (letters.data ?? []).filter((l) => !l.openedAt).length;
  const sunset = city ? sunsetUtc(today, city.lat, city.lon) : null;
  const sunsetLabel = sunset ? new Intl.DateTimeFormat('id-ID', { timeZone: me.user.tz, hour: '2-digit', minute: '2-digit' }).format(sunset) : null;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([day.refetch(), refetchCircles(), memories.refetch(), letters.refetch()]);
    setRefreshing(false);
  };

  const dropMood = async (m: MoodCode) => {
    setQuickMood(m);
    const t = nowParts(me.user.tz);
    await createDrop.mutateAsync({
      day: today,
      audience: activeCircles.length ? 'circle' : 'self',
      circleIds: activeCircles.map((x) => x.id),
      payload: { v: 1, kind: 'mood', mood: m, ...t, tz: me.user.tz, cityId: me.user.cityId ?? undefined },
    });
  };

  const names = (id: string) => circles.flatMap((x) => x.members).find((m) => m.userId === id)?.penName ?? 'seseorang';
  const circleName = (id: string) => circles.find((x) => x.id === id)?.name ?? 'lingkaran';

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.ink} />}>
      <Gap h={SPACE.md} />
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Txt v="label" ink soft>
            #{dayOfYear(today)}
          </Txt>
          <Txt v="display" ink testID="today-title">
            {dayName(today)} {formatDayShort(today)}
          </Txt>
          <Txt v="tiny" soft>
            {city ? `${city.name} · ${zoneLabel(me.user.tz)}` : zoneLabel(me.user.tz)}
            {sunsetLabel ? ` · senja ${sunsetLabel}` : ''}
          </Txt>
        </View>
        <Row gap={2}>
          {unopened ? (
            <Card onPress={() => router.push('/surat')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 }} testID="letters-badge">
              <Row gap={6}>
                <Doodle id="amplop" size={20} />
                <Txt v="small" ink>
                  {unopened}
                </Txt>
              </Row>
            </Card>
          ) : null}
        </Row>
      </Row>

      <Gap h={SPACE.md} />
      <DayStrip today={today} />

      {season ? (
        <Card onPress={() => router.push('/musim')} style={{ marginTop: SPACE.md }} tint={c.pill}>
          <Row>
            <Doodle id={season.code === 'ramadan' ? 'lentera' : season.code === 'mudik' ? 'ketupat' : season.code === 'tujuh_belas' ? 'bendera' : 'kembang-api'} size={28} />
            <Txt v="small" ink style={{ flex: 1 }}>
              Musim Bersama sedang berjalan. Lihat apa yang dititipkan Indonesia hari ini.
            </Txt>
          </Row>
        </Card>
      ) : null}

      {memories.data?.length ? (
        <Card onPress={() => router.push(memories.data![0]!.circleId ? `/l/${memories.data![0]!.circleId}/hari/${memories.data![0]!.day}` : `/kenangan`)} style={{ marginTop: SPACE.md }} testID="one-year-ago">
          <Row>
            <Doodle id="buku" size={30} />
            <View style={{ flex: 1 }}>
              <Txt v="small" ink>
                {COPY.memories.nYearsAgo(memories.data[0]!.yearsAgo)}
              </Txt>
              <Txt v="tiny" soft>
                {memories.data[0]!.drops.length} hal tersimpan · ketuk untuk membuka
              </Txt>
            </View>
          </Row>
        </Card>
      ) : null}

      <Section title={card.rare ? 'kartu langka hari ini' : 'kartu pagi'}>
        <Card
          tint={card.rare ? c.sticky.yellow : undefined}
          onPress={() => router.push({ pathname: '/drop', params: { prompt: card.card.body, cardId: card.card.id, kind: card.card.kind === 'tantangan' ? 'photo' : 'card' } })}
          testID="daily-card">
          <Row gap={14} style={{ alignItems: 'flex-start' }}>
            <Doodle id={card.card.doodle ?? 'kartu'} size={44} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="label" ink soft>
                {card.card.kind} · {card.card.title}
              </Txt>
              <Txt>{card.card.body}</Txt>
            </View>
          </Row>
        </Card>
      </Section>

      <Section title="kapsul hari ini" right={<Txt v="tiny" soft>{drops.length ? `${drops.length} hal` : ''}</Txt>}>
        {day.isLoading ? (
          <Growing />
        ) : drops.length === 0 ? (
          <Card style={{ gap: SPACE.md }}>
            <Empty doodle="penyiram" title={COPY.empty.today} body={COPY.empty.tired} />
            <MoodPicker value={quickMood} onChange={dropMood} compact />
          </Card>
        ) : (
          <View style={{ gap: SPACE.sm }}>
            {drops.map((d) => (
              <DropCard key={d.wire.id} drop={d} compact meta={audienceLabel(d.wire, names, circleName)} />
            ))}
          </View>
        )}
      </Section>

      <Section title="bersama">
        {circlesLoading ? (
          <Growing />
        ) : activeCircles.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: SPACE.sm }}>
            <Txt center soft>
              Belum ada lingkaran. Harimu tetap tersimpan sebagai jurnal pribadi.
            </Txt>
            <Button kind="soft" title="ajak seseorang" onPress={() => router.push('/l/baru')} />
          </Card>
        ) : (
          <View style={{ gap: SPACE.sm }}>
            {activeCircles.map((x) => (
              <Card key={x.id} onPress={() => router.push(`/l/${x.id}`)} testID={`circle-card-${x.id}`}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row>
                    <Doodle id={x.doodle} size={28} />
                    <Txt v="h2" ink numberOfLines={1} style={{ maxWidth: 200 }}>
                      {x.name}
                    </Txt>
                  </Row>
                  <Flame level={x.streak.flame} days={x.streak.current} size={24} />
                </Row>
                <Gap h={SPACE.sm} />
                <Row gap={6}>
                  {x.active.map((m) => (
                    <Avatar key={m.userId} doodle={m.doodle} size={30} sealed={x.todaySealed[m.userId]} />
                  ))}
                </Row>
                <Gap h={SPACE.sm} />
                <Txt v="small" soft>
                  {sealLine(x, me.user.id)}
                </Txt>
              </Card>
            ))}
          </View>
        )}
      </Section>

      {question && !sealed ? (
        <Section title="pertanyaan malam">
          <Card onPress={() => router.push({ pathname: '/drop', params: { prompt: question.text, questionId: question.id, kind: 'answer', circleId: primary!.id } })} testID="night-question">
            <Row gap={14}>
              <Doodle id="bulan" size={36} />
              <Txt style={{ flex: 1 }}>{question.text}</Txt>
            </Row>
            <Txt v="tiny" soft style={{ marginTop: 8 }}>
              Jawaban semua orang terbuka bersamaan saat disegel.
            </Txt>
          </Card>
        </Section>
      ) : null}

      <Gap h={SPACE.lg} />
      {sealed ? (
        <Card tint={c.pill} style={{ alignItems: 'center', gap: SPACE.sm }} testID="sealed-note">
          <Doodle id="segel-lilin" size={44} />
          <Txt ink center>
            {COPY.seal.sealed}
          </Txt>
          {activeCircles[0] ? <Button kind="ghost" title="buka kapsul bersama" onPress={() => router.push(`/l/${activeCircles[0]!.id}/hari/${today}`)} /> : null}
        </Card>
      ) : (
        <View style={{ gap: 6, alignItems: 'center' }}>
          <Button title={COPY.seal.cta} icon="segel-lilin" disabled={drops.length === 0} onPress={() => router.push('/segel')} testID="seal-cta" />
          <Txt v="tiny" soft center>
            {drops.length ? COPY.seal.ctaSub : COPY.seal.nothingYet}
          </Txt>
        </View>
      )}
      {quickMood ? (
        <Txt v="tiny" ink soft center style={{ marginTop: 8 }}>
          {MOODS[quickMood].label} · {COPY.drop.added}
        </Txt>
      ) : null}
    </Screen>
  );
}
