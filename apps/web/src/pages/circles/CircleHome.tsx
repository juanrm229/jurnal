/**
 * Beranda Kita: satu gulungan. Dibuka oleh dua halaman hari ini yang
 * berdampingan (punya dia sudah jadi amplop bersegel, punyamu masih terbuka),
 * satu tindakan utama yang mengikuti keadaan, lalu Si Benih, pertanyaan malam,
 * minggu ini, dan dunia kalian.
 */
import { type CSSProperties, useEffect, useState } from 'react';
import { CIRCLE_KIND_LABEL, COPY, findCard, isoWeek, nightQuestionFor, penHolderFor, wrapHistory, type SceneWire } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { type CircleView, memberName, openCircleText, useCircle, useCircles, useMe, useMyDay, useToday } from '@/lib/data';
import { useDreams } from '@/lib/dreams';
import { Link, useParams } from '@/lib/router';
import { excerpt, useCircleWorks } from '@/lib/works';
import { countdown, fmtWhen, useCircleMeets } from '@/lib/meets';
import { Cover } from '@/pages/karya/Cover';
import { BerduaCard } from './Berdua';
import { PlantCard } from './Plant';
import { RollCard } from './RollCard';
import { TogetherToday } from './Questions';
import { DatesCard } from './Dates';
import { sound } from '@/lib/sound';
import { store } from '@/lib/storage';
import { Avatar, Doodle, Flame, Growing } from '@/ui/kit';
import { ScreenTitle } from '@/ui/shell';

/** Dunia kalian: empat yang paling sering dulu, sisanya di balik "semua". */
const WORLD: { path: string; label: string; doodle: string; moment?: boolean }[] = [
  { path: 'papan', label: 'papan', doodle: 'peta' },
  { path: 'kitab', label: 'kitab', doodle: 'buku-terbuka' },
  { path: 'langit', label: 'langit', doodle: 'ui-bintang-rasi', moment: true },
  { path: 'lemari', label: 'lemari', doodle: 'kunci' },
  { path: 'lagu', label: 'rak lagu', doodle: 'piringan-hitam', moment: true },
  { path: 'inspirasi', label: 'inspirasi', doodle: 'ui-ide', moment: true },
  { path: 'photobox', label: 'photobox', doodle: 'bingkai-polaroid', moment: true },
  { path: 'ekspedisi', label: 'ekspedisi', doodle: 'kompas' },
  { path: 'kamus', label: 'kamus', doodle: 'ui-kata' },
  { path: 'puisi', label: 'puisi temuan', doodle: 'pena', moment: true },
  { path: 'dadu', label: 'dadu', doodle: 'dadu' },
  { path: 'mimpi', label: 'mimpi', doodle: 'bulan', moment: true },
];

