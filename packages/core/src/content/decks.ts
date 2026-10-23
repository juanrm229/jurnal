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
  r('mudah-minggu-ini', 'pertanyaan', 'Paling mudah', 'Apa yang ternyata paling mudah dari jarak minggu ini?', 'syukur'),
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

/** Bungkus `deckCard` supaya semua kartu di satu dek memakai `fit` yang sama. */
const withFit =
  (make: ReturnType<typeof deckCard>, fit: CircleFit[]) =>
  (slug: string, kind: CardKind, title: string, body: string, tone: Tone, opts: CardOpts = {}): DailyCard =>
    make(slug, kind, title, body, tone, { fit, ...opts });

// ─────────────────────────── Dek Renungan Dalam ───────────────────────────
// Pertanyaan yang bikin orang berhenti sebentar. Bukan kata mutiara, bukan
// sesi konseling: cukup satu pertanyaan jujur yang tidak bisa dijawab asal.

const rn = deckCard('renung');

const RENUNG_CARDS: DailyCard[] = [
  rn('sepuluh-tahun-lalu', 'pertanyaan', 'Sepuluh tahun lalu', 'Kamu sepuluh tahun lalu akan kaget melihat apa dari hidupmu sekarang? Kaget senang atau kaget sedih?', 'dalam', { doodle: 'jam-pasir' }),
  rn('belum-dimaafkan', 'rahasia', 'Belum dimaafkan', 'Satu hal yang belum bisa kamu maafkan. Dari orang lain, atau dari dirimu sendiri?', 'dalam', { doodle: 'segel-lilin' }),
  rn('pelan-berubah', 'pertanyaan', 'Pelan-pelan berubah', 'Pendapat yang dulu kamu pegang erat, lalu berubah tanpa kamu sadari kapan persisnya?', 'dalam'),
  rn('ke-mana-jamnya', 'pertanyaan', 'Ke mana jamnya pergi', 'Kalau jam-jammu minggu ini dihitung, paling banyak ke mana perginya? Kamu setuju dengan pilihan itu?', 'dalam', { doodle: 'jam-pasir' }),
  rn('takut-sebenarnya', 'rahasia', 'Takut yang sebenarnya', 'Di balik takut yang sering kamu sebut, biasanya ada takut lain yang lebih jujur. Apa itu?', 'dalam'),
  rn('pujian-meleset', 'pertanyaan', 'Pujian yang meleset', 'Pujian yang sering kamu terima, tapi rasanya kurang tepat. Di mana melesetnya?', 'dalam'),
  rn('sedang-menjadi', 'pertanyaan', 'Sedang menjadi', 'Pelan-pelan, kamu sedang menjadi orang seperti apa? Satu sifat saja.', 'mimpi', { doodle: 'tunas' }),
  rn('warisan-kecil', 'pertanyaan', 'Warisan kecil', 'Kebiasaan kecil orang tua atau pengasuhmu yang ternyata ikut kamu bawa, mau tidak mau?', 'nostalgia'),
  rn('tak-ada-yang-lihat', 'pertanyaan', 'Tak ada yang melihat', 'Kalau tidak ada yang akan pernah tahu, apa yang akan kamu kerjakan dengan tahun ini?', 'mimpi'),
  rn('debat-kepala', 'pertanyaan', 'Debat dalam kepala', 'Debat apa yang paling sering terjadi di kepalamu belakangan ini? Siapa yang biasanya menang?', 'dalam'),
  rn('rasa-cukup', 'pertanyaan', 'Seperti apa cukup', 'Untuk satu hal yang terus kamu kejar: seperti apa rasanya "cukup"? Pernah kamu bayangkan?', 'dalam'),
  rn('hilang-tanpa-pamit', 'kenangan', 'Hilang tanpa pamit', 'Teman, hobi, atau tempat yang hilang dari hidupmu tanpa pamit. Kapan kamu sadar ia sudah tidak ada?', 'nostalgia', { doodle: 'daun-kering' }),
  rn('diingat-karena', 'pertanyaan', 'Diingat karena', 'Bukan prestasi, tapi kebiasaan: kamu ingin diingat orang karena kebiasaan apa?', 'dalam', { doodle: 'lilin' }),
  rn('tidak-menyesal', 'pertanyaan', 'Tidak menyesal', 'Keputusan yang dulu dianggap salah oleh orang lain, tapi sampai sekarang tidak kamu sesali?', 'syukur'),
  rn('hari-biasa', 'kenangan', 'Hari biasa terbaik', 'Hari biasa, tanpa acara apa-apa, yang entah kenapa masih kamu ingat sampai sekarang?', 'nostalgia'),
  rn('mengalah-menyerah', 'pertanyaan', 'Mengalah atau menyerah', 'Hal terakhir yang kamu lepaskan: itu mengalah atau menyerah? Apa bedanya buatmu?', 'dalam'),
  rn('pertanyaan-lima-tahun', 'tantangan', 'Satu pertanyaan saja', 'Tulis satu pertanyaan untuk dirimu lima tahun lagi. Jangan dijawab dulu. Kunci di kapsul.', 'mimpi', { doodle: 'pena' }),
  rn('tiga-menit-diam', 'tantangan', 'Tiga menit diam', 'Duduk diam tiga menit tanpa HP, tanpa musik. Tulis satu pikiran yang paling keras muncul.', 'dalam', { doodle: 'jam-pasir' }),
  rn('satu-benda', 'tantangan', 'Kalau harus pergi', 'Kalau harus pergi hanya dengan satu benda dari kamarmu, benda apa? Potret dia.', 'dalam', { doodle: 'kunci' }),
  rn('marah-layak', 'pertanyaan', 'Marah yang layak', 'Hal yang membuatmu marah, dan kamu rasa memang pantas dimarahi?', 'dalam'),
  rn('orang-asing-baik', 'kenangan', 'Orang asing yang baik', 'Kebaikan dari orang asing yang tidak pernah bisa kamu balas. Masih ingat wajahnya?', 'syukur'),
  rn('nanti-kalau-sudah', 'pertanyaan', 'Nanti kalau sudah…', 'Kalimat "nanti kalau sudah…" apa yang terlalu sering kamu ucapkan ke dirimu sendiri?', 'dalam'),
  rn('yang-membentuk', 'rahasia', 'Yang membentukmu', 'Satu kejadian kecil yang membentukmu, tapi tidak pernah masuk cerita perkenalanmu?', 'dalam'),
  rn('bahagia-dulu-kini', 'pertanyaan', 'Bahagia dulu dan kini', 'Arti bahagia buatmu waktu SMA, dan sekarang. Mana yang lebih jujur?', 'nostalgia'),
  rn('salah-paham', 'rahasia', 'Malas meluruskan', 'Hal yang sering disalahpahami orang tentang kamu, dan kamu sudah malas meluruskannya?', 'dalam'),
  rn('masih-percaya', 'pertanyaan', 'Masih percaya', 'Sesuatu yang masih kamu percayai, padahal banyak orang sudah berhenti percaya?', 'syukur'),
  rn('pulang-ke-siapa', 'pertanyaan', 'Pulang ke siapa', 'Saat semuanya kacau, kamu pulang ke siapa, atau ke mana? Mereka tahu itu?', 'dalam', { doodle: 'rumah' }),
  rn('pertanyaan-tahun-ini', 'pertanyaan', 'Pertanyaan tahun ini', 'Pertanyaan yang paling sering kamu tanyakan ke dirimu tahun ini? Sudah ketemu jawabannya?', 'dalam'),
  rn('langka-di-bawah-purnama', 'rahasia', 'Di bawah purnama', 'Bulan penuh malam ini. Satu hal yang ingin kamu akui, cukup di bawah cahayanya saja.', 'dalam', { doodle: 'bulan', rare: 'purnama' }),
];

