/**
 * Upacara Tutup Bab: tiap anggota mengusulkan sampai tiga judul untuk bulan
 * yang hampir selesai, lalu semua memilih. Usulan berbasis aturan dihitung di
 * perangkat; AI cloud hanya bila semua anggota setuju dan hanya untuk potongan
 * yang dipilih sendiri.
 */
import { type AiChapterResult, type ChapterWire, COPY, formatMonth, monthRange, suggestTitlesFor } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, sealCircleText, useCalendar, useCircleRange, useOpenDrops } from '@/lib/data';
import { Avatar, Doodle, Sticky } from '@/ui/kit';
import { authoredTexts, Btn, ErrLine, errorText, nameIn, toWrapDrops } from './board';

/** Aturan upacara dari core — sama persis dengan yang ditegakkan server. */
export { ceremonyOpen } from '@sehari/core';

export function aiAllowed(circle: CircleView): boolean {
  return circle.active.length > 0 && circle.active.every((m) => circle.aiConsent.find((a) => a.userId === m.userId)?.granted);
}

export function Ceremony({ circle, month, chapter, meId }: { circle: CircleView; month: string; chapter: ChapterWire | undefined; meId: string }) {
  const qc = useQueryClient();
  const { start, end } = monthRange(month);
  const range = useCircleRange(circle.id, start, end);
  const cal = useCalendar(circle.id, start, end);
  const opened = useOpenDrops(range.data?.drops);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const proposals = (chapter?.proposals ?? []).map((p) => ({ ...p, title: openCircleText(circle, p.titleEnc) }));
  const mine = proposals.filter((p) => p.userId === meId);
  const myVote = proposals.find((p) => p.votes.includes(meId))?.id;
  const voters = new Set(proposals.flatMap((p) => p.votes));
  const closed = !!chapter?.closedAt;
  const winner = closed ? openCircleText(circle, chapter?.titleEnc, '…') : null;

  const suggestions = useMemo(() => {
    if (!range.data) return [];
    const seals: Record<string, string[]> = {};
    for (const d of cal.data ?? []) for (const u of d.sealed) (seals[u] ??= []).push(d.day);
    try {
      return suggestTitlesFor({
        scope: 'month',
        period: month,
        circle: { id: circle.id, kind: circle.kind, name: circle.name },
        members: circle.active.map((m) => ({ userId: m.userId, name: nameIn(circle, m.userId, meId) })),
        drops: toWrapDrops(opened),
        seals,
      }).slice(0, 5);
    } catch {
      return [];
    }
  }, [range.data, cal.data, opened, month, circle, meId]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['chapters', circle.id] });

  const propose = async (title: string) => {
    const t = title.trim();
    if (!t || mine.length >= 3) return;
    setBusy('propose');
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/chapters/${month}/proposals`, { titleEnc: sealCircleText(circle, t.slice(0, 80)) });
      setDraft('');
      await refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const vote = async (proposalId: string) => {
    setBusy(proposalId);
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/chapters/${month}/votes`, { proposalId });
      await refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const closeNow = async () => {
    setBusy('close');
    try {
      await api.post(`/circles/${circle.id}/chapters/${month}/close`);
      await refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  if (closed) {
    return (
      <Sticky color="yellow" tilt={-1}>
        <div className="col center" style={{ alignItems: 'center', gap: 4 }}>
          <span className="label" style={{ color: 'inherit', opacity: 0.7 }}>bab {formatMonth(month).toLowerCase()} diberi judul</span>
          <span className="hand" style={{ fontSize: 38, color: 'inherit' }}>{winner}</span>
          <span className="tiny" style={{ opacity: 0.7 }}>dipilih bersama dari {proposals.length} usulan</span>
        </div>
      </Sticky>
    );
  }

  return (
    <div className="card col lore-ceremony">
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <Doodle id="pena" size={38} draw className="sway" />
        <div className="grow">
          <div className="h2">upacara tutup bab</div>
          <div className="tiny soft">{formatMonth(month)} hampir selesai. usulkan judul, lalu pilih bersama.</div>
        </div>
      </div>

      {proposals.length ? (
        <div className="col" style={{ gap: 8 }}>
          {proposals.map((p, i) => {
            const chosen = myVote === p.id;
            return (
              <button
                key={p.id}
                className={`lore-choice ${chosen ? 'on' : ''}`}
                aria-pressed={chosen}
                disabled={busy === p.id}
                onClick={() => void vote(p.id)}
                style={{ transform: `rotate(${i % 2 ? 0.4 : -0.4}deg)` }}>
                <span className="grow" style={{ textAlign: 'left' }}>
                  <span className="hand" style={{ fontSize: 26, display: 'block' }}>{p.title}</span>
                  <span className="tiny soft">usulan {nameIn(circle, p.userId, meId)}</span>
                </span>
                <span className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                  <span className="row" style={{ gap: 2 }}>
                    {p.votes.map((u) => {
                      const m = circle.members.find((x) => x.userId === u);
                      return <Avatar key={u} doodle={m?.doodle ?? 'tunas'} size={22} sealed />;
                    })}
                  </span>
                  <span className={`tiny ${chosen ? 'ink' : 'soft'}`}>{chosen ? 'pilihanmu ✓' : 'pilih'}</span>
                </span>
              </button>
            );
          })}
          <p className="tiny soft center" style={{ margin: 0 }}>
            {voters.size} dari {circle.active.length} sudah memilih · bab tertutup sendiri saat semua sudah memilih
          </p>
          {voters.size > 0 && voters.size < circle.active.length ? (
            <Btn kind="ghost" className="sm" loading={busy === 'close'} onClick={() => void closeNow()}>
              tutup bab sekarang
            </Btn>
          ) : null}
        </div>
      ) : (
        <p className="small soft" style={{ margin: 0 }}>Belum ada usulan. Judul pertama boleh dari siapa saja.</p>
      )}

      {mine.length < 3 ? (
        <div className="col" style={{ marginTop: 4 }}>
          <input
            className="field hand"
            style={{ fontSize: 24, padding: '8px 14px' }}
            value={draft}
            maxLength={80}
            placeholder="usulkan judul bab…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void propose(draft)}
          />
          <Btn disabled={!draft.trim()} loading={busy === 'propose'} onClick={() => void propose(draft)}>
            usulkan ({3 - mine.length} lagi)
          </Btn>
        </div>
      ) : (
        <p className="tiny soft center" style={{ margin: 0 }}>Tiga usulanmu sudah masuk. Sekarang tinggal memilih.</p>
      )}

      {suggestions.length && mine.length < 3 ? (
        <div className="col" style={{ gap: 6 }}>
          <span className="label">usulan dari halaman-halaman bulan ini</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {suggestions.map((s) => (
              <button key={s} className="pill" onClick={() => setDraft(s)}>
                {s}
              </button>
            ))}
          </div>
          <span className="tiny soft">dihitung di perangkatmu, isinya tidak keluar dari peramban ini</span>
        </div>
      ) : null}

      {aiAllowed(circle) && mine.length < 3 ? (
        aiOpen ? (
          <AiPanel circle={circle} month={month} texts={authoredTexts(opened, { authorId: meId })} onPick={(t) => setDraft(t)} onClose={() => setAiOpen(false)} />
        ) : (
          <Btn kind="soft" icon="ui-ide" onClick={() => setAiOpen(true)}>
            minta usulan AI
          </Btn>
        )
      ) : null}

      <ErrLine>{err}</ErrLine>
    </div>
  );
}

function AiPanel({ circle, month, texts, onPick, onClose }: { circle: CircleView; month: string; texts: { day: string; text: string }[]; onPick: (t: string) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [titles, setTitles] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const list = texts.slice(-40);

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<AiChapterResult>(`/circles/${circle.id}/ai/chapter-titles`, { month, snippets: picked.map((i) => list[i]!.text.slice(0, 500)) });
      setTitles(r.titles);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="col" style={{ borderTop: '1px dashed var(--ink-soft)', paddingTop: 10 }}>
      <span className="label">usulan ai cloud</span>
      <div className="card flat" style={{ background: 'var(--sticky-peach)', borderRadius: 14, padding: 12, color: '#16161a' }}>
        <div className="small">{COPY.privacy.aiCloudWarning}</div>
        <div className="tiny" style={{ marginTop: 4, opacity: 0.75 }}>
          Pilih sendiri potongan tulisanmu yang boleh dibaca AI. {COPY.privacy.aiOffers}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="small soft" style={{ margin: 0 }}>Belum ada tulisanmu bulan ini yang bisa dipilih.</p>
      ) : (
        list.map((t, i) => {
          const on = picked.includes(i);
          return (
            <button key={i} role="checkbox" aria-checked={on} className="lore-check" onClick={() => setPicked((p) => (on ? p.filter((x) => x !== i) : [...p, i]))}>
              <span className={`box ${on ? 'on' : ''}`}>{on ? <Doodle id="ui-centang" size={14} color="var(--on-ink)" /> : null}</span>
              <span className="small grow lore-clamp3">{t.text}</span>
            </button>
          );
        })
      )}
      {titles ? (
        titles.length ? (
          <div className="row wrap" style={{ gap: 6 }}>
            {titles.map((t) => (
              <button key={t} className="pill" onClick={() => onPick(t)}>
                {t}
              </button>
            ))}
          </div>
        ) : (
          <p className="small soft" style={{ margin: 0 }}>AI belum punya usulan kali ini. Usulan kalian sendiri biasanya lebih tepat.</p>
        )
      ) : null}
      <ErrLine>{err}</ErrLine>
      <Btn disabled={!picked.length} loading={busy} onClick={() => void send()}>
        {picked.length ? `kirim ${picked.length} potongan ke AI` : 'pilih potongan dulu'}
      </Btn>
      <Btn kind="ghost" className="sm" onClick={onClose}>
        tidak jadi
      </Btn>
    </div>
  );
}
