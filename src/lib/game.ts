import type { QuestionResult, QuizConfig, QuizProgress } from './types';

export function createProgress(quizId: string): QuizProgress {
  return {
    version: 1,
    quizId,
    questionResults: {},
    scoreAdjustment: 0,
    updatedAt: new Date().toISOString()
  };
}

export function normalizeProgress(value: unknown, quizId: string): QuizProgress {
  if (!value || typeof value !== 'object') return createProgress(quizId);
  const candidate = value as Partial<QuizProgress>;
  if (candidate.version !== 1 || candidate.quizId !== quizId) return createProgress(quizId);

  const questionResults: Record<string, QuestionResult> = {};
  if (candidate.questionResults && typeof candidate.questionResults === 'object') {
    for (const [id, result] of Object.entries(candidate.questionResults)) {
      if (result === 'correct' || result === 'incorrect' || result === 'unanswered') {
        questionResults[id] = result;
      }
    }
  }

  return {
    version: 1,
    quizId,
    questionResults,
    scoreAdjustment:
      typeof candidate.scoreAdjustment === 'number' && Number.isInteger(candidate.scoreAdjustment)
        ? candidate.scoreAdjustment
        : 0,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
  };
}

export function questionResult(progress: QuizProgress, questionId: string): QuestionResult {
  return progress.questionResults[questionId] ?? 'unanswered';
}

export function baseScore(config: QuizConfig, progress: QuizProgress): number {
  return config.topics.reduce(
    (total, topic) =>
      total +
      topic.questions.reduce(
        (topicTotal, question) =>
          topicTotal + (questionResult(progress, question.id) === 'correct' ? question.points : 0),
        0
      ),
    0
  );
}

export function score(config: QuizConfig, progress: QuizProgress): number {
  return Math.max(0, baseScore(config, progress) + progress.scoreAdjustment);
}

export function answeredCount(config: QuizConfig, progress: QuizProgress): number {
  return config.topics.reduce(
    (total, topic) =>
      total + topic.questions.filter((question) => questionResult(progress, question.id) !== 'unanswered').length,
    0
  );
}

export function totalQuestions(config: QuizConfig): number {
  return config.topics.reduce((total, topic) => total + topic.questions.length, 0);
}

export function withQuestionResult(
  progress: QuizProgress,
  questionId: string,
  result: QuestionResult
): QuizProgress {
  return {
    ...progress,
    questionResults: { ...progress.questionResults, [questionId]: result },
    updatedAt: new Date().toISOString()
  };
}

export function withDisplayedScore(
  config: QuizConfig,
  progress: QuizProgress,
  displayedScore: number
): QuizProgress {
  return {
    ...progress,
    scoreAdjustment: Math.max(0, Math.round(displayedScore)) - baseScore(config, progress),
    updatedAt: new Date().toISOString()
  };
}
