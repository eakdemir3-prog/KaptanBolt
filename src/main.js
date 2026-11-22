// Kaptan Bolt — ana uygulama: ekranlar, giriş, oyun akışı ve oyun içi ekonomi
import LEVELS from './levels/levels.json';
import { SHIP_PARTS, partsHave, partHas, STORY_HTML } from './story.js';
import { floorOf, floorCount, parseLevel, newState, move, canMove, canJump, starsFor, collapsedCount, coverTarget, cloneState, validMoves, STRONG, TILE, ICE } from './logic/rules.js';
import { bestCover, shortest, canWin } from './logic/solver.js';
import { dailyLevel, dateKey, yesterdayKey } from './logic/daily.js';
import { Stage } from './game/stage.js';
import { THEMES, SKINS } from './game/models.js';
import { skinImg, boltHead, bossImg, worldIcon } from './game/thumbs.js';
import * as Save from './save.js';
import * as Eco from './economy.js';
import { sfx, unlock as audioUnlock, setSound, setMusic, setTrack, suspend, resume } from './audio.js';
import { initAds, showRewarded, maybeInterstitial } from './ads.js';
import { IAP, initPurchases, buy as iapBuy, restore as iapRestore, purchasesReady, setPurchaseHandler } from './purchases.js';
import * as Cloud from './cloud.js';
import { vibrate, setVibration, onBack, exitApp, onPause } from './platform.js';

const MAX = LEVELS.length;
const WORLD_SIZE = Save.WORLD_SIZE;
const REG = LEVELS.filter((l) => !l.grand).length; // normal bölümler (final hariç)
const WORLDS = Math.ceil(REG / WORLD_SIZE);
const GRAND = LEVELS.find((l) => l.grand) || null;
const UNDOS = 3;
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

let data = Eco.ensure(Save.load());
Eco.dailyQuests(data, dateKey());
const save = () => { Save.save(data); Cloud.pushSoon(); };
const stage = new Stage($('c'));
stage.skin = SKINS.find((k) => k.id === data.skin) || SKINS[0];
stage.onFloor = (f) => {
  updateHud();
  const b = game.state && game.state.board; if (!b) return;
  if (game.level && game.level.grand) { game.checkpoint = { state: cloneState(game.state), floor: f }; floorBanner(f); }
  if (b.darkFloors && b.darkFloors.includes(f)) stage.startDark(2600);
};
function floorBanner(f) {
  const b = game.state && game.state.board; if (!b || !b.floorNames) return;
  const bn = $('banner'); bn.innerHTML = `🏢 KAT ${f + 1} — ${b.floorNames[f]}${b.darkFloors.includes(f) ? ' • 👁️ Ezberle!' : ''}`; bn.classList.remove('hidden');
  setTimeout(() => { if (game.state && stage.shownFloor === f) bn.classList.add('hidden'); }, 2600);
}
stage.onGear = () => collectGear();
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
  get state() { return game.state; }, get screen() { return screen; }, input: (d) => game.input(d), start: (id) => startLevel(id), levels: () => LEVELS, canWin: () => canWin(game.state, 200000),
  data: () => data, stage: () => stage, idle: () => !game.busy, solve: () => (shortest(game.state, 800000, 20000) || {}).moves,
  _clone: (s) => cloneState(s), _move: (s, d, o) => move(s, d, o), dangerCount: () => stage.dangerMarks.length,
  findCaught: () => { const q = [[cloneState(game.state), []]]; let n = 0; while (q.length && n++ < 20000) { const [s, p] = q.shift(); for (const d of validMoves(s)) { const c = cloneState(s); move(c, d); if (c.status === 'caught') return p.concat(d); if (c.status === 'play') q.push([c, p.concat(d)]); } } return null; },
};

// ---------------- Ekranlar ----------------
function show(name) {
  const prev = screen;
  screen = name;
  // eski ekran kısa bir süre görünür kalıp solar, yenisi kayarak gelir
  for (const s of $$('.screen')) {
    const was = s.classList.contains('on');
    s.classList.toggle('on', s.id === name);
    if (was && s.id !== name && prev !== name) { s.classList.add('leaving'); clearTimeout(s._lt); s._lt = setTimeout(() => s.classList.remove('leaving'), 230); }
    else if (s.id === name) s.classList.remove('leaving');
  }
  closeModal();
  stage.paused = !(name === 'menu' || name === 'game');
  if (name !== 'game') setTrack('menu');
  if (name === 'menu') { showcase(); renderMenu(); }
  if (name === 'worlds') renderWorlds();
  if (name === 'map') renderMap();
  if (name === 'garage') renderGarage();
  if (name === 'ach') renderAch();
  if (name === 'shop') renderShop();
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
  const bottom = innerHeight - $('menuBottom').getBoundingClientRect().top + 26;
  stage.setSafe(top, bottom);
}

function renderRes() {
  Eco.tickEnergy(data);
  const inf = data.settings.infiniteEnergy || Eco.isPro(data);
  const next = Eco.nextEnergyIn(data);
  const eh = `${BOLT()}<span>${inf ? '∞' : `${data.energy}/${Eco.ENERGY_MAX}`}</span>${!inf && next ? `<span class="lbl t">${Eco.fmtTime(next)}</span>` : ''}`;
  const ch = `${COIN}<span>${fmtNum(data.coins)}</span>`;
  for (const el of $$('.energy-chip')) if (el._h !== eh) { el.innerHTML = eh; el._h = eh; }
  for (const el of $$('.coin-chip')) if (el._h !== ch) { el.innerHTML = ch; el._h = ch; }
}
setInterval(() => { if (screen !== 'game') renderRes(); if (energyModalOpen) renderEnergyModal(); }, 1000);

