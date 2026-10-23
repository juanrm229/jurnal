// Bank ide janji temu untuk tombol "bingung mau ke mana?". Satu kocokan memberi
// satu tempat, satu kegiatan, satu makanan, satu misi kecil, satu pertanyaan,
// dan satu aturan berpakaian. Cocok untuk pasangan maupun rombongan teman, dan
// sengaja tidak menyebut nama usaha tertentu supaya berlaku di kota mana pun.
//
// Batas: teks maks ~90 karakter. id stabil: jangan diubah setelah rilis.
// Penandaan dana/suasana/waktu harus jujur, karena dipakai untuk menyaring.

import type { ContentDoodle } from './doodleIds';

export type DateBudget = 'hemat' | 'sedang' | 'royal';
export type DateVibe = 'santai' | 'romantis' | 'petualang' | 'kreatif' | 'nostalgia' | 'produktif';
export type DateTime = 'pagi' | 'siang' | 'sore' | 'malam';
/** `dalam` = di dalam ruangan, `luar` = di luar ruangan. Kosong = bisa dua-duanya. */
export type DateSetting = 'dalam' | 'luar';
/** `duo` = lebih pas berdua, `grup` = lebih seru ramai-ramai. Kosong = `semua`. */
export type DateFit = 'duo' | 'grup' | 'semua';

export interface DateIdea {
  id: string;
  text: string;
  doodle?: ContentDoodle;
  budget: DateBudget[];
  vibe: DateVibe[];
  time: DateTime[];
  setting?: DateSetting;
  fit?: DateFit;
}

export const DATE_VIBE_LABEL: Record<DateVibe, string> = {
  santai: 'santai',
  romantis: 'manis',
  petualang: 'petualang',
  kreatif: 'kreatif',
  nostalgia: 'nostalgia',
  produktif: 'sambil beres-beres hidup',
};

export const DATE_BUDGET_LABEL: Record<DateBudget, string> = {
  hemat: 'hemat (≤50rb)',
  sedang: 'sedang (50–200rb)',
  royal: 'royal (lagi gajian)',
};

export const DATE_TIME_LABEL: Record<DateTime, string> = {
  pagi: 'pagi',
  siang: 'siang',
  sore: 'sore',
  malam: 'malam',
};

// ─────────────────────────────── Singkatan ───────────────────────────────

const H: DateBudget[] = ['hemat'];
const HS: DateBudget[] = ['hemat', 'sedang'];
const S: DateBudget[] = ['sedang'];
const SR: DateBudget[] = ['sedang', 'royal'];
const R: DateBudget[] = ['royal'];
const SEMUA_DANA: DateBudget[] = ['hemat', 'sedang', 'royal'];
const SEMUA_WAKTU: DateTime[] = ['pagi', 'siang', 'sore', 'malam'];

type Extra = Pick<DateIdea, 'doodle' | 'setting' | 'fit'>;

const mk =
  (prefix: string) =>
  (slug: string, text: string, budget: DateBudget[], vibe: DateVibe[], time: DateTime[], extra: Extra = {}): DateIdea => ({
    id: `${prefix}-${slug}`,
    text,
    budget,
    vibe,
    time,
    ...extra,
  });

/** Untuk misi, pertanyaan, dan aturan baju: berlaku di dana dan waktu apa pun kecuali disebut. */
const mkAny =
  (prefix: string) =>
  (slug: string, text: string, vibe: DateVibe[], extra: Extra & { budget?: DateBudget[]; time?: DateTime[] } = {}): DateIdea => {
    const { budget = SEMUA_DANA, time = SEMUA_WAKTU, ...rest } = extra;
    return { id: `${prefix}-${slug}`, text, budget, vibe, time, ...rest };
  };

// ─────────────────────────────── Tempat ───────────────────────────────

const t = mk('tempat');

