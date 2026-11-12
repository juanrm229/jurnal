/** Langkah kartu dan menulis: kartu prompt dari Peta, Lensa, kartu role, editor, serah-terima, segel. */
import { STORY_WORDS, type StoryHandoffPayload, type StoryResearchPayload, storyLens, storyRole, storyTilt } from '@sehari/core';
import { type CSSProperties, useEffect, useState } from 'react';
import { sound } from '@/lib/sound';
import { store } from '@/lib/storage';
import { Avatar, Doodle } from '@/ui/kit';
import { StoryEditor } from './Editor';
import { AiJejak } from './ai';
import type { Prompt, StoryModel } from './kit';

/** Kartu prompt: posisi, yang kamu tahu, yang kamu kira, yang tersensor, keputusanmu, jejak, opsi. */
export function PromptCard({ p, compact }: { p: Prompt; compact?: boolean }) {
  return (
    <section className={`kartu-prompt ${compact ? 'compact' : ''}`} data-testid="kartu-prompt">
      <span className="kp-tokoh rupa-hand">{p.tokoh}</span>
      <span className="kp-waktu">{p.waktu}</span>
      {p.seat ? <p className="kp-posisi">{p.seat.posisi}</p> : null}
      {p.fokus ? (
        <div className={`kp-fokus ${p.fokus.tilt ? 'tilt' : ''}`}>
          <i>{p.fokus.tilt ? 'giliran buta · wajib memengaruhi keputusanmu' : 'fokus gelombang ini'}</i>
          {p.fokus.text}
        </div>
      ) : null}
      <dl>
        {p.tahu.length ? (
          <>
            <dt>yang kamu tahu</dt>
            <dd>
              {p.tahu.map((t, i) => (
                <span key={i} className={t.from === 'fakta' ? 'kp-fakta' : undefined}>
                  {t.text}{' '}
                </span>
              ))}
            </dd>
          </>
        ) : null}
        {p.mengira.length ? (
          <>
            <dt>yang kamu kira</dt>
            <dd className="kp-kira">{p.mengira.join(' ')}</dd>
          </>
        ) : null}
        {p.belumTahu || p.sensor.length ? (
          <>
            <dt>yang belum kamu tahu</dt>
            <dd>
              {p.belumTahu ? <span>{p.belumTahu} </span> : null}
              {p.sensor.map((x, i) => (
                <span key={i} className="kp-sensor" style={{ '--w': `${Math.min(92, 30 + x.len * 0.9)}%`, '--n': i } as CSSProperties} title={x.hint}>
                  <b aria-hidden />
                  <small>{x.hint}</small>
                </span>
              ))}
            </dd>
          </>
        ) : null}
        {p.misteri.length ? (
          <>
            <dt>dibiarkan misteri</dt>
            <dd className="kp-misteri">{p.misteri.join(' · ')}</dd>
          </>
        ) : null}
        {p.seat ? (
          <>
            <dt>keputusanmu</dt>
            <dd className="kp-q">{p.seat.keputusan}</dd>
          </>
        ) : null}
      </dl>
      {p.jejak.map((j, i) => (
        <div key={i} className="kp-jejak" style={{ '--n': i } as CSSProperties} data-testid="jejak-masuk">
          <span className="tiny">jejak untuk tokohmu · dari {j.from}</span>
          <b>{j.what}</b>
          {j.question ? <span className="rupa-hand">{j.question}</span> : null}
        </div>
      ))}
      {p.opsi.map((o, i) => (
        <div key={i} className="kp-opsi">
          <i>opsi tambahan dari kartu role {o.from}</i>
          {o.text}
        </div>
      ))}
      {p.celah.map((c, i) => (
        <div key={i} className="kp-opsi">
          <i>satu adegan yang hilang · dari sanggahan</i>
          {c}
        </div>
      ))}
    </section>
  );
}

