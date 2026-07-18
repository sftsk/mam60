<script lang="ts">
  export let title: string;
  export let subtitle: string | undefined;
  export let score: number;
  export let answered: number;
  export let total: number;
  export let onAdminActivate: () => void;
</script>

<header class="hero">
  <div class="party-mark" data-admin-trigger aria-hidden="true" on:dblclick={onAdminActivate}>✦</div>
  <div class="hero-copy">
    <p class="eyebrow">Das Geburtstagsquiz</p>
    <h1>{title}</h1>
    {#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
  </div>
  <div class="score-card" aria-live="polite">
    <span class="score-label">Punktestand</span>
    <strong>{score.toLocaleString('de-DE')}</strong>
    <span>{answered} von {total} gespielt</span>
  </div>
</header>
