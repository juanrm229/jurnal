/**
 * RUANG MAIN: semua permainan bersama Sehari di satu tempat. Satu kotak kode
 * untuk masuk ke meja mana pun, lalu daftar permainan, yang siap dan yang
 * sedang disiapkan.
 */
import { useState } from 'react';
import { navigate } from '@/lib/router';
import { callGame } from '@/lib/sidik';
import { Doodle, Header, useToast } from '@/ui/kit';

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
      <Header title="Ruang Main" sub="permainan bersama, satu HP per orang" backTo="/hari" />
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
    </main>
  );
}
