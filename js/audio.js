// All sound is synthesised with the Web Audio API, so the game ships with no
// audio files and works offline.

const SCALE = [0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3]; // minor pentatonic drift
const ROOTS = [110, 98, 87.31, 98];

export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.musicTimer = null;
    this.step = 0;
    this.nextNoteTime = 0;
    this.started = false;
  }

  get unlocked() {
    return !!this.ctx;
  }

  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.85;
      this.sfxBus.connect(this.master);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.34;
      this.musicBus.connect(this.master);

      this.started = true;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  get audible() {
    return this.settings.muted !== true && this.settings.volume > 0;
  }

  setVolume(v) {
    this.settings.volume = Math.max(0, Math.min(1, v));
    if (this.master) {
      this.master.gain.setTargetAtTime(
        this.settings.muted ? 0 : this.settings.volume,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  setMuted(muted) {
    this.settings.muted = !!muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this.settings.muted ? 0 : this.settings.volume,
        this.ctx.currentTime,
        0.02
      );
    }
    if (this.settings.muted) this.stopMusic();
    else if (this.settings.music) this.startMusic();
  }

  // --- synthesis primitives -------------------------------------------------

  tone({ freq = 440, to = null, type = 'sine', dur = 0.2, vol = 0.2, delay = 0, bus = null, attack = 0.008 }) {
    if (!this.audible || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(bus || this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.2, filter = 1800, q = 1, type = 'lowpass', delay = 0, bus = null }) {
    if (!this.audible || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const biquad = this.ctx.createBiquadFilter();
    biquad.type = type;
    biquad.frequency.value = filter;
    biquad.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(biquad);
    biquad.connect(gain);
    gain.connect(bus || this.sfxBus);
    src.start(t);
  }

  // --- game sounds ----------------------------------------------------------

  cast(spellId) {
    switch (spellId) {
      case 'fireball':
        this.noise({ dur: 0.28, vol: 0.16, filter: 900 });
        this.tone({ freq: 170, to: 60, type: 'sawtooth', dur: 0.26, vol: 0.11 });
        break;
      case 'icelance':
        this.tone({ freq: 1500, to: 2400, type: 'triangle', dur: 0.16, vol: 0.1 });
        this.noise({ dur: 0.16, vol: 0.07, filter: 5200, type: 'highpass' });
        break;
      case 'chain':
        for (let i = 0; i < 3; i++) {
          this.noise({ dur: 0.1, vol: 0.1, filter: 3200, type: 'bandpass', delay: i * 0.05 });
        }
        this.tone({ freq: 2200, to: 900, type: 'square', dur: 0.15, vol: 0.05 });
        break;
      case 'meteor':
        this.tone({ freq: 90, to: 38, type: 'sawtooth', dur: 0.9, vol: 0.16, attack: 0.2 });
        break;
      case 'nova':
      case 'frostnova':
      case 'voidpulse':
        this.tone({ freq: 320, to: 120, type: 'sine', dur: 0.5, vol: 0.14 });
        this.tone({ freq: 640, to: 240, type: 'triangle', dur: 0.4, vol: 0.07 });
        break;
      case 'souldrain':
        this.tone({ freq: 420, to: 180, type: 'sine', dur: 0.6, vol: 0.1 });
        break;
      case 'poison':
        this.noise({ dur: 0.35, vol: 0.1, filter: 700, type: 'lowpass' });
        break;
      case 'barrage':
      case 'runestorm':
        for (let i = 0; i < 4; i++) {
          this.tone({ freq: 700 + i * 120, to: 1500, type: 'triangle', dur: 0.12, vol: 0.05, delay: i * 0.04 });
        }
        break;
      default:
        this.tone({ freq: 820, to: 1250, type: 'triangle', dur: 0.12, vol: 0.08 });
        this.tone({ freq: 1640, to: 2500, type: 'sine', dur: 0.08, vol: 0.04 });
    }
  }

  impact() {
    this.noise({ dur: 0.09, vol: 0.075, filter: 2400, type: 'bandpass', q: 0.8 });
  }

  kill(boss) {
    if (boss) {
      this.tone({ freq: 220, to: 40, type: 'sawtooth', dur: 0.8, vol: 0.2 });
      this.noise({ dur: 0.7, vol: 0.16, filter: 700 });
      return;
    }
    this.tone({ freq: 420, to: 160, type: 'sine', dur: 0.16, vol: 0.07 });
    this.noise({ dur: 0.12, vol: 0.05, filter: 1400 });
  }

  hurt() {
    this.tone({ freq: 150, to: 70, type: 'square', dur: 0.18, vol: 0.09 });
  }

  ui() {
    this.tone({ freq: 640, to: 760, type: 'triangle', dur: 0.07, vol: 0.05 });
  }

  upgrade() {
    this.tone({ freq: 520, to: 780, type: 'triangle', dur: 0.12, vol: 0.09 });
    this.tone({ freq: 780, to: 1170, type: 'sine', dur: 0.18, vol: 0.06, delay: 0.08 });
  }

  deny() {
    this.tone({ freq: 190, to: 130, type: 'square', dur: 0.12, vol: 0.06 });
  }

  wave() {
    this.tone({ freq: 392, type: 'sine', dur: 0.5, vol: 0.08 });
    this.tone({ freq: 587, type: 'sine', dur: 0.5, vol: 0.05, delay: 0.06 });
  }

  bossRoar() {
    this.tone({ freq: 120, to: 52, type: 'sawtooth', dur: 1.1, vol: 0.18, attack: 0.15 });
    this.noise({ dur: 0.9, vol: 0.12, filter: 420 });
  }

  prestige() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone({ freq: f, type: 'sine', dur: 1.2, vol: 0.1, delay: i * 0.12 });
    });
  }

  coin() {
    this.tone({ freq: 1180, to: 1620, type: 'triangle', dur: 0.09, vol: 0.035 });
  }

  // --- ambient music --------------------------------------------------------

  startMusic() {
    if (!this.settings.music || !this.audible) return;
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') return;
    if (this.musicTimer) return;
    this.nextNoteTime = this.ctx.currentTime + 0.15;
    this.step = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 180);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusic() {
    if (!this.ctx || !this.audible) return;
    const now = this.ctx.currentTime;
    const beat = 0.62;
    while (this.nextNoteTime < now + 0.6) {
      const s = this.step % 16;
      const root = ROOTS[Math.floor(this.step / 16) % ROOTS.length];
      if (s % 2 === 0) {
        const semis = SCALE[(this.step * 3) % SCALE.length];
        const freq = root * 2 * Math.pow(2, semis / 12);
        this.schedulePad(freq, this.nextNoteTime, beat * 1.9, 0.05, 'triangle');
      }
      if (s === 0 || s === 6 || s === 10) {
        this.schedulePad(root, this.nextNoteTime, beat * 3.4, 0.045, 'sine');
        this.schedulePad(root * 1.5, this.nextNoteTime, beat * 3.2, 0.028, 'sine');
      }
      this.nextNoteTime += beat / 2;
      this.step++;
    }
  }

  schedulePad(freq, time, dur, vol, type) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  }
}