export const DATE_PLACES: DateIdea[] = [
  t('pasar-malam', 'pasar malam dekat alun-alun', H, ['santai', 'nostalgia'], ['malam'], { setting: 'luar', doodle: 'lentera' }),
  t('cfd', 'car free day di jalan protokol kota', H, ['petualang', 'santai'], ['pagi'], { setting: 'luar', doodle: 'sepeda' }),
  t('angkringan', 'angkringan pinggir jalan yang lampunya remang-remang', H, ['santai', 'nostalgia'], ['malam'], { setting: 'luar', doodle: 'lampu' }),
  t('taman-kota', 'taman kota yang ada kolam atau air mancurnya', H, ['santai', 'romantis'], ['pagi', 'sore'], { setting: 'luar', doodle: 'pohon-kecil' }),
  t('kios-buku-bekas', 'deretan kios buku bekas yang penjualnya hafal semua judul', H, ['kreatif', 'nostalgia'], ['siang', 'sore'], { setting: 'dalam', doodle: 'buku' }),
  t('museum-kota', 'museum kota yang terakhir kalian datangi waktu karyawisata sekolah', H, ['nostalgia', 'produktif'], ['pagi', 'siang'], { setting: 'dalam', doodle: 'tiket' }),
  t('rooftop-parkiran', 'rooftop parkiran mall saat lampu kota mulai menyala', H, ['romantis', 'santai'], ['sore', 'malam'], { setting: 'luar', doodle: 'bintang' }),
  t('warung-tenda', 'warung tenda pinggir jalan yang antreannya paling panjang', H, ['santai', 'petualang'], ['malam'], { setting: 'luar', doodle: 'lampu' }),
  t('kafe-di-gang', 'kafe kecil di gang yang belum pernah kalian lewati', S, ['santai', 'kreatif'], ['siang', 'sore'], { setting: 'dalam', doodle: 'cangkir' }),
  t('perpustakaan-daerah', 'perpustakaan daerah, di lantai yang paling sepi', H, ['produktif', 'santai'], ['pagi', 'siang'], { setting: 'dalam', doodle: 'rak-buku' }),
  t('gardu-pandang', 'bukit atau gardu pandang di pinggir kota', HS, ['petualang', 'romantis'], ['pagi', 'sore'], { setting: 'luar', doodle: 'senja' }),
  t('pantai-danau', 'pantai, danau, atau waduk terdekat dari rumah', HS, ['petualang', 'santai'], ['pagi', 'sore'], { setting: 'luar', doodle: 'kerang' }),
  t('stasiun-lama', 'stasiun kereta lama, lalu naik kereta lokal dua-tiga stasiun', H, ['petualang', 'nostalgia'], ['pagi', 'siang'], { setting: 'luar', doodle: 'tiket' }),
  t('kos-bertikar', 'kos atau rumah salah satu, lantai beralas tikar', H, ['santai'], ['siang', 'sore', 'malam'], { setting: 'dalam', doodle: 'rumah' }),
  t('teras-hujan', 'teras rumah waktu hujan turun deras', H, ['romantis', 'santai'], ['sore', 'malam'], { setting: 'luar', doodle: 'hujan' }),
  t('bioskop-tengah-malam', 'bioskop, jam tayang paling malam', S, ['santai', 'romantis'], ['malam'], { setting: 'dalam', doodle: 'tiket' }),
  t('bilik-karaoke', 'bilik karaoke yang disewa per jam', S, ['santai', 'kreatif'], ['sore', 'malam'], { setting: 'dalam', fit: 'grup', doodle: 'gitar' }),
  t('hutan-kota', 'kebun raya atau hutan kota', HS, ['santai', 'petualang'], ['pagi', 'siang'], { setting: 'luar', doodle: 'daun-kering' }),
  t('pematang-sawah', 'jalan setapak di pinggir sawah', H, ['santai', 'nostalgia'], ['pagi', 'sore'], { setting: 'luar', doodle: 'rumput' }),
  t('pasar-pagi', 'pasar tradisional pagi-pagi, waktu sayurnya masih basah', H, ['petualang', 'produktif'], ['pagi'], { setting: 'luar', doodle: 'labu' }),
  t('pameran-gratis', 'galeri seni atau pameran tugas akhir kampus yang gratis', H, ['kreatif'], ['siang', 'sore'], { setting: 'dalam', doodle: 'pena' }),
  t('kebun-binatang', 'kebun binatang kota', HS, ['nostalgia', 'petualang'], ['pagi', 'siang'], { setting: 'luar', doodle: 'kupu-kupu' }),
  t('kolam-renang-umum', 'kolam renang umum yang ramai anak-anak', H, ['petualang', 'nostalgia'], ['pagi', 'siang'], { setting: 'luar' }),
  t('arena-permainan', 'arena permainan di mall, isi kartu secukupnya saja', S, ['nostalgia', 'santai'], ['siang', 'sore', 'malam'], { setting: 'dalam', doodle: 'dadu' }),
  t('restoran-rooftop', 'restoran rooftop dengan pemandangan kota', R, ['romantis'], ['malam'], { setting: 'luar', fit: 'duo', doodle: 'bintang' }),
  t('hotel-kota-sendiri', 'kamar hotel di kota sendiri, pura-pura jadi turis', R, ['romantis', 'santai'], ['malam'], { setting: 'dalam', doodle: 'kunci' }),
  t('vila-patungan', 'vila sewaan di dataran tinggi, patungan ramai-ramai', SR, ['santai', 'petualang'], ['malam'], { setting: 'dalam', fit: 'grup', doodle: 'kabut' }),
  t('kedai-kopi-larut', 'kedai kopi susu yang buka sampai lewat tengah malam', HS, ['santai'], ['sore', 'malam'], { setting: 'dalam', doodle: 'cangkir' }),
  t('alun-alun-malming', 'alun-alun pada malam Minggu', H, ['santai', 'nostalgia'], ['malam'], { setting: 'luar', doodle: 'lampu' }),
  t('jembatan-senja', 'jembatan yang paling bagus dilihat waktu senja', H, ['romantis'], ['sore'], { setting: 'luar', doodle: 'senja' }),
  t('dermaga', 'dermaga atau pelabuhan kecil, menonton kapal datang', H, ['romantis', 'petualang'], ['pagi', 'sore'], { setting: 'luar', doodle: 'surat-botol' }),
  t('studio-keramik', 'studio keramik atau kelas melukis yang bisa sekali datang', SR, ['kreatif'], ['siang', 'sore'], { setting: 'dalam', doodle: 'pena' }),
  t('penjual-tanaman', 'deretan penjual tanaman hias di pinggir jalan', H, ['santai', 'kreatif'], ['pagi', 'siang'], { setting: 'luar', doodle: 'kaktus' }),
  t('lapangan-sewaan', 'lapangan bulu tangkis atau futsal sewaan per jam', HS, ['petualang'], ['sore', 'malam'], { setting: 'dalam', fit: 'grup' }),
  t('jalur-sepeda', 'jalur sepeda keliling kota', H, ['petualang'], ['pagi', 'sore'], { setting: 'luar', doodle: 'sepeda' }),
  t('bazar-buku', 'pameran buku atau bazar yang sedang ada di kota', HS, ['kreatif', 'santai'], ['siang', 'sore'], { setting: 'dalam', doodle: 'buku' }),
  t('sekolah-lama', 'depan sekolah atau kampus lama salah satu dari kalian', H, ['nostalgia'], ['sore'], { setting: 'luar', doodle: 'amplop' }),
  t('food-court-atas', 'food court di lantai paling atas mall', HS, ['santai'], ['siang', 'malam'], { setting: 'dalam' }),
  t('planetarium', 'planetarium atau observatorium kota', HS, ['petualang', 'romantis'], ['siang', 'malam'], { setting: 'dalam', doodle: 'bintang' }),
  t('air-terjun', 'air terjun yang perlu jalan kaki sedikit', HS, ['petualang'], ['pagi', 'siang'], { setting: 'luar', doodle: 'pelangi' }),
  t('kebun-petik', 'kebun petik stroberi atau jeruk', S, ['petualang', 'santai'], ['pagi'], { setting: 'luar', doodle: 'stroberi' }),
  t('dapur-sendiri', 'dapur salah satu dari kalian', H, ['kreatif', 'produktif'], ['siang', 'sore', 'malam'], { setting: 'dalam', doodle: 'labu' }),
  t('depan-minimarket', 'kursi depan minimarket yang buka dua puluh empat jam', H, ['santai'], ['malam'], { setting: 'luar', doodle: 'lampu' }),
  t('laundry-koin', 'binatu koin, menunggu cucian berputar sambil ngobrol', H, ['santai', 'produktif'], ['sore', 'malam'], { setting: 'dalam' }),
  t('kota-tua', 'kawasan kota tua dengan gedung-gedung zaman dulu', H, ['nostalgia', 'petualang'], ['pagi', 'sore'], { setting: 'luar', doodle: 'kamera' }),
  t('kampung-mural', 'kampung warna-warni atau gang yang penuh mural', H, ['kreatif', 'petualang'], ['pagi', 'sore'], { setting: 'luar', doodle: 'pelangi' }),
  t('pijat-refleksi', 'tempat pijat refleksi, satu jam duduk berdampingan', S, ['santai'], ['sore', 'malam'], { setting: 'dalam', doodle: 'lavender' }),
  t('restoran-kemahalan', 'restoran yang biasanya kalian lewati karena merasa kemahalan', R, ['romantis'], ['malam'], { setting: 'dalam', doodle: 'lilin' }),
  t('lapangan-layangan', 'lapangan kosong yang ramai orang main layangan', H, ['nostalgia', 'petualang'], ['sore'], { setting: 'luar', doodle: 'awan' }),
  t('pasar-loak', 'pasar loak atau toko barang bekas', H, ['nostalgia', 'kreatif'], ['pagi', 'siang'], { setting: 'luar', doodle: 'jam-pasir' }),
  t('kebun-teh', 'kebun teh atau jalan berkabut di pegunungan', S, ['romantis', 'petualang'], ['pagi'], { setting: 'luar', doodle: 'kabut' }),
  t('taman-hiburan', 'taman hiburan yang punya bianglala', SR, ['romantis', 'nostalgia'], ['sore', 'malam'], { setting: 'luar' }),
  t('kedai-es-krim-lawas', 'kedai es krim lawas yang resepnya belum berubah dari dulu', HS, ['nostalgia'], ['siang', 'sore'], { setting: 'dalam', doodle: 'ceri' }),
  t('toko-perabot', 'toko perabot besar, pura-pura menata rumah impian', H, ['santai', 'kreatif'], ['siang', 'malam'], { setting: 'dalam', fit: 'duo', doodle: 'rumah' }),
  t('ruang-teka-teki', 'ruang teka-teki (escape room) yang harus dipecahkan bersama', SR, ['petualang', 'kreatif'], ['siang', 'malam'], { setting: 'dalam', fit: 'grup', doodle: 'kunci' }),
  t('pagar-bandara', 'pagar ujung landasan bandara, menonton pesawat lepas landas', H, ['romantis', 'santai'], ['sore', 'malam'], { setting: 'luar', doodle: 'awan' }),
  t('bumi-perkemahan', 'bumi perkemahan dengan tenda sewaan', S, ['petualang'], ['malam'], { setting: 'luar', fit: 'grup', doodle: 'bulan' }),
  t('kolam-hotel', 'kolam renang hotel yang menerima tamu harian', SR, ['santai'], ['pagi', 'siang'], { setting: 'luar' }),
  t('kafe-ramah-laptop', 'kafe yang ramah laptop, untuk kerja bareng', S, ['produktif'], ['pagi', 'siang'], { setting: 'dalam', doodle: 'pena' }),
];

