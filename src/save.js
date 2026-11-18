// İlerleme kaydı (cihazda, localStorage)
const KEY = 'kaptanbolt.save.v1';
const DEFAULT = () => ({
  stars: {},          // { bölümNo: 1..3 }
  best: {},           // { bölümNo: en az hamle }
  last: 1,            // kalınan bölüm
  hints: 5,
  settings: { sound: true, music: true, vibration: true, quality: 'high', unlockAll: true },
  seenTutorial: {},
});

let store = (typeof localStorage !== 'undefined') ? localStorage : null;
export function _setStorage(s) { store = s; } // testler için

export function load() {
  try {
    const raw = store && store.getItem(KEY);
    if (!raw) return DEFAULT();
    const d = JSON.parse(raw);
    const def = DEFAULT();
    return { ...def, ...d, settings: { ...def.settings, ...(d.settings || {}) } };
  } catch { return DEFAULT(); }
}
export function save(data) { try { store && store.setItem(KEY, JSON.stringify(data)); } catch { /* yer yok */ } }
export function reset() { const d = DEFAULT(); save(d); return d; }

export const isDone = (d, id) => (d.stars[id] || 0) > 0;
// TEST MODU: unlockAll açıkken tüm bölümler açıktır (Play Store sürümünden önce varsayılanı false yapılacak)
export const isUnlocked = (d, id) => id === 1 || !!d.settings.unlockAll || isDone(d, id - 1);
export const totalStars = (d) => Object.values(d.stars).reduce((a, b) => a + b, 0);

/** Bölüm sonucu kaydet. Yeni kazanılan 3 yıldız için ipucu ödülü verir. */
export function recordWin(d, id, stars, moves, maxId) {
  const prev = d.stars[id] || 0;
  let bonusHint = 0;
  if (stars === 3 && prev < 3) { d.hints += 1; bonusHint = 1; }
  d.stars[id] = Math.max(prev, stars);
  d.best[id] = Math.min(d.best[id] ?? Infinity, moves);
  d.last = Math.min(maxId, id + 1);
  save(d);
  return { bonusHint, newBest: stars > prev };
}

/** Devam Et: ilk tamamlanmamış açık bölüm */
export function continueLevel(d, maxId) {
  for (let i = 1; i <= maxId; i++) if (!isDone(d, i)) return i;
  return Math.min(d.last, maxId);
}
