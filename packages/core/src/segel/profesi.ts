/**
 * Profesi, jinx, dan script SEBELUM DISEGEL.
 *
 * Profesi = alat. Kubu (Restorasi/Revisi) dibagikan terpisah, jadi profesi
 * yang sama bisa jujur di satu meja dan licik di meja lain. Jinx adalah
 * aturan khusus yang hanya berlaku bila dua profesi tertentu ada di script.
 */

export type ProfId =
  | 'penyetel_jam'
  | 'penjaga_detik'
  | 'pemetik_menit'
  | 'penerima_senja'
  | 'pemotong_adegan'
  | 'penghitung_langkah'
  | 'pemeriksa_serat'
  | 'pembaca_label'
  | 'penerawang_tinta'
  | 'pencatat_jejak'
  | 'juru_peta'
  | 'penghubung_cerita'
  | 'penguji_sudut'
  | 'penjaga_atribusi'
  | 'pembaca_kekosongan'
  | 'penyimpan_asli'
  | 'notaris'
  | 'penyanggah'
  | 'penagih_janji'
  | 'kartografer'
  | 'pemutus_seri'
  | 'kurir'
  | 'pengalih_kurir'
  | 'pencetak_karbon'
  | 'pengasah_lensa'
  | 'penjaga_segel'
  | 'pemulih'
  | 'saksi_terakhir'
  | 'penjaga_giliran'
  | 'penggeser_jam'
  | 'pengganti_label'
  | 'pengabur_rentang'
  | 'penanam_umpan'
  | 'pembawa_kebisingan'
  | 'pembaca_arsip'
  | 'saksi_tinta';

export type Rumpun = 'kronologi' | 'forensik' | 'saksi' | 'kontrak' | 'distribusi' | 'pemulihan' | 'pengaburan' | 'arsip';

/** Bentuk sasaran kemampuan (dipakai UI untuk menyusun pilihan). */
export type Sasaran =
  | 'alat'
  | 'laporan'
  | 'laporan-waktu'
  | 'dua-laporan-waktu'
  | 'kesaksian'
  | 'dua-kesaksian'
  | 'rekaman'
  | 'jejak-benda'
  | 'laporan-baru'
  | 'jalur'
  | 'jalur-slot'
  | 'tersangka'
  | 'pemain'
  | 'pemain-aksi'
  | 'dua-nilai'
  | 'prediksi'
  | 'terbitan'
  | 'kurir'
  | 'geser'
  | 'label'
  | 'kabur'
  | 'umpan'
  | 'tanpa'
  | 'pasif';

export interface Prof {
  id: ProfId;
  nama: string;
  rumpun: Rumpun;
  doodle: string;
  /** Kemampuan (sekali per permainan kecuali disebut lain). */
  teks: string;
  /** Batas / cara menghadapinya. */
  batas: string;
  sasaran: Sasaran;
  /** Boleh di mode kooperatif (2–4)? */
  coop: boolean;
  /** Menghasilkan fakta baru yang bisa dipakai pembuktian. */
  info?: boolean;
  /** Mengubah salinan (memakai pagu gangguan). */
  edit?: boolean;
  /** Mendeteksi suntingan. */
  detek?: boolean;
  lensa?: boolean;
  /** Bab yang boleh (default semua 1–4). */
  bab?: number[];
}

const P = (p: Prof) => p;

