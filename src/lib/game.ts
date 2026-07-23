import type { JokerType, QuestionResult, QuizConfig, QuizProgress, QuizQuestion } from './types';

export function createProgress(quizId: string): QuizProgress {
  return {
    version: 1,
    quizId,
    questionResults: {},
    scoreAdjustment: 0,
    jokerUses: { callFriend: 0, threeOptions: 0, askAudience: 0 },
    revealedPrizeIds: [],
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
    jokerUses: {
      callFriend: normalizeUseCount(candidate.jokerUses?.callFriend),
      threeOptions: normalizeUseCount(candidate.jokerUses?.threeOptions),
      askAudience: normalizeUseCount(candidate.jokerUses?.askAudience)
    },
    dailyDoubleQuestionId:
      typeof candidate.dailyDoubleQuestionId === 'string' && candidate.dailyDoubleQuestionId.trim()
        ? candidate.dailyDoubleQuestionId
        : undefined,
    revealedPrizeIds: Array.isArray(candidate.revealedPrizeIds)
      ? [...new Set(candidate.revealedPrizeIds.filter((id): id is string => typeof id === 'string'))]
      : [],
    timerSecondsOverride:
      typeof candidate.timerSecondsOverride === 'number' &&
      Number.isInteger(candidate.timerSecondsOverride) &&
      candidate.timerSecondsOverride >= 5 &&
      candidate.timerSecondsOverride <= 600
        ? candidate.timerSecondsOverride
        : undefined,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
  };
}

function normalizeUseCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
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
          topicTotal + (questionResult(progress, question.id) === 'correct' ? pointsForQuestion(config, progress, question) : 0),
        0
      ),
    0
  );
}

export function dailyDoubleQuestionId(config: QuizConfig, progress: QuizProgress): string | undefined {
  const questionId = progress.dailyDoubleQuestionId ?? config.settings.dailyDoubleQuestionId;
  return questionId && config.topics.some((topic) => topic.questions.some((question) => question.id === questionId))
    ? questionId
    : undefined;
}

export function pointsForQuestion(config: QuizConfig, progress: QuizProgress, question: QuizQuestion): number {
  return question.points * (question.id === dailyDoubleQuestionId(config, progress) ? 2 : 1);
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

export function withJokerUse(progress: QuizProgress, joker: JokerType): QuizProgress {
  return {
    ...progress,
    jokerUses: { ...progress.jokerUses, [joker]: progress.jokerUses[joker] + 1 },
    updatedAt: new Date().toISOString()
  };
}

export function withDailyDoubleQuestion(progress: QuizProgress, questionId: string): QuizProgress {
  return {
    ...progress,
    dailyDoubleQuestionId: questionId,
    updatedAt: new Date().toISOString()
  };
}

export function withRevealedPrize(progress: QuizProgress, prizeId: string): QuizProgress {
  return {
    ...progress,
    revealedPrizeIds: progress.revealedPrizeIds.includes(prizeId)
      ? progress.revealedPrizeIds
      : [...progress.revealedPrizeIds, prizeId],
    updatedAt: new Date().toISOString()
  };
}

export function withTimerOverride(progress: QuizProgress, seconds: number): QuizProgress {
  return {
    ...progress,
    timerSecondsOverride: Math.min(600, Math.max(5, Math.round(seconds))),
    updatedAt: new Date().toISOString()
  };
}
