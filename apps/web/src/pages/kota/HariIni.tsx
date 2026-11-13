/**
 * Hari ini di Sangkala: sudut koran kecil di halaman jurnal. Isinya dari kota ke jurnal,
 * satu arah; isi jurnal tidak pernah keluar ke kota. Bisa ditutup untuk hari itu.
 */
import type { KotaHariIniWire } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { navigate } from '@/lib/router';
import { store } from '@/lib/storage';

export function HariIniSangkala({ day }: { day: string }) {
  const md = day.slice(5, 10);
  const [tutup, setTutup] = useState(() => store.get('kota.hariini.tutup') === day);
  const q = useQuery({ queryKey: ['kota', 'hari-ini', md], queryFn: () => api.get<KotaHariIniWire | null>(`/kota/hari-ini?md=${md}`), staleTime: 3_600_000, enabled: !tutup });
  if (tutup || !q.data) return null;
  const k = q.data;
  return (
    <aside className="hs" aria-label="hari ini di Sangkala" data-testid="hari-ini-sangkala">
      <div className="hs-kepala">
        <span className="hs-cap">{k.jenis === 'adegan' ? 'HARI INI DI SANGKALA' : 'BULAN INI DI SANGKALA'}</span>
        <button
          className="hs-tutup"
          aria-label="tutup untuk hari ini"
          onClick={() => {
            store.set('kota.hariini.tutup', day);
            setTutup(true);
          }}>
          ×
        </button>
      </div>
      <button className="hs-isi" onClick={() => navigate(k.ke)}>
        <span className="hs-tanggal">
          {k.tanggal} · {k.tempat}
        </span>
        <span className="hs-kalimat">{k.kalimat}</span>
        <span className="hs-baca tiny">{k.jenis === 'adegan' ? 'baca kisahnya di Kota Sangkala →' : 'buka Koran Sangkala →'}</span>
      </button>
    </aside>
  );
}
