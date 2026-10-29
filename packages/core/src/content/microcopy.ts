// Teks antarmuka Sehari. Hangat, pendek, tidak menggurui, tidak membuat
// merasa bersalah. Kalimat dari dokumen konsep dipertahankan apa adanya.
//
// Aturan:
// - Api "meredup", tidak pernah "mati". Hari yang terlewat = kabut, bukan merah.
// - Tidak ada "terakhir dilihat", tanda dibaca, atau perbandingan antar anggota.
// - Selalu "orang yang kamu pilih", bukan asumsi keluarga sedarah.

const ANGKA_KATA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'];

/** Angka 0–10 dalam kata ("tiga"); di atas itu tetap angka. */
export function angkaKata(n: number): string {
  return ANGKA_KATA[n] ?? String(n);
}

const kapital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const COPY = {
  nav: {
    today: 'Hari Ini',
    circle: 'Lingkaran',
    memories: 'Kenangan',
    me: 'Aku',
    drop: 'Drop',
  },

  empty: {
    today: 'Jatuhkan satu hal dari harimu.',
    tired: 'Tak mau cerita? Satu warna juga cukup.',
    circle: 'Lingkaran ini masih sepi. Halaman pertamanya menunggu.',
    memories: 'Belum ada kenangan di sini. Nanti, hari-hari ini yang akan jadi kenangan.',
  },

  drop: {
    audienceLabel: 'Untuk',
    audience: {
      onlyMe: 'hanya aku',
      circle: 'seluruh lingkaran',
      onePerson: (name: string) => `hanya ${name}`,
      timeCapsule: 'kapsul waktu',
    },
    timeCapsuleUntil: (date: string) => `Terkunci sampai ${date}`,
    onlyMeNote: 'Drop "hanya aku" tidak akan pernah bisa dibagikan, juga tidak masuk Wrap publik.',
    added: 'Tersimpan di kapsul hari ini.',
  },

  seal: {
    cta: 'Segel harimu',
    ctaSub: 'Satu hal pun sudah cukup untuk menutup hari ini.',
    lastLinePrompt: 'Kalimat terakhir untuk hari ini',
    lastLinePlaceholder: 'satu kalimat saja, untuk hari ini…',
    lastLineSkip: 'Lewati kalimat terakhir',
    sealing: 'Menyegel…',
    sealed: 'Hari ini sudah tersegel.',
    waitingPartner: (name: string) => `Milik ${name} masih tertutup. Biar dia datang saat siap.`,
    circleProgress: (done: number, total: number): string => {
      if (total <= 0 || done <= 0) return 'Belum ada yang menitipkan hari. Apinya menunggu dengan sabar.';
      if (done >= total) return 'Semua sudah menitipkan hari. Apinya menyala terang.';
      if (done === 1) return 'Satu orang sudah menitipkan hari. Apinya mulai hangat.';
      return `${kapital(angkaKata(done))} orang sudah menitipkan hari. Apinya tetap hangat.`;
    },
    opened: 'Kapsul terbuka. Hari kalian kini berdampingan.',
    giveFirst: 'Kapsul teman baru terbuka setelah kamu menyegel kapsulmu sendiri. Memberi dulu, baru menerima.',
    nothingYet: 'Kapsul hari ini masih kosong. Satu foto atau satu kalimat sudah cukup.',
  },

  reactions: {
    peluk: 'peluk',
    akuJuga: 'aku juga',
    lilin: 'lilin',
    diSini: 'Aku di sini.',
  },

  memories: {
    oneYearAgo: 'Hari ini, setahun lalu…',
    nYearsAgo: (n: number): string => (n <= 1 ? 'Hari ini, setahun lalu…' : `Hari ini, ${angkaKata(n)} tahun lalu…`),
    yellowing: 'Halaman ini mulai menguning. Kunjungi sebentar, biar warnanya hidup lagi.',
    revived: 'Halamannya hidup lagi.',
    diceRoll: 'Lempar Dadu Kenangan',
    lostLetter: 'Surat Tersesat',
  },

  wraps: {
    weekly: 'Minggu kecil yang ternyata banyak isinya.',
    weeklyTitle: 'Minggu Kita',
    monthlyTitle: 'Bulan Kita',
    yearlyTitle: 'Tahun Kita',
    mostHugged: 'Momen yang paling banyak dipeluk',
    topSong: 'Lagu yang paling sering muncul',
    moodPalette: 'Warna minggu ini',
    onePhotoEach: 'Satu foto pilihan dari setiap orang',
    chapterVote: 'Usulkan judul bab bulan ini',
    topWord: (word: string) => `Kata yang paling sering muncul: “${word}”`,
    themeSong: 'Lagu tema tahun ini',
    motif: 'Motif utama tahun ini',
    letterToSelf: 'Surat untuk dirimu, dibuka tahun depan',
    publicVersion: 'Versi ini aman dibagikan: hanya angka, warna, dan judul. Isinya tetap milik kalian.',
    quietWeek: 'Minggu ini sepi, dan itu tidak apa-apa. Kabut juga bagian dari cerita.',
  },

  streak: {
    dim: 'Apinya meredup, tapi belum padam.',
    warm: 'Apinya hangat.',
    bright: 'Apinya menyala terang.',
    fog: 'hari yang hilang di kabut',
    restDay: 'Hari istirahat. Apinya dijaga.',
    freezeGift: (name: string) => `${name} menitipkan satu pembeku untukmu. Istirahatlah, apinya dijaga.`,
    freezeLeft: (n: number) => (n <= 0 ? 'Pembeku bulan ini sudah habis.' : `Sisa ${angkaKata(n)} pembeku bulan ini.`),
    milestone7: { name: 'Gerbang', line: 'Tujuh hari. Kalian baru saja melewati gerbang pertama.' },
    milestone30: { name: 'Jembatan', line: 'Tiga puluh hari. Jembatan ini kalian bangun satu papan setiap hari.' },
    milestone100: { name: 'Mercusuar', line: 'Seratus hari. Dari sini, hari-hari lama terlihat bercahaya.' },
    milestone365: { name: 'Pelabuhan', line: 'Satu tahun penuh. Kapal kalian berlabuh membawa 365 halaman.' },
  },

  silentRoom: {
    title: 'Ruang Hening',
    intro:
      'Untuk hari yang berat. Tidak perlu kata-kata: satu warna atau suara hujan pun cukup. Di sini tidak ada komentar, hanya lilin.',
    candleOnly: 'Di Ruang Hening, yang lain hanya bisa menyalakan lilin. Tidak ada komentar, tidak ada pertanyaan.',
    candleLit: (name: string) => `${name} menyalakan lilin untukmu.`,
    helpLead:
      'Kalau beratnya terasa terlalu besar untuk dipikul sendiri, ada orang yang siap mendengar. Gratis dan rahasia.',
    emergencyLead: 'Kalau kamu atau seseorang dalam bahaya sekarang, hubungi 112 atau datang ke IGD terdekat.',
  },

  onboarding: {
    letter: [
      'Hai, kamu.',
      'Kami membuat Sehari karena hari-hari ternyata cepat sekali lewat. Yang hari ini terasa biasa, setahun lagi bisa jadi hal yang paling ingin kamu ulang: tawa di warung, hujan yang bikin batal pergi, suara seseorang di telepon jam sebelas malam.',
      'Di sini, kamu menyimpan satu hal kecil setiap hari bersama orang-orang yang kamu pilih. Satu foto, satu kalimat, satu warna pun cukup. Malamnya, kalian menyegel hari itu, lalu membukanya berdampingan.',
      'Tidak ada pengikut, tidak ada peringkat, tidak ada yang menilai tulisanmu. Hanya hari-hari kalian, yang pelan-pelan menjadi satu kitab.',
      'Hidup ini terlalu singkat untuk dilupakan begitu saja. Mari mulai dari hari ini.',
      '— tim Sehari',
    ],
    ageGate: {
      title: 'Sebelum mulai',
      body: 'Sehari dibuat untuk orang dewasa. Umurmu sudah 18 tahun atau lebih?',
      confirm: 'Ya, aku 18+',
      decline: 'Belum',
      declined: 'Terima kasih sudah jujur. Sehari belum bisa menemanimu sekarang, tapi kami menunggumu nanti.',
    },
    penName: {
      title: 'Nama pena',
      body: 'Nama yang muncul di kitab lingkaranmu. Nama asli, nama panggilan, atau nama rahasia, terserah kamu.',
      placeholder: 'misalnya: Naya, atau Kucing Oranye',
      note: 'Julukan tokoh nanti diberikan teman-temanmu, bukan oleh kami.',
    },
    city: {
      title: 'Kotamu',
      body: 'Kami memakai nama kotamu untuk zona waktu dan jam senja. Hanya nama kota, tidak pernah lokasi persis.',
      placeholder: 'Cari kota…',
      timezoneTitle: 'Zona waktu',
      timezones: {
        WIB: 'WIB · Waktu Indonesia Barat',
        WITA: 'WITA · Waktu Indonesia Tengah',
        WIT: 'WIT · Waktu Indonesia Timur',
      },
      sunsetNote: 'Pengingat menyegel datang saat matahari terbenam di kotamu.',
    },
    recoveryCode: {
      title: 'Kode pemulihan',
      body: 'Isi kapsulmu dienkripsi end-to-end: hanya perangkatmu dan orang yang kamu pilih yang bisa membukanya. Kode ini satu-satunya cara memulihkan arsipmu saat ganti HP.',
      warning:
        'Kalau kode ini hilang dan semua perangkatmu juga hilang, tidak ada yang bisa memulihkan arsipmu. Termasuk kami.',
      tip: 'Tulis di kertas dan simpan di tempat aman, atau simpan di pengelola kata sandi. Lebih baik dua-duanya.',
      confirm: 'Sudah kusimpan',
      reveal: 'Tampilkan kode',
      copy: 'Salin kode',
    },
    invite: {
      title: 'Ajak orang pertamamu',
      body: 'Siapa yang ingin kamu ajak menyimpan hari? Pasangan, sahabat, teman kos, siapa saja yang kamu pilih.',
      cta: 'Kirim undangan',
      shareText: (name: string) =>
        `${name} mengajakmu menyimpan hari bersama di Sehari. Satu hal kecil sehari, disegel bersama setiap malam.`,
      skip: 'Nanti saja',
      waiting: 'Undangan terkirim. Sambil menunggu, kamu bisa menjatuhkan hal pertama dari harimu.',
    },
  },

  privacy: {
    e2eeTitle: 'Yang dijaga enkripsi',
    e2eeBody:
      'Isi lingkaranmu dienkripsi end-to-end. Server kami hanya menyimpan data teracak yang tidak bisa kami baca, ditambah status segel.',
    limitsTitle: 'Yang tidak bisa dijaga enkripsi',
    limits: [
      'Orang yang kamu beri akses tetap bisa mengambil tangkapan layar atau memotret layarnya.',
      'Mode Pisah tidak bisa menghapus salinan yang sudah disimpan penerima.',
      'Kalau HP salah satu anggota dibuka orang lain, isi di HP itu ikut terlihat.',
    ],
    limitsClosing: 'Jadi simpan di sini hal-hal yang memang ingin kamu bagi dengan mereka.',
    noAds: 'Tanpa iklan berbasis isi jurnal. Data kalian tidak dijual.',
    location: 'Lokasi mati secara bawaan. Kalau dinyalakan, yang tercatat hanya nama kota, tidak pernah titik real-time.',
    noSurveillance: 'Tidak ada "terakhir dilihat" dan tidak ada tanda dibaca. Sehari bukan alat untuk memantau orang.',
    aiTitle: 'Soal AI',
    aiTiers: [
      {
        name: 'Berbasis aturan',
        body: 'Wrap, judul bab, dan statistik dihitung di perangkatmu dengan aturan sederhana. Isinya tidak keluar dari HP-mu.',
      },
      {
        name: 'AI di perangkat',
        body: 'Model kecil yang berjalan di HP-mu. Privasi tetap terjaga; hasilnya tergantung kemampuan perangkat.',
      },
      {
        name: 'AI cloud (opsional)',
        body: 'Mati secara bawaan. Hanya bisa dinyalakan per lingkaran, dan semua anggota harus setuju. Kamu memilih sendiri isi mana yang dikirim.',
      },
    ],
    aiCloudWarning: 'Untuk isi yang kamu pilih ini, janji "server tidak bisa melihat" tidak berlaku lagi.',
    aiConsentTitle: 'Nyalakan AI cloud untuk lingkaran ini?',
    aiConsentProgress: (agreed: number, total: number) =>
      `${kapital(angkaKata(agreed))} dari ${angkaKata(total)} orang sudah setuju. AI cloud baru menyala kalau semua setuju.`,
    aiOffers: 'AI hanya menawarkan, tidak pernah menyimpulkan kondisi siapa pun.',
  },

  modes: {
    split: {
      title: 'Mode Pisah',
      body: 'Untuk Duo yang memilih berpisah. Arsip bersama dibekukan, dan masing-masing tetap menyimpan salinan Drop miliknya sendiri. Wrap, "Setahun lalu", Surat Tersesat, dan Halaman Menguning dari lingkaran ini berhenti muncul.',
      limit: 'Mode Pisah tidak bisa menghapus salinan yang sudah disimpan orang lain, termasuk tangkapan layar.',
      confirmTitle: 'Mulai Mode Pisah?',
      confirmBody:
        'Arsip akan dibekukan untuk kalian berdua. Tidak ada pemberitahuan yang dramatis; dia hanya akan melihat lingkaran ini sudah ditutup.',
      confirmCta: 'Ya, bekukan arsip',
      cancel: 'Belum sekarang',
      done: 'Arsip sudah dibekukan. Jaga dirimu baik-baik.',
    },
    memorial: {
      title: 'Mode Kenangan',
      body: 'Untuk saat seseorang di lingkaran telah berpulang. Streak berhenti dengan hormat, tidak ada pengingat yang dikirim atas namanya, dan arsip bisa dikunci menjadi kapsul kenangan.',
      confirmTitle: (name: string) => `Jadikan halaman ${name} kapsul kenangan?`,
      confirmBody:
        'Semua yang pernah dia titipkan tetap utuh. Kalian masih bisa membukanya, menyalakan lilin, dan menulis untuknya.',
      confirmCta: 'Kunci sebagai kenangan',
      cancel: 'Nanti dulu',
      done: (name: string) => `Halaman ${name} kini tersimpan sebagai kenangan.`,
    },
    leave: {
      title: 'Keluar dari lingkaran',
      body: 'Kamu bisa keluar kapan saja. Drop milikmu tetap ada di arsip pribadimu, dan tidak ada pemberitahuan khusus untuk anggota lain.',
      note: 'Hari-hari yang sudah kamu bagi sebelumnya tetap bisa dibuka oleh mereka.',
      confirmCta: 'Keluar',
      cancel: 'Tetap di sini',
      done: 'Kamu sudah keluar. Pintu selalu terbuka kalau ingin kembali.',
    },
  },

  notifications: {
    partnerSealed: (name: string) => `${name} sudah menyegel harinya. Kapan pun kamu siap.`,
    capsulesOpen: 'Kapsul hari ini terbuka. Ada hari yang menunggu dibaca.',
    sunsetReminder: (city: string) => `Senja sudah turun di ${city}. Mau menyegel harimu?`,
    morningCard: 'Kartu pagi sudah ditarik. Intip sebentar?',
    weeklyWrapReady: 'Minggu Kita sudah jadi. Minggu kecil yang ternyata banyak isinya.',
    lostLetterArrived: 'Ada Surat Tersesat yang baru sampai. Entah sudah berapa lama ia di jalan.',
    inviteAccepted: (name: string) => `${name} menerima undanganmu. Halaman pertama kalian menunggu.`,
    timeCapsuleOpened: 'Kapsul Waktu yang dulu kalian kunci, hari ini terbuka.',
    whenLetterArrived: (name: string) => `${name} menitipkan surat “buka kalau…” untukmu. Bukalah saat momennya tiba.`,
    whenLetterOpened: (name: string) => `${name} baru saja membuka suratmu. Mungkin hari ini ia membutuhkannya.`,
    chapterCeremony: 'Bulan ini selesai. Saatnya memberi judul bab bersama.',
    friendWriting: (name: string) => `${name} mulai mengisi halaman hari ini.`,
    friendReacted: (name: string, what: string) => `${name} ${what} di halamanmu.`,
    friendFootnote: (name: string) => `${name} menulis catatan kaki di halamanmu.`,
    friendFootnoteReply: (name: string) => `${name} ikut menulis catatan kaki di halaman yang kamu komentari.`,
    gameInvite: (name: string, game: string) => `${name} mengajak main ${game}! Ketuk untuk duduk di mejanya.`,
    pushTest: 'Notifikasi Sehari sudah menyala di perangkat ini.',
  },
};

export type Copy = typeof COPY;