// ─────────────────────────────── Kegiatan ───────────────────────────────

const a = mk('aksi');

export const DATE_ACTIVITIES: DateIdea[] = [
  a('buku-dua-puluh-ribu', 'saling memilihkan buku seharga di bawah dua puluh ribu', H, ['kreatif', 'nostalgia'], ['siang', 'sore'], { doodle: 'buku' }),
  a('motoran-tanpa-tujuan', 'motoran tanpa tujuan, belok kiri-kanan bergantian', H, ['petualang'], ['sore', 'malam'], { setting: 'luar', doodle: 'peta' }),
  a('masak-isi-kulkas', 'masak bareng hanya dari isi kulkas yang ada', H, ['kreatif', 'produktif'], ['siang', 'sore', 'malam'], { setting: 'dalam' }),
  a('jatah-dua-puluh-foto', 'satu kamera, jatah dua puluh foto saja untuk seharian', HS, ['kreatif', 'nostalgia'], SEMUA_WAKTU, { doodle: 'kamera' }),
  a('surat-setahun-lagi', 'menulis surat untuk dibuka setahun lagi, lalu disegel', H, ['romantis', 'nostalgia'], ['sore', 'malam'], { doodle: 'segel-lilin' }),
  a('film-masa-kecil', 'nonton ulang film kesukaan waktu kecil', H, ['nostalgia', 'santai'], ['malam'], { setting: 'dalam' }),
  a('piknik-tikar', 'piknik pakai tikar dan nasi bungkus', H, ['santai', 'romantis'], ['pagi', 'sore'], { setting: 'luar' }),
  a('berburu-sarapan', 'jalan kaki pagi sambil mencari sarapan yang belum pernah dicoba', H, ['petualang'], ['pagi'], { setting: 'luar', doodle: 'matahari' }),
  a('main-kartu', 'main kartu remi atau uno, yang kalah traktir es teh', H, ['santai'], ['siang', 'sore', 'malam'], { doodle: 'kartu' }),
  a('karaoke-lagu-sma', 'karaoke khusus lagu yang hits waktu kalian SMA', S, ['nostalgia'], ['sore', 'malam'], { setting: 'dalam', doodle: 'gitar' }),
  a('lukis-tas-kain', 'melukis tas kain atau kaus polos untuk satu sama lain', HS, ['kreatif'], ['siang', 'sore'], { setting: 'dalam', doodle: 'pena' }),
  a('menanam-pot', 'menanam satu pot tanaman bersama, lalu memberinya nama', H, ['kreatif', 'romantis'], ['pagi', 'sore'], { doodle: 'tunas' }),
  a('kerja-pomodoro', 'kerja bareng dua jam, istirahat lima menit tiap dua puluh lima menit', H, ['produktif'], ['pagi', 'siang'], { setting: 'dalam', doodle: 'jam-pasir' }),
  a('beres-kamar', 'beres-beres kamar salah satu sambil putar lagu keras-keras', H, ['produktif'], ['siang', 'sore'], { setting: 'dalam' }),
  a('tur-tiga-warung', 'tur kuliner kecil: tiga warung, satu menu di tiap warung', HS, ['petualang'], ['sore', 'malam'], { setting: 'luar' }),
  a('angkot-ujung', 'naik angkot atau bus kota sampai halte terakhir', H, ['petualang'], ['pagi', 'siang'], { setting: 'luar', doodle: 'tiket' }),
  a('sewa-sepeda', 'sewa sepeda dan berkeliling sampai capek', H, ['petualang'], ['pagi', 'sore'], { setting: 'luar', doodle: 'sepeda' }),
  a('tebak-rasi', 'tiduran di tikar dan menebak-nebak rasi bintang', H, ['romantis'], ['malam'], { setting: 'luar', doodle: 'bintang' }),
  a('lagu-konyol', 'mengarang lagu konyol tentang hari ini, lengkap dengan reff', H, ['kreatif'], SEMUA_WAKTU, { doodle: 'gitar' }),
  a('thrift-dandani', 'berburu baju bekas, tiga puluh ribu per orang untuk mendandani yang lain', H, ['kreatif', 'petualang'], ['siang', 'sore'], { doodle: 'kado' }),
  a('puzzle-seribu', 'menyusun puzzle seribu keping sampai selesai atau menyerah', HS, ['santai', 'produktif'], ['siang', 'malam'], { setting: 'dalam' }),
  a('kelas-sekali-datang', 'ikut kelas sekali datang: merangkai bunga, membatik, atau membuat lilin', SR, ['kreatif'], ['siang', 'sore'], { setting: 'dalam', doodle: 'lilin' }),
  a('maraton-serial', 'maraton satu musim serial yang sama-sama belum ditonton', H, ['santai'], ['malam'], { setting: 'dalam' }),
  a('album-foto-lama', 'membongkar album foto lama dan saling bercerita', H, ['nostalgia'], ['sore', 'malam'], { setting: 'dalam', doodle: 'kamera' }),
  a('lari-pelan', 'lari pagi pelan, berhenti di tiap penjual yang menarik', H, ['petualang', 'produktif'], ['pagi'], { setting: 'luar' }),
  a('nobar-warkop', 'nonton bareng pertandingan di warung kopi', H, ['santai'], ['malam'], { fit: 'grup' }),
  a('resep-nenek', 'belajar satu resep keluarga lewat telepon dengan ibu atau nenek', H, ['nostalgia', 'kreatif'], ['siang', 'sore'], { setting: 'dalam' }),
  a('tukar-daftar-putar', 'saling membuat daftar putar dua puluh lagu, didengar di perjalanan', H, ['romantis', 'kreatif'], SEMUA_WAKTU),
  a('berburu-senja', 'berburu senja dari tempat tertinggi yang bisa dicapai', H, ['romantis'], ['sore'], { setting: 'luar', doodle: 'senja' }),
  a('gambar-buta', 'menggambar wajah satu sama lain dalam dua menit tanpa melihat kertas', H, ['kreatif'], SEMUA_WAKTU, { doodle: 'pena' }),
  a('satu-payung', 'jalan-jalan waktu gerimis, berbagi satu payung', H, ['romantis'], ['sore', 'malam'], { setting: 'luar', fit: 'duo', doodle: 'payung' }),
  a('kafe-board-game', 'main board game di kafe yang menyewakannya', S, ['santai', 'kreatif'], ['sore', 'malam'], { setting: 'dalam', doodle: 'dadu' }),
  a('turis-kota-sendiri', 'jadi turis di kota sendiri dengan rute jalan kaki buatan sendiri', H, ['petualang'], ['pagi', 'siang'], { setting: 'luar', doodle: 'peta' }),
  a('zine-selembar', 'membuat zine delapan halaman tentang kalian dari selembar kertas', H, ['kreatif'], ['siang', 'malam'], { setting: 'dalam', doodle: 'pena' }),
  a('kolam-pancing', 'mancing di kolam pemancingan; ikan pertama bebas cuci piring', HS, ['santai', 'petualang'], ['pagi', 'siang'], { setting: 'luar' }),
  a('jadi-relawan', 'jadi relawan setengah hari: bersih-bersih pantai, taman, atau bank makanan', H, ['produktif'], ['pagi'], { setting: 'luar', doodle: 'penyiram' }),
  a('rencana-liburan', 'merencanakan liburan impian lengkap dengan anggaran, walau belum tentu jadi', H, ['produktif', 'romantis'], ['malam'], { doodle: 'peta' }),
  a('bikin-layangan', 'membuat dan menerbangkan layangan sendiri', H, ['nostalgia', 'kreatif'], ['sore'], { setting: 'luar', doodle: 'awan' }),
  a('kuis-tentang-kita', 'bikin kuis sepuluh soal tentang satu sama lain; yang kalah memijat bahu', H, ['santai', 'romantis'], SEMUA_WAKTU),
  a('pasar-lima-puluh', 'belanja di pasar dengan lima puluh ribu, lalu masak dari situ', H, ['produktif', 'petualang'], ['pagi'], { doodle: 'labu' }),
  a('kemah-ruang-tamu', 'kemah di ruang tamu: selimut, senter, dan cerita seram', H, ['nostalgia', 'santai'], ['malam'], { setting: 'dalam', doodle: 'lentera' }),
  a('pertunjukan-lokal', 'nonton teater kampus, komedi tunggal, atau band lokal', S, ['kreatif'], ['malam'], { setting: 'dalam', doodle: 'tiket' }),
  a('adu-foto-ponsel', 'adu foto ponsel dengan satu tema, juri: orang pertama yang lewat', H, ['kreatif'], ['pagi', 'sore'], { doodle: 'kamera' }),
  a('tanpa-ponsel', 'setengah hari tanpa ponsel, semua dimasukkan ke satu tas', H, ['santai', 'romantis'], SEMUA_WAKTU),
  a('kisah-benda-museum', 'pilih satu benda di museum, karang kisah hidupnya bergantian', H, ['kreatif'], ['pagi', 'siang'], { setting: 'dalam' }),
  a('tidur-siang-hujan', 'tidur siang sambil dengar hujan, tanpa rasa bersalah', H, ['santai'], ['siang'], { setting: 'dalam', fit: 'duo', doodle: 'hujan' }),
  a('dekor-satu-sudut', 'mendekor ulang satu sudut kamar dengan barang yang sudah ada', H, ['kreatif', 'produktif'], ['siang', 'sore'], { setting: 'dalam', doodle: 'lampu' }),
  a('cuci-motor', 'cuci motor atau sepeda bareng di halaman, sambil semprot-semprotan', H, ['santai', 'produktif'], ['pagi', 'siang'], { setting: 'luar' }),
  a('baca-bergantian', 'membaca satu cerpen keras-keras secara bergantian', H, ['romantis', 'santai'], ['malam'], { doodle: 'buku' }),
  a('photobox', 'foto di bilik photobox empat pose, satu lembar untuk tiap orang', HS, ['nostalgia', 'romantis'], ['siang', 'malam'], { setting: 'dalam', doodle: 'kamera' }),
  a('jajan-depan-sd', 'jajan makanan anak SD di depan sekolah', H, ['nostalgia'], ['siang'], { setting: 'luar' }),
  a('tukar-pemandu', 'tukar peran: satu jadi pemandu, satu ikut saja tanpa bertanya', H, ['petualang'], SEMUA_WAKTU, { doodle: 'kompas' }),
  a('kelas-dansa', 'ikut kelas dansa atau senam sekali coba', S, ['petualang', 'romantis'], ['sore', 'malam'], { setting: 'dalam' }),
  a('seduh-manual', 'belajar seduh kopi manual di rumah, lalu saling menilai', HS, ['kreatif'], ['pagi', 'sore'], { setting: 'dalam', doodle: 'cangkir' }),
  a('perahu-kayuh', 'menyewa perahu kayuh di danau taman', HS, ['romantis', 'nostalgia'], ['pagi', 'sore'], { setting: 'luar' }),
  a('lomba-agustusan', 'lomba ala tujuh belasan: makan kerupuk dan kelereng di sendok', H, ['nostalgia'], ['sore'], { setting: 'luar', fit: 'grup', doodle: 'bendera' }),
  a('belanja-bulanan', 'belanja bulanan bareng, lalu menyusun menu seminggu', HS, ['produktif'], ['siang', 'malam'], { setting: 'dalam' }),
  a('matahari-terbit', 'mengejar matahari terbit dari tempat yang harus didatangi sebelum subuh', HS, ['romantis', 'petualang'], ['pagi'], { setting: 'luar', doodle: 'matahari' }),
  a('jurnal-satu-meja', 'menulis halaman Sehari bersama di satu meja, lalu saling baca', H, ['romantis', 'kreatif'], ['sore', 'malam'], { doodle: 'pena' }),
  a('berburu-tema', 'berburu foto bertema: pintu, kucing, atau papan nama lucu', H, ['kreatif', 'petualang'], ['pagi', 'sore'], { setting: 'luar', doodle: 'kucing' }),
  a('bikin-martabak', 'bikin martabak atau kue sendiri, walau bentuknya tidak karuan', HS, ['kreatif'], ['siang', 'sore', 'malam'], { setting: 'dalam' }),
  a('tim-diundi-suit', 'main futsal atau bulu tangkis, tim diundi pakai suit', HS, ['petualang'], ['sore', 'malam'], { fit: 'grup' }),
  a('kartu-pos-teman-lama', 'menulis kartu pos untuk teman lama dan mengirimnya dari kantor pos', H, ['nostalgia', 'produktif'], ['pagi', 'siang'], { doodle: 'perangko' }),
  a('satu-keterampilan', 'belajar satu keterampilan dari video: origami, sulap kartu, atau ukulele', H, ['kreatif', 'produktif'], SEMUA_WAKTU, { setting: 'dalam' }),
  a('kereta-kota-sebelah', 'naik kereta ke kota sebelah, pulang hari itu juga', SR, ['petualang'], ['pagi'], { doodle: 'tiket' }),
  a('restoran-di-rumah', 'makan malam ala restoran di rumah: taplak, lilin, menu tulisan tangan', HS, ['romantis'], ['malam'], { setting: 'dalam', doodle: 'lilin' }),
  a('malam-masker', 'malam masker wajah dan rendam kaki sambil bergosip', H, ['santai'], ['malam'], { setting: 'dalam' }),
  a('spa-lalu-tidur', 'paket spa dan pijat lengkap, lalu tidur siang tanpa alarm', R, ['santai', 'romantis'], ['siang', 'sore'], { setting: 'dalam', doodle: 'lavender' }),
  a('konser-depan', 'nonton konser musisi kesukaan, berdiri sedekat mungkin ke panggung', SR, ['petualang', 'romantis'], ['malam'], { doodle: 'tiket' }),
  a('kapal-senja', 'naik kapal wisata menyusuri sungai atau teluk saat senja', SR, ['romantis'], ['sore', 'malam'], { setting: 'luar', doodle: 'senja' }),
  a('tenda-mewah', 'menginap di tenda mewah di pegunungan, bangun pagi untuk melihat kabut', R, ['petualang', 'romantis'], ['pagi', 'malam'], { setting: 'luar', doodle: 'kabut' }),
  a('kelas-masak-chef', 'ikut kelas memasak bersama juru masak, lalu makan hasilnya', SR, ['kreatif', 'produktif'], ['pagi', 'siang'], { setting: 'dalam' }),
  a('arung-jeram', 'arung jeram atau paralayang bersama pemandu', R, ['petualang'], ['pagi', 'siang'], { setting: 'luar' }),
  a('makan-malam-berpakaian', 'makan malam lengkap dengan baju terbaik, lalu dansa pelan di parkiran', R, ['romantis'], ['malam'], { fit: 'duo', doodle: 'bulan' }),
  a('debat-film-pendek', 'nonton film pendek gratis lalu berdebat soal akhirnya', H, ['kreatif'], ['malam'], { setting: 'dalam' }),
];