export default function CircleHome() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const circle = useCircle(id);
  const { circles } = useCircles();
  const scenes = useQuery({ queryKey: ['scenes', id], queryFn: () => api.get<SceneWire[]>(`/circles/${id}/scenes`), enabled: !!circle });
  const [all, setAll] = useState(false);
  useEffect(() => {
    if (circle) store.set('lastCircle', id);
  }, [id, !!circle]);
  if (!circle) return <Growing />;

  const mine = circles.filter((c) => c.status === 'active' && c.me?.state === 'active');
  const week = isoWeek(today);
  const scene = scenes.data?.find((s) => s.week === week);
  const holderId = scene?.penHolderId ?? penHolderFor(circle.active.map((m) => m.userId), week, circle.id);
  const holder = circle.members.find((m) => m.userId === holderId);
  const sharedCard = scene?.cardId ? findCard(scene.cardId)?.card : undefined;
  const sceneTitle = scene?.titleEnc ? openCircleText(circle, scene.titleEnc, '') : '';
  const q = circle.settings.nightQuestion && circle.kind !== 'moment' ? nightQuestionFor(circle.id, today, circle.kind) : null;
  const frozen = circle.status !== 'active';
  const moment = circle.kind === 'moment';
  const room = circle.active.length < (circle.kind === 'duo' ? 2 : moment ? 400 : 8);
  const s = circle.streak;
  const world = WORLD.filter((f) => !moment || f.moment);
  const shown = all ? world : world.slice(0, 4);
  const thisWeek = wrapHistory(circle.createdDay, today).weeks.find((w) => w.current);

  return (
    <main className="screen kita">
      {mine.length > 1 ? (
        <nav className="kita-switch" aria-label="lingkaran">
          {mine.map((c) => (
            <Link key={c.id} to={`/l/${c.id}`} className={`pill ${c.id === id ? 'active' : ''}`} aria-current={c.id === id ? 'page' : undefined}>
              <Doodle id={c.doodle} size={16} color="currentColor" /> {c.name}
            </Link>
          ))}
          <Link to="/lingkaran" className="pill" aria-label="semua lingkaran">
            <Doodle id="ui-tambah" size={14} color="currentColor" />
          </Link>
        </nav>
      ) : null}
      <ScreenTitle
        title={<span className={circle.name.length > 12 ? 'long' : undefined}>{circle.name}</span>}
        sub={
          <span title={s.next ? `${s.next.remaining} hari lagi ke ${s.next.name} · api terpanjang ${s.longest}` : `api terpanjang ${s.longest}`}>
            {CIRCLE_KIND_LABEL[circle.kind].toLowerCase()} · <b>{s.togetherDays}</b> hari bersama · api <b>{s.current}</b>
          </span>
        }
        right={
          <Link to={`/l/${id}/atur`} className="icon-btn" aria-label="pengaturan">
            <Doodle id="ui-pengaturan" size={22} />
          </Link>
        }
      />

      {circle.status === 'memorial' ? (
        <div className="card col center" style={{ alignItems: 'center', border: '1.5px dashed var(--ink-soft)' }}>
          <Doodle id="lilin" size={40} className="breathe" />
          <p>{COPY.modes.memorial.body}</p>
        </div>
      ) : circle.status === 'split' ? (
        <div className="card col center" style={{ alignItems: 'center' }}>
          <Doodle id="daun-kering" size={40} />
          <p>{COPY.modes.split.done}</p>
        </div>
      ) : null}

      <TodayPair circle={circle} meId={me.user.id} today={today} invite={!frozen && room} />

      {!moment && circle.status !== 'memorial' ? (
        <PlantCard circle={circle} />
      ) : (
        <div className="card row between">
          <span>
            <span className="label" style={{ display: 'block' }}>api bersama</span>
            <span className="tiny soft">terpanjang {s.longest} hari</span>
          </span>
          <Flame level={s.flame} days={s.current} size={34} />
        </div>
      )}

      {!moment && !frozen ? (
        <section className="section">
          <span className="label">hari ini bersama</span>
          <TogetherToday circle={circle} q={q} quiz />
        </section>
      ) : null}

      <BerduaCard circle={circle} />

      <section className="section">
        <span className="label">minggu ini</span>
        <div className="card ch-list">
          {!moment ? (
            <>
              <Link to={`/l/${id}/kitab`} className="ch-row">
                <Doodle id="pena" size={26} />
                <span className="grow">
                  <span className="small" style={{ display: 'block' }}>
                    Pena dipegang <b className="ink">{holder?.userId === me.user.id ? 'kamu' : (holder?.penName ?? '…')}</b>
                  </span>
                  <span className="tiny soft">{sceneTitle ? <span className="hand ink" style={{ fontSize: 20 }}>“{sceneTitle}”</span> : 'memberi judul adegan & memilih kartu bersama'}</span>
                </span>
                <Doodle id="ui-panah-kanan" size={16} />
              </Link>
              <RollCard circleId={id} week={week} members={circle.active.length} />
            </>
          ) : null}
          <MeetRow circleId={id} />
          <DreamRow circleId={id} />
          {thisWeek ? (
            <Link to={`/wrap/${id}/week/${thisWeek.key}`} className="ch-row">
              <Doodle id="amplop" size={26} />
              <span className="grow">
                <span className="small" style={{ display: 'block' }}>
                  <b className="ink">Minggu Kita</b> · {thisWeek.label}
                </span>
                <span className="tiny soft">cerita minggu ini; yang lama ada di rak</span>
              </span>
              <Doodle id="ui-panah-kanan" size={16} />
            </Link>
          ) : null}
        </div>
        {sharedCard ? (
          <Link to={`/hari?${new URLSearchParams({ prompt: sharedCard.body, cardId: sharedCard.id, kind: sharedCard.kind === 'tantangan' ? 'photo' : 'card', circleId: circle.id })}`} className="sticky row mt" style={{ background: 'var(--sticky-yellow)', alignItems: 'flex-start', gap: 12 }}>
            <Doodle id={sharedCard.doodle ?? 'kartu'} size={30} />
            <span>
              <span className="label" style={{ display: 'block' }}>kartu bersama · {sharedCard.title}</span>
              <span className="small">{sharedCard.body}</span>
            </span>
          </Link>
        ) : null}
      </section>

      {!moment && circle.status === 'active' ? (
        <section className="section">
          <DatesCard circle={circle} />
        </section>
      ) : null}

      <CircleWorks circleId={id} />

      <section className="section">
        <span className="label">dunia kalian</span>
        <div className="world">
          {shown.map((f, i) => (
            <Link key={f.path} to={`/l/${id}/${f.path}`} className="world-tile" style={{ '--n': i } as CSSProperties}>
              <Doodle id={f.doodle} size={28} />
              {f.label}
            </Link>
          ))}
          {world.length > 4 ? (
            <button
              className="world-tile world-more"
              style={{ '--n': shown.length } as CSSProperties}
              aria-expanded={all}
              onClick={() => {
                setAll(!all);
                sound.play('pop');
              }}
              data-testid="world-more">
              <Doodle id={all ? 'ui-tutup' : 'ui-panah-kanan'} size={22} />
              {all ? 'ringkas' : 'semua'}
            </button>
          ) : null}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <Link className="btn soft sm grow" to={`/surat/tulis?circleId=${id}&kind=lost`}>
            <Doodle id="surat-botol" size={18} /> surat tersesat
          </Link>
          <Link className="btn soft sm grow" to={`/surat/tulis?circleId=${id}&kind=future`}>
            <Doodle id="jam-pasir" size={18} /> surat untuk nanti
          </Link>
        </div>
      </section>

      {mine.length <= 1 ? (
        <p className="tiny soft center" style={{ marginTop: 28 }}>
          <Link to="/lingkaran">lingkaran lain, atau buat yang baru</Link>
        </p>
      ) : null}
    </main>
  );
}

