/**
 * Satu hari di lingkaran. Untuk Duo: "Dua Sisi Satu Hari" — jam per jam,
 * kamu di kotamu dan dia di kotanya. Lokasi paling detail hanya nama kota.
 */
import {
  addDays,
  COPY,
  dayName,
  formatDayLong,
  getCity,
  openEnvelope,
  sealEnvelope,
  yellowing,
  type FootnoteWire,
} from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { api } from '@/lib/api';
import { newDropId, type OpenDrop, qk, useCircle, useCircleDay, useKeyring, useMe, useOpenDrops, useReact, useToday } from '@/lib/data';
import { useSession } from '@/lib/session';
import { claimTokens, tokenCandidates } from '@/features/tokens';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { DropCard, LockedCard } from '@/ui/DropCard';
import { Button, Card, Field, Gap, Growing, Header, IconButton, Pill, Row, Screen, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

export default function CircleDayScreen() {
  const { id, day } = useLocalSearchParams<{ id: string; day: string }>();
  const me = useMe();
  const { identity } = useSession();
  const { c } = useTheme();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const q = useCircleDay(id, day);
  const drops = useOpenDrops(q.data?.drops);
  const ring = useKeyring();
  const react = useReact();
  const [view, setView] = useState<'sides' | 'list'>('sides');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [won, setWon] = useState<string[]>([]);

  const aged = circle?.settings.yellowingPages && circle.status === 'active' ? yellowing(q.data?.lastVisitedOn ?? day, today) : 0;

  // Kunjungan menghidupkan halaman lagi.
  useEffect(() => {
    if (!q.data || !circle) return;
    const t = setTimeout(() => {
      void api.post(`/circles/${id}/days/${day}/visit`).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [q.data?.day, circle?.id]);

  // Token Kenangan untuk hari tersegel.
  useEffect(() => {
    if (!q.data?.iSealed || !circle) return;
    const mine = drops.filter((d) => d.wire.authorId === me.user.id);
    const allSealed = q.data.members.every((m) => m.sealed || m.frozen);
    const codes = tokenCandidates({ circle, day, mine, homeCityId: me.user.homeCityId, allSealed, yellowed: aged > 0.2 });
    if (codes.length) void claimTokens(circle.id, day, codes).then(setWon);
  }, [q.data?.iSealed, drops.length]);

  const byAuthor = useMemo(() => {
    const map = new Map<string, OpenDrop[]>();
    for (const d of drops) (map.get(d.wire.authorId) ?? map.set(d.wire.authorId, []).get(d.wire.authorId)!).push(d);
    return map;
  }, [drops]);

  if (!circle || !q.data) return <Screen header={<Header />}><Growing /></Screen>;
  const data = q.data;
  const name = (uid: string) => (uid === me.user.id ? 'kamu' : (circle.members.find((m) => m.userId === uid)?.penName ?? 'seseorang'));
  const partner = circle.kind === 'duo' ? circle.members.find((m) => m.userId !== me.user.id) : undefined;
  const lockedFor = (uid: string) => data.locked.filter((l) => l.authorId === uid);
  const showSides = circle.kind === 'duo' && view === 'sides' && partner;

  const footnotesOf = (d: OpenDrop): { fn: FootnoteWire; text: string }[] =>
    d.wire.footnotes.map((fn) => {
      try {
        return { fn, text: ring ? openEnvelope<{ text: string }>(fn.envelope as never, ring).text : '…' };
      } catch {
        return { fn, text: '…' };
      }
    });

  const addFootnote = async (dropId: string) => {
    if (!note.trim() || !identity) return;
    const key = circle.keys.get(circle.currentEpoch);
    if (!key) return;
    const env = sealEnvelope({ text: note.trim() }, [
      { t: 'user', userId: me.user.id, publicKey: identity.publicKey },
      { t: 'circle', circleId: circle.id, epoch: circle.currentEpoch, key },
    ]);
    await api.post(`/drops/${dropId}/footnotes`, { id: newDropId(), envelope: { ciphertext: env.ciphertext, recipients: env.recipients } });
    setNote('');
    setNoteFor(null);
    await qc.invalidateQueries({ queryKey: qk.circleDay(id, day) });
  };

  const renderDrop = (d: OpenDrop) => (
    <View key={d.wire.id} style={{ gap: 6 }}>
      <DropCard
        drop={d}
        author={circle.kind !== 'duo' || view === 'list' ? name(d.wire.authorId) : undefined}
        viewerId={me.user.id}
        aged={aged}
        compact={!!showSides}
        onReact={circle.status === 'active' || circle.status === 'memorial' ? (kind, on) => react.mutate({ dropId: d.wire.id, kind, on }) : undefined}
        onLongPress={d.wire.kind !== 'silent' ? () => setNoteFor(d.wire.id) : undefined}
      />
      {footnotesOf(d).map(({ fn, text }) => (
        <View key={fn.id} style={{ paddingLeft: SPACE.md, flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <Txt v="tiny" ink soft>
            ✎ {name(fn.authorId)}
          </Txt>
          <Txt v="hand" style={{ fontSize: 20, flex: 1 }}>
            {text}
          </Txt>
          {d.wire.authorId === me.user.id ? (
            <Pill active={fn.includeInPrint} onPress={() => api.patch(`/footnotes/${fn.id}`, { includeInPrint: !fn.includeInPrint }).then(() => q.refetch())}>
              {fn.includeInPrint ? 'ikut cetak' : 'cetak?'}
            </Pill>
          ) : null}
        </View>
      ))}
      {noteFor === d.wire.id ? (
        <Row style={{ paddingLeft: SPACE.md }}>
          <View style={{ flex: 1 }}>
            <Field value={note} onChangeText={setNote} placeholder="catatan kaki kecil…" autoFocus testID="footnote-input" />
          </View>
          <IconButton icon="ui-centang" label="simpan catatan" onPress={() => addFootnote(d.wire.id)} />
        </Row>
      ) : null}
    </View>
  );

  return (
    <Screen
      header={
        <Header
          title={`${dayName(day)}, ${formatDayLong(day)}`}
          subtitle={circle.name}
          right={
            <Row gap={0}>
              <IconButton icon="ui-kembali" label="hari sebelumnya" onPress={() => router.replace(`/l/${id}/hari/${addDays(day, -1)}`)} size={20} />
              {day < today ? <IconButton icon="ui-panah-kanan" label="hari berikutnya" onPress={() => router.replace(`/l/${id}/hari/${addDays(day, 1)}`)} size={20} /> : null}
            </Row>
          }
        />
      }>
      <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }} gap={14}>
        {data.members.map((m) => {
          const member = circle.members.find((x) => x.userId === m.userId);
          return (
            <View key={m.userId} style={{ alignItems: 'center', gap: 2 }}>
              <Avatar doodle={member?.doodle ?? 'tunas'} size={40} sealed={m.sealed} />
              <Txt v="tiny" ink={m.sealed} soft={!m.sealed}>
                {name(m.userId)}
              </Txt>
              <Txt v="tiny" soft>
                {m.sealed ? 'tersegel' : m.frozen ? 'istirahat' : `${m.dropCount} hal`}
              </Txt>
            </View>
          );
        })}
      </Row>

      {aged > 0.15 ? (
        <Txt v="tiny" ink soft center style={{ marginTop: SPACE.sm }}>
          {COPY.memories.yellowing}
        </Txt>
      ) : null}
      {won.length ? (
        <Card tint={c.sticky.yellow} style={{ marginTop: SPACE.sm }} onPress={() => router.push(`/l/${id}/lemari`)}>
          <Row>
            <Doodle id={won[0] === 'kembang_api' ? 'kembang-api' : won[0] === 'daun_kering' ? 'daun-kering' : won[0]!} size={30} />
            <Txt v="small" style={{ flex: 1 }}>
              Token baru masuk Lemari Benda: {won.join(', ').replace(/_/g, ' ')}.
            </Txt>
          </Row>
        </Card>
      ) : null}

      {!data.iSealed && circle.settings.revealMode === 'after_seal' && circle.kind !== 'moment' && day === today ? (
        <Card tint={c.pill} style={{ marginTop: SPACE.md, gap: SPACE.sm, alignItems: 'center' }}>
          <Doodle id="segel-lilin" size={36} />
          <Txt v="small" center>
            {COPY.seal.giveFirst}
          </Txt>
          <Button title={COPY.seal.cta} onPress={() => router.push('/segel')} testID="day-seal" />
        </Card>
      ) : null}

      {circle.kind === 'duo' && partner ? (
        <Row style={{ justifyContent: 'center', marginTop: SPACE.md }}>
          <Pill active={view === 'sides'} onPress={() => setView('sides')}>
            dua sisi
          </Pill>
          <Pill active={view === 'list'} onPress={() => setView('list')}>
            berurutan
          </Pill>
        </Row>
      ) : null}

      <Gap />
      {showSides ? (
        <TwoSides
          me={{ id: me.user.id, name: 'kamu', cityId: me.user.cityId, drops: byAuthor.get(me.user.id) ?? [], locked: [] }}
          them={{ id: partner.userId, name: partner.penName, cityId: partner.cityId, drops: byAuthor.get(partner.userId) ?? [], locked: lockedFor(partner.userId) }}
          renderDrop={renderDrop}
        />
      ) : (
        <View style={{ gap: SPACE.md }}>
          {data.members.map((m) => {
            const list = byAuthor.get(m.userId) ?? [];
            const locked = lockedFor(m.userId);
            if (!list.length && !locked.length) return null;
            return (
              <View key={m.userId} style={{ gap: SPACE.sm }}>
                {circle.kind !== 'duo' ? (
                  <Txt v="label" ink soft>
                    {name(m.userId)}
                  </Txt>
                ) : null}
                {list.map(renderDrop)}
                {locked.length ? <LockedCard locked={locked[0]!} author={`${name(m.userId)} · ${locked.length} hal`} /> : null}
              </View>
            );
          })}
          {drops.length === 0 && data.locked.length === 0 ? (
            <Card style={{ alignItems: 'center', gap: 6 }}>
              <Doodle id="kabut" size={44} color={c.fog} />
              <Txt v="small" soft center>
                {day < today ? COPY.streak.fog : COPY.empty.circle}
              </Txt>
            </Card>
          ) : null}
        </View>
      )}
      <Txt v="tiny" soft center style={{ marginTop: SPACE.lg }}>
        tekan lama sebuah Drop untuk menambah catatan kaki
      </Txt>
    </Screen>
  );
}

function TwoSides({
  me,
  them,
  renderDrop,
}: {
  me: { id: string; name: string; cityId: string | null; drops: OpenDrop[]; locked: unknown[] };
  them: { id: string; name: string; cityId: string | null; drops: OpenDrop[]; locked: import('@sehari/core').LockedDrop[] };
  renderDrop: (d: OpenDrop) => React.ReactNode;
}) {
  const { c } = useTheme();
  const hours = new Set<number>();
  for (const d of [...me.drops, ...them.drops]) if (d.payload) hours.add(d.payload.hour);
  const sorted = [...hours].sort((a, b) => a - b);
  const cityOf = (side: typeof me) => getCity(side.drops.find((d) => d.payload?.cityId)?.payload?.cityId ?? side.cityId)?.name ?? '';
  return (
    <View>
      <Row style={{ marginBottom: SPACE.sm }}>
        <View style={{ flex: 1 }}>
          <Txt v="h2" ink>
            {me.name}
          </Txt>
          <Txt v="tiny" soft>
            {cityOf(me)}
          </Txt>
        </View>
        <View style={{ width: 44 }} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Txt v="h2" ink>
            {them.name}
          </Txt>
          <Txt v="tiny" soft>
            {cityOf(them as never)}
          </Txt>
        </View>
      </Row>
      {sorted.map((h) => (
        <Row key={h} style={{ alignItems: 'flex-start', marginBottom: SPACE.sm }}>
          <View style={{ flex: 1, gap: 6 }}>{me.drops.filter((d) => d.payload?.hour === h).map(renderDrop)}</View>
          <View style={{ width: 44, alignItems: 'center', paddingTop: 10 }}>
            <Txt v="tiny" ink soft>
              {String(h).padStart(2, '0')}.00
            </Txt>
            <View style={{ width: 1, height: 40, backgroundColor: c.inkSoft, opacity: 0.5, marginTop: 4 }} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>{them.drops.filter((d) => d.payload?.hour === h).map(renderDrop)}</View>
        </Row>
      ))}
      {them.locked.length ? (
        <Row>
          <View style={{ flex: 1 }} />
          <View style={{ width: 44 }} />
          <View style={{ flex: 1 }}>
            <LockedCard locked={them.locked[0]!} author={`${them.name} · ${them.locked.length} hal`} />
          </View>
        </Row>
      ) : null}
    </View>
  );
}