// ──────────────────────────── Dek Seru & Receh ────────────────────────────
// Receh di permukaan, tapi jawabannya sering membuka banyak hal.

const rc = deckCard('receh');

const RECEH_CARDS: DailyCard[] = [
  rc('isi-tas', 'tantangan', 'Isi tas paling random', 'Potret benda paling random di tasmu sekarang. Jelaskan kenapa dia ada di sana.', 'lucu', { doodle: 'kamera' }),
  rc('ranking-gorengan', 'pertanyaan', 'Ranking gorengan', 'Urutkan dari yang terbaik: bakwan, tahu isi, pisang goreng, mendoan, cireng. Tidak ada jawaban salah. Ada, sih.', 'lucu'),
  rc('pendapat-panas', 'pertanyaan', 'Pendapat panas', 'Satu pendapat kontroversialmu soal makanan. Bubur diaduk? Nasi pakai mi? Silakan, kami siap.', 'lucu'),
  rc('benda-rumah', 'pertanyaan', 'Kalau kamu benda', 'Kamu benda apa di rumah: remote yang selalu hilang, kipas berisik, atau kaleng biskuit isi rengginang?', 'lucu', { doodle: 'rumah' }),
  rc('nama-wifi', 'pertanyaan', 'Nama wifi jujur', 'Kalau nama wifi rumahmu harus diganti jadi satu kalimat jujur tentang hidupmu, isinya apa?', 'lucu'),
  rc('tangkapan-terakhir', 'tantangan', 'Tangkapan layar terakhir', 'Bagikan tangkapan layar terakhir di galerimu. Terlalu memalukan? Ceritakan saja isinya.', 'lucu'),
  rc('stiker-hidup', 'pertanyaan', 'Stiker hidupmu', 'Stiker WA yang paling mewakili minggumu? Jelaskan dengan kata-kata, sedetail mungkin.', 'lucu'),
  rc('kekuatan-tak-berguna', 'pertanyaan', 'Kekuatan tak berguna', 'Kekuatan super paling tak berguna yang ingin kamu punya? Misal: selalu tahu kapan angkot berikutnya lewat.', 'lucu'),
  rc('tim-mi-instan', 'pertanyaan', 'Tim mana kamu', 'Mi instan: bumbu ditaruh di mangkuk dulu, atau dituang belakangan? Bela pendirianmu dalam satu kalimat.', 'lucu'),
  rc('pose-patung', 'tantangan', 'Jadi patung kota', 'Berpose seperti patung di bundaran kotamu, lalu minta tolong difoto. Swafoto juga sah.', 'lucu', { doodle: 'kamera' }),
  rc('tebak-bunyi', 'tantangan', 'Tebak bunyinya', 'Rekam lima detik bunyi benda di dekatmu. Yang lain harus menebak itu apa.', 'lucu'),
  rc('judul-film', 'pertanyaan', 'Judul film hari ini', 'Kalau hari ini dijadikan film, judulnya apa? Gaya sinetron azab juga boleh.', 'lucu'),
  rc('terlalu-dipuji', 'pertanyaan', 'Terlalu dipuji', 'Makanan yang menurutmu terlalu dipuji orang-orang? Sebut, lalu kabur.', 'lucu'),
  rc('salah-lirik', 'rahasia', 'Salah dengar lirik', 'Lirik lagu yang bertahun-tahun kamu nyanyikan dengan salah, dan kapan akhirnya kamu sadar?', 'lucu', { doodle: 'gitar' }),
  rc('teori-aneh', 'pertanyaan', 'Teori tanpa bukti', 'Teori aneh yang kamu yakini tanpa bukti. Contoh: hujan pasti turun begitu motor selesai dicuci.', 'lucu', { doodle: 'hujan' }),
  rc('jelek-tapi-sayang', 'tantangan', 'Jelek tapi sayang', 'Potret benda paling jelek yang tidak akan pernah kamu buang.', 'lucu'),
  rc('potret-satu-menit', 'tantangan', 'Potret satu menit', 'Gambar wajah salah satu dari kami dalam satu menit, dari ingatan. Kirim tanpa revisi.', 'lucu', { doodle: 'pena' }),
  rc('lomba-andalan', 'pertanyaan', 'Lomba andalan', 'Lomba tujuh belasan yang pasti kamu menangkan: makan kerupuk, balap karung, atau kelereng di sendok?', 'lucu', { doodle: 'bendera' }),
  rc('bakat-terpendam', 'rahasia', 'Bakat terpendam', 'Bakat tak berguna yang diam-diam kamu banggakan? Siul keras, hafal plat nomor, lipat baju kilat?', 'lucu'),
  rc('juara-sarapan', 'pertanyaan', 'Juara sarapan', 'Juara sarapan sejati: nasi uduk, bubur ayam, lontong sayur, atau roti bakar? Pilih satu, sisanya pulang.', 'lucu'),
  rc('kalimat-orang-rumah', 'pertanyaan', 'Kalimat legendaris', 'Kalimat legendaris orang rumahmu yang selalu keluar di situasi yang sama? "Coba cari dulu yang bener…"', 'nostalgia'),
  rc('ekspresi-email', 'tantangan', 'Ekspresi jujur', 'Swafoto dengan ekspresi persis seperti saat membaca pesan "ada waktu sebentar?" dari atasan.', 'lucu'),
  rc('peliharaan-khayalan', 'pertanyaan', 'Peliharaan khayalan', 'Boleh pelihara hewan apa saja tanpa repot. Kamu pilih apa, dan namanya siapa?', 'mimpi', { doodle: 'kucing' }),
  rc('belanja-jam-dua', 'rahasia', 'Belanja jam dua pagi', 'Barang paling aneh yang pernah kamu beli online lewat tengah malam? Masih dipakai?', 'lucu'),
  rc('nama-band', 'pertanyaan', 'Nama band kita', 'Kalau kita bikin band, namanya apa, dan lagu hit pertamanya tentang apa?', 'lucu', { doodle: 'gitar' }),
  rc('ketiduran-di-mana', 'pertanyaan', 'Rekor ketiduran', 'Tempat paling aneh kamu pernah ketiduran? Angkot, ruang tunggu, atau rapat daring?', 'lucu'),
  rc('ulasan-hari-ini', 'tantangan', 'Ulasan bintang lima', 'Beri hari ini bintang satu sampai lima, lalu tulis ulasannya gaya ulasan ojek daring.', 'lucu', { doodle: 'bintang' }),
  rc('foto-profil-lama', 'kenangan', 'Foto profil zaman dulu', 'Cari foto profil lamamu yang paling alay. Bagikan, atau minimal ceritakan pose dan tulisannya.', 'nostalgia', { doodle: 'kamera' }),
  rc('tukar-hidup', 'pertanyaan', 'Tukar hidup sehari', 'Tukar hidup sehari dengan salah satu dari kami: siapa, dan apa yang pertama kamu lakukan?', 'lucu'),
  rc('langka-jemuran', 'pertanyaan', 'Jemuran, oh jemuran', 'Hujan pertama musim ini. Jujur: kamu sempat angkat jemuran, atau sudah terlambat?', 'lucu', { doodle: 'hujan', rare: 'hujan_pertama' }),
];

