/**
 * Hidup Orang Lain: permainan menulis. Satu orang menulis apa yang terjadi,
 * orang lain menulis apa yang ia kira terjadi; tiap bagian meninggalkan satu
 * jejak untuk penulis berikutnya. Berkas ini murni isi dan aturan giliran:
 * premis, kartu role Awal, dan siapa menulis tokoh mana di putaran mana.
 * Teks cerita sendiri terenkripsi dan tidak pernah dibaca server.
 */

/** Jumlah putaran cerpen; novella dan novel lebih panjang (lihat STORY_FORMATS). */
export const STORY_ROUNDS = 3;
export const STORY_MAX_WRITERS = 5;
/** Panduan panjang per bagian (kata); bukan batas keras. */
export const STORY_WORDS = { min: 50, max: 180 } as const;

import { STORY_DECK } from './ceritaDek';

export type RoleKind = 'adegan' | 'jejak' | 'prompt' | 'ruang-baca';

export interface StoryRole {
  id: string;
  name: string;
  tier: 'awal' | 'lanjutan';
  kind: RoleKind;
  doodle: string;
  batasan: string;
  keuntungan: string;
  contoh: string;
  latihan: string;
  /** Bahan yang harus sudah ada sebelum kartu ini dibagikan. */
  prasyarat?: string;
}

export type StoryDeck = 'awal' | 'lengkap';
/** Kartu yang boleh diundi: Awal saja, atau seluruh dek kecuali yang butuh prasyarat. */
export const storyDeckIds = (deck: StoryDeck): string[] => STORY_DECK.filter((r) => (deck === 'awal' ? r.tier === 'awal' : !r.prasyarat)).map((r) => r.id);
export const STORY_ROLES: StoryRole[] = STORY_DECK;
export const STORY_ROLE_IDS = STORY_ROLES.map((r) => r.id);
export const storyRole = (id: string | undefined) => STORY_ROLES.find((r) => r.id === id);

/** Satu kartu prompt: posisi tokoh, batas pengetahuannya, dan satu keputusan. */
export interface StorySeat {
  tokoh: string;
  posisi: string;
  tahu: string[];
  belumTahu: string;
  keputusan: string;
}
export interface StoryPremise {
  id: string;
  title: string;
  doodle: string;
  pitch: string;
  /** Fakta pembuka yang disepakati sejak awal; dipakai kalau tidak ada jejak yang sah. */
  fakta: string[];
  /** Tiga putaran; tiap putaran punya waktu dan dua atau tiga kursi tokoh. */
  rounds: { waktu: string; seats: StorySeat[] }[];
}

