/**
 * Tentang Kita: permainan kartu ngobrol untuk pasangan, PDKT, sahabat,
 * rame-rame, atau sendirian. Dimainkan di satu HP bergiliran; HP lain bisa
 * ikut lewat tautan berbenih sehingga urutan kartunya sama. Kartu Renung
 * (filosofis & semesta) bisa dijawab spontan atau diriset dulu dengan timer.
 * Tidak ada yang dikirim ke server; jawaban yang ingin disimpan dibawa ke
 * jurnal, kapsul waktu, atau kartu ucapan.
 */
import { buildTkDeck, TK_CARDS, TK_KIND_LABEL, TK_LEVEL_LABEL, TK_RELATION_LABEL, type TkCard, type TkDeckOptions, type TkKind, type TkLevel, type TkRelation, tkPool } from '@sehari/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GreetingCard } from '@/lib/greeting';
import { navigate, usePath } from '@/lib/router';
import { useSession } from '@/lib/session';
import { shareOrCopy } from '@/lib/share';
import { sound } from '@/lib/sound';
import { store } from '@/lib/storage';
import { INKS } from '@/lib/theme';
import { Confetti, Doodle, Header, useToast } from '@/ui/kit';

const RELS: { id: TkRelation; doodle: string }[] = [
  { id: 'pasangan', doodle: 'hati-dua' },
  { id: 'pdkt', doodle: 'kupu-kupu' },
  { id: 'sahabat', doodle: 'pelukan' },
  { id: 'sendiri', doodle: 'lilin' },
];
const KINDS: { id: TkKind; doodle: string }[] = [
  { id: 'tanya', doodle: 'gelembung-kata' },
  { id: 'cermin', doodle: 'ui-aku-juga' },
  { id: 'tebak', doodle: 'ui-ide' },
  { id: 'dilema', doodle: 'kompas' },
  { id: 'renung', doodle: 'bulan' },
  { id: 'liar', doodle: 'bintang' },
];
const SOLO_KINDS: TkKind[] = ['tanya', 'dilema', 'renung'];
const SIZES = [12, 24, 40, 0];
const SKIPS = 2;

interface Game {
  seed: string;
  opts: TkDeckOptions;
  players: string[];
  idx: number;
  /** Sisa jatah lewati per pemain. */
  skips: number[];
  fav: string[];
  skipped: string[];
  dug: number;
  guess: { ok: number; total: number };
}

const newSeed = () => Math.random().toString(36).slice(2, 8);
const defaultOpts = (rel: TkRelation): TkDeckOptions => ({ rel, levels: [1, 2, 3], kinds: rel === 'sendiri' ? SOLO_KINDS : KINDS.map((k) => k.id), order: 'naik', size: 24 });

function encode(g: Pick<Game, 'seed' | 'opts'>, idx = 0) {
  const p = new URLSearchParams({ r: g.opts.rel, lv: g.opts.levels.join(''), k: g.opts.kinds.join(','), o: g.opts.order, n: String(g.opts.size), s: g.seed });
  if (idx) p.set('i', String(idx));
  return `${location.origin}/tentang-kita?${p}`;
}

function decode(search: URLSearchParams): { opts: TkDeckOptions; seed: string; idx: number } | null {
  const r = search.get('r') as TkRelation | null;
  const s = search.get('s');
  if (!r || !s || !(r in TK_RELATION_LABEL)) return null;
  const levels = (search.get('lv') ?? '123').split('').map(Number).filter((n): n is TkLevel => n === 1 || n === 2 || n === 3);
  const kinds = (search.get('k') ?? '').split(',').filter((k): k is TkKind => k in TK_KIND_LABEL);
  return {
    seed: s,
    idx: Math.max(0, Number(search.get('i') ?? 0) || 0),
    opts: { rel: r, levels: levels.length ? levels : [1, 2, 3], kinds: kinds.length ? kinds : defaultOpts(r).kinds, order: search.get('o') === 'acak' ? 'acak' : 'naik', size: Number(search.get('n') ?? 24) || 0 },
  };
}

