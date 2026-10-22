/**
 * Satu surat, dibuka di perangkat dan ditulis tangan di kertas tempel besar.
 */
import { getCity } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '@/lib/api';
import { memberName, qk, useCircles, useMe } from '@/lib/data';
import { formatWhen, KIND_DOODLE, KIND_LABEL, milestoneName, stickyColorFor, travelled, useAllLetters } from '@/features/story/letters';
import { openSong } from '@/features/story/cards';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Empty, Gap, Growing, Header, Row, Screen, Sticky, Txt } from '@/ui/kit';
import { Photo } from '@/ui/media';
import { RADIUS, SPACE, useTheme } from '@/ui/theme';

export default function LetterDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const qc = useQueryClient();
  const { circles } = useCircles();
  const { inbox, outbox, open } = useAllLetters();
  const letter = inbox.data?.find((l) => l.id === id) ?? outbox.data?.find((l) => l.id === id);
  const p = letter ? open.get(letter.id) : undefined;
  const marked = useRef(false);

  // Datang langsung dari notifikasi: tandai terbuka sekali.
  useEffect(() => {
    if (!letter || letter.openedAt || !letter.deliveredAt || letter.fromUserId === me.user.id || marked.current) return;
    marked.current = true;
    api
      .post(`/letters/${letter.id}/open`)
      .then(() => qc.invalidateQueries({ queryKey: qk.letters('inbox') }))
      .catch(() => {});
  }, [letter, me.user.id, qc]);

  if (inbox.isLoading || outbox.isLoading) return <Screen header={<Header />}><Growing /></Screen>;
  if (!letter) {
    return (
      <Screen header={<Header />}>
        <Empty doodle="surat-botol" title="Surat ini belum bisa ditemukan." body="Mungkin ia masih di perjalanan." action={<Button kind="ghost" title="ke kotak surat" onPress={() => router.replace('/surat')} />} />
      </Screen>
    );
  }

  const mine = letter.fromUserId === me.user.id;
  const sender = mine ? (letter.toUserId === me.user.id ? 'kamu, dari masa lalu' : 'kamu') : memberName(circles, letter.fromUserId, me.user.id);
  const recipient =
    letter.toUserId === me.user.id ? 'dirimu sendiri' : letter.toUserId ? memberName(circles, letter.toUserId, me.user.id) : `seluruh ${circles.find((x) => x.id === letter.circleId)?.name ?? 'lingkaran'}`;
  const city = getCity(p?.writtenInCityId);
  const trip = p && letter.kind === 'lost' ? travelled(p.writtenAt, letter.deliveredAt, me.user.tz) : null;
  const photos = p?.media?.filter((m) => m.mime.startsWith('image/')) ?? [];

  return (
    <Screen header={<Header title={KIND_LABEL[letter.kind].toLowerCase()} subtitle={mine ? `untuk ${recipient}` : `dari ${sender}`} />}>
      <Gap h={SPACE.md} />
      {!p ? (
        <Card style={{ alignItems: 'center', gap: SPACE.sm }}>
          <Doodle id="ui-gembok" size={36} />
          <Txt center soft>
            {letter.envelope ? 'Surat ini tidak bisa dibuka dengan kunci di perangkat ini.' : 'Surat ini masih di perjalanan.'}
          </Txt>
        </Card>
      ) : (
        <>
          {p.envelopeNote ? (
            <Row gap={8} style={{ justifyContent: 'center', marginBottom: SPACE.sm }}>
              <Doodle id="amplop" size={22} />
              <Txt v="hand" style={{ fontSize: 24, color: c.text }}>
                {p.envelopeNote}
              </Txt>
            </Row>
          ) : null}
          <Sticky color={stickyColorFor(letter.id)} tilt={-1.2} style={{ marginHorizontal: 4 }}>
            <View testID="letter-body" style={{ minHeight: 280 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: SPACE.md }}>
                <Txt v="tiny" style={{ color: c.text, opacity: 0.7 }}>
                  {formatWhen(p.writtenAt, me.user.tz)}
                  {city ? ` · ${city.name}` : ''}
                </Txt>
                <Doodle id={KIND_DOODLE[letter.kind]} size={26} />
              </Row>
              <Txt v="hand" style={{ fontSize: 30, lineHeight: 36, color: c.text }} selectable>
                {p.text}
              </Txt>
              {photos.map((m) => (
                <Photo key={m.id} media={m} style={{ marginTop: SPACE.md }} />
              ))}
              {p.song ? (
                <Pressable onPress={() => openSong(p.song!.url)} accessibilityRole="link" style={{ marginTop: SPACE.md, backgroundColor: c.card, borderRadius: RADIUS.md, padding: 12 }}>
                  <Row>
                    <Doodle id="ui-lagu" size={22} />
                    <Txt v="small" ink numberOfLines={1} style={{ flex: 1 }}>
                      {p.song.title} — {p.song.artist}
                    </Txt>
                  </Row>
                </Pressable>
              ) : null}
              <Txt v="hand" style={{ fontSize: 26, color: c.text, textAlign: 'right', marginTop: SPACE.lg }}>
                — {sender}
              </Txt>
            </View>
          </Sticky>
          <Gap h={SPACE.lg} />
          <View style={{ alignItems: 'center', gap: 4 }}>
            {trip ? (
              <Txt v="small" ink center>
                {`Ditulis ${formatWhen(p.writtenAt, me.user.tz)}, lalu ${trip}.`}
              </Txt>
            ) : null}
            {letter.kind === 'milestone' && milestoneName(letter.milestoneDays) ? (
              <Txt v="small" ink center>
                {`Dikunci untuk petak ${milestoneName(letter.milestoneDays)}, hari ke-${letter.milestoneDays}.`}
              </Txt>
            ) : null}
            {mine && !letter.deliveredAt ? (
              <Txt v="small" soft center>
                {letter.kind === 'lost' ? 'Masih dalam perjalanan. Kapan sampainya, biar jadi rahasia jalan.' : `Masih terkunci${letter.deliverOn ? ` sampai ${formatWhen(`${letter.deliverOn}T12:00:00Z`, 'UTC')}` : ''}.`}
              </Txt>
            ) : null}
          </View>
        </>
      )}
      <Gap h={SPACE.xl} />
      {!mine && letter.circleId ? (
        <Button
          kind="soft"
          title="balas dengan surat tersesat"
          icon="surat-botol"
          onPress={() => router.push({ pathname: '/surat/tulis', params: { kind: 'lost', circleId: letter.circleId!, to: letter.fromUserId } })}
        />
      ) : null}
    </Screen>
  );
}