function renderMenu() {
  const n = Save.continueLevel(data, MAX);
  const done = Object.keys(data.stars).length;
  // hiç bölüm oynanmadıysa "Başla", sonra "Devam Et"
  const started = Object.keys(data.stars || {}).length > 0;
  document.querySelector('[data-act=continue]').innerHTML = `<span class="i-play"></span>${started ? 'Devam Et' : 'Başla'}`;
  $('menuSub').innerHTML = (done >= MAX ? `Tüm bölümler tamamlandı • ⭐ ${Save.totalStars(data)}` : `Bölüm ${n} • Dünya ${Save.worldOf(n)} • ⭐ ${Save.totalStars(data)}`) + ` • <button class="ship-chip" data-act="ship">🚀 Gemi ${partsHave(data)}/10</button>`;
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
      <div class="boss">${bossDone ? '💥 Boss yenildi' : MECH_TAG[w]}</div>${open ? '' : '<span class="lockic">🔒</span>'}</button>`;
  }
  $('worldList').innerHTML = html;
}

const MECH_TAG = { 1: '🧱 Çöken kare', 2: '🔑 Anahtarlar', 3: '❄ Buz', 4: '🚨 Devriye', 5: '🛡 Sağlam taş', 6: '🌀 Portal', 7: '👁 Takipçi', 8: '🌉 Köprü', 9: '➡ Ok kare', 10: '🏰 Karışık' };
const MECH = { 1: 'Çöken kareler', 2: '🔑 Birden çok anahtar', 3: '❄ Buzda kayma', 4: '🚨 Devriye robotları', 5: '🛡 Sağlam taşlar', 6: '🌀 Portallar', 7: '👁 Takipçi robotlar', 8: '🌉 Düğme ve köprü', 9: '➡ Ok kareler', 10: '🏰 Hepsi karışık' };
function renderMap() {
  const w = currentWorld, th = THEMES[w];
  const first = (w - 1) * WORLD_SIZE + 1, last = Math.min(REG, w * WORLD_SIZE) + (w === WORLDS && GRAND ? 1 : 0);
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
    if (LEVELS[id - 1].grand) nodes += `<button class="node boss grand ${cls}" data-lv="${id}" ${open ? '' : 'data-locked="1"'} style="left:${x}px;top:${y}px"><span class="gr">👑</span><small>FİNAL</small>${stars}</button>`;
    else if (boss) nodes += `<button class="node boss ${cls}" data-lv="${id}" ${open ? '' : 'data-locked="1"'} style="left:${x}px;top:${y}px"><img src="${bossImg(w)}" alt="">${stars}</button>`;
    else nodes += `<button class="node ${cls}" data-lv="${id}" ${open ? '' : 'data-locked="1"'} style="left:${x}px;top:${y}px">${id}${stars}</button>`;
    if (cls === 'cur' && curY === null) { const side = x > W / 2 ? -1 : 1; nodes += `<div class="pin ${side < 0 ? 'l' : 'r'}" style="left:${x + side * (boss ? 92 : 74)}px;top:${y}px"><div class="ring"><img src="${head}" alt=""></div></div>`; curY = y; }
  });
  if (curY === null) curY = pts[n - 1][1];
  const dots = Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 97) % W}" cy="${(i * 233) % H}" r="${1 + (i % 3)}" fill="${hex(th.particle)}" opacity=".45"/>`).join('');
  $('mapInner').style.height = H + 'px';
  $('mapInner').style.background = `radial-gradient(ellipse at 50% 15%, ${hex(th.rock2)}, ${hex(th.bg)} 70%)`;
  $('mapInner').innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><filter id="gl"><feGaussianBlur stdDeviation="6"/></filter></defs>${dots}
    <path d="${d}" stroke="${hex(th.tile)}" stroke-width="22" fill="none" opacity=".35" filter="url(#gl)"/>
    <path d="${d}" stroke="#e8fbff" stroke-width="10" fill="none" stroke-dasharray="2 16" stroke-linecap="round"/></svg>${nodes}`;
  $('mapHead').innerHTML = `<div class="mh-text"><b>Dünya ${w}: ${th.name}</b><span>${MECH_TAG[w]} • 👑 Boss ${last}</span></div><div class="chip">⭐ ${worldStars(w)}/${n * 3}</div>`;
  requestAnimationFrame(() => { $('mapScroll').scrollTop = Math.max(0, curY - innerHeight * 0.55); });
}

function renderGarage() {
  const cur = data.skin || 'klasik';
  const sel = SKINS.find((k) => k.id === cur) || SKINS[0];
  $('heroImg').src = skinImg(sel, true);
  requestAnimationFrame(() => { document.querySelector('#garage .hero').style.bottom = (document.querySelector('.garage-panel').offsetHeight + 30) + 'px'; });
  $('heroName').textContent = sel.name;
  $('skinGrid').innerHTML = SKINS.map((k) => {
    const own = data.owned.includes(k.id) || data.settings.unlockAll || (k.pro && Eco.isPro(data));
    const price = Eco.SKIN_PRICES[k.id];
    if (k.pro && !own) return `<button class="skin locked" data-shoptab="pro"><img src="${skinImg(k)}" alt=""><b>${k.name}</b><small><span class="pro-badge">PRO</span></small></button>`;
    if (k.grand && !own) return `<button class="skin locked" data-grandskin="1"><img src="${skinImg(k)}" alt=""><b>${k.name}</b><small>👑 Finali bitir</small></button>`;
    if (k.gear && !own) return `<button class="skin locked" data-gearskin="${k.gear}"><img src="${skinImg(k)}" alt=""><b>${k.name}</b><small>⚙️ ${gearsOf(k.gear)}/3 • Dünya ${k.gear}</small></button>`;
    return `<button class="skin ${k.id === cur ? 'on' : ''} ${own ? '' : 'locked'}" data-skin="${k.id}">
      <img src="${skinImg(k)}" alt=""><b>${k.name}</b><small>${k.id === cur ? 'Seçili' : own ? 'Seç' : `<span class="price">${COIN} ${fmtNum(price)}</span>`}</small></button>`;
  }).join('');
}
/** Dünyada toplanan gizli dişli sayısı */
function gearsOf(w) { return LEVELS.filter((l) => l.world === w && l.gear && data.gears && data.gears[l.id]).length; }
function collectGear() {
  const lv = game.level; if (!lv || lv.daily) return;
  data.gears = data.gears || {};
  if (data.gears[lv.id]) return toast('⚙️ Bu dişli zaten sende.');
  data.gears[lv.id] = 1;
  const n = gearsOf(lv.world);
  const sk = SKINS.find((k) => k.gear === lv.world);
  if (n >= 3 && sk && !data.owned.includes(sk.id)) { data.owned.push(sk.id); save(); setTimeout(() => toast(`🎉 Yeni kostüm: ${sk.name}! Garajda seni bekliyor.`), 600); }
  else { save(); toast(`⚙️ Gizli dişli bulundu! Dünya ${lv.world}: ${n}/3`); }
}

function pickSkin(id) {
  const k = SKINS.find((x) => x.id === id); if (!k) return;
  const own = data.owned.includes(id) || data.settings.unlockAll || (k.pro && Eco.isPro(data));
  if (k.pro && !own) { shopTab = 'pro'; return show('shop'); }
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

let energyModalOpen = false, energyThen = null, lastEnergyShown = -1;
function energyModal(then) { energyThen = then || null; renderEnergyModal(true); energyModalOpen = true; }
function renderEnergyModal(first) {
  Eco.tickEnergy(data);
  if (!first && data.energy > 0 && energyThen) { const t = energyThen; energyThen = null; closeModal(); return t(); }
  const next = Eco.nextEnergyIn(data), full = Eco.fullEnergyIn(data);
  const dd = data.daily || {};
  const html = `<div style="margin:4px 0">${BOLT().replace('class="ic "', 'style="width:64px;height:84px;filter:drop-shadow(0 0 14px #ffd54a)"')}</div>
    <h2>${data.energy > 0 ? 'Enerji' : 'Enerjin Bitti'}</h2>
    <p>Kaybettiğin her bölüm 1 enerji harcar. Kazandığın bölümler enerji harcamaz. En fazla ${Eco.ENERGY_MAX} enerji birikir.</p>
    <div class="bolts">${Array.from({ length: Eco.ENERGY_MAX }, (_, i) => BOLT(i < data.energy ? '' : 'off')).join('')}</div>
    <div class="stat"><div><b id="enNext">${next ? Eco.fmtTime(next) : '—'}</b>sonraki enerji</div><div><b id="enFull">${full ? Eco.fmtTime(full) : 'Dolu'}</b>tamamı dolar</div></div>
    ${data.energy < Eco.ENERGY_MAX && Eco.adCount(data, 'energy', dateKey()) < Eco.AD_ENERGY_PER_DAY ? `<button class="btn primary" data-act="adEnergy">📺 Reklam izle: ${BOLT()} +1 <small style="opacity:.75;font-size:12px">(${Eco.AD_ENERGY_PER_DAY - Eco.adCount(data, 'energy', dateKey())} hak)</small></button>` : ''}
    ${data.energy < Eco.ENERGY_MAX ? `<button class="btn gold" data-act="refill">${COIN} ${Eco.REFILL_COST} ile doldur</button>` : ''}
    
    <button class="linkbtn" data-act="closeEnergy">Kapat</button>`;
  if (first || lastEnergyShown !== data.energy) { lastEnergyShown = data.energy; if (first) openModal(html, 'fail'); else if (modalOpen()) $('card').innerHTML = html; return; }
  // Her saniye sadece sayaçları güncelle (düğmeler yerinde kalsın, dokunuşlar kaybolmasın)
  const n = $('enNext'), f = $('enFull');
  if (n) n.textContent = next ? Eco.fmtTime(next) : '—';
  if (f) f.textContent = full ? Eco.fmtTime(full) : 'Dolu';
}

// ---------------- Oyun ----------------
// ---------- Giriş videosu ----------
let introDone = null;
let curVideo = 'intro.mp4';
function playIntro() { return playVideo('intro.mp4', 'intro-poster.jpg'); }
/** Tam ekran video (giriş / bitiş): Geç ▶ ile atlanır */
function playVideo(file, poster = null) {
  const box = $('intro'), v = $('introVid');
  const url = new URL(file, document.baseURI).href;
  if (curVideo !== file || !v.src) { v.src = url; curVideo = file; }
  box.style.backgroundImage = poster ? `url(${new URL(poster, document.baseURI).href})` : 'none';
  box.classList.remove('hidden'); $('introSound').classList.add('hidden');
  stage.paused = true; setMusic(false);
  v.classList.remove('on'); v.onplaying = () => v.classList.add('on');
  v.currentTime = 0; v.muted = false;
  const p = v.play();
  if (p && p.catch) p.catch(() => { v.muted = true; $('introSound').classList.remove('hidden'); v.play().catch(() => endIntro(true)); });
  v.onended = () => endIntro();
  v.onerror = () => endIntro(true);
  return new Promise((ok) => { introDone = ok; });
}
function endIntro(failed = false) {
  const box = $('intro'), v = $('introVid');
  if (box.classList.contains('hidden')) return;
  v.pause(); box.classList.add('hidden');
  if (curVideo === 'intro.mp4') { if (failed) data.introFailed = true; else data.storySeen = true; save(); }
  setMusic(data.settings.music); stage.paused = !(screen === 'menu' || screen === 'game');
  if (introDone) { const f = introDone; introDone = null; f(); }
}

/** Bonus altın: her 5 bölümden birinde, alınmamışsa, sıradan bir karede durur (bölüm başına bir kez) */
const BONUS_COINS = 10;
function bonusCellFor(lv, board) {
  if (lv.daily || lv.final || lv.id % 5 !== 0 || (data.bonusTaken || {})[lv.id]) return -1;
  const bad = new Set([board.start, board.door, ...board.keys, ...board.enemies.map((e) => e.pos)]);
  const cand = [];
  board.cells.forEach((c, i) => { if ((c === TILE || c === ICE) && !bad.has(i) && board.portal[i] < 0) cand.push(i); });
  if (!cand.length) return -1;
  return cand[(lv.id * 7919) % cand.length];
}
function checkBonus(events) {
  const bc = stage.bonusCell; if (bc < 0) return;
  if (!events.some((e) => (e.t === 'step' && e.to === bc) || (e.t === 'teleport' && e.to === bc))) return;
  data.bonusTaken = data.bonusTaken || {}; data.bonusTaken[game.level.id] = 1;
  data.coins += BONUS_COINS; save(); renderRes();
  stage.takeBonus(); toast(`🪙 Bonus altın! +${BONUS_COINS}`);
}

function startLevel(id) {
  let lv;
  if (typeof id === 'object') lv = id;
  else { id = Math.max(1, Math.min(MAX, id)); lv = LEVELS[id - 1]; }
  settleLoss();
  if (!lv.daily && lv.id === 1 && !data.storySeen) {
    // 1. bölümden önce hikâye videosu; video açılamazsa (veya otomatik testte) yazılı hikâye
    const canVideo = !data.introFailed && !(navigator.webdriver && !location.hash.includes('intro'));
    if (canVideo) { playIntro().then(() => startLevel(1)); return; }
    data.storySeen = true; save(); openModal(STORY_HTML + '<button class="btn primary" data-act="storyGo">Maceraya başla →</button>', 'story'); return;
  }
  if (!lv.daily && !lv.grand && !Eco.hasEnergy(data)) return energyModal(() => startLevel(id));
  closeModal();
  fadeSwap(() => enterLevel(lv));
}

function enterLevel(lv) {
  game.level = lv;
  game.history = []; game.undos = UNDOS; game.lossPending = false; game.adContinueUsed = false;
  game.powerUsed = false; game.jumpArmed = false; game.shield = false; game.collapseOrder = [];
  const board = parseLevel(lv);
  game.state = newState(board);
  stage.bonusCell = bonusCellFor(lv, board);
  game.busy = false; game.queued = null; clearTimeout(game.deadTimer);
  stage.menuMode = false;
  setTrack(lv.boss ? 'boss' : lv.world);
  stage.setTheme(lv.world);
  stage.build(board, game.state);
  show('game');
  layoutGame();
  const tag = lv.challenge ? '⚡ ' : lv.dark ? '🌑 ' : lv.final ? '👑 ' : '';
  const sub = lv.grand ? 'FİNAL • SON HAMLE' : lv.challenge ? 'MEYDAN OKUMA • 2× ALTIN' : lv.dark ? 'KARANLIK BÖLÜM' : THEMES[lv.world].name.toLocaleUpperCase('tr');
  $('lvName').innerHTML = lv.daily ? `🧩 Günlük Bulmaca<small>${lv.dailyName.toLocaleUpperCase('tr')}</small>` : `${tag}Bölüm ${lv.id}<small>${sub}</small>`;
  $('banner').classList.add('hidden');
  game.checkpoint = null; game.afterTut = null;
  if (lv.grand) setTimeout(() => floorBanner(0), 600);
  updateHud();
  updateDanger();
  showTutorial(lv);
  // karanlık bölüm: ezberleme süresi açıklama kartı kapanınca başlar
  if (board.dark) {
    stage.startDark(1e9);
    const go = () => { if (game.level !== lv) return; const bn = $('banner'); bn.innerHTML = '👁️ Ezberle! Birazdan karanlık çökecek'; bn.classList.remove('hidden'); setTimeout(() => { if (game.level === lv) bn.classList.add('hidden'); }, 3000); stage.startDark(3000); };
    if (!$('tutorial').classList.contains('hidden')) game.afterTut = go; else go();
  }
}

/** Kaybedilen bölüm: oyuncu Geri Al yerine bölümü bırakırsa 1 enerji gider */
function settleLoss() {
  if (!game.lossPending) return;
  game.lossPending = false;
  if (!game.level.daily) { Eco.spendEnergy(data); save(); }
}

function layoutGame() {
  fitChips();
  const top = $('lvName').getBoundingClientRect().bottom + 2;
  const tut = $('tutorial');
  const ref = tut.classList.contains('hidden') ? $('powerBar') : tut;
  const pb = innerHeight - $('powerBar').getBoundingClientRect().top;
  document.documentElement.style.setProperty('--msgb', Math.round(pb + 8) + 'px');
  // uyarı/bildirim şeridi için güçlerin üstünde ~54 px boşluk bırak (tahtanın üstüne binmesin)
  const bottom = innerHeight - ref.getBoundingClientRect().top + 14 + (ref === tut ? 0 : 54);
  stage.setSafe(top, bottom);
}

/** Üst kutular sığmazsa sıkılaştır; başlığı her zaman kutuların altına koy (üst üste binmesin) */
function fitChips() {
  const row = document.querySelector('#game .chips'); if (!row) return;
  row.classList.remove('tight');
  if (row.scrollWidth > row.clientWidth + 1 || row.offsetHeight > 46) row.classList.add('tight');
  const logo = document.querySelector('#game .logo.small');
  if (logo) logo.style.top = Math.round(row.getBoundingClientRect().bottom + 8) + 'px';
}

function updateHud() {
  const s = game.state, b = s.board;
  const kt = s.keysTaken.filter(Boolean).length;
  const keyIcon = (on) => `<svg class="k" viewBox="0 0 60 80"><circle cx="30" cy="20" r="15" fill="${on ? '#ffcf3a' : '#4b4580'}"/><circle cx="30" cy="20" r="7" fill="#1a1250"/><rect x="26" y="32" width="8" height="34" rx="3" fill="${on ? '#ffcf3a' : '#4b4580'}"/><rect x="34" y="50" width="10" height="6" rx="2" fill="${on ? '#ffcf3a' : '#4b4580'}"/></svg>`;
  // tek anahtar simgesi + sayı: kutular tek satıra sığsın
  $('chipKeys').innerHTML = keyIcon(kt > 0 && kt === b.keys.length) + `<span>${kt}/${b.keys.length}</span>`;
  if (b.stars.mode === 'moves') $('chipCollapse').innerHTML = `<span class="lbl">Hedef</span>≤${b.stars.par[0]}`;
  else $('chipCollapse').innerHTML = `⭐<span>${collapsedCount(s)}/${coverTarget(b)}</span>`; // 3 yıldız hedefi
  stage.updateLock(collapsedCount(s), b.lock);
  stage.updateTimers(s.moves);
  const fc = $('chipFloor');
  if (b.floors) { fc.classList.remove('hidden'); fc.innerHTML = `🏢<span>${(stage.shownFloor ?? floorOf(b, s.pos)) + 1}/${floorCount(b)}</span>`; } else fc.classList.add('hidden');
  const bc = $('chipBoss');
  if (s.boss) { bc.classList.remove('hidden'); bc.innerHTML = s.boss.alive ? '👹 <span class="lbl">Boss</span>' : '💥 <span class="lbl">Yenildi</span>'; } else bc.classList.add('hidden');
  $('hintCount').textContent = data.hints;
  fitChips();
  const best = game.level.daily ? null : data.best[game.level.id];
  $('moveInfo').textContent = `Hamle: ${s.moves}` + (best != null ? `  •  En iyi: ${best}` : '') + (game.powerUsed ? '  •  ⚡ güç kullanıldı' : '');
  renderPowers();
}

/** Gidince yakalanacağın kareleri kırmızı X ile göster */
function updateDanger() {
  const s = game.state;
  if (!s || s.status !== 'play' || (!s.enemies.length && !s.boss)) return stage.setDanger([]);
  const cells = [];
  for (const d of validMoves(s)) { const c = cloneState(s); move(c, d); if (c.status === 'caught') cells.push(c.pos); }
  stage.setDanger(cells);
}

function undo(free = false) {
  if (game.busy || !game.history.length) return toast('Geri alınacak hamle yok.');
  if (!free && game.undos <= 0) return toast('Bu bölümde geri alma hakkın bitti.');
  if (!free) game.undos--;
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

/** Reklamla devam: hamleleri geri sar, hâlâ kazanılabilen son ana dön (gerekirse başa kadar) */
function rewindToWinnable() {
  let n = 0;
  while (game.history.length) {
    const prev = game.history.pop(); n++;
    prev.status = 'play';
    if (canWin(prev, 120000, 120) !== false || !game.history.length) { game.history.push(prev); break; }
  }
  undo(true);
  toast(n > 1 ? `⏪ ${n} hamle geri sarıldı: buradan kazanabilirsin!` : '⏪ Bir hamle geri alındı.');
}

function trackEvents(events) {
  for (const e of events) {
    if (e.t === 'collapse') { Eco.stat(data, 'collapsed'); game.collapseOrder.push(e.cell); }
    else if (e.t === 'key') Eco.stat(data, 'keys');
    else if (e.t === 'enemyFall') Eco.stat(data, 'enemyFalls');
  }
  Eco.stat(data, 'moves');
}

async function input(dir) {
  if (screen !== 'game' || !game.state || modalOpen()) return;
  if (game.busy) { game.queued = dir; return; }
  const s = game.state;
  if (s.status !== 'play') return;
  const jump = game.jumpArmed;
  if (jump ? !canJump(s, dir) : !canMove(s, dir)) { sfx.bump(); vibrate('light'); stage.bump(dir); if (jump) toast('Bu yöne zıplanamaz: iki kare ötesi boş olmalı.'); return; }
  hideTutorial('swipe');
  stage.clearHint();
  $('banner').classList.add('hidden');
  clearTimeout(game.deadTimer);
  game.history.push(cloneState(s));
  if (game.history.length > 50) game.history.shift();
  const events = move(s, dir, { jump });
  if (jump) { game.jumpArmed = false; data.powers.jump--; game.powerUsed = true; save(); renderPowers(); }
  trackEvents(events);
  game.busy = true;
  stage.setDanger([]);
  const p = stage.play(events, s);
  setTimeout(() => checkBonus(events), 120);
  setTimeout(updateHud, 60);
  await p;
  updateHud();
  game.busy = false;
  updateDanger();
  if (s.status === 'win') return onWin();
  if (s.status === 'stuck') return onLose('stuck');
  if (s.status === 'caught' && game.shield) { game.shield = false; renderPowers(); sfx.undo(); undo(true); return toast('🛡 Kalkan seni korudu!'); }
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
  Save.recordWin(data, id, stars, s.moves, MAX, game.powerUsed);
  const coins = Eco.winCoins({ stars, prevStars: prev, boss: lv.final, pro: Eco.isPro(data) }) * (lv.challenge ? 2 : 1); // meydan okuma: 2 kat altın
  data.coins += coins;
  Eco.stat(data, 'wins');
  if (stars === 3) Eco.stat(data, 'stars3');
  if (lv.final) Eco.stat(data, 'bosses');
  save();
  sfx.win(); vibrate('heavy');
  if (game.level.grand) return grandEnding(stars);
  if (id === REG && !GRAND) return finishScreen(stars);
  const cnt = collapsedCount(s), tgt = coverTarget(s.board);
  const nextOpen = Save.isUnlocked(data, id + 1);
  openModal(`
    <div class="emoji">${lv.final ? '🏆' : '🎉'}</div>
    <h2>Bölüm Tamamlandı!</h2>
    <p>${lv.final ? 'Boss yenildi, Kaptan Bolt kapıdan geçti!' : 'Kaptan Bolt kapıdan geçti.'}</p>
    ${lv.final && !lv.grand ? `<div class="amiral">📡 <i>${AMIRAL[lv.world - 1]}</i></div>` : ''}
    ${lv.final && !prev ? `<div class="part-won"><span>${SHIP_PARTS[lv.world - 1].ic}</span><div><b>Gemi parçası bulundu: ${SHIP_PARTS[lv.world - 1].name}</b><small>Şimşek gemisi ${partsHave(data)}/10 tamir edildi</small></div></div>` : ''}
    ${starsHtml(stars)}
    <div class="stat"><div><b>${s.moves}</b>hamle</div>${s.board.stars.mode === 'moves' ? `<div><b>≤${s.board.stars.par[0]}</b>hedef</div>` : `<div><b>${cnt}/${tgt}</b>çöken kare</div>`}<div><b>+${coins}</b>altın</div></div>
    ${stars < 3 ? `<div class="tip">${s.board.stars.mode === 'moves' ? `⭐⭐⭐ için en fazla <b>${s.board.stars.par[0]} hamlede</b> bitir!` : `⭐⭐⭐ için kapıya girmeden önce <b>bütün kareleri</b> çökert!`}</div>` : ''}
    ${coins > 0 ? `<button class="btn gold" data-act="adDouble" data-c="${coins}">📺 Reklam izle: 2× altın (+${coins})</button>` : `<div class="tip">Tekrar oynamada altın sadece yeni yıldızlar için verilir.</div>`}
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
    data.coins += 20; Eco.stat(data, 'daily');
  }
  d.stars = Math.max(d.date === key ? d.stars || 0 : 0, stars); d.date = key;
  data.daily = d; save();
  sfx.win(); vibrate('heavy');
  openModal(`
    <div class="emoji">🧩🔥</div>
    <h2>Günün Bulmacası Tamam!</h2>
    <p>Seri: <b>${d.streak} gün</b>. Yarın yeni bulmaca seni bekliyor.</p>
    ${starsHtml(stars)}
    ${first ? `<div class="energy-pill">${COIN} +20</div>` : ''}
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
    ${game.history.length && !game.adContinueUsed ? '<button class="btn primary" data-act="adContinue">📺 Reklamla devam et</button>' : ''}
    ${undoBtnHtml()}
    ${game.level.grand && game.checkpoint ? `<button class="btn gold" data-act="floorRetry">🏢 Kat ${game.checkpoint.floor + 1}'ten devam et</button>` : ''}
    <button class="btn primary" data-act="restart"><span class="i-restart"></span>Yeniden Başla</button>
    <button class="btn purple" data-act="${daily ? 'menu' : 'map'}">${daily ? 'Ana Menü' : 'Haritaya dön'}</button>`, 'fail');
}
/** Final: kaybedince bulunduğun katın başından devam */
function floorRetry() {
  const cp = game.checkpoint; if (!cp) return;
  closeModal(); game.lossPending = false;
  game.state = cloneState(cp.state); game.history = []; clearTimeout(game.deadTimer);
  stage.build(game.state.board, game.state);
  $('banner').classList.add('hidden');
  updateHud(); updateDanger();
  floorBanner(cp.floor);
}

// Her boss yenilince yakalanan gizemli telsiz mesajı: Kaptan Bolt 2'nin kötüsü Paslı Amiral'e ipucu
const AMIRAL = [
  '"...zindan bekçisi düştü. Amiral\'e haber verin..."',
  '"...küçük robot ilerliyor. Amiral sabırsızlanıyor..."',
  '"...buz kapısı açıldı. Plan değişmeli..."',
  '"...devriyeler yetmiyor. Amiral bizzat ilgilenecek..."',
  '"...gemi parçalarını topluyor! Durdurun onu..."',
  '"...laboratuvar düştü. Orman hazır mı?..."',
  '"...takipçiler kayboldu. Amiral öfkeli..."',
  '"...köprüler yıkıldı. Kalan kuvvetler ormana çekilsin..."',
  '"...son kale yakında. Amiral pas tutmuş elini sıkıyor..."',
  '"...kral düştü. Amiral: Ormanda görüşürüz, küçük robot."',
];

/** Final kazanıldı: bitiş videosu, sonra Kaptan Bolt 2 kartı */
function grandEnding(stars) {
  if (!data.owned.includes('efsane')) { data.owned.push('efsane'); save(); }
  const show2 = () => openModal(`
    <div class="kb2">
      <div class="kb2-glow"></div>
      <div class="emoji">🌴🤖🌴</div>
      <h2>KAPTAN BOLT 2</h2>
      <div class="kb2-sub">Orman Uyanıyor</div>
      <p>Paslı Amiral ormanda bekliyor... Bolt'un yeni macerası yakında!</p>
      ${starsHtml(stars)}
      <div class="part-won"><span>🏆</span><div><b>Yeni kostüm: Efsane Bolt</b><small>Garajda seni bekliyor</small></div></div>
      <button class="btn gold" data-act="kb2notify">${data.kb2Notify ? '✅ Haber vereceğiz' : '🔔 Çıkınca haber ver'}</button>
      <button class="btn" data-act="menu">Ana Menü</button>
    </div>`, 'kb2card');
  const canVideo = !navigator.webdriver || location.hash.includes('intro');
  if (canVideo) playVideo('ending.mp4').then(show2); else show2();
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
      <button class="btn primary" data-act="adHint">📺 Reklam izle: 💡 +1</button>
      <button class="btn gold" data-act="buyhint">${COIN} ${Eco.HINT_COST} ile 1 ipucu al</button><button class="btn" data-act="close">Vazgeç</button>`);
  }
  // önce 3 yıldızlı yolu ara (bütün hedef taşlar çöksün), bulunamazsa en kısa çıkış
  let r = null;
  const tgt = coverTarget(game.state.board);
  if (game.state.board.stars.mode !== 'moves') { const bc = bestCover(game.state, 250000, 1800, tgt); if (bc && bc.count >= tgt && bc.moves.length) r = { moves: bc.moves }; }
  if (!r) r = shortest(game.state, 400000, 2500);
  if (!r) { const bn = $('banner'); bn.innerHTML = '⚠️ Bu rota çıkmaza girdi'; bn.classList.remove('hidden'); return toast('Buradan çıkış yok. Geri al ya da yeniden başla!'); }
  if (r.unknown || !r.moves.length) return toast('İpucu hesaplanamadı, biraz ilerleyip tekrar dene.');
  data.hints--; save(); updateHud();
  sfx.hint();
  stage.showHint(r.moves[0]);
}

