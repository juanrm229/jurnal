import { describe, expect, it } from 'vitest';
import { KENAL, kenalLabel, quizFor, quizQuestionId, quizScores } from '../src';

describe('kuis seberapa kenal', () => {
  it('satu soal per hari, berganti setiap hari, berbeda antarlingkaran', () => {
    const a = quizFor('c1', '2026-11-01');
    expect(quizFor('c1', '2026-11-01')).toBe(a);
    expect(quizFor('c1', '2026-11-02')).not.toBe(a);
    expect(KENAL.every((q) => q.options.length === 4 && q.other.includes('{nama}'))).toBe(true);
    expect(new Set(KENAL.map((q) => q.id)).size).toBe(KENAL.length);
    expect(quizQuestionId(a)).toBe(`kenal:${a.id}`);
  });

  it('skor tebakan per penebak & per pasangan', () => {
    const s = quizScores([
      { authorId: 'j', day: '2026-11-01', questionId: 'kenal:sedih', choice: 0, guesses: { r: 1 } },
      { authorId: 'r', day: '2026-11-01', questionId: 'kenal:sedih', choice: 1, guesses: { j: 2 } },
      { authorId: 'j', day: '2026-11-02', questionId: 'kenal:hujan', choice: 3, guesses: { r: 0 } },
      { authorId: 'r', day: '2026-11-02', questionId: 'kenal:hujan', choice: 0, guesses: { j: 3 } },
    ]);
    expect(s.byGuesser).toEqual({ j: { correct: 2, total: 2 }, r: { correct: 1, total: 2 } });
    expect(s.pairs.find((p) => p.from === 'r')).toMatchObject({ to: 'j', correct: 1, total: 2 });
    expect(kenalLabel(2, 2)).toBe('hafal di luar kepala');
    expect(kenalLabel(0, 0)).toBe('belum menebak');
  });
});
