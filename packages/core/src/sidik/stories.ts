/**
 * Cerita SIDIK: tiap kasus punya latar, kejahatan, empat lokasi (masing-masing
 * menyimpan jejak satu ciri pelaku), ciri-ciri tersangka, profesi dengan
 * kebiasaan kecil, dan narasi pembuka. Tersangka dirakit acak dari sini,
 * jadi kasus dengan tema yang sama pun tidak pernah persis sama.
 */
export interface Trait {
  /** Frasa kerja: "memakai topi", "membawa payung". Negatif: "tidak " + frasa. */
  phrase: string;
  /** Label pendek di kartu tersangka. */
  label: string;
  emoji: string;
}

export interface Category {
  name: string;
  traits: [Trait, Trait, Trait];
}

export interface Place {
  name: string;
  emoji: string;
  /** Doodle Sehari untuk tempat ini. */
  doodle: string;
  /** Kategori ciri yang jejaknya tertinggal di sini. */
  cat: number;
  /** Sumber petunjuk khas tempat ini. */
  sources: string[];
}

export interface Story {
  id: string;
  title: string;
  emoji: string;
  doodle: string;
  genre: string;
  /** Kalimat pembuka narator. */
  intro: string;
  /** Apa yang terjadi (satu kalimat, tampil di papan kasus). */
  crime: string;
  when: string;
  /** Benda/korban, untuk narasi akhir. */
  loot: string;
  places: [Place, Place, Place, Place];
  cats: [Category, Category, Category, Category];
  /** Profesi + kebiasaan, dirangkai dengan nama acak. */
  roles: { job: string; quirk: string }[];
  /** Kalimat penutup bila pelaku tertangkap / lolos. */
  caught: string;
  escaped: string;
}

const t = (phrase: string, label: string, emoji: string): Trait => ({ phrase, label, emoji });

export const NAMES = [
  'Raka', 'Sinta', 'Bima', 'Nadia', 'Yoga', 'Laras', 'Dimas', 'Putri', 'Fajar', 'Ayu', 'Rudi', 'Mega', 'Andra', 'Wulan', 'Gilang', 'Tiara',
  'Bayu', 'Citra', 'Reza', 'Indah', 'Hendra', 'Sekar', 'Arif', 'Maya', 'Tono', 'Rani', 'Jaka', 'Dewi', 'Imam', 'Kirana', 'Satria', 'Lestari',
  'Bowo', 'Anggun', 'Galih', 'Ratna', 'Eko', 'Melati', 'Agus', 'Nirmala',
];

const CLOTH = (a: string, b: string, c: string): Category => ({
  name: 'pakaian',
  traits: [t(`memakai ${a}`, a, '👕'), t(`memakai ${b}`, b, '🧥'), t(`memakai ${c}`, c, '🥻')],
});