export const PROFS: Record<ProfId, Prof> = {
  penyetel_jam: P({ id: 'penyetel_jam', nama: 'Penyetel Jam', rumpun: 'kronologi', doodle: 'jam-dinding', sasaran: 'alat', coop: true, info: true, teks: 'Pilih satu kamera: dapatkan register selisih jamnya terhadap KAS (bisa diterbitkan).', batas: 'Mengukur alat, bukan salinan. Salinan yang digeser tetap butuh audit asal.' }),
  penjaga_detik: P({ id: 'penjaga_detik', nama: 'Penjaga Detik', rumpun: 'kronologi', doodle: 'jam-pasir', sasaran: 'dua-laporan-waktu', coop: true, detek: true, teks: 'Pilih dua laporan berwaktu: ketahui mana yang menurut sumber aslinya terjadi lebih dulu (jam KAS).', batas: 'Urutan tidak membuktikan penyebab. Tidak bilang salinan mana yang berubah.' }),
  pemetik_menit: P({ id: 'pemetik_menit', nama: 'Pemetik Menit', rumpun: 'kronologi', doodle: 'jam-pasir', sasaran: 'laporan-waktu', coop: true, detek: true, teks: 'Pilih satu laporan berwaktu: ketahui apakah waktu di salinan pemegangnya direkam langsung, pernah digeser, atau dikaburkan.', batas: 'Tidak memberi nilai asli.' }),
  penerima_senja: P({ id: 'penerima_senja', nama: 'Penerima Senja', rumpun: 'kronologi', doodle: 'senja', sasaran: 'laporan', coop: true, detek: true, bab: [1, 2, 3], teks: 'Simpan potret satu laporan sekarang. Di bab berikutnya ketahui apakah salinan pemegangnya berubah selama menunggu.', batas: 'Perubahan tidak mengungkap siapa penyuntingnya.' }),
  pemotong_adegan: P({ id: 'pemotong_adegan', nama: 'Pemotong Adegan', rumpun: 'kronologi', doodle: 'kaset', sasaran: 'laporan', coop: true, detek: true, teks: 'Pilih satu laporan: ketahui berapa versi berbeda dari laporan itu yang beredar di meja sekarang.', batas: 'Tidak menunjuk versi mana yang asli.' }),
  penghitung_langkah: P({ id: 'penghitung_langkah', nama: 'Penghitung Langkah', rumpun: 'kronologi', doodle: 'sandal-jepit', sasaran: 'jalur', coop: true, info: true, teks: 'Pilih satu jalur: dapatkan catatan resmi kapan saja jalur itu tidak bisa dilalui.', batas: 'Jalur yang bisa dilalui belum tentu dipakai.' }),
  pemeriksa_serat: P({ id: 'pemeriksa_serat', nama: 'Pemeriksa Serat', rumpun: 'forensik', doodle: 'klip-kertas', sasaran: 'jejak-benda', coop: true, teks: 'Pilih satu jejak benda: ketahui apakah bahannya unik milik satu orang atau bahan umum yang dipakai semua.', batas: 'Temuan benar bisa dipakai untuk loncatan kesimpulan yang salah.' }),
  pembaca_label: P({ id: 'pembaca_label', nama: 'Pembaca Label', rumpun: 'forensik', doodle: 'peta', sasaran: 'rekaman', coop: true, info: true, teks: 'Pilih satu rekaman kamera: dapatkan survei dudukan fisik kamera itu (jalur yang benar-benar ia hadap).', batas: 'Dudukan tidak memberi waktu.' }),
  penerawang_tinta: P({ id: 'penerawang_tinta', nama: 'Penerawang Tinta', rumpun: 'forensik', doodle: 'kacamata', sasaran: 'laporan', coop: true, detek: true, teks: 'Pilih satu laporan: bila salinan pemegangnya pernah diubah, kamu melihat nilai aslinya.', batas: 'Tidak memberi cap. Kamu tetap bisa dibohongi soal siapa penyuntingnya.' }),
  pencatat_jejak: P({ id: 'pencatat_jejak', nama: 'Pencatat Jejak', rumpun: 'forensik', doodle: 'sandal-jepit', sasaran: 'tersangka', coop: true, info: true, teks: 'Pilih satu tersangka: dapatkan satu jalur yang pasti tidak ia pakai untuk membawa barang.', batas: 'Satu jalur saja, dipilih acak oleh arsip.' }),
  juru_peta: P({ id: 'juru_peta', nama: 'Juru Peta', rumpun: 'forensik', doodle: 'peta-lipat', sasaran: 'tersangka', coop: true, info: true, teks: 'Pilih satu tersangka: dapatkan daftar kunci jalur yang ia pegang.', batas: 'Akses bukan tindakan.' }),
  penghubung_cerita: P({ id: 'penghubung_cerita', nama: 'Penghubung Cerita', rumpun: 'saksi', doodle: 'gelembung-kata', sasaran: 'dua-kesaksian', coop: true, teks: 'Pilih dua kesaksian/kabar: ketahui apakah keduanya berasal dari pengamat awal yang sama.', batas: '“Ya” berarti bukan dua sumber; bukan berarti ceritanya salah.' }),
  penguji_sudut: P({ id: 'penguji_sudut', nama: 'Penguji Sudut', rumpun: 'saksi', doodle: 'bintang-mata', sasaran: 'kesaksian', coop: true, info: true, teks: 'Pilih satu kesaksian: dapatkan catatan garis pandang saksi. Bila ia memang melihat, kesaksiannya sah sebagai sumber.', batas: 'Saksi yang melihat pun bisa menyebut lebih sedikit dari yang kalian mau.' }),
  penjaga_atribusi: P({ id: 'penjaga_atribusi', nama: 'Penjaga Atribusi', rumpun: 'saksi', doodle: 'stempel', sasaran: 'pemain', coop: true, detek: true, teks: 'Pilih satu pemain: ketahui apakah semua salinan yang ia pegang saat ini sesuai sumber.', batas: 'Tidak bilang salinan yang mana, atau siapa yang mengubahnya.' }),
  pembaca_kekosongan: P({ id: 'pembaca_kekosongan', nama: 'Pembaca Kekosongan', rumpun: 'saksi', doodle: 'lingkaran-coret', sasaran: 'jalur-slot', coop: true, info: true, teks: 'Pilih satu jalur dan satu waktu: bedakan “kamera lorong menyala dan kosong” dari “kamera mati”.', batas: 'Kamera mati bukan bukti ada yang lewat.' }),
  penyimpan_asli: P({ id: 'penyimpan_asli', nama: 'Penyimpan Asli', rumpun: 'pemulihan', doodle: 'segel-lilin', sasaran: 'laporan-baru', coop: true, detek: true, bab: [2, 3], teks: 'Pilih satu laporan baru yang belum dibuka bab ini: kamu menerima salinan sumbernya bercap asal, sebelum suntingan apa pun.', batas: 'Hanya laporan bab ini yang belum dibagikan.' }),
  notaris: P({ id: 'notaris', nama: 'Notaris', rumpun: 'kontrak', doodle: 'pena', sasaran: 'prediksi', coop: false, lensa: true, bab: [1, 2, 3], teks: 'Segel satu prediksi untuk bab berikutnya (laporan mendapat versi baru / pemain menerbitkan / pemain memakai profesi). Benar: +1 Lensa.', batas: 'Prediksi tidak boleh merujuk dirinya sendiri.' }),
  penyanggah: P({ id: 'penyanggah', nama: 'Penyanggah', rumpun: 'kontrak', doodle: 'tanda-seru', sasaran: 'terbitan', coop: true, detek: true, teks: 'Tantang satu terbitan di papan. Bila tidak sesuai sumber, papan memberi cap DIBANTAH dan kamu +1 Lensa.', batas: 'Bila ternyata asli, hanya kamu yang tahu.' }),
  penagih_janji: P({ id: 'penagih_janji', nama: 'Penagih Janji', rumpun: 'kontrak', doodle: 'centang-besar', sasaran: 'pemain-aksi', coop: false, teks: 'Pilih satu pemain dan aksi yang ia akui bab ini: ketahui apakah ia benar-benar melakukannya.', batas: 'Hanya jenis aksi, bukan sasarannya.' }),
  kartografer: P({ id: 'kartografer', nama: 'Kartografer Kemungkinan', rumpun: 'kontrak', doodle: 'kompas', sasaran: 'dua-nilai', coop: true, info: true, teks: 'Pilih dua nilai dari jangkar yang sama (mis. dua jam): ketahui apakah setidaknya satu di antaranya benar.', batas: 'Jawabanmu tidak bercap; orang harus percaya ucapanmu.' }),
  pemutus_seri: P({ id: 'pemutus_seri', nama: 'Pemutus Seri', rumpun: 'kontrak', doodle: 'silang', sasaran: 'pasif', coop: false, lensa: true, teks: 'Mulai dengan 2 Lensa. Saat putusan, bila satu jangkar dua kali gagal mayoritas, kamu memaksa satu pemungutan ketiga.', batas: 'Tidak memberi suara tambahan.' }),
  kurir: P({ id: 'kurir', nama: 'Kurir', rumpun: 'distribusi', doodle: 'sepeda', sasaran: 'kurir', coop: false, teks: 'Kirim satu salinan ke sampai tiga pemain sekaligus, tanpa nama pengirim.', batas: 'Penerima tidak tahu dari siapa.' }),
  pengalih_kurir: P({ id: 'pengalih_kurir', nama: 'Pengalih Kurir', rumpun: 'distribusi', doodle: 'panah-lengkung', sasaran: 'pemain', coop: false, teks: 'Pilih satu pemain: terbitan/kirimannya bab ini tertunda ke bab berikutnya, dan kamu menerima salinannya.', batas: 'Tidak bisa menghapus; hanya menunda.' }),
  pencetak_karbon: P({ id: 'pencetak_karbon', nama: 'Pencetak Karbon', rumpun: 'distribusi', doodle: 'perangko', sasaran: 'laporan', coop: true, detek: true, teks: 'Buat salinan beku dari salinan pemegang satu laporan, tepat sebelum suntingan bab ini.', batas: 'Kalau sudah diubah sebelumnya, yang kamu bekukan juga salinan yang salah.' }),
  pengasah_lensa: P({ id: 'pengasah_lensa', nama: 'Pengasah Lensa', rumpun: 'distribusi', doodle: 'kacamata', sasaran: 'pemain', coop: true, lensa: true, teks: 'Pilih satu pemain lain: kalian berdua mendapat +1 Lensa.', batas: 'Lensa tetap dibatasi kapasitas.' }),
  penjaga_segel: P({ id: 'penjaga_segel', nama: 'Penjaga Segel', rumpun: 'pemulihan', doodle: 'segel-lilin', sasaran: 'laporan', coop: true, teks: 'Lindungi satu laporan: semua salinannya tidak bisa disunting lagi sampai arsip disegel.', batas: 'Tidak membersihkan isi yang sudah salah.' }),
  pemulih: P({ id: 'pemulih', nama: 'Pemulih', rumpun: 'pemulihan', doodle: 'penyiram', sasaran: 'laporan', coop: true, teks: 'Kembalikan salinan pemegang satu laporan satu versi ke belakang. Riwayat tetap tercatat.', batas: 'Versi asli kesaksian tetap bisa memuat kesimpulan keliru.' }),
  saksi_terakhir: P({ id: 'saksi_terakhir', nama: 'Saksi Terakhir', rumpun: 'pemulihan', doodle: 'lentera', sasaran: 'pasif', coop: false, teks: 'Di bab 4, saat meja memilih bukti cadangan, kamu menambah satu laporan pilihanmu sendiri.', batas: 'Pilihanmu terlihat sebagai tambahan.' }),
  penjaga_giliran: P({ id: 'penjaga_giliran', nama: 'Penjaga Giliran', rumpun: 'arsip', doodle: 'bendera', sasaran: 'tanpa', coop: true, detek: true, teks: 'Ketahui berapa suntingan yang berhasil terjadi di meja bab ini, dan jenisnya.', batas: 'Tidak tahu sasarannya.' }),
  penggeser_jam: P({ id: 'penggeser_jam', nama: 'Penggeser Jam', rumpun: 'pengaburan', doodle: 'jam-dinding', sasaran: 'geser', coop: false, edit: true, teks: 'Geser waktu satu salinan mentah tujuh menit maju atau mundur.', batas: 'Memakai pagu gangguan. Audit asal membongkarnya. Menyunting bukan bukti kubu.' }),
  pengganti_label: P({ id: 'pengganti_label', nama: 'Pengganti Label', rumpun: 'pengaburan', doodle: 'selotip', sasaran: 'label', coop: false, edit: true, teks: 'Ganti label jalur pada satu salinan mentah sensor, catatan, atau rekaman.', batas: 'Memakai pagu gangguan. Dudukan kamera tidak ikut berubah.' }),
  pengabur_rentang: P({ id: 'pengabur_rentang', nama: 'Pengabur Rentang', rumpun: 'pengaburan', doodle: 'kabut', sasaran: 'kabur', coop: false, edit: true, teks: 'Kaburkan waktu pada satu salinan mentah: yang tertulis hanya rentang malam itu.', batas: 'Memakai pagu gangguan. Tidak berbohong, hanya menghapus ketepatan.' }),
  penanam_umpan: P({ id: 'penanam_umpan', nama: 'Penanam Umpan', rumpun: 'pengaburan', doodle: 'tanda-tanya', sasaran: 'umpan', coop: false, teks: 'Terbitkan satu kabar tanpa nama ke papan. Orang pertama yang membongkarnya (audit/sanggah) mendapat Lensa.', batas: 'Umpan yang tidak dibantah bisa merusak timmu sendiri.' }),
  pembawa_kebisingan: P({ id: 'pembawa_kebisingan', nama: 'Pembawa Kebisingan', rumpun: 'pengaburan', doodle: 'petir', sasaran: 'pemain', coop: false, bab: [1, 2, 3], teks: 'Pilih satu pemain: hasil audit/profesinya bab ini baru sampai di bab berikutnya.', batas: 'Menunda, bukan menghapus.' }),
  pembaca_arsip: P({ id: 'pembaca_arsip', nama: 'Pembaca Arsip', rumpun: 'arsip', doodle: 'rak-buku', sasaran: 'tanpa', coop: true, detek: true, teks: 'Ketahui berapa laporan yang salinannya sedang tidak sesuai sumber di seluruh meja.', batas: 'Hanya jumlah.' }),
  saksi_tinta: P({ id: 'saksi_tinta', nama: 'Saksi Tinta', rumpun: 'arsip', doodle: 'pena', sasaran: 'pemain', coop: false, detek: true, teks: 'Pilih satu pemain: ketahui apakah ia pernah berhasil menyunting salinan apa pun.', batas: 'Penyunting bisa dari kubu mana saja. Revisi juga punya tinta rahasia.' }),
};

