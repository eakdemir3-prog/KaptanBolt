// Kaptan Bolt — ana uygulama: ekranlar, giriş ve oyun akışı
import LEVELS from './levels/levels.json';
import { parseLevel, newState, move, canMove, starsFor, collapsedCount, coverTarget } from './logic/rules.js';
import { shortest, canWin } from './logic/solver.js';
import { Stage } from './game/stage.js';
import { THEMES } from './game/models.js';
import * as Save from './save.js';
import { sfx, unlock as audioUnlock, setSound, setMusic, suspend, resume } from './audio.js';
import { vibrate, setVibration, onBack, exitApp, onPause } from './platform.js';

const MAX = LEVELS.length;
const WORLD_SIZE = 20;
const $ = (id) => document.getElementById(id);
let data = Save.load();
const stage = new Stage($('c'));
stage.onSound = (k) => { if (k === 'collapse') { sfx.collapse(); vibrate('light'); } else if (k === 'key') { sfx.key(); vibrate('medium'); } else if (sfx[k]) sfx[k](); };
applySettings();

// Test ve hata ayıklama için dışarıdan erişim
window.KB = { get state() { return game.state; }, get screen() { return screen; }, input: (d) => game.input(d), start: (id) => startLevel(id), data: () => data, idle: () => !game.busy };

let screen = 'menu';
const game = { state: null, level: null, busy: false, queued: null, deadTimer: 0 };

// ---------------- Ekranlar ----------------
function show(name) {
  screen = name;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === name);
  closeModal();
  if (name === 'menu' || name === 'levels') showcase();
  if (name === 'menu') renderMenu();
  if (name === 'levels') renderLevels();
}

const SHOWCASE = { id: 0, grid: ['K..#D', '.#...', '..S..'] };
function showcase() {
  if (stage.menuMode && stage.board) return;
  stage.menuMode = true;
  stage.setTheme(1);
  const b = parseLevel(SHOWCASE);
  stage.build(b, newState(b));
  stage.setSafe(innerHeight * 0.36, innerHeight * 0.3);
}

function renderMenu() {
  const n = Save.continueLevel(data, MAX);
  const done = Object.keys(data.stars).length;
  $('menuSub').textContent = done >= MAX ? `Tüm bölümler tamamlandı • ⭐ ${Save.totalStars(data)}` : `Bölüm ${n} • ${done}/${MAX} tamamlandı • ⭐ ${Save.totalStars(data)}`;
}

let currentWorld = 1;
function renderLevels() {
  $('starTotal').innerHTML = `⭐ ${Save.totalStars(data)}`;
  const worlds = Math.ceil(MAX / WORLD_SIZE);
  $('worldTabs').innerHTML = Array.from({ length: worlds }, (_, i) => `<button class="${i + 1 === currentWorld ? 'on' : ''}" data-world="${i + 1}">${i * WORLD_SIZE + 1}–${(i + 1) * WORLD_SIZE}</button>`).join('');
  const from = (currentWorld - 1) * WORLD_SIZE + 1, to = Math.min(MAX, currentWorld * WORLD_SIZE);
  let ws = 0; for (let i = from; i <= to; i++) ws += data.stars[i] || 0;
  $('worldHead').innerHTML = `<b>Dünya ${currentWorld}: ${THEMES[currentWorld].name}</b><span>⭐ ${ws}/${(to - from + 1) * 3}</span>`;
  let html = '';
  for (let id = from; id <= to; id++) {
    const lv = LEVELS[id - 1], st = data.stars[id] || 0;
    const fin = lv.final ? ' final' : '';
    const crown = lv.final ? '<span class="crown">👑</span>' : '';
    if (st) html += `<button class="lv done${fin}" data-lv="${id}">${crown}${id}<span class="st">${'<b>★</b>'.repeat(st)}${'<i>★</i>'.repeat(3 - st)}</span></button>`;
    else if (Save.isUnlocked(data, id)) html += `<button class="lv open${fin}" data-lv="${id}">${crown}${id}</button>`;
    else html += `<button class="lv lock${fin}" data-lv="${id}" data-locked="1">${crown}<span class="lk"></span>${id}</button>`;
  }
  $('lvGrid').innerHTML = html;
}

// ---------------- Oyun ----------------
function startLevel(id) {
  id = Math.max(1, Math.min(MAX, id));
  const lv = LEVELS[id - 1];
  game.level = lv;
  const board = parseLevel(lv);
  game.state = newState(board);
  game.busy = false; game.queued = null; clearTimeout(game.deadTimer);
  stage.menuMode = false;
  stage.setTheme(lv.world);
  stage.build(board, game.state);
  show('game');
  layoutGame();
  $('lvName').innerHTML = `${lv.final ? '👑 ' : ''}Bölüm ${id}<small>${THEMES[lv.world].name.toLocaleUpperCase('tr')}</small>`;
  $('banner').classList.add('hidden');
  updateHud();
  showTutorial(lv);
}