export const STORIES: Story[] = [
  {
    id: 'kos',
    title: 'Kalung di Kos Melati',
    emoji: '🏚️',
    doodle: 'rumah',
    genre: 'pencurian',
    intro:
      'Malam Minggu, hujan tidak berhenti sejak magrib. Di Kos Melati, Bu Ratmi menjerit dari kamar nomor tiga: kalung emas warisan ibunya lenyap dari kotak beludru. Pintu tidak dibobol. Pencurinya orang dalam, dan dia masih ada di rumah ini.',
    crime: 'Kalung emas warisan Bu Ratmi hilang dari kamar nomor 3.',
    when: 'Sabtu malam, antara pukul 20.00 dan 22.00',
    loot: 'kalung warisan Bu Ratmi',
    places: [
      { name: 'Dapur bersama', emoji: '🍳', doodle: 'cangkir', cat: 0, sources: ['Serat kain tersangkut di paku dekat rak piring', 'Pak Jono yang menggoreng tempe bersumpah melihat', 'Noda kopi di kursi plastik'] },
      { name: 'Teras & parkiran', emoji: '🛵', doodle: 'motor', cat: 1, sources: ['Rekaman CCTV warung seberang', 'Tukang parkir yang kedinginan bercerita', 'Bekas cetakan di genangan lumpur'] },
      { name: 'Tangga & lorong', emoji: '🪜', doodle: 'jendela', cat: 2, sources: ['Jejak basah di anak tangga', 'Lampu sensor lorong menyala, dan seseorang terlihat', 'Kertas jatuh di bawah sakelar'] },
      { name: 'Jemuran atap', emoji: '👕', doodle: 'angin', cat: 3, sources: ['Jemuran yang tergeser', 'Kucing kos tidur di atas sesuatu', 'Tetangga dari jendela sebelah mengintip'] },
    ],
    cats: [
      CLOTH('kaus oblong', 'jaket hoodie', 'kemeja flanel'),
      { name: 'bawaan', traits: [t('membawa payung', 'payung', '☂️'), t('membawa kantong plastik', 'kresek', '🛍️'), t('membawa tas selempang', 'tas', '👜')] },
      { name: 'alas kaki', traits: [t('bersandal jepit', 'sandal jepit', '🩴'), t('bersepatu kets', 'sepatu kets', '👟'), t('bersepatu bot', 'sepatu bot', '🥾')] },
      { name: 'ciri', traits: [t('berkacamata', 'kacamata', '👓'), t('memakai topi', 'topi', '🧢'), t('memakai masker', 'masker', '😷')] },
    ],
    roles: [
      { job: 'mahasiswa semester akhir', quirk: 'skripsinya belum disentuh sejak Agustus' },
      { job: 'ojol', quirk: 'motornya selalu diparkir paling dekat pintu' },
      { job: 'perawat sif malam', quirk: 'baru pulang jaga, matanya merah' },
      { job: 'penjual pulsa', quirk: 'tahu nomor HP semua penghuni' },
      { job: 'anak band', quirk: 'gitarnya baru saja masuk pegadaian' },
      { job: 'pegawai bank', quirk: 'rapi sekali, terlalu rapi' },
      { job: 'adik Bu Ratmi', quirk: 'datang tanpa kabar tadi sore' },
      { job: 'tukang servis AC', quirk: 'bilang cuma mampir berteduh' },
      { job: 'penghuni lama', quirk: 'menunggak sewa tiga bulan' },
      { job: 'konten kreator', quirk: 'merekam semuanya, kecuali malam ini' },
      { job: 'satpam kompleks', quirk: 'punya kunci cadangan semua kamar' },
      { job: 'guru les privat', quirk: 'sering meminjam setrika Bu Ratmi' },
    ],
    caught: 'Kalung itu ditemukan di dasar kantong plastik berisi cucian. Bu Ratmi menangis lega, dan Kos Melati malam itu memesan martabak untuk semua.',
    escaped: 'Besok paginya satu kamar kosong, kuncinya ditinggal di meja. Kalung Bu Ratmi tidak pernah kembali.',
  },
  {
    id: 'kondangan',
    title: 'Amplop Raib di Kondangan',
    emoji: '💍',
    doodle: 'kado',
    genre: 'pencurian',
    intro:
      'Pesta pernikahan anak Pak Lurah sedang meriah-meriahnya. Organ tunggal memainkan lagu dangdut kesekian. Tiba-tiba kotak amplop sumbangan di meja tamu ringan sekali: separuh isinya hilang. Tamu belum ada yang pulang. Pak Lurah mengunci gerbang.',
    crime: 'Separuh amplop sumbangan di kotak tamu raib.',
    when: 'Minggu siang, saat sesi foto keluarga',
    loot: 'amplop sumbangan pengantin',
    places: [
      { name: 'Meja prasmanan', emoji: '🍛', doodle: 'nasi-padang', cat: 0, sources: ['Bu katering hafal semua yang antre rendang', 'Noda kuah di taplak', 'Foto candid fotografer'] },
      { name: 'Pelaminan', emoji: '💐', doodle: 'bunga-vas', cat: 1, sources: ['Video drone dari atas', 'Pengantin ingat siapa yang salaman dua kali', 'Kelopak bunga yang terinjak'] },
      { name: 'Parkiran motor', emoji: '🏍️', doodle: 'motor', cat: 2, sources: ['Karcis parkir yang tercecer', 'Tukang parkir dadakan bercerita', 'Jejak di tanah becek'] },
      { name: 'Belakang tenda', emoji: '⛺', doodle: 'tenda', cat: 3, sources: ['Sobekan amplop dekat genset', 'Anak kecil yang main petak umpet melihat', 'Asap rokok yang belum hilang'] },
    ],
    cats: [
      { name: 'busana', traits: [t('memakai batik', 'batik', '🥻'), t('memakai kebaya', 'kebaya', '👘'), t('memakai jas', 'jas', '🤵')] },
      { name: 'bawaan', traits: [t('membawa kado besar', 'kado', '🎁'), t('membawa tas tangan', 'tas tangan', '👛'), t('membawa kipas', 'kipas', '🪭')] },
      { name: 'alas kaki', traits: [t('bersepatu pantofel', 'pantofel', '👞'), t('bersandal selop', 'selop', '🩴'), t('bersepatu hak tinggi', 'hak tinggi', '👠')] },
      { name: 'ciri', traits: [t('berpeci', 'peci', '🎩'), t('berkacamata hitam', 'kacamata hitam', '🕶️'), t('memakai bros bunga', 'bros', '🌸')] },
    ],
    roles: [
      { job: 'sepupu jauh pengantin', quirk: 'tidak ada yang ingat namanya' },
      { job: 'fotografer sewaan', quirk: 'memotret kotak amplop terlalu sering' },
      { job: 'mantan pengantin pria', quirk: 'datang tanpa undangan' },
      { job: 'MC acara', quirk: 'tahu persis kapan semua orang lengah' },
      { job: 'penyanyi organ tunggal', quirk: 'istirahatnya lama sekali' },
      { job: 'tetangga sebelah', quirk: 'sudah tiga kali ambil rendang' },
      { job: 'teman kantor pengantin', quirk: 'sibuk merekam story' },
      { job: 'panitia among tamu', quirk: 'memegang buku tamu sejak pagi' },
      { job: 'adik ipar Pak Lurah', quirk: 'baru saja kalah taruhan bola' },
      { job: 'tukang dekor', quirk: 'punya akses ke belakang pelaminan' },
      { job: 'tamu dari kota', quirk: 'mobilnya diparkir menghalangi gerbang' },
      { job: 'kepala katering', quirk: 'menghitung uang sejak siang' },
    ],
    caught: 'Amplop-amplop itu ditemukan terselip di balik kado besar. Pengantin memaafkan, tapi namanya dicoret dari daftar undangan arisan seumur hidup.',
    escaped: 'Kotak amplop dihitung ulang tiga kali; tetap kurang. Sampai sekarang orang kampung masih menebak-nebak siapa.',
  },
  {
    id: 'startup',
    title: 'Kebocoran di Kantor Rintisan',
    emoji: '💻',
    doodle: 'laptop',
    genre: 'spionase',
    intro:
      'Dua jam sebelum peluncuran aplikasi terbesar mereka, desain rahasia sudah beredar di grup kompetitor. Seseorang menyalinnya dari laptop CEO di lantai tujuh. Akses gedung terkunci sejak pukul delapan. Pengkhianatnya masih duduk di salah satu meja ini.',
    crime: 'Desain produk rahasia disalin dari laptop CEO.',
    when: 'Kamis malam, lembur sebelum peluncuran',
    loot: 'berkas desain rahasia',
    places: [
      { name: 'Pantri', emoji: '☕', doodle: 'cangkir', cat: 0, sources: ['Gelas kopi bertuliskan nama samaran', 'Mesin kopi mencatat waktu pesanan', 'OB yang belum pulang bercerita'] },
      { name: 'Ruang server', emoji: '🖥️', doodle: 'laptop', cat: 1, sources: ['Log masuk kartu akses', 'Kabel yang dicabut tergesa', 'Kamera termal di pintu'] },
      { name: 'Ruang rapat kaca', emoji: '🪟', doodle: 'jendela', cat: 2, sources: ['Coretan di papan tulis yang dihapus terburu-buru', 'Pantulan di dinding kaca terekam', 'Kursi yang masih hangat'] },
      { name: 'Lift & lobi', emoji: '🛗', doodle: 'kunci', cat: 3, sources: ['CCTV lift lantai tujuh', 'Resepsionis yang lembur ingat', 'Kartu tamu yang belum dikembalikan'] },
    ],
    cats: [
      { name: 'minuman', traits: [t('minum kopi susu', 'kopi susu', '☕'), t('minum teh tarik', 'teh', '🧋'), t('minum air mineral', 'air putih', '💧')] },
      { name: 'perangkat', traits: [t('memakai headphone', 'headphone', '🎧'), t('membawa tablet', 'tablet', '📱'), t('membawa flashdisk', 'flashdisk', '💾')] },
      { name: 'pakaian', traits: [t('memakai hoodie', 'hoodie', '🧥'), t('memakai blazer', 'blazer', '🥼'), t('memakai kaus komunitas', 'kaus', '👕')] },
      { name: 'ciri', traits: [t('memakai tanda pengenal merah', 'ID merah', '🟥'), t('memakai tanda pengenal biru', 'ID biru', '🟦'), t('memakai tanda pengenal kuning', 'ID kuning', '🟨')] },
    ],
    roles: [
      { job: 'desainer produk', quirk: 'paling tahu isi berkas itu' },
      { job: 'magang IT', quirk: 'punya kata sandi wifi semua lantai' },
      { job: 'kepala pemasaran', quirk: 'baru ditawari kerja oleh kompetitor' },
      { job: 'programmer senior', quirk: 'tidur di kantor tiga malam berturut' },
      { job: 'akuntan', quirk: 'menolak lembur tapi masih di sini' },
      { job: 'penulis konten', quirk: 'mengetik sesuatu sambil menutup layar' },
      { job: 'investor tamu', quirk: 'tidak seharusnya ada di lantai tujuh' },
      { job: 'office boy', quirk: 'bisa masuk ke ruangan mana saja' },
      { job: 'HRD', quirk: 'menyimpan semua kartu akses cadangan' },
      { job: 'data scientist', quirk: 'grafiknya tidak pernah salah, katanya' },
      { job: 'sekretaris CEO', quirk: 'tahu jadwal CEO menit demi menit' },
      { job: 'tim legal', quirk: 'sedang menyusun surat pengunduran diri' },
    ],
    caught: 'Flashdisk itu ditemukan di dalam kotak tisu. Peluncuran tetap berjalan, dan CEO menulis utas panjang tentang kepercayaan.',
    escaped: 'Seminggu kemudian, kompetitor meluncurkan aplikasi yang sangat mirip. Pengkhianatnya pindah kerja dengan gaji dua kali lipat.',
  },
  {
    id: 'sekolah',
    title: 'Soal Ujian yang Hilang',
    emoji: '🏫',
    doodle: 'buku',
    genre: 'pencurian',
    intro:
      'Besok pagi ujian akhir. Malam ini, map berisi soal matematika lenyap dari lemari ruang guru SMA Harapan Bangsa. Penjaga sekolah sudah mengunci gerbang sejak pukul tujuh, tapi ada yang masih tinggal: panitia pensi, OSIS, dan beberapa guru yang lembur.',
    crime: 'Map soal ujian matematika hilang dari lemari ruang guru.',
    when: 'Malam sebelum ujian, pukul 19.00 sampai 21.00',
    loot: 'map soal ujian',
    places: [
      { name: 'Kantin', emoji: '🍜', doodle: 'mie', cat: 0, sources: ['Ibu kantin yang membereskan kursi', 'Bungkus jajan yang masih baru', 'Coretan di meja kayu'] },
      { name: 'Lab komputer', emoji: '🖨️', doodle: 'hp', cat: 1, sources: ['Riwayat cetak printer', 'Jejak jari di kaca monitor', 'Kursi yang bergeser'] },
      { name: 'Lapangan basket', emoji: '🏀', doodle: 'matahari', cat: 2, sources: ['Lampu lapangan dinyalakan sebentar', 'Penjaga sekolah dari pos jaga', 'Jejak sepatu di pasir'] },
      { name: 'Perpustakaan', emoji: '📚', doodle: 'rak-buku', cat: 3, sources: ['Buku yang dikembalikan di rak yang salah', 'Kartu pinjam dengan tulisan terburu-buru', 'Pustakawan yang tertidur bangun sebentar'] },
    ],
    cats: [
      { name: 'jajan', traits: [t('makan cilok', 'cilok', '🍢'), t('minum es teh', 'es teh', '🧊'), t('makan keripik', 'keripik', '🥔')] },
      { name: 'bawaan', traits: [t('membawa laptop', 'laptop', '💻'), t('membawa map biru', 'map biru', '📘'), t('membawa gitar', 'gitar', '🎸')] },
      { name: 'alas kaki', traits: [t('bersepatu hitam', 'sepatu hitam', '👞'), t('bersepatu putih', 'sepatu putih', '👟'), t('bersandal', 'sandal', '🩴')] },
      { name: 'ciri', traits: [t('memakai jaket almamater', 'almamater', '🧥'), t('memakai kacamata', 'kacamata', '👓'), t('memakai jam tangan', 'jam tangan', '⌚')] },
    ],
    roles: [
      { job: 'ketua OSIS', quirk: 'nilainya harus sempurna' },
      { job: 'guru honorer', quirk: 'gajinya telat dua bulan' },
      { job: 'juara olimpiade', quirk: 'terlalu tenang untuk malam sebelum ujian' },
      { job: 'anak pindahan', quirk: 'baru seminggu, sudah tahu semua jalan pintas' },
      { job: 'panitia pensi', quirk: 'punya kunci aula' },
      { job: 'penjaga sekolah', quirk: 'memegang semua kunci' },
      { job: 'wali kelas', quirk: 'pernah dituduh membocorkan soal' },
      { job: 'kapten tim basket', quirk: 'terancam tidak lulus' },
      { job: 'anak kepala sekolah', quirk: 'sering ke ruang guru' },
      { job: 'tukang fotokopi', quirk: 'mesinnya baru dipakai pukul delapan' },
      { job: 'guru BK', quirk: 'tahu rahasia semua murid' },
      { job: 'siswa kelas sepuluh', quirk: 'disuruh kakak kelas mengambil sesuatu' },
    ],
    caught: 'Map itu ditemukan di dalam sarung gitar. Ujian diundur sehari, dan semua orang lega bisa belajar lebih lama.',
    escaped: 'Pagi harinya, foto soal sudah beredar di grup kelas. Ujian dibatalkan, dan tidak ada yang tahu siapa.',
  },
  {
    id: 'kapal',
    title: 'Berlian di Kapal Samudra Senja',
    emoji: '🛳️',
    doodle: 'kapal',
    genre: 'pencurian mewah',
    intro:
      'Pesta topeng di kapal pesiar Samudra Senja mencapai puncaknya saat lampu dansa dimatikan sebentar. Ketika menyala lagi, kalung berlian Nyonya Wiradana tinggal kaitnya saja. Kapal ada di tengah laut. Tidak ada yang bisa turun sampai pagi.',
    crime: 'Kalung berlian Nyonya Wiradana dicuri saat lampu dansa padam.',
    when: 'Tengah malam di tengah Laut Jawa',
    loot: 'kalung berlian Nyonya Wiradana',
    places: [
      { name: 'Ruang dansa', emoji: '💃', doodle: 'not-balok', cat: 0, sources: ['Pemain biola melihat dari panggung', 'Manik-manik topeng yang lepas', 'Bayangan di lantai kaca'] },
      { name: 'Dek atas', emoji: '🌊', doodle: 'kapal', cat: 1, sources: ['Angin membawa wangi parfum', 'Pelaut jaga bercerita', 'Teropong kapten'] },
      { name: 'Kasino kecil', emoji: '🎰', doodle: 'dadu', cat: 2, sources: ['Bandar kartu hafal siapa yang menang', 'Chip yang tertinggal', 'Kamera di atas meja rolet'] },
      { name: 'Lorong kabin', emoji: '🚪', doodle: 'kunci-rumah', cat: 3, sources: ['Kartu kunci kabin dipakai pukul 00.07', 'Pelayan kamar yang membawa nampan', 'Karpet yang basah'] },
    ],
    cats: [
      { name: 'topeng', traits: [t('memakai topeng emas', 'topeng emas', '🎭'), t('memakai topeng bulu', 'topeng bulu', '🪶'), t('memakai topeng hitam', 'topeng hitam', '🖤')] },
      { name: 'wangi', traits: [t('berparfum mawar', 'mawar', '🌹'), t('berparfum kayu', 'kayu', '🪵'), t('berparfum jeruk', 'jeruk', '🍊')] },
      { name: 'kebiasaan', traits: [t('bermain kartu', 'kartu', '🃏'), t('minum sampanye', 'sampanye', '🥂'), t('mengisap cerutu', 'cerutu', '🚬')] },
      { name: 'tangan', traits: [t('memakai sarung tangan putih', 'sarung putih', '🧤'), t('memakai sarung tangan renda', 'renda', '🕸️'), t('memakai cincin besar', 'cincin besar', '💍')] },
    ],
    roles: [
      { job: 'pewaris pabrik gula', quirk: 'utangnya lebih besar dari kapal ini' },
      { job: 'penyanyi jaz kapal', quirk: 'berhenti bernyanyi tepat saat lampu padam' },
      { job: 'detektif swasta pensiunan', quirk: 'terlalu tertarik pada kalung itu' },
      { job: 'kapten kapal', quirk: 'memegang kunci semua kabin' },
      { job: 'kolektor perhiasan', quirk: 'pernah menawar kalung itu dan ditolak' },
      { job: 'menantu Nyonya Wiradana', quirk: 'tidak disebut dalam surat wasiat' },
      { job: 'bandar kartu', quirk: 'tangannya cepat sekali' },
      { job: 'pelayan baru', quirk: 'namanya tidak ada di daftar awak' },
      { job: 'dokter kapal', quirk: 'membawa tas hitam ke mana-mana' },
      { job: 'aktris sinetron', quirk: 'butuh sensasi minggu ini' },
      { job: 'juru masak kepala', quirk: 'dapurnya punya pintu ke lorong kabin' },
      { job: 'penulis novel misteri', quirk: 'mencatat semua orang di buku kecil' },
    ],
    caught: 'Berlian itu ditemukan di dasar gelas sampanye yang belum dicuci. Kapal berlabuh dengan polisi menunggu di dermaga.',
    escaped: 'Di dermaga, seseorang turun lebih dulu dengan topeng masih terpasang. Nyonya Wiradana hanya memegang kait kalung yang kosong.',
  },
  {
    id: 'pocong',
    title: 'Pocong Palsu Kampung Bulak',
    emoji: '👻',
    doodle: 'lentera',
    genre: 'komedi horor',
    intro:
      'Tiga malam berturut-turut, "pocong" melompat-lompat di dekat pos ronda Kampung Bulak dan membuat warga kabur meninggalkan gorengan. Malam ini warga memasang jebakan, dan si pocong terpeleset lalu kabur meninggalkan kain kafan. Pelakunya warga sendiri. Tapi siapa?',
    crime: 'Seseorang menyamar jadi pocong dan menakut-nakuti warga.',
    when: 'Malam Jumat, selepas isya',
    loot: 'gorengan ronda yang hilang',
    places: [
      { name: 'Pos ronda', emoji: '🛖', doodle: 'lentera', cat: 0, sources: ['Kentongan yang dipukul tidak beraturan', 'Hansip yang pura-pura berani', 'Gorengan yang tinggal separuh'] },
      { name: 'Pohon beringin', emoji: '🌳', doodle: 'pohon-kecil', cat: 1, sources: ['Tali rafia di dahan', 'Nenek penjual jamu melihat', 'Jejak bedak di akar'] },
      { name: 'Kuburan pinggir desa', emoji: '🪦', doodle: 'bulan', cat: 2, sources: ['Senter yang tertinggal', 'Penggali kubur yang lembur', 'Jejak lompatan di tanah'] },
      { name: 'Warung kopi', emoji: '☕', doodle: 'kopi-susu', cat: 3, sources: ['Pemilik warung mencatat utang', 'Bon yang terselip', 'Radio yang tiba-tiba mati'] },
    ],
    cats: [
      { name: 'bau', traits: [t('berbau minyak angin', 'minyak angin', '🧴'), t('berbau melati', 'melati', '🌼'), t('berbau rokok kretek', 'kretek', '🚬')] },
      { name: 'bawaan', traits: [t('membawa senter', 'senter', '🔦'), t('membawa sarung', 'sarung', '🧣'), t('membawa termos', 'termos', '🫖')] },
      { name: 'kaki', traits: [t('berkaki besar', 'kaki besar', '🦶'), t('berjalan pincang', 'pincang', '🦯'), t('berlari kencang', 'gesit', '🏃')] },
      { name: 'suara', traits: [t('bersuara serak', 'serak', '🗣️'), t('suka bersiul', 'bersiul', '🎶'), t('tertawa cekikikan', 'cekikikan', '🤭')] },
    ],
    roles: [
      { job: 'ketua RT', quirk: 'ingin warga rajin ronda' },
      { job: 'tukang gorengan', quirk: 'dagangannya laris tiap ada hantu' },
      { job: 'pemuda karang taruna', quirk: 'sedang bikin konten horor' },
      { job: 'dukun kampung', quirk: 'pasiennya bertambah minggu ini' },
      { job: 'penjual kain kafan', quirk: 'stoknya berkurang satu' },
      { job: 'hansip', quirk: 'selalu datang terlambat saat ronda' },
      { job: 'mahasiswa KKN', quirk: 'meneliti kepercayaan warga' },
      { job: 'juragan kontrakan', quirk: 'ingin warga takut lewat jalan pintas' },
      { job: 'penjaga makam', quirk: 'hafal semua nisan' },
      { job: 'nenek penjual jamu', quirk: 'bangun paling pagi, tidur paling malam' },
      { job: 'anak kepala desa', quirk: 'bosan setengah mati' },
      { job: 'tukang cukur', quirk: 'tahu semua gosip kampung' },
    ],
    caught: 'Si "pocong" ternyata cuma ingin warga ramai di pos ronda. Hukumannya: traktir gorengan satu kampung selama seminggu.',
    escaped: 'Malam berikutnya pocong muncul lagi, kali ini membawa termos. Warga memutuskan untuk tidak ronda dulu.',
  },
  {
    id: 'kereta',
    title: 'Koper Tertukar di Kereta Malam',
    emoji: '🚆',
    doodle: 'kereta',
    genre: 'spionase',
    intro:
      'Kereta malam Jakarta–Surabaya melaju di antara sawah gelap. Di gerbong eksekutif, koper berisi dokumen negara milik seorang diplomat tertukar dengan koper berisi batu bata. Kereta tidak berhenti sampai Semarang. Pelakunya masih di gerbong ini.',
    crime: 'Koper dokumen diplomat ditukar dengan koper berisi batu bata.',
    when: 'Antara Cirebon dan Semarang, lewat tengah malam',
    loot: 'koper dokumen diplomat',
    places: [
      { name: 'Kereta makan', emoji: '🍽️', doodle: 'teh-panas', cat: 0, sources: ['Pramugari mencatat pesanan nasi goreng', 'Gelas yang belum diangkat', 'Struk makan yang tertinggal'] },
      { name: 'Bordes sambungan', emoji: '🚪', doodle: 'angin', cat: 1, sources: ['Angin malam membawa asap', 'Kondektur melihat seseorang', 'Bekas tangan di kaca pintu'] },
      { name: 'Rak bagasi', emoji: '🧳', doodle: 'koper', cat: 2, sources: ['Label koper yang dirobek', 'Penumpang sebelah terbangun', 'Goresan di rak besi'] },
      { name: 'Toilet gerbong 3', emoji: '🚻', doodle: 'jendela', cat: 3, sources: ['Cermin berembun dengan tulisan', 'Tisu yang jatuh di lantai', 'Bau yang tertinggal'] },
    ],
    cats: [
      { name: 'pesanan', traits: [t('memesan kopi hitam', 'kopi hitam', '☕'), t('memesan mi rebus', 'mi rebus', '🍜'), t('memesan teh manis', 'teh manis', '🍵')] },
      { name: 'penutup kepala', traits: [t('memakai topi fedora', 'fedora', '🎩'), t('memakai kupluk', 'kupluk', '🧶'), t('memakai peci', 'peci', '🧢')] },
      { name: 'koper', traits: [t('membawa koper cokelat', 'koper cokelat', '🧳'), t('membawa ransel', 'ransel', '🎒'), t('membawa tas jinjing', 'tas jinjing', '👜')] },
      { name: 'bacaan', traits: [t('membaca koran', 'koran', '📰'), t('membaca novel', 'novel', '📕'), t('menonton film di ponsel', 'nonton', '📱')] },
    ],
    roles: [
      { job: 'diplomat junior', quirk: 'seharusnya yang menjaga koper itu' },
      { job: 'wartawan politik', quirk: 'tahu terlalu banyak' },
      { job: 'pengusaha batu bata', quirk: 'tertawa terlalu keras' },
      { job: 'mahasiswi pulang kampung', quirk: 'kopernya sama persis' },
      { job: 'kondektur', quirk: 'memeriksa tiket dua kali' },
      { job: 'pensiunan tentara', quirk: 'tidak pernah tidur di perjalanan' },
      { job: 'pengamen naik di Cirebon', quirk: 'tidak seharusnya ada di gerbong eksekutif' },
      { job: 'penerjemah', quirk: 'bisa lima bahasa, termasuk bahasa isyarat' },
      { job: 'pegawai kedutaan', quirk: 'membawa dua ponsel' },
      { job: 'pengantin baru', quirk: 'bulan madunya mendadak sekali' },
      { job: 'pramugari kereta', quirk: 'mendorong troli ke mana-mana' },
      { job: 'penulis skenario', quirk: 'sedang mencari ide cerita' },
    ],
    caught: 'Koper itu ditemukan di bawah troli makanan. Di Semarang, dua petugas menunggu di peron dengan wajah serius.',
    escaped: 'Di Stasiun Tawang, satu penumpang turun cepat sekali dengan koper cokelat. Pagi itu, berita utama koran berganti.',
  },
  {
    id: 'rendang',
    title: 'Resep Rendang Legendaris',
    emoji: '🍲',
    doodle: 'nasi-padang',
    genre: 'pencurian kuliner',
    intro:
      'Festival kuliner kota tinggal sehari lagi. Buku resep rendang tiga generasi milik Uni Ros, juara bertahan, hilang dari dapur stan. Tanpa resep itu, gelar juaranya terancam. Semua peserta lomba ada di area festival malam ini.',
    crime: 'Buku resep rendang tiga generasi milik Uni Ros dicuri.',
    when: 'Malam sebelum final lomba masak',
    loot: 'buku resep rendang Uni Ros',
    places: [
      { name: 'Dapur stan', emoji: '🔥', doodle: 'cabai', cat: 0, sources: ['Bumbu yang tumpah di lantai', 'Asisten Uni Ros bercerita', 'Panci yang bergeser'] },
      { name: 'Panggung juri', emoji: '🎤', doodle: 'bintang', cat: 1, sources: ['Kamera siaran langsung', 'Juri yang datang lebih awal', 'Kursi juri yang dipindah'] },
      { name: 'Gudang bahan', emoji: '📦', doodle: 'kado', cat: 2, sources: ['Daftar keluar-masuk bahan', 'Kardus santan yang terbuka', 'Kunci gudang yang hangat'] },
      { name: 'Area makan pengunjung', emoji: '🪑', doodle: 'kursi', cat: 3, sources: ['Pengunjung yang mengunggah foto', 'Piring yang belum diangkat', 'Petugas kebersihan bercerita'] },
    ],
    cats: [
      { name: 'celemek', traits: [t('memakai celemek merah', 'celemek merah', '🟥'), t('memakai celemek hijau', 'celemek hijau', '🟩'), t('memakai celemek kotak-kotak', 'celemek kotak', '🟦')] },
      { name: 'tangan', traits: [t('bertangan berbau bawang', 'bau bawang', '🧅'), t('bertangan bernoda kunyit', 'noda kunyit', '🟡'), t('bertangan bersih wangi sabun', 'wangi sabun', '🧼')] },
      { name: 'alat', traits: [t('membawa sutil kayu', 'sutil', '🥄'), t('membawa pisau dapur', 'pisau', '🔪'), t('membawa buku catatan', 'catatan', '📒')] },
      { name: 'ciri', traits: [t('memakai topi koki', 'topi koki', '👨‍🍳'), t('memakai jilbab', 'jilbab', '🧕'), t('berambut dikuncir', 'kuncir', '💇')] },
    ],
    roles: [
      { job: 'koki rival dari kota sebelah', quirk: 'tiga kali kalah dari Uni Ros' },
      { job: 'menantu Uni Ros', quirk: 'tidak pernah diajari resep itu' },
      { job: 'food vlogger', quirk: 'menjanjikan "rahasia besar" ke pengikutnya' },
      { job: 'juri tamu', quirk: 'punya restoran sendiri' },
      { job: 'asisten dapur', quirk: 'satu-satunya yang pernah melihat buku itu' },
      { job: 'penjual santan', quirk: 'tagihannya belum dibayar' },
      { job: 'panitia festival', quirk: 'memegang kunci semua stan' },
      { job: 'chef hotel bintang lima', quirk: 'butuh menu baru bulan depan' },
      { job: 'anak magang memasak', quirk: 'mencatat semua yang dilihatnya' },
      { job: 'tukang parkir festival', quirk: 'mendapat tip besar tadi sore' },
      { job: 'mantan suami Uni Ros', quirk: 'masih menyimpan dendam' },
      { job: 'penulis buku masak', quirk: 'naskahnya kurang satu resep' },
    ],
    caught: 'Buku resep itu ditemukan di antara buku catatan si pelaku. Uni Ros menang lagi, dan rendangnya dibagikan gratis untuk para detektif.',
    escaped: 'Bulan depan, sebuah restoran baru membuka menu "rendang tiga generasi". Rasanya persis sama.',
  },
];

