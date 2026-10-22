/**
 * Kamus Lingkaran & Motif: bahasa kalian sendiri. Kandidat dihitung di
 * perangkat dari tulisan yang sudah dibuka, dan hanya *ditawarkan* — tidak
 * pernah ditambahkan otomatis. Istilah, arti, dan motif disimpan terenkripsi.
 */
import { addDays, dictionaryCandidates, type DictionaryWire, motifCandidates, type MotifWire } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { authoredTexts, errorText, isPaymentRequired, nameIn } from '@/features/board/shared';
import { api } from '@/lib/api';
import { openCircleText, sealCircleText, useCircle, useCircleRange, useMe, useOpenDrops, useToday } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, ErrorNote, Field, Gap, Growing, Header, IconButton, Pill, Row, Screen, Section, Sticky, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

export default function Kamus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const year = Number(today.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const recent = addDays(today, -119);
  // Satu rentang (≤400 hari) untuk kamus (120 hari terakhir) dan motif (tahun ini), tidak sebelum lingkaran lahir.
  const earliest = yearStart < recent ? yearStart : recent;
  const from = circle && circle.createdDay > earliest ? circle.createdDay : earliest;
  const range = useCircleRange(id, from, today, !!circle);
  const opened = useOpenDrops(range.data?.drops);
  const dict = useQuery({ queryKey: ['dictionary', id], queryFn: () => api.get<DictionaryWire[]>(`/circles/${id}/dictionary`), enabled: !!circle });
  const motifs = useQuery({ queryKey: ['motifs', id], queryFn: () => api.get<MotifWire[]>(`/circles/${id}/motifs`), enabled: !!circle });

  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [needPlus, setNeedPlus] = useState(false);

  const entries = useMemo(
    () => (circle ? (dict.data ?? []).map((d) => ({ ...d, term: openCircleText(circle, d.termEnc), meaning: openCircleText(circle, d.meaningEnc, '') })).sort((a, b) => a.term.localeCompare(b.term)) : []),
    [dict.data, circle],
  );
  const yearMotifs = useMemo(
    () => (circle ? (motifs.data ?? []).filter((m) => m.year === year).map((m) => ({ ...m, term: openCircleText(circle, m.termEnc) })) : []),
    [motifs.data, circle, year],
  );
  const texts = useMemo(() => authoredTexts(opened), [opened]);
  const dictSugg = useMemo(() => dictionaryCandidates(texts.filter((t) => t.day >= recent), entries.map((e) => e.term)), [texts, entries, recent]);
  const motifSugg = useMemo(() => motifCandidates(texts.filter((t) => t.day >= yearStart), yearMotifs.map((m) => m.term), 4), [texts, yearMotifs, yearStart]);

  if (!circle) return <Screen header={<Header title="Kamus & Motif" />}><Growing /></Screen>;
  const locked = !circle.plusUnlocked || needPlus;

  const run = async (key: string, fn: () => Promise<unknown>, after: () => void) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      after();
    } catch (e) {
      if (isPaymentRequired(e)) setNeedPlus(true);
      else setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const addEntry = () =>
    run(
      'dict',
      () => api.post(`/circles/${id}/dictionary`, { termEnc: sealCircleText(circle, term.trim()), meaningEnc: sealCircleText(circle, meaning.trim()) }),
      () => {
        setTerm('');
        setMeaning('');
        void qc.invalidateQueries({ queryKey: ['dictionary', id] });
      },
    );
  const delEntry = (did: string) => run(`del-${did}`, () => api.del(`/circles/${id}/dictionary/${did}`), () => void qc.invalidateQueries({ queryKey: ['dictionary', id] }));
  const addMotif = (t: string) =>
    run(
      'motif',
      () => api.post(`/circles/${id}/motifs`, { year, termEnc: sealCircleText(circle, t.trim().toLowerCase()) }),
      () => {
        setMotif('');
        void qc.invalidateQueries({ queryKey: ['motifs', id] });
      },
    );
  const delMotif = (mid: string) => run(`del-${mid}`, () => api.del(`/circles/${id}/motifs/${mid}`), () => void qc.invalidateQueries({ queryKey: ['motifs', id] }));

  return (
    <Screen header={<Header title="Kamus & Motif" subtitle={circle.name} />}>
      <Txt v="small" soft center>
        Kata-kata yang hanya kalian yang paham, dan hal-hal yang terus muncul seperti motif dalam novel.
      </Txt>

      <Section title="kamus lingkaran">
        {dict.error ? <ErrorNote error={dict.error} onRetry={() => dict.refetch()} /> : null}
        {dict.isLoading ? (
          <Growing />
        ) : entries.length ? (
          <Card style={{ gap: SPACE.sm }} testID="dict-list">
            {entries.map((e) => (
              <Row key={e.id} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Txt v="h2" ink>
                    {e.term}
                  </Txt>
                  {e.meaning ? <Txt v="small">{e.meaning}</Txt> : null}
                  <Txt v="tiny" soft>
                    dicatat {nameIn(circle, e.addedBy, me.user.id)}
                  </Txt>
                </View>
                {e.addedBy === me.user.id ? <IconButton icon="ui-hapus" label={`hapus ${e.term}`} size={18} onPress={() => delEntry(e.id)} /> : null}
              </Row>
            ))}
          </Card>
        ) : (
          <Card style={{ alignItems: 'center', gap: 6 }}>
            <Doodle id="ui-kata" size={36} />
            <Txt v="small" soft center>
              Kamusnya masih kosong. Istilah pertama biasanya lahir dari lelucon yang terlalu sering diulang.
            </Txt>
          </Card>
        )}

        <Gap h={SPACE.sm} />
        {locked ? (
          <Sticky color="peach" tilt={-0.8} pin={false}>
            <View style={{ gap: 6 }} testID="plus-upsell">
              <Row>
                <Doodle id="ui-hadiah" size={30} />
                <Txt v="h2" style={{ flex: 1 }}>
                  Kamus terbuka dengan Plus
                </Txt>
              </Row>
              <Txt v="small">Cukup satu orang di lingkaran ini yang memakai Plus, dan kamusnya terbuka untuk semua. Motif tetap bisa dipakai tanpa Plus.</Txt>
              <Button kind="primary" title="lihat Plus" onPress={() => router.push('/plus')} style={{ minHeight: 44 }} testID="plus-link" />
            </View>
          </Sticky>
        ) : (
          <Card style={{ gap: SPACE.sm }}>
            <Field label="istilah" value={term} onChangeText={setTerm} placeholder="misalnya: gaskeun" maxLength={60} testID="dict-term" />
            <Field label="artinya buat kita" value={meaning} onChangeText={setMeaning} placeholder="kata sakti sebelum mi instan tengah malam" maxLength={300} multiline style={{ minHeight: 70 }} testID="dict-meaning" />
            <Button title="catat di kamus" onPress={addEntry} disabled={!term.trim()} loading={busy === 'dict'} testID="dict-add" />
          </Card>
        )}

        {dictSugg.length && !locked ? (
          <View style={{ marginTop: SPACE.md, gap: 6 }}>
            <Txt v="label" ink soft>
              kata yang sering kalian pakai
            </Txt>
            <Row style={{ flexWrap: 'wrap' }} gap={6}>
              {dictSugg.map((w) => (
                <Pill key={w.word} onPress={() => setTerm(w.word)}>
                  {`${w.word} · ${w.days} hari`}
                </Pill>
              ))}
            </Row>
            <Txt v="tiny" soft>
              Dihitung di perangkatmu dari 120 hari terakhir. Hanya tawaran; tidak ada yang masuk kamus tanpa kalian.
            </Txt>
          </View>
        ) : null}
      </Section>

      <Section title={`motif ${year}`}>
        {yearMotifs.length ? (
          <Row style={{ flexWrap: 'wrap' }} gap={8} testID="motif-list">
            {yearMotifs.map((m) => (
              <Card key={m.id} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 }}>
                <Row gap={4}>
                  <Txt v="hand" style={{ fontSize: 22 }}>
                    {m.term}
                  </Txt>
                  {m.addedBy === me.user.id ? <IconButton icon="ui-tutup" label={`hapus motif ${m.term}`} size={14} onPress={() => delMotif(m.id)} /> : null}
                </Row>
              </Card>
            ))}
          </Row>
        ) : (
          <Txt v="small" soft>
            Belum ada motif tahun ini. Hujan, kopi, satu lagu, kata "pulang" — apa yang terus kembali di cerita kalian?
          </Txt>
        )}

        {motifSugg.map((w) => (
          <Sticky key={w.word} color="yellow" tilt={0.5} pin={false} style={{ marginTop: SPACE.sm }}>
            <Row>
              <Txt v="small" style={{ flex: 1 }}>
                Kata “{w.word}” sering muncul, di {w.days} hari berbeda. Jadikan motif?
              </Txt>
              <Button kind="soft" title="jadikan" onPress={() => addMotif(w.word)} style={{ width: 110, minHeight: 40, paddingHorizontal: 8 }} testID={`motif-suggest-${w.word}`} />
            </Row>
          </Sticky>
        ))}

        <Row style={{ marginTop: SPACE.md, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field value={motif} onChangeText={setMotif} placeholder="tandai motif sendiri…" maxLength={40} testID="motif-input" />
          </View>
          <Button title="tandai" onPress={() => addMotif(motif)} disabled={!motif.trim()} loading={busy === 'motif'} style={{ width: 100, minHeight: 48, paddingHorizontal: 8 }} testID="motif-add" />
        </Row>
        <Txt v="tiny" soft style={{ marginTop: 6 }}>
          motif utama tahun ini muncul di Tahun Kita
        </Txt>
      </Section>

      {err ? (
        <Txt v="tiny" style={{ color: c.danger, marginTop: SPACE.md }}>
          {err}
        </Txt>
      ) : null}
      {range.isLoading ? (
        <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
          membaca halaman-halaman lama untuk mencari tawaran…
        </Txt>
      ) : null}
    </Screen>
  );
}
