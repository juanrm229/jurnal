/**
 * Pengaturan lingkaran: nama & doodle, fitur melankolis, ritual, cara kapsul
 * terbuka, anggota (julukan, kode keamanan, lapor, blokir), AI cloud, mode
 * saat hidup berubah, dan keluar.
 */
import { CIRCLE_KIND_LABEL, type CircleMember, type CircleSettings, COPY, fromBase64, MOMENT_TIERS, type MomentTier, type Nickname, safetyCode } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, qk, sealCircleText, useCircle } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { Avatar, Doodle, Growing, Header, Section, Toggle } from '@/ui/kit';
import { Bullets, Choice, ConfirmCard, ErrText, errMsg, formatDate, Hr, ListCard, Note, OptionCard } from '../me/kit';

const CIRCLE_DOODLES = ['tunas', 'rumah', 'ui-peluk', 'cangkir', 'bunga-matahari', 'kucing', 'buku', 'gitar', 'sepeda', 'kerang', 'bulan', 'lentera', 'payung', 'kompas', 'surat-botol', 'pohon-kelapa', 'kembang-api', 'kado'];
const ROLE: Record<string, string> = { owner: 'pembuka lingkaran', member: 'anggota', guest: 'tamu' };

type Refresh = () => Promise<void>;

// ── nama & doodle ───────────────────────────────────────────────────────────

function NameAndDoodle({ circle, onSaved }: { circle: CircleView; onSaved: Refresh }) {
  const [name, setName] = useState(circle.name);
  const [doodle, setDoodle] = useState(circle.doodle);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = name.trim() !== circle.name || doodle !== circle.doodle;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.patch(`/circles/${circle.id}`, {
        ...(name.trim() !== circle.name ? { nameEnc: sealCircleText(circle, name.trim()) } : {}),
        ...(doodle !== circle.doodle ? { doodle } : {}),
      });
      await onSaved();
      setSaved(true);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card col" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 12 }}>
        <Avatar doodle={doodle} size={52} sealed />
        <input
          className="field hand grow"
          style={{ fontSize: 26, padding: '8px 14px' }}
          value={name}
          maxLength={60}
          placeholder="nama lingkaran"
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
      </div>
      <span className="tiny soft">Nama ini dienkripsi; server hanya melihat huruf acak.</span>
      <div className="row wrap" style={{ gap: 8 }}>
        {CIRCLE_DOODLES.map((d) => (
          <button
            key={d}
            aria-label={d}
            aria-pressed={d === doodle}
            onClick={() => {
              setDoodle(d);
              setSaved(false);
            }}
            style={{ padding: 7, borderRadius: 14, background: d === doodle ? 'var(--pill)' : 'var(--card)', border: `1px solid ${d === doodle ? 'var(--ink)' : 'var(--card-edge)'}` }}>
            <Doodle id={d} size={28} />
          </button>
        ))}
      </div>
      {dirty ? (
        <button className="btn soft" onClick={() => void save()} disabled={busy || !name.trim()}>
          {busy ? 'menyimpan…' : 'simpan nama & doodle'}
        </button>
      ) : saved ? (
        <span className="tiny ink-soft">tersimpan</span>
      ) : null}
      <ErrText>{err}</ErrText>
    </div>
  );
}

// ── anggota ─────────────────────────────────────────────────────────────────

function SafetyCode({ mine, theirs, name }: { mine: Uint8Array; theirs: string; name: string }) {
  let groups: string[] = [];
  try {
    groups = safetyCode(mine, fromBase64(theirs)).split(' ');
  } catch {
    groups = [];
  }
  if (!groups.length || !theirs) return <p className="small" style={{ margin: 0 }}>Kode keamanan belum bisa dibuat: {name} belum punya kunci.</p>;
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="col" style={{ background: 'var(--paper)', borderRadius: 14, padding: '14px 8px', alignItems: 'center', gap: 6 }}>
        {[0, 3].map((i) => (
          <div key={i} className="title ink" style={{ letterSpacing: 3, fontSize: 20, userSelect: 'all' }}>
            {groups.slice(i, i + 3).join('  ')}
          </div>
        ))}
      </div>
      <span className="tiny soft">
        Saat bertemu langsung atau lewat telepon video, minta {name} membuka layar ini juga. Kalau keenam kelompok angkanya sama persis, kunci kalian tidak ditukar siapa pun di tengah jalan. Kalau berbeda, jangan bagikan hal penting dulu dan kabari kami.
      </span>
    </div>
  );
}

