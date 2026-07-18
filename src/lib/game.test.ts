import { describe, expect, it } from 'vitest';
import {
  answeredCount,
  baseScore,
  createProgress,
  normalizeProgress,
  score,
  withDisplayedScore,
  withQuestionResult
} from './game';
import type { QuizConfig } from './types';

const config: QuizConfig = {
  schemaVersion: 1,
  id: 'test-quiz',
  title: 'Test',
  locale: 'de',
  topics: [
    {
      id: 'topic',
      title: 'Thema',
      questions: [
        { id: 'q-100', points: 100, prompt: 'Frage?', answer: 'Antwort' },
        { id: 'q-200', points: 200, prompt: 'Frage?', answer: 'Antwort' }
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

  it('normalizes invalid or foreign stored data to a fresh game', () => {
    expect(normalizeProgress({ version: 1, quizId: 'other' }, config.id).quizId).toBe(config.id);
    expect(normalizeProgress(null, config.id).questionResults).toEqual({});
  });
});
