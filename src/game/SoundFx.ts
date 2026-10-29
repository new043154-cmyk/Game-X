// 100% Procedural Web Audio Sound Synthesizer for BattleZone X
// Zero external mp3/wav dependencies - zero 404s

class SoundSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.7;

  constructor() {
    // Lazy initialize on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Gunfire synthesizer tailored by weapon caliber
  public playGunshot(weaponType: string = 'm416') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(this.volume, t);
    master.connect(this.ctx.destination);

    // 1. Transient sharp noise crack
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = weaponType.includes('AWP') ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(weaponType.includes('AWP') ? 1200 : 2200, t);
    filter.Q.setValueAtTime(3, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);

    // 2. Low-frequency punch / thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const baseFreq = weaponType.includes('AWP') ? 70 : weaponType.includes('AK') ? 85 : 110;
    osc.frequency.setValueAtTime(baseFreq * 2.5, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.08);

    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Hitmarker "ding" feedback
  public playHitMarker(isHeadshot: boolean = false) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = isHeadshot ? 1760 : 1200; // High crisp ping
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.06);

    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Weapon reload mechanism
  public playReload() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Magazine eject clack
    this.playTone(320, 0.04, 0.2, t);
    // Magazine insert click
    this.playTone(480, 0.05, 0.3, t + 0.4);
    // Bolt rack
    this.playTone(600, 0.06, 0.35, t + 0.8);
  }

  // Footsteps
  public playFootstep() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.01));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  // Jump and land
  public playJump() {
    this.playTone(180, 0.08, 0.3);
  }

  public playLand() {
    this.playTone(90, 0.12, 0.4);
  }

  // Grenade explosion with sub-bass rumble
  public playExplosion() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Sub rumble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);

    oscGain.gain.setValueAtTime(1.0 * this.volume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.75);

    // Blast noise
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(180, t + 0.4);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
  }

  // Vehicle Engine sound pulse
  public playEngineRev(speedFactor: number = 0.5) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const pitch = 50 + speedFactor * 130;
    osc.frequency.setValueAtTime(pitch, t);

    gain.gain.setValueAtTime(0.18 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350 + speedFactor * 400, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Loot pickup chime
  public playLootPickup() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.playTone(523.25, 0.05, 0.25, t);       // C5
    this.playTone(659.25, 0.05, 0.25, t + 0.05); // E5
    this.playTone(783.99, 0.08, 0.3, t + 0.1);  // G5
  }

  // Safe zone alert siren
  public playSafeZoneAlarm() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.linearRampToValueAtTime(540, t + 0.35);
    osc.frequency.linearRampToValueAtTime(380, t + 0.7);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  // Victory fanfare
  public playVictoryFanfare() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.25, 0.35, t + i * 0.14);
    });
  }

  private playTone(freq: number, duration: number, vol: number, startTime?: number) {
    if (!this.ctx) return;
    const t = startTime || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(vol * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }
}

export const soundFx = new SoundSystem();
