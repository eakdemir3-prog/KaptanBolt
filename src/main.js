// Kaptan Bolt 2 — Yeşil Vadi (20 bölüm, 2.5D platform)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { loadRobotModel } from './game/robotModel.js';
import { makeRobot, SKINS } from './game/robot.js';
import { buildLevel, updateRafts } from './level.js';
import { LEVELS } from './levels.js';
import { P, stepPlayer, moveX, newPlayer } from './physics.js';
import { buildWorld, backdrop, seed, makeCoin, makeSpring, makePost, setPost, makeBeam, makeSprite, ASPECT, makeBridge, makeRaft, makeThorns } from './world.js';
import { sfx, unlockAudio } from './audio.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeWalker } from './rigwalk.js';

const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7cc8ff);
scene.fog = new THREE.Fog(0xbfe6ff, 30, 95);
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xe6f6ff, 0x7a8a4a, 1.9)); // güçlü ortam ışığı: gölgeler yumuşak
const sun = new THREE.DirectionalLight(0xfff1d6, 2.1);
sun.position.set(6, 18, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -8, near: 1, far: 60 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
scene.add(sun, sun.target);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < 1.6 ? 42 : 36; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

// ---------- Modeller ----------
const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
const MODELS = {};
const SPEC = {
  bocek: { size: 1.25, fit: 'w', yaw: Math.PI / 2 },
  kirpi: { size: 1.3, fit: 'w', yaw: Math.PI / 2 },
  kus: { size: 0.85, fit: 'h', yaw: 0.35 },
  tilki: { size: 0.9, fit: 'h', yaw: 0.35 + Math.PI / 4 },
  maymun: { size: 0.95, fit: 'h', yaw: 0.35 },
  cage: { size: 2.2, fit: 'w', yaw: 0 },
  ship: { size: 4.6, fit: 'w', yaw: -0.25 },
};
function loadModel(n) {
  return new Promise((ok) => gl.load(`models/${n}.glb`, (g) => {
    const sp = SPEC[n], m = g.scene, wrap = new THREE.Group();
    m.rotation.y = sp.yaw; wrap.add(m); wrap.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(wrap), sz = b.getSize(new THREE.Vector3());
    const s = sp.size / (sp.fit === 'h' ? sz.y : Math.max(sz.x, sz.z));
    wrap.scale.setScalar(s); const c = b.getCenter(new THREE.Vector3());
    wrap.position.set(-c.x * s, -b.min.y * s, -c.z * s);
    m.traverse((o) => { if (o.isMesh) { o.geometry.userData.shared = true; o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.roughness = Math.max(0.45, o.material.roughness ?? 0.6); } });
    const holder = new THREE.Group(); holder.add(wrap); MODELS[n] = holder; ok();
  }, undefined, () => ok()));
}
const cloneM = (n) => (MODELS[n] ? (n === 'bocek' || n === 'kirpi' ? skClone(MODELS[n]) : MODELS[n].clone(true)) : new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff00ff })));

// ---------- Kayıt ----------
const SAVE_KEY = 'kb2.save';
let save = { unlocked: 1, best: {} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.best) save = s; } catch { /* yok */ }
if (/unlock/.test(location.hash)) save.unlocked = 20;
const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* yok */ } };

// ---------- Oyun durumu ----------
const G = { t: 0, state: 'load', n: 1, coins: 0, coinsTotal: 0, cages: 0, hearts: 3, cp: null, inv: 0, star: false, won: false, end: 0 };
let L = null, player = null, levelRoot = null;
const ents = { coins: [], enemies: [], cages: [], springs: [], posts: [], parts: [], crates: [], hearts: [], rafts: [], signs: [], star: null, end: null, boss: null, ship: null, flying: [] };
const input = { left: false, right: false, jump: false, jumpPressed: false };
const BOLT_S = 1.12 * 1.2;
let bolt, anim;

function clearLevel() {
  if (levelRoot) { scene.remove(levelRoot); levelRoot.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose?.(); }); }
  for (const k of Object.keys(ents)) ents[k] = Array.isArray(ents[k]) ? [] : null;
  levelRoot = new THREE.Group(); scene.add(levelRoot);
}
const add = (o) => { levelRoot.add(o); return o; };