function LinkText({ children, onClick, danger }: { children: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="small" style={{ background: 'none', border: 0, padding: '6px 0', color: danger ? 'var(--danger)' : 'var(--ink)' }}>
      {children}
    </button>
  );
}

function MemberRow({ circle, member, nicknames, names, onChanged }: { circle: CircleView; member: CircleMember; nicknames: Nickname[]; names: Map<string, string>; onChanged: () => void }) {
  const { me, identity } = useSession();
  const qc = useQueryClient();
  const isMe = member.userId === me?.user.id;
  const given = nicknames.filter((n) => n.targetId === member.userId);
  const fromOthers = given.filter((n) => n.giverId !== me?.user.id);
  const mineEnc = given.find((n) => n.giverId === me?.user.id)?.nicknameEnc;
  const mineText = mineEnc ? openCircleText(circle, mineEnc, '') : '';
  const [nick, setNick] = useState(mineText);
  const [open, setOpen] = useState<'none' | 'code' | 'block'>('none');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const frozen = circle.status !== 'active';
  const canAct = !isMe && member.state === 'active';

  const saveNick = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/circles/${circle.id}/nicknames/${member.userId}`, { nicknameEnc: sealCircleText(circle, nick.trim()) });
      setSaved(true);
      onChanged();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/blocks/${member.userId}`);
      await qc.invalidateQueries({ queryKey: qk.circles });
      void qc.invalidateQueries({ queryKey: ['blocks'] });
      if (circle.kind === 'duo') navigate('/lingkaran', { replace: true });
      else setOpen('none');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card col" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 12 }}>
        <Avatar doodle={member.doodle} size={44} dim={member.state === 'remembered'} />
        <div className="grow">
          <div>
            {member.penName}
            {isMe ? <span className="soft"> (kamu)</span> : null}
          </div>
          <div className="tiny soft">
            {member.state === 'remembered' ? 'dikenang' : (ROLE[member.role] ?? member.role)} · sejak {formatDate(member.joinedAt)}
          </div>
        </div>
      </div>

      {fromOthers.length ? (
        <div className="col" style={{ gap: 4 }}>
          <span className="label">{isMe ? 'julukan dari teman-temanmu' : 'julukan dari yang lain'}</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {fromOthers.map((n) => (
              <span key={n.giverId} className="small" style={{ background: 'var(--sticky-yellow)', color: 'var(--text)', borderRadius: 6, padding: '5px 10px' }}>
                “{openCircleText(circle, n.nicknameEnc)}”<span className="tiny" style={{ opacity: 0.6 }}> dari {names.get(n.giverId) ?? 'seseorang'}</span>
              </span>
            ))}
          </div>
        </div>
      ) : isMe ? (
        <span className="tiny soft">Belum ada julukan tokoh untukmu. Itu diberikan teman, bukan dipilih sendiri.</span>
      ) : null}

      {!isMe && member.state !== 'left' && !frozen ? (
        <div className="col" style={{ gap: 6 }}>
          <span className="label">julukan tokoh darimu</span>
          <input
            className="field"
            value={nick}
            maxLength={40}
            placeholder="mis. Si Penjaga Senja"
            onChange={(e) => {
              setNick(e.target.value);
              setSaved(false);
            }}
          />
          {nick.trim() && nick.trim() !== mineText.trim() ? (
            <button className="btn soft sm" onClick={() => void saveNick()} disabled={busy}>
              {busy && open === 'none' ? 'menyimpan…' : 'simpan julukan'}
            </button>
          ) : saved ? (
            <span className="tiny ink-soft">julukan tersimpan · terenkripsi untuk lingkaran ini</span>
          ) : null}
        </div>
      ) : null}

      {canAct ? (
        <>
          <div className="row wrap" style={{ gap: 8 }}>
            <LinkText onClick={() => setOpen(open === 'code' ? 'none' : 'code')}>kode keamanan</LinkText>
            <span className="small soft">·</span>
            <LinkText onClick={() => navigate(`/lapor?userId=${encodeURIComponent(member.userId)}&circleId=${encodeURIComponent(circle.id)}`)}>laporkan</LinkText>
            <span className="small soft">·</span>
            <LinkText danger onClick={() => setOpen(open === 'block' ? 'none' : 'block')}>
              blokir
            </LinkText>
          </div>
          {open === 'code' && identity ? <SafetyCode mine={identity.publicKey} theirs={member.publicKey} name={member.penName} /> : null}
          {open === 'block' ? (
            <ConfirmCard
              title={`Blokir ${member.penName}?`}
              body="Isi darinya tidak akan sampai kepadamu lagi, dan isimu tidak sampai kepadanya. Dia tidak diberi tahu."
              note={circle.kind === 'duo' ? 'Di Duo, memblokir juga berarti keluar: arsip kalian dibekukan seperti Mode Pisah.' : 'Kalian tetap di lingkaran yang sama, tapi tidak saling melihat.'}
              confirmLabel="ya, blokir"
              onConfirm={() => void block()}
              onCancel={() => setOpen('none')}
              busy={busy}
              danger
            />
          ) : null}
        </>
      ) : null}
      <ErrText>{err}</ErrText>
    </div>
  );
}

