// Ajakan menulis untuk ruang Karya. Berbeda dari Kartu Harian (dijawab satu
// kalimat), ajakan di sini memulai tulisan yang lebih panjang: esai, cerpen,
// puisi, catatan, surat, atau fragmen.
//
// Batas: judul maks ~30 karakter, isi maks ~220 karakter.
// id stabil: jangan diubah setelah rilis.

import type { ContentDoodle } from './doodleIds';

export type WorkKind = 'esai' | 'cerpen' | 'puisi' | 'catatan' | 'surat' | 'fragmen';

export interface WorkKindInfo {
  id: WorkKind;
  name: string;
  tagline: string;
  doodle: ContentDoodle;
}

export const WORK_KINDS: WorkKindInfo[] = [
  { id: 'esai', name: 'esai pribadi', tagline: 'Satu gagasan, dipikirkan pelan-pelan lewat hidupmu sendiri.', doodle: 'buku' },
  { id: 'cerpen', name: 'cerpen', tagline: 'Tokoh, satu belokan, dan akhir yang tertinggal di kepala.', doodle: 'rak-buku' },
  { id: 'puisi', name: 'puisi', tagline: 'Sedikit kata, banyak ruang. Pantun, haiku, atau bebas sama sekali.', doodle: 'bulan' },
  { id: 'catatan', name: 'catatan harian', tagline: 'Apa yang terjadi hari ini, ditulis jujur untuk dirimu nanti.', doodle: 'pena' },
  { id: 'surat', name: 'surat', tagline: 'Untuk seseorang. Terkirim atau tidak, itu urusan nanti.', doodle: 'amplop' },
  { id: 'fragmen', name: 'fragmen', tagline: 'Potongan kecil: satu adegan, satu bau, satu kalimat yang belum tahu mau jadi apa.', doodle: 'kabut' },
];

export interface WritingPrompt {
  id: string;
  kind: WorkKind;
  title: string;
  body: string;
}

const wp =
  (kind: WorkKind) =>
  (slug: string, title: string, body: string): WritingPrompt => ({ id: `${kind}-${slug}`, kind, title, body });

// ─────────────────────────────── Esai pribadi ───────────────────────────────

const e = wp('esai');