/**
 * Dua halaman hari ini berdampingan. Memberi dulu baru menerima: yang sudah
 * menyegel tampil sebagai amplop berlak, yang belum masih kertas terbuka.
 */
function TodayPair({ circle, meId, today, invite }: { circle: CircleView; meId: string; today: string; invite: boolean }) {
  const my = useMyDay(today);
  const people = [...circle.active].sort((a, b) => Number(b.userId === meId) - Number(a.userId === meId));
  const faces = people.slice(0, 7);
  const sealed = (uid: string) => !!circle.todaySealed[uid];
  const mine = sealed(meId);
  const count = my.data?.drops.length ?? 0;
  const waiting = circle.others.filter((m) => !sealed(m.userId)).map((m) => m.penName);
  const ready = circle.others.filter((m) => sealed(m.userId)).map((m) => m.penName);
  const frozen = circle.status !== 'active';
  const open = { to: `/l/${circle.id}/hari/${today}`, label: 'buka hari ini bersama', icon: 'buku-terbuka' };
  const cta = frozen || mine ? open : count ? { to: '/hari', label: 'segel untuk membuka', icon: 'segel-lilin' } : { to: '/hari', label: 'tulis harimu dulu', icon: 'pena' };
  const note = frozen
    ? null
    : mine
      ? waiting.length
        ? `Menunggu ${waiting.join(', ')} menyegel.`
        : circle.others.length
          ? 'Semua sudah menyegel. Halamannya terbuka.'
          : null
      : ready.length
        ? `${ready.join(', ')} sudah menyegel. Halamannya terbuka setelah kamu menyegel.`
        : 'Belum ada yang menyegel hari ini.';
  return (
    <section className={`card pair ${mine && !waiting.length && circle.others.length ? 'all' : ''}`} data-testid="today-pair">
      <span className="label">hari ini</span>
      <div className="pair-pages" style={{ '--cols': Math.min(4, Math.max(2, faces.length + (invite ? 1 : 0))) } as CSSProperties}>
        {faces.map((m, i) => {
          const on = sealed(m.userId);
          const me = m.userId === meId;
          return (
            <div key={m.userId} className={`pair-page ${on ? 'sealed' : 'open'}`} style={{ '--n': i } as CSSProperties}>
              <span className="pair-art">
                <Doodle id={on ? 'amplop' : 'pena'} size={on ? 46 : 36} draw={0.25 + i * 0.12} />
                {on ? <i className="pair-lak" aria-hidden /> : null}
              </span>
              <span className="pair-who">
                <Avatar doodle={m.doodle} size={18} />
                <b>{me ? 'kamu' : m.penName}</b>
              </span>
              <span className="tiny soft">{on ? 'tersegel' : me && count ? `${count} hal ditulis` : 'belum disegel'}</span>
            </div>
          );
        })}
        {people.length > faces.length ? (
          <div className="pair-page open" style={{ '--n': faces.length } as CSSProperties}>
            <span className="pair-art h2 ink">+{people.length - faces.length}</span>
            <span className="tiny soft">lainnya</span>
          </div>
        ) : null}
        {invite ? (
          <Link to={`/l/${circle.id}/undang`} className="pair-page invite" style={{ '--n': faces.length } as CSSProperties} aria-label={circle.kind === 'moment' ? 'QR & tautan untuk tamu' : 'undang'}>
            <span className="pair-art">
              <Doodle id="ui-qr" size={30} />
            </span>
            <b className="ink">{circle.kind === 'moment' ? 'QR tamu' : 'undang'}</b>
            <span className="tiny soft">kursi masih kosong</span>
          </Link>
        ) : null}
      </div>
      <Link to={cta.to} className="btn" data-testid="pair-cta">
        <Doodle id={cta.icon} size={22} color="currentColor" /> {cta.label}
      </Link>
      {note ? <p className="tiny soft center pair-note">{note}</p> : null}
      {cta !== open ? (
        <Link to={open.to} className="tiny center pair-peek">
          lihat halaman bersama
        </Link>
      ) : null}
    </section>
  );
}

