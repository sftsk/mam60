<script lang="ts">
  import { questionResult } from '$lib/game';
  import type { QuizProgress, QuizQuestion, QuizTopic } from '$lib/types';

  export let topics: QuizTopic[];
  export let progress: QuizProgress;
  export let onSelect: (topic: QuizTopic, question: QuizQuestion) => void;

  const colors = ['#ff5c8a', '#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];
</script>

<section class="board" aria-label="Quizbrett">
  {#each topics as topic, index (topic.id)}
    <article class="topic" style={`--topic-color: ${colors[index % colors.length]}`}>
      <h2>{topic.title}</h2>
      <div class="question-list">
        {#each topic.questions as question (question.id)}
          {@const result = questionResult(progress, question.id)}
          <button
            type="button"
            class:played={result !== 'unanswered'}
            class:correct={result === 'correct'}
            class:incorrect={result === 'incorrect'}
            disabled={result !== 'unanswered'}
            aria-label={`${topic.title} für ${question.points} Punkte${result === 'correct' ? ', richtig beantwortet' : result === 'incorrect' ? ', falsch beantwortet' : ''}`}
            on:click={() => onSelect(topic, question)}
          >
            <span>{question.points}</span>
            {#if result === 'correct'}<small aria-hidden="true">✓</small>{/if}
            {#if result === 'incorrect'}<small aria-hidden="true">×</small>{/if}
          </button>
        {/each}
      </div>
    </article>
  {/each}
</section>
