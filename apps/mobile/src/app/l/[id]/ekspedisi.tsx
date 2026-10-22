/**
 * Ekspedisi: misi kooperatif tujuh hari. Tidak ada yang kalah; satu Drop per
 * anggota per hari sudah cukup. Selesai bersama = satu halaman bergambar di
 * kitab dan sebuah kompas di Lemari Benda.
 */
import { addDays, diffDays, EXPEDITIONS, type Expedition, type ExpeditionWire, formatDayLong, kindToFit } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { errorText, nameIn } from '@/features/board/shared';
import { api } from '@/lib/api';
import { type CircleView, useCircle, useMe, useToday } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, ErrorNote, Gap, Growing, Header, Row, Screen, Section, Sticky, Txt } from '@/ui/kit';
import { mix, SPACE, useTheme } from '@/ui/theme';

const defOf = (code: string) => EXPEDITIONS.find((e) => e.id === code);

export default function Ekspedisi() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const q = useQuery({ queryKey: ['expeditions', id], queryFn: () => api.get<ExpeditionWire[]>(`/circles/${id}/expeditions`), enabled: !!circle });
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!circle) return <Screen header={<Header title="Ekspedisi" />}><Growing /></Screen>;
  const list = q.data ?? [];
  const running = list.find((e) => !e.completedAt && e.startDay <= today && e.endDay >= today);
  const upcoming = list.find((e) => !e.completedAt && e.startDay > today);
  const done = list.filter((e) => e.completedAt);
  const faded = list.filter((e) => !e.completedAt && e.endDay < today);
  const fit = kindToFit(circle.kind);
  const options = EXPEDITIONS.filter((e) => e.fit.includes('semua') || e.fit.includes(fit));
  const blocked = !!running || !!upcoming || circle.status !== 'active';

  const start = async (code: string) => {
    setBusy(code);
    setErr(null);
    try {
      await api.post(`/circles/${id}/expeditions`, { code, startDay: today });
      setOpenCode(null);
      await qc.invalidateQueries({ queryKey: ['expeditions', id] });
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen header={<Header title="Ekspedisi" subtitle={circle.name} />}>
      <Txt v="small" soft center>
        Misi bersama tujuh hari. Satu Drop per orang per hari sudah cukup, dan tidak ada yang kalah.
      </Txt>
      <Gap h={SPACE.md} />
      {q.error ? <ErrorNote error={q.error} onRetry={() => q.refetch()} /> : null}
      {q.isLoading ? <Growing /> : null}

      {running ? <Running e={running} circle={circle} meId={me.user.id} today={today} /> : null}
      {upcoming ? (
        <Card style={{ gap: 6 }}>
          <Txt v="small">
            {defOf(upcoming.code)?.name} dimulai {formatDayLong(upcoming.startDay)}.
          </Txt>
        </Card>
      ) : null}

      {done.length ? (
        <Section title="halaman bergambar">
          <View style={{ gap: SPACE.sm }}>
            {done.map((e) => {
              const d = defOf(e.code);
              return (
                <Sticky key={e.id} color="green" tilt={-0.6} pin={false}>
                  <Row testID={`expedition-done-${e.id}`}>
                    <Doodle id={d?.doodle ?? 'kompas'} size={40} />
                    <View style={{ flex: 1 }}>
                      <Txt v="hand" style={{ fontSize: 24 }}>
                        {d?.rewardPageTitle ?? 'Halaman Ekspedisi'}
                      </Txt>
                      <Txt v="tiny">
                        {d?.name} · {formatDayLong(e.startDay, false)} – {formatDayLong(e.endDay)}
                      </Txt>
                    </View>
                    <Pressable onPress={() => router.push(`/l/${id}/lemari`)} accessibilityLabel="kompas di Lemari Benda">
                      <Doodle id="kompas" size={30} />
                    </Pressable>
                  </Row>
                </Sticky>
              );
            })}
          </View>
        </Section>
      ) : null}

      {faded.length ? (
        <Section title="yang tertinggal di kabut">
          {faded.map((e) => (
            <Row key={e.id} style={{ paddingVertical: 6 }}>
              <Doodle id="kabut" size={24} color={c.fog} />
              <Txt v="small" soft style={{ flex: 1 }}>
                {defOf(e.code)?.name} · {formatDayLong(e.startDay, false)}. Tidak apa-apa, jalannya masih bisa dicoba lagi.
              </Txt>
            </Row>
          ))}
        </Section>
      ) : null}

      <Section title={running ? 'ekspedisi lain untuk nanti' : 'pilih ekspedisi'}>
        <View style={{ gap: SPACE.sm }}>
          {options.map((e) => (
            <Option key={e.id} e={e} open={openCode === e.id} onToggle={() => setOpenCode(openCode === e.id ? null : e.id)} blocked={blocked} busy={busy === e.id} onStart={() => start(e.id)} />
          ))}
        </View>
        {err ? (
          <Txt v="tiny" style={{ color: c.danger, marginTop: SPACE.sm }}>
            {err}
          </Txt>
        ) : null}
      </Section>
    </Screen>
  );
}

