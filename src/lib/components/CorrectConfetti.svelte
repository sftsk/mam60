<script lang="ts">
  import { onMount } from 'svelte';

  export let points: number;
  export let onDone: () => void;

  const colors = ['#ff5c8a', '#facc15', '#22d3ee', '#8b5cf6', '#34d399', '#fb923c'];
  const particles = Array.from({ length: 44 }, (_, index) => {
    const angle = (index / 44) * Math.PI * 2 + (index % 3) * 0.12;
    const distance = 105 + (index % 8) * 17;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotation: 180 + (index % 7) * 95,
      delay: (index % 6) * 0.018,
      color: colors[index % colors.length],
      round: index % 5 === 0
    };
  });

  onMount(() => {
    const timeout = window.setTimeout(onDone, 1450);
    return () => window.clearTimeout(timeout);
  });
</script>

<div class="correct-celebration" aria-hidden="true">
  <div class="burst">
    {#each particles as particle}
      <i
        class:round={particle.round}
        style={`--x:${particle.x}px; --y:${particle.y}px; --rotation:${particle.rotation}deg; --delay:${particle.delay}s; --particle-color:${particle.color}`}
      ></i>
    {/each}
  </div>
  <div class="correct-message">
    <span>✓</span>
    <strong>Richtig!</strong>
    <small>+{points.toLocaleString('de-DE')} Punkte</small>
  </div>
</div>

<div class="sr-announcement" role="status">Richtig! Plus {points.toLocaleString('de-DE')} Punkte.</div>