export const STORY_PREMISES: StoryPremise[] = [
  {
    id: 'kunci',
    title: 'Kunci di Meja',
    doodle: 'kunci',
    pitch: 'Dina meninggalkan kunci rumah di meja dan naik taksi. Lampu teras sempat menyala. Tiga belas tahun kemudian, kunci itu masih ada.',
    fakta: ['Dina meninggalkan kunci rumah di meja.', 'Lampu teras menyala saat taksi berangkat pukul 22.17.'],
    rounds: [
      {
        waktu: 'malam itu, 22.17',
        seats: [
          { tokoh: 'Dina', posisi: 'Kamu Dina, di jok belakang taksi yang baru bergerak.', tahu: ['Kamu meninggalkan kunci di meja.', 'Lampu teras sempat menyala.'], belumTahu: 'Kamu tidak tahu siapa yang menyalakan lampu, atau kenapa.', keputusan: 'Apa yang nyaris kamu minta pada sopir?' },
          { tokoh: 'Bapak', posisi: 'Kamu Bapak, berdiri di ruang depan setelah pintu tertutup.', tahu: ['Ada kunci di meja yang bukan kamu yang menaruh.', 'Kamu baru saja menyalakan lampu teras.'], belumTahu: 'Kamu tidak tahu apakah Dina melihat lampu itu, atau mengartikannya apa.', keputusan: 'Apa yang kamu lakukan pada kunci itu sebelum tidur?' },
          { tokoh: 'Sopir taksi', posisi: 'Kamu sopir taksi, melirik penumpang lewat spion.', tahu: ['Penumpangmu menoleh ke belakang dua kali.', 'Argo baru berjalan.'], belumTahu: 'Kamu tidak tahu rumah siapa itu dan siapa yang ditinggalkan.', keputusan: 'Kamu memperlambat mobil di tikungan pertama, atau tidak?' },
        ],
      },
      {
        waktu: 'seminggu kemudian',
        seats: [
          { tokoh: 'Dina', posisi: 'Kamu Dina, di kamar sewa di kota lain.', tahu: ['Kamu tidak lagi punya kunci rumah.', 'Ada satu panggilan tak terjawab dari nomor rumah.'], belumTahu: 'Kamu tidak tahu apa yang terjadi pada kunci yang kamu tinggalkan.', keputusan: 'Kamu menelepon balik, atau menulis sesuatu yang tidak jadi dikirim?' },
          { tokoh: 'Bapak', posisi: 'Kamu Bapak, pagi hari, rumah lebih sepi dari biasanya.', tahu: ['Kunci itu masih kamu simpan.', 'Belum ada kabar dari Dina.'], belumTahu: 'Kamu tidak tahu apakah Dina berniat kembali.', keputusan: 'Kamu memindahkan kunci itu ke tempat lain, atau membiarkannya terlihat?' },
          { tokoh: 'Tetangga', posisi: 'Kamu tetangga sebelah, menyiram tanaman saat lampu teras rumah itu masih menyala siang hari.', tahu: ['Lampu teras itu tidak dimatikan sejak seminggu lalu.', 'Kamu melihat taksi malam itu.'], belumTahu: 'Kamu tidak tahu apa yang dibicarakan di dalam rumah sebelum taksi datang.', keputusan: 'Kamu mengetuk pintu, atau pura-pura tidak memperhatikan?' },
        ],
      },
      {
        waktu: 'tiga belas tahun kemudian',
        seats: [
          { tokoh: 'Anak Dina', posisi: 'Kamu anak Dina, dua belas tahun, menemukan sesuatu di laci ibumu.', tahu: ['Ibumu menyimpan benda lama yang tidak pernah dipakai.', 'Ibumu tidak pernah bercerita tentang rumah masa kecilnya.'], belumTahu: 'Kamu tidak tahu apakah benda itu disimpan karena sayang, bersalah, atau lupa dibuang.', keputusan: 'Kamu bertanya, atau membawa benda itu diam-diam?' },
          { tokoh: 'Dina', posisi: 'Kamu Dina, tiga belas tahun lebih tua, berdiri di depan pagar yang catnya sudah berganti.', tahu: ['Rumah itu masih ada.', 'Kamu datang tanpa memberi kabar.'], belumTahu: 'Kamu tidak tahu siapa yang sekarang membukakan pintu.', keputusan: 'Kamu menekan bel, atau menunggu lampu teras menyala?' },
          { tokoh: 'Bapak', posisi: 'Kamu Bapak, jauh lebih tua, mendengar mobil berhenti di depan.', tahu: ['Kamu mengenali bunyi langkah di kerikil.', 'Ada satu benda yang kamu simpan selama ini.'], belumTahu: 'Kamu tidak tahu siapa yang datang bersamanya.', keputusan: 'Apa yang kamu bawa ke pintu?' },
        ],
      },
    ],
  },
  {
    id: 'warung',
    title: 'Utang di Buku Warung',
    doodle: 'kopi-susu',
    pitch: 'Di buku utang warung Bu Rahmi ada satu nama yang dicoret lunas, padahal tidak ada yang merasa membayar.',
    fakta: ['Nama Ilham dicoret lunas di buku utang warung.', 'Tulisan coretannya bukan tulisan Bu Rahmi.'],
    rounds: [
      {
        waktu: 'sore itu, menjelang magrib',
        seats: [
          { tokoh: 'Ilham', posisi: 'Kamu Ilham, datang ke warung membawa uang separuh dari utangmu.', tahu: ['Utangmu tiga bulan belum dibayar.', 'Bu Rahmi bilang namamu sudah lunas.'], belumTahu: 'Kamu tidak tahu siapa yang membayar, atau apakah memang ada yang membayar.', keputusan: 'Kamu menyimpan lagi uang itu, atau tetap meletakkannya di toples?' },
          { tokoh: 'Bu Rahmi', posisi: 'Kamu Bu Rahmi, memegang buku utang yang halamannya sudah lecek.', tahu: ['Kamu tidak mencoret nama itu.', 'Laci uang hari itu pas, tidak lebih.'], belumTahu: 'Kamu tidak tahu siapa yang memegang bukumu saat kamu salat.', keputusan: 'Kamu membiarkan coretan itu, atau menulis ulang utangnya?' },
          { tokoh: 'Sekar', posisi: 'Kamu Sekar, anak kos yang sering menjaga warung sebentar.', tahu: ['Kamu memegang buku itu siang tadi.', 'Kamu tahu kenapa Ilham tidak bisa membayar.'], belumTahu: 'Kamu tidak tahu apakah Bu Rahmi mengenali tulisan tanganmu.', keputusan: 'Kamu mengaku, atau membeli sesuatu supaya punya alasan tinggal?' },
        ],
      },
      {
        waktu: 'malam Minggu berikutnya',
        seats: [
          { tokoh: 'Ilham', posisi: 'Kamu Ilham, baru menerima upah pertama dari kerja baru.', tahu: ['Utangmu sudah tidak tercatat.', 'Kamu masih ingat jumlah persisnya.'], belumTahu: 'Kamu tidak tahu kepada siapa sebenarnya kamu berutang sekarang.', keputusan: 'Kamu membayar ke warung, atau mencari orang yang mencoret namamu?' },
          { tokoh: 'Bu Rahmi', posisi: 'Kamu Bu Rahmi, menutup warung lebih lambat dari biasanya.', tahu: ['Sejak coretan itu, dua orang lain datang melunasi utang.', 'Buku utangmu sekarang kamu simpan di bawah timbangan.'], belumTahu: 'Kamu tidak tahu apakah itu kebetulan.', keputusan: 'Kamu menanyakan soal coretan itu pada seseorang, atau memilih tidak tahu?' },
          { tokoh: 'Sekar', posisi: 'Kamu Sekar, sedang mengemasi kamar kos.', tahu: ['Kamu pindah akhir bulan.', 'Ada satu hal yang belum kamu bereskan di warung.'], belumTahu: 'Kamu tidak tahu apakah perbuatanmu menolong atau mempermalukan.', keputusan: 'Apa yang kamu tinggalkan di warung sebelum pergi?' },
        ],
      },
      {
        waktu: 'setahun kemudian',
        seats: [
          { tokoh: 'Ilham', posisi: 'Kamu Ilham, kembali ke gang itu dengan motor yang bukan pinjaman.', tahu: ['Warung itu masih buka.', 'Kamu membawa sesuatu untuk seseorang.'], belumTahu: 'Kamu tidak tahu apakah orang yang kamu cari masih tinggal di sana.', keputusan: 'Kamu masuk sebagai pembeli, atau sebagai orang yang berutang?' },
          { tokoh: 'Bu Rahmi', posisi: 'Kamu Bu Rahmi, membuka halaman pertama buku utang yang baru.', tahu: ['Buku lama kamu simpan, tidak dibuang.', 'Ada satu halaman yang sering kamu buka lagi.'], belumTahu: 'Kamu tidak tahu apa yang ingin kamu katakan kalau orang itu datang.', keputusan: 'Nama siapa yang kamu tulis pertama di buku baru?' },
          { tokoh: 'Sekar', posisi: 'Kamu Sekar, menerima kiriman dari alamat gang lamamu.', tahu: ['Kamu tidak memberi alamat barumu pada siapa pun di sana, kecuali satu orang.', 'Paketnya ringan.'], belumTahu: 'Kamu tidak tahu apakah ini ucapan terima kasih atau pengembalian.', keputusan: 'Kamu membukanya sekarang, atau menelepon dulu?' },
        ],
      },
    ],
  },
  {
    id: 'kursi',
    title: 'Kursi Kosong di Resepsi',
    doodle: 'kursi',
    pitch: 'Di meja keluarga ada satu kursi dengan nama yang tidak datang. Semua orang punya dugaan sendiri kenapa.',
    fakta: ['Kursi bernama Mas Bayu kosong sepanjang resepsi.', 'Kadonya sudah sampai sejak pagi, tanpa kartu.'],
    rounds: [
      {
        waktu: 'siang, saat acara potong tumpeng',
        seats: [
          { tokoh: 'Laras', posisi: 'Kamu Laras, pengantin, melirik meja keluarga dari pelaminan.', tahu: ['Kursi kakakmu kosong.', 'Kadonya sampai pagi tadi.'], belumTahu: 'Kamu tidak tahu apakah ia tidak mau datang, atau tidak bisa.', keputusan: 'Kamu meminta kursi itu diangkat, atau dibiarkan?' },
          { tokoh: 'Mas Bayu', posisi: 'Kamu Bayu, di parkiran gedung, mesin mobil masih menyala.', tahu: ['Kamu sudah sampai sejak satu jam lalu.', 'Kado itu kamu antar sendiri pagi tadi.'], belumTahu: 'Kamu tidak tahu apakah namamu masih ada di meja.', keputusan: 'Kamu mematikan mesin, atau memundurkan mobil?' },
          { tokoh: 'Ibu', posisi: 'Kamu Ibu, duduk di sebelah kursi kosong itu.', tahu: ['Kamu yang menulis nama Bayu di kartu kursi.', 'Semalam ia sempat menelepon dan kamu tidak mengangkat.'], belumTahu: 'Kamu tidak tahu apa yang ingin ia katakan.', keputusan: 'Apa yang kamu taruh di kursi itu supaya tidak terlihat kosong?' },
        ],
      },
      {
        waktu: 'malamnya, setelah tamu pulang',
        seats: [
          { tokoh: 'Laras', posisi: 'Kamu Laras, membuka kado-kado di kamar hotel.', tahu: ['Satu kado tidak berkartu.', 'Bungkusnya kamu kenali.'], belumTahu: 'Kamu tidak tahu apakah isinya permintaan maaf atau pamit.', keputusan: 'Kamu membukanya malam ini, atau menyimpannya tertutup?' },
          { tokoh: 'Mas Bayu', posisi: 'Kamu Bayu, di warung kopi seberang gedung, melihat lampu aula dipadamkan.', tahu: ['Kamu tidak masuk.', 'Seseorang dari keluarga sempat keluar ke parkiran.'], belumTahu: 'Kamu tidak tahu apakah orang itu melihatmu.', keputusan: 'Kamu mengirim satu pesan, atau menunggu sampai ditanya?' },
          { tokoh: 'Ibu', posisi: 'Kamu Ibu, melipat taplak bersama orang katering.', tahu: ['Kartu nama Bayu kamu simpan di tas.', 'Ada satu pesan suara yang belum kamu dengar.'], belumTahu: 'Kamu tidak tahu apakah Laras melihat sesuatu dari pelaminan.', keputusan: 'Kamu mendengarkan pesan itu sendirian, atau memberikannya pada Laras?' },
        ],
      },
      {
        waktu: 'lebaran pertama setelah itu',
        seats: [
          { tokoh: 'Laras', posisi: 'Kamu Laras, menata kursi di meja makan Ibu.', tahu: ['Ibu memintamu menambah satu kursi.', 'Kamu tahu isi kado itu sekarang.'], belumTahu: 'Kamu tidak tahu apakah kursi itu akan terisi.', keputusan: 'Kamu menaruh kursi itu di sebelahmu, atau di seberangmu?' },
          { tokoh: 'Mas Bayu', posisi: 'Kamu Bayu, berdiri di depan rumah Ibu dengan satu tas.', tahu: ['Pintu depan tidak dikunci, seperti biasa.', 'Kamu mendengar suara Laras di dalam.'], belumTahu: 'Kamu tidak tahu apakah kado itu pernah dibuka.', keputusan: 'Apa kalimat pertama yang kamu ucapkan?' },
          { tokoh: 'Ibu', posisi: 'Kamu Ibu, di dapur, mendengar pintu depan dibuka.', tahu: ['Kartu nama dari resepsi masih kamu simpan.', 'Kamu memasak satu lauk yang hanya disukai satu orang.'], belumTahu: 'Kamu tidak tahu siapa yang akan bicara lebih dulu.', keputusan: 'Kamu keluar dari dapur, atau menunggu dipanggil?' },
        ],
      },
    ],
  },
];
export const storyPremise = (id: string) => STORY_PREMISES.find((p) => p.id === id);

