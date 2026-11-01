/**
 * Rol Minggu Ini: tiap orang memilih sampai lima foto favorit seminggu, dan
 * pemegang pena memberi judul adegannya. Rol inilah yang mengisi Minggu Kita.
 */
import { formatDayLong, isoWeek, type MediaRef, penHolderFor, type RollWire, type SceneWire, weekRange } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { openCircleText, sealCircleText, useCircle, useCircleRange, useMe, useOpenDrops, useToday } from '@/lib/data';
import { useMediaUrl } from '@/lib/media';
import { Link, useParams } from '@/lib/router';
import { Avatar, Doodle, Growing, Header, useToast } from '@/ui/kit';

export const MAX_ROLL = 5;

function Shot({ media, className }: { media: MediaRef; className?: string }) {
  const url = useMediaUrl(media);
  return (
    <span className={['rl-shot', className].filter(Boolean).join(' ')} style={{ background: media.tint ?? 'var(--pill)' }}>
      {url ? <img src={url} alt="" draggable={false} /> : <Doodle id="ui-foto" size={24} style={{ opacity: 0.5 }} />}
    </span>
  );
}

export function useRolls(circleId: string, week: string) {
  return useQuery({ queryKey: ['rolls', circleId, week], queryFn: () => api.get<RollWire[]>(`/circles/${circleId}/rolls/${week}`), enabled: !!circleId });
}