function loadLevel(n) {
  clearLevel(); seed(n);
  G.n = n; L = buildLevel(n);
  buildWorld(levelRoot, L);
  for (const c of L.coins) { const m = add(makeCoin()); m.position.set(c.x, c.y, 0); ents.coins.push({ ...c, m, taken: false, ph: Math.random() * 6 }); }
  G.coinsTotal = L.coins.length + L.crates.size * 3;
  for (const e of L.enemies) {
    const holder = add(new THREE.Group()); const em = cloneM(e.type); holder.add(em);
    ents.enemies.push({ walker: makeWalker(em, e.type), type: e.type, x: e.x, y: e.t, vx: e.type === 'kirpi' ? -1.0 : -1.4, w: e.type === 'kirpi' ? 1.1 : 1.05, h: e.type === 'kirpi' ? 0.95 : 0.8, m: holder, alive: true, squash: 0, ph: Math.random() * 6 });
  }
  for (const c of L.cages) {
    const g = add(new THREE.Group()); const cm = cloneM('cage'); g.add(cm); g.position.set(c.x, c.y - 0.05, 0);
    const a = cloneM(c.animal); a.position.set(0, 0.3, 0); a.scale.multiplyScalar(0.95); g.add(a);
    ents.cages.push({ x: c.x, y: c.y, kind: c.animal, m: g, cage: cm, animal: a, open: false, t: 0 });
  }
  for (const s of L.springs) { const m = add(makeSpring()); m.position.set(s.x, s.y - 0.05, 0); ents.springs.push({ ...s, m, t: 1 }); }
  for (const c of L.checkpoints) { const m = add(makePost(false)); m.position.set(c.x, c.y, 0); ents.posts.push({ ...c, m, on: false }); }
  for (const c of L.crates.values()) { const m = add(makeSprite('crate', 1.02, ASPECT.crate)); m.position.set(c.x + 0.5, c.y - 0.01, 0.35); ents.crates.push({ ...c, m, broken: false }); }
  for (const h of L.hearts) { const m = add(makeSprite('heart', 0.62, ASPECT.heart)); m.geometry = m.geometry.clone(); m.geometry.translate(0, -0.31, 0); m.position.set(h.x, h.y, 0.2); ents.hearts.push({ ...h, m, taken: false }); }
  if (L.star) { const m = add(makeSprite('star', 0.8, ASPECT.star)); m.geometry = m.geometry.clone(); m.geometry.translate(0, -0.4, 0); m.position.set(L.star.x, L.star.y, 0.2); ents.star = { ...L.star, m, taken: false }; }
  for (const s of L.bridges) add(makeBridge(s.x0, s.x1, s.y));
  for (const t of L.thorns) { const m = add(makeThorns(t.x1 - t.x0)); m.position.set(t.x0, t.y, 0); }
  for (const r of L.rafts) { const m = add(makeRaft(r.w)); ents.rafts.push({ r, m }); }
  for (const s of L.signs) { const m = add(makeSprite('sign', 1.3, ASPECT.sign)); m.position.set(s.x, s.y - 0.05, -0.7); ents.signs.push({ ...s, m, shown: false }); }
  for (const d of L.decos) { const m = add(makeSprite(d.kind, 1, ASPECT[d.kind])); m.position.set(d.x, d.y - 0.04, d.z); }
  if (L.end && !L.boss) { const m = add(makePost(true)); m.position.set(L.end.x, L.end.y, 0); ents.end = { ...L.end, m, beam: add(makeBeam()) }; ents.end.beam.position.set(L.end.x, L.end.y, 0); }
  if (L.boss) setupBoss();

  if (!bolt) {
    bolt = makeRobot(SKINS[1]); bolt.scale.setScalar(BOLT_S);
    bolt.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    if (bolt.userData.fill) bolt.userData.fill.intensity = 0.8;
    anim = bolt.userData.anim;
  }
  scene.add(bolt); bolt.visible = true; bolt.scale.setScalar(BOLT_S); bolt.position.set(0, 0, 0);
  player = newPlayer(L.start.x, L.cols[2] || 2); player.ground = true; player.lastAnim = '';
  Object.assign(G, { coins: 0, cages: 0, hearts: 3, inv: 0, star: false, won: false, cp: { x: player.x, y: player.y }, state: 'play', end: 0 });
  Object.assign(input, { left: false, right: false, jump: false, jumpPressed: false });
  camSnap = true; updateCamera(0);
  updateHud(); showScreen(null);
  toast(`1-${n} • ${L.name}`);
}

// ---------- Oyuncu ----------
function playAnim(name, opts) { if (player.lastAnim === name) return; player.lastAnim = name; anim.play(name, opts); }
function hurt(fromX) {
  if (G.inv > 0 || G.state !== 'play') return;
  G.hearts--; G.inv = 1.6; sfx.hurt(); vibrate(60);
  player.vx = (player.x < fromX ? -1 : 1) * 6; player.vy = 9; player.ground = false; player.surf = null; player.noCut = true;
  updateHud();
  if (G.hearts <= 0) lose();
}
function fallDeath() {
  if (G.state !== 'play') return;
  G.hearts--; sfx.hurt(); vibrate(80); updateHud();
  if (G.hearts <= 0) return lose();
  player.x = G.cp.x; player.y = G.cp.y + 0.2; player.vx = player.vy = 0; G.inv = 1.4; camSnap = true;
}
const dustGeo = new THREE.SphereGeometry(0.12, 8, 6); dustGeo.userData.shared = true; const _d0 = 0, dustMat = new THREE.MeshBasicMaterial({ color: 0xf3ead2, transparent: true, opacity: 0.8 });
function dust(x, y, n) { for (let i = 0; i < n; i++) { const m = add(new THREE.Mesh(dustGeo, dustMat)); m.position.set(x + (Math.random() - 0.5) * 0.5, y + 0.08, 0.4 + Math.random() * 0.3); ents.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3.5, 0.6 + Math.random() * 1.2, 0), t: 0, dust: true }); } }

