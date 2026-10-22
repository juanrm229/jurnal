/**
 * Ekspedisi: misi kooperatif tujuh hari. Tidak ada yang kalah; satu Drop per
 * anggota per hari sudah cukup. Selesai bersama = satu halaman bergambar di
 * kitab dan sebuah kompas di Lemari Benda.
 */
import { addDays, diffDays, EXPEDITIONS, type Expedition, type ExpeditionWire, formatDayLong, kindToFit } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { type CircleView, useCircle, useMe, useToday } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { Avatar, Doodle, ErrorNote, Growing, Header, Screen, Section } from '@/ui/kit';
import { Btn, ErrLine, errorText, LoreHero, mix, nameIn } from './board';

const defOf = (code: string) => EXPEDITIONS.find((e) => e.id === code);

export default function Ekspedisi() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const q = useQuery({ queryKey: ['expeditions', id], queryFn: () => api.get<ExpeditionWire[]>(`/circles/${id}/expeditions`), enabled: !!circle });
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!circle)
    return (
      <Screen>
        <Header title="ekspedisi" backTo={`/l/${id}`} />
        <Growing />
      </Screen>
    );
  const list = q.data ?? [];
  const running = list.find((e) => !e.completedAt && e.startDay <= today && e.endDay >= today);
  const upcoming = list.find((e) => !e.completedAt && e.startDay > today);
  const done = list.filter((e) => e.completedAt);
  const faded = list.filter((e) => !e.completedAt && e.endDay < today);
  const fit = kindToFit(circle.kind);
  const options = EXPEDITIONS.filter((e) => (e.fit.includes('semua') || e.fit.includes(fit)) && e.id !== running?.code);
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
    <Screen>
      <Header title="ekspedisi" sub={circle.name} backTo={`/l/${id}`} />
      <LoreHero doodle="kompas" title="misi bersama tujuh hari" sub="Satu Drop per orang per hari sudah cukup, dan tidak ada yang kalah." />
      {q.error ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> : null}
      {q.isLoading ? <Growing /> : null}

      {running ? <Running e={running} circle={circle} meId={me.user.id} today={today} /> : null}
      {upcoming ? (
        <div className="card row" style={{ gap: 12 }}>
          <Doodle id={defOf(upcoming.code)?.doodle ?? 'kompas'} size={32} className="breathe" />
          <span className="small">
            {defOf(upcoming.code)?.name} dimulai {formatDayLong(upcoming.startDay)}.
          </span>
        </div>
      ) : null}

      {done.length ? (
        <Section title="halaman bergambar">
          <div className="col" style={{ gap: 14 }}>
            {done.map((e, i) => {
              const d = defOf(e.code);
              return (
                <div key={e.id} className="sticky row" style={{ background: 'var(--sticky-green)', transform: `rotate(${i % 2 ? 0.6 : -0.6}deg)`, gap: 12 }}>
                  <Doodle id={d?.doodle ?? 'kompas'} size={44} color="currentColor" draw />
                  <div className="grow">
                    <div className="hand" style={{ fontSize: 28, color: 'inherit' }}>{d?.rewardPageTitle ?? 'Halaman Ekspedisi'}</div>
                    <div className="tiny" style={{ opacity: 0.75 }}>
                      {d?.name} · {formatDayLong(e.startDay, false)} – {formatDayLong(e.endDay)}
                    </div>
                  </div>
                  <button className="icon-btn" style={{ color: 'inherit' }} aria-label="kompas di Lemari Benda" onClick={() => navigate(`/l/${id}/lemari`)}>
                    <Doodle id="kompas" size={30} color="currentColor" />
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {faded.length ? (
        <Section title="yang tertinggal di kabut">
          {faded.map((e) => (
            <div key={e.id} className="row" style={{ padding: '6px 0', gap: 10 }}>
              <Doodle id="kabut" size={26} color="var(--fog)" />
              <span className="small soft grow">
                {defOf(e.code)?.name} · {formatDayLong(e.startDay, false)}. Tidak apa-apa, jalannya masih bisa dicoba lagi.
              </span>
            </div>
          ))}
        </Section>
      ) : null}

      <Section title={running ? 'ekspedisi lain untuk nanti' : 'pilih ekspedisi'}>
        <div className="col" style={{ gap: 10 }}>
          {options.map((e) => (
            <Option key={e.id} e={e} open={openCode === e.id} onToggle={() => setOpenCode(openCode === e.id ? null : e.id)} blocked={blocked} busy={busy === e.id} onStart={() => void start(e.id)} />
          ))}
        </div>
        <ErrLine>{err}</ErrLine>
      </Section>
    </Screen>
  );
}

function Running({ e, circle, meId, today }: { e: ExpeditionWire; circle: CircleView; meId: string; today: string }) {
  const d = defOf(e.code);
  const n = diffDays(today, e.startDay) + 1;
  const prompt = d?.days.find((x) => x.day === n)?.prompt ?? '';
  const iDid = (e.progress[n] ?? []).includes(meId);
  const need = Math.max(1, Math.ceil(circle.active.length / 2));
  return (
    <div className="card col lore-expedition" style={{ borderColor: 'var(--ink)' }}>
      <div className="row" style={{ gap: 12 }}>
        <Doodle id={d?.doodle ?? 'kompas'} size={46} draw className="sway" />
        <div className="grow">
          <div className="label">sedang berjalan · hari ke-{n} dari 7</div>
          <div className="hand" style={{ fontSize: 30 }}>{d?.name ?? e.code}</div>
        </div>
      </div>
      <div className="lore-trail">
        <svg className="lore-trail-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
          <path d="M2 5 Q 18 1 34 5 T 66 5 T 98 5" stroke="var(--ink-soft)" strokeWidth={0.6} strokeDasharray="1.2 2" fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        {Array.from({ length: 7 }, (_, i) => {
          const k = i + 1;
          const who = e.progress[k] ?? [];
          const isToday = k === n;
          const past = k < n;
          const enough = who.length >= need;
          return (
            <div key={k} className="col" style={{ alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
              <div
                className={`lore-trail-day ${isToday ? 'today' : ''}`}
                style={{
                  borderColor: isToday ? 'var(--ink)' : enough ? 'var(--ink-soft)' : 'var(--card-edge)',
                  background: enough ? mix('var(--card)', 'var(--pill)', 0.7) : 'var(--paper)',
                }}>
                {who.length ? (
                  who.slice(0, 3).map((u) => <Avatar key={u} doodle={circle.members.find((m) => m.userId === u)?.doodle ?? 'tunas'} size={18} sealed />)
                ) : past ? (
                  <Doodle id="kabut" size={20} color="var(--fog)" />
                ) : (
                  <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--ink-soft)' }} />
                )}
              </div>
              <span className={`tiny ${isToday ? 'ink' : 'soft'}`}>{k}</span>
            </div>
          );
        })}
      </div>
      <div className="sticky" style={{ background: 'var(--sticky-blue)', transform: 'rotate(0.6deg)', margin: '6px 0' }}>
        <div className="tiny" style={{ opacity: 0.7 }}>tugas hari ke-{n}</div>
        <div className="hand" style={{ fontSize: 26, color: 'inherit' }}>{prompt}</div>
      </div>
      {(e.progress[n] ?? []).length ? (
        <p className="tiny soft center" style={{ margin: 0 }}>
          sudah dikerjakan: {(e.progress[n] ?? []).map((u) => nameIn(circle, u, meId)).join(', ')}
        </p>
      ) : null}
      <Btn
        kind={iDid ? 'soft' : undefined}
        icon="kompas"
        onClick={() => navigate('/hari?' + new URLSearchParams({ prompt, kind: 'expedition', expeditionId: e.id, expeditionDay: String(n), circleId: circle.id }))}>
        {iDid ? 'tambah satu lagi' : `drop untuk hari ke-${n}`}
      </Btn>
      <p className="tiny soft center" style={{ margin: 0 }}>
        selesai bersama bila setiap hari diisi minimal {need} orang · berakhir {formatDayLong(addDays(e.startDay, 6))}
      </p>
    </div>
  );
}

function Option({ e, open, onToggle, blocked, busy, onStart }: { e: Expedition; open: boolean; onToggle: () => void; blocked: boolean; busy: boolean; onStart: () => void }) {
  return (
    <div className={`card lore-option ${open ? 'open' : ''}`}>
      <button className="row" onClick={onToggle} aria-expanded={open} style={{ width: '100%', background: 'none', border: 0, padding: 0, textAlign: 'left', alignItems: 'flex-start', gap: 12 }}>
        <Doodle id={e.doodle} size={36} draw={open} />
        <span className="grow">
          <span className="ink" style={{ display: 'block' }}>{e.name}</span>
          <span className="tiny soft">{e.tagline}</span>
        </span>
        <Doodle id="ui-panah-kanan" size={16} style={{ opacity: 0.6, transform: open ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
      </button>
      {open ? (
        <div className="col fade" style={{ gap: 6, marginTop: 12 }}>
          {e.days.map((d) => (
            <div key={d.day} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="lore-day-num">{d.day}</span>
              <span className="small grow">{d.prompt}</span>
            </div>
          ))}
          <span className="tiny soft" style={{ marginTop: 4 }}>
            hadiah: <span className="hand" style={{ fontSize: 20 }}>{e.rewardPageTitle}</span>
          </span>
          <Btn disabled={blocked} loading={busy} onClick={onStart} style={{ marginTop: 6 }}>
            {blocked ? 'selesaikan ekspedisi yang berjalan dulu' : 'mulai hari ini'}
          </Btn>
        </div>
      ) : null}
    </div>
  );
}
