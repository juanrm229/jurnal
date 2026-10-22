// Genre Tahun Ini: sampul dan nada untuk satu jilid Tahun Kita.
// Dipilih ulang bersama sebelum dicetak.

import type { Genre } from './types';

export const GENRES: Genre[] = [
  {
    id: 'kisah-pulang',
    name: 'Kisah Pulang',
    blurb: 'Tentang jalan-jalan yang selalu berakhir di orang yang sama.',
    cover: { pattern: 'gelombang', doodle: 'rumah' },
  },
  {
    id: 'komedi-kos-kosan',
    name: 'Komedi Kos-kosan',
    blurb: 'Mi instan tengah malam, jemuran tertukar, dan tawa yang tidak pernah habis.',
    cover: { pattern: 'kotak', doodle: 'kucing' },
  },
  {
    id: 'petualangan-tak-direncanakan',
    name: 'Petualangan yang Tak Direncanakan',
    blurb: 'Rencananya cuma makan. Tahu-tahu jadi cerita setahun.',
    cover: { pattern: 'titik', doodle: 'peta' },
  },
  {
    id: 'slice-of-life-hangat',
    name: 'Slice of Life yang Hangat',
    blurb: 'Hari-hari biasa yang ternyata paling ingin diulang.',
    cover: { pattern: 'polos', doodle: 'cangkir' },
  },
  {
    id: 'drama-keluarga-pilihan',
    name: 'Drama Keluarga Pilihan',
    blurb: 'Bukan sedarah, tapi selalu datang. Kadang ribut, selalu pulang.',
    cover: { pattern: 'garis', doodle: 'pohon-kecil' },
  },
  {
    id: 'puisi-hujan',
    name: 'Puisi Hujan',
    blurb: 'Payung yang lupa dibawa, jendela berembun, dan kalimat-kalimat yang basah.',
    cover: { pattern: 'garis', doodle: 'hujan' },
  },
  {
    id: 'road-movie-mudik',
    name: 'Road Movie Mudik',
    blurb: 'Tiket, macet, rest area, dan pelukan di ujung jalan.',
    cover: { pattern: 'garis', doodle: 'tiket' },
  },
  {
    id: 'coming-of-age',
    name: 'Coming-of-Age',
    blurb: 'Tahun ketika kita sedikit lebih dewasa, dan sedikit lebih jujur.',
    cover: { pattern: 'titik', doodle: 'tunas' },
  },
  {
    id: 'kisah-jarak-jauh',
    name: 'Kisah Jarak Jauh',
    blurb: 'Dua kota, dua senja, satu kapsul.',
    cover: { pattern: 'bintang', doodle: 'surat-botol' },
  },
  {
    id: 'musim-tumbuh',
    name: 'Musim Tumbuh',
    blurb: 'Pelan-pelan, sesuatu dalam diri kita mulai berakar.',
    cover: { pattern: 'titik', doodle: 'bunga-matahari' },
  },
  {
    id: 'misteri-kecil',
    name: 'Misteri Kecil',
    blurb: 'Siapa yang selalu menghabiskan kerupuk? Jilid ini tidak menjawabnya.',
    cover: { pattern: 'kotak', doodle: 'kunci' },
  },
  {
    id: 'romansa-pelan',
    name: 'Romansa Pelan',
    blurb: 'Tidak ada adegan besar. Hanya teh yang dibuatkan tanpa diminta.',
    cover: { pattern: 'polos', doodle: 'mawar' },
  },
  {
    id: 'catatan-perantau',
    name: 'Catatan Perantau',
    blurb: 'Kamar sewaan, warung langganan, dan rumah yang dibawa ke mana-mana.',
    cover: { pattern: 'kotak', doodle: 'kompas' },
  },
  {
    id: 'tahun-bertahan',
    name: 'Tahun Bertahan',
    blurb: 'Tahun yang berat. Kita melewatinya, satu halaman demi satu halaman.',
    cover: { pattern: 'polos', doodle: 'lilin' },
  },
];
