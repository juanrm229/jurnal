/** Halaman rumah di Kota: sampul dari peta, keluarga, dan bab-bab yang sudah terbit. */
import { KOTA_HUBUNGAN, KOTA_HUBUNGAN_IDS, NASKAH_BENTUK, type KotaHubungan, type KotaPegangWire, type KotaRelasiWire, type KotaTautanWire, kotaPlot, kotaRegion } from '@sehari/core';
import { useState } from 'react';
import { api } from '@/lib/api';
import { kalimat, kotaCrop, tanggal, useAlmanak, useKota, useKotaClaim, useKotaRefresh, useNamaKota, useTautan } from '@/lib/kota';
import { firstLine, type NaskahModel, povColor, tglPanjang, useNaskah, useNaskahModel } from '@/lib/naskah';
import { navigate, useParams } from '@/lib/router';
import { Doodle, Growing, Sheet, useToast } from '@/ui/kit';

const ALASAN = { 'data-pribadi': 'memuat data pribadi orang sungguhan', pelecehan: 'pelecehan atau kebencian', spam: 'spam atau iklan', lainnya: 'lainnya' } as const;

export default function Rumah() {
  const { id } = useParams<{ id: string }>();
  const q = useKotaClaim(id);
  const c = q.data;
  const ms = useNaskah(c?.msId ?? '');
  const m = useNaskahModel(c ? ms.data : undefined);
  const toast = useToast();
  const refresh = useKotaRefresh();
  const [lapor, setLapor] = useState(false);
  const tautan = useTautan(c?.id ?? '');
  const almanak = useAlmanak();
  const kota = useKota();
  const punyaRumah = (kota.data?.claims ?? []).some((x) => x.mine && x.state === 'aktif');
  const nama = useNamaKota(true);
  if (!c) return q.isError ? <Growing label="rumah ini tidak ditemukan" /> : <Growing label="mengetuk pintu…" />;
  const plot = kotaPlot(c.plotId);
  const region = kotaRegion(c.regionId);
  const scenes = (m?.scenes ?? []).filter((s) => s.status === 'terbit' && s.p);

  return (
    <main className="kota-rumah">
      <div className="kr-sampul" style={kotaCrop(c.plotId, 420, 300, 2.4)}>
        <span className="kpt-tanda" aria-hidden />
        <div className="kr-sampul-kabut" aria-hidden />
        <button className="kp-glass kp-back" aria-label="kembali ke peta" onClick={() => navigate('/kota')}>
          <Doodle id="ui-kembali" size={20} />
        </button>
        <span className="kp-glass kr-era">
          {c.from}–{c.to}
        </span>
      </div>
      <div className="kr-isi">
        <span className="kp-musim">
          {plot?.address} · {region?.name}
        </span>
        <h1 className="kr-judul">{c.household}</h1>
        {m?.meta.logline ? <p className="kr-logline">{m.meta.logline}</p> : null}
        <span className="small soft">
          oleh <b className="kr-pena">{c.penName}</b> · {c.scenes} adegan
        </span>
        {c.state === 'terbengkalai' ? <p className="tiny kr-desas">Belum ada adegan terbit. Keluarga ini sekarang tinggal sebagai desas-desus di gang.</p> : null}

        {m?.tokoh.length ? (
          <div className="kr-penghuni">
            {m.tokoh.filter((t) => t.p.peran !== 'figuran').map((t) => (
              <span key={t.id} className="kr-wajah" style={{ background: povColor(m, t.id) }} title={t.p.name}>
                {t.p.name.slice(0, 1)}
              </span>
            ))}
            <span className="small soft">{m.tokoh.filter((t) => t.p.peran !== 'figuran').map((t) => t.p.name).join(', ')}</span>
          </div>
        ) : null}
        {(() => {
          // Tokoh yang juga tinggal di rumah lain milik penulis yang sama: orang yang sama, zaman lain.
          const pindah = (nama.data ?? []).filter((n) => n.rumah && n.rumah.length > 1 && n.rumah.includes(c.id));
          const rumahLain = (ids: string[]) => ids.filter((x) => x !== c.id).map((x) => kota.data?.claims.find((k) => k.id === x)).filter((k): k is NonNullable<typeof k> => !!k);
          return pindah.length ? (
            <div className="kr-pindah">
              {pindah.map((n) => (
                <p key={n.tokohId} className="tiny">
                  {n.name} juga tinggal di{' '}
                  {rumahLain(n.rumah!).map((k, i) => (
                    <span key={k.id}>
                      {i ? ', ' : ''}
                      <button className="kr-pindah-l" onClick={() => navigate(`/kota/rumah/${k.id}`)}>
                        {k.household} ({k.from}–{k.to})
                      </button>
                    </span>
                  ))}
                </p>
              ))}
            </div>
          ) : null;
        })()}
        {m ? <Figuran c={c} m={m} pegang={tautan.data?.pegang ?? []} reload={() => void tautan.refetch()} /> : null}

        {tautan.data ? <Tautan c={c} t={tautan.data} reload={() => void tautan.refetch()} /> : null}
        {(() => {
          const lewat = (almanak.data ?? []).filter((e) => e.state === 'kanon' && e.year >= c.from && e.year <= c.to && (!e.regions.length || e.regions.includes(c.regionId)));
          return lewat.length ? (
            <section className="kr-lewat">
              <span className="label">peristiwa yang dilewati rumah ini</span>
              {lewat.map((e) => (
                <button key={e.id} className="kr-lewat-p" onClick={() => navigate(`/kota/peristiwa/${e.id}`)}>
                  <span className="kr-lewat-th">{tanggal(e)}</span>
                  <span className="grow">{e.title}</span>
                  <Doodle id="ui-panah-kanan" size={14} />
                </button>
              ))}
            </section>
          ) : null;
        })()}

        {scenes.length && m ? (
          <section className="kr-rak">
            <span className="label">rak rumah</span>
            {[...m.works.map((w) => ({ id: w.id, w })), ...(m.scenesOf(null).length ? [{ id: 'lepas', w: null }] : [])].map(({ id: wid, w }) => {
              const isi = scenes.filter((s) => (s.workId ?? null) === (w?.id ?? null));
              if (!isi.length) return null;
              const bentuk = w?.bentuk ?? 'kisah';
              return (
                <article key={wid} className={`kr-karya bentuk-${bentuk}`}>
                  <button className="kr-karya-sampul" onClick={() => navigate(`/naskah/${c.msId}/baca/${wid}`)} data-testid="kota-karya">
                    <span className="kr-karya-jenis">{NASKAH_BENTUK[bentuk].label}</span>
                    <b>{w?.p.title ?? 'Kisah lepas'}</b>
                    {w?.p.sinopsis ? <span className="small">{w.p.sinopsis}</span> : null}
                    <span className="tiny">
                      {isi.length} {bentuk === 'jurnal' ? 'entri' : bentuk === 'surat' ? 'surat' : 'adegan'} · baca
                    </span>
                  </button>
                  {isi.slice(0, 3).map((s) => (
                    <button key={s.id} className="kr-adegan" onClick={() => navigate(`/naskah/${c.msId}/a/${s.id}`)} data-testid="kota-adegan">
                      <span className="kr-adegan-waktu tiny">{bentuk === 'jurnal' ? tglPanjang(s.p!.when.sort) || s.p!.when.label : s.p!.when.label || '—'}</span>
                      <span className="grow">
                        <b style={{ color: povColor(m, s.p!.pov) }}>{bentuk === 'surat' ? `kepada ${s.p!.kepada ?? '…'}` : m.nameOf(s.p!.pov)}</b>
                        <span className="small">{s.p!.title ?? firstLine(s.p!.text, 80)}</span>
                      </span>
                    </button>
                  ))}
                </article>
              );
            })}
          </section>
        ) : (
          <p className="small soft kr-kosong">{c.mine ? 'Rumahmu masih sunyi. Tulis adegan pertama: siapa yang pertama menyalakan lampu di rumah ini?' : 'Rumah ini belum bercerita.'}</p>
        )}

        <div className="kr-aksi">
          {c.mine ? (
            <>
              <button className="btn" onClick={() => navigate(`/naskah/${c.msId}`)} data-testid="kota-tulis">
                <Doodle id="pena" size={18} color="currentColor" /> tulis di rumah ini
              </button>
              <button
                className="btn ghost"
                onClick={async () => {
                  if (!confirm('Lepaskan rumah ini? Persilnya lowong lagi; naskahmu pindah ke arsip meja tulis, hanya untukmu. Tokohmu yang juga tinggal di rumahmu yang lain tetap ada di sana.')) return;
                  await api.del(`/kota/claims/${c.id}`);
                  void refresh();
                  navigate('/kota', { replace: true });
                }}>
                lepaskan rumah
              </button>
            </>
          ) : (
            <>
              {scenes[0] ? (
                <button className="btn" onClick={() => navigate(`/naskah/${c.msId}/baca/${scenes[0]!.workId ?? 'lepas'}`)}>
                  baca dari awal
                </button>
              ) : null}
              <button className="btn soft" onClick={() => navigate(punyaRumah ? `/kota/ketuk/${c.id}` : '/kota')} data-testid="kota-ketuk">
                <Doodle id="amplop" size={18} /> {punyaRumah ? 'ketuk pintu' : 'patok rumah dulu untuk mengetuk'}
              </button>
              <button className="btn ghost" onClick={() => setLapor(true)} data-testid="kota-lapor">
                laporkan rumah ini
              </button>
            </>
          )}
        </div>
      </div>
      <Sheet open={lapor} onClose={() => setLapor(false)} title="laporkan rumah">
        <div className="col" style={{ gap: 8 }}>
          <p className="small soft">Laporan tidak memberi tahu pemilik siapa pelapornya. Rumah disembunyikan setelah beberapa warga melapor.</p>
          {(Object.keys(ALASAN) as (keyof typeof ALASAN)[]).map((k) => (
            <button
              key={k}
              className="btn soft"
              onClick={async () => {
                try {
                  await api.post(`/kota/claims/${c.id}/report`, { reason: k });
                  toast('Terima kasih. Laporanmu tercatat.');
                } catch (e) {
                  toast((e as Error).message);
                }
                setLapor(false);
              }}>
              {ALASAN[k]}
            </button>
          ))}
        </div>
      </Sheet>
    </main>
  );
}

