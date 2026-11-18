// Kaptan Bolt — ana uygulama: ekranlar, giriş, oyun akışı ve oyun içi ekonomi
import LEVELS from './levels/levels.json';
import { parseLevel, newState, move, canMove, starsFor, collapsedCount, coverTarget, cloneState, validMoves } from './logic/rules.js';
import { shortest, canWin } from './logic/solver.js';
import { dailyLevel, dateKey, yesterdayKey } from './logic/daily.js';
import { Stage } from './game/stage.js';
import { THEMES, SKINS } from './game/models.js';
import { skinImg, boltHead, bossImg, worldIcon } from './game/thumbs.js';
import * as Save from './save.js';
import * as Eco from './economy.js';
import { sfx, unlock as audioUnlock, setSound, setMusic, suspend, resume } from './audio.js';
import { vibrate, setVibration, onBack, exitApp, onPause } from './platform.js';

const MAX = LEVELS.length;
const WORLD_SIZE = Save.WORLD_SIZE;
const WORLDS = Math.ceil(MAX / WORLD_SIZE);
const UNDOS = 3;
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

let data = Eco.ensure(Save.load());
Eco.dailyQuests(data, dateKey());
const save = () => Save.save(data);
const stage = new Stage($('c'));
stage.skin = SKINS.find((k) => k.id === data.skin) || SKINS[0];
stage.onSound = (k) => {
  if (k === 'collapse') { sfx.collapse(); vibrate('light'); }
  else if (k === 'key') { sfx.key(); vibrate('medium'); }
  else if (k === 'stomp' || k === 'bossFall') { sfx[k](); vibrate('heavy'); }
  else if (sfx[k]) sfx[k]();
};

let screen = 'menu';
let currentWorld = 1;
const game = { state: null, level: null, busy: false, queued: null, deadTimer: 0, history: [], undos: UNDOS, lossPending: false };

// SVG simgeler (emoji yerine; her telefonda aynı görünür)
const BOLT = (cls = '') => `<svg viewBox="0 0 24 32" class="ic ${cls}"><path d="M14 0L2 18h8l-3 14L22 12h-9z" fill="#ffd54a" stroke="#a86a00" stroke-width="1"/></svg>`;
const COIN = `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="10" fill="#ffcf3a" stroke="#b07a00" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#b07a00" stroke-width="1.5"/></svg>`;
const fmtNum = (n) => n.toLocaleString('tr-TR');
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// Test ve hata ayıklama için dışarıdan erişim
window.KB = {
  get state() { return game.state; }, get screen() { return screen; }, input: (d) => game.input(d), start: (id) => startLevel(id),
  data: () => data, idle: () => !game.busy, solve: () => (shortest(game.state, 800000, 20000) || {}).moves,
  _clone: (s) => cloneState(s), _move: (s, d) => move(s, d), dangerCount: () => stage.dangerMarks.length,
  findCaught: () => { const q = [[cloneState(game.state), []]]; let n = 0; while (q.length && n++ < 20000) { const [s, p] = q.shift(); for (const d of validMoves(s)) { const c = cloneState(s); move(c, d); if (c.status === 'caught') return p.concat(d); if (c.status === 'play') q.push([c, p.concat(d)]); } } return null; },
};

// ---------------- Ekranlar ----------------
function show(name) {
  screen = name;
  for (const s of $$('.screen')) s.classList.toggle('on', s.id === name);
  closeModal();
  stage.paused = !(name === 'menu' || name === 'game');
  if (name === 'menu') { showcase(); renderMenu(); }
  if (name === 'worlds') renderWorlds();
  if (name === 'map') renderMap();
  if (name === 'garage') renderGarage();
  if (name === 'ach') renderAch();
  renderRes();
}

const SHOWCASE = { id: 0, grid: ['K..#D', '.#...', '..S..'] };
function showcase() {
  if (!(stage.menuMode && stage.board)) {
    stage.menuMode = true;
    stage.setTheme(1);
    const b = parseLevel(SHOWCASE);
    stage.build(b, newState(b));
  }
  layoutMenu();
}
/** Menüde 3D tahta logonun altı ile düğmelerin üstü arasına yerleşir (hiçbir telefonda üst üste binmez) */
function layoutMenu() {
  const top = $('menuLogo').getBoundingClientRect().bottom + 8;
  const bottom = innerHeight - $('menuBottom').getBoundingClientRect().top + 8;
  stage.setSafe(top, bottom);
}

function renderRes() {
  Eco.tickEnergy(data);
  const inf = data.settings.infiniteEnergy;
  const next = Eco.nextEnergyIn(data);
  for (const el of $$('.energy-chip')) el.innerHTML = `${BOLT()}<span>${inf ? '∞' : `${data.energy}/${Eco.ENERGY_MAX}`}</span>${!inf && next ? `<span class="lbl t">${Eco.fmtTime(next)}</span>` : ''}`;
  for (const el of $$('.coin-chip')) el.innerHTML = `${COIN}<span>${fmtNum(data.coins)}</span>`;
}
setInterval(() => { if (screen !== 'game') renderRes(); if (energyModalOpen) renderEnergyModal(); }, 1000);

