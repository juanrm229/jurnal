/** Tombol hasil strip: tempel ke jurnal, unduh (siap cetak 2×6), bagikan, foto lagi. */
import { download } from '@/lib/meets';
import { setPendingStrip } from '@/lib/photobox/booth';
import { navigate } from '@/lib/router';
import { sound } from '@/lib/sound';
import { Doodle, useToast } from '@/ui/kit';

export function StripActions({ blob, onRetake, retakeLabel = 'foto lagi' }: { blob: Blob; onRetake: () => void; retakeLabel?: string }) {
  const toast = useToast();
  const name = `sehari-photobox-${new Date().toISOString().slice(0, 10)}.jpg`;
  const share = async () => {
    const file = new File([blob], name, { type: blob.type });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: 'strip photobox' }).catch(() => {});
    } else {
      download(name, blob);
      toast('Stripnya sudah diunduh, tinggal dibagikan.');
    }
  };
  return (
    <div className="col" style={{ gap: 8 }}>
      <button
        className="btn"
        onClick={() => {
          setPendingStrip(blob);
          sound.play('pop');
          navigate('/hari?tempel=photobox');
        }}
        data-testid="pb-paste">
        <Doodle id="selotip" size={20} color="currentColor" /> tempel ke halaman hari ini
      </button>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn soft grow" onClick={() => void share()}>
          <Doodle id="ui-bagikan" size={18} color="currentColor" /> kirim
        </button>
        <button className="btn soft grow" onClick={() => download(name, blob)}>
          <Doodle id="ui-unduh" size={18} color="currentColor" /> unduh
        </button>
      </div>
      <button className="btn ghost" onClick={onRetake}>
        {retakeLabel}
      </button>
      <p className="tiny soft center" style={{ margin: 0 }}>
        Hasil unduhan setinggi 1800 px: pas dicetak ukuran strip 2×6 inci.
      </p>
    </div>
  );
}
