/**
 * Musim Bersama (Ramadan, mudik, tujuhbelasan, akhir tahun) dan Kapsul
 * Indonesia: peta mood anonim per provinsi. Yang dikirim hanya hari, provinsi,
 * dan warna — tanpa nama, tanpa isi.
 */
import {
  CITIES,
  diffDays,
  eachDay,
  formatDayLong,
  getCity,
  type Me,
  MOOD_CODES,
  MOODS,
  type MoodCode,
  PROVINCES,
  type PulseDay,
  SEASONS,
  type SeasonWindow,
} from '@sehari/core';
import { gardenDoodleFor } from '@sehari/doodles';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { useMe, useMyDays, useToday } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, ErrorNote, Gap, Growing, Header, Pill, Row, Screen, Section, Sticky, Toggle, Txt } from '@/ui/kit';
import { MoodPicker } from '@/ui/Mood';
import { FONTS, RADIUS, SPACE, useTheme } from '@/ui/theme';

const content = (code: SeasonWindow['code']) => SEASONS.find((s) => s.code === code);

function rangeLabel(w: SeasonWindow): string {
  const sameYear = w.start.slice(0, 4) === w.end.slice(0, 4);
  return `${formatDayLong(w.start, !sameYear)} – ${formatDayLong(w.end)}`;
}

/** Titik tengah kasar tiap provinsi dari daftar kota (hanya untuk gambar). */
const CENTROIDS: Record<string, { lat: number; lon: number }> = (() => {
  const acc: Record<string, { lat: number; lon: number; n: number }> = {};
  for (const c of CITIES) {
    if (c.country !== 'ID') continue;
    const e = (acc[c.province] ??= { lat: 0, lon: 0, n: 0 });
    e.lat += c.lat;
    e.lon += c.lon;
    e.n++;
  }
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, { lat: v.lat / v.n, lon: v.lon / v.n }]));
})();

function dominant(moods: Record<string, number>): MoodCode | undefined {
  return (Object.entries(moods).sort((a, b) => b[1] - a[1])[0]?.[0] as MoodCode | undefined) ?? undefined;
}

