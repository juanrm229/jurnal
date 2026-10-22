import { COPY, type Me, MIN_AGE } from '@sehari/core';
import { useState } from 'react';
import { api } from '@/lib/api';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { CityPicker } from '@/ui/art';
import { Doodle, Section } from '@/ui/kit';

export const AVATARS = ['tunas', 'bunga-matahari', 'kaktus', 'jamur', 'siput', 'lebah', 'kucing', 'apel', 'labu', 'tulip', 'kupu-kupu', 'burung'];

export default function Profil() {
  const { me, setMe } = useSession();
  const t = COPY.onboarding;
  const [penName, setPenName] = useState(me?.user.penName ?? '');
  const [birthYear, setBirthYear] = useState(me?.user.birthYear ? String(me.user.birthYear) : '');
  const [cityId, setCityId] = useState<string | null>(me?.user.cityId ?? null);
  const [tz, setTz] = useState(me?.user.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Jakarta');
  const [doodle, setDoodle] = useState(me?.user.doodle ?? 'tunas');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const year = Number(birthYear);
  const tooYoung = birthYear.length === 4 && new Date().getFullYear() - year < MIN_AGE;
  const valid = penName.trim().length > 0 && birthYear.length === 4 && !tooYoung && !!cityId;

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const updated = await api.patch<Me>('/me', { penName: penName.trim(), birthYear: year, cityId, homeCityId: me?.user.homeCityId ?? cityId, tz, doodle });
      setMe(updated);
      navigate('/mulai/kunci', { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <div className="col center rise" style={{ alignItems: 'center', marginTop: 24 }}>
        <Doodle id={doodle} size={84} draw key={doodle} />
        <div className="title ink">{t.penName.title}</div>
        <p className="soft" style={{ maxWidth: 420 }}>{t.penName.body}</p>
      </div>
      <input className="field hand mt" style={{ fontSize: 30 }} value={penName} maxLength={40} onChange={(e) => setPenName(e.target.value)} placeholder={t.penName.placeholder} autoFocus />
      <p className="tiny soft">{t.penName.note}</p>
      <Section title="doodle-mu">
        <div className="row wrap" style={{ gap: 10 }}>
          {AVATARS.map((a) => (
            <button key={a} aria-label={a} aria-pressed={a === doodle} onClick={() => setDoodle(a)} style={{ padding: 8, borderRadius: 16, border: 0, background: a === doodle ? 'var(--pill)' : 'var(--card)' }}>
              <Doodle id={a} size={36} />
            </button>
          ))}
        </div>
      </Section>
      <Section title="tahun lahir">
        <input className="field" inputMode="numeric" placeholder="1999" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        <p className="tiny soft">{tooYoung ? COPY.onboarding.ageGate.declined : 'Hanya untuk memastikan usia 18+. Tidak ditampilkan ke siapa pun.'}</p>
      </Section>
      <Section title={t.city.title.toLowerCase()}>
        <p className="small soft">{t.city.body}</p>
        <CityPicker value={cityId} onChange={(c) => { setCityId(c.id); setTz(c.tz); }} />
        <p className="tiny soft">{t.city.sunsetNote}</p>
      </Section>
      {err ? <p className="small" style={{ color: 'var(--danger)' }}>{err}</p> : null}
      <button className="btn mt-lg" disabled={!valid || busy} onClick={save}>{busy ? 'menyimpan…' : 'lanjut'}</button>
    </main>
  );
}
