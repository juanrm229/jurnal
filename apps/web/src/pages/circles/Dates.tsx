/** Tanggal Penting: hari jadi, ulang tahun, dan tanggal-tanggal kalian sendiri. */
import { countdownText, formatDayLong, type ImportantDateWire, upcomingDates } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, sealCircleText, useMe, useToday } from '@/lib/data';
import { Doodle, Sheet, useToast } from '@/ui/kit';

export function DatesCard({ circle }: { circle: CircleView }) {
  const me = useMe();
  const today = useToday();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dates', circle.id], queryFn: () => api.get<ImportantDateWire[]>(`/circles/${circle.id}/dates`) });
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [withYear, setWithYear] = useState(true);
  const [busy, setBusy] = useState(false);

  const list = upcomingDates({
    today,
    circleCreatedDay: circle.createdDay,
    members: circle.active.map((m) => ({ userId: m.userId, name: m.userId === me.user.id ? 'kamu' : m.penName, birthday: m.birthday })),
    custom: (q.data ?? []).map((d) => ({ id: d.id, title: openCircleText(circle, d.titleEnc, 'tanggal kalian'), month: d.month, day: d.day, year: d.year })),
  });
  const first = list[0];
  const rest = list.slice(1, all ? list.length : 4);

  const save = async () => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!title.trim() || !m) return;
    setBusy(true);
    try {
      await api.post(`/circles/${circle.id}/dates`, { titleEnc: sealCircleText(circle, title.trim()), month: Number(m[2]), day: Number(m[3]), year: withYear ? Number(m[1]) : null });
      await qc.invalidateQueries({ queryKey: ['dates', circle.id] });
      setTitle('');
      setDate('');
      setOpen(false);
      toast('tanggal tersimpan. kami ingatkan 7 hari sebelumnya.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.del(`/circles/${circle.id}/dates/${id}`);
      await qc.invalidateQueries({ queryKey: ['dates', circle.id] });
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <section className="card dt" data-testid="dates-card">
      <div className="row between">
        <span className="label">tanggal penting</span>
        <button className="pill" onClick={() => setOpen(true)} data-testid="dates-add">
          <Doodle id="ui-tambah" size={14} color="currentColor" /> tambah
        </button>
      </div>
      {first ? (
        <div className={`dt-next${first.inDays === 0 ? ' today' : ''}`}>
          <Doodle id={first.doodle} size={40} />
          <div className="grow">
            <div className="dt-title">{first.title}</div>
            <div className="tiny soft">
              {formatDayLong(first.date)}
              {first.nth ? ` · ke-${first.nth}` : ''}
            </div>
          </div>
          <div className="dt-count">
            {first.inDays > 2 ? (
              <>
                <b>{first.inDays}</b>
                <span>hari lagi</span>
              </>
            ) : (
              <b className="dt-word">{countdownText(first.inDays)}</b>
            )}
          </div>
        </div>
      ) : (
        <p className="small soft" style={{ margin: '8px 0 0' }}>
          Belum ada tanggal. Tambahkan hari pertama bertemu, hari jadian, atau tanggal kecil yang hanya kalian yang paham.
        </p>
      )}
      {rest.length ? (
        <ul className="dt-list">
          {rest.map((d) => (
            <li key={d.key}>
              <Doodle id={d.doodle} size={18} />
              <span className="grow small">
                {d.title}
                {d.nth ? <span className="tiny soft"> · ke-{d.nth}</span> : null}
              </span>
              <span className="tiny soft">{countdownText(d.inDays)}</span>
              {d.kind === 'custom' ? (
                <button className="dt-x" aria-label={`hapus ${d.title}`} onClick={() => void remove(d.key)}>
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {list.length > 4 ? (
        <button className="tiny soft dt-more" onClick={() => setAll((x) => !x)}>
          {all ? 'ringkas' : `lihat semua (${list.length})`}
        </button>
      ) : null}
      {!circle.active.some((m) => m.userId === me.user.id && m.birthday) ? (
        <p className="tiny soft" style={{ margin: '8px 0 0' }}>
          Isi ulang tahunmu di profil supaya mereka diingatkan sehari sebelumnya.
        </p>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="tanggal penting baru">
        <div className="col" style={{ gap: 10 }}>
          <input className="field hand" style={{ fontSize: 24 }} maxLength={80} value={title} placeholder="mis. pertama kali bertemu" onChange={(e) => setTitle(e.target.value)} data-testid="dates-title" />
          <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="dates-date" />
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={withYear} onChange={(e) => setWithYear(e.target.checked)} />
            <span className="small">ingat tahunnya (supaya ada hitungan “ke-2, ke-3…”)</span>
          </label>
          <p className="tiny soft" style={{ margin: 0 }}>
            Judulnya terenkripsi. Server hanya tahu tanggalnya, untuk mengingatkan kalian 7 hari sebelumnya dan pada hari itu.
          </p>
          <button className="btn" onClick={save} disabled={busy || !title.trim() || !date} data-testid="dates-save">
            {busy ? 'menyimpan…' : 'simpan tanggal'}
          </button>
        </div>
      </Sheet>
    </section>
  );
}
