<script lang="ts">
  import { onMount } from 'svelte';
  import { asset } from '$app/paths';
  import AdminPanel from '$lib/components/AdminPanel.svelte';
  import CorrectConfetti from '$lib/components/CorrectConfetti.svelte';
  import DailyDoubleReveal from '$lib/components/DailyDoubleReveal.svelte';
  import PrizeShelf from '$lib/components/PrizeShelf.svelte';
  import PrizeUnlockDialog from '$lib/components/PrizeUnlockDialog.svelte';
  import QuestionDialog from '$lib/components/QuestionDialog.svelte';
  import QuizBoard from '$lib/components/QuizBoard.svelte';
  import ResultsDialog from '$lib/components/ResultsDialog.svelte';
  import ScoreHeader from '$lib/components/ScoreHeader.svelte';
  import { loadQuiz, QUIZ_CONFIG_PATHS, QuizConfigError, resolveMediaUrl } from '$lib/config';
  import { deleteProgress, loadProgress, saveProgress } from '$lib/database';
  import {
    answeredCount,
    createProgress,
    dailyDoubleQuestionId as getDailyDoubleQuestionId,
    normalizeProgress,
    pointsForQuestion,
    questionResult,
    score,
    totalQuestions,
    withJokerUse,
    withRevealedPrize,
    withTimerOverride,
    withDisplayedScore,
    withDailyDoubleQuestion,
    withQuestionResult
  } from '$lib/game';
  import { playCorrectSound, playDailyDoubleSound, playWrongSound, prepareAudio } from '$lib/sounds';
  import type {
    JokerType,
    LoadedQuiz,
    QuestionResult,
    QuizConfig,
    QuizPrize,
    QuizProgress,
    QuizQuestion,
    QuizSetOption,
    QuizTopic
  } from '$lib/types';

  let config: QuizConfig | null = null;
  let configUrl: URL | null = null;
  let loadedQuestionSets: LoadedQuiz[] = [];
  let questionSets: QuizSetOption[] = [];
  let progress: QuizProgress | null = null;
  let selected: { topic: QuizTopic; question: QuizQuestion } | null = null;
  let pendingDailyDouble: { topic: QuizTopic; question: QuizQuestion } | null = null;
  let loading = true;
  let loadError = '';
  let persistenceWarning = '';
  let persistenceAvailable = true;
  let adminMode = false;
  let showResults = false;
  let correctCelebration: { id: number; points: number } | null = null;
  let activeUnlock: QuizPrize | null = null;
  let soundEnabled = true;
  let prizesEnabled = true;

  const quizAliases: Record<string, string> = {
    classic: 'geburtstagsquiz-2026-v2',
    hard: 'geburtstagsquiz-2026-knifflig'
  };

  $: currentScore = config && progress ? score(config, progress) : 0;
  $: answered = config && progress ? answeredCount(config, progress) : 0;
  $: total = config ? totalQuestions(config) : 0;
  $: activeDailyDoubleId = config && progress ? getDailyDoubleQuestionId(config, progress) : undefined;

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    adminMode = readUrlToggle(urlParams.get('admin')) ?? false;
    soundEnabled =
      readUrlToggle(urlParams.get('sound')) ??
      window.localStorage.getItem('birthday-quiz-sound') !== 'off';
    prizesEnabled =
      readUrlToggle(urlParams.get('prizes')) ??
      window.localStorage.getItem('birthday-quiz-prizes') !== 'off';
    try {
      loadedQuestionSets = await Promise.all(
        QUIZ_CONFIG_PATHS.map((path) => loadQuiz(new URL(asset(path), window.location.origin)))
      );
      questionSets = loadedQuestionSets.map(({ config: questionSet }) => ({
        id: questionSet.id,
        title: questionSet.title
      }));
      const quizParam = urlParams.get('quiz')?.trim();
      const preferredId = quizParam
        ? quizAliases[quizParam.toLowerCase()] ?? quizParam
        : window.localStorage.getItem('birthday-quiz-question-set');
      const initialSet =
        loadedQuestionSets.find(({ config: questionSet }) => questionSet.id === preferredId) ??
        loadedQuestionSets[0];
      if (!initialSet) throw new Error('Es ist kein Fragenset konfiguriert.');
      await activateQuestionSet(initialSet);
    } catch (error) {
      if (error instanceof QuizConfigError) {
        loadError = error.problems.join('\n');
      } else {
        loadError = error instanceof Error ? error.message : 'Das Quiz konnte nicht geladen werden.';
      }
    } finally {
      loading = false;
    }
  });

  function media(path: string | undefined): string | undefined {
    return configUrl ? resolveMediaUrl(path, configUrl) : undefined;
  }

  function readUrlToggle(value: string | null): boolean | undefined {
    if (!value) return undefined;
    if (['1', 'true', 'on', 'yes'].includes(value.toLowerCase())) return true;
    if (['0', 'false', 'off', 'no'].includes(value.toLowerCase())) return false;
    return undefined;
  }

  function setUrlParam(name: string, value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    window.history.replaceState(window.history.state, '', url);
  }

  function enableAdminMode() {
    if (adminMode) return;
    adminMode = true;
    setUrlParam('admin', 'true');
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    window.localStorage.setItem('birthday-quiz-sound', soundEnabled ? 'on' : 'off');
    setUrlParam('sound', soundEnabled ? 'on' : 'off');
  }

  function setPrizesEnabled(enabled: boolean) {
    prizesEnabled = enabled;
    if (!enabled) activeUnlock = null;
    window.localStorage.setItem('birthday-quiz-prizes', enabled ? 'on' : 'off');
    setUrlParam('prizes', enabled ? 'on' : 'off');
  }

  async function activateQuestionSet(loaded: LoadedQuiz, remember = false) {
    let nextProgress = createProgress(loaded.config.id);
    if (persistenceAvailable) {
      try {
        nextProgress = normalizeProgress(await loadProgress(loaded.config.id), loaded.config.id);
      } catch (error) {
        persistenceAvailable = false;
        persistenceWarning = error instanceof Error ? error.message : 'Fortschritt kann nicht gespeichert werden.';
      }
    }

    config = loaded.config;
    configUrl = loaded.configUrl;
    progress = nextProgress;
    selected = null;
    pendingDailyDouble = null;
    activeUnlock = null;
    correctCelebration = null;
    showResults = answeredCount(loaded.config, nextProgress) === totalQuestions(loaded.config);
    if (remember) {
      window.localStorage.setItem('birthday-quiz-question-set', loaded.config.id);
      const alias = Object.entries(quizAliases).find(([, id]) => id === loaded.config.id)?.[0];
      setUrlParam('quiz', alias ?? loaded.config.id);
    }
  }

  async function changeQuestionSet(quizId: string) {
    const loaded = loadedQuestionSets.find(({ config: questionSet }) => questionSet.id === quizId);
    if (!loaded || loaded.config.id === config?.id) return;
    await activateQuestionSet(loaded, true);
  }

  async function persist(next: QuizProgress) {
    progress = next;
    if (!persistenceAvailable) return;
    try {
      await saveProgress(next);
    } catch (error) {
      persistenceAvailable = false;
      persistenceWarning = error instanceof Error ? error.message : 'Fortschritt kann nicht gespeichert werden.';
    }
  }

  function selectQuestion(topic: QuizTopic, question: QuizQuestion) {
    if (!progress || questionResult(progress, question.id) !== 'unanswered') return;
    prepareAudio(soundEnabled);
    if (question.id === activeDailyDoubleId) {
      pendingDailyDouble = { topic, question };
      if (soundEnabled) playDailyDoubleSound();
    } else {
      selected = { topic, question };
    }
  }

  function showDailyDoubleQuestion() {
    selected = pendingDailyDouble;
    pendingDailyDouble = null;
  }

  async function answerQuestion(correct: boolean) {
    if (!selected || !config || !progress) return;
    const answeredQuestion = selected.question;
    const next = withQuestionResult(progress, answeredQuestion.id, correct ? 'correct' : 'incorrect');
    if (correct) {
      correctCelebration = { id: Date.now(), points: pointsForQuestion(config, progress, answeredQuestion) };
      if (soundEnabled) playCorrectSound();
    } else if (soundEnabled) {
      playWrongSound();
    }
    selected = null;
    await persist(next);
    if (answeredCount(config, next) === totalQuestions(config)) showResults = true;
  }

  async function useJoker(joker: JokerType) {
    if (!progress) return;
    await persist(withJokerUse(progress, joker));
  }

  async function changeResult(questionId: string, result: QuestionResult) {
    if (!progress) return;
    showResults = false;
    const next = withQuestionResult(progress, questionId, result);
    await persist(next);
  }

  async function setScore(value: number) {
    if (!config || !progress || !Number.isFinite(value)) return;
    const next = withDisplayedScore(config, progress, value);
    await persist(next);
  }

  async function setTimer(seconds: number) {
    if (!progress || !Number.isFinite(seconds)) return;
    await persist(withTimerOverride(progress, seconds));
  }

  async function setDailyDouble(questionId: string) {
    if (
      !progress ||
      !config ||
      !config.topics.some((topic) => topic.questions.some((question) => question.id === questionId))
    ) return;
    await persist(withDailyDoubleQuestion(progress, questionId));
  }

  async function revealPrize(prizeId: string) {
    if (!progress) return;
    await persist(withRevealedPrize(progress, prizeId));
  }

  function openPrize(prize: QuizPrize) {
    if (currentScore < prize.requiredPoints) return;
    activeUnlock = prize;
  }

  function closePrizeUnlock() {
    activeUnlock = null;
  }

  async function reset() {
    if (!config) return;
    const next = createProgress(config.id);
    progress = next;
    selected = null;
    pendingDailyDouble = null;
    showResults = false;
    activeUnlock = null;
    if (!persistenceAvailable) return;
    try {
      await deleteProgress(config.id);
    } catch (error) {
      persistenceAvailable = false;
      persistenceWarning = error instanceof Error ? error.message : 'Fortschritt konnte nicht gelöscht werden.';
    }
  }