function Running({ e, circle, meId, today }: { e: ExpeditionWire; circle: CircleView; meId: string; today: string }) {
  const { c } = useTheme();
  const d = defOf(e.code);
  const n = diffDays(today, e.startDay) + 1;
  const prompt = d?.days.find((x) => x.day === n)?.prompt ?? '';
  const iDid = (e.progress[n] ?? []).includes(meId);
  const need = Math.max(1, Math.ceil(circle.active.length / 2));
  return (
    <Card style={{ gap: SPACE.sm, borderColor: c.ink }} testID="expedition-running">
      <Row>
        <Doodle id={d?.doodle ?? 'kompas'} size={40} />
        <View style={{ flex: 1 }}>
          <Txt v="label" ink soft>
            sedang berjalan · hari ke-{n} dari 7
          </Txt>
          <Txt v="h2" ink>
            {d?.name ?? e.code}
          </Txt>
        </View>
      </Row>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {Array.from({ length: 7 }, (_, i) => {
          const k = i + 1;
          const who = e.progress[k] ?? [];
          const isToday = k === n;
          const past = k < n;
          const enough = who.length >= need;
          return (
            <View key={k} style={{ width: '13.2%', alignItems: 'center', gap: 4 }} testID={`expedition-day-${k}`}>
              <View
                style={{
                  width: '100%',
                  aspectRatio: 0.7,
                  borderRadius: 10,
                  borderWidth: isToday ? 2 : 1,
                  borderColor: isToday ? c.ink : enough ? c.inkSoft : c.cardEdge,
                  backgroundColor: enough ? mix(c.card, c.pill, 0.7) : c.paper,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  paddingVertical: 4,
                }}>
                {who.length ? (
                  who.slice(0, 3).map((u) => <Avatar key={u} doodle={circle.members.find((m) => m.userId === u)?.doodle ?? 'tunas'} size={16} sealed />)
                ) : past ? (
                  <Doodle id="kabut" size={18} color={c.fog} />
                ) : (
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.inkSoft }} />
                )}
              </View>
              <Txt v="tiny" ink={isToday} soft={!isToday}>
                {k}
              </Txt>
            </View>
          );
        })}
      </View>
      <Sticky color="blue" tilt={0.6} pin={false}>
        <Txt v="tiny">tugas hari ke-{n}</Txt>
        <Txt v="small">{prompt}</Txt>
      </Sticky>
      {(e.progress[n] ?? []).length ? (
        <Txt v="tiny" soft center>
          sudah dikerjakan: {(e.progress[n] ?? []).map((u) => nameIn(circle, u, meId)).join(', ')}
        </Txt>
      ) : null}
      <Button
        title={iDid ? 'tambah satu lagi' : `drop untuk hari ke-${n}`}
        kind={iDid ? 'soft' : 'primary'}
        icon="kompas"
        onPress={() => router.push({ pathname: '/drop', params: { prompt, expeditionId: e.id, expeditionDay: String(n), circleId: circle.id } })}
        testID="expedition-drop"
      />
      <Txt v="tiny" soft center>
        selesai bersama bila setiap hari diisi minimal {need} orang · berakhir {formatDayLong(addDays(e.startDay, 6))}
      </Txt>
    </Card>
  );
}

function Option({ e, open, onToggle, blocked, busy, onStart }: { e: Expedition; open: boolean; onToggle: () => void; blocked: boolean; busy: boolean; onStart: () => void }) {
  return (
    <Card onPress={onToggle} testID={`expedition-${e.id}`} style={{ gap: 6 }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Doodle id={e.doodle} size={32} />
        <View style={{ flex: 1 }}>
          <Txt ink>{e.name}</Txt>
          <Txt v="tiny" soft>
            {e.tagline}
          </Txt>
        </View>
      </Row>
      {open ? (
        <View style={{ gap: 4, marginTop: 4 }}>
          {e.days.map((d) => (
            <Row key={d.day} style={{ alignItems: 'flex-start' }} gap={8}>
              <Txt v="tiny" ink style={{ width: 18 }}>
                {d.day}
              </Txt>
              <Txt v="small" style={{ flex: 1 }}>
                {d.prompt}
              </Txt>
            </Row>
          ))}
          <Txt v="tiny" soft style={{ marginTop: 4 }}>
            hadiah: {e.rewardPageTitle}
          </Txt>
          <Button title={blocked ? 'selesaikan ekspedisi yang berjalan dulu' : 'mulai hari ini'} onPress={onStart} disabled={blocked} loading={busy} style={{ marginTop: 6 }} testID={`expedition-start-${e.id}`} />
        </View>
      ) : null}
    </Card>
  );
}
