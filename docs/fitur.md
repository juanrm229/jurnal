# Katalog fitur

Semua fitur dari dokumen konsep, dan di mana ia hidup di kode. Layar ada di `apps/mobile/src/app`, rute API di `apps/server/src/routes`, logika bersama di `packages/core/src`.

## Lima objek inti

| Fitur | Layar | Server / core |
| --- | --- | --- |
| **Drop** (tulisan, foto, voice ≤60 dtk gratis / 5 mnt Plus, lagu via tautan, ide, satu kata, warna mood, Ruang Hening; tag; jejak otomatis cuaca/langkah) | `drop.tsx` | `POST /drops`, `core/domain.ts` |
| Label audiens selalu terlihat (hanya aku · lingkaran · satu orang · kapsul waktu) | `drop.tsx` | `routes/days.ts` `createDrop` |
| **Kapsul Hari** + **Segel harimu** + Kalimat Terakhir; segel sampai 04.00 | `(tabs)/hari-ini.tsx`, `segel.tsx` | `POST /days/:day/seal`, `core/time.ts` |
| Segel timbal balik (memberi dulu, baru menerima) | `l/[id]/hari/[day].tsx` | `lib/visibility.ts` |
| **Lingkaran**: Duo (2), Lingkaran & Keluarga Pilihan (3–8), Kapsul Momen (hingga 400 tamu) | `(tabs)/lingkaran.tsx`, `l/baru.tsx`, `l/[id]/index.tsx`, `l/[id]/undang.tsx`, `j/[token].tsx` | `routes/circles.ts` |
| **Streak Bersama** lembut, Api Lingkaran, pembeku (dihadiahkan), milestone Gerbang/Jembatan/Mercusuar/Pelabuhan | `ui/Flame.tsx`, `segel.tsx` | `core/streak.ts`, `/freezes/*` |
| **Wrap**: Minggu Kita, Bulan Kita, Tahun Kita (film ±60 dtk), Wrap Acara; versi publik tanpa isi | `wrap/[circleId]/[scope]/[period].tsx` | `core/wrap.ts`, `POST /public-wraps`, `/w/:slug(.png)` |

## Fitur signature

| Fitur | Di mana |
| --- | --- |
| Dua Sisi Satu Hari (jam per jam, kota saja, tidak pernah titik) | `l/[id]/hari/[day].tsx` |
| Setahun Lalu, Kita… | `(tabs)/hari-ini.tsx`, `GET /memories/on-this-day` |
| Kapsul Waktu Terkunci (1–25 tahun sesuai paket) | `drop.tsx`, `surat/tulis.tsx`, server menahan ciphertext |
| OST Lingkaran + lagu tema + ekspor playlist Spotify | `wrap/…`, `lib/spotify.ts` |
| Kamus Lingkaran (Plus) | `l/[id]/kamus.tsx`, `core/text.ts dictionaryCandidates` |
| Lore & Bab, Upacara Tutup Bab (usul + voting), Pemegang Pena, Genre Tahun Ini, Prolog/Epilog | `l/[id]/kitab.tsx`, `routes/lore.ts` |
| Pertanyaan Malam (jawaban terbuka serentak saat disegel) | `hari-ini.tsx`, `l/[id]/index.tsx`, `core/rituals.ts` |
| Kapsul Momen (QR tamu, tier berbayar, Wrap acara) | `l/baru.tsx?kind=moment`, `l/[id]/undang.tsx`, `l/[id]/pengaturan.tsx` |
| Musim Bersama (Ramadan, mudik, 17-an, akhir tahun) + Kapsul Indonesia (peta mood anonim) | `musim.tsx`, `core/astro.ts`, `routes/community.ts` |
| Widget layar utama (api, doodle hari ini, taman setahun) | `src/widget`, `targets/widget` |

## Lapisan puitis

