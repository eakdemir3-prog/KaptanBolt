// Kaptan Bolt — ana uygulama: ekranlar, giriş ve oyun akışı
import LEVELS from './levels/levels.json';
import { parseLevel, newState, move, canMove, starsFor, collapsedCount, coverTarget, cloneState, validMoves } from './logic/rules.js';
import { shortest, canWin } from './logic/solver.js';
import { Stage } from './game/stage.js';
import { THEMES, SKINS } from './game/models.js';
import { dailyLevel, dateKey, yesterdayKey } from './logic/daily.js';
import * as Save from './save.js';
import { sfx, unlock as audioUnlock, setSound, setMusic, suspend, resume } from './audio.js';
import { vibrate, setVibration, onBack, exitApp, onPause } from './platform.js';

const MAX = LEVELS.length;
const WORLD_SIZE = 20;
const $ = (id) => document.getElementById(id);
let data = Save.load();
const stage = new Stage($('c'));
stage.onSound = (k) => { if (k === 'collapse') { sfx.collapse(); vibrate('light'); } else if (k === 'key') { sfx.key(); vibrate('medium'); } else if (k === 'stomp' || k === 'bossFall') { sfx[k](); vibrate('heavy'); } else if (sfx[k]) sfx[k](); };
stage.skin = SKINS.find((k) => k.id === data.skin) || SKINS[0];
applySettings();

// Test ve hata ayıklama için dışarıdan erişim
window.KB = { get state() { return game.state; }, get screen() { return screen; }, input: (d) => game.input(d), start: (id) => startLevel(id), data: () => data, idle: () => !game.busy, solve: () => (shortest(game.state, 800000, 20000) || {}).moves,
  _clone: (s) => cloneState(s), _move: (s, d) => move(s, d), dangerCount: () => stage.dangerMarks.length,
  // test yardımcısı: düşmana yakalanan bir hamle dizisi bul
  findCaught: () => { const q = [[cloneState(game.state), []]]; let n = 0; while (q.length && n++ < 20000) { const [s, p] = q.shift(); for (const d of validMoves(s)) { const c = cloneState(s); move(c, d); if (c.status === 'caught') return p.concat(d); if (c.status === 'play') q.push([c, p.concat(d)]); } } return null; } };

let screen = 'menu';
const game = { state: null, level: null, busy: false, queued: null, deadTimer: 0, history: [], undos: 3 };
const UNDOS = 3;

// ---------------- Ekranlar ----------------
function show(name) {
  screen = name;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === name);
  closeModal();
  if (name === 'menu' || name === 'levels' || name === 'garage') showcase();
  if (name === 'garage') { renderGarage(); stage.setSafe(110, $('skinGrid').closest('.garage-panel').offsetHeight + 40); }
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

function renderGarage() {
  const total = Save.totalStars(data);
  $('garageStars').innerHTML = `⭐ ${total}`;
  const cur = data.skin || 'klasik';
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  $('skinGrid').innerHTML = SKINS.map((k) => {
    const open = total >= k.stars || data.settings.unlockAll;
    return `<button class="skin ${k.id === cur ? 'on' : ''} ${open ? '' : 'locked'}" data-skin="${k.id}">
      <span class="sw" style="background:linear-gradient(135deg, ${hex(k.body)} 0 50%, ${hex(k.cap)} 50% 100%); box-shadow: 0 0 0 3px ${hex(k.band)}, 0 0 12px ${hex(k.eye)}"></span>
      <b>${k.name}</b><small>${open ? (k.id === cur ? 'Seçili' : 'Seç') : `🔒 ⭐ ${k.stars}`}</small></button>`;
  }).join('');
}
function pickSkin(id) {
  const k = SKINS.find((x) => x.id === id); if (!k) return;
  if (Save.totalStars(data) < k.stars && !data.settings.unlockAll) { vibrate('light'); return toast(`Bu kostüm ${k.stars} yıldızda açılır.`); }
  data.skin = id; Save.save(data);
  stage.setSkin(k); sfx.star(1);
  renderGarage();
}
function renderMenu() {
  const n = Save.continueLevel(data, MAX);
  const done = Object.keys(data.stars).length;
  const dd = data.daily || {};
  $('dailyInfo').textContent = dd.lastDone === dateKey() ? `✔ Bugün tamam • 🔥 ${dd.streak}` : (dd.lastDone === yesterdayKey() ? `🔥 Seri: ${dd.streak} gün` : 'Yeni bulmaca!');
  $('menuSub').textContent = done >= MAX ? `Tüm bölümler tamamlandı • ⭐ ${Save.totalStars(data)}` : `Bölüm ${n} • ${done}/${MAX} tamamlandı • ⭐ ${Save.totalStars(data)}`;
}

