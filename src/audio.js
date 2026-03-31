const QUALITY_NOTE_FREQUENCIES = {
  grey: 261.63,
  red: 293.66,
  orange: 329.63,
  yellow: 349.23,
  green: 392,
  blue: 440,
  purple: 493.88,
  white: 523.25,
  rainbow: 587.33
};

const AMBIENT_LOOP_DURATION = 30;
const AMBIENT_EVENTS = [
  { time: 0, type: "pad", frequency: 261.63, duration: 8.5, gain: 0.036 },
  { time: 0, type: "pad", frequency: 392, duration: 8.5, gain: 0.025 },
  { time: 1.5, type: "bell", frequency: 523.25, duration: 2.8, gain: 0.015 },
  { time: 4, type: "bell", frequency: 493.88, duration: 2.4, gain: 0.013 },
  { time: 7.5, type: "pad", frequency: 293.66, duration: 8.5, gain: 0.032 },
  { time: 7.5, type: "pad", frequency: 440, duration: 8.5, gain: 0.024 },
  { time: 9.5, type: "bell", frequency: 587.33, duration: 2.6, gain: 0.015 },
  { time: 12, type: "bell", frequency: 523.25, duration: 2.6, gain: 0.014 },
  { time: 15, type: "pad", frequency: 329.63, duration: 8.5, gain: 0.034 },
  { time: 15, type: "pad", frequency: 493.88, duration: 8.5, gain: 0.023 },
  { time: 18, type: "bell", frequency: 659.25, duration: 2.8, gain: 0.014 },
  { time: 21, type: "pad", frequency: 293.66, duration: 9, gain: 0.03 },
  { time: 21, type: "pad", frequency: 392, duration: 9, gain: 0.022 },
  { time: 23, type: "bell", frequency: 440, duration: 2.8, gain: 0.014 },
  { time: 26, type: "bell", frequency: 523.25, duration: 3.2, gain: 0.016 }
];

function getAudioContextClass(win = window) {
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeStorageGet(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures. Audio preference persistence is optional.
  }
}

export function getQualityFrequency(qualityId = "red") {
  return QUALITY_NOTE_FREQUENCIES[qualityId] ?? QUALITY_NOTE_FREQUENCIES.red;
}

export function getAmbientLoopDuration() {
  return AMBIENT_LOOP_DURATION;
}

export function getAmbientLoopEvents() {
  return AMBIENT_EVENTS.map((event) => ({ ...event }));
}

export class AudioDirector {
  constructor(options = {}) {
    this.storageKey = options.storageKey ?? "nbx-audio-enabled";
    this.enabled = safeStorageGet(this.storageKey, "true") !== "false";
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.schedulerId = null;
    this.scheduledUntil = 0;
    this.lastBlasterAtByShip = new Map();
  }

  isSupported() {
    return typeof window !== "undefined" && typeof getAudioContextClass(window) === "function";
  }

  isEnabled() {
    return this.enabled;
  }

