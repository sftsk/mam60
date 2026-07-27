<script lang="ts">
  import { onMount } from 'svelte';
  import { playCountdownMusicStep, playTimeoutSound, prepareAudio } from '$lib/sounds';
  import type { JokerLimits, JokerType, QuizQuestion, QuizTopic } from '$lib/types';

  export let topic: QuizTopic;
  export let question: QuizQuestion;
  export let imageSrc: string | undefined;
  export let timerSeconds: number;
  export let soundEnabled: boolean;
  export let jokerUses: Record<JokerType, number>;
  export let jokerLimits: JokerLimits;
  export let isDailyDouble = false;
  export let onToggleSound: () => void;
  export let onUseJoker: (joker: JokerType) => void;
  export let onClose: () => void;
  export let onAnswer: (correct: boolean) => void;

  let dialog: HTMLDialogElement;
  let revealed = false;
  let imageFailed = false;
  let remainingMs = timerSeconds * 1000;
  let timerPaused = false;
  let timedOut = false;
  let activeJoker: JokerType | null = null;
  let showOptions = false;
  const initialJokerUses = { ...jokerUses };
  let localJokerUses: Record<JokerType, number> = { callFriend: 0, threeOptions: 0, askAudience: 0 };
  let lastTimestamp = 0;
  let lastTickBucket = Math.floor(remainingMs / 1000);
  let musicStep = 0;

  $: remainingSeconds = Math.ceil(remainingMs / 1000);
  $: timerProgress = Math.max(0, Math.min(100, (remainingMs / (timerSeconds * 1000)) * 100));
  $: urgent = remainingMs <= 10_000;
  $: remainingJokers = {
    callFriend: Math.max(0, jokerLimits.callFriend - Math.max(jokerUses.callFriend, initialJokerUses.callFriend + localJokerUses.callFriend)),
    threeOptions: Math.max(0, jokerLimits.threeOptions - Math.max(jokerUses.threeOptions, initialJokerUses.threeOptions + localJokerUses.threeOptions)),
    askAudience: Math.max(0, jokerLimits.askAudience - Math.max(jokerUses.askAudience, initialJokerUses.askAudience + localJokerUses.askAudience))
  };

  onMount(() => {
    dialog.showModal();
    prepareAudio(soundEnabled);
    lastTimestamp = performance.now();
    const interval = window.setInterval(updateTimer, 100);
    return () => window.clearInterval(interval);
  });

  function updateTimer() {
    const now = performance.now();
    const elapsed = now - lastTimestamp;
    lastTimestamp = now;
    if (timerPaused || revealed || activeJoker || timedOut) return;

    remainingMs = Math.max(0, remainingMs - elapsed);
    const bucketSize = remainingMs <= 10_000 ? 500 : 1000;
    const bucket = Math.floor(remainingMs / bucketSize);
    if (bucket !== lastTickBucket && remainingMs > 0) {
      lastTickBucket = bucket;
      if (soundEnabled) playCountdownMusicStep(musicStep++, remainingMs <= 10_000);
    }
    if (remainingMs <= 0) {
      timedOut = true;
      timerPaused = true;
      if (soundEnabled) playTimeoutSound();
    }
  }

  function close() {
    dialog.close();
    onClose();
  }

  function toggleSound() {
    if (!soundEnabled) prepareAudio(true);
    onToggleSound();
  }

  function answer(correct: boolean) {
    dialog.close();
    onAnswer(correct);
  }

  function revealAnswer() {
    revealed = true;
    timerPaused = true;
    activeJoker = null;
  }

  function useJoker(joker: JokerType) {
    if (remainingJokers[joker] === 0) return;
    localJokerUses = { ...localJokerUses, [joker]: localJokerUses[joker] + 1 };
    remainingMs = timerSeconds * 1000;
    timedOut = false;
    lastTickBucket = Math.floor(remainingMs / 1000);
    musicStep = 0;
    if (joker === 'threeOptions') showOptions = true;
    activeJoker = joker === 'callFriend' ? joker : null;
    timerPaused = joker === 'callFriend';
    lastTimestamp = performance.now();
    onUseJoker(joker);
  }

  function resumeAfterJoker() {
    activeJoker = null;
    if (!revealed && !timedOut) timerPaused = false;
    lastTimestamp = performance.now();
  }

  function cancel(event: Event) {
    event.preventDefault();
    close();
  }