/** Rumah yang tertaut, dan (untuk pemilik) ketukan yang menunggu jawaban. */
function Tautan({ c, t, reload }: { c: { id: string; mine: boolean }; t: KotaTautanWire; reload: () => void }) {
  const toast = useToast();
  const [usul, setUsul] = useState<KotaRelasiWire | null>(null);
  const pub = t.relations.filter((r) => r.state === 'kanon' || r.state === 'desas');
  const masuk = c.mine ? t.relations.filter((r) => r.toClaimId === c.id && r.state === 'ketuk') : [];
  const keluar = c.mine ? t.relations.filter((r) => r.fromClaimId === c.id && (r.state === 'ketuk' || r.state === 'usul')) : [];
  const jawab = async (r: KotaRelasiWire, action: string, type?: KotaHubungan) => {
    try {
      await api.put(`/kota/ketuk/${r.id}`, { action, type });
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  if (!pub.length && !masuk.length && !keluar.length) return null;
  return (
    <section className="kr-tautan">
      {masuk.map((r) => {
        const k = kalimat(r, t, c.id);
        return (
          <article key={r.id} className="kr-ketukan" data-testid="kota-ketukan-masuk">
            <span className="kp-musim">ketukan di pintumu</span>
            <p className="kr-ketukan-k">
              <b>{k.dia}</b> dari {k.rumah} mengaku <b>{KOTA_HUBUNGAN[r.type].label}</b> dari <b>{k.aku}</b>.
            </p>
            {r.letter ? <blockquote className="kr-surat">{r.letter}</blockquote> : null}
            <div className="kr-jawab">
              <button className="btn" onClick={() => void jawab(r, 'kanon')} data-testid="kota-jadi-kanon">
                jadikan kanon
              </button>
              <button className="btn ghost putus" onClick={() => void jawab(r, 'desas')}>
                biarkan jadi desas-desus
              </button>
              <button className="btn soft" onClick={() => setUsul(r)}>
                usulkan hubungan lain
              </button>
              <button className="btn ghost" onClick={() => void jawab(r, 'tolak')}>
                tolak dengan sopan
              </button>
            </div>
          </article>
        );
      })}
      {keluar.map((r) => {
        const k = kalimat(r, t, c.id);
        return (
          <article key={r.id} className="kr-ketukan keluar">
            <span className="kp-musim">{r.state === 'usul' ? 'usul balik untukmu' : 'ketukanmu menunggu'}</span>
            <p className="kr-ketukan-k">
              {k.aku} sebagai {r.state === 'usul' && r.counter ? <b>{KOTA_HUBUNGAN[r.counter].label}</b> : <b>{k.jenis}</b>} dari {k.dia} · {k.rumah}
            </p>
            <div className="kr-jawab">
              {r.state === 'usul' ? (
                <button className="btn" onClick={() => void jawab(r, 'terima')}>
                  terima usulan ini
                </button>
              ) : null}
              <button className="btn ghost" onClick={() => void jawab(r, 'tarik')}>
                tarik ketukan
              </button>
            </div>
          </article>
        );
      })}
      {pub.length ? (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="label">tertaut dengan rumah lain</span>
            <button className="pill sm" onClick={() => navigate(`/kota/silsilah/${c.id}`)} data-testid="kota-silsilah">
              silsilah di peta
            </button>
          </div>
          {pub.map((r) => {
            const k = kalimat(r, t, c.id);
            return (
              <button key={r.id} className={`kr-taut ${r.state}`} onClick={() => navigate(`/kota/rumah/${k.rumahId}`)}>
                <span className={`kr-taut-pil ${r.state}`}>{r.state === 'kanon' ? 'kanon' : 'desas-desus'}</span>
                <span className="grow">
                  {k.aku} adalah <b>{k.jenis}</b> dari {k.dia}
                  <span className="tiny soft">{k.rumah}</span>
                </span>
              </button>
            );
          })}
        </>
      ) : null}
      <Sheet open={!!usul} onClose={() => setUsul(null)} title="usulkan hubungan lain">
        {usul ? (
          <div className="row wrap" style={{ gap: 6 }}>
            {KOTA_HUBUNGAN_IDS.filter((k) => k !== usul.type).map((k) => (
              <button
                key={k}
                className="pill"
                onClick={() => {
                  void jawab(usul, 'usul', k);
                  setUsul(null);
                }}>
                {KOTA_HUBUNGAN[k].label}
              </button>
            ))}
          </div>
        ) : null}
      </Sheet>
    </section>
  );
}

/**
 * Figuran rumah: istri, tetangga, pembantu. Pemilik menulis mereka sesukanya;
 * penulis lain boleh meminta memegang salah satunya (lewat surat). Pemegang
 * menulis adegan dari sudut pandang figuran itu di naskah rumah yang sama.
 */
function Figuran({ c, m, pegang, reload }: { c: { id: string; mine: boolean; msId: string }; m: NaskahModel; pegang: KotaPegangWire[]; reload: () => void }) {
  const toast = useToast();
  const [minta, setMinta] = useState<string | null>(null);
  const [surat, setSurat] = useState('');
  const fig = m.tokoh.filter((t) => t.p.peran === 'figuran');
  if (!fig.length) return null;
  const jawab = async (x: KotaPegangWire, action: 'terima' | 'tolak' | 'lepas') => {
    if (action === 'lepas' && !confirm(`Lepaskan ${x.tokoh}? Adegan yang sudah ditulis tetap ada.`)) return;
    try {
      await api.put(`/kota/pegang/${x.id}`, { action });
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <section className="kr-figuran">
      <span className="label">figuran rumah</span>
      {fig.map((t) => {
        const held = pegang.find((x) => x.tokohId === t.id && x.state === 'pegang');
        const mohon = pegang.filter((x) => x.tokohId === t.id && x.state === 'minta');
        const punyaku = held?.requesterId === m.meId;
        const mintaku = mohon.find((x) => x.requesterId === m.meId);
        return (
          <article key={t.id} className="kr-fig" data-testid="kota-figuran">
            <span className="kr-wajah sm" style={{ background: povColor(m, t.id) }} aria-hidden>
              {t.p.name.slice(0, 1)}
            </span>
            <span className="grow">
              <b>{t.p.name}</b>
              {t.p.note ? <span className="tiny soft">{firstLine(t.p.note, 90)}</span> : null}
              <span className="tiny">
                {held ? (punyaku ? 'kamu yang memegangnya' : `dipegang ${held.penName}`) : t.p.sapa === 'disapa' ? 'boleh disapa' : 'belum dipegang siapa pun'}
              </span>
            </span>
            {punyaku ? (
              <span className="col" style={{ gap: 4 }}>
                <button className="pill sm active" onClick={() => navigate(`/naskah/${c.msId}`)} data-testid="kota-pegang-tulis">
                  tulis
                </button>
                <button className="pill sm" onClick={() => void jawab(held!, 'lepas')}>
                  lepas
                </button>
              </span>
            ) : c.mine && held ? (
              <button className="pill sm" onClick={() => void jawab(held, 'lepas')}>
                ambil kembali
              </button>
            ) : !c.mine && !held ? (
              mintaku ? (
                <span className="tiny soft">permintaanmu menunggu</span>
              ) : (
                <button className="pill sm" onClick={() => setMinta(t.id)} data-testid="kota-pegang-minta">
                  minta memegang
                </button>
              )
            ) : null}
            {c.mine
              ? mohon.map((x) => (
                  <div key={x.id} className="kr-fig-mohon" data-testid="kota-pegang-masuk">
                    <p className="small">
                      <b>{x.penName}</b> ingin memegang {t.p.name}.
                    </p>
                    {x.letter ? <blockquote className="kr-surat">{x.letter}</blockquote> : null}
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn sm" onClick={() => void jawab(x, 'terima')} data-testid="kota-pegang-terima">
                        serahkan
                      </button>
                      <button className="btn ghost sm" onClick={() => void jawab(x, 'tolak')}>
                        belum bisa
                      </button>
                    </div>
                  </div>
                ))
              : null}
          </article>
        );
      })}
      <Sheet open={!!minta} onClose={() => setMinta(null)} title={`memegang ${m.nameOf(minta ?? '')}`}>
        <div className="col" style={{ gap: 10 }}>
          <p className="small soft">Pemegang menulis adegan dari sudut pandang tokoh ini, di rumah ini. Pemilik rumah tetap menjaga kanonnya: fakta tokoh hanya berubah lewat pemilik.</p>
          <textarea className="field" rows={4} value={surat} maxLength={800} onChange={(e) => setSurat(e.target.value)} placeholder="Surat untuk pemilik rumah: apa yang ingin kamu tuliskan tentang tokoh ini?" data-testid="kota-pegang-surat" />
          <button
            className="btn"
            disabled={surat.trim().length < 10}
            onClick={async () => {
              try {
                await api.post('/kota/pegang', { claimId: c.id, tokohId: minta, letter: surat.trim() });
                toast('Suratmu terkirim ke pemilik rumah.');
                setMinta(null);
                setSurat('');
                reload();
              } catch (e) {
                toast((e as Error).message);
              }
            }}
            data-testid="kota-pegang-kirim">
            kirim surat
          </button>
        </div>
      </Sheet>
    </section>
  );
}