function renderMenu() {
  const n = Save.continueLevel(data, MAX);
  const done = Object.keys(data.stars).length;
  $('menuSub').textContent = done >= MAX ? `Tüm bölümler tamamlandı • ⭐ ${Save.totalStars(data)}` : `Bölüm ${n} • Dünya ${Save.worldOf(n)} • ⭐ ${Save.totalStars(data)}`;
  const dd = data.daily || {};
  $('dailyInfo').textContent = dd.lastDone === dateKey() ? `✔ Bugün • 🔥${dd.streak}` : (dd.lastDone === yesterdayKey() ? `🔥 ${dd.streak} gün` : 'Yeni bulmaca!');
  const qr = Eco.questsReady(data), ar = Eco.achReady({ ...data, totalStars: Save.totalStars(data) });
  $('questBadge').textContent = qr; $('questBadge').classList.toggle('hidden', !qr);
  $('achBadge').textContent = ar; $('achBadge').classList.toggle('hidden', !ar);
}

function worldStars(w) { let s = 0; for (let i = (w - 1) * WORLD_SIZE + 1; i <= Math.min(MAX, w * WORLD_SIZE); i++) s += data.stars[i] || 0; return s; }
function worldDone(w) { let n = 0; for (let i = (w - 1) * WORLD_SIZE + 1; i <= Math.min(MAX, w * WORLD_SIZE); i++) if (data.stars[i]) n++; return n; }

function renderWorlds() {
  let html = '';
  for (let w = 1; w <= WORLDS; w++) {
    const th = THEMES[w], open = Save.worldUnlocked(data, w);
    const done = worldDone(w), pct = Math.round((done / WORLD_SIZE) * 100);
    const bossDone = !!data.stars[w * WORLD_SIZE];
    const next = (() => { for (let i = (w - 1) * WORLD_SIZE + 1; i <= w * WORLD_SIZE; i++) if (!data.stars[i]) return i; return 0; })();
    html += `<button class="wc ${open ? '' : 'lock'}" data-world="${w}" style="background:linear-gradient(110deg, ${hex(th.torch)}55, ${hex(th.bg)} 70%)">
      <img src="${worldIcon(w)}" alt=""><div class="num">DÜNYA ${w}</div><div class="nm">${th.name}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="meta"><span>⭐ ${worldStars(w)}/${WORLD_SIZE * 3}</span><span>${!open ? `⭐ ${Eco.WORLD_STARS(w)} veya önceki boss` : done === WORLD_SIZE ? '✔ Tamamlandı' : `Bölüm ${next}`}</span></div>
      <div class="boss">${bossDone ? '💥 Boss yenildi' : '👹 Boss'}</div>${open ? '' : '<span class="lockic">🔒</span>'}</button>`;
  }
  $('worldList').innerHTML = html;
}