// ───────────────────────────── Dek Berdua Saja ─────────────────────────────
// Untuk dua orang. Dekat tanpa harus vulgar: awal mula, ritual kecil, hal yang
// belum diucapkan, rencana, dan cek kabar yang jujur.

const bd = withFit(deckCard('berdua'), DUO);

const BERDUA_CARDS: DailyCard[] = [
  bd('pertama-melihat', 'kenangan', 'Pertama melihatku', 'Ingat pertama kali melihatku? Aku sedang pakai apa, sedang apa, dan kamu berpikir apa?', 'nostalgia'),
  bd('kapan-tahu', 'rahasia', 'Kapan kamu tahu', 'Kapan persisnya kamu tahu bahwa ini bukan sekadar kenalan biasa?', 'dalam', { doodle: 'kunci' }),
  bd('ritual-kecil', 'pertanyaan', 'Ritual kecil kita', 'Ritual kecil kita yang paling kamu sayang, yang mungkin aku bahkan tidak sadar itu ritual?', 'syukur'),
  bd('kagum-diam', 'rahasia', 'Belum pernah kubilang', 'Satu hal yang kamu kagumi dariku, tapi belum pernah kamu bilang langsung.', 'syukur', { doodle: 'segel-lilin' }),
  bd('cek-didengar', 'pertanyaan', 'Cek jujur', 'Minggu ini, kamu merasa cukup kudengar? Jawab jujur. Angka satu sampai lima juga boleh.', 'dalam'),
  bd('sedikit-lebih', 'pertanyaan', 'Sedikit lebih banyak', 'Satu hal yang ingin kamu dapat sedikit lebih banyak dariku bulan ini?', 'dalam'),
  bd('sedikit-kurang', 'rahasia', 'Sedikit dikurangi', 'Satu kebiasaanku yang ingin kamu kurangi sedikit. Sampaikan baik-baik, aku janji tidak ngambek.', 'lucu'),
  bd('rumah-nanti', 'pertanyaan', 'Rumah kita nanti', 'Satu detail di rumah kita nanti yang tidak bisa ditawar. Rak buku? Dapur luas? Jendela menghadap timur?', 'mimpi', { doodle: 'rumah' }),
  bd('tujuh-puluh', 'pertanyaan', 'Waktu kita tua', 'Bayangkan kita umur tujuh puluh. Sore itu kita sedang apa?', 'mimpi', { doodle: 'senja' }),
  bd('lagu-kita', 'pertanyaan', 'Lagu kita', 'Lagu yang jadi "lagu kita" tanpa pernah kita sepakati?', 'nostalgia', { doodle: 'gitar' }),
  bd('tangan-kita', 'tantangan', 'Tangan kita', 'Potret tangan kita berdua hari ini. Berjauhan? Potret tanganmu memegang sesuatu dariku.', 'syukur'),
  bd('catatan-selipan', 'tantangan', 'Catatan selipan', 'Tulis catatan kecil di kertas, selipkan di tempat yang akan kutemukan. Berjauhan? Potret saja dulu.', 'syukur', { doodle: 'amplop' }),
  bd('debat-konyol', 'kenangan', 'Debat paling konyol', 'Pertengkaran kita yang paling konyol. Masih ingat siapa yang menang? Versimu, ya.', 'lucu'),
  bd('belajar-darimu', 'pertanyaan', 'Ketularan', 'Kebiasaanku yang ketularan ke kamu dan sekarang sudah jadi milikmu sendiri?', 'syukur'),
  bd('paling-dekat', 'pertanyaan', 'Paling dekat', 'Kapan minggu ini kamu merasa paling dekat denganku? Bisa jadi saat kita diam saja.', 'dalam'),
  bd('jauh-walau-dekat', 'rahasia', 'Jauh walau dekat', 'Pernah merasa jauh dariku padahal kita duduk bersebelahan? Kapan itu?', 'dalam'),
  bd('kencan-dua-puluh', 'pertanyaan', 'Kencan dua puluh ribu', 'Rencanakan kencan dengan modal dua puluh ribu rupiah. Kita ke mana, makan apa?', 'lucu'),
  bd('asal-panggilan', 'kenangan', 'Asal panggilan', 'Dari mana asal panggilan sayang kita? Siapa yang mulai, dan kenapa itu yang menempel?', 'nostalgia'),
  bd('lima-tahun-lagi', 'pertanyaan', 'Lima tahun lagi', 'Satu hal yang ingin sudah kita lakukan bersama lima tahun dari sekarang?', 'mimpi', { doodle: 'peta' }),
  bd('air-mata-pertama', 'rahasia', 'Air mata pertama', 'Pertama kali kamu menangis di depanku, atau karena aku. Masih ingat rasanya?', 'dalam'),
  bd('terima-kasih-kecil', 'pertanyaan', 'Terima kasih kecil', 'Hal kecil yang kulakukan minggu ini, yang ingin kamu ucapkan terima kasih untuknya?', 'syukur'),
  bd('bau-aku', 'pertanyaan', 'Bau yang mengingatkan', 'Bau apa yang langsung membuatmu ingat aku? Sabun, parfum, atau bau hujan di jaketku?', 'nostalgia'),
  bd('khawatir-kecil', 'rahasia', 'Khawatir tentang kita', 'Satu kekhawatiran kecil tentang kita yang belum kamu ucapkan. Kecil saja, kita bahas pelan-pelan.', 'dalam'),
  bd('foto-pertama', 'kenangan', 'Foto pertama kita', 'Cari foto pertama kita berdua. Apa yang terjadi lima menit sebelum foto itu diambil?', 'nostalgia', { doodle: 'kamera' }),
  bd('minggu-kosong', 'pertanyaan', 'Minggu tanpa rencana', 'Minggu tanpa rencana: kita bangun jam berapa, sarapan apa, dan sengaja tidak melakukan apa?', 'ringan', { doodle: 'cangkir' }),
  bd('janji-kecil', 'tantangan', 'Janji kecil', 'Buat satu janji kecil untukku minggu ini, yang pasti bisa kamu tepati. Tulis di sini.', 'syukur', { doodle: 'pita' }),
  bd('tiga-kata', 'pertanyaan', 'Aku dalam tiga kata', 'Gambarkan aku dalam tiga kata, tapi tidak boleh pakai kata yang biasa kamu pakai.', 'ringan'),
  bd('saat-aku-tidur', 'rahasia', 'Saat aku tidur', 'Apa yang kamu pikirkan saat melihatku tidur? Jujur, walau isinya "kok mangap".', 'lucu', { doodle: 'bulan' }),
  bd('langka-setahun-lagi', 'rahasia', 'Bertambah satu tahun', 'Hari jadi kita. Satu hal tentangku yang kamu sayangi sekarang, tapi belum kamu sadari setahun lalu?', 'syukur', { doodle: 'pita', rare: 'hari_jadi' }),
];