export const RUMPUN: Record<Rumpun, string> = {
  kronologi: 'Kronologi',
  forensik: 'Forensik',
  saksi: 'Saksi & asal',
  kontrak: 'Kontrak & teori',
  distribusi: 'Distribusi',
  pemulihan: 'Perlindungan',
  pengaburan: 'Pengaburan',
  arsip: 'Arsip',
};

// ── Jinx ────────────────────────────────────────────────────────────────────

export interface Jinx {
  a: ProfId;
  b: ProfId;
  teks: string;
}

export const JINX: Jinx[] = [
  { a: 'penyetel_jam', b: 'penggeser_jam', teks: 'Register Penyetel Jam juga menyebut apakah ada salinan dari kamera itu yang sedang tergeser.' },
  { a: 'penjaga_segel', b: 'penanam_umpan', teks: 'Umpan tidak bisa dilindungi. Penjaga Segel yang memilih umpan langsung tahu itu umpan.' },
  { a: 'pemulih', b: 'penerawang_tinta', teks: 'Bila keduanya menyasar laporan yang sama di bab yang sama, Penerawang melihat salinan sebelum dipulihkan.' },
  { a: 'kurir', b: 'pengalih_kurir', teks: 'Kiriman Kurir tidak bisa dialihkan. Pengalih yang menyasar Kurir tetap mendapat salinannya.' },
  { a: 'penyanggah', b: 'penanam_umpan', teks: 'Membantah umpan memberi Penyanggah 2 Lensa, bukan 1.' },
  { a: 'pembawa_kebisingan', b: 'penyetel_jam', teks: 'Register jam tidak bisa ditunda. Pembawa Kebisingan yang menyasar Penyetel Jam yang sedang bekerja gagal.' },
  { a: 'pengganti_label', b: 'pembaca_label', teks: 'Pembaca Label membaca dudukan fisik. Bila label salinan rekaman itu pernah diganti, ia juga diberi tahu.' },
  { a: 'pencetak_karbon', b: 'penggeser_jam', teks: 'Karbon selalu dibuat sebelum suntingan bab yang sama.' },
  { a: 'penerima_senja', b: 'pemulih', teks: 'Bila laporan yang disimpan Penerima Senja berubah lalu dipulihkan, ia tahu keduanya terjadi.' },
  { a: 'pengasah_lensa', b: 'notaris', teks: 'Kapasitas Lensa semua orang naik menjadi 3.' },
  { a: 'pembawa_kebisingan', b: 'pengalih_kurir', teks: 'Bila keduanya menyasar pemain yang sama di bab yang sama, hanya Pengalih Kurir yang bekerja.' },
  { a: 'penguji_sudut', b: 'penanam_umpan', teks: 'Umpan bukan kesaksian. Penguji Sudut yang memilihnya tahu itu umpan.' },
  { a: 'saksi_tinta', b: 'pengabur_rentang', teks: 'Mengaburkan tidak meninggalkan tinta: Saksi Tinta tidak mendeteksi Pengabur Rentang.' },
  { a: 'kartografer', b: 'pembaca_kekosongan', teks: 'Kartografer hanya boleh memilih nilai jalur atau waktu, bukan pelaku.' },
  { a: 'penjaga_giliran', b: 'pengabur_rentang', teks: 'Kaburan tidak terhitung sebagai suntingan oleh Penjaga Giliran.' },
  { a: 'notaris', b: 'pengalih_kurir', teks: 'Prediksi “pemain menerbitkan” tetap benar bila terbitannya dialihkan.' },
];