function CircleMembers({ circle }: { circle: CircleView }) {
  const q = useQuery({ queryKey: ['nicknames', circle.id], queryFn: () => api.get<Nickname[]>(`/circles/${circle.id}/nicknames`) });
  const names = new Map(circle.members.map((m) => [m.userId, m.penName]));
  const members = circle.members.filter((m) => m.state !== 'left');
  return (
    <div className="col" style={{ gap: 10 }}>
      {members.map((m) => (
        <MemberRow key={`${m.userId}:${q.isSuccess}`} circle={circle} member={m} nicknames={q.data ?? []} names={names} onChanged={() => void q.refetch()} />
      ))}
    </div>
  );
}

// ── AI cloud ────────────────────────────────────────────────────────────────

function AiConsent({ circle, onSaved }: { circle: CircleView; onSaved: Refresh }) {
  const { me } = useSession();
  const p = COPY.privacy;
  const activeIds = new Set(circle.active.map((m) => m.userId));
  const consents = circle.aiConsent.filter((x) => activeIds.has(x.userId));
  const agreed = consents.filter((x) => x.granted).length;
  const total = circle.active.length;
  const mine = consents.find((x) => x.userId === me?.user.id)?.granted ?? false;
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = async (granted: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/circles/${circle.id}/ai-consent`, { granted });
      await onSaved();
      setAsking(false);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="col" style={{ gap: 10 }}>
      <ListCard style={{ padding: '6px 16px' }}>
        {p.aiTiers.map((t, i) => (
          <div key={t.name}>
            {i ? <Hr /> : null}
            <div style={{ padding: '8px 0' }}>
              <div className="small ink">
                {i + 1}. {t.name}
              </div>
              <div className="tiny soft">{t.body}</div>
            </div>
          </div>
        ))}
      </ListCard>
      <div className="row" style={{ gap: 10 }}>
        <Doodle id="ui-peluk" size={22} />
        <span className="small">{p.aiConsentProgress(agreed, total)}</span>
      </div>
      {asking ? (
        <ConfirmCard
          title={p.aiConsentTitle}
          body={p.aiCloudWarning}
          note={`${p.aiOffers} Persetujuanmu bisa ditarik kapan saja, dan AI cloud langsung mati lagi untuk semua.`}
          confirmLabel="aku setuju"
          cancelLabel="belum"
          onConfirm={() => void set(true)}
          onCancel={() => setAsking(false)}
          busy={busy}
          error={err}
        />
      ) : mine ? (
        <div className="col" style={{ gap: 8 }}>
          <Note color="peach">{`Kamu sudah setuju. ${p.aiCloudWarning}`}</Note>
          <button className="btn ghost" onClick={() => void set(false)} disabled={busy}>
            {busy ? 'menyimpan…' : 'tarik persetujuanku'}
          </button>
        </div>
      ) : (
        <button className="btn soft" onClick={() => setAsking(true)} disabled={circle.status !== 'active'}>
          aku setuju menyalakan AI cloud
        </button>
      )}
      {err && !asking ? <ErrText>{err}</ErrText> : null}
    </div>
  );
}

// ── Kapsul Momen (tanpa pembelian: semua paket tersedia) ────────────────────

function MomentInfo({ circle }: { circle: CircleView }) {
  const tier: MomentTier = circle.moment?.tier ?? 'coba';
  const guests = circle.members.filter((m) => m.state !== 'left').length;
  return (
    <div className="card row" style={{ gap: 12 }}>
      <Doodle id="kembang-api" size={30} />
      <div className="grow">
        <div className="row between">
          <span className="ink">Kapsul Momen · {MOMENT_TIERS[tier].label.toLowerCase()}</span>
          <span className="tiny soft">
            {guests} dari {MOMENT_TIERS[tier].maxGuests} tamu
          </span>
        </div>
        {circle.moment ? (
          <div className="tiny soft">
            acara {circle.moment.startsOn} sampai {circle.moment.endsOn}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Mode ────────────────────────────────────────────────────────────────────

function ModeCard({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="card col" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 10 }}>
        <Doodle id={icon} size={28} />
        <span className="h2">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SplitMode({ circle, onDone }: { circle: CircleView; onDone: Refresh }) {
  const t = COPY.modes.split;
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/split`);
      await onDone();
      setAsking(false);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModeCard icon="daun-kering" title={t.title}>
      <p className="small" style={{ margin: 0 }}>{t.body}</p>
      <span className="tiny soft">{t.limit}</span>
      {asking ? (
        <ConfirmCard title={t.confirmTitle} body={t.confirmBody} confirmLabel={t.confirmCta} cancelLabel={t.cancel} onConfirm={() => void run()} onCancel={() => setAsking(false)} busy={busy} error={err} danger />
      ) : (
        <button className="btn ghost" onClick={() => setAsking(true)}>
          mulai Mode Pisah
        </button>
      )}
    </ModeCard>
  );
}

