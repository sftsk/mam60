<script lang="ts">
  import { onMount } from 'svelte';
  import { asset } from '$app/paths';
  import AdminPanel from '$lib/components/AdminPanel.svelte';
  import CorrectConfetti from '$lib/components/CorrectConfetti.svelte';
  import PrizeShelf from '$lib/components/PrizeShelf.svelte';
  import PrizeUnlockDialog from '$lib/components/PrizeUnlockDialog.svelte';
  import QuestionDialog from '$lib/components/QuestionDialog.svelte';
  import QuizBoard from '$lib/components/QuizBoard.svelte';
  import ResultsDialog from '$lib/components/ResultsDialog.svelte';
  import ScoreHeader from '$lib/components/ScoreHeader.svelte';
  import { loadQuiz, QuizConfigError, resolveMediaUrl } from '$lib/config';
  import { deleteProgress, loadProgress, saveProgress } from '$lib/database';
  import {
    answeredCount,
    createProgress,
    normalizeProgress,
    questionResult,
    score,
    totalQuestions,
    withJokerUse,
    withRevealedPrize,
    withTimerOverride,
    withDisplayedScore,
    withQuestionResult
  } from '$lib/game';
  import { playCorrectSound, playWrongSound, prepareAudio } from '$lib/sounds';
  import type { JokerType, QuestionResult, QuizConfig, QuizPrize, QuizProgress, QuizQuestion, QuizTopic } from '$lib/types';

  let config: QuizConfig | null = null;
  let configUrl: URL | null = null;
  let progress: QuizProgress | null = null;
  let selected: { topic: QuizTopic; question: QuizQuestion } | null = null;
  let loading = true;
  let loadError = '';
  let persistenceWarning = '';
  let persistenceAvailable = true;
  let adminMode = false;
  let showResults = false;
  let correctCelebration: { id: number; points: number } | null = null;
  let unlockQueue: QuizPrize[] = [];
  let activeUnlock: QuizPrize | null = null;
  let soundEnabled = true;

  $: currentScore = config && progress ? score(config, progress) : 0;
  $: answered = config && progress ? answeredCount(config, progress) : 0;
  $: total = config ? totalQuestions(config) : 0;

  onMount(async () => {
    adminMode = new URLSearchParams(window.location.search).get('admin') === 'true';
    soundEnabled = window.localStorage.getItem('birthday-quiz-sound') !== 'off';
    try {
      const url = new URL(asset('/quiz/quiz.json'), window.location.origin);
      const loaded = await loadQuiz(url);
      config = loaded.config;
      configUrl = loaded.configUrl;
      const empty = createProgress(config.id);
      try {
        progress = normalizeProgress(await loadProgress(config.id), config.id);
      } catch (error) {
        progress = empty;
        persistenceAvailable = false;
        persistenceWarning = error instanceof Error ? error.message : 'Fortschritt kann nicht gespeichert werden.';
      }
      const hasPendingPrize = schedulePrizeUnlocks(progress);
      showResults = answeredCount(config, progress) === totalQuestions(config) && !hasPendingPrize;
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

  function enableAdminMode() {
    if (adminMode) return;
    adminMode = true;
    const url = new URL(window.location.href);
    url.searchParams.set('admin', 'true');
    window.history.replaceState(window.history.state, '', url);
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    window.localStorage.setItem('birthday-quiz-sound', soundEnabled ? 'on' : 'off');
  }

  function schedulePrizeUnlocks(next: QuizProgress): boolean {
    if (!config) return false;
    const queuedIds = new Set([activeUnlock?.id, ...unlockQueue.map((prize) => prize.id)]);
    const reached = config.prizes.filter(
      (prize) =>
        score(config!, next) >= prize.requiredPoints &&
        !next.revealedPrizeIds.includes(prize.id) &&
        !queuedIds.has(prize.id)
    );
    if (!activeUnlock && reached.length) {
      activeUnlock = reached.shift() ?? null;
    }
    if (reached.length) unlockQueue = [...unlockQueue, ...reached];
    return activeUnlock !== null || unlockQueue.length > 0;
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
    selected = { topic, question };
  }

  async function answerQuestion(correct: boolean) {
    if (!selected || !config || !progress) return;
    const answeredQuestion = selected.question;
    const next = withQuestionResult(progress, answeredQuestion.id, correct ? 'correct' : 'incorrect');
    if (correct) {
      correctCelebration = { id: Date.now(), points: answeredQuestion.points };
      if (soundEnabled) playCorrectSound();
    } else if (soundEnabled) {
      playWrongSound();
    }
    selected = null;
    await persist(next);
    const hasPendingPrize = schedulePrizeUnlocks(next);
    if (answeredCount(config, next) === totalQuestions(config) && !hasPendingPrize) showResults = true;
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
    schedulePrizeUnlocks(next);
  }

  async function setScore(value: number) {
    if (!config || !progress || !Number.isFinite(value)) return;
    const next = withDisplayedScore(config, progress, value);
    await persist(next);
    schedulePrizeUnlocks(next);
  }

  async function setTimer(seconds: number) {
    if (!progress || !Number.isFinite(seconds)) return;
    await persist(withTimerOverride(progress, seconds));
  }

  async function revealPrize(prizeId: string) {
    if (!progress) return;
    await persist(withRevealedPrize(progress, prizeId));
  }

  function closePrizeUnlock() {
    activeUnlock = unlockQueue[0] ?? null;
    unlockQueue = unlockQueue.slice(1);
    if (!activeUnlock && config && progress && answeredCount(config, progress) === totalQuestions(config)) {
      showResults = true;
    }
  }

  async function reset() {
    if (!config) return;
    const next = createProgress(config.id);
    progress = next;
    selected = null;
    showResults = false;
    activeUnlock = null;
    unlockQueue = [];
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
    content="Ein farbenfrohes Jeopardy-inspiriertes Geburtstagsquiz mit sechs Themen."
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
      <PrizeShelf
        prizes={config.prizes}
        score={currentScore}
        revealedPrizeIds={progress.revealedPrizeIds}
        imageUrl={media}
      />

      {#if adminMode}
        <AdminPanel
          {config}
          {progress}
          {currentScore}
          timerSeconds={progress.timerSecondsOverride ?? config.settings.defaultTimerSeconds}
          {persistenceAvailable}
          onScoreChange={setScore}
          onTimerChange={setTimer}
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
        onToggleSound={toggleSound}
        onUseJoker={useJoker}
        onClose={() => (selected = null)}
        onAnswer={answerQuestion}
      />
    {/if}

    {#if showResults}
      <ResultsDialog
        score={currentScore}
        prizes={config.prizes}
        revealedPrizeIds={progress.revealedPrizeIds}
        imageUrl={media}
        onClose={() => (showResults = false)}
      />
    {/if}

    {#if activeUnlock}
      <PrizeUnlockDialog
        prize={activeUnlock}
        imageSrc={media(activeUnlock.image)}
        {soundEnabled}
        onReveal={revealPrize}
        onClose={closePrizeUnlock}
      />
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
