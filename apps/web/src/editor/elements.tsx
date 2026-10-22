import { MOODS } from '@sehari/core';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useMediaUrl } from '@/lib/media';
import { Doodle } from '@/ui/kit';
import type { PageItem } from './Page';
import { StickerArt } from './stickers';

export const TEXT_SIZES = { s: 30, m: 38, l: 54, xl: 76 } as const;

export function PageElement({
  item,
  scale,
  editing,
  onText,
  onEndEdit,
}: {
  item: PageItem;
  scale: number;
  editing: boolean;
  onText: (t: string) => void;
  onEndEdit: () => void;
  viewerId: string;
}) {
  const p = item.payload;
  const px = (u: number) => Math.max(9, u * scale);
  switch (p.kind) {
    case 'photo':
    case 'screenshot':
      return <PhotoEl item={item} scale={scale} />;
    case 'sticker':
      return <StickerArt id={p.sticker ?? 'tunas'} line={p.color ?? p.style?.color} fill={p.style?.fill} cut={p.style?.cut !== false} day={p.text} cityId={p.cityId} scale={scale} />;
    case 'voice':
      return <VoiceEl item={item} scale={scale} />;
    case 'song':
      return (
        <div className="cassette" style={{ fontSize: px(26) }}>
          <div className="row between">
            <Doodle id="not-balok" size={px(40)} />
            <span className="tiny" style={{ fontSize: px(18) }}>sisi A</span>
          </div>
          <div className="reels">
            <span className="reel" />
            <span className="reel" />
          </div>
          <a href={p.song?.url} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()} style={{ display: 'block', color: 'var(--ink)' }}>
            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.song?.title}</div>
            <div style={{ fontSize: px(20), opacity: 0.75 }}>{p.song?.artist}</div>
          </a>
          {p.text ? <div className="hand" style={{ fontSize: px(34), marginTop: px(10), color: 'var(--text)' }}>{p.text}</div> : null}
        </div>
      );
    case 'mood':
      return (
        <div style={{ height: px(70) }}>
          <div className="washi" style={{ background: MOODS[p.mood!]?.color, transform: 'rotate(-1.5deg)' }} />
          <div className="tiny" style={{ fontSize: px(18), marginTop: px(6), color: 'var(--text-soft)' }}>{p.mood ? MOODS[p.mood]?.label : ''}</div>
        </div>
      );
    case 'card':
    case 'answer':
    case 'expedition':
      return (
        <div className="prompt-card" style={{ background: p.kind === 'answer' ? 'var(--sticky-blue)' : 'var(--sticky-yellow)', fontSize: px(26) }}>
          {p.prompt ? <div style={{ fontSize: px(20), opacity: 0.7, marginBottom: px(10) }}>{p.prompt}</div> : null}
          <TextBody item={item} scale={scale} editing={editing} onText={onText} onEndEdit={onEndEdit} hand placeholder="jawabanmu…" />
        </div>
      );
    case 'silent':
      return (
        <div style={{ textAlign: 'center', padding: px(18), border: `1.5px dashed var(--ink-soft)`, borderRadius: px(30), background: p.mood ? `color-mix(in srgb, ${MOODS[p.mood]?.color} 30%, transparent)` : undefined }}>
          <Doodle id="lilin" size={px(90)} className="breathe" />
          <div className="tiny" style={{ fontSize: px(18), color: 'var(--text-soft)' }}>ruang hening</div>
          {p.text ? <div className="hand" style={{ fontSize: px(32) }}>{p.text}</div> : null}
        </div>
      );
    case 'last_line':
      return (
        <div style={{ textAlign: 'center' }}>
          <Doodle id="garis-bawah" size={px(60)} style={{ opacity: 0.5 }} />
          <div className="hand" style={{ fontSize: px(54) }}>{p.text}</div>
        </div>
      );
    case 'auto':
      return (
        <div className="row" style={{ gap: px(14), fontSize: px(24), color: 'var(--text-soft)' }}>
          <Doodle id={p.weather && ['hujan', 'gerimis', 'badai'].includes(p.weather.code) ? 'hujan' : p.weather?.code === 'cerah' ? 'matahari' : 'awan'} size={px(56)} />
          <span>{p.weather ? `${p.weather.label} · ${Math.round(p.weather.tempC)}°` : ''}{p.steps ? ` · ${p.steps.toLocaleString('id-ID')} langkah` : ''}</span>
        </div>
      );
    case 'word':
      return <TextBody item={item} scale={scale} editing={editing} onText={onText} onEndEdit={onEndEdit} sizeOverride={84} placeholder="satu kata" inkColor />;
    default:
      return <TextBody item={item} scale={scale} editing={editing} onText={onText} onEndEdit={onEndEdit} placeholder={p.kind === 'idea' ? 'ide yang lewat…' : 'tulis sesuatu…'} />;
  }
}

