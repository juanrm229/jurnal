/** FNV-1a 32-bit, lalu di-"aduk" (fmix32) agar bit rendah tersebar rata. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // fmix32 (MurmurHash3) — tanggal berurutan ('2026-01-01', '2026-01-02') jadi tidak mengelompok.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
