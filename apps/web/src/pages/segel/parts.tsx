/**
 * Komponen SEBELUM DISEGEL: kartu berkas (salinan bercap), indeks, mesin
 * dunia (alat bantu nalar yang membaca salinan apa adanya), pemilih jangkar,
 * penyusun aksi, kabar, dan rekonstruksi akhir.
 */
import { segel } from '@sehari/core';
import { type ReactNode, useMemo, useState } from 'react';
import { anchorLabel, dimOfView, temaOfView, type View } from '@/lib/segel';
import { store } from '@/lib/storage';
import { Doodle, Sheet } from '@/ui/kit';
import { faceOf, PlayerFace } from '../sidik/parts';

type CopyView = segel.CopyView;
type Pub = View['board'][number];

export const VIA: Record<segel.Via, string> = {
  bagi: 'berkas dibagikan',
  audit: 'salinan sumber',
  kirim: 'kiriman',
  kurir: 'kurir tanpa nama',
  karbon: 'karbon beku',
  asli: 'penyimpan asli',
  keluaran: 'keluaran profesi',
  alih: 'cegatan',
  cadangan: 'cadangan arsip',
  umpan: 'kabar tanpa nama',
};

export const nameIn = (v: View, id: string | null | undefined) => (id ? (v.players.find((p) => p.id === id)?.name ?? '—') : '—');
export const faceIn = (v: View, id: string | null | undefined) => v.players.find((p) => p.id === id)?.avatar ?? 'tunas';

/** Kartu satu salinan berkas. */
export function Berkas({ v, c, pub, onClick, foot, compact }: { v: View; c: CopyView; pub?: Pub; onClick?: () => void; foot?: ReactNode; compact?: boolean }) {
  const tm = temaOfView(v);
  const R = segel.render(tm, c.f, c.blur, dimOfView(v));
  const cert = pub && v.certs.some((x) => x.ok && x.cite.includes(pub.id));
  const from = c.via === 'kirim' || c.via === 'alih' ? ` · dari ${nameIn(v, c.from)}` : '';
  return (
    <article className={`sg-berkas jenis-${R.jenis} ${c.stamp ? 'stamped' : ''} ${pub?.bantah ? 'bantah' : ''} ${pub?.umpan ? 'umpan' : ''} ${compact ? 'compact' : ''}`} onClick={onClick} data-rid={c.rid}>
      <span className="sg-tape" aria-hidden />
      <header>
        <span className="sg-rid">{pub ? pub.id : c.rid}</span>
        <Doodle id={R.doodle} size={20} color="currentColor" />
        <b>{R.judul}</b>
      </header>
      {compact ? null : <p className="sg-isi">{R.isi}</p>}
      <footer className="tiny">
        {pub ? (
          <span className="sd-ico">
            {pub.by ? <PlayerFace avatar={faceIn(v, pub.by)} size={18} /> : <Doodle id="ui-gembok" size={14} color="currentColor" />}
            {pub.by ? nameIn(v, pub.by) : VIA[c.via]} · {c.rid} · bab {pub.bab}
          </span>
        ) : (
          <span>
            {VIA[c.via]}
            {from} · bab {c.bab}
          </span>
        )}
        {foot}
      </footer>
      {c.stamp ? <span className="sg-cap asal">asal terbukti</span> : null}
      {cert ? <span className="sg-cap fakta">rantai fakta</span> : null}
      {pub?.bantah ? <span className="sg-cap merah">{pub.umpan ? 'umpan' : 'dibantah'}</span> : null}
    </article>
  );
}

