/** Dek kartu. Di instalasi ini semuanya gratis: setiap dek sudah tersedia. */
import { type Deck, DECKS } from '@sehari/core';
import { Doodle, Header, Sticky } from '@/ui/kit';

const KIND_LABEL: Record<string, string> = { pertanyaan: 'pertanyaan', tantangan: 'tantangan', kenangan: 'kenangan', rahasia: 'rahasia' };
const COLORS = ['yellow', 'peach', 'green', 'blue'] as const;

function Samples({ deck }: { deck: Deck }) {
  const cards = deck.cards.filter((x) => !x.rare).slice(0, 3);
  return (
    <div className="row" style={{ gap: 14, overflowX: 'auto', padding: '18px 4px 18px', alignItems: 'stretch', scrollSnapType: 'x mandatory' }}>
      {cards.map((card, i) => (
        <Sticky key={card.id} color={COLORS[i % COLORS.length]} tilt={i % 2 ? 1.5 : -1.5} style={{ width: 200, flexShrink: 0, scrollSnapAlign: 'start' }}>
          <div className="tiny" style={{ opacity: 0.65 }}>{KIND_LABEL[card.kind] ?? card.kind}</div>
          <div className="h2" style={{ marginTop: 2, color: 'inherit' }}>{card.title}</div>
          <div className="small" style={{ marginTop: 4 }}>{card.body}</div>
        </Sticky>
      ))}
    </div>
  );
}

function DeckCard({ deck }: { deck: Deck }) {
  return (
    <div className="card col" style={{ gap: 4 }}>
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <Doodle id={deck.doodle} size={36} />
        <div className="grow">
          <div className="h2">{deck.name}</div>
          <div className="small soft">{deck.description}</div>
        </div>
      </div>
      <Samples deck={deck} />
      <div className="row between">
        <span className="tiny soft">{deck.cards.length} kartu</span>
        <span className="pill tiny" style={{ padding: '4px 12px' }}>
          <Doodle id="ui-centang" size={14} /> sudah ada
        </span>
      </div>
    </div>
  );
}

export default function Dek() {
  return (
    <main className="screen">
      <Header title="dek kartu" backTo="/aku" />
      <p className="small soft" style={{ margin: '0 0 16px' }}>
        Setiap pagi lingkaranmu menarik satu kartu: pertanyaan, tantangan kecil, kenangan, atau rahasia yang terbuka berdua. Dek tematik menambah kartu untuk musim hidup tertentu.
      </p>
      <div className="col" style={{ gap: 16 }}>
        {DECKS.map((d) => (
          <DeckCard key={d.id} deck={d} />
        ))}
      </div>
      <p className="tiny soft center mt">Semua dek sudah terbuka untukmu. Kartunya bisa muncul di kartu pagi lingkaranmu.</p>
    </main>
  );
}
