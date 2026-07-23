<script lang="ts">
  import { questionResult } from '$lib/game';
  import type { QuestionResult, QuizConfig, QuizProgress } from '$lib/types';

  export let config: QuizConfig;
  export let progress: QuizProgress;
  export let currentScore: number;
  export let persistenceAvailable: boolean;
  export let timerSeconds: number;
  export let dailyDoubleQuestionId: string | undefined;
  export let onScoreChange: (score: number) => void;
  export let onTimerChange: (seconds: number) => void;
  export let onDailyDoubleChange: (questionId: string) => void;
  export let onResultChange: (questionId: string, result: QuestionResult) => void;
  export let onReset: () => void;

  let scoreInput = currentScore;
  let timerInput = timerSeconds;
  $: scoreInput = currentScore;
  $: timerInput = timerSeconds;

  function changeResult(questionId: string, event: Event) {
    onResultChange(questionId, (event.currentTarget as HTMLSelectElement).value as QuestionResult);
  }

  function changeDailyDouble(event: Event) {
    onDailyDoubleChange((event.currentTarget as HTMLSelectElement).value);
  }
</script>

<details class="admin-panel">
  <summary>Admin-Werkzeuge</summary>
  <div class="admin-content">
    <form class="score-editor" on:submit|preventDefault={() => onScoreChange(scoreInput)}>
      <label for="admin-score">Punktestand festlegen</label>
      <input id="admin-score" type="number" min="0" step="1" bind:value={scoreInput} />
      <button type="submit">Übernehmen</button>
    </form>

    <form class="score-editor" on:submit|preventDefault={() => onTimerChange(timerInput)}>
      <label for="admin-timer">Zeit pro Frage</label>
      <input id="admin-timer" type="number" min="5" max="600" step="1" bind:value={timerInput} />
      <span class="input-unit">Sekunden</span>
      <button type="submit">Übernehmen</button>
    </form>

    <div class="score-editor">
      <label for="admin-daily-double">Tagesdoppel auswählen</label>
      <select id="admin-daily-double" value={dailyDoubleQuestionId} on:change={changeDailyDouble}>
        {#each config.topics as topic (topic.id)}
          <optgroup label={topic.title}>
            {#each topic.questions as question (question.id)}
              <option
                value={question.id}
                disabled={questionResult(progress, question.id) !== 'unanswered' && question.id !== dailyDoubleQuestionId}
              >
                {question.points} Punkte · {question.prompt}
              </option>
            {/each}
          </optgroup>
        {/each}
      </select>
      <span class="input-unit">Zählt doppelt und bleibt bis zum Öffnen geheim.</span>
    </div>

    <div class="admin-joker-summary">
      <strong>Joker-Verbrauch</strong>
      <span>Telefon: {progress.jokerUses.callFriend}/{config.settings.jokerUses.callFriend}</span>
      <span>3 Antworten: {progress.jokerUses.threeOptions}/{config.settings.jokerUses.threeOptions}</span>
      <span>Publikum: {progress.jokerUses.askAudience}× genutzt</span>
    </div>

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