function CircleWorks({ circleId }: { circleId: string }) {
  const me = useMe();
  const { circles } = useCircles();
  const { works } = useCircleWorks(circleId);
  const list = works.filter((w) => w.work);
  if (!list.length) return null;
  return (
    <section className="section">
      <div className="row between">
        <span className="label">karya di lingkaran ini</span>
        <Link to="/karya/tulis?jenis=esai" className="pill sm">+ tulis</Link>
      </div>
      {(
        <div className="mini-shelf">
          {list.slice(0, 12).map((w) => (
            <Link key={w.wire.id} to={`/karya/${w.wire.id}`} className="mini-book" title={w.work!.title}>
              <Cover work={w.work} author={w.wire.authorId === me.user.id ? 'kamu' : memberName(circles, w.wire.authorId, me.user.id)} size="sm" />
              <span className="tiny soft">{excerpt(w.work!.body, 50)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function MeetRow({ circleId }: { circleId: string }) {
  const { meets } = useCircleMeets(circleId);
  const now = Date.now();
  const next = meets.filter((m) => m.plan && m.wire.status === 'planned' && new Date(m.wire.startsAt).getTime() > now - 6 * 3600_000).sort((a, b) => a.wire.startsAt.localeCompare(b.wire.startsAt))[0];
  const done = meets.filter((m) => m.wire.members.filter((x) => x.metAt).length >= 2).length;
  return (
    <Link to={next ? `/janji/${next.wire.id}` : `/janji/baru?circleId=${circleId}`} className="ch-row">
      <Doodle id="tangan-bergandeng" size={26} className={next ? 'breathe' : undefined} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="small" style={{ display: 'block' }}>
          <b className="ink">{next ? next.plan!.title : 'Janji temu'}</b>
        </span>
        <span className="tiny soft">
          {next
            ? `${fmtWhen(next.wire.startsAt, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${next.plan!.place.name}`
            : done
              ? `${done} kali bertemu · buat janji berikutnya`
              : 'atur kencan atau kumpul berikutnya'}
        </span>
      </span>
      {next ? <span className="badge pub">{countdown(next.wire.startsAt, now)}</span> : <Doodle id="ui-panah-kanan" size={16} />}
    </Link>
  );
}

function DreamRow({ circleId }: { circleId: string }) {
  const { dreams } = useDreams(circleId);
  const done = dreams.filter((d) => d.wire.doneAt).length;
  const top = dreams.filter((d) => !d.wire.doneAt).sort((a, b) => b.wire.likes.length - a.wire.likes.length)[0];
  return (
    <Link to={`/l/${circleId}/mimpi`} className="ch-row">
      <Doodle id={top ? 'kompas' : 'bintang'} size={26} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="small" style={{ display: 'block' }}>
          <b className="ink">{top?.data?.title ?? 'Daftar mimpi bersama'}</b>
        </span>
        <span className="tiny soft">{dreams.length ? `${done} dari ${dreams.length} mimpi terwujud` : 'hal-hal yang ingin kalian lakukan bersama'}</span>
      </span>
      <Doodle id="ui-panah-kanan" size={16} />
    </Link>
  );
}