// ─────────────────────────── Dek Lingkaran Sahabat ───────────────────────────
// Untuk lingkaran bertiga atau lebih: peran, lelucon internal, dan terima kasih
// yang jarang diucapkan. Menyebut nama boleh, menjatuhkan jangan.

const sb = withFit(deckCard('sahabat'), GRUP);

const SAHABAT_CARDS: DailyCard[] = [
  sb('paling-telat', 'pertanyaan', 'Pasti datang telat', 'Siapa di antara kita yang pasti datang paling telat, dan apa alasan andalannya?', 'lucu', { doodle: 'jam-pasir' }),
  sb('kru-film', 'pertanyaan', 'Peranmu di sini', 'Kalau lingkaran ini kru film, kamu jadi apa? Sutradara, juru masak, atau yang pegang payung?', 'lucu'),
  sb('asal-lelucon', 'kenangan', 'Asal lelucon', 'Lelucon internal kita yang paling awet. Masih ingat dari mana asalnya?', 'nostalgia'),
  sb('pertama-ketemu', 'kenangan', 'Pertama ketemu', 'Ceritakan pertama kali kamu ketemu salah satu dari kami. Versimu, bukan versi dia.', 'nostalgia'),
  sb('diam-diam-menolong', 'pertanyaan', 'Diam-diam menolong', 'Sebut satu orang di sini dan satu hal yang dia lakukan tahun ini, yang diam-diam menolongmu.', 'syukur'),
  sb('paling-tersesat', 'pertanyaan', 'Paling mungkin tersesat', 'Siapa yang paling mungkin tersesat padahal sudah pakai peta di HP? Sebut nama, tanpa dendam.', 'lucu', { doodle: 'peta' }),
  sb('tidur-duluan', 'pertanyaan', 'Tidur duluan', 'Kalau kita menginap bareng, siapa yang paling kuat begadang, dan siapa yang tidur duluan?', 'lucu', { doodle: 'bulan' }),
  sb('serangan-zombi', 'pertanyaan', 'Kalau ada zombi', 'Kota diserang zombi. Siapa dari kita yang bertahan paling lama, dan siapa yang tumbang duluan?', 'lucu'),
  sb('foto-kacau', 'kenangan', 'Foto paling kacau', 'Unggah foto bareng kita yang paling kacau. Mata merem, setengah wajah, semua sah.', 'lucu', { doodle: 'kamera' }),
  sb('kebiasaan-kumpul', 'pertanyaan', 'Hanya kita yang paham', 'Kebiasaan kita kalau kumpul yang tidak akan dipahami orang luar?', 'nostalgia'),
  sb('belum-pernah', 'pertanyaan', 'Belum pernah bareng', 'Satu hal yang belum pernah kita lakukan bareng dan harus terjadi tahun ini?', 'mimpi', { doodle: 'tiket' }),
  sb('tetapkan-tanggal', 'tantangan', 'Tetapkan tanggal', 'Usulkan satu tanggal kumpul sungguhan, lengkap dengan tempatnya. Yang pertama setuju, bawa camilan.', 'ringan'),
  sb('tanpa-kalian', 'rahasia', 'Kalau tak kenal kalian', 'Seperti apa hidupmu kalau tidak pernah kenal kami? Jujur, satu kalimat.', 'dalam'),
  sb('salah-sangka', 'rahasia', 'Salah sangka', 'Kesan pertamamu tentang salah satu dari kami yang ternyata salah besar.', 'lucu'),
  sb('nasihat-menempel', 'pertanyaan', 'Nasihat yang menempel', 'Nasihat dari salah satu dari kami yang masih kamu pakai sampai sekarang?', 'syukur'),
  sb('penghidup-grup', 'pertanyaan', 'Penghidup grup', 'Siapa yang biasanya menghidupkan lagi grup yang sudah sepi berhari-hari? Kasih dia tepuk tangan.', 'syukur'),
  sb('lagu-karaoke', 'pertanyaan', 'Lagu wajib karaoke', 'Lagu wajib kita kalau karaoke, dan siapa yang selalu rebutan mik?', 'lucu', { doodle: 'gitar' }),
  sb('perjalanan-legendaris', 'kenangan', 'Perjalanan legendaris', 'Perjalanan bareng yang paling sering diceritakan ulang. Detail apa yang makin lama makin dilebih-lebihkan?', 'nostalgia', { doodle: 'peta' }),
  sb('julukan-baru', 'pertanyaan', 'Julukan minggu ini', 'Beri julukan baru untuk satu orang di sini, berdasarkan kelakuannya minggu ini.', 'lucu'),
  sb('paling-dirindukan', 'rahasia', 'Paling dirindukan', 'Siapa di sini yang paling kamu rindukan belakangan ini? Dia tidak perlu tahu. Atau perlu.', 'dalam'),
  sb('jam-tujuh', 'tantangan', 'Jam tujuh malam', 'Tepat jam tujuh malam ini, semua potret apa yang ada di depan mata. Lihat nanti kita sedang di mana saja.', 'ringan', { doodle: 'jam-pasir' }),
  sb('pesanan-andalan', 'pertanyaan', 'Tebak pesanannya', 'Tebak pesanan andalan satu orang di sini kalau kita makan di warung pecel lele.', 'lucu'),
  sb('waktu-itu-ada', 'kenangan', 'Waktu itu kamu ada', 'Masa sulit saat salah satu dari kami datang tanpa diminta. Ceritakan, biar dia tahu itu berarti.', 'syukur'),
  sb('kita-berubah', 'pertanyaan', 'Kita yang berubah', 'Apa yang paling berubah dari lingkaran ini sejak awal? Lebih baik, lebih aneh, atau dua-duanya?', 'dalam'),
  sb('ramalan-sepuluh-tahun', 'tantangan', 'Kita sepuluh tahun lagi', 'Tulis satu ramalan untuk kita sepuluh tahun lagi. Kunci di kapsul, buka nanti.', 'mimpi', { doodle: 'surat-botol' }),
  sb('paling-membela', 'pertanyaan', 'Paling cepat membela', 'Siapa yang paling cepat membelamu di depan orang lain, bahkan saat kamu salah?', 'syukur'),
  sb('aturan-tak-tertulis', 'pertanyaan', 'Aturan tak tertulis', 'Satu aturan tak tertulis di lingkaran ini yang dipatuhi semua orang?', 'lucu'),
  sb('pujian-beruntun', 'tantangan', 'Pujian beruntun', 'Puji tiga orang di sini, masing-masing satu kalimat, tanpa memakai kata "baik" atau "seru".', 'syukur'),
  sb('langka-piala-tahunan', 'pertanyaan', 'Piala akhir tahun', 'Malam tahun baru. Bagikan piala khayalan: paling berjasa, paling kocak, paling banyak drama tahun ini?', 'lucu', { doodle: 'kembang-api', rare: 'malam_tahun_baru' }),
];