export function Tulis({ m }: { m: StoryModel }) {
  const { st, meId, main } = m;
  const idx = st.members.indexOf(meId);
  const mine = main.find((p) => p.round === st.round && p.authorId === meId);
  const seat = m.fixedSeat(st.round, idx);
  const key = `cerita2.${st.id}.${st.round}`;
  const saved = (mine ? { text: m.sceneOf(mine)?.text ?? '', h: m.handoffOf(mine), intent: m.open<{ text: string }>(mine.intent)?.text ?? '' } : null) ?? store.json<{ text: string; h: StoryHandoffPayload | null; intent: string }>(key);
  const [text, setText] = useState(saved?.text ?? '');
  const [tokohFree, setTokohFree] = useState(saved?.h?.tokoh ?? '');
  const [kapan, setKapan] = useState(saved?.h?.waktu ?? '');
  const [line, setLine] = useState(saved?.h?.line ?? '');
  const [trace, setTrace] = useState(saved?.h?.trace?.what ?? '');
  const [knows, setKnows] = useState<string[]>(saved?.h?.trace?.knows ?? []);
  const [question, setQuestion] = useState(saved?.h?.trace?.question ?? '');
  const [intent, setIntent] = useState(saved?.intent ?? '');
  const [proof, setProof] = useState(saved?.h?.proof ?? '');
  const [perk, setPerk] = useState(!!mine?.perk);
  const [optTo, setOptTo] = useState(saved?.h?.option?.to ?? '');
  const [optText, setOptText] = useState(saved?.h?.option?.text ?? '');
  const [busy, setBusy] = useState(false);
  const [flip, setFlip] = useState(false);
  const [focusDraft, setFocusDraft] = useState('');
  const tokoh = seat?.tokoh ?? tokohFree.trim();
  const prompt = m.promptFor(tokoh || 'tokohmu', st.round, seat);
  const role = storyRole(st.roles[meId]);
  const sealed = !!mine?.sealed;
  const lens = storyLens(st.members, st.round);
  const tilt = st.round === storyTilt(st.rounds);
  const others = m.tokohs.filter((t) => t !== tokoh);
  const finalLine = line || (text.match(/[^.!?…]+[.!?…]+["”’)]*\s*$/)?.[0] ?? '').trim();

  const handoff: StoryHandoffPayload = {
    v: 1,
    tokoh: tokoh || 'tanpa nama',
    waktu: seat ? undefined : kapan.trim() || undefined,
    line: finalLine,
    trace: trace.trim() ? { what: trace.trim(), knows, question: question.trim() } : undefined,
    option: perk && role?.kind === 'prompt' && optTo && optText.trim() ? { to: optTo, text: optText.trim() } : undefined,
    proof: proof.trim() || undefined,
  };
  useEffect(() => {
    if (!sealed) store.set(key, JSON.stringify({ text, h: handoff, intent }));
  }, [text, line, trace, knows, question, intent, proof, perk, optTo, optText, tokohFree, kapan]);

  const save = async (s: boolean) => {
    setBusy(true);
    if (s) {
      sound.play('seal');
      navigator.vibrate?.([12, 40, 20]);
    }
    await m.run(() =>
      m.put('/parts', {
        round: st.round,
        envelope: m.seal({ v: 1, text: text.trim() }),
        handoff: m.seal(handoff),
        intent: intent.trim() ? m.seal({ v: 1, text: intent.trim() }) : undefined,
        perk,
        seal: s,
      }),
    );
    setBusy(false);
  };

  return (
    <div className="tulis">
      {lens === meId && st.members.length > 1 && !st.focus[String(st.round)] && !sealed ? (
        <section className={`lensa ${tilt ? 'tilt' : ''}`} data-testid="lensa">
          <span className="lensa-top">
            <Doodle id="ui-cari" size={22} /> {tilt ? 'kamu Lensa · giliran buta' : 'kamu Lensa gelombang ini'}
          </span>
          <p className="small">{tilt ? 'Tulis satu detail baru yang wajib memengaruhi keputusan semua tokoh di gelombang ini.' : 'Pilih satu fokus untuk semua bagian di gelombang ini: satu benda, satu pertanyaan, atau satu tokoh.'}</p>
          <div className="row" style={{ gap: 8 }}>
            <input className="field grow" value={focusDraft} maxLength={160} onChange={(e) => setFocusDraft(e.target.value)} placeholder={tilt ? 'mis. kuitansi itu ternyata basah' : 'mis. lampu teras'} data-testid="fokus-isi" />
            <button className="btn sm auto" disabled={!focusDraft.trim()} onClick={() => void m.run(() => m.put('/focus', { round: st.round, envelope: m.seal({ v: 1, text: focusDraft.trim() }) }))} data-testid="fokus-simpan">
              tetapkan
            </button>
          </div>
        </section>
      ) : null}

      {!seat && !sealed ? (
        <section className="pilih-tokoh">
          <span className="label">gelombang bebas · pilih tokohmu</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {m.tokohs.map((t) => (
              <button key={t} className={`pill sm ${tokohFree === t ? 'active' : ''}`} onClick={() => setTokohFree(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="field grow" value={tokohFree} maxLength={40} onChange={(e) => setTokohFree(e.target.value)} placeholder="atau tokoh baru" data-testid="tokoh-bebas" />
            <input className="field grow" value={kapan} maxLength={60} onChange={(e) => setKapan(e.target.value)} placeholder="kapan?" />
          </div>
        </section>
      ) : null}

      <PromptCard p={prompt} />
      <RisetPita m={m} tokoh={tokoh} />

      {st.offers.length === 2 && !sealed ? (
        <section className="tawaran" data-testid="tawaran">
          <span className="label">pilih satu kartu role · hanya kamu yang lihat</span>
          <div className="tawaran-dua">
            {st.offers.map((id, i) => {
              const r = storyRole(id)!;
              const on = st.roles[meId] === id;
              return (
                <button key={id} className={`tawaran-k ${on ? 'on' : ''}`} style={{ '--n': i } as CSSProperties} onClick={() => !on && void m.run(() => m.post('/role', { roleId: id }))} data-testid={`tawar-${i}`}>
                  <span className="tiny">{r.tier} · {r.kind.replace('-', ' ')}</span>
                  <Doodle id={r.doodle} size={28} />
                  <b>{r.name}</b>
                  <span className="small">{r.batasan}</span>
                  {on ? <i>dipegang</i> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : role ? (
        <button className={`kartu-role ${flip ? 'flip' : ''}`} onClick={() => setFlip(!flip)} aria-expanded={flip} data-testid="kartu-role">
          <span className="kr-head">
            <Doodle id={role.doodle} size={30} />
            <span>
              <span className="tiny">kartu role-mu · {role.tier} · {role.kind.replace('-', ' ')}</span>
              <b>{role.name}</b>
            </span>
          </span>
          <span className="kr-row">
            <i>batasan</i>
            {role.batasan}
          </span>
          {flip ? (
            <>
              <span className="kr-row">
                <i>keuntungan · {st.rounds > 3 ? 'sekali per babak' : 'sekali per cerita'}</i>
                {role.keuntungan}
              </span>
              <span className="kr-row soft">
                <i>contoh</i>
                {role.contoh}
              </span>
            </>
          ) : (
            <span className="tiny soft">ketuk untuk melihat keuntungannya</span>
          )}
        </button>
      ) : null}

      {sealed ? (
        <section className="meja-segel" data-testid="bagian-tersegel">
          <span className="meja-amplop">
            <Doodle id="amplop" size={72} draw />
            <i className="pair-lak" />
          </span>
          <p className="rupa-hand">bagianmu tersegel.</p>
          <p className="small soft">Yang lain hanya tahu satu bagian sudah siap. Isinya terlipat sampai semua menyegel.</p>
          {finalLine ? <p className="serah-pita">“{finalLine}”</p> : null}
          <button className="btn ghost sm auto" disabled={busy} onClick={() => void save(false)} data-testid="tarik-segel">
            tarik segel untuk merevisi
          </button>
        </section>
      ) : (
        <>
          <StoryEditor
            value={text}
            onChange={setText}
            line={line}
            trace={trace}
            proof={proof}
            onLine={setLine}
            onTrace={setTrace}
            onProof={role ? setProof : undefined}
            placeholder={`Tulis adegan ${tokoh || 'tokohmu'} di sini…`}
            words={st.rounds > 3 ? { min: STORY_WORDS.min } : STORY_WORDS}
            focusHead={<PromptCard p={prompt} compact />}
          />

          <section className="serah" data-testid="serah">
            <span className="label">serah-terima</span>
            <div className="serah-row">
              <span className="serah-k biru">kalimat di lipatan</span>
              <span className="serah-v">{finalLine ? `“${finalLine}”` : <i>pilih satu kalimat dari naskah. Kalau kosong, kalimat terakhirmu yang dipakai.</i>}</span>
            </div>
            <div className="serah-row">
              <span className="serah-k merah">jejak</span>
              <span className="serah-v">
                {trace ? (
                  <>
                    “{trace}”{' '}
                    <button className="serah-x" onClick={() => setTrace('')} aria-label="hapus jejak">
                      ×
                    </button>
                  </>
                ) : (
                  <i>pilih potongan teks di naskah, lalu “jadikan jejak”. Satu jejak per bagian.</i>
                )}
              </span>
            </div>
            {!trace && !sealed ? (
              <AiJejak
                m={m}
                text={text}
                tokoh={tokoh}
                onPick={(u) => {
                  setTrace(u.potongan);
                  setKnows(u.tahu);
                  setQuestion(u.pertanyaan);
                }}
              />
            ) : null}
            {trace ? (
              <div className="serah-tahu">
                <span className="tiny soft">siapa yang secara masuk akal bisa tahu?</span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {others.map((t) => (
                    <button key={t} className={`pill sm ${knows.includes(t) ? 'active' : ''}`} onClick={() => setKnows(knows.includes(t) ? knows.filter((x) => x !== t) : [...knows, t])} data-testid={`tahu-${t}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <input className="field" value={question} maxLength={160} onChange={(e) => setQuestion(e.target.value)} placeholder="satu pertanyaan untuk penerimanya" data-testid="jejak-tanya" />
                {!knows.length ? <span className="tiny soft">Tanpa penerima, jejak ini tersimpan di Peta dan tampil tersensor bagi tokoh lain.</span> : null}
              </div>
            ) : null}
            <div className="serah-row">
              <span className="serah-k">untuk pembaca</span>
              <input className="field" value={intent} maxLength={240} onChange={(e) => setIntent(e.target.value)} placeholder="yang ingin kamu buat pembaca simpulkan (dirahasiakan sampai mereka menulis tafsirnya)" data-testid="maksud" />
            </div>
            {role ? (
              <label className="serah-perk">
                <span className="grow">
                  <b>pakai keuntungan {role.name}</b>
                  <span className="tiny soft">{m.st.perkUsed && !perk ? (st.rounds > 3 ? 'Jatah keuntungan babak ini sudah kamu pakai. Kartu baru di babak berikutnya membawa jatah baru.' : 'Jatah keuntungan kartumu sudah kamu pakai di cerita ini.') : `${role.keuntungan} ${st.rounds > 3 ? 'Sekali per babak.' : 'Sekali per cerita.'}`}</span>
                </span>
                <button type="button" role="switch" aria-checked={perk} disabled={m.st.perkUsed && !perk} className="switch" onClick={() => setPerk(!perk)} data-testid="pakai-keuntungan" />
              </label>
            ) : null}
            {perk && role?.kind === 'prompt' ? (
              <div className="serah-tahu">
                <span className="tiny soft">opsi tambahan di kartu prompt tokoh berikutnya</span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {others.map((t) => (
                    <button key={t} className={`pill sm ${optTo === t ? 'active' : ''}`} onClick={() => setOptTo(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <input className="field" value={optText} maxLength={200} onChange={(e) => setOptText(e.target.value)} placeholder="opsi yang boleh ia pakai atau abaikan" />
              </div>
            ) : null}
            {proof ? <span className="tiny soft">bukti batasan: “{proof}”</span> : null}
          </section>

          <button className="segel-btn" disabled={busy || !text.trim() || !tokoh} onClick={() => void save(true)} data-testid="segel-bagian">
            <span className="lak">
              <Doodle id="tunas" size={26} color="currentColor" sw={3} />
            </span>
            segel bagianku
          </button>
          <p className="tiny soft center" style={{ margin: 0 }}>Draf tersimpan di perangkat ini. Segel bisa ditarik selama belum semua menyegel.</p>
        </>
      )}

      {sealed && st.members.length > 1 ? <Waiting m={m} /> : null}
    </div>
  );
}

function Waiting({ m }: { m: StoryModel }) {
  const { st, meId, main } = m;
  const sealed = st.members.filter((u) => main.find((p) => p.round === st.round && p.authorId === u)?.sealed);
  if (sealed.length >= st.members.length) return null;
  const alone = st.aloneAt ? new Date(st.aloneAt) : null;
  const aloneOk = !!alone && alone.getTime() <= Date.now();
  return (
    <section className="meja-lewati" data-testid="lewati">
      <div className="row" style={{ gap: 6 }}>
        {st.members.map((u) => (
          <span key={u} className={`tunggu ${sealed.includes(u) ? 'on' : ''}`} title={m.name(u)}>
            <Avatar doodle={m.face(u)} size={26} />
          </span>
        ))}
      </div>
      {sealed.length === 1 ? (
        <>
          <p className="small soft">
            {aloneOk
              ? 'Sudah tiga hari. Kamu boleh lanjut sendiri; mereka bisa bergabung lagi di gelombang berikutnya.'
              : `Tidak ada tenggat. Kalau sampai ${alone ? alone.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' }) : 'tiga hari lagi'} belum ada bagian lain, kamu boleh lanjut sendiri.`}
          </p>
          <button className="pill" disabled={!aloneOk} onClick={() => void m.run(() => m.post('/skip'))} data-testid="usul-lewati">
            lanjut sendiri
          </button>
        </>
      ) : (
        <>
          <p className="small soft">Tidak ada tenggat. Kalau semua yang sudah menyegel setuju, gelombang ini bisa lanjut tanpa bagian yang belum masuk.</p>
          <button className={`pill ${st.skips.includes(meId) ? 'active' : ''}`} disabled={st.skips.includes(meId)} onClick={() => void m.run(() => m.post('/skip'))} data-testid="usul-lewati">
            {st.skips.includes(meId) ? `kamu setuju · ${st.skips.length} dari ${sealed.length}` : 'setuju lanjut tanpa mereka'}
          </button>
        </>
      )}
    </section>
  );
}

/** Riset yang relevan untuk tokoh ini: keputusan dunia dan kartu yang ditautkan. */
function RisetPita({ m, tokoh }: { m: StoryModel; tokoh: string }) {
  const items = m.st.research
    .map((w) => ({ w, r: m.open<StoryResearchPayload>(w.envelope) }))
    .filter((x): x is { w: (typeof m.st.research)[number]; r: StoryResearchPayload } => !!x.r && x.r.kind !== 'mood' && (x.r.kind === 'keputusan' || (!!tokoh && x.r.link?.toLowerCase() === tokoh.toLowerCase())))
    .slice(0, 5);
  if (!items.length) return null;
  return (
    <details className="riset-pita">
      <summary>
        <Doodle id="kacamata" size={16} /> dari ruang riset <em>{items.length}</em>
      </summary>
      <ul>
        {items.map(({ w, r }) => (
          <li key={w.id}>
            {r.title}
            {r.kind === 'keputusan' && r.origin ? <span className={`riset-asal o-${r.origin}`}>{r.origin === 'fiksi' ? 'fiksi kita' : r.origin}</span> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
