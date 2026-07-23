<script lang="ts">
  import { onMount } from 'svelte';
  import { playPrizeDrumroll, playPrizeFanfare, prepareAudio } from '$lib/sounds';
  import type { QuizPrize } from '$lib/types';

  export let prize: QuizPrize;
  export let imageSrc: string | undefined;
  export let soundEnabled: boolean;
  export let initiallyRevealed = false;
  export let onReveal: (prizeId: string) => void;
  export let onClose: () => void;

  let dialog: HTMLDialogElement;
  let shaking = false;
  let revealed = initiallyRevealed;
  let imageFailed = false;

  onMount(() => dialog.showModal());

  function reveal() {
    if (shaking || revealed) return;
    shaking = true;
    if (soundEnabled) {
      prepareAudio(true);
      playPrizeDrumroll();
    }
    window.setTimeout(() => {
      shaking = false;
      revealed = true;
      if (soundEnabled) playPrizeFanfare();
      onReveal(prize.id);
    }, 900);
  }

  function close() {
    if (!revealed) return;
    dialog.close();
    onClose();
  }
</script>

<dialog
  bind:this={dialog}
  class="prize-unlock-dialog"
  aria-labelledby="prize-unlock-title"
  on:cancel|preventDefault={close}
>
  <div class="unlock-sparkles" aria-hidden="true">✦ <span>★</span> ✦</div>
  <p class="eyebrow">Neue Preisstufe erreicht</p>
  <h2 id="prize-unlock-title">Du hast einen Preis freigeschaltet!</h2>

  <div class:shaking class:revealed class="mystery-gift" aria-hidden="true">
    {#if revealed && imageSrc && !imageFailed}
      <img src={imageSrc} alt={prize.imageAlt ?? ''} on:error={() => (imageFailed = true)} />
    {:else if revealed}
      <span>🎁</span>
    {:else}
      <span>?</span>
    {/if}
  </div>

  {#if revealed}
    <section class="revealed-prize" aria-live="polite">
      <span>{prize.requiredPoints.toLocaleString('de-DE')} Punkte</span>
      <h3>{prize.title}</h3>
      {#if prize.description}<p>{prize.description}</p>{/if}
    </section>
    <button type="button" class="primary-button" on:click={close}>Weiterfeiern</button>
  {:else}
    <p class="unlock-copy">Was sich wohl hinter dem Fragezeichen versteckt?</p>
    <button type="button" class="unveil-button" disabled={shaking} on:click={reveal}>
      {shaking ? 'Trommelwirbel …' : 'Preis enthüllen'}
    </button>
  {/if}
</dialog>
