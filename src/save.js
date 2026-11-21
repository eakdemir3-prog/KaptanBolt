// İlerleme kaydı (cihazda, localStorage)
const KEY = 'kaptanbolt.save.v1';
const DEFAULT = () => ({
  stars: {},          // { bölümNo: 1..3 }
  best: {},           // { bölümNo: en az hamle }
  last: 1,            // kalınan bölüm
  hints: 5,
  settings: { sound: true, music: true, vibration: true, quality: 'high', unlockAll: false, infiniteEnergy: false },
  seenTutorial: {},
});

let store = (typeof localStorage !== 'undefined') ? localStorage : null;
export function _setStorage(s) { store = s; } // testler için

// TEST SÜRÜMÜ: true iken bütün bölümler açık ve enerji sınırsız (kapalı test öncesi son kontrol için).
// Play'e yüklenecek AAB'den önce false yapılmalı.
export const TEST_BUILD = true;
const TEST = { unlockAll: TEST_BUILD, infiniteEnergy: TEST_BUILD };
export function load() {
  try {
    const raw = store && store.getItem(KEY);
    if (!raw) { const d0 = DEFAULT(); Object.assign(d0.settings, TEST); return d0; }
    const d = JSON.parse(raw);
    const def = DEFAULT();
    // Yayın sürümü: test ayarları her açılışta kapalı (eski test kayıtları dahil)
    return { ...def, ...d, settings: { ...def.settings, ...(d.settings || {}), ...TEST } };
  } catch { return DEFAULT(); }
}
export function save(data) { try { store && store.setItem(KEY, JSON.stringify(data)); } catch { /* yer yok */ } }
export function reset() { const d = DEFAULT(); save(d); return d; }

export const isDone = (d, id) => (d.stars[id] || 0) > 0;
// unlockAll / infiniteEnergy yalnızca otomatik testlerde kullanılır; uygulamada her zaman kapalıdır
export const WORLD_SIZE = 35;
export const worldOf = (id) => Math.ceil(id / WORLD_SIZE);
/** Dünya açık mı: önceki dünyanın boss'u yenildiyse veya yeterli yıldız varsa */
export function worldUnlocked(d, w) {
  if (w === 1 || d.settings.unlockAll) return true;
  return isDone(d, (w - 1) * WORLD_SIZE) || totalStars(d) >= (w - 1) * 45;
}
export const isUnlocked = (d, id) => {
  if (id === 1 || d.settings.unlockAll) return true;
  const w = worldOf(id);
  if (!worldUnlocked(d, w)) return false;
  return id === (w - 1) * WORLD_SIZE + 1 || isDone(d, id - 1);
};
export const totalStars = (d) => Object.values(d.stars).reduce((a, b) => a + b, 0);

/** Bölüm sonucu kaydet. noBest: güç kullanıldıysa en iyi hamle sayısı güncellenmez. */
export function recordWin(d, id, stars, moves, maxId, noBest = false) {
  const prev = d.stars[id] || 0;
  d.stars[id] = Math.max(prev, stars);
  if (!noBest) d.best[id] = Math.min(d.best[id] ?? Infinity, moves);
  d.last = Math.min(maxId, id + 1);
  save(d);
  return { prev, newBest: stars > prev };
}

/** Devam Et: ilk tamamlanmamış açık bölüm */
export function continueLevel(d, maxId) {
  for (let i = 1; i <= maxId; i++) if (!isDone(d, i) && isUnlocked(d, i)) return i;
  return Math.min(d.last, maxId);
}
