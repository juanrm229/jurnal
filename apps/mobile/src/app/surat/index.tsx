/**
 * Kotak surat: yang sudah sampai, yang masih di perjalanan, dan kapsul waktu
 * yang ditujukan kepadaku.
 */
import { COPY, formatDayLong, type LetterWire } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { api } from '@/lib/api';
import { memberName, qk, useCircles, useInbox, useMe, useOpenDrops } from '@/lib/data';
import { Envelope } from '@/features/story/Envelope';
import { formatWhen, KIND_DOODLE, KIND_LABEL, milestoneName, stickyColorFor, tiltFor, useAllLetters } from '@/features/story/letters';
import { Doodle } from '@/ui/Doodle';
import { DropCard } from '@/ui/DropCard';
import { Button, Card, Empty, ErrorNote, Gap, Growing, Header, Pill, Row, Screen, Section, Sticky, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

type Tab = 'inbox' | 'outbox';

export default function Mailbox() {
  const me = useMe();
  const { c } = useTheme();
  const qc = useQueryClient();
  const { circles } = useCircles();
  const { inbox, outbox, open } = useAllLetters();
  const capsules = useInbox();
  const capsuleDrops = useOpenDrops(capsules.data?.drops);
  const [tab, setTab] = useState<Tab>('inbox');
  const [refreshing, setRefreshing] = useState(false);

  const name = (id: string) => memberName(circles, id, me.user.id);
  const circleName = (id: string | null) => circles.find((x) => x.id === id)?.name ?? 'lingkaran';
  const from = (l: LetterWire) => (l.fromUserId === me.user.id ? 'kamu, dari masa lalu' : name(l.fromUserId));
  const to = (l: LetterWire) =>
    l.toUserId === me.user.id ? 'dirimu sendiri' : l.toUserId ? name(l.toUserId) : `seluruh ${circleName(l.circleId)}`;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([inbox.refetch(), outbox.refetch(), capsules.refetch()]);
    setRefreshing(false);
  };

  const openLetter = async (l: LetterWire) => {
    try {
      await api.post(`/letters/${l.id}/open`);
    } catch {
      // Tetap boleh dibaca; tanda terbuka dicoba lagi di halaman surat.
    }
    void qc.invalidateQueries({ queryKey: qk.letters('inbox') });
    router.push(`/surat/${l.id}`);
  };

  const list = tab === 'inbox' ? inbox : outbox;
  const letters = list.data ?? [];
  const unopened = (inbox.data ?? []).filter((l) => !l.openedAt).length;

  return (
    <Screen
      header={<Header title="kotak surat" subtitle={unopened ? `${unopened} amplop belum dibuka` : undefined} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.ink} />}>
      <Row gap={8} style={{ marginTop: SPACE.sm }}>
        <Pill active={tab === 'inbox'} onPress={() => setTab('inbox')} testID="tab-inbox">
          {`sampai${inbox.data?.length ? ` · ${inbox.data.length}` : ''}`}
        </Pill>
        <Pill active={tab === 'outbox'} onPress={() => setTab('outbox')} testID="tab-outbox">
          {`terkirim${outbox.data?.length ? ` · ${outbox.data.length}` : ''}`}
        </Pill>
      </Row>

      <Gap h={SPACE.md} />
      {list.isLoading ? (
        <Growing />
      ) : list.error ? (
        <ErrorNote error={list.error} onRetry={() => list.refetch()} />
      ) : letters.length === 0 ? (
        tab === 'inbox' ? (
          <Empty
            doodle="surat-botol"
            title="Belum ada surat yang sampai."
            body="Surat Tersesat datang di waktu yang tidak bisa ditebak. Mungkin justru saat paling dibutuhkan."
          />
        ) : (
          <Empty doodle="amplop" title="Belum ada surat yang kamu kirim." body="Tulis satu untuk seseorang, atau untuk dirimu bertahun-tahun lagi." />
        )
      ) : (
        <View style={{ gap: SPACE.lg, paddingHorizontal: 4 }}>
          {letters.map((l) => {
            const p = open.get(l.id);
            if (tab === 'inbox' && !l.openedAt) {
              return (
                <Envelope
                  key={l.id}
                  testID={`envelope-${l.id}`}
                  note={p?.envelopeNote}
                  from={from(l)}
                  doodle={KIND_DOODLE[l.kind]}
                  tilt={tiltFor(l.id) * 0.5}
                  onOpen={() => openLetter(l)}
                />
              );
            }
            const status =
              tab === 'inbox'
                ? `dari ${from(l)}`
                : l.deliveredAt
                  ? `sudah sampai${l.kind === 'lost' ? '' : ` · ${formatWhen(l.deliveredAt, me.user.tz)}`}`
                  : l.kind === 'lost'
                    ? 'dalam perjalanan'
                    : l.kind === 'milestone'
                      ? `terbuka di petak ${milestoneName(l.milestoneDays) ?? '…'}${l.deliverOn ? ` · ${formatDayLong(l.deliverOn)}` : ''}`
                      : `terbuka ${l.deliverOn ? formatDayLong(l.deliverOn) : 'nanti'}`;
            return (
              <Sticky key={l.id} color={stickyColorFor(l.id)} tilt={tiltFor(l.id)} onPress={() => router.push(`/surat/${l.id}`)} style={{ marginHorizontal: 6 }}>
                <View testID={`letter-${l.id}`}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={6}>
                      <Doodle id={KIND_DOODLE[l.kind]} size={20} />
                      <Txt v="label" style={{ color: c.text, opacity: 0.7 }}>
                        {KIND_LABEL[l.kind].toLowerCase()}
                      </Txt>
                    </Row>
                    {tab === 'outbox' && !l.deliveredAt ? <Doodle id={l.kind === 'lost' ? 'surat-botol' : 'ui-gembok'} size={18} opacity={0.7} /> : null}
                  </Row>
                  {p?.envelopeNote ? (
                    <Txt v="tiny" style={{ color: c.text, opacity: 0.7, marginTop: 6 }}>
                      di amplop: “{p.envelopeNote}”
                    </Txt>
                  ) : null}
                  <Txt v="hand" numberOfLines={3} style={{ fontSize: 25, lineHeight: 29, color: c.text, marginTop: 6 }}>
                    {p ? p.text || 'tanpa kata, hanya isi amplop' : 'Tidak bisa dibuka dengan kunci di perangkat ini.'}
                  </Txt>
                  <Txt v="tiny" style={{ color: c.text, opacity: 0.75, marginTop: 8 }}>
                    {tab === 'outbox' ? `untuk ${to(l)} · ` : ''}
                    {status}
                  </Txt>
                  {tab === 'outbox' && l.kind === 'lost' && !l.deliveredAt ? (
                    <Txt v="tiny" style={{ color: c.text, opacity: 0.6, marginTop: 2 }}>
                      tak ada yang tahu kapan ia sampai, termasuk kamu.
                    </Txt>
                  ) : null}
                </View>
              </Sticky>
            );
          })}
        </View>
      )}

      {tab === 'inbox' && (capsules.data?.locked.length || capsuleDrops.length) ? (
        <Section title="kapsul waktu untukku">
          <View style={{ gap: SPACE.sm }}>
            {capsules.data?.locked.map((d) => (
              <Card key={d.id} style={{ borderStyle: 'dashed', borderColor: c.inkSoft }} testID={`capsule-locked-${d.id}`}>
                <Row gap={12}>
                  <Doodle id="ui-gembok" size={28} />
                  <View style={{ flex: 1 }}>
                    <Txt v="small" ink>
                      {COPY.drop.timeCapsuleUntil(d.unlockOn ? formatDayLong(d.unlockOn) : '…')}
                    </Txt>
                    <Txt v="tiny" soft>
                      dari {name(d.authorId)} · isinya menunggu dengan sabar
                    </Txt>
                  </View>
                </Row>
              </Card>
            ))}
            {capsuleDrops.map((d) => (
              <DropCard key={d.wire.id} drop={d} author={name(d.wire.authorId)} meta={d.wire.unlockOn ? `terbuka ${formatDayLong(d.wire.unlockOn)}` : 'hanya untukmu'} />
            ))}
          </View>
        </Section>
      ) : null}

      <Gap h={SPACE.xl} />
      <Button title="tulis surat" icon="pena" onPress={() => router.push('/surat/tulis')} testID="compose-letter" />
    </Screen>
  );
}
