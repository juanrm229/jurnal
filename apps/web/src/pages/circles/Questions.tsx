/**
 * Pertanyaan Hari Ini & Kuis Seberapa Kenal, langsung di halaman lingkaran.
 * Aturannya sama: jawab dulu, baru lihat jawaban mereka (tanpa menunggu segel).
 * Jawabanmu juga menempel di halaman hari ini.
 */
import { addDays, kenalLabel, type KenalQuestion, quizFor, quizQuestionId, quizScores, type QuizAnswer } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { type CircleView, nowParts, type OpenDrop, qk, useCircleRange, useCreateDrop, useMe, useOpenDrops, useToday } from '@/lib/data';
import { Avatar, Doodle, useToast } from '@/ui/kit';

function useDayAnswers(circle: CircleView, day: string, questionId: string) {
  const range = useCircleRange(circle.id, day, day);
  const opened = useOpenDrops(range.data?.drops);
  const answers = opened.filter((d) => d.wire.kind === 'answer' && d.wire.meta.questionId === questionId && d.payload);
  const locked = (range.data?.locked ?? []).filter((l) => l.reason === 'answer_first' && l.questionId === questionId);
  return { answers, locked, loading: range.isLoading };
}

function useSendAnswer(circle: CircleView, day: string) {
  const me = useMe();
  const create = useCreateDrop();
  const qc = useQueryClient();
  return async (questionId: string, prompt: string, text: string, quiz?: { choice: number; guesses: Record<string, number> }) => {
    await create.mutateAsync({
      day,
      payload: { v: 1, kind: 'answer', text, prompt, ...nowParts(me.user.tz), tz: me.user.tz, cityId: me.user.cityId ?? undefined, ...(quiz ? { quiz } : {}) },
      audience: 'circle',
      circleIds: [circle.id],
      pageCircleId: circle.me?.ownPage ? circle.id : undefined,
      meta: { questionId },
    });
    await qc.invalidateQueries({ queryKey: ['circleRange', circle.id] });
    void qc.invalidateQueries({ queryKey: qk.myDay(day) });
  };
}