function MemorialMode({ circle, onDone }: { circle: CircleView; onDone: Refresh }) {
  const t = COPY.modes.memorial;
  const [who, setWho] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const person = circle.others.find((m) => m.userId === who);
  const run = async () => {
    if (!person) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<{ confirmed: boolean; votes: number; needed: number }>(`/circles/${circle.id}/memorial`, { userId: person.userId });
      const left = r.needed - r.votes;
      setResult(
        r.confirmed
          ? t.done(person.penName)
          : `Terima kasih. Untuk lingkaran, perlu ${left === 1 ? 'satu' : left} konfirmasi lagi dari anggota lain sebelum halaman ${person.penName} disimpan sebagai kenangan. Tidak ada pemberitahuan yang dikirim kepadanya.`,
      );
      setAsking(false);
      setWho(null);
      await onDone();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  if (!circle.others.length) return null;
  return (
    <ModeCard icon="lilin" title={t.title}>
      <p className="small" style={{ margin: 0 }}>{t.body}</p>
      {result ? <Note color="blue">{result}</Note> : null}
      {asking && person ? (
        <ConfirmCard title={t.confirmTitle(person.penName)} body={t.confirmBody} confirmLabel={t.confirmCta} cancelLabel={t.cancel} onConfirm={() => void run()} onCancel={() => setAsking(false)} busy={busy} error={err} />
      ) : (
        <>
          <span className="tiny soft">untuk siapa?</span>
          <Choice
            options={circle.others.map((m) => ({ value: m.userId, label: m.memorialVotes?.length ? `${m.penName} · ${m.memorialVotes.length} konfirmasi` : m.penName }))}
            value={who ?? ''}
            onChange={setWho}
          />
          {circle.kind !== 'duo' ? <span className="tiny soft">Di lingkaran, dua anggota perlu mengonfirmasi. Orang yang ditandai keliru bisa membatalkannya sendiri.</span> : null}
          <button className="btn ghost" onClick={() => setAsking(true)} disabled={!person}>
            lanjut
          </button>
        </>
      )}
    </ModeCard>
  );
}

function MemorialLock({ circle, onDone }: { circle: CircleView; onDone: Refresh }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = async (locked: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/memorial/lock?locked=${locked ? 1 : 0}`);
      await onDone();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ListCard>
      <Toggle
        label={busy ? 'menyimpan…' : 'Kunci arsip sebagai kapsul kenangan'}
        hint="Hari-hari di sini disimpan rapat dan tidak muncul di Kenangan atau Wrap sampai kalian membukanya lagi. Tidak ada yang dihapus."
        value={circle.memorialLocked}
        onChange={(v) => (busy ? undefined : void set(v))}
      />
      <ErrText>{err}</ErrText>
    </ListCard>
  );
}

function RememberedUndo({ circle, onDone }: { circle: CircleView; onDone: Refresh }) {
  const [busy, setBusy] = useState(false);
  return (
    <Note color="peach" style={{ marginTop: 12 }}>
      <div className="col" style={{ gap: 8 }}>
        <span className="small">Halamanmu di lingkaran ini sedang disimpan sebagai kenangan. Kalau ini keliru, kamu bisa membatalkannya.</span>
        <button
          className="btn ghost sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.post(`/circles/${circle.id}/memorial/undo`);
              await onDone();
            } finally {
              setBusy(false);
            }
          }}>
          {busy ? 'sebentar…' : 'batalkan, aku masih di sini'}
        </button>
      </div>
    </Note>
  );
}

function Leave({ circle }: { circle: CircleView }) {
  const t = COPY.modes.leave;
  const qc = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/leave`);
      await qc.invalidateQueries({ queryKey: qk.circles });
      navigate('/lingkaran', { replace: true });
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  };
  return asking ? (
    <ConfirmCard
      title={`${t.title}?`}
      body={t.body}
      note={circle.kind === 'duo' && circle.status === 'active' ? `${t.note} Di Duo, keluar juga membekukan arsip kalian berdua.` : t.note}
      confirmLabel={t.confirmCta}
      cancelLabel={t.cancel}
      onConfirm={() => void run()}
      onCancel={() => setAsking(false)}
      busy={busy}
      error={err}
      danger
    />
  ) : (
    <div className="col" style={{ gap: 8 }}>
      <span className="small soft">{t.body}</span>
      <button className="btn danger" onClick={() => setAsking(true)}>
        keluar dari lingkaran
      </button>
    </div>
  );
}