/**
 * Kursi tokoh penulis ke-`i` dari `n` penulis di putaran `round` (1..3).
 * Kursi pertama dan kedua adalah dua tokoh utama. Bertiga ke atas urutannya
 * bergeser tiap gelombang; berdua, tokoh berganti tangan di gelombang terakhir.
 */
export function storySeat(premise: StoryPremise, round: number, i: number, n: number): StorySeat {
  const seats = premise.rounds[round - 1]!.seats;
  const k = Math.min(seats.length, Math.max(2, n));
  // Berdua (atau sendiri): tokoh dipegang sampai gelombang terakhir, baru berganti tangan,
  // supaya jejak untuk tokoh pasangan benar-benar sampai ke pasangan. Bertiga ke atas: bergilir.
  const shift = n <= 2 ? (round >= premise.rounds.length ? 1 : 0) : round - 1;
  return seats[(i + shift) % k]!;
}

/** Jejak siapa yang diterima penulis ke-`i`: orang sebelum dia (sendirian: dirinya sendiri). */
export function storyGiver(members: string[], i: number): string {
  return members[(i - 1 + members.length) % members.length]!;
}

/** Undi role berbeda untuk tiap penulis; `rand` mengembalikan angka 0..1. */
export function drawStoryRoles(members: string[], deck: StoryDeck = 'awal', rand: () => number = Math.random): Record<string, string> {
  const pool = storyDeckIds(deck);
  const out: Record<string, string> = {};
  for (const m of members) out[m] = pool.splice(Math.floor(rand() * pool.length), 1)[0]!;
  return out;
}

