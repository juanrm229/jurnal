/** Mematok persil: nama pena, nama rumah tangga, rentang tahun, dan tokoh pertama. */
import { KOTA_PENA_RE, KOTA_TAHUN, KOTA_TERBENGKALAI_HARI, type NaskahCanonPayload, kotaFree, kotaOverlap, kotaPlot, kotaRegion } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { kotaCrop, useKota, useKotaRefresh } from '@/lib/kota';
import { newNaskahId } from '@/lib/naskah';
import { navigate, useParams, usePath } from '@/lib/router';
import { Doodle, Growing, useToast } from '@/ui/kit';

export default function Patok() {
  const { plotId } = useParams<{ plotId: string }>();
  const kota = useKota();
  const toast = useToast();
  const refresh = useKotaRefresh();
  const { search } = usePath();
  const leluhur = search.get('jenis') === 'leluhur';
  const plot = kotaPlot(plotId);
  const region = plot && kotaRegion(plot.region);
  const live = (kota.data?.claims ?? []).filter((c) => c.plotId === plotId && c.state === 'aktif').sort((a, b) => a.from - b.from);
  const lo = Math.max(KOTA_TAHUN.min, region?.since ?? KOTA_TAHUN.min);
  const free = kotaFree(live, lo);
  const [pena, setPena] = useState('');
  const [household, setHousehold] = useState('');
  const [from, setFrom] = useState(String(free[0]?.from ?? 1950));
  const [to, setTo] = useState(String(Math.min(free[0]?.to ?? 1980, (free[0]?.from ?? 1950) + 30)));
  const [tokoh, setTokoh] = useState('');
  const [lahir, setLahir] = useState('');
  const [busy, setBusy] = useState(false);
  if (!plot || !region) return <Growing label="persil ini tidak ditemukan" />;
  if (!kota.data) return <Growing label="membuka peta…" />;
  const me = kota.data.me;
  const home = kota.data.claims.find((c) => c.mine && c.kind === 'rumah' && c.state === 'aktif');
  const slot = leluhur ? me.leluhur : me.quota;
  const f = Number(from);
  const t = Number(to);
  const clash = live.find((c) => kotaOverlap(c, { from: f, to: t }));
  const err =
    !Number.isInteger(f) || !Number.isInteger(t) || f > t
      ? 'Tahun mulai harus sebelum tahun selesai.'
      : f < lo
        ? `${region.name} baru dihuni sejak ${region.since}.`
        : t > KOTA_TAHUN.max
          ? `Paling jauh ${KOTA_TAHUN.max}.`
          : clash
            ? `Bertumpuk dengan ${clash.household} (${clash.from}–${clash.to}).`
            : leluhur && home && f >= home.from
              ? `Rumah leluhur dimulai sebelum rumah utamamu (${home.from}).`
              : '';
  const penaOk = !!me.penName || KOTA_PENA_RE.test(pena.trim().toLowerCase());
  const ok = !err && penaOk && household.trim().length >= 2 && slot > 0;
  const span = KOTA_TAHUN.max - KOTA_TAHUN.min;
  const pct = (y: number) => ((y - KOTA_TAHUN.min) / span) * 100;

  const submit = async () => {
    setBusy(true);
    try {
      if (!me.penName) await api.put('/kota/profil', { penName: pena.trim().toLowerCase() });
      const res = await api.post<{ id: string; msId: string }>('/kota/claims', { plotId, household: household.trim(), from: f, to: t, kind: leluhur ? 'leluhur' : 'rumah' });
      if (tokoh.trim()) {
        const p: NaskahCanonPayload = { v: 1, kind: 'tokoh', name: tokoh.trim(), aliases: [], known: [], peran: 'utama', born: Number(lahir) || undefined };
        await api.post(`/naskah/${res.msId}/canon`, { id: newNaskahId(), kind: 'tokoh', envelope: { plain: p } });
      }
      void refresh();
      navigate(`/kota/rumah/${res.id}`, { replace: true });
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="kota-patok">
      <div className="kpt-peta" style={kotaCrop(plotId, 420, 230, 2.2)}>
        <span className="kpt-tanda" aria-hidden />
        <button className="kp-glass kp-back" aria-label="kembali ke peta" onClick={() => navigate('/kota')}>
          <Doodle id="ui-kembali" size={20} />
        </button>
      </div>
      <div className="kpt-isi">
        <span className="kp-musim">{leluhur ? 'rumah leluhur' : 'mematok'} · {region.name}</span>
        {leluhur ? <p className="tiny soft">Rumah leluhur: keluarga di zaman lebih awal, sebelum {home?.household ?? 'rumah utamamu'} ({home?.from}). Ketuk rumah utamamu dari sini untuk menyambung garisnya.</p> : null}
        <h1 className="kpt-alamat">{plot.address}</h1>

        <section className="kpt-strata" aria-label="lapisan zaman alamat ini">
          {[...live.map((c) => ({ kind: 'huni' as const, from: c.from, to: c.to, c })), ...free.map((x) => ({ kind: 'lowong' as const, from: x.from, to: x.to, c: null }))]
            .sort((a, b) => b.from - a.from)
            .map((x) => {
              const sel = x.kind === 'lowong' && !err && f >= x.from && t <= x.to;
              return (
                <div key={`${x.kind}${x.from}`} className={`kpt-lapis ${x.kind} ${sel ? 'pilih' : ''}`} style={{ flexGrow: Math.max(1, x.to - x.from) } as CSSProperties}>
                  {x.c ? (
                    <>
                      <b>{x.c.household}</b>
                      <span>
                        {x.from}–{x.to} · {x.c.penName}
                      </span>
                    </>
                  ) : sel ? (
                    <>
                      <b>{household.trim() || 'rumah tanggamu'}</b>
                      <span>
                        {f}–{t} · dari lowong {x.from}–{x.to}
                      </span>
                    </>
                  ) : (
                    <span>
                      lowong {x.from}–{x.to}
                    </span>
                  )}
                </div>
              );
            })}
          {region.since > KOTA_TAHUN.min ? (
            <div className="kpt-lapis kosong" style={{ flexGrow: Math.max(1, (region.since - KOTA_TAHUN.min) / 2) }}>
              <span>sebelum {region.since}: belum dihuni</span>
            </div>
          ) : null}
        </section>
        <div className="kpt-mini" aria-hidden>
          <span style={{ left: `${pct(Math.max(KOTA_TAHUN.min, f || KOTA_TAHUN.min))}%`, width: `${Math.max(0, pct(Math.min(t || 0, KOTA_TAHUN.max) + 1) - pct(f || KOTA_TAHUN.min))}%` }} />
        </div>

        {!me.penName ? (
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny soft">nama pena kota · tampil di semua rumahmu, terpisah dari jurnalmu</span>
            <input className="field" value={pena} maxLength={24} onChange={(e) => setPena(e.target.value.toLowerCase())} placeholder="mis. padiwangi" autoCapitalize="off" data-testid="kota-pena" />
          </label>
        ) : (
          <span className="tiny soft">menulis sebagai {me.penName}</span>
        )}
        <input className="field kpt-nama" value={household} maxLength={60} onChange={(e) => setHousehold(e.target.value)} placeholder="nama rumah tangga, mis. Keluarga Darmo" data-testid="kota-keluarga" />
        <div className="kpt-tahun">
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny soft">menghuni dari</span>
            <input className={`field ${err ? 'salah' : ''}`} value={from} inputMode="numeric" maxLength={4} onChange={(e) => setFrom(e.target.value.replace(/\D/g, ''))} data-testid="kota-dari" />
          </label>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny soft">sampai</span>
            <input className={`field ${err ? 'salah' : ''}`} value={to} inputMode="numeric" maxLength={4} onChange={(e) => setTo(e.target.value.replace(/\D/g, ''))} data-testid="kota-sampai" />
          </label>
        </div>
        {err ? <span className="tiny nk-salah">{err}</span> : null}
        <div className="kpt-tokoh">
          <input className="field" value={tokoh} maxLength={60} onChange={(e) => setTokoh(e.target.value)} placeholder="tokoh pertama, mis. Pak Darmo" data-testid="kota-tokoh" />
          <input className="field" value={lahir} inputMode="numeric" maxLength={4} onChange={(e) => setLahir(e.target.value.replace(/\D/g, ''))} placeholder="lahir" aria-label="tahun lahir tokoh pertama" data-testid="kota-lahir" />
        </div>
        {tokoh.trim() && !lahir ? <span className="tiny soft">Tahun lahir dipakai kota untuk memeriksa hubungan antar-rumah, misalnya umur orang tua dan anak.</span> : null}

        <p className="tiny soft kpt-aturan">
          Kota ini publik. Pakai nama fiksi, jangan tulis data pribadi orang sungguhan. Rumah tanpa adegan terbit dalam {KOTA_TERBENGKALAI_HARI} hari kembali lowong, dan keluargamu tinggal sebagai desas-desus.
        </p>
        <button className="btn" disabled={!ok || busy} onClick={() => void submit()} data-testid="kota-pasang">
          {busy ? 'memasang patok…' : slot > 0 ? `pasang patok · ${Number.isFinite(f) ? f : ''}–${Number.isFinite(t) ? t : ''}` : leluhur ? 'kuota rumah leluhur musim ini habis' : 'kamu sudah punya rumah musim ini'}
        </button>
      </div>
    </main>
  );
}