// ── Script ──────────────────────────────────────────────────────────────────

export interface Script {
  id: string;
  nama: string;
  min: number;
  max: number;
  desk: string;
  pool: ProfId[];
}

export const SCRIPTS: Script[] = [
  {
    id: 'dua_jendela',
    nama: 'Dua Jendela',
    min: 2,
    max: 4,
    desk: 'Kooperatif. Kalian semua Restorasi melawan gangguan arsip yang mengubah salinan diam-diam.',
    pool: ['penyetel_jam', 'penjaga_detik', 'pemetik_menit', 'pembaca_label', 'penerawang_tinta', 'pencatat_jejak', 'juru_peta', 'penghubung_cerita', 'penguji_sudut', 'pembaca_kekosongan', 'penyimpan_asli', 'kartografer', 'pemulih', 'penghitung_langkah', 'pembaca_arsip', 'penjaga_segel'],
  },
  {
    id: 'salah_alamat',
    nama: 'Surat yang Salah Alamat',
    min: 5,
    max: 8,
    desk: 'Script dasar. Satu atau dua Revisi, alat waktu, sumber, dan pemulihan seimbang.',
    pool: ['penyetel_jam', 'penjaga_detik', 'pemeriksa_serat', 'pembaca_label', 'penghubung_cerita', 'penguji_sudut', 'notaris', 'penyanggah', 'kurir', 'pencetak_karbon', 'penjaga_segel', 'pemulih', 'penggeser_jam', 'pengalih_kurir', 'pembaca_kekosongan', 'penagih_janji', 'pengganti_label', 'juru_peta'],
  },
  {
    id: 'jam_tak_sepakat',
    nama: 'Jam yang Tidak Sepakat',
    min: 6,
    max: 12,
    desk: 'Kronologi lanjutan. Banyak alat waktu, banyak cara menggeser dan mengaburkannya.',
    pool: ['penyetel_jam', 'penjaga_detik', 'pemetik_menit', 'penerima_senja', 'pemotong_adegan', 'penghitung_langkah', 'penerawang_tinta', 'pembaca_label', 'penyimpan_asli', 'penjaga_giliran', 'notaris', 'penagih_janji', 'kartografer', 'penggeser_jam', 'pengabur_rentang', 'pembawa_kebisingan', 'penjaga_segel', 'pemulih', 'pembaca_arsip', 'saksi_tinta'],
  },
  {
    id: 'tiga_biro',
    nama: 'Kota Tiga Biro',
    min: 9,
    max: 16,
    desk: 'Meja besar. Biro kecil, kurir, umpan, dan kontrak. Kebenaran perlu digabung dari banyak tangan.',
    pool: ['pencatat_jejak', 'juru_peta', 'penghubung_cerita', 'penguji_sudut', 'penjaga_atribusi', 'pembaca_kekosongan', 'penyanggah', 'penagih_janji', 'kartografer', 'pemutus_seri', 'kurir', 'pengalih_kurir', 'pencetak_karbon', 'pengasah_lensa', 'penjaga_segel', 'pemulih', 'saksi_terakhir', 'penjaga_giliran', 'penanam_umpan', 'pengganti_label', 'penggeser_jam', 'pembawa_kebisingan', 'pembaca_arsip', 'saksi_tinta', 'penyetel_jam'],
  },
  {
    id: 'palimpsest',
    nama: 'Palimpsest',
    min: 5,
    max: 16,
    desk: 'Eksperimen: seluruh 36 profesi dan 16 jinx. Untuk meja yang sudah hafal aturan.',
    pool: Object.keys(PROFS) as ProfId[],
  },
];