</script>

<svelte:head>
  <title>{config?.title ?? 'Geburtstagsquiz'}</title>
  <meta
    name="description"
    content="Ein farbenfrohes Jeopardy-inspiriertes Geburtstagsquiz mit acht Themen."
  />
</svelte:head>

<div class="app-shell">
  <div class="balloon balloon-one" aria-hidden="true"></div>
  <div class="balloon balloon-two" aria-hidden="true"></div>
  <div class="balloon balloon-three" aria-hidden="true"></div>

  {#if loading}
    <main class="center-state" aria-busy="true">
      <div class="loader" aria-hidden="true"></div>
      <h1>Das Quiz wird vorbereitet …</h1>
      <p>Einen Moment, die Fragen werden geladen.</p>
    </main>
  {:else if loadError}
    <main class="center-state error-state">
      <span class="state-icon" aria-hidden="true">!</span>
      <h1>Das Quiz kann nicht starten</h1>
      <p>Bitte prüfe <code>quiz/quiz.json</code>.</p>
      <pre>{loadError}</pre>
      <button type="button" class="primary-button" on:click={() => location.reload()}>Erneut laden</button>
    </main>
  {:else if config && progress}
    <main class="quiz-layout">
      <ScoreHeader
        title={config.title}
        subtitle={config.subtitle}
        score={currentScore}
        {answered}
        {total}
        onAdminActivate={enableAdminMode}
      />

      {#if persistenceWarning}
        <div class="persistence-warning" role="status">
          <strong>Nur für diese Sitzung:</strong> {persistenceWarning}
        </div>
      {/if}

      <QuizBoard topics={config.topics} {progress} onSelect={selectQuestion} />
      {#if prizesEnabled}
        <PrizeShelf
          prizes={config.prizes}
          score={currentScore}
          revealedPrizeIds={progress.revealedPrizeIds}
          imageUrl={media}
          onSelectPrize={openPrize}
        />
      {/if}

      {#if adminMode}
        <AdminPanel
          {config}
          {questionSets}
          {progress}
          {currentScore}
          {prizesEnabled}
          timerSeconds={progress.timerSecondsOverride ?? config.settings.defaultTimerSeconds}
          dailyDoubleQuestionId={activeDailyDoubleId}
          {persistenceAvailable}
          onQuestionSetChange={(quizId) => void changeQuestionSet(quizId)}
          onPrizesEnabledChange={setPrizesEnabled}
          onScoreChange={setScore}
          onTimerChange={setTimer}
          onDailyDoubleChange={setDailyDouble}
          onResultChange={changeResult}
          onReset={reset}
        />
      {/if}

      <footer>
        <span>Mit ♥ für das Geburtstagskind</span>
      </footer>
    </main>

    {#if selected}
      <QuestionDialog
        topic={selected.topic}
        question={selected.question}
        imageSrc={media(selected.question.image)}
        timerSeconds={progress.timerSecondsOverride ?? selected.question.timerSeconds ?? config.settings.defaultTimerSeconds}
        {soundEnabled}
        jokerUses={progress.jokerUses}
        jokerLimits={config.settings.jokerUses}
        isDailyDouble={selected.question.id === activeDailyDoubleId}
        onToggleSound={toggleSound}
        onUseJoker={useJoker}
        onClose={() => (selected = null)}
        onAnswer={answerQuestion}
      />
    {/if}

    {#if pendingDailyDouble}
      <DailyDoubleReveal points={pendingDailyDouble.question.points} onDone={showDailyDoubleQuestion} />
    {/if}

    {#if showResults}
      <ResultsDialog
        score={currentScore}
        prizes={config.prizes}
        revealedPrizeIds={progress.revealedPrizeIds}
        showPrizes={prizesEnabled}
        imageUrl={media}
        onClose={() => (showResults = false)}
      />
    {/if}

    {#if activeUnlock && prizesEnabled}
      {#key activeUnlock.id}
        <PrizeUnlockDialog
          prize={activeUnlock}
          imageSrc={media(activeUnlock.image)}
          {soundEnabled}
          initiallyRevealed={progress.revealedPrizeIds.includes(activeUnlock.id)}
          onReveal={revealPrize}
          onClose={closePrizeUnlock}
        />
      {/key}
    {/if}

    {#if correctCelebration}
      {#key correctCelebration.id}
        <CorrectConfetti
          points={correctCelebration.points}
          onDone={() => (correctCelebration = null)}
        />
      {/key}
    {/if}
  {/if}
</div>