export default function TentangKita() {
  const { search } = usePath();
  const [game, setGame] = useState<Game | null>(() => store.json<Game>('tk.main'));
  const [phase, setPhase] = useState<'atur' | 'main' | 'selesai'>('atur');
  const invite = useMemo(() => decode(search), [search]);

  useEffect(() => {
    if (game) store.set('tk.main', JSON.stringify(game));
    else store.del('tk.main');
  }, [game]);

  const start = (g: Game) => {
    setGame(g);
    setPhase('main');
    sound.play('open');
    if (location.search) history.replaceState(null, '', '/tentang-kita');
  };

  if (phase === 'main' && game) return <Play game={game} setGame={setGame} onEnd={() => { setPhase('selesai'); sound.play('chime'); }} onExit={() => setPhase('atur')} />;
  if (phase === 'selesai' && game) return <End game={game} onAgain={() => { setGame(null); setPhase('atur'); }} />;
  const preset = search.get('r') as TkRelation | null;
  return <Setup saved={game} invite={invite} preset={preset && preset in TK_RELATION_LABEL ? preset : null} names={search.get('p')?.split(',').filter(Boolean) ?? null} onStart={start} onResume={() => setPhase('main')} />;
}

// ── Atur permainan ──────────────────────────────────────────────────────────