function layoutGame() {
  const top = $('lvName').getBoundingClientRect().bottom + 10;
  const bottom = innerHeight - $('moveInfo').getBoundingClientRect().top + 14;
  stage.setSafe(top, bottom);
}

function updateHud() {
  const s = game.state, b = s.board;
  const kt = s.keysTaken.filter(Boolean).length;
  const keyIcon = (on) => `<svg class="k" viewBox="0 0 60 80"><circle cx="30" cy="20" r="15" fill="${on ? '#ffcf3a' : '#4b4580'}"/><circle cx="30" cy="20" r="7" fill="#1a1250"/><rect x="26" y="32" width="8" height="34" rx="3" fill="${on ? '#ffcf3a' : '#4b4580'}"/><rect x="34" y="50" width="10" height="6" rx="2" fill="${on ? '#ffcf3a' : '#4b4580'}"/></svg>`;
  $('chipKeys').innerHTML = b.keys.map((_, k) => keyIcon(s.keysTaken[k])).join('') + `<span>${kt}/${b.keys.length}</span>`;
  $('chipCollapse').innerHTML = `<span class="lbl">Çöken</span>${collapsedCount(s)}/${coverTarget(b)}`;
  $('hintCount').textContent = data.hints;
  $('moveInfo').textContent = `Hamle: ${s.moves}` + (data.best[game.level.id] != null ? `  •  En iyi: ${data.best[game.level.id]}` : '');
}

async function input(dir) {
  if (screen !== 'game' || !game.state || !$('modal').classList.contains('hidden')) return;
  if (game.busy) { game.queued = dir; return; }
  const s = game.state;
  if (s.status !== 'play') return;
  if (!canMove(s, dir)) { sfx.bump(); vibrate('light'); stage.bump(dir); return; }
  hideTutorial('swipe');
  stage.clearHint();
  $('banner').classList.add('hidden');
  clearTimeout(game.deadTimer);
  const events = move(s, dir);
  game.busy = true;
  const p = stage.play(events);
  setTimeout(updateHud, 60);
  await p;
  updateHud();
  game.busy = false;
  if (s.status === 'win') return onWin();
  if (s.status === 'stuck') return onStuck();
  // Hamle var ama bölüm artık çözülemiyorsa uyar
  game.deadTimer = setTimeout(() => {
    if (game.state !== s || s.status !== 'play') return;
    if (canWin(s, 60000) === false) { const bn = $('banner'); bn.innerHTML = '⚠️ Bu rota çıkmaza girdi'; bn.classList.remove('hidden'); vibrate('medium'); }
  }, 30);
  if (game.queued) { const q = game.queued; game.queued = null; input(q); }
}
game.input = input;

function onWin() {
  const s = game.state, id = game.level.id;
  const stars = starsFor(s);
  const res = Save.recordWin(data, id, stars, s.moves, MAX);
  sfx.win(); vibrate('heavy');
  if (id === MAX) return finishScreen(stars);
  const cnt = collapsedCount(s), tgt = coverTarget(s.board);
  openModal(`
    <div class="emoji">🎉</div>
    <h2>Bölüm Tamamlandı!</h2>
    <p>Kaptan Bolt kapıdan geçti.</p>
    <div class="stars">${[0, 1, 2].map((i) => `<div class="s ${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s"></div>`).join('')}</div>
    <div class="stat"><div><b>${s.moves}</b>hamle</div><div><b>${cnt}/${tgt}</b>çöken kare</div></div>
    ${stars < 3 ? `<div class="tip">⭐⭐⭐ için kapıya girmeden önce <b>bütün kareleri</b> çökert!</div>` : (res.bonusHint ? `<div class="tip">💡 Kusursuz! +1 ipucu kazandın.</div>` : '')}
    <button class="btn primary" data-act="next">Sonraki Bölüm →</button>
    <button class="btn" data-act="restart"><span class="i-restart"></span>Tekrar Oyna</button>
    <button class="linkbtn" data-act="levels">Bölümler</button>`);
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 250 + i * 250);
}

function onStuck() {
  sfx.lose(); vibrate('heavy');
  openModal(`
    <div class="emoji">🤖💤</div>
    <h2>Yol Kapandı</h2>
    <p>Gidecek kare kalmadı. Rotanı yeniden planla, Kaptan!</p>
    <button class="btn primary" data-act="restart"><span class="i-restart"></span>Yeniden Başla</button>
    <button class="btn purple" data-act="levels">Bölümler</button>`, 'fail');
}