function updatePlayer(dt) {
  const p = player, ev = [];
  stepPlayer(L, p, input, dt, ev);
  for (const e of ev) {
    if (e === 'jump') { sfx.jump(); dust(p.x, p.y, 4); p.squash = -0.16; }
    else if (e === 'landHard') { sfx.land(); dust(p.x, p.y, 6); p.squash = Math.min(0.25, -p.landVy / 70); }
    else if (e === 'land') { p.squash = 0.08; }
    else if (e.bump) { sfx.bump(); hitCrate(e.bump.x, e.bump.y, false); }
    else if (e.landOn && L.crates.has(`${e.landOn.x},${e.landOn.y}`)) { hitCrate(e.landOn.x, e.landOn.y, true); p.vy = input.jump ? P.STOMP_HOLD : P.STOMP; p.ground = false; p.surf = null; p.noCut = true; }
  }
  if (p.y < -4) fallDeath();
  // dikenler
  for (const t of L.thorns) if (p.x + P.PW / 2 > t.x0 + 0.15 && p.x - P.PW / 2 < t.x1 - 0.15 && p.y < t.y + 0.55 && p.y + P.PH > t.y) hurt(p.x - p.face);
  // görünüm
  p.squash = (p.squash || 0) * Math.max(0, 1 - dt * 12);
  const sq = p.squash;
  bolt.position.set(p.x, p.y, 0); bolt.scale.set(BOLT_S * (1 + sq * 0.6), BOLT_S * (1 - sq), BOLT_S * (1 + sq * 0.6));
  const targetRot = p.face > 0 ? Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.35;
  bolt.rotation.y += (targetRot - bolt.rotation.y) * Math.min(1, dt * 14);
  const sp = Math.abs(p.vx);
  if (!p.ground) { playAnim('jump', { once: true, fade: 0.1, speed: 1.5 }); anim.hold('jump', 0.5); }
  else if (sp > P.RUN * 0.6) { playAnim('run', { fade: 0.12 }); anim.play('run', { speed: 0.75 + sp / P.RUN * 0.35 }); }
  else if (sp > 0.4) { playAnim('walk', { fade: 0.15 }); anim.play('walk', { speed: 0.9 + sp / P.RUN * 1.2 }); }
  else playAnim('idle', { fade: 0.25 });
  bolt.visible = G.inv <= 0 || Math.floor(G.t * 16) % 2 === 0;
}

// ---------- Sandık ----------
function hitCrate(x, y, fromTop) {
  const c = ents.crates.find((q) => !q.broken && q.x === x && q.y === y); if (!c) return;
  c.broken = true; L.crates.delete(`${x},${y}`);
  c.m.visible = false; sfx.stomp(); vibrate(25);
  burst(x + 0.5, y + 0.5, 0x9a5a2a, 12); burst(x + 0.5, y + 0.5, 0xd8b070, 8);
  for (let i = 0; i < 3; i++) { // 3 altın fışkırır ve sayaca uçar
    const m = add(makeCoin()); m.position.set(x + 0.5, y + 0.6, 0.4);
    ents.flying.push({ m, v: new THREE.Vector3((i - 1) * 2.2, 7 + Math.random() * 2, 0), t: -i * 0.06 });
  }
  if (fromTop) player.noCut = true;
}

// ---------- Düşmanlar ----------
const groundUnder = (x, y) => L.solid(Math.floor(x), Math.floor(y - 0.5)) || L.oneway.some((s) => x >= s.x0 && x <= s.x1 && Math.abs(s.y - y) < 0.05);
function updateEnemies(dt) {
  for (const e of ents.enemies) {
    if (!e.alive) { e.squash += dt; e.m.scale.y = Math.max(0.05, 1 - e.squash * 6); e.m.position.y -= dt * (e.squash > 0.3 ? 4 : 0); if (e.squash > 1) e.m.visible = false; continue; }
    const nx = e.x + e.vx * dt, front = nx + Math.sign(e.vx) * e.w / 2;
    let moving = 0;
    if (e.wait > 0) { e.wait -= dt; if (e.wait <= 0) e.vx = -e.vx; } // kenarda kısa durup döner
    else if (L.solid(Math.floor(front), Math.floor(e.y + 0.3)) || !groundUnder(front, e.y)) e.wait = 0.35;
    else { e.x = nx; moving = e.vx; }
    e.m.position.set(e.x, e.y, 0);
    if (!(e.wait > 0)) e.m.rotation.y += ((e.vx > 0 ? 0 : Math.PI) - e.m.rotation.y) * Math.min(1, dt * 10);
    if (e.walker) e.walker.update(dt, moving, G.t);
    const p = player;
    if (G.state !== 'play' || Math.abs(p.x - e.x) > (P.PW + e.w) / 2 - 0.08 || p.y > e.y + e.h || p.y + P.PH < e.y + 0.1) continue;
    const stomp = p.vy < -1 && p.y > e.y + e.h * 0.45;
    if (stomp && e.type === 'bocek') { e.alive = false; p.vy = input.jump ? P.STOMP_HOLD : P.STOMP; p.noCut = true; sfx.stomp(); vibrate(30); burst(e.x, e.y + 0.5, 0xffa040, 10); }
    else hurt(e.x);
  }
}