// ---------------- Güçler ----------------
function renderPowers() {
  const bar = $('powerBar'); if (!bar || !game.state) return;
  bar.innerHTML = Eco.POWERS.map((p) => {
    const n = data.powers[p.id] || 0;
    const active = (p.id === 'jump' && game.jumpArmed) || (p.id === 'shield' && game.shield) || (p.id === 'freeze' && game.state.frozen > 0);
    return `<button class="pw ${n ? '' : 'zero'} ${active ? 'active' : ''}" data-power="${p.id}" aria-label="${p.name}">${p.ic}<b>${n || '+'}</b></button>`;
  }).join('');
}
function usePower(id) {
  const p = Eco.POWERS.find((x) => x.id === id);
  const s = game.state;
  if (!s || s.status !== 'play' || game.busy) return;
  if (!(data.powers[id] > 0)) {
    return openModal(`<div class="emoji">${p.ic}</div><h2>${p.name}</h2><p>${p.desc}.</p>
      <button class="btn gold" data-act="buypower" data-id="${id}" data-use="1">${COIN} ${p.price} ile al ve kullan</button>
      <button class="btn" data-act="close">Vazgeç</button>`);
  }
  const consume = () => { data.powers[id]--; game.powerUsed = true; save(); sfx.hint(); vibrate('medium'); };
  if (id === 'jump') { game.jumpArmed = !game.jumpArmed; toast(game.jumpArmed ? '🦘 Zıplamak için bir yöne kaydır' : 'Zıplama iptal'); return renderPowers(); }
  if (id === 'shield') { if (game.shield) return toast('🛡 Kalkan zaten açık'); if (!s.enemies.length && !s.boss) return toast('Bu bölümde düşman yok.'); consume(); game.shield = true; toast('🛡 Kalkan açık: bir kez yakalanmazsın'); return updateHud(); }
  if (id === 'freeze') { if (!s.enemies.length && !s.boss) return toast('Bu bölümde düşman yok.'); consume(); s.frozen = 3; stage.setFrozen(true); toast('🧊 Düşmanlar 3 hamle donduruldu'); updateDanger(); return updateHud(); }
  if (id === 'undo3') { if (game.busy || !game.history.length) return toast('Geri alınacak hamle yok.'); consume(); return undo(true); }
  if (id === 'repair') {
    let c = null;
    while (game.collapseOrder.length) { const x = game.collapseOrder.pop(); if (s.collapsed[x] && x !== s.pos) { c = x; break; } }
    if (c === null) return toast('Onarılacak çöken kare yok.');
    consume(); s.collapsed[c] = 0; if (s.board.cells[c] === STRONG) s.hits[c] = 1;
    stage.build(s.board, s); $('banner').classList.add('hidden'); toast('🔨 Kare onarıldı'); updateDanger(); return updateHud();
  }
}

