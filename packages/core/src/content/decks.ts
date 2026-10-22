// Dek Kartu Harian. Setiap pagi lingkaran menarik satu kartu.
// - pertanyaan: dijawab dengan satu kalimat atau satu foto
// - tantangan: aksi/foto kecil, selesai dalam satu menit
// - kenangan: mengajak membuka atau mengingat satu hari lama
// - rahasia: jawabanmu baru terbuka kalau temanmu juga menjawab
// Kartu dengan `rare` hanya keluar pada hari pemicunya.
//
// Batas: judul maks ~24 karakter, isi maks ~140 karakter.
// id stabil: jangan diubah setelah rilis.

import type { CardKind, CircleFit, DailyCard, Deck, RareTrigger, Tone } from './types';
import type { ContentDoodle } from './doodleIds';

interface CardOpts {
  fit?: CircleFit[];
  doodle?: ContentDoodle;
  rare?: RareTrigger;
}

const deckCard =
  (prefix: string) =>
  (slug: string, kind: CardKind, title: string, body: string, tone: Tone, opts: CardOpts = {}): DailyCard => {
    const c: DailyCard = { id: `${prefix}-${slug}`, kind, title, body, tone, fit: opts.fit ?? ['semua'] };
    if (opts.doodle) c.doodle = opts.doodle;
    if (opts.rare) c.rare = opts.rare;
    return c;
  };

const DUO: CircleFit[] = ['duo'];
const GRUP: CircleFit[] = ['lingkaran', 'keluarga_pilihan'];

// ───────────────────────────── Dek Dasar ─────────────────────────────

const d = deckCard('dasar');