/** Indeks berkas: semua ID, judul, dan pemegangnya. */
export function Indeks({ v, onPick, pick }: { v: View; onPick?: (rid: string) => void; pick?: (i: View['index'][number]) => boolean }) {
  const babs = [...new Set(v.index.map((i) => i.ch))];
  return (
    <div className="sg-indeks">
      {babs.map((b) => (
        <div key={b}>
          <span className="sd-label">bab {b}</span>
          <div className="sg-indeks-list">
            {v.index
              .filter((i) => i.ch === b && (!pick || pick(i)))
              .map((i) => {
                const fresh = i.ch === v.bab && v.phase === 'aksi' && v.bab > 1;
                return (
                  <button key={i.id} className={`sg-idx ${fresh ? 'fresh' : ''}`} onClick={() => onPick?.(i.id)} disabled={!onPick}>
                    <b>{i.id}</b>
                    <span className="grow">{i.title}</span>
                    <PlayerFace avatar={faceIn(v, i.holder)} size={20} />
                    <span className="tiny">{nameIn(v, i.holder)}</span>
                    {fresh ? <span className="sg-new">belum dibuka</span> : null}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mesin dunia ─────────────────────────────────────────────────────────────

interface Src {
  key: string;
  c: CopyView;
  pub?: Pub;
}

/** Semua salinan yang bisa kulihat (milikku + papan), tanpa duplikat isi. */
export function visibleSources(v: View): Src[] {
  const out: Src[] = [];
  const seen = new Set<string>();
  const add = (s: Src) => {
    const k = JSON.stringify([s.c.rid, s.c.f, s.c.blur]);
    if (seen.has(k)) {
      const prev = out.find((x) => JSON.stringify([x.c.rid, x.c.f, x.c.blur]) === k);
      if (prev && s.c.stamp && !prev.c.stamp) prev.c = { ...prev.c, stamp: true };
      return;
    }
    seen.add(k);
    out.push(s);
  };
  for (const c of v.mine?.copies ?? []) add({ key: `m:${c.cid}`, c });
  for (const b of v.board) if (!b.umpan) add({ key: `p:${b.id}`, c: b.c, pub: b });
  return out;
}

const SOFT = new Set(['witness', 'rumor']);
const FLAVOR = new Set(['trace', 'motive', 'roster', 'debunk']);

/**
 * Mesin dunia: menghitung kemungkinan dari salinan yang kamu percayai, persis
 * seperti tertulis. Salinan yang disunting ikut menyesatkan, jadi pilihan
 * percaya/tidak tetap keputusanmu.
 */
export function MesinDunia({ v, code, publicOnly }: { v: View; code: string; publicOnly?: boolean }) {
  const tm = temaOfView(v);
  const d = dimOfView(v);
  const key = `segelOff.${code}`;
  const [off, setOff] = useState<Set<string>>(() => new Set(store.json<string[]>(key) ?? []));
  const [onSoft, setOnSoft] = useState<Set<string>>(new Set());
  const srcs = visibleSources(v).filter((s) => !FLAVOR.has(s.c.f.k) && (!publicOnly || s.pub));
  const toggle = (k: string, soft: boolean) => {
    if (soft) {
      const n = new Set(onSoft);
      n.has(k) ? n.delete(k) : n.add(k);
      setOnSoft(n);
      return;
    }
    const n = new Set(off);
    n.has(k) ? n.delete(k) : n.add(k);
    setOff(n);
    store.set(key, JSON.stringify([...n]));
  };
  const used = srcs.filter((s) => (SOFT.has(s.c.f.k) ? onSoft.has(s.key) : !off.has(s.key)));
  const certs = v.certs.filter((c) => c.ok);
  const ws = useMemo(
    () => segel.worlds(d, used.map((s) => ({ f: s.c.f, blur: s.c.blur })), { witness: 'all' }).filter((w) => certs.every((c) => w[c.a] === c.v)),
    [JSON.stringify(used.map((s) => s.key)), certs.length, v.rev],
  );
  const total = d.K * d.R * d.T;
  return (
    <div className="sg-mesin">
      <div className={`sg-mesin-head ${ws.length === 0 ? 'clash' : ws.length === 1 ? 'one' : ''}`}>
        <span className="sg-mesin-n">{ws.length}</span>
        <span className="grow">
          <b>{ws.length === 0 ? 'Bertentangan.' : ws.length === 1 ? 'Satu dunia tersisa.' : `dunia mungkin dari ${total}`}</b>
          <span className="tiny" style={{ display: 'block' }}>
            {ws.length === 0
              ? 'Ada salinan yang tidak sejalan. Matikan yang kamu ragukan, atau audit asalnya.'
              : ws.length === 1
                ? `${anchorLabel(tm, 'p', ws[0]!.p)} · ${anchorLabel(tm, 'r', ws[0]!.r)} · ${anchorLabel(tm, 't', ws[0]!.t)}, menurut salinan yang kamu percayai.`
                : 'Dihitung dari salinan yang kamu centang, apa adanya.'}
          </span>
        </span>
      </div>
      <Jangkar v={v} ws={ws} />
      <span className="sd-label">salinan yang kupercaya</span>
      <div className="sg-trust">
        {srcs.map((s) => {
          const soft = SOFT.has(s.c.f.k);
          const on = soft ? onSoft.has(s.key) : !off.has(s.key);
          const R = segel.render(tm, s.c.f, s.c.blur, d);
          return (
            <button key={s.key} className={`sg-trust-row ${on ? 'on' : ''} ${s.c.stamp ? 'stamped' : ''}`} onClick={() => toggle(s.key, soft)} aria-pressed={on}>
              <span className="sg-check">{on ? <Doodle id="ui-centang" size={14} color="currentColor" /> : null}</span>
              <b>{s.pub?.id ?? s.c.rid}</b>
              <span className="grow">{R.judul}</span>
              {s.c.stamp ? <span className="sg-mini-cap">asal</span> : soft ? <span className="sg-mini-cap soft">kesaksian</span> : null}
            </button>
          );
        })}
        {!srcs.length ? <p className="tiny soft">Belum ada salinan untuk dihitung.</p> : null}
      </div>
    </div>
  );
}

/** Tiga jangkar: nilai yang masih mungkin & seberapa sering muncul. */
export function Jangkar({ v, ws }: { v: View; ws: segel.World[] }) {
  const tm = temaOfView(v);
  const d = dimOfView(v);
  const col = (a: segel.Anchor, n: number, label: string, doodle: string) => (
    <div className="sg-jangkar-col">
      <span className="sg-jangkar-h">
        <Doodle id={doodle} size={16} color="currentColor" /> {label}
      </span>
      {Array.from({ length: n }, (_, i) => {
        const k = ws.filter((w) => w[a] === i).length;
        const only = ws.length > 0 && k === ws.length;
        return (
          <span key={i} className={`sg-val ${k === 0 ? 'out' : ''} ${only ? 'only' : ''}`}>
            {a === 'p' ? <Doodle id={faceOf(tm.tokoh[i]!.name)} size={16} color="currentColor" /> : null}
            {anchorLabel(tm, a, i)}
            {k && !only ? <i>{k}</i> : null}
          </span>
        );
      })}
    </div>
  );
  return (
    <div className="sg-jangkar">
      {col('p', d.K, 'pelaku', 'ui-cari')}
      {col('r', d.R, 'jalur', 'peta-lipat')}
      {col('t', d.T, 'waktu', 'jam-dinding')}
    </div>
  );
}

/** Pemilih tiga jangkar (teori, putusan). */
export function AnchorPick({ v, value, onChange, open = segel.ANCHORS }: { v: View; value: Partial<segel.Theory>; onChange: (x: Partial<segel.Theory>) => void; open?: segel.Anchor[] }) {
  const tm = temaOfView(v);
  const d = dimOfView(v);
  return (
    <div className="sg-pick">
      {open.includes('p') ? (
        <>
          <span className="sd-label">pelaku</span>
          <div className="sg-pick-row">
            {tm.tokoh.slice(0, d.K).map((t, i) => (
              <button key={t.name} className={`sg-sus ${value.p === i ? 'on' : ''}`} onClick={() => onChange({ ...value, p: i })} aria-pressed={value.p === i}>
                <Doodle id={faceOf(t.name)} size={30} color="currentColor" />
                <b>{t.name}</b>
                <span className="tiny">{t.job}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {open.includes('r') ? (
        <>
          <span className="sd-label">jalur</span>
          <div className="sg-chips">
            {tm.jalur.slice(0, d.R).map((j, i) => (
              <button key={j} className={`pill ${value.r === i ? 'active' : ''}`} onClick={() => onChange({ ...value, r: i })} aria-pressed={value.r === i}>
                {j}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {open.includes('t') ? (
        <>
          <span className="sd-label">waktu (KAS)</span>
          <div className="sg-chips">
            {Array.from({ length: d.T }, (_, i) => (
              <button key={i} className={`pill ${value.t === i ? 'active' : ''}`} onClick={() => onChange({ ...value, t: i })} aria-pressed={value.t === i}>
                {segel.slotTime(tm, i)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Penyusun aksi ───────────────────────────────────────────────────────────

const MAIN_INFO: Record<segel.MainKind, [string, string, string]> = {
  terbit: ['Terbitkan', 'surat-terbuka', 'Jadikan satu salinanmu terbaca semua orang di papan.'],
  kirim: ['Kirim berkas', 'amplop', 'Kirim satu salinan ke satu pemain. Hanya ia yang menerima.'],
  audit: ['Audit asal', 'kacamata', 'Bayar 1 Lensa: terima salinan sumber asli satu laporan, bercap ASAL TERBUKTI.'],
  profesi: ['Profesi', 'stempel', ''],
  bukti: ['Buktikan fakta', 'segel-lilin', 'Bayar 2 Lensa: ajukan satu jangkar dengan rantai dari papan (≥2 sumber independen).'],
  tinta: ['Tinta Revisi', 'pena', 'Sunting diam-diam satu salinan mentah: geser jam 7 menit atau ganti label jalur.'],
  diam: ['Diam & mengamati', 'ui-hening', 'Tidak melakukan apa-apa bab ini. Kadang itu langkah terbaik.'],
};

/** Ringkasan aksi yang sudah dikunci. */
export function mainText(v: View, m: segel.Main | null | undefined): string {
  if (!m) return '';
  const tm = temaOfView(v);
  const cp = (cid?: string) => v.mine?.copies.find((c) => c.cid === cid)?.rid ?? '?';
  switch (m.k) {
    case 'terbit':
      return `menerbitkan ${cp(m.cid)}`;
    case 'kirim':
      return `mengirim ${cp(m.cid)} ke ${nameIn(v, m.to)}`;
    case 'audit':
      return `mengaudit asal ${m.rid}`;
    case 'bukti':
      return `membuktikan ${segel.ANCHOR_NAME[m.a!]} = ${anchorLabel(tm, m.a!, m.v)}`;
    case 'tinta':
      return `menyunting ${m.rid} dengan tinta`;
    case 'profesi':
      return `memakai ${v.mine?.prof ? segel.PROFS[v.mine.prof].nama : 'profesi'}`;
    default:
      return 'diam & mengamati';
  }
}

export function Composer({ v, onLock, busy }: { v: View; onLock: (m: segel.Main) => void; busy: boolean }) {
  const me = v.mine!;
  const [k, setK] = useState<segel.MainKind | null>(null);
  const [m, setM] = useState<segel.Main>({ k: 'diam' });
  const prof = me.prof ? segel.PROFS[me.prof] : null;
  const kinds: segel.MainKind[] = [
    ...(v.coop ? [] : (['terbit', 'kirim'] as const)),
    'audit',
    ...(prof && !me.used && prof.sasaran !== 'pasif' && (!prof.bab || prof.bab.includes(v.bab)) ? (['profesi'] as const) : []),
    ...(v.bab >= 2 ? (['bukti'] as const) : []),
    ...(me.kubu === 'revisi' && me.tinta > 0 ? (['tinta'] as const) : []),
    'diam',
  ];
  const open = (x: segel.MainKind) => {
    setK(x);
    setM({ k: x });
  };
  return (
    <>
      <div className="sg-aksi-grid">
        {kinds.map((x) => {
          const [t, d, desc] = MAIN_INFO[x];
          const cost = x === 'audit' ? 1 : x === 'bukti' ? 2 : 0;
          return (
            <button key={x} className={`sg-aksi ${x}`} onClick={() => (x === 'diam' ? onLock({ k: 'diam' }) : open(x))} disabled={busy || me.lensa < cost} data-testid={`sg-aksi-${x}`}>
              <Doodle id={x === 'profesi' && prof ? prof.doodle : d} size={30} color="currentColor" />
              <b>{x === 'profesi' && prof ? prof.nama : t}</b>
              <span className="tiny">{x === 'profesi' && prof ? prof.teks : desc}</span>
              {cost ? <span className="sg-cost">{cost} lensa</span> : null}
              {x === 'tinta' ? <span className="sg-cost merah">sisa {me.tinta}</span> : null}
            </button>
          );
        })}
      </div>
      <Sheet open={!!k} onClose={() => setK(null)} title={k ? (k === 'profesi' && prof ? prof.nama : MAIN_INFO[k][0]) : ''}>
        {k ? <Fields v={v} k={k} m={m} set={setM} /> : null}
        <button
          className="btn sd-cta mt"
          disabled={busy}
          onClick={() => {
            onLock(m);
            setK(null);
          }}
          data-testid="sg-kunci"
        >
          kunci aksi
        </button>
      </Sheet>
    </>
  );
}

function Fields({ v, k, m, set }: { v: View; k: segel.MainKind; m: segel.Main; set: (m: segel.Main) => void }) {
  const tm = temaOfView(v);
  const d = dimOfView(v);
  const me = v.mine!;
  const prof = me.prof ? segel.PROFS[me.prof] : null;
  const others = v.players.filter((p) => p.id !== v.me);
  const up = (x: Partial<segel.Main>) => set({ ...m, ...x });

  const copyPick = (multi = false) => (
    <>
      <span className="sd-label">salinan milikmu</span>
      <div className="sg-opt-list">
        {me.copies.map((c) => (
          <button key={c.cid} className={`sg-opt ${m.cid === c.cid ? 'on' : ''}`} onClick={() => up({ cid: c.cid })}>
            <Berkas v={v} c={c} compact />
          </button>
        ))}
      </div>
      {multi ? null : null}
    </>
  );
  const playerPick = (key: 'to' | 'pl') => (
    <>
      <span className="sd-label">pemain</span>
      <div className="sg-chips">
        {others.map((p) => (
          <button key={p.id} className={`pill ${m[key] === p.id ? 'active' : ''}`} onClick={() => up({ [key]: p.id })}>
            <PlayerFace avatar={p.avatar} size={18} /> {p.name}
          </button>
        ))}
      </div>
    </>
  );
  const ridPick = (key: 'rid' | 'rid2', filter: (i: { id: string; kind: string; ch: number }) => boolean, label = 'laporan', board = false) => {
    const items = [
      ...v.index.filter(filter),
      ...(board ? v.board.filter((b) => !v.index.some((i) => i.id === b.c.rid) && filter({ id: b.c.rid, kind: b.c.f.k, ch: b.bab })).map((b) => ({ id: b.c.rid, ch: b.bab, holder: null, title: segel.render(tm, b.c.f, false, d).judul, kind: b.c.f.k })) : []),
    ];
    return (
      <>
        <span className="sd-label">{label}</span>
        <div className="sg-opt-list idx">
          {items.map((i) => (
            <button key={i.id} className={`sg-idx ${m[key] === i.id ? 'on' : ''}`} onClick={() => up({ [key]: i.id })}>
              <b>{i.id}</b>
              <span className="grow">{i.title}</span>
              <span className="tiny">{nameIn(v, i.holder)}</span>
            </button>
          ))}
          {!items.length ? <p className="tiny soft">Belum ada laporan yang cocok.</p> : null}
        </div>
      </>
    );
  };
  const timeKinds = ['door', 'locks', 'sight', 'found', 'blank'];
  const routeKinds = ['door', 'locks', 'sight', 'blank'];
  const routes = (key: 'r', label = 'jalur') => (
    <>
      <span className="sd-label">{label}</span>
      <div className="sg-chips">
        {tm.jalur.slice(0, d.R).map((j, i) => (
          <button key={j} className={`pill ${m[key] === i ? 'active' : ''}`} onClick={() => up({ [key]: i })}>
            {j}
          </button>
        ))}
      </div>
    </>
  );
  const slots = (label = 'waktu') => (
    <>
      <span className="sd-label">{label}</span>
      <div className="sg-chips">
        {Array.from({ length: d.T }, (_, i) => (
          <button key={i} className={`pill ${m.t === i ? 'active' : ''}`} onClick={() => up({ t: i })}>
            {segel.slotTime(tm, i)}
          </button>
        ))}
      </div>
    </>
  );
  const suspects = () => (
    <>
      <span className="sd-label">tersangka</span>
      <div className="sg-chips">
        {tm.tokoh.slice(0, d.K).map((t, i) => (
          <button key={t.name} className={`pill ${m.x === i ? 'active' : ''}`} onClick={() => up({ x: i })}>
            <Doodle id={faceOf(t.name)} size={16} color="currentColor" /> {t.name}
          </button>
        ))}
      </div>
    </>
  );
  const dir = () => (
    <div className="seg mt">
      {[-1, 1].map((x) => (
        <button key={x} className={m.v === x ? 'on' : ''} onClick={() => up({ v: x })}>
          {x < 0 ? '7 menit mundur' : '7 menit maju'}
        </button>
      ))}
    </div>
  );

  if (k === 'terbit') return copyPick();
  if (k === 'kirim') return (
    <>
      {copyPick()}
      {playerPick('to')}
    </>
  );
  if (k === 'audit') return (
    <>
      <p className="small soft">Salinan sumber datang langsung dari arsip pusat, bercap. Isinya tetap bisa memuat kesimpulan saksi yang keliru.</p>
      {ridPick('rid', () => true, 'laporan (indeks atau papan)', true)}
    </>
  );
  if (k === 'tinta')
    return (
      <>
        <p className="small soft">Sasaranmu salinan pemegang aslinya. Salinan bercap atau yang dilindungi tidak bisa disentuh. Pagu suntingan meja: {v.pagu}.</p>
        {ridPick('rid', (i) => timeKinds.includes(i.kind) || routeKinds.includes(i.kind))}
        <div className="seg mt">
          {(['jam', 'label'] as const).map((x) => (
            <button key={x} className={m.edit === x ? 'on' : ''} onClick={() => up({ edit: x })}>
              {x === 'jam' ? 'geser jam' : 'ganti label jalur'}
            </button>
          ))}
        </div>
        {m.edit === 'jam' ? dir() : m.edit === 'label' ? routes('r', 'label baru') : null}
      </>
    );
  if (k === 'bukti') {
    const anchor = m.a ?? 'p';
    return (
      <>
        <p className="small soft">Rantai harus berupa terbitan di papan, isi sesuai sumbernya, dari minimal dua sumber independen. Gagal tetap membayar Lensa, dan hasilnya diumumkan.</p>
        <div className="seg">
          {segel.ANCHORS.map((a) => (
            <button key={a} className={anchor === a ? 'on' : ''} onClick={() => up({ a, v: undefined })}>
              {segel.ANCHOR_NAME[a]}
            </button>
          ))}
        </div>
        <div className="sg-chips mt">
          {segel.anchorValues(tm, d, anchor).map((x, i) => (
            <button key={x} className={`pill ${m.v === i && m.a === anchor ? 'active' : ''}`} onClick={() => up({ a: anchor, v: i })}>
              {x}
            </button>
          ))}
        </div>
        <span className="sd-label">rantai dari papan</span>
        <div className="sg-opt-list">
          {v.board.map((b) => {
            const on = m.cite?.includes(b.id);
            return (
              <button key={b.id} className={`sg-opt ${on ? 'on' : ''}`} onClick={() => up({ cite: on ? m.cite!.filter((x) => x !== b.id) : [...(m.cite ?? []), b.id] })}>
                <Berkas v={v} c={b.c} pub={b} compact />
              </button>
            );
          })}
        </div>
      </>
    );
  }
  if (k !== 'profesi' || !prof) return null;
  const s = prof.sasaran;
  return (
    <>
      <p className="small">
        {prof.teks} <span className="soft">{prof.batas}</span>
      </p>
      {s === 'alat' ? (
        <div className="sg-chips">
          {tm.kamera.map((c, i) => (
            <button key={c} className={`pill ${m.dev === i ? 'active' : ''}`} onClick={() => up({ dev: i })}>
              kamera {c}
            </button>
          ))}
        </div>
      ) : null}
      {s === 'laporan' ? ridPick('rid', () => true) : null}
      {s === 'laporan-waktu' ? ridPick('rid', (i) => timeKinds.includes(i.kind)) : null}
      {s === 'dua-laporan-waktu' ? (
        <>
          {ridPick('rid', (i) => timeKinds.includes(i.kind), 'laporan pertama')}
          {ridPick('rid2', (i) => timeKinds.includes(i.kind), 'laporan kedua')}
        </>
      ) : null}
      {s === 'kesaksian' ? ridPick('rid', (i) => i.kind === 'witness' || i.kind === 'rumor', 'kesaksian/kabar', true) : null}
      {s === 'dua-kesaksian' ? (
        <>
          {ridPick('rid', (i) => i.kind === 'witness' || i.kind === 'rumor', 'kesaksian pertama', true)}
          {ridPick('rid2', (i) => i.kind === 'witness' || i.kind === 'rumor', 'kesaksian kedua', true)}
        </>
      ) : null}
      {s === 'rekaman' ? ridPick('rid', (i) => i.kind === 'sight') : null}
      {s === 'jejak-benda' ? ridPick('rid', (i) => i.kind === 'trace') : null}
      {s === 'laporan-baru' ? ridPick('rid', (i) => i.ch === v.bab, 'laporan baru bab ini') : null}
      {s === 'jalur' ? routes('r') : null}
      {s === 'jalur-slot' ? (
        <>
          {routes('r')}
          {slots()}
        </>
      ) : null}
      {s === 'tersangka' ? suspects() : null}
      {s === 'pemain' ? playerPick('pl') : null}
      {s === 'pemain-aksi' ? (
        <>
          {playerPick('pl')}
          <span className="sd-label">aksi yang ia akui</span>
          <div className="sg-chips">
            {(['terbit', 'kirim', 'audit', 'profesi', 'bukti', 'diam'] as const).map((x) => (
              <button key={x} className={`pill ${m.act === x ? 'active' : ''}`} onClick={() => up({ act: x })}>
                {MAIN_INFO[x][0]}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {s === 'dua-nilai' ? (
        <>
          <div className="seg">
            {segel.ANCHORS.map((a) => (
              <button key={a} className={m.a === a ? 'on' : ''} onClick={() => up({ a, v: undefined, v2: undefined })}>
                {segel.ANCHOR_NAME[a]}
              </button>
            ))}
          </div>
          {m.a ? (
            <div className="sg-chips mt">
              {segel.anchorValues(tm, d, m.a).map((x, i) => {
                const on = m.v === i || m.v2 === i;
                return (
                  <button key={x} className={`pill ${on ? 'active' : ''}`} onClick={() => up(on ? (m.v === i ? { v: m.v2, v2: undefined } : { v2: undefined }) : m.v === undefined ? { v: i } : { v2: i })}>
                    {x}
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
      {s === 'prediksi' ? (
        <>
          <div className="seg">
            {(
              [
                ['versi', 'laporan berubah'],
                ['terbit', 'pemain menerbitkan'],
                ['profesi', 'pemain memakai profesi'],
              ] as const
            ).map(([x, l]) => (
              <button key={x} className={m.pred === x ? 'on' : ''} onClick={() => up({ pred: x })}>
                {l}
              </button>
            ))}
          </div>
          {m.pred === 'versi' ? ridPick('rid', () => true) : m.pred ? playerPick('pl') : null}
        </>
      ) : null}
      {s === 'terbitan' ? (
        <div className="sg-opt-list">
          {v.board.map((b) => (
            <button key={b.id} className={`sg-opt ${m.pub === b.id ? 'on' : ''}`} onClick={() => up({ pub: b.id })}>
              <Berkas v={v} c={b.c} pub={b} compact />
            </button>
          ))}
        </div>
      ) : null}
      {s === 'kurir' ? (
        <>
          {copyPick()}
          <span className="sd-label">penerima (sampai 3)</span>
          <div className="sg-chips">
            {others.map((p) => {
              const on = m.pls?.includes(p.id);
              return (
                <button key={p.id} className={`pill ${on ? 'active' : ''}`} onClick={() => up({ pls: on ? m.pls!.filter((x) => x !== p.id) : [...(m.pls ?? []), p.id].slice(0, 3) })}>
                  {p.name}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
      {s === 'geser' ? (
        <>
          {ridPick('rid', (i) => timeKinds.includes(i.kind))}
          {dir()}
        </>
      ) : null}
      {s === 'label' ? (
        <>
          {ridPick('rid', (i) => routeKinds.includes(i.kind))}
          {routes('r', 'label baru')}
        </>
      ) : null}
      {s === 'kabur' ? ridPick('rid', (i) => timeKinds.includes(i.kind)) : null}
      {s === 'umpan' ? (
        <>
          <p className="small soft">Susun isi kabar tanpa nama yang akan muncul di papan.</p>
          {suspects()}
          {routes('r')}
          {slots()}
        </>
      ) : null}
    </>
  );
}

// ── Kabar ───────────────────────────────────────────────────────────────────

export function Kabar({ v, only }: { v: View; only?: 'mine' | 'public' }) {
  const ns = [...v.notes].reverse().filter((n) => (only === 'mine' ? n.to !== '*' : only === 'public' ? n.to === '*' : true));
  if (!ns.length) return <p className="tiny soft center">Belum ada kabar.</p>;
  return (
    <ul className="sg-kabar">
      {ns.map((n) => (
        <li key={n.id} className={`k-${n.kind} ${n.to === '*' ? 'publik' : 'pribadi'}`}>
          <Doodle id={n.kind === 'publik' ? 'bendera' : n.kind === 'gagal' ? 'silang' : n.kind === 'lensa' ? 'kacamata' : n.kind === 'kiriman' ? 'amplop' : 'stempel'} size={18} color="currentColor" />
          <span className="grow">{n.text}</span>
          <span className="tiny">bab {n.bab}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Profesi & kubu ──────────────────────────────────────────────────────────

export function ProfInfo({ id, pool }: { id: segel.ProfId; pool?: segel.ProfId[] }) {
  const p = segel.PROFS[id];
  const jx = segel.JINX.filter((j) => (j.a === id || j.b === id) && (!pool || (pool.includes(j.a) && pool.includes(j.b))));
  return (
    <div className="col" style={{ gap: 8 }}>
      <Doodle id={p.doodle} size={64} draw />
      <span className="tiny soft">{segel.RUMPUN[p.rumpun]}</span>
      <span className="small">
        <b>Kemampuan.</b> {p.teks}
      </span>
      <span className="small">
        <b>Batas.</b> {p.batas}
      </span>
      {jx.length ? (
        <div className="sg-jinx-list">
          {jx.map((j) => (
            <span key={j.a + j.b} className="sg-jinx">
              <b>
                jinx · {segel.PROFS[j.a].nama} × {segel.PROFS[j.b].nama}
              </b>
              {j.teks}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Lembar script: pool profesi + jinx yang berlaku di antara mereka. */
export function ScriptSheet({ id }: { id: string }) {
  const s = segel.scriptOf(id);
  const [prof, setProf] = useState<segel.ProfId | null>(null);
  return (
    <div className="col" style={{ gap: 10 }}>
      <p className="small">{s.desk}</p>
      <span className="tiny soft">
        {s.min}–{s.max} orang · {s.pool.length} profesi · {segel.jinxFor(s.pool).length} jinx
      </span>
      <div className="sg-prof-grid">
        {s.pool.map((p) => (
          <button key={p} className="sg-prof-chip" onClick={() => setProf(p)}>
            <Doodle id={segel.PROFS[p].doodle} size={26} color="currentColor" />
            <b>{segel.PROFS[p].nama}</b>
          </button>
        ))}
      </div>
      {segel.jinxFor(s.pool).length ? (
        <div className="sg-jinx-list">
          {segel.jinxFor(s.pool).map((j) => (
            <span key={j.a + j.b} className="sg-jinx">
              <b>
                {segel.PROFS[j.a].nama} × {segel.PROFS[j.b].nama}
              </b>
              {j.teks}
            </span>
          ))}
        </div>
      ) : null}
      <Sheet open={!!prof} onClose={() => setProf(null)} title={prof ? segel.PROFS[prof].nama : ''}>
        {prof ? <ProfInfo id={prof} pool={s.pool} /> : null}
      </Sheet>
    </div>
  );
}

// ── Rekonstruksi akhir ──────────────────────────────────────────────────────

export function Rekonstruksi({ v }: { v: View }) {
  const tm = temaOfView(v);
  const d = dimOfView(v);
  const rv = v.reveal!;
  const babs = [1, 2, 3, 4];
  const edited = Object.entries(rv.holderCopies).filter(([, c]) => c && c.hist && c.hist.length);
  return (
    <div className="sg-rekon">
      {babs.map((b) => {
        const items = rv.log.filter((l) => l.bab === b);
        if (!items.length) return null;
        return (
          <div key={b} className="sg-rekon-bab">
            <span className="sd-label">bab {b}</span>
            <ul>
              {items.map((l, i) => (
                <li key={i} className={l.text.includes('tinta') || l.text.includes('menggeser') || l.text.includes('mengganti') || l.text.includes('mengaburkan') || l.text.includes('umpan') ? 'edit' : ''}>
                  {l.by && l.by !== 'gangguan' ? <PlayerFace avatar={faceIn(v, l.by)} size={20} /> : <Doodle id="petir" size={16} color="currentColor" />}
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {edited.length ? (
        <>
          <span className="sd-label">salinan yang diubah</span>
          {edited.map(([rid, c]) => {
            const src = rv.reports.find((r) => r.id === rid)!;
            return (
              <div key={rid} className="sg-diff">
                <b>{rid}</b>
                <span className="tiny">
                  asli: {segel.render(tm, src.f, false, d).isi}
                </span>
                <span className="tiny merah">
                  di tangan {nameIn(v, src.holder)}: {segel.render(tm, c!.f, c!.blur, d).isi}
                </span>
              </div>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