| Fitur | Di mana |
| --- | --- |
| Papan Tahun 365 petak, kabut untuk hari terlewat, Petak Istimewa | `l/[id]/papan.tsx` |
| Dek Kartu Harian + kartu langka (hujan pertama, hari jadi, takbiran, tahun baru, 17-an, ulang tahun, purnama, Ramadan…) + dek tematik berbayar | `hari-ini.tsx`, `core/rituals.ts dailyCardFor`, `aku/dek.tsx` |
| Kartu Rahasia (terbuka bila teman juga menjawab) | `lib/visibility.ts` |
| Dadu Kenangan (sekali seminggu) | `l/[id]/dadu.tsx`, `POST /circles/:id/dice` |
| Ekspedisi 7 hari (16 misi) | `l/[id]/ekspedisi.tsx` |
| Token Kenangan & Lemari Benda (15 token) | `l/[id]/lemari.tsx`, `features/tokens.ts` |
| Segel Saat Senja (jam matahari terbenam di kota masing-masing) | `lib/notifications.tsx`, `core/astro.ts sunsetUtc` |
| Kalimat Terakhir → puisi panjang setahun | `segel.tsx`, `l/[id]/kitab.tsx`, Wrap tahunan |
| Surat Tersesat (tiba acak 1–12 bulan) & Surat Wasiat Kecil, surat milestone | `surat/*`, `routes/letters.ts` |
| Halaman yang Menguning (hidup lagi saat dikunjungi) | `l/[id]/hari/[day].tsx`, `core/rituals.ts yellowing` |
| Puisi Temuan (blackout poetry) | `l/[id]/puisi.tsx` |
| Langit Lingkaran (rasi bintang hari-hari penting) | `l/[id]/langit.tsx` |
| Ruang Hening (hanya lilin) + jalan ke bantuan | `drop.tsx`, `bantuan.tsx` |
| Nama Pena & Julukan Tokoh (diberi teman) | `mulai/profil.tsx`, `l/[id]/pengaturan.tsx` |
| Motif | `l/[id]/kamus.tsx` |
| Catatan Kaki (pemilik memutuskan ikut tercetak) | `l/[id]/hari/[day].tsx` |
| Rak Perpustakaan + Buku Tahunan cetak | `rak.tsx`, `routes/billing.ts` |

## Sentuhan web app (`apps/web`)