const DASAR_CARDS: DailyCard[] = [
  // — pertanyaan —
  d('niat-kecil', 'pertanyaan', 'Niat kecil', 'Satu hal kecil yang ingin kamu selesaikan hari ini?', 'ringan', { doodle: 'pena' }),
  d('lagu-bangun', 'pertanyaan', 'Lagu buat bangun', 'Lagu apa yang paling cocok untuk pagi ini?', 'ringan', { doodle: 'gitar' }),
  d('prakiraan-hati', 'pertanyaan', 'Prakiraan cuaca hati', 'Cuaca hatimu hari ini: cerah, berawan, atau gerimis menjelang sore?', 'ringan', { doodle: 'awan' }),
  d('ditunggu', 'pertanyaan', 'Yang ditunggu', 'Apa yang kamu tunggu-tunggu hari ini?', 'ringan', { doodle: 'jam-pasir' }),
  d('boleh-absen', 'pertanyaan', 'Kalau boleh absen', 'Kalau boleh izin dari satu hal hari ini, kamu izin dari apa?', 'lucu'),
  d('bekal', 'pertanyaan', 'Bekal hari ini', 'Apa yang kamu bawa hari ini, di tas atau di kepala?', 'ringan'),
  d('semangati', 'pertanyaan', 'Yang disemangati', 'Siapa yang ingin kamu doakan atau semangati hari ini?', 'syukur', { doodle: 'lilin' }),
  d('jurus-capek', 'pertanyaan', 'Jurus anti-capek', 'Jurus andalanmu kalau capek di tengah hari?', 'lucu', { doodle: 'cangkir' }),
  d('ganti-sibuk', 'pertanyaan', 'Selain "sibuk"', 'Ganti kata "sibuk" untuk hari ini dengan kata lain. Kata apa?', 'dalam'),
  d('hadiah-sore', 'pertanyaan', 'Janji untuk sore', 'Hadiah kecil apa yang kamu janjikan untuk dirimu nanti sore?', 'syukur', { doodle: 'kado' }),
  d('dari-kemarin', 'pertanyaan', 'Oleh-oleh kemarin', 'Satu hal dari kemarin yang mau kamu bawa ke hari ini?', 'dalam'),
  d('versi-kucing', 'pertanyaan', 'Kamu versi kucing', 'Hari ini kamu kucing yang mana: tidur di atas jemuran atau mengejar cicak?', 'lucu', { doodle: 'kucing' }),
  d('rasa-dicari', 'pertanyaan', 'Rasa hari ini', 'Lagi pengin rasa apa hari ini: manis, pedas, gurih, atau asam?', 'ringan', { doodle: 'stroberi' }),
  d('rindu-pagi', 'pertanyaan', 'Rindu pagi', 'Siapa yang kamu rindukan pagi ini?', 'dalam', { doodle: 'surat-botol' }),
  d('teleport', 'pertanyaan', 'Pintu ke mana saja', 'Kalau bisa pindah tempat sebentar hari ini, mau ke mana?', 'mimpi', { doodle: 'peta' }),
  d('syukur-pagi', 'pertanyaan', 'Sebelum mulai', 'Satu hal yang kamu syukuri sebelum hari benar-benar dimulai?', 'syukur', { doodle: 'matahari' }),
  d('deg-degan', 'pertanyaan', 'Deg-degan atau semangat', 'Hari ini lebih banyak deg-degan atau semangatnya?', 'ringan'),
  d('kalimat-pembuka', 'pertanyaan', 'Kalimat pembuka', 'Kalau hari ini bab baru, kalimat pembukanya apa?', 'mimpi', { doodle: 'buku' }),
  d('soundtrack-macet', 'pertanyaan', 'Soundtrack macet', 'Kalau nanti kejebak macet, lagu apa yang menemani?', 'lucu'),
  d('belum-dicoba', 'pertanyaan', 'Sekali coba', 'Satu hal kecil yang belum pernah kamu coba dan berani dicoba hari ini?', 'mimpi'),
  d('bunyi-pagi', 'pertanyaan', 'Bunyi favorit', 'Bunyi apa yang paling kamu suka di pagi hari?', 'ringan', { doodle: 'burung' }),
  d('warna-baju', 'pertanyaan', 'Warna hari ini', 'Hari ini kamu pakai warna apa? Ada alasannya?', 'ringan'),
  d('menu-spesial', 'pertanyaan', 'Menu spesial', 'Kalau hari ini warung makan, menu spesialnya apa?', 'lucu'),
  d('sumber-semangat', 'pertanyaan', 'Sumber semangat', 'Semangatmu hari ini datang dari mana?', 'syukur'),
  d('lepaskan', 'pertanyaan', 'Lepaskan satu', 'Satu hal yang mau kamu lepaskan hari ini?', 'dalam', { doodle: 'dandelion' }),
  d('kalimat-dipegang', 'pertanyaan', 'Kalimat yang dipegang', 'Kalimat dari seseorang yang sampai sekarang masih kamu pegang?', 'nostalgia'),
  d('usul-pertanyaan', 'pertanyaan', 'Giliranmu bertanya', 'Tulis satu pertanyaan untuk lingkaran ini. Siapa tahu jadi Pertanyaan Malam.', 'ringan', { fit: GRUP, doodle: 'pena' }),
  d('tiga-kata', 'pertanyaan', 'Tiga kata', 'Ceritakan hari kemarin dalam tiga kata saja.', 'ringan'),
  d('mimpi-kecil', 'pertanyaan', 'Mimpi kecil', 'Mimpi kecil yang masih kamu simpan sampai sekarang?', 'mimpi', { doodle: 'bintang' }),
  d('hari-pas', 'pertanyaan', 'Hari yang pas', 'Seperti apa hari yang "pas" buatmu? Bukan sempurna, cuma pas.', 'dalam'),

  // — tantangan —
  d('biru', 'tantangan', 'Sesuatu yang biru', 'Potret sesuatu yang biru. Langit, ember, sandal, tutup galon, apa saja.', 'ringan', { doodle: 'kamera' }),
  d('bayangan', 'tantangan', 'Bayanganmu', 'Potret bayanganmu sendiri, di aspal, tembok, atau lantai.', 'ringan', { doodle: 'matahari' }),
  d('tangan', 'tantangan', 'Tanganmu hari ini', 'Potret tanganmu yang sedang memegang sesuatu. Gelas, setir, pena, apa saja.', 'ringan'),
  d('langit-sekarang', 'tantangan', 'Langit jam ini', 'Tengok ke atas, potret langitnya. Mendung juga cantik.', 'ringan', { doodle: 'awan' }),
  d('jendela', 'tantangan', 'Dari jendela', 'Potret pemandangan dari jendela terdekat. Apa adanya.', 'ringan', { doodle: 'jendela' }),
  d('alas-kaki', 'tantangan', 'Yang membawamu', 'Potret alas kaki yang hari ini membawamu ke mana-mana.', 'ringan'),
  d('makanan-warna', 'tantangan', 'Paling berwarna', 'Potret makanan paling berwarna yang kamu temui hari ini.', 'ringan', { doodle: 'ceri' }),
  d('tulisan-truk', 'tantangan', 'Tulisan jalanan', 'Cari tulisan lucu di spanduk, gerobak, atau bak truk. Potret dan bagikan.', 'lucu'),
  d('suara-sekitar', 'tantangan', 'Sepuluh detik suara', 'Rekam suara sekitarmu sepuluh detik saja, tanpa bicara.', 'ringan', { doodle: 'jam-pasir' }),
  d('sapa-kucing', 'tantangan', 'Sapa kucing', 'Kalau bertemu kucing hari ini, potret dia. Dengan izin si kucing, tentunya.', 'lucu', { doodle: 'kucing' }),
  d('yang-tumbuh', 'tantangan', 'Yang tumbuh', 'Potret satu hal hijau yang hidup: rumput di retakan, pot di teras, pohon di jalan.', 'syukur', { doodle: 'tunas' }),
  d('gelas', 'tantangan', 'Gelas setia', 'Potret gelas atau cangkir yang menemani harimu.', 'ringan', { doodle: 'cangkir' }),
  d('lampu-malam', 'tantangan', 'Lampu malam', 'Potret satu lampu yang menyala malam ini.', 'ringan', { doodle: 'lampu' }),
  d('benda-bulat', 'tantangan', 'Cari yang bulat', 'Potret tiga benda bulat. Atau satu saja kalau sedang malas.', 'lucu'),
  d('tulis-tangan', 'tantangan', 'Satu kata, tulis tangan', 'Tulis satu kata di kertas dengan tanganmu sendiri, lalu potret.', 'ringan', { doodle: 'pena' }),
  d('tanpa-layar', 'tantangan', 'Lima menit tanpa layar', 'Taruh HP lima menit. Sesudahnya, tulis satu hal yang kamu perhatikan.', 'dalam', { doodle: 'jam-pasir' }),
  d('segelas-air', 'tantangan', 'Segelas air', 'Minum segelas air pelan-pelan. Potret gelasnya sebagai bukti.', 'lucu'),
  d('jalan-sebentar', 'tantangan', 'Jalan sebentar', 'Jalan kaki sebentar, ke warung pun boleh. Potret satu hal di jalan.', 'ringan', { doodle: 'peta' }),
  d('benda-tertua', 'tantangan', 'Benda tertua', 'Potret benda paling tua di dekatmu. Ceritakan umurnya kalau tahu.', 'nostalgia', { doodle: 'kunci' }),
  d('sudut-favorit', 'tantangan', 'Sudut favorit', 'Potret satu sudut yang paling kamu suka di tempat tinggalmu.', 'syukur', { doodle: 'rumah' }),
  d('tumpukan-jujur', 'tantangan', 'Tumpukan jujur', 'Potret tumpukan di dekatmu: cucian, buku, piring, kabel. Kita tidak menghakimi.', 'lucu'),
  d('pesan-baik', 'tantangan', 'Kirim pesan baik', 'Kirim satu pesan baik ke seseorang di luar lingkaran ini. Ceritakan saja, tak perlu tangkapan layar.', 'syukur', { doodle: 'amplop' }),
  d('kuning', 'tantangan', 'Sesuatu yang kuning', 'Potret sesuatu yang kuning. Pisang juga sah.', 'ringan', { doodle: 'bunga-matahari' }),
  d('merah', 'tantangan', 'Sesuatu yang merah', 'Potret sesuatu yang merah: lampu rem, sambal, kotak pos, apa pun.', 'ringan', { doodle: 'apel' }),
  d('pantulan', 'tantangan', 'Pantulan', 'Potret pantulan: di genangan, kaca, sendok, atau layar yang mati.', 'ringan', { doodle: 'hujan' }),
  d('tekstur', 'tantangan', 'Dari dekat sekali', 'Dekatkan kamera ke sesuatu: kain, kayu, kulit jeruk. Seberapa dekat bisa?', 'ringan', { doodle: 'kamera' }),
  d('daun-jatuh', 'tantangan', 'Daun yang jatuh', 'Cari satu daun yang sudah jatuh. Potret, atau selipkan ke buku.', 'nostalgia', { doodle: 'daun-kering' }),
  d('lagu-semangat', 'tantangan', 'Satu lagu semangat', 'Putar satu lagu yang bikin semangat, lalu jatuhkan judulnya ke kapsul.', 'ringan', { doodle: 'gitar' }),
  d('gambar-asal', 'tantangan', 'Gambar seadanya', 'Gambar apa yang ada di depanmu dalam 30 detik. Makin jelek makin bagus.', 'lucu', { doodle: 'pena' }),
  d('angka-tanggal', 'tantangan', 'Cari angka hari ini', 'Potret angka yang sama dengan tanggal hari ini. Plat nomor, harga, nomor rumah.', 'lucu', { doodle: 'dadu' }),
  d('jam-detik-ini', 'tantangan', 'Detik ini', 'Potret jam apa saja di dekatmu, dinding, oven, atau HP. Tandai detik ini.', 'ringan', { doodle: 'jam-pasir' }),
  d('bunga-jalan', 'tantangan', 'Bunga pinggir jalan', 'Cari bunga kecil di pinggir jalan atau pagar orang. Potret, jangan dipetik.', 'syukur', { doodle: 'daisy' }),
  d('sarapan', 'tantangan', 'Sarapan apa adanya', 'Potret sarapanmu. Kalau cuma kopi, ya kopi.', 'lucu', { doodle: 'cangkir' }),
  d('satu-menit-dengar', 'tantangan', 'Satu menit mendengar', 'Diam satu menit, lalu tulis semua suara yang kamu dengar.', 'dalam'),
  d('rapikan-satu', 'tantangan', 'Rapikan satu hal', 'Rapikan satu benda kecil: laci, dompet, atau layar desktop. Potret sesudahnya.', 'ringan'),
  d('kejar-senja', 'tantangan', 'Kejar senja', 'Kalau sempat, potret langit saat matahari turun di kotamu.', 'nostalgia', { doodle: 'senja' }),

  // — kenangan —
  d('dadu-hari-lama', 'kenangan', 'Lempar dadu', 'Lempar Dadu Kenangan dan buka satu hari acak dari arsip kalian. Apa yang kamu temukan?', 'nostalgia', { doodle: 'dadu' }),
  d('galeri-tahun-lalu', 'kenangan', 'Galeri tahun lalu', 'Gulir galeri ke tahun lalu. Pilih satu foto dan ceritakan kenapa ia masih penting.', 'nostalgia', { doodle: 'kamera' }),
  d('halaman-pertama', 'kenangan', 'Halaman pertama', 'Buka prolog lingkaran ini. Apa yang sudah berubah sejak hari itu?', 'nostalgia', { doodle: 'buku' }),
  d('kalimat-terakhir-lama', 'kenangan', 'Kalimat terakhir lama', 'Cari satu Kalimat Terakhir yang kamu tulis bulan lalu. Masih setuju?', 'dalam', { doodle: 'pena' }),
  d('sebulan-lalu', 'kenangan', 'Tepat sebulan lalu', 'Buka kapsul tepat sebulan lalu, lalu tinggalkan satu catatan kaki.', 'nostalgia'),
  d('lagu-tiga-tahun', 'kenangan', 'Lagu tiga tahun lalu', 'Putar lagu yang paling sering kamu dengar tiga tahun lalu. Apa yang ikut kembali?', 'nostalgia', { doodle: 'gitar' }),
  d('tempat-hilang', 'kenangan', 'Tempat yang sudah tiada', 'Tempat yang dulu sering kamu datangi tapi sekarang sudah tutup atau berubah?', 'nostalgia', { doodle: 'peta' }),
  d('chat-lama', 'kenangan', 'Chat lama', 'Cari chat lama yang bikin kamu senyum. Ceritakan intinya saja.', 'nostalgia', { doodle: 'amplop' }),
  d('hidupkan-halaman', 'kenangan', 'Halaman menguning', 'Cari satu halaman yang mulai menguning, lalu hidupkan lagi dengan satu catatan.', 'nostalgia', { doodle: 'daun-kering' }),
  d('benda-kenangan', 'kenangan', 'Benda bercerita', 'Potret satu benda yang menyimpan kenangan. Biar yang lain menebak ceritanya.', 'nostalgia', { doodle: 'kado' }),
  d('foto-ulang', 'kenangan', 'Dulu dan sekarang', 'Potret ulang sesuatu yang pernah kamu foto dulu. Sudut yang sama, hari yang beda.', 'nostalgia', { doodle: 'kamera' }),
  d('hari-di-kabut', 'kenangan', 'Hari di kabut', 'Pilih satu hari yang tertutup kabut. Masih ingat apa yang terjadi hari itu?', 'nostalgia', { doodle: 'kabut' }),
  d('rasi-baru', 'kenangan', 'Rasi yang belum bernama', 'Buka Langit Lingkaran. Ada dua bintang yang ingin kamu hubungkan jadi rasi?', 'mimpi', { doodle: 'bintang' }),
  d('struk-lama', 'kenangan', 'Tiket dan struk', 'Masih menyimpan tiket, struk, atau nota lama? Potret satu dan ceritakan.', 'nostalgia', { doodle: 'tiket' }),
  d('rasa-satu-masa', 'kenangan', 'Rasa satu masa', 'Makanan yang mengingatkanmu pada satu masa hidupmu. Masa yang mana?', 'nostalgia', { doodle: 'labu' }),
  d('tulisan-tangan-lama', 'kenangan', 'Tulisanmu dulu', 'Temukan tulisan tanganmu yang lama. Bagaimana rasanya membaca dirimu dulu?', 'nostalgia', { doodle: 'buku' }),

  // — rahasia —
  d('rahasia-kecil', 'rahasia', 'Rahasia kecil', 'Hal kecil yang belum pernah kamu ceritakan ke siapa pun di sini. Kecil saja.', 'dalam', { doodle: 'segel-lilin' }),
  d('kesan-pertama', 'rahasia', 'Kesan pertama', 'Kesan pertamamu tentang salah satu dari kami. Jujur, tapi tetap baik.', 'lucu'),
  d('lagu-malu', 'rahasia', 'Lagu yang malu-malu', 'Lagu yang diam-diam kamu suka tapi malu mengakuinya?', 'lucu', { doodle: 'gitar' }),
  d('takut-sepele', 'rahasia', 'Takut yang sepele', 'Hal sepele yang diam-diam kamu takuti?', 'lucu', { doodle: 'kaktus' }),
  d('kebiasaan-sendiri', 'rahasia', 'Saat sendirian', 'Kebiasaan rahasiamu saat sendirian di kamar?', 'lucu'),
  d('kombinasi-aneh', 'rahasia', 'Kombinasi aneh', 'Kombinasi makanan aneh yang kamu suka diam-diam?', 'lucu', { doodle: 'pisang' }),
  d('doa-diam', 'rahasia', 'Doa diam-diam', 'Satu doa yang kamu simpan untuk seseorang di lingkaran ini.', 'syukur', { doodle: 'lilin' }),
  d('mimpi-belum-diucap', 'rahasia', 'Belum diucapkan', 'Mimpi yang belum pernah kamu ucapkan keras-keras?', 'mimpi', { doodle: 'bintang' }),
  d('bangga-diam', 'rahasia', 'Bangga diam-diam', 'Kapan terakhir kamu bangga pada salah satu dari kami, tapi tidak bilang?', 'syukur'),
  d('kangen-masa-lalu', 'rahasia', 'Yang dikangeni', 'Hal dari masa lalu kita yang diam-diam kamu kangeni?', 'nostalgia'),
  d('pura-pura-paham', 'rahasia', 'Pura-pura paham', 'Hal yang selama ini kamu pura-pura paham?', 'lucu'),
  d('ingin-ditanya', 'rahasia', 'Pertanyaan tertunda', 'Pertanyaan yang sudah lama ingin kamu tanyakan ke salah satu dari kami?', 'dalam'),
  d('akui-baik', 'rahasia', 'Akui saja', 'Hal baik tentang dirimu yang jarang kamu akui?', 'dalam'),
  d('rencana-diam', 'rahasia', 'Rencana diam-diam', 'Rencana kecil yang sedang kamu siapkan diam-diam?', 'mimpi', { doodle: 'peta' }),
  d('mata-basah', 'rahasia', 'Mata yang basah', 'Film, lagu, atau iklan yang terakhir bikin matamu basah?', 'dalam'),
  d('tontonan-malu', 'rahasia', 'Tontonan rahasia', 'Tontonan yang bikin kamu malu, tapi tetap kamu tonton?', 'lucu'),
  d('kata-favorit', 'rahasia', 'Kata favorit', 'Kata dalam bahasa Indonesia yang paling kamu suka bunyinya?', 'ringan', { doodle: 'buku' }),
  d('momen-terbaik', 'rahasia', 'Momen terbaik kita', 'Momen terbaik kita versimu. Mari lihat apakah kita memilih yang sama.', 'nostalgia'),
  d('tebak-jawaban', 'rahasia', 'Tebak jawabanku', 'Makanan terakhir sebelum kiamat: tulis jawabanmu dan tebakanmu untuk jawaban temanmu.', 'lucu'),
  d('satu-permintaan', 'rahasia', 'Satu permintaan', 'Kalau aku bisa mengabulkan satu permintaan kecilmu minggu ini, apa?', 'mimpi', { fit: DUO }),

  // — kartu langka —
  d('langka-hujan-pertama', 'tantangan', 'Hujan pertama', 'Hujan pertama musim ini. Rekam suaranya sepuluh detik, atau potret jendela yang basah.', 'nostalgia', { doodle: 'hujan', rare: 'hujan_pertama' }),
  d('langka-tanah-basah', 'pertanyaan', 'Bau tanah basah', 'Bau hujan pertama datang lagi. Kenangan apa yang ikut terbawa?', 'nostalgia', { doodle: 'payung', rare: 'hujan_pertama' }),
  d('langka-hari-jadi', 'pertanyaan', 'Selamat hari jadi', 'Lingkaran ini bertambah satu tahun. Satu hal yang tidak berubah sejak awal?', 'syukur', { doodle: 'pita', rare: 'hari_jadi' }),
  d('langka-surat-hari-jadi', 'tantangan', 'Surat hari jadi', 'Tulis surat pendek untuk lingkaran ini, kunci sampai hari jadi berikutnya.', 'mimpi', { doodle: 'amplop', rare: 'hari_jadi' }),
  d('langka-takbiran', 'tantangan', 'Malam takbiran', 'Rekam sepotong suara malam ini, atau ceritakan rasanya. Yang merayakan maupun yang mendengar dari jauh.', 'nostalgia', { doodle: 'bedug', rare: 'malam_takbiran' }),
  d('langka-maaf-titip', 'rahasia', 'Maaf yang dititipkan', 'Maaf kecil yang ingin kamu titipkan malam ini. Tak perlu bilang untuk siapa.', 'dalam', { doodle: 'ketupat', rare: 'malam_takbiran' }),
  d('langka-epilog', 'pertanyaan', 'Epilog', 'Halaman terakhir tahun ini. Tulis epilog satu kalimat untuk jilid kalian.', 'dalam', { doodle: 'kembang-api', rare: 'malam_tahun_baru' }),
  d('langka-tinggal-bawa', 'pertanyaan', 'Tinggal dan bawa', 'Satu hal yang kamu tinggalkan di tahun ini, satu yang kamu bawa ke tahun depan.', 'mimpi', { doodle: 'jam-pasir', rare: 'malam_tahun_baru' }),
  d('langka-dirgahayu', 'tantangan', 'Dirgahayu', 'Potret bendera, umbul-umbul, atau lomba di sekitarmu. Tidak ada? Ceritakan lomba favoritmu dulu.', 'nostalgia', { doodle: 'bendera', rare: 'tujuh_belas' }),
  d('langka-merdeka-kecil', 'pertanyaan', 'Merdeka kecil', 'Merdeka dari hal apa yang ingin kamu rayakan tahun ini? Kecil juga boleh.', 'syukur', { doodle: 'bendera', rare: 'tujuh_belas' }),
  d('langka-ulang-tahun', 'pertanyaan', 'Ada yang berulang tahun', 'Ada yang berulang tahun hari ini. Satu hal yang kamu syukuri dari dia?', 'syukur', { doodle: 'kado', rare: 'ulang_tahun' }),
  d('langka-tiup-lilin', 'rahasia', 'Tiup lilin', 'Yang berulang tahun: permintaan yang boleh dibagi? Yang lain: satu doa untuknya.', 'mimpi', { doodle: 'lilin', rare: 'ulang_tahun' }),
  d('langka-prolog', 'tantangan', 'Halaman pertama', 'Ini prolog kalian. Kenalkan dirimu lewat tiga benda yang ada di dekatmu sekarang.', 'ringan', { doodle: 'buku', rare: 'hari_pertama' }),
  d('langka-kunci-pertama', 'pertanyaan', 'Kunci pertama', 'Kenapa kamu memilih orang-orang ini untuk menyimpan harimu? Satu kalimat cukup.', 'dalam', { doodle: 'kunci', rare: 'hari_pertama' }),
  d('langka-petak-istimewa', 'kenangan', 'Petak istimewa', 'Kalian sampai di petak istimewa. Hari mana di belakang sana yang paling ingin kamu kunjungi lagi?', 'nostalgia', { doodle: 'peta', rare: 'petak_istimewa' }),
  d('langka-sejauh-ini', 'tantangan', 'Sudah sejauh ini', 'Potret jalan yang kamu lewati hari ini, tanda kalian sudah berjalan sejauh ini.', 'syukur', { doodle: 'kompas', rare: 'petak_istimewa' }),
  d('langka-purnama', 'tantangan', 'Bulan penuh', 'Malam ini purnama. Potret bulan dari kotamu, walau di foto cuma titik putih.', 'nostalgia', { doodle: 'bulan', rare: 'purnama' }),
  d('langka-pesan-bulan', 'pertanyaan', 'Titip ke bulan', 'Kalau bulan bisa menyampaikan satu pesan ke salah satu dari kami, isinya apa?', 'mimpi', { doodle: 'bintang', rare: 'purnama' }),
  d('langka-sahur', 'pertanyaan', 'Jam segini', 'Menu sahur atau camilan tengah malammu? Yang puasa maupun yang begadang, silakan.', 'lucu', { doodle: 'kurma', rare: 'ramadan' }),
  d('langka-ngabuburit', 'tantangan', 'Ngabuburit', 'Bagaimana caramu menunggu senja hari ini? Potret langitnya kalau sempat.', 'ringan', { doodle: 'lentera', rare: 'ramadan' }),
];

