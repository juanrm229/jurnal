/**
 * Laporkan seseorang. Parameter lewat query: ?userId=…&circleId=…&dropId=…&text=…
 * Server tidak bisa membaca isi lingkaran; yang terlihat tim hanya yang
 * dikirim pelapor dari perangkatnya sendiri.
 */
import { COPY, REPORT_REASONS, type ReportReason } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { qk, useCircles } from '@/lib/data';
import { back, navigate, usePath } from '@/lib/router';
import { Avatar, Doodle, Header, Section } from '@/ui/kit';
import { ConfirmCard, ErrText, errMsg, Note, OptionCard } from './kit';

const REASONS = Object.entries(REPORT_REASONS) as [ReportReason, string][];

function HelpCard() {
  return (
    <Note color="peach" icon="lilin">
      <div className="col" style={{ gap: 8 }}>
        <span className="small">{COPY.silentRoom.helpLead}</span>
        <span className="small">{COPY.silentRoom.emergencyLead}</span>
        <button className="btn ghost sm" onClick={() => navigate('/bantuan')}>
          buka Bantuan & dukungan
        </button>
      </div>
    </Note>
  );
}

function PreviewLine({ label, value, clamp }: { label: string; value: string; clamp?: boolean }) {
  return (
    <div>
      <div className="tiny soft">{label}</div>
      <div className="small" style={clamp ? { display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' } : { whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  );
}

export default function Lapor() {
  const { search } = usePath();
  const params = { userId: search.get('userId') ?? '', circleId: search.get('circleId') ?? undefined, dropId: search.get('dropId') ?? undefined, text: search.get('text') ?? undefined };
  const qc = useQueryClient();
  const { circles } = useCircles();
  const circle = circles.find((x) => x.id === params.circleId);
  const person = (circle?.members ?? circles.flatMap((x) => x.members)).find((m) => m.userId === params.userId);
  const name = person?.penName ?? 'orang ini';
  const backTo = params.circleId ? `/l/${params.circleId}/atur` : '/aku';

  const [step, setStep] = useState<'reason' | 'content' | 'sent'>('reason');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [content, setContent] = useState(params.text ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockErr, setBlockErr] = useState<string | null>(null);

  const submit = async () => {
    if (!reason || !params.userId) return;
    setBusy(true);
    setErr(null);
    try {
      await api.post('/reports', {
        targetUserId: params.userId,
        ...(params.circleId ? { circleId: params.circleId } : {}),
        ...(params.dropId ? { dropId: params.dropId } : {}),
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(content.trim() ? { disclosedContent: content.trim() } : {}),
      });
      setStep('sent');
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    setBusy(true);
    setBlockErr(null);
    try {
      await api.post(`/blocks/${params.userId}`);
      setBlocked(true);
      setBlockOpen(false);
      void qc.invalidateQueries({ queryKey: qk.circles });
      void qc.invalidateQueries({ queryKey: ['blocks'] });
    } catch (e) {
      setBlockErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!params.userId) {
    return (
      <main className="screen">
        <Header title="laporkan" backTo="/aku" />
        <div className="card center mt">Pilih orang yang ingin kamu laporkan dari pengaturan lingkaran.</div>
      </main>
    );
  }

  const isDuo = circles.some((x) => x.kind === 'duo' && x.status === 'active' && x.others.some((m) => m.userId === params.userId));

  if (step === 'sent') {
    return (
      <main className="screen">
        <Header title="laporkan" backTo={backTo} />
        <div className="col center rise" style={{ alignItems: 'center', gap: 8, marginTop: 20 }}>
          <Doodle id="segel-lilin" size={56} draw />
          <div className="title center">Terima kasih sudah memberi tahu</div>
          <p className="soft center" style={{ margin: 0, maxWidth: 420 }}>
            Laporanmu sudah sampai ke tim keamanan dan akan ditinjau. {name} tidak diberi tahu siapa yang melapor.
          </p>
        </div>
        <div className="col mt-lg" style={{ gap: 14 }}>
          {reason === 'menyakiti_diri' ? <HelpCard /> : null}
          {blocked ? (
            <Note color="green" icon="ui-centang">
              {`${name} sudah diblokir. Drop-nya tidak akan sampai ke kapsulmu lagi.${isDuo ? ' Duo kalian juga sudah dibekukan.' : ''}`}
            </Note>
          ) : blockOpen ? (
            <ConfirmCard
              title={`Blokir ${name}?`}
              body="Isi darinya tidak akan sampai kepadamu lagi, dan isimu tidak sampai kepadanya. Dia tidak diberi tahu."
              note={isDuo ? 'Di Duo, memblokir juga berarti keluar: arsip Duo kalian dibekukan (Mode Pisah).' : undefined}
              confirmLabel="ya, blokir"
              onConfirm={() => void block()}
              onCancel={() => setBlockOpen(false)}
              busy={busy}
              danger
              error={blockErr}
            />
          ) : (
            <div className="card col" style={{ gap: 10 }}>
              <span className="small">Kalau kamu tidak ingin melihat apa pun darinya untuk sementara, atau selamanya, kamu bisa memblokirnya sekarang.</span>
              <button className="btn danger" onClick={() => setBlockOpen(true)}>
                blokir {name}
              </button>
            </div>
          )}
          <button className="btn ghost" onClick={() => back(backTo)}>
            selesai
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <Header title="laporkan" sub={circle?.name} backTo={backTo} />
      <div className="card row" style={{ gap: 12 }}>
        <Avatar doodle={person?.doodle ?? 'semak'} size={40} />
        <div className="grow">
          <div>{name}</div>
          <div className="tiny soft">{circle ? `di ${circle.name}` : 'dari lingkaranmu'}</div>
        </div>
      </div>
      <p className="small soft" style={{ margin: '12px 0 0' }}>
        Kamu aman di sini. Laporan tidak memberi tahu {name}, dan kamu bisa berhenti kapan saja.
      </p>

      {step === 'reason' ? (
        <>
          <Section title="apa yang terjadi?">
            <div className="col" role="radiogroup" style={{ gap: 6 }}>
              {REASONS.map(([code, label]) => (
                <OptionCard key={code} on={reason === code} title={<span className="small">{label}</span>} onClick={() => setReason(code)} />
              ))}
            </div>
            {reason === 'menyakiti_diri' ? (
              <div className="mt">
                <HelpCard />
              </div>
            ) : null}
            {reason === 'anak' ? (
              <Note color="peach" style={{ marginTop: 16 }}>
                Laporan tentang keselamatan anak kami dahulukan. Kalau anak itu dalam bahaya sekarang, hubungi 112.
              </Note>
            ) : null}
          </Section>
          <button className="btn mt-lg" onClick={() => setStep('content')} disabled={!reason}>
            lanjut
          </button>
        </>
      ) : (
        <>
          <Section title="catatan untuk tim (opsional)">
            <textarea className="field" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="ceritakan dengan kata-katamu sendiri, sesingkat atau sepanjang yang kamu mau" />
          </Section>

          <Section title="isi yang ikut dikirim">
            <Note color="blue" icon="ui-gembok">
              Sehari tidak bisa membaca isi lingkaran. Tim keamanan hanya akan melihat apa yang kamu kirim dari perangkatmu di kotak ini. Ubah atau hapus bagian yang tidak ingin kamu bagikan.
            </Note>
            <textarea
              className="field"
              style={{ marginTop: 10 }}
              value={content}
              maxLength={10_000}
              onChange={(e) => setContent(e.target.value)}
              placeholder="kosong: tidak ada isi yang dikirim, hanya alasan dan catatanmu"
            />
            {content ? (
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="tiny ink" style={{ background: 'none', border: 0, padding: '6px 0' }} onClick={() => setContent('')}>
                  hapus isi ini
                </button>
              </div>
            ) : null}
          </Section>

          <Section title="persis yang akan dikirim">
            <div className="card flat col" style={{ gap: 8, background: 'var(--paper)', border: '1.5px dashed var(--ink-soft)' }}>
              <PreviewLine label="tentang" value={name} />
              <PreviewLine label="alasan" value={reason ? REPORT_REASONS[reason] : '—'} />
              <PreviewLine label="catatanmu" value={note.trim() || '(tidak ada)'} />
              <PreviewLine label="isi yang dibagikan" value={content.trim() || '(tidak ada)'} clamp />
              {params.dropId ? <span className="tiny soft">ditambah penanda Drop yang dilaporkan (tanpa isinya)</span> : null}
            </div>
          </Section>
          <div className="col mt-lg" style={{ gap: 8 }}>
            <ErrText>{err}</ErrText>
            <button className="btn" onClick={() => void submit()} disabled={busy}>
              {busy ? 'mengirim…' : 'kirim laporan'}
            </button>
            <button className="btn ghost" onClick={() => setStep('reason')}>
              ganti alasan
            </button>
          </div>
        </>
      )}
    </main>
  );
}
