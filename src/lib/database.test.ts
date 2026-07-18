import { describe, expect, it } from 'vitest';
import { deleteProgress, loadProgress, saveProgress } from './database';
import { createProgress, withQuestionResult } from './game';

describe('IndexedDB persistence', () => {
  it('saves, reloads, and deletes quiz progress by quiz ID', async () => {
    const quizId = `db-test-${crypto.randomUUID()}`;
    const progress = withQuestionResult(createProgress(quizId), 'question-1', 'correct');

    await saveProgress(progress);
    expect((await loadProgress(quizId))?.questionResults['question-1']).toBe('correct');

    await deleteProgress(quizId);
    expect(await loadProgress(quizId)).toBeUndefined();
  });
});
