/** Kode QR sebagai SVG. Dipisah dari art.tsx supaya pustakanya tidak ikut bundel awal. */
import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

export function QR({ value, size = 220 }: { value: string; size?: number }) {
  const path = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(value);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    return { d, n };
  }, [value]);
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${path.n + 4} ${path.n + 4}`} style={{ background: 'var(--card)', borderRadius: 12 }} role="img" aria-label="kode QR">
      <path d={path.d} fill="var(--ink)" />
    </svg>
  );
}