// ---------- Boss: Dev Paslı Böcek ----------
function setupBoss() {
  const B = L.boss;
  const m = add(new THREE.Group()); const body = cloneM('bocek'); body.scale.setScalar(3.0); m.add(body); const walker = makeWalker(body, 'bocek');
  body.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color?.multiplyScalar(0.9); o.material.emissive = new THREE.Color(0x000000); } });
  const stars = add(new THREE.Group()); for (let i = 0; i < 4; i++) { const s = makeSprite('star', 0.4, ASPECT.star); s.position.set(Math.cos(i * 1.57) * 0.8, 0, Math.sin(i * 1.57) * 0.8); stars.add(s); } stars.visible = false;
  const walls = [B.x0 - 1, B.x1];
  const wallM = walls.map((wx) => { const g = add(new THREE.Group()); for (let i = 0; i < 6; i++) { const c = makeSprite('crate', 1.02, ASPECT.crate); c.position.set(0.5, i, 0.3); g.add(c); } g.position.set(wx, -8, 0); return g; });
  ents.boss = { ...B, m, body, walker, stars, x: B.x1 - 4, y: B.y, vx: 0, dir: -1, hp: 3, st: 'wait', t: 0, w: 3.4, h: 1.9, wallX: walls, wallM, wallsUp: false, flash: 0, dead: false };
  const base = L.solid;
  L.solid = (x, y) => (ents.boss && ents.boss.wallsUp && ents.boss.wallX.includes(x) && y < 14) || base(x, y);
}
function updateBoss(dt) {
  const b = ents.boss; if (!b) return;
  b.t += dt; const p = player;
  for (const [i, g] of b.wallM.entries()) g.position.y += ((b.wallsUp ? b.y : b.y - 8) - g.position.y) * Math.min(1, dt * 6) + (i ? 0 : 0);
  if (b.dead) {
    b.m.rotation.z += dt * 3; b.m.position.y += dt * (3 - b.t * 6); b.m.scale.setScalar(Math.max(0.01, 1 - b.t * 0.6));
    if (b.t > 1.6 && b.m.visible) { b.m.visible = false; landShip(); }
    return;
  }
  if (b.st === 'wait') { if (p.x > b.x0 + 2) { b.wallsUp = true; b.st = 'roar'; b.t = 0; sfx.bump(); toast('⚠️ Dev Paslı Böcek! Duvara çarpınca sersemler, üstüne zıpla!'); } }
  else if (b.st === 'roar') { b.m.position.y = b.y + Math.abs(Math.sin(b.t * 20)) * 0.15; if (b.t > 1.2) { b.st = 'walk'; b.t = 0; } }
  else if (b.st === 'walk') {
    b.dir = p.x < b.x ? -1 : 1; b.vx = b.dir * (1.6 + (3 - b.hp) * 0.5);
    if (b.t > 2.2 - (3 - b.hp) * 0.4) { b.st = 'prep'; b.t = 0; }
  } else if (b.st === 'prep') { b.vx = 0; b.m.position.x = b.x + Math.sin(b.t * 60) * 0.06; if (b.t > 0.65) { b.st = 'charge'; b.t = 0; b.vx = b.dir * (8 + (3 - b.hp)); sfx.spring(); } }
  else if (b.st === 'charge') {
    const front = b.x + b.dir * b.w / 2;
    if ((b.dir < 0 && front <= b.x0 + 0.05) || (b.dir > 0 && front >= b.x1 - 0.05)) { b.st = 'stun'; b.t = 0; b.vx = 0; sfx.stomp(); vibrate(60); burst(front, b.y + 1, 0xd8b070, 16); shake = 0.4; }
  } else if (b.st === 'stun') { b.stars.visible = true; b.stars.rotation.y += dt * 6; if (b.t > 2.6) { b.st = 'walk'; b.t = 0; b.stars.visible = false; } }
  else if (b.st === 'hit') { b.vx = 0; if (b.t > 0.8) { b.st = 'walk'; b.t = 0; } }
  b.x = Math.max(b.x0 + b.w / 2, Math.min(b.x1 - b.w / 2, b.x + b.vx * dt));
  if (b.st !== 'prep') b.m.position.x = b.x;
  b.m.position.set(b.m.position.x, b.st === 'roar' ? b.m.position.y : b.y, 0);
  b.m.rotation.y = b.dir > 0 ? 0 : Math.PI; b.m.rotation.z = b.st === 'stun' ? Math.sin(b.t * 8) * 0.06 : 0;
  b.stars.position.set(b.x, b.y + b.h + 0.4, 0);
  if (b.walker) b.walker.update(dt, b.st === 'stun' ? 0 : b.st === 'prep' ? 3 : b.vx * 0.6, G.t);
  b.flash = Math.max(0, b.flash - dt); b.body.visible = b.flash <= 0 || Math.floor(b.flash * 20) % 2 === 0;
  // temas
  if (G.state !== 'play' || b.st === 'wait') return;
  if (Math.abs(p.x - b.x) < (P.PW + b.w) / 2 - 0.1 && p.y < b.y + b.h && p.y + P.PH > b.y + 0.1) {
    const top = p.vy < -1 && p.y > b.y + b.h * 0.55;
    if (top && b.st === 'stun') {
      b.hp--; b.flash = 0.8; b.st = 'hit'; b.t = 0; b.stars.visible = false; p.vy = P.STOMP_HOLD; p.noCut = true; p.vx = (p.x < b.x ? -1 : 1) * 5;
      sfx.stomp(); vibrate(70); burst(b.x, b.y + b.h, 0xffa040, 18); updateHud();
      if (b.hp <= 0) { b.dead = true; b.t = 0; b.wallsUp = false; sfx.cage(); toast('💥 Dev Paslı Böcek yenildi!'); shake = 0.6; }
      else toast(`💥 Kalan: ${'❤'.repeat(b.hp)}`);
    } else if (top) { p.vy = P.STOMP; p.noCut = true; hurt(b.x); }
    else hurt(b.x);
  }
}
// gemi iner (20. bölüm sonu)
function landShip() {
  const s = add(cloneM('ship')); s.position.set(L.end.x, L.end.y + 14, -0.3);
  ents.ship = { m: s, st: 'land', t: 0, x: L.end.x, y: L.end.y };
  toast('🚀 Şimşek gemisi geldi! Gemiye bin!');
}
function updateShip(dt) {
  const s = ents.ship; if (!s) return; s.t += dt;
  if (s.st === 'land') { s.m.position.y += (s.y - s.m.position.y) * Math.min(1, dt * 2.2); s.m.rotation.z = Math.sin(s.t * 3) * 0.05; if (s.t > 2.4) { s.st = 'wait'; dust(s.x - 1.5, s.y, 8); dust(s.x + 1.5, s.y, 8); } }
  else if (s.st === 'wait') { s.m.position.y = s.y + Math.sin(s.t * 2) * 0.03; if (G.state === 'play' && player.x > s.x - 1.2) { s.st = 'board'; s.t = 0; win(); } }
  else if (s.st === 'board') {
    // hayvanlar ve Bolt gemiye koşar, sonra gemi havalanır
    bolt.position.x += (s.x - bolt.position.x) * Math.min(1, dt * 3); bolt.scale.setScalar(Math.max(0.01, BOLT_S * (1 - s.t * 0.7)));
    if (s.t > 1.4) { s.st = 'fly'; s.t = 0; bolt.visible = false; sfx.spring(); }
  } else if (s.st === 'fly') { s.m.position.y += dt * (2 + s.t * 10); s.m.position.x += dt * s.t * 6; s.m.rotation.z = -Math.min(0.5, s.t * 0.4); if (s.t < 1.5) dust(s.x + (Math.random() - 0.5) * 3, s.y, 1); }
}

