/**
 * Papan Tahun: setahun digambar sebagai jalan berliku 365 petak, seperti ular
 * tangga yang tenang. Petak yang tersegel bersama menumbuhkan tanaman; hari
 * yang terlewat tertutup kabut (tidak pernah merah). Bidak anggota berdiri
 * berdampingan di petak hari ini.
 */
import { circleDayNumber, COPY, dayName, eachDay, formatDayLong, monthName, parseDay, specialTileFor } from '@sehari/core';
import { gardenDoodleFor } from '@sehari/doodles';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, type ScrollViewInstance, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { calendarMap, coverFor, type DayCover, YearSwitch } from '@/features/board/shared';
import { type CircleView, useCalendar, useCircle, useMe, useToday } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, ErrorNote, Gap, Growing, Header, Row, Screen, Sticky, Txt } from '@/ui/kit';
import { MAX_WIDTH, mix, SPACE, useTheme } from '@/ui/theme';

const SPECIAL: Record<string, { doodle: string; line: string }> = {
  gerbang: { doodle: 'kunci', line: COPY.streak.milestone7.line },
  jembatan: { doodle: 'peta', line: COPY.streak.milestone30.line },
  mercusuar: { doodle: 'lampu', line: COPY.streak.milestone100.line },
  pelabuhan: { doodle: 'kompas', line: COPY.streak.milestone365.line },
};

interface Tile {
  day: string;
  cover: DayCover;
  past: boolean;
  isToday: boolean;
  before: boolean;
  special?: { code: string; name: string; days: number };
}