// ───────────────────────────── Dek Rindu ─────────────────────────────

const r = deckCard('rindu');

const RINDU_CARDS: DailyCard[] = [
  r('jarak-lagu', 'pertanyaan', 'Jarak dalam lagu', 'Kalau jarak kita diukur pakai lagu, butuh berapa lagu untuk sampai?', 'lucu', { fit: DUO, doodle: 'gitar' }),
  r('senja-dua-kota', 'tantangan', 'Senja dua kota', 'Potret senja di kotamu hari ini. Nanti kita sandingkan, senjamu dan senjaku.', 'nostalgia', { doodle: 'senja' }),
  r('hal-remeh', 'pertanyaan', 'Yang paling remeh', 'Hal paling remeh dariku yang kamu rindukan?', 'dalam', { fit: DUO }),
  r('selamat-pagi', 'tantangan', 'Selamat pagi', 'Rekam "selamat pagi" dengan suaramu. Sepuluh detik cukup.', 'ringan', { fit: DUO, doodle: 'matahari' }),
  r('pesan-untukku', 'pertanyaan', 'Satu meja', 'Kalau malam ini kita makan semeja, kamu pesankan apa untukku?', 'ringan', { fit: DUO, doodle: 'cangkir' }),
  r('hitung-mundur', 'pertanyaan', 'Hitung mundur', 'Berapa hari lagi sampai kita ketemu? Kalau belum tahu, tebak saja.', 'mimpi', { fit: DUO, doodle: 'jam-pasir' }),
  r('sudut-pandang', 'tantangan', 'Seolah aku di sana', 'Potret apa yang sedang kamu lihat, seolah aku duduk di sebelahmu.', 'ringan', { fit: DUO, doodle: 'jendela' }),
  r('jenis-rindu', 'pertanyaan', 'Rindu jenis apa', 'Rindu hari ini rindu ringan, rindu berat, atau rindu yang bikin senyum sendiri?', 'dalam'),
  r('kebiasaan-kita', 'pertanyaan', 'Kebiasaan kita', 'Kebiasaan kecil kita yang paling kamu kangeni saat berjauhan?', 'nostalgia', { fit: DUO }),
  r('surat-tiga-baris', 'tantangan', 'Surat tiga baris', 'Tulis surat tiga baris untukku. Jangan dibaca ulang, langsung segel.', 'dalam', { fit: DUO, doodle: 'amplop' }),
  r('langit-sama', 'tantangan', 'Langit yang sama', 'Potret bulan atau bintang malam ini. Langitnya tetap satu.', 'nostalgia', { doodle: 'bulan' }),
  r('terakhir-bertemu', 'kenangan', 'Terakhir bertemu', 'Buka hari terakhir kita bertemu. Ada yang tidak sempat kamu bilang waktu itu?', 'nostalgia', { fit: DUO, doodle: 'buku' }),
  r('perjalanan-pulang', 'kenangan', 'Perjalanan pulang', 'Ingat perjalanan pulang setelah pertemuan terakhir? Ceritakan satu detailnya.', 'nostalgia', { doodle: 'tiket' }),
  r('lagu-perpisahan', 'kenangan', 'Lagu di peron', 'Lagu yang kamu dengar waktu terakhir berpisah di bandara, stasiun, atau terminal?', 'nostalgia', { doodle: 'gitar' }),
  r('benda-pengingat', 'tantangan', 'Benda pengingat', 'Potret satu benda yang mengingatkanmu padaku.', 'nostalgia', { fit: DUO, doodle: 'kado' }),
  r('susah-tidur', 'rahasia', 'Susah tidur', 'Kapan terakhir kamu rindu sampai susah tidur?', 'dalam', { doodle: 'bulan' }),
  r('belum-dibilang', 'rahasia', 'Pertama kali nanti', 'Hal yang ingin kamu lakukan pertama kali saat kita ketemu, yang belum pernah kamu bilang?', 'mimpi', { fit: DUO }),
  r('syukur-jarak', 'rahasia', 'Hadiah dari jarak', 'Hal yang kamu syukuri dari jarak ini, walau berat mengakuinya?', 'syukur'),
  r('ingin-dilihat', 'pertanyaan', 'Ingin kutunjukkan', 'Bagian hariku yang paling ingin kamu lihat langsung?', 'ringan', { fit: DUO }),
  r('paket-rindu', 'pertanyaan', 'Paket rindu', 'Kalau rindu bisa dipaketkan, kamu kirim lewat apa: kilat, reguler, atau kargo?', 'lucu', { doodle: 'perangko' }),
  r('makanan-favoritku', 'tantangan', 'Makan untukku', 'Makan makanan favoritku hari ini. Potret, lalu santap dengan khidmat.', 'lucu', { fit: DUO }),
  r('tontonan-bareng', 'tantangan', 'Nonton bareng jauh', 'Tonton satu episode yang sama di jam yang sama. Tulis satu komentar.', 'ringan', { doodle: 'lampu' }),
  r('foto-buram', 'kenangan', 'Foto paling buram', 'Cari foto kita yang paling buram tapi paling berharga.', 'nostalgia', { doodle: 'kamera' }),
  r('susah-minggu-ini', 'pertanyaan', 'Paling susah', 'Apa yang paling susah dari jarak minggu ini?', 'dalam'),
  r('mudah-minggu-ini', 'pertanyaan', 'Paling mudah', 'Dan apa yang ternyata paling mudah?', 'syukur'),
  r('minggu-pagi', 'pertanyaan', 'Minggu pagi nanti', 'Seperti apa Minggu pagi kita kalau nanti tinggal sekota?', 'mimpi', { fit: DUO, doodle: 'rumah' }),
  r('tulis-nama', 'tantangan', 'Tulis namaku', 'Tulis namaku di sesuatu: embun di kaca, pasir, atau struk belanja. Potret.', 'lucu', { fit: DUO }),
  r('kesal-jadi-rindu', 'rahasia', 'Dulu kesal', 'Kebiasaanku yang dulu bikin kesal, sekarang malah kamu rindukan?', 'lucu', { fit: DUO }),
  r('jalan-kotamu', 'pertanyaan', 'Jalan di kotamu', 'Jalan atau tempat di kotamu yang ingin kamu tunjukkan padaku?', 'mimpi', { doodle: 'peta' }),
  r('cuaca-kotamu', 'tantangan', 'Cuaca kotamu', 'Rekam suara hujan, angin, atau jalanan di kotamu. Biar aku tahu cuacamu.', 'ringan', { doodle: 'hujan' }),
  r('kata-telepon', 'pertanyaan', 'Kata di telepon', 'Kata apa yang paling sering kita ucapkan di telepon?', 'lucu', { fit: DUO }),
  r('chat-pertama', 'kenangan', 'Chat pertama', 'Buka chat pertama kita. Siapa yang menyapa duluan, dan apa isinya?', 'nostalgia', { fit: DUO, doodle: 'amplop' }),
  r('rindu-minggu-ini', 'pertanyaan', 'Rindu minggu ini', 'Siapa yang paling kamu rindukan minggu ini, dan apa yang ingin kamu ceritakan padanya?', 'dalam'),
  r('tak-bisa-ditemui', 'pertanyaan', 'Yang tak bisa ditemui', 'Rindu pada seseorang yang sudah tak bisa ditemui? Tulis satu hal tentang dia.', 'dalam', { doodle: 'lilin' }),
  r('jam-telepon', 'tantangan', 'Jam kita', 'Potret langit di jam kita biasanya bertelepon.', 'nostalgia', { fit: DUO, doodle: 'bintang' }),
  r('hari-sering-dibuka', 'kenangan', 'Hari yang sering dibuka', 'Hari mana di arsip kita yang paling sering kamu buka saat rindu?', 'nostalgia', { doodle: 'surat-botol' }),
];