// ---------------- Mağaza ----------------
let shopTab = 'powers';
/** Gerçek para düğmesi: mağaza bağlantısı kurulmadıysa "Yakında" görünür */
const moneyBtn = (k, label, cls = 'money') => (purchasesReady() ? `<button class="buy ${cls === 'gold' ? '' : 'money'}" data-act="iap" data-k="${k}">${label}</button>` : '<span class="buy dis">Yakında</span>');
/** Üst üste altın simgesi (tek satır, taşmaz) */
const coinStack = (n) => `<svg viewBox="0 0 40 40" width="42" height="42">${Array.from({ length: n }, (_, i) => `<g transform="translate(${4 + i * 4},${14 - i * 5})"><ellipse cx="14" cy="16" rx="12" ry="5" fill="#b07a00"/><ellipse cx="14" cy="13" rx="12" ry="5" fill="#ffcf3a" stroke="#b07a00" stroke-width="1.5"/></g>`).join('')}</svg>`;
const SHOP_TABS = [['powers', '⚡ Güçler'], ['pro', '👑 Pro'], ['coins', '🪙 Altın'], ['hints', '💡 İpucu'], ['skins', '🎩 Kostüm'], ['energy', '🔋 Enerji']];
function renderShop() {
  $('shopTabs').innerHTML = SHOP_TABS.map(([k, t]) => `<button class="${k === shopTab ? 'on' : ''}" data-shoptab="${k}">${t}</button>`).join('');
  const cbuy = (price, act, extra = '') => `<button class="buy ${data.coins >= price ? '' : 'dis'}" data-act="${act}" ${extra}>${COIN} ${fmtNum(price)}</button>`;
  const today = dateKey();
  let h = '';
  if (shopTab === 'powers') {
    h = Eco.POWERS.map((p) => `<div class="item"><div class="ii">${p.ic}</div><div class="it">${p.name}<small>${p.desc}</small><span class="own">Sende: ${data.powers[p.id] || 0}</span></div>${cbuy(p.price, 'buypower', `data-id="${p.id}"`)}</div>`).join('')
      + '<p class="shop-note">Güçler oyun ekranının altındaki çubuktan kullanılır. Güç kullanınca "En iyi" hamle sayın güncellenmez.</p>';
  } else if (shopTab === 'hints') {
    h = `<div class="item"><div class="ii">💡</div><div class="it">1 İpucu<small>Sıradaki doğru hamleyi gösterir</small><span class="own">Sende: ${data.hints}</span></div>${cbuy(Eco.HINT_COST, 'buyhints', 'data-n="1"')}</div>
      <div class="item"><div class="ii">💡</div><div class="it">5 İpucu<small>Paket fiyatı</small></div>${cbuy(Eco.HINT5_COST, 'buyhints', 'data-n="5"')}</div>`;
  } else if (shopTab === 'energy') {
    const left = Eco.AD_ENERGY_PER_DAY - Eco.adCount(data, 'energy', today);
    h = `<div class="item"><div class="ii">${BOLT()}</div><div class="it">Enerjiyi doldur<small>En fazla ${Eco.ENERGY_MAX} enerji</small><span class="own">Şu an: ${Eco.isPro(data) ? '∞' : data.energy}</span></div>${cbuy(Eco.REFILL_COST, 'refillShop')}</div>
      <div class="item"><div class="ii">📺</div><div class="it">Reklam izle: +1 enerji<small>Bugün ${left} hak kaldı</small></div><button class="buy ad ${left > 0 ? '' : 'dis'}" data-act="adEnergyShop">İzle</button></div>`;
  } else if (shopTab === 'skins') {
    h = SKINS.map((k) => {
      const own = data.owned.includes(k.id) || data.settings.unlockAll || (k.pro && Eco.isPro(data));
      const sel = (data.skin || 'klasik') === k.id;
      if (k.grand && !own) return `<div class="item"><div class="ii"><img src="${skinImg(k)}" alt=""></div><div class="it">${k.name}<small>Final bölümünü (351) bitirince açılır</small></div><span class="buy dis">👑</span></div>`;
      if (k.gear && !own) return `<div class="item"><div class="ii"><img src="${skinImg(k)}" alt=""></div><div class="it">${k.name}<small>Dünya ${k.gear}'in 3 gizli dişlisini topla • ⚙️ ${gearsOf(k.gear)}/3</small></div><span class="buy dis">⚙️</span></div>`;
      const btn = sel ? '<span class="buy dis">Seçili</span>' : own ? `<button class="buy ad" data-skin="${k.id}">Seç</button>` : k.pro ? '<button class="buy" data-shoptab="pro">👑 Pro</button>' : cbuy(Eco.SKIN_PRICES[k.id], 'buyskin', `data-id="${k.id}"`);
      return `<div class="item"><div class="ii"><img src="${skinImg(k)}" alt=""></div><div class="it">${k.name}${k.pro ? ' <span class="pro-badge">PRO</span>' : ''}<small>${own ? 'Sende var' : k.pro ? 'Sadece Pro üyelere özel' : 'Kostüm'}</small></div>${btn}</div>`;
    }).join('');
  } else if (shopTab === 'coins') {
    const left = Eco.AD_COINS_PER_DAY - Eco.adCount(data, 'coins', today);
    h = `<div class="item"><div class="ii">📺</div><div class="it">Reklam izle: +${Eco.AD_COINS} altın<small>Bugün ${left} hak kaldı</small></div><button class="buy ad ${left > 0 ? '' : 'dis'}" data-act="adCoins">İzle</button></div>`
      + (data.starterBought ? '' : `<div class="item starter"><div class="ii">🎁</div><div class="it">Başlangıç Paketi<small>1.500 altın • her güçten 3 • Korsan kostümü<br><b>Sadece bir kez!</b></small></div>${moneyBtn('starter', IAP.products.starter.price, 'gold')}</div>`)
      + ['coins500', 'coins1300', 'coins3000', 'coins8000'].map((k, i) => { const p = IAP.products[k]; const tot = Math.round(p.coins * (1 + (p.bonus || 0) / 100)); return `<div class="item"><div class="ii">${coinStack(i + 1)}</div><div class="it">${fmtNum(tot)} Altın${p.bonus ? ` <span class="bonus-badge">+%${p.bonus}</span>` : ''}<small>${['Başlangıç', 'Popüler', 'Avantajlı', 'En iyi değer'][i]}</small></div>${moneyBtn(k, p.price)}</div>`; }).join('')
      + '<p class="shop-note">Ödemeler Google Play üzerinden yapılır.</p>';
  } else if (shopTab === 'pro') {
    const proSale = () => Date.now() < Date.parse(IAP.products.proLifetime.saleEnd);
    const pro = Eco.isPro(data);
    h = `<div class="pro-card"><h3>👑 Kaptan Bolt PRO</h3>
      <ul><li>Geçiş reklamı yok</li><li>Sınırsız enerji</li><li>Her gün ${Eco.PRO_DAILY_COINS} altın hediye</li><li>Bölüm altınları 2 katı</li><li>Özel "Pro Kaptan" kostümü</li></ul>
      ${pro ? `<div class="tip">✔ Pro üyesisin${data.pro.lifetime ? ' (ömür boyu)' : data.pro.until ? ` • ${new Date(data.pro.until).toLocaleDateString('tr-TR')} tarihine kadar` : ''}</div>` : `<div class="row2">
        ${moneyBtn('proLifetime', `Ömür Boyu Pro<small>${proSale() ? `<s>${IAP.products.proLifetime.oldPrice}</s> ` : ''}${IAP.products.proLifetime.price} • tek ödeme</small>`, 'gold')}</div>
      ${proSale() ? `<div class="tip">🔥 %${IAP.products.proLifetime.salePct} indirim • 31 Ocak'a kadar</div>` : ''}`}
      </div><button class="btn small" data-act="restore" style="width:100%">Satın alımları geri yükle</button>
      <p class="shop-note">Tek seferlik ödeme, abonelik yok. Aynı Google hesabıyla geri yüklenir.</p>`;
  }
  $('shopList').innerHTML = h;
  renderRes();
}
/** Satın alınan ürünü oyuna ver. Aynı jeton iki kez verilmez. Dönüş: true | 'dup' | false */
function grantPurchase(k, token) {
  const p = IAP.products[k]; if (!p) return false;
  data.iapTokens = data.iapTokens || [];
  if (token && data.iapTokens.includes(token)) {
    // Pro'yu yine de açık tut (yeniden kurulum / geri yükleme)
    if (p.pro && !(data.pro && data.pro.lifetime)) { data.pro = { ...(data.pro || {}), active: true, lifetime: true, until: 0 }; save(); }
    return 'dup';
  }
  if (p.pro) {
    data.pro = { ...(data.pro || {}), active: true, lifetime: true, until: 0 };
    toast('👑 Pro aktif! Teşekkürler Kaptan!');
    proDaily();
  } else if (p.once && data.starterBought) {
    // başlangıç paketi bu kayıtta zaten açılmış (ör. buluttan gelen kayıt)
  } else if (p.coins) {
    const tot = Math.round(p.coins * (1 + (p.bonus || 0) / 100));
    data.coins += tot;
    if (p.powers) for (const pw of Eco.POWERS) data.powers[pw.id] = (data.powers[pw.id] || 0) + p.powers;
    if (p.skin && !data.owned.includes(p.skin)) data.owned.push(p.skin);
    if (p.once) data.starterBought = true;
    toast(p.once ? '🎁 Başlangıç paketi açıldı! +1.500 altın, güçler ve Korsan kostümü' : `+${fmtNum(tot)} altın!`);
  }
  if (token) { data.iapTokens.push(token); if (data.iapTokens.length > 200) data.iapTokens = data.iapTokens.slice(-200); }
  save(); sfx.win(); vibrate('heavy');
  if (screen === 'shop') renderShop(); else renderRes();
  Cloud.pushSoon(true);
  if (!Cloud.signedIn() && Cloud.available()) setTimeout(() => toast('Satın aldıkların kaybolmasın: Ayarlar → Google ile giriş yap.'), 2600);
  return true;
}
setPurchaseHandler((k, token) => grantPurchase(k, token));
async function doIap(k) {
  const r = await iapBuy(k);
  if (!r.ok) return r.cancelled ? null : toast(r.message || 'Satın alma tamamlanamadı.');
  if (r.test) grantPurchase(k, 'test-' + Date.now()); // tarayıcı testi
}
/** Pro: her gün 100 altın */
function proDaily() {
  if (!Eco.isPro(data) || data.pro.lastDaily === dateKey()) return;
  data.pro.lastDaily = dateKey(); data.coins += Eco.PRO_DAILY_COINS; save();
  toast(`👑 Pro günlük hediye: +${Eco.PRO_DAILY_COINS} altın`);
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
  sentry: T('🔴 <b>Lazer Nöbetçi!</b>', 'Yerinden kıpırdamaz. Bir hamlede ışın yolu yanıp söner, sonraki hamlede lazer atar. Işının üstünde durma, zamanlamanı iyi ayarla!'),
  box: T('📦 <b>Kutu!</b>', 'Kutuya doğru yürüyünce onu itersin. Çukura iterek doldurursan üstünden bir kez geçebilirsin.'),
  timed: T('⏳ <b>Zamanlı Taş!</b>', 'Üstündeki sayı her hamlende azalır, sıfır olunca taş kendiliğinden çöker. Üstündeysen düşersin!'),
  gate: T('🟥 <b>Renkli Bariyer!</b>', 'Aynı renkteki anahtarı alınca bariyer kalkar ve normal taşa döner.'),
  dark: T('🌑 <b>Karanlık Bölüm!</b>', 'Başta tahtayı iyi ezberle. Sonra sadece robotunun çevresi görünür.'),
  challenge: T('⚡ <b>Meydan Okuma!</b>', 'Kapı ancak bütün taşlar çökünce açılır. Başarırsan 2 kat altın!'),
  gear: T('⚙️ <b>Gizli Dişli!</b>', 'Bazı bölümlerde yoldan biraz sapınca dişli bulursun. Bir dünyanın 3 dişlisi = yeni kostüm!'),
  floors3: T('🏢 <b>Üç Katlı Bölüm!</b>', 'İki asansör var: önce 1. katı, sonra 2. katı bitir, en sonda en üst kata çık.'),
  lock: T('🔒 <b>Kilitli Kapı!</b>', 'Kapının üstündeki sayaç dolana kadar taş çökert, sonra kapı açılır. Bütün taşları çökertirsen ⭐⭐⭐!'),
  lift: T('🛗 <b>İki Katlı Bölüm!</b>', 'Asansöre binince öbür kata çıkarsın ama bindiğin asansör çöker, geri dönemezsin. Önce bu katı bitir, sonra yukarı çık!'),
  gnawer: T('🐛 <b>Kemirici Böcek!</b>', 'Seni yakalamaz ama gidip gelirken arkasındaki kareleri yer! Yoluna ihtiyacın varsa yetiş ve üstüne basıp ez.'),
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
  if (game.afterTut) { const f = game.afterTut; game.afterTut = null; f(); }
}

