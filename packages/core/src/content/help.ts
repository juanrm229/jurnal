// Jalan ke bantuan profesional, ditampilkan dengan lembut di Ruang Hening.
// Hanya layanan yang bisa diverifikasi masih berlaku per Oktober 2026.
// Periksa ulang setiap rilis; nomor layanan bisa berubah.
//
// Sengaja TIDAK dicantumkan (belum bisa diverifikasi untuk 2025–2026):
// - LISA Helpline (Bali Bersama Bisa), WA +62 811-3855-472: sumber terbaru
//   yang ditemukan berasal dari 2021–2022.
// - Into The Light Indonesia: komunitas advokasi & edukasi pencegahan bunuh
//   diri yang masih aktif (Ashoka Fellow, Des 2025), tapi bukan layanan krisis.
// - SEJIWA (119 ext. 8, 2020): jalur yang sama kini dilayani Healing119.

import type { HelpResource } from './types';

export const HELP_RESOURCES: HelpResource[] = [
  // Sumber: Kemenkes, FAQ "Cegah Bunuh Diri, Dukung Kesehatan Jiwa — Kenali Layanan Healing119.id"
  //   https://kesprimkom.kemkes.go.id/assets/uploads/contents/others/FAQ_Cegah_Bunuh_Diri%2C_Dukung_Kesehatan_Jiwa__Kenali_Layanan_Healing119.id.pdf
  // Sumber: RRI, "Butuh Teman Bicara? Kenali Healing119" (24 jam, gratis, tanpa batas usia)
  //   https://rri.co.id/bengkulu/hiburan/2791637/butuh-teman-bicara-kenali-healing119
  // Sumber: Kontan, Sep 2026 (data akses telepon & WhatsApp Agustus 2026)
  //   https://nasional.kontan.co.id/news/layanan-konseling-diserbu-indonesia-krisis-kesehatan-mental
  {
    name: 'Healing119 (Kemenkes) — telepon',
    contact: '119 ext. 8',
    description:
      'Teman bicara untuk pertolongan pertama psikologis dari Kementerian Kesehatan. Gratis, 24 jam, tanpa daftar. Kalau belum tersambung, konselor mungkin sedang mendampingi orang lain; coba lagi sebentar lagi.',
  },
  // Sumber yang sama dengan di atas; tombol chat WhatsApp tersedia di halaman utama healing119.id.
  //   https://infopublik.id/kategori/layanan-publik/952502/healing119id-layanan-kesehatan-mental-24-jam-teman-bicara-yang-siap-mendengar
  {
    name: 'Healing119 (Kemenkes) — chat WhatsApp',
    contact: 'https://healing119.id',
    description: 'Kalau lebih nyaman mengetik daripada bicara: buka situsnya, lalu ketuk tombol WhatsApp untuk mulai chat.',
  },
  // Sumber: RRI, Feb 2026, "Hubungi 'SAPA 129', Kontak Penanganan Kasus Kekerasan"
  //   https://rri.co.id/nasional/2201276/hubungi-sapa-129-kontak-penanganan-kasus-kekerasan-terhadap-anak
  // Sumber: Antara Jogja, Jun 2026 (Menteri PPPA merujuk SAPA 129 dan WA 08111-129-129)
  //   https://jogja.antaranews.com/berita/834811/menteri-pppa-minta-warga-lapor-jika-mengetahui-anak-terpapar-judol
  // Sumber: InfoPublik, "SAPA 129, Layanan Cepat dan Aman untuk Perempuan dan Anak Korban Kekerasan"
  //   https://infopublik.id/kategori/layanan-publik/927918/sapa-129-layanan-cepat-dan-aman-untuk-perempuan-dan-anak-korban-kekerasan
  {
    name: 'SAPA 129 (KemenPPPA)',
    contact: '129 · WA 08111-129-129',
    description:
      'Untuk perempuan dan anak yang mengalami kekerasan, termasuk dalam hubungan. Identitas pelapor dirahasiakan; bisa dibantu pendampingan psikologis dan tempat aman. Formulir daring: laporsapa129.kemenpppa.go.id.',
  },
  // Sumber: Antara, Lebaran 2025 (112 gratis dari semua operator, bisa dipanggil saat HP terkunci)
  //   https://www.antaranews.com/berita/4735525/layanan-panggilan-darurat-112-siaga-untuk-masyarakat-di-lebaran-2025
  // Sumber: MomsMoney/Kontan, daftar nomor darurat mudik Lebaran 2026 (112 = nomor darurat terintegrasi)
  //   https://momsmoney.kontan.co.id/news/daftar-nomor-darurat-mudik-lebaran-2026-catat-ini-biar-perjalanan-anda-aman
  {
    name: 'Panggilan Darurat 112',
    contact: '112',
    description:
      'Kalau kamu atau seseorang dalam bahaya sekarang. Gratis dari semua operator dan bisa ditelepon walau HP terkunci. Kalau 112 belum aktif di daerahmu, hubungi 110 (polisi) atau 119 (ambulans), atau datang ke IGD terdekat.',
  },
];