// ──────────────────────────── Dek Perantau ────────────────────────────

const p = deckCard('perantau');

const PERANTAU_CARDS: DailyCard[] = [
  p('hari-tiba', 'kenangan', 'Hari pertama tiba', 'Ingat hari pertama tiba di kota ini? Apa yang pertama kali kamu beli?', 'nostalgia', { doodle: 'tiket' }),
  p('masakan-asal', 'pertanyaan', 'Belum ada tandingan', 'Masakan dari daerah asalmu yang belum ketemu tandingannya di sini?', 'nostalgia', { doodle: 'labu' }),
  p('kata-daerah', 'pertanyaan', 'Kata dari rumah', 'Kata dari bahasa daerahmu yang tidak ada padanannya dalam bahasa Indonesia?', 'ringan', { doodle: 'buku' }),
  p('warung-langganan', 'tantangan', 'Warung langganan', 'Potret warung langgananmu. Kenalkan dia pada kami.', 'syukur', { doodle: 'rumah' }),
  p('tokoh-kos', 'pertanyaan', 'Tokoh kos', 'Tokoh paling berkesan di kos atau kontrakanmu: ibu kos, penjaga, atau kucing penghuni tetap?', 'lucu', { doodle: 'kucing' }),
  p('kiriman-jauh', 'pertanyaan', 'Kiriman dari jauh', 'Kiriman paling berharga yang pernah kamu terima selama merantau?', 'syukur', { doodle: 'kado' }),
  p('bau-asal', 'pertanyaan', 'Bau tempat asal', 'Bau apa yang langsung membuatmu ingat tempat asal?', 'nostalgia'),
  p('tanggal-tua', 'pertanyaan', 'Menu tanggal tua', 'Menu andalanmu saat tanggal tua? Tidak ada yang menghakimi di sini.', 'lucu'),
  p('jalan-pulang', 'tantangan', 'Jalan pulang', 'Potret jalan yang setiap hari kamu lewati untuk pulang.', 'ringan', { doodle: 'peta' }),
  p('kabar-asal', 'pertanyaan', 'Kabar ke asal', 'Siapa di tempat asalmu yang paling sering kamu kabari? Kalau tidak ada, siapa yang ingin kamu kabari?', 'dalam'),
  p('tak-disangka', 'pertanyaan', 'Tak disangka', 'Hal tentang kota ini yang tidak kamu sangka sebelum pindah?', 'lucu'),
  p('teman-pertama', 'pertanyaan', 'Teman pertama', 'Siapa teman pertamamu di kota ini? Masih berkabar?', 'nostalgia'),
  p('saat-pulang', 'pertanyaan', 'Saat pulang nanti', 'Kalau nanti pulang, hal pertama yang ingin kamu lakukan?', 'mimpi', { doodle: 'rumah' }),
  p('dua-rumah', 'pertanyaan', 'Dua rumah', 'Sekarang "rumah" buatmu yang mana: tempat asal, tempat sekarang, atau dua-duanya?', 'dalam', { doodle: 'kompas' }),
  p('masak-asal', 'tantangan', 'Masak dari ingatan', 'Masak satu menu dari tempat asal, seadanya. Potret hasilnya, berhasil atau tidak.', 'lucu'),
  p('benda-berjasa', 'pertanyaan', 'Benda paling berjasa', 'Benda paling berjasa di kamarmu? Rice cooker, kipas angin, atau colokan T?', 'lucu'),
  p('berubah-merantau', 'pertanyaan', 'Sejak merantau', 'Sudah berapa lama kamu merantau? Apa yang paling berubah darimu?', 'dalam', { doodle: 'jam-pasir' }),
  p('pintu-kamar', 'tantangan', 'Dari pintu kamar', 'Potret pemandangan dari jendela atau pintu kamarmu pagi ini.', 'ringan', { doodle: 'jendela' }),
  p('hampir-pulang', 'rahasia', 'Hampir menyerah', 'Momen di perantauan saat kamu hampir menyerah dan ingin pulang saja?', 'dalam'),
  p('biar-tak-khawatir', 'rahasia', 'Biar tak khawatir', 'Hal kecil yang tidak kamu ceritakan ke orang di rumah, supaya mereka tidak khawatir?', 'dalam'),
  p('baru-pindah', 'kenangan', 'Waktu baru pindah', 'Buka hari-hari awal kamu pindah. Apa yang ingin kamu bilang ke dirimu waktu itu?', 'nostalgia', { doodle: 'surat-botol' }),
  p('coba-daerah-lain', 'tantangan', 'Cicip daerah lain', 'Cari makanan khas daerah lain di kotamu dan cobain. Laporkan hasilnya.', 'lucu'),
  p('ajak-berkunjung', 'pertanyaan', 'Kalau mereka datang', 'Kalau orang yang kamu sayang datang berkunjung, kamu ajak ke mana dulu?', 'mimpi'),
  p('lagu-asal', 'pertanyaan', 'Lagu dari asal', 'Lagu yang selalu bikin kamu ingat tempat asal?', 'nostalgia', { doodle: 'gitar' }),
  p('salah-zona', 'pertanyaan', 'Salah zona waktu', 'Pernah salah hitung jam gara-gara beda WIB, WITA, WIT? Ceritakan.', 'lucu', { doodle: 'jam-pasir' }),
  p('suara-kota', 'tantangan', 'Suara kota rantau', 'Rekam sepuluh detik suara kota tempatmu merantau.', 'ringan'),
  p('skill-rantau', 'pertanyaan', 'Ilmu perantau', 'Keahlian baru gara-gara merantau? Menawar, mencuci, hafal rute angkot…', 'lucu'),
  p('tidak-sendirian', 'pertanyaan', 'Tidak sendirian', 'Siapa di kota ini yang membuatmu merasa tidak sendirian?', 'syukur'),
  p('hari-raya-jauh', 'kenangan', 'Hari raya pertama jauh', 'Ingat hari raya pertama yang kamu lewati jauh dari tempat asal?', 'nostalgia', { doodle: 'ketupat' }),
  p('resep-perantau', 'tantangan', 'Resep perantau', 'Tulis tangan resep andalan perantau versimu, lalu potret.', 'lucu', { doodle: 'pena' }),
  p('rindukan-kota-ini', 'pertanyaan', 'Kalau suatu hari pergi', 'Kalau suatu hari kamu pindah lagi, apa yang akan kamu rindukan dari kota ini?', 'mimpi'),
  p('mi-instan', 'rahasia', 'Hitungan mi instan', 'Berapa kali seminggu kamu makan mi instan? Jujur, ini rahasia.', 'lucu'),
  p('belajar-sendiri', 'pertanyaan', 'Hidup sendiri', 'Apa yang kamu pelajari tentang dirimu karena hidup sendiri?', 'dalam'),
  p('rapikan-sudut', 'tantangan', 'Satu sudut rapi', 'Rapikan satu sudut kamar, lalu potret. Kamar rapi, kepala ikut lega.', 'ringan'),
  p('terasa-rumah', 'pertanyaan', 'Biar terasa rumah', 'Hal kecil yang membuat kamar sewaanmu terasa seperti rumah?', 'syukur', { doodle: 'lampu' }),
  p('barang-dari-asal', 'kenangan', 'Dibawa dari asal', 'Potret barang yang kamu bawa dari tempat asal dan masih ada sampai sekarang.', 'nostalgia', { doodle: 'kunci' }),
];