/** Twist yang bisa muncul di malam kedua; narasinya umum, efeknya diatur mesin. */
export const EVENTS: { id: 'saksi' | 'badai' | 'padam' | 'suratkaleng' | 'cctv'; title: string; text: string; doodle: string }[] = [
  { id: 'saksi', doodle: 'gelembung-kata', title: 'Saksi baru muncul', text: 'Seseorang yang selama ini diam akhirnya bicara. Pagi ini ada satu petunjuk tambahan untuk semua.' },
  { id: 'badai', doodle: 'petir', title: 'Badai datang', text: 'Angin dan hujan menghantam. Waktu diskusi hari ini lebih pendek. Cepat!' },
  { id: 'padam', doodle: 'lampu', title: 'Listrik padam', text: 'Lampu mati di salah satu tempat. Siapa pun yang menyelidiki di sana malam ini tidak menemukan apa-apa.' },
  { id: 'suratkaleng', doodle: 'amplop', title: 'Surat kaleng', text: 'Sepucuk surat tanpa nama diselipkan di bawah pintu. Isinya bisa benar, bisa juga jebakan.' },
  { id: 'cctv', doodle: 'kamera', title: 'Rekaman CCTV', text: 'Ketua penyidik menerima potongan rekaman CCTV secara pribadi. Dia harus memutuskan: membaginya, atau tidak.' },
];