/** Tiga ukuran karya: jumlah gelombang, dan berapa gelombang dalam satu babak. */
export const STORY_FORMATS = {
  cerpen: { name: 'cerpen', rounds: 3, babak: 3, hint: 'tiga putaran, bisa selesai sekali duduk' },
  novella: { name: 'novella', rounds: 6, babak: 3, hint: 'enam gelombang dalam dua babak' },
  novel: { name: 'novel', rounds: 12, babak: 4, hint: 'dua belas gelombang dalam tiga babak' },
} as const;
export type StoryFormat = keyof typeof STORY_FORMATS;
export const storyFormat = (rounds: number): StoryFormat => (rounds <= 3 ? 'cerpen' : rounds <= 6 ? 'novella' : 'novel');
/** Babak ke berapa (mulai 0) sebuah gelombang berada. */
export const storyBabak = (rounds: number, round: number) => Math.floor((round - 1) / STORY_FORMATS[storyFormat(rounds)].babak);

/** Premis buatan sendiri: judul, fakta pembuka, dan tokoh-tokohnya (dienkripsi). */
export interface StoryMeta {
  v: 1;
  title: string;
  pitch: string;
  fakta: string[];
  tokoh: string[];
}
export const STORY_FREE = 'bebas';

/** Tawarkan dua kartu berbeda kepada tiap penulis (mode pilih); kartu pertama jadi bawaan. */
export function drawStoryOffers(members: string[], deck: StoryDeck = 'awal', rand: () => number = Math.random): Record<string, string[]> {
  const pool = storyDeckIds(deck);
  const out: Record<string, string[]> = {};
  for (const m of members) {
    const a = pool.splice(Math.floor(rand() * pool.length), 1)[0]!;
    const b = pool.length ? pool.splice(Math.floor(rand() * pool.length), 1)[0]! : a;
    out[m] = [a, b];
  }
  return out;
}