// ---------- Para, kafes, mantar, direkler, can, yıldız ----------
const SIGN_TIP = { move: '◀ ▶ tuşlarıyla yürü', jump: 'Sarı tuş: zıpla! Basılı tutarsan daha yükseğe', stomp: 'Böceklerin üstüne zıpla, ez!', spike: 'Kirpinin üstüne zıplama, üstünden atla!', spring: 'Mantara bas, yükseğe fırla!', thorn: 'Dikenli çalılara değme!', bridge: 'İp köprüler sağlam, rahat geç', crate: 'Sandığın üstüne zıpla ya da alttan kafa at: altın çıkar!', raft: 'Sal gidip gelir: üstüne atla, taşısın' };
function updateItems(dt) {
  const p = player;
  for (const c of ents.coins) {
    if (c.taken) { if (c.m.visible) { c.k += dt; c.m.position.y += dt * 5; c.m.scale.setScalar(Math.max(0, 1 - c.k * 3)); if (c.k > 0.35) c.m.visible = false; } continue; }
    c.m.userData.face.scale.x = Math.max(0.1, Math.abs(Math.cos(G.t * 2.6 + c.ph))); c.m.position.y = c.y + Math.sin(G.t * 3 + c.ph) * 0.05;
    if (Math.abs(p.x - c.x) < P.PW / 2 + 0.38 && c.y > p.y - 0.4 && c.y < p.y + P.PH + 0.4) { c.taken = true; c.k = 0; G.coins++; sfx.coin(); updateHud(); }
  }
  for (let i = ents.flying.length - 1; i >= 0; i--) { const f = ents.flying[i]; f.t += dt; if (f.t < 0) continue; f.v.y -= 22 * dt; f.m.position.addScaledVector(f.v, dt); f.m.userData.face.scale.x = Math.abs(Math.cos(f.t * 12)); if (f.t > 0.55) { levelRoot.remove(f.m); ents.flying.splice(i, 1); G.coins++; sfx.coin(); updateHud(); } }
  for (const s of ents.springs) {
    s.t = Math.min(1, s.t + dt * 4);
    const k = 1 - Math.sin(s.t * Math.PI) * 0.35; s.m.userData.spr.scale.set(1 + (1 - k) * 0.5, k, 1);
    if (p.vy <= 0 && Math.abs(p.x - s.x) < 0.75 && p.y >= s.y - 0.05 && p.y < s.y + 0.9) { p.vy = P.SPRING; p.noCut = true; p.ground = false; p.surf = null; s.t = 0; sfx.spring(); vibrate(20); dust(s.x, s.y, 5); }
  }
  for (const h of ents.hearts) {
    if (h.taken) continue; h.m.position.y = h.y + Math.sin(G.t * 3) * 0.08; h.m.scale.setScalar(1 + Math.sin(G.t * 6) * 0.05);
    if (Math.abs(p.x - h.x) < 0.75 && h.y > p.y - 0.4 && h.y < p.y + P.PH + 0.4) { h.taken = true; h.m.visible = false; G.hearts = Math.min(3, G.hearts + 1); sfx.checkpoint(); burst(h.x, h.y, 0xff4a5a, 10); updateHud(); toast('❤ +1 can'); }
  }
  const st = ents.star;
  if (st && !st.taken) {
    st.m.position.y = st.y + Math.sin(G.t * 2.4) * 0.1; st.m.rotation.z = Math.sin(G.t * 1.6) * 0.15;
    if (Math.abs(p.x - st.x) < P.PW / 2 + 0.45 && st.y > p.y - 0.5 && st.y < p.y + P.PH + 0.5) { st.taken = true; G.star = true; st.m.visible = false; sfx.cage(); burst(st.x, st.y, 0x7ad8ff, 22); updateHud(); toast('💎 Kristal yıldız bulundu!'); }
  }
  for (const c of ents.cages) {
    if (!c.open) {
      c.animal.rotation.y = Math.sin(G.t * 2 + c.x) * 0.4; c.animal.position.y = 0.3 + Math.abs(Math.sin(G.t * 4 + c.x)) * 0.05;
      if (Math.abs(p.x - c.x) < 1.0 && p.y > c.y - 1.2 && p.y < c.y + 3.2) openCage(c);
    } else {
      c.t += dt; const cg = c.cage;
      if (cg.visible) { cg.position.y = c.t * 5 - c.t * c.t * 6; cg.position.z = c.t * 2; cg.rotation.z = c.t * 4; cg.rotation.x = c.t * 2; cg.scale.setScalar(Math.max(0.01, 1 - c.t * 0.9)); if (c.t > 1.1) cg.visible = false; }
      const a = c.animal;
      if (c.t < 1.2) { a.position.y = 0.3 + Math.abs(Math.sin(c.t * 9)) * 0.6; a.rotation.y = c.t * 6; }
      else { a.position.y += dt * (c.kind === 'kus' ? 3 : 0.3); a.position.x += dt * 3; a.rotation.y = 0.35; a.scale.multiplyScalar(1 - dt * 0.6); if (c.t > 3.5) a.visible = false; }
    }
  }
  for (const s of ents.posts) {
    if (!s.on && p.x > s.x - 0.4 && Math.abs(p.y - s.y) < 3) { s.on = true; setPost(s.m, true); G.cp = { x: s.x, y: s.y }; sfx.checkpoint(); burst(s.x, s.y + 1.4, 0x8af4ff, 14); toast('⚡ Kontrol noktası'); }
    if (s.on) s.m.userData.glow.scale.setScalar(1.5 + Math.sin(G.t * 5) * 0.15);
  }
  for (const s of ents.signs) if (!s.shown && Math.abs(p.x - s.x) < 2.2) { s.shown = true; toast(SIGN_TIP[s.text] || ''); }
  for (const r of ents.rafts) r.m.position.set(r.r.s.x0, r.r.s.y, 0);
  const e = ents.end;
  if (e) {
    e.m.userData.glow.scale.setScalar(1.5 + Math.sin(G.t * 4) * 0.2);
    if (G.state === 'play' && p.x > e.x - 0.4 && Math.abs(p.y - e.y) < 3) { setPost(e.m, true); win(); }
    if (G.state === 'win') { e.beam.material.opacity = Math.min(0.55, e.beam.material.opacity + dt); bolt.position.y += dt * G.end * 3; bolt.scale.setScalar(Math.max(0.01, BOLT_S * (1 - G.end * 0.55))); bolt.position.x += (e.x - bolt.position.x) * Math.min(1, dt * 4); }
  }
}
function openCage(c) {
  c.open = true; c.t = 0;
  G.cages++; updateHud(); sfx.cage(); vibrate(50);
  burst(c.x, c.y + 1, 0x9a5a2a, 16); burst(c.x, c.y + 1.4, 0xd8b070, 10);
  const names = { kus: 'Mavi Kuş', tilki: 'Tilki', maymun: 'Maymun' };
  toast(`🐾 ${names[c.kind] || 'Dostun'} kurtarıldı! ${G.cages}/${ents.cages.length}`);
}

