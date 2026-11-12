/** Kanon: tokoh, benda, tempat, dan fakta, dengan siapa tahu sejak adegan mana. */
import { NASKAH_KINDS, type NaskahCanonPayload, type NaskahKind, type NaskahKnow } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { firstLine, type NaskahModel, newNaskahId, povColor, type Scene } from '@/lib/naskah';
import { Doodle, Sheet, useToast } from '@/ui/kit';

export const KIND_LABEL: Record<NaskahKind, string> = { tokoh: 'tokoh', benda: 'benda', tempat: 'tempat', fakta: 'fakta' };
const KIND_DOODLE: Record<NaskahKind, string> = { tokoh: 'ui-peluk', benda: 'kunci', tempat: 'rumah', fakta: 'bintang' };

export const sceneLabel = (m: NaskahModel, s: Scene | undefined) => (s?.p ? `${m.nameOf(s.p.pov)} · ${s.p.when.label || `bab ${s.chapter}`}` : 'adegan');

export function KanonList({ m }: { m: NaskahModel }) {
  const [edit, setEdit] = useState<string | 'baru' | null>(null);
  const [kind, setKind] = useState<NaskahKind>('tokoh');
  const entry = m.canon.find((e) => e.id === edit);
  return (
    <div className="nk-kanon">
      {NASKAH_KINDS.map((k) => {
        const items = m.canon.filter((e) => e.p.kind === k);
        return (
          <section key={k} className="section">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="label">{KIND_LABEL[k]}</span>
              <button
                className="pill sm"
                hidden={!m.canWrite}
                onClick={() => {
                  setKind(k);
                  setEdit('baru');
                }}
                data-testid={`kanon-baru-${k}`}>
                + {KIND_LABEL[k]}
              </button>
            </div>
            {items.length ? (
              <div className="col" style={{ gap: 8 }}>
                {items.map((e, i) => (
                  <button key={e.id} className="card nk-entri" style={{ '--n': i } as CSSProperties} onClick={() => m.canWrite && setEdit(e.id)} data-testid="kanon-entri">
                    {k === 'tokoh' ? <span className="nk-dot" style={{ background: povColor(m, e.id) }} /> : <Doodle id={KIND_DOODLE[k]} size={20} />}
                    <span className="grow" style={{ minWidth: 0 }}>
                      <b>{e.p.name}</b>
                      {k === 'tokoh' && e.p.born ? <span className="tiny soft">{e.p.born}–{e.p.died ?? ''}</span> : null}
                      {e.p.note ? <span className="tiny soft">{firstLine(e.p.note, 70)}</span> : null}
                      {k !== 'tokoh' && e.p.known.length ? (
                        <span className="nk-tahu-row">
                          {e.p.known.map((x) => (
                            <span key={x.who} className={`nk-tahu ${x.how}`}>
                              {m.nameOf(x.who)}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="tiny soft">{k === 'tokoh' ? 'Tambahkan tokoh dulu: adegan ditulis dari sudut pandang mereka.' : k === 'fakta' ? 'Fakta yang hanya diketahui sebagian tokoh: rahasia, kejadian, janji.' : `Belum ada ${KIND_LABEL[k]}.`}</p>
            )}
          </section>
        );
      })}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={entry ? `kanon · ${KIND_LABEL[entry.p.kind]}` : `${KIND_LABEL[kind]} baru`}>
        {edit ? <KanonForm key={edit} m={m} id={entry?.id} init={entry?.p ?? { v: 1, kind, name: '', aliases: [], known: [] }} onDone={() => setEdit(null)} /> : null}
      </Sheet>
    </div>
  );
}

/** Formulir entri Kanon; dipakai juga dari editor ("jadikan kanon"). */
export function KanonForm({ m, id, init, onDone }: { m: NaskahModel; id?: string; init: NaskahCanonPayload; onDone: (id: string) => void }) {
  const toast = useToast();
  const [p, setP] = useState<NaskahCanonPayload>(init);
  const [aliases, setAliases] = useState(init.aliases.join(', '));
  const [busy, setBusy] = useState(false);
  const scenes = m.scenes.filter((s) => s.p).sort((a, b) => m.chrono[a.id]!.localeCompare(m.chrono[b.id]!));
  const others = m.tokoh.filter((t) => t.id !== id);
  const knowOf = (who: string) => p.known.find((k) => k.who === who);
  const cycle = (who: string) => {
    const k = knowOf(who);
    const next: NaskahKnow[] = p.known.filter((x) => x.who !== who);
    if (!k) next.push({ who, how: 'tahu' });
    else if (k.how === 'tahu') next.push({ ...k, how: 'mengira' });
    setP({ ...p, known: next });
  };
  const setSince = (who: string, since: string) => setP({ ...p, known: p.known.map((k) => (k.who === who ? { ...k, since: since || undefined } : k)) });

  const save = async () => {
    setBusy(true);
    try {
      const payload: NaskahCanonPayload = { ...p, name: p.name.trim(), aliases: aliases.split(',').map((x) => x.trim()).filter(Boolean), note: p.note?.trim() || undefined };
      const cid = id ?? newNaskahId();
      if (id) await m.put(`/canon/${id}`, { envelope: m.seal(payload) });
      else await m.post('/canon', { id: cid, kind: payload.kind, envelope: m.seal(payload) });
      onDone(cid);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="col nk-form" style={{ gap: 12 }}>
      {!id ? (
        <div className="row wrap" style={{ gap: 6 }}>
          {NASKAH_KINDS.map((k) => (
            <button key={k} className={`pill sm ${p.kind === k ? 'active' : ''}`} onClick={() => setP({ ...p, kind: k })}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      ) : null}
      {p.kind === 'fakta' ? (
        <textarea className="field" rows={2} value={p.name} maxLength={300} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="kalimat fakta, mis. Laras anak Pak Darmo" autoFocus data-testid="kanon-nama" />
      ) : (
        <input className="field" value={p.name} maxLength={80} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder={p.kind === 'tokoh' ? 'nama tokoh' : p.kind === 'benda' ? 'nama benda, mis. cincin' : 'nama tempat'} autoFocus data-testid="kanon-nama" />
      )}
      <label className="col" style={{ gap: 4 }}>
        <span className="tiny soft">{p.kind === 'fakta' ? 'kata kunci yang menandai fakta ini di teks' : 'sebutan lain'} (pisahkan dengan koma)</span>
        <input className="field" value={aliases} maxLength={300} onChange={(e) => setAliases(e.target.value)} placeholder={p.kind === 'tokoh' ? 'mis. Bapak, Pak D' : p.kind === 'fakta' ? 'mis. Laras, anak itu' : 'mis. cincin perak'} data-testid="kanon-alias" />
      </label>
      <textarea className="field" rows={2} value={p.note ?? ''} maxLength={1200} onChange={(e) => setP({ ...p, note: e.target.value })} placeholder={p.kind === 'tokoh' ? 'watak, suara, yang ia inginkan' : 'catatan'} />
      {p.kind === 'tokoh' ? (
        <div className="nk-lahir">
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny soft">tahun lahir</span>
            <input className="field" inputMode="numeric" maxLength={4} value={p.born ?? ''} onChange={(e) => setP({ ...p, born: e.target.value ? Number(e.target.value.replace(/\D/g, '')) || undefined : undefined })} placeholder="mis. 1921" data-testid="kanon-lahir" />
          </label>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny soft">tahun wafat</span>
            <input className="field" inputMode="numeric" maxLength={4} value={p.died ?? ''} onChange={(e) => setP({ ...p, died: e.target.value ? Number(e.target.value.replace(/\D/g, '')) || undefined : undefined })} placeholder="kosongkan bila masih hidup" />
          </label>
        </div>
      ) : null}

      {p.kind !== 'tokoh' ? (
        <>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny soft">mulai ada di dunia cerita</span>
            <select className="field" value={p.since ?? ''} onChange={(e) => setP({ ...p, since: e.target.value || undefined })}>
              <option value="">sejak awal</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {sceneLabel(m, s)}
                </option>
              ))}
            </select>
          </label>
          <span className="label">siapa tahu</span>
          {others.length ? (
            <div className="col" style={{ gap: 6 }}>
              {others.map((t) => {
                const k = knowOf(t.id);
                return (
                  <div key={t.id} className="nk-know">
                    <button className={`nk-tahu big ${k?.how ?? 'tidak'}`} onClick={() => cycle(t.id)} data-testid={`kenal-${t.p.name}`}>
                      <span className="nk-dot" style={{ background: povColor(m, t.id) }} />
                      {t.p.name} · {k ? k.how : 'tidak tahu'}
                    </button>
                    {k ? (
                      <select className="field sm" value={k.since ?? ''} onChange={(e) => setSince(t.id, e.target.value)} aria-label={`${t.p.name} tahu sejak`}>
                        <option value="">sejak awal</option>
                        {scenes.map((s) => (
                          <option key={s.id} value={s.id}>
                            sejak {sceneLabel(m, s)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="tiny soft">Tambahkan tokoh di Kanon untuk menandai siapa yang tahu.</p>
          )}
        </>
      ) : null}

      <div className="row" style={{ gap: 8 }}>
        {id ? (
          <button
            className="btn ghost auto"
            onClick={async () => {
              try {
                await m.del(`/canon/${id}`);
                onDone(id);
              } catch (e) {
                toast((e as Error).message);
              }
            }}>
            hapus
          </button>
        ) : null}
        <button className="btn grow" disabled={!p.name.trim() || busy} onClick={() => void save()} data-testid="kanon-simpan">
          {busy ? 'menyimpan…' : 'simpan ke kanon'}
        </button>
      </div>
    </div>
  );
}
