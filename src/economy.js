// Altın, enerji, günlük görevler, başarımlar ve istatistikler (tamamen cihazda, çevrimdışı)
export const ENERGY_MAX = 5;
export const ENERGY_MS = 20 * 60 * 1000;      // 20 dakikada 1 enerji
export const REFILL_COST = 200;
export const HINT_COST = 100;
export const SKIN_PRICES = { klasik: 0, altin: 500, korsan: 1000, ninja: 1500, buz: 2500, lav: 4000, neon: 6000, kral: 9000 };
export const WORLD_STARS = (w) => (w - 1) * 25;   // dünya w'nin yıldız eşiği

export function ensure(d) {
  d.coins ??= 0;
  d.energy ??= ENERGY_MAX;
  d.energyAt ??= Date.now();
  d.owned ??= ['klasik'];
  d.stats ??= {};
  d.ach ??= {};
  d.quests ??= null;
  return d;
}

// ---------------- Enerji ----------------
/** Zamanla dolan enerjiyi hesaplar ve günceller. */
export function tickEnergy(d, now = Date.now()) {
  ensure(d);
  if (d.energy >= ENERGY_MAX) { d.energyAt = now; return d.energy; }
  const gained = Math.floor((now - d.energyAt) / ENERGY_MS);
  if (gained > 0) {
    d.energy = Math.min(ENERGY_MAX, d.energy + gained);
    d.energyAt = d.energy >= ENERGY_MAX ? now : d.energyAt + gained * ENERGY_MS;
  }
  return d.energy;
}
export function nextEnergyIn(d, now = Date.now()) {
  tickEnergy(d, now);
  if (d.energy >= ENERGY_MAX) return 0;
  return ENERGY_MS - (now - d.energyAt);
}
export function fullEnergyIn(d, now = Date.now()) {
  const n = nextEnergyIn(d, now);
  return n ? n + (ENERGY_MAX - d.energy - 1) * ENERGY_MS : 0;
}
export function spendEnergy(d, now = Date.now()) {
  tickEnergy(d, now);
  if (d.settings && d.settings.infiniteEnergy) return true;
  if (d.energy <= 0) return false;
  if (d.energy >= ENERGY_MAX) d.energyAt = now;
  d.energy--;
  return true;
}
export function addEnergy(d, n) { tickEnergy(d); d.energy = Math.min(ENERGY_MAX + 5, d.energy + n); }
export const hasEnergy = (d) => !!(d.settings && d.settings.infiniteEnergy) || tickEnergy(d) > 0;
export function fmtTime(ms) {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
}

// ---------------- Altın ----------------
/** Bölüm ödülü: ilk bitirişte tam, tekrarlarda az. Boss +50. */
export function winCoins({ stars, firstTime, boss }) {
  let c = firstTime ? 10 + stars * 5 : 5;
  if (boss && firstTime) c += 50;
  return c;
}

// ---------------- İstatistik ----------------
export function stat(d, k, n = 1) { ensure(d); d.stats[k] = (d.stats[k] || 0) + n; questProgress(d, k, n); }

// ---------------- Günlük görevler ----------------
const QUEST_POOL = [
  { k: 'wins', min: 2, max: 4, t: (n) => `${n} bölüm bitir`, ic: '🏁', r: { coins: 100 } },
  { k: 'stars3', min: 1, max: 3, t: (n) => `${n} bölümü 3 yıldızla bitir`, ic: '⭐', r: { hints: 1 } },
  { k: 'bosses', min: 1, max: 1, t: () => '1 boss yen', ic: '👹', r: { energy: 2 } },
  { k: 'keys', min: 4, max: 10, t: (n) => `${n} anahtar topla`, ic: '🔑', r: { coins: 80 } },
  { k: 'collapsed', min: 40, max: 120, step: 10, t: (n) => `${n} kare çökert`, ic: '🧱', r: { coins: 120 } },
  { k: 'enemyFalls', min: 1, max: 3, t: (n) => `${n} düşmanı boşluğa düşür`, ic: '🤖', r: { coins: 150 } },
  { k: 'daily', min: 1, max: 1, t: () => 'Günlük bulmacayı çöz', ic: '🧩', r: { energy: 1 } },
];
export const QUEST_BONUS = 250;

