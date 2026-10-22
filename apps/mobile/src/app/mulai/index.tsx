import { COPY } from '@sehari/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Gap, Pill, Row, Screen, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/** Surat sambutan — seperti membuka surat, bukan menerima notifikasi. */
export default function Welcome() {
  const [step, setStep] = useState<'letter' | 'age' | 'declined'>('letter');
  const letter = COPY.onboarding.letter;
  const age = COPY.onboarding.ageGate;

  if (step === 'declined') {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACE.md, paddingTop: 120 }}>
          <Doodle id="kuncup" size={72} />
          <Txt center>{age.declined}</Txt>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        step === 'letter' ? (
          <Button title="Mulai" onPress={() => setStep('age')} testID="welcome-start" />
        ) : (
          <View style={{ width: '100%', gap: SPACE.sm, alignItems: 'center' }}>
            <Button title={age.confirm} onPress={() => router.push('/mulai/email')} testID="age-confirm" />
            <Button kind="ghost" title={age.decline} onPress={() => setStep('declined')} />
          </View>
        )
      }>
      <View style={{ alignItems: 'center', paddingTop: SPACE.xxl }}>
        <Doodle id="bunga-matahari" size={84} />
        <Gap h={SPACE.sm} />
        <Row>
          <Txt v="small" ink soft>
            hari ini cuma terjadi
          </Txt>
          <Pill>sekali</Pill>
        </Row>
      </View>
      <Gap h={SPACE.xl} />
      {step === 'letter' ? (
        <Card style={{ gap: SPACE.md, paddingVertical: SPACE.lg }}>
          {letter.slice(0, -1).map((p, i) => (
            <Txt key={i} center v={i === 0 ? 'h2' : 'body'}>
              {p}
            </Txt>
          ))}
          <Txt v="handLarge" center style={{ marginTop: SPACE.sm }}>
            {letter[letter.length - 1]!.replace('— ', '')}
          </Txt>
        </Card>
      ) : (
        <Card style={{ gap: SPACE.md, alignItems: 'center', paddingVertical: SPACE.xl }}>
          <Doodle id="kunci" size={48} />
          <Txt v="title" ink center>
            {age.title}
          </Txt>
          <Txt center>{age.body}</Txt>
        </Card>
      )}
    </Screen>
  );
}