const ESAI: WritingPrompt[] = [
  e('benda-ikut-pindah', 'Benda yang selalu ikut pindah', 'Tulis esai tentang satu benda yang selalu kamu bawa setiap kali pindah. Kenapa ia selamat dari semua kardus dan semua seleksi?'),
  e('asal-nama', 'Nama yang kamu bawa', 'Ceritakan asal-usul namamu: siapa yang memilih, apa artinya, dan apakah kamu tumbuh mendekati atau menjauhi arti itu.'),
  e('pertama-asing', 'Pertama kali merasa asing', 'Esai tentang pertama kali kamu merasa benar-benar asing di suatu tempat. Mulai dari satu detail: papan nama, logat, atau harga makanan.'),
  e('uang-pertama', 'Uang pertama', 'Tulis tentang uang pertama yang kamu hasilkan sendiri: berapa, dari mana, dibelikan apa. Biarkan esainya berbelok ke soal harga diri.'),
  e('membela-remeh', 'Membela yang diremehkan', 'Pilih satu hal yang sering diremehkan (sinetron, mi instan, dangdut, grup WA keluarga), lalu bela dengan sungguh-sungguh dan jujur.'),
  e('tiga-bahasa', 'Bahasa untuk marah', 'Esai tentang bahasa yang kamu pakai untuk marah, untuk berdoa, dan untuk bercanda. Apakah ketiganya sama? Kalau beda, kenapa?'),
  e('rencana-tak-jadi', 'Rencana yang tidak jadi', 'Tulis tentang satu rencana besar yang tidak jadi. Jangan buru-buru mencari hikmah; ceritakan dulu seperti apa hidupmu kalau rencana itu terwujud.'),
  e('rumah-tak-ada', 'Rumah yang sudah tiada', 'Esai tentang tempat yang dulu kamu sebut rumah, kini sudah dijual, dirobohkan, atau ditempati orang lain. Dalam 800 kata.'),
  e('satu-bagian-tubuh', 'Satu bagian tubuhmu', 'Tulis tentang hubunganmu dengan satu bagian tubuhmu, dari kecil sampai sekarang. Siapa saja yang pernah berkomentar tentangnya?'),
  e('meja-makan', 'Meja makan keluarga', 'Gambarkan meja makan keluargamu: siapa duduk di mana, topik apa yang dilarang, lauk apa yang selalu ada. Lalu tanyakan: apa yang diajarkan meja itu?'),
  e('jam-sebelas-malam', 'Antara jam sebelas dan tidur', 'Esai tentang apa yang kamu lakukan antara jam sebelas malam dan tidur. Apa sebenarnya yang kamu cari di jam-jam itu?'),
  e('belajar-sepeda', 'Yang memegangi sadel', 'Tulis tentang siapa yang mengajarimu naik sepeda atau motor. Gunakan proses belajar itu untuk bicara tentang percaya dan dilepaskan.'),
  e('teman-menjauh', 'Teman yang menjauh pelan', 'Esai tentang persahabatan yang berakhir tanpa pertengkaran. Tidak ada tokoh jahat. Kapan kamu sadar kalian sudah tidak saling mencari?'),
  e('uang-dan-malu', 'Uang dan rasa malu', 'Tulis jujur tentang satu momen saat uang, terlalu sedikit atau terlalu banyak, membuatmu malu. Tanpa menyalahkan siapa pun, termasuk dirimu.'),
  e('ritual-masa-kecil', 'Ritual masa kecil', 'Esai tentang satu ritual keagamaan atau adat dari masa kecil yang kamu ingat lewat indra: suara, bau, rasa. Apa yang tersisa darinya sekarang?'),
  e('dua-belas-hal', 'Dua belas hal yang kutahu', 'Tulis esai berupa daftar bernomor: dua belas hal yang kamu tahu pasti di umurmu sekarang. Biarkan nomor tujuh mengejutkan dirimu sendiri.'),
  e('kerja-orang-tua', 'Hari kerja orang tuamu', 'Tulis tentang satu hari kerja orang tua atau pengasuhmu yang pernah kamu saksikan, dan apa yang tidak kamu pahami waktu itu.'),
  e('dulu-dan-sekarang', 'Berdebat dengan diri lama', 'Pilih satu pendapatmu yang berubah dalam lima tahun terakhir. Tulis esainya sebagai percakapan antara kamu yang dulu dan kamu yang sekarang.'),
  e('mudik', 'Kenapa kita tetap pulang', 'Esai tentang mudik atau perjalanan pulang paling melelahkan yang pernah kamu jalani. Kenapa orang tetap melakukannya setiap tahun? Kenapa kamu?'),
  e('takut-warisan', 'Takut yang diwariskan', 'Tulis tentang satu ketakutan yang kamu warisi dari keluarga: petir, air, utang, omongan tetangga. Dari mana ia bermula, dan akan kamu wariskan?'),
  e('pujian-membekas', 'Pujian yang membekas', 'Esai tentang satu pujian yang kamu terima bertahun-tahun lalu dan masih kamu ingat kata per kata. Siapa yang mengucapkannya, dan apa yang ia ubah?'),
  e('jalan-sehari-hari', 'Jalan yang kamu hafal', 'Tulis tentang rute yang kamu lewati hampir setiap hari. Apa yang sudah tidak kamu lihat lagi karena terlalu sering melihatnya?'),
];

// ───────────────────────────────── Cerpen ─────────────────────────────────

const c = wp('cerpen');

