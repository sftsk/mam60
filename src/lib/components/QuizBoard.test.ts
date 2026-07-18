import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { createProgress, withQuestionResult } from '$lib/game';
import QuizBoard from './QuizBoard.svelte';

const topics = [
  {
    id: 'topic',
    title: 'Testthema',
    questions: [{ id: 'question', points: 100, prompt: 'Frage?', answer: 'Antwort' }]
  }
];

describe('QuizBoard', () => {
  it('opens an unanswered tile', async () => {
    const onSelect = vi.fn();
    render(QuizBoard, { topics, progress: createProgress('quiz'), onSelect });

    await fireEvent.click(screen.getByRole('button', { name: /Testthema für 100 Punkte$/ }));
    expect(onSelect).toHaveBeenCalledWith(topics[0], topics[0].questions[0]);
  });

  it('disables a played tile and exposes its result accessibly', () => {
    const progress = withQuestionResult(createProgress('quiz'), 'question', 'correct');
    render(QuizBoard, { topics, progress, onSelect: vi.fn() });

    expect(screen.getByRole('button', { name: /richtig beantwortet/ })).toBeDisabled();
  });
});
