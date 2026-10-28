import { CIRCLE_KIND_LABEL, COPY, findCard, isoWeek, monthKey, nightQuestionFor, penHolderFor, prevMonth, type SceneWire } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { openCircleText, useCircle, useMe, useToday } from '@/lib/data';
import { useDreams } from '@/lib/dreams';
import { Link, useParams } from '@/lib/router';
import { memberName, useCircles } from '@/lib/data';
import { excerpt, useCircleWorks } from '@/lib/works';
import { countdown, fmtWhen, useCircleMeets } from '@/lib/meets';
import { Cover } from '@/pages/karya/Cover';
import { Scene } from '@/ui/art';
import { Avatar, Doodle, Flame, Growing, Header } from '@/ui/kit';

const FEATURES: { path: string; label: string; doodle: string; hint: string }[] = [
  { path: 'papan', label: 'papan tahun', doodle: 'peta', hint: '365 petak, berjalan berdampingan' },
  { path: 'kitab', label: 'kitab', doodle: 'buku', hint: 'bab, adegan, jilid' },
  { path: 'langit', label: 'langit', doodle: 'ui-bintang-rasi', hint: 'hari-hari jadi rasi bintang' },
  { path: 'lemari', label: 'lemari benda', doodle: 'kunci', hint: 'token kenangan' },
  { path: 'ekspedisi', label: 'ekspedisi', doodle: 'kompas', hint: 'misi bersama 7 hari' },
  { path: 'kamus', label: 'kamus & motif', doodle: 'ui-kata', hint: 'bahasa kalian sendiri' },
  { path: 'puisi', label: 'puisi temuan', doodle: 'pena', hint: 'hitamkan kata seminggu' },
  { path: 'dadu', label: 'dadu kenangan', doodle: 'dadu', hint: 'sekali seminggu' },
];

const SCENE_FOR: Record<string, string> = { duo: 'dua-jendela', circle: 'rumah-kecil', chosen_family: 'rumah-kecil', moment: 'taman-tahun' };