let currentWorld = 1;
function renderLevels() {
  $('starTotal').innerHTML = `⭐ ${Save.totalStars(data)}`;
  const worlds = Math.ceil(MAX / WORLD_SIZE);
  $('worldTabs').innerHTML = Array.from({ length: worlds }, (_, i) => `<button class="${i + 1 === currentWorld ? 'on' : ''}" data-world="${i + 1}">${i + 1}</button>`).join('');
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
  let lv;
  if (typeof id === 'object') lv = id;
  else { id = Math.max(1, Math.min(MAX, id)); lv = LEVELS[id - 1]; }
  game.level = lv;
  game.history = []; game.undos = UNDOS;
  const board = parseLevel(lv);
  game.state = newState(board);
  game.busy = false; game.queued = null; clearTimeout(game.deadTimer);
  stage.menuMode = false;
  stage.setTheme(lv.world);
  stage.build(board, game.state);
  show('game');
  layoutGame();
  $('lvName').innerHTML = lv.daily ? `📅 Günlük Bulmaca<small>${lv.dailyName.toLocaleUpperCase('tr')}</small>` : `${lv.final ? '👑 ' : ''}Bölüm ${lv.id}<small>${THEMES[lv.world].name.toLocaleUpperCase('tr')}</small>`;
  $('banner').classList.add('hidden');
  updateHud();
  updateDanger();
  showTutorial(lv);
}

/** Gidince yakalanacağın kareleri kırmızı X ile göster */
function updateDanger() {
  const s = game.state;
  if (!s || s.status !== 'play' || (!s.enemies.length && !s.boss)) return stage.setDanger([]);
  const cells = [];
  for (const d of validMoves(s)) { const c = cloneState(s); move(c, d); if (c.status === 'caught') cells.push(c.pos); }
  stage.setDanger(cells);
}

function undo() {
  if (game.busy || !game.history.length) return toast('Geri alınacak hamle yok.');
  if (game.undos <= 0) return toast('Bu bölümde geri alma hakkın bitti.');
  game.undos--;
  game.state = game.history.pop();
  game.state.status = 'play';
  clearTimeout(game.deadTimer);
  closeModal();
  $('banner').classList.add('hidden');
  sfx.undo();
  stage.build(game.state.board, game.state);
  updateHud(); updateDanger();
}

function layoutGame() {
  const top = $('lvName').getBoundingClientRect().bottom + 10;
  const tut = $('tutorial');
  const ref = tut.classList.contains('hidden') ? $('moveInfo') : tut;
  const bottom = innerHeight - ref.getBoundingClientRect().top + 14;
  stage.setSafe(top, bottom);
}

function updateHud() {
  const s = game.state, b = s.board;
  const kt = s.keysTaken.filter(Boolean).length;
  const keyIcon = (on) => `<svg class="k" viewBox="0 0 60 80"><circle cx="30" cy="20" r="15" fill="${on ? '#ffcf3a' : '#4b4580'}"/><circle cx="30" cy="20" r="7" fill="#1a1250"/><rect x="26" y="32" width="8" height="34" rx="3" fill="${on ? '#ffcf3a' : '#4b4580'}"/><rect x="34" y="50" width="10" height="6" rx="2" fill="${on ? '#ffcf3a' : '#4b4580'}"/></svg>`;
  $('chipKeys').innerHTML = b.keys.map((_, k) => keyIcon(s.keysTaken[k])).join('') + `<span>${kt}/${b.keys.length}</span>`;
  if (b.stars.mode === 'moves') $('chipCollapse').innerHTML = `<span class="lbl">Hedef</span>≤${b.stars.par[0]}`;
  else $('chipCollapse').innerHTML = `<span class="lbl">Çöken</span>${collapsedCount(s)}/${coverTarget(b)}`;
  const bc = $('chipBoss');
  if (s.boss) { bc.classList.remove('hidden'); bc.innerHTML = s.boss.alive ? '👹 <span class="lbl">Boss</span>' : '💥 <span class="lbl">Yenildi</span>'; } else bc.classList.add('hidden');
  $('hintCount').textContent = data.hints;
  $('undoCount').textContent = game.undos;
  $('undoBtn').classList.toggle('off', !game.history.length || game.undos <= 0);
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
  game.history.push(cloneState(s));
  if (game.history.length > 50) game.history.shift();
  const events = move(s, dir);
  game.busy = true;
  stage.setDanger([]);
  const p = stage.play(events, s);
  setTimeout(updateHud, 60);
  await p;
  updateHud();
  game.busy = false;
  updateDanger();
  if (s.status === 'win') return onWin();
  if (s.status === 'stuck') return onStuck();
  if (s.status === 'caught') return onCaught();
  // Hamle var ama bölüm artık çözülemiyorsa uyar
  game.deadTimer = setTimeout(() => {
    if (game.state !== s || s.status !== 'play') return;
    if (canWin(s, 60000, 60) === false) { const bn = $('banner'); bn.innerHTML = '⚠️ Bu rota çıkmaza girdi'; bn.classList.remove('hidden'); vibrate('medium'); }
  }, 30);
  if (game.queued) { const q = game.queued; game.queued = null; input(q); }
}
game.input = input;

