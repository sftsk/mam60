import type { JokerLimits, LoadedQuiz, QuizConfig, QuizPrize, QuizQuestion, QuizSettings, QuizTopic } from './types';

export class QuizConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Die Quiz-Konfiguration ist ungültig:\n${problems.join('\n')}`);
    this.name = 'QuizConfigError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  object: Record<string, unknown>,
  key: string,
  path: string,
  problems: string[],
  optional = false
): string | undefined {
  const value = object[key];
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    problems.push(`${path}.${key} muss ein nicht-leerer Text sein.`);
    return undefined;
  }
  return value.trim();
}

function readInteger(
  object: Record<string, unknown>,
  key: string,
  path: string,
  problems: string[]
): number {
  const value = object[key];
  if (!Number.isInteger(value) || (value as number) < 0) {
    problems.push(`${path}.${key} muss eine nicht-negative ganze Zahl sein.`);
    return 0;
  }
  return value as number;
}

function readRangedInteger(
  object: Record<string, unknown>,
  key: string,
  path: string,
  problems: string[],
  fallback: number,
  minimum: number,
  maximum: number,
  optional = false
): number | undefined {
  const value = object[key];
  if (optional && value === undefined) return undefined;
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    problems.push(`${path}.${key} muss eine ganze Zahl zwischen ${minimum} und ${maximum} sein.`);
    return fallback;
  }
  return value as number;
}

function parseSettings(value: unknown, problems: string[]): QuizSettings {
  const defaults: QuizSettings = {
    defaultTimerSeconds: 60,
    jokerUses: { callFriend: 3, threeOptions: 3, askAudience: 3 }
  };
  if (value === undefined) return defaults;
  if (!isRecord(value)) {
    problems.push('quiz.settings muss ein Objekt sein.');
    return defaults;
  }
  const jokerValue = value.jokerUses;
  let jokerUses: JokerLimits = defaults.jokerUses;
  if (jokerValue !== undefined) {
    if (!isRecord(jokerValue)) {
      problems.push('quiz.settings.jokerUses muss ein Objekt sein.');
    } else {
      jokerUses = {
        callFriend: readRangedInteger(jokerValue, 'callFriend', 'settings.jokerUses', problems, 3, 0, 20) ?? 3,
        threeOptions: readRangedInteger(jokerValue, 'threeOptions', 'settings.jokerUses', problems, 3, 0, 20) ?? 3,
        askAudience: readRangedInteger(jokerValue, 'askAudience', 'settings.jokerUses', problems, 3, 0, 20) ?? 3
      };
    }
  }
  return {
    defaultTimerSeconds:
      readRangedInteger(value, 'defaultTimerSeconds', 'settings', problems, 60, 5, 600) ?? 60,
    jokerUses
  };
}

function validateImage(
  source: Record<string, unknown>,
  path: string,
  problems: string[]
): Pick<QuizQuestion, 'image' | 'imageAlt'> {
  const image = readString(source, 'image', path, problems, true);
  const imageAlt = readString(source, 'imageAlt', path, problems, true);
  if (image && !imageAlt) problems.push(`${path}.imageAlt ist für ein Bild erforderlich.`);
  if (!image && imageAlt) problems.push(`${path}.imageAlt darf nur zusammen mit image verwendet werden.`);
  return { image, imageAlt };
}

export function parseQuizConfig(value: unknown): QuizConfig {
  const problems: string[] = [];
  if (!isRecord(value)) throw new QuizConfigError(['Die Wurzel muss ein JSON-Objekt sein.']);

  if (value.schemaVersion !== 1) problems.push('schemaVersion muss 1 sein.');
  const id = readString(value, 'id', 'quiz', problems) ?? 'invalid';
  const title = readString(value, 'title', 'quiz', problems) ?? 'Ungültiges Quiz';
  const subtitle = readString(value, 'subtitle', 'quiz', problems, true);
  const settings = parseSettings(value.settings, problems);
  if (value.locale !== 'de') problems.push('quiz.locale muss "de" sein.');

  const seenIds = new Set<string>();
  const claimId = (candidate: string, path: string) => {
    if (seenIds.has(candidate)) problems.push(`${path}.id "${candidate}" ist nicht eindeutig.`);
    seenIds.add(candidate);
  };

  const topics: QuizTopic[] = [];
  if (!Array.isArray(value.topics) || value.topics.length === 0) {
    problems.push('quiz.topics muss mindestens ein Thema enthalten.');
  } else {
    value.topics.forEach((topicValue, topicIndex) => {
      const path = `topics[${topicIndex}]`;
      if (!isRecord(topicValue)) {
        problems.push(`${path} muss ein Objekt sein.`);
        return;
      }
      const topicId = readString(topicValue, 'id', path, problems) ?? `invalid-topic-${topicIndex}`;
      claimId(topicId, path);
      const topicTitle = readString(topicValue, 'title', path, problems) ?? 'Ungültiges Thema';
      const questions: QuizQuestion[] = [];
      if (!Array.isArray(topicValue.questions) || topicValue.questions.length === 0) {
        problems.push(`${path}.questions muss mindestens eine Frage enthalten.`);
      } else {
        topicValue.questions.forEach((questionValue, questionIndex) => {
          const questionPath = `${path}.questions[${questionIndex}]`;
          if (!isRecord(questionValue)) {
            problems.push(`${questionPath} muss ein Objekt sein.`);
            return;
          }
          const questionId =
            readString(questionValue, 'id', questionPath, problems) ??
            `invalid-question-${topicIndex}-${questionIndex}`;
          claimId(questionId, questionPath);
          let jokerOptions: [string, string, string] = ['Option A', 'Option B', 'Option C'];
          if (
            !Array.isArray(questionValue.jokerOptions) ||
            questionValue.jokerOptions.length !== 3 ||
            questionValue.jokerOptions.some((option) => typeof option !== 'string' || option.trim() === '')
          ) {
            problems.push(`${questionPath}.jokerOptions muss genau drei nicht-leere Antworten enthalten.`);
          } else {
            jokerOptions = questionValue.jokerOptions.map((option) => option.trim()) as [string, string, string];
            if (new Set(jokerOptions).size !== 3) {
              problems.push(`${questionPath}.jokerOptions muss drei unterschiedliche Antworten enthalten.`);
            }
          }
          questions.push({
            id: questionId,
            points: readInteger(questionValue, 'points', questionPath, problems),
            prompt: readString(questionValue, 'prompt', questionPath, problems) ?? 'Ungültige Frage',
            answer: readString(questionValue, 'answer', questionPath, problems) ?? 'Ungültige Antwort',
            jokerOptions,
            timerSeconds: readRangedInteger(
              questionValue,
              'timerSeconds',
              questionPath,
              problems,
              settings.defaultTimerSeconds,
              5,
              600,
              true
            ),
            ...validateImage(questionValue, questionPath, problems)
          });
        });
      }
      topics.push({ id: topicId, title: topicTitle, questions });
    });
  }

  const prizes: QuizPrize[] = [];
  if (!Array.isArray(value.prizes)) {
    problems.push('quiz.prizes muss ein Array sein.');
  } else {
    value.prizes.forEach((prizeValue, prizeIndex) => {
      const path = `prizes[${prizeIndex}]`;
      if (!isRecord(prizeValue)) {
        problems.push(`${path} muss ein Objekt sein.`);
        return;
      }
      const prizeId = readString(prizeValue, 'id', path, problems) ?? `invalid-prize-${prizeIndex}`;
      claimId(prizeId, path);
      prizes.push({
        id: prizeId,
        requiredPoints: readInteger(prizeValue, 'requiredPoints', path, problems),
        title: readString(prizeValue, 'title', path, problems) ?? 'Ungültiger Preis',
        description: readString(prizeValue, 'description', path, problems, true),
        ...validateImage(prizeValue, path, problems)
      });
    });
  }

  if (problems.length) throw new QuizConfigError(problems);
  return {
    schemaVersion: 1,
    id,
    title,
    subtitle,
    locale: 'de',
    settings,
    topics,
    prizes: prizes.sort((a, b) => a.requiredPoints - b.requiredPoints)
  };
}

export async function loadQuiz(url: URL): Promise<LoadedQuiz> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Quiz konnte nicht geladen werden (${response.status} ${response.statusText}).`);
  }
  const config = parseQuizConfig(await response.json());
  return { config, configUrl: new URL(response.url || url) };
}

export function resolveMediaUrl(path: string | undefined, configUrl: URL): string | undefined {
  return path ? new URL(path, configUrl).href : undefined;
}