const CERPEN: WritingPrompt[] = [
  c('pesanan-salah', 'Pesanan ke alamat salah', 'Pengemudi ojek daring mengantar pesanan ke alamat yang salah, dan penerimanya ternyata sedang menunggu sesuatu yang lain sama sekali. Mulai dari ketukan pintu.'),
  c('bu-darmi', 'Teh Bu Darmi', 'Mulai dengan kalimat: "Bu Darmi selalu tahu siapa yang sedang patah hati dari cara mereka memesan teh." Lanjutkan sampai warungnya tutup.'),
  c('kunci-tanpa-pintu', 'Kunci tanpa pintu', 'Tokohmu menemukan kunci yang tidak cocok untuk pintu mana pun di rumah almarhum kakeknya. Tulis dalam 1.000 kata.'),
  c('listrik-padam', 'Malam listrik padam', 'Listrik padam di sebuah kos. Lima penghuni yang tak pernah saling bicara terpaksa duduk di lorong yang sama. Siapa yang bicara duluan, dan kenapa?'),
  c('halte-hujan', 'Dua orang di halte', 'Dua orang asing berteduh di halte yang sama. Salah satunya berbohong tentang tujuannya. Pembaca baru tahu yang mana di kalimat terakhir.'),
  c('pesan-terjadwal', 'Pesan terjadwal', 'Seseorang menerima pesan WA terjadwal dari orang yang sudah meninggal sebulan lalu. Hindari horor; buat ini tentang hal yang belum selesai.'),
  c('tanpa-dialog', 'Pertengkaran tanpa dialog', 'Tulis cerpen tentang pertengkaran di meja makan tanpa satu pun dialog. Semua lewat gerak tangan, piring yang digeser, dan bunyi sendok.'),
  c('kartu-pos-1998', 'Kartu pos dari 1998', 'Sebuah kartu pos tiba dengan cap pos tahun 1998. Penerima yang kini tinggal di rumah itu tidak mengenal nama yang tertulis. Ia memutuskan mencarinya.'),
  c('balon-terakhir', 'Balon yang tidak laku', 'Ceritakan satu hari penjual balon di alun-alun dari sudut pandang balon terakhir yang tidak laku sampai malam.'),
  c('sudut-pandang-lain', 'Dari kursi sebelah', 'Ambil kejadian kecil yang kamu alami minggu ini, lalu tulis ulang sepenuhnya dari sudut pandang orang lain yang ada di sana.'),
  c('menunggu-jemputan', 'Menunggu dijemput', 'Cerpen utuh dalam 300 kata: seorang anak menunggu dijemput sepulang sekolah, dan yang datang bukan orang yang ia harapkan.'),
  c('resep-nenek', 'Resep yang tidak lengkap', 'Seorang cucu mencoba memasak resep neneknya dari catatan yang tidak lengkap. Setiap langkah yang hilang membuka satu kenangan tentang dia.'),
  c('panjat-pinang', 'Hadiah paling atas', 'Lomba panjat pinang di kampung, dan hadiah paling atas ternyata bukan sepeda. Tulis dengan humor, akhiri dengan sesuatu yang hangat.'),
  c('salah-sambung', 'Salah sambung tiap Kamis', 'Seseorang salah sambung setiap Kamis malam ke nomor yang sama selama sebulan. Pelan-pelan, penerimanya mulai menunggu telepon itu.'),
  c('akhir-duluan', 'Akhir yang ditulis duluan', 'Kalimat terakhirmu: "Sejak hari itu, ia tidak pernah lagi potong rambut di tempat lain." Tulis cerita yang membawa pembaca sampai ke sana.'),
  c('koper-tak-bertuan', 'Koper tak bertuan', 'Petugas bandara menemukan koper tak bertuan berisi barang-barang aneh yang tertata rapi. Bangun tokoh pemiliknya hanya dari isi koper itu.'),
  c('reuni', 'Reuni dua puluh tahun', 'Reuni SMA dua puluh tahun. Tokohmu datang hanya untuk meminta maaf pada satu orang, dan orang itu sama sekali tidak ingat apa yang terjadi.'),
  c('kota-tanpa-senja', 'Kota tanpa senja', 'Cerpen realis-magis: sebuah kota kecil tiba-tiba kehilangan senjanya, siang langsung jadi malam. Siapa yang paling kehilangan, dan apa yang ia lakukan?'),
  c('tanpa-tiga-kata', 'Perpisahan tanpa tiga kata', 'Tulis cerpen tentang perpisahan tanpa memakai kata "cinta", "rindu", atau "sedih". Biarkan benda-benda yang berbicara.'),
  c('pasar-subuh', 'Lapak yang tidak dibuka', 'Berlatar pasar tradisional jam empat pagi. Tokoh utamanya pedagang yang hari ini, untuk pertama kali dalam tiga puluh tahun, tidak membuka lapak.'),
  c('grup-keluarga', 'Satu malam di grup keluarga', 'Seluruh cerpen berupa percakapan grup WA keluarga selama satu malam, ketika ada kabar yang tidak sanggup diceritakan langsung.'),
  c('angkot-terakhir', 'Angkot terakhir', 'Angkot terakhir malam itu hanya membawa sopir dan satu penumpang. Rutenya sama seperti biasa, tapi penumpang itu minta berhenti di tempat yang tidak ada.'),
];

