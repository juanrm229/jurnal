/**
 * Kuis Seberapa Kenal: satu soal pilihan ganda per hari per lingkaran. Kamu
 * menjawab untuk dirimu sendiri, lalu menebak jawaban mereka. Jawaban & tebakan
 * terenkripsi; terbuka dengan aturan "jawab dulu, baru lihat".
 */
import { hashString } from './rituals';
import { type DayKey, diffDays } from './time';

export interface KenalQuestion {
  id: string;
  /** Untuk dijawab sendiri. */
  self: string;
  /** Untuk menebak orang lain; {nama} diganti nama pena. */
  other: string;
  options: [string, string, string, string];
}

export const KENAL: KenalQuestion[] = [
  { id: 'sedih', self: 'Kalau sedang sedih, aku paling butuh…', other: 'Kalau {nama} sedang sedih, dia paling butuh…', options: ['dipeluk', 'ditemani diam-diam', 'diajak makan', 'dibiarkan dulu sebentar'] },
  { id: 'hujan', self: 'Hujan sore-sore, aku paling ingin…', other: 'Hujan sore-sore, {nama} paling ingin…', options: ['tidur', 'minum yang hangat', 'menonton sesuatu', 'jalan kehujanan'] },
  { id: 'makan', self: 'Kalau boleh makan satu hal seumur hidup…', other: 'Kalau boleh makan satu hal seumur hidup, {nama} pilih…', options: ['nasi goreng', 'mi', 'bakso', 'martabak'] },
  { id: 'libur', self: 'Libur sehari tanpa rencana, aku akan…', other: 'Libur sehari tanpa rencana, {nama} akan…', options: ['tidur seharian', 'jalan sendirian', 'kumpul dengan teman', 'beres-beres'] },
  { id: 'marah', self: 'Kalau kesal, biasanya aku…', other: 'Kalau kesal, biasanya {nama}…', options: ['diam dulu', 'langsung bilang', 'menulis', 'cari makan'] },
  { id: 'pagi', self: 'Hal pertama yang kulakukan setelah bangun…', other: 'Hal pertama yang {nama} lakukan setelah bangun…', options: ['lihat HP', 'minum air', 'tidur lagi lima menit', 'langsung bangun'] },
  { id: 'liburan', self: 'Liburan impianku…', other: 'Liburan impian {nama}…', options: ['pantai', 'gunung', 'kota besar', 'rumah, tapi tanpa kerjaan'] },
  { id: 'hadiah', self: 'Hadiah yang paling membuatku senang…', other: 'Hadiah yang paling membuat {nama} senang…', options: ['surat tulisan tangan', 'makanan', 'barang yang lama diincar', 'waktu bersama'] },
  { id: 'lagu', self: 'Lagu yang kuputar saat perjalanan pulang…', other: 'Lagu yang {nama} putar saat perjalanan pulang…', options: ['yang sedih-sedih', 'yang bikin semangat', 'podcast saja', 'sunyi tanpa musik'] },
  { id: 'takut', self: 'Yang paling diam-diam kutakutkan…', other: 'Yang paling diam-diam {nama} takutkan…', options: ['ditinggal', 'gagal', 'kecoak terbang', 'tidak cukup baik'] },
  { id: 'kopi', self: 'Minumanku kalau sedang begadang…', other: 'Minuman {nama} kalau sedang begadang…', options: ['kopi', 'teh', 'susu', 'air putih saja'] },
  { id: 'sayang', self: 'Cara paling mudah membuatku merasa disayang…', other: 'Cara paling mudah membuat {nama} merasa disayang…', options: ['kata-kata', 'sentuhan', 'dibantu', 'diberi waktu'] },
  { id: 'malam', self: 'Jam segini biasanya aku sedang…', other: 'Jam segini biasanya {nama} sedang…', options: ['rebahan', 'masih kerja', 'mengobrol', 'sudah ngantuk berat'] },
  { id: 'film', self: 'Film yang paling sering kutonton ulang…', other: 'Film yang paling sering {nama} tonton ulang…', options: ['komedi', 'romantis', 'horor', 'animasi'] },
  { id: 'kecil', self: 'Hal kecil yang paling membuatku bahagia…', other: 'Hal kecil yang paling membuat {nama} bahagia…', options: ['cuaca cerah', 'makanan enak', 'chat dari orang tersayang', 'tidur siang'] },
  { id: 'kemampuan', self: 'Kalau bisa punya satu kemampuan ajaib…', other: 'Kalau bisa punya satu kemampuan ajaib, {nama} pilih…', options: ['berpindah tempat', 'membaca pikiran', 'menghentikan waktu', 'terbang'] },
  { id: 'kamar', self: 'Barang yang selalu ada di dekat kasurku…', other: 'Barang yang selalu ada di dekat kasur {nama}…', options: ['charger', 'botol minum', 'boneka/bantal kecil', 'buku'] },
  { id: 'jalan', self: 'Kalau tersesat, aku…', other: 'Kalau tersesat, {nama}…', options: ['buka peta', 'tanya orang', 'jalan terus saja', 'telepon seseorang'] },
  { id: 'rindu', self: 'Kalau sedang rindu, aku biasanya…', other: 'Kalau sedang rindu, {nama} biasanya…', options: ['langsung chat', 'lihat foto lama', 'menahan saja', 'menulis'] },
  { id: 'hari', self: 'Hari favoritku dalam seminggu…', other: 'Hari favorit {nama} dalam seminggu…', options: ['Jumat', 'Sabtu', 'Minggu', 'tidak ada, semua sama'] },
  { id: 'warna', self: 'Warna yang paling "aku banget"…', other: 'Warna yang paling "{nama} banget"…', options: ['biru', 'hijau', 'kuning', 'hitam/putih'] },
  { id: 'telepon', self: 'Aku lebih suka…', other: '{nama} lebih suka…', options: ['ditelepon', 'chat panjang', 'voice note', 'ketemu langsung'] },
  { id: 'cemas', self: 'Kalau cemas, yang menenangkanku…', other: 'Kalau cemas, yang menenangkan {nama}…', options: ['jalan kaki', 'mandi', 'mendengar suara orang tersayang', 'tidur'] },
  { id: 'sarapan', self: 'Sarapan idealku…', other: 'Sarapan ideal {nama}…', options: ['nasi uduk/kuning', 'roti', 'bubur', 'tidak sarapan'] },
  { id: 'kenangan', self: 'Kenangan masa kecil yang paling sering kuingat…', other: 'Kenangan masa kecil yang paling sering {nama} ingat…', options: ['main di luar rumah', 'liburan keluarga', 'sekolah', 'makanan buatan rumah'] },
  { id: 'ulangtahun', self: 'Ulang tahun yang paling kuinginkan…', other: 'Ulang tahun yang paling {nama} inginkan…', options: ['pesta kecil', 'makan malam berdua', 'kejutan', 'hari biasa yang tenang'] },
  { id: 'bosan', self: 'Kalau bosan, aku…', other: 'Kalau bosan, {nama}…', options: ['scroll media sosial', 'tidur', 'cari camilan', 'menghubungi seseorang'] },
  { id: 'cuaca', self: 'Cuaca favoritku…', other: 'Cuaca favorit {nama}…', options: ['cerah', 'mendung adem', 'hujan', 'malam berangin'] },
  { id: 'pujian', self: 'Pujian yang paling mengena untukku…', other: 'Pujian yang paling mengena untuk {nama}…', options: ['kamu baik', 'kamu pintar', 'kamu lucu', 'aku bangga sama kamu'] },
  { id: 'masa', self: 'Kalau bisa kembali ke satu masa…', other: 'Kalau bisa kembali ke satu masa, {nama} pilih…', options: ['masa kecil', 'masa sekolah', 'tahun lalu', 'tidak mau, sekarang sudah pas'] },
];

