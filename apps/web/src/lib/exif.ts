/**
 * Membaca tanggal foto diambil dari EXIF JPEG (DateTimeOriginal, lalu DateTime)
 * tanpa pustaka tambahan. Hanya membaca beberapa puluh KB awal berkas.
 */

/** "YYYY-MM-DD" dari EXIF, atau null bila tidak ada / bukan JPEG. */
export async function exifDay(file: Blob): Promise<string | null> {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    return parseExifDay(new DataView(buf));
  } catch {
    return null;
  }
}

export function parseExifDay(v: DataView): string | null {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    const marker = v.getUint16(off);
    if ((marker & 0xff00) !== 0xff00) return null;
    const size = v.getUint16(off + 2);
    if (marker === 0xffe1 && off + 10 <= v.byteLength && v.getUint32(off + 4) === 0x45786966 /* "Exif" */) {
      return readTiff(v, off + 10);
    }
    if (marker === 0xffda) return null; // awal data gambar: tidak ada EXIF
    off += 2 + size;
  }
  return null;
}

function readTiff(v: DataView, start: number): string | null {
  const little = v.getUint16(start) === 0x4949;
  const u16 = (o: number) => v.getUint16(start + o, little);
  const u32 = (o: number) => v.getUint32(start + o, little);
  if (u16(2) !== 42) return null;
  const ascii = (o: number, n: number) => {
    let s = '';
    for (let i = 0; i < n && start + o + i < v.byteLength; i++) {
      const c = v.getUint8(start + o + i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  const readIfd = (ifd: number) => {
    const out = new Map<number, string | number>();
    if (start + ifd + 2 > v.byteLength) return out;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (start + e + 12 > v.byteLength) break;
      const tag = u16(e);
      const type = u16(e + 2);
      const count = u32(e + 4);
      if (type === 2) out.set(tag, ascii(count > 4 ? u32(e + 8) : e + 8, count));
      else if (type === 4) out.set(tag, u32(e + 8));
    }
    return out;
  };
  const ifd0 = readIfd(u32(4));
  const exifPtr = ifd0.get(0x8769);
  const exif = typeof exifPtr === 'number' ? readIfd(exifPtr) : new Map();
  const raw = (exif.get(0x9003) ?? exif.get(0x9004) ?? ifd0.get(0x0132)) as string | undefined;
  const m = raw && /^(\d{4}):(\d{2}):(\d{2})/.exec(raw);
  if (!m || m[1] === '0000') return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}