// ---------------- Modal / ayarlar ----------------
function shipModal() {
  const have = partsHave(data);
  openModal(`
    <h2>🚀 Şimşek Gemisi</h2>
    <p>Her dünyanın boss'unu yen, gemi parçasını kap!</p>
    <div class="ship-bar"><i style="width:${have * 10}%"></i><span>${have}/10 parça</span></div>
    <div class="ship-grid">${SHIP_PARTS.map((p, i) => partHas(data, i)
      ? `<div class="part on"><span>${p.ic}</span><b>${p.name}</b></div>`
      : `<div class="part"><span>❔</span><b>Dünya ${i + 1} boss'u</b></div>`).join('')}</div>
    ${have === 10 ? '<div class="tip">🎉 Gemi tamamen tamir edildi! Kaptan Bolt eve dönmeye hazır.</div>' : ''}
    <button class="btn" data-act="story">📖 Hikâye</button>
    <button class="btn primary" data-act="close">Tamam</button>`, 'ship');
}
let modalT = 0;
const modalOpen = () => { const m = $('modal'); return !m.classList.contains('hidden') && !m.classList.contains('closing'); };
function openModal(html, cls = '') { clearTimeout(modalT); const m = $('modal'); m.classList.remove('closing'); $('card').className = 'card ' + cls; $('card').innerHTML = html; m.classList.remove('hidden'); }
function closeModal() {
  energyModalOpen = false;
  const m = $('modal'); if (m.classList.contains('hidden') || m.classList.contains('closing')) return;
  m.classList.add('closing'); clearTimeout(modalT);
  modalT = setTimeout(() => { m.classList.add('hidden'); m.classList.remove('closing'); }, 200);
}
/** Menü <-> oyun gibi 3B sahne değişimlerinde kısa kararma: sert kesme olmasın */
function fadeSwap(fn) {
  const f = $('fader');
  if (navigator.webdriver) { fn(); return; }
  f.classList.add('on');
  setTimeout(() => { fn(); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); }, 220);
}
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600); }

/** Açılış: stüdyo ekranı solar, logo düşerek gelir, robot el sallar, düğmeler sırayla yükselir */
function openingAnim() {
  const sp = $('splash');
  const forced = location.hash.includes('opening');
  if (navigator.webdriver && !forced) { if (sp) sp.remove(); return; }
  // günün ilk açılışında uzun sahne (gemi düşer, taşlar dizilir, Bolt atlar); sonra sadece kısa giriş
  const full = forced || data.introDay !== dateKey();
  data.introDay = dateKey(); save();
  const wait = Math.max(0, 900 - performance.now());
  setTimeout(() => {
    if (sp) { sp.classList.add('out'); setTimeout(() => sp.remove(), 700); }
    if (!full) {
      if (stage.robot) stage.robot.visible = false;
      document.body.classList.add('opening');
      setTimeout(() => { if (stage.robot) { stage.robot.visible = true; stage.greet(); } }, 750);
      setTimeout(() => document.body.classList.remove('opening'), 2300);
      return;
    }
    document.body.classList.add('intro-hold');
    const skip = () => stage.skipIntro();
    window.addEventListener('pointerdown', skip, { once: true });
    let shown = false;
    const showUi = () => { if (shown) return; shown = true; document.body.classList.remove('intro-hold'); document.body.classList.add('opening', 'ui-only'); setTimeout(() => document.body.classList.remove('opening', 'ui-only'), 2300); };
    sfx.ship();
    stage.playIntro({
      onImpact: () => { const f = $('fader'); f.classList.add('flash'); setTimeout(() => f.classList.remove('flash'), 140); vibrate('heavy'); },
      onBoard: () => setTimeout(showUi, 500),
    }).then(() => { window.removeEventListener('pointerdown', skip); showUi(); });
  }, wait);
}

function settingsModal() {
  const s = data.settings;
  const tile = (k, ic, label) => `<button class="set-tile ${s[k] ? 'on' : ''}" data-toggle="${k}"><span class="si">${ic}</span>${label}<i class="toggle ${s[k] ? 'on' : ''}"></i></button>`;
  openModal(`
    <h2>Ayarlar</h2>
    <div class="set-grid">
      ${tile('sound', '🔊', 'Ses')}${tile('music', '🎵', 'Müzik')}
      ${tile('vibration', '📳', 'Titreşim')}
      <div class="set-tile q"><span class="si">✨</span>Grafik<div class="seg"><button class="${s.quality === 'high' ? 'on' : ''}" data-quality="high">Yüksek</button><button class="${s.quality !== 'high' ? 'on' : ''}" data-quality="low">Dengeli</button></div></div>
    </div>
    ${accountBlock()}
    <div class="set-row"><button class="btn small" data-act="howto">❔ Yardım</button><button class="btn small purple" data-act="resetask">♻ Sıfırla</button></div>
    <button class="btn primary" data-act="close">Kapat</button>
    <div class="foot">Kaptan Bolt v1.0.1 • EA Vision Labs</div>`);
}
// ---------------- Google hesabı / bulut kayıt ----------------
const esc = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function accountBlock() {
  if (!Cloud.available()) return '';
  const u = Cloud.currentUser();
  if (!u) return `<div class="acct"><button class="btn google" data-act="gsign"><span class="g">G</span>Google ile giriş yap</button><small>İlerlemen ve satın aldıkların kaybolmasın, başka telefonda da devam et.</small></div>`;
  return `<div class="acct in"><div class="who">☁️ <b>${esc(u.name || 'Kaptan')}</b><small>${esc(u.email)} • ilerlemen buluta kaydediliyor</small></div>
    <div class="set-row"><button class="btn small" data-act="gsync">⤴ Şimdi kaydet</button><button class="btn small" data-act="gout">Çıkış yap</button></div>
    <button class="linkbtn" data-act="gdelask">Hesabımı ve bulut kaydımı sil</button></div>`;
}
let pendingCloud = null;
async function doSignIn() {
  try { await Cloud.signIn(); } catch (e) {
    const m = String((e && e.message) || e);
    if (!/cancel/i.test(m)) toast(/NoCredential/i.test(m) ? 'Telefonda Google hesabı bulunamadı.' : 'Giriş yapılamadı. İnternetini kontrol edip tekrar dene.');
    return;
  }
  let cloud = null;
  try { cloud = await Cloud.loadCloud(); } catch { cloud = null; }
  if (!cloud) { await Cloud.pushNow(); toast('✔ Giriş yapıldı. İlerlemen buluta kaydedildi.'); return settingsModal(); }
  const a = Cloud.summary(data), b = Cloud.summary(cloud);
  if (a.stars === b.stars && a.coins === b.coins) { Cloud.mergePurchases(data, cloud); save(); await Cloud.pushNow(); toast('✔ Giriş yapıldı.'); return settingsModal(); }
  pendingCloud = cloud;
  const row = (t, x) => `<div class="cmp"><b>${t}</b><span>⭐ ${x.stars}</span><span>🏁 ${x.levels} bölüm</span><span>🪙 ${fmtNum(x.coins)}</span>${x.pro ? '<span>👑 Pro</span>' : ''}</div>`;
  openModal(`<div class="emoji">☁️</div><h2>Bulutta kayıt bulundu</h2><p>Hangi ilerleme kalsın? Satın aldıkların her iki durumda da korunur.</p>
    ${row('Bulut', b)}${row('Bu telefon', a)}
    <button class="btn primary" data-act="usecloud">Buluttakini yükle</button><button class="btn" data-act="uselocal">Bu telefondakini kullan</button>`);
}
async function useCloud() {
  if (!pendingCloud) return closeModal();
  const d = Cloud.mergePurchases(Eco.ensure({ ...Save.load(), ...pendingCloud }), data);
  data = d; Save.save(data); pendingCloud = null;
  await Cloud.pushNow();
  toast('Buluttaki kayıt yüklendi.');
  setTimeout(() => location.reload(), 600);
}
async function useLocal() {
  if (pendingCloud) { Cloud.mergePurchases(data, pendingCloud); pendingCloud = null; }
  save(); await Cloud.pushNow();
  toast('✔ Bu telefondaki ilerleme buluta kaydedildi.');
  settingsModal();
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
  if (el.dataset.grandskin) { vibrate('light'); return toast('👑 Bu kostüm final bölümünü bitirenlere özel!'); }
  if (el.dataset.gearskin) { vibrate('light'); return toast(`⚙️ Dünya ${el.dataset.gearskin}'in bölümlerinde 3 gizli dişli var. Yoldan sapıp hepsini topla!`); }
  if (el.dataset.skin) { if (screen === 'shop') { pickSkin(el.dataset.skin); return renderShop(); } return pickSkin(el.dataset.skin); }
  if (el.dataset.power) return usePower(el.dataset.power);
  if (el.dataset.shoptab) { shopTab = el.dataset.shoptab; if (screen !== 'shop') return show('shop'); return renderShop(); }
  if (el.dataset.lv) {
    if (el.dataset.locked) { vibrate('light'); return toast('Bu bölümü açmak için öncekini bitir.'); }
    return startLevel(+el.dataset.lv);
  }
  if (el.dataset.world) {
    const w = +el.dataset.world;
    if (!Save.worldUnlocked(data, w)) { vibrate('light'); return toast(`Dünya ${w - 1}'in boss'unu yen ya da ⭐ ${Eco.WORLD_STARS(w)} topla.`); }
    currentWorld = w; return show('map');
  }
  if (el.dataset.toggle) { const k = el.dataset.toggle; data.settings[k] = !data.settings[k]; save(); applySettings(); renderRes(); if ($('card').querySelector('.set-grid')) return settingsModal(); el.classList.toggle('on', data.settings[k]); return; }
  if (el.dataset.quality) { data.settings.quality = el.dataset.quality; save(); applySettings(); return settingsModal(); }
  switch (el.dataset.act) {
    case 'continue': { const n = Save.continueLevel(data, MAX); currentWorld = Save.worldOf(n); return startLevel(n); }
    case 'worlds': stage.board = null; return show('worlds');
    case 'map': if (!modalOpen() && guardLeave('map')) return; settleLoss(); if (game.level && !game.level.daily) currentWorld = game.level.world; stage.board = null; return show('map');
    case 'menu': if (!modalOpen() && guardLeave('menu')) return; settleLoss(); closeModal(); return fadeSwap(() => { stage.board = null; show('menu'); });
    case 'back': return back();
    case 'settings': return settingsModal();
    case 'howto': return howtoModal();
    case 'close': return closeModal();
    case 'closeEnergy': closeModal(); renderRes(); return;
    case 'stay': return closeModal();
    case 'leave': return leaveNow(el.dataset.to);
    case 'floorRetry': return floorRetry();
    case 'kb2notify': data.kb2Notify = true; save(); toast('🔔 Kaptan Bolt 2 çıkınca haber vereceğiz!'); return grandEnding(data.stars[game.level.id] || 3);
    case 'restart': if (!modalOpen() && guardLeave('restart')) return; return startLevel(game.level.daily ? game.level : game.level.id);
    case 'next': { const id = game.level.id; closeModal(); return (Eco.isPro(data) ? Promise.resolve() : maybeInterstitial(id)).then(() => startLevel(id + 1)); }
    case 'undo': return undo();
    case 'hint': return useHint();
    case 'buyhint': if (data.coins < Eco.HINT_COST) return toast('Yeterli altının yok.'); data.coins -= Eco.HINT_COST; data.hints++; save(); closeModal(); updateHud(); return useHint();
    case 'tutok': return hideTutorial();
    case 'daily': closeModal(); settleLoss(); return startLevel(dailyLevel());
    case 'garage': return show('garage');
    case 'ach': return show('ach');
    case 'quests': return questsModal();
    case 'ship': return shipModal();
    case 'storyGo': closeModal(); return startLevel(1);
    case 'introSkip': return endIntro();
    case 'introSound': { const v = $('introVid'); v.muted = false; $('introSound').classList.add('hidden'); return; }
    case 'story': closeModal(); return playIntro().then(shipModal);
    case 'claimq': { const r = Eco.claimQuest(data, +el.dataset.i); if (r) { save(); sfx.coin(); toast('Ödül alındı: ' + Eco.rewardText(r)); renderRes(); renderMenu(); } return questsModal(); }
    case 'claimbonus': if (Eco.claimBonus(data)) { save(); sfx.win(); renderRes(); renderMenu(); } return questsModal();
    case 'claimach': { const c = Eco.claimAch(data, el.dataset.id); if (c) { save(); sfx.coin(); toast(`+${c} altın!`); renderRes(); } return renderAch(); }
    case 'buyskin': if (screen === 'shop') { const k = SKINS.find((x) => x.id === el.dataset.id); if (data.coins < Eco.SKIN_PRICES[k.id]) return toast('Yeterli altının yok.'); buySkin(k.id); return renderShop(); } return buySkin(el.dataset.id);
    case 'shop': return show('shop');
    case 'buypower': { const p = Eco.POWERS.find((x) => x.id === el.dataset.id); if (data.coins < p.price) return toast('Yeterli altının yok. Mağazadan altın alabilirsin.'); data.coins -= p.price; data.powers[p.id] = (data.powers[p.id] || 0) + 1; save(); sfx.coin(); if (el.dataset.use) { closeModal(); return usePower(p.id); } toast(`${p.ic} ${p.name} alındı`); return renderShop(); }
    case 'buyhints': { const n = +el.dataset.n, c = n === 5 ? Eco.HINT5_COST : Eco.HINT_COST; if (data.coins < c) return toast('Yeterli altının yok.'); data.coins -= c; data.hints += n; save(); sfx.coin(); toast(`💡 +${n} ipucu`); return renderShop(); }
    case 'refillShop': if (Eco.isPro(data)) return toast('Pro üyelerde enerji sınırsız.'); if (data.energy >= Eco.ENERGY_MAX) return toast('Enerjin zaten dolu.'); if (data.coins < Eco.REFILL_COST) return toast('Yeterli altının yok.'); data.coins -= Eco.REFILL_COST; data.energy = Eco.ENERGY_MAX; data.energyAt = Date.now(); save(); sfx.coin(); return renderShop();
    case 'adEnergyShop': if (data.energy >= Eco.ENERGY_MAX) return toast('Enerjin zaten dolu.'); if (Eco.adCount(data, 'energy', dateKey()) >= Eco.AD_ENERGY_PER_DAY) return toast('Bugünkü reklam hakkın bitti.'); return showRewarded().then((ok) => { if (!ok) return toast('Reklam şu an yüklenemedi.'); Eco.adUsed(data, 'energy', dateKey()); Eco.addEnergy(data, 1); save(); sfx.coin(); toast('+1 enerji!'); renderShop(); });
    case 'adCoins': if (Eco.adCount(data, 'coins', dateKey()) >= Eco.AD_COINS_PER_DAY) return toast('Bugünkü reklam hakkın bitti.'); return showRewarded().then((ok) => { if (!ok) return toast('Reklam şu an yüklenemedi.'); Eco.adUsed(data, 'coins', dateKey()); data.coins += Eco.AD_COINS; save(); sfx.coin(); toast(`+${Eco.AD_COINS} altın!`); renderShop(); });
    case 'iap': return doIap(el.dataset.k);
    case 'restore': return iapRestore().then((st) => { if (!st) return toast('Mağazaya bağlanılamadı.'); setTimeout(() => { toast(st.owned.includes('proLifetime') ? '👑 Pro geri yüklendi' : 'Geri yüklenecek satın alım bulunamadı.'); renderShop(); }, 900); });
    case 'adEnergy': return showRewarded().then((ok) => { if (!ok) return toast('Reklam şu an yüklenemedi, biraz sonra tekrar dene.'); Eco.adUsed(data, 'energy', dateKey()); Eco.addEnergy(data, 1); save(); sfx.coin(); renderRes(); toast('+1 enerji!'); renderEnergyModal(energyThen ? false : true); });
    case 'adDouble': { const c = +el.dataset.c; el.disabled = true; return showRewarded().then((ok) => { if (!ok) { el.disabled = false; return toast('Reklam şu an yüklenemedi.'); } data.coins += c; save(); sfx.coin(); el.outerHTML = `<div class="tip">${COIN} +${c} altın daha kazandın!</div>`; }); }
    case 'adHint': return showRewarded().then((ok) => { if (!ok) return toast('Reklam şu an yüklenemedi.'); data.hints++; save(); closeModal(); updateHud(); sfx.hint(); useHint(); });
    case 'adContinue': return showRewarded().then((ok) => { if (!ok) return toast('Reklam şu an yüklenemedi.'); game.adContinueUsed = true; rewindToWinnable(); });
    case 'refill': if (data.coins < Eco.REFILL_COST) return toast('Yeterli altının yok.'); data.coins -= Eco.REFILL_COST; data.energy = Eco.ENERGY_MAX; data.energyAt = Date.now(); save(); renderRes(); sfx.win(); return renderEnergyModal(false);
    case 'gsign': return doSignIn();
    case 'gsync': return Cloud.pushNow().then((ok) => toast(ok ? '✔ Buluta kaydedildi.' : 'Kaydedilemedi, sonra tekrar denenecek.'));
    case 'gout': return Cloud.signOut().then(() => { toast('Çıkış yapıldı. İlerlemen bu telefonda kalıyor.'); settingsModal(); });
    case 'usecloud': return useCloud();
    case 'uselocal': return useLocal();
    case 'gdelask': return openModal(`<div class="emoji">⚠️</div><h2>Hesap silinsin mi?</h2><p>Google hesabınla bağlantı ve bulut kaydın kalıcı olarak silinir. Bu telefondaki ilerleme kalır.</p><button class="btn purple" data-act="gdel">Evet, sil</button><button class="btn primary" data-act="settings">Vazgeç</button>`, 'fail');
    case 'gdel': return Cloud.deleteAccount().then(() => { toast('Hesabın ve bulut kaydın silindi.'); settingsModal(); }).catch(() => { toast('Güvenlik için çıkış yapıp tekrar giriş yap, sonra yeniden dene.'); settingsModal(); });
    case 'resetask': return openModal(`<div class="emoji">⚠️</div><h2>Emin misin?</h2><p>Tüm yıldızlar, altınlar ve kostümler silinecek. Bu işlem geri alınamaz.</p><button class="btn purple" data-act="reset">Evet, sıfırla</button><button class="btn primary" data-act="settings">Vazgeç</button>`, 'fail');
    case 'reset': data = Eco.ensure(Save.reset()); Eco.dailyQuests(data, dateKey()); save(); applySettings(); stage.setSkin(SKINS[0]); closeModal(); toast('İlerleme sıfırlandı.'); stage.board = null; return show('menu');
  }
});
for (const el of $$('.energy-chip')) el.addEventListener('click', () => { audioUnlock(); energyModal(); });