const MECH = { 1: 'Çöken kareler', 2: '🔑 Birden çok anahtar', 3: '❄ Buzda kayma', 4: '🚨 Devriye robotları', 5: '🛡 Sağlam taşlar', 6: '🌀 Portallar', 7: '👁 Takipçi robotlar', 8: '🌉 Düğme ve köprü', 9: '➡ Ok kareler', 10: '🏰 Hepsi karışık' };
function renderMap() {
  const w = currentWorld, th = THEMES[w];
  const first = (w - 1) * WORLD_SIZE + 1, last = Math.min(MAX, w * WORLD_SIZE);
  const W = innerWidth, gap = 92, n = last - first + 1;
  const H = 210 + (n - 1) * gap + 150;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([W / 2 + Math.sin(i * 1.05) * Math.min(130, W * 0.3), H - 90 - i * gap]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < n; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += ` C${x0},${y0 - gap / 2} ${x1},${y1 + gap / 2} ${x1},${y1}`; }
  let nodes = '', curY = null;
  const head = boltHead(stage.skin);
  pts.forEach(([x, y], i) => {
    const id = first + i, st = data.stars[id] || 0, open = Save.isUnlocked(data, id), boss = LEVELS[id - 1].final;
    const cls = st ? 'done' : open ? 'cur' : 'lock';
    const stars = st ? `<span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>` : '';
    if (boss) nodes += `<button class="node boss ${cls}" data-lv="${id}" ${open ? '' : 'data-locked="1"'} style="left:${x}px;top:${y}px"><img src="${bossImg()}" alt="">${stars}</button>`;
    else nodes += `<button class="node ${cls}" data-lv="${id}" ${open ? '' : 'data-locked="1"'} style="left:${x}px;top:${y}px">${id}${stars}</button>`;
    if (cls === 'cur' && curY === null) { nodes += `<img class="bolthead" src="${head}" style="left:${x}px;top:${y - (boss ? 22 : 0)}px" alt="">`; curY = y; }
  });
  if (curY === null) curY = pts[n - 1][1];
  const dots = Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 97) % W}" cy="${(i * 233) % H}" r="${1 + (i % 3)}" fill="${hex(th.particle)}" opacity=".45"/>`).join('');
  $('mapInner').style.height = H + 'px';
  $('mapInner').style.background = `radial-gradient(ellipse at 50% 15%, ${hex(th.rock2)}, ${hex(th.bg)} 70%)`;
  $('mapInner').innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><filter id="gl"><feGaussianBlur stdDeviation="6"/></filter></defs>${dots}
    <path d="${d}" stroke="${hex(th.tile)}" stroke-width="22" fill="none" opacity=".35" filter="url(#gl)"/>
    <path d="${d}" stroke="#e8fbff" stroke-width="10" fill="none" stroke-dasharray="2 16" stroke-linecap="round"/></svg>${nodes}`;
  $('mapHead').innerHTML = `<div><b>Dünya ${w}: ${th.name}</b><br><span>${MECH[w]} • 👑 Boss: ${last}. bölüm</span></div><div class="chip">⭐ ${worldStars(w)}/${n * 3}</div>`;
  requestAnimationFrame(() => { $('mapScroll').scrollTop = Math.max(0, curY - innerHeight * 0.55); });
}

function renderGarage() {
  const cur = data.skin || 'klasik';
  const sel = SKINS.find((k) => k.id === cur) || SKINS[0];
  $('heroImg').src = skinImg(sel, true);
  requestAnimationFrame(() => { document.querySelector('#garage .hero').style.bottom = (document.querySelector('.garage-panel').offsetHeight + 30) + 'px'; });
  $('heroName').textContent = sel.name;
  $('skinGrid').innerHTML = SKINS.map((k) => {
    const own = data.owned.includes(k.id) || data.settings.unlockAll;
    const price = Eco.SKIN_PRICES[k.id];
    return `<button class="skin ${k.id === cur ? 'on' : ''} ${own ? '' : 'locked'}" data-skin="${k.id}">
      <img src="${skinImg(k)}" alt=""><b>${k.name}</b><small>${k.id === cur ? 'Seçili' : own ? 'Seç' : `<span class="price">${COIN} ${fmtNum(price)}</span>`}</small></button>`;
  }).join('');
}
function pickSkin(id) {
  const k = SKINS.find((x) => x.id === id); if (!k) return;
  const own = data.owned.includes(id) || data.settings.unlockAll;
  if (!own) {
    const price = Eco.SKIN_PRICES[id];
    if (data.coins < price) { vibrate('light'); return toast(`Bu kostüm için ${fmtNum(price)} altın gerekiyor. Sende ${fmtNum(data.coins)} var.`); }
    return openModal(`<img src="${skinImg(k)}" style="height:120px" alt=""><h2>${k.name}</h2><p>Bu kostümü almak istiyor musun?</p>
      <button class="btn gold" data-act="buyskin" data-id="${id}">${COIN} ${fmtNum(price)} ile al</button><button class="btn" data-act="close">Vazgeç</button>`);
  }
  data.skin = id; save();
  stage.setSkin(k); sfx.star(1);
  renderGarage();
}
function buySkin(id) {
  const price = Eco.SKIN_PRICES[id];
  if (data.coins < price) return;
  data.coins -= price; if (!data.owned.includes(id)) data.owned.push(id);
  closeModal(); sfx.win(); vibrate('medium');
  pickSkin(id); renderRes();
}

function renderAch() {
  const st = data.stats;
  const list = Eco.achState({ ...data, totalStars: Save.totalStars(data) });
  $('achList').innerHTML = `<div class="ach-stats">
      <div><b>${Object.keys(data.stars).length}</b>bölüm</div><div><b>${Save.totalStars(data)}</b>yıldız</div><div><b>${st.moves || 0}</b>hamle</div>
      <div><b>${st.keys || 0}</b>anahtar</div><div><b>${st.enemyFalls || 0}</b>düşen düşman</div><div><b>${(data.daily && data.daily.best) || 0}</b>en uzun seri</div></div>` +
    list.map((a) => `<div class="quest ${a.claimed ? 'claimed' : ''}"><div class="qi">${a.ic}</div><div class="qt">${a.name}<small>${a.desc} • ${fmtNum(a.v)}/${fmtNum(a.goal)}</small><div class="qbar"><i style="width:${(a.v / a.goal) * 100}%"></i></div></div>
      ${a.claimed ? '<span class="qbtn dis">✔</span>' : `<button class="qbtn ${a.done ? '' : 'dis'}" ${a.done ? `data-act="claimach" data-id="${a.id}"` : ''}>${COIN} ${a.coins}</button>`}</div>`).join('');
}

// ---------------- Görevler / enerji ----------------
const rewardHtml = (r) => [r.coins && `${COIN} ${r.coins}`, r.hints && `💡 +${r.hints}`, r.energy && `${BOLT()}+${r.energy}`].filter(Boolean).join(' ');
function questsModal() {
  const q = Eco.dailyQuests(data, dateKey());
  const all = Eco.allQuestsClaimed(data);
  openModal(`<h2>🎯 Günlük Görevler</h2><p>Her gün yenilenir. Ödülünü almayı unutma!</p>
    ${q.list.map((x, i) => `<div class="quest ${x.claimed ? 'claimed' : ''}"><div class="qi">${x.ic}</div><div class="qt">${x.text}<small>${x.have} / ${x.n}</small><div class="qbar"><i style="width:${(x.have / x.n) * 100}%"></i></div></div>
      ${x.claimed ? '<span class="qbtn dis">✔</span>' : `<button class="qbtn ${x.done ? '' : 'dis'}" ${x.done ? `data-act="claimq" data-i="${i}"` : ''}>${rewardHtml(x.r)}</button>`}</div>`).join('')}
    ${q.bonus ? '<div class="tip">🎁 Bugünün bonusu alındı. Yarın yeni görevler!</div>' : all ? `<button class="btn gold" data-act="claimbonus">🎁 Bonus: ${COIN} ${Eco.QUEST_BONUS}</button>` : `<div class="tip">Hepsini bitir: <b>+${Eco.QUEST_BONUS} altın bonus</b> 🎁</div>`}
    <button class="btn primary" data-act="close">Kapat</button>`);
}

let energyModalOpen = false, energyThen = null;
function energyModal(then) { energyThen = then || null; renderEnergyModal(true); energyModalOpen = true; }
function renderEnergyModal(first) {
  Eco.tickEnergy(data);
  if (!first && data.energy > 0 && energyThen) { const t = energyThen; energyThen = null; closeModal(); return t(); }
  const next = Eco.nextEnergyIn(data), full = Eco.fullEnergyIn(data);
  const dd = data.daily || {};
  const html = `<div style="margin:4px 0">${BOLT().replace('class="ic "', 'style="width:64px;height:84px;filter:drop-shadow(0 0 14px #ffd54a)"')}</div>
    <h2>${data.energy > 0 ? 'Enerji' : 'Enerjin Bitti'}</h2>
    <p>Kaybettiğin her bölüm 1 enerji harcar. Kazandığın bölümler enerji harcamaz.</p>
    <div class="bolts">${Array.from({ length: Eco.ENERGY_MAX }, (_, i) => BOLT(i < data.energy ? '' : 'off')).join('')}</div>
    <div class="stat"><div><b>${next ? Eco.fmtTime(next) : '—'}</b>sonraki enerji</div><div><b>${full ? Eco.fmtTime(full) : 'Dolu'}</b>tamamı dolar</div></div>
    ${data.energy < Eco.ENERGY_MAX ? `<button class="btn gold" data-act="refill">${COIN} ${Eco.REFILL_COST} ile doldur</button>` : ''}
    ${dd.lastDone !== dateKey() ? '<button class="btn primary" data-act="daily">🧩 Günlük bulmacayı çöz (+1)</button>' : ''}
    <button class="linkbtn" data-act="closeEnergy">Kapat</button>`;
  if (first) openModal(html, 'fail'); else if (!$('modal').classList.contains('hidden')) $('card').innerHTML = html;
}

// ---------------- Oyun ----------------
function startLevel(id) {
  let lv;
  if (typeof id === 'object') lv = id;
  else { id = Math.max(1, Math.min(MAX, id)); lv = LEVELS[id - 1]; }
  settleLoss();
  if (!lv.daily && !Eco.hasEnergy(data)) return energyModal(() => startLevel(id));
  game.level = lv;
  game.history = []; game.undos = UNDOS; game.lossPending = false;
  const board = parseLevel(lv);
  game.state = newState(board);
  game.busy = false; game.queued = null; clearTimeout(game.deadTimer);
  stage.menuMode = false;
  stage.setTheme(lv.world);
  stage.build(board, game.state);
  show('game');
  layoutGame();
  $('lvName').innerHTML = lv.daily ? `🧩 Günlük Bulmaca<small>${lv.dailyName.toLocaleUpperCase('tr')}</small>` : `${lv.final ? '👑 ' : ''}Bölüm ${lv.id}<small>${THEMES[lv.world].name.toLocaleUpperCase('tr')}</small>`;
  $('banner').classList.add('hidden');
  updateHud();
  updateDanger();
  showTutorial(lv);
}

/** Kaybedilen bölüm: oyuncu Geri Al yerine bölümü bırakırsa 1 enerji gider */
function settleLoss() {
  if (!game.lossPending) return;
  game.lossPending = false;
  if (!game.level.daily) { Eco.spendEnergy(data); save(); }
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
  const best = game.level.daily ? null : data.best[game.level.id];
  $('moveInfo').textContent = `Hamle: ${s.moves}` + (best != null ? `  •  En iyi: ${best}` : '');
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
  game.lossPending = false;
  game.state = game.history.pop();
  game.state.status = 'play';
  clearTimeout(game.deadTimer);
  closeModal();
  $('banner').classList.add('hidden');
  sfx.undo();
  stage.build(game.state.board, game.state);
  updateHud(); updateDanger();
}

function trackEvents(events) {
  for (const e of events) {
    if (e.t === 'collapse') Eco.stat(data, 'collapsed');
    else if (e.t === 'key') Eco.stat(data, 'keys');
    else if (e.t === 'enemyFall') Eco.stat(data, 'enemyFalls');
  }
  Eco.stat(data, 'moves');
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
  trackEvents(events);
  game.busy = true;
  stage.setDanger([]);
  const p = stage.play(events, s);
  setTimeout(updateHud, 60);
  await p;
  updateHud();
  game.busy = false;
  updateDanger();
  if (s.status === 'win') return onWin();
  if (s.status === 'stuck') return onLose('stuck');
  if (s.status === 'caught') return onLose('caught');
  save();
  // Hamle var ama bölüm artık çözülemiyorsa uyar
  game.deadTimer = setTimeout(() => {
    if (game.state !== s || s.status !== 'play') return;
    if (canWin(s, 60000, 60) === false) { const bn = $('banner'); bn.innerHTML = '⚠️ Bu rota çıkmaza girdi'; bn.classList.remove('hidden'); vibrate('medium'); }
  }, 30);
  if (game.queued) { const q = game.queued; game.queued = null; input(q); }
}
game.input = input;

const starsHtml = (n) => `<div class="stars">${[0, 1, 2].map((i) => `<div class="s ${i < n ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s"></div>`).join('')}</div>`;

function onWin() {
  const s = game.state, lv = game.level;
  const stars = starsFor(s);
  if (lv.daily) return onDailyWin(stars);
  const id = lv.id;
  const prev = data.stars[id] || 0;
  const res = Save.recordWin(data, id, stars, s.moves, MAX);
  const coins = Eco.winCoins({ stars, firstTime: !prev, boss: lv.final });
  data.coins += coins;
  Eco.stat(data, 'wins');
  if (stars === 3) Eco.stat(data, 'stars3');
  if (lv.final) Eco.stat(data, 'bosses');
  if (stars === 3 && prev < 3) Eco.addEnergy(data, 1);
  save();
  sfx.win(); vibrate('heavy');
  if (id === MAX) return finishScreen(stars);
  const cnt = collapsedCount(s), tgt = coverTarget(s.board);
  const nextOpen = Save.isUnlocked(data, id + 1);
  openModal(`
    <div class="emoji">${lv.final ? '🏆' : '🎉'}</div>
    <h2>Bölüm Tamamlandı!</h2>
    <p>${lv.final ? 'Boss yenildi, Kaptan Bolt kapıdan geçti!' : 'Kaptan Bolt kapıdan geçti.'}</p>
    ${starsHtml(stars)}
    <div class="stat"><div><b>${s.moves}</b>hamle</div>${s.board.stars.mode === 'moves' ? `<div><b>≤${s.board.stars.par[0]}</b>hedef</div>` : `<div><b>${cnt}/${tgt}</b>çöken kare</div>`}<div><b>+${coins}</b>altın</div></div>
    ${stars < 3 ? `<div class="tip">${s.board.stars.mode === 'moves' ? `⭐⭐⭐ için en fazla <b>${s.board.stars.par[0]} hamlede</b> bitir!` : `⭐⭐⭐ için kapıya girmeden önce <b>bütün kareleri</b> çökert!`}</div>` : (res.bonusHint ? `<div class="tip">💎 Kusursuz! +1 ipucu ve +1 enerji kazandın.</div>` : '')}
    ${nextOpen ? '<button class="btn primary" data-act="next">Sonraki Bölüm →</button>' : `<div class="tip">🔒 Dünya ${Save.worldOf(id + 1)} için ⭐ ${Eco.WORLD_STARS(Save.worldOf(id + 1))} gerekiyor. Yıldızları artırmak için bölümleri tekrar oyna!</div>`}
    <button class="btn" data-act="restart"><span class="i-restart"></span>Tekrar Oyna</button>
    <button class="linkbtn" data-act="map">Haritaya dön</button>`);
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 250 + i * 250);
}

function onDailyWin(stars) {
  const key = game.level.daily, d = data.daily || {};
  let first = false;
  if (d.lastDone !== key) {
    d.streak = d.lastDone === yesterdayKey() ? (d.streak || 0) + 1 : 1; d.lastDone = key; d.total = (d.total || 0) + 1; first = true;
    d.best = Math.max(d.best || 0, d.streak);
    data.coins += 50; Eco.addEnergy(data, 1); Eco.stat(data, 'daily');
  }
  d.stars = Math.max(d.date === key ? d.stars || 0 : 0, stars); d.date = key;
  data.daily = d; save();
  sfx.win(); vibrate('heavy');
  openModal(`
    <div class="emoji">🧩🔥</div>
    <h2>Günün Bulmacası Tamam!</h2>
    <p>Seri: <b>${d.streak} gün</b>. Yarın yeni bulmaca seni bekliyor.</p>
    ${starsHtml(stars)}
    ${first ? `<div class="energy-pill">${COIN} +50 &nbsp; ${BOLT()} +1</div>` : ''}
    ${stars < 3 ? `<div class="tip">⭐⭐⭐ için kapıya girmeden önce <b>bütün kareleri</b> çökert!</div>` : ''}
    <button class="btn" data-act="restart"><span class="i-restart"></span>Tekrar Oyna</button>
    <button class="btn primary" data-act="menu">Ana Menü</button>`);
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 250 + i * 250);
}

const undoBtnHtml = () => (game.undos > 0 && game.history.length ? `<button class="btn gold" data-act="undo">↶ Geri Al (${game.undos}) — enerji gitmez</button>` : '');

function onLose(kind) {
  sfx.lose(); vibrate('heavy');
  game.lossPending = true;
  save();
  const daily = game.level.daily;
  const cost = daily || data.settings.infiniteEnergy ? '' : `<div class="energy-pill">${BOLT()} Yeniden başlarsan 1 enerji gider (${data.energy} var)</div>`;
  const caught = kind === 'caught';
  openModal(`
    <div class="emoji">${caught ? '🤖💥' : '🤖💤'}</div>
    <h2>${caught ? 'Yakalandın!' : 'Yol Kapandı'}</h2>
    <p>${caught ? 'Bir düşman robot Kaptan Bolt\'a yetişti. Kırmızı X olan karelere gitme!' : 'Gidecek kare kalmadı. Rotanı yeniden planla, Kaptan!'}</p>
    ${cost}
    ${undoBtnHtml()}
    <button class="btn primary" data-act="restart"><span class="i-restart"></span>Yeniden Başla</button>
    <button class="btn purple" data-act="${daily ? 'menu' : 'map'}">${daily ? 'Ana Menü' : 'Haritaya dön'}</button>`, 'fail');
}

function finishScreen(stars) {
  openModal(`
    <div class="emoji">🏆</div>
    <h2>Tebrikler Kaptan!</h2>
    <p>${WORLDS} dünyanın ${MAX} bölümünü de bitirdin.</p>
    ${starsHtml(stars)}
    <div class="stat"><div><b>⭐ ${Save.totalStars(data)}</b>toplam yıldız</div><div><b>${MAX * 3}</b>en fazla</div></div>
    <div class="tip">Eksik yıldızları toplayıp yeni kostümler aç, günlük bulmacayı kaçırma!</div>
    <button class="btn gold" data-act="worlds">Dünyalar</button>
    <button class="btn" data-act="menu">Ana Menü</button>`);
}

function useHint() {
  if (screen !== 'game' || game.busy || game.state.status !== 'play') return;
  if (data.hints <= 0) {
    return openModal(`<div class="emoji">💡</div><h2>İpucun kalmadı</h2><p>Her yeni ⭐⭐⭐ +1 ipucu verir. İstersen altınla alabilirsin.</p>
      <button class="btn gold" data-act="buyhint">${COIN} ${Eco.HINT_COST} ile 1 ipucu al</button><button class="btn" data-act="close">Vazgeç</button>`);
  }
  const r = shortest(game.state, 400000, 2500);
  if (!r) { const bn = $('banner'); bn.innerHTML = '⚠️ Bu rota çıkmaza girdi'; bn.classList.remove('hidden'); return toast('Buradan çıkış yok. Geri al ya da yeniden başla!'); }
  if (r.unknown || !r.moves.length) return toast('İpucu hesaplanamadı, biraz ilerleyip tekrar dene.');
  data.hints--; save(); updateHud();
  sfx.hint();
  stage.showHint(r.moves[0]);
}

// ---------------- Öğretici ----------------
const T = (b, s, ok = 'Anladım') => `${b}<small>${s}</small><button class="btn small primary" data-act="tutok">${ok}</button>`;
const TUTORIALS = {
  swipe: '<span class="hand">👆</span><br>Robotu hareket ettirmek için ekranı <b>kaydır</b><small>Ayrıldığın kare çöker, geri dönemezsin! Anahtarı al, kapıya ulaş.</small>',
  keys: T('🔑🔑 Bu bölümde <b>iki anahtar</b> var', 'Kapı tüm anahtarlar toplanınca açılır. Hangisine önce gideceğini iyi seç!'),
  ice: T('❄️ <b>Buzlu kareler!</b>', 'Buza basınca robot aynı yönde kaymaya devam eder. Kayarken geçtiği kareler de çöker.'),
  patrol: T('🚨 <b>Devriye robotu!</b>', 'İlk hamlende uyanır, sonra her hamlende sarı okun yönüne bir kare gider. Kırmızı X olan karelere gidersen yakalanırsın!'),
  strong: T('🛡️ <b>Sağlam taş!</b>', 'Metal kuşaklı taşlar ilk ayrılışta sadece çatlar, ikinci ayrılışta çöker.'),
  portal: T('🌀 <b>Portallar!</b>', 'Aynı renkli portala basınca diğerine ışınlanırsın. Girdiğin portal arkandan çöker.'),
  chaser: T('👁️ <b>Takipçi robot!</b>', 'Her hamlende sana bir adım yaklaşır ama önüne bakmaz: onu çöken karelere ya da boşluklara çekip düşür!'),
  boss: T('👹 <b>BOSS!</b>', 'Dev robot kapıyı kilitli tutuyor. Onu boşluklara ya da çöken karelere çekip düşür, sonra kapıya koş! Takılırsan Geri Al var.', 'Hazırım!'),
  bridge: T('🌉 <b>Düğme ve köprü!</b>', 'Kırmızı düğmeye basınca soluk görünen köprüler açılır. Açılmadan önce oralar boşluktur.'),
  arrow: T('➡️ <b>Ok kareler!</b>', 'Ok kareye basınca robot okun yönüne itilir. Önü kapalıysa okun üstünde durur.'),
  castle: T('🏰 <b>Son Kale!</b>', 'Buradan sonra bütün mekanikler karışık geliyor. Son bölümde en güçlü boss bekliyor!', 'Hazırım!'),
};
function showTutorial(lv) {
  const t = $('tutorial');
  t.classList.add('hidden');
  if (!lv.tutorial || !TUTORIALS[lv.tutorial] || (data.seenTutorial[lv.tutorial] && lv.tutorial !== 'swipe')) return;
  if (lv.tutorial === 'swipe' && data.stars[1]) return;
  t.innerHTML = TUTORIALS[lv.tutorial]; t.dataset.kind = lv.tutorial; t.classList.remove('hidden');
  requestAnimationFrame(layoutGame);
}
function hideTutorial(kind) {
  const t = $('tutorial');
  if (t.classList.contains('hidden') || (kind && t.dataset.kind !== kind)) return;
  t.classList.add('hidden');
  data.seenTutorial[t.dataset.kind] = true; save();
  layoutGame();
}

// ---------------- Modal / ayarlar ----------------
function openModal(html, cls = '') { $('card').className = 'card ' + cls; $('card').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal() { $('modal').classList.add('hidden'); energyModalOpen = false; }
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
      <div class="row">🔓 Tüm bölümler açık (test) ${tg('unlockAll')}</div>
      <div class="row">⚡ Sınırsız enerji (test) ${tg('infiniteEnergy')}</div>
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
      <li>Ekranı kaydırarak <b>Kaptan Bolt</b>'u bir kare ilerlet. Ayrıldığın kare <b>çöker</b>.</li>
      <li>Tüm <b>🔑 anahtarları</b> topla, <b>kapı</b> açılsın. Kilitli kapı duvar gibidir.</li>
      <li>❄️ Buzda kayarsın, 🛡️ sağlam taş iki kez geçilir, 🌀 portal ışınlar, 🌉 düğme köprü açar, ➡️ ok kareler iter.</li>
      <li>🚨 Düşmanlar ilk hamlende uyanır. Kırmızı X olan karelere gidersen yakalanırsın. Takipçileri ve boss'ları boşluklara çekip düşür.</li>
      <li>⭐ Bitir • ⭐⭐ karelerin %70'ini çökert • ⭐⭐⭐ hepsini çökert. Düşmanlı bölümlerde yıldızlar hamle sayısına göredir.</li>
      <li>⚡ Kaybettiğin her bölüm 1 enerji harcar (Geri Al kullanırsan gitmez). Enerji 20 dakikada 1 dolar.</li>
      <li>🪙 Bölüm bitirerek altın kazan: kostüm, ipucu ve enerji al. 🎯 Günlük görevler ve 🏆 başarımlar ekstra ödül verir.</li>
    </ul>
    <button class="btn primary" data-act="${screen === 'game' ? 'close' : 'settings'}">Tamam</button>`);
}