  async ensureUnlocked() {
    if (!this.isSupported()) {
      return false;
    }

    if (!this.context) {
      this.createContextGraph();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.startScheduler();
    this.syncMasterGain();
    return true;
  }

  async setEnabled(nextEnabled) {
    this.enabled = Boolean(nextEnabled);
    safeStorageSet(this.storageKey, this.enabled ? "true" : "false");
    if (this.enabled) {
      await this.ensureUnlocked();
    } else {
      this.syncMasterGain();
    }
    return this.enabled;
  }

  async toggleEnabled() {
    return this.setEnabled(!this.enabled);
  }

  playBlaster({ qualityId = "red", variant = "single", shipId = "unknown" } = {}) {
    if (!this.canPlaySfx()) {
      return;
    }

    const now = this.context.currentTime;
    const lastAt = this.lastBlasterAtByShip.get(shipId) ?? -Infinity;
    if (now - lastAt < 0.075) {
      return;
    }

    this.lastBlasterAtByShip.set(shipId, now);
    const root = getQualityFrequency(qualityId);
    const harmonyRatio =
      variant === "spread" ? 1.5 : variant === "dual" ? 1.25 : 2;
    const gain =
      variant === "spread" ? 0.034 : variant === "dual" ? 0.03 : 0.028;

    this.scheduleBlasterTone(
      now,
      root,
      root * harmonyRatio,
      root * 0.75,
      gain
    );
  }

  playShipDestruction({ qualityId = "red", shipId = "unknown", isPlayer = false } = {}) {
    if (!this.canPlaySfx()) {
      return;
    }

    const now = this.context.currentTime;
    const root = getQualityFrequency(qualityId);
    const accent = isPlayer ? 1.12246 : 1;

    this.scheduleBell(now, root * accent, 1.2, isPlayer ? 0.022 : 0.018, this.sfxGain);
    this.scheduleBell(now + 0.12, root * 0.75 * accent, 1.45, 0.016, this.sfxGain);
    this.scheduleBell(now + 0.26, root * 0.5625 * accent, 1.7, 0.013, this.sfxGain);
  }

  createContextGraph() {
    const AudioContextClass = getAudioContextClass(window);
    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();

    this.masterGain.gain.value = 0.0001;
    this.musicGain.gain.value = 0.75;
    this.sfxGain.gain.value = 0.9;

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    this.scheduledUntil = this.context.currentTime;
  }

  canPlaySfx() {
    return Boolean(this.context && this.enabled && this.context.state === "running");
  }

  syncMasterGain() {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    const target = this.enabled ? 0.42 : 0.0001;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(target, now + 0.18);
  }

  startScheduler() {
    if (this.schedulerId !== null) {
      return;
    }

    this.schedulerId = window.setInterval(() => {
      this.scheduleAmbientAudio();
    }, 250);
  }

  scheduleAmbientAudio() {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    if (!this.enabled || this.context.state !== "running") {
      this.scheduledUntil = now;
      return;
    }

    const horizon = now + 1.25;
    const lowerBound = this.scheduledUntil < now - 0.25 ? now : this.scheduledUntil;
    const startLoop = Math.floor(lowerBound / AMBIENT_LOOP_DURATION);
    const endLoop = Math.floor(horizon / AMBIENT_LOOP_DURATION);

    for (let loopIndex = startLoop; loopIndex <= endLoop; loopIndex += 1) {
      const loopStart = loopIndex * AMBIENT_LOOP_DURATION;
      for (const event of AMBIENT_EVENTS) {
        const startAt = loopStart + event.time;
        if (startAt < lowerBound || startAt >= horizon) {
          continue;
        }

        if (event.type === "pad") {
          this.schedulePad(startAt, event.frequency, event.duration, event.gain);
        } else {
          this.scheduleBell(startAt, event.frequency, event.duration, event.gain, this.musicGain);
        }
      }
    }

    this.scheduledUntil = horizon;
  }

  schedulePad(startAt, frequency, duration, gain) {
    const low = this.context.createOscillator();
    const high = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();

    low.type = "triangle";
    high.type = "sine";
    low.frequency.setValueAtTime(frequency, startAt);
    high.frequency.setValueAtTime(frequency * 1.5, startAt);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(980, startAt);
    filter.Q.value = 0.35;

    amp.gain.setValueAtTime(0.0001, startAt);
    amp.gain.linearRampToValueAtTime(gain, startAt + 1.2);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    low.connect(filter);
    high.connect(filter);
    filter.connect(amp);
    amp.connect(this.musicGain);

    low.start(startAt);
    high.start(startAt);
    low.stop(startAt + duration + 0.1);
    high.stop(startAt + duration + 0.1);
  }

  scheduleBell(startAt, frequency, duration, gain, destination) {
    const carrier = this.context.createOscillator();
    const shimmer = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();

    carrier.type = "sine";
    shimmer.type = "triangle";
    carrier.frequency.setValueAtTime(frequency, startAt);
    shimmer.frequency.setValueAtTime(frequency * 2, startAt);
    shimmer.frequency.exponentialRampToValueAtTime(frequency * 1.5, startAt + duration);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency * 1.6, startAt);
    filter.Q.value = 1.2;

    amp.gain.setValueAtTime(0.0001, startAt);
    amp.gain.linearRampToValueAtTime(gain, startAt + 0.03);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    carrier.connect(filter);
    shimmer.connect(filter);
    filter.connect(amp);
    amp.connect(destination);

    carrier.start(startAt);
    shimmer.start(startAt);
    carrier.stop(startAt + duration + 0.08);
    shimmer.stop(startAt + duration + 0.08);
  }

  scheduleBlasterTone(startAt, primaryFrequency, accentFrequency, undertoneFrequency, gain) {
    const carrier = this.context.createOscillator();
    const accent = this.context.createOscillator();
    const undertone = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();

    carrier.type = "triangle";
    accent.type = "sine";
    undertone.type = "sine";
    carrier.frequency.setValueAtTime(primaryFrequency, startAt);
    carrier.frequency.exponentialRampToValueAtTime(primaryFrequency * 0.95, startAt + 0.34);
    accent.frequency.setValueAtTime(accentFrequency, startAt);
    accent.frequency.exponentialRampToValueAtTime(accentFrequency * 0.94, startAt + 0.32);
    undertone.frequency.setValueAtTime(undertoneFrequency, startAt);
    undertone.frequency.exponentialRampToValueAtTime(undertoneFrequency * 0.97, startAt + 0.36);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(clamp(primaryFrequency * 2.05, 360, 1600), startAt);
    filter.Q.value = 0.72;

    amp.gain.setValueAtTime(0.0001, startAt);
    amp.gain.linearRampToValueAtTime(gain, startAt + 0.012);
    amp.gain.exponentialRampToValueAtTime(gain * 0.42, startAt + 0.14);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.42);

    carrier.connect(filter);
    accent.connect(filter);
    undertone.connect(filter);
    filter.connect(amp);
    amp.connect(this.sfxGain);

    carrier.start(startAt);
    accent.start(startAt);
    undertone.start(startAt);
    carrier.stop(startAt + 0.44);
    accent.stop(startAt + 0.44);
    undertone.stop(startAt + 0.44);
  }
}

export function createAudioDirector(options = {}) {
  return new AudioDirector(options);
}
