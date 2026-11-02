/**
 * Susulan dari galeri: pilih foto, kelompokkan per tanggal foto diambil (EXIF),
 * lalu titipkan ke hari-harinya. Hari dalam jendela susulan (7 hari) masuk ke
 * halaman hari itu dan tetap perlu disegel; hari yang lebih lama menjadi
 * kenangan susulan: terlihat lingkaran, mengusir kabut, tapi tidak menambah api.
 */
import { addDays, BACKFILL_MAX_DAYS, diffDays, formatDayLong, sealableDays, todayIn } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { buildDropBody, newDropId, useCircles, useMe, useToday } from '@/lib/data';
import { exifDay } from '@/lib/exif';
import { defaultFlashCircles, flashTargets } from '@/lib/flash';
import { uploadPhoto } from '@/lib/media';
import { Link } from '@/lib/router';
import { useSession } from '@/lib/session';
import { Doodle, Header, useToast } from '@/ui/kit';

interface Pick {
  id: string;
  file: File;
  url: string;
  day: string;
  fromExif: boolean;
}

type Kind = 'today' | 'page' | 'memory' | 'too-old' | 'future';

export default function Susulan() {
  const me = useMe();
  const today = useToday();
  const toast = useToast();
  const qc = useQueryClient();
  const { identity } = useSession();
  const { circles } = useCircles();
  const targets = flashTargets(circles);
  const fileIn = useRef<HTMLInputElement>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ pages: string[]; memories: number } | null>(null);
  const circleIds = chosen ?? defaultFlashCircles(circles);
  const catchUp = useMemo(() => new Set(sealableDays(me.user.tz)), [me.user.tz]);

  useEffect(() => () => picks.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const kindOf = (day: string): Kind => {
    if (day > today) return 'future';
    if (day === today) return 'today';
    if (catchUp.has(day)) return 'page';
    if (diffDays(today, day) > BACKFILL_MAX_DAYS) return 'too-old';
    return 'memory';
  };

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const list: Pick[] = [];
    for (const f of [...files].slice(0, 40)) {
      if (!f.type.startsWith('image/')) continue;
      const ex = await exifDay(f);
      const day = ex ?? todayIn(me.user.tz, new Date(f.lastModified || Date.now()));
      list.push({ id: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`, file: f, url: URL.createObjectURL(f), day, fromExif: !!ex });
    }
    setPicks((p) => [...p, ...list]);
    setResult(null);
  };

  const groups = useMemo(() => {
    const m = new Map<string, Pick[]>();
    for (const p of picks) (m.get(p.day) ?? m.set(p.day, []).get(p.day)!).push(p);
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [picks]);

  const moveGroup = (from: string, to: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) return;
    setPicks((ps) => ps.map((p) => (p.day === from ? { ...p, day: to } : p)));
  };

  const sendable = picks.filter((p) => ['today', 'page', 'memory'].includes(kindOf(p.day)));

  const send = async () => {
    if (!identity || !sendable.length) return;
    const chosenCircles = targets.filter((c) => circleIds.includes(c.id));
    if (!chosenCircles.length) {
      toast('Pilih lingkaran tujuan.');
      return;
    }
    setBusy({ done: 0, total: sendable.length });
    const pages = new Set<string>();
    let memories = 0;
    try {
      const own = chosenCircles.filter((c) => c.me?.ownPage);
      const main = chosenCircles.filter((c) => !c.me?.ownPage);
      const dests: { circleIds: string[]; pageCircleId?: string }[] = [...(main.length ? [{ circleIds: main.map((c) => c.id) }] : []), ...own.map((c) => ({ circleIds: [c.id], pageCircleId: c.id }))];
      let done = 0;
      for (const p of sendable) {
        const k = kindOf(p.day);
        const ref = await uploadPhoto(p.file);
        const memory = k === 'memory';
        const payload = { v: 1 as const, kind: 'photo' as const, hour: 12, minute: 0, tz: me.user.tz, cityId: me.user.cityId ?? undefined, media: [ref], tags: memory ? ['susulan'] : undefined };
        for (const d of dests) {
          const body = buildDropBody(
            { day: p.day, payload, audience: 'circle', circleIds: d.circleIds, pageCircleId: d.pageCircleId, mediaIds: [ref.id], meta: memory ? { backfill: true } : undefined },
            { me, identity, circles, id: newDropId() },
          );
          await api.post('/drops', body);
        }
        if (memory) memories++;
        else pages.add(p.day);
        setBusy({ done: ++done, total: sendable.length });
      }
      picks.forEach((x) => URL.revokeObjectURL(x.url));
      setPicks((ps) => ps.filter((x) => !sendable.includes(x)));
      setResult({ pages: [...pages].sort(), memories });
      void qc.invalidateQueries();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const LABEL: Record<Kind, { text: string; tone: string }> = {
    today: { text: 'masuk halaman hari ini', tone: 'ok' },
    page: { text: 'masuk halaman hari itu · segel untuk berbagi', tone: 'ok' },
    memory: { text: 'kenangan susulan · langsung terlihat, tanpa api', tone: 'memory' },
    'too-old': { text: 'lebih dari setahun · belum bisa', tone: 'no' },
    future: { text: 'tanggal di masa depan · ubah dulu', tone: 'no' },
  };

  return (
    <main className="screen ss">
      <Header title="susulan dari galeri" sub="hari yang terlewat, diisi pelan-pelan" backTo="/hari" />
      <p className="small soft ss-intro">
        Lupa menulis beberapa hari? Pilih foto dari galeri; kami membaca tanggal foto diambil dan menitipkannya ke harinya. Hari dalam 7 hari terakhir masuk ke halamannya (tetap perlu disegel). Hari yang lebih lama menjadi <b>kenangan susulan</b>: mengusir kabut di papan, tapi tidak menambah api, supaya api tetap jujur.
      </p>
      <button className="btn" onClick={() => fileIn.current?.click()} disabled={!!busy} data-testid="susulan-pick">
        <Doodle id="ui-foto" size={20} color="currentColor" /> {picks.length ? 'tambah foto' : 'pilih foto dari galeri'}
      </button>
      <input ref={fileIn} type="file" accept="image/*" multiple hidden onChange={(e) => void add(e.target.files).then(() => (e.target.value = ''))} data-testid="susulan-input" />

      {result ? (
        <div className="card ss-done mt" data-testid="susulan-done">
          <Doodle id="tunas" size={34} />
          <div className="grow">
            <b className="ink">Tersimpan.</b>
            <p className="small" style={{ margin: '4px 0 0' }}>
              {result.memories ? `${result.memories} kenangan susulan sudah terlihat lingkaranmu. ` : ''}
              {result.pages.length ? 'Jangan lupa menyegel halamannya supaya mereka bisa membuka:' : ''}
            </p>
            {result.pages.length ? (
              <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                {result.pages.map((d) => (
                  <Link key={d} to={d === today ? '/hari' : `/hari/${d}`} className="pill">
                    segel {formatDayLong(d, false).toLowerCase()}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {groups.map(([day, list]) => {
        const k = kindOf(day);
        return (
          <section key={day} className="section ss-group" data-testid="susulan-group">
            <div className="row between ss-head">
              <div>
                <b className="small">{formatDayLong(day)}</b>
                <div className={`ss-kind ${LABEL[k].tone}`}>{LABEL[k].text}</div>
              </div>
              <label className="ss-date">
                <span className="tiny soft">ubah tanggal</span>
                <input type="date" value={day} max={today} min={addDays(today, -BACKFILL_MAX_DAYS)} onChange={(e) => moveGroup(day, e.target.value)} />
              </label>
            </div>
            <div className="ss-grid">
              {list.map((p) => (
                <span key={p.id} className="ss-thumb">
                  <img src={p.url} alt="" />
                  {!p.fromExif ? <span className="ss-guess" title="tanggal ditebak dari berkas">?</span> : null}
                  <button className="ss-x" aria-label="lepas" onClick={() => setPicks((ps) => ps.filter((x) => x.id !== p.id))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </section>
        );
      })}

      {picks.length ? (
        <section className="section">
          {targets.length > 1 ? (
            <>
              <span className="label">untuk lingkaran</span>
              <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
                {targets.map((c) => {
                  const on = circleIds.includes(c.id);
                  return (
                    <button key={c.id} className={`pill${on ? ' active' : ''}`} onClick={() => setChosen(on ? circleIds.filter((x) => x !== c.id) : [...circleIds, c.id])}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
          <button className="btn" onClick={send} disabled={!!busy || !sendable.length || !targets.length} data-testid="susulan-send">
            {busy ? `mengunggah ${busy.done}/${busy.total}…` : `titipkan ${sendable.length} foto`}
          </button>
          {picks.length > sendable.length ? <p className="tiny soft center" style={{ marginTop: 8 }}>{picks.length - sendable.length} foto belum bisa dititipkan; ubah tanggalnya dulu.</p> : null}
          <p className="tiny soft center" style={{ marginTop: 6 }}>Tanda “?” berarti tanggalnya ditebak dari berkas, bukan dari kamera.</p>
        </section>
      ) : null}
    </main>
  );
}
