/**
 * Si Benih: tanaman lingkaran yang bawel, dan Primbon Ngawur yang ia bisikkan
 * setiap kali hari disegel. Semuanya dihitung di perangkat dari data yang
 * sudah terbuka di sana; tidak ada isi jurnal yang dikirim ke mana pun.
 */
import type { PlantState } from './plant';
import { contentWords } from './text';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Acak tapi tetap: urutan yang sama untuk benih yang sama. */
function shuffled<T>(xs: readonly T[], seed: string): T[] {
  const out = [...xs];
  let h = hash(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export type BenihMood = 'tidur' | 'girang' | 'santai' | 'haus' | 'ngambek' | 'cemburu' | 'pesta';

export interface BenihTalk {
  mood: BenihMood;
  /** Celetukan; yang pertama paling cocok dengan keadaan sekarang. */
  lines: string[];
}

export interface BenihContext {
  /** Jam lokal 0–23. */
  hour: number;
  /** Benih untuk urutan celetukan (mis. id lingkaran + hari). */
  seed: string;
  /** Kamu sendiri sudah menyegel hari ini. */
  sealedByMe?: boolean;
  /** Menit yang baru saja dihabiskan di Ruang Main hari ini. */
  playedMinutes?: number;
  /** Nama pasangan/teman yang belum menyegel hari ini. */
  waitingFor?: string[];
}

const NIGHT = (h: number) => h >= 22 || h < 5;

/**
 * Celetukan Si Benih. Tidak pernah menyalahkan: paling jauh ia merajuk.
 * Baris pertama selalu yang paling relevan; sisanya untuk ketukan berikutnya.
 */
export function benihTalk(p: PlantState, ctx: BenihContext): BenihTalk {
  const s = p.stage.name;
  const key = p.stage.key;
  const lead: string[] = [];
  const pool: string[] = [];
  let mood: BenihMood = 'santai';

  if (p.anniversary.inDays === 0) {
    mood = 'pesta';
    lead.push(`Hari jadi ke-${p.anniversary.years}! Aku sudah pakai topi. Kalian mana kuenya?`);
  }

  const fresh = p.togetherDays === 0;
  if (fresh) {
    lead.push(p.watered ? 'Baru ditanam, sudah disiram. Aku merasa disambut.' : 'Halo. Aku baru ditanam. Segel satu hari bersama, nanti aku mengintip keluar.');
  } else if (p.health === 'layu') {
    mood = mood === 'pesta' ? mood : 'ngambek';
    lead.push('Oh, kalian masih ingat alamat pot ini?', 'Aku tidak marah. Aku cuma… miring sedikit.');
    pool.push('Layu itu bukan mati. Aku cuma sedang dramatis.', 'Satu kilasan saja dan aku pura-pura tidak pernah ngambek.', 'Daunku turun, harga diriku tidak.');
  } else if (p.health === 'haus') {
    mood = mood === 'pesta' ? mood : 'haus';
    lead.push('Haus. Bukan kode, ini pengumuman.', 'Tanahku kering seperti chat yang cuma dibalas "ok".');
    pool.push('Satu kilasan = satu gayung. Murah, kan?', 'Aku bisa menunggu. Tapi aku akan menunggu sambil mengeluh.');
  } else if (p.watered) {
    mood = mood === 'pesta' ? mood : 'girang';
    lead.push('Segar! Rasanya seperti habis mandi sore.', 'Disiram. Hari ini aku resmi tanaman paling beruntung se-RT.');
  }

  if ((ctx.playedMinutes ?? 0) >= 10 && mood !== 'pesta') {
    if (p.health === 'segar' && !p.watered) mood = 'cemburu';
    lead.unshift(`${ctx.playedMinutes} menit di Ruang Main. Aku menghitung. Aku selalu menghitung.`);
    pool.push('Kartu-kartu itu tidak bisa berfotosintesis, lho.');
  }

  if (NIGHT(ctx.hour) && mood !== 'pesta' && mood !== 'ngambek') {
    mood = 'tidur';
    lead.unshift(ctx.sealedByMe ? 'Zzz… hari sudah disegel. Matikan lampu, ya.' : 'Zzz… eh. Kamu belum menyegel hari ini, kan?');
    pool.push('Aku tidur sambil berdiri. Bakat alami.');
  }

  const wait = ctx.waitingFor ?? [];
  if (ctx.sealedByMe && wait.length && !NIGHT(ctx.hour)) pool.unshift(`Kamu sudah menyegel. ${wait[0]} belum. Aku tidak mengadu, cuma mencatat.`);
  else if (!ctx.sealedByMe && ctx.hour >= 18 && !NIGHT(ctx.hour)) pool.unshift('Sudah senja. Halamanmu masih terbuka, aku lihat dari sini.');

  if (p.next && p.toNext !== undefined) {
    if (p.toNext === 1) pool.unshift(`Satu hari lagi aku jadi ${p.next.name}. Jangan bikin aku deg-degan.`);
    else if (p.toNext <= 5) pool.push(`${p.toNext} hari lagi jadi ${p.next.name}. Aku sudah latihan pose.`);
    else pool.push(`${p.toNext} hari lagi menuju ${p.next.name}. Pelan-pelan, aku tidak ke mana-mana. Secara harfiah.`);
  }

  const byStage: Record<string, string[]> = {
    benih: ['Aku masih benih. Tapi benih dengan ambisi.', 'Gelap di sini. Segel satu hari bersama, nanti aku mengintip keluar.', 'Jangan dikorek-korek. Aku sedang berproses.'],
    tunas: ['Lihat, aku punya dua daun. Dua! Seperti kalian.', 'Aku kecil, tapi sudah punya pendapat.'],
    daun: ['Daunku nambah. Kalian nambah apa minggu ini?', 'Fotosintesis itu kerja keras, tahu.'],
    kuncup: ['Aku sedang menyimpan kejutan. Jangan diintip.', 'Kuncup itu bunga yang lagi malu-malu.'],
    bunga: ['Aku mekar. Silakan dipuji, aku punya waktu.', 'Wangi, kan? Itu wangi konsistensi.'],
    matahari: ['Aku selalu menghadap ke arah yang terang. Biasanya ke arah kalian.', 'Tinggi itu soal sikap. Dan soal disiram tiap hari.'],
    pohon: ['Aku sudah jadi pohon. Dulu kalian menertawakan benihku.', 'Burung mulai melirik dahanku. Aku jual mahal.'],
    'pohon-lampu': ['Lampuku menyala dari hari-hari yang kalian segel. Tagihan listriknya: nol.', 'Setahun lebih. Aku pohon paling setia di kecamatan ini.'],
  };
  pool.push(...(byStage[key] ?? []));

  if (p.visitors) pool.unshift('Ada kupu-kupu mampir. Katanya di sini ramai.');
  if (p.togetherDays >= 3) pool.push(`${p.togetherDays} hari disegel bersama. Aku ingat semuanya, daunku buktinya.`);
  if (p.sinceDays >= 30) pool.push(`Hari ke-${p.sinceDays} sejak kalian menanamku. Aku tidak menghitung. (Aku menghitung.)`);
  if (ctx.hour >= 5 && ctx.hour < 10) pool.push('Pagi. Aku sudah bangun dari tadi, menunggu matahari dan menunggu kalian.');
  if (ctx.hour >= 12 && ctx.hour < 15) pool.push('Siang begini enaknya disiram, bukan ditinggal scroll.');
  pool.push(`Namaku ${s}. Itu pangkat, bukan nama panggilan.`, 'Rahasia ya: aku paling suka hari yang biasa-biasa saja.', 'Ketuk lagi. Aku punya banyak bahan.');

  const rest = shuffled([...new Set(pool)], ctx.seed);
  const lines = [...new Set([...lead, ...rest])];
  return { mood, lines };
}

// ── Primbon Ngawur ──────────────────────────────────────────────────────────

const FALLBACK = ['kopi', 'hujan', 'sandal', 'angkot', 'gorengan', 'charger', 'jemuran', 'kucing', 'payung', 'tukang parkir', 'mi instan', 'bantal'];
const WETON = ['Senin Santuy', 'Selasa Kliwon-kliwonan', 'Rabu Rebahan', 'Kamis Manis', 'Jumat Berkah', 'Sabtu Legi Banget', 'Minggu Pahing-pahingnya'];
const LUCKY = ['arah keberuntungan: kulkas', 'angka keberuntungan: sisa baterai HP-mu', 'warna keberuntungan: warna jemuran tetangga', 'jam baik: lima menit setelah alarm', 'pantangan: membalas "wkwk" tanpa tertawa', 'arah keberuntungan: tempat charger', 'jimat hari ini: karet gelang', 'pantangan: bilang "terserah" lalu protes'];

const TEMPLATES: ((a: string, b: string) => string)[] = [
  (a, b) => `Besok, ${a} akan membawa kabar tentang ${b}. Jangan dibuka sebelum sarapan.`,
  (a, b) => `Menurut hitungan weton, ${a} dan ${b} tidak boleh disatukan sebelum jam sepuluh pagi.`,
  (a) => `Hati-hati dengan ${a} hari Kamis. Ia tahu lebih banyak daripada yang ia tunjukkan.`,
  (a, b) => `Rezekimu datang dari arah ${a}. Jodohmu dari arah ${b}. Jangan sampai tertukar.`,
  (a, b) => `Bila besok kamu bertemu ${a}, tersenyumlah. Bila bertemu ${b}, pura-pura sibuk.`,
  (a) => `Bintangmu minggu ini: ${a}. Para ahli tidak tahu artinya, tapi sepakat itu bagus.`,
  (a, b) => `Mimpi tentang ${a} artinya kamu kurang ${b}. Atau kurang tidur. Primbon tidak yakin.`,
  (a, b) => `Orang yang menulis "${a}" hari ini akan ditraktir oleh orang yang memikirkan ${b}.`,
  (a) => `Leluhur berpesan: jangan mengambil keputusan besar sebelum urusan ${a} selesai.`,
  (a, b) => `${cap(a)} adalah kunci. ${cap(b)} adalah pintunya. Rumahnya entah di mana.`,
  (a, b) => `Dalam tujuh hari, ${a} akan muncul lagi di hidupmu, kali ini membawa ${b}.`,
  (a) => `Hari ini ${a} berpihak padamu. Besok belum tentu, jadi manfaatkan.`,
];

function cap(s: string) {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

export interface Primbon {
  /** Hari pasaran ngawur. */
  weton: string;
  text: string;
  lucky: string;
  /** Kata dari halaman yang dipakai (kosong bila halaman tanpa tulisan). */
  words: string[];
}

/**
 * Ramalan konyol dari kosakata halaman hari ini. `texts` tidak pernah
 * meninggalkan perangkat; hasilnya sama untuk `seed` yang sama.
 */
export function primbon(texts: string[], seed: string): Primbon {
  const counts = new Map<string, number>();
  for (const t of texts) for (const w of contentWords(t)) if (w.length >= 4 && w.length <= 14) counts.set(w, (counts.get(w) ?? 0) + 1);
  // Kata yang lebih panjang biasanya kata benda yang lebih lucu untuk diramal.
  const ranked = [...counts.entries()].sort((x, y) => y[1] - x[1] || y[0].length - x[0].length || x[0].localeCompare(y[0])).map(([w]) => w);
  const long = ranked.filter((w) => w.length >= 6);
  const own = shuffled((long.length >= 2 ? long : ranked).slice(0, 8), seed);
  const spare = shuffled(FALLBACK, `${seed}:f`);
  const a = own[0] ?? spare[0]!;
  const b = own[1] ?? spare.find((w) => w !== a)!;
  const h = hash(seed);
  return {
    weton: WETON[h % WETON.length]!,
    text: TEMPLATES[(h >>> 3) % TEMPLATES.length]!(a, b),
    lucky: LUCKY[(h >>> 7) % LUCKY.length]!,
    words: own.slice(0, 2),
  };
}
