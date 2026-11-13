/**
 * Rujukan kota untuk ruang menulis rumah kota: warga kota (figuran bersama),
 * peristiwa almanak, dan tetangga yang boleh disebut (tertaut atau "boleh disapa").
 * Di editor, setiap baris bisa disisipkan ke teks; warga kota yang hidup di tahun
 * adegan sekaligus dicatat sebagai perjumpaan, peristiwa bisa dijadikan kesaksian.
 */
import { type KotaClaimWire, type KotaFigurWire, kotaRegion } from '@sehari/core';
import { useState } from 'react';
import { masaHidup, tanggal, useAlmanak, useNamaKota, useTautan, useWargaKota } from '@/lib/kota';
import { navigate } from '@/lib/router';

type Tab = 'warga' | 'peristiwa' | 'tetangga';

export function RujukanKota({
  rumah,
  tahun,
  onSisip,
  onSaksi,
}: {
  rumah: KotaClaimWire;
  tahun: number | null;
  /** Editor: sisipkan nama ke teks; figurId diisi bila warga kota (dicatat sebagai perjumpaan). */
  onSisip?: (nama: string, figurId?: string) => void;
  onSaksi?: (eventId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('warga');
  const [cari, setCari] = useState('');
  const warga = useWargaKota();
  const almanak = useAlmanak();
  const nama = useNamaKota(true);
  const tautan = useTautan(rumah.id);
  const t = tahun ?? rumah.from;
  const q = cari.trim().toLowerCase();
  const cocok = (...xs: (string | undefined)[]) => !q || xs.some((x) => x?.toLowerCase().includes(q));

  const hidup = (f: KotaFigurWire) => (!f.born || f.born <= t) && (!f.died || f.died >= t);
  const figur = (warga.data ?? [])
    .filter((f) => f.state === 'kanon' && cocok(f.name, f.julukan, f.tempat, kotaRegion(f.region)?.name))
    .sort((a, b) => Number(hidup(b)) - Number(hidup(a)) || Number(b.region === rumah.regionId) - Number(a.region === rumah.regionId) || a.name.localeCompare(b.name));

  const peristiwa = (almanak.data ?? [])
    .filter((e) => e.state === 'kanon' && cocok(e.title, e.body))
    .sort((a, b) => Math.abs(a.year - t) - Math.abs(b.year - t));

  const tertaut = new Set((tautan.data?.relations ?? []).filter((r) => r.state === 'kanon' || r.state === 'desas').map((r) => (r.fromClaimId === rumah.id ? r.toTokoh : r.fromTokoh)));
  const tetangga = (nama.data ?? []).filter((n) => n.kind !== 'figur' && n.claimId !== rumah.id && !n.rumah?.includes(rumah.id) && (n.sapa === 'disapa' || (n.tokohId && tertaut.has(n.tokohId))) && cocok(n.name, n.household));

  return (
    <div className="rj">
      <nav className="ka-tab rj-tab" aria-label="rujukan kota">
        {(['warga', 'peristiwa', 'tetangga'] as Tab[]).map((x) => (
          <button key={x} className={tab === x ? 'on' : ''} onClick={() => setTab(x)} data-testid={`rj-tab-${x}`}>
            {x === 'warga' ? 'warga kota' : x}
          </button>
        ))}
      </nav>
      <input className="field rj-cari" value={cari} onChange={(e) => setCari(e.target.value)} placeholder={tab === 'warga' ? 'cari nama, julukan, tempat' : tab === 'peristiwa' ? 'cari peristiwa' : 'cari tokoh atau rumah'} />
      <p className="tiny soft rj-catat">
        {tab === 'warga'
          ? `Diurutkan dari yang hidup pada ${t} dan yang tinggal di ${kotaRegion(rumah.regionId)?.name}. Siapa pun boleh berjumpa dengan mereka; nasib besarnya diputuskan bersama.`
          : tab === 'peristiwa'
            ? `Diurutkan dari yang terdekat dengan ${t}. Rumah ini berdiri ${rumah.from}–${rumah.to}.`
            : 'Tokoh rumah lain yang sudah tertaut dengan rumahmu, atau yang pemiliknya menandai "boleh disapa". Yang lain perlu diketuk dulu.'}
      </p>

      {tab === 'warga' ? (
        <div className="col rj-daftar">
          {figur.map((f) => {
            const ada = hidup(f);
            return (
              <article key={f.id} className={`rj-baris ${ada ? '' : 'redup'}`} data-testid="rj-warga">
                <span className="grow">
                  <b>{f.name}</b>
                  <span className="rj-julukan">{f.julukan}</span>
                  <span className="tiny soft">
                    {f.tempat} · {masaHidup(f)}
                    {!ada ? (f.born && f.born > t ? ` · belum lahir pada ${t}` : ` · sudah wafat pada ${t}`) : ''}
                  </span>
                  <span className="small rj-ciri">{f.ciri}</span>
                </span>
                <span className="col rj-aksi">
                  {onSisip ? (
                    <button className="pill sm" onClick={() => onSisip(f.name, ada ? f.id : undefined)} data-testid="rj-sisip">
                      {ada ? 'jumpai' : 'sebut'}
                    </button>
                  ) : null}
                  <button className="pill sm ghost" onClick={() => navigate(`/kota/warga/${f.id}`)}>
                    lembar
                  </button>
                </span>
              </article>
            );
          })}
        </div>
      ) : tab === 'peristiwa' ? (
        <div className="col rj-daftar">
          {peristiwa.map((e) => {
            const kena = !e.regions.length || e.regions.includes(rumah.regionId);
            const semasa = rumah.from <= (e.toYear ?? e.year) && rumah.to >= e.year;
            return (
              <article key={e.id} className="rj-baris" data-testid="rj-peristiwa">
                <span className="grow">
                  <span className="ka-tahun">{tanggal(e)}</span>
                  <b>{e.title}</b>
                  <span className="tiny soft">
                    {e.regions.length ? e.regions.map((r) => kotaRegion(r)?.name).join(' · ') : 'seluruh kota'} · {semasa && kena ? 'rumah ini mengalaminya' : semasa ? 'rumah ini mendengar kabarnya' : e.year > rumah.to ? 'sesudah masa rumah ini' : 'sebelum rumah ini berdiri'}
                  </span>
                  <span className="small rj-ciri">{e.body}</span>
                </span>
                <span className="col rj-aksi">
                  {onSaksi && e.year <= rumah.to ? (
                    <button className="pill sm" onClick={() => onSaksi(e.id)} data-testid="rj-saksi">
                      jadikan kesaksian
                    </button>
                  ) : null}
                  {onSisip ? (
                    <button className="pill sm ghost" onClick={() => onSisip(e.title)}>
                      sebut
                    </button>
                  ) : (
                    <button className="pill sm ghost" onClick={() => navigate(`/kota/peristiwa/${e.id}`)}>
                      koran
                    </button>
                  )}
                </span>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="col rj-daftar">
          {tetangga.length ? (
            tetangga.map((n) => (
              <article key={`${n.claimId}${n.tokohId}`} className="rj-baris" data-testid="rj-tetangga">
                <span className="grow">
                  <b>{n.name}</b>
                  <span className="tiny soft">
                    {n.household}
                    {n.born ? ` · ${n.born}–${n.died ?? ''}` : ''} · {n.tokohId && tertaut.has(n.tokohId) ? 'tertaut dengan rumahmu' : 'boleh disapa'}
                  </span>
                </span>
                <span className="col rj-aksi">
                  {onSisip ? (
                    <button className="pill sm" onClick={() => onSisip(n.name)}>
                      sebut
                    </button>
                  ) : null}
                  <button className="pill sm ghost" onClick={() => navigate(`/kota/rumah/${n.claimId}`)}>
                    rumah
                  </button>
                </span>
              </article>
            ))
          ) : (
            <p className="small soft">Belum ada tetangga yang bisa disebut tanpa mengetuk. Ketuk rumah lain dari peta, atau minta pemiliknya menandai tokohnya "boleh disapa".</p>
          )}
        </div>
      )}
    </div>
  );
}