// ──────────────────────────── Dek Ramadan ────────────────────────────

const m = deckCard('ramadan');

const RAMADAN_CARDS: DailyCard[] = [
  m('menu-sahur', 'pertanyaan', 'Menu sahur', 'Menu sahur atau sarapanmu hari ini? Seadanya juga cerita.', 'ringan', { doodle: 'kurma' }),
  m('langit-buka', 'tantangan', 'Langit menunggu', 'Potret langit menjelang magrib di kotamu.', 'nostalgia', { doodle: 'senja' }),
  m('takjil', 'pertanyaan', 'Takjil incaran', 'Takjil paling dicari di dekatmu? Kolak, es buah, gorengan, atau kurma?', 'ringan', { doodle: 'kurma' }),
  m('pembangun-sahur', 'pertanyaan', 'Pembangun sahur', 'Siapa pembangun sahur di tempatmu? Kentongan, toa masjid, alarm, atau tetangga?', 'lucu', { doodle: 'bedug' }),
  m('bukber-berkesan', 'pertanyaan', 'Bukber berkesan', 'Buka bersama paling berkesan yang pernah kamu ikuti?', 'nostalgia'),
  m('cara-menemani', 'pertanyaan', 'Cara menemani', 'Yang tidak berpuasa: hal kecil apa yang kamu lakukan untuk menemani yang berpuasa?', 'syukur', { doodle: 'cangkir' }),
  m('malam-ramadan-kecil', 'pertanyaan', 'Malam Ramadan dulu', 'Kenangan malam Ramadan waktu kecil? Tarawih, main petasan, atau sekadar suasananya.', 'nostalgia', { doodle: 'masjid-kecil' }),
  m('godaan-terberat', 'pertanyaan', 'Jam rawan', 'Jam berapa godaan paling berat datang hari ini?', 'lucu', { doodle: 'jam-pasir' }),
  m('tegukan-pertama', 'tantangan', 'Tegukan pertama', 'Potret takjil atau minuman pertama yang kamu cicipi sore ini.', 'syukur'),
  m('melatih-sabar', 'pertanyaan', 'Latihan sabar', 'Hal yang paling melatih sabarmu hari ini?', 'dalam'),
  m('dibagi', 'pertanyaan', 'Yang dibagi', 'Hal kecil yang kamu bagi hari ini: makanan, waktu, atau senyum?', 'syukur'),
  m('ramadan-diingat', 'kenangan', 'Ramadan yang diingat', 'Ramadan mana yang paling kamu ingat, dan kenapa?', 'nostalgia', { doodle: 'bulan' }),
  m('lewat-sahur', 'rahasia', 'Lewat sahur', 'Pernah ketiduran sampai lewat sahur? Ceritakan, di sini aman.', 'lucu'),
  m('doa-diulang', 'rahasia', 'Doa yang diulang', 'Doa yang kamu ulang-ulang bulan ini, kalau boleh dibagi?', 'dalam', { doodle: 'lilin' }),
  m('masakan-seseorang', 'pertanyaan', 'Rasa seseorang', 'Masakan berbuka yang selalu mengingatkanmu pada seseorang?', 'nostalgia'),
  m('suara-magrib', 'tantangan', 'Menjelang magrib', 'Rekam sepuluh detik suara menjelang magrib di sekitarmu.', 'nostalgia', { doodle: 'masjid-kecil' }),
  m('kurangi-tambah', 'pertanyaan', 'Kurangi dan tambah', 'Satu hal yang ingin kamu kurangi bulan ini, dan satu yang ingin kamu tambah?', 'dalam'),
  m('lentera-malam', 'tantangan', 'Cahaya malam', 'Potret satu lampu, lentera, atau lampion di sekitarmu malam ini.', 'ringan', { doodle: 'lentera' }),
  m('buka-dengan-siapa', 'pertanyaan', 'Semeja malam ini', 'Kalau bisa berbuka bersama siapa saja malam ini, siapa yang kamu ajak?', 'mimpi'),
  m('lapar-mata', 'pertanyaan', 'Lapar mata', 'Belanja takjil "lapar mata" paling parah yang pernah kamu lakukan?', 'lucu'),
  m('air-putih', 'tantangan', 'Hitung gelas', 'Berapa gelas air putih sejak berbuka? Potret gelas berikutnya.', 'lucu'),
  m('ramadan-lalu', 'kenangan', 'Ramadan lalu', 'Buka kapsul Ramadan tahun lalu kalau ada. Apa yang sama, apa yang beda?', 'nostalgia', { doodle: 'buku' }),
  m('kebaikan-diterima', 'pertanyaan', 'Kebaikan hari ini', 'Satu kebaikan dari orang lain yang kamu terima hari ini?', 'syukur'),
  m('bagi-takjil', 'tantangan', 'Bagi takjil', 'Beli atau buat satu takjil lebih untuk dibagi. Ceritakan senyum yang kamu dapat.', 'syukur', { doodle: 'kado' }),
  m('lagu-ramadan', 'pertanyaan', 'Lagu Ramadan', 'Lagu Ramadan yang selalu terputar di kepala tiap tahun?', 'nostalgia', { doodle: 'gitar' }),
  m('syukur-sejauh-ini', 'pertanyaan', 'Sejauh ini', 'Apa yang paling kamu syukuri dari Ramadan sejauh ini?', 'syukur'),
  m('suasana-sahur', 'pertanyaan', 'Suasana sahur', 'Sahur sendiri atau ramai-ramai? Ceritakan suasananya.', 'ringan'),
  m('buka-di-kos', 'pertanyaan', 'Buka di kos', 'Yang merantau: berbuka sendiri di kos rasanya seperti apa? Menu apa yang jadi penghibur?', 'dalam'),
  m('meja-buka', 'tantangan', 'Meja buka', 'Potret meja atau alas makan berbukamu malam ini, apa adanya.', 'ringan'),
  m('rindu-ramadan-asal', 'rahasia', 'Ramadan di asal', 'Hal yang paling kamu rindukan dari Ramadan di tempat asal?', 'nostalgia'),
  m('paling-tenang', 'pertanyaan', 'Paling tenang', 'Momen paling tenang hari ini?', 'dalam', { doodle: 'bulan' }),
  m('telat-bukber', 'pertanyaan', 'Pasti telat', 'Kalau kita bukber bareng, siapa yang pasti datang paling telat?', 'lucu', { fit: GRUP }),
  m('rencana-lebaran', 'pertanyaan', 'Rencana kecil', 'Rencana kecil untuk Lebaran nanti, kalau ada?', 'mimpi', { doodle: 'ketupat' }),
  m('simpan-sampai-lebaran', 'tantangan', 'Simpan sampai Lebaran', 'Tulis satu kalimat maaf atau terima kasih, kunci di Kapsul Waktu sampai hari Lebaran.', 'dalam', { doodle: 'segel-lilin' }),
  m('baju-lebaran-kecil', 'kenangan', 'Baju Lebaran dulu', 'Baju hari raya zaman kecil yang paling kamu ingat? Atau baju kesayangan dari masa itu.', 'nostalgia'),
  m('malam-terakhir', 'pertanyaan', 'Malam-malam terakhir', 'Malam-malam terakhir Ramadan ini kamu isi dengan apa? Ibadah, begadang kerja, atau tidur cepat?', 'ringan', { doodle: 'bintang' }),
];

