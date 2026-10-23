// Naskah video tutorial Sehari: 14 bab, tiap langkah = satu kalimat narasi
// + gerakan di layar. Teks narasi juga dipakai halaman Panduan di aplikasi.
import { keys, onboard, partner } from './people.mjs';
import { APP, sleep } from './studio.mjs';

const tag = Date.now().toString(36);
const S = { circleId: '', meetId: '', b: null };

const api = (h, method, path, body) =>
  h.app.evaluate(
    async ([m, u, b]) => {
      const r = await fetch(`/v1${u}`, { method: m, headers: { authorization: `Bearer ${localStorage.getItem('sehari.token')}`, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
      return r.json().catch(() => null);
    },
    [method, path, body],
  );

async function writeOnPage(h, text) {
  await h.app.waitForSelector('.page');
  await sleep(600);
  const box = await h.$('.page').boundingBox();
  const x = box.x + box.width * 0.16;
  const y = box.y + box.width * 0.3;
  await h.page.evaluate(([x, y]) => studio.move(x, y), [x, y]);
  await sleep(450);
  await h.page.evaluate(([x, y]) => studio.press(x, y), [x, y]);
  await h.page.mouse.click(x, y);
  await sleep(300);
  await h.page.keyboard.type(text, { delay: 45 });
}

export const CHAPTERS = [
  {
    id: 'mulai',
    short: 'mulai',
    kicker: 'BAB 1',
    title: 'Selamat datang',
    sub: 'Jurnal kecil yang kamu isi bersama orang-orang tersayang.',
    hand: 'satu hari, satu halaman',
    intro: 'Selamat datang di Sehari. Di video ini, kita jalan-jalan melihat semua fiturnya, dari halaman pertama sampai permainan kartu ngobrol.',
    steps: [
      {
        say: 'Sehari adalah jurnal kecil yang kamu isi bersama orang-orang pilihanmu: pasangan, sahabat, atau keluarga. Satu halaman setiap hari.',
        run: async (h) => {
          await sleep(1800);
          await h.scroll(420);
          await sleep(1400);
          await h.scroll(-420);
        },
      },
      {
        say: 'Semua tulisan dan foto dienkripsi di perangkatmu. Bahkan kami tidak bisa membacanya.',
        run: async (h) => {
          await h.scroll(900, 18);
          await sleep(900);
          await h.top();
        },
      },
      {
        say: 'Untuk mulai, masukkan emailmu. Tidak perlu kata sandi: kami mengirimkan kode enam angka.',
        cap: 'Masuk dengan email. Tanpa kata sandi, cukup kode enam angka.',
        run: async (h) => {
          await h.go('/masuk');
          await h.type('input[type=email]', `naya-${tag}@contoh.id`);
          await h.tap('button:has-text("kirim kode")');
        },
      },
      {
        say: 'Masukkan kodenya, lalu isi nama pena, tahun lahir, dan kotamu.',
        run: async (h) => {
          await onboard(h.app, 'Naya', `naya-${tag}@contoh.id`, 'Jakarta', { show: h, skipEmail: true });
        },
      },
      {
        say: 'Lalu Sehari membuat kunci pribadimu. Simpan kode pemulihan ini baik-baik, karena hanya kode inilah yang bisa membuka jurnalmu di perangkat baru.',
        cap: 'Simpan kode pemulihan. Hanya kode ini yang bisa membuka jurnalmu di perangkat baru.',
        run: async (h) => {
          S.finishKeys = await keys(h.app, { show: h });
          await sleep(1200);
          await h.scroll(260);
        },
      },
      {
        say: 'Untuk memastikan sudah tersimpan, ketik empat huruf terakhirnya.',
        run: async (h) => {
          await S.finishKeys();
        },
      },
    ],
  },
  {
    id: 'lingkaran',
    short: 'lingkaran',
    kicker: 'BAB 2',
    title: 'Lingkaran',
    sub: 'Ajak pasangan, sahabat, atau keluarga ke dalam satu lingkaran.',
    hand: 'lebih indah bersama',
    intro: 'Sehari paling indah dipakai bersama. Bab ini tentang lingkaran: tempat kamu dan orang-orang tersayang berbagi hari.',
    steps: [
      {
        say: 'Setelah kunci tersimpan, kamu bisa langsung mengundang seseorang. Ketuk kirim undangan, lalu bagikan tautannya lewat WhatsApp.',
        cap: 'Ketuk “kirim undangan”, lalu bagikan tautannya.',
        run: async (h) => {
          await h.tap('button:has-text("kirim undangan")');
          await sleep(800);
          S.invite = (await h.$('.sticky .tiny').first().textContent()).trim();
          await h.point('.sticky');
        },
      },
      {
        say: 'Begitu dia menerima undangan dan membuat akun, kalian otomatis berada dalam satu lingkaran berdua, yang kami sebut Duo.',
        run: async (h) => {
          S.b = await partner(h.shared.browser, S.invite, tag);
          const cs = await api(h, 'GET', '/circles');
          S.circleId = cs[0].id;
          await h.tap('button:has-text("ke halaman hari ini")');
          await sleep(600);
          await h.go('/lingkaran');
          await h.app.waitForSelector('a[href="/l/baru"]', { timeout: 15000 });
        },
      },
      {
        say: 'Kamu juga bisa membuat lingkaran lain untuk geng sahabat, keluarga, atau satu acara seperti pernikahan dan liburan.',
        run: async (h) => {
          await h.tap('a[href="/l/baru"]');
          await sleep(1500);
          await h.scroll(300);
          await sleep(800);
        },
      },
      {
        say: 'Di halaman lingkaran ada semua milik bersama: hari ini, janji temu, daftar mimpi, karya, surat, dan cerita kalian.',
        cap: 'Halaman lingkaran: hari ini, janji temu, daftar mimpi, karya, surat, dan cerita.',
        run: async (h) => {
          await h.go(`/l/${S.circleId}`);
          await sleep(800);
          await h.scroll(500, 20);
          await sleep(700);
          await h.scroll(600, 20);
          await sleep(700);
          await h.scroll(700, 20);
        },
      },
    ],
  },
  {
    id: 'hari',
    short: 'hari ini',
    kicker: 'BAB 3',
    title: 'Halaman hari ini',
    sub: 'Tulisan, foto, stiker, suara, dan warna hari.',
    hand: 'isi sesukamu',
    intro: 'Setiap hari kamu mendapat satu halaman kosong. Isi dengan apa saja: tulisan, foto, stiker, suara, atau warna hari.',
    steps: [
      {
        say: 'Ketuk di mana saja di kertas untuk mulai menulis.',
        run: async (h) => {
          await h.go('/hari');
          await writeOnPage(h, 'hujan seharian. kita batal ke pantai, tapi kopinya enak.');
          await h.tap('.dock-done');
        },
      },
      {
        say: 'Tambahkan foto dari galeri. Fotonya langsung jadi polaroid yang bisa digeser dan diputar.',
        run: async (h) => {
          await h.point('.dock-btn:has-text("foto")');
          await h.app.setInputFiles('input[type=file][accept="image/*"]', 'e2e/tutorial/assets/senja.jpg');
          await sleep(2600);
        },
      },
      {
        say: 'Ada ratusan stiker dan doodle: perasaan, makanan, cuaca, selotip washi, sampai cap pos.',
        run: async (h) => {
          await h.tap('.dock-btn:has-text("stiker")');
          await sleep(700);
          await h.tap('.sheet .pill:has-text("selotip")');
          await sleep(600);
          await h.tap(h.$('.sheet .sticker-cell').nth(7));
          await sleep(700);
          await h.tap('.dock-btn:has-text("stiker")');
          await sleep(500);
          await h.tap('.sheet .pill:has-text("perasaan")');
          await sleep(500);
          await h.tap(h.$('.sheet button[title]').nth(3));
        },
      },
      {
        say: 'Geser apa pun dengan jari. Ketuk sekali untuk mengubah gaya, ukuran, warna, atau membawanya ke depan.',
        run: async (h) => {
          const photo = h.$('.el:has(.polaroid)').first();
          const b = await photo.boundingBox();
          if (b) {
            const x = b.x + b.width / 2;
            const y = b.y + b.height / 2;
            await h.page.evaluate(([x, y]) => studio.move(x, y), [x, y]);
            await sleep(450);
            await h.page.mouse.move(x, y);
            await h.page.mouse.down();
            for (let i = 1; i <= 14; i++) {
              await h.page.mouse.move(x - i * 4, y + i * 6);
              await h.page.evaluate(([x, y]) => studio.move(x, y), [x - i * 4, y + i * 6]);
              await sleep(30);
            }
            await h.page.mouse.up();
          }
          await sleep(1500);
          await h.tap('.dock-done');
        },
      },
      {
        say: 'Di menu lainnya ada rekaman suara, lagu yang diputar hari ini, warna hari, cap tanggal, dan ruang hening untuk hari yang berat.',
        cap: 'Menu “lainnya”: suara, lagu, warna hari, cap tanggal, ruang hening.',
        run: async (h) => {
          await h.tap('.dock-btn:has-text("lainnya")');
          await sleep(2600);
          await h.tap('.tile:has-text("warna hari")');
          await sleep(1200);
          await h.tap(h.$('.sheet button').nth(3)).catch(() => {});
        },
      },
      {
        say: 'Kalau bingung mau menulis apa, tarik kartu pertanyaan. Ada banyak dek bertema, dari yang ringan sampai yang dalam.',
        run: async (h) => {
          await h.tap('.dock-btn:has-text("lainnya")');
          await sleep(500);
          await h.tap('.tile:has-text("kartu & pertanyaan")');
          await sleep(1500);
          await h.tap('.sheet button:has-text("tarik kartu lain")');
          await sleep(1200);
          await h.app.locator('.sheet').press('Escape').catch(() => {});
          await h.page.keyboard.press('Escape');
        },
      },
    ],
  },
  {
    id: 'segel',
    short: 'segel',
    kicker: 'BAB 4',
    title: 'Segel & buka bersama',
    sub: 'Setiap malam halaman disegel, lalu dibuka berdampingan.',
    hand: 'momen terbaiknya',
    intro: 'Inilah inti Sehari. Setiap malam halaman disegel, dan isinya baru terlihat oleh lingkaranmu setelah semuanya ikut menyegel.',
    steps: [
      {
        say: 'Kalau sudah selesai, ketuk segel. Tulis satu kalimat penutup hari, lalu tahan tombolnya sampai lilinnya menempel.',
        cap: 'Ketuk segel, tulis kalimat penutup, lalu tahan tombolnya.',
        run: async (h) => {
          await h.tap('.dock-seal');
          await sleep(700);
          await h.type('.seal-overlay input.field', 'hujan yang baik.');
          await h.point('.hold-btn');
          await h.$('.hold-btn').focus();
          await h.page.keyboard.press('Enter');
          await h.app.waitForSelector('text=selesai', { timeout: 20000 });
        },
      },
      {
        say: 'Halaman yang sudah tersegel tidak bisa diubah lagi. Sekarang tinggal menunggu yang lain ikut menyegel.',
        run: async (h) => {
          await sleep(1200);
          await h.tap('.seal-overlay button:has-text("selesai")');
          await S.b.writeAndSeal('capek. tapi ada es teh gratis.', 'besok lebih ringan.');
        },
      },
      {
        say: 'Begitu semua sudah menyegel, tombol buka bersama muncul di halaman lingkaran.',
        run: async (h) => {
          await h.go(`/l/${S.circleId}`);
          await sleep(800);
          await h.tap(':is(a,button):has-text("buka hari ini bersama")');
          await sleep(2600);
        },
      },
      {
        say: 'Halaman kalian dibuka berdampingan. Geser untuk melihat halaman masing-masing, lalu kirim pelukan atau tanggapan kecil.',
        cap: 'Halaman dibuka berdampingan. Kirim pelukan atau tanggapan kecil.',
        run: async (h) => {
          await h.tap(h.$('.pager-tabs button').nth(1));
          await sleep(1800);
          await h.tap(h.$('.pager-tabs button').nth(0));
          await sleep(900);
          await h.tap('button:has-text("peluk")').catch(() => {});
        },
      },
      {
        say: 'Setiap hari yang disegel bersama menambah nyala api kalian. Kalau terlewat sehari, tidak apa-apa: Sehari tidak pernah menghukum.',
        run: async (h) => {
          await h.scroll(500);
          await sleep(1000);
          await h.scroll(-500);
        },
      },
    ],
  },
  {
    id: 'cerita',
    short: 'cerita',
    kicker: 'BAB 5',
    title: 'Cerita lingkaran',
    sub: 'Papan, langit, kitab, lemari, dadu, ekspedisi, kamus, puisi, wrap.',
    hand: 'hari-hari jadi cerita',
    intro: 'Hari-hari yang kalian kumpulkan pelan-pelan berubah menjadi cerita. Ini ruang-ruang kecil di setiap lingkaran.',
    steps: [
      { say: 'Papan Tahun menggambar setahun sebagai jalan berliku. Setiap hari yang disegel bersama menumbuhkan tanaman di petaknya.', run: async (h) => { await h.go(`/l/${S.circleId}/papan`); await sleep(1500); await h.scroll(600, 20); } },
      { say: 'Di Langit Lingkaran, setiap hari bersama menjadi bintang. Hari-hari penting bisa dihubungkan menjadi rasi dan diberi nama.', run: async (h) => { await h.go(`/l/${S.circleId}/langit`); await sleep(1500); await h.scroll(400); } },
      { say: 'Kitab berisi bab per bulan. Di akhir bulan, kalian memilih judul bab bersama, dan setahun bisa dicetak menjadi buku.', run: async (h) => { await h.go(`/l/${S.circleId}/kitab`); await sleep(1500); await h.scroll(500, 20); } },
      { say: 'Lemari Benda menyimpan token kenangan, dan Dadu Kenangan membuka satu hari acak dari masa lalu setiap minggu.', run: async (h) => { await h.go(`/l/${S.circleId}/lemari`); await sleep(2200); await h.go(`/l/${S.circleId}/dadu`); await sleep(1500); } },
      { say: 'Ada juga Ekspedisi tujuh hari, Kamus bahasa kalian sendiri, dan Puisi Temuan dari kata-kata yang kalian tulis minggu ini.', run: async (h) => { await h.go(`/l/${S.circleId}/ekspedisi`); await sleep(1800); await h.go(`/l/${S.circleId}/kamus`); await sleep(1600); await h.go(`/l/${S.circleId}/puisi`); await sleep(1200); await h.tap(h.$('.puisi-word, .word').nth(2)).catch(() => {}); } },
      { say: 'Dan setiap minggu, bulan, dan tahun, ada Wrap: rangkuman hari-hari kalian yang diputar seperti story.', run: async (h) => { const d = new Date(); const onejan = new Date(d.getFullYear(), 0, 1); const wk = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7); await h.go(`/l/${S.circleId}`); await h.scroll(1400, 20); await h.tap('a:has-text("minggu kita")').catch(() => {}); await sleep(3500); void wk; } },
    ],
  },
  {
    id: 'surat',
    short: 'surat',
    kicker: 'BAB 6',
    title: 'Surat',
    sub: 'Pesan yang sampai di waktu yang tepat.',
    hand: 'empat jenis amplop',
    intro: 'Surat adalah pesan yang sampai di waktu yang tepat. Ada empat jenis, dan semuanya terenkripsi.',
    setup: async () => {
      await S.b.whenLetter('Kalau kamu membaca ini, berarti kamu lagi kangen. Aku juga. Telepon aku, ya, jam berapa pun.', 'kamu kangen aku');
    },
    steps: [
      {
        say: 'Surat Buka Kalau langsung sampai, tapi baru dibuka saat momennya tiba: kalau dia sedih, kangen, atau tidak bisa tidur.',
        cap: 'Surat “Buka Kalau…”: langsung sampai, dibuka saat momennya tiba.',
        run: async (h) => {
          await h.go('/surat/tulis');
          await sleep(900);
          await h.tap('[data-testid=kind-when]');
          await sleep(900);
        },
      },
      {
        say: 'Pilih momennya, tulis suratnya, lalu titipkan.',
        run: async (h) => {
          await h.tap('.pill:has-text("kamu tidak bisa tidur")');
          await h.type('[data-testid=letter-text]', 'Kalau kamu membaca ini jam tiga pagi: tarik napas pelan. Besok kita sarapan bubur, ya.', 22);
          await h.tap('[data-testid=letter-send]');
        },
      },
      {
        say: 'Di kotak surat, amplop seperti ini menunggu di rak tersendiri. Penerima memutuskan sendiri kapan membukanya, dan pengirim akan tahu saat amplopnya dibuka.',
        cap: 'Amplop menunggu di rak. Pengirim tahu saat amplopnya dibuka.',
        run: async (h) => {
          await h.go('/surat');
          await sleep(1200);
          await h.tap('.when-env');
          await sleep(1600);
          await h.tap('[data-testid=when-open]');
          await sleep(2500);
        },
      },
      {
        say: 'Surat Tersesat sampai di waktu acak, satu sampai dua belas bulan lagi. Surat untuk Nanti adalah kapsul waktu yang dibuka di tanggal pilihanmu.',
        run: async (h) => {
          await h.go('/surat/tulis');
          await sleep(800);
          await h.point('[data-testid=kind-lost]');
          await sleep(1500);
          await h.tap('[data-testid=kind-future]');
          await sleep(900);
          await h.scroll(300);
        },
      },
      {
        say: 'Dan Surat Petak Istimewa baru terbuka saat lingkaran kalian mencapai hari ketujuh, ketiga puluh, keseratus, atau setahun.',
        run: async (h) => {
          await h.go('/surat/tulis');
          await sleep(800);
          await h.tap('[data-testid=kind-milestone]');
          await sleep(1000);
          await h.scroll(300);
        },
      },
    ],
  },
  {
    id: 'karya',
    short: 'karya',
    kicker: 'BAB 7',
    title: 'Karya',
    sub: 'Esai, cerpen, puisi, dan jurnal pribadi.',
    hand: 'ruang menulis yang tenang',
    intro: 'Selain halaman harian, ada ruang menulis yang lebih tenang untuk esai, cerpen, puisi, dan jurnal pribadi.',
    steps: [
      {
        say: 'Ketuk tulis karya baru, lalu pilih jenisnya.',
        run: async (h) => {
          await h.go('/karya');
          await sleep(800);
          await h.tap('button:has-text("tulis karya baru")');
          await sleep(900);
          await h.tap('.kind-card:has-text("esai pribadi")');
        },
      },
      {
        say: 'Ruang tulisnya bersih dan lapang. Tersimpan otomatis, dan terenkripsi seperti semua isi Sehari.',
        run: async (h) => {
          await h.app.waitForSelector('.write-body');
          await h.type('.write-title', 'Sendok yang Selalu Ikut Pindah', 40);
          await h.tap('.write-body');
          await h.page.keyboard.type('Setiap kali pindah, aku selalu membawa benda yang sama: sebuah sendok yang tidak pernah kupakai.\n\nIbu menyelipkannya di koper pertama, katanya supaya aku ingat makan.', { delay: 16 });
        },
      },
      {
        say: 'Terbitkan untuk dirimu sendiri atau untuk lingkaran. Pembaca bisa memberi tanda dan catatan kecil di bawahnya.',
        run: async (h) => {
          await h.app.waitForSelector('.write-status:has-text("✓")', { timeout: 15000 }).catch(() => {});
          await h.tap('.write-top button:has-text("terbitkan")');
          await sleep(700);
          await h.tap(h.$('.reader-opt').nth(1));
          await sleep(500);
          await h.tap('.sheet button:has-text("terbitkan")');
          await h.app.waitForURL(/\/karya\/w[^/]+$/, { timeout: 15000 });
          await sleep(1500);
          await h.scroll(500, 20);
        },
      },
      {
        say: 'Semua karya tersusun di rak, lengkap dengan sampul yang dibuat otomatis.',
        run: async (h) => {
          await h.go('/karya');
          await sleep(1500);
          await h.scroll(300);
        },
      },
    ],
  },
  {
    id: 'janji',
    short: 'janji',
    kicker: 'BAB 8',
    title: 'Janji temu',
    sub: 'Rencanakan kencan atau kumpul, lalu abadikan.',
    hand: 'ayo ketemu',
    intro: 'Janji Temu membantu kalian merencanakan kencan atau kumpul, sampai mengabadikannya setelahnya.',
    steps: [
      {
        say: 'Bingung mau ke mana? Putar mesin ini. Ada ratusan ide tempat, kegiatan, makanan, misi kecil, sampai dresscode.',
        cap: '“Bingung mau ke mana?” Putar, kunci yang pas, putar lagi.',
        run: async (h) => {
          await h.go('/janji/acak');
          await sleep(800);
          await h.tap('.pill:has-text("hemat")');
          await h.tap('.spin-btn');
          await sleep(2800);
          await h.tap(h.$('.reel-lock').first());
          await h.tap('.spin-btn');
          await sleep(2600);
        },
      },
      {
        say: 'Kalau sudah pas, jadikan rencana. Pilih waktunya, beri judul, lalu kirim ajakan.',
        run: async (h) => {
          await h.tap('button:has-text("jadikan rencana")');
          await h.app.waitForSelector('.plan-form');
          const soon = new Date(Date.now() + 40 * 60 * 1000);
          const pad = (n) => String(n).padStart(2, '0');
          await h.fill('input[type=datetime-local]', `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`);
          await h.type('.plan-title', 'Malam Minggu Hemat', 40);
          await h.tap('button:has-text("kirim ajakan")');
        },
      },
      {
        say: 'Kalian langsung mendapat struk estetik yang bisa disimpan atau dibagikan.',
        run: async (h) => {
          await h.app.waitForSelector('.receipt canvas.printed', { timeout: 15000 });
          S.meetId = h.app.url().split('/janji/')[1].split('?')[0];
          await sleep(2200);
          await h.page.keyboard.press('Escape');
        },
      },
      {
        say: 'Tulis harapan rahasia. Harapan semua orang baru terbuka setelah kalian bertemu.',
        run: async (h) => {
          await h.tap('button:has-text("tulis harapan")');
          await h.type('.sheet textarea', 'semoga kita ketawa sampai sakit perut.', 30);
          await h.tap('.sheet button:has-text("segel harapan")');
          await S.b.joinMeet(S.meetId);
        },
      },
      {
        say: 'Saat sudah di tempat, kalian bisa saling menandai: kita ketemu. Tidak wajib, tapi rasanya seperti mengecap stempel bersama.',
        cap: 'Di tempat? Saling tandai “kita ketemu”.',
        run: async (h) => {
          await h.go(`/janji/${S.meetId}`);
          await sleep(800);
          await h.tap('button:has-text("kita ketemu ✓")');
          await h.app.waitForSelector('.stamp-big', { timeout: 10000 });
          await sleep(1500);
        },
      },
      {
        say: 'Setelahnya, tulis cerita, beri nilai, dan tambahkan foto. Semuanya tersimpan menjadi kenangan kencan kalian.',
        run: async (h) => {
          await h.tap('button:has-text("tulis cerita")');
          await h.type('.sheet input[placeholder^="judul"]', 'Hujan, Martabak, dan Payung Satu', 26);
          await h.tap(h.$('.heart-btn').nth(4));
          await h.type('.sheet textarea', 'Kamu telat sepuluh menit, tapi bawa martabak. Jadi impas.', 24);
          await h.tap('.sheet button:has-text("simpan cerita")');
          await sleep(800);
          await h.app.setInputFiles('.janji-detail input[type=file]', 'e2e/tutorial/assets/senja.jpg');
          await h.app.waitForSelector('.memory-polaroid img', { timeout: 15000 }).catch(() => {});
          await h.scroll(900, 20);
        },
      },
    ],
  },
  {
    id: 'mimpi',
    short: 'mimpi',
    kicker: 'BAB 9',
    title: 'Daftar mimpi bersama',
    sub: 'Bucket list kalian: tulis, jadikan janji, wujudkan.',
    hand: 'suatu hari nanti',
    intro: 'Daftar Mimpi Bersama adalah bucket list kalian: hal-hal yang ingin dilakukan bersama, besar maupun kecil.',
    steps: [
      {
        say: 'Tambah mimpi dan pilih jenisnya. Kalau bingung, ketuk butuh ide.',
        run: async (h) => {
          await h.go(`/l/${S.circleId}/mimpi`);
          await sleep(900);
          await h.tap('[data-testid=dream-add]');
          await sleep(500);
          await h.tap('.sheet button:has-text("butuh ide?")');
          await sleep(900);
          await h.tap('.sheet button:has-text("butuh ide?")');
          await sleep(900);
          await h.tap('[data-testid=dream-save]');
        },
      },
      {
        say: 'Yang lain bisa menandai aku juga mau, dan mimpi yang paling diinginkan naik ke atas.',
        run: async (h) => {
          for (const t of ['Melihat matahari terbit dari puncak gunung', 'Hujan-hujanan dengan sengaja']) {
            await h.tap('[data-testid=dream-add]');
            await h.fill('[data-testid=dream-title]', t);
            await h.tap('[data-testid=dream-save]');
            await sleep(600);
          }
          await S.b.likeAll(S.circleId);
          await h.app.evaluate(() => location.reload());
          await sleep(1800);
        },
      },
      {
        say: 'Satu ketukan menjadikannya janji temu. Setelah terwujud, mimpi itu menjadi bintang di toples kalian.',
        cap: 'Jadikan janji temu, lalu tandai terwujud. Toplesnya terisi bintang.',
        run: async (h) => {
          await h.tap(h.$('.mimpi-main').first());
          await sleep(700);
          await h.point('.sheet button:has-text("jadikan janji temu")');
          await sleep(900);
          await h.tap('[data-testid=dream-done]');
          await sleep(2500);
        },
      },
    ],
  },
  {
    id: 'kartu',
    short: 'kartu',
    kicker: 'BAB 10',
    title: 'Kartu ucapan',
    sub: 'Tulis, hias, unduh, kirim ke WhatsApp.',
    hand: 'tanpa alasan pun boleh',
    intro: 'Kartu ucapan untuk ulang tahun, minta maaf, atau tanpa alasan sama sekali. Buat, unduh, lalu kirim lewat WhatsApp.',
    steps: [
      {
        say: 'Pilih momennya, dan Sehari memberi contoh kalimat. Ketuk contoh lain untuk ide berikutnya.',
        run: async (h) => {
          await h.go('/kartu');
          await sleep(900);
          await h.scroll(700);
          await h.tap('.chip-row .pill:has-text("ulang tahun")');
          await sleep(600);
          await h.tap('button:has-text("contoh lain")');
          await sleep(500);
          await h.type('input[placeholder^="untuk siapa"]', 'Bima', 60);
          await h.top();
        },
      },
      {
        say: 'Ada sembilan belas desain: surat berlilin, polaroid, koran, kaset, boarding pass, sampai notifikasi HP.',
        run: async (h) => {
          for (const n of ['koran', 'kaset', 'boarding pass', 'senja retro', 'notifikasi']) {
            await h.tap(`.design-chip:has-text("${n}")`);
            await sleep(900);
          }
        },
      },
      {
        say: 'Tambahkan foto, pilih warna tinta dan doodle, lalu ketuk kirim ke WhatsApp, atau unduh gambarnya.',
        run: async (h) => {
          await h.tap('.design-chip:has-text("polaroid")');
          await h.app.setInputFiles('.kartu input[type=file]', 'e2e/tutorial/assets/senja.jpg');
          await sleep(1500);
          await h.top();
          await h.point('.btn.wa');
          await sleep(800);
        },
      },
    ],
  },
  {
    id: 'tentang',
    short: 'tentang kita',
    kicker: 'BAB 11',
    title: 'Tentang Kita',
    sub: '581 kartu ngobrol yang tidak kacangan.',
    hand: 'ayo ngobrol yang dalam',
    intro: 'Tentang Kita adalah permainan kartu ngobrol dengan lebih dari lima ratus delapan puluh pertanyaan yang tidak kacangan.',
    steps: [
      {
        say: 'Pilih main dengan siapa: pasangan, PDKT, sahabat, atau sendirian. Lalu pilih seberapa dalam obrolannya.',
        run: async (h) => {
          await h.go('/tentang-kita');
          await sleep(1200);
          await h.tap('.tk-rel:has-text("pdkt")');
          await sleep(500);
          await h.tap('.tk-rel:has-text("pasangan")');
          await h.scroll(500);
        },
      },
      {
        say: 'Ada kartu tanya, cermin, tebak, dilema, kartu liar, dan Renung: pertanyaan filosofis tentang semesta dan kesadaran.',
        run: async (h) => {
          await h.scroll(500);
          await sleep(1500);
          await h.tap(h.$('.seg button').filter({ hasText: /^12$/ }));
          await h.tap('.tk-start');
        },
      },
      {
        say: 'Jawab bergiliran. Ketuk gali lagi untuk pertanyaan lanjutan yang membuat obrolan makin dalam.',
        run: async (h) => {
          await sleep(1500);
          await h.tap('.tk-extra .pill');
          await sleep(1800);
          await h.tap('.tk-bar .btn.grow');
        },
      },
      {
        say: 'Kartu Renung bisa dijawab spontan, atau diriset dulu: masing-masing mencari dengan kata kunci, lalu kembali dan membandingkan siapa yang paling berubah pikiran.',
        cap: 'Renung: jawab spontan, atau riset dulu dengan timer dan kata kunci.',
        run: async (h) => {
          for (let i = 0; i < 10 && !(await h.$('.tk-card.k-renung').count()); i++) {
            await h.tap('.tk-bar .btn.grow');
            await sleep(500);
          }
          await sleep(800);
          await h.tap('.tk-renung button:has-text("riset dulu")').catch(() => {});
          await sleep(1200);
          await h.scroll(300);
        },
      },
      {
        say: 'Di akhir permainan, tulis satu kalimat penutup, dan jadikan kartu ucapan untuk dikirim.',
        run: async (h) => {
          for (let i = 0; i < 14 && !(await h.$('text=obrolan selesai').count()); i++) {
            await h.app.locator('.tk-bar .btn.grow').click().catch(() => {});
            await sleep(250);
          }
          await sleep(1200);
          await h.type('textarea', 'Malam ini aku jadi tahu kamu takut ditinggal. Aku tidak ke mana-mana.', 22);
          await h.tap('button:has-text("jadikan kartu ucapan")');
          await sleep(1800);
        },
      },
    ],
  },
  {
    id: 'kenangan',
    short: 'kenangan',
    kicker: 'BAB 12',
    title: 'Kenangan',
    sub: 'Semua yang pernah kalian tulis, rapi dan mudah ditemukan.',
    hand: 'hari ini, tahun lalu',
    intro: 'Kenangan menyimpan semua yang pernah kalian tulis, rapi dan mudah ditemukan.',
    steps: [
      { say: 'Taman tahunan memperlihatkan hari-hari yang kamu isi. Ada juga hari ini di tahun-tahun lalu, dan semua surat yang pernah sampai.', run: async (h) => { await h.go('/kenangan'); await sleep(1500); await h.scroll(500, 20); } },
      { say: 'Kitab lingkaran bisa dicetak menjadi buku Tahun Kita, dan jurnal pribadi menyimpan halaman yang hanya untukmu.', run: async (h) => { await h.scroll(700, 20); await sleep(1000); } },
    ],
  },
  {
    id: 'aku',
    short: 'aku',
    kicker: 'BAB 13',
    title: 'Aku & pengaturan',
    sub: 'Profil, tema, suara, keamanan, dan privasi.',
    hand: 'jadikan milikmu',
    intro: 'Terakhir, halaman Aku: tempat mengatur Sehari supaya terasa milikmu.',
    steps: [
      { say: 'Pasang foto profil, atau pilih doodle avatar dengan warna latarnya.', run: async (h) => { await h.go('/aku/profil'); await sleep(900); await h.tap(h.$('.avatar-grid button').nth(5)); await h.tap(h.$('.bg-dot').nth(2)); await sleep(600); } },
      { say: 'Pilih tema warna. Bawaannya putih dan biru, tapi ada banyak pilihan lain, termasuk mode gelap.', run: async (h) => { await h.go('/aku/tema'); await sleep(900); await h.tap(h.$('.swatch').nth(3)); await sleep(1200); await h.tap(h.$('.swatch').nth(0)); await h.scroll(400); } },
      { say: 'Nyalakan musik latar yang melankolis, efek suara tipis, dan suara mengetik. Semuanya dibangkitkan langsung di perangkatmu.', run: async (h) => { await h.go('/aku'); await sleep(800); await h.scroll(900, 20); await h.tap('label:has-text("efek suara") [role=switch]').catch(() => {}); await sleep(800); } },
      { say: 'Di keamanan dan privasi, kamu bisa melihat kode pemulihan, menautkan perangkat baru, mengekspor data, atau menghapus akun.', run: async (h) => { await h.go('/aku/keamanan'); await sleep(1600); await h.go('/aku/privasi'); await sleep(1200); await h.scroll(400); } },
      { say: 'Sehari juga bisa dipasang di layar utama HP seperti aplikasi biasa: buka menu peramban, lalu pilih tambahkan ke layar utama.', run: async (h) => { await h.go('/hari'); await sleep(1000); } },
    ],
  },
  {
    id: 'penutup',
    short: 'penutup',
    kicker: 'SEHARI',
    title: 'Selamat menulis',
    sub: 'Satu foto, satu kalimat, satu warna. Setiap hari.',
    hand: 'sampai jumpa di halaman berikutnya',
    intro: 'Itu dia Sehari. Satu foto, satu kalimat, satu warna, setiap hari. Pelan-pelan, hari-hari kecil itu menjadi cerita kalian. Selamat menulis.',
    steps: [],
  },
];

export { S, APP };
