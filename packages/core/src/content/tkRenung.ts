// Tentang Kita — kartu Renung: pertanyaan filosofis dan tentang semesta.
// Bisa dijawab spontan (dari intuisi) atau diriset dulu. Kata kunci setelah
// `##` adalah titik awal pencarian, bukan jawabannya. Pastikan istilahnya
// benar dan bisa dicari (Wikipedia, ensiklopedia, video sains).
// Format baris: lihat tentangKita.ts.
import type { TkGroup } from './tentangKita';

export const TK_RENUNG: TkGroup[] = [
  {
    prefix: 'ren-semesta',
    kind: 'renung',
    level: 1,
    rel: [],
    theme: 'semesta',
    lines: `
Kenapa langit berwarna biru, dan kenapa senja berwarna jingga? ## hamburan Rayleigh, spektrum cahaya || Kenapa manusia hampir di mana-mana menganggap senja indah?
Kenapa malam gelap, padahal ada miliaran bintang di alam semesta? ## paradoks Olbers, usia alam semesta
Kalau alam semesta berawal dari Big Bang, apa yang ada "sebelum"-nya? Atau pertanyaan itu sendiri keliru? ## Big Bang, waktu Planck, kosmologi
Kalau alam semesta begitu luas, kenapa kita belum pernah bertemu makhluk lain? ## paradoks Fermi, persamaan Drake || Mana yang lebih menakutkan: kita sendirian, atau tidak?
Bintang yang kamu lihat malam ini mungkin sudah mati. Apa rasanya memandang masa lalu? ## kecepatan cahaya, tahun cahaya
Apakah alam semesta punya ujung? ## alam semesta teramati, bentuk alam semesta
Kenapa bulan selalu menunjukkan wajah yang sama ke Bumi? ## penguncian pasang surut, rotasi sinkron
Kenapa kita tidak merasa Bumi berputar sangat cepat? ## inersia, rotasi Bumi, Galileo
Atom di tubuhmu pernah ada di dalam bintang. Apa artinya itu bagimu? ## nukleosintesis bintang, supernova || Apakah itu membuatmu merasa kecil, atau justru besar?
Kalau semua manusia lenyap, berapa lama jejak kita bertahan di Bumi? ## Antroposen, jejak manusia
Kenapa ada sesuatu, bukannya tidak ada apa-apa? ## Leibniz, pertanyaan mengapa ada sesuatu
Apakah matematika ditemukan atau diciptakan manusia? ## Platonisme matematika, filsafat matematika || Kenapa matematika bisa begitu cocok dengan alam?
Kenapa hukum fisika berlaku sama di seluruh alam semesta? ## keseragaman hukum alam, konstanta fisika
Kalau ada alam semesta lain dengan versi dirimu, apakah dia masih kamu? ## multisemesta, interpretasi banyak dunia
Kenapa waktu hanya bergerak maju? ## panah waktu, entropi, hukum kedua termodinamika
Lubang hitam menelan cahaya. Ke mana perginya semua yang masuk ke sana? ## lubang hitam, cakrawala peristiwa, radiasi Hawking
Kenapa langit malam di kota tidak lagi berbintang, dan apa yang hilang dari kita karenanya? ## polusi cahaya, skala Bortle
Apakah alam semesta "peduli" pada kita? Kalau tidak, apakah itu menyedihkan atau membebaskan? ## absurdisme, Camus, kosmisisme
Kenapa planet berbentuk bulat, bukan kotak atau tidak beraturan? ## kesetimbangan hidrostatik, gravitasi
Kalau kita bisa mengirim satu pesan ke peradaban lain, apa isinya? ## Voyager Golden Record, pesan Arecibo
`,
  },
  {
    prefix: 'ren-alam',
    kind: 'renung',
    level: 1,
    rel: [],
    theme: 'alam & tubuh',
    lines: `
Kenapa kita bermimpi? Apakah mimpi punya arti? ## tidur REM, teori mimpi, konsolidasi memori
Kenapa menguap menular, bahkan kadang ke anjing? ## menguap menular, empati, neuron cermin
Kenapa musik bisa membuat kita merinding? ## frisson, dopamin dan musik
Kenapa hujan punya bau yang khas? ## petrikor, geosmin
Kenapa kita tidak bisa menggelitik diri sendiri? ## serebelum, prediksi sensorik
Kenapa air laut asin tapi air sungai tawar? ## salinitas laut, siklus air
Apakah pohon bisa "berkomunikasi" satu sama lain? ## jaringan mikoriza, wood wide web
Kenapa kucing mendengkur, dan apakah itu selalu tanda senang? ## dengkuran kucing, frekuensi dengkur
Kenapa kita menangis saat terlalu bahagia? ## tangisan bahagia, ekspresi dimorfik
Burung bermigrasi ribuan kilometer tanpa peta. Bagaimana caranya? ## navigasi burung, magnetoresepsi
Kenapa kita mudah lupa mimpi setelah bangun? ## amnesia mimpi, norepinefrin
Kenapa daun berubah warna sebelum gugur di negeri empat musim? ## klorofil, karotenoid, antosianin
Apakah hewan punya rasa sedih seperti kita? ## emosi hewan, duka pada hewan, gajah
Kenapa lebah membuat sarang berbentuk segi enam? ## dugaan sarang lebah, efisiensi heksagon
Kenapa suara kita terdengar aneh saat direkam? ## konduksi tulang, persepsi suara diri
`,
  },
  {
    prefix: 'ren-sadar',
    kind: 'renung',
    level: 2,
    rel: [],
    theme: 'kesadaran',
    lines: `
Kenapa kesadaran itu ada? Kenapa kita tidak sekadar "robot" yang berfungsi tanpa merasa? ## masalah sulit kesadaran, David Chalmers, zombie filosofis || Kapan kamu paling merasa sadar?
Apakah warna merah yang kamu lihat sama dengan merah yang dilihat orang lain? ## qualia, spektrum terbalik
Kalau seluruh tubuhmu diganti sel demi sel, apakah kamu masih orang yang sama? ## kapal Theseus, identitas personal
Apakah AI suatu hari bisa benar-benar merasakan sesuatu? Bagaimana kita akan tahu? ## kesadaran mesin, ruang Cina Searle, uji Turing
Apakah kita punya kehendak bebas, atau semua pilihan sudah ditentukan otak sebelum kita sadar? ## kehendak bebas, eksperimen Libet, determinisme
Bagaimana kamu tahu kamu tidak sedang bermimpi sekarang? ## skeptisisme, Descartes, argumen mimpi
Kalau ingatanmu dipindahkan ke tubuh lain, siapa yang sebenarnya "kamu"? ## teori memori identitas, John Locke
Apakah pikiran ada di dalam otak, atau otak hanya "radio" yang menangkapnya? ## masalah pikiran-tubuh, dualisme, fisikalisme
Seberapa banyak dirimu yang benar-benar kamu pilih, dan seberapa banyak yang terbentuk begitu saja? ## nature vs nurture, epigenetika
Kenapa satu menit bisa terasa sangat lama atau sangat cepat? ## persepsi waktu, psikologi waktu
Apakah hewan sadar dirinya ada? Bagaimana kita bisa menguji itu? ## uji cermin, Deklarasi Cambridge tentang Kesadaran
Apakah bahasa yang kamu pakai membentuk cara kamu berpikir? ## hipotesis Sapir-Whorf, relativitas linguistik
Kenapa kita bisa yakin akan sesuatu yang ternyata salah? ## bias konfirmasi, disonansi kognitif
Kalau otakmu bisa dihubungkan ke simulasi yang sempurna dan bahagia, maukah kamu masuk? ## mesin pengalaman Nozick, hedonisme
Apakah kita mungkin hidup di dalam simulasi? ## hipotesis simulasi, Nick Bostrom
Apa bedanya "aku" yang berpikir dan "aku" yang mengamati pikiran itu? ## metakognisi, kesadaran diri, meditasi
Kenapa kita suka cerita, bahkan cerita yang kita tahu tidak nyata? ## psikologi naratif, evolusi cerita
Apakah intuisi itu sejenis pengetahuan, atau tebakan yang kebetulan benar? ## intuisi, sistem 1 dan sistem 2, Kahneman
Bisakah kita benar-benar memahami pengalaman orang lain? ## "Seperti apa rasanya menjadi kelelawar", Thomas Nagel, empati
Kalau kamu kehilangan semua ingatan, apa yang tersisa dari dirimu? ## amnesia, kepribadian dan memori
`,
  },
  {
    prefix: 'ren-waktu',
    kind: 'renung',
    level: 3,
    rel: [],
    theme: 'waktu & kematian',
    lines: `
Kalau hidup abadi tersedia, maukah kamu mengambilnya? Apa yang hilang kalau tidak ada akhir? ## keabadian, Bernard Williams, kasus Makropulos
Apakah masa lalu benar-benar sudah lewat, atau masih "ada" di suatu tempat? ## teori blok alam semesta, eternalisme, presentisme
Kenapa kita takut mati, padahal kita juga tidak ada sebelum lahir dan tidak takut pada itu? ## argumen simetri Lucretius, Epikurus
Apa arti sebuah hidup yang "cukup panjang"?
Apakah kenangan tentang seseorang membuatnya tetap hidup? ## kematian sosial, ingatan kolektif
Kalau kamu tahu hidupmu tinggal setahun, apa yang tetap sama dan apa yang berubah? ## memento mori, Stoikisme
Apakah waktu itu nyata, atau cuma cara otak menata perubahan? ## filsafat waktu, Carlo Rovelli, McTaggart
Bagaimana kamu ingin dikenang: dari apa yang kamu capai, atau dari bagaimana kamu memperlakukan orang?
Kenapa tahun-tahun terasa makin cepat seiring bertambah umur? ## persepsi waktu dan usia, efek kebaruan
Apakah menyesal itu berguna, atau hanya menyakitkan? ## penyesalan, psikologi penyesalan
Kalau bisa melihat masa depanmu sepuluh tahun lagi dalam satu menit, maukah kamu melihat?
Apa yang membuat sebuah momen terasa abadi?
Apakah kita lebih takut kematian kita sendiri, atau kematian orang yang kita cintai? Kenapa?
Kalau setiap pilihan yang tidak kamu ambil menciptakan hidup lain, hidup mana yang paling ingin kamu intip?
Apa yang ingin kamu tinggalkan di dunia saat kamu pergi?
`,
  },
  {
    prefix: 'ren-moral',
    kind: 'renung',
    level: 2,
    rel: [],
    theme: 'baik & adil',
    lines: `
Kereta akan menabrak lima orang. Kamu bisa membelokkannya sehingga menabrak satu orang. Kamu belokkan? ## masalah troli, utilitarianisme, Philippa Foot || Bagaimana kalau satu orang itu kamu kenal?
Apakah orang baik yang lahir di zaman yang salah tetap orang baik? ## relativisme moral, keberuntungan moral
Kalau tidak ada yang melihat dan tidak ada akibatnya, apakah kamu masih jujur? ## cincin Gyges, Plato
Apakah membantu orang lain selalu tindakan tanpa pamrih, atau kita juga mencari rasa senang? ## altruisme, egoisme psikologis
Siapa yang lebih bersalah: orang yang berbuat jahat, atau orang yang diam melihatnya? ## efek pengamat, tanggung jawab moral
Apakah adil kalau orang kaya bisa membeli kesempatan yang tidak dimiliki orang miskin? ## keadilan distributif, John Rawls, tabir ketidaktahuan
Kalau kamu bisa menyelamatkan satu nyawa dengan menyumbang uang jajan sebulan, apakah kamu wajib melakukannya? ## Peter Singer, anak tenggelam, altruisme efektif
Apakah boleh makan daging kalau kita bisa hidup tanpa itu? ## etika hewan, kesejahteraan hewan
Apakah kebaikan itu bawaan, atau diajarkan? ## Mencius dan Xunzi, psikologi moral
Kalau semua orang melakukan hal yang sama denganmu, dunia jadi lebih baik atau buruk? ## imperatif kategoris Kant
Apakah hukum selalu sama dengan keadilan? Kapan melanggar hukum menjadi benar? ## pembangkangan sipil, Thoreau
Apakah kita bertanggung jawab atas akibat yang tidak kita sengaja? ## niat dan akibat, etika konsekuensialis
Seberapa banyak kita berutang pada generasi yang belum lahir? ## etika antargenerasi, keadilan iklim
Apakah memaafkan berarti melupakan? ## pengampunan, filsafat memaafkan
Apakah orang jahat bisa melakukan hal yang sangat baik, dan apakah itu menghapus kejahatannya?
Apakah boleh berbohong untuk menyelamatkan seseorang? ## pembunuh di pintu, Kant tentang berbohong
Apa yang membuat sesuatu "milik" seseorang? ## teori kepemilikan, John Locke tentang hak milik
Apakah sebuah kebiasaan menjadi benar hanya karena semua orang melakukannya? ## relativisme budaya, argumentum ad populum
Apakah kita bisa disebut bebas kalau pilihan kita sudah diarahkan algoritma? ## otonomi, ekonomi perhatian, algoritma rekomendasi
Kalau kamu bisa menghapus semua penderitaan dari dunia, tapi juga semua rasa sakit yang membuat kita tumbuh, apakah kamu melakukannya? ## masalah kejahatan, teodisi
`,
  },
  {
    prefix: 'ren-makna',
    kind: 'renung',
    level: 3,
    rel: [],
    theme: 'makna',
    lines: `
Apakah hidup punya makna bawaan, atau kita yang harus menciptakannya? ## eksistensialisme, Sartre, Viktor Frankl || Apa makna yang sedang kamu ciptakan sekarang?
Apa bedanya bahagia dan puas? Mana yang lebih kamu kejar? ## hedonia dan eudaimonia, Aristoteles
Sisifus mendorong batu ke puncak, lalu batu jatuh lagi, selamanya. Bisakah ia bahagia? ## mitos Sisifus, Albert Camus
Kalau tidak ada yang melihat hidupmu sama sekali, apakah hidupmu tetap berarti?
Apakah penderitaan bisa memberi makna, atau kita hanya mencari pembenaran? ## Viktor Frankl, logoterapi
Apa yang membuat sebuah pekerjaan terasa bermakna? ## ikigai, makna kerja
Apakah kita lebih bahagia kalau punya lebih sedikit pilihan? ## paradoks pilihan, Barry Schwartz
Apakah cinta itu pilihan, perasaan, atau reaksi kimia, dan apakah jawabannya penting? ## neurokimia cinta, oksitosin, Erich Fromm
Kenapa manusia di semua budaya menciptakan ritual? ## antropologi ritual, Durkheim
Kalau kamu bisa hidup tanpa rasa takut sama sekali, apakah kamu masih kamu? ## fungsi emosi, rasa takut
Apa yang lebih penting: menjadi baik, atau merasa baik? ## etika kebajikan, Aristoteles
Apakah kesederhanaan itu jalan menuju bahagia, atau hanya romantisasi? ## Stoikisme, minimalisme, Diogenes
Kenapa kita begitu butuh diakui orang lain? ## kebutuhan akan pengakuan, Hegel, hierarki Maslow
Apa yang membuat sebuah rumah terasa seperti "rumah"?
Kalau kamu harus memilih satu nilai untuk hidupmu, apa, dan apa yang rela kamu korbankan demi itu?
`,
  },
  {
    prefix: 'ren-dunia',
    kind: 'renung',
    level: 2,
    rel: [],
    theme: 'bahasa, seni & teknologi',
    lines: `
Kenapa sesuatu yang indah terasa indah? Apakah keindahan ada di benda itu, atau di mata yang melihat? ## estetika, Kant tentang keindahan
Apa yang membuat lelucon jadi lucu? ## teori humor, teori ketidaksesuaian
Apakah karya yang dibuat AI bisa disebut seni? ## seni AI, definisi seni, Arthur Danto || Apa yang hilang, kalau ada?
Kenapa ada kata-kata yang tidak bisa diterjemahkan? ## kata tak terjemahkan, relativitas linguistik
Apakah internet membuat kita lebih dekat atau lebih kesepian? ## paradoks internet, Sherry Turkle, Alone Together
Kalau semua buku di dunia hilang kecuali satu, buku apa yang harus disimpan?
Apakah sejarah ditulis oleh pemenang? ## historiografi, sejarah lisan
Kenapa kita suka lagu sedih ketika sedang sedih? ## paradoks musik sedih, katarsis
Apakah teknologi netral, atau selalu membawa nilai penciptanya? ## filsafat teknologi, Langdon Winner
Apakah kita masih bisa disebut manusia kalau sebagian tubuh dan otak kita adalah mesin? ## transhumanisme, sibernetika
Kenapa uang bernilai, padahal hanya kertas atau angka? ## uang fiat, kepercayaan, Yuval Noah Harari
Kalau bahasa daerah punah, apa yang ikut hilang? ## kepunahan bahasa, bahasa daerah Indonesia
Apakah privasi masih mungkin di zaman sekarang? Seberapa penting bagimu? ## privasi digital, kapitalisme pengawasan
Kenapa manusia bisa sangat kejam dan sangat baik dalam satu sejarah yang sama? ## banalitas kejahatan, Hannah Arendt
Apakah sains bisa menjawab semua pertanyaan, atau ada yang tetap di luar jangkauannya? ## batas sains, saintisme, Karl Popper
`,
  },
];
