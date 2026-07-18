<script lang="ts">
  import { onMount } from 'svelte';
  import type { QuizPrize } from '$lib/types';

  export let score: number;
  export let prizes: QuizPrize[];
  export let revealedPrizeIds: string[];
  export let imageUrl: (path: string | undefined) => string | undefined;
  export let onClose: () => void;

  let dialog: HTMLDialogElement;
  let failedImages: Record<string, boolean> = {};
  $: unlocked = prizes.filter((prize) => revealedPrizeIds.includes(prize.id));
  $: highest = unlocked.at(-1);

  const confetti = Array.from({ length: 32 }, (_, index) => ({
    left: (index * 37) % 100,
    delay: (index % 8) * -0.23,
    color: ['#ff5c8a', '#facc15', '#22d3ee', '#a78bfa', '#34d399'][index % 5]
  }));

  onMount(() => dialog.showModal());

  function close() {
    dialog.close();
    onClose();
  }
</script>

<dialog bind:this={dialog} class="results-dialog" aria-labelledby="results-title" on:cancel|preventDefault={close}>
  <div class="confetti" aria-hidden="true">
    {#each confetti as piece}
      <i style={`left:${piece.left}%; animation-delay:${piece.delay}s; background:${piece.color}`}></i>
    {/each}
  </div>
  <button type="button" class="icon-button result-close" aria-label="Ergebnis schließen" on:click={close}>×</button>
  <div class="result-medal" aria-hidden="true">★</div>
  <p class="eyebrow">Alle Fragen sind gespielt</p>
  <h2 id="results-title">Großartig gemacht!</h2>
  <p class="final-score"><strong>{score.toLocaleString('de-DE')}</strong> Punkte</p>
  {#if highest}<p class="highest-prize">Höchste Stufe: <strong>{highest.title}</strong></p>{/if}

  <section class="unlocked-prizes" aria-label="Freigeschaltete Preise">
    {#if unlocked.length}
      {#each unlocked as prize (prize.id)}
        <article>
          {#if prize.image && !failedImages[prize.id]}
            <img
              src={imageUrl(prize.image)}
              alt={prize.imageAlt ?? ''}
              on:error={() => (failedImages = { ...failedImages, [prize.id]: true })}
            />
          {:else}
            <span role="img" aria-label={failedImages[prize.id] ? `${prize.imageAlt ?? 'Preisbild'} – Bild nicht verfügbar` : 'Geschenk'}>🎁</span>
          {/if}
          <strong>{prize.title}</strong>
        </article>
      {/each}
    {:else}
      <p>Noch kein Preis freigeschaltet – aber der Applaus gehört dir!</p>
    {/if}
  </section>
  <button type="button" class="primary-button" on:click={close}>Zurück zum Quizbrett</button>
</dialog>
