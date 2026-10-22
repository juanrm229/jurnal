/**
 * Langit Lingkaran: setiap hari yang tersegel bersama menjadi bintang. Hari-hari
 * penting dihubungkan jadi rasi dan diberi nama ("Rasi Pindahan Kos").
 * Kanvasnya selalu malam, bahkan di tema terang.
 */
import { type ConstellationWire, dayOfYear, daysInYear, eachDay, formatDayLong, monthName } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { calendarMap, coverFor, errorText, nameIn, unit, YearSwitch } from '@/features/board/shared';
import { api } from '@/lib/api';
import { openCircleText, sealCircleText, useCalendar, useCircle, useMe, useToday } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, ErrorNote, Field, Gap, Growing, Header, IconButton, Pill, Row, Screen, Section, Txt } from '@/ui/kit';
import { DARK, FONTS, mix, SPACE, useTheme } from '@/ui/theme';

interface Star {
  day: string;
  x: number;
  y: number;
  r: number;
  bright: boolean;
}

/** Spiral dua setengah putaran dari tengah ke tepi, dengan sedikit getaran per hari. */
function placeStar(circleId: string, day: string, size: number, offset = 0): { x: number; y: number } {
  const year = Number(day.slice(0, 4));
  const t = (dayOfYear(day) - 0.5) / daysInYear(year);
  const turns = 2.6;
  const angle = t * Math.PI * 2 * turns - Math.PI / 2;
  const rMax = size * 0.44;
  const rMin = size * 0.07;
  const jitter = offset === 0;
  const jr = jitter ? (unit(`${circleId}:${day}:r`) - 0.5) * size * 0.05 : 0;
  const ja = jitter ? (unit(`${circleId}:${day}:a`) - 0.5) * 0.1 : 0;
  const rad = rMin + (rMax - rMin) * Math.sqrt(t) + jr + offset;
  return { x: size / 2 + Math.cos(angle + ja) * rad, y: size / 2 + Math.sin(angle + ja) * rad };
}

