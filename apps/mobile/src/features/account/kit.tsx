/**
 * Potongan kecil yang dipakai layar Aku, pengaturan lingkaran, Plus, dan lapor.
 * Konfirmasi ditulis sebagai kartu di halaman (bukan Alert) supaya terasa
 * seperti kertas, dan berjalan sama di web.
 */
import { type Me, type UserSettings } from '@sehari/core';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Gap, Pill, Row, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

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

/** Kertas tempel kecil untuk catatan jujur. */
export function Note({ children, color = 'yellow', icon, testID }: { children: ReactNode; color?: 'yellow' | 'peach' | 'green' | 'blue'; icon?: string; testID?: string }) {
  const { c } = useTheme();
  return (
    <View testID={testID} style={{ backgroundColor: c.sticky[color], padding: SPACE.md, borderRadius: 6 }}>
      {icon ? (
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Doodle id={icon} size={22} color={c.text} />
          <View style={{ flex: 1 }}>{typeof children === 'string' ? <Txt v="small">{children}</Txt> : children}</View>
        </Row>
      ) : typeof children === 'string' ? (
        <Txt v="small">{children}</Txt>
      ) : (
        children
      )}
    </View>
  );
}

/** Daftar butir dengan titik tinta. */
export function Bullets({ items, small = true }: { items: string[]; small?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {items.map((t, i) => (
        <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.ink, marginTop: small ? 7 : 9 }} />
          <Txt v={small ? 'small' : 'body'} style={{ flex: 1 }}>
            {t}
          </Txt>
        </Row>
      ))}
    </View>
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
  testID,
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
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: SPACE.sm, borderColor: danger ? c.danger : c.inkSoft, borderStyle: 'dashed' }}>
      <Txt v="h2" ink>
        {title}
      </Txt>
      {body ? <Txt v="small">{body}</Txt> : null}
      {note ? (
        <Txt v="tiny" soft>
          {note}
        </Txt>
      ) : null}
      {children}
      {error ? <Txt v="small" style={{ color: c.danger }}>{error}</Txt> : null}
      <Gap h={4} />
      <Button title={confirmLabel} kind={danger ? 'danger' : 'primary'} onPress={onConfirm} loading={busy} disabled={disabled} testID={testID ? `${testID}-confirm` : undefined} />
      <Button title={cancelLabel} kind="ghost" onPress={onCancel} testID={testID ? `${testID}-cancel` : undefined} />
    </Card>
  );
}

export function Choice<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testID?: string;
}) {
  return (
    <Row style={{ flexWrap: 'wrap' }} gap={8}>
      {options.map((o) => (
        <Pill key={o.value} active={o.value === value} onPress={() => onChange(o.value)} testID={testID ? `${testID}-${o.value}` : undefined}>
          {o.label}
        </Pill>
      ))}
    </Row>
  );
}

/** Pilihan jam 0–23 sebagai petak kecil. */
export function HourPicker({ value, onChange, testID }: { value: number; onChange: (h: number) => void; testID?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {Array.from({ length: 24 }, (_, h) => {
        const on = h === value;
        return (
          <Pressable
            key={h}
            onPress={() => onChange(h)}
            testID={testID ? `${testID}-${h}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`pukul ${h}`}
            style={({ pressed }) => ({
              width: 52,
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: on ? c.ink : c.card,
              borderWidth: 1,
              borderColor: on ? c.ink : c.cardEdge,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Txt v="small" style={{ color: on ? c.onInk : c.text }}>
              {String(h).padStart(2, '0')}.00
            </Txt>
          </Pressable>
        );
      })}
    </View>
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
  const { c } = useTheme();
  if (error) return <Txt v="tiny" style={{ color: c.danger }}>{error}</Txt>;
  if (saving) return <Txt v="tiny" ink soft>menyimpan…</Txt>;
  if (savedAt) return <Txt v="tiny" ink soft>tersimpan</Txt>;
  return null;
}
