import { describe, expect, it } from 'vitest';
import {
  answeredCount,
  baseScore,
  createProgress,
  normalizeProgress,
  score,
  withJokerUse,
  withRevealedPrize,
  withDailyDoubleQuestion,
  withDisplayedScore,
  withQuestionResult,
  withTimerOverride
} from './game';
import type { QuizConfig } from './types';

const config: QuizConfig = {
  schemaVersion: 1,
  id: 'test-quiz',
  title: 'Test',
  locale: 'de',
  settings: {
    defaultTimerSeconds: 60,
    jokerUses: { callFriend: 3, threeOptions: 3 }
  },
  topics: [
    {
      id: 'topic',
      title: 'Thema',
      questions: [
        { id: 'q-100', points: 100, prompt: 'Frage?', answer: 'Antwort', jokerOptions: ['A', 'B', 'C'] },
        { id: 'q-200', points: 200, prompt: 'Frage?', answer: 'Antwort', jokerOptions: ['A', 'B', 'C'] }
      ]
    }
  ],
  prizes: []
};

describe('game state', () => {
  it('scores correct answers while incorrect answers add no points', () => {
    let progress = createProgress(config.id);
    progress = withQuestionResult(progress, 'q-100', 'correct');
    progress = withQuestionResult(progress, 'q-200', 'incorrect');

    expect(answeredCount(config, progress)).toBe(2);
    expect(baseScore(config, progress)).toBe(100);
    expect(score(config, progress)).toBe(100);
  });

  it('represents an admin score correction as an adjustment', () => {
    const correct = withQuestionResult(createProgress(config.id), 'q-200', 'correct');
    const adjusted = withDisplayedScore(config, correct, 725);

    expect(adjusted.scoreAdjustment).toBe(525);
    expect(score(config, adjusted)).toBe(725);
    expect(score(config, withQuestionResult(adjusted, 'q-200', 'incorrect'))).toBe(525);
  });

  it('awards double points to the daily double selected in the admin area', () => {
    let progress = withDailyDoubleQuestion(createProgress(config.id), 'q-200');
    progress = withQuestionResult(progress, 'q-200', 'correct');

    expect(baseScore(config, progress)).toBe(400);
    expect(normalizeProgress(progress, config.id).dailyDoubleQuestionId).toBe('q-200');
  });

  it('normalizes invalid or foreign stored data to a fresh game', () => {
    expect(normalizeProgress({ version: 1, quizId: 'other' }, config.id).quizId).toBe(config.id);
    expect(normalizeProgress(null, config.id).questionResults).toEqual({});
  });

  it('persists joker use, manual prize reveals, and bounded timer overrides', () => {
    let progress = createProgress(config.id);
    progress = withJokerUse(progress, 'askAudience');
    progress = withRevealedPrize(progress, 'prize-1');
    progress = withTimerOverride(progress, 1);

    expect(progress.jokerUses.askAudience).toBe(1);
    expect(progress.revealedPrizeIds).toEqual(['prize-1']);
    expect(progress.timerSecondsOverride).toBe(5);
    expect(normalizeProgress(progress, config.id)).toMatchObject(progress);
  });
});