export default function PapanTahun() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const circle = useCircle(id);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const cal = useCalendar(id, `${year}-01-01`, `${year}-12-31`);
  const [picked, setPicked] = useState<Tile | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const boardTop = useRef(0);
  const scrolled = useRef('');

  const tiles = useMemo<Tile[]>(() => {
    if (!circle) return [];
    const map = calendarMap(cal.data);
    // Papan dimulai di hari lingkaran lahir; hari sebelumnya bukan kabut, hanya belum ada.
    const from = circle.createdDay > `${year}-01-01` ? circle.createdDay : `${year}-01-01`;
    if (from > `${year}-12-31`) return [];
    return eachDay(from, `${year}-12-31`).map((day) => {
      const n = circleDayNumber(circle.createdDay, day);
      const sp = n >= 1 ? specialTileFor(n) : undefined;
      return {
        day,
        cover: coverFor(circle, day, map.get(day)),
        past: day < today,
        isToday: day === today,
        before: day < circle.createdDay,
        special: sp ? { code: sp.code, name: sp.name, days: sp.days } : undefined,
      };
    });
  }, [circle, cal.data, year, today]);

  const onTodayY = (y: number) => {
    if (scrolled.current === `${year}`) return;
    scrolled.current = `${year}`;
    setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, boardTop.current + y - 260), animated: true }), 300);
  };

  if (!circle) return <Screen header={<Header title="Papan Tahun" />}><Growing /></Screen>;
  const minYear = Number(circle.createdDay.slice(0, 4));
  const together = tiles.filter((t) => t.cover.together).length;
  const ahead = tiles.filter((t) => !t.past && !t.isToday).length;
  const ageToday = circleDayNumber(circle.createdDay, today);

  const showNote = (t: Tile) => {
    setPicked(t);
    // Catatan muncul di atas papan; bawa pandangan ke sana.
    scroll.current?.scrollTo({ y: 0, animated: true });
  };
  const onTile = (t: Tile) => {
    if (t.special || t.isToday) return showNote(t);
    if (t.past && !t.before) router.push(`/l/${id}/hari/${t.day}`);
    else showNote(t);
  };

  return (
    <Screen header={<Header title="Papan Tahun" subtitle={circle.name} />} scroll={false} padded={false}>
      <ScrollView ref={scroll} contentContainerStyle={{ alignItems: 'center', paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <View style={{ width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: SPACE.md }}>
      <YearSwitch year={year} min={minYear} max={thisYear} onChange={(y) => { setYear(y); setPicked(null); }} testID="papan-year" />
      <Txt v="small" soft center>
        <Txt v="small" ink>{together}</Txt> petak terisi bersama
        {year === thisYear ? ` · ${ahead} petak lagi menunggu` : ''}
      </Txt>
      {year === thisYear && ageToday >= 1 ? (
        <Txt v="tiny" ink soft center style={{ marginTop: 2 }}>
          hari ini petak ke-{ageToday} perjalanan kalian
        </Txt>
      ) : null}
      <Gap h={SPACE.md} />

      {picked ? <TileNote tile={picked} circle={circle} meId={me.user.id} onClose={() => setPicked(null)} onOpen={() => router.push(`/l/${id}/hari/${picked.day}`)} /> : null}

      {cal.error ? (
        <ErrorNote error={cal.error} onRetry={() => cal.refetch()} />
      ) : cal.isLoading ? (
        <Growing label="menggambar papan…" />
      ) : (
        <View onLayout={(e) => (boardTop.current = e.nativeEvent.layout.y)}>
          {year === minYear && circle.createdDay > `${year}-01-01` ? (
            <Row style={{ justifyContent: 'center', marginBottom: SPACE.sm }} gap={6}>
              <Doodle id="tunas" size={20} />
              <Txt v="tiny" ink soft>
                jalan dimulai {formatDayLong(circle.createdDay)}, hari lingkaran ini lahir
              </Txt>
            </Row>
          ) : null}
          <Card style={{ paddingHorizontal: SPACE.sm, paddingVertical: SPACE.md }} testID="papan-board">
            <Board tiles={tiles} circle={circle} onTile={onTile} onTodayY={onTodayY} />
          </Card>
        </View>
      )}

      <Legend />
      <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
        tidak ada yang kalah di papan ini. petak yang berkabut tetap bagian dari jalan.
      </Txt>
      </View>
      </ScrollView>
    </Screen>
  );
}

// ── Papan ───────────────────────────────────────────────────────────────────

function Board({ tiles, circle, onTile, onTodayY }: { tiles: Tile[]; circle: CircleView; onTile: (t: Tile) => void; onTodayY?: (y: number) => void }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const cols = w ? Math.max(7, Math.min(12, Math.floor(w / 40))) : 0;
  const cell = cols ? w / cols : 0;
  const rowH = cell * 1.12;
  const rows = cols ? Math.ceil(tiles.length / cols) : 0;

  const pos = (i: number) => {
    const r = Math.floor(i / cols);
    const k = i % cols;
    const col = r % 2 === 0 ? k : cols - 1 - k;
    return { x: col * cell + cell / 2, y: r * rowH + rowH / 2, r };
  };

  const path = useMemo(() => {
    if (!cols) return '';
    let d = '';
    for (let i = 0; i < tiles.length; i++) {
      const p = pos(i);
      if (i === 0) {
        d += `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        continue;
      }
      const q = pos(i - 1);
      if (q.r === p.r) d += ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      else {
        // Belokan lembut di ujung baris, seperti jalan ular tangga.
        const out = q.r % 2 === 0 ? cell * 0.62 : -cell * 0.62;
        d += ` C${(q.x + out).toFixed(1)} ${q.y.toFixed(1)} ${(p.x + out).toFixed(1)} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      }
    }
    return d;
  }, [cols, cell, rowH, tiles.length]);

  const pawns = circle.active;
  const todayIdx = tiles.findIndex((t) => t.isToday);
  useEffect(() => {
    if (cols && todayIdx >= 0) onTodayY?.(Math.floor(todayIdx / cols) * rowH);
  }, [cols, todayIdx]);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', height: rows * rowH || 200 }}>
      {cols ? (
        <>
          <Svg width={w} height={rows * rowH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            <Path d={path} stroke={c.inkSoft} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" fill="none" opacity={0.7} />
          </Svg>
          {tiles.map((t, i) => {
            const p = pos(i);
            return (
              <View key={t.day} style={{ position: 'absolute', left: p.x - cell / 2, top: p.y - rowH / 2, width: cell, height: rowH, alignItems: 'center', justifyContent: 'center' }}>
                <TileView tile={t} size={cell * 0.78} circleId={circle.id} onPress={onTile} />
                {t.isToday ? (
                  <View pointerEvents="none" style={{ position: 'absolute', top: -cell * 0.28, flexDirection: 'row', zIndex: 3 }}>
                    {pawns.slice(0, 4).map((m, j) => (
                      <View key={m.userId} style={{ marginLeft: j ? -cell * 0.22 : 0 }}>
                        <Avatar doodle={m.doodle} size={Math.max(16, cell * 0.46)} sealed={circle.todaySealed[m.userId]} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

const TileView = memo(function TileView({ tile, size, circleId, onPress }: { tile: Tile; size: number; circleId: string; onPress: (t: Tile) => void }) {
  const { c } = useTheme();
  const { cover, past, isToday, before, special } = tile;
  const { day: dom, month } = parseDay(tile.day);
  const fog = past && !before && cover.fraction === 0;
  const bg = cover.together ? mix(c.card, c.pill, 0.35 + cover.fraction * 0.65) : cover.fraction > 0 ? mix(c.card, c.pill, 0.25) : c.card;
  const border = isToday ? c.ink : special ? c.ink : cover.together ? c.inkSoft : c.cardEdge;

  let content: React.ReactNode;
  // Benih tanaman sama di semua perangkat untuk lingkaran & hari yang sama.
  if (cover.together) content = <Doodle id={gardenDoodleFor(`${circleId}:${tile.day}`).id} size={size * 0.78} />;
  else if (fog) content = <Doodle id="kabut" size={size * 0.62} color={c.fog} />;
  else if (cover.fraction > 0) content = <View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: c.ink, backgroundColor: mix(c.card, c.ink, cover.fraction * 0.5) }} />;
  else if (isToday) content = <Txt v="tiny" ink>{dom}</Txt>;
  else content = <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: before ? c.cardEdge : c.inkSoft, opacity: before ? 1 : 0.8 }} />;

  return (
    <Pressable
      onPress={() => onPress(tile)}
      testID={isToday ? 'papan-today' : special ? `papan-special-${special.code}` : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${formatDayLong(tile.day)}${cover.together ? ', tersegel bersama' : fog ? `, ${COPY.streak.fog}` : ''}${special ? `, petak ${special.name}` : ''}`}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: fog ? mix(c.card, c.fog, 0.18) : bg,
        borderWidth: isToday ? 2 : special ? 1.5 : 1,
        borderStyle: special && !isToday ? 'dashed' : 'solid',
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : !past && !isToday ? 0.75 : 1,
      })}>
      {content}
      {dom === 1 ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: -7, left: -2, backgroundColor: c.card, paddingHorizontal: 2, borderRadius: 3 }}>
          <Txt v="tiny" ink soft style={{ fontSize: 9, lineHeight: 11 }}>
            {monthName(month, true).toLowerCase()}
          </Txt>
        </View>
      ) : null}
      {special ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: -6, bottom: -6, backgroundColor: c.card, borderRadius: 10, padding: 1 }}>
          <Doodle id={SPECIAL[special.code]?.doodle ?? 'bintang'} size={Math.max(12, size * 0.42)} />
        </View>
      ) : null}
    </Pressable>
  );
});

function TileNote({ tile, circle, meId, onClose, onOpen }: { tile: Tile; circle: CircleView; meId: string; onClose: () => void; onOpen: () => void }) {
  const sp = tile.special ? SPECIAL[tile.special.code] : undefined;
  const n = circleDayNumber(circle.createdDay, tile.day);
  const canOpen = (tile.past || tile.isToday) && !tile.before;
  let body: string;
  if (tile.special && sp) {
    body = tile.past || tile.isToday ? sp.line : `Hari ke-${tile.special.days} lingkaran ini jatuh di sini. Di petak ${tile.special.name}, sesuatu akan terbuka: surat lama, halaman ilustrasi, atau kapsul yang dikunci dulu.`;
  } else if (tile.isToday) {
    const sealedN = Object.values(circle.todaySealed).filter(Boolean).length;
    body = `Bidak ${circle.active.map((m) => (m.userId === meId ? 'kamu' : m.penName)).join(', ')} berdiri di petak ini. ${COPY.seal.circleProgress(sealedN, circle.active.length)}`;
  } else if (tile.before) {
    body = 'Lingkaran ini belum lahir di hari itu. Jalannya dimulai nanti.';
  } else {
    body = 'Petak ini masih menunggu. Jalannya pelan, satu hari setiap kali.';
  }
  return (
    <Sticky color={tile.special ? 'yellow' : 'blue'} tilt={-1} style={{ marginBottom: SPACE.md }}>
      <View testID="papan-note">
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Txt v="label">{tile.special ? `petak istimewa · ${tile.special.name.toLowerCase()}` : `${dayName(tile.day)}`}</Txt>
            <Txt v="h2">
              {formatDayLong(tile.day)}
              {n >= 1 ? <Txt v="small" soft>{`  · hari ke-${n}`}</Txt> : null}
            </Txt>
          </View>
          {sp ? <Doodle id={sp.doodle} size={36} color={undefined} /> : null}
        </Row>
        <Gap h={SPACE.sm} />
        <Txt v="small">{body}</Txt>
        <Gap h={SPACE.sm} />
        <Row>
          {canOpen ? <Button title="buka halamannya" kind="primary" onPress={onOpen} style={{ flex: 1, minHeight: 44 }} testID="papan-open-day" /> : null}
          <Button title="tutup" kind="ghost" onPress={onClose} style={{ flex: canOpen ? 0 : 1, minHeight: 44, width: canOpen ? 100 : undefined }} />
        </Row>
      </View>
    </Sticky>
  );
}

function Legend() {
  const { c } = useTheme();
  const item = (node: React.ReactNode, label: string) => (
    <Row gap={6} style={{ width: '48%' }}>
      <View style={{ width: 22, alignItems: 'center' }}>{node}</View>
      <Txt v="tiny" soft>
        {label}
      </Txt>
    </Row>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, justifyContent: 'space-between', marginTop: SPACE.md }}>
      {item(<Doodle id="tunas" size={20} />, 'tersegel bersama')}
      {item(<View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: c.ink }} />, 'sebagian menitipkan')}
      {item(<Doodle id="kabut" size={18} color={c.fog} />, COPY.streak.fog)}
      {item(<View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: c.inkSoft }} />, 'hari yang akan datang')}
      {item(<View style={{ width: 14, height: 14, borderRadius: 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.ink }} />, 'petak istimewa')}
    </View>
  );
}