/** Lensa gelombang ini: penulis yang memilih fokus, bergilir. */
export const storyLens = (members: string[], round: number) => members[(round - 1) % members.length]!;
/** Giliran buta (tilt): di tengah karya, fokus Lensa wajib memengaruhi keputusan tokoh. */
export const storyTilt = (rounds: number) => (rounds <= 3 ? 2 : Math.ceil(rounds / 2) + 1);

/** Kalimat serah-terima, jejak, dan opsi: yang boleh dilihat lebih dulu daripada adegan. */
export interface StoryHandoffPayload {
  v: 1;
  tokoh: string;
  waktu?: string;
  /** Satu kalimat dari adegan yang tampil di lipatan. */
  line: string;
  /** Satu jejak: potongan teks yang diteruskan, siapa yang bisa tahu, dan pertanyaan untuk penerimanya. */
  trace?: { what: string; knows: string[]; question: string };
  /** Keuntungan role jenis Prompt: satu opsi tambahan untuk tokoh tertentu di gelombang berikutnya. */
  option?: { to: string; text: string };
  /** Baris yang membuktikan batasan role dimainkan. */
  proof?: string;
}

/** Fakta yang diusulkan lewat handshake. Tokoh disebut dengan namanya di cerita. */
export interface StoryFactPayload {
  v: 1;
  sentence: string;
  scope: 'lokal' | 'dunia';
  waktu?: string;
  knows: string[];
  believes: string[];
  mystery?: boolean;
}