// ─────────────────────────────── Makanan & minuman ───────────────────────────────

const m = mk('makan');

export const DATE_FOODS: DateIdea[] = [
  m('kopi-susu-aren', 'kopi susu gula aren, dua gelas beda tingkat manis', H, ['santai'], SEMUA_WAKTU, { doodle: 'cangkir' }),
  m('nasi-kucing', 'nasi kucing, sate usus, dan wedang jahe di angkringan', H, ['nostalgia', 'santai'], ['malam'], { setting: 'luar' }),
  m('martabak-setengah', 'martabak manis setengah-setengah, rasa pilihan masing-masing', HS, ['santai'], ['malam']),
  m('bakso-gerobak', 'bakso gerobak yang lewat depan rumah', H, ['nostalgia'], ['siang', 'sore']),
  m('seblak-sepakat', 'seblak dengan level yang disepakati bersama, bukan yang paling berani', H, ['petualang'], ['siang', 'sore', 'malam']),
  m('bubur-diaduk', 'bubur ayam, lalu berdebat: diaduk atau tidak', H, ['santai'], ['pagi']),
  m('nasi-uduk', 'nasi uduk bungkus daun pisang', H, ['nostalgia'], ['pagi']),
  m('sate-tenda', 'sate ayam di warung tenda, pakai lontong atau nasi', H, ['santai'], ['malam'], { setting: 'luar' }),
  m('pecel-lele', 'pecel lele dengan sambal yang bikin keringetan', H, ['santai'], ['malam'], { setting: 'luar' }),
  m('mi-ayam-langganan', 'mi ayam pangsit langganan salah satu dari kalian', H, ['nostalgia'], ['siang', 'sore']),
  m('es-campur', 'es campur atau es teler di siang terik', H, ['santai'], ['siang'], { doodle: 'ceri' }),
  m('gorengan', 'sekantong gorengan hangat dan cabai rawit', H, ['santai'], ['sore']),
  m('jagung-bakar', 'jagung bakar pedas manis di pinggir jalan', H, ['romantis', 'santai'], ['malam'], { setting: 'luar' }),
  m('roti-bakar-gerobak', 'roti bakar cokelat keju dari gerobak malam', H, ['santai'], ['malam']),
  m('mi-rebus-telur', 'mi instan rebus pakai telur dan cabai, dimasak bareng', H, ['nostalgia'], ['malam'], { setting: 'dalam' }),
  m('pempek', 'pempek kapal selam dan cuko yang dibagi dua', HS, ['santai'], ['siang', 'sore']),
  m('soto-pagi', 'soto pagi-pagi dengan perkedel dan kerupuk', H, ['santai'], ['pagi', 'siang']),
  m('nasgor-tek-tek', 'nasi goreng gerobak tek-tek, pesan pedas sedang', H, ['nostalgia'], ['malam']),
  m('kerak-telor', 'kerak telor atau jajanan pasar malam lainnya', H, ['nostalgia'], ['malam'], { setting: 'luar' }),
  m('dimsum-pagi', 'dimsum ramai-ramai, pesan semua yang namanya aneh', S, ['petualang'], ['pagi', 'siang'], { fit: 'grup' }),
  m('ramen-kedai', 'semangkuk ramen di kedai kecil yang hangat', S, ['santai', 'romantis'], ['siang', 'malam'], { setting: 'dalam' }),
  m('makan-bertahap', 'makan malam bertahap di restoran Jepang yang tenang', R, ['romantis'], ['malam'], { setting: 'dalam', fit: 'duo' }),
  m('steak-serbet-kain', 'steak di restoran yang pakai serbet kain', R, ['romantis'], ['malam'], { setting: 'dalam', doodle: 'lilin' }),
  m('barbeku-korea', 'barbeku ala Korea, gantian jadi tukang panggang', SR, ['santai'], ['malam'], { setting: 'dalam' }),
  m('seafood-timbang', 'makanan laut pinggir pantai, ditimbang dulu baru dimasak', SR, ['petualang'], ['sore', 'malam'], { doodle: 'kerang' }),
  m('nasi-padang-hidang', 'nasi padang makan di tempat, semua lauk dihidangkan', S, ['santai'], ['siang']),
  m('rujak-kacang', 'rujak buah dengan sambal kacang yang kental', H, ['santai'], ['siang', 'sore'], { doodle: 'apel' }),
  m('kue-cubit', 'kue cubit setengah matang dan teh hangat', H, ['nostalgia'], ['sore', 'malam']),
  m('es-krim-puter', 'es krim puter gerobak dalam roti tawar', H, ['nostalgia'], ['siang', 'sore']),
  m('bakmi-arang', 'bakmi Jawa yang dimasak di atas arang, sabar menunggu giliran', HS, ['santai'], ['malam']),
  m('wedang-ronde', 'wedang ronde atau bajigur di malam yang dingin', H, ['romantis'], ['malam']),
  m('serabi-kinca', 'serabi kuah kinca untuk sarapan', H, ['nostalgia'], ['pagi']),
  m('bekal-ditukar', 'bekal yang dimasak masing-masing, lalu ditukar', H, ['romantis', 'kreatif'], ['siang']),
  m('sarapan-siang', 'sarapan kesiangan di kafe dengan menu telur yang namanya panjang', SR, ['santai'], ['pagi', 'siang'], { setting: 'dalam' }),
  m('teh-sore-hotel', 'teh sore dengan kue-kue kecil bertingkat di hotel', R, ['romantis'], ['sore'], { setting: 'dalam' }),
  m('kopi-tubruk', 'kopi tubruk dan pisang goreng di warkop', H, ['santai'], ['pagi', 'sore', 'malam'], { doodle: 'pisang' }),
  m('pizza-suit', 'satu loyang pizza besar, rasanya diputuskan lewat suit', S, ['santai'], ['malam'], { fit: 'grup' }),
  m('sup-bersama', 'sup hangat yang dimasak bersama, apa pun isinya', H, ['kreatif'], ['malam'], { setting: 'dalam' }),
  m('batagor-siomay', 'batagor atau siomay gerobak dengan bumbu kacang yang banyak', H, ['santai'], ['siang', 'sore']),
  m('cilok-tiga-gerobak', 'cilok, cimol, dan cireng dari tiga gerobak berbeda', H, ['petualang'], ['sore']),
  m('gudeg-tengah-malam', 'gudeg atau nasi liwet yang baru buka tengah malam', H, ['petualang'], ['malam']),
  m('geprek-adu-pedas', 'ayam geprek, adu siapa yang paling tahan pedas', H, ['petualang'], ['siang', 'malam']),
  m('masakan-negara-baru', 'masakan dari negara yang belum pernah kalian coba', SR, ['petualang'], ['siang', 'malam']),
  m('kelapa-muda', 'kelapa muda utuh, diminum langsung dari batoknya', H, ['santai'], ['siang'], { setting: 'luar' }),
  m('satu-dessert-mahal', 'satu dessert mahal dibagi dua, dimakan pelan-pelan', S, ['romantis'], ['sore', 'malam'], { fit: 'duo' }),
  m('buah-potong', 'buah potong gerobak dengan bumbu rujak', H, ['santai'], ['siang']),
  m('prasmanan-hotel', 'sarapan prasmanan hotel, semua menu dicicip sedikit-sedikit', R, ['santai'], ['pagi'], { setting: 'dalam' }),
  m('susu-segar', 'susu segar hangat dan roti bakar di warung susu', H, ['nostalgia'], ['malam']),
  m('tumpeng-mini', 'nasi kuning atau tumpeng mini untuk merayakan hal kecil', HS, ['nostalgia'], ['pagi', 'siang'], { doodle: 'kado' }),
  m('shabu-satu-panci', 'shabu-shabu satu panci untuk ramai-ramai', S, ['santai'], ['malam'], { setting: 'dalam', fit: 'grup' }),
  m('jajanan-pasar', 'klepon, lemper, dan kue lapis; masing-masing pilih satu', H, ['nostalgia'], ['pagi']),
  m('ketoprak-ulek', 'ketoprak atau gado-gado yang diulek di depan mata', H, ['santai'], ['pagi', 'siang']),
  m('teh-poci', 'teh poci gula batu di pinggir jalan', H, ['santai'], ['sore', 'malam'], { setting: 'luar' }),
  m('makan-musik-langsung', 'makan malam di restoran yang ada musik langsungnya', R, ['romantis'], ['malam'], { setting: 'dalam', doodle: 'gitar' }),
  m('toko-roti-lawas', 'roti dari toko roti lawas, dimakan di bangku taman', H, ['nostalgia'], ['pagi', 'sore']),
];

