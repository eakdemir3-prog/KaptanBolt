// Sentezlenmiş ses efektleri ve müzik (dosya gerekmez, çevrimdışı)
let ctx = null, master = null, sfxGain = null, musicGain = null;
let soundOn = true, musicOn = true, musicTimer = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
  return ctx;
}
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); if (musicOn) startMusic(); }
export function setSound(on) { soundOn = on; }
export function setMusic(on) { musicOn = on; if (on) startMusic(); else stopMusic(); }
export function suspend() { if (ctx) ctx.suspend(); }
export function resume() { if (ctx) ctx.resume(); }

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, out } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out || sfxGain);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, { vol = 0.3, freq = 800, q = 1, delay = 0, type = 'lowpass' } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t);
}

export const sfx = {
  step() { if (!soundOn || !ensure()) return; tone(520, 0.08, { type: 'triangle', vol: 0.18, slide: 180 }); },
  slide() { if (!soundOn || !ensure()) return; noise(0.22, { vol: 0.12, freq: 3000, type: 'bandpass', q: 2 }); tone(900, 0.2, { vol: 0.05, slide: 600 }); },
  collapse() { if (!soundOn || !ensure()) return; tone(110, 0.35, { type: 'sine', vol: 0.3, slide: -60, delay: 0.08 }); noise(0.4, { vol: 0.22, freq: 500, delay: 0.08 }); },
  bump() { if (!soundOn || !ensure()) return; tone(140, 0.09, { type: 'square', vol: 0.06, slide: -40 }); },
  key() { if (!soundOn || !ensure()) return; [988, 1319, 1568, 1976].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.16, delay: i * 0.06 })); },
  door() { if (!soundOn || !ensure()) return; tone(220, 0.8, { type: 'sawtooth', vol: 0.06, slide: 440 }); tone(330, 0.8, { type: 'sine', vol: 0.15, slide: 660, delay: 0.05 }); },
  win() { if (!soundOn || !ensure()) return; [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i > 3 ? 0.45 : 0.18, { type: 'triangle', vol: 0.18, delay: i * 0.11 })); },
  lose() { if (!soundOn || !ensure()) return; [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.15, delay: i * 0.14 })); },
  click() { if (!soundOn || !ensure()) return; tone(660, 0.05, { type: 'triangle', vol: 0.12 }); },
  star(i) { if (!soundOn || !ensure()) return; tone(880 + i * 220, 0.3, { type: 'triangle', vol: 0.18 }); tone(1760 + i * 440, 0.2, { vol: 0.06, delay: 0.03 }); },
  hint() { if (!soundOn || !ensure()) return; tone(1200, 0.15, { vol: 0.12 }); tone(1600, 0.2, { vol: 0.1, delay: 0.08 }); },
};

// Sakin zindan müziği: yumuşak akorlar + arpej
const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]];
function startMusic() {
  if (!musicOn || !ensure() || musicTimer) return;
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);
  let bar = 0;
  const play = () => {
    const ch = CHORDS[bar % CHORDS.length];
    ch.forEach((f) => tone(f / 2, 3.8, { type: 'sine', vol: 0.05, out: musicGain }));
    for (let i = 0; i < 8; i++) tone(ch[i % 3] * (i % 4 === 3 ? 2 : 1), 0.4, { type: 'triangle', vol: 0.025, delay: i * 0.5, out: musicGain });
    bar++;
  };
  play();
  musicTimer = setInterval(play, 4000);
}
function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  if (ctx && musicGain) musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
}