/** Soal kuis hari ini untuk sebuah lingkaran (berbeda urutan tiap lingkaran). */
export function quizFor(circleId: string, day: DayKey): KenalQuestion {
  const idx = diffDays(day, '2024-01-01');
  const offset = hashString(`kenal:${circleId}`) % KENAL.length;
  return KENAL[(((idx + offset) % KENAL.length) + KENAL.length) % KENAL.length]!;
}

export const quizQuestionId = (q: KenalQuestion) => `kenal:${q.id}`;

export interface QuizAnswer {
  authorId: string;
  day: DayKey;
  questionId: string;
  choice: number;
  guesses: Record<string, number>;
}

export interface QuizScore {
  /** Tebakan benar & jumlah tebakan, per penebak. */
  byGuesser: Record<string, { correct: number; total: number }>;
  /** Per pasangan: seberapa sering `from` menebak `to` dengan benar. */
  pairs: { from: string; to: string; correct: number; total: number }[];
}

/** Hitung skor dari jawaban-jawaban kuis yang sudah terbuka. */
export function quizScores(answers: QuizAnswer[]): QuizScore {
  const byGuesser: QuizScore['byGuesser'] = {};
  const pairMap = new Map<string, { from: string; to: string; correct: number; total: number }>();
  const key = (a: QuizAnswer) => `${a.day}|${a.questionId}`;
  const groups = new Map<string, QuizAnswer[]>();
  for (const a of answers) (groups.get(key(a)) ?? groups.set(key(a), []).get(key(a))!).push(a);
  for (const list of groups.values()) {
    for (const g of list) {
      for (const t of list) {
        if (t.authorId === g.authorId || g.guesses[t.authorId] === undefined) continue;
        const ok = g.guesses[t.authorId] === t.choice;
        const s = (byGuesser[g.authorId] ??= { correct: 0, total: 0 });
        s.total++;
        if (ok) s.correct++;
        const pk = `${g.authorId}>${t.authorId}`;
        const p = pairMap.get(pk) ?? pairMap.set(pk, { from: g.authorId, to: t.authorId, correct: 0, total: 0 }).get(pk)!;
        p.total++;
        if (ok) p.correct++;
      }
    }
  }
  return { byGuesser, pairs: [...pairMap.values()].sort((a, b) => b.correct - a.correct) };
}

/** Julukan lembut dari persentase tebakan benar. */
export function kenalLabel(correct: number, total: number): string {
  if (!total) return 'belum menebak';
  const r = correct / total;
  if (r >= 0.9) return 'hafal di luar kepala';
  if (r >= 0.7) return 'kenal betul';
  if (r >= 0.5) return 'lumayan kenal';
  if (r >= 0.3) return 'masih penuh kejutan';
  return 'banyak yang belum kamu tahu (dan itu seru)';
}