function Status({ circle, answered, lockedBy }: { circle: CircleView; answered: Set<string>; lockedBy: Set<string> }) {
  const me = useMe();
  return (
    <div className="qa-status">
      {circle.active.map((m) => {
        const done = answered.has(m.userId) || lockedBy.has(m.userId);
        return (
          <span key={m.userId} className={`qa-who${done ? ' done' : ''}`} title={done ? 'sudah menjawab' : 'belum menjawab'}>
            <Avatar doodle={m.doodle} size={24} />
            <span className="tiny">{m.userId === me.user.id ? 'kamu' : m.penName}</span>
            <span className="qa-tick">{done ? '✓' : '·'}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Pertanyaan Hari Ini: jawab, lalu jawaban mereka terbuka berdampingan. */
export function QuestionCard({ circle, q, embedded }: { circle: CircleView; q: { id: string; text: string }; embedded?: boolean }) {
  const me = useMe();
  const today = useToday();
  const toast = useToast();
  const { answers, locked } = useDayAnswers(circle, today, q.id);
  const send = useSendAnswer(circle, today);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = answers.find((a) => a.wire.authorId === me.user.id);
  const answered = new Set(answers.map((a) => a.wire.authorId));
  const lockedBy = new Set(locked.map((l) => l.authorId));
  const others = circle.active.filter((m) => m.userId !== me.user.id);
  const waiting = lockedBy.size;

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await send(q.id, q.text, text.trim());
      setText('');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={embedded ? 'qa' : 'card qa'} data-testid="question-card">
      {embedded ? (
        <p className="qa-q hand">{q.text}</p>
      ) : (
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <Doodle id="bulan" size={28} />
          <div className="grow">
            <span className="label">pertanyaan hari ini</span>
            <p className="qa-q hand">{q.text}</p>
          </div>
        </div>
      )}
      <Status circle={circle} answered={answered} lockedBy={lockedBy} />
      {!mine ? (
        <>
          <textarea className="field qa-input" rows={2} maxLength={400} value={text} placeholder="jawabanmu…" onChange={(e) => setText(e.target.value)} />
          <div className="row between" style={{ gap: 8 }}>
            <span className="tiny soft">{waiting ? `${waiting} jawaban menunggumu. Jawab dulu, baru lihat.` : 'Jawaban mereka terbuka begitu kamu menjawab.'}</span>
            <button className="btn sm auto" onClick={submit} disabled={busy || !text.trim()} data-testid="question-send">
              {busy ? 'mengirim…' : 'jawab'}
            </button>
          </div>
        </>
      ) : (
        <div className="qa-answers">
          {[mine, ...answers.filter((a) => a.wire.authorId !== me.user.id)].map((a) => (
            <Answer key={a!.wire.id} d={a!} circle={circle} />
          ))}
          {others
            .filter((m) => !answered.has(m.userId))
            .map((m) => (
              <div key={m.userId} className="qa-answer pending">
                <span className="tiny soft">{m.penName} belum menjawab.</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function Answer({ d, circle }: { d: OpenDrop; circle: CircleView }) {
  const me = useMe();
  const m = circle.members.find((x) => x.userId === d.wire.authorId);
  return (
    <div className="qa-answer">
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        <Avatar doodle={m?.doodle ?? 'tunas'} size={20} />
        <b className="tiny">{d.wire.authorId === me.user.id ? 'kamu' : (m?.penName ?? 'teman')}</b>
      </div>
      <p>{d.payload!.text}</p>
    </div>
  );
}

/** Kuis Seberapa Kenal: jawab untuk dirimu, tebak jawaban mereka. */
export function QuizCard({ circle, embedded }: { circle: CircleView; embedded?: boolean }) {
  const me = useMe();
  const today = useToday();
  const toast = useToast();
  const q: KenalQuestion = quizFor(circle.id, today);
  const qid = quizQuestionId(q);
  const { answers, locked } = useDayAnswers(circle, today, qid);
  const send = useSendAnswer(circle, today);
  const others = circle.active.filter((m) => m.userId !== me.user.id);
  const [choice, setChoice] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const mine = answers.find((a) => a.wire.authorId === me.user.id);
  const answered = new Set(answers.map((a) => a.wire.authorId));
  const lockedBy = new Set(locked.map((l) => l.authorId));

  // Skor 30 hari terakhir dari kuis yang sudah terbuka.
  const month = useCircleRange(circle.id, addDays(today, -29), today);
  const monthOpen = useOpenDrops(month.data?.drops);
  const score = useMemo(() => {
    const list: QuizAnswer[] = monthOpen
      .filter((d) => d.payload?.quiz && d.wire.meta.questionId?.startsWith('kenal:'))
      .map((d) => ({ authorId: d.wire.authorId, day: d.wire.day, questionId: d.wire.meta.questionId!, choice: d.payload!.quiz!.choice, guesses: d.payload!.quiz!.guesses ?? {} }));
    return quizScores(list);
  }, [monthOpen]);
  const myScore = score.byGuesser[me.user.id];

  const ready = choice !== null && others.every((m) => guesses[m.userId] !== undefined);
  const submit = async () => {
    if (!ready || choice === null) return;
    setBusy(true);
    try {
      await send(qid, q.self, q.options[choice]!, { choice, guesses });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (id: string) => circle.members.find((m) => m.userId === id)?.penName ?? 'teman';
  const myQuiz = mine?.payload?.quiz;

  return (
    <div className={embedded ? 'qa quiz' : 'card qa quiz'} data-testid="quiz-card">
      {embedded ? (
        myScore?.total ? (
          <div className="tiny soft">
            30 hari: benar {myScore.correct}/{myScore.total} · {kenalLabel(myScore.correct, myScore.total)}
          </div>
        ) : null
      ) : (
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <span className="label">kuis seberapa kenal</span>
            {myScore?.total ? (
              <div className="tiny soft">
                30 hari: benar {myScore.correct}/{myScore.total} · {kenalLabel(myScore.correct, myScore.total)}
              </div>
            ) : null}
          </div>
          <Doodle id="ui-kata" size={26} />
        </div>
      )}
      <Status circle={circle} answered={answered} lockedBy={lockedBy} />
      {!mine ? (
        <>
          <p className="qa-q hand">{q.self}</p>
          <div className="qz-options">
            {q.options.map((o, i) => (
              <button key={o} className={`qz-opt${choice === i ? ' on' : ''}`} onClick={() => setChoice(i)} data-testid={`quiz-self-${i}`}>
                {o}
              </button>
            ))}
          </div>
          {choice !== null
            ? others.map((m) => (
                <div key={m.userId} className="qz-guess">
                  <p className="small" style={{ margin: '10px 0 6px' }}>
                    Tebak: {q.other.replace('{nama}', m.penName ?? 'dia')}
                  </p>
                  <div className="qz-options">
                    {q.options.map((o, i) => (
                      <button key={o} className={`qz-opt small${guesses[m.userId] === i ? ' on' : ''}`} onClick={() => setGuesses((g) => ({ ...g, [m.userId]: i }))} data-testid={`quiz-guess-${i}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            : null}
          <div className="row between mt" style={{ gap: 8 }}>
            <span className="tiny soft">{lockedBy.size ? `${lockedBy.size} orang sudah menjawab. Giliranmu.` : 'Hasilnya terbuka begitu kalian sama-sama menjawab.'}</span>
            <button className="btn sm auto" onClick={submit} disabled={busy || !ready} data-testid="quiz-send">
              {busy ? 'mengirim…' : 'kirim'}
            </button>
          </div>
        </>
      ) : (
        <div className="qa-answers">
          <p className="small" style={{ margin: '4px 0' }}>
            {q.self} <b className="ink">{q.options[myQuiz?.choice ?? 0]}</b>
          </p>
          {others.map((m) => {
            const theirs = answers.find((a) => a.wire.authorId === m.userId)?.payload?.quiz;
            const myGuess = myQuiz?.guesses?.[m.userId];
            if (!theirs) {
              return (
                <div key={m.userId} className="qa-answer pending">
                  <span className="tiny soft">
                    {nameOf(m.userId)} belum menjawab. Tebakanmu: <b>{myGuess !== undefined ? q.options[myGuess] : '—'}</b>
                  </span>
                </div>
              );
            }
            const iRight = myGuess === theirs.choice;
            const theirGuess = theirs.guesses?.[me.user.id];
            const theyRight = theirGuess === myQuiz?.choice;
            return (
              <div key={m.userId} className="qa-answer">
                <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <Avatar doodle={m.doodle} size={20} />
                  <b className="tiny">{nameOf(m.userId)}</b>
                  <span className="tiny soft">memilih</span>
                  <b className="tiny ink">{q.options[theirs.choice]}</b>
                </div>
                <div className="qz-result">
                  <span className={iRight ? 'ok' : 'no'}>{iRight ? '✓' : '✗'} tebakanmu: {myGuess !== undefined ? q.options[myGuess] : '—'}</span>
                  <span className={theyRight ? 'ok' : 'no'}>
                    {theyRight ? '✓' : '✗'} tebakan {nameOf(m.userId)} tentangmu: {theirGuess !== undefined ? q.options[theirGuess] : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * "Hari ini bersama": pertanyaan hari ini & kuis dalam satu kartu bertab,
 * supaya halaman lingkaran tidak menumpuk dua kartu besar.
 */
export function TogetherToday({ circle, q, quiz }: { circle: CircleView; q: { id: string; text: string } | null; quiz: boolean }) {
  const [tab, setTab] = useState<'q' | 'kuis'>(q ? 'q' : 'kuis');
  if (!q && !quiz) return null;
  const both = !!q && quiz;
  return (
    <div className="card tt" data-testid="together-today">
      {both ? (
        <div className="tt-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'q'} className={tab === 'q' ? 'on' : ''} onClick={() => setTab('q')} data-testid="tab-question">
            <Doodle id="bulan" size={16} color="currentColor" /> pertanyaan
          </button>
          <button role="tab" aria-selected={tab === 'kuis'} className={tab === 'kuis' ? 'on' : ''} onClick={() => setTab('kuis')} data-testid="tab-quiz">
            <Doodle id="ui-kata" size={16} color="currentColor" /> kuis kenal
          </button>
        </div>
      ) : (
        <span className="label">{q ? 'pertanyaan hari ini' : 'kuis seberapa kenal'}</span>
      )}
      {tab === 'q' && q ? <QuestionCard circle={circle} q={q} embedded /> : <QuizCard circle={circle} embedded />}
    </div>
  );
}