| Fitur | Di mana |
| --- | --- |
| **Si Benih**: tanaman lingkaran digambar ulang sebagai satu SVG (8 tahap, pot berwajah, langit ikut jam), bisa diketuk dan bawel; cemburu pada Ruang Main, merajuk saat layu, berpesta di hari jadi | `ui/Benih.tsx`, `pages/circles/Plant.tsx`, `core/benih.ts benihTalk`, `lib/play.ts` |
| Perjalanan Tumbuh (lembar 8 tahap, yang belum dicapai masih siluet) | `pages/circles/Plant.tsx` |
| **Empat ruang**: tab bawah yang sama di semua layar utama — Hari ini, Kita, Rak, Main; coretan tinta meluncur ke ruang aktif, layar bergeser searah letak tabnya. Aku pindah ke avatar di pojok kanan atas | `ui/TabBar.tsx`, `ui/shell.tsx`, `lib/router.tsx tabIndex` |
| **Laci**: pencarian semua fitur + jelajah per ruang (ikon cari di pojok kanan atas, Ctrl/⌘+K) | `ui/Laci.tsx` |
| **Sistem visual**: token huruf, radius, jarak, durasi, dan warna lak; tiga bahan (kertas, kartu, lembar); lembar bisa diseret turun | `styles/sistem.css`, `ui/kit.tsx Sheet` |
| **Yang hadir**: avatar orang terdekat di kepala halaman (garis putus = belum menyegel, titik lak = sudah); membuka jepret, kangen, kilasan, buka bersama | `ui/Hadir.tsx` |
| **Upacara segel**: amplop utuh di tengah, kalimat terakhir di satu garis tinta, tombol tahan dari lak (ruangan meredup dan amplop mendekat selagi ditahan), riak saat lak ditekan, hasil muncul berurutan | `editor/Seal.tsx`, `styles/sistem.css` |
| Hari ini: kertas memenuhi layar, niat pagi sebagai catatan tempel, "untuk siapa" sebagai penanda di tepi kertas, alat + segel lak di jangkauan ibu jari | `pages/Today.tsx`, `editor/Niat.tsx` |
| **Tiup Lilin**: menyegel dengan meniup mikrofon (ambang mengikuti kebisingan ruangan; suara tidak direkam); tombol tahan tetap ada | `lib/blow.ts`, `editor/Seal.tsx` |
| **Primbon Ngawur**: ramalan konyol setelah menyegel, diramu di perangkat dari kata-kata halaman | `core/benih.ts primbon`, `editor/Seal.tsx` |
| **Kertas Ikut Senja**: kertas menghangat menjelang matahari terbenam di kota pengguna, gelap sesudahnya (pilihan di Tema, disimpan di perangkat) | `core/astro.ts paperPhase`, `lib/theme.tsx`, `pages/me/Tema.tsx` |
| **Kertas Kalkir**: halaman setahun / setengah tahun / sebulan / seminggu lalu tembus samar di bawah halaman hari ini | `editor/Kalkir.tsx`, `pages/Today.tsx` |
| **Rahasia kecil** di beranda lingkaran: **Tinta Hilang** (ciphertext hanya dilepas server saat penulis dan pembaca sama-sama membuka lingkaran), **Tukar Pena** (sebulan sekali menulis hari orang lain; terbuka setelah keduanya menulis), **Bendera Putih** (dikibarkan diam-diam 72 jam; baru dikabari saat bendera lain bertemu, lalu jadi bintang emas di langit) | `pages/circles/Berdua.tsx`, `lib/berdua.ts`, `routes/berdua.ts`, tabel `pair_notes` & `circle_presence` |
| **Cuaca Seberang**: cuaca kota orang terdekat menetes di tepi halaman hari ini (Open-Meteo, koordinat kota) | `editor/Seberang.tsx`, `lib/weather.ts` |
| **Si Kepo**: temuan pola setahun terakhir (jam favorit, kata paling setia, ritual hari tertentu, rasa saat hujan), dihitung di perangkat tanpa AI | `core/kepo.ts`, `pages/Kepo.tsx` (`/kepo`) |
| **Beranda Kita satu gulungan**: dua halaman hari ini berdampingan (amplop berlak = sudah menyegel, kertas putus-putus = belum) dengan satu tindakan utama yang mengikuti keadaan; Si Benih ringkas; "dunia kalian" empat dulu, sisanya di balik "semua" | `pages/circles/CircleHome.tsx`, `pages/circles/Plant.tsx` |
| Si Benih digambar dengan sapuan tinta (ikut tema tinta) | `ui/Benih.tsx wash` |
| **Rak**: taman ringkas (tanaman terbaru di garis tanah + setahun dalam 12 baris yang bisa digeser jari), punggung buku untuk kitab, jurnal, karya, surat, Si Kepo; cerita kita (Wrap) pindah ke sini | `pages/Kenangan.tsx`, `pages/circles/WrapHistory.tsx` |
| Pindah hari dengan kertas yang terbalik, dan kerangka kertas saat memuat | `pages/Today.tsx` |
| Keadaan kosong yang bercerita (bayangan taman tiga minggu ke depan, contoh rasi) | `pages/Kenangan.tsx`, `pages/lore/Langit.tsx` |

## Hidup Orang Lain (cerita bersama)

| Fitur | Di mana |
| --- | --- |
| Peta Pengetahuan: fakta disepakati per kalimat (tahu / mengira / tidak tahu per tokoh, cakupan, misteri disengaja); kartu prompt dirakit dari peta, fakta yang tidak sampai ke tokohmu tampil sebagai bar sensor | `pages/cerita/kit.tsx promptFor`, tabel `story_facts` |
| Editor naskah dengan sorotan di dalam teks: pilih potongan → jejak (merah) atau kalimat serah-terima (biru) atau bukti role; mode fokus layar penuh; draf di perangkat | `pages/cerita/Editor.tsx` |
| Jejak dialamatkan ke tokoh yang masuk akal mengetahuinya; maksud penulis dititipkan terpisah | `pages/cerita/Tulis.tsx`, kolom `handoff` & `intent` |
| Lipatan (Exquisite Corpse): kalimat serah-terima tampil, adegan terlipat; mode kejutan menahan adegan di server sampai pengungkapan | `pages/cerita/Baca.tsx Lipatan`, `routes/stories.ts wire` |
| Ruang baca: tafsir pembaca (kutip kalimat) lalu maksud penulis dilepas server; handshake fakta setuju/revisi/tunda/tarik; sanggahan dengan empat jalan keluar; tirai tanpa nama; tebak role; peta serah-terima | `pages/cerita/Baca.tsx`, tabel `story_reads` |
| Lensa bergilir memilih fokus tiap gelombang; giliran buta di tengah karya; pilih satu dari dua kartu role tiap babak | `core/cerita.ts storyLens storyTilt drawStoryOffers` |
| Peta Cerita: matriks siapa tahu apa, cek kesinambungan, garis waktu, perjalanan jejak, riwayat revisi, palet (ingin ada / garis / tirai) tanpa nama | `pages/cerita/Peta.tsx` |
| Persiapan empat langkah (pembuka, penulis, bentuk, palet); kapsul lanjutan mengisi pembuka cerita berikutnya | `pages/cerita/Baru.tsx` |
| Penutupan: pengungkapan, kartu role + tebakan, lima penghargaan yang hanya muncul dengan bukti, Wrapped pribadi + kartu hadiah, susun edisi (urutan, ending, Satu Jendela / Dua Sisi dengan pintu pembaca / Arsip Kehidupan) dengan persetujuan semua penulis, buku di rak, cetak | `pages/cerita/Akhir.tsx` |
| Cerpen (3), novella (6), novel (12); dek 48 kartu; lewati penulis macet; jalan lain; notifikasi tanpa isi | `core/cerita.ts`, `core/ceritaDek.ts`, `routes/stories.ts` |

