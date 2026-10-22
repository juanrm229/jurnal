import { COPY, HELP_RESOURCES, type HelpResource } from '@sehari/core';
import { Doodle, Header } from '@/ui/kit';

interface Action {
  label: string;
  url: string;
}

/** "119 ext. 8" → tel:119, "WA 08111-129-129" → wa.me, URL → apa adanya. */
function actionsFor(r: HelpResource): Action[] {
  return r.contact
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part): Action => {
      if (/^https?:\/\//.test(part)) return { label: `buka ${part.replace(/^https?:\/\//, '').replace(/\/$/, '')}`, url: part };
      if (/^WA\b/i.test(part)) return { label: `chat ${part}`, url: `https://wa.me/${part.replace(/\D/g, '').replace(/^0/, '62')}` };
      return { label: `telepon ${part}`, url: `tel:${part.split(/ext/i)[0]!.replace(/[^\d+]/g, '')}` };
    });
}

export default function Bantuan() {
  return (
    <main className="screen">
      <Header title="bantuan" sub="untuk hari yang berat" backTo="/aku" />
      <div className="col center" style={{ alignItems: 'center' }}>
        <Doodle id="lilin" size={64} className="breathe" draw />
        <p className="hand" style={{ fontSize: 32, lineHeight: 1.05, margin: 0 }}>Kamu tidak harus memikulnya sendirian.</p>
        <p className="soft">{COPY.silentRoom.helpLead}</p>
      </div>
      <div className="sticky mt-lg" style={{ background: 'var(--sticky-peach)' }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
          <Doodle id="lampu" size={26} />
          <span className="small">{COPY.silentRoom.emergencyLead}</span>
        </div>
        <a className="btn auto sm mt" href="tel:112">telepon 112</a>
      </div>
      <section className="section">
        <span className="label">layanan yang bisa dihubungi</span>
        <div className="col" style={{ gap: 10 }}>
          {HELP_RESOURCES.map((r) => (
            <div key={r.name} className="card col" style={{ gap: 6 }}>
              <span className="h2 ink">{r.name}</span>
              <span className="small soft">{r.description}</span>
              <div className="row wrap">
                {actionsFor(r).map((a) => (
                  <a key={a.url} className="pill" href={a.url} target={a.url.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{a.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="tiny soft center mt-lg">Sehari bukan layanan darurat dan tidak memantau isi jurnalmu — kami memang tidak bisa membacanya.</p>
    </main>
  );
}
