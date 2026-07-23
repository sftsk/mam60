export type QuestionResult = 'unanswered' | 'correct' | 'incorrect';
export type JokerType = 'callFriend' | 'threeOptions' | 'askAudience';

export interface JokerLimits {
  callFriend: number;
  threeOptions: number;
}

export interface QuizSettings {
  defaultTimerSeconds: number;
  jokerUses: JokerLimits;
  dailyDoubleQuestionId?: string;
}

export interface QuizQuestion {
  id: string;
  points: number;
  prompt: string;
  answer: string;
  jokerOptions: [string, string, string];
  timerSeconds?: number;
  image?: string;
  imageAlt?: string;
}

export interface QuizTopic {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizPrize {
  id: string;
  requiredPoints: number;
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

export interface QuizConfig {
  schemaVersion: 1;
  id: string;
  title: string;
  subtitle?: string;
  locale: 'de';
  settings: QuizSettings;
  topics: QuizTopic[];
  prizes: QuizPrize[];
}

export interface QuizProgress {
  version: 1;
  quizId: string;
  questionResults: Record<string, QuestionResult>;
  scoreAdjustment: number;
  jokerUses: Record<JokerType, number>;
  dailyDoubleQuestionId?: string;
  revealedPrizeIds: string[];
  timerSecondsOverride?: number;
  updatedAt: string;
}

export interface LoadedQuiz {
  config: QuizConfig;
  configUrl: URL;
}
