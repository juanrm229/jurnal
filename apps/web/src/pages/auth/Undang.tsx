import { type CircleKind, COPY } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { acceptInvite, createCircle, createInvite, pendingInvite } from '@/lib/circles';
import { qk } from '@/lib/data';
import { navigate } from '@/lib/router';
import { useReady } from '@/lib/session';
import { shareOrCopy } from '@/lib/share';
import { Scene } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';

export const KINDS: { kind: CircleKind; doodle: string; label: string; hint: string }[] = [
  { kind: 'duo', doodle: 'ui-peluk', label: 'berdua', hint: 'pasangan, sahabat, saudara, LDR' },
  { kind: 'circle', doodle: 'ui-lingkaran', label: 'lingkaran', hint: '3–8 orang: geng sahabat, teman kos' },
  { kind: 'chosen_family', doodle: 'rumah', label: 'keluarga pilihan', hint: '3–8 orang yang kamu anggap rumah' },
];

export default function Undang() {
  const { me, identity } = useReady();
  const qc = useQueryClient();
  const t = COPY.onboarding.invite;
  const [kind, setKind] = useState<CircleKind>('duo');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ msg: string; url: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(!!pendingInvite.value);

  useEffect(() => {
    const inv = pendingInvite.value;
    if (!inv) return;
    pendingInvite.value = null;
    acceptInvite(identity, me.user.id, inv.token, inv.fragment)
      .then(async (id) => {
        await qc.invalidateQueries({ queryKey: qk.circles });
        navigate(`/l/${id}`, { replace: true });
      })
      .catch((e) => {
        setErr((e as Error).message);
        setJoining(false);
      });
  }, [identity, me.user.id, qc]);

  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { circle, keys } = await createCircle(identity, {
        kind,
        name: name.trim() || (kind === 'duo' ? 'kita berdua' : 'lingkaran kami'),
        doodle: KINDS.find((k) => k.kind === kind)!.doodle,
      });
      await qc.invalidateQueries({ queryKey: qk.circles });
      const inv = await createInvite({ id: circle.id, keys }, { maxUses: kind === 'duo' ? 1 : 7 });
      const r = await shareOrCopy(t.shareText(me.user.penName ?? 'Seseorang'), inv.url);
      setSent({ msg: r === 'copied' ? 'Tautan undangan disalin. Kirim lewat chat ke orang yang kamu pilih.' : t.waiting, url: inv.url });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (joining) return <Growing label="membuka undangan…" />;
  return (
    <main className="screen">
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <Scene id="dua-jendela" />
      </div>
      <div className="center">
        <div className="title ink">{t.title.toLowerCase()}</div>
        <p className="soft">{t.body}</p>
      </div>
      {sent ? (
        <div className="col gap-lg mt-lg">
          <div className="sticky" style={{ background: 'var(--sticky-green)' }}>
            <p className="small">{sent.msg}</p>
            <p className="tiny" style={{ wordBreak: 'break-all' }}>{sent.url}</p>
          </div>
          <button className="btn" onClick={() => navigate('/hari', { replace: true })}>ke halaman hari ini</button>
        </div>
      ) : (
        <div className="col gap-lg mt-lg">
          <div className="col gap-sm">
            {KINDS.map((k) => (
              <button key={k.kind} className={`card row ${kind === k.kind ? 'picked' : ''}`} style={{ textAlign: 'left', gap: 14, outline: kind === k.kind ? '2px solid var(--ink)' : 'none' }} onClick={() => setKind(k.kind)}>
                <Doodle id={k.doodle} size={34} />
                <span>
                  <span className="h2" style={{ display: 'block' }}>{k.label}</span>
                  <span className="tiny soft">{k.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <input className="field" placeholder={kind === 'duo' ? 'nama kalian berdua (boleh nanti)' : 'nama lingkaran'} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          {err ? <p className="small" style={{ color: 'var(--danger)' }}>{err}</p> : null}
          <button className="btn" disabled={busy} onClick={go}>{busy ? 'menyiapkan…' : t.cta.toLowerCase()}</button>
          <button className="btn ghost" onClick={() => navigate('/hari', { replace: true })}>{t.skip.toLowerCase()}</button>
        </div>
      )}
    </main>
  );
}