// ───────────────────────────────── Puisi ─────────────────────────────────

const p = wp('puisi');

const PUISI: WritingPrompt[] = [
  p('pantun-bersambung', 'Pantun bersambung', 'Tulis tiga pantun bersambung untuk seseorang yang sedang jauh. Sampiran tentang hal di sekitarmu hari ini, isi tentang dia.'),
  p('haiku-pulang', 'Lima haiku pulang', 'Tulis lima haiku (5-7-5) tentang perjalanan pulangmu: satu untuk tiap pemberhentian, lampu merah, atau tikungan.'),
  p('saku-jaket', 'Puisi daftar: saku jaket', 'Puisi berbentuk daftar berjudul "Yang kutemukan di saku jaket lama". Tiap baris satu benda; biarkan daftar itu pelan-pelan bercerita.'),
  p('prosa-dapur', 'Prosa liris dapur', 'Tulis prosa liris satu paragraf panjang tentang dapur ibumu, atau dapur siapa pun yang pernah memberimu makan. Tanpa jeda baris.'),
  p('tanpa-kata-cinta', 'Tanpa kata cinta', 'Tulis puisi cinta tanpa kata "cinta", "sayang", dan "hati". Gunakan hanya benda yang bisa dipegang.'),
  p('ode-remeh', 'Ode untuk yang remeh', 'Tulis ode, puisi pujian yang khidmat, untuk benda paling remeh di rumahmu: sapu lidi, colokan T, atau kipas angin yang berderit.'),
  p('mantra', 'Mantra kecil', 'Tulis puisi berbentuk mantra: bunyi diulang, irama ketat, untuk menyembuhkan masalah sepele seperti macet, sinyal hilang, atau susah tidur.'),
  p('puisi-alamat', 'Alamat sebagai judul', 'Tulis puisi yang judulnya alamat lengkap rumah yang pernah kamu tinggali. Isinya hanya hal-hal yang bisa dilihat dari pagar.'),
  p('jendela-angkot', 'Jendela kendaraan umum', 'Puisi bebas yang tiap barisnya adalah sesuatu yang lewat di jendela kendaraan umum. Berhenti menulis saat kamu sampai tujuan.'),
  p('dua-suara', 'Puisi dua suara', 'Tulis puisi dua suara bergantian, misalnya ibu dan anak, atau kota dan perantau. Baris ganjil satu suara, baris genap suara yang lain.'),
  p('bulan-lahir', 'Bulan kelahiranmu', 'Tulis sajak pendek tentang bulan kelahiranmu: cuacanya, buah yang sedang musim, dan apa yang biasa terjadi di kampungmu saat itu.'),
  p('soneta-belokan', 'Empat belas baris', 'Coba empat belas baris dengan belokan di baris kesembilan. Topiknya: sesuatu yang kamu kira akan kamu benci, ternyata kamu sukai.'),
  p('hanya-pertanyaan', 'Puisi pertanyaan', 'Tulis puisi yang seluruhnya terdiri dari pertanyaan. Tak satu pun dijawab. Biarkan pertanyaan terakhir menjadi yang paling sederhana.'),
  p('gurindam', 'Gurindam untuk diri', 'Tulis lima bait gurindam: dua baris berima a-a, baris pertama sebab, baris kedua akibat. Isinya nasihat untuk dirimu sendiri.'),
  p('puisi-resep', 'Puisi resep', 'Tulis puisi berbentuk resep: bahan, takaran, dan langkah memasak sebuah perasaan. Misalnya "Rindu, untuk dua porsi".'),
  p('puisi-coret', 'Puisi dari coretan', 'Ambil satu halaman koran, brosur, atau pesan lama. Coret kata-kata sampai yang tersisa menjadi puisi. Salin hasilnya ke sini.'),
  p('menit-sebelum-tidur', 'Semenit sebelum tidur', 'Puisi tentang satu menit sebelum tidur, dalam kalimat yang makin lama makin pendek, sampai baris terakhir tinggal satu kata.'),
  p('bunyi-gang', 'Bunyi pagi di gang', 'Puisi yang hanya berisi bunyi: tukang sayur, azan, motor tetangga, ayam, panci. Susun sampai terdengar seperti pagi di gangmu.'),
  p('kabar-tujuh-belas', 'Kabar untuk umur 17', 'Puisi berbentuk surat untuk dirimu umur tujuh belas. Delapan baris, tanpa nasihat, hanya kabar.'),
  p('haiku-musim', 'Haiku tiga musim', 'Tulis tiga haiku: kemarau, pancaroba, dan penghujan. Selipkan satu kata penanda musim di tiap haiku, tanpa menyebut nama musimnya.'),
  p('puisi-tangan', 'Tangan seseorang', 'Tulis puisi tentang tangan seseorang yang kamu kenal baik: apa yang pernah dipegangnya, dan apa yang tidak pernah ia lepaskan.'),
  p('puisi-warna', 'Satu warna, satu hari', 'Pilih satu warna yang paling sering kamu lihat hari ini. Tulis puisi sepuluh baris yang tiap barisnya menyebut benda berwarna itu.'),
];

