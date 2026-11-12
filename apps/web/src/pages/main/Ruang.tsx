/**
 * RUANG MAIN: semua permainan bersama Sehari di satu tempat. Satu kotak kode
 * untuk masuk ke meja mana pun, lalu daftar permainan, yang siap dan yang
 * sedang disiapkan.
 */
import { useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { callGame } from '@/lib/sidik';
import { Doodle, useToast } from '@/ui/kit';
import { ScreenTitle } from '@/ui/shell';

const GAMES: { id: string; nama: string; asal?: string; doodle: string; orang: string; kata: string; to?: string }[] = [
  { id: 'titip', nama: 'Titip Surat', asal: 'gaya Love Letter', doodle: 'amplop', orang: '2–6', kata: 'Kartu deduksi: tebak isi tangan lawan, bertahan sampai kartu terakhir.', to: '/main/titip' },
  { id: 'sidik', nama: 'SIDIK', doodle: 'ui-cari', orang: '2–20', kata: 'Detektif bersama. Ada yang berbohong di antara kalian.', to: '/sidik' },
  { id: 'saudagar', nama: 'Saudagar', asal: 'gaya Monopoli', doodle: 'rumah', orang: '2–8', kata: 'Aturan resmi lengkap: lelang, tukar-menukar, rumah & hotel di kota-kota Indonesia.', to: '/main/saudagar' },
  { id: 'kartu-satu', nama: 'Kartu Satu', asal: 'gaya UNO', doodle: 'kartu', orang: '2–10', kata: 'Aturan ori atau tongkrongan: tumpuk plus, salip, sampai ketemu yang kalah.', to: '/main/satu' },
  { id: 'ular-tangga', nama: 'Ular Tangga', doodle: 'ui-dadu', orang: '2–6', kata: 'Dua dadu: satu untuk jalan, satu untuk mendorong lawan ke mulut ular. Ada kartu aksi & musim.', to: '/main/tangga' },
  { id: 'petasan', nama: 'Kucing Petasan', asal: 'gaya Exploding Kittens', doodle: 'kucing', orang: '2–10', kata: 'Ambil kartu dan berdoa. Siram Air, Serbu!, dan Ogah! kapan saja. Yang terakhir selamat menang.', to: '/main/petasan' },
  { id: 'istana', nama: 'Rahasia Istana', asal: 'gaya Secret Hitler', doodle: 'gembok-hati', orang: '5–10', kata: 'Kubu tersembunyi, undang-undang, dan pemimpin yang tak boleh terpilih.' },
  { id: 'kembang-api', nama: 'Kembang Api', asal: 'gaya Hanabi', doodle: 'kembang-api', orang: '2–5', kata: 'Kooperatif: kamu melihat kartu semua orang kecuali kartumu. Nyalakan pertunjukan bersama.', to: '/main/kembang' },
  { id: 'tambang', nama: 'Tambang', asal: 'gaya Saboteur', doodle: 'peta', orang: '3–10', kata: 'Gali jalan menuju emas. Di antara penambang ada penyabot.' },
];

/** Yang bukan permainan meja, tapi tetap urusan bermain. */
const LAIN = [
  { to: '/photobox', nama: 'photobox', doodle: 'bingkai-polaroid' },
  { to: '/tentang-kita', nama: 'tentang kita', doodle: 'gelembung-kata' },
  { to: '/kartu', nama: 'kartu ucapan', doodle: 'amplop' },
];

export default function RuangMain() {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const masuk = async () => {
    setBusy(true);
    try {
      // Kode meja unik di semua permainan baru; SIDIK punya ruangnya sendiri.
      for (const [base, path] of [['titip', '/main/titip'], ['satu', '/main/satu'], ['tangga', '/main/tangga'], ['saudagar', '/main/saudagar'], ['petasan', '/main/petasan'], ['kembang', '/main/kembang']] as const) if (await callGame(base, 'GET', `/rooms/${code}?tv=1`).then(() => true, () => false)) return navigate(`${path}/${code}`);
      navigate(`/sidik/${code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="screen sd-screen rm-screen">
      <ScreenTitle title="main" sub="Permainan bersama, satu HP per orang." />
      <section className="rm-hero">
        <Doodle id="dadu" size={64} draw />
        <p className="sd-hero-sub">Kumpul, buka meja, dan main bersama. Teman tanpa akun Sehari bisa ikut lewat QR atau kode.</p>
      </section>
      <div className="sd-joincode">
        <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} data-testid="rm-kode" />
        <button className="btn soft" disabled={code.length !== 4 || busy} onClick={() => void masuk()}>
          masuk
        </button>
      </div>
      <Link to="/cerita" className="cerita-pintu" data-testid="rm-cerita">
        <Doodle id="pena" size={40} color="currentColor" />
        <span className="grow">
          <b>Hidup Orang Lain</b>
          <span className="tiny">1–5 penulis · tidak perlu serentak</span>
          <span className="small">Kamu menulis apa yang terjadi. Orang lain menulis apa yang ia kira terjadi. Tiga putaran, lalu jadi cerpen.</span>
        </span>
        <Doodle id="ui-panah-kanan" size={18} color="currentColor" />
      </Link>
      <Link to="/kota" className="kota-pintu" data-testid="rm-kota">
        <span className="kota-pintu-peta" aria-hidden />
        <span className="kota-pintu-isi">
          <span className="kp-musim">kota sehari · musim 1</span>
          <b>Kota Sangkala</b>
          <span className="small">Patok satu rumah di peta kota, pilih zamannya, dan tulis keluarganya. Kota ini dibangun oleh warganya.</span>
        </span>
      </Link>
      <div className="rm-daftar">
        {GAMES.map((g) => (
          <button key={g.id} className={`rm-game ${g.to ? '' : 'segera'}`} disabled={!g.to} onClick={() => g.to && navigate(g.to)} data-testid={`rm-${g.id}`}>
            <span className="sd-tape" />
            <Doodle id={g.doodle} size={40} color="currentColor" />
            <span className="grow">
              <b>{g.nama}</b>
              <span className="tiny">
                {g.orang} orang{g.asal ? ` · ${g.asal}` : ''}
              </span>
              <span className="small">{g.kata}</span>
            </span>
            {g.to ? <Doodle id="ui-panah-kanan" size={18} color="currentColor" /> : <span className="rm-segera">segera</span>}
          </button>
        ))}
      </div>
      <span className="label" style={{ display: 'block', marginTop: 28 }}>juga di ruang ini</span>
      <div className="rm-lain" style={{ marginTop: 8 }}>
        {LAIN.map((x) => (
          <Link key={x.to} to={x.to} className="card">
            <Doodle id={x.doodle} size={34} />
            {x.nama}
          </Link>
        ))}
      </div>
    </main>
  );
}