// ───────────────────── Dek Patah Hati yang Pulih ─────────────────────
// Lembut, pelan, tidak pernah mengejek. Patah hati bisa karena putus,
// persahabatan yang berakhir, atau mimpi yang tidak jadi.

const h = deckCard('pulih');

const PULIH_CARDS: DailyCard[] = [
  h('berhasil-hari-ini', 'pertanyaan', 'Yang berhasil', 'Apa yang berhasil kamu lakukan hari ini? Bangun dan minum air juga terhitung.', 'syukur', { doodle: 'tunas' }),
  h('untuk-diri', 'pertanyaan', 'Satu untukmu', 'Satu hal kecil yang hari ini kamu lakukan untuk dirimu sendiri?', 'syukur'),
  h('lagu-penemani', 'pertanyaan', 'Lagu penemani', 'Lagu yang menemanimu belakangan ini. Sedih atau semangat, dua-duanya boleh.', 'ringan', { doodle: 'gitar' }),
  h('langit-tak-menuntut', 'tantangan', 'Langit sebentar', 'Keluar sebentar dan potret langit. Langit tidak menuntut apa-apa.', 'dalam', { doodle: 'awan' }),
  h('ubah-kamar', 'tantangan', 'Geser sedikit', 'Ubah satu hal kecil di kamarmu: letak bantal, sprei, atau tanaman. Potret sesudahnya.', 'ringan'),
  h('yang-menemani', 'pertanyaan', 'Yang menemani', 'Siapa yang menemanimu minggu ini, walau mungkin dia tidak tahu?', 'syukur'),
  h('dulu-ditunda', 'pertanyaan', 'Yang dulu ditunda', 'Hal yang dulu kamu tunda, dan sekarang bisa kamu lakukan?', 'mimpi', { doodle: 'sepeda' }),
  h('ditemukan-kembali', 'pertanyaan', 'Ditemukan kembali', 'Bagian dirimu yang sedang kamu temukan kembali?', 'dalam', { doodle: 'kompas' }),
  h('tawa-lepas', 'kenangan', 'Tawa lepas', 'Buka satu hari lama saat kamu tertawa lepas. Tawa itu masih milikmu.', 'nostalgia', { doodle: 'matahari' }),
  h('makan-hangat', 'tantangan', 'Sesuatu yang hangat', 'Makan atau minum sesuatu yang hangat hari ini. Potret, tanda kamu merawat dirimu.', 'syukur', { doodle: 'cangkir' }),
  h('seberapa-berat', 'pertanyaan', 'Seberapa berat', 'Hari ini rasanya seberat apa? Pilih satu benda untuk menggambarkannya. Tak perlu dijelaskan.', 'dalam'),
  h('syukur-diri', 'pertanyaan', 'Dari dirimu', 'Hal yang kamu syukuri dari dirimu, justru di masa sulit ini?', 'syukur'),
  h('tak-dikirim', 'rahasia', 'Tidak dikirim', 'Kalimat yang ingin kamu sampaikan, tapi memilih untuk tidak. Tulis di sini, lalu biarkan.', 'dalam', { doodle: 'surat-botol' }),
  h('akan-baik', 'rahasia', 'Akan baik-baik saja', 'Kapan pertama kali kamu merasa, "aku akan baik-baik saja"?', 'dalam', { doodle: 'pelangi' }),
  h('paling-sabar', 'pertanyaan', 'Pendengar sabar', 'Siapa yang paling sabar mendengarkanmu? Titipkan satu peluk untuknya lewat kapsul.', 'syukur'),
  h('jalan-tanpa-tujuan', 'tantangan', 'Tanpa tujuan', 'Jalan kaki sepuluh menit tanpa tujuan. Ceritakan satu hal yang kamu lihat.', 'ringan', { doodle: 'peta' }),
  h('kebiasaan-baru', 'pertanyaan', 'Hanya untukmu', 'Kebiasaan baru yang ingin kamu mulai, hanya untukmu?', 'mimpi'),
  h('tertawa-sebentar', 'pertanyaan', 'Tertawa sebentar', 'Hal yang bikin kamu tertawa hari ini, walau sebentar?', 'lucu'),
  h('lagu-sebelumnya', 'kenangan', 'Lagu sebelumnya', 'Lagu yang dulu kamu suka sebelum lagu-lagu sedih datang. Mau diputar lagi?', 'nostalgia', { doodle: 'gitar' }),
  h('kata-untuk-sahabat', 'pertanyaan', 'Seperti ke sahabat', 'Kalau sahabatmu mengalami hal yang sama, apa yang kamu bilang padanya? Sekarang bilang itu ke dirimu.', 'dalam'),
  h('tulis-lepas', 'tantangan', 'Tulis lalu lepas', 'Tulis satu hal yang ingin kamu lepaskan di kertas. Robek, buang, atau simpan. Terserah kamu.', 'dalam', { doodle: 'dandelion' }),
  h('terasa-aman', 'pertanyaan', 'Terasa aman', 'Hal apa yang membuatmu merasa sedikit lebih aman belakangan ini?', 'dalam', { doodle: 'payung' }),
  h('lebih-ringan', 'pertanyaan', 'Sedikit lebih ringan', 'Hal yang dulu berat, sekarang terasa sedikit lebih ringan?', 'syukur', { doodle: 'kupu-kupu' }),
  h('foto-istirahat', 'tantangan', 'Foto yang istirahat', 'Pindahkan beberapa foto ke album tersembunyi. Tidak perlu dihapus, cukup diistirahatkan.', 'dalam'),
  h('setahun-lagi', 'pertanyaan', 'Kamu setahun lagi', 'Kamu yang setahun lagi, kira-kira sedang menertawakan apa?', 'mimpi'),
  h('butuh-malam-ini', 'pertanyaan', 'Malam ini', 'Yang kamu butuhkan malam ini: ditemani, didengar, atau dibiarkan tenang?', 'dalam', { doodle: 'bulan' }),
  h('pelajaran-sayang', 'pertanyaan', 'Yang ingin diingat', 'Hal yang kamu pelajari tentang menyayangi orang, yang ingin kamu ingat?', 'dalam'),
  h('mandi-hangat', 'tantangan', 'Mandi dan ganti baju', 'Mandi air hangat, pakai baju paling nyaman. Laporkan: sudah.', 'ringan'),
  h('mulai-disukai', 'rahasia', 'Mulai suka lagi', 'Hal kecil dari dirimu yang mulai kamu sukai lagi?', 'syukur', { doodle: 'bunga-matahari' }),
  h('akhir-pekan-sendiri', 'pertanyaan', 'Akhir pekan untukmu', 'Rencana kecil untuk akhir pekan ini, untuk dirimu saja?', 'mimpi'),
  h('milikmu-sejak-dulu', 'kenangan', 'Milikmu sejak dulu', 'Potret sesuatu yang sudah kamu miliki jauh sebelum semua ini terjadi.', 'nostalgia', { doodle: 'rak-buku' }),
  h('kalimat-pegangan', 'pertanyaan', 'Pegangan minggu ini', 'Kalimat yang ingin kamu pegang minggu ini?', 'dalam', { doodle: 'pena' }),
  h('tetap-ada', 'pertanyaan', 'Yang tetap ada', 'Siapa yang tetap ada? Tulis namanya saja.', 'syukur', { doodle: 'lilin' }),
  h('makanan-favorit', 'tantangan', 'Traktir diri', 'Masak atau beli makanan favoritmu yang dulu jarang kamu pesan.', 'syukur'),
  h('dimaafkan', 'pertanyaan', 'Yang dimaafkan', 'Satu hal yang hari ini kamu maafkan dari dirimu?', 'dalam'),
  h('tontonan-penghibur', 'pertanyaan', 'Tontonan penghibur', 'Tontonan penghibur andalan saat hati sedang remuk?', 'ringan', { doodle: 'lampu' }),
];