function onWin() {
  const s = game.state, id = game.level.id;
  const stars = starsFor(s);
  if (game.level.daily) return onDailyWin(stars);
  const res = Save.recordWin(data, id, stars, s.moves, MAX);
  sfx.win(); vibrate('heavy');
  if (id === MAX) return finishScreen(stars);
  const cnt = collapsedCount(s), tgt = coverTarget(s.board);
  openModal(`
    <div class="emoji">${game.level.final ? '🏆' : '🎉'}</div>
    <h2>Bölüm Tamamlandı!</h2>
    <p>${game.level.final ? 'Boss yenildi, Kaptan Bolt kapıdan geçti!' : 'Kaptan Bolt kapıdan geçti.'}</p>
    <div class="stars">${[0, 1, 2].map((i) => `<div class="s ${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s"></div>`).join('')}</div>
    <div class="stat"><div><b>${s.moves}</b>hamle</div>${s.board.stars.mode === 'moves' ? `<div><b>≤${s.board.stars.par[0]}</b>hedef</div>` : `<div><b>${cnt}/${tgt}</b>çöken kare</div>`}</div>
    ${stars < 3 ? `<div class="tip">${s.board.stars.mode === 'moves' ? `⭐⭐⭐ için en fazla <b>${s.board.stars.par[0]} hamlede</b> bitir!` : `⭐⭐⭐ için kapıya girmeden önce <b>bütün kareleri</b> çökert!`}</div>` : (res.bonusHint ? `<div class="tip">💡 Kusursuz! +1 ipucu kazandın.</div>` : '')}
    <button class="btn primary" data-act="next">Sonraki Bölüm →</button>
    <button class="btn" data-act="restart"><span class="i-restart"></span>Tekrar Oyna</button>
    <button class="linkbtn" data-act="levels">Bölümler</button>`);
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 250 + i * 250);
}

function onDailyWin(stars) {
  const key = game.level.daily, d = data.daily || {};
  if (d.lastDone !== key) { d.streak = d.lastDone === yesterdayKey() ? (d.streak || 0) + 1 : 1; d.lastDone = key; d.total = (d.total || 0) + 1; }
  d.stars = Math.max(d.lastDone === key && d.date === key ? d.stars || 0 : 0, stars); d.date = key;
  data.daily = d; Save.save(data);
  sfx.win(); vibrate('heavy');
  openModal(`
    <div class="emoji">📅🔥</div>
    <h2>Günün Bulmacası Tamam!</h2>
    <p>Seri: <b>${d.streak} gün</b>. Yarın yeni bulmaca seni bekliyor.</p>
    <div class="stars">${[0, 1, 2].map((i) => `<div class="s ${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s"></div>`).join('')}</div>
    ${stars < 3 ? `<div class="tip">⭐⭐⭐ için kapıya girmeden önce <b>bütün kareleri</b> çökert!</div>` : ''}
    <button class="btn" data-act="restart"><span class="i-restart"></span>Tekrar Oyna</button>
    <button class="btn primary" data-act="menu">Ana Menü</button>`);
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 250 + i * 250);
}

const undoBtnHtml = () => (game.undos > 0 && game.history.length ? `<button class="btn gold" data-act="undo">↶ Geri Al (${game.undos})</button>` : '');

function onStuck() {
  sfx.lose(); vibrate('heavy');
  openModal(`
    <div class="emoji">🤖💤</div>
    <h2>Yol Kapandı</h2>
    <p>Gidecek kare kalmadı. Rotanı yeniden planla, Kaptan!</p>
    ${undoBtnHtml()}
    <button class="btn primary" data-act="restart"><span class="i-restart"></span>Yeniden Başla</button>
    <button class="btn purple" data-act="levels">Bölümler</button>`, 'fail');
}

