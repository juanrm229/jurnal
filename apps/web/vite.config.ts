import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const br = promisify(brotliCompress);
const gz = promisify(gzip);

/**
 * Pra-kompres berkas teks hasil build (.br + .gz) supaya server tinggal
 * mengirimkannya: JS/CSS turun ~70% tanpa beban CPU saat permintaan datang.
 */
function precompress(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sehari-precompress',
    apply: 'build',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    async closeBundle() {
      const walk = async (dir: string): Promise<string[]> => {
        const out: string[] = [];
        for (const e of await readdir(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) out.push(...(await walk(p)));
          else if (/\.(js|mjs|css|html|svg|json|webmanifest|txt)$/.test(e.name)) out.push(p);
        }
        return out;
      };
      const files = await walk(outDir);
      await Promise.all(
        files.map(async (f) => {
          if ((await stat(f)).size < 1024) return;
          const buf = await readFile(f);
          const [b, g] = await Promise.all([
            br(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }),
            gz(buf, { level: 9 }),
          ]);
          if (b.length < buf.length * 0.95) await writeFile(`${f}.br`, b);
          if (g.length < buf.length * 0.95) await writeFile(`${f}.gz`, g);
        }),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), precompress()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    proxy: { '/v1': 'http://localhost:8787', '^/w/': 'http://localhost:8787', '/cron': 'http://localhost:8787', '/dev': 'http://localhost:8787' },
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1200 },
});