// ─────────────────────────── Dek Orang Tua Baru ───────────────────────────
// Untuk siapa pun yang baru merawat anak: melahirkan, mengadopsi, mengasuh,
// sendiri maupun bersama. Tidak menanyakan wajah anak; detail kecil sudah cukup.

const o = deckCard('ortu');

const ORTU_CARDS: DailyCard[] = [
  o('jam-tidur', 'pertanyaan', 'Jam tidur', 'Berapa jam tidurmu semalam? Dibulatkan ke atas juga boleh.', 'lucu', { doodle: 'bulan' }),
  o('detail-kecil', 'tantangan', 'Detail kecil', 'Potret satu detail kecil si kecil hari ini: jari, kaki, rambut. Tanpa wajah juga indah.', 'syukur', { doodle: 'kamera' }),
  o('pertama-kali', 'pertanyaan', 'Pertama kali', 'Hal "pertama kali" apa yang terjadi hari ini? Untuknya atau untukmu.', 'syukur', { doodle: 'tunas' }),
  o('lagu-ampuh', 'pertanyaan', 'Lagu ampuh', 'Lagu yang paling ampuh membuat si kecil tenang? Atau yang membuatmu tenang.', 'ringan', { doodle: 'gitar' }),
  o('kopi-hangat', 'pertanyaan', 'Selagi hangat', 'Hari ini sempat minum kopi atau teh selagi hangat?', 'lucu', { doodle: 'cangkir' }),
  o('yang-membantu', 'pertanyaan', 'Yang membantu', 'Siapa yang membantu hari ini, sekecil apa pun? Titipkan terima kasih.', 'syukur'),
  o('rasa-dominan', 'pertanyaan', 'Hari ini lebih banyak', 'Hari ini lebih banyak capeknya, harunya, atau bingungnya?', 'dalam'),
  o('suara-kecil', 'tantangan', 'Suara kecil', 'Rekam sepuluh detik suara si kecil: tertawa, mengoceh, atau protes.', 'syukur'),
  o('hari-bertemu', 'kenangan', 'Hari bertemu', 'Buka hari pertama kamu bertemu si kecil. Apa yang paling jelas kamu ingat?', 'nostalgia', { doodle: 'kado' }),
  o('tidak-tahu', 'rahasia', 'Aku tidak tahu', 'Momen saat kamu merasa "aku tidak tahu sedang apa", dan ternyata lewat juga?', 'lucu'),
  o('rindu-sebelum', 'rahasia', 'Hidup sebelumnya', 'Hal kecil yang diam-diam kamu rindukan dari hidup sebelum si kecil datang? Boleh, kok.', 'dalam'),
  o('benda-berjasa', 'pertanyaan', 'Paling berjasa', 'Benda paling berjasa minggu ini? Gendongan, termos, atau suara kipas angin?', 'lucu'),
  o('ekspresi', 'pertanyaan', 'Ekspresi hari ini', 'Ekspresi si kecil hari ini mirip apa? Tokoh kartun, kakek galak, atau kucing kaget?', 'lucu', { doodle: 'kucing' }),
  o('tumpukan-cucian', 'tantangan', 'Karya kontemporer', 'Potret tumpukan cucian kecil hari ini. Anggap saja karya seni kontemporer.', 'lucu'),
  o('tentang-diri', 'pertanyaan', 'Tentang dirimu', 'Hal yang kamu pelajari tentang dirimu sejak mulai merawat si kecil?', 'dalam'),
  o('yang-merawat-bersama', 'pertanyaan', 'Teman merawat', 'Kalau ada yang merawat bersamamu, satu hal yang ingin kamu ucapkan padanya?', 'syukur', { doodle: 'amplop' }),
  o('lima-menit', 'tantangan', 'Lima menitmu', 'Ambil lima menit untuk dirimu sendiri. Ceritakan lima menit itu kamu pakai untuk apa.', 'ringan', { doodle: 'jam-pasir' }),
  o('lagu-dikenalkan', 'pertanyaan', 'Lagu untuk nanti', 'Lagu yang ingin kamu kenalkan pada si kecil suatu hari nanti?', 'mimpi', { doodle: 'gitar' }),
  o('harapan-kecil', 'pertanyaan', 'Harapan kecil', 'Satu harapan kecil untuk si kecil hari ini?', 'syukur', { doodle: 'bintang' }),
  o('kekecilan', 'kenangan', 'Sudah kekecilan', 'Potret satu barang si kecil yang sudah kekecilan. Disimpan atau direlakan?', 'nostalgia'),
  o('nasihat', 'pertanyaan', 'Nasihat ajaib', 'Nasihat paling berguna yang pernah kamu terima? Dan yang paling ajaib?', 'lucu'),
  o('surat-untuk-nanti', 'tantangan', 'Surat untuk nanti', 'Tulis surat tiga baris untuk si kecil, kunci di Kapsul Waktu sampai ia besar.', 'mimpi', { doodle: 'segel-lilin' }),
  o('jam-tenang', 'pertanyaan', 'Jam paling tenang', 'Jam berapa momen paling tenang hari ini?', 'ringan', { doodle: 'lampu' }),
  o('makan-satu-tangan', 'pertanyaan', 'Satu tangan', 'Makan apa hari ini? Dengan dua tangan, atau satu tangan sambil menggendong?', 'lucu'),
  o('takut-disimpan', 'rahasia', 'Takut yang disimpan', 'Satu kekhawatiran tentang merawat si kecil yang ingin kamu titipkan di sini?', 'dalam'),
  o('hal-lucu', 'pertanyaan', 'Ulah hari ini', 'Hal lucu yang dilakukan si kecil hari ini?', 'lucu'),
  o('sebulan-lalu', 'kenangan', 'Sebulan lalu', 'Buka kapsul sebulan lalu. Apa yang sudah berubah dari si kecil? Dari kamu?', 'nostalgia', { doodle: 'buku' }),
  o('ingin-diingat', 'pertanyaan', 'Ingin diingat', 'Hal dari fase ini yang ingin kamu ingat, padahal sekarang terasa melelahkan?', 'dalam'),
  o('tangan-berdampingan', 'tantangan', 'Dua tangan', 'Potret tanganmu dan tangan si kecil, berdampingan.', 'syukur'),
  o('bantuan-dibutuhkan', 'pertanyaan', 'Bantuan yang pas', 'Kalau ada teman yang mau membantu, bantuan apa yang paling kamu butuhkan minggu ini?', 'dalam', { fit: ['semua'] }),
  o('panggilan-sayang', 'pertanyaan', 'Panggilan sayang', 'Nama panggilan sayang untuk si kecil yang paling aneh?', 'lucu'),
  o('bangga-diri', 'pertanyaan', 'Bangga pada diri', 'Satu hal yang kamu banggakan dari dirimu minggu ini?', 'syukur'),
  o('hirup-udara', 'tantangan', 'Hirup udara', 'Keluar sebentar, hirup udara, potret langit. Si kecil boleh ikut.', 'ringan', { doodle: 'awan' }),
  o('tradisi-baru', 'pertanyaan', 'Tradisi versi kalian', 'Tradisi kecil versi kalian sendiri yang ingin kamu mulai?', 'mimpi', { doodle: 'rumah' }),
  o('sudut-rumah', 'kenangan', 'Sudut yang diingat', 'Potret satu sudut rumah hari ini yang kelak ingin kamu ingat.', 'nostalgia', { doodle: 'jendela' }),
];

