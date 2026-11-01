/**
 * Setelah deploy baru, potongan JS versi lama hilang dari server. Tab yang masih
 * memegang versi lama akan gagal memuat halaman dan layarnya kosong. Muat ulang
 * sekali (paling sering tiap 30 detik, supaya tidak berputar terus) agar memakai versi baru.
 */
const KEY = 'sehari:reload-at';

export function isChunkError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e);
  return /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch|Unable to preload|ChunkLoadError|is not a valid JavaScript MIME type|Unexpected token '<'/i.test(msg);
}

export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sessionStorage bisa tidak ada (mode privat lama); tetap coba sekali.
  }
  location.reload();
  return true;
}