// ── Layar ───────────────────────────────────────────────────────────────────

type ToggleKey = 'oneYearAgo' | 'yellowingPages' | 'lostLetters' | 'nightQuestion' | 'seasons';

export default function CircleSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const circle = useCircle(id);
  const qc = useQueryClient();
  const [local, setLocal] = useState<Partial<CircleSettings>>({});
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!circle)
    return (
      <main className="screen">
        <Header title="pengaturan" backTo={`/l/${id}`} />
        <Growing />
      </main>
    );

  const refresh = () => qc.invalidateQueries({ queryKey: qk.circles });
  const s: CircleSettings = { ...circle.settings, ...local };
  const frozen = circle.status !== 'active';
  const isMoment = circle.kind === 'moment';
  const meActive = circle.me?.state === 'active';
  const hasRemembered = circle.members.some((m) => m.state === 'remembered');

  const setSetting = async <K extends keyof CircleSettings>(k: K, v: CircleSettings[K]) => {
    const drop = (x: Partial<CircleSettings>) => {
      const next = { ...x };
      delete next[k];
      return next;
    };
    setLocal((x) => ({ ...x, [k]: v }));
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`/circles/${circle.id}`, { settings: { [k]: v } });
      await refresh();
      setLocal(drop);
    } catch (e) {
      setLocal(drop);
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (k: ToggleKey, label: string, hint: string) => <Toggle label={label} hint={hint} value={s[k]} onChange={(v) => (frozen ? undefined : void setSetting(k, v))} />;

  return (
    <main className="screen">
      <Header
        title="pengaturan"
        sub={`${circle.name} · ${CIRCLE_KIND_LABEL[circle.kind].toLowerCase()}`}
        backTo={`/l/${circle.id}`}
        right={saving ? <span className="tiny ink-soft">menyimpan…</span> : undefined}
      />

      {frozen ? (
        <Note color="blue" icon={circle.status === 'memorial' ? 'lilin' : 'daun-kering'}>
          {circle.status === 'split' ? COPY.modes.split.done : circle.status === 'memorial' ? COPY.modes.memorial.body : 'Acara ini sudah selesai. Arsipnya tetap bisa dibuka kapan saja.'}
        </Note>
      ) : null}
      {circle.me?.state === 'remembered' || (circle.me?.memorialVotes?.length ?? 0) > 0 ? <RememberedUndo circle={circle} onDone={refresh} /> : null}
      {err ? (
        <Note color="peach" style={{ marginTop: 12 }}>
          {err}
        </Note>
      ) : null}

      {!frozen ? (
        <Section title="nama & doodle">
          <NameAndDoodle circle={circle} onSaved={refresh} />
        </Section>
      ) : null}

      {isMoment ? (
        <Section title="kapsul momen">
          <MomentInfo circle={circle} />
        </Section>
      ) : null}

      <Section title="fitur melankolis">
        <p className="small soft" style={{ margin: '0 0 8px' }}>
          Ada masa ketika kenangan terasa terlalu dekat. Matikan kapan saja; tidak ada yang hilang, hanya berhenti muncul.
        </p>
        <ListCard>
          {toggle('oneYearAgo', 'Setahun Lalu', 'Hari yang sama dari tahun-tahun lalu muncul di Kenangan.')}
          <Hr />
          {toggle('yellowingPages', 'Halaman Menguning', 'Hari lama yang jarang dikunjungi perlahan menguning. Kunjungi sebentar, warnanya hidup lagi.')}
          <Hr />
          {toggle('lostLetters', 'Surat Tersesat', 'Surat yang tiba di waktu acak, satu sampai dua belas bulan setelah ditulis.')}
        </ListCard>
      </Section>

      <Section title="ritual">
        <ListCard>
          {toggle('nightQuestion', 'Pertanyaan Malam', 'Satu pertanyaan kecil menjelang tidur, sama untuk semua anggota.')}
          <Hr />
          {toggle('seasons', 'Musim Bersama', 'Ramadan, mudik, 17-an, akhir tahun: kartu dan tema musiman ikut mampir.')}
        </ListCard>
      </Section>

      {!isMoment && meActive ? (
        <Section title="halamanku untuk lingkaran ini">
          <ListCard>
            <Toggle
              label="halaman sendiri"
              hint={
                circle.me?.ownPage
                  ? 'Lingkaran ini punya halaman harian khusus darimu, dan tidak melihat halaman utamamu.'
                  : 'Lingkaran ini menerima halaman utamamu. Nyalakan kalau ingin menulis hal yang berbeda untuk mereka (misalnya sahabat, bukan pasangan).'
              }
              value={!!circle.me?.ownPage}
              onChange={(v) =>
                void api
                  .put(`/circles/${circle.id}/own-page`, { ownPage: v })
                  .then(() => refresh())
                  .catch((e) => setErr(errMsg(e)))
              }
            />
          </ListCard>
        </Section>
      ) : null}

      <Section title="cara kapsul terbuka">
        <div className="col" role="radiogroup" style={{ gap: 8 }}>
          {(
            [
              { v: 'after_seal', label: 'setelah menyegel', body: COPY.seal.giveFirst },
              { v: 'open', label: 'terbuka kapan saja', body: 'Drop langsung bisa dibaca begitu dijatuhkan. Cocok untuk Kapsul Momen, atau lingkaran yang ingin lebih santai.' },
            ] as const
          ).map((o) => {
            const on = s.revealMode === o.v;
            return <OptionCard key={o.v} on={on} title={o.label} body={o.body} disabled={frozen} onClick={() => (frozen || on ? undefined : void setSetting('revealMode', o.v))} />;
          })}
          <span className="tiny soft">
            Kami masih belajar cara mana yang terasa lebih hangat untuk lingkaran seperti kalian, jadi sebagian lingkaran baru dimulai dengan cara yang berbeda. Tidak ada yang benar atau salah; pilih yang paling nyaman, dan ganti kapan saja.
          </span>
        </div>
      </Section>

      <Section title="orang-orang di sini">
        <CircleMembers circle={circle} />
      </Section>

      {!isMoment ? (
        <Section title="AI cloud (opsional)">
          <AiConsent circle={circle} onSaved={refresh} />
        </Section>
      ) : null}

      {meActive && (!frozen || hasRemembered || circle.status === 'memorial') ? (
        <Section title="saat hidup berubah">
          <div className="col" style={{ gap: 10 }}>
            {!frozen && circle.kind === 'duo' ? <SplitMode circle={circle} onDone={refresh} /> : null}
            {!frozen && !isMoment ? <MemorialMode circle={circle} onDone={refresh} /> : null}
            {hasRemembered || circle.status === 'memorial' ? <MemorialLock circle={circle} onDone={refresh} /> : null}
          </div>
        </Section>
      ) : null}

      {circle.me && circle.me.state !== 'left' ? (
        <Section title="keluar">
          <Leave circle={circle} />
        </Section>
      ) : null}

      <div className="mt-lg">
        <Bullets items={[COPY.privacy.noSurveillance]} />
      </div>
    </main>
  );
}