export const DECKS: Deck[] = [
  {
    id: 'dasar',
    name: 'Dek Dasar',
    description: 'Kartu pagi untuk hari apa saja: pertanyaan, tantangan kecil, kenangan, dan rahasia yang terbuka berdua.',
    priceIdr: 0,
    doodle: 'kartu',
    cards: DASAR_CARDS,
  },
  {
    id: 'rindu',
    name: 'Dek Rindu',
    description: 'Untuk yang sedang berjauhan. Senja beda kota, suara selamat pagi, dan hitung mundur menuju bertemu.',
    priceIdr: 19000,
    doodle: 'surat-botol',
    cards: RINDU_CARDS,
  },
  {
    id: 'perantau',
    name: 'Dek Perantau',
    description: 'Kos, warung langganan, menu tanggal tua, dan dua rumah yang sama-sama kamu sayangi.',
    priceIdr: 19000,
    doodle: 'tiket',
    cards: PERANTAU_CARDS,
  },
  {
    id: 'ramadan',
    name: 'Dek Ramadan',
    description: 'Tiga puluh hari sahur, ngabuburit, dan takjil. Untuk yang berpuasa maupun yang menemani.',
    priceIdr: 15000,
    doodle: 'lentera',
    cards: RAMADAN_CARDS,
  },
  {
    id: 'patah-hati-pulih',
    name: 'Dek Patah Hati yang Pulih',
    description: 'Kartu pelan untuk hari-hari setelah sesuatu berakhir. Tidak ada yang perlu diburu-buru.',
    priceIdr: 19000,
    doodle: 'tunas',
    cards: PULIH_CARDS,
  },
  {
    id: 'orang-tua-baru',
    name: 'Dek Orang Tua Baru',
    description: 'Untuk siapa pun yang baru merawat si kecil. Kurang tidur, banyak haru, dan cucian yang tak ada habisnya.',
    priceIdr: 25000,
    doodle: 'rumah',
    cards: ORTU_CARDS,
  },
];