function onCaught() {
  sfx.lose(); vibrate('heavy');
  openModal(`
    <div class="emoji">🤖💥</div>
    <h2>Yakalandın!</h2>
    <p>Bir düşman robot Kaptan Bolt'a yetişti. Kırmızı X olan karelere gitme!</p>
    ${undoBtnHtml()}
    <button class="btn primary" data-act="restart"><span class="i-restart"></span>Yeniden Başla</button>
    <button class="btn purple" data-act="levels">Bölümler</button>`, 'fail');
}

function finishScreen(stars) {
  openModal(`
    <div class="emoji">🏆</div>
    <h2>Tebrikler Kaptan!</h2>
    <p>${Math.ceil(MAX / WORLD_SIZE)} dünyanın ${MAX} bölümünü de bitirdin.</p>
    <div class="stars">${[0, 1, 2].map((i) => `<div class="s ${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s"></div>`).join('')}</div>
    <div class="stat"><div><b>⭐ ${Save.totalStars(data)}</b>toplam yıldız</div><div><b>${MAX * 3}</b>en fazla</div></div>
    <div class="tip">Bütün dünyaları bitirdin! Eksik yıldızları toplayıp yeni kostümleri aç, günlük bulmacayı kaçırma.</div>
    <button class="btn gold" data-act="levels">Bölümler</button>
    <button class="btn" data-act="menu">Ana Menü</button>`);
}

