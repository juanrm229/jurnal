/**
 * Lemari Benda: rak kecil berisi Token Kenangan lingkaran. Token milik bersama,
 * tidak pernah dipakai untuk membandingkan anggota. Yang belum ada tampil
 * samar, dengan petunjuk cara mendapatkannya.
 */
import { formatDayLong, TOKENS, type TokenDef, type TokenWire } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useCircle, useMe } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { Doodle, ErrorNote, Growing, Header, Screen, Sticky } from '@/ui/kit';
import { LoreHero, nameIn } from './board';

const PER_SHELF = 3;

export default function Lemari() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const circle = useCircle(id);
  const q = useQuery({ queryKey: ['tokens', id], queryFn: () => api.get<TokenWire[]>(`/circles/${id}/tokens`), enabled: !!circle });
  const [open, setOpen] = useState<string | null>(null);

  const byCode = useMemo(() => {
    const m = new Map<string, TokenWire[]>();
    for (const t of q.data ?? []) (m.get(t.code) ?? m.set(t.code, []).get(t.code)!).push(t);
    for (const list of m.values()) list.sort((a, b) => (a.day < b.day ? -1 : 1));
    return m;
  }, [q.data]);

  if (!circle)
    return (
      <Screen>
        <Header title="lemari benda" backTo={`/l/${id}`} />
        <Growing />
      </Screen>
    );
  const kinds = TOKENS.filter((t) => byCode.has(t.code)).length;
  const shelves: TokenDef[][] = [];
  // Yang sudah terkumpul ditaruh di rak atas.
  const ordered = [...TOKENS].sort((a, b) => Number(byCode.has(b.code)) - Number(byCode.has(a.code)));
  for (let i = 0; i < ordered.length; i += PER_SHELF) shelves.push(ordered.slice(i, i + PER_SHELF));

  return (
    <Screen>
      <Header title="lemari benda" sub={circle.name} backTo={`/l/${id}`} />
      <LoreHero
        doodle="kunci"
        title="lemari kecil kalian"
        sub={
          kinds ? (
            <>
              <span className="ink">{kinds}</span> dari {TOKENS.length} benda sudah tersimpan di lemari kalian
            </>
          ) : (
            'Lemarinya masih kosong. Benda pertama biasanya datang dari hari pertama yang disegel bersama.'
          )
        }
      />
      {q.error ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> : null}
      {q.isLoading ? (
        <Growing label="membuka lemari…" />
      ) : (
        <div className="lore-cabinet rise">
          <div className="lore-cabinet-top" aria-hidden>
            <span />
            <span />
          </div>
          {shelves.map((row, i) => {
            const openDef = row.find((t) => t.code === open);
            return (
              <div key={i}>
                <div className="lore-shelf-row">
                  {row.map((t, j) => (
                    <Slot key={t.code} def={t} got={byCode.get(t.code) ?? []} active={open === t.code} delay={i * 0.12 + j * 0.05} onPress={() => setOpen(open === t.code ? null : t.code)} />
                  ))}
                </div>
                <div className="lore-shelf" aria-hidden />
                {openDef ? (
                  <Detail def={openDef} got={byCode.get(openDef.code) ?? []} names={(u) => nameIn(circle, u, me.user.id)} onClose={() => setOpen(null)} onDay={(d) => navigate(`/l/${id}/hari/${d}`)} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <p className="tiny soft center mt">benda-benda ini milik lingkaran, bukan milik satu orang. tidak ada yang perlu dikejar.</p>
    </Screen>
  );
}

function Slot({ def, got, active, delay, onPress }: { def: TokenDef; got: TokenWire[]; active: boolean; delay: number; onPress: () => void }) {
  const has = got.length > 0;
  return (
    <button className={`lore-slot ${active ? 'on' : ''} ${has ? 'has' : ''}`} onClick={onPress} aria-pressed={active} aria-label={`${def.name}${has ? `, ${got.length}` : ', belum ada'}`}>
      <span className="lore-slot-art">
        {active ? <span className="lore-slot-glow" /> : null}
        <Doodle id={def.doodle} size={has ? 54 : 44} color={has ? 'var(--ink)' : 'var(--ink-soft)'} sw={has ? 2.4 : 1.8} draw={has ? delay : false} style={{ opacity: has ? 1 : 0.45 }} />
        {got.length > 1 ? <span className="lore-slot-count">×{got.length}</span> : null}
      </span>
      <span className={`tiny ${has ? 'ink' : 'soft'} lore-clamp1`} style={{ marginTop: 4 }}>
        {def.name.toLowerCase()}
      </span>
    </button>
  );
}

function Detail({ def, got, names, onClose, onDay }: { def: TokenDef; got: TokenWire[]; names: (u: string) => string; onClose: () => void; onDay: (d: string) => void }) {
  const has = got.length > 0;
  return (
    <div className="rise" style={{ margin: '4px 4px 22px' }}>
      <Sticky color={has ? 'yellow' : 'blue'} tilt={has ? -1.2 : 0.8}>
        <div className="col" style={{ gap: 8 }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <Doodle id={def.doodle} size={48} draw color="currentColor" style={{ opacity: has ? 1 : 0.5 }} />
            <div className="grow">
              <div className="h2" style={{ color: 'inherit' }}>{def.name}</div>
              <div className="tiny" style={{ opacity: 0.7 }}>{has ? `tersimpan ${got.length} kali` : 'belum ada di lemari'}</div>
            </div>
          </div>
          {has ? <div className="hand" style={{ fontSize: 26, color: 'inherit' }}>{def.awardLine}</div> : null}
          <div className="small">{def.howTo}</div>
          {has ? (
            <div className="col" style={{ gap: 2 }}>
              {got
                .slice(-8)
                .reverse()
                .map((t) => (
                  <button key={t.id} className="row lore-link-row" onClick={() => onDay(t.day)}>
                    <Doodle id="ui-kalender" size={14} color="currentColor" />
                    <span className="tiny">
                      {formatDayLong(t.day)} · dibawa {names(t.userId)}
                    </span>
                  </button>
                ))}
              {got.length > 8 ? <span className="tiny" style={{ opacity: 0.7 }}>dan {got.length - 8} lagi yang lebih lama</span> : null}
            </div>
          ) : null}
          <button className="btn ghost sm" onClick={onClose} style={{ color: 'inherit', borderColor: 'currentColor' }}>
            tutup
          </button>
        </div>
      </Sticky>
    </div>
  );
}