// ───────────────────────────── Catatan harian ─────────────────────────────

const h = wp('catatan');

const CATATAN: WritingPrompt[] = [
  h('tiga-yang-dilihat', 'Tiga hal yang kamu lihat', 'Mulai catatan hari ini dari tiga hal yang kamu lihat tapi tidak kamu ceritakan ke siapa pun.'),
  h('jam-demi-jam', 'Jam demi jam', 'Catat harimu per jam, satu kalimat untuk setiap jam kamu terjaga. Jangan dipilih-pilih; tulis juga jam yang paling membosankan.'),
  h('satu-percakapan', 'Satu percakapan', 'Catat satu percakapan hari ini sedetail mungkin: siapa bilang apa, di mana, sambil memegang apa. Lalu tulis apa yang tidak terucap.'),
  h('pengeluaran', 'Lewat pengeluaran', 'Tulis catatan hari ini lewat pengeluaranmu. Setiap rupiah ada ceritanya: parkir, gorengan, pulsa, sumbangan di lampu merah.'),
  h('mulai-dari-badan', 'Mulai dari badan', 'Mulai catatan dari badan: lapar jam berapa, pegal di mana, kapan merasa paling segar. Biarkan perasaan menyusul belakangan.'),
  h('kalimat-orang-asing', 'Kalimat orang asing', 'Tulis satu kalimat yang kamu dengar hari ini dari orang asing, lalu setengah halaman tentang kenapa kalimat itu menempel.'),
  h('ditunda-lagi', 'Yang ditunda lagi', 'Catatan jujur tentang satu hal yang hari ini kamu tunda lagi. Bukan untuk menghakimi, hanya untuk melihat polanya.'),
  h('semua-yang-dimakan', 'Semua yang kamu makan', 'Catat semua yang kamu makan hari ini, dengan siapa, dan di mana. Biarkan makanan jadi pintu masuk untuk cerita yang lain.'),
  h('setahun-lagi', 'Untuk kamu setahun lagi', 'Tulis catatan hari ini sambil membayangkan kamu setahun lagi yang membacanya. Apa yang ingin dia ingat dari hari biasa ini?'),
  h('cuaca-luar-dalam', 'Cuaca di luar dan di dalam', 'Dua paragraf: cuaca di luar jendela hari ini, dan cuaca di dalam kepalamu. Lihat di mana keduanya bertemu.'),
  h('satu-foto', 'Lima menit sebelum foto', 'Pilih satu foto dari galerimu hari ini. Tulis apa yang terjadi lima menit sebelum dan lima menit sesudah foto itu diambil.'),
  h('tiga-daftar', 'Tiga daftar kecil', 'Catatan berupa tiga daftar: yang membuatku senang, yang membuatku kesal, dan yang membuatku penasaran hari ini.'),
  h('semua-perjalanan', 'Semua perjalanan', 'Catat semua perjalananmu hari ini, sependek apa pun. Dari kamar ke dapur juga perjalanan. Apa saja yang kamu lewati?'),
  h('tanpa-nama', 'Orang yang mampir di kepala', 'Siapa yang paling sering mampir di pikiranmu hari ini? Tulis catatan tentang dia tanpa sekali pun menyebut namanya.'),
  h('di-kasur', 'Catatan dari kasur', 'Tulis dari kasur, lampu sudah mati, hanya cahaya layar. Tulis cepat, jangan diedit, berhenti saat mulai mengantuk.'),
  h('hari-bersejarah', 'Hari biasa yang bersejarah', 'Tulis tentang hari yang sangat biasa ini seolah ia hari bersejarah. Detail apa yang akan dicatat sejarawan seratus tahun lagi?'),
  h('terima-dan-beri', 'Yang kuterima, yang kuberi', 'Catat satu hal yang hari ini kamu terima dari orang lain, dan satu yang kamu berikan. Senyum di lift juga dihitung.'),
  h('pertanyaan-pagi', 'Pertanyaan sejak pagi', 'Mulai catatan dengan satu pertanyaan yang mengganggumu sejak pagi. Tidak perlu terjawab di akhir.'),
  h('lagu-hari-ini', 'Lagu-lagu hari ini', 'Catat lagu yang kamu dengar hari ini, sengaja atau tidak (dari warung, mobil lewat, kepalamu sendiri), dan sedang apa kamu saat itu.'),
  h('minggu-dalam-lima', 'Minggu ini dalam lima', 'Rangkum minggu ini dalam lima catatan pendek: satu tempat, satu orang, satu rasa, satu kesalahan, satu syukur.'),
  h('hari-ini-belajar', 'Hari ini aku belajar', 'Mulai dengan "Hari ini aku belajar…" lalu tulis apa saja, dari cara membetulkan keran sampai cara mendengarkan teman.'),
  h('sebelum-dan-sesudah', 'Sebelum dan sesudah', 'Tulis dua paragraf: apa yang kamu kira akan terjadi hari ini saat bangun pagi, dan apa yang benar-benar terjadi.'),
];

