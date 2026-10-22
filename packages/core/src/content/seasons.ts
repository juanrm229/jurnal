// Musim Bersama: prompt harian untuk musim nasional.
// - ramadan: hari ke-1..30 mengikuti hari Ramadan (Nuzulul Qur'an di hari ke-17,
//   sepuluh malam terakhir mulai hari ke-21). Selalu ramah untuk anggota yang
//   tidak berpuasa.
// - mudik: 14 hari, kira-kira H-7 sampai H+6 Idulfitri (hari ke-9 = malam
//   takbiran, hari ke-10 = hari raya). Ramah untuk yang tidak bisa pulang.
// - tujuh_belas: 11–17 Agustus (hari ke-7 = 17 Agustus).
// - akhir_tahun: 18–31 Desember (hari ke-1 = 18 Des, hari ke-14 = 31 Des).

import type { SeasonContent, SeasonPrompt } from './types';

const days = (texts: string[]): SeasonPrompt[] => texts.map((text, i) => ({ day: i + 1, text }));

export const SEASONS: SeasonContent[] = [
  {
    code: 'ramadan',
    name: 'Musim Ramadan',
    tagline: 'Tiga puluh hari, untuk yang berpuasa maupun yang menemani.',
    doodle: 'lentera',
    prompts: days([
      'Hari pertama. Yang berpuasa maupun yang menemani: apa yang ingin kamu jaga bulan ini?',
      'Menu sahur atau sarapan pertama yang benar-benar terjadi, bukan yang direncanakan?',
      'Potret langit menjelang magrib di kotamu.',
      'Suara apa yang terdengar di jam sahur? Kentongan, toa, alarm, atau sunyi?',
      'Takjil favoritmu minggu ini?',
      'Hal kecil apa yang terasa lebih tenang bulan ini?',
      'Seminggu lewat. Bagian mana yang paling berat, dan mana yang paling manis?',
      'Bukber pertama tahun ini, atau berbuka sendirian. Ceritakan suasananya.',
      'Satu kebaikan kecil yang kamu terima hari ini?',
      'Masakan yang mengingatkanmu pada Ramadan waktu kecil?',
      'Potret meja atau alas berbukamu malam ini, apa adanya.',
      'Yang berpuasa: siapa yang menemanimu? Yang tidak: bagaimana caramu menemani?',
      'Lagu atau suara yang paling identik dengan Ramadan buatmu?',
      'Ada yang ingin kamu kurangi bulan ini? Sudah sedikit berkurang?',
      'Setengah jalan. Satu kalimat untuk dirimu di hari pertama.',
      'Jam berapa kamu paling mengantuk hari ini? Jujur saja.',
      'Malam Nuzulul Qur\'an bagi yang memperingati. Kalimat apa yang sedang menguatkanmu, dari mana pun asalnya?',
      'Bagi sesuatu hari ini: makanan, waktu, atau tenaga. Ceritakan sedikit.',
      'Hal yang paling kamu rindukan dari Ramadan bertahun-tahun lalu?',
      'Potret satu cahaya malam ini: lampu, lilin, atau lentera.',
      'Sepuluh malam terakhir dimulai. Ingin kamu isi dengan apa malam-malam ini?',
      'Persiapan hari raya sudah mulai? Kue, baju, atau masih santai saja?',
      'Doa yang kamu ulang-ulang bulan ini, kalau boleh dibagi?',
      'Yang merantau: sudah dapat tiket pulang? Yang tidak pulang: rencana kecil apa untuk hari raya?',
      'Seseorang yang ingin kamu mintai maaf, atau kamu beri terima kasih, sebelum bulan ini selesai?',
      'Menu berbuka paling niat bulan ini?',
      'Potret langit sahur atau langit subuh hari ini.',
      'Hal yang berubah dari dirimu selama sebulan ini, sekecil apa pun?',
      'Hampir selesai. Bagian mana dari bulan ini yang ingin kamu ingat setahun lagi?',
      'Hari terakhir. Satu kalimat untuk menutup bulan ini, dari yang berpuasa maupun yang menemani.',
    ]),
  },
  {
    code: 'mudik',
    name: 'Kapsul Mudik',
    tagline: 'Yang pulang, yang menunggu, dan yang merayakan dari jauh.',
    doodle: 'tiket',
    prompts: days([
      'Pulang atau tidak tahun ini, apa yang paling kamu tunggu dari libur panjang?',
      'Potret koper, tas, atau kardus yang sedang disiapkan. Tidak bepergian? Potret sudut tempatmu bertahan.',
      'Oleh-oleh yang wajib dibawa, atau oleh-oleh yang sedang kamu tunggu?',
      'Kalau tahun ini tidak pulang: hal kecil apa yang membuat hari raya di sini tetap hangat?',
      'Lagu wajib di perjalanan? Atau lagu wajib saat beres-beres rumah?',
      'Potret jalan, peron, bandara, atau pelabuhan yang kamu lewati. Atau jalanan kota yang mendadak sepi.',
      'Cerita macet, antre, atau rest area paling berkesan?',
      'Bau atau suara pertama yang menyambutmu saat tiba? Yang tidak bepergian: bau hari raya di kotamu?',
      'Malam takbiran. Rekam sepotong suaranya, atau ceritakan rasanya.',
      'Hari raya. Satu hal yang kamu syukuri hari ini, di mana pun kamu merayakannya.',
      'Hidangan yang paling kamu tunggu: opor, rendang, ketupat, atau nastar?',
      'Pertanyaan basa-basi paling ajaib yang kamu dengar saat silaturahmi? Boleh dijawab dengan senyum saja.',
      'Tempat lama yang kamu datangi lagi, atau tempat yang kamu rindukan dari jauh?',
      'Arus balik. Apa yang kamu bawa pulang ke rutinitas, selain oleh-oleh?',
    ]),
  },
  {
    code: 'tujuh_belas',
    name: 'Pekan Tujuhbelasan',
    tagline: 'Umbul-umbul, lomba, dan merdeka yang kecil-kecil.',
    doodle: 'bendera',
    prompts: days([
      'Potret umbul-umbul atau bendera pertama yang kamu lihat minggu ini.',
      'Lomba tujuhbelasan favoritmu: balap karung, makan kerupuk, panjat pinang, atau bakiak?',
      'Kenangan lomba waktu kecil: menang, kalah, atau sekadar ikut ramainya?',
      'Hal tentang Indonesia yang diam-diam kamu banggakan?',
      'Makanan daerah lain yang ingin kamu cicipi langsung di tempat asalnya?',
      'Lagu nasional yang masih kamu hafal sampai bait kedua? Rekam sepotong kalau berani.',
      'Dirgahayu. Merdeka dari hal apa yang ingin kamu rayakan tahun ini, sekecil apa pun?',
    ]),
  },
  {
    code: 'akhir_tahun',
    name: 'Menjelang Tutup Buku',
    tagline: 'Empat belas malam terakhir sebelum jilid ini ditutup.',
    doodle: 'kembang-api',
    prompts: days([
      'Tahun ini hampir selesai. Satu kata untuk tahun ini?',
      'Foto yang paling sering kamu buka tahun ini?',
      'Lagu tema tahun ini, versimu?',
      'Hal baru yang kamu coba tahun ini?',
      'Orang baru yang hadir tahun ini, atau orang lama yang terasa baru?',
      'Tempat paling berkesan tahun ini?',
      'Malam yang tenang. Satu hal yang kamu syukuri dari tahun ini, untuk yang merayakan Natal maupun yang sekadar libur.',
      'Hari libur. Ramai atau sepi, bagaimana kamu menghabiskannya?',
      'Hal berat tahun ini yang berhasil kamu lewati.',
      'Kebiasaan kecil yang kamu bangun tahun ini?',
      'Hal yang ingin kamu tinggalkan di tahun ini?',
      'Satu hal yang ingin kamu bawa ke tahun depan?',
      'Usulkan genre untuk jilid tahun ini. Komedi? Kisah pulang? Tahun bertahan?',
      'Malam Buka Kapsul. Tulis epilog satu kalimat untuk jilid ini.',
    ]),
  },
];
