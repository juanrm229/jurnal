/**
 * Mematok persil: nama pena, nama rumah tangga, rentang tahun, dan siapa yang tinggal.
 * Aturan musim: paling banyak 3 tokoh dalam 3 patok. Tokohmu boleh pindah ke patok lain
 * (orang yang sama, zaman lain); tokoh baru di patok tambahan harus keluarga tokohmu,
 * kecuali ia tinggal di persil rumahmu yang sama (penghuni rumah itu di zaman lain).
 */
import { KOTA_HUBUNGAN, KOTA_IKATAN, KOTA_PENA_RE, KOTA_TAHUN, KOTA_TERBENGKALAI_HARI, type KotaIkatan, kotaCekHubungan, kotaFree, kotaHidupDi, kotaOverlap, kotaPlot, kotaRegion } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { kotaCrop, useKota, useKotaRefresh } from '@/lib/kota';
import { navigate, useParams } from '@/lib/router';
import { Doodle, Growing, useToast } from '@/ui/kit';

export default function Patok() {
  const { plotId } = useParams<{ plotId: string }>();
  const kota = useKota();
  const toast = useToast();
  const refresh = useKotaRefresh();
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
  const [mati, setMati] = useState('');
  const [pindah, setPindah] = useState<string[]>([]);
  const [baru, setBaru] = useState(true);
  const [ikatTokoh, setIkatTokoh] = useState('');
  const [ikatJenis, setIkatJenis] = useState<KotaIkatan>('anak');
  const [busy, setBusy] = useState(false);
  if (!plot || !region) return <Growing label="persil ini tidak ditemukan" />;
  if (!kota.data) return <Growing label="membuka peta…" />;
  const me = kota.data.me;
  const milikku = kota.data.claims.filter((c) => c.mine && c.state === 'aktif');
  const pertama = !milikku.length;
  const slot = me.patok.maks - me.patok.pakai;
  const sisaTokoh = me.tokoh.maks - me.tokoh.pakai;
  const f = Number(from);
  const t = Number(to);
  const rentang = { from: f, to: t };
  const tokohku = me.tokohku.filter((x) => !x.dipegang);
  const bisaPindah = tokohku.filter((x) => kotaHidupDi(x, rentang));
  const pakaiBaru = pertama || (baru && sisaTokoh > 0);
  const sePersil = milikku.some((c) => c.plotId === plotId);
  const perluIkat = !pertama && pakaiBaru && !pindah.length && !sePersil;
  const ikatan = tokohku.find((x) => x.id === ikatTokoh);
  const rumahIkat = ikatan && milikku.find((c) => c.id === ikatan.claimId);
  const lahirN = Number(lahir) || undefined;
  const matiN = Number(mati) || undefined;
  const cekIkat = perluIkat && ikatan && rumahIkat && tokoh.trim() ? kotaCekHubungan(ikatJenis, { name: tokoh.trim(), born: lahirN, died: matiN, from: f, to: t }, { name: ikatan.name, born: ikatan.born, died: ikatan.died, from: rumahIkat.from, to: rumahIkat.to }) : [];
  const penghuni =
    pakaiBaru && !tokoh.trim()
      ? pertama
        ? 'Beri nama tokoh pertamamu.'
        : 'Beri nama tokoh barunya, atau pilih tokohmu yang pindah ke sini.'
      : pakaiBaru && !kotaHidupDi({ born: lahirN, died: matiN }, rentang)
        ? `${tokoh.trim()} tidak hidup di rentang ${f}–${t}.`
        : !pakaiBaru && !pindah.length
          ? 'Pilih siapa yang tinggal di sini.'
          : perluIkat && !ikatan
            ? 'Tokoh baru di patok tambahan harus keluarga salah satu tokohmu.'
            : (cekIkat.find((x) => !x.ok)?.text ?? '');
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
            : '';
  const penaOk = !!me.penName || KOTA_PENA_RE.test(pena.trim().toLowerCase());
  const ok = !err && !penghuni && penaOk && household.trim().length >= 2 && slot > 0;
  const span = KOTA_TAHUN.max - KOTA_TAHUN.min;
  const pct = (y: number) => ((y - KOTA_TAHUN.min) / span) * 100;

  const submit = async () => {
    setBusy(true);
    try {
      if (!me.penName) await api.put('/kota/profil', { penName: pena.trim().toLowerCase() });
      const res = await api.post<{ id: string; msId: string }>('/kota/claims', {
        plotId,
        household: household.trim(),
        from: f,
        to: t,
        tokoh: pakaiBaru ? { name: tokoh.trim(), born: lahirN, died: matiN } : undefined,
        pindah: pindah.filter((x) => bisaPindah.some((y) => y.id === x)),
        ikat: perluIkat && ikatan ? { tokohId: ikatan.id, type: ikatJenis } : undefined,
      });
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
        <span className="kp-musim">{pertama ? 'mematok' : 'rumah keluarga'} · {region.name}</span>
        <div className="kpt-jatah" aria-label="jatahmu musim ini">
          <span>
            patok <b>{me.patok.pakai}</b>/{me.patok.maks}
          </span>
          <span>
            tokoh <b>{me.tokoh.pakai}</b>/{me.tokoh.maks}
          </span>
        </div>
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
        <input className="field kpt-nama" value={household} maxLength={60} onChange={(e) => setHousehold(e.target.value)} placeholder="nama keluarga, mis. Darmo" data-testid="kota-keluarga" />
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
        {slot <= 0 ? (
          <p className="kpt-habis small" data-testid="kota-jatah-habis">
            Jatah {me.patok.maks} patok musim ini sudah terpakai. Lepaskan salah satu rumahmu dari halamannya untuk mematok di sini; tokohmu yang juga tinggal di rumah lain tetap aman.
          </p>
        ) : null}
        <section className="kpt-penghuni" aria-label="siapa yang tinggal di sini" hidden={slot <= 0}>
          <span className="label">siapa yang tinggal di sini</span>
          {!pertama && tokohku.length ? (
            <div className="kpt-pindah">
              {tokohku.map((x) => {
                const hidup = kotaHidupDi(x, rentang);
                const on = pindah.includes(x.id) && hidup;
                return (
                  <button key={x.id} className={`kpt-orang ${on ? 'on' : ''}`} disabled={!hidup} onClick={() => setPindah(on ? pindah.filter((y) => y !== x.id) : [...pindah, x.id])} data-testid="kota-pindah">
                    <b>{x.name}</b>
                    <span className="tiny">{hidup ? `pindah dari ${x.household}` : `tidak hidup di ${f}–${t}`}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {!pertama ? (
            <label className="kpt-baru">
              <input type="checkbox" checked={pakaiBaru} disabled={sisaTokoh <= 0} onChange={(e) => setBaru(e.target.checked)} data-testid="kota-tokoh-baru" />
              <span>{sisaTokoh > 0 ? `tambah tokoh baru · sisa jatah ${sisaTokoh}` : 'jatah tokohmu habis; pindahkan tokohmu ke sini'}</span>
            </label>
          ) : null}
          {pakaiBaru ? (
            <div className="kpt-tokoh">
              <input className="field" value={tokoh} maxLength={60} onChange={(e) => setTokoh(e.target.value)} placeholder={pertama ? 'tokoh pertama' : 'nama tokoh baru'} data-testid="kota-tokoh" />
              <input className="field" value={lahir} inputMode="numeric" maxLength={4} onChange={(e) => setLahir(e.target.value.replace(/\D/g, ''))} placeholder="lahir" aria-label="tahun lahir" data-testid="kota-lahir" />
              <input className="field" value={mati} inputMode="numeric" maxLength={4} onChange={(e) => setMati(e.target.value.replace(/\D/g, ''))} placeholder="wafat" aria-label="tahun wafat (kosongkan bila masih hidup)" />
            </div>
          ) : null}
          {perluIkat ? (
            <div className="kpt-ikat">
              <span className="tiny soft">Tokoh baru di rumah lain harus keluarga salah satu tokohmu.</span>
              <div className="kpt-ikat-baris">
                <span>{tokoh.trim() || 'ia'} adalah</span>
                <select className="field sm" value={ikatJenis} onChange={(e) => setIkatJenis(e.target.value as KotaIkatan)} aria-label="jenis ikatan" data-testid="kota-ikat-jenis">
                  {KOTA_IKATAN.map((k) => (
                    <option key={k} value={k}>
                      {KOTA_HUBUNGAN[k].label}
                    </option>
                  ))}
                </select>
                <span>dari</span>
                <select className="field sm" value={ikatTokoh} onChange={(e) => setIkatTokoh(e.target.value)} aria-label="tokohmu" data-testid="kota-ikat-tokoh">
                  <option value="">pilih tokohmu</option>
                  {tokohku.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : !pertama && pakaiBaru && sePersil && !pindah.length ? (
            <span className="tiny soft">Persil rumahmu sendiri: tokoh baru boleh sebagai penghuni rumah ini di zaman lain.</span>
          ) : null}
          {penghuni && (tokoh.trim() || !pakaiBaru) ? <span className="tiny nk-salah">{penghuni}</span> : null}
        </section>

        <p className="tiny soft kpt-aturan">
          Kota ini publik. Pakai nama fiksi, jangan tulis data pribadi orang sungguhan. Masa fondasi {KOTA_TERBENGKALAI_HARI} hari: terbitkan adegan pertama, atau persilnya kembali lowong dan keluargamu tinggal sebagai desas-desus. Setelah adegan pertama terbit, rumah ini berakar dan permanen.
        </p>
        <button className="btn" disabled={!ok || busy} onClick={() => void submit()} data-testid="kota-pasang">
          {busy ? 'memasang patok…' : slot > 0 ? `pasang patok · ${Number.isFinite(f) ? f : ''}–${Number.isFinite(t) ? t : ''}` : `jatah ${me.patok.maks} patok musim ini sudah terpakai`}
        </button>
      </div>
    </main>
  );
}