// ─────────────────────────────── Misi kecil ───────────────────────────────

const c = mkAny('misi');

export const DATE_CHALLENGES: DateIdea[] = [
  c('difoto-orang-asing', 'foto bersama tapi yang memotret harus orang asing', ['petualang', 'romantis'], { doodle: 'kamera' }),
  c('pesankan-tanpa-tanya', 'pesankan makanan untuk yang lain tanpa bertanya dulu', ['kreatif', 'santai']),
  c('sejam-bahasa-daerah', 'selama satu jam, ngobrol hanya pakai bahasa daerah atau logat karangan', ['kreatif', 'santai']),
  c('ponsel-terbalik', 'ponsel ditumpuk terbalik di meja; yang pertama mengambil bayar minum', ['santai', 'romantis']),
  c('kumpulkan-struk', 'kumpulkan semua struk dan tiket hari ini untuk ditempel di jurnal', ['nostalgia'], { doodle: 'tiket' }),
  c('lima-benda-kuning', 'temukan lima benda berwarna kuning sebelum pulang', ['petualang'], { doodle: 'bunga-matahari' }),
  c('pujian-spesifik', 'tiap satu jam, beri satu pujian yang spesifik, bukan yang umum', ['romantis']),
  c('pesan-suara', 'rekam pesan suara tiga puluh detik tentang hari ini, kirim besok pagi', ['romantis', 'nostalgia']),
  c('kata-terlarang', 'pilih satu kata terlarang; yang keceplosan menyanyi satu bait', ['santai']),
  c('tanpa-peta', 'sampai ke satu tempat tanpa membuka peta di ponsel', ['petualang'], { doodle: 'kompas' }),
  c('nama-penjual', 'tanyakan nama satu penjual yang dagangannya kalian beli', ['petualang', 'santai']),
  c('sepuluh-jepretan', 'ambil tepat sepuluh foto hari ini, tidak boleh ada yang dihapus', ['kreatif'], { doodle: 'kamera' }),
  c('tiru-foto-lama', 'tiru pose foto lama kalian semirip mungkin', ['nostalgia'], { doodle: 'kamera' }),
  c('nyanyi-di-keramaian', 'nyanyikan satu reff bersama di tempat yang agak ramai', ['petualang'], { doodle: 'gitar' }),
  c('cerita-tiga-kata', 'karang cerita bersambung, tiap orang menambah tiga kata', ['kreatif']),
  c('menu-teraneh', 'pesan satu menu yang namanya paling aneh di daftar', ['petualang']),
  c('suvenir-sepuluh-ribu', 'belikan satu suvenir di bawah sepuluh ribu untuk yang lain', ['kreatif', 'romantis'], { doodle: 'kado' }),
  c('sketsa-tisu', 'gambar tempat kalian duduk di tisu atau balik struk', ['kreatif'], { doodle: 'pena' }),
  c('tebak-meja-sebelah', 'karang kisah hidup orang di meja sebelah, tapi jangan sampai ketahuan', ['kreatif', 'santai']),
  c('larangan-terserah', 'dilarang bilang "terserah"; tiap keputusan diambil dalam lima detik', ['santai', 'petualang']),
  c('kartu-pos-sendiri', 'kirim kartu pos ke alamat sendiri dari tempat kencan', ['nostalgia'], { doodle: 'perangko' }),
  c('bunga-di-buku', 'beli atau pungut satu bunga kecil, selipkan di buku untuk dikeringkan', ['romantis'], { doodle: 'daisy' }),
  c('teh-untuk-tukang-parkir', 'belikan teh hangat untuk tukang parkir atau penjual terakhir yang ditemui', ['santai']),
  c('lagu-yang-mengingatkan', 'putar lagu pertama yang mengingatkanmu pada yang lain, lalu jelaskan', ['romantis', 'nostalgia']),
  c('aksen-penyiar', 'pesan makanan dengan gaya penyiar berita', ['santai']),
  c('hitung-kucing', 'tebak berapa kucing yang akan kalian lihat; tebakan paling dekat menang', ['santai'], { doodle: 'kucing' }),
  c('pesan-di-saku', 'selipkan pesan kecil di saku atau tas yang lain tanpa ketahuan', ['romantis'], { doodle: 'amplop' }),
  c('amati-kebiasaan', 'perhatikan satu kebiasaan kecil yang lain hari ini, ceritakan di akhir', ['romantis']),
  c('muat-lima-puluh', 'seluruh janji temu harus muat di lima puluh ribu, dihitung bersama', ['produktif', 'petualang'], { budget: H }),
  c('foto-tangan', 'foto tangan kalian di setiap tempat yang didatangi', ['kreatif', 'romantis']),
  c('lelucon-garing', 'masing-masing siapkan satu lelucon garing untuk saat tak terduga', ['santai']),
  c('tanpa-mengeluh', 'dilarang mengeluh soal macet, panas, atau antre; yang kalah bayar parkir', ['santai']),
  c('papan-nama-lucu', 'temukan papan nama toko paling lucu dan foto di depannya', ['petualang'], { doodle: 'kamera' }),
  c('lima-indra', 'kumpulkan satu hal untuk tiap indra: dilihat, didengar, dicium, diraba, dicicip', ['kreatif']),
  c('satu-kata-asing', 'pelajari satu kata dari bahasa yang dikuasai yang lain', ['produktif']),
  c('tiket-palsu', 'buat tiket masuk kencan hari ini di kertas, lengkap dengan nomor kursi', ['kreatif'], { doodle: 'tiket' }),
  c('rekomendasi-lokal', 'minta rekomendasi makanan dari orang sekitar, lalu ikuti', ['petualang']),
  c('foto-jam', 'foto jam di setiap tempat supaya urutan hari ini tercatat', ['nostalgia'], { doodle: 'jam-pasir' }),
  c('lima-menit-diam', 'duduk diam lima menit berdampingan, lalu ceritakan apa yang terdengar', ['romantis']),
  c('tebak-harga', 'tebak harga barang di etalase; yang paling meleset traktir parkir', ['santai']),
  c('pujian-melingkar', 'tiap orang wajib memuji satu anggota lain sebelum bubar', ['romantis'], { fit: 'grup' }),
  c('minta-lagu-pengamen', 'minta lagu ke pengamen dan beri saweran yang pantas', ['romantis', 'santai']),
  c('duduk-acak', 'duduk di sebelah orang yang paling jarang kamu ajak ngobrol', ['santai'], { fit: 'grup' }),
  c('tiru-poster-film', 'tiru pose poster film di bioskop atau mall', ['kreatif']),
  c('satu-payung-saja', 'hanya boleh bawa satu payung untuk berdua, hujan atau tidak', ['romantis'], { fit: 'duo', doodle: 'payung' }),
];

