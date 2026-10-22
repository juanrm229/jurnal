/** Potongan kecil untuk dok bawah halaman jurnal. */
import { useEffect, useState } from 'react';
import { Scene } from '@/ui/art';
import { Doodle } from '@/ui/kit';

export function DockBtn({ icon, swatch, label, onClick, danger }: { icon?: string; swatch?: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className={`dock-btn ${danger ? 'danger' : ''}`} onClick={onClick} onMouseDown={(e) => e.preventDefault()}>
      {swatch ? <span className="dock-swatch" style={{ background: swatch === 'none' ? 'repeating-linear-gradient(45deg, var(--card) 0 4px, var(--pill) 4px 8px)' : swatch }} /> : <Doodle id={icon ?? 'tunas'} size={24} color="currentColor" />}
      <span>{label}</span>
    </button>
  );
}

export function Tile({ icon, label, sub, onClick }: { icon: string; label: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" className="tile" onClick={onClick}>
      <Doodle id={icon} size={34} />
      <span className="small ink">{label}</span>
      {sub ? <span className="tiny soft">{sub}</span> : null}
    </button>
  );
}

/** Tinggi papan ketik di layar (iOS/Android) supaya dok tetap di atasnya. */
export function useKeyboardInset(): number {
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const f = () => setKb(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener('resize', f);
    vv.addEventListener('scroll', f);
    return () => {
      vv.removeEventListener('resize', f);
      vv.removeEventListener('scroll', f);
    };
  }, []);
  return kb;
}

function sceneNow() {
  const h = new Date().getHours();
  if (h < 5) return { id: 'langit-malam', line: 'malam masih panjang. tulis pelan-pelan.' };
  if (h < 11) return { id: 'rumah-kecil', line: 'pagi. hari ini masih kosong — dan itu indah.' };
  if (h < 15) return { id: 'hujan-jendela', line: 'siang. ada yang ingin kamu simpan?' };
  if (h < 19) return { id: 'senja-laut', line: 'senja sebentar lagi. apa yang terjadi hari ini?' };
  return { id: 'langit-malam', line: 'malam. saatnya menyegel hari.' };
}

export function EmptyPage() {
  const s = sceneNow();
  return (
    <div className="empty-page" data-paper="1">
      <div style={{ width: 'min(78%, 420px)', margin: '0 auto', opacity: 0.85 }} data-paper="1">
        <Scene id={s.id} speed={1.3} />
      </div>
      <div className="hand" data-paper="1">{s.line}</div>
      <div className="tiny" data-paper="1">ketuk kertas untuk menulis · seret foto ke sini</div>
    </div>
  );
}