</script>

<dialog bind:this={dialog} class="question-dialog" aria-labelledby="question-title" on:cancel={cancel}>
  <div class="dialog-topline">
    <span>{topic.title}</span>
    <strong>{isDailyDouble ? question.points * 2 : question.points} Punkte{isDailyDouble ? ' · Tagesdoppel' : ''}</strong>
    <button
      type="button"
      class="sound-button"
      aria-label={soundEnabled ? 'Töne ausschalten' : 'Töne einschalten'}
      title={soundEnabled ? 'Töne ausschalten' : 'Töne einschalten'}
      on:click={toggleSound}
    >{soundEnabled ? '🔊' : '🔇'}</button>
    <button type="button" class="icon-button" aria-label="Frage schließen" on:click={close}>×</button>
  </div>

  <div class="question-content">
    <div
      class:urgent
      class:paused={timerPaused || activeJoker !== null}
      class:expired={timedOut}
      class="question-timer"
      style={`--timer-progress:${timerProgress * 3.6}deg`}
      role="timer"
      aria-label={timedOut ? 'Zeit abgelaufen' : `${remainingSeconds} Sekunden verbleiben`}
    >
      <div>
        {#if timedOut}<span>⏰</span><strong>Zeit!</strong>{:else}<strong>{remainingSeconds}</strong><small>Sek.</small>{/if}
      </div>
    </div>

    {#if imageSrc && !imageFailed}
      <img
        class="question-image"
        src={imageSrc}
        alt={question.imageAlt ?? ''}
        on:error={() => (imageFailed = true)}
      />
    {:else if imageSrc && imageFailed}
      <div class="image-fallback" role="img" aria-label={question.imageAlt ?? 'Bild nicht verfügbar'}>
        <span aria-hidden="true">🖼️</span>
        <small>Das Bild konnte nicht geladen werden.</small>
      </div>
    {/if}

    <p class="question-kicker">Die Frage lautet:</p>
    <h2 id="question-title">{question.prompt}</h2>

    {#if showOptions && !revealed}
      <div class="joker-options" aria-label="Antwortmöglichkeiten">
        {#each question.jokerOptions as option, index}
          <div><span>{String.fromCharCode(65 + index)}</span>{option}</div>
        {/each}
      </div>
    {/if}

    {#if !revealed}
      <div class="joker-bar" aria-label="Joker">
        <button type="button" disabled={remainingJokers.callFriend === 0} on:click={() => useJoker('callFriend')}>
          <span aria-hidden="true">☎</span><strong>Telefon</strong><small>{remainingJokers.callFriend} übrig</small>
        </button>
        <button type="button" disabled={remainingJokers.threeOptions === 0} on:click={() => useJoker('threeOptions')}>
          <span aria-hidden="true">≡</span><strong>3 Antworten</strong><small>{remainingJokers.threeOptions} übrig</small>
        </button>
        <button type="button" disabled={remainingJokers.askAudience === 0} on:click={() => useJoker('askAudience')}>
          <span aria-hidden="true">♟</span><strong>Publikum</strong><small>{remainingJokers.askAudience} übrig</small>
        </button>
      </div>
      <button type="button" class="primary-button reveal-button" on:click={revealAnswer}>
        Antwort aufdecken
      </button>
    {:else}
      <section class="answer-box" aria-live="polite">
        <span>Richtige Antwort</span>
        <p>{question.answer}</p>
      </section>
      <div class="judgement-actions">
        <button type="button" class="wrong-button" on:click={() => answer(false)}>Falsch</button>
        <button type="button" class="correct-button" on:click={() => answer(true)}>Richtig</button>
      </div>
    {/if}
  </div>

  {#if activeJoker}
    <div class="joker-pause" role="dialog" aria-modal="true" aria-label="Joker aktiv">
      <div class="joker-pause-card">
        <span class="pause-icon" aria-hidden="true">☎</span>
        <p class="eyebrow">Timer pausiert</p>
        <h3>Ruf jemanden an!</h3>
        <p>Nimm dir Zeit für einen kurzen Anruf. Der Countdown wartet auf dich.</p>
        <button type="button" class="primary-button" on:click={resumeAfterJoker}>Timer neu starten</button>
      </div>
    </div>
  {/if}
</dialog>
