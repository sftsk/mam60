<script lang="ts">
  import { onMount } from 'svelte';

  export let points: number;
  export let onDone: () => void;

  const sparks = Array.from({ length: 20 }, (_, index) => ({
    angle: index * 18,
    delay: (index % 5) * 0.08,
    distance: 120 + (index % 4) * 28
  }));
  let completed = false;

  function finish() {
    if (completed) return;
    completed = true;
    onDone();
  }

  onMount(() => {
    const timeout = window.setTimeout(finish, 3200);
    return () => window.clearTimeout(timeout);
  });
</script>

<div class="daily-double-reveal" role="dialog" aria-modal="true" aria-labelledby="daily-double-title">
  <div class="daily-double-rays" aria-hidden="true">
    {#each sparks as spark}
      <i
        style={`--spark-angle:${spark.angle}deg; --spark-delay:${spark.delay}s; --spark-distance:${spark.distance}px`}
      ></i>
    {/each}
  </div>
  <div class="daily-double-card">
    <div class="daily-double-bolt" aria-hidden="true">⚡</div>
    <p>Überraschung!</p>
    <h2 id="daily-double-title">Tagesdoppel!</h2>
    <strong>{points.toLocaleString('de-DE')} werden zu {(points * 2).toLocaleString('de-DE')} Punkten</strong>
    <button type="button" on:click={finish}>Frage zeigen</button>
  </div>
</div>
