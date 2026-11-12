/**
 * Studio Naskah: naskah berbasis adegan dengan Kanon dan Kacamata Tokoh.
 * Semua isi (adegan, kanon, judul) dienkripsi di perangkat; perhitungan "siapa
 * tahu apa, kapan" berjalan di perangkat juga, dari payload yang sudah dibuka.
 */

export type NaskahKind = 'tokoh' | 'benda' | 'tempat' | 'fakta';
export const NASKAH_KINDS: NaskahKind[] = ['tokoh', 'benda', 'tempat', 'fakta'];

export interface NaskahMeta {
  v: 1;
  title: string;
  logline?: string;
}

/** Waktu cerita: label bebas untuk dibaca, dan kunci urut "YYYY-MM-DD HH:mm" (boleh sebagian, mis. "1979" atau "1979-02-15"). */
export interface NaskahWhen {
  label: string;
  sort: string;
}

export interface NaskahScenePayload {
  v: 1;
  title?: string;
  /** Id entri Kanon jenis tokoh yang menjadi sudut pandang adegan. */
  pov: string;
  when: NaskahWhen;
  text: string;
  /** Rumah di Kota: adegan ini kesaksian atas peristiwa kota (id almanak). */
  peristiwa?: string;
  saksi?: 'mengalami' | 'mendengar';
}

/** Siapa (tokoh) tahu atau mengira sebuah entri, mulai adegan mana. Tanpa `since`: sejak awal. */
export interface NaskahKnow {
  who: string;
  how: 'tahu' | 'mengira';
  since?: string;
}

export interface NaskahCanonPayload {
  v: 1;
  kind: NaskahKind;
  /** Nama tokoh/benda/tempat, atau kalimat fakta. */
  name: string;
  /** Kata yang menandai entri ini di teks (untuk fakta: kata kuncinya). */
  aliases: string[];
  note?: string;
  known: NaskahKnow[];
  /** Adegan tempat entri ini mulai ada di dunia cerita. Tanpa ini: sejak awal. */
  since?: string;
  /** Tokoh: tahun lahir dan wafat, dipakai untuk memeriksa hubungan antar-rumah di Kota. */
  born?: number;
  died?: number;
}

export interface NaskahEntry {
  id: string;
  p: NaskahCanonPayload;
}

export interface NaskahSceneLite {
  id: string;
  chapter: number;
  order: number;
  p: NaskahScenePayload | null;
}

export const NASKAH_SORT_RE = /^\d{4}(-\d{2}(-\d{2}( \d{2}:\d{2})?)?)?$/;

/**
 * Kunci kronologi tiap adegan. Adegan bertanggal memakai tanggalnya; adegan tanpa
 * tanggal ditaruh tepat sesudah adegan bertanggal terakhir dalam urutan baca.
 */
export function naskahChrono(scenes: NaskahSceneLite[]): Record<string, string> {
  const sorted = [...scenes].sort((a, b) => a.chapter - b.chapter || a.order - b.order);
  const out: Record<string, string> = {};
  let last = '0000';
  sorted.forEach((s, i) => {
    const sort = s.p?.when.sort?.trim() ?? '';
    if (sort && NASKAH_SORT_RE.test(sort)) {
      last = sort;
      out[s.id] = `${sort}~${String(i).padStart(4, '0')}`;
    } else out[s.id] = `${last}~${String(i).padStart(4, '0')}`;
  });
  return out;
}

/** Tahun cerita dari kunci urut, kalau ada. */
export const naskahYear = (sort: string | undefined) => {
  const m = sort?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
};

export interface Kacamata {
  tahu: NaskahEntry[];
  mengira: NaskahEntry[];
  /** Ada di dunia cerita pada saat itu, tapi tidak sampai ke tokoh ini. */
  belum: NaskahEntry[];
}

/** Apa yang diketahui tokoh `pov` tepat sebelum adegan dengan kunci kronologi `at`. */
export function naskahKacamata(pov: string, at: string, canon: NaskahEntry[], chrono: Record<string, string>): Kacamata {
  const out: Kacamata = { tahu: [], mengira: [], belum: [] };
  const before = (sceneId: string | undefined) => !sceneId || (chrono[sceneId] !== undefined && chrono[sceneId]! <= at);
  for (const e of canon) {
    if (e.id === pov || !before(e.p.since)) continue;
    const k = e.p.known.filter((x) => x.who === pov && before(x.since));
    if (k.some((x) => x.how === 'tahu')) out.tahu.push(e);
    else if (k.length) out.mengira.push(e);
    else if (e.p.kind !== 'tokoh') out.belum.push(e);
  }
  return out;
}