export const scriptOf = (id: string): Script => SCRIPTS.find((s) => s.id === id) ?? SCRIPTS[1]!;
export function autoScript(n: number): Script {
  if (n <= 4) return SCRIPTS[0]!;
  if (n <= 7) return SCRIPTS[1]!;
  if (n <= 10) return SCRIPTS[2]!;
  return SCRIPTS[3]!;
}
export const jinxFor = (pool: ProfId[]) => JINX.filter((j) => pool.includes(j.a) && pool.includes(j.b));
export const jinxed = (inPlay: ProfId[], a: ProfId, b: ProfId) => inPlay.includes(a) && inPlay.includes(b);

/** Jumlah Revisi. 2–4 orang: kooperatif. */
export const revisiFor = (n: number) => (n <= 4 ? 0 : n <= 7 ? 1 : n <= 11 ? 2 : 3);
/** Pagu suntingan aktif (dibagi kedua kubu & gangguan). */
export const paguFor = (n: number) => (n <= 2 ? 3 : n <= 4 ? 4 : n <= 11 ? 2 : 3);

/**
 * Pilih profesi untuk n kursi dari pool script. Kuota: pembuka informasi
 * dibatasi, penyunting sesuai ukuran meja, minimal satu alat pemulihan dan
 * satu alat pendeteksi.
 */
