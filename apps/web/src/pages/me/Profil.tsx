/** Ubah profil: nama pena, doodle, kota sekarang & asal, ulang tahun. */
import { getCity, type Me, zoneLabel } from '@sehari/core';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/data';
import { back } from '@/lib/router';
import { useSession } from '@/lib/session';
import { CityPicker } from '@/ui/art';
import { Avatar, Doodle, Header, Section, Toggle } from '@/ui/kit';
import { ErrText, errMsg, Note } from './kit';

const AVATARS = [
  'tunas', 'bunga-matahari', 'kaktus', 'jamur', 'siput', 'lebah', 'kucing', 'apel', 'labu', 'tulip', 'kupu-kupu', 'burung',
  'kelinci', 'landak', 'katak', 'bebek', 'ikan', 'kepik', 'capung', 'teratai', 'anggrek', 'semanggi', 'cangkir', 'gitar',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function ProfilEdit() {
  const me = useMe();
  const { setMe } = useSession();
  const u = me.user;
  const [penName, setPenName] = useState(u.penName ?? '');
  const [doodle, setDoodle] = useState(u.doodle);
  const [cityId, setCityId] = useState<string | null>(u.cityId);
  const [tz, setTz] = useState(u.tz);
  const [homeSame, setHomeSame] = useState(!u.homeCityId || u.homeCityId === u.cityId);
  const [homeCityId, setHomeCityId] = useState<string | null>(u.homeCityId);
  const [bMonth, setBMonth] = useState<number | null>(u.birthday ? Number(u.birthday.slice(0, 2)) : null);
  const [bDay, setBDay] = useState(u.birthday ? String(Number(u.birthday.slice(3, 5))) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dayNum = Number(bDay);
  const birthdayValid = bMonth === null ? bDay === '' : dayNum >= 1 && dayNum <= DAYS_IN[bMonth - 1]!;
  const birthday = bMonth !== null && birthdayValid ? `${String(bMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : null;
  const valid = penName.trim().length > 0 && !!cityId && birthdayValid;
  const city = getCity(cityId);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const updated = await api.patch<Me>('/me', {
        penName: penName.trim(),
        doodle,
        cityId,
        tz,
        homeCityId: homeSame ? cityId : (homeCityId ?? cityId),
        birthday,
      });
      setMe(updated);
      back('/aku');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <Header title="profil" backTo="/aku" />
      <div className="col center rise" style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Avatar doodle={doodle} size={84} sealed />
        <div className="hand" style={{ fontSize: 30 }}>{penName.trim() || 'tanpa nama'}</div>
      </div>

      <Section title="nama pena">
        <input className="field" value={penName} maxLength={40} onChange={(e) => setPenName(e.target.value)} placeholder="misalnya: Naya, atau Kucing Oranye" />
        <p className="tiny soft" style={{ margin: '6px 0 0' }}>
          Nama yang muncul di kitab lingkaranmu. Julukan tokoh diberikan teman-temanmu di pengaturan lingkaran.
        </p>
      </Section>

      <Section title="doodle-mu">
        <div className="row wrap" style={{ gap: 10 }}>
          {AVATARS.map((a) => (
            <button
              key={a}
              aria-label={a}
              aria-pressed={a === doodle}
              onClick={() => setDoodle(a)}
              style={{ padding: 8, borderRadius: 16, background: a === doodle ? 'var(--pill)' : 'var(--card)', border: `1px solid ${a === doodle ? 'var(--ink)' : 'var(--card-edge)'}` }}>
              <Doodle id={a} size={32} />
            </button>
          ))}
        </div>
      </Section>

      <Section title="kota sekarang">
        <p className="small soft" style={{ margin: '0 0 8px' }}>
          Untuk zona waktu dan jam senja. Hanya nama kota, tidak pernah lokasi persis.
        </p>
        <CityPicker
          value={cityId}
          onChange={(x) => {
            setCityId(x.id);
            setTz(x.tz);
          }}
        />
        {city && tz !== u.tz ? <p className="tiny soft" style={{ margin: '6px 0 0' }}>zona waktu ikut berubah: {zoneLabel(tz)}</p> : null}
      </Section>

      <Section title="kota asal">
        <p className="small soft" style={{ margin: '0 0 4px' }}>
          Kampung halaman, atau kota yang terasa seperti rumah. Saat kamu menyimpan hari dari kota lain, mungkin ada tiket kecil yang mampir ke Lemari Benda.
        </p>
        <Toggle label="sama dengan kota sekarang" value={homeSame} onChange={setHomeSame} />
        {!homeSame ? <CityPicker value={homeCityId} onChange={(x) => setHomeCityId(x.id)} /> : null}
      </Section>

      <Section
        title="ulang tahun (opsional)"
        right={
          bMonth !== null ? (
            <button
              className="pill"
              onClick={() => {
                setBMonth(null);
                setBDay('');
              }}>
              kosongkan
            </button>
          ) : undefined
        }>
        <p className="small soft" style={{ margin: '0 0 8px' }}>
          Hanya tanggal dan bulan, tanpa tahun. Di hari itu lingkaranmu bisa menarik kartu langka untukmu.
        </p>
        <div className="row wrap" style={{ gap: 6 }}>
          {MONTHS.map((m, i) => (
            <button key={m} className={bMonth === i + 1 ? 'pill active' : 'pill'} aria-pressed={bMonth === i + 1} onClick={() => setBMonth(i + 1)}>
              {m}
            </button>
          ))}
        </div>
        {bMonth !== null ? (
          <div className="col" style={{ marginTop: 10, width: 140, gap: 4 }}>
            <span className="label">tanggal</span>
            <input className="field" inputMode="numeric" placeholder="1–31" value={bDay} onChange={(e) => setBDay(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </div>
        ) : null}
        {!birthdayValid ? (
          <p className="tiny" style={{ margin: '6px 0 0', color: 'var(--danger)' }}>
            Tanggalnya belum pas untuk bulan itu.
          </p>
        ) : null}
        <Note color="blue" style={{ marginTop: 12 }}>
          Tanggal ini terlihat oleh orang-orang di lingkaranmu, supaya mereka bisa ikut merayakan. Tidak pernah ditampilkan ke luar.
        </Note>
      </Section>

      <div className="col mt-lg" style={{ gap: 8 }}>
        <ErrText center>{err}</ErrText>
        <button className="btn" onClick={() => void save()} disabled={!valid || busy}>
          {busy ? 'menyimpan…' : 'simpan'}
        </button>
      </div>
    </main>
  );
}
