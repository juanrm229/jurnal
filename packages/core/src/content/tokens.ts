// Token Kenangan: benda kecil yang disimpan di Lemari Benda lingkaran.
// Token tidak pernah dipakai untuk membandingkan anggota; semuanya milik bersama.

import type { TokenDef } from './types';

export const TOKENS: TokenDef[] = [
  {
    code: 'kunci',
    name: 'Kunci Pertama',
    awardLine: 'Hari pertama kalian sudah tersegel. Ini kuncinya, simpan baik-baik.',
    howTo: 'Didapat saat kapsul pertama lingkaran ini disegel bersama.',
    doodle: 'kunci',
  },
  {
    code: 'payung',
    name: 'Payung',
    awardLine: 'Hari ini hujan, dan kalian tetap menyimpannya.',
    howTo: 'Didapat saat lingkaran menyegel hari yang tercatat hujan.',
    doodle: 'payung',
  },
  {
    code: 'tiket',
    name: 'Tiket',
    awardLine: 'Satu halaman ditulis jauh dari rumah. Tiketnya kami selipkan di sini.',
    howTo: 'Didapat saat kamu menyegel hari dari kota yang berbeda dengan kota asalmu di pengaturan.',
    doodle: 'tiket',
  },
  {
    code: 'kerang',
    name: 'Kerang',
    awardLine: 'Ada bau laut di halaman ini.',
    howTo: 'Didapat saat kamu menyegel hari dengan Drop bertanda laut.',
    doodle: 'kerang',
  },
  {
    code: 'lilin',
    name: 'Lilin',
    awardLine: 'Hari yang berat sudah lewat. Ada yang menyalakan lilin untukmu.',
    howTo: 'Didapat saat Drop di Ruang Hening menerima lilin dari anggota lingkaran.',
    doodle: 'lilin',
  },
  {
    code: 'perangko',
    name: 'Perangko',
    awardLine: 'Surat Tersesat pertama kalian akhirnya sampai.',
    howTo: 'Didapat saat Surat Tersesat pertama di lingkaran ini tiba di tujuannya.',
    doodle: 'perangko',
  },
  {
    code: 'kompas',
    name: 'Kompas',
    awardLine: 'Tujuh hari, satu ekspedisi, jalan yang ditempuh bersama.',
    howTo: 'Didapat saat lingkaran menyelesaikan satu Ekspedisi tujuh hari.',
    doodle: 'kompas',
  },
  {
    code: 'bulan',
    name: 'Bulan Purnama',
    awardLine: 'Kalian menyegel hari di bawah bulan yang penuh.',
    howTo: 'Didapat saat lingkaran menyegel hari pada malam bulan purnama.',
    doodle: 'bulan',
  },
  {
    code: 'ketupat',
    name: 'Ketupat',
    awardLine: 'Halaman hari raya. Mohon maaf lahir dan batin, dari kami juga.',
    howTo: 'Didapat saat lingkaran menyegel hari pada tanggal Idulfitri.',
    doodle: 'ketupat',
  },
  {
    code: 'lentera',
    name: 'Lentera',
    awardLine: 'Tiga puluh hari Ramadan tersimpan. Lenteranya tetap menyala.',
    howTo: 'Didapat saat lingkaran menyelesaikan 30 hari Musim Ramadan. Hari yang dibekukan tetap terhitung.',
    doodle: 'lentera',
  },
  {
    code: 'bendera',
    name: 'Bendera',
    awardLine: 'Dirgahayu. Satu halaman merah putih untuk kitab kalian.',
    howTo: 'Didapat saat lingkaran menyegel hari pada 17 Agustus.',
    doodle: 'bendera',
  },
  {
    code: 'kembang_api',
    name: 'Kembang Api',
    awardLine: 'Jilid ini sudah dibuka bersama. Selamat datang di tahun yang baru.',
    howTo: 'Didapat saat lingkaran membuka Tahun Kita pada Malam Buka Kapsul, 31 Desember.',
    doodle: 'kembang-api',
  },
  {
    code: 'daun_kering',
    name: 'Daun Kering',
    awardLine: 'Halaman yang mulai menguning hidup lagi karena kamu datang.',
    howTo: 'Didapat saat kamu mengunjungi atau memberi catatan pada halaman yang mulai menguning.',
    doodle: 'daun-kering',
  },
  {
    code: 'cangkir',
    name: 'Cangkir Pagi',
    awardLine: 'Tujuh pagi berturut-turut. Kopinya masih hangat.',
    howTo: 'Didapat saat kamu membuat Drop sebelum pukul 09.00 selama tujuh pagi berturut-turut, menurut jam kotamu.',
    doodle: 'cangkir',
  },
  {
    code: 'pita',
    name: 'Pita',
    awardLine: 'Selamat hari jadi. Satu tahun lagi diikat dengan pita.',
    howTo: 'Didapat setiap hari jadi lingkaran, pada tanggal lingkaran ini pertama dibuat.',
    doodle: 'pita',
  },
];
