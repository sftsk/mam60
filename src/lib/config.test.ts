import { describe, expect, it } from 'vitest';
import { parseQuizConfig, QuizConfigError, resolveMediaUrl } from './config';

const valid = {
  schemaVersion: 1,
  id: 'quiz',
  title: 'Quiz',
  locale: 'de',
  settings: {
    defaultTimerSeconds: 60,
    jokerUses: { callFriend: 3, threeOptions: 3, askAudience: 3 }
  },
  topics: [
    {
      id: 'topic',
      title: 'Thema',
      questions: [{ id: 'q1', points: 100, prompt: 'Frage?', answer: 'Antwort', jokerOptions: ['A', 'B', 'C'] }]
    }
  ],
  prizes: [{ id: 'p1', requiredPoints: 100, title: 'Preis' }]
};

describe('quiz config', () => {
  it('parses a valid runtime configuration', () => {
    const result = parseQuizConfig(valid);
    expect(result.topics[0].questions[0].points).toBe(100);
    expect(result.settings.defaultTimerSeconds).toBe(60);
    expect(result.settings.jokerUses.askAudience).toBe(3);
  });

  it('reports duplicate IDs and missing image alt text', () => {
    const broken = structuredClone(valid);
    broken.prizes[0].id = 'q1';
    Object.assign(broken.topics[0].questions[0], { image: 'question.svg' });

    expect(() => parseQuizConfig(broken)).toThrow(QuizConfigError);
    try {
      parseQuizConfig(broken);
    } catch (error) {
      expect((error as QuizConfigError).problems.join(' ')).toContain('nicht eindeutig');
      expect((error as QuizConfigError).problems.join(' ')).toContain('imageAlt');
    }
  });

  it('resolves media paths relative to the fetched JSON', () => {
    expect(resolveMediaUrl('images/example.svg', new URL('https://example.test/repo/quiz/quiz.json'))).toBe(
      'https://example.test/repo/quiz/images/example.svg'
    );
  });
});