export default function Seasons() {
  const me = useMe();
  const { setMe } = useSession();
  const { c } = useTheme();
  const today = useToday();
  const year = Number(today.slice(0, 4));

  const seasons = useQuery({
    queryKey: ['seasons', year],
    queryFn: async () => {
      const [a, b] = await Promise.all([api.get<SeasonWindow[]>(`/seasons?year=${year}`), api.get<SeasonWindow[]>(`/seasons?year=${year + 1}`)]);
      return [...a, ...b];
    },
  });
  const myDays = useMyDays(`${year - 1}-12-01`, today);
  const sealed = useMemo(() => new Set((myDays.data ?? []).filter((d) => d.sealedAt).map((d) => d.day)), [myDays.data]);

  const windows = seasons.data ?? [];
  const active = windows.find((w) => w.start <= today && today <= w.end);
  const upcoming = windows.filter((w) => w.start > today).slice(0, 3);
  const past = windows.filter((w) => w.end < today && w.start.startsWith(String(year))).reverse();

  return (
    <Screen header={<Header title="musim bersama" subtitle="& kapsul indonesia" />}>
      {seasons.isLoading ? (
        <Growing />
      ) : seasons.error ? (
        <ErrorNote error={seasons.error} onRetry={() => seasons.refetch()} />
      ) : (
        <>
          {active ? <ActiveSeason w={active} today={today} sealed={sealed} owner={me.user.id} /> : null}
          {!active ? (
            <Card tint={c.paper} style={{ marginTop: SPACE.sm, borderStyle: 'dashed', borderColor: c.inkSoft, gap: 6 }}>
              <Row gap={10}>
                <Doodle id="kabut" size={30} />
                <Txt v="small" style={{ flex: 1 }}>
                  Sedang tidak ada musim nasional. Hari-hari biasa juga musim, hanya saja tanpa nama.
                </Txt>
              </Row>
            </Card>
          ) : null}

          {upcoming.length ? (
            <Section title="akan datang">
              <View style={{ gap: SPACE.sm }}>
                {upcoming.map((w) => {
                  const s = content(w.code);
                  return (
                    <Card key={`${w.code}${w.start}`} testID={`season-${w.code}`}>
                      <Row gap={14} style={{ alignItems: 'flex-start' }}>
                        <Doodle id={s?.doodle ?? 'tunas'} size={40} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Row style={{ justifyContent: 'space-between' }}>
                            <Txt v="h2" ink style={{ flexShrink: 1 }}>
                              {s?.name}
                            </Txt>
                            <Txt v="tiny" ink soft>
                              {diffDays(w.start, today)} hari lagi
                            </Txt>
                          </Row>
                          <Txt v="small">{s?.tagline}</Txt>
                          <Txt v="tiny" soft>
                            {rangeLabel(w)} · {eachDay(w.start, w.end).length} hari
                          </Txt>
                        </View>
                      </Row>
                    </Card>
                  );
                })}
              </View>
              <Txt v="tiny" soft style={{ marginTop: 6 }}>
                Tanggal Ramadan dan Lebaran menyesuaikan hasil sidang isbat.
              </Txt>
            </Section>
          ) : null}

          {past.length ? (
            <Section title={`sudah lewat di ${year}`}>
              <Card style={{ paddingVertical: SPACE.sm }}>
                {past.map((w, i) => {
                  const s = content(w.code);
                  const days = eachDay(w.start, w.end);
                  const mine = days.filter((d) => sealed.has(d)).length;
                  return (
                    <Row key={`${w.code}${w.start}`} gap={12} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.cardEdge }}>
                      <Doodle id={s?.doodle ?? 'tunas'} size={26} opacity={0.7} />
                      <View style={{ flex: 1 }}>
                        <Txt v="small">{s?.name}</Txt>
                        <Txt v="tiny" soft>
                          {rangeLabel(w)}
                        </Txt>
                      </View>
                      <Txt v="tiny" ink soft>
                        {mine ? `${mine}/${days.length} hari tersegel` : 'di kabut'}
                      </Txt>
                    </Row>
                  );
                })}
              </Card>
            </Section>
          ) : null}
        </>
      )}

      <PulseSection me={me} setMe={setMe} today={today} />
      <Gap h={SPACE.xl} />
    </Screen>
  );
}

function ActiveSeason({ w, today, sealed, owner }: { w: SeasonWindow; today: string; sealed: Set<string>; owner: string }) {
  const { c } = useTheme();
  const s = content(w.code);
  const days = eachDay(w.start, w.end);
  const n = diffDays(today, w.start) + 1;
  const prompt = s?.prompts.find((p) => p.day === n)?.text ?? s?.prompts[s.prompts.length - 1]?.text;
  const mine = days.filter((d) => d <= today && sealed.has(d)).length;
  const sofar = days.filter((d) => d <= today).length;
  const cell = days.length > 20 ? 22 : 30;
  return (
    <View style={{ marginTop: SPACE.sm }} testID="season-active">
      <Sticky color="yellow" tilt={-0.8}>
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <Doodle id={s?.doodle ?? 'tunas'} size={52} />
          <View style={{ flex: 1 }}>
            <Txt v="label" style={{ color: c.text, opacity: 0.7 }}>
              sedang berjalan · hari ke-{n} dari {days.length}
            </Txt>
            <Txt v="hand" style={{ fontSize: 32, lineHeight: 34, color: c.text }}>
              {s?.name}
            </Txt>
            <Txt v="small" style={{ color: c.text, opacity: 0.8 }}>
              {s?.tagline}
            </Txt>
          </View>
        </Row>
        {prompt ? (
          <View style={{ marginTop: SPACE.md, padding: SPACE.md, backgroundColor: c.card, borderRadius: RADIUS.md, gap: SPACE.sm }}>
            <Txt v="tiny" soft>
              pertanyaan musim hari ini
            </Txt>
            <Txt testID="season-prompt">{prompt}</Txt>
            <Button title="jatuhkan jawabannya" icon="ui-tambah" onPress={() => router.push({ pathname: '/drop', params: { prompt } })} testID="season-drop" />
          </View>
        ) : null}
        <View style={{ marginTop: SPACE.md }}>
          <Row style={{ flexWrap: 'wrap' }} gap={0}>
            {days.map((d) => (
              <View key={d} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
                {sealed.has(d) ? (
                  <Doodle id={gardenDoodleFor(`${owner}:${d}`).id} size={cell * 0.9} />
                ) : (
                  <View
                    style={{
                      width: d === today ? 8 : 5,
                      height: d === today ? 8 : 5,
                      borderRadius: 4,
                      backgroundColor: d < today ? c.fog : d === today ? c.ink : 'transparent',
                      borderWidth: d > today ? 1 : 0,
                      borderColor: c.inkSoft,
                    }}
                  />
                )}
              </View>
            ))}
          </Row>
          <Txt v="tiny" style={{ color: c.text, opacity: 0.75, marginTop: 6 }}>
            {mine ? `${mine} dari ${sofar} hari musim ini sudah kamu segel.` : 'Belum ada hari musim ini yang tersegel. Satu hal kecil pun cukup.'}
          </Txt>
        </View>
      </Sticky>
    </View>
  );
}