function applySettings() {
  const s = data.settings;
  setSound(s.sound); setMusic(s.music); setVibration(s.vibration);
  if (stage.quality !== s.quality) stage.setQuality(s.quality);
}
applySettings();

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
  if (el.dataset.world) {
    const w = +el.dataset.world;
    if (!Save.worldUnlocked(data, w)) { vibrate('light'); return toast(`Dünya ${w - 1}'in boss'unu yen ya da ⭐ ${Eco.WORLD_STARS(w)} topla.`); }
    currentWorld = w; return show('map');
  }
  if (el.dataset.toggle) { const k = el.dataset.toggle; data.settings[k] = !data.settings[k]; save(); applySettings(); el.classList.toggle('on', data.settings[k]); renderRes(); return; }
  if (el.dataset.quality) { data.settings.quality = el.dataset.quality; save(); applySettings(); return settingsModal(); }
  switch (el.dataset.act) {
    case 'continue': { const n = Save.continueLevel(data, MAX); currentWorld = Save.worldOf(n); return startLevel(n); }
    case 'worlds': stage.board = null; return show('worlds');
    case 'map': settleLoss(); if (game.level && !game.level.daily) currentWorld = game.level.world; stage.board = null; return show('map');
    case 'menu': settleLoss(); stage.board = null; return show('menu');
    case 'back': return back();
    case 'settings': return settingsModal();
    case 'howto': return howtoModal();
    case 'close': return closeModal();
    case 'closeEnergy': closeModal(); renderRes(); return;
    case 'restart': return startLevel(game.level.daily ? game.level : game.level.id);
    case 'next': return startLevel(game.level.id + 1);
    case 'undo': return undo();
    case 'hint': return useHint();
    case 'buyhint': if (data.coins < Eco.HINT_COST) return toast('Yeterli altının yok.'); data.coins -= Eco.HINT_COST; data.hints++; save(); closeModal(); updateHud(); return useHint();
    case 'tutok': return hideTutorial();
    case 'daily': closeModal(); settleLoss(); return startLevel(dailyLevel());
    case 'garage': return show('garage');
    case 'ach': return show('ach');
    case 'quests': return questsModal();
    case 'claimq': { const r = Eco.claimQuest(data, +el.dataset.i); if (r) { save(); sfx.key(); toast('Ödül alındı: ' + Eco.rewardText(r)); renderRes(); renderMenu(); } return questsModal(); }
    case 'claimbonus': if (Eco.claimBonus(data)) { save(); sfx.win(); renderRes(); renderMenu(); } return questsModal();
    case 'claimach': { const c = Eco.claimAch(data, el.dataset.id); if (c) { save(); sfx.key(); toast(`+${c} altın!`); renderRes(); } return renderAch(); }
    case 'buyskin': return buySkin(el.dataset.id);
    case 'refill': if (data.coins < Eco.REFILL_COST) return toast('Yeterli altının yok.'); data.coins -= Eco.REFILL_COST; data.energy = Eco.ENERGY_MAX; data.energyAt = Date.now(); save(); renderRes(); sfx.win(); return renderEnergyModal(false);
    case 'resetask': return openModal(`<div class="emoji">⚠️</div><h2>Emin misin?</h2><p>Tüm yıldızlar, altınlar ve kostümler silinecek. Bu işlem geri alınamaz.</p><button class="btn purple" data-act="reset">Evet, sıfırla</button><button class="btn primary" data-act="settings">Vazgeç</button>`, 'fail');
    case 'reset': data = Eco.ensure(Save.reset()); Eco.dailyQuests(data, dateKey()); save(); applySettings(); stage.setSkin(SKINS[0]); closeModal(); toast('İlerleme sıfırlandı.'); stage.board = null; return show('menu');
  }
});
for (const el of $$('.energy-chip')) el.addEventListener('click', () => { audioUnlock(); energyModal(); });

function back() {
  if (!$('modal').classList.contains('hidden')) {
    if (screen === 'game' && game.state && game.state.status !== 'play') { settleLoss(); stage.board = null; return show(game.level.daily ? 'menu' : 'map'); }
    return closeModal();
  }
  if (screen === 'game') { settleLoss(); stage.board = null; if (game.level.daily) return show('menu'); currentWorld = game.level.world; return show('map'); }
  if (screen === 'map') return show('worlds');
  if (screen !== 'menu') { stage.board = null; return show('menu'); }
  exitApp();
}
onBack(back);
onPause(() => { stage.paused = true; suspend(); save(); }, () => { stage.paused = !(screen === 'menu' || screen === 'game'); resume(); renderRes(); });

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
});
window.addEventListener('resize', () => { if (screen === 'game') layoutGame(); else if (screen === 'menu') layoutMenu(); else if (screen === 'map') renderMap(); });

show('menu');
if (document.fonts) document.fonts.ready.then(() => { if (screen === 'game') layoutGame(); if (screen === 'menu') layoutMenu(); });
