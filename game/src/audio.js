// Copper Fox — synthesised WebAudio sounds. No audio files, no network: every
// sound is an oscillator built on demand, and nothing plays until the player
// first presses a key or clicks (browsers demand a gesture before sound).
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioContext();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, seconds, type, gainValue, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    const start = audio.currentTime + when;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  function noise(seconds, gainValue, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    const start = audio.currentTime + when;
    const length = Math.floor(audio.sampleRate * seconds);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(gain);
    gain.connect(audio.destination);
    source.start(start);
  }

  return {
    /** Call on the first gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    step() {
      tone(180, 0.05, 'sine', 0.02);
    },
    grab() {
      tone(880, 0.12, 'sine', 0.12);
      tone(1318, 0.18, 'sine', 0.1, 0.08);
    },
    spotted() {
      tone(392, 0.16, 'square', 0.07);
      tone(311, 0.22, 'square', 0.07, 0.14);
    },
    tool() {
      noise(0.35, 0.1);
      tone(220, 0.2, 'triangle', 0.06, 0.05);
    },
    busted() {
      tone(220, 0.3, 'sawtooth', 0.12);
      tone(165, 0.45, 'sawtooth', 0.12, 0.25);
    },
    clear() {
      tone(523, 0.14, 'sine', 0.12);
      tone(659, 0.14, 'sine', 0.12, 0.12);
      tone(784, 0.28, 'sine', 0.12, 0.24);
    },
    click() {
      tone(660, 0.05, 'sine', 0.06);
    },
  };
}