// ---------- Parçacıklar ----------
const partGeo = new THREE.SphereGeometry(0.07, 6, 4); partGeo.userData.shared = true;
function burst(x, y, color, n) {
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) { const m = add(new THREE.Mesh(partGeo, mat)); m.position.set(x, y, 0.3); ents.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 3), t: 0 }); }
}
function updateParts(dt) {
  for (let i = ents.parts.length - 1; i >= 0; i--) {
    const q = ents.parts[i]; q.t += dt; q.v.y -= (q.dust ? 1 : 14) * dt; if (q.dust) q.v.x *= 1 - dt * 3;
    q.m.position.addScaledVector(q.v, dt); q.m.scale.setScalar(Math.max(0, 1 - q.t * 1.4));
    if (q.t > 0.7) { levelRoot.remove(q.m); ents.parts.splice(i, 1); }
  }
}

// ---------- Kamera ----------
const cam = { x: 0, y: 0 }; let camSnap = true, camBase = 2, shake = 0;
function updateCamera(dt) {
  const p = player; if (!p) return;
  const lookAhead = p.face * 1.8 + p.vx * 0.1;
  let tx = Math.max(7, Math.min(L.w - 7, p.x + lookAhead));
  const b = ents.boss; if (b && b.wallsUp) tx = (b.x0 + b.x1) / 2; // boss savaşında arena sabit
  // dikey: yerdeyken basılan yüksekliğe oturur; havada yalnızca çok yükselince/düşünce takip eder
  if (p.ground || p.y < camBase - 1.2 || p.y > camBase + 3.0) camBase += (p.y - camBase) * Math.min(1, dt * (p.ground ? 3.5 : 5));
  const ty = camBase + 1.6;
  if (camSnap) { camBase = p.y; cam.x = tx; cam.y = camBase + 1.6; camSnap = false; }
  cam.x += (tx - cam.x) * Math.min(1, dt * 4); cam.y += (ty - cam.y) * Math.min(1, dt * 2.6);
  shake = Math.max(0, shake - dt); const sx = shake ? (Math.random() - 0.5) * shake * 0.5 : 0, sy = shake ? (Math.random() - 0.5) * shake * 0.5 : 0;
  const dist = b && b.wallsUp ? 13.5 : 11.2;
  camera.position.set(cam.x + sx, cam.y + 0.4 + sy, dist); camera.lookAt(cam.x + sx, cam.y - 0.1 + sy, 0);
  sun.position.set(cam.x + 6, 18, 12); sun.target.position.set(cam.x, 0, 0);
}