export function pickProfs(n: number, script: Script, rnd: () => number): ProfId[] {
  const coop = n <= 4;
  const pool = script.pool.filter((id) => !coop || PROFS[id].coop);
  const shuf = <T>(xs: T[]) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };
  const maxInfo = coop ? Math.max(1, n - 1) : n <= 8 ? 3 : 4;
  const wantEdit = coop ? 0 : n <= 7 ? 1 : n <= 11 ? 2 : 3;
  const out: ProfId[] = [];
  const take = (id: ProfId | undefined) => id && !out.includes(id) && out.length < n && out.push(id);
  if (pool.includes('penyetel_jam') && rnd() < 0.8) take('penyetel_jam');
  for (const id of shuf(pool.filter((p) => PROFS[p].edit)).slice(0, wantEdit)) take(id);
  take(shuf(pool.filter((p) => ['pemulih', 'penjaga_segel', 'penyimpan_asli'].includes(p)))[0]);
  take(shuf(pool.filter((p) => PROFS[p].detek && !out.includes(p)))[0]);
  for (const id of shuf(pool)) {
    if (out.length >= n) break;
    const p = PROFS[id];
    if (p.info && out.filter((o) => PROFS[o].info).length >= maxInfo) continue;
    if (p.edit && out.filter((o) => PROFS[o].edit).length >= wantEdit) continue;
    if (p.lensa && out.some((o) => PROFS[o].lensa)) continue;
    take(id);
  }
  // Pool kecil: longgarkan kuota.
  for (const id of shuf(pool)) take(id);
  return shuf(out);
}