function Setup({ saved, invite, preset, names, onStart, onResume }: { saved: Game | null; invite: ReturnType<typeof decode>; preset: TkRelation | null; names: string[] | null; onStart: (g: Game) => void; onResume: () => void }) {
  const { me } = useSession();
  const toast = useToast();
  const myName = me?.user.penName ?? 'aku';
  const [opts, setOpts] = useState<TkDeckOptions>(() => invite?.opts ?? (preset ? defaultOpts(preset) : null) ?? store.json<TkDeckOptions>('tk.atur') ?? defaultOpts('pasangan'));
  const [players, setPlayers] = useState<string[]>(() => (names && names.length > 1 ? names.slice(0, 8) : [myName, opts.rel === 'pdkt' ? 'dia' : 'kamu']));
  const [draft, setDraft] = useState('');
  const solo = opts.rel === 'sendiri';
  const kinds = solo ? KINDS.filter((k) => SOLO_KINDS.includes(k.id)) : KINDS;
  const matching = useMemo(() => tkPool(opts.rel).filter((c) => opts.levels.includes(c.level) && opts.kinds.includes(c.kind)).length, [opts]);
  const savedDeck = useMemo(() => (saved ? buildTkDeck(saved.opts, saved.seed) : []), [saved]);

  useEffect(() => store.set('tk.atur', JSON.stringify(opts)), [opts]);

  const pickRel = (rel: TkRelation) => {
    sound.play('tap');
    setOpts((o) => ({ ...o, rel, kinds: rel === 'sendiri' ? o.kinds.filter((k) => SOLO_KINDS.includes(k)).concat(o.kinds.some((k) => SOLO_KINDS.includes(k)) ? [] : SOLO_KINDS) : o.rel === 'sendiri' ? KINDS.map((k) => k.id) : o.kinds }));
    if (rel === 'pdkt' && players.length === 2 && players[1] === 'kamu') setPlayers([players[0]!, 'dia']);
  };
  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? (xs.length > 1 ? xs.filter((y) => y !== x) : xs) : [...xs, x]);
  const make = (seed = newSeed(), idx = 0): Game => {
    const ps = solo ? [myName] : players.filter((p) => p.trim());
    return { seed, opts, players: ps.length ? ps : [myName], idx, skips: ps.map(() => SKIPS), fav: [], skipped: [], dug: 0, guess: { ok: 0, total: 0 } };
  };
  const addPlayer = () => {
    const n = draft.trim();
    if (!n || players.length >= 8) return;
    setPlayers([...players, n]);
    setDraft('');
  };

  return (
    <main className="screen tk">
      <Header backTo="/hari" />
      <section className="tk-hero">
        <div className="tk-fan" aria-hidden>
          <span className="tk-mini k-renung">
            <Doodle id="bulan" size={30} color="currentColor" />
          </span>
          <span className="tk-mini k-cermin">
            <Doodle id="ui-aku-juga" size={30} color="currentColor" />
          </span>
          <span className="tk-mini k-tanya">
            <Doodle id="gelembung-kata" size={30} color="currentColor" />
          </span>
        </div>
        <h1 className="tk-title">Tentang Kita</h1>
        <p className="small ink-soft center">permainan kartu ngobrol · {TK_CARDS.length} kartu yang tidak kacangan</p>
      </section>

      {invite ? (
        <div className="card tk-invite">
          <Doodle id="amplop" size={30} />
          <div className="grow">
            <b>kamu diajak main</b>
            <p className="tiny ink-soft">Urutan kartunya sama dengan HP yang mengajak. Tulis namamu, lalu mulai.</p>
          </div>
        </div>
      ) : saved && saved.idx < savedDeck.length ? (
        <div className="card tk-invite">
          <Doodle id="kartu" size={30} />
          <div className="grow">
            <b>lanjutkan permainan</b>
            <p className="tiny ink-soft">
              kartu {saved.idx + 1} dari {savedDeck.length} · {TK_RELATION_LABEL[saved.opts.rel].name}
            </p>
          </div>
          <button className="btn auto sm" onClick={onResume}>
            lanjut
          </button>
        </div>
      ) : null}

      <section className="section">
        <span className="label">main dengan siapa?</span>
        <div className="tk-rels">
          {RELS.map((r) => (
            <button key={r.id} className={`tk-rel ${opts.rel === r.id ? 'on' : ''}`} onClick={() => pickRel(r.id)}>
              <Doodle id={r.doodle} size={34} />
              <b>{TK_RELATION_LABEL[r.id].name}</b>
              <span className="tiny ink-soft">{TK_RELATION_LABEL[r.id].sub}</span>
            </button>
          ))}
        </div>
      </section>

      {!solo ? (
        <section className="section">
          <span className="label">pemain (bergiliran)</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {players.map((p, i) => (
              <span key={i} className="pill tk-player">
                <input value={p} maxLength={20} aria-label={`pemain ${i + 1}`} onChange={(e) => setPlayers(players.map((x, j) => (j === i ? e.target.value : x)))} />
                {players.length > 2 ? (
                  <button aria-label="hapus pemain" onClick={() => setPlayers(players.filter((_, j) => j !== i))}>
                    ×
                  </button>
                ) : null}
              </span>
            ))}
            {players.length < 8 ? (
              <span className="pill tk-player add">
                <input value={draft} maxLength={20} placeholder="+ tambah" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} onBlur={addPlayer} />
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="section">
        <span className="label">seberapa dalam?</span>
        <div className="tk-levels">
          {([1, 2, 3] as TkLevel[]).map((lv) => (
            <button key={lv} className={`tk-level ${opts.levels.includes(lv) ? 'on' : ''}`} onClick={() => setOpts({ ...opts, levels: toggle(opts.levels, lv) })}>
              <span className="tk-dots" data-lv={lv} />
              <span className="small">{TK_LEVEL_LABEL[lv]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <span className="label">jenis kartu</span>
        <div className="tk-kinds">
          {kinds.map((k) => (
            <button key={k.id} className={`tk-kind k-${k.id} ${opts.kinds.includes(k.id) ? 'on' : ''}`} onClick={() => setOpts({ ...opts, kinds: toggle(opts.kinds, k.id) })}>
              <Doodle id={k.doodle} size={22} color="currentColor" />
              <span>
                <b>{TK_KIND_LABEL[k.id].name}</b>
                <span className="tiny">{k.id === 'renung' ? 'filosofis & semesta — spontan atau riset dulu' : TK_KIND_LABEL[k.id].hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="seg">
          <button className={opts.order === 'naik' ? 'on' : ''} onClick={() => setOpts({ ...opts, order: 'naik' })}>
            makin lama makin dalam
          </button>
          <button className={opts.order === 'acak' ? 'on' : ''} onClick={() => setOpts({ ...opts, order: 'acak' })}>
            acak
          </button>
        </div>
        <span className="label mt">jumlah kartu</span>
        <div className="seg">
          {SIZES.map((n) => (
            <button key={n} className={opts.size === n ? 'on' : ''} onClick={() => setOpts({ ...opts, size: n })}>
              {n || 'semua'}
            </button>
          ))}
        </div>
        <p className="tiny ink-soft center mt">{matching} kartu cocok dengan pilihanmu</p>
      </section>

      <button className="btn tk-start" disabled={!matching} onClick={() => onStart(invite ? make(invite.seed, invite.idx) : make())}>
        <Doodle id="kartu" size={22} color="currentColor" /> mulai main
      </button>
      {!solo && !invite ? (
        <button
          className="btn ghost mt"
          onClick={async () => {
            const g = make();
            const r = await shareOrCopy(`Main Tentang Kita bareng aku? Buka ini, urutan kartunya sama: `, encode(g));
            if (r === 'copied') toast('Tautan disalin. Kirim ke HP yang mau ikut main.');
            onStart(g);
          }}>
          <Doodle id="ui-bagikan" size={18} color="currentColor" /> main dari dua HP (jarak jauh / video call)
        </button>
      ) : null}
      <p className="tiny soft center mt-lg">Semua kartu ada di perangkatmu. Tidak ada jawaban yang dikirim ke mana pun.</p>
    </main>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

function Play({ game, setGame, onEnd, onExit }: { game: Game; setGame: (g: Game) => void; onEnd: () => void; onExit: () => void }) {
  const { status } = useSession();
  const toast = useToast();
  const deck = useMemo(() => buildTkDeck(game.opts, game.seed), [game.opts, game.seed]);
  const card = deck[Math.min(game.idx, deck.length - 1)];
  const n = game.players.length;
  const turn = game.idx % n;
  const player = game.players[turn]!;
  const other = game.players[(turn + 1) % n]!;
  const solo = game.opts.rel === 'sendiri';
  const [deep, setDeep] = useState(0);
  const faved = card ? game.fav.includes(card.id) : false;

  useEffect(() => setDeep(0), [game.idx]);
  if (!card) return null;

  const go = (d: number, patch: Partial<Game> = {}) => {
    const idx = game.idx + d;
    if (idx >= deck.length) {
      setGame({ ...game, ...patch, idx: deck.length });
      onEnd();
      return;
    }
    setGame({ ...game, ...patch, idx: Math.max(0, idx) });
    sound.play('turn');
  };
  const skip = () => {
    if (!solo && game.skips[turn]! <= 0) return toast(`Jatah lewati ${player} sudah habis. Coba jawab sebisanya, ya.`);
    go(1, { skips: game.skips.map((s, i) => (i === turn && !solo ? s - 1 : s)), skipped: [...game.skipped, card.id] });
  };
  const dig = () => {
    setDeep((d) => d + 1);
    setGame({ ...game, dug: game.dug + 1 });
    sound.play('pop');
  };
  const fav = () => {
    setGame({ ...game, fav: faved ? game.fav.filter((x) => x !== card.id) : [...game.fav, card.id] });
    sound.play(faved ? 'tap' : 'pop');
  };

  return (
    <main className="screen tk tk-play">
      <header className="row between tk-top">
        <button className="icon-btn" aria-label="keluar" onClick={onExit}>
          <Doodle id="ui-tutup" size={22} />
        </button>
        <div className="grow col center" style={{ gap: 4 }}>
          <span className="tiny ink-soft">
            kartu {game.idx + 1} / {deck.length}
          </span>
          <div className="tk-progress">
            <span style={{ width: `${((game.idx + 1) / deck.length) * 100}%` }} />
          </div>
        </div>
        <button
          className="icon-btn"
          aria-label="bagikan"
          onClick={async () => {
            const r = await shareOrCopy(`“${card.text}” — dari Tentang Kita di Sehari`, solo ? undefined : encode(game, game.idx));
            if (r === 'copied') toast('Disalin.');
          }}>
          <Doodle id="ui-bagikan" size={22} />
        </button>
      </header>

      {!solo ? (
        <p className="center tk-turn">
          {card.kind === 'tebak' ? (
            <>
              <b>{other}</b> membacakan, <b>{player}</b> menebak
            </>
          ) : card.kind === 'cermin' && n === 2 ? (
            <>
              <b>{player}</b> bicara tentang <b>{other}</b>
            </>
          ) : (
            <>
              giliran <b>{player}</b>
            </>
          )}
        </p>
      ) : null}

      <article key={card.id} className={`tk-card k-${card.kind}`}>
        <div className="tk-card-head">
          <span className="tk-kind-tag">
            <Doodle id={KINDS.find((k) => k.id === card.kind)!.doodle} size={18} color="currentColor" /> {TK_KIND_LABEL[card.kind].name}
            {card.theme ? ` · ${card.theme}` : ''}
          </span>
          <span className="tk-dots" data-lv={card.level} title={TK_LEVEL_LABEL[card.level]} />
        </div>
        <p className={`tk-q ${card.text.length > 120 ? 'long' : ''}`}>{card.text}</p>
        {card.kind === 'dilema' && card.sides ? <Dilema key={card.id} sides={card.sides} /> : null}
        {deep > 0 && card.deeper.length ? <p className="tk-deeper">{card.deeper[(deep - 1) % card.deeper.length]}</p> : null}
        {card.kind !== 'dilema' ? <p className="tiny tk-hint">{TK_KIND_LABEL[card.kind].hint}</p> : null}
      </article>

      {card.kind === 'tebak' ? <Tebak key={`tebak-${card.id}`} who={player} target={other} onScore={(ok) => setGame({ ...game, guess: { ok: game.guess.ok + (ok ? 1 : 0), total: game.guess.total + 1 } })} /> : null}
      {card.kind === 'renung' ? <Renung key={`renung-${card.id}`} card={card} /> : null}

      <div className="row wrap tk-extra">
        <button className="pill sm" onClick={dig} data-sound="none">
          <Doodle id="ui-cari" size={14} color="currentColor" /> {card.deeper.length ? 'gali lagi' : 'kenapa begitu?'}
        </button>
        {status === 'ready' ? (
          <>
            <button className="pill sm" onClick={() => navigate(`/hari?prompt=${encodeURIComponent(card.text)}&kind=card`)}>
              <Doodle id="pena" size={14} color="currentColor" /> tulis di jurnal
            </button>
            <button className="pill sm" onClick={() => navigate(`/surat/tulis?kind=future&self=1&text=${encodeURIComponent(`Setahun lalu aku ditanya: “${card.text}”\n\nJawabanku waktu itu:\n`)}`)}>
              <Doodle id="jam-pasir" size={14} color="currentColor" /> tanya lagi setahun lagi
            </button>
          </>
        ) : null}
      </div>
      {deep > 0 && !card.deeper.length ? <p className="tiny ink-soft center">{DIG_FALLBACK[(deep - 1) % DIG_FALLBACK.length]}</p> : null}

      <div className="tk-bar">
        <button className="icon-btn" aria-label="kartu sebelumnya" disabled={game.idx === 0} onClick={() => go(-1)}>
          <Doodle id="ui-kembali" size={22} />
        </button>
        <button className="btn soft auto" onClick={skip}>
          lewati{!solo ? ` (${game.skips[turn]})` : ''}
        </button>
        <button className={`icon-btn tk-fav ${faved ? 'on' : ''}`} aria-label="simpan kartu" aria-pressed={faved} onClick={fav}>
          <Doodle id="ui-hati" size={22} color="currentColor" />
        </button>
        <button className="btn grow" onClick={() => go(1)} data-sound="none">
          {game.idx + 1 >= deck.length ? 'selesai' : card.kind === 'liar' ? 'sudah dilakukan →' : 'lanjut →'}
        </button>
      </div>
    </main>
  );
}

const DIG_FALLBACK = ['Kenapa begitu? Dari mana kamu belajar itu?', 'Sejak kapan kamu merasa begitu?', 'Kalau jawabanmu berubah sepuluh tahun lagi, kira-kira jadi apa?', 'Apa yang belum kamu katakan dari jawaban tadi?'];

function Dilema({ sides }: { sides: [string, string] }) {
  const [pick, setPick] = useState<0 | 1 | null>(null);
  return (
    <div className="tk-dilema">
      {sides.map((s, i) => (
        <button key={i} className={`tk-side ${pick === i ? 'on' : ''}`} onClick={() => { setPick(i as 0 | 1); sound.play('tap'); }}>
          <span className="tk-side-mark">{i ? 'B' : 'A'}</span>
          {s}
        </button>
      ))}
      {pick === null ? <p className="tiny tk-hint">Pilih sisimu dulu.</p> : <p className="tiny tk-hint">Bela sisi {pick ? 'B' : 'A'} selama satu menit. Lalu tukar: bela sisi yang tidak kamu pilih.</p>}
    </div>
  );
}

function Tebak({ who, target, onScore }: { who: string; target: string; onScore: (ok: boolean) => void }) {
  const [guess, setGuess] = useState('');
  const [shown, setShown] = useState(false);
  const [scored, setScored] = useState<boolean | null>(null);
  return (
    <section className="card flat tk-tebak">
      <span className="tiny ink-soft">1 · {who} menulis tebakan diam-diam</span>
      <textarea className={`field ${shown ? '' : 'tk-secret'}`} rows={2} value={guess} placeholder="tebakanmu…" onChange={(e) => setGuess(e.target.value)} />
      <span className="tiny ink-soft">2 · {target} menjawab dengan suara</span>
      {!shown ? (
        <button className="btn soft" disabled={!guess.trim()} onClick={() => { setShown(true); sound.play('open'); }}>
          buka tebakan
        </button>
      ) : scored === null ? (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn grow" onClick={() => { setScored(true); onScore(true); sound.play('chime'); }}>
            nyambung ✓
          </button>
          <button className="btn soft grow" onClick={() => { setScored(false); onScore(false); sound.play('soft'); }}>
            meleset
          </button>
        </div>
      ) : (
        <p className="small center">{scored ? 'Kalian saling kenal. 💛' : 'Meleset — berarti masih ada yang bisa dikenali.'}</p>
      )}
    </section>
  );
}

function Renung({ card }: { card: TkCard }) {
  const [mode, setMode] = useState<'spontan' | 'riset' | null>(null);
  const [mins, setMins] = useState(3);
  return (
    <section className="card flat tk-renung">
      {!mode ? (
        <>
          <span className="small">Mau dijawab bagaimana?</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn soft grow" onClick={() => { setMode('spontan'); setMins(3); }}>
              <Doodle id="ui-api" size={18} color="currentColor" /> spontan
            </button>
            <button className="btn soft grow" onClick={() => { setMode('riset'); setMins(15); }}>
              <Doodle id="buku" size={18} color="currentColor" /> riset dulu
            </button>
          </div>
          <p className="tiny ink-soft">Spontan: jawab dari intuisi, tanpa Google. Riset: masing-masing mencari dulu, lalu kembali dan bandingkan.</p>
        </>
      ) : mode === 'spontan' ? (
        <>
          <span className="small">Jawab dari intuisi. Tidak ada jawaban salah, yang ada alasan yang menarik.</span>
          <Timer key="s" minutes={3} />
        </>
      ) : (
        <>
          <span className="small">Tulis dulu tebakan awalmu di kepala. Lalu riset, kembali, dan bandingkan: siapa yang paling berubah pikiran?</span>
          <div className="seg">
            {[10, 15, 30].map((m) => (
              <button key={m} className={mins === m ? 'on' : ''} onClick={() => setMins(m)}>
                {m} menit
              </button>
            ))}
          </div>
          <Timer key={mins} minutes={mins} />
          {card.research?.length ? (
            <>
              <span className="tiny ink-soft">titik awal pencarian:</span>
              <div className="row wrap" style={{ gap: 6 }}>
                {card.research.map((k) => (
                  <a key={k} className="pill sm" href={`https://id.wikipedia.org/w/index.php?search=${encodeURIComponent(k)}`} target="_blank" rel="noreferrer">
                    {k} ↗
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="tiny ink-soft">Pertanyaan ini tidak punya satu jawaban. Cari bagaimana orang lain, filsuf, atau budaya lain menjawabnya.</p>
          )}
        </>
      )}
    </section>
  );
}

function Timer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60);
  const [run, setRun] = useState(false);
  const t = useRef<number>(0);
  useEffect(() => {
    if (!run) return;
    t.current = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t.current);
  }, [run]);
  useEffect(() => {
    if (left <= 0 && run) {
      setRun(false);
      sound.play('chime');
      navigator.vibrate?.([120, 80, 120]);
    }
  }, [left, run]);
  const s = Math.max(0, left);
  return (
    <div className="tk-timer">
      <span className="tk-clock" data-done={s === 0 ? '1' : '0'}>
        {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
      </span>
      <button className="btn sm auto" onClick={() => (s === 0 ? (setLeft(minutes * 60), setRun(true)) : setRun(!run))}>
        {s === 0 ? 'ulang' : run ? 'jeda' : 'mulai'}
      </button>
      {s === 0 ? <span className="small">Waktunya bahas!</span> : null}
    </div>
  );
}

// ── Selesai ─────────────────────────────────────────────────────────────────

function End({ game, onAgain }: { game: Game; onAgain: () => void }) {
  const deck = useMemo(() => buildTkDeck(game.opts, game.seed), [game.opts, game.seed]);
  const favs = game.fav.map((id) => TK_CARDS.find((c) => c.id === id)).filter((c): c is TkCard => !!c);
  const talked = deck.length - game.skipped.length;
  const solo = game.opts.rel === 'sendiri';
  const [line, setLine] = useState('');
  const to = solo ? 'diriku' : game.players.slice(1).join(' & ') || 'kamu';

  const toCard = () => {
    const pick = favs[0] ?? deck[Math.min(deck.length - 1, Math.floor(deck.length * 0.7))];
    const message = [line.trim(), pick ? `Malam ini kita membahas: “${pick.text}”` : ''].filter(Boolean).join('\n\n').slice(0, 500);
    const draft: GreetingCard = { design: 'malam', format: 'kotak', to, message, from: game.players[0] ?? '', ink: INKS[0].id, doodles: ['bulan', 'kilau'], occasion: 'tanpa-alasan' };
    store.set('kartu.draf', JSON.stringify(draft));
    navigate('/kartu');
  };

  return (
    <main className="screen tk">
      <Confetti />
      <Header backTo="/hari" />
      <section className="tk-hero">
        <Doodle id="tangan-bergandeng" size={84} className="breathe" />
        <h1 className="tk-title">obrolan selesai</h1>
        <p className="small ink-soft center">{solo ? 'Terima kasih sudah jujur pada dirimu sendiri.' : 'Terima kasih sudah saling membuka.'}</p>
      </section>
      <div className="tk-stats">
        <div>
          <b>{talked}</b>
          <span className="tiny">kartu dibahas</span>
        </div>
        <div>
          <b>{game.dug}</b>
          <span className="tiny">kali gali lebih dalam</span>
        </div>
        {game.guess.total ? (
          <div>
            <b>
              {game.guess.ok}/{game.guess.total}
            </b>
            <span className="tiny">tebakan nyambung</span>
          </div>
        ) : null}
      </div>

      {favs.length ? (
        <section className="section">
          <span className="label">kartu yang kalian simpan</span>
          <div className="col" style={{ gap: 8 }}>
            {favs.map((c) => (
              <div key={c.id} className={`tk-fav-card k-${c.kind}`}>
                <span className="tiny">{TK_KIND_LABEL[c.kind].name}</span>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <span className="label">kartu penutup</span>
        <p className="tiny ink-soft">{solo ? 'Satu kalimat untuk dirimu sendiri, dari obrolan malam ini.' : `Satu kalimat untuk ${to}, dari obrolan malam ini.`}</p>
        <textarea className="field write-like" rows={3} maxLength={300} value={line} placeholder="malam ini aku jadi tahu…" onChange={(e) => setLine(e.target.value)} />
        <button className="btn mt" disabled={!line.trim()} onClick={toCard}>
          <Doodle id="amplop" size={20} color="currentColor" /> jadikan kartu ucapan
        </button>
      </section>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn soft grow" onClick={onAgain}>
          main lagi
        </button>
      </div>
    </main>
  );
}
