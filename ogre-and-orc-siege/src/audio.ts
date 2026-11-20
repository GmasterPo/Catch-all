// A tiny WebAudio flourish, used only for the bargain's defeat screen.
// The game has no other sound, so this stays self-contained and silently does
// nothing when the browser has no audio or refuses to start a context.

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  const ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctor) return null;
  try {
    ctx = new ctor();
  } catch {
    return null;
  }
  return ctx;
}

/** Four falling notes — D4, B3, G3, D3 — for the run that took the bargain. */
export function playTrapDefeatSting(): void {
  const audio = audioContext();
  if (!audio) return;
  // a context opened before any gesture stays suspended until the player clicks
  if (audio.state === 'suspended') void audio.resume();

  const start = audio.currentTime + 0.03;
  const master = audio.createGain();
  master.gain.value = 0.16;
  master.connect(audio.destination);

  const notes = [293.66, 246.94, 196.0, 146.83];
  notes.forEach((hz, i) => {
    const at = start + i * 0.26;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = i === notes.length - 1 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(hz, at);
    // a small downward slide per note keeps the phrase sinking
    osc.frequency.exponentialRampToValueAtTime(hz * 0.97, at + 0.34);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.9, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + 0.4);
  });

  window.setTimeout(() => master.disconnect(), 2000);
}
