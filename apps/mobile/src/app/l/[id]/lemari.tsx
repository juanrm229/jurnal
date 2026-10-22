/**
 * Lemari Benda: rak kecil berisi Token Kenangan lingkaran. Token milik bersama,
 * tidak pernah dipakai untuk membandingkan anggota. Yang belum ada tampil
 * samar, dengan petunjuk cara mendapatkannya.
 */
import { formatDayLong, TOKENS, type TokenDef, type TokenWire } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { nameIn } from '@/features/board/shared';
import { api } from '@/lib/api';
import { useCircle, useMe } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Button, ErrorNote, Gap, Growing, Header, Row, Screen, Sticky, Txt } from '@/ui/kit';
import { mix, SPACE, useTheme } from '@/ui/theme';

const PER_SHELF = 3;

export default function Lemari() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const circle = useCircle(id);
  const q = useQuery({ queryKey: ['tokens', id], queryFn: () => api.get<TokenWire[]>(`/circles/${id}/tokens`), enabled: !!circle });
  const [open, setOpen] = useState<string | null>(null);

  const byCode = useMemo(() => {
    const m = new Map<string, TokenWire[]>();
    for (const t of q.data ?? []) (m.get(t.code) ?? m.set(t.code, []).get(t.code)!).push(t);
    for (const list of m.values()) list.sort((a, b) => (a.day < b.day ? -1 : 1));
    return m;
  }, [q.data]);

  if (!circle) return <Screen header={<Header title="Lemari Benda" />}><Growing /></Screen>;
  const kinds = TOKENS.filter((t) => byCode.has(t.code)).length;
  const shelves: TokenDef[][] = [];
  // Yang sudah terkumpul ditaruh di rak atas.
  const ordered = [...TOKENS].sort((a, b) => Number(byCode.has(b.code)) - Number(byCode.has(a.code)));
  for (let i = 0; i < ordered.length; i += PER_SHELF) shelves.push(ordered.slice(i, i + PER_SHELF));

  return (
    <Screen header={<Header title="Lemari Benda" subtitle={circle.name} />}>
      <Txt v="small" soft center>
        {kinds ? (
          <>
            <Txt v="small" ink>{kinds}</Txt> dari {TOKENS.length} benda sudah tersimpan di lemari kalian
          </>
        ) : (
          'Lemarinya masih kosong. Benda pertama biasanya datang dari hari pertama yang disegel bersama.'
        )}
      </Txt>
      <Gap h={SPACE.md} />
      {q.error ? <ErrorNote error={q.error} onRetry={() => q.refetch()} /> : null}
      {q.isLoading ? (
        <Growing label="membuka lemari…" />
      ) : (
        <View
          testID="lemari-cabinet"
          style={{ borderRadius: 18, borderWidth: 1.5, borderColor: c.inkSoft, backgroundColor: mix(c.card, c.aged, 0.25), paddingHorizontal: SPACE.sm, paddingTop: SPACE.md, paddingBottom: SPACE.sm }}>
          {shelves.map((row, i) => {
            const openDef = row.find((t) => t.code === open);
            return (
              <View key={i}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', minHeight: 104 }}>
                  {row.map((t) => (
                    <Slot key={t.code} def={t} got={byCode.get(t.code) ?? []} active={open === t.code} onPress={() => setOpen(open === t.code ? null : t.code)} />
                  ))}
                </View>
                <Shelf />
                {openDef ? <Detail def={openDef} got={byCode.get(openDef.code) ?? []} names={(u) => nameIn(circle, u, me.user.id)} onClose={() => setOpen(null)} onDay={(d) => router.push(`/l/${id}/hari/${d}`)} /> : null}
              </View>
            );
          })}
        </View>
      )}
      <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
        benda-benda ini milik lingkaran, bukan milik satu orang. tidak ada yang perlu dikejar.
      </Txt>
    </Screen>
  );
}

function Slot({ def, got, active, onPress }: { def: TokenDef; got: TokenWire[]; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const has = got.length > 0;
  return (
    <Pressable
      onPress={onPress}
      testID={`token-${def.code}`}
      accessibilityRole="button"
      accessibilityLabel={`${def.name}${has ? `, ${got.length}` : ', belum ada'}`}
      style={({ pressed }) => ({ width: '31%', alignItems: 'center', paddingBottom: 4, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ height: 62, justifyContent: 'flex-end', alignItems: 'center' }}>
        {active ? <View style={{ position: 'absolute', bottom: -2, width: 54, height: 54, borderRadius: 27, backgroundColor: c.pill, opacity: 0.7 }} /> : null}
        <View>
          <Doodle id={def.doodle} size={has ? 50 : 42} color={has ? c.ink : c.inkSoft} opacity={has ? 1 : 0.45} strokeWidth={has ? 2.4 : 1.8} />
        </View>
        {got.length > 1 ? (
          <View style={{ position: 'absolute', top: 0, right: -10, backgroundColor: c.ink, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Txt v="tiny" style={{ color: c.onInk, fontSize: 10, lineHeight: 12 }}>
              ×{got.length}
            </Txt>
          </View>
        ) : null}
      </View>
      <Txt v="tiny" ink={has} soft={!has} center numberOfLines={1} style={{ marginTop: 4 }}>
        {def.name.toLowerCase()}
      </Txt>
    </Pressable>
  );
}

/** Papan rak: garis kayu tipis dengan bayangan lembut. */
function Shelf() {
  const { c } = useTheme();
  return (
    <View style={{ marginBottom: SPACE.md }}>
      <View style={{ height: 7, borderRadius: 3, backgroundColor: c.aged, borderWidth: 1, borderColor: mix(c.aged, c.text, 0.25) }} />
      <View style={{ height: 5, marginHorizontal: 6, backgroundColor: c.text, opacity: 0.06, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
    </View>
  );
}

function Detail({ def, got, names, onClose, onDay }: { def: TokenDef; got: TokenWire[]; names: (u: string) => string; onClose: () => void; onDay: (d: string) => void }) {
  const has = got.length > 0;
  return (
    <Sticky color={has ? 'yellow' : 'blue'} tilt={has ? -1.2 : 0.8} style={{ marginBottom: SPACE.lg, marginHorizontal: SPACE.xs }}>
      <View testID="token-detail" style={{ gap: SPACE.sm }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Doodle id={def.doodle} size={44} opacity={has ? 1 : 0.5} />
          <View style={{ flex: 1 }}>
            <Txt v="h2">{def.name}</Txt>
            <Txt v="tiny" soft>
              {has ? `tersimpan ${got.length} kali` : 'belum ada di lemari'}
            </Txt>
          </View>
        </Row>
        {has ? (
          <Txt v="hand" style={{ fontSize: 22 }}>
            {def.awardLine}
          </Txt>
        ) : null}
        <Txt v="small">{def.howTo}</Txt>
        {has ? (
          <View style={{ gap: 2 }}>
            {got.slice(-8).reverse().map((t) => (
              <Pressable key={t.id} onPress={() => onDay(t.day)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 3 })}>
                <Row gap={6}>
                  <Doodle id="ui-kalender" size={14} />
                  <Txt v="tiny">
                    {formatDayLong(t.day)} · dibawa {names(t.userId)}
                  </Txt>
                </Row>
              </Pressable>
            ))}
            {got.length > 8 ? (
              <Txt v="tiny" soft>
                dan {got.length - 8} lagi yang lebih lama
              </Txt>
            ) : null}
          </View>
        ) : null}
        <Button title="tutup" kind="ghost" onPress={onClose} style={{ minHeight: 40 }} />
      </View>
    </Sticky>
  );
}