export interface StoryReadPayload {
  v: 1;
  /** Kalimat yang membentuk tafsir pembaca, dikutip persis. */
  quote?: string;
  text: string;
  /** Mode kejutan: tebakan id kartu role penulis bagian ini. */
  role?: string;
}

/** Palet: yang ingin ada, garis (tidak muncul sama sekali), tirai (terjadi di luar layar). */
export interface StoryPalettePayload {
  v: 1;
  boleh: string[];
  garis: string[];
  tirai: string[];
}

export interface StoryFocusPayload {
  v: 1;
  text: string;
}

/** Pecah teks menjadi kalimat (untuk memilih kalimat serah-terima dan menandai tafsir). */
export function storySentences(text: string): string[] {
  return (text.replace(/\s+/g, ' ').trim().match(/[^.!?…]+(?:[.!?…]+["”’)]*|$)/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Isi satu bagian sebelum dienkripsi. */
export interface StoryPartPayload {
  v: 1;
  text: string;
  /** Satu jejak yang bersedia diteruskan: benda, keputusan, atau kalimat. */
  trace?: { what: string; knownBy: string; question: string };
  /** Baris yang menunjukkan cara batasan role dimainkan. */
  proof?: string;
  /** Gelombang bebas: tokoh dan waktu dipilih penulisnya sendiri. */
  seat?: { tokoh: string; waktu: string };
}