function seeded(str) { let s = 0; for (const c of str) s = (s * 31 + c.charCodeAt(0)) | 0; return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function dailyQuests(d, dayKey) {
  ensure(d);
  if (d.quests && d.quests.day === dayKey) return d.quests;
  const r = seeded('q' + dayKey);
  const pool = QUEST_POOL.slice().sort(() => r() - 0.5).slice(0, 3);
  d.quests = {
    day: dayKey, bonus: false,
    list: pool.map((q) => { const st = q.step || 1; const n = q.min + Math.floor(r() * ((q.max - q.min) / st + 1)) * st; return { k: q.k, n, have: 0, done: false, claimed: false, text: q.t(n), ic: q.ic, r: q.r }; }),
  };
  return d.quests;
}
function questProgress(d, k, n) {
  const q = d.quests; if (!q) return;
  for (const x of q.list) if (x.k === k && !x.done) { x.have = Math.min(x.n, x.have + n); x.done = x.have >= x.n; }
}
export const questsReady = (d) => (d.quests ? d.quests.list.filter((x) => x.done && !x.claimed).length + (allQuestsClaimed(d) && !d.quests.bonus ? 1 : 0) : 0);
export const allQuestsClaimed = (d) => !!d.quests && d.quests.list.every((x) => x.claimed);
export function claimQuest(d, i) {
  const x = d.quests && d.quests.list[i];
  if (!x || !x.done || x.claimed) return null;
  x.claimed = true; giveReward(d, x.r);
  return x.r;
}
export function claimBonus(d) {
  if (!allQuestsClaimed(d) || d.quests.bonus) return false;
  d.quests.bonus = true; d.coins += QUEST_BONUS; return true;
}
export function giveReward(d, r) {
  if (r.coins) d.coins += r.coins;
  if (r.hints) d.hints += r.hints;
  if (r.energy) addEnergy(d, r.energy);
}
export const rewardText = (r) => [r.coins && `🪙 ${r.coins}`, r.hints && `💡 +${r.hints}`, r.energy && `⚡ +${r.energy}`].filter(Boolean).join(' ');

// ---------------- Başarımlar ----------------
const bossesDone = (d) => Object.keys(d.stars || {}).filter((id) => +id % 20 === 0).length;
export const ACHIEVEMENTS = [
  { id: 'ilk', ic: '🚀', name: 'İlk Adım', desc: 'İlk bölümü bitir', goal: 1, val: (d) => d.stats.wins || 0, coins: 50 },
  { id: 'boss1', ic: '👹', name: 'Boss Avcısı', desc: 'İlk boss\'u yen', goal: 1, val: (d) => bossesDone(d), coins: 150 },
  { id: 'boss5', ic: '👑', name: 'Boss Kralı', desc: '5 farklı boss yen', goal: 5, val: (d) => bossesDone(d), coins: 500 },
  { id: 'kusursuz', ic: '💎', name: 'Kusursuz', desc: '10 bölümü 3 yıldızla bitir', goal: 10, val: (d) => Object.values(d.stars || {}).filter((x) => x === 3).length, coins: 200 },
  { id: 'yildiz100', ic: '⭐', name: 'Yıldız Toplayıcı', desc: '100 yıldız topla', goal: 100, val: (d) => d.totalStars || 0, coins: 300 },
  { id: 'yildiz300', ic: '🌟', name: 'Yıldız Ustası', desc: '300 yıldız topla', goal: 300, val: (d) => d.totalStars || 0, coins: 1000 },
  { id: 'dusur', ic: '🤖', name: 'Tuzak Ustası', desc: '10 düşmanı boşluğa düşür', goal: 10, val: (d) => d.stats.enemyFalls || 0, coins: 300 },
  { id: 'anahtar', ic: '🔑', name: 'Anahtarcı', desc: '100 anahtar topla', goal: 100, val: (d) => d.stats.keys || 0, coins: 300 },
  { id: 'cokert', ic: '🧱', name: 'Yıkım Ekibi', desc: '1000 kare çökert', goal: 1000, val: (d) => d.stats.collapsed || 0, coins: 400 },
  { id: 'seri7', ic: '🔥', name: 'Sadık Kaptan', desc: '7 gün üst üste günlük bulmaca', goal: 7, val: (d) => (d.daily && d.daily.best) || 0, coins: 500 },
  { id: 'kostum4', ic: '🎩', name: 'Koleksiyoncu', desc: '4 kostüme sahip ol', goal: 4, val: (d) => (d.owned || []).length, coins: 400 },
  { id: 'hepsi', ic: '🏆', name: 'Efsane Kaptan', desc: '200 bölümün hepsini bitir', goal: 200, val: (d) => Object.keys(d.stars || {}).length, coins: 3000 },
];
export function achState(d) {
  ensure(d);
  return ACHIEVEMENTS.map((a) => { const v = Math.min(a.goal, a.val(d)); return { ...a, v, done: v >= a.goal, claimed: !!d.ach[a.id] }; });
}
export const achReady = (d) => achState(d).filter((a) => a.done && !a.claimed).length;
export function claimAch(d, id) {
  const a = achState(d).find((x) => x.id === id);
  if (!a || !a.done || a.claimed) return 0;
  d.ach[id] = true; d.coins += a.coins; return a.coins;
}
