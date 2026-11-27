// Basit sentez ses efektleri (dosya gerektirmez)
let ctx = null, master = null;
export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination); } catch { ctx = null; }
}
function tone(f0, f1, dur, type = 'square', vol = 0.5, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.4) {
  if (!ctx) return;
  const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}
export const sfx = {
  shot: () => { tone(900, 220, 0.12, 'square', 0.22); tone(1800, 600, 0.08, 'sine', 0.18); noise(0.05, 0.12); },
  empty: () => { tone(260, 180, 0.07, 'triangle', 0.22); tone(220, 150, 0.07, 'triangle', 0.18, 0.08); },
  jump: () => tone(320, 720, 0.16, 'square', 0.25),
  coin: () => { tone(988, 988, 0.06, 'square', 0.22); tone(1319, 1319, 0.18, 'square', 0.22, 0.06); },
  stomp: () => { tone(260, 90, 0.18, 'triangle', 0.6); noise(0.08, 0.25); },
  hurt: () => { tone(400, 120, 0.35, 'sawtooth', 0.35); },
  land: () => noise(0.06, 0.18),
  bump: () => tone(160, 120, 0.08, 'triangle', 0.4),
  spring: () => tone(200, 1200, 0.35, 'sine', 0.45),
  cage: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.14, 'triangle', 0.4, i * 0.08)); noise(0.15, 0.25); },
  checkpoint: () => { [660, 880].forEach((f, i) => tone(f, f, 0.15, 'square', 0.25, i * 0.1)); },
  win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.2, 'square', 0.28, i * 0.12)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.25, 'triangle', 0.4, i * 0.18)); },
};
