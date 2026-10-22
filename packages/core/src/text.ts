/**
 * Analisis teks berbasis aturan, berjalan di perangkat (tingkat privasi 1).
 * Dipakai untuk kata yang paling sering ditulis, Motif, Kamus Lingkaran,
 * dan bahan Puisi Temuan. Tidak pernah menyimpulkan kondisi psikologis.
 */

const STOPWORDS_RAW = `
ada adalah adanya agak agar akan akankah akhir aku akulah amat anda andalah antar antara apa apaan apabila apakah apalagi atau ataupun atas bagai bagaimana bagi bahkan bahwa baik banyak baru bawah beberapa begini begitu belakang belum benar berapa berikut bersama besar betul biasa bila bisa boleh buat bukan bukankah cara cukup cuma dahulu dalam dan dapat dari daripada datang dekat demi dengan depan di dia diri dirinya dong dulu engkau gitu harus hanya hal hari ini hingga ia ialah ikut ingin itu jadi jangan juga jika jikalau juga kah kalau kali kami kamu kan kapan karena kata ke kebetulan kecil kemudian kenapa kepada ketika kini kita kok lagi lah lain lalu lama lebih lewat maka mana masih mau melainkan memang mereka meski mungkin nah namun nanti nya oleh pada padahal paling para pasti pernah pula pun punya saat saja sama sambil sampai sana sang sangat saya se sebab sebagai sebelum sedang sedikit segala sehingga sejak sekali sekarang selalu seluruh semua sementara sendiri seperti sering serta sesuatu setelah setiap sih siapa sini situ suatu sudah supaya tadi tak tanpa tapi tetapi telah tentang tentu terhadap terlalu tersebut tetap tiap tidak toh untuk wah waktu ya yaitu yakni yang aja udah udh ga gak nggak enggak ngga tdk sy gue gw lu lo elo kayak kyk banget bgt deh dah yg dgn utk sm jg tp krn kalo klo emang mmg biar bikin ama trus terus abis habis lho loh kok kah dll dsb aja sih nih tuh ah eh oh hmm hehe haha wkwk wkwkwk
`;

export const STOPWORDS: ReadonlySet<string> = new Set(STOPWORDS_RAW.split(/\s+/).filter(Boolean));

/** Kosakata umum yang tidak dianggap "kata khas" lingkaran. */
const COMMON_RAW = `
makan minum tidur bangun kerja kantor kuliah kampus sekolah rumah kamar kos jalan pulang pergi kopi teh nasi air hujan panas dingin pagi siang sore malam besok kemarin minggu bulan tahun senang sedih capek lelah marah kangen rindu sayang cinta teman sahabat ibu bapak ayah mama papa kakak adik anak orang hati kepala badan sakit sehat obat dokter uang beli bayar murah mahal toko pasar mall kereta motor mobil bus ojek macet hp film lagu musik main game buku baca tulis cerita foto video lihat dengar bilang ngomong tanya jawab mikir pikir rasa ingat lupa tahu kenal suka mau butuh coba mulai selesai sibuk santai libur cuti tugas kerjaan meeting deadline email chat telepon video call kabar baik buruk enak lucu seru bosan takut berani malu bangga syukur alhamdulillah semoga amin tuhan doa sholat puasa buka sahur lebaran mudik natal kota desa kampung laut pantai gunung sungai taman hutan langit matahari awan angin bintang bunga pohon daun kucing anjing burung ikan ayam sapi kambing
`;

const COMMON: ReadonlySet<string> = new Set(COMMON_RAW.split(/\s+/).filter(Boolean));

/** Pecah teks jadi kata huruf kecil; membuang tanda baca, angka, emoji, url. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length >= 2);
}

export function contentWords(text: string): string[] {
  return tokenize(text).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export interface AuthoredText {
  authorId: string;
  day: string;
  text: string;
}

export interface WordCount {
  word: string;
  count: number;
  days: number;
  authors: number;
}

export function wordCounts(texts: AuthoredText[]): WordCount[] {
  const map = new Map<string, { count: number; days: Set<string>; authors: Set<string> }>();
  for (const t of texts) {
    for (const w of contentWords(t.text)) {
      let e = map.get(w);
      if (!e) map.set(w, (e = { count: 0, days: new Set(), authors: new Set() }));
      e.count++;
      e.days.add(t.day);
      e.authors.add(t.authorId);
    }
  }
  return [...map.entries()]
    .map(([word, e]) => ({ word, count: e.count, days: e.days.size, authors: e.authors.size }))
    .sort((a, b) => b.count - a.count || b.days - a.days || a.word.localeCompare(b.word));
}

export function topWords(texts: AuthoredText[], n = 10): WordCount[] {
  return wordCounts(texts).slice(0, n);
}

/**
 * Kandidat Kamus Lingkaran: kata yang dipakai minimal dua anggota, di minimal
 * tiga hari berbeda, dan bukan kosakata umum. Selalu hanya *ditawarkan*.
 */
export function dictionaryCandidates(texts: AuthoredText[], known: string[] = [], n = 8): WordCount[] {
  const skip = new Set(known.map((k) => k.toLowerCase()));
  return wordCounts(texts)
    .filter((w) => w.authors >= 2 && w.days >= 3 && !COMMON.has(w.word) && !skip.has(w.word))
    .slice(0, n);
}

/** Kandidat Motif: hal yang muncul berulang di banyak hari sepanjang periode. */
export function motifCandidates(texts: AuthoredText[], known: string[] = [], n = 6): WordCount[] {
  const skip = new Set(known.map((k) => k.toLowerCase()));
  const totalDays = new Set(texts.map((t) => t.day)).size || 1;
  return wordCounts(texts)
    .filter((w) => w.days >= Math.max(3, Math.ceil(totalDays * 0.05)) && !skip.has(w.word))
    .sort((a, b) => b.days - a.days || b.count - a.count)
    .slice(0, n);
}

/**
 * Bahan Puisi Temuan: rangkai kalimat dari teks seminggu jadi selembar
 * paragraf untuk dihitamkan kata demi kata.
 */
export function blackoutSource(texts: AuthoredText[], maxWords = 160): string[] {
  const words: string[] = [];
  for (const t of texts) {
    for (const w of t.text.replace(/https?:\/\/\S+/g, '').split(/\s+/)) {
      if (w) words.push(w);
      if (words.length >= maxWords) return words;
    }
  }
  return words;
}

/** Ringkas teks panjang untuk kartu & notifikasi tanpa memotong kata. */
export function excerpt(text: string, max = 120): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,.;:!?-]+$/, '') + '…';
}

const NUM_WORDS = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'];

export function numberWord(n: number): string {
  return NUM_WORDS[n] ?? String(n);
}