// ──────────────────────────── Dek Ruang Menulis ────────────────────────────
// Ajakan menulis sekecil satu kalimat. Cocok untuk yang suka menulis maupun
// yang baru mau mulai.

const tl = deckCard('tulis');

const TULIS_CARDS: DailyCard[] = [
  tl('bau-masa-kecil', 'tantangan', 'Bau masa kecil', 'Gambarkan satu bau dari masa kecilmu dalam tiga kalimat, tanpa menyebut nama bendanya.', 'nostalgia', { doodle: 'pena' }),
  tl('akhir-novel', 'tantangan', 'Akhir sebuah novel', 'Tulis kalimat terakhir sebuah novel tentang hari ini.', 'dalam', { doodle: 'buku' }),
  tl('lima-puluh-kata', 'tantangan', 'Cerita lima puluh kata', 'Tulis cerita utuh tepat lima puluh kata. Ada awal, ada belokan, ada akhir.', 'ringan', { doodle: 'pena' }),
  tl('surat-orang-asing', 'tantangan', 'Untuk orang asing', 'Tulis surat pendek untuk orang asing yang kamu lihat hari ini. Dia tidak akan pernah membacanya.', 'dalam', { doodle: 'amplop' }),
  tl('dongeng-hari-ini', 'tantangan', 'Pada zaman dahulu', 'Tulis ulang hari ini sebagai dongeng. Mulai dengan "Pada zaman dahulu kala…" dan jadikan tenggat kerja seekor naga.', 'lucu', { doodle: 'buku' }),
  tl('haiku-perjalanan', 'tantangan', 'Haiku perjalanan', 'Tulis haiku 5-7-5 tentang perjalananmu hari ini. Angkot, motor, atau dari kasur ke dapur.', 'ringan', { doodle: 'sepeda' }),
  tl('pantun-untuk-kami', 'tantangan', 'Pantun untuk kami', 'Buat satu pantun empat baris untuk salah satu dari kami. Sampiran boleh asal, isi harus kena.', 'lucu'),
  tl('puisi-daftar', 'tantangan', 'Puisi daftar', 'Tulis puisi berupa daftar tujuh benda di sekitarmu, masing-masing dengan satu kata sifat yang tak terduga.', 'ringan'),
  tl('percakapan-curian', 'tantangan', 'Percakapan curian', 'Tulis tiga baris percakapan yang kamu dengar hari ini, persis aslinya. Biarkan tanpa penjelasan.', 'ringan'),
  tl('mata-kucing', 'tantangan', 'Dari mata kucing', 'Ceritakan pagimu dari sudut pandang kucing, cicak, atau tanaman di jendelamu.', 'lucu', { doodle: 'kucing' }),
  tl('warna-tanpa-nama', 'tantangan', 'Warna tanpa nama', 'Gambarkan warna langit sore ini tanpa menyebut nama warna apa pun.', 'dalam', { doodle: 'senja' }),
  tl('enam-kata', 'tantangan', 'Kisah enam kata', 'Ceritakan minggumu dalam enam kata. Hanya enam.', 'dalam'),
  tl('surat-untuk-benda', 'tantangan', 'Surat untuk benda', 'Tulis surat terima kasih untuk satu benda yang setia menemanimu. Helm, kasur, atau termos.', 'syukur', { doodle: 'amplop' }),
  tl('ingatan-pertama', 'kenangan', 'Ingatan paling awal', 'Tulis ingatan paling awal yang kamu punya, sebagai kalimat pembuka sebuah cerita.', 'nostalgia'),
  tl('pintu-rumah-lama', 'kenangan', 'Di balik pintu', 'Masuki rumah masa kecilmu dalam ingatan. Tulis apa yang ada di balik pintu pertama.', 'nostalgia', { doodle: 'rumah' }),
  tl('tanpa-aku', 'tantangan', 'Tanpa kata aku', 'Ceritakan hari ini dalam empat kalimat tanpa memakai kata "aku" atau "saya".', 'ringan'),
  tl('resep-perasaan', 'tantangan', 'Resep perasaan', 'Tulis resep untuk satu perasaanmu hari ini: bahan, takaran, cara memasak, lama dihidangkan.', 'lucu'),
  tl('cuaca-kepala', 'tantangan', 'Laporan cuaca batin', 'Tulis laporan cuaca untuk isi kepalamu, gaya penyiar berita jam enam pagi.', 'lucu', { doodle: 'awan' }),
  tl('benda-hilang', 'pertanyaan', 'Ke mana ia pergi', 'Satu benda yang hilang dan tak pernah ketemu. Tulis ke mana ia pergi, dan sedang apa ia sekarang.', 'mimpi'),
  tl('pesan-dalam-botol', 'rahasia', 'Pesan dalam botol', 'Tulis tiga baris untuk dimasukkan ke botol dan dilempar ke laut. Untuk siapa pun yang menemukannya.', 'mimpi', { doodle: 'surat-botol' }),
  tl('lima-indra', 'tantangan', 'Detik ini, lima indra', 'Tulis apa yang kamu lihat, dengar, cium, kecap, dan raba detik ini. Satu kalimat untuk tiap indra.', 'ringan'),
  tl('judul-bab', 'pertanyaan', 'Judul bab ini', 'Kalau hidupmu sebuah buku, bab yang sedang berjalan sekarang judulnya apa?', 'dalam', { doodle: 'buku' }),
  tl('tokoh-pinggir-jalan', 'tantangan', 'Tokoh pinggir jalan', 'Pilih satu orang yang kamu lihat hari ini: tukang parkir, penjual cilok, satpam. Karang rahasia hidupnya.', 'mimpi'),
  tl('untuk-umur-tujuh', 'tantangan', 'Untuk kamu umur tujuh', 'Tulis tiga kalimat untuk dirimu yang berumur tujuh tahun, pakai bahasa yang bisa dia pahami.', 'dalam', { doodle: 'surat-botol' }),
  tl('ciptakan-kata', 'tantangan', 'Ciptakan kata', 'Ciptakan satu kata baru untuk perasaan yang belum punya nama. Tulis artinya seperti di kamus.', 'lucu', { doodle: 'buku' }),
  tl('akhir-lain', 'tantangan', 'Akhir yang lain', 'Ambil satu kejadian kecil hari ini, lalu tulis akhir lain yang jauh lebih aneh.', 'mimpi'),
  tl('mulai-dari-lalu', 'tantangan', 'Mulai dari "lalu"', 'Tulis satu paragraf yang dimulai dengan kata "Lalu…", seolah ceritanya sudah berjalan sejak tadi.', 'ringan', { doodle: 'pena' }),
  tl('hujan-tanpa-hujan', 'tantangan', 'Hujan tanpa kata hujan', 'Tulis satu paragraf tentang hujan tanpa memakai kata "hujan", "air", atau "basah".', 'nostalgia', { doodle: 'hujan' }),
];

