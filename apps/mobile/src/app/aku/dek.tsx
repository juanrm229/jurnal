import { type Deck, DECKS, formatIdr } from '@sehari/core';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { MethodPicker, type PayMethod, PaymentStatus, useCheckout, WEB_PAY_NOTE } from '@/features/account/checkout';
import { useMe } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Gap, Header, Row, Screen, Sticky, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const KIND_LABEL: Record<string, string> = { pertanyaan: 'pertanyaan', tantangan: 'tantangan', kenangan: 'kenangan', rahasia: 'rahasia' };
const COLORS = ['yellow', 'peach', 'green', 'blue'] as const;

function Samples({ deck }: { deck: Deck }) {
  const cards = deck.cards.filter((x) => !x.rare).slice(0, 3);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 8, paddingHorizontal: 2 }}>
      {cards.map((card, i) => (
        <Sticky key={card.id} color={COLORS[i % COLORS.length]} tilt={i % 2 ? 1.5 : -1.5} pin={false} style={{ width: 200 }}>
          <Txt v="tiny" soft>
            {KIND_LABEL[card.kind] ?? card.kind}
          </Txt>
          <Txt v="h2" style={{ marginTop: 2 }}>
            {card.title}
          </Txt>
          <Txt v="small" style={{ marginTop: 4 }}>
            {card.body}
          </Txt>
        </Sticky>
      ))}
    </ScrollView>
  );
}

function DeckCard({ deck, owned }: { deck: Deck; owned: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PayMethod>('qris');
  const flow = useCheckout();
  const free = deck.priceIdr === 0;
  const has = owned || free || flow.phase === 'paid';
  return (
    <Card testID={`deck-${deck.id}`} style={{ gap: SPACE.sm }}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <Doodle id={deck.doodle} size={36} />
        <View style={{ flex: 1 }}>
          <Txt v="h2" ink>
            {deck.name}
          </Txt>
          <Txt v="small" soft>
            {deck.description}
          </Txt>
        </View>
      </Row>
      <Samples deck={deck} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="tiny" soft>
          {deck.cards.length} kartu
        </Txt>
        {has ? (
          <View style={{ backgroundColor: c.pill, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Txt v="tiny" ink testID={`deck-owned-${deck.id}`}>
              {free ? 'gratis · sudah ada' : 'milikmu'}
            </Txt>
          </View>
        ) : (
          <Txt ink>{formatIdr(deck.priceIdr)}</Txt>
        )}
      </Row>
      {!has ? (
        open ? (
          <View style={{ gap: SPACE.sm }}>
            {flow.phase === 'idle' || flow.phase === 'opening' ? (
              <>
                <MethodPicker value={method} onChange={setMethod} />
                <Button title={`bayar ${formatIdr(deck.priceIdr)}`} onPress={() => void flow.start({ product: `deck_${deck.id}`, method })} loading={flow.phase === 'opening'} testID={`deck-pay-${deck.id}`} />
                <Button kind="ghost" title="nanti saja" onPress={() => setOpen(false)} />
              </>
            ) : null}
            <PaymentStatus flow={flow} paidText={`${deck.name} sudah jadi milikmu. Kartunya bisa mulai muncul di kartu pagi.`} />
          </View>
        ) : (
          <Button kind="soft" title="ambil dek ini" onPress={() => setOpen(true)} testID={`deck-buy-${deck.id}`} />
        )
      ) : null}
    </Card>
  );
}

export default function Decks() {
  const me = useMe();
  return (
    <Screen header={<Header title="dek kartu" />}>
      <Txt v="small" soft>
        Setiap pagi lingkaranmu menarik satu kartu: pertanyaan, tantangan kecil, kenangan, atau rahasia yang terbuka berdua. Dek tematik menambah kartu untuk musim hidup tertentu.
      </Txt>
      <Gap />
      <View style={{ gap: SPACE.md }}>
        {DECKS.map((d) => (
          <DeckCard key={d.id} deck={d} owned={me.ownedDecks.includes(d.id)} />
        ))}
      </View>
      <Gap />
      <Txt v="tiny" soft center>
        Sekali beli, milikmu selamanya. {WEB_PAY_NOTE}
      </Txt>
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