function TextBody({
  item,
  scale,
  editing,
  onText,
  onEndEdit,
  hand,
  sizeOverride,
  placeholder,
  inkColor,
}: {
  item: PageItem;
  scale: number;
  editing: boolean;
  onText: (t: string) => void;
  onEndEdit: () => void;
  hand?: boolean;
  sizeOverride?: number;
  placeholder: string;
  inkColor?: boolean;
}) {
  const p = item.payload;
  const isHand = hand || p.style?.font === 'hand';
  const size = (sizeOverride ?? p.style?.size ?? TEXT_SIZES.m) * scale * (isHand ? 1.25 : 1);
  const style: CSSProperties = {
    fontSize: Math.max(10, size),
    color: p.style?.color ?? (inkColor ? 'var(--ink)' : 'var(--text)'),
    textAlign: p.style?.align ?? 'left',
  };
  const ta = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(p.text ?? '');
  useEffect(() => {
    if (!editing) setDraft(p.text ?? '');
  }, [p.text, editing]);
  useEffect(() => {
    if (editing && ta.current) {
      ta.current.focus();
      const v = ta.current.value;
      ta.current.setSelectionRange(v.length, v.length);
    }
  }, [editing]);
  useEffect(() => {
    const el = ta.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [draft, editing, scale]);

  if (editing) {
    return (
      <textarea
        ref={ta}
        className={`t-edit ${isHand ? 'hand' : ''}`}
        style={style}
        value={draft}
        placeholder={placeholder}
        rows={1}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setDraft(e.target.value);
          onText(e.target.value);
        }}
        onBlur={onEndEdit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
        }}
      />
    );
  }
  return (
    <div className={`t-text ${isHand ? 'hand' : ''}`} style={style}>
      {p.text ? p.text : <span className="t-placeholder">{placeholder}</span>}
    </div>
  );
}

function PhotoEl({ item, scale }: { item: PageItem; scale: number }) {
  const m = item.payload.media?.find((x) => x.mime.startsWith('image/'));
  const remote = useMediaUrl(item.localUrl ? undefined : m);
  const url = item.localUrl ?? remote;
  const ar = m?.width && m?.height ? `${m.width} / ${m.height}` : '4 / 3';
  return (
    <div className="polaroid" style={{ '--ar': ar, '--tint': m?.tint ?? '#d9d6cf' } as CSSProperties}>
      <span className="tape" />
      {url ? <img src={url} alt="" draggable={false} /> : <div className="ph" />}
      {item.payload.text ? <div className="cap" style={{ fontSize: Math.max(12, 36 * scale) }}>{item.payload.text}</div> : null}
    </div>
  );
}

function VoiceEl({ item, scale }: { item: PageItem; scale: number }) {
  const m = item.payload.media?.find((x) => x.mime.startsWith('audio/'));
  const url = useMediaUrl(m);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const secs = Math.round((m?.durationMs ?? 0) / 1000);
  const px = (u: number) => Math.max(9, u * scale);
  return (
    <div
      className={`cassette ${playing ? 'playing' : ''}`}
      style={{ fontSize: px(24), cursor: 'pointer' }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (!url) return;
        if (!audio.current) {
          audio.current = new Audio(url);
          audio.current.onended = () => setPlaying(false);
        }
        if (playing) {
          audio.current.pause();
          setPlaying(false);
        } else {
          void audio.current.play();
          setPlaying(true);
        }
      }}>
      <div className="row between">
        <Doodle id="ui-mikrofon" size={px(40)} />
        <span>{playing ? 'memutar…' : 'putar suara'}</span>
      </div>
      <div className="reels">
        <span className="reel" />
        <span className="reel" />
      </div>
      <div className="center" style={{ fontSize: px(20), opacity: 0.8 }}>
        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
      </div>
    </div>
  );
}