## Desain aman

Mode Pisah, Mode Kenangan, keluar satu ketukan, lapor (isi dipilih pelapor) & blokir, kode keamanan, tautan perangkat via QR, kode pemulihan, ekspor & hapus akun, AI cloud opt-in per lingkaran — lihat [keamanan-privasi.md](keamanan-privasi.md). Layar: `l/[id]/pengaturan.tsx`, `lapor.tsx`, `aku/keamanan.tsx`, `aku/privasi.tsx`, `aku/blokir.tsx`.

## Monetisasi

Gratis (2 lingkaran) · Plus Rp29.000/bln atau Rp249.000/thn · Plus Duo · hadiah (kode) · Buku Tahunan · Kapsul Momen · dek kartu. Bayar lewat web (Xendit: QRIS, e-wallet, VA). Layar: `plus.tsx`, `aku/pesanan.tsx`, `aku/hadiah.tsx`, `aku/dek.tsx`, `rak.tsx`. Server: `routes/billing.ts`, `core/plans.ts`.

### Hidup Orang Lain: lanjutan

- **Jatah keuntungan**: keuntungan kartu role dipakai sekali per babak; server menolak pemakaian kedua dan editor menampilkan sisa jatah.
- **Kartu berprasyarat**: kartu dek lengkap yang butuh kondisi Peta (fakta sah, riset bersama, misteri, gelombang, jumlah penulis) baru masuk tawaran setelah syaratnya terpenuhi.
- **Ruang Penelitian**: tab riset berisi pertanyaan (terbuka/terjawab/diperdebatkan), kartu sumber, keputusan dunia dengan asalnya, dan moodboard foto terenkripsi. Privat sampai dibagikan; keputusan bisa diusulkan jadi fakta dunia di Peta. Riset yang relevan tampil di kartu prompt tokoh.
- **Dari harimu**: Kalimat Terakhir dari hari yang sudah disegel bisa jadi benih premis.
- **Ekspor**: EPUB 3, DOCX, dan Markdown dirakit di perangkat.
- **AI (opsional)**: rangkuman kejadian (terjadi vs diyakini) dan dua sinopsis, usulan jejak dari naskah, dan cek kesinambungan. Aktif hanya bila semua anggota lingkaran setuju dan server punya kunci AI; teks yang dikirim disebutkan sebelum tombol ditekan.

### Studio Naskah

- **Naskah berbasis adegan**: bab dan adegan, urutan baca bisa diatur siapa pun di naskah. Satu adegan, satu pemilik: hanya penulisnya yang mengubah isi; draf hanya terlihat olehnya sampai diterbitkan. Riwayat versi tersimpan saat terbit.
- **Kanon**: tokoh, benda, tempat, dan fakta, dengan siapa yang tahu atau mengira dan sejak adegan mana. Kanon milik bersama.
- **Kacamata Tokoh**: saat menulis dari sudut pandang seorang tokoh, studio menandai hal yang belum ia ketahui pada waktu cerita itu, kata yang belum ada di zamannya, dan menampilkan panel tahu / mengira / belum tahu. Semua dihitung di perangkat; isi tetap terenkripsi.
- **Garis waktu**: adegan menurut urutan kejadian per tokoh, terpisah dari urutan baca.
- Cerita Hidup Orang Lain yang selesai bisa dilanjutkan di studio: tokoh dan fakta sah jadi Kanon, bagian jadi adegan.
