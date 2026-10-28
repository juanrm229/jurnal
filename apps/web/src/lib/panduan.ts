/**
 * Isi halaman Panduan: satu bab per fitur, lengkap dengan klip video
 * (direkam dari aplikasi asli oleh e2e/tutorial) dan langkah-langkahnya.
 * id bab = nama berkas klip di /panduan/<id>.mp4.
 */
export interface GuideChapter {
  id: string;
  title: string;
  doodle: string;
  lead: string;
  steps: string[];
  tip?: string;
  /** Belum ada klip video untuk bab ini. */
  noClip?: boolean;
  /** Halaman untuk langsung mencoba. */
  try?: { label: string; to: string };
}

export const GUIDE: GuideChapter[] = [
  {
    id: 'mulai',
    title: 'Mulai & kunci pribadi',
    doodle: 'tunas',
    lead: 'Sehari adalah jurnal kecil yang kamu isi bersama orang-orang pilihanmu: satu halaman setiap hari. Semua isinya dienkripsi di perangkatmu, jadi kami pun tidak bisa membacanya.',
    steps: [
      'Masuk dengan email. Tidak ada kata sandi: kami mengirim kode enam angka ke emailmu.',
      'Isi nama pena, tahun lahir, dan kota. Kota dipakai untuk zona waktu dan jam senja.',
      'Sehari membuat kunci pribadimu dan menampilkan kode pemulihan. Simpan kode itu (salin, unduh .txt, atau tulis di kertas).',
      'Ketik empat huruf terakhir kode untuk memastikan sudah tersimpan.',
    ],
    tip: 'Kode pemulihan adalah satu-satunya cara membuka jurnalmu di perangkat baru. Kalau hilang dan semua perangkatmu juga hilang, isinya tidak bisa dibuka siapa pun.',
  },
  {
    id: 'lingkaran',
    title: 'Lingkaran',
    doodle: 'ui-lingkaran',
    lead: 'Lingkaran adalah tempat kamu berbagi hari dengan orang-orang tersayang. Berdua disebut Duo; ada juga lingkaran sahabat, keluarga, dan kapsul momen untuk satu acara.',
    steps: [
      'Ketuk “kirim undangan”, lalu bagikan tautannya lewat WhatsApp atau tunjukkan QR-nya.',
      'Begitu dia menerima undangan dan membuat akun, kalian langsung satu lingkaran.',
      'Buat lingkaran lain dari menu Lingkaran → buat lingkaran.',
      'Halaman lingkaran berisi hari ini, janji temu, daftar mimpi, karya, surat, dan cerita kalian.',
      'Punya beberapa lingkaran (misalnya pasangan dan sahabat)? Nyalakan “halaman sendiri” untuk lingkaran tertentu: mereka tidak melihat halaman utamamu, dan kamu menulis halaman khusus untuk mereka.',
    ],
    try: { label: 'buka lingkaran', to: '/lingkaran' },
  },
  {
    id: 'hari',
    title: 'Halaman hari ini',
    doodle: 'buku',
    lead: 'Setiap hari kamu mendapat satu halaman kosong. Isi dengan apa saja, lalu tata sesukamu.',
    steps: [
      'Ketuk di mana saja di kertas untuk menulis. Ganti gaya huruf, ukuran, dan warna dari bilah bawah.',
      'Tambahkan foto: otomatis menjadi polaroid. Geser, putar, dan cubit untuk mengubah ukuran.',
      'Buka stiker: ratusan doodle, selotip washi, dan cap pos tanggal hari ini.',
      'Menu “lainnya”: rekam suara, lagu yang diputar hari ini, warna hari, dan ruang hening untuk hari yang berat.',
      'Bingung mau menulis apa? Tarik kartu pertanyaan dari dek bertema.',
    ],
    tip: 'Tiap tempelan bisa diatur “hanya aku” atau “bersama” lewat ikon gembok.',
    try: { label: 'buka halaman hari ini', to: '/hari' },
  },
  {
    id: 'niat',
    title: 'Niat pagi & cerita suara',
    doodle: 'matahari-kecil',
    noClip: true,
    lead: 'Pikiran pertama saat bangun adalah benih untuk seharian. Tanam satu yang baik, lalu ceritakan harimu dengan suara kalau sedang malas mengetik.',
    steps: [
      'Pagi hari, kartu “satu pikiran baik untuk hari ini?” muncul di atas halaman. Tulis satu kalimat, lalu ketuk panah.',
      'Niatnya tertempel di halaman dengan tulisan tangan. Niat hari-hari sebelumnya melayang samar di pinggir kartu.',
      'Saat menyegel, Sehari mengingatkan niat pagimu sebelum kamu menulis kalimat penutup.',
      'Cerita suara: lainnya → cerita suara, lalu rekam bebas. Nyalakan “tuliskan juga jadi teks” supaya ucapanmu ikut menjadi tulisan di bawah kasetnya.',
      'Di Kenangan, “banyak yang terjadi minggu ini” menumpuk foto tiap hari seperti polaroid di meja.',
    ],
    tip: 'Pasang Sehari di layar utama, lalu tekan lama ikonnya: ada pintasan langsung ke niat pagi dan cerita suara.',
    try: { label: 'buka halaman hari ini', to: '/hari?niat=1' },
  },
  {
    id: 'segel',
    title: 'Segel & buka bersama',
    doodle: 'segel-lilin',
    lead: 'Inti dari Sehari: setiap malam halaman disegel, dan isinya baru terlihat oleh lingkaranmu setelah semuanya ikut menyegel.',
    steps: [
      'Ketuk tombol segel, tulis satu kalimat penutup hari, lalu tahan tombolnya.',
      'Halaman yang tersegel tidak bisa diubah lagi.',
      'Setelah semua menyegel, tombol “buka hari ini bersama” muncul di halaman lingkaran.',
      'Halaman dibuka berdampingan. Geser untuk melihat halaman masing-masing, lalu kirim pelukan.',
      'Lingkaran dengan halaman sendiri punya tab dan segelnya sendiri di halaman hari ini. Lingkaran yang bergabung setelah kamu menyegel mendapat halaman susulan.',
    ],
    tip: 'Hari yang disegel bersama menambah nyala api kalian. Terlewat sehari tidak apa-apa: Sehari tidak pernah menghukum.',
  },
  {
    id: 'cerita',
    title: 'Cerita lingkaran',
    doodle: 'bintang',
    lead: 'Hari-hari yang kalian kumpulkan pelan-pelan menjadi cerita, di ruang-ruang kecil setiap lingkaran.',
    steps: [
      'Papan Tahun: setahun sebagai jalan berliku; hari bersama menumbuhkan tanaman.',
      'Langit Lingkaran: tiap hari bersama menjadi bintang, hari penting bisa dijadikan rasi.',
      'Kitab: bab per bulan dengan judul yang dipilih bersama, bisa dicetak menjadi buku.',
      'Lemari Benda, Dadu Kenangan, Ekspedisi tujuh hari, Kamus kalian, dan Puisi Temuan.',
      'Wrap mingguan, bulanan, dan tahunan diputar seperti story.',
    ],
  },
  {
    id: 'surat',
    title: 'Surat',
    doodle: 'amplop',
    lead: 'Pesan yang sampai di waktu yang tepat. Ada empat jenis, semuanya terenkripsi.',
    steps: [
      'Buka Kalau…: langsung sampai, tapi dibuka penerima saat momennya tiba (kalau sedih, kangen, tidak bisa tidur). Kamu tahu saat amplopnya dibuka.',
      'Surat Tersesat: sampai di waktu acak, satu sampai dua belas bulan lagi.',
      'Surat untuk Nanti: kapsul waktu yang terbuka di tanggal pilihanmu.',
      'Surat Petak Istimewa: terbuka saat lingkaran mencapai hari ke-7, 30, 100, atau 365.',
    ],
    try: { label: 'tulis surat', to: '/surat/tulis' },
  },
  {
    id: 'karya',
    title: 'Karya',
    doodle: 'pena',
    lead: 'Ruang menulis yang tenang untuk esai, cerpen, puisi, dan jurnal pribadi.',
    steps: [
      'Ketuk “tulis karya baru”, lalu pilih jenisnya.',
      'Tulisan tersimpan otomatis dan terenkripsi.',
      'Terbitkan untuk dirimu sendiri atau untuk lingkaran; pembaca bisa memberi tanda dan catatan.',
      'Semua karya tersusun di rak dengan sampul otomatis.',
    ],
    try: { label: 'buka karya', to: '/karya' },
  },
  {
    id: 'janji',
    title: 'Janji temu',
    doodle: 'tangan-bergandeng',
    lead: 'Rencanakan kencan atau kumpul, lalu abadikan hari itu.',
    steps: [
      'Bingung mau ke mana? Putar mesin “acak”: tempat, kegiatan, makanan, misi kecil, obrolan, dresscode. Kunci yang pas, putar sisanya.',
      'Jadikan rencana, pilih waktu, lalu kirim ajakan. Kalian mendapat struk estetik yang bisa disimpan.',
      'Tulis harapan rahasia; semua harapan terbuka setelah kalian bertemu.',
      'Di tempat, saling tandai “kita ketemu” (tidak wajib).',
      'Setelahnya, tulis cerita, beri nilai, dan tambahkan foto.',
    ],
    try: { label: 'bingung mau ke mana?', to: '/janji/acak' },
  },
  {
    id: 'mimpi',
    title: 'Daftar mimpi bersama',
    doodle: 'kompas',
    lead: 'Bucket list lingkaran kalian: hal-hal yang ingin dilakukan bersama, besar maupun kecil.',
    steps: [
      'Buka lingkaran → daftar mimpi bersama → tambah mimpi. Ketuk “butuh ide?” kalau bingung.',
      'Anggota lain bisa menandai “aku juga mau”; mimpi paling diinginkan naik ke atas.',
      'Ketuk mimpinya → jadikan janji temu. Janji itu tersambung ke mimpinya.',
      'Tandai terwujud: mimpinya menjadi bintang di toples, dan menyimpan tautan ke cerita kencannya.',
    ],
  },
  {
    id: 'inspirasi',
    title: 'Papan inspirasi & rak lagu',
    doodle: 'klip-kertas',
    noClip: true,
    lead: 'Dua ruang yang terisi pelan-pelan: moodboard untuk incaran dan ide, dan dinding galeri untuk lagu-lagu kalian.',
    steps: [
      'Buka lingkaran → papan inspirasi. Ketuk + untuk menempel foto, atau ikon klip dan pena untuk tautan dan catatan.',
      'Masukkan ke rak “incaran” (barang yang ingin dibeli, lengkap dengan harga) atau rak “ide”.',
      'Dari aplikasi lain (marketplace, Pinterest, peta), ketuk Bagikan → Sehari. Tautannya langsung siap ditempel.',
      'Sudah terbeli atau sudah dicoba? Ketuk tempelannya → sudah dibeli. Siapa pun di lingkaran boleh mencentang.',
      'Rak lagu: setiap lagu yang kalian tempel di halaman hari tergantung sebagai sampul di dinding, dan semuanya berjajar di rak. Ketuk untuk memutarnya lagi.',
    ],
    tip: 'Isi papan terenkripsi seperti halaman jurnal: hanya anggota lingkaran yang bisa melihat fotonya.',
    try: { label: 'buka lingkaran', to: '/lingkaran' },
  },
  {
    id: 'kartu',
    title: 'Kartu ucapan',
    doodle: 'kartu',
    lead: 'Kartu untuk ulang tahun, minta maaf, atau tanpa alasan. Dibuat di perangkatmu, dikirim lewat WhatsApp.',
    steps: [
      'Pilih momennya; Sehari memberi contoh kalimat. Ketuk “contoh lain” untuk ide berikutnya.',
      'Pilih salah satu dari 19 desain dan formatnya: 4:5, story, atau lebar.',
      'Tambahkan foto, warna tinta, dan sampai tiga doodle.',
      'Ketuk “kirim ke WhatsApp”, atau unduh sebagai gambar.',
    ],
    try: { label: 'buat kartu', to: '/kartu' },
  },
  {
    id: 'tentang',
    title: 'Tentang Kita',
    doodle: 'gelembung-kata',
    lead: 'Permainan kartu ngobrol dengan 581 pertanyaan yang tidak kacangan, untuk pasangan, PDKT, sahabat, atau sendirian.',
    steps: [
      'Pilih main dengan siapa, seberapa dalam (3 level), jenis kartu, dan jumlah kartu.',
      'Jawab bergiliran. Ketuk “gali lagi” untuk pertanyaan lanjutan.',
      'Kartu Renung (filosofis & semesta): jawab spontan, atau riset dulu dengan timer dan kata kunci.',
      'Simpan kartu favorit, tulis jawabannya di jurnal, atau kunci jadi kapsul untuk ditanyakan lagi setahun kemudian.',
      'Di akhir, tulis kalimat penutup dan jadikan kartu ucapan.',
    ],
    try: { label: 'main sekarang', to: '/tentang-kita' },
  },
  {
    id: 'kenangan',
    title: 'Kenangan',
    doodle: 'ui-kenangan',
    lead: 'Semua yang pernah kalian tulis, rapi dan mudah ditemukan.',
    steps: ['Taman tahunan: hari-hari yang kamu isi.', 'Hari ini di tahun-tahun lalu, dan semua surat yang pernah sampai.', 'Kitab lingkaran bisa dicetak menjadi buku “Tahun Kita”.'],
    try: { label: 'buka kenangan', to: '/kenangan' },
  },
  {
    id: 'aku',
    title: 'Aku & pengaturan',
    doodle: 'ui-aku',
    lead: 'Atur Sehari supaya terasa milikmu.',
    steps: [
      'Profil: foto atau doodle avatar dengan warna latar.',
      'Tema warna: bawaannya putih dan biru, ada banyak pilihan lain dan mode gelap.',
      'Suara: musik latar melankolis, efek suara tipis, dan suara mengetik. Bisa dinyalakan atau dimatikan.',
      'Keamanan & privasi: kode pemulihan, tautkan perangkat baru, ekspor data, hapus akun.',
      'Pasang di layar utama HP: menu peramban → tambahkan ke layar utama.',
    ],
    try: { label: 'buka pengaturan', to: '/aku' },
  },
];
