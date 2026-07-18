<script lang="ts">
  import { questionResult } from '$lib/game';
  import type { QuestionResult, QuizConfig, QuizProgress } from '$lib/types';

  export let config: QuizConfig;
  export let progress: QuizProgress;
  export let currentScore: number;
  export let persistenceAvailable: boolean;
  export let onScoreChange: (score: number) => void;
  export let onResultChange: (questionId: string, result: QuestionResult) => void;
  export let onReset: () => void;

  let scoreInput = currentScore;
  $: scoreInput = currentScore;

  function changeResult(questionId: string, event: Event) {
    onResultChange(questionId, (event.currentTarget as HTMLSelectElement).value as QuestionResult);
  }
</script>

<details class="admin-panel">
  <summary>Admin-Werkzeuge</summary>
  <div class="admin-content">
    <div class="admin-notice">
      <strong>Lokaler Korrekturmodus</strong>
      <span>Dieser Bereich ist nicht passwortgeschützt.</span>
    </div>

    <form class="score-editor" on:submit|preventDefault={() => onScoreChange(scoreInput)}>
      <label for="admin-score">Punktestand festlegen</label>
      <input id="admin-score" type="number" min="0" step="1" bind:value={scoreInput} />
      <button type="submit">Übernehmen</button>
    </form>

    <div class="question-editor">
      {#each config.topics as topic (topic.id)}
        <section>
          <h3>{topic.title}</h3>
          {#each topic.questions as question (question.id)}
            <label>
              <span>{question.points}: {question.prompt}</span>
              <select value={questionResult(progress, question.id)} on:change={(event) => changeResult(question.id, event)}>
                <option value="unanswered">Offen</option>
                <option value="correct">Richtig</option>
                <option value="incorrect">Falsch</option>
              </select>
            </label>
          {/each}
        </section>
      {/each}
    </div>

    <button
      type="button"
      class="reset-button"
      on:click={() => {
        if (confirm('Wirklich alle Punkte und Antworten für dieses Quiz löschen?')) onReset();
      }}
    >
      Gesamten Fortschritt zurücksetzen
    </button>
    {#if !persistenceAvailable}<p class="warning-text">IndexedDB ist nicht verfügbar; Änderungen gelten nur für diese Sitzung.</p>{/if}
  </div>
</details>