// ─────────────────────────────── Pertanyaan ───────────────────────────────
// Urutannya kira-kira dari yang ringan ke yang dalam.

const q = mkAny('tanya');

export const DATE_QUESTIONS: DateIdea[] = [
  q('judul-film', 'kalau hari ini dijadikan film, judulnya apa?', ['santai', 'kreatif']),
  q('makanan-dibela', 'makanan apa yang rela kamu bela mati-matian di depan pembencinya?', ['santai']),
  q('jago-semalam', 'kalau bisa jago satu hal dalam semalam, kamu pilih apa?', ['santai']),
  q('kebiasaan-sendirian', 'kebiasaan aneh apa yang kamu lakukan saat sendirian?', ['santai']),
  q('aplikasi-memalukan', 'aplikasi apa di ponselmu yang paling memalukan kalau ketahuan?', ['santai']),
  q('lagu-tema', 'kalau hidupmu punya lagu tema, lagunya apa sekarang?', ['santai', 'kreatif']),
  q('lomba-cocok', 'menurutmu, kita paling cocok jadi satu tim untuk lomba apa?', ['santai', 'kreatif']),
  q('tukar-hidup', 'kalau kita bertukar hidup seminggu, apa yang paling bikin kaget?', ['santai']),
  q('seratus-juta', 'uang seratus juta harus habis dalam seminggu; untuk apa saja?', ['santai', 'produktif']),
  q('paling-mungkin-terkenal', 'siapa di antara kita yang paling mungkin terkenal, dan karena apa?', ['santai'], { fit: 'grup' }),
  q('lagu-umur-tujuh-belas', 'lagu apa yang langsung membawamu ke umur tujuh belas?', ['nostalgia']),
  q('jajanan-dirindukan', 'jajanan masa kecil apa yang paling kamu rindukan?', ['nostalgia']),
  q('tertawa-sakit-perut', 'kapan terakhir kali kamu tertawa sampai sakit perut?', ['santai', 'nostalgia']),
  q('tempat-kenangan', 'tempat mana di kota ini yang menyimpan kenangan paling banyak buatmu?', ['nostalgia']),
  q('salah-sangka', 'apa yang paling sering disalahpahami orang tentang kamu?', ['santai', 'romantis']),
  q('guru-diingat', 'guru mana yang paling kamu ingat, dan kenapa?', ['nostalgia']),
  q('kota-pilihan', 'kalau bisa tinggal di kota mana saja di Indonesia, kamu pilih mana?', ['petualang']),
  q('paling-berani', 'apa hal paling berani yang pernah kamu lakukan?', ['petualang']),
  q('kenangan-diulang', 'kenangan kita bersama yang paling sering diceritakan ulang?', ['nostalgia'], { fit: 'grup' }),
  q('kesan-pertama', 'apa kesan pertamamu tentang aku dulu, dan seberapa meleset ternyata?', ['romantis', 'nostalgia']),
  q('hal-kecil-membaik', 'hal kecil apa yang bikin harimu langsung membaik?', ['romantis', 'santai']),
  q('rasa-rumah', 'makanan apa yang rasanya seperti rumah?', ['nostalgia']),
  q('pelajaran-tahun-ini', 'apa yang kamu pelajari tahun ini yang tidak diajarkan di sekolah?', ['produktif']),
  q('sebelum-akhir-tahun', 'apa yang ingin kita coba bersama sebelum akhir tahun?', ['produktif', 'petualang']),
  q('tradisi-tahunan', 'kalau kita bikin tradisi tahunan, tradisinya apa?', ['kreatif', 'romantis']),
  q('momen-diputar-ulang', 'momen kita yang mana yang paling sering kamu putar ulang di kepala?', ['romantis', 'nostalgia']),
  q('ketakutan-kecil', 'ketakutan kecil apa yang masih kamu bawa dari masa kecil?', ['nostalgia']),
  q('ulang-satu-hari', 'kalau bisa mengulang satu hari dalam hidupmu, hari yang mana?', ['nostalgia']),
  q('nasihat-terbaik', 'nasihat terbaik apa yang pernah kamu terima, dan dari siapa?', ['nostalgia', 'produktif']),
  q('jadi-diri-sendiri', 'kamu paling merasa jadi dirimu sendiri saat sedang apa?', ['romantis']),
  q('pendapat-berubah', 'pendapat apa yang dulu kamu pegang kuat-kuat, sekarang sudah berubah?', ['produktif']),
  q('kerja-tanpa-penilaian', 'kalau tidak ada yang menilai, kamu ingin bekerja sebagai apa?', ['kreatif', 'produktif']),
  q('bangga-pada-diri', 'kapan kamu merasa paling bangga pada dirimu sendiri?', ['produktif', 'romantis']),
  q('lebih-berani', 'apa yang ingin kamu lakukan dengan lebih berani mulai bulan depan?', ['petualang', 'produktif']),
  q('surat-umur-sepuluh', 'kalau menulis surat untuk dirimu umur sepuluh, kalimat pertamanya apa?', ['nostalgia', 'kreatif']),
  q('minggu-lima-tahun', 'lima tahun lagi, hari Minggu yang ideal buatmu seperti apa?', ['romantis', 'produktif']),
  q('ingin-didengar', 'kalimat apa yang ingin lebih sering kamu dengar dari orang terdekat?', ['romantis']),
  q('belajar-dariku', 'hal apa dari aku yang ingin kamu pelajari?', ['romantis']),
  q('mimpi-belum-lepas', 'mimpi lama apa yang diam-diam belum kamu lepaskan?', ['romantis', 'kreatif']),
  q('keluarga-membentuk', 'satu hal tentang keluargamu yang membentukmu tanpa kamu sadari?', ['nostalgia']),
  q('khawatir-belum-cerita', 'apa yang sedang kamu khawatirkan tapi belum sempat diceritakan?', ['romantis']),
  q('salah-paham-mendekatkan', 'salah paham mana di antara kita yang ternyata bikin makin dekat?', ['romantis']),
  q('merasa-dicintai', 'apa yang bikin kamu merasa disayang, tapi jarang kamu minta?', ['romantis'], { fit: 'duo' }),
  q('bertahan', 'apa yang membuatmu bertahan di masa paling berat?', ['romantis', 'nostalgia']),
  q('syukur-hari-ini', 'hal apa yang paling kamu syukuri dari hari ini?', ['romantis', 'santai']),
];