// ───────────────────────────────── Surat ─────────────────────────────────

const s = wp('surat');

const SURAT: WritingPrompt[] = [
  s('rumah-lama', 'Untuk rumah lama', 'Tulis surat untuk rumah yang dulu kamu tinggali. Ceritakan kabarmu, lalu tanyakan siapa yang sekarang tidur di kamarmu.'),
  s('orang-asing', 'Kepada orang asing', 'Tulis surat untuk orang asing yang kamu temui hari ini, di jalan, di antrean, atau di layar. Dia tidak akan pernah membacanya.'),
  s('terima-kasih-terlambat', 'Terima kasih yang terlambat', 'Surat terima kasih untuk seseorang yang menolongmu bertahun-tahun lalu dan tidak pernah tahu betapa berartinya itu.'),
  s('umur-tujuh', 'Untuk kamu umur tujuh', 'Surat untuk dirimu umur tujuh tahun, dengan kata-kata yang bisa dimengerti anak kecil. Ceritakan satu hal yang ternyata akan baik-baik saja.'),
  s('umur-tujuh-puluh', 'Untuk kamu umur tujuh puluh', 'Tulis surat untuk dirimu di umur tujuh puluh. Ajukan tiga pertanyaan, dan titipkan satu permintaan.'),
  s('tak-dikirim', 'Surat yang tak dikirim', 'Surat yang sudah lama ingin kamu kirim, tapi tidak akan pernah kamu kirim. Tulis selengkapnya, lalu biarkan ia tinggal di sini.'),
  s('guru', 'Kepada guru', 'Surat untuk guru yang paling kamu ingat, entah karena sayang atau karena takut. Ceritakan jadi apa kamu sekarang.'),
  s('kota', 'Untuk kota ini', 'Tulis surat cinta, atau surat protes, untuk kota tempatmu tinggal. Sebut jalan, warung, dan titik banjirnya dengan nama.'),
  s('benda-rusak', 'Untuk benda yang rusak', 'Surat untuk benda yang sudah rusak tapi tidak tega kamu buang. Ceritakan semua yang pernah kalian lewati bersama.'),
  s('balasan-terlambat', 'Balasan yang terlambat', 'Ingat pesan atau surat yang tidak pernah kamu balas? Tulis balasannya sekarang, seolah pesan itu baru tiba kemarin.'),
  s('yang-sudah-pergi', 'Kepada yang sudah pergi', 'Surat untuk seseorang yang sudah tiada. Ceritakan hal-hal kecil yang terjadi sejak ia pergi, seperti mengabari lewat telepon.'),
  s('tubuh', 'Untuk tubuhmu', 'Tulis surat untuk tubuhmu sendiri: minta maaf untuk satu hal, berterima kasih untuk satu hal, dan buat satu janji yang bisa ditepati.'),
  s('yang-menyakiti', 'Untuk yang pernah menyakiti', 'Surat untuk seseorang yang pernah menyakitimu. Kamu tidak harus memaafkan. Cukup katakan apa yang terjadi padamu sesudahnya.'),
  s('dari-masa-depan', 'Surat dari masa depan', 'Balik arahnya: tulis surat dari dirimu sepuluh tahun lagi untuk kamu hari ini. Kabar apa yang ingin dia sampaikan?'),
  s('untuk-anak', 'Untuk seorang anak', 'Surat untuk anak yang kamu punya, akan punya, atau tidak akan pernah punya. Ceritakan dunia seperti apa yang sedang kamu jalani.'),
  s('teman-lama', 'Untuk teman lama', 'Tulis surat untuk teman yang sudah bertahun-tahun tidak kamu hubungi. Mulai dengan kalimat: "Kemarin aku lewat depan…"'),
  s('kurir', 'Kepada kurir', 'Surat untuk kurir yang mengantar paketmu minggu ini. Bayangkan harinya, lalu tulis yang ingin kamu katakan selain "makasih, Bang".'),
  s('orang-tua', 'Untuk yang membesarkanmu', 'Surat untuk ibu, bapak, atau siapa pun yang membesarkanmu. Satu paragraf saja, berisi hal yang tidak pernah bisa kamu ucapkan langsung.'),
  s('kamu-kemarin', 'Untuk kamu kemarin malam', 'Surat pendek untuk dirimu kemarin malam. Apa yang ingin kamu bilang, setelah tahu bagaimana hari ini akhirnya berjalan?'),
  s('untuk-lagu', 'Untuk sebuah lagu', 'Tulis surat untuk satu lagu yang menemanimu di masa paling sulit. Ceritakan di mana kalian bertemu dan kapan kalian berpisah.'),
  s('penghuni-berikutnya', 'Kepada penghuni berikutnya', 'Surat untuk orang yang akan menempati kamarmu setelah kamu pindah. Apa yang perlu ia tahu soal keran, tetangga, dan cahaya pagi?'),
  s('diri-sendiri-hari-ini', 'Untuk yang menulis ini', 'Tulis surat untuk dirimu sendiri, hari ini, seperti menulis untuk sahabat yang baru melewati minggu yang berat.'),
];

