/**
 * Upacara Tutup Bab: tiap anggota mengusulkan sampai tiga judul untuk bulan
 * yang hampir selesai, lalu semua memilih. Usulan berbasis aturan dihitung di
 * perangkat; AI cloud hanya bila semua anggota setuju dan hanya untuk potongan
 * yang dipilih sendiri.
 */
import { type AiChapterResult, type ChapterWire, COPY, formatMonth, monthRange, suggestTitlesFor } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, sealCircleText, useCalendar, useCircleRange, useOpenDrops } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Pill, Row, Sticky, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';
import { authoredTexts, errorText, nameIn, toWrapDrops } from './shared';

/** Aturan upacara dari core — sama persis dengan yang ditegakkan server. */
export { ceremonyOpen } from '@sehari/core';
import { ceremonyOpen } from '@sehari/core';

export function aiAllowed(circle: CircleView): boolean {
  return circle.active.length > 0 && circle.active.every((m) => circle.aiConsent.find((a) => a.userId === m.userId)?.granted);
}

export function Ceremony({ circle, month, chapter, meId }: { circle: CircleView; month: string; chapter: ChapterWire | undefined; meId: string }) {
  const { c } = useTheme();
  const qc = useQueryClient();
  const { start, end } = monthRange(month);
  const range = useCircleRange(circle.id, start, end);
  const cal = useCalendar(circle.id, start, end);
  const opened = useOpenDrops(range.data?.drops);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const proposals = (chapter?.proposals ?? []).map((p) => ({ ...p, title: openCircleText(circle, p.titleEnc) }));
  const mine = proposals.filter((p) => p.userId === meId);
  const myVote = proposals.find((p) => p.votes.includes(meId))?.id;
  const voters = new Set(proposals.flatMap((p) => p.votes));
  const closed = !!chapter?.closedAt;
  const winner = closed ? openCircleText(circle, chapter?.titleEnc, '…') : null;

  const suggestions = useMemo(() => {
    if (!range.data) return [];
    const seals: Record<string, string[]> = {};
    for (const d of cal.data ?? []) for (const u of d.sealed) (seals[u] ??= []).push(d.day);
    try {
      return suggestTitlesFor({
        scope: 'month',
        period: month,
        circle: { id: circle.id, kind: circle.kind, name: circle.name },
        members: circle.active.map((m) => ({ userId: m.userId, name: nameIn(circle, m.userId, meId) })),
        drops: toWrapDrops(opened),
        seals,
      }).slice(0, 5);
    } catch {
      return [];
    }
  }, [range.data, cal.data, opened, month, circle, meId]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['chapters', circle.id] });

  const propose = async (title: string) => {
    const t = title.trim();
    if (!t || mine.length >= 3) return;
    setBusy('propose');
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/chapters/${month}/proposals`, { titleEnc: sealCircleText(circle, t.slice(0, 80)) });
      setDraft('');
      await refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const vote = async (proposalId: string) => {
    setBusy(proposalId);
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/chapters/${month}/votes`, { proposalId });
      await refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const closeNow = async () => {
    setBusy('close');
    try {
      await api.post(`/circles/${circle.id}/chapters/${month}/close`);
      await refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  if (closed) {
    return (
      <Sticky color="yellow" tilt={-1}>
        <View style={{ alignItems: 'center', gap: 6 }} testID="ceremony-winner">
          <Txt v="label">bab {formatMonth(month).toLowerCase()} diberi judul</Txt>
          <Txt v="handLarge" center style={{ fontSize: 34, lineHeight: 38 }}>
            {winner}
          </Txt>
          <Txt v="tiny" soft center>
            dipilih bersama dari {proposals.length} usulan
          </Txt>
        </View>
      </Sticky>
    );
  }

  return (
    <Card style={{ gap: SPACE.sm, borderStyle: 'dashed', borderColor: c.ink }} testID="ceremony">
      <Row>
        <Doodle id="pena" size={32} />
        <View style={{ flex: 1 }}>
          <Txt v="h2" ink>
            Upacara Tutup Bab
          </Txt>
          <Txt v="tiny" soft>
            {formatMonth(month)} hampir selesai. Usulkan judul, lalu pilih bersama.
          </Txt>
        </View>
      </Row>

      {proposals.length ? (
        <View style={{ gap: 6 }}>
          {proposals.map((p) => {
            const chosen = myVote === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => vote(p.id)}
                testID={`proposal-${p.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                style={({ pressed }) => ({
                  borderRadius: 14,
                  borderWidth: chosen ? 2 : 1,
                  borderColor: chosen ? c.ink : c.inkSoft,
                  backgroundColor: chosen ? c.pill : c.card,
                  padding: 12,
                  opacity: pressed || busy === p.id ? 0.6 : 1,
                })}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Txt v="hand" style={{ fontSize: 24 }}>
                      {p.title}
                    </Txt>
                    <Txt v="tiny" soft>
                      usulan {nameIn(circle, p.userId, meId)}
                    </Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Row gap={2}>
                      {p.votes.map((u) => {
                        const m = circle.members.find((x) => x.userId === u);
                        return <Avatar key={u} doodle={m?.doodle ?? 'tunas'} size={20} sealed />;
                      })}
                    </Row>
                    <Txt v="tiny" ink={chosen} soft={!chosen}>
                      {chosen ? 'pilihanmu' : 'pilih'}
                    </Txt>
                  </View>
                </Row>
              </Pressable>
            );
          })}
          <Txt v="tiny" soft center>
            {voters.size} dari {circle.active.length} sudah memilih · bab tertutup sendiri saat semua sudah memilih
          </Txt>
          {voters.size > 0 && voters.size < circle.active.length ? (
            <Button kind="ghost" title="tutup bab sekarang" onPress={closeNow} loading={busy === 'close'} style={{ minHeight: 40 }} />
          ) : null}
        </View>
      ) : (
        <Txt v="small" soft>
          Belum ada usulan. Judul pertama boleh dari siapa saja.
        </Txt>
      )}

      <Gap h={4} />
      {mine.length < 3 ? (
        <>
          <Field value={draft} onChangeText={setDraft} placeholder="usulkan judul bab…" maxLength={80} testID="proposal-input" />
          <Button title={`usulkan (${3 - mine.length} lagi)`} onPress={() => propose(draft)} disabled={!draft.trim()} loading={busy === 'propose'} testID="proposal-send" />
        </>
      ) : (
        <Txt v="tiny" soft center>
          Tiga usulanmu sudah masuk. Sekarang tinggal memilih.
        </Txt>
      )}

      {suggestions.length && mine.length < 3 ? (
        <View style={{ gap: 6 }}>
          <Txt v="label" ink soft>
            usulan dari halaman-halaman bulan ini
          </Txt>
          <Row style={{ flexWrap: 'wrap' }} gap={6}>
            {suggestions.map((s) => (
              <Pill key={s} onPress={() => setDraft(s)}>
                {s}
              </Pill>
            ))}
          </Row>
          <Txt v="tiny" soft>
            dihitung di perangkatmu, isinya tidak keluar dari HP ini
          </Txt>
        </View>
      ) : null}

      {aiAllowed(circle) && mine.length < 3 ? (
        aiOpen ? (
          <AiPanel circle={circle} month={month} meId={meId} texts={authoredTexts(opened, { authorId: meId })} onPick={(t) => setDraft(t)} onClose={() => setAiOpen(false)} />
        ) : (
          <Button kind="soft" title="minta usulan AI" icon="ui-ide" onPress={() => setAiOpen(true)} testID="ai-open" />
        )
      ) : null}

      {err ? (
        <Txt v="tiny" style={{ color: c.danger }}>
          {err}
        </Txt>
      ) : null}
    </Card>
  );
}

function AiPanel({
  circle,
  month,
  texts,
  onPick,
  onClose,
}: {
  circle: CircleView;
  month: string;
  meId: string;
  texts: { day: string; text: string }[];
  onPick: (t: string) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [titles, setTitles] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const list = texts.slice(-40);

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<AiChapterResult>(`/circles/${circle.id}/ai/chapter-titles`, { month, snippets: picked.map((i) => list[i]!.text.slice(0, 500)) });
      setTitles(r.titles);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: SPACE.sm, borderTopWidth: 1, borderColor: c.inkSoft, paddingTop: SPACE.sm }} testID="ai-panel">
      <Txt v="label" ink soft>
        usulan ai cloud
      </Txt>
      <Card tint={c.sticky.peach} style={{ padding: 12, borderRadius: 14 }}>
        <Txt v="small">{COPY.privacy.aiCloudWarning}</Txt>
        <Txt v="tiny" soft style={{ marginTop: 4 }}>
          Pilih sendiri potongan tulisanmu yang boleh dibaca AI. {COPY.privacy.aiOffers}
        </Txt>
      </Card>
      {list.length === 0 ? (
        <Txt v="small" soft>
          Belum ada tulisanmu bulan ini yang bisa dipilih.
        </Txt>
      ) : (
        list.map((t, i) => {
          const on = picked.includes(i);
          return (
            <Pressable
              key={i}
              onPress={() => setPicked((p) => (on ? p.filter((x) => x !== i) : [...p, i]))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              testID={`ai-snippet-${i}`}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 }}>
              <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: c.ink, backgroundColor: on ? c.ink : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                {on ? <Doodle id="ui-centang" size={14} color={c.onInk} /> : null}
              </View>
              <Txt v="small" style={{ flex: 1 }} numberOfLines={3}>
                {t.text}
              </Txt>
            </Pressable>
          );
        })
      )}
      {titles ? (
        titles.length ? (
          <Row style={{ flexWrap: 'wrap' }} gap={6}>
            {titles.map((t) => (
              <Pill key={t} onPress={() => onPick(t)}>
                {t}
              </Pill>
            ))}
          </Row>
        ) : (
          <Txt v="small" soft>
            AI belum punya usulan kali ini. Usulan kalian sendiri biasanya lebih tepat.
          </Txt>
        )
      ) : null}
      {err ? (
        <Txt v="tiny" style={{ color: c.danger }}>
          {err}
        </Txt>
      ) : null}
      <Button title={picked.length ? `kirim ${picked.length} potongan ke AI` : 'pilih potongan dulu'} onPress={send} disabled={!picked.length} loading={busy} testID="ai-send" />
      <Button kind="ghost" title="tidak jadi" onPress={onClose} style={{ minHeight: 40 }} />
    </View>
  );
}