// ──────────────────────────── Dek Tubuh & Rasa ────────────────────────────
// Mendengarkan badan pelan-pelan. Hangat, tidak klinis, tidak menggurui.
// Tidak pernah menanyakan berat badan, angka, atau diagnosis.

const tb = deckCard('tubuh');

const TUBUH_CARDS: DailyCard[] = [
  tb('hari-di-badan', 'pertanyaan', 'Hari ini menetap di', 'Kalau hari ini menetap di satu bagian tubuhmu, di mana? Bahu, perut, tenggorokan, atau dada?', 'dalam'),
  tb('makanan-penghibur', 'pertanyaan', 'Makanan penghibur', 'Makanan yang menghiburmu minggu ini? Mi rebus jam sebelas malam juga dihitung.', 'syukur', { doodle: 'cangkir' }),
  tb('tidur-semalam', 'pertanyaan', 'Tidur semalam', 'Tidurmu semalam mirip apa: batu, ombak, atau sinyal yang putus-putus?', 'lucu', { doodle: 'bulan' }),
  tb('menang-kecil', 'pertanyaan', 'Menang kecil', 'Satu kemenangan kecil hari ini. Bangun tanpa menunda alarm juga kemenangan.', 'syukur', { doodle: 'bintang' }),
  tb('butuh-besok', 'pertanyaan', 'Bekal untuk besok', 'Apa yang kamu butuhkan besok supaya harinya sedikit lebih ringan?', 'dalam', { doodle: 'matahari' }),
  tb('regang-sebentar', 'tantangan', 'Regangkan sebentar', 'Berdiri, angkat tangan setinggi mungkin, tahan lima napas. Bagian mana yang paling berterima kasih?', 'ringan'),
  tb('empat-napas', 'tantangan', 'Empat napas', 'Tarik napas empat hitungan, buang enam hitungan. Ulangi empat kali, lalu tulis satu kata.', 'dalam'),
  tb('botol-minum', 'tantangan', 'Botol minummu', 'Potret botol atau gelas minummu. Sudah berapa kali diisi ulang hari ini?', 'ringan', { doodle: 'cangkir' }),
  tb('kata-perut', 'pertanyaan', 'Kata perutmu', 'Kalau perutmu bisa bicara hari ini, dia bilang apa? "Lapar", "kenyang", atau "kenapa pedas lagi"?', 'lucu'),
  tb('rasa-tanpa-nama', 'pertanyaan', 'Rasa tanpa nama', 'Perasaan hari ini yang belum ketemu namanya. Gambarkan saja: warnanya, beratnya, suhunya.', 'dalam'),
  tb('pelukan-lama', 'pertanyaan', 'Pelukan terakhir', 'Kapan terakhir kamu dipeluk lama, lebih dari tiga detik? Dari siapa?', 'dalam'),
  tb('yang-lembut', 'tantangan', 'Yang paling lembut', 'Cari benda paling lembut di dekatmu, pegang sebentar. Potret, lalu ceritakan rasanya di tangan.', 'ringan'),
  tb('jalan-setengah', 'tantangan', 'Jalan lebih pelan', 'Jalan seratus langkah dengan kecepatan setengah dari biasanya. Apa yang tiba-tiba kelihatan?', 'dalam', { doodle: 'peta' }),
  tb('capek-jenis', 'pertanyaan', 'Capek jenis apa', 'Capekmu hari ini capek badan, capek kepala, atau capek hati? Masing-masing butuh obat yang beda.', 'dalam'),
  tb('lima-menit-matahari', 'tantangan', 'Lima menit matahari', 'Berdiri lima menit di bawah matahari pagi atau sore. Potret bayanganmu sebagai bukti.', 'ringan', { doodle: 'matahari' }),
  tb('sinyal-diabaikan', 'pertanyaan', 'Sinyal dari badan', 'Sinyal kecil dari badanmu belakangan ini yang sering kamu abaikan? Pegal, haus, atau mata yang perih?', 'dalam'),
  tb('paling-segar', 'pertanyaan', 'Paling segar', 'Momen paling segar hari ini: mandi, cuci muka, atau tegukan pertama es teh?', 'ringan'),
  tb('terakhir-menangis', 'rahasia', 'Terakhir menangis', 'Kapan terakhir kamu menangis, dan apakah sesudahnya terasa lebih lega?', 'dalam'),
  tb('tidur-siang', 'pertanyaan', 'Soal tidur siang', 'Tidur siang buatmu: kemewahan, kebutuhan, atau kenangan masa kecil yang tak pernah kembali?', 'lucu'),
  tb('masakan-saat-sakit', 'kenangan', 'Masakan saat sakit', 'Makanan yang dibuatkan untukmu waktu kecil saat sedang sakit. Siapa yang membuatnya?', 'nostalgia', { doodle: 'labu' }),
  tb('tangan-seharian', 'tantangan', 'Tangan seharian', 'Potret tanganmu di ujung hari. Satu hal yang sudah mereka kerjakan untukmu hari ini?', 'syukur'),
  tb('bagian-disukai', 'rahasia', 'Bagian yang disukai', 'Satu bagian tubuhmu yang diam-diam kamu sukai. Boleh sesederhana alis atau jempol kaki.', 'syukur'),
  tb('berani-menolak', 'pertanyaan', 'Berani menolak', 'Satu hal yang hari ini berani kamu tolak, supaya badanmu bisa istirahat?', 'dalam'),
  tb('suhu-hati', 'pertanyaan', 'Suhu hatimu', 'Suhu hatimu hari ini: hangat kuku, mendidih, atau dingin kulkas?', 'lucu'),
  tb('sepuluh-menit-tanpa-hp', 'tantangan', 'Sebelum tidur', 'Malam ini, taruh HP sepuluh menit sebelum tidur. Besok ceritakan bedanya.', 'ringan', { doodle: 'lampu' }),
  tb('rawat-diri', 'pertanyaan', 'Cara merawat diri', 'Cara paling sederhana kamu merawat diri, yang hampir selalu berhasil?', 'syukur', { doodle: 'penyiram' }),
  tb('turunkan-bahu', 'tantangan', 'Turunkan bahu', 'Cek bahumu sekarang. Naik ke telinga? Turunkan pelan-pelan, lalu tulis apa yang membuatnya naik.', 'ringan'),
  tb('rasa-hari-ini', 'pertanyaan', 'Rasa di lidah', 'Rasa paling kuat yang mampir di lidahmu hari ini? Pahit kopi, asam mangga muda, atau manis teh warung?', 'ringan', { doodle: 'stroberi' }),
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
  {
    id: 'renungan-dalam',
    name: 'Renungan Dalam',
    description: 'Pertanyaan yang bikin berhenti sebentar: tentang waktu, takut, maaf, dan orang yang sedang kamu jadi.',
    priceIdr: 0,
    doodle: 'lilin',
    cards: RENUNG_CARDS,
  },
  {
    id: 'seru-receh',
    name: 'Seru & Receh',
    description: 'Ranking gorengan, pendapat panas, dan isi tas paling random. Receh, tapi diam-diam membuka banyak hal.',
    priceIdr: 0,
    doodle: 'dadu',
    cards: RECEH_CARDS,
  },
  {
    id: 'berdua-saja',
    name: 'Berdua Saja',
    description: 'Untuk dua orang. Awal mula, ritual kecil, hal yang belum sempat diucapkan, dan rencana yang disusun pelan-pelan.',
    priceIdr: 0,
    doodle: 'kunci',
    cards: BERDUA_CARDS,
  },
  {
    id: 'lingkaran-sahabat',
    name: 'Lingkaran Sahabat',
    description: 'Siapa yang paling telat, lelucon yang tak bisa dijelaskan ke orang luar, dan terima kasih yang jarang diucapkan.',
    priceIdr: 0,
    doodle: 'cangkir',
    cards: SAHABAT_CARDS,
  },
  {
    id: 'ruang-menulis',
    name: 'Ruang Menulis',
    description: 'Ajakan menulis sekecil satu kalimat: bau masa kecil, haiku perjalanan, dan dongeng tentang hari ini.',
    priceIdr: 0,
    doodle: 'pena',
    cards: TULIS_CARDS,
  },
  {
    id: 'tubuh-rasa',
    name: 'Tubuh & Rasa',
    description: 'Mendengarkan badan pelan-pelan: tidur, makanan yang menghibur, napas panjang, dan kemenangan kecil.',
    priceIdr: 0,
    doodle: 'tunas',
    cards: TUBUH_CARDS,
  },
];