export default function Rol() {
  const { id = '', week: weekParam } = useParams<{ id: string; week?: string }>();
  const me = useMe();
  const today = useToday();
  const toast = useToast();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const week = weekParam && /^\d{4}-W\d{2}$/.test(weekParam) ? weekParam : isoWeek(today);
  const { start, end } = weekRange(week);
  const range = useCircleRange(id, start, end < today ? end : today);
  const opened = useOpenDrops(range.data?.drops);
  const rolls = useRolls(id, week);
  const scenes = useQuery({ queryKey: ['scenes', id], queryFn: () => api.get<SceneWire[]>(`/circles/${id}/scenes`), enabled: !!circle });
  const [picks, setPicks] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState<string | null>(null);

  const photos = useMemo(
    () =>
      opened
        .filter((d) => d.payload && d.wire.kind === 'photo' && d.payload.media?.[0])
        .sort((a, b) => (a.wire.createdAt < b.wire.createdAt ? 1 : -1)),
    [opened],
  );
  const mine = rolls.data?.find((r) => r.userId === me.user.id);
  useEffect(() => {
    if (picks === null && rolls.data) setPicks(mine?.dropIds ?? []);
  }, [rolls.data, mine, picks]);

  if (!circle) return <Growing />;
  const scene = scenes.data?.find((s) => s.week === week);
  const holderId = scene?.penHolderId ?? penHolderFor(circle.active.map((m) => m.userId), week, circle.id);
  const holder = circle.members.find((m) => m.userId === holderId);
  const isHolder = holderId === me.user.id;
  const savedTitle = scene?.titleEnc ? openCircleText(circle, scene.titleEnc, '') : '';
  const name = (uid: string) => (uid === me.user.id ? 'kamu' : (circle.members.find((m) => m.userId === uid)?.penName ?? 'teman'));
  const byId = new Map(photos.map((p) => [p.wire.id, p]));
  const chosen = picks ?? [];
  const dirty = JSON.stringify(chosen) !== JSON.stringify(mine?.dropIds ?? []);
  const others = (rolls.data ?? []).filter((r) => r.userId !== me.user.id);
  const isPast = end < today;

  const toggle = (dropId: string) => {
    setPicks((p) => {
      const cur = p ?? [];
      if (cur.includes(dropId)) return cur.filter((x) => x !== dropId);
      if (cur.length >= MAX_ROLL) {
        toast(`Paling banyak ${MAX_ROLL}. Lepas satu dulu, ya.`);
        return cur;
      }
      return [...cur, dropId];
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/circles/${id}/rolls/${week}`, { dropIds: chosen });
      await qc.invalidateQueries({ queryKey: ['rolls', id, week] });
      toast(chosen.length ? 'rol tersimpan' : 'rol dikosongkan');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveTitle = async () => {
    if (title === null) return;
    setBusy(true);
    try {
      await api.put(`/circles/${id}/scenes/${week}`, { titleEnc: sealCircleText(circle, title.trim()) });
      await qc.invalidateQueries({ queryKey: ['scenes', id] });
      setTitle(null);
      toast('judul adegan tersimpan');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen rl">
      <Header title="rol minggu ini" sub={`${formatDayLong(start, false)} – ${formatDayLong(end, false)}`.toLowerCase()} backTo={`/l/${id}`} />

      <section className="card rl-scene">
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <Doodle id="pena" size={26} />
          <span className="small">
            Pena minggu ini dipegang <b className="ink">{holder ? name(holder.userId) : '…'}</b>
          </span>
        </div>
        {isHolder && title !== null ? (
          <div className="row mt" style={{ gap: 8 }}>
            <input className="field hand grow" style={{ fontSize: 24 }} maxLength={80} value={title} placeholder="judul adegan minggu ini…" onChange={(e) => setTitle(e.target.value)} autoFocus />
            <button className="btn sm auto" onClick={saveTitle} disabled={busy || !title.trim()}>
              simpan
            </button>
          </div>
        ) : (
          <div className="rl-title">
            {savedTitle ? <span className="hand">“{savedTitle}”</span> : <span className="soft small">{isHolder ? 'Beri judul adegan minggu ini.' : 'Judulnya masih ditunggu dari pemegang pena.'}</span>}
            {isHolder ? (
              <button className="pill" onClick={() => setTitle(savedTitle)}>
                {savedTitle ? 'ubah judul' : 'tulis judul'}
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="section">
        <div className="row between">
          <span className="label">pilih {MAX_ROLL} favoritmu</span>
          <span className="tiny soft">
            {chosen.length}/{MAX_ROLL}
          </span>
        </div>
        {range.isLoading ? (
          <Growing label="mengumpulkan foto seminggu…" />
        ) : !photos.length ? (
          <div className="card flat small">
            Belum ada foto di minggu ini yang bisa kamu lihat. Jepret kilasan, atau tempel foto di halaman harian.{' '}
            <Link to="/kilasan/jepret" className="ink">
              jepret sekarang
            </Link>
          </div>
        ) : (
          <div className="rl-grid">
            {photos.map((p) => {
              const n = chosen.indexOf(p.wire.id);
              return (
                <button key={p.wire.id} className={`rl-pick${n >= 0 ? ' on' : ''}`} onClick={() => toggle(p.wire.id)} aria-pressed={n >= 0} data-testid="roll-photo">
                  <Shot media={p.payload!.media![0]!} />
                  {n >= 0 ? <span className="rl-n">{n + 1}</span> : null}
                  <span className="rl-who">
                    <Avatar doodle={circle.members.find((m) => m.userId === p.wire.authorId)?.doodle ?? 'tunas'} size={18} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="tiny soft" style={{ margin: '8px 0 0' }}>
          Foto teman dari hari yang belum kamu segel belum bisa dipilih; kilasan selalu bisa.
        </p>
        <div className="row mt" style={{ gap: 8 }}>
          <button className="btn auto" onClick={save} disabled={busy || !dirty} data-testid="roll-save">
            {busy ? 'menyimpan…' : mine?.dropIds.length ? 'perbarui rol' : 'simpan rol'}
          </button>
          {isPast || new Date().getDay() === 0 ? (
            <Link className="btn ghost auto" to={`/wrap/${id}/week/${week}`}>
              putar Minggu Kita
            </Link>
          ) : null}
        </div>
      </section>

      <section className="section">
        <span className="label">rol mereka</span>
        {!others.length ? (
          <p className="small soft">Belum ada yang memilih. Rol yang sudah dipilih akan menjadi bahan utama Minggu Kita.</p>
        ) : (
          <div className="col" style={{ gap: 14 }}>
            {others.map((r) => (
              <div key={r.userId} className="rl-roll">
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <Avatar doodle={circle.members.find((m) => m.userId === r.userId)?.doodle ?? 'tunas'} size={26} />
                  <b className="small">{name(r.userId)}</b>
                </div>
                <div className="rl-strip">
                  {r.dropIds.map((did, i) => {
                    const p = byId.get(did);
                    return p ? <Shot key={did} media={p.payload!.media![0]!} className={`rl-s${i % 2}`} /> : <span key={did} className="rl-shot locked"><Doodle id="amplop" size={20} /></span>;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