function finishScreen(stars) {
  openModal(`
    <div class="emoji">🏆</div>
    <h2>Tebrikler Kaptan!</h2>
    <p>İlk 3 dünyanın ${MAX} bölümünü de bitirdin.</p>
    <div class="stars">${[0, 1, 2].map((i) => `<div class="s ${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s"></div>`).join('')}</div>
    <div class="stat"><div><b>⭐ ${Save.totalStars(data)}</b>toplam yıldız</div><div><b>${MAX * 3}</b>en fazla</div></div>
    <div class="tip">Dünya 4–10 yakında geliyor: düşman robotlar ve boss savaşları! O zamana kadar eksik yıldızları topla.</div>
    <button class="btn gold" data-act="levels">Bölümler</button>
    <button class="btn" data-act="menu">Ana Menü</button>`);
}

function useHint() {
  if (screen !== 'game' || game.busy || game.state.status !== 'play') return;
  if (data.hints <= 0) return toast('İpucu kalmadı. Bölümleri ⭐⭐⭐ ile bitirerek ipucu kazanırsın.');
  const r = shortest(game.state, 250000);
  if (!r) { const bn = $('banner'); bn.innerHTML = '⚠️ Bu rota çıkmaza girdi'; bn.classList.remove('hidden'); return toast('Buradan çıkış yok. Yeniden başla!'); }
  if (r.unknown || !r.moves.length) return toast('İpucu hesaplanamadı, biraz ilerleyip tekrar dene.');
  data.hints--; Save.save(data); updateHud();
  sfx.hint();
  stage.showHint(r.moves[0]);
}

// ---------------- Öğretici ----------------
const TUTORIALS = {
  swipe: '<span class="hand">👆</span><br>Robotu hareket ettirmek için ekranı <b>kaydır</b><small>Ayrıldığın kare çöker, geri dönemezsin! Anahtarı al, kapıya ulaş.</small>',
  keys: '🔑🔑 Bu bölümde <b>iki anahtar</b> var<small>Kapı tüm anahtarlar toplanınca açılır. Hangisine önce gideceğini iyi seç!</small><button class="btn small primary" data-act="tutok">Anladım</button>',
  ice: '❄️ <b>Buzlu kareler!</b><small>Buza basınca robot aynı yönde kaymaya devam eder. Kayarken geçtiği kareler de çöker.</small><button class="btn small primary" data-act="tutok">Anladım</button>',
};
function showTutorial(lv) {
  const t = $('tutorial');
  t.classList.add('hidden');
  if (!lv.tutorial || data.seenTutorial[lv.tutorial] && lv.tutorial !== 'swipe') return;
  if (lv.tutorial === 'swipe' && data.stars[1]) return;
  t.innerHTML = TUTORIALS[lv.tutorial]; t.dataset.kind = lv.tutorial; t.classList.remove('hidden');
}
function hideTutorial(kind) {
  const t = $('tutorial');
  if (t.classList.contains('hidden') || (kind && t.dataset.kind !== kind)) return;
  t.classList.add('hidden');
  data.seenTutorial[t.dataset.kind] = true; Save.save(data);
}

// ---------------- Modal / ayarlar ----------------
function openModal(html, cls = '') { $('card').className = 'card ' + cls; $('card').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal() { $('modal').classList.add('hidden'); }
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600); }

function settingsModal() {
  const s = data.settings;
  const tg = (k) => `<button class="toggle ${s[k] ? 'on' : ''}" data-toggle="${k}" aria-label="${k}"></button>`;
  openModal(`
    <h2>Ayarlar</h2>
    <div class="rows">
      <div class="row">🔊 Ses efektleri ${tg('sound')}</div>
      <div class="row">🎵 Müzik ${tg('music')}</div>
      <div class="row">📳 Titreşim ${tg('vibration')}</div>
      <div class="row">✨ Grafik <div class="seg"><button class="${s.quality === 'high' ? 'on' : ''}" data-quality="high">Yüksek</button><button class="${s.quality !== 'high' ? 'on' : ''}" data-quality="low">Dengeli</button></div></div>
    </div>
    <button class="btn" data-act="howto">Nasıl Oynanır?</button>
    <button class="btn purple" data-act="resetask">İlerlemeyi Sıfırla</button>
    <button class="btn primary" data-act="close">Kapat</button>
    <div class="foot">Kaptan Bolt v1.0 • EA Vision Labs</div>`);
}
function howtoModal() {
  openModal(`
    <h2>Nasıl Oynanır?</h2>
    <ul class="rules">
      <li>Ekranı kaydırarak <b>Kaptan Bolt</b>'u bir kare ilerlet.</li>
      <li>Ayrıldığın kare <b>çöker</b>. Çöken karelere, boşluklara ve tahta dışına gidilemez.</li>
      <li>Tüm <b>🔑 anahtarları</b> topla, <b>kapı</b> açılsın. Kilitli kapı duvar gibidir.</li>
      <li><b>❄️ Buzda</b> robot aynı yönde kayar, buz olmayan karede ya da önü kapanınca durur.</li>
      <li>⭐ Bitir • ⭐⭐ karelerin %70'ini çökert • ⭐⭐⭐ <b>hepsini</b> çökert.</li>
      <li>💡 İpucu bir sonraki doğru hamleyi gösterir. Her yeni ⭐⭐⭐ +1 ipucu verir.</li>
    </ul>
    <button class="btn primary" data-act="${screen === 'game' ? 'close' : 'settings'}">Tamam</button>`);
}

