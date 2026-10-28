/**
 * Tema kasus SEBELUM DISEGEL. Tiap tema hanya kosakata: mesin kasus
 * membangun kejadian, bukti, dan jebakannya sendiri setiap main.
 */

export interface Tokoh {
  name: string;
  job: string;
  /** Alasan kalau dia pelakunya (dibuka di epilog). */
  motif: string;
}

export interface Tema {
  id: string;
  judul: string;
  doodle: string;
  /** Paragraf pembuka; {obj} {asal} {tujuan} {jam} diganti. */
  pembuka: string;
  obj: string;
  asal: string;
  tujuan: string;
  /** Menit sejak tengah malam untuk slot waktu pertama. */
  base: number;
  tokoh: Tokoh[];
  jalur: string[];
  tempat: string[];
  kamera: [string, string];
  saksi: string[];
  bahan: string;
  tutup: string[];
  /** Kalimat penutup epilog. */
  penutup: string;
}

export const TEMA: Tema[] = [
  {
    id: 'kedai',
    judul: 'Surat yang Tidak Pernah Sampai',
    doodle: 'amplop',
    pembuka:
      'Hujan turun sejak sore di Kedai Pukul Sembilan. Malam ini sebuah kapsul waktu akan dibuka di depan tamu. Ketika acara sampai pada pembacaan surat, tempat {obj} ternyata kosong. Tidak ada kunci rusak, tidak ada kaca pecah. Kalian diminta menyusun arsip kejadian sebelum kedai tutup.',
    obj: 'amplop L17',
    asal: 'ruang arsip',
    tujuan: 'dapur',
    base: 20 * 60 + 5,
    tokoh: [
      { name: 'Nara', job: 'penjaga arsip', motif: 'surat itu titipan untuk Mara, dan Nara tidak rela surat itu dibacakan sebelum penerimanya datang' },
      { name: 'Bima', job: 'kasir', motif: 'di dalam surat ada pengakuan utang lama ayahnya, dan Bima belum siap semua orang tahu' },
      { name: 'Sita', job: 'fotografer', motif: 'Sita ingin memotret momen pembukaan sendirian, tanpa kerumunan' },
      { name: 'Jati', job: 'pemain musik', motif: 'surat itu ditulis mantan kekasihnya, dan Jati takut lagunya malam ini jadi bahan tertawaan' },
      { name: 'Laras', job: 'barista', motif: 'Laras menulis surat itu lima tahun lalu dan berubah pikiran' },
      { name: 'Dimas', job: 'kurir langganan', motif: 'Dimas salah mengantar surat itu dulu, dan ingin membetulkannya diam-diam' },
    ],
    jalur: ['pintu depan', 'pintu servis', 'pintu samping', 'tangga belakang'],
    tempat: ['meja kasir', 'teras', 'panggung', 'mesin kopi', 'gudang biji kopi', 'parkiran', 'meja tamu 4', 'jendela besar'],
    kamera: ['C1', 'C2'],
    saksi: ['Rudi', 'Tami', 'Oki', 'Wulan'],
    bahan: 'kain cokelat',
    tutup: ['pekerjaan pengunci sementara', 'lantai yang baru dipel', 'tumpukan kursi acara'],
    penutup: 'Surat itu akhirnya sampai, sedikit terlambat, tapi masih tersegel.',
  },
  {
    id: 'museum',
    judul: 'Naskah yang Pulang Sendiri',
    doodle: 'buku-terbuka',
    pembuka:
      'Malam pameran Museum Kota. Naskah lontar nomor 9 baru kembali dari perbaikan dan seharusnya dipajang tengah malam. Saat kurator membuka {asal}, kotaknya kosong. Lampu tidak padam, alarm tidak bunyi. Seseorang memindahkannya dengan tenang.',
    obj: 'naskah lontar N9',
    asal: 'ruang restorasi',
    tujuan: 'loker staf',
    base: 21 * 60 + 3,
    tokoh: [
      { name: 'Ayu', job: 'kurator', motif: 'Ayu menemukan halaman yang hilang di naskah itu dan ingin memeriksanya sebelum ada yang menyadari' },
      { name: 'Galih', job: 'satpam malam', motif: 'Galih dijanjikan naskah itu tidak akan dipajang di bawah lampu panas' },
      { name: 'Rina', job: 'restorator', motif: 'perbaikan Rina belum kering betul, dan ia takut tintanya luntur di vitrin' },
      { name: 'Teguh', job: 'teknisi lampu', motif: 'Teguh tahu vitrin nomor 9 bocor dan tak ada yang mau mendengarnya' },
      { name: 'Maya', job: 'pemandu', motif: 'naskah itu milik leluhur Maya, dan keluarganya belum pernah diajak bicara' },
      { name: 'Hasan', job: 'donatur', motif: 'Hasan ingin memotret naskah itu lebih dulu untuk bukunya' },
    ],
    jalur: ['lorong timur', 'lift barang', 'tangga darurat', 'pintu galeri'],
    tempat: ['ruang kontrol', 'aula utama', 'kafetaria', 'ruang arsip foto', 'teras patung', 'meja tiket', 'balkon', 'toilet staf'],
    kamera: ['K-7', 'K-2'],
    saksi: ['Pak Saleh', 'Nindi', 'Bowo', 'Citra'],
    bahan: 'benang katun putih',
    tutup: ['pengecatan ulang dinding', 'perbaikan rel lift', 'pintu dikunci untuk inventaris'],
    penutup: 'Naskah itu dipajang esok paginya, di vitrin yang akhirnya diperbaiki.',
  },
  {
    id: 'asrama',
    judul: 'Rapor yang Tak Pernah Dibagikan',
    doodle: 'buku',
    pembuka:
      'Malam terakhir sebelum libur di Asrama Cemara. {obj} seharusnya dibagikan sesudah makan malam. Ketika wali kelas kembali ke {asal}, map itu sudah tidak ada. Pintu tidak dibobol. Semua orang di asrama punya alasan untuk gugup malam ini.',
    obj: 'map rapor 7B',
    asal: 'ruang guru',
    tujuan: 'kamar 12',
    base: 19 * 60 + 4,
    tokoh: [
      { name: 'Bu Wening', job: 'wali kelas', motif: 'Bu Wening ingin menambahkan surat penyemangat untuk satu murid sebelum rapor dibagikan' },
      { name: 'Pak Darto', job: 'penjaga sekolah', motif: 'Pak Darto diminta seorang murid menyimpan rapornya semalam saja' },
      { name: 'Kiki', job: 'ketua OSIS', motif: 'Kiki takut nilai turunnya jadi bahan omongan sebelum ia sempat menelepon ibunya' },
      { name: 'Fajar', job: 'siswa pindahan', motif: 'Fajar ingin tahu apakah ia boleh tetap tinggal di sini tahun depan' },
      { name: 'Mbak Sri', job: 'petugas dapur', motif: 'Mbak Sri melihat seorang anak menangis dan ingin menunda kabar buruknya satu malam' },
      { name: 'Yoga', job: 'pelatih basket', motif: 'Yoga ingin memastikan pemainnya lolos syarat nilai sebelum turnamen' },
    ],
    jalur: ['koridor utama', 'tangga belakang', 'jalan taman', 'pintu perpustakaan'],
    tempat: ['ruang makan', 'lapangan basket', 'mushola', 'ruang TV', 'dapur asrama', 'perpustakaan', 'pos jaga', 'ruang musik'],
    kamera: ['CCTV-3', 'CCTV-8'],
    saksi: ['Tio', 'Anis', 'Rehan', 'Lala'],
    bahan: 'benang wol biru',
    tutup: ['lantai baru dipel', 'pintu dikunci jam belajar', 'perbaikan lampu'],
    penutup: 'Rapor dibagikan keesokan paginya. Ada satu surat kecil terselip di dalam salah satu map.',
  },
  {
    id: 'kapal',
    judul: 'Kotak Musik di Dek Dua',
    doodle: 'kapal',
    pembuka:
      'Feri malam menyeberang selat yang tenang. Sebuah {obj} akan dilelang untuk amal di ruang makan. Ketika juru lelang membuka {asal}, kotaknya hilang. Kapal tidak berhenti di pelabuhan mana pun. Pelakunya masih di atas kapal.',
    obj: 'kotak musik perak',
    asal: 'ruang nakhoda',
    tujuan: 'kabin 214',
    base: 22 * 60 + 1,
    tokoh: [
      { name: 'Kapten Halim', job: 'nakhoda', motif: 'kotak itu milik istrinya, dan ia menyesal sudah setuju melelangnya' },
      { name: 'Sekar', job: 'pramugari', motif: 'Sekar mendengar lagunya dan teringat ibunya; ia hanya ingin memutarnya sekali lagi' },
      { name: 'Doni', job: 'mekanik', motif: 'Doni yakin per di dalamnya rusak dan malu kalau rusak saat dilelang' },
      { name: 'Bu Ratna', job: 'penumpang tetap', motif: 'Bu Ratna menyumbangkan kotak itu dan berubah pikiran' },
      { name: 'Arman', job: 'musisi kapal', motif: 'Arman ingin merekam melodinya untuk lagu barunya' },
      { name: 'Lusi', job: 'fotografer bulan madu', motif: 'Lusi mengira kotak itu hadiah kejutan dari suaminya' },
    ],
    jalur: ['tangga dek', 'lorong mesin', 'geladak luar', 'lift penumpang'],
    tempat: ['ruang makan', 'anjungan', 'kafe dek', 'ruang mesin', 'geladak belakang', 'meja informasi', 'musala kapal', 'toko suvenir'],
    kamera: ['Dek-A', 'Dek-B'],
    saksi: ['Pak Jono', 'Mira', 'Ucok', 'Dina'],
    bahan: 'kain beludru merah',
    tutup: ['geladak licin karena ombak', 'pemeriksaan pintu kedap air', 'pengangkutan logistik'],
    penutup: 'Lelang tetap berjalan. Lagu kotak itu diputar sekali sebelum palu diketuk.',
  },
  {
    id: 'resepsi',
    judul: 'Cincin Kedua',
    doodle: 'kado',
    pembuka:
      'Gedung resepsi penuh bunga melati. Sebelum acara tukar cincin, {obj} yang disiapkan di {asal} lenyap. Pengantin masih tersenyum di pelaminan, tapi MC mulai berkeringat. Waktunya tidak banyak.',
    obj: 'kotak cincin beludru',
    asal: 'ruang rias',
    tujuan: 'meja hadiah',
    base: 19 * 60 + 33,
    tokoh: [
      { name: 'Tante Mira', job: 'MC', motif: 'Tante Mira ingin menukar urutan acara supaya pidato ayah pengantin tidak terpotong' },
      { name: 'Raka', job: 'sahabat pengantin', motif: 'Raka menyiapkan kejutan dan butuh cincin itu untuk satu foto' },
      { name: 'Dewi', job: 'perias', motif: 'Dewi takut cincinnya tertinggal di meja rias yang ramai' },
      { name: 'Om Gun', job: 'fotografer', motif: 'Om Gun ingin memotret cincin dengan cahaya senja di taman' },
      { name: 'Salsa', job: 'penerima tamu', motif: 'Salsa salah mengira kotak itu hadiah tamu' },
      { name: 'Bayu', job: 'katering', motif: 'Bayu menyimpan kotak itu agar tidak terkena kuah rendang' },
    ],
    jalur: ['pintu belakang aula', 'lorong katering', 'taman samping', 'tangga panggung'],
    tempat: ['pelaminan', 'meja prasmanan', 'ruang keluarga', 'parkiran', 'meja tamu', 'panggung band', 'mushola', 'ruang ganti'],
    kamera: ['Foto-1', 'Foto-2'],
    saksi: ['Bude Narti', 'Ilham', 'Nisa', 'Pak RT'],
    bahan: 'pita satin krem',
    tutup: ['dekorasi bunga dipasang', 'antrean katering', 'kabel lampu panggung'],
    penutup: 'Cincin dipasang tepat waktu. Tamu tidak pernah tahu ada yang nyaris hilang.',
  },
  {
    id: 'stasiun',
    judul: 'Koper Biru Peron Tiga',
    doodle: 'kereta',
    pembuka:
      'Subuh di stasiun kecil. Sebuah {obj} yang dititipkan semalam akan dijemput pemiliknya dengan kereta pertama. Ketika petugas membuka {asal}, koper itu sudah tidak ada. Peluit pertama akan berbunyi sebentar lagi.',
    obj: 'koper biru bertali kuning',
    asal: 'ruang barang hilang',
    tujuan: 'loket parkir',
    base: 4 * 60 + 52,
    tokoh: [
      { name: 'Pak Udin', job: 'petugas barang', motif: 'Pak Udin mengira pemiliknya akan turun di pintu parkir dan ingin membantu' },
      { name: 'Tiara', job: 'penjual kopi', motif: 'Tiara mengenali koper itu milik kakaknya yang lama tidak pulang' },
      { name: 'Hendra', job: 'kondektur', motif: 'Hendra takut koper itu tertinggal lagi di kereta' },
      { name: 'Nenek Asih', job: 'penumpang', motif: 'Nenek Asih yakin itu kopernya sendiri, yang sama birunya' },
      { name: 'Bram', job: 'porter', motif: 'Bram dijanjikan tip besar kalau koper itu sudah menunggu di parkiran' },
      { name: 'Vina', job: 'pengamen biola', motif: 'Vina menyimpan biola cadangannya di dalam koper itu bertahun-tahun lalu' },
    ],
    jalur: ['terowongan bawah', 'jembatan penyeberangan', 'pintu peron utara', 'gang ojek'],
    tempat: ['loket tiket', 'warung kopi', 'peron satu', 'musala', 'ruang tunggu', 'pos keamanan', 'toilet', 'bangku taman'],
    kamera: ['Peron-A', 'Peron-C'],
    saksi: ['Mas Agus', 'Bu Yati', 'Dodo', 'Rani'],
    bahan: 'tali nilon kuning',
    tutup: ['kereta barang melintas', 'perbaikan lampu jembatan', 'pembersihan pagi'],
    penutup: 'Kereta pertama berangkat tepat waktu. Kopernya ikut, dengan pemilik yang benar.',
  },
];

export const temaOf = (id: string): Tema => TEMA.find((t) => t.id === id) ?? TEMA[0]!;