/** Kata pemicu sebuah entri di dalam teks. Fakta hanya lewat kata kuncinya. */
export const naskahTerms = (e: NaskahCanonPayload) => [...(e.kind === 'fakta' ? [] : [e.name]), ...e.aliases].map((x) => x.trim()).filter((x) => x.length >= 2);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Semua kemunculan sebuah kata utuh (tanpa beda huruf besar-kecil), termasuk dengan akhiran -nya dan sejenisnya. */
export function naskahFind(text: string, term: string): { at: number; end: number }[] {
  // Akhiran yang lazim (-nya, -ku, -mu, -lah, -kah, -pun) tetap dihitung sebagai kata yang sama.
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(term)})(?=(?:nya|ku|mu|lah|kah|pun)?(?:$|[^\\p{L}\\p{N}]))`, 'giu');
  const out: { at: number; end: number }[] = [];
  for (const m of text.matchAll(re)) {
    const at = (m.index ?? 0) + m[1]!.length;
    out.push({ at, end: at + m[2]!.length });
  }
  return out;
}

/** Perkiraan kasar kapan sebuah kata mulai umum dipakai di Indonesia. Hanya penanda, bukan larangan. */
export const NASKAH_ZAMAN: { terms: string[]; since: number; note: string }[] = [
  { terms: ['ponsel', 'handphone', 'telepon genggam', 'hape'], since: 1995, note: 'ponsel mulai umum sekitar pertengahan 1990-an' },
  { terms: ['sms'], since: 1996, note: 'SMS mulai dipakai sekitar 1996' },
  { terms: ['internet', 'warnet'], since: 1995, note: 'internet umum mulai pertengahan 1990-an' },
  { terms: ['email', 'surel'], since: 1995, note: 'email umum mulai pertengahan 1990-an' },
  { terms: ['facebook'], since: 2004, note: 'Facebook lahir 2004' },
  { terms: ['youtube'], since: 2005, note: 'YouTube lahir 2005' },
  { terms: ['twitter'], since: 2006, note: 'Twitter lahir 2006' },
  { terms: ['smartphone', 'layar sentuh'], since: 2007, note: 'ponsel pintar layar sentuh umum setelah 2007' },
  { terms: ['whatsapp'], since: 2009, note: 'WhatsApp lahir 2009' },
  { terms: ['instagram'], since: 2010, note: 'Instagram lahir 2010' },
  { terms: ['ojek online', 'ojol', 'gojek'], since: 2015, note: 'ojek daring umum sekitar 2015' },
  { terms: ['televisi', 'tv'], since: 1962, note: 'siaran televisi di Indonesia mulai 1962' },
];

export interface NaskahWarning {
  kind: 'belum' | 'zaman';
  term: string;
  at: number;
  end: number;
  /** Entri Kanon untuk peringatan pengetahuan. */
  entry?: NaskahEntry;
  /** Tokoh yang sudah tahu, dan sejak adegan mana (untuk menjelaskan). */
  first?: NaskahKnow;
  note?: string;
}

/** Peringatan untuk teks adegan: tokoh menyebut hal yang belum ia ketahui, atau kata yang belum ada di zamannya. */
export function naskahWarnings(text: string, pov: string, at: string, canon: NaskahEntry[], chrono: Record<string, string>, year: number | null): NaskahWarning[] {
  const out: NaskahWarning[] = [];
  const lens = naskahKacamata(pov, at, canon, chrono);
  for (const e of lens.belum) {
    const first = [...e.p.known].filter((k) => k.how === 'tahu').sort((a, b) => (chrono[a.since ?? ''] ?? '').localeCompare(chrono[b.since ?? ''] ?? ''))[0];
    for (const t of naskahTerms(e.p)) for (const r of naskahFind(text, t)) out.push({ kind: 'belum', term: t, ...r, entry: e, first });
  }
  if (year) for (const z of NASKAH_ZAMAN) if (year < z.since) for (const t of z.terms) for (const r of naskahFind(text, t)) out.push({ kind: 'zaman', term: t, ...r, note: z.note });
  // Satu peringatan per letak; yang lebih awal di teks lebih dulu.
  const seen = new Set<string>();
  return out.sort((a, b) => a.at - b.at).filter((w) => (seen.has(`${w.at}`) ? false : (seen.add(`${w.at}`), true)));
}

/** Sebutan entri yang sudah diketahui tokoh, untuk diberi garis biru di editor. */
export function naskahMentions(text: string, entries: NaskahEntry[]): { at: number; end: number; id: string }[] {
  const out: { at: number; end: number; id: string }[] = [];
  for (const e of entries) for (const t of naskahTerms(e.p)) for (const r of naskahFind(text, t)) out.push({ ...r, id: e.id });
  return out;
}