function PulseSection({ me, setMe, today }: { me: Me; setMe: (m: Me) => void; today: string }) {
  const { c } = useTheme();
  const on = me.user.settings.moodPulse;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const defaultProvince = (() => {
    const p = getCity(me.user.cityId)?.province;
    return p && PROVINCES.includes(p) ? p : undefined;
  })();
  const [province, setProvince] = useState<string | undefined>(defaultProvince);
  const [picking, setPicking] = useState(false);
  const [mood, setMood] = useState<MoodCode | undefined>();
  const [sent, setSent] = useState<null | 'counted' | 'already'>(null);
  const [sending, setSending] = useState(false);
  const pulse = useQuery({ queryKey: ['pulse', today], queryFn: () => api.get<PulseDay>(`/pulse?day=${today}`) });

  const toggle = async (v: boolean) => {
    setSaving(true);
    setErr(null);
    try {
      setMe(await api.patch<Me>('/me', { settings: { moodPulse: v } }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const contribute = async () => {
    if (!mood || !province) return;
    setSending(true);
    setErr(null);
    try {
      const r = await api.post<{ ok: boolean; counted: boolean }>('/pulse', { day: today, province, mood });
      setSent(r.counted ? 'counted' : 'already');
      void pulse.refetch();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Section title="kapsul indonesia">
      <Card style={{ gap: SPACE.sm }}>
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <Doodle id="peta" size={36} />
          <Txt v="small" style={{ flex: 1 }}>
            Peta warna hari ini dari seluruh Indonesia. Kalau ikut, yang terkirim hanya tiga hal: tanggal, provinsi, dan satu warna mood. Tanpa nama, tanpa isi kapsul.
          </Txt>
        </Row>
        <Toggle label="ikut menyumbang warna" value={on} onChange={toggle} hint={saving ? 'menyimpan…' : 'Bisa dimatikan kapan saja.'} testID="pulse-toggle" />
        <View style={{ gap: 4 }}>
          {[
            'Hitungan ganda dicegah dengan kode harian acak (HMAC), bukan dengan id-mu.',
            'Provinsi yang sumbangannya masih sedikit tidak ditampilkan, supaya tidak ada yang bisa ditebak.',
            'Data per hari dihapus dari pencegah ganda setelah lewat.',
          ].map((t) => (
            <Row key={t} gap={8} style={{ alignItems: 'flex-start' }}>
              <Doodle id="ui-gembok" size={14} opacity={0.7} />
              <Txt v="tiny" soft style={{ flex: 1 }}>
                {t}
              </Txt>
            </Row>
          ))}
        </View>
      </Card>

      {on ? (
        <Card style={{ marginTop: SPACE.sm, gap: SPACE.sm }} testID="pulse-contribute">
          <Txt v="label" ink soft>
            warna hari ini
          </Txt>
          {sent ? (
            <Row gap={10}>
              <Doodle id="ui-centang" size={22} />
              <Txt v="small" style={{ flex: 1 }}>
                {sent === 'counted' ? 'Warnamu sudah dititipkan. Terima kasih sudah menjadi satu titik di peta.' : 'Hari ini warnamu sudah tercatat sebelumnya. Satu warna sehari, cukup.'}
              </Txt>
            </Row>
          ) : (
            <>
              <MoodPicker value={mood} onChange={setMood} compact />
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                <Txt v="small">dari</Txt>
                <Pill active onPress={() => setPicking((p) => !p)} testID="pulse-province">
                  {province ?? 'pilih provinsi'}
                </Pill>
              </Row>
              {picking ? (
                <Row gap={6} style={{ flexWrap: 'wrap' }}>
                  {PROVINCES.map((p) => (
                    <Pill
                      key={p}
                      active={p === province}
                      onPress={() => {
                        setProvince(p);
                        setPicking(false);
                      }}>
                      {p}
                    </Pill>
                  ))}
                </Row>
              ) : null}
              <Button title="titipkan warna" onPress={contribute} disabled={!mood || !province} loading={sending} testID="pulse-send" />
            </>
          )}
        </Card>
      ) : null}
      {err ? (
        <Txt v="small" ink style={{ marginTop: SPACE.sm }}>
          {err}
        </Txt>
      ) : null}

      <Gap h={SPACE.md} />
      {pulse.isLoading ? <Growing /> : pulse.data ? <PulseMap data={pulse.data} /> : pulse.error ? <ErrorNote error={pulse.error} onRetry={() => pulse.refetch()} /> : null}
    </Section>
  );
}

function PulseMap({ data }: { data: PulseDay }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const H = 150;
  const total = data.provinces.reduce((a, p) => a + p.total, 0);
  const max = Math.max(1, ...data.provinces.map((p) => p.total));
  const px = (lon: number) => ((lon - 94.5) / (141.5 - 94.5)) * w;
  const py = (lat: number) => ((6.5 - lat) / 18) * H;

  if (!data.provinces.length) {
    return (
      <Card tint={c.paper} style={{ borderStyle: 'dashed', borderColor: c.inkSoft, alignItems: 'center', gap: SPACE.sm }} testID="pulse-empty">
        <Doodle id="kabut" size={44} />
        <Txt v="small" center>
          Peta hari ini masih berkabut.
        </Txt>
        <Txt v="tiny" soft center>
          Sebuah provinsi baru muncul setelah ada minimal {data.threshold} warna dari sana, supaya tidak ada satu orang pun yang bisa ditebak. Datang lagi nanti malam.
        </Txt>
      </Card>
    );
  }

  return (
    <View testID="pulse-map">
      <Txt v="tiny" soft style={{ marginBottom: 6 }}>
        {formatDayLong(data.day)} · {total} warna dari {data.provinces.length} provinsi
      </Txt>
      <View
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        style={{ height: H, borderRadius: RADIUS.md, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardEdge, marginBottom: SPACE.md }}>
        {w > 0 &&
          data.provinces.map((p) => {
            const at = CENTROIDS[p.province];
            if (!at) return null;
            const m = dominant(p.moods);
            const r = 10 + Math.round((p.total / max) * 16);
            return (
              <View
                key={p.province}
                style={{ position: 'absolute', left: px(at.lon) - r / 2, top: py(at.lat) - r / 2, width: r, height: r, borderRadius: r / 2, backgroundColor: m ? MOODS[m].color : c.fog, opacity: 0.9 }}
              />
            );
          })}
      </View>
      <View style={{ gap: 10 }}>
        {data.provinces.map((p) => (
          <View key={p.province} testID={`pulse-${p.province}`}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <Txt v="small">{p.province}</Txt>
              <Txt v="tiny" soft>
                {p.total} warna
              </Txt>
            </Row>
            <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: c.pill }}>
              {MOOD_CODES.filter((m) => p.moods[m]).map((m) => (
                <View key={m} style={{ flex: p.moods[m]!, backgroundColor: MOODS[m].color }} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <Row gap={10} style={{ flexWrap: 'wrap', marginTop: SPACE.md }}>
        {MOOD_CODES.map((m) => (
          <Row key={m} gap={4}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: MOODS[m].color }} />
            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSoft }}>{MOODS[m].label}</Text>
          </Row>
        ))}
      </Row>
    </View>
  );
}
