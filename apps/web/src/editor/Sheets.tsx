import { COPY, type DailyCard, DECKS, HELP_RESOURCES, type MoodCode, type NightQuestion, type SongRef } from '@sehari/core';
import { DOODLES } from '@sehari/doodles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchSongMeta, parseSongUrl } from '@/lib/songs';
import { store } from '@/lib/storage';
import { Doodle, MoodPicker, Sheet, Toggle } from '@/ui/kit';
import { FILLS, SPECIAL, StickerArt } from './stickers';


const STICKER_CATS: { id: string; label: string }[] = [
  { id: 'scrapbook', label: 'selotip & cap' },
  { id: 'stiker', label: 'hiasan' },
  { id: 'perasaan', label: 'perasaan' },
  { id: 'makanan', label: 'makanan' },
  { id: 'perjalanan', label: 'perjalanan' },
  { id: 'bunga', label: 'bunga' },
  { id: 'tanaman', label: 'tanaman' },
  { id: 'buah', label: 'buah' },
  { id: 'makhluk', label: 'makhluk' },
  { id: 'benda', label: 'benda' },
  { id: 'cuaca', label: 'cuaca' },
  { id: 'musim', label: 'musim' },
  { id: 'token', label: 'kenangan' },
];

export function StickerSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const cats = STICKER_CATS.filter((c) => c.id === 'scrapbook' || DOODLES.some((d) => d.category === c.id));
  const [cat, setCat] = useState('perasaan');
  const [q, setQ] = useState('');
  const list = useMemo(
    () => DOODLES.filter((d) => d.category !== 'ui' && (q ? d.name.toLowerCase().includes(q.toLowerCase()) || d.id.includes(q.toLowerCase()) : d.category === cat)),
    [cat, q],
  );
  return (
    <Sheet open={open} onClose={onClose} title="stiker">
      <input className="field" placeholder="cari: kopi, hujan, kucing…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row" style={{ overflowX: 'auto', gap: 6, padding: '10px 0', scrollbarWidth: 'none' }}>
        {cats.map((c) => (
          <button key={c.id} className={`pill ${cat === c.id && !q ? 'active' : ''}`} onClick={() => { setQ(''); setCat(c.id); }}>
            {c.label}
          </button>
        ))}
      </div>
      {cat === 'scrapbook' && !q ? (
        <div className="sticker-grid wide">
          {SPECIAL.map((id, i) => (
            <button key={id} title={id} onClick={() => onPick(id)} className="sticker-cell">
              <StickerArt id={id} fill={FILLS[i % 6]} scale={0.5} />
            </button>
          ))}
        </div>
      ) : (
        <div className="sticker-grid">
          {list.map((d, i) => (
            <button key={d.id} title={d.name} onClick={() => onPick(d.id)} className="sticker-cell">
              <StickerArt id={d.id} fill={FILLS[i % 6]} />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export function MoodSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (m: MoodCode) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="warna hari ini">
      <p className="small soft">{COPY.empty.tired}</p>
      <MoodPicker onChange={(m) => onPick(m)} />
    </Sheet>
  );
}

export function SongSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (s: SongRef, note: string) => void }) {
  const [url, setUrl] = useState('');
  const [song, setSong] = useState<SongRef | null>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const resolve = async () => {
    const p = parseSongUrl(url);
    if (!p) return setErr('Tempel tautan Spotify, YouTube Music, atau Apple Music.');
    setErr(null);
    const meta = await fetchSongMeta(p).catch(() => null);
    setSong({ ...p, title: meta?.title ?? '', artist: meta?.artist ?? '' });
  };
  return (
    <Sheet open={open} onClose={onClose} title="lagu hari ini">
      <div className="col">
        <input className="field" placeholder="https://open.spotify.com/track/…" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={resolve} />
        {!song ? <button className="btn soft" onClick={resolve}>ambil info lagu</button> : null}
        {song ? (
          <>
            <input className="field" placeholder="judul" value={song.title} onChange={(e) => setSong({ ...song, title: e.target.value })} />
            <input className="field" placeholder="penyanyi" value={song.artist} onChange={(e) => setSong({ ...song, artist: e.target.value })} />
            <input className="field" placeholder="kenapa lagu ini, hari ini? (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn" disabled={!song.title} onClick={() => { onSave(song, note); setUrl(''); setSong(null); setNote(''); }}>tempel di halaman</button>
          </>
        ) : null}
        <span className="tiny soft">Yang disimpan hanya info & tautannya, bukan file lagunya.</span>
        {err ? <span className="small">{err}</span> : null}
      </div>
    </Sheet>
  );
}

type Recog = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void; onerror: () => void };
const Recognition = (globalThis as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog }).SpeechRecognition ??
  (globalThis as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition;

/**
 * Cerita Suara: rekam bebas, dan (kalau peramban mendukung dan kamu mau)
 * ucapanmu ikut dituliskan menjadi teks di halaman.
 */
export function VoiceSheet({ open, onClose, maxSeconds, onDone }: { open: boolean; onClose: () => void; maxSeconds: number; onDone: (blob: Blob, ms: number, transcript?: string) => void }) {
  const rec = useRef<MediaRecorder | null>(null);
  const recog = useRef<Recog | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const finalText = useRef('');
  const [ms, setMs] = useState(0);
  const [recording, setRecording] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [write, setWrite] = useState(() => store.get('voiceWrite') === '1');
  const [live, setLive] = useState('');

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const d = Date.now() - started.current;
      setMs(d);
      if (d >= maxSeconds * 1000) stop();
    }, 200);
    return () => clearInterval(t);
  }, [recording]);

  const listen = () => {
    if (!write || !Recognition) return;
    finalText.current = '';
    setLive('');
    try {
      const r = new Recognition();
      r.lang = 'id-ID';
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]!;
          if (res.isFinal) finalText.current += `${res[0]!.transcript.trim()} `;
          else interim += res[0]!.transcript;
        }
        setLive(`${finalText.current}${interim}`);
      };
      r.onerror = () => {};
      r.start();
      recog.current = r;
    } catch {
      recog.current = null;
    }
  };

  const start = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const r = new MediaRecorder(stream, { mimeType: type });
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // Beri pengenal suara sejenak untuk menuntaskan kalimat terakhir.
        setTimeout(() => {
          const text = finalText.current.trim() || undefined;
          onDone(new Blob(chunks.current, { type }), Date.now() - started.current, text);
          setLive('');
        }, recog.current ? 600 : 0);
      };
      rec.current = r;
      started.current = Date.now();
      r.start();
      listen();
      setRecording(true);
    } catch {
      setErr('Izin mikrofon dibutuhkan untuk merekam cerita.');
    }
  };
  const stop = () => {
    setRecording(false);
    recog.current?.stop();
    rec.current?.state === 'recording' && rec.current.stop();
    setTimeout(() => (recog.current = null), 800);
  };
  const secs = Math.floor(ms / 1000);
  return (
    <Sheet open={open} onClose={() => { stop(); onClose(); }} title="cerita suara">
      <div className="voice-rupa">
        <div className="vr-head">
          <span className={`vr-dot ${recording ? 'on' : ''}`} />
          <b>{recording ? 'mendengarkan' : 'siap mendengar'}</b>
        </div>
        <p className="small ink-soft" style={{ margin: 0 }}>Cerita saja sebebasnya: tawa, hujan, ucapan selamat tidur. Nanti tersimpan rapi di halamanmu.</p>
        <div className={`vr-wave ${recording ? 'on' : ''}`} aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${(i * 0.09) % 1.2}s` }} />
          ))}
        </div>
        {live ? <p className="vr-live rupa-hand">{live}</p> : null}
        <div className="vr-bar">
          <span className="tiny ink-soft">{`${String(Math.floor(secs / 60))}:${String(secs % 60).padStart(2, '0')} / ${Math.floor(maxSeconds / 60)}:${String(maxSeconds % 60).padStart(2, '0')}`}</span>
          <button className={`vr-btn ${recording ? 'stop' : ''}`} onClick={recording ? stop : start} aria-label={recording ? 'berhenti' : 'rekam'} data-testid="voice-rec">
            {recording ? <span className="vr-square" /> : <Doodle id="ui-mikrofon" size={26} color="currentColor" />}
            {recording ? 'selesai' : 'rekam'}
          </button>
        </div>
        {Recognition ? (
          <Toggle
            label="tuliskan juga jadi teks"
            hint="Memakai pengenal suara bawaan peramban (bisa diproses di server Google/Apple). Rekamannya sendiri tetap terenkripsi."
            value={write}
            onChange={(v) => {
              setWrite(v);
              store.set('voiceWrite', v ? '1' : '0');
            }}
          />
        ) : null}
        {err ? <span className="small">{err}</span> : null}
      </div>
    </Sheet>
  );
}

const KIND_LABEL: Record<string, string> = { pertanyaan: 'pertanyaan', tantangan: 'tantangan', kenangan: 'kenangan', rahasia: 'rahasia' };
const KIND_TINT: Record<string, string> = { pertanyaan: 'var(--sticky-yellow)', tantangan: 'var(--sticky-green)', kenangan: 'var(--sticky-peach)', rahasia: 'var(--sticky-blue)' };

function CardFace({ card, label, onClick, big }: { card: DailyCard; label?: string; onClick: () => void; big?: boolean }) {
  return (
    <button className={`card-face ${big ? 'big' : ''}`} style={{ '--tint': KIND_TINT[card.kind] } as React.CSSProperties} onClick={onClick}>
      <span className="card-face-top">
        <span>{label ?? KIND_LABEL[card.kind]}</span>
        <Doodle id={card.doodle ?? 'kartu'} size={big ? 34 : 24} color="currentColor" />
      </span>
      <span className="card-face-title">{card.title}</span>
      <span className="card-face-body">{card.body}</span>
      <span className="card-face-foot">{card.kind === 'rahasia' ? 'terbuka setelah kalian berdua menjawab' : 'ketuk untuk menjawab di halaman'}</span>
    </button>
  );
}

export function PromptSheet({ open, onClose, card, question, onPick }: { open: boolean; onClose: () => void; card: DailyCard; question: NightQuestion | null; onPick: (p: { prompt: string; cardId?: string; questionId?: string; kind: 'card' | 'answer' }) => void }) {
  const [drawn, setDrawn] = useState<DailyCard | null>(null);
  const [deck, setDeck] = useState<string | null>(null);
  const [flip, setFlip] = useState(0);
  const all = useMemo(() => DECKS.flatMap((d) => d.cards.filter((c) => !c.rare)), []);
  const pick = (c: DailyCard) => onPick({ prompt: c.body, cardId: c.id, kind: 'card' });
  const shown = drawn ?? card;
  const deckCards = deck ? (DECKS.find((d) => d.id === deck)?.cards ?? []).filter((c) => !c.rare) : [];
  return (
    <Sheet open={open} onClose={onClose} title="kartu">
      <div className="col gap-lg">
        <div key={flip} className="card-flip">
          <CardFace big card={shown} label={drawn ? `${KIND_LABEL[shown.kind]} · ${DECKS.find((d) => d.cards.includes(shown))?.name.replace(/^Dek /, '') ?? ''}` : card.rare ? 'kartu langka hari ini' : 'kartu hari ini'} onClick={() => pick(shown)} />
        </div>
        <button className="btn soft" onClick={() => { setDrawn(all[Math.floor(Math.random() * all.length)]!); setFlip((n) => n + 1); }}>
          <Doodle id="ui-dadu" size={20} color="currentColor" /> tarik kartu lain
        </button>
        {question ? (
          <button className="card-face night" onClick={() => onPick({ prompt: question.text, questionId: question.id, kind: 'answer' })}>
            <span className="card-face-top">
              <span>pertanyaan malam</span>
              <Doodle id="bulan" size={24} color="currentColor" />
            </span>
            <span className="card-face-body">{question.text}</span>
            <span className="card-face-foot">jawaban semua orang terbuka bersamaan saat disegel</span>
          </button>
        ) : null}
        <div>
          <span className="label">jelajahi dek</span>
          <div className="chip-row mt">
            {DECKS.map((d) => (
              <button key={d.id} className={`pill sm ${deck === d.id ? 'active' : ''}`} onClick={() => setDeck(deck === d.id ? null : d.id)}>
                <Doodle id={d.doodle} size={14} color="currentColor" /> {d.name.replace(/^Dek /, '')} <span style={{ opacity: 0.6 }}>{d.cards.length}</span>
              </button>
            ))}
          </div>
          {deck ? (
            <>
              <p className="tiny soft">{DECKS.find((d) => d.id === deck)?.description}</p>
              <div className="card-list">
                {deckCards.map((c) => (
                  <CardFace key={c.id} card={c} onClick={() => pick(c)} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

export function SilentSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (mood: MoodCode | undefined, text: string) => void }) {
  const [mood, setMood] = useState<MoodCode | undefined>();
  const [text, setText] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title={COPY.silentRoom.title}>
      <div className="col gap-lg">
        <p className="small" style={{ margin: 0 }}>{COPY.silentRoom.intro}</p>
        <p className="tiny soft" style={{ margin: 0 }}>{COPY.silentRoom.candleOnly}</p>
        <MoodPicker value={mood} onChange={setMood} compact />
        <input className="field" placeholder="boleh kosong" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" onClick={() => onSave(mood, text)}>nyalakan lilin di halaman</button>
        <div className="card flat small">
          {COPY.silentRoom.helpLead}
          <div className="tiny soft mt">{HELP_RESOURCES.map((h) => `${h.name}: ${h.contact}`).join(' · ')}</div>
        </div>
      </div>
    </Sheet>
  );
}
