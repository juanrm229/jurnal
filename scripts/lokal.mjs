// Jalankan Sehari di komputer sendiri: satu perintah, satu alamat.
//   npm run lokal            → bangun web app (sekali) lalu nyalakan server di http://localhost:8787
//   npm run lokal -- --build → paksa bangun ulang web app
// Data tersimpan di apps/server/data (tidak hilang saat dimatikan).
// Opsional: buat file .env di folder ini berisi BREVO_API_KEY & EMAIL_FROM supaya kode masuk dikirim lewat email.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 11)) {
  console.error(`Node.js ${process.versions.node} terlalu lama. Pasang Node.js 22 LTS dari https://nodejs.org lalu coba lagi.`);
  process.exit(1);
}
const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'apps/web/dist');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Hanya paket web app + server (aplikasi Expo tidak ikut — jauh lebih kecil & cepat).
const stamp = path.join(root, 'node_modules/.sehari-lokal');
const lockTime = existsSync(stamp) ? readFileSync(stamp, 'utf8') : '';
const lock = readFileSync(path.join(root, 'package-lock.json'), 'utf8').length.toString();
if (lockTime !== lock) {
  console.log('📦 memasang paket (sekali saja, butuh internet)…');
  const args = ['install', '--workspace', '@sehari/server', '--workspace', '@sehari/web', '--include-workspace-root', '--no-audit', '--no-fund'];
  const npmEnv = { ...process.env, npm_config_fetch_retries: '6', npm_config_fetch_retry_mintimeout: '5000', npm_config_fetch_retry_maxtimeout: '120000' };
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    if (attempt > 1) console.log(`\n🔁 koneksi terputus, mencoba lagi (${attempt}/3)…`);
    ok = spawnSync(npm, args, { cwd: root, stdio: 'inherit', env: npmEnv, shell: process.platform === 'win32' }).status === 0;
  }
  if (!ok) {
    console.error('\nGagal memasang paket. Biasanya karena internet putus-putus — jalankan `npm run lokal` sekali lagi.');
    process.exit(1);
  }
  writeFileSync(stamp, lock);
}
if (process.argv.includes('--build') || !existsSync(path.join(dist, 'index.html'))) {
  console.log('🛠  membangun web app…');
  if (spawnSync(npm, ['run', 'build', '-w', '@sehari/web'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }).status !== 0) process.exit(1);
}

// .env sederhana: KUNCI=nilai per baris.
const fileEnv = {};
const envFile = path.join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#')) fileEnv[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const port = fileEnv.PORT ?? process.env.PORT ?? '8787';
const env = {
  ...process.env,
  PORT: port,
  WEB_DIST: dist,
  FREE_ALL: '1',
  BLOB_STORE: 'db',
  APP_URL: `http://localhost:${port}`,
  PUBLIC_URL: `http://localhost:${port}`,
  DATA_DIR: path.join(root, 'apps/server/data/pglite'),
  // Tanpa email: kode masuk tampil di layar & di terminal ini.
  DEV_AUTH: fileEnv.BREVO_API_KEY || fileEnv.SMTP_HOST ? '0' : '1',
  ...fileEnv,
};

const lan = Object.values(networkInterfaces())
  .flat()
  .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;

const server = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], { cwd: path.join(root, 'apps/server'), env, stdio: ['inherit', 'pipe', 'inherit'] });
let shown = false;
server.stdout.on('data', (b) => {
  process.stdout.write(b);
  if (!shown && String(b).includes('Sehari server')) {
    shown = true;
    console.log(`\n✨ Buka di laptop:   http://localhost:${port}`);
    if (lan) console.log(`📱 HP di Wi-Fi yang sama: http://${lan}:${port}`);
    console.log(env.DEV_AUTH === '1' ? '🔑 Kode masuk tampil di layar masuk (mode lokal, tanpa email).' : '✉️  Kode masuk dikirim lewat email.');
    console.log('   Tekan Ctrl+C untuk berhenti.\n');
  }
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig));
server.on('exit', (code) => process.exit(code ?? 0));