// ---------- Bitiş / kayıp ----------
function stars() { return 1 + (G.cages === ents.cages.length ? 1 : 0) + (G.coins >= Math.ceil(G.coinsTotal * 0.8) ? 1 : 0); }
function win() {
  if (G.won) return;
  G.won = true; G.state = 'win'; G.end = 0; sfx.win(); vibrate(120);
  player.vx = 0; player.lastAnim = ''; anim.play('cheer', { fade: 0.2 });
  const s = stars(), prev = save.best[G.n] || {};
  save.best[G.n] = { stars: Math.max(prev.stars || 0, s), coins: Math.max(prev.coins || 0, G.coins), star: !!(prev.star || G.star), cages: Math.max(prev.cages || 0, G.cages) };
  save.unlocked = Math.max(save.unlocked, Math.min(20, G.n + 1)); store();
  setTimeout(() => {
    const last = G.n === 20;
    $('endTitle').textContent = last ? 'Yeşil Vadi Kurtarıldı!' : 'Bölüm Tamam!';
    $('endStars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= s ? 'on' : ''}">★</span>`).join('');
    $('endInfo').innerHTML = `<img class="ci" src="props/coin_ui.webp" alt=""> ${G.coins}/${G.coinsTotal} &nbsp; 🐾 ${G.cages}/${ents.cages.length} &nbsp; <img class="ci ${G.star ? '' : 'dim'}" src="props/star.webp" alt=""><small>⭐ Bitir • ⭐ Bütün hayvanları kurtar • ⭐ Altınların %80'ini topla</small>${last ? '<small>🚀 Sıradaki dünya: Mantar Ormanı — yakında!</small>' : ''}`;
    $('next').classList.toggle('hidden', last);
    showScreen('end');
  }, G.n === 20 ? 4200 : 1900);
}
function lose() {
  G.state = 'lose'; sfx.lose(); player.lastAnim = ''; anim.play('fall', { once: true, fade: 0.15 }); bolt.visible = true;
  setTimeout(() => {
    $('endTitle').textContent = 'Canın Bitti';
    $('endStars').innerHTML = '';
    $('endInfo').innerHTML = 'Böceklerin üstüne zıpla, kirpiden ve dikenlerden uzak dur!';
    $('next').classList.add('hidden');
    showScreen('end');
  }, 900);
}

// ---------- Arayüz ----------
function updateHud() {
  $('hearts').innerHTML = [0, 1, 2].map((i) => `<i class="${i < G.hearts ? '' : 'off'}">❤</i>`).join('');
  $('coins').textContent = G.coins;
  $('cages').textContent = `${G.cages}/${ents.cages.length || 3}`;
  $('hudStar').classList.toggle('dim', !G.star);
}
let toastT = 0;
function toast(t) { if (!t) return; const e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2200); }
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* yok */ } }
function showScreen(id) {
  for (const s of ['menu', 'map', 'paused', 'end']) $(s).classList.toggle('hidden', s !== id);
  const inGame = !id || id === 'paused' || id === 'end';
  $('hud').classList.toggle('hidden', !inGame); $('pad').classList.toggle('hidden', !!id);
}
function renderMap() {
  const totalStars = Object.values(save.best).reduce((a, b) => a + (b.stars || 0), 0);
  const crystals = Object.values(save.best).filter((b) => b.star).length;
  $('mapInfo').innerHTML = `⭐ ${totalStars}/60 &nbsp; <img class="ci" src="props/star.webp" alt=""> ${crystals}/20`;
  $('levels').innerHTML = LEVELS.map((d, i) => {
    const n = i + 1, b = save.best[n] || {}, lock = n > save.unlocked;
    return `<button class="lv ${lock ? 'lock' : ''} ${d.boss ? 'boss' : ''}" data-lv="${n}" ${lock ? 'disabled' : ''}><b>${lock ? '🔒' : d.boss ? '👑' : n}</b><small>${d.name}</small><span class="st">${[1, 2, 3].map((k) => `<i class="${k <= (b.stars || 0) ? 'on' : ''}">★</i>`).join('')}${b.star ? '<img src="props/star.webp" alt="">' : ''}</span></button>`;
  }).join('');
  showScreen('map');
}

