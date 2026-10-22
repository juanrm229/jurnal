/**
 * Kitab lingkaran: bab per bulan (judulnya dipilih bersama), adegan mingguan
 * dari pemegang pena, jilid tahunan dengan genre, prolog & epilog, dan
 * "Kalimat Terakhir" sebagai puisi panjang yang ditulis tanpa sadar.
 */
import {
  type ChapterWire,
  DECKS,
  findCard,
  formatDayLong,
  formatMonth,
  GENRES,
  isoWeek,
  kindToFit,
  monthKey,
  penHolderFor,
  prevMonth,
  type SceneWire,
  type VolumeWire,
  weekRange,
} from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ceremony, ceremonyOpen } from '@/features/board/Ceremony';
import { errorText, GenreCover, genreById, nameIn, YearSwitch } from '@/features/board/shared';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, sealCircleText, useCircle, useCircleRange, useMe, useOpenDrops, useToday } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Divider, ErrorNote, Field, Gap, Growing, Header, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

export default function Kitab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const circle = useCircle(id);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const chapters = useQuery({ queryKey: ['chapters', id], queryFn: () => api.get<ChapterWire[]>(`/circles/${id}/chapters`), enabled: !!circle });

  if (!circle) return <Screen header={<Header title="Kitab" />}><Growing /></Screen>;
  const minYear = Number(circle.createdDay.slice(0, 4));
  const ceremonyMonths = [monthKey(today), prevMonth(monthKey(today))].filter((m) => ceremonyOpen(m, today) && m >= monthKey(circle.createdDay));
  const list = [...(chapters.data ?? [])].sort((a, b) => (a.month < b.month ? 1 : -1));

  return (
    <Screen header={<Header title="Kitab" subtitle={circle.name} />}>
      <Card style={{ alignItems: 'center', gap: 4, paddingVertical: SPACE.lg }}>
        <Doodle id="buku" size={44} />
        <Txt v="hand" center style={{ fontSize: 26 }}>
          kitab yang kalian tulis bersama
        </Txt>
        <Txt v="tiny" soft center>
          hari jadi halaman · minggu jadi adegan · bulan jadi bab · tahun jadi jilid
        </Txt>
      </Card>

      {/* ── Bab ── */}
      <Section title="bab">
        {ceremonyMonths.map((m) => (
          <View key={m} style={{ marginBottom: SPACE.md }}>
            <Ceremony circle={circle} month={m} chapter={chapters.data?.find((x) => x.month === m)} meId={me.user.id} />
          </View>
        ))}
        {chapters.error ? <ErrorNote error={chapters.error} onRetry={() => chapters.refetch()} /> : null}
        {chapters.isLoading ? (
          <Growing />
        ) : (
          <Card style={{ paddingVertical: 4 }} testID="chapter-list">
            {list.map((ch, i) => {
              const title = ch.titleEnc ? openCircleText(circle, ch.titleEnc) : null;
              return (
                <View key={ch.month}>
                  {i ? <Divider /> : null}
                  <Pressable onPress={() => router.push(`/wrap/${id}/month/${ch.month}`)} style={({ pressed }) => ({ paddingVertical: 6, opacity: pressed ? 0.6 : 1 })} testID={`chapter-${ch.month}`}>
                    <Row>
                      <View style={{ width: 54 }}>
                        <Txt v="tiny" ink soft>
                          bab
                        </Txt>
                        <Txt v="small" ink>
                          {formatMonth(ch.month).split(' ')[0]!.slice(0, 3).toLowerCase()} {ch.month.slice(2, 4)}
                        </Txt>
                      </View>
                      <View style={{ flex: 1 }}>
                        {title ? (
                          <Txt v="hand" style={{ fontSize: 24 }}>
                            {title}
                          </Txt>
                        ) : (
                          <Txt v="small" soft>
                            {ch.month === monthKey(today) ? 'sedang ditulis…' : 'belum berjudul'}
                          </Txt>
                        )}
                        <Txt v="tiny" soft>
                          {formatMonth(ch.month)}
                          {!title && ch.proposals.length ? ` · ${ch.proposals.length} usulan` : ''}
                        </Txt>
                      </View>
                      <Doodle id="ui-panah-kanan" size={16} opacity={0.6} />
                    </Row>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}
        {!ceremonyMonths.length ? (
          <Txt v="tiny" soft center style={{ marginTop: SPACE.sm }}>
            Upacara Tutup Bab dibuka tiga hari terakhir setiap bulan, sampai tanggal tujuh bulan berikutnya.
          </Txt>
        ) : null}
      </Section>

      {/* ── Adegan ── */}
      {circle.kind !== 'moment' ? <SceneSection circle={circle} meId={me.user.id} ownedDecks={me.ownedDecks} today={today} /> : null}

      {/* ── Jilid ── */}
      <Section title="jilid & genre">
        <YearSwitch year={year} min={minYear} max={thisYear} onChange={setYear} testID="kitab-year" />
        <Gap h={SPACE.sm} />
        <VolumeSection circle={circle} year={year} meId={me.user.id} />
      </Section>

      <Section title="prolog & epilog">
        <Row gap={8}>
          <Button
            kind="soft"
            title="prolog"
            icon="pena"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/drop', params: { prompt: `Prolog jilid ${year}: bagaimana cerita kita dimulai?`, kind: 'prologue', circleId: id } })}
            testID="write-prologue"
          />
          <Button
            kind="soft"
            title="epilog"
            icon="buku"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/drop', params: { prompt: `Epilog jilid ${year}: kalau tahun ini satu buku, apa isi halaman terakhirnya?`, kind: 'epilogue', circleId: id } })}
            testID="write-epilogue"
          />
        </Row>
        <Txt v="tiny" soft center style={{ marginTop: 6 }}>
          epilog biasanya ditulis di malam tahun baru, tapi boleh kapan saja
        </Txt>
      </Section>

      <Section title="tahun kita">
        <Card onPress={() => router.push(`/wrap/${id}/year/${year}`)} testID="year-wrap">
          <Row>
            <Doodle id="rak-buku" size={34} />
            <View style={{ flex: 1 }}>
              <Txt ink>Tahun Kita {year}</Txt>
              <Txt v="tiny" soft>
                jilid {year} dibuka bersama di Malam Buka Kapsul
              </Txt>
            </View>
            <Doodle id="ui-panah-kanan" size={16} opacity={0.6} />
          </Row>
        </Card>
      </Section>

      <LastLines circle={circle} year={year} today={today} meId={me.user.id} />
    </Screen>
  );
}

// ── Adegan (Pemegang Pena) ──────────────────────────────────────────────────

function SceneSection({ circle, meId, ownedDecks, today }: { circle: CircleView; meId: string; ownedDecks: string[]; today: string }) {
  const { c } = useTheme();
  const qc = useQueryClient();
  const week = isoWeek(today);
  const scenes = useQuery({ queryKey: ['scenes', circle.id], queryFn: () => api.get<SceneWire[]>(`/circles/${circle.id}/scenes`) });
  const scene = scenes.data?.find((s) => s.week === week);
  const holderId = scene?.penHolderId ?? penHolderFor(circle.active.map((m) => m.userId), week, circle.id);
  const iHold = holderId === meId;
  const savedTitle = scene?.titleEnc ? openCircleText(circle, scene.titleEnc) : '';
  const [title, setTitle] = useState('');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setTitle(savedTitle), [savedTitle]);

  const pool = useMemo(() => {
    const fit = kindToFit(circle.kind);
    return DECKS.filter((d) => d.id === 'dasar' || ownedDecks.includes(d.id)).flatMap((d) =>
      d.cards.filter((card) => !card.rare && (card.fit.includes('semua') || card.fit.includes(fit))),
    );
  }, [circle.kind, ownedDecks]);
  const shown = pool.length ? Array.from({ length: Math.min(4, pool.length) }, (_, i) => pool[(offset + i * 7) % pool.length]!) : [];
  const chosen = scene?.cardId ? findCard(scene.cardId)?.card : undefined;
  const { start, end } = weekRange(week);
  const past = (scenes.data ?? []).filter((s) => s.week < week && s.titleEnc).slice(-4).reverse();

  const put = async (body: { titleEnc?: string; cardId?: string }) => {
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/circles/${circle.id}/scenes/${week}`, body);
      await qc.invalidateQueries({ queryKey: ['scenes', circle.id] });
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="adegan minggu ini">
      <Card style={{ gap: SPACE.sm }} testID="scene">
        <Row>
          <Doodle id="pena" size={30} />
          <View style={{ flex: 1 }}>
            <Txt v="small">
              Pena dipegang <Txt v="small" ink>{nameIn(circle, holderId ?? '', meId)}</Txt>
            </Txt>
            <Txt v="tiny" soft>
              {formatDayLong(start, false)} – {formatDayLong(end)}
            </Txt>
          </View>
        </Row>
        {iHold ? (
          <>
            <Field value={title} onChangeText={setTitle} placeholder="judul adegan minggu ini…" maxLength={80} testID="scene-title" />
            <Button
              title={savedTitle ? 'ganti judul' : 'simpan judul'}
              onPress={() => put({ titleEnc: sealCircleText(circle, title.trim()) })}
              disabled={!title.trim() || title.trim() === savedTitle}
              loading={busy}
              testID="scene-save"
            />
            <Txt v="label" ink soft style={{ marginTop: SPACE.sm }}>
              kartu bersama minggu ini
            </Txt>
            <View style={{ gap: 6 }}>
              {shown.map((card) => {
                const on = scene?.cardId === card.id;
                return (
                  <Pressable
                    key={card.id}
                    onPress={() => put({ cardId: card.id })}
                    testID={`scene-card-${card.id}`}
                    style={({ pressed }) => ({ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.ink : c.cardEdge, backgroundColor: on ? c.pill : c.paper, opacity: pressed ? 0.7 : 1 })}>
                    <Doodle id={card.doodle ?? 'kartu'} size={24} />
                    <View style={{ flex: 1 }}>
                      <Txt v="small" ink>
                        {card.title}
                      </Txt>
                      <Txt v="tiny" soft numberOfLines={2}>
                        {card.body}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Button kind="ghost" title="kartu lain" onPress={() => setOffset((o) => o + 1)} style={{ minHeight: 40 }} />
          </>
        ) : (
          <>
            {savedTitle ? (
              <Txt v="hand" style={{ fontSize: 26 }}>
                {savedTitle}
              </Txt>
            ) : (
              <Txt v="small" soft>
                Judul adegan minggu ini masih menunggu sang narator.
              </Txt>
            )}
          </>
        )}
        {chosen ? (
          <Card tint={c.sticky.blue} style={{ padding: 12, borderRadius: 14, gap: 6 }}>
            <Row>
              <Doodle id={chosen.doodle ?? 'kartu'} size={26} />
              <View style={{ flex: 1 }}>
                <Txt v="tiny">kartu bersama · {chosen.title}</Txt>
                <Txt v="small">{chosen.body}</Txt>
              </View>
            </Row>
            <Button
              kind="soft"
              title="jawab kartu ini"
              onPress={() => router.push({ pathname: '/drop', params: { prompt: chosen.body, cardId: chosen.id, circleId: circle.id } })}
              style={{ minHeight: 40 }}
              testID="scene-answer"
            />
          </Card>
        ) : null}
        {err ? (
          <Txt v="tiny" style={{ color: c.danger }}>
            {err}
          </Txt>
        ) : null}
        {past.length ? (
          <View style={{ gap: 2, marginTop: 4 }}>
            <Txt v="label" ink soft>
              adegan sebelumnya
            </Txt>
            {past.map((s) => (
              <Row key={s.week} gap={8}>
                <Txt v="tiny" soft style={{ width: 70 }}>
                  {formatDayLong(weekRange(s.week).start, false)}
                </Txt>
                <Txt v="small" style={{ flex: 1 }} numberOfLines={1}>
                  {openCircleText(circle, s.titleEnc)}
                </Txt>
              </Row>
            ))}
          </View>
        ) : null}
      </Card>
    </Section>
  );
}

// ── Jilid & Genre ───────────────────────────────────────────────────────────

function VolumeSection({ circle, year, meId }: { circle: CircleView; year: number; meId: string }) {
  const { c } = useTheme();
  const qc = useQueryClient();
  const volumes = useQuery({ queryKey: ['volumes', circle.id], queryFn: () => api.get<VolumeWire[]>(`/circles/${circle.id}/volumes`) });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const vol = volumes.data?.find((v) => v.year === year);
  const genre = genreById(vol?.genreId);
  const myVote = vol?.genreVotes.find((v) => v.userId === meId)?.genreId;
  const tally = new Map<string, string[]>();
  for (const v of vol?.genreVotes ?? []) (tally.get(v.genreId) ?? tally.set(v.genreId, []).get(v.genreId)!).push(v.userId);

  const vote = async (genreId: string) => {
    setBusy(genreId);
    setErr(null);
    try {
      await api.put(`/circles/${circle.id}/volumes/${year}/genre`, { genreId });
      await qc.invalidateQueries({ queryKey: ['volumes', circle.id] });
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  if (volumes.isLoading) return <Growing />;
  if (volumes.error) return <ErrorNote error={volumes.error} onRetry={() => volumes.refetch()} />;

  return (
    <View style={{ gap: SPACE.sm }} testID="volume">
      <Card>
        <Row style={{ alignItems: 'flex-start' }} gap={14}>
          {genre ? <GenreCover genre={genre} width={70} height={94} /> : (
            <View style={{ width: 70, height: 94, borderRadius: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: c.inkSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Doodle id="buku" size={28} opacity={0.5} />
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="label" ink soft>
              jilid {year}
            </Txt>
            <Txt v="h2" ink>
              {genre ? genre.name : 'genre belum dipilih'}
            </Txt>
            <Txt v="small" soft>
              {genre ? genre.blurb : 'Pilih bersama: jilid ini mau jadi cerita macam apa? Genre bisa dipilih ulang sebelum dicetak.'}
            </Txt>
            {vol?.genreVotes.length ? (
              <Txt v="tiny" soft style={{ marginTop: 4 }}>
                {vol.genreVotes.length} dari {circle.active.length} sudah memilih
              </Txt>
            ) : null}
          </View>
        </Row>
      </Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
        {GENRES.map((g) => {
          const votes = tally.get(g.id) ?? [];
          const mine = myVote === g.id;
          return (
            <Pressable key={g.id} onPress={() => vote(g.id)} testID={`genre-${g.id}`} style={({ pressed }) => ({ width: 96, gap: 4, opacity: pressed || busy === g.id ? 0.6 : 1 })}>
              <GenreCover genre={g} selected={mine} />
              <Txt v="tiny" ink={mine} numberOfLines={2}>
                {g.name}
              </Txt>
              {votes.length ? (
                <Txt v="tiny" soft numberOfLines={1}>
                  {votes.map((u) => nameIn(circle, u, meId)).join(', ')}
                </Txt>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {err ? (
        <Txt v="tiny" style={{ color: c.danger }}>
          {err}
        </Txt>
      ) : null}
    </View>
  );
}

// ── Kalimat Terakhir ────────────────────────────────────────────────────────

function LastLines({ circle, year, today, meId }: { circle: CircleView; year: number; today: string; meId: string }) {
  const end = `${year}-12-31` < today ? `${year}-12-31` : today;
  const start = `${year}-01-01` > circle.createdDay ? `${year}-01-01` : circle.createdDay;
  const range = useCircleRange(circle.id, start, end, start <= end);
  const opened = useOpenDrops(range.data?.drops);
  const lines = opened
    .filter((d) => d.wire.kind === 'last_line' && d.payload?.text)
    .sort((a, b) => (a.wire.day < b.wire.day ? -1 : a.wire.day > b.wire.day ? 1 : a.payload!.hour * 60 + a.payload!.minute - (b.payload!.hour * 60 + b.payload!.minute)));
  let lastDay = '';

  return (
    <Section title="kalimat terakhir">
      <Card style={{ paddingVertical: SPACE.lg }} testID="last-lines">
        <Txt v="label" ink soft center>
          puisi panjang yang ditulis tanpa sadar · {year}
        </Txt>
        <Gap h={SPACE.md} />
        {range.isLoading ? (
          <Growing />
        ) : lines.length === 0 ? (
          <Txt v="small" soft center>
            Setiap kapsul ditutup dengan satu kalimat. Nanti kalimat-kalimat itu berbaris di sini jadi satu puisi.
          </Txt>
        ) : (
          lines.map((d) => {
            const showDate = d.wire.day !== lastDay;
            lastDay = d.wire.day;
            return (
              <View key={d.wire.id} style={{ marginTop: showDate ? 10 : 0 }}>
                {showDate ? (
                  <Txt v="tiny" soft>
                    {formatDayLong(d.wire.day, false)}
                  </Txt>
                ) : null}
                <Txt v="hand" style={{ fontSize: 23, lineHeight: 28 }}>
                  {d.payload!.text}
                  <Txt v="tiny" soft>{`  — ${nameIn(circle, d.wire.authorId, meId)}`}</Txt>
                </Txt>
              </View>
            );
          })
        )}
        {lines.length ? (
          <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
            {lines.length} baris sejauh ini
          </Txt>
        ) : null}
      </Card>
    </Section>
  );
}
