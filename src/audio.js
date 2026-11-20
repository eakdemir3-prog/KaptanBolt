// Ses: oyuna özel bestelenmiş müzik ve ses efektleri (public/audio/*.ogg, tools/audio/synth.py ile üretilir)
let ctx = null, master = null, sfxGain = null, musicGain = null;
let soundOn = true, musicOn = true;
const buffers = new Map();
const loading = new Map();
let wantTrack = 'music_menu', curTrack = null, curSrc = null, curGain = null;

const SFX = ['step', 'slide', 'collapse', 'crack', 'key', 'door', 'win', 'lose', 'click', 'star0', 'star1', 'star2', 'bump', 'teleport',
  'bridge', 'lift', 'stomp', 'bossFall', 'enemyFall', 'caught', 'undo', 'hint', 'wake', 'coin'];
const VOL = { step: 0.55, slide: 0.6, collapse: 0.55, click: 0.4, bump: 0.5, crack: 0.8, door: 0.8, key: 0.9, win: 0.85, star0: 0.7, star1: 0.7, star2: 0.7 };

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.95; master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.45; musicGain.connect(master);
  SFX.forEach((n) => load(n));
  return ctx;
}

function load(name) {
  if (buffers.has(name)) return Promise.resolve(buffers.get(name));
  if (loading.has(name)) return loading.get(name);
  const p = fetch(`audio/${name}.ogg`).then((r) => r.arrayBuffer()).then((a) => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
    .then((b) => { buffers.set(name, b); return b; }).catch(() => null);
  loading.set(name, p);
  return p;
}

function play(name, { vol = 1, rate = 1 } = {}) {
  if (!soundOn || !ensure()) return;
  const b = buffers.get(name);
  if (!b) { load(name); return; }
  const src = ctx.createBufferSource(); src.buffer = b;
  src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol * (VOL[name] ?? 0.75);
  src.connect(g); g.connect(sfxGain); src.start();
}

export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); if (musicOn) startMusic(); }
export function setSound(on) { soundOn = on; }
export function setMusic(on) { musicOn = on; if (on) startMusic(); else stopMusic(); }
export function suspend() { if (ctx) ctx.suspend(); }
export function resume() { if (ctx) ctx.resume(); }

/** Çalınacak parça: 'menu' | 'boss' | dünya numarası */
export function setTrack(which) {
  wantTrack = which === 'menu' ? 'music_menu' : which === 'boss' ? 'music_boss' : `music_w${which}`;
  if (musicOn && ctx) startMusic();
}

async function startMusic() {
  if (!musicOn || !ensure()) return;
  if (curTrack === wantTrack && curSrc) return;
  const name = wantTrack;
  const b = await load(name);
  if (!b || name !== wantTrack || !musicOn || (curTrack === name && curSrc)) return;
  const now = ctx.currentTime;
  if (curSrc) { const g = curGain, s = curSrc; g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 1.2); s.stop(now + 1.3); }
  const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + 1.5);
  src.connect(g); g.connect(musicGain); src.start(now);
  curSrc = src; curGain = g; curTrack = name;
}
function stopMusic() {
  if (!curSrc || !ctx) return;
  const now = ctx.currentTime; curGain.gain.setValueAtTime(curGain.gain.value, now); curGain.gain.linearRampToValueAtTime(0, now + 0.5);
  curSrc.stop(now + 0.6); curSrc = null; curTrack = null;
}

const r = (a, b) => a + Math.random() * (b - a);
export const sfx = {
  step() { play('step', { rate: r(0.92, 1.08) }); },
  slide() { play('slide', { rate: r(0.95, 1.05) }); },
  collapse() { play('collapse', { rate: r(0.9, 1.1) }); },
  crack() { play('crack'); },
  bump() { play('bump'); },
  key() { play('key'); },
  door() { play('door'); },
  win() { play('win'); },
  lose() { play('lose'); },
  click() { play('click', { rate: r(0.97, 1.03) }); },
  star(i) { play('star' + Math.min(2, i)); },
  hint() { play('hint'); },
  teleport() { play('teleport'); },
  lift() { play('lift'); },
  stomp() { play('stomp'); },
  enemyFall() { play('enemyFall'); },
  bossFall() { play('bossFall'); },
  caught() { play('caught'); },
  bridge() { play('bridge'); },
  wake() { play('wake'); },
  undo() { play('undo'); },
  coin() { play('coin'); },
};