function useHint() {
  if (screen !== 'game' || game.busy || game.state.status !== 'play') return;
  if (data.hints <= 0) return toast('İpucu kalmadı. Bölümleri ⭐⭐⭐ ile bitirerek ipucu kazanırsın.');
  const r = shortest(game.state, 400000, 2500);
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
  patrol: '🚨 <b>Devriye robotu!</b><small>Senin her hamlenden sonra okun gösterdiği yöne bir kare gider, önü kapanınca geri döner. Üstüne gelirse yakalanırsın!</small><button class="btn small primary" data-act="tutok">Anladım</button>',
  strong: '🛡️ <b>Sağlam taş!</b><small>Metal kuşaklı taşlar ilk ayrılışta sadece çatlar, ikinci ayrılışta çöker. Üstünden iki kez geçebilirsin.</small><button class="btn small primary" data-act="tutok">Anladım</button>',
  portal: '🌀 <b>Portallar!</b><small>Aynı renkli portala basınca diğerine ışınlanırsın. Girdiğin portal arkandan çöker.</small><button class="btn small primary" data-act="tutok">Anladım</button>',
  chaser: '👁️ <b>Takipçi robot!</b><small>Her hamlende sana bir adım yaklaşır ama önüne bakmaz: onu çöken karelere ya da boşluklara çekip düşür!</small><button class="btn small primary" data-act="tutok">Anladım</button>',
  boss: '👹 <b>BOSS!</b><small>Dev robot kapıyı kilitli tutuyor ve seni kovalıyor. Onu boşluklara ya da çöken karelere çekip düşür, sonra kapıya koş!</small><button class="btn small primary" data-act="tutok">Hazırım!</button>',
  bridge: '🌉 <b>Düğme ve köprü!</b><small>Kırmızı düğmeye basınca soluk görünen köprüler açılır. Açılmadan önce oralar boşluktur. Takipçileri oraya çekebilirsin!</small><button class="btn small primary" data-act="tutok">Anladım</button>',
  arrow: '➡️ <b>Ok kareler!</b><small>Ok kareye basınca robot okun yönüne itilir. Önü kapalıysa okun üstünde durur. Rotayı okları hesaba katarak planla.</small><button class="btn small primary" data-act="tutok">Anladım</button>',
  castle: '🏰 <b>Son Kale!</b><small>Buradan sonra bütün mekanikler karışık geliyor. Son bölümde seni en güçlü boss bekliyor!</small><button class="btn small primary" data-act="tutok">Hazırım!</button>',
  ice: '❄️ <b>Buzlu kareler!</b><small>Buza basınca robot aynı yönde kaymaya devam eder. Kayarken geçtiği kareler de çöker.</small><button class="btn small primary" data-act="tutok">Anladım</button>',
};
function showTutorial(lv) {
  const t = $('tutorial');
  t.classList.add('hidden');
  if (!lv.tutorial || !TUTORIALS[lv.tutorial] || data.seenTutorial[lv.tutorial] && lv.tutorial !== 'swipe') return;
  if (lv.tutorial === 'swipe' && data.stars[1]) return;
  t.innerHTML = TUTORIALS[lv.tutorial]; t.dataset.kind = lv.tutorial; t.classList.remove('hidden');
  requestAnimationFrame(layoutGame);
}
function hideTutorial(kind) {
  const t = $('tutorial');
  if (t.classList.contains('hidden') || (kind && t.dataset.kind !== kind)) return;
  t.classList.add('hidden');
  data.seenTutorial[t.dataset.kind] = true; Save.save(data);
  layoutGame();
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
      <div class="row">🔓 Tüm bölümler açık (test) ${tg('unlockAll')}</div>
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
      <li>🚨 Devriye ve 👁️ takipçi robotlar senin her hamlenden sonra hareket eder. Sana değerlerse yakalanırsın. Takipçileri boşluklara çekip düşürebilirsin.</li>
      <li>🛡️ Sağlam taş iki kez geçilir. 🌀 Portal seni eşine ışınlar.</li>
      <li>👹 Boss bölümlerinde kapı, boss düşmeden açılmaz. Düşmanlar ilk hamlende uyanır, kırmızı X olan karelere gidersen yakalanırsın.</li>
      <li>🌉 Düğme köprüleri açar. ➡️ Ok kareler robotu iter.</li>
      <li>↶ Her bölümde 3 geri alma hakkın var.</li>
      <li>⭐ Bitir • ⭐⭐ karelerin %70'ini çökert • ⭐⭐⭐ <b>hepsini</b> çökert. Düşmanlı bölümlerde yıldızlar hamle sayısına göredir.</li>
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
  if (el.dataset.skin) return pickSkin(el.dataset.skin);
  if (el.dataset.lv) {
    if (el.dataset.locked) { vibrate('light'); return toast('Bu bölümü açmak için öncekini bitir.'); }
    return startLevel(+el.dataset.lv);
  }
  if (el.dataset.world) { currentWorld = +el.dataset.world; return renderLevels(); }
  if (el.dataset.toggle) { const k = el.dataset.toggle; data.settings[k] = !data.settings[k]; Save.save(data); applySettings(); el.classList.toggle('on', data.settings[k]); return; }
  if (el.dataset.quality) { data.settings.quality = el.dataset.quality; Save.save(data); applySettings(); return settingsModal(); }
  switch (el.dataset.act) {
    case 'continue': return startLevel(Save.continueLevel(data, MAX));
    case 'levels': currentWorld = game.level ? game.level.world : Math.ceil(Save.continueLevel(data, MAX) / WORLD_SIZE); stage.menuMode = false; stage.board = null; return show('levels');
    case 'menu': stage.board = null; return show('menu');
    case 'back': return back();
    case 'settings': return settingsModal();
    case 'howto': return howtoModal();
    case 'close': return closeModal();
    case 'restart': return startLevel(game.level.daily ? game.level : game.level.id);
    case 'undo': return undo();
    case 'daily': return startLevel(dailyLevel());
    case 'garage': stage.board = null; return show('garage');
    case 'skin': return pickSkin(el.dataset.skin);
    case 'next': return startLevel(game.level.id + 1);
    case 'hint': return useHint();
    case 'tutok': return hideTutorial();
    case 'resetask': return openModal(`<div class="emoji">⚠️</div><h2>Emin misin?</h2><p>Tüm yıldızlar ve açılan bölümler silinecek. Bu işlem geri alınamaz.</p><button class="btn purple" data-act="reset">Evet, sıfırla</button><button class="btn primary" data-act="settings">Vazgeç</button>`, 'fail');
    case 'reset': data = Save.reset(); applySettings(); closeModal(); toast('İlerleme sıfırlandı.'); if (screen === 'game') return startLevel(1); return show(screen);
  }
});

function back() {
  if (!$('modal').classList.contains('hidden')) { if (screen === 'game' && game.state && game.state.status !== 'play') { stage.board = null; return show('levels'); } return closeModal(); }
  if (screen === 'game' && !game.level.daily) { currentWorld = game.level.world; stage.board = null; return show('levels'); }
  if (screen === 'levels' || screen === 'garage') { stage.board = null; return show('menu'); }
  if (screen === 'game' && game.level.daily) { stage.board = null; return show('menu'); }
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
window.addEventListener('resize', () => { if (screen === 'game') layoutGame(); else if (screen === 'garage') stage.setSafe(110, $('skinGrid').closest('.garage-panel').offsetHeight + 40); else if (stage.menuMode) stage.setSafe(innerHeight * 0.36, innerHeight * 0.3); });

show('menu');
document.fonts && document.fonts.ready.then(() => { if (screen === 'game') layoutGame(); });
