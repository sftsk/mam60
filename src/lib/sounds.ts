let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  audioContext ??= new window.AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(
  frequency: number,
  duration: number,
  startDelay = 0,
  type: OscillatorType = 'sine',
  volume = 0.05,
  endFrequency?: number
) {
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + startDelay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function drumHit(startDelay: number, strength: number) {
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + startDelay;

  const drum = ctx.createOscillator();
  const drumGain = ctx.createGain();
  drum.type = 'sine';
  drum.frequency.setValueAtTime(170, start);
  drum.frequency.exponentialRampToValueAtTime(70, start + 0.09);
  drumGain.gain.setValueAtTime(strength, start);
  drumGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
  drum.connect(drumGain).connect(ctx.destination);
  drum.start(start);
  drum.stop(start + 0.11);

  const noiseLength = Math.floor(ctx.sampleRate * 0.07);
  const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
  const noise = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseLength; index += 1) {
    noise[index] = Math.random() * 2 - 1;
  }
  const noiseSource = ctx.createBufferSource();
  const noiseFilter = ctx.createBiquadFilter();
  const noiseGain = ctx.createGain();
  noiseSource.buffer = noiseBuffer;
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 850;
  noiseFilter.Q.value = 0.7;
  noiseGain.gain.setValueAtTime(strength * 0.48, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
  noiseSource.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
  noiseSource.start(start);
}

export function prepareAudio(enabled: boolean) {
  if (enabled) context();
}

export function playCountdownMusicStep(step: number, urgent: boolean) {
  const calmMelody = [659.25, 783.99, 880, 783.99, 698.46, 783.99, 987.77, 880];
  const urgentMelody = [880, 987.77, 1046.5, 1174.66];
  const melody = urgent ? urgentMelody : calmMelody;
  const note = melody[step % melody.length];

  // A soft music-box pulse feels more like a quiz-show bed than a metronome.
  tone(note, urgent ? 0.18 : 0.38, 0, 'sine', urgent ? 0.025 : 0.022);
  tone(note / 2, urgent ? 0.22 : 0.42, 0, 'triangle', urgent ? 0.012 : 0.01);

  if (!urgent && step % 4 === 0) {
    const bassNotes = [130.81, 146.83, 164.81, 196];
    tone(bassNotes[Math.floor(step / 4) % bassNotes.length], 0.65, 0, 'sine', 0.012);
  }
}

export function playCorrectSound() {
  tone(523.25, 0.16, 0, 'triangle', 0.055);
  tone(659.25, 0.18, 0.11, 'triangle', 0.055);
  tone(783.99, 0.28, 0.22, 'triangle', 0.065);
}

export function playWrongSound() {
  tone(220, 0.2, 0, 'sawtooth', 0.04, 155);
  tone(146.83, 0.32, 0.18, 'sawtooth', 0.045, 98);
}

export function playTimeoutSound() {
  tone(880, 0.1, 0, 'square', 0.04);
  tone(660, 0.1, 0.14, 'square', 0.04);
  tone(440, 0.35, 0.28, 'square', 0.05);
}

export function playPrizeDrumroll() {
  const hits = [0, 0.14, 0.27, 0.39, 0.5, 0.6, 0.69, 0.77, 0.84];
  hits.forEach((delay, index) => drumHit(delay, 0.035 + index * 0.0025));
}

export function playPrizeFanfare() {
  tone(523.25, 0.38, 0, 'triangle', 0.05);
  tone(659.25, 0.38, 0.06, 'triangle', 0.05);
  tone(783.99, 0.42, 0.12, 'triangle', 0.055);
  tone(1046.5, 0.65, 0.2, 'sine', 0.065);
  tone(523.25, 0.72, 0.2, 'sine', 0.025);
}