// ─────────────────────────────── Aturan berpakaian ───────────────────────────────

const d = mkAny('baju');

export const DATE_DRESSCODES: DateIdea[] = [
  d('satu-kuning', 'pakai satu barang berwarna kuning', ['kreatif', 'santai'], { doodle: 'bunga-matahari' }),
  d('kembaran-tebakan', 'kembaran warna tanpa janjian: tebak warna yang akan dipakai yang lain', ['kreatif', 'romantis']),
  d('karyawisata', 'gaya karyawisata sekolah: kaus olahraga, topi, dan tas ransel', ['nostalgia']),
  d('batik-terbaik', 'pakai batik terbaik, walau cuma ke angkringan', ['kreatif', 'romantis']),
  d('serba-hitam', 'serba hitam, seperti kru panggung konser', ['santai']),
  d('dipilihkan', 'pakai baju yang dipilihkan oleh yang lain', ['romantis']),
  d('sembilan-puluhan', 'ala tahun sembilan puluhan: kemeja kebesaran atau celana cutbray', ['nostalgia']),
  d('sarung-kain', 'pakai sarung atau kain sebagai bagian dari gaya', ['nostalgia', 'kreatif']),
  d('paling-lama-di-lemari', 'pakai baju yang paling lama tidak disentuh di lemari', ['nostalgia']),
  d('garis-garis', 'semua bermotif garis-garis', ['kreatif']),
  d('aksesori-aneh', 'satu aksesori aneh: jepit rambut lucu, bros, atau dasi kupu-kupu', ['kreatif', 'santai'], { doodle: 'pita' }),
  d('warna-baru', 'pakai warna yang belum pernah kamu pakai di depan yang lain', ['petualang']),
  d('rapi-kondangan', 'rapi seperti mau ke kondangan', ['romantis']),
  d('piyama-terbaik', 'piyama terbaik, karena janji temunya di rumah', ['santai'], { setting: 'dalam' }),
  d('gaya-turis', 'gaya turis: topi, tas pinggang, dan kacamata hitam', ['petualang', 'santai']),
  d('pinjaman', 'pakai satu barang pinjaman dari lemari orang lain', ['kreatif']),
  d('kaus-bercerita', 'kaus band atau kaus acara yang punya cerita', ['nostalgia']),
  d('warna-langit', 'pakai warna yang senada dengan langit hari ini', ['romantis', 'kreatif'], { doodle: 'awan' }),
  d('siap-lari', 'baju olahraga, siap lari kapan saja', ['petualang', 'produktif']),
  d('buatan-tangan', 'pakai satu barang buatan tangan', ['kreatif']),
  d('serba-putih', 'serba putih, siap kena noda sambal', ['santai', 'petualang']),
  d('kantor-sandal-jepit', 'gaya kantor dari atas, sandal jepit di bawah', ['santai']),
  d('warna-pelangi', 'tiap orang kebagian satu warna pelangi', ['kreatif'], { fit: 'grup', doodle: 'pelangi' }),
  d('wangi-sekolah', 'pakai wewangian yang mengingatkan pada masa sekolah', ['nostalgia', 'romantis']),
  d('siap-hujan', 'jas hujan atau payung jadi aksesori utama', ['petualang'], { doodle: 'hujan' }),
];

