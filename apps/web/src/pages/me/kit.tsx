/**
 * Potongan kecil untuk layar Aku, pengaturan lingkaran, dan lapor.
 * Konfirmasi ditulis sebagai kartu di halaman (bukan dialog) supaya terasa
 * seperti kertas.
 */
import type { Me, UserSettings } from '@sehari/core';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/kit';

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Ada yang salah. Coba lagi sebentar lagi.';
}

const DATE_FMT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_TIME_FMT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return (withTime ? DATE_TIME_FMT : DATE_FMT).format(d);
}

export type NoteColor = 'yellow' | 'peach' | 'green' | 'blue';

/** Kertas tempel kecil untuk catatan jujur. */
export function Note({ children, color = 'yellow', icon, style }: { children: ReactNode; color?: NoteColor; icon?: string; style?: CSSProperties }) {
  const body = typeof children === 'string' ? <span className="small">{children}</span> : children;
  return (
    <div style={{ background: `var(--sticky-${color})`, color: 'var(--text)', padding: '12px 14px', borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,.05)', ...style }}>
      {icon ? (
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <Doodle id={icon} size={22} color="currentColor" />
          <div className="grow">{body}</div>
        </div>
      ) : (
        body
      )}
    </div>
  );
}

/** Daftar butir dengan titik tinta. */
export function Bullets({ items, small = true }: { items: string[]; small?: boolean }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      {items.map((t, i) => (
        <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ink)', marginTop: small ? 7 : 9, flexShrink: 0 }} />
          <span className={small ? 'small grow' : 'grow'}>{t}</span>
        </div>
      ))}
    </div>
  );
}

export function ErrText({ children, center }: { children: ReactNode; center?: boolean }) {
  if (!children) return null;
  return (
    <p className={center ? 'small center' : 'small'} style={{ color: 'var(--danger)', margin: 0 }}>
      {children}
    </p>
  );
}

export function ConfirmCard({
  title,
  body,
  note,
  confirmLabel,
  cancelLabel = 'batal',
  onConfirm,
  onCancel,
  busy,
  danger,
  error,
  disabled,
  children,
}: {
  title: string;
  body?: string;
  note?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
  error?: string | null;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="card flat col rise" style={{ gap: 8, border: `1.5px dashed ${danger ? 'var(--danger)' : 'var(--ink-soft)'}` }}>
      <div className="h2">{title}</div>
      {body ? <p className="small" style={{ margin: 0 }}>{body}</p> : null}
      {note ? <p className="tiny soft" style={{ margin: 0 }}>{note}</p> : null}
      {children}
      <ErrText>{error}</ErrText>
      <button className={danger ? 'btn danger mt' : 'btn mt'} onClick={onConfirm} disabled={busy || disabled}>
        {busy ? 'sebentar…' : confirmLabel}
      </button>
      <button className="btn ghost" onClick={onCancel} disabled={busy}>
        {cancelLabel}
      </button>
    </div>
  );
}

export function Choice<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'pill active' : 'pill'} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Pilihan jam 0–23 sebagai petak kecil. */
export function HourPicker({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {Array.from({ length: 24 }, (_, h) => {
        const on = h === value;
        return (
          <button
            key={h}
            onClick={() => onChange(h)}
            aria-pressed={on}
            aria-label={`pukul ${h}`}
            className="small"
            style={{
              width: 58,
              padding: '7px 0',
              borderRadius: 10,
              background: on ? 'var(--ink)' : 'var(--card)',
              color: on ? 'var(--on-ink)' : 'var(--text)',
              border: `1px solid ${on ? 'var(--ink)' : 'var(--card-edge)'}`,
            }}>
            {String(h).padStart(2, '0')}.00
          </button>
        );
      })}
    </div>
  );
}

/** Kartu pilihan (radio) dengan centang. */
export function OptionCard({ on, title, body, onClick, disabled }: { on: boolean; title: ReactNode; body?: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="card flat"
      style={{ background: on ? 'var(--pill)' : 'var(--card)', borderColor: on ? 'var(--ink)' : 'var(--card-edge)', padding: '12px 16px', borderRadius: 18, cursor: disabled ? 'default' : 'pointer' }}>
      <span className="row between">
        <span className={on ? 'ink' : undefined}>{title}</span>
        {on ? <Doodle id="ui-centang" size={18} /> : null}
      </span>
      {body ? <span className="tiny soft" style={{ display: 'block', marginTop: 4 }}>{body}</span> : null}
    </button>
  );
}

/** Kartu berisi baris-baris (toggle/tautan) dengan garis tipis di antaranya. */
export function ListCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="card" style={{ padding: '4px 16px', ...style }}>
      {children}
    </div>
  );
}

export function Hr() {
  return <div style={{ height: 1, background: 'var(--card-edge)', margin: 0 }} />;
}

/** Ikon doodle di samping isi (untuk baris pengaturan). */
export function IconRow({ icon, children, top = 10 }: { icon: string; children: ReactNode; top?: number }) {
  return (
    <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
      <span style={{ paddingTop: top }}>
        <Doodle id={icon} size={26} />
      </span>
      <div className="grow">{children}</div>
    </div>
  );
}

/** Simpan sebagian pengaturan pengguna; tampilan langsung berubah (optimistis). */
export function useSaveSettings() {
  const { me, setMe } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const save = async (patch: Partial<UserSettings>) => {
    if (!me) return;
    const before = me;
    setMe({ ...me, user: { ...me.user, settings: { ...me.user.settings, ...patch } } });
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<Me>('/me', { settings: patch });
      setMe(updated);
      setSavedAt(Date.now());
    } catch (e) {
      setMe(before);
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };
  return { settings: me?.user.settings, save, saving, error, savedAt };
}

export function SavedHint({ saving, error, savedAt }: { saving: boolean; error: string | null; savedAt: number | null }) {
  if (error) return <span className="tiny" style={{ color: 'var(--danger)' }}>{error}</span>;
  if (saving) return <span className="tiny ink-soft">menyimpan…</span>;
  if (savedAt) return <span className="tiny ink-soft">tersimpan</span>;
  return null;
}

/** Simpan teks sebagai berkas unduhan. */
export function downloadText(name: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
