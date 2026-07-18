<script lang="ts">
  import { onMount } from 'svelte';
  import type { QuizQuestion, QuizTopic } from '$lib/types';

  export let topic: QuizTopic;
  export let question: QuizQuestion;
  export let imageSrc: string | undefined;
  export let onClose: () => void;
  export let onAnswer: (correct: boolean) => void;

  let dialog: HTMLDialogElement;
  let revealed = false;
  let imageFailed = false;

  onMount(() => dialog.showModal());

  function close() {
    dialog.close();
    onClose();
  }

  function answer(correct: boolean) {
    dialog.close();
    onAnswer(correct);
  }

  function cancel(event: Event) {
    event.preventDefault();
    close();
  }
</script>

<dialog bind:this={dialog} class="question-dialog" aria-labelledby="question-title" on:cancel={cancel}>
  <div class="dialog-topline">
    <span>{topic.title}</span>
    <strong>{question.points} Punkte</strong>
    <button type="button" class="icon-button" aria-label="Frage schließen" on:click={close}>×</button>
  </div>

  <div class="question-content">
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

    {#if !revealed}
      <button type="button" class="primary-button reveal-button" on:click={() => (revealed = true)}>
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
</dialog>
