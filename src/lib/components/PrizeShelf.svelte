<script lang="ts">
  import type { QuizPrize } from '$lib/types';

  export let prizes: QuizPrize[];
  export let score: number;
  export let imageUrl: (path: string | undefined) => string | undefined;

  let failedImages: Record<string, boolean> = {};

  $: nextPrize = prizes.find((prize) => score < prize.requiredPoints);
  $: previousThreshold = [...prizes].reverse().find((prize) => score >= prize.requiredPoints)?.requiredPoints ?? 0;
  $: progress = nextPrize
    ? Math.min(100, ((score - previousThreshold) / Math.max(1, nextPrize.requiredPoints - previousThreshold)) * 100)
    : 100;
</script>

<section class="prize-section" aria-labelledby="prize-title">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Deine Belohnungen</p>
      <h2 id="prize-title">Preise</h2>
    </div>
    {#if nextPrize}
      <div class="next-prize">
        Noch {(nextPrize.requiredPoints - score).toLocaleString('de-DE')} Punkte bis zum nächsten geheimen Preis
        <div class="progress-track" aria-hidden="true"><span style={`width: ${progress}%`}></span></div>
      </div>
    {:else if prizes.length}
      <p class="all-unlocked">Alle Preise freigeschaltet! 🎉</p>
    {/if}
  </div>

  <div class="prize-list">
    {#each prizes as prize (prize.id)}
      {@const unlocked = score >= prize.requiredPoints}
      <article class:unlocked class="prize-card">
        <div class="prize-image">
          {#if !unlocked}
            <span class="mystery-mark" aria-hidden="true">?</span>
          {:else if prize.image && !failedImages[prize.id]}
            <img
              src={imageUrl(prize.image)}
              alt={prize.imageAlt ?? ''}
              on:error={() => (failedImages = { ...failedImages, [prize.id]: true })}
            />
          {:else}
            <span role="img" aria-label={failedImages[prize.id] ? `${prize.imageAlt ?? 'Preisbild'} – Bild nicht verfügbar` : 'Geschenk'}>🎁</span>
          {/if}
        </div>
        <div>
          <strong>{unlocked ? prize.title : 'Geheimer Preis'}</strong>
          <span>{prize.requiredPoints.toLocaleString('de-DE')} Punkte</span>
          {#if unlocked && prize.description}
            <p>{prize.description}</p>
          {:else if !unlocked}
            <p>Wird beim Erreichen dieser Stufe enthüllt.</p>
          {/if}
        </div>
      </article>
    {/each}
  </div>
</section>