// ──────────────────────────────── Fragmen ────────────────────────────────

const f = wp('fragmen');

const FRAGMEN: WritingPrompt[] = [
  f('bau-tiga-kalimat', 'Bau dalam tiga kalimat', 'Gambarkan satu bau dari masa kecilmu dalam tepat tiga kalimat, tanpa menyebut nama bendanya.'),
  f('lift', 'Tujuh lantai', 'Tulis satu adegan di dalam lift, tanpa awal dan tanpa akhir. Dua orang, satu rahasia, tujuh lantai.'),
  f('sepuluh-pembuka', 'Sepuluh kalimat pembuka', 'Tulis sepuluh kalimat pembuka untuk sepuluh cerita yang mungkin tidak akan pernah kamu tulis.'),
  f('lima-puluh-kata', 'Tepat lima puluh kata', 'Cerita utuh dalam tepat lima puluh kata. Hitung. Tidak boleh lebih, tidak boleh kurang.'),
  f('enam-kata', 'Lima kisah enam kata', 'Tulis lima kisah yang masing-masing hanya enam kata. Salah satunya harus membuat orang tersenyum.'),
  f('potret-seseorang', 'Potret lewat tangan', 'Gambarkan seseorang yang kamu lihat hari ini hanya lewat tangannya, sepatunya, dan caranya menunggu.'),
  f('sebelum-hujan', 'Lima menit sebelum hujan', 'Tulis satu paragraf tentang lima menit sebelum hujan turun. Hanya bunyi dan bau, tanpa satu pun warna.'),
  f('dongeng', 'Pada zaman dahulu kala', 'Tulis ulang hari ini sebagai dongeng. Mulai dengan "Pada zaman dahulu kala", ubah kantor jadi istana, dan jadikan dirimu tokoh sampingan.'),
  f('dialog-telanjang', 'Dialog tanpa keterangan', 'Tulis percakapan sepuluh baris tanpa keterangan siapa yang bicara dan tanpa deskripsi. Pembaca harus menebak di mana mereka berada.'),
  f('isi-laci', 'Isi sebuah laci', 'Buka satu laci di dekatmu. Tulis isinya seperti detektif yang mencoba menebak siapa pemiliknya.'),
  f('peta-ingatan', 'Peta dari ingatan', 'Tulis jalan dari rumah masa kecilmu ke sekolah, belokan demi belokan, sedetail yang masih bisa kamu ingat.'),
  f('menu-warung', 'Menu warung khayalan', 'Tulis daftar menu warung khayalan yang tiap hidangannya dinamai dari kenanganmu. Lengkap dengan harga dan keterangan "habis".'),
  f('detik-diperlambat', 'Satu detik diperlambat', 'Ambil satu detik dari hari ini, misalnya gelas yang hampir jatuh, lalu perlambat menjadi satu halaman penuh.'),
  f('akhir-novel', 'Kalimat terakhir novel', 'Tulis kalimat terakhir sebuah novel tentang hari ini. Lalu tulis tiga kalimat yang datang sebelumnya.'),
  f('langit-tanpa-warna', 'Langit tanpa nama warna', 'Gambarkan langit sore ini tanpa menyebut nama warna apa pun. Pakai benda, makanan, atau kenangan sebagai penggantinya.'),
  f('catatan-pinggir', 'Catatan di pinggir buku', 'Tulis catatan pinggir yang mungkin ditinggalkan pemilik pertama sebuah buku bekas. Siapa dia, dan kalimat mana yang ia garis bawahi?'),
  f('benda-di-saku', 'Benda di sakumu', 'Pilih satu benda di saku atau tasmu. Biarkan ia bercerita tentang hari ini sebagai "aku", dalam 100 kata.'),
  f('ruang-tunggu', 'Ruang tunggu', 'Fragmen berlatar ruang tunggu: puskesmas, bengkel, atau bandara. Tidak ada yang terjadi, tapi semua orang sedang menunggu sesuatu.'),
  f('iklan-kehilangan', 'Iklan kehilangan', 'Tulis iklan kehilangan untuk sesuatu yang tidak bisa dicari lewat koran: kebiasaan, keberanian, atau suara tawa seseorang.'),
  f('mimpi-plus-satu', 'Mimpi ditambah satu', 'Tulis mimpi terakhir yang kamu ingat, lalu sisipkan satu adegan yang tidak ada di mimpi itu. Jangan beri tahu yang mana.'),
  f('kata-acak', 'Satu kata dari kamus', 'Buka kamus atau KBBI secara acak, ambil kata pertama yang kamu lihat. Tulis fragmen yang berpusat pada kata itu.'),
  f('jendela-tetangga', 'Jendela seberang', 'Tulis apa yang terlihat dari satu jendela tetangga atau gedung seberang malam ini. Karang satu kalimat yang sedang diucapkan di baliknya.'),
];

export const WRITING_PROMPTS: WritingPrompt[] = [...ESAI, ...CERPEN, ...PUISI, ...CATATAN, ...SURAT, ...FRAGMEN];

/** FNV-1a 32-bit. Sengaja lokal supaya bank konten tidak bergantung ke modul lain. */
function hashSeed(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function promptsOf(kind?: WorkKind): WritingPrompt[] {
  return kind ? WRITING_PROMPTS.filter((wpr) => wpr.kind === kind) : WRITING_PROMPTS;
}

/** Pilihan tetap (deterministik) untuk jenis + seed yang sama, misalnya `${userId}:${day}`. */
export function writingPromptFor(kind: WorkKind, seed: string): WritingPrompt {
  const pool = promptsOf(kind);
  return pool[hashSeed(`${kind}:${seed}`) % pool.length]!;
}

/** Ajakan acak, untuk tombol "ajakan lain". Tanpa `kind` = dari semua jenis. */
export function randomWritingPrompt(kind?: WorkKind): WritingPrompt {
  const pool = promptsOf(kind);
  return pool[Math.floor(Math.random() * pool.length)]!;
}