export default function CircleHome() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const circle = useCircle(id);
  const scenes = useQuery({ queryKey: ['scenes', id], queryFn: () => api.get<SceneWire[]>(`/circles/${id}/scenes`), enabled: !!circle });
  if (!circle) return <Growing />;

  const week = isoWeek(today);
  const scene = scenes.data?.find((s) => s.week === week);
  const holderId = scene?.penHolderId ?? penHolderFor(circle.active.map((m) => m.userId), week, circle.id);
  const holder = circle.members.find((m) => m.userId === holderId);
  const sharedCard = scene?.cardId ? findCard(scene.cardId)?.card : undefined;
  const sceneTitle = scene?.titleEnc ? openCircleText(circle, scene.titleEnc, '') : '';
  const q = circle.settings.nightQuestion && circle.kind !== 'moment' ? nightQuestionFor(circle.id, today, circle.kind) : null;
  const frozen = circle.status !== 'active';
  const room = circle.active.length < (circle.kind === 'duo' ? 2 : circle.kind === 'moment' ? 400 : 8);

  return (
    <main className="screen">
      <Header
        title={circle.name}
        sub={CIRCLE_KIND_LABEL[circle.kind].toLowerCase()}
        backTo="/lingkaran"
        right={
          <Link to={`/l/${id}/atur`} className="icon-btn" aria-label="pengaturan">
            <Doodle id="ui-pengaturan" size={22} />
          </Link>
        }
      />
      <div style={{ maxWidth: 420, margin: '0 auto -10px' }}>
        <Scene id={circle.status === 'memorial' ? 'langit-malam' : (SCENE_FOR[circle.kind] ?? 'taman-tahun')} />
      </div>

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

      <div className="card mt">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <span className="label">api bersama</span>
            <Flame level={circle.streak.flame} days={circle.streak.current} size={36} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny soft">terpanjang {circle.streak.longest} · {circle.streak.togetherDays} hari bersama</div>
            {circle.streak.next ? <div className="tiny ink-soft">{circle.streak.next.remaining} hari lagi ke {circle.streak.next.name}</div> : null}
          </div>
        </div>
        <div className="row wrap mt" style={{ gap: 12 }}>
          {circle.members
            .filter((m) => m.state !== 'left')
            .map((m) => (
              <div key={m.userId} className="col center" style={{ alignItems: 'center', width: 64, gap: 2 }}>
                <Avatar doodle={m.doodle} size={44} sealed={circle.todaySealed[m.userId]} dim={m.state === 'remembered'} />
                <span className={`tiny ${m.userId === me.user.id ? 'ink' : ''}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 64 }}>{m.userId === me.user.id ? 'kamu' : m.penName}</span>
                <span className="tiny soft">{m.state === 'remembered' ? 'dikenang' : circle.todaySealed[m.userId] ? 'tersegel' : '·'}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="col mt">
        <Link to={`/l/${id}/hari/${today}`} className="btn">
          <Doodle id="buku-terbuka" size={22} color="currentColor" /> buka hari ini bersama
        </Link>
        {!frozen && room ? (
          <Link to={`/l/${id}/undang`} className="btn ghost">
            <Doodle id="ui-qr" size={20} color="currentColor" /> {circle.kind === 'moment' ? 'QR & tautan untuk tamu' : 'undang'}
          </Link>
        ) : null}
      </div>

      {circle.kind !== 'moment' ? (
        <section className="section">
          <span className="label">minggu ini</span>
          <Link to={`/l/${id}/kitab`} className="card row" style={{ gap: 12 }}>
            <Doodle id="pena" size={30} />
            <span>
              <span className="small" style={{ display: 'block' }}>Pena minggu ini dipegang <b className="ink">{holder?.userId === me.user.id ? 'kamu' : (holder?.penName ?? '…')}</b>.</span>
              <span className="tiny soft">Pemegang pena memberi judul adegan dan memilih kartu bersama.</span>
            </span>
          </Link>
          {sceneTitle ? <p className="hand center" style={{ fontSize: 26 }}>adegan minggu ini: {sceneTitle}</p> : null}
          {sharedCard ? (
            <Link to={`/hari?${new URLSearchParams({ prompt: sharedCard.body, cardId: sharedCard.id, kind: sharedCard.kind === 'tantangan' ? 'photo' : 'card', circleId: circle.id })}`} className="sticky row mt" style={{ background: 'var(--sticky-yellow)', alignItems: 'flex-start', gap: 12 }}>
              <Doodle id={sharedCard.doodle ?? 'kartu'} size={30} />
              <span>
                <span className="label" style={{ display: 'block' }}>kartu bersama · {sharedCard.title}</span>
                <span className="small">{sharedCard.body}</span>
              </span>
            </Link>
          ) : null}
          {q ? (
            <Link to={`/hari?${new URLSearchParams({ prompt: q.text, questionId: q.id, kind: 'answer', circleId: circle.id })}`} className="card row mt" style={{ gap: 12 }}>
              <Doodle id="bulan" size={30} />
              <span className="small">{q.text}</span>
            </Link>
          ) : null}
        </section>
      ) : null}

      <CircleMeets circleId={id} />
      <CircleDreams circleId={id} />
      <CircleWorks circleId={id} />

      <section className="section">
        <span className="label">cerita kita</span>
        <div className="row wrap">
          <Link className="pill" to={`/wrap/${id}/week/${week}`}><Doodle id="amplop" size={18} /> minggu kita</Link>
          <Link className="pill" to={`/wrap/${id}/month/${prevMonth(monthKey(today))}`}><Doodle id="pena" size={18} /> bulan kita</Link>
          <Link className="pill" to={`/wrap/${id}/year/${today.slice(0, 4)}`}><Doodle id="buku" size={18} /> tahun kita</Link>
          {circle.kind === 'moment' ? <Link className="pill" to={`/wrap/${id}/moment/${id}`}><Doodle id="kado" size={18} /> wrap acara</Link> : null}
        </div>
      </section>

      <section className="section">
        <span className="label">dikumpulkan bersama</span>
        <div className="rupa-tiles">
          <Link to={`/l/${id}/inspirasi`} className="rupa-tile t-board rise">
            <span className="rt-objs" aria-hidden>
              <span className="rt-sticky">ingin!</span>
              <span className="rupa-tag">Rp</span>
              <Doodle id="kamera" size={46} className="rt-obj" />
            </span>
            <span className="small ink">papan inspirasi</span>
            <span className="tiny soft">incaran, foto, tautan</span>
          </Link>
          <Link to={`/l/${id}/lagu`} className="rupa-tile t-songs rise" style={{ animationDelay: '0.05s' }}>
            <span className="rt-objs" aria-hidden>
              <span className="rt-sleeve a" />
              <span className="rt-sleeve b" />
              <Doodle id="piringan-hitam" size={50} className="rt-obj" />
            </span>
            <span className="small ink">rak lagu</span>
            <span className="tiny soft">dinding sampul kalian</span>
          </Link>
          <Link to={`/l/${id}/photobox`} className="rupa-tile t-booth rise" style={{ animationDelay: '0.1s' }}>
            <span className="rt-objs" aria-hidden>
              <span className="rt-strip a" />
              <span className="rt-strip b" />
            </span>
            <span className="small ink">photobox</span>
            <span className="tiny soft">strip kalian, juga jarak jauh</span>
          </Link>
        </div>
      </section>

      <section className="section">
        <span className="label">papan & kitab</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {FEATURES.filter((f) => circle.kind !== 'moment' || ['langit', 'puisi'].includes(f.path)).map((f, i) => (
            <Link key={f.path} to={`/l/${id}/${f.path}`} className="card col rise" style={{ gap: 6, animationDelay: `${i * 0.04}s` }}>
              <Doodle id={f.doodle} size={34} />
              <span className="small ink">{f.label}</span>
              <span className="tiny soft">{f.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <span className="label">surat</span>
        <div className="row">
          <Link className="btn soft grow" to={`/surat/tulis?circleId=${id}&kind=lost`}><Doodle id="surat-botol" size={20} /> surat tersesat</Link>
          <Link className="btn soft grow" to={`/surat/tulis?circleId=${id}&kind=future`}><Doodle id="jam-pasir" size={20} /> untuk nanti</Link>
        </div>
      </section>
    </main>
  );
}

function CircleWorks({ circleId }: { circleId: string }) {
  const me = useMe();
  const { circles } = useCircles();
  const { works } = useCircleWorks(circleId);
  const list = works.filter((w) => w.work);
  return (
    <section className="section">
      <div className="row between">
        <span className="label">karya di lingkaran ini</span>
        <Link to="/karya/tulis?jenis=esai" className="pill sm">+ tulis</Link>
      </div>
      {list.length === 0 ? (
        <p className="tiny soft">Belum ada esai, cerpen, atau puisi yang diterbitkan di sini.</p>
      ) : (
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

function CircleMeets({ circleId }: { circleId: string }) {
  const { meets } = useCircleMeets(circleId);
  const now = Date.now();
  const next = meets.filter((m) => m.plan && m.wire.status === 'planned' && new Date(m.wire.startsAt).getTime() > now - 6 * 3600_000).sort((a, b) => a.wire.startsAt.localeCompare(b.wire.startsAt))[0];
  const done = meets.filter((m) => m.wire.members.filter((x) => x.metAt).length >= 2).length;
  return (
    <section className="section">
      <div className="row between">
        <span className="label">janji temu</span>
        <Link to={`/janji/baru?circleId=${circleId}`} className="pill sm">+ janjian</Link>
      </div>
      {next ? (
        <Link to={`/janji/${next.wire.id}`} className="card row" style={{ gap: 14 }}>
          <Doodle id="tangan-bergandeng" size={34} className="breathe" />
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="h2 ink" style={{ display: 'block' }}>{next.plan!.title}</span>
            <span className="tiny soft">{fmtWhen(next.wire.startsAt, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {next.plan!.place.name}</span>
          </span>
          <span className="badge pub">{countdown(next.wire.startsAt, now)}</span>
        </Link>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          <Link to={`/janji/baru?circleId=${circleId}`} className="btn soft grow">buat janji</Link>
          <Link to="/janji/acak" className="btn soft grow"><Doodle id="ui-dadu" size={18} color="currentColor" /> acak</Link>
        </div>
      )}
      {done ? <p className="tiny soft">{done} kali bertemu · <Link to="/janji">lihat semua</Link></p> : null}
    </section>
  );
}

function CircleDreams({ circleId }: { circleId: string }) {
  const { dreams } = useDreams(circleId);
  const done = dreams.filter((d) => d.wire.doneAt).length;
  const top = dreams.filter((d) => !d.wire.doneAt).sort((a, b) => b.wire.likes.length - a.wire.likes.length)[0];
  return (
    <section className="section">
      <div className="row between">
        <span className="label">daftar mimpi bersama</span>
        <Link to={`/l/${circleId}/mimpi`} className="pill sm">{dreams.length ? `${done}/${dreams.length} terwujud` : '+ mimpi'}</Link>
      </div>
      <Link to={`/l/${circleId}/mimpi`} className="card row" style={{ gap: 14 }}>
        <Doodle id={top ? 'kompas' : 'bintang'} size={34} className="breathe" />
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="h2 ink" style={{ display: 'block' }}>{top?.data?.title ?? 'Hal-hal yang ingin kita lakukan bersama'}</span>
          <span className="tiny soft">{top ? `${top.wire.likes.length} orang ingin mewujudkannya` : 'bucket list kalian: tulis, jadikan janji, wujudkan'}</span>
        </span>
      </Link>
    </section>
  );
}