/** Oyun ortasında çıkış/yeniden başlama: uyar, onaylanırsa 1 enerji düşer */
function midGame() {
  const s = game.state;
  return screen === 'game' && s && s.status === 'play' && s.moves > 0 && game.level && !game.level.daily;
}
function guardLeave(to) {
  if (!midGame()) return false;
  const free = data.settings.infiniteEnergy || Eco.isPro(data);
  const again = to === 'restart';
  openModal(`
    <div class="emoji">⚠️</div>
    <h2>${again ? 'Baştan başlansın mı?' : 'Bölümden çıkılsın mı?'}</h2>
    <p>Bölüm yarıda kalacak${free ? '.' : ' ve <b>1 enerji</b> düşecek.'}</p>
    ${free ? '' : `<div class="energy-pill">${BOLT()} Şu an ${data.energy} enerjin var</div>`}
    <button class="btn primary" data-act="stay">Oyuna devam et</button>
    <button class="btn purple" data-act="leave" data-to="${to}">${again ? 'Baştan başla' : 'Çık'}${free ? '' : ' (−1 enerji)'}</button>`, 'fail');
  return true;
}
function leaveNow(to) {
  closeModal();
  Eco.spendEnergy(data); save(); renderRes();
  game.state.status = 'quit';
  stage.board = null;
  if (to === 'restart') return startLevel(game.level.id);
  if (to === 'menu') return show('menu');
  currentWorld = game.level.world; return show('map');
}

function back() {
  if (!$('intro').classList.contains('hidden')) return endIntro();
  if (modalOpen()) {
    if (screen === 'game' && game.state && game.state.status !== 'play') { settleLoss(); stage.board = null; return show(game.level.daily ? 'menu' : 'map'); }
    return closeModal();
  }
  if (screen === 'game') { if (guardLeave('map')) return; settleLoss(); stage.board = null; if (game.level.daily) return show('menu'); currentWorld = game.level.world; return show('map'); }
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

initAds();
initPurchases().then(() => { proDaily(); renderMenu(); });
Cloud.init(() => data);
show('menu');
openingAnim();
if (document.fonts) document.fonts.ready.then(() => { if (screen === 'game') layoutGame(); if (screen === 'menu') layoutMenu(); });
