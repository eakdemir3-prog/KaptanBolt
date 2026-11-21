// Final bölümü (351 "Son Hamle"): 5 katlı dev bölüm. Her kat ayrı üretilip çözücüyle doğrulanır,
// sonra katlar asansörlerle birleştirilir ve bütün bölüm baştan sona tekrar oynatılarak kontrol edilir.
// Kullanım: node tools/final.mjs   (levels.json'a 351. bölümü ekler/günceller)
import fs from 'node:fs';
import { buildArea, buildBoss, setSeed, dist } from './generate.mjs';
import { parseLevel, newState, move, collapsedCount } from '../src/logic/rules.js';
import { shortest, bestCover } from '../src/logic/solver.js';

const W = 7, H = 8;
const PAIR = ['L', 'M', 'Q', 'W'];
// kat: tema (dünya), ad, mekanikler
const FLOORS = [
  { theme: 1, name: 'TAŞ ZİNDAN', o: { ice: 0.1, boxes: 1, keys: 2 } },
  { theme: 7, name: 'FABRİKA', o: { patrols: 1, sentries: 1, keys: 2 } },
  { theme: 6, name: 'IŞINLANMA LABI', o: { portal: true, gates: true, arrows: 0.08, keys: 2 } },
  { theme: 9, name: 'KARANLIK KAT', o: { chasers: 1, keys: 2 }, dark: true },
  { theme: 10, name: 'KALE ÇATISI', boss: true, o: { keys: 1, every: 2 } },
];
const LIFT_LOCK = 30;

setSeed(35135135);
const rows = (grid) => grid.slice();

function solveFloor(f, sub, isLast) {
  const b = parseLevel(sub), s = newState(b);
  if (isLast) {
    const sh = shortest(s, 1500000, 20000);
    return sh && sh.moves ? { moves: sh.moves, count: null } : null;
  }
  const bc = bestCover(s, 1500000, 12000);
  if (!bc || bc.count < LIFT_LOCK + 2) return null;
  return bc;
}

function buildFloor(f, forceS) {
  const spec = FLOORS[f], isLast = f === FLOORS.length - 1;
  for (let t = 0; t < 4000; t++) {
    let cand;
    if (spec.boss) cand = buildBoss(W, H, { ...spec.o, forceS, tallDoor: true });
    else cand = buildArea(W, H, { area: true, holes: [5, 9], minTiles: 44, ...spec.o, keys: spec.o.keys, forceS, dMin: 4 });
    if (!cand) continue;
    if (cand.timed && cand.timed.length) continue;
    // alt bölüm: tek kat, çıkış = D (bir sonraki kata giden asansör ya da gerçek kapı)
    const sub = { id: 351, grid: cand.grid, enemies: cand.enemies, boss: cand.boss, lock: isLast ? 0 : LIFT_LOCK };
    let sol;
    try { sol = solveFloor(f, sub, isLast); } catch { continue; }
    if (!sol) continue;
    const g = cand.grid.join('');
    const exit = g.indexOf('D'), start = g.indexOf('S');
    if (!isLast && exit < W && false) continue;
    return { cand, sol, exit, start };
  }
  throw new Error('Kat ' + (f + 1) + ' üretilemedi');
}

function assemble(parts) {
  const grid = [], enemies = [];
  let boss = null, y0 = 0;
  parts.forEach((p, f) => {
    let g = p.cand.grid.map((r) => r.split(''));
    const sx = p.start % W, sy = (p.start / W) | 0, dx = p.exit % W, dy = (p.exit / W) | 0;
    if (f > 0) g[sy][sx] = PAIR[f - 1];                 // gelinen asansör
    if (f < parts.length - 1) g[dy][dx] = PAIR[f];      // bir üst kata giden asansör
    grid.push(...g.map((r) => r.join('')));
    for (const e of p.cand.enemies || []) enemies.push({ ...e, at: [e.at[0], e.at[1] + y0] });
    if (p.cand.boss) boss = { ...p.cand.boss, at: [p.cand.boss.at[0], p.cand.boss.at[1] + y0] };
    if (f < parts.length - 1) { grid.push('#'.repeat(W), '#'.repeat(W)); y0 += H + 2; }
  });
  return { grid, enemies, boss };
}

const levels = JSON.parse(fs.readFileSync(new URL('../src/levels/levels.json', import.meta.url), 'utf8')).filter((l) => l.id !== 351);
let lv = null;
for (let attempt = 0; attempt < 40 && !lv; attempt++) {
  const parts = [];
  let forceS = null;
  for (let f = 0; f < FLOORS.length; f++) {
    const p = buildFloor(f, forceS);
    parts.push(p);
    forceS = p.exit; // bir üst katta asansör aynı karede
  }
  const a = assemble(parts);
  const cand = {
    id: 351, world: 10, final: true, grand: true,
    floorH: FLOORS.map(() => H), liftLock: FLOORS.slice(0, -1).map(() => LIFT_LOCK), darkFloors: FLOORS.map((x, i) => (x.dark ? i : -1)).filter((i) => i >= 0),
    floorThemes: FLOORS.map((x) => x.theme), floorNames: FLOORS.map((x) => x.name),
    grid: a.grid, ...(a.enemies.length ? { enemies: a.enemies } : {}), ...(a.boss ? { boss: a.boss } : {}),
  };
  // bütün bölümü baştan sona oyna
  const b = parseLevel(cand), s = newState(b);
  let ok = true;
  for (const p of parts) for (const d of p.sol.moves) { if (!move(s, d)) { ok = false; break; } if (s.status !== 'play') break; }
  if (!ok || s.status !== 'win') { console.log('deneme', attempt + 1, 'tam oynatma başarısız:', s.status); continue; }
  const got = collapsedCount(s);
  if (got < b.tileCount - 1) cand.stars = { mode: 'cover', target: got };
  cand.solution = parts.flatMap((p) => p.sol.moves);
  fs.writeFileSync(new URL('../tests/final-solution.json', import.meta.url), JSON.stringify(cand.solution));
  lv = cand;
  console.log('Final hazır:', b.tileCount, 'kare,', cand.solution.length, 'hamle, 3 yıldız hedefi', got);
}
if (!lv) throw new Error('Final bölümü üretilemedi');
delete lv.solution;
levels.push(lv);
fs.writeFileSync(new URL('../src/levels/levels.json', import.meta.url), '[\n' + levels.map((l) => JSON.stringify(l)).join(',\n') + '\n]\n');
console.log('levels.json:', levels.length, 'bölüm');
