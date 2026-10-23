/** Buat atau ubah janji temu. Setiap kolom bisa diacak kalau sedang buntu. */
import { DATE_ACTIVITIES, DATE_CHALLENGES, DATE_DRESSCODES, DATE_FOODS, DATE_PLACES, DATE_QUESTIONS, type DateIdea } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useCircles } from '@/lib/data';
import { dk, linkDreamMeet } from '@/lib/dreams';
import { createMeet, type MeetPayload, newMeetId, updateMeet, useMeet, useRefreshMeets } from '@/lib/meets';
import { navigate, useParams, usePath } from '@/lib/router';
import { useReady } from '@/lib/session';
import { sound } from '@/lib/sound';
import { Doodle, Growing, Header, useToast } from '@/ui/kit';

const pick = (list: DateIdea[], not?: string) => {
  const pool = list.filter((x) => x.text !== not);
  return pool[Math.floor(Math.random() * pool.length)]!.text;
};

/** "2026-10-25T19:00" untuk input datetime-local, di zona waktu perangkat. */
const localInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function nextSaturdayEvening() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(19, 0, 0, 0);
  return d;
}

export default function JanjiForm() {
  const { me, identity } = useReady();
  const { circles } = useCircles();
  const toast = useToast();
  const refresh = useRefreshMeets();
  const qc = useQueryClient();
  const params = useParams<{ id?: string }>();
  const { search } = usePath();
  const editing = useMeet(params.id ?? '');
  const active = useMemo(() => circles.filter((c) => c.status === 'active' && c.me?.state === 'active' && c.kind !== 'moment'), [circles]);

  const [circleId, setCircleId] = useState<string>(search.get('circleId') ?? '');
  const [when, setWhen] = useState(localInput(nextSaturdayEvening()));
  const [plan, setPlan] = useState<MeetPayload>(() => ({
    v: 1,
    title: search.get('title') ?? '',
    place: { name: search.get('place') ?? '', address: '' },
    activity: search.get('activity') ?? '',
    food: search.get('food') ?? '',
    dress: search.get('dress') ?? '',
    challenge: search.get('challenge') ?? '',
    question: search.get('question') ?? '',
    budget: search.get('budget') ?? '',
    notes: '',
  }));
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!params.id);

  useEffect(() => {
    if (!circleId && active[0]) setCircleId(active[0].id);
  }, [active.length]);
  useEffect(() => {
    const m = editing.meet;
    if (!params.id || !m?.plan || loaded) return;
    // Dari mesin acak: kolom yang dibawa menimpa rencana lama.
    const o = (k: string) => search.get(k) ?? undefined;
    setPlan({ ...m.plan, ...(o('place') ? { place: { name: o('place')!, address: '' } } : {}), activity: o('activity') ?? m.plan.activity, food: o('food') ?? m.plan.food, dress: o('dress') ?? m.plan.dress, challenge: o('challenge') ?? m.plan.challenge, question: o('question') ?? m.plan.question, budget: o('budget') ?? m.plan.budget });
    setCircleId(m.wire.circleId);
    setWhen(localInput(new Date(m.wire.startsAt)));
    setLoaded(true);
  }, [editing.meet]);

  if (!loaded) return <Growing label="membuka rencana…" />;
  const circle = active.find((c) => c.id === circleId);
  const set = (k: keyof MeetPayload, v: string) => setPlan((p) => ({ ...p, [k]: v }));
  const dice = (k: keyof MeetPayload, list: DateIdea[]) => {
    sound.play('pop');
    setPlan((p) => ({ ...p, [k]: pick(list, p[k] as string) }));
  };

  const save = async () => {
    if (!circle) return toast('Pilih lingkaran dulu.');
    if (!plan.place.name.trim()) return toast('Mau ke mana? Isi tempatnya dulu, atau acak.');
    const title = plan.title.trim() || `${plan.activity?.split(' ').slice(0, 4).join(' ') || 'janji'} di ${plan.place.name}`;
    setBusy(true);
    try {
      const startsAt = new Date(when);
      const p = { ...plan, title };
      const meId = { id: me.user.id, publicKey: identity.publicKey };
      if (params.id) {
        await updateMeet(params.id, circle, { startsAt, plan: p }, meId);
        sound.play('chime');
        navigate(`/janji/${params.id}`, { replace: true });
      } else {
        const id = newMeetId();
        await createMeet(id, circle, startsAt, p, meId);
        // Dari Daftar Mimpi: sambungkan mimpinya ke janji ini.
        const dream = search.get('mimpi');
        if (dream) {
          await linkDreamMeet(dream, id).catch(() => {});
          await qc.invalidateQueries({ queryKey: dk.circle(circle.id) });
        }
        sound.play('chime');
        navigate(`/janji/${id}?baru=1`, { replace: true });
      }
      void refresh();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Dipanggil sebagai fungsi (bukan komponen) supaya input tidak dipasang ulang saat mengetik.
  const field = ({ k, label, placeholder, list, icon }: { k: keyof MeetPayload; label: string; placeholder: string; list?: DateIdea[]; icon: string }) => (
    <label className="plan-field">
      <span className="plan-label">
        <Doodle id={icon} size={18} /> {label}
      </span>
      <span className="row" style={{ gap: 6 }}>
        <input className="field grow" value={(plan[k] as string) ?? ''} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} />
        {list ? (
          <button type="button" className="icon-btn dice" aria-label={`acak ${label}`} onClick={() => dice(k, list)} data-sound="none">
            <Doodle id="ui-dadu" size={22} />
          </button>
        ) : null}
      </span>
    </label>
  );

  return (
    <main className="screen">
      <Header title={params.id ? 'ubah janji' : 'janji baru'} backTo="/janji" />
      {active.length === 0 ? (
        <p className="small soft">Buat lingkaran dulu untuk mengajak seseorang janjian.</p>
      ) : (
        <div className="col gap-lg plan-form">
          {active.length > 1 ? (
            <div className="chip-row">
              {active.map((c) => (
                <button key={c.id} className={`pill ${circleId === c.id ? 'active' : ''}`} onClick={() => setCircleId(c.id)}>
                  <Doodle id={c.doodle} size={16} color="currentColor" /> {c.name}
                </button>
              ))}
            </div>
          ) : null}
          <input className="field plan-title" value={plan.title} placeholder="judul janji (boleh nanti)" maxLength={80} onChange={(e) => set('title', e.target.value)} />
          <label className="plan-field">
            <span className="plan-label">
              <Doodle id="ui-jam" size={18} /> kapan
            </span>
            <input className="field" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          <label className="plan-field">
            <span className="plan-label">
              <Doodle id="ui-lokasi" size={18} /> di mana
            </span>
            <span className="row" style={{ gap: 6 }}>
              <input className="field grow" value={plan.place.name} placeholder="nama tempat" onChange={(e) => setPlan((p) => ({ ...p, place: { ...p.place, name: e.target.value } }))} />
              <button type="button" className="icon-btn dice" aria-label="acak tempat" data-sound="none" onClick={() => { sound.play('pop'); setPlan((p) => ({ ...p, place: { ...p.place, name: pick(DATE_PLACES, p.place.name) } })); }}>
                <Doodle id="ui-dadu" size={22} />
              </button>
            </span>
            <input className="field mt" value={plan.place.address ?? ''} placeholder="alamat / patokan (opsional)" onChange={(e) => setPlan((p) => ({ ...p, place: { ...p.place, address: e.target.value } }))} />
          </label>
          {field({ k: "activity", label: "ngapain", placeholder: "jalan sore, nonton, masak bareng…", list: DATE_ACTIVITIES, icon: "sepeda" })}
          {field({ k: "food", label: "makan apa", placeholder: "martabak, seblak, pasta…", list: DATE_FOODS, icon: "martabak" })}
          {field({ k: "dress", label: "dresscode", placeholder: "opsional, biar seru", list: DATE_DRESSCODES, icon: "kacamata" })}
          {field({ k: "challenge", label: "misi kecil", placeholder: "opsional", list: DATE_CHALLENGES, icon: "bintang-kecil" })}
          {field({ k: "question", label: "obrolan pemantik", placeholder: "opsional", list: DATE_QUESTIONS, icon: "gelembung-kata" })}
          {field({ k: "budget", label: "budget", placeholder: "mis. patungan, maks 100rb", icon: "kado" })}
          <label className="plan-field">
            <span className="plan-label">
              <Doodle id="pena" size={18} /> catatan
            </span>
            <textarea className="field" rows={3} value={plan.notes ?? ''} placeholder="jemput jam berapa, bawa payung, dll." onChange={(e) => set('notes', e.target.value)} />
          </label>
          <button className="btn" disabled={busy} onClick={() => void save()}>
            {busy ? 'menyimpan…' : params.id ? 'simpan perubahan' : 'kirim ajakan'}
          </button>
          <p className="tiny soft center">Isi rencana terenkripsi — hanya lingkaranmu yang bisa membacanya. Server hanya tahu jamnya, untuk pengingat.</p>
        </div>
      )}
    </main>
  );
}