function applySettings() {
  const s = data.settings;
  setSound(s.sound); setMusic(s.music); setVibration(s.vibration);
  if (stage.quality !== s.quality) stage.setQuality(s.quality);
}

// ---------------- Olaylar ----------------
document.addEventListener('click', (e) => {
  const el = e.target.closest('button'); if (!el) return;
  audioUnlock();
  sfx.click();
  if (el.dataset.lv) {
    if (el.dataset.locked) { vibrate('light'); return toast('Bu bölümü açmak için öncekini bitir.'); }
    return startLevel(+el.dataset.lv);
  }
  if (el.dataset.world) { currentWorld = +el.dataset.world; return renderLevels(); }
  if (el.dataset.toggle) { const k = el.dataset.toggle; data.settings[k] = !data.settings[k]; Save.save(data); applySettings(); el.classList.toggle('on', data.settings[k]); return; }
  if (el.dataset.quality) { data.settings.quality = el.dataset.quality; Save.save(data); applySettings(); return settingsModal(); }
  switch (el.dataset.act) {
    case 'continue': return startLevel(Save.continueLevel(data, MAX));
    case 'levels': currentWorld = game.level ? game.level.world : Math.min(3, Math.ceil(Save.continueLevel(data, MAX) / WORLD_SIZE)); stage.menuMode = false; stage.board = null; return show('levels');
    case 'menu': stage.board = null; return show('menu');
    case 'back': return back();
    case 'settings': return settingsModal();
    case 'howto': return howtoModal();
    case 'close': return closeModal();
    case 'restart': return startLevel(game.level.id);
    case 'next': return startLevel(game.level.id + 1);
    case 'hint': return useHint();
    case 'tutok': return hideTutorial();
    case 'resetask': return openModal(`<div class="emoji">⚠️</div><h2>Emin misin?</h2><p>Tüm yıldızlar ve açılan bölümler silinecek. Bu işlem geri alınamaz.</p><button class="btn purple" data-act="reset">Evet, sıfırla</button><button class="btn primary" data-act="settings">Vazgeç</button>`, 'fail');
    case 'reset': data = Save.reset(); applySettings(); closeModal(); toast('İlerleme sıfırlandı.'); if (screen === 'game') return startLevel(1); return show(screen);
  }
});

function back() {
  if (!$('modal').classList.contains('hidden')) { if (screen === 'game' && game.state && game.state.status !== 'play') { stage.board = null; return show('levels'); } return closeModal(); }
  if (screen === 'game') { currentWorld = game.level.world; stage.board = null; return show('levels'); }
  if (screen === 'levels') { stage.board = null; return show('menu'); }
  exitApp();
}
onBack(back);
onPause(() => { stage.paused = true; suspend(); }, () => { stage.paused = false; resume(); });

// Kaydırma
let sx = 0, sy = 0, tracking = false;
window.addEventListener('pointerdown', (e) => {
  audioUnlock();
  if (e.target.closest('button') || screen !== 'game') return;
  tracking = true; sx = e.clientX; sy = e.clientY;
});
window.addEventListener('pointermove', (e) => {
  if (!tracking) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.hypot(dx, dy) > 34) { tracking = false; input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }
});
window.addEventListener('pointerup', (e) => {
  if (!tracking) return; tracking = false;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.hypot(dx, dy) > 18) input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});
window.addEventListener('keydown', (e) => {
  const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[e.key];
  if (m) { e.preventDefault(); input(m); }
  if (e.key === 'r' && screen === 'game') startLevel(game.level.id);
});
window.addEventListener('resize', () => { if (screen === 'game') layoutGame(); else if (stage.menuMode) stage.setSafe(innerHeight * 0.36, innerHeight * 0.3); });

show('menu');
document.fonts && document.fonts.ready.then(() => { if (screen === 'game') layoutGame(); });