function bindControls() {
  const btn = (id, on, off) => {
    const el = $(id); const ids = new Set();
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); unlockAudio(); ids.add(e.pointerId); el.classList.add('down'); on(); el.setPointerCapture?.(e.pointerId); });
    const up = (e) => { ids.delete(e.pointerId); if (!ids.size) { el.classList.remove('down'); off(); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  };
  btn('bL', () => (input.left = true), () => (input.left = false));
  btn('bR', () => (input.right = true), () => (input.right = false));
  btn('bJ', () => { input.jump = true; input.jumpPressed = true; }, () => (input.jump = false));
  const K = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
  window.addEventListener('keydown', (e) => { if (K[e.key]) input[K[e.key]] = true; if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && !e.repeat) { input.jump = true; input.jumpPressed = true; } unlockAudio(); });
  window.addEventListener('keyup', (e) => { if (K[e.key]) input[K[e.key]] = false; if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') input.jump = false; });
  const click = (id, f) => $(id).addEventListener('click', () => { unlockAudio(); f(); });
  click('play', () => renderMap());
  click('mapBack', () => showScreen('menu'));
  $('levels').addEventListener('click', (e) => { const b = e.target.closest('[data-lv]'); if (b && !b.disabled) { unlockAudio(); loadLevel(+b.dataset.lv); } });
  click('pause', () => { if (G.state === 'play') { G.state = 'pause'; showScreen('paused'); } });
  click('resume', () => { G.state = 'play'; showScreen(null); });
  click('restart', () => loadLevel(G.n));
  click('toMap', () => renderMap());
  click('again', () => loadLevel(G.n));
  click('next', () => loadLevel(Math.min(20, G.n + 1)));
  click('endMap', () => renderMap());
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') { G.state = 'pause'; showScreen('paused'); } });
}

// ---------- Döngü ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  G.t += dt; G.inv = Math.max(0, G.inv - dt);
  if (L && (G.state === 'play' || G.state === 'win' || G.state === 'lose')) {
    updateRafts(L, G.t, dt);
    if (AUTO) autopilot();
    if (G.state === 'play') updatePlayer(dt);
    else if (G.state === 'win') G.end += dt;
    updateEnemies(dt); updateBoss(dt); updateShip(dt); updateItems(dt); updateParts(dt); updateCamera(dt);
    anim.update(dt);
  } else if (G.state === 'menu') { menuCam(dt); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
// menü arka planı: vadi üzerinde yavaş kayan kamera
function menuCam() { camera.position.set(20 + Math.sin(G.t * 0.1) * 12, 4.5, 11.2); camera.lookAt(camera.position.x, 3.4, 0); sun.position.set(camera.position.x + 6, 18, 12); sun.target.position.set(camera.position.x, 0, 0); }

// Otopilot (#auto): sağa koşar ve engellerde zıplar — tanıtım ve duman testi için
let autoHold = 0, AUTO = /auto/.test(location.hash);
function autopilot() {
  const p = player; if (!p || G.state !== 'play') return;
  input.right = true; input.left = false;
  const ahead = (d) => Math.floor(p.x + d);
  const groundAt = (d) => { for (let y = Math.floor(p.y) - 1; y >= Math.floor(p.y) - 2; y--) if (L.solid(ahead(d), y)) return true; return L.oneway.some((s) => p.x + d >= s.x0 && p.x + d <= s.x1 && Math.abs(s.y - p.y) < 1.5); };
  let jump = false;
  if (p.ground) {
    if (L.solid(ahead(0.9), Math.floor(p.y + 0.5))) jump = true;
    if (!groundAt(1.0)) jump = true;
    for (const e of ents.enemies) if (e.alive && e.x > p.x && e.x - p.x < 2.4 && Math.abs(e.y - p.y) < 1) jump = true;
    for (const t of L.thorns) if (t.x0 > p.x && t.x0 - p.x < 1.4 && Math.abs(t.y - p.y) < 1) jump = true;
  }
  if (jump && !input.jump) { input.jump = true; input.jumpPressed = true; autoHold = 0.4; }
  autoHold -= 1 / 60; if (autoHold <= 0 && p.vy < 6) input.jump = false;
}

window.KB2 = { G, input, ents, get L() { return L; }, get player() { return player; }, load: loadLevel, save, tp: (x) => { player.x = x; player.y = L.cols[Math.floor(x)] + 0.05; player.vx = player.vy = 0; camSnap = true; } };

(async function boot() {
  bindControls();
  await Promise.all([loadRobotModel(), ...Object.keys(SPEC).map(loadModel)]);
  backdrop(scene, 400);
  // menü arka planı için 1. bölümün dünyasını kur
  clearLevel(); seed(1); L = buildLevel(1); buildWorld(levelRoot, L); L = null;
  renderer.compile(scene, camera);
  $('splash').classList.add('hide');
  const m = location.hash.match(/lv=(\d+)/);
  if (m) loadLevel(+m[1]); else { G.state = 'menu'; showScreen('menu'); }
  frame();
})();