// ─────────────────────────────── Kocokan ───────────────────────────────

export interface DateFilters {
  budget?: DateBudget;
  vibe?: DateVibe;
  time?: DateTime;
  setting?: DateSetting;
  fit?: 'duo' | 'grup';
}

export interface DateRoll {
  place: DateIdea;
  activity: DateIdea;
  food: DateIdea;
  challenge: DateIdea;
  question: DateIdea;
  dress: DateIdea;
}

const POOLS: Record<keyof DateRoll, DateIdea[]> = {
  place: DATE_PLACES,
  activity: DATE_ACTIVITIES,
  food: DATE_FOODS,
  challenge: DATE_CHALLENGES,
  question: DATE_QUESTIONS,
  dress: DATE_DRESSCODES,
};

function matches(idea: DateIdea, f: DateFilters): boolean {
  if (f.budget && !idea.budget.includes(f.budget)) return false;
  if (f.vibe && !idea.vibe.includes(f.vibe)) return false;
  if (f.time && !idea.time.includes(f.time)) return false;
  if (f.setting && idea.setting && idea.setting !== f.setting) return false;
  if (f.fit && idea.fit && idea.fit !== 'semua' && idea.fit !== f.fit) return false;
  return true;
}

/** Daftar tersaring; kalau saringan membuat daftar kosong, kembali ke daftar utuh. */
function poolFor(part: keyof DateRoll, filters: DateFilters = {}): DateIdea[] {
  const all = POOLS[part];
  const filtered = all.filter((idea) => matches(idea, filters));
  return filtered.length > 0 ? filtered : all;
}

function pick(pool: DateIdea[], rand: () => number): DateIdea {
  const i = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
  return pool[Math.max(0, i)]!;
}

/** Satu kocokan lengkap. `rand` bisa diganti untuk hasil deterministik (misalnya di tes). */
export function rollDate(filters?: DateFilters, rand: () => number = Math.random): DateRoll {
  return {
    place: pick(poolFor('place', filters), rand),
    activity: pick(poolFor('activity', filters), rand),
    food: pick(poolFor('food', filters), rand),
    challenge: pick(poolFor('challenge', filters), rand),
    question: pick(poolFor('question', filters), rand),
    dress: pick(poolFor('dress', filters), rand),
  };
}

/** Kocok ulang satu bagian saja; hasilnya selalu berbeda dari yang sekarang kalau masih ada pilihan lain. */
export function rerollPart<K extends keyof DateRoll>(
  part: K,
  current: DateRoll,
  filters?: DateFilters,
  rand: () => number = Math.random,
): DateRoll {
  const currentId = current[part].id;
  let pool = poolFor(part, filters).filter((idea) => idea.id !== currentId);
  if (pool.length === 0) pool = POOLS[part].filter((idea) => idea.id !== currentId);
  if (pool.length === 0) return current;
  return { ...current, [part]: pick(pool, rand) };
}