export default function Langit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const cal = useCalendar(id, `${year}-01-01`, `${year}-12-31`);
  const cons = useQuery({ queryKey: ['constellations', id], queryFn: () => api.get<ConstellationWire[]>(`/circles/${id}/constellations`), enabled: !!circle });
  const [building, setBuilding] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState(0);

  const stars = useMemo<Star[]>(() => {
    if (!circle || !size) return [];
    const map = calendarMap(cal.data);
    const out: Star[] = [];
    for (const day of eachDay(`${year}-01-01`, `${year}-12-31`)) {
      if (day > today) break;
      const cv = coverFor(circle, day, map.get(day));
      if (!cv.together && cv.sealed === 0) continue;
      const p = placeStar(circle.id, day, size);
      out.push({ day, ...p, r: cv.together ? 1.5 + cv.fraction * 0.9 + unit(`${day}:s`) * 0.9 : 0.9, bright: cv.together });
    }
    return out;
  }, [circle, cal.data, year, size, today]);

  // Debu bintang yang tidak berarti apa-apa, hanya supaya langitnya tidak kosong.
  const dust = useMemo(() => {
    if (!size || !circle) return [];
    return Array.from({ length: 70 }, (_, i) => ({ x: unit(`${circle.id}:dx${i}`) * size, y: unit(`${circle.id}:dy${i}`) * size, r: 0.4 + unit(`${circle.id}:dr${i}`) * 0.7 }));
  }, [size, circle?.id]);

  const named = useMemo(
    () =>
      (cons.data ?? []).map((k) => ({
        ...k,
        name: circle ? openCircleText(circle, k.nameEnc, 'rasi tanpa nama') : '…',
      })),
    [cons.data, circle],
  );

  if (!circle) return <Screen header={<Header title="Langit" />}><Growing /></Screen>;
  const minYear = Number(circle.createdDay.slice(0, 4));
  const bright = stars.filter((s) => s.bright);
  const byDay = new Map(stars.map((s) => [s.day, s]));
  const inYear = named.filter((k) => k.days.filter((d) => byDay.has(d) || d.startsWith(`${year}-`)).length >= 2);

  const toggle = (day: string) => {
    setErr(null);
    setSel((s) => (s.includes(day) ? s.filter((d) => d !== day) : s.length >= 60 ? s : [...s, day].sort()));
  };

  const save = async () => {
    if (sel.length < 2 || !name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/circles/${id}/constellations`, { nameEnc: sealCircleText(circle, name.trim()), days: sel });
      setSel([]);
      setName('');
      setBuilding(false);
      await qc.invalidateQueries({ queryKey: ['constellations', id] });
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (cid: string) => {
    try {
      await api.del(`/circles/${id}/constellations/${cid}`);
      await qc.invalidateQueries({ queryKey: ['constellations', id] });
    } catch (e) {
      setErr(errorText(e));
    }
  };

  const night = { bg: mix(DARK.paper, DARK.pill, 0.55), star: DARK.text, starSoft: DARK.ink, line: DARK.ink, label: DARK.textSoft, sel: DARK.sticky.yellow };
  const starAt = (d: string) => byDay.get(d) ?? (size ? { day: d, ...placeStar(circle.id, d, size), r: 1, bright: false } : undefined);

  return (
    <Screen header={<Header title="Langit Lingkaran" subtitle={circle.name} />}>
      <YearSwitch year={year} min={minYear} max={thisYear} onChange={(y) => { setYear(y); setSel([]); }} testID="langit-year" />
      <Txt v="small" soft center>
        {bright.length ? (
          <>
            <Txt v="small" ink>{bright.length}</Txt> bintang dari hari yang disegel bersama
          </>
        ) : (
          'langit tahun ini masih menunggu bintang pertamanya'
        )}
      </Txt>
      <Gap h={SPACE.md} />

      <View
        testID="langit-sky"
        onLayout={(e: LayoutChangeEvent) => setSize(Math.round(e.nativeEvent.layout.width))}
        style={{ width: '100%', aspectRatio: 1, borderRadius: 28, backgroundColor: night.bg, overflow: 'hidden', borderWidth: 1, borderColor: DARK.cardEdge }}>
        {size > 0 && !cal.isLoading ? (
          <>
            <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
              {dust.map((d, i) => (
                <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={night.label} opacity={0.35} />
              ))}
              {/* Penanda bulan di jalur spiral. */}
              {Array.from({ length: 12 }, (_, m) => {
                const p = placeStar('label', `${year}-${String(m + 1).padStart(2, '0')}-08`, size, size * 0.045);
                return (
                  <SvgText key={m} x={p.x} y={p.y} fill={night.label} opacity={0.45} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">
                    {monthName(m + 1, true).toLowerCase()}
                  </SvgText>
                );
              })}
              {inYear.map((k) => {
                const pts = k.days.map(starAt).filter((p): p is Star => !!p && p.day.startsWith(`${year}-`));
                if (pts.length < 2) return null;
                const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
                const cy = Math.min(...pts.map((p) => p.y)) - 10;
                return <SvgGroupLine key={k.id} pts={pts} color={night.line} label={k.name} lx={cx} ly={Math.max(12, cy)} labelColor={night.star} />;
              })}
              {sel.length > 1 ? (
                <Polyline points={sel.map(starAt).filter(Boolean).map((p) => `${p!.x},${p!.y}`).join(' ')} stroke={night.sel} strokeWidth={1.2} strokeDasharray="3 4" fill="none" />
              ) : null}
              {stars.map((s) => (
                <Circle key={s.day} cx={s.x} cy={s.y} r={s.r} fill={s.bright ? night.star : night.starSoft} opacity={s.bright ? 1 : 0.6} />
              ))}
              {stars
                .filter((s) => s.bright)
                .map((s) => (
                  <Circle key={`g${s.day}`} cx={s.x} cy={s.y} r={s.r * 2.2} fill={night.starSoft} opacity={0.1} />
                ))}
              {sel.map((d) => {
                const p = starAt(d);
                return p ? <Circle key={`s${d}`} cx={p.x} cy={p.y} r={7} stroke={night.sel} strokeWidth={1.5} fill="none" /> : null;
              })}
              {year === thisYear ? (() => {
                const p = placeStar(circle.id, today, size);
                return <Circle cx={p.x} cy={p.y} r={5} stroke={night.label} strokeWidth={1} strokeDasharray="2 2" fill="none" />;
              })() : null}
            </Svg>
            {bright.map((s) => (
              <Pressable
                key={s.day}
                testID={`star-${s.day}`}
                accessibilityRole="button"
                accessibilityLabel={`bintang ${formatDayLong(s.day)}`}
                onPress={() => (building ? toggle(s.day) : router.push(`/l/${id}/hari/${s.day}`))}
                hitSlop={4}
                style={{ position: 'absolute', left: s.x - 12, top: s.y - 12, width: 24, height: 24, borderRadius: 12 }}
              />
            ))}
            {bright.length === 0 ? (
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: SPACE.lg, alignItems: 'center', gap: 6 }}>
                <Doodle id="bulan" size={36} color={DARK.ink} />
                <Txt v="tiny" center style={{ color: night.label, paddingHorizontal: SPACE.lg }}>
                  setiap hari yang kalian segel bersama akan menyala di sini
                </Txt>
              </View>
            ) : null}
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Txt v="tiny" style={{ color: night.label }}>
              menunggu malam…
            </Txt>
          </View>
        )}
      </View>
      {cal.error ? <ErrorNote error={cal.error} onRetry={() => cal.refetch()} /> : null}

      <Gap h={SPACE.md} />
      {building ? (
        <Card style={{ gap: SPACE.sm }} testID="rasi-builder">
          <Txt v="h2" ink>
            buat rasi
          </Txt>
          <Txt v="small" soft>
            Ketuk bintang-bintang yang ingin dihubungkan (2 sampai 60 hari), lalu beri nama.
          </Txt>
          <Txt v="small" ink>
            {sel.length ? `${sel.length} bintang dipilih` : 'belum ada bintang dipilih'}
          </Txt>
          {sel.length ? (
            <Row style={{ flexWrap: 'wrap' }} gap={6}>
              {sel.map((d) => (
                <Pill key={d} onPress={() => toggle(d)}>
                  {formatDayLong(d, false)}
                </Pill>
              ))}
            </Row>
          ) : null}
          <Field value={name} onChangeText={setName} placeholder="misalnya: Rasi Pindahan Kos" maxLength={60} testID="rasi-name" />
          {err ? (
            <Txt v="tiny" style={{ color: c.danger }}>
              {err}
            </Txt>
          ) : null}
          <Button title="simpan rasi" onPress={save} disabled={sel.length < 2 || !name.trim()} loading={busy} testID="rasi-save" />
          <Button title="batal" kind="ghost" onPress={() => { setBuilding(false); setSel([]); }} />
        </Card>
      ) : (
        <Button
          title="buat rasi"
          icon="ui-bintang-rasi"
          kind={bright.length >= 2 ? 'primary' : 'soft'}
          disabled={bright.length < 2}
          onPress={() => setBuilding(true)}
          testID="rasi-start"
        />
      )}
      {!building && bright.length < 2 ? (
        <Txt v="tiny" soft center style={{ marginTop: 6 }}>
          rasi butuh minimal dua bintang. pelan-pelan saja, langitnya tidak ke mana-mana.
        </Txt>
      ) : null}

      <Section title="rasi kalian">
        {cons.isLoading ? (
          <Growing />
        ) : named.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 6 }}>
            <Doodle id="ui-bintang-rasi" size={36} />
            <Txt v="small" soft center>
              Belum ada rasi. Hubungkan hari-hari penting: pindahan, perjalanan, atau malam bertengkar lalu baikan.
            </Txt>
          </Card>
        ) : (
          <View style={{ gap: SPACE.sm }}>
            {named.map((k) => (
              <Card key={k.id} style={{ paddingVertical: 12 }}>
                <Row>
                  <Doodle id="ui-bintang-rasi" size={26} />
                  <View style={{ flex: 1 }}>
                    <Txt ink>{k.name}</Txt>
                    <Txt v="tiny" soft>
                      {k.days.length} bintang · {formatDayLong(k.days[0]!, false)} – {formatDayLong(k.days[k.days.length - 1]!)} · dari {nameIn(circle, k.createdBy, me.user.id)}
                    </Txt>
                  </View>
                  {k.createdBy === me.user.id ? <IconButton icon="ui-hapus" label="hapus rasi" size={20} onPress={() => remove(k.id)} testID={`rasi-del-${k.id}`} /> : null}
                </Row>
              </Card>
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}

function SvgGroupLine({ pts, color, label, lx, ly, labelColor }: { pts: { x: number; y: number }[]; color: string; label: string; lx: number; ly: number; labelColor: string }) {
  return (
    <>
      <Polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} stroke={color} strokeWidth={1.1} fill="none" opacity={0.85} />
      <SvgText x={lx} y={ly} fill={labelColor} fontSize={16} fontFamily={FONTS.hand} textAnchor="middle" opacity={0.95}>
        {label}
      </SvgText>
    </>
  );
}
