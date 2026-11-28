// Kaptan Bolt 2 — Yeşil Vadi (20 bölüm, 2.5D platform)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { loadRobotModel } from './game/robotModel.js';
import { makeRobot, SKINS } from './game/robot.js';
import { buildLevel, updateRafts } from './level.js';
import { LEVELS } from './levels.js';
import { P, stepPlayer, moveX, newPlayer, coinHit, applyFields } from './physics.js';
import { THEME, THEMES, applyTheme, makeSpore, buildWorld, backdrop, seed, makeCoin, makeSpring, makePost, setPost, makeBeam, makePortal, makeCage2D, makeSprite, ASPECT, makeBridge, makeRaft, makeThorns } from './world.js';
import { sfx, unlockAudio } from './audio.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { makeWalker, kralRig } from './rigwalk.js';
import { makeTeleport, updateTeleport } from './teleport.js';
const TPV = +((location.hash.match(/tp=(\d)/) || [])[1] || 0);

const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7cc8ff);
scene.fog = new THREE.Fog(THEME.fog, 30, 95);
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 400);
const hemi = new THREE.HemisphereLight(...THEME.hemi); scene.add(hemi); // güçlü ortam ışığı: gölgeler yumuşak
const sun = new THREE.DirectionalLight(...THEME.sun);
sun.position.set(6, 18, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -8, near: 1, far: 60 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
scene.add(sun, sun.target);
for (const l of scene.children) if (l.isLight) l.layers.enableAll();
sun.shadow.camera.layers.enableAll();
renderer.autoClear = false;
let BD = null; // arka plan katmanları
/** Dünya değişince doku, sis, ışık ve arka plan değişir */
function setWorldTheme(w) {
  if (!applyTheme(w) && BD) return;
  const T = THEME; scene.fog.color.setHex(T.fog);
  hemi.color.setHex(T.hemi[0]); hemi.groundColor.setHex(T.hemi[1]); hemi.intensity = T.hemi[2];
  sun.color.setHex(T.sun[0]); sun.intensity = T.sun[1];
  if (BD) scene.remove(BD.group);
  BD = backdrop(scene, 400);
}
const worldOf = (n) => (n > 20 ? 2 : 1);
const lvLabel = (n) => `${worldOf(n)}-${n - (worldOf(n) - 1) * 20}`;
const ACTOR = 1; // karakter katmanı: zeminden sonra, derinlik temizlenerek çizilir
const toActor = (o) => { o.traverse((c) => c.layers.set(ACTOR)); return o; };
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
  mantarcik: { size: 1.25, fit: 'h', yaw: Math.PI / 2, skin: true, face: 0.55, matte: true, h: 1.1 },
  kral: { size: 3.3, fit: 'h', yaw: Math.PI / 2, skin: true, face: 0.5, matte: true, anims: true },
  salyangoz: { size: 1.35, fit: 'w', yaw: Math.PI / 2, face: 0.35, matte: true },
  kus: { size: 0.85, fit: 'h', yaw: 0.35 },
  tilki: { size: 0.9, fit: 'h', yaw: 0.35 + Math.PI / 4 },
  maymun: { size: 0.95, fit: 'h', yaw: 0.35 },
  sincap: { size: 0.9, fit: 'h', yaw: 0.35 },
  tavsan: { size: 0.95, fit: 'h', yaw: 0.35 },
  geyik: { size: 1.0, fit: 'w', yaw: 0.35 },
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
    m.traverse((o) => { if (o.isMesh) { o.geometry.userData.shared = true; o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.roughness = Math.max(0.45, o.material.roughness ?? 0.6); if (sp.matte) { o.material.metalness = Math.min(0.15, o.material.metalness ?? 0); o.receiveShadow = false; o.material.emissiveMap = o.material.map; o.material.emissive = new THREE.Color(0x8a8a8a); } } } });
    const holder = new THREE.Group(); holder.add(wrap); MODELS[n] = holder;
    // Meshy animasyonları: gövde/boyun/kafa izleri atılır (gövde tek omurga sanılıp eğiliyor); kollar ve bacaklar kalır
    if (sp.anims) holder.userData.clips = g.animations.map((c) => { const k = c.clone(); k.tracks = k.tracks.filter((t) => !/Spine|Neck|Head|Hips/.test(t.name)); return k; });
    ok();
  }, undefined, () => ok()));
}
const cloneM = (n) => (MODELS[n] ? (n === 'bocek' || n === 'kirpi' || SPEC[n]?.skin ? skClone(MODELS[n]) : MODELS[n].clone(true)) : new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff00ff })));

// ---------- Kayıt ----------
const SAVE_KEY = 'kb2.save';
let save = { unlocked: 1, best: {} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.best) save = s; } catch { /* yok */ }
// TEST SÜRÜMÜ: bütün bölümler açık (yayın öncesi false yapılacak)
const TEST_UNLOCK = true;
if (TEST_UNLOCK || /unlock/.test(location.hash)) save.unlocked = 40;
const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* yok */ } };

// ---------- Oyun durumu ----------
const G = { t: 0, state: 'load', n: 1, coins: 0, coinsTotal: 0, cages: 0, hearts: 3, cp: null, inv: 0, star: false, won: false, end: 0 };
let L = null, player = null, levelRoot = null;
const ents = { spores: [], sballs: [], shots: [], glove: null, coins: [], enemies: [], cages: [], springs: [], posts: [], parts: [], crates: [], hearts: [], rafts: [], signs: [], star: null, end: null, boss: null, ship: null, flying: [] };
const input = { left: false, right: false, jump: false, jumpPressed: false, fire: false };
const BOLT_S = 1.12 * 1.2;
let bolt, anim;

function clearLevel() {
  if (levelRoot) { scene.remove(levelRoot); levelRoot.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose?.(); }); }
  for (const k of Object.keys(ents)) ents[k] = Array.isArray(ents[k]) ? [] : null;
  levelRoot = new THREE.Group(); scene.add(levelRoot);
}
const add = (o) => { levelRoot.add(o); return o; };

function loadLevel(n) {
  setWorldTheme(worldOf(n));
  clearLevel(); seed(n);
  G.n = n; L = buildLevel(n);
  buildWorld(levelRoot, L);
  for (const c of L.coins) { const m = add(makeCoin()); m.position.set(c.x, c.y, 0); ents.coins.push({ ...c, m, taken: false, ph: Math.random() * 6 }); }
  G.coinsTotal = L.coins.length + L.crates.size * 3;
  for (const e of L.enemies) {
    const holder = add(new THREE.Group()); const look = THEME.enemy?.[e.type] || e.type, em = cloneM(look); holder.add(em); toActor(holder);
    let ball = null;
    if (e.type === 'kirpi' && look !== 'kirpi') { ball = new THREE.Group(); ball.position.y = 0.5; ball.visible = false; holder.add(ball); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd23a, toneMapped: false })); ball.add(ring); toActor(ring); ball.userData.ring = ring; }
    if (e.type === 'kirpi' && look === 'kirpi') { ball = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.7 })); ball.position.y = 0.55; ball.scale.set(1.15, 0.95, 1); ball.visible = false; ball.castShadow = true; holder.add(ball); toActor(ball); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd23a, toneMapped: false })); ring.position.y = 0.55; ball.add(ring); ball.userData.ring = ring; }
    ents.enemies.push({ ball, look, face: SPEC[look]?.face || 0, walker: makeWalker(em, look), type: e.type, x0: e.x0, x1: e.x1, x: e.x, y: e.t, vx: e.type === 'kirpi' ? -0.75 : -1.05, w: e.type === 'kirpi' ? 1.1 : 1.05, h: SPEC[look]?.h || (e.type === 'kirpi' ? 0.95 : 0.8), m: holder, alive: true, squash: 0, ph: Math.random() * 6 });
  }
  for (const c of L.cages) {
    const g = add(makeCage2D()); g.position.set(c.x, c.y, 0);
    const a = cloneM(THEME.animal?.[c.animal] || c.animal); a.position.set(0, 0.3, -0.02); a.scale.multiplyScalar(0.8); g.add(a);
    ents.cages.push({ x: c.x, y: c.y, kind: c.animal, m: g, animal: a, open: false, t: 0 });
  }
  for (const s of L.springs) { const m = add(makeSpring(s.kind)); m.position.set(s.x, s.y - 0.05, 0); ents.springs.push({ ...s, src: s, m, t: 1 }); }
  for (const z of L.spores) { const m = add(makeSpore(z.x1 - z.x0, z.y1 - z.y0)); m.position.set(z.x0, z.y0, 0); ents.spores.push({ z, m }); }
  for (const c of L.checkpoints) { const m = add(makePost(false)); m.position.set(c.x, c.y, 0); ents.posts.push({ ...c, m, on: false }); }
  for (const c of L.crates.values()) { const m = add(makeSprite('crate', 1.02, ASPECT.crate)); m.position.set(c.x + 0.5, c.y - 0.01, 0.35); ents.crates.push({ ...c, m, broken: false }); }
  for (const h of L.hearts) { const m = add(makeSprite('heart', 0.62, ASPECT.heart)); m.geometry = m.geometry.clone(); m.geometry.translate(0, -0.31, 0); m.position.set(h.x, h.y, 0.2); ents.hearts.push({ ...h, m, taken: false }); }
  if (L.star) { const m = add(makeSprite('star', 0.8, ASPECT.star)); m.geometry = m.geometry.clone(); m.geometry.translate(0, -0.4, 0); m.position.set(L.star.x, L.star.y, 0.2); ents.star = { ...L.star, m, taken: false }; }
  for (const s of L.bridges) add(makeBridge(s.x0, s.x1, s.y));
  for (const t of L.thorns) { const m = add(makeThorns(t.x1 - t.x0)); m.position.set(t.x0, t.y, 0); }
  for (const r of L.rafts) { const m = add(makeRaft(r.w)); ents.rafts.push({ r, m }); }
  for (const s of L.signs) { const m = add(makeSprite('sign', 1.3, ASPECT.sign)); m.position.set(s.x, s.y - 0.05, -0.7); ents.signs.push({ ...s, m, shown: false }); }
  for (const d of L.decos) { const m = add(makeSprite(d.kind, 1, ASPECT[d.kind])); m.position.set(d.x, d.y - 0.04, d.z); }
  if (L.end && !L.boss) { const m = add(makePortal()); m.position.set(L.end.x + 0.6, L.end.y, 0); ents.end = { ...L.end, m, px: L.end.x + 0.6 }; }
  if (L.boss) setupBoss();

  if (!bolt) {
    bolt = makeRobot(SKINS[1]); bolt.scale.setScalar(BOLT_S);
    bolt.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    if (bolt.userData.fill) bolt.userData.fill.intensity = 0.8;
    anim = bolt.userData.anim;
  }
  scene.add(toActor(bolt)); bolt.visible = true; bolt.scale.setScalar(BOLT_S); bolt.position.set(0, 0, 0);
  player = newPlayer(L.start.x, L.cols[2] || 2); player.ground = true; player.lastAnim = '';
  Object.assign(G, { coins: 0, cages: 0, hearts: 3, inv: 0, star: false, won: false, cp: { x: player.x, y: player.y }, state: 'play', end: 0, ch: 3, cd: 0, bossTip: false });
  G.gun = !!save.gun || n > 6;
  if (n === 6 && !save.gun) { // şimşek eldiveni: 6. bölümün başında gemiden düşer
    const g = add(new THREE.Group()); const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshStandardMaterial({ color: 0x8af0ff, emissive: 0x2ab8ff, emissiveIntensity: 1.6, roughness: 0.2 }));
    g.add(orb); const gl = makeSprite('star', 0.5, ASPECT.star); gl.position.set(0, -0.25, 0.3); g.add(gl); g.position.set(8.5, L.cols[8] + 1.0, 0.2); ents.glove = { m: g, x: 8.5, y: L.cols[8] + 1.0, taken: false };
  }
  $('bF').classList.toggle('hidden', !G.gun); updateCharges();
  Object.assign(input, { left: false, right: false, jump: false, jumpPressed: false });
  camSnap = true; updateCamera(0);
  updateHud(); showScreen(null);
  toast(n === 21 ? `🍄 Mantar Ormanı! ${lvLabel(n)} • ${L.name}` : `${lvLabel(n)} • ${L.name}`);
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
  p.prevY = p.y;
  stepPlayer(L, p, input, dt, ev);
  const hs = applyFields(L, p, dt);
  if (hs) { const s = ents.springs.find((e) => e.src === hs); if (s) s.t = 0; sfx.spring(); vibrate(20); dust(hs.x, hs.y, 5); }
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
  const sp = Math.abs(p.vx);
  const lean = sp > 0.4 || !p.ground ? 0.35 : 0.8; // dururken kameraya daha dönük
  const targetRot = p.face * (Math.PI / 2 - lean);
  bolt.rotation.y += (targetRot - bolt.rotation.y) * Math.min(1, dt * 7); // dönüş ~0,3 sn, önce kameraya bakarak
  if (!p.ground) playAnim('idle', { fade: 0.12 }); // havada dik duruş + kodla bacak/kol pozu (aşağıda)
  else if (sp > P.RUN * 0.6) { playAnim('run', { fade: 0.12 }); anim.play('run', { speed: 0.75 + sp / P.RUN * 0.35 }); }
  else if (sp > 0.4) { playAnim('walk', { fade: 0.15 }); anim.play('walk', { speed: 0.9 + sp / P.RUN * 1.2 }); }
  else playAnim('idle', { fade: 0.25 });
  bolt.visible = G.inv <= 0 || Math.floor(G.t * 16) % 2 === 0;
  // duruş: dururken dik ve göğüs önde, yürürken biraz, koşarken ve havada doğal
  const T = !p.ground ? [0.06, -0.02, 0.06, 0.8] : sp > P.RUN * 0.6 ? [0.08, -0.04, 0.06, 0.9] : sp > 0.4 ? [0.12, 0.0, 0.12, 0.8] : [0.16, 0.2, 0.18, 0.65];
  const S = anim.st, k = Math.min(1, dt * 6);
  const ka = Math.min(1, dt * 14); S.air += ((p.ground ? 0 : 1) - S.air) * ka; S.fall += ((p.vy < -1 ? 1 : 0) - S.fall) * Math.min(1, dt * 6);
  if (!POSTURE_OFF) { S.spineBack += (T[0] - S.spineBack) * k; S.headUp += (T[1] - S.headUp) * k; S.armOut += (T[2] - S.armOut) * k; S.stanceK += (T[3] - S.stanceK) * k; }
}
let POSTURE_OFF = /noposture/.test(location.hash);

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
    if (e.curled > 0) { e.curled -= dt; e.m.scale.set(0.82, 0.62, 0.82); e.m.rotation.z = Math.sin(G.t * 20) * 0.04; if (e.ball) { e.ball.visible = true; if (e.ball.material) e.ball.material.color.setHex(0xb87a4a); e.ball.userData.ring.scale.setScalar(1 + Math.sin(G.t * 10) * 0.1); } if (e.curled <= 0) { e.m.scale.set(1, 1, 1); e.m.rotation.z = 0; if (e.ball) e.ball.visible = false; } }
    else if (e.wait > 0) { e.wait -= dt; if (e.wait <= 0) e.vx = -e.vx; } // kenarda kısa durup döner
    else if ((e.vx < 0 && nx <= e.x0) || (e.vx > 0 && nx >= e.x1) || L.solid(Math.floor(front), Math.floor(e.y + 0.3)) || !groundUnder(front, e.y)) e.wait = 0.35;
    else { e.x = nx; moving = e.vx; }
    e.m.position.set(e.x, e.y, 0);
    // kenarda beklerken yavaşça yeni yöne döner (görünür dönüş)
    const dirN = e.wait > 0 ? -e.vx : e.vx; e.m.rotation.y += ((dirN > 0 ? -e.face : Math.PI + e.face) - e.m.rotation.y) * Math.min(1, dt * (e.wait > 0 ? 7 : 12));
    if (e.walker) e.walker.update(dt, moving, G.t);
    const p = player;
    if (G.state !== 'play' || Math.abs(p.x - e.x) > (P.PW + e.w) / 2 - 0.08 || Math.min(p.y, p.prevY ?? p.y) > e.y + e.h || p.y + P.PH < e.y + 0.1) continue;
    // ezme: önceki adımda ayaklar böceğin üst çizgisinde/üstündeyken bu adımda aşağı doğru geçtiyse
    const topY = e.y + e.h, stomp = p.vy < 0 && (p.prevY ?? p.y) >= topY - 0.12 && p.y < (p.prevY ?? p.y);
    if (stomp && (e.type === 'bocek' || e.curled > 0)) { e.alive = false; p.vy = input.jump ? P.STOMP_HOLD : P.STOMP; p.noCut = true; sfx.stomp(); vibrate(30); burst(e.x, e.y + 0.5, 0xffa040, 10); dropCoins(e.x, e.y + 0.6, 2); }
    else hurt(e.x);
  }
}

// ---------- Şimşek atışı ----------
const shotGeo = new THREE.SphereGeometry(0.17, 16, 12); shotGeo.userData.shared = true;
const shotMat = new THREE.MeshBasicMaterial({ color: 0xbdf6ff, toneMapped: false });
function updateCharges() { const n = Math.floor(G.ch); $('fCh').querySelectorAll('i').forEach((i, k) => i.classList.toggle('on', k < n)); $('bF').classList.toggle('empty', n < 1); }
function dropCoins(x, y, n) { for (let i = 0; i < n; i++) { const m = add(makeCoin()); m.position.set(x, y, 0.4); ents.flying.push({ m, v: new THREE.Vector3((i - (n - 1) / 2) * 2, 6 + Math.random() * 2, 0), t: -i * 0.06 }); } }
let punchT = 0, punchSide = 1, eyeT = 0;
function punch(real) { punchT = 0.28; punchSide = -punchSide; anim.st.face = player.face; anim.st.punchSide = player.face; if (real) { eyeT = 0.18; player.squash = 0.1; } }
function updatePunch(dt) {
  punchT = Math.max(0, punchT - dt); const S = anim.st;
  const tgt = punchT > 0.18 ? 1 : punchT > 0 ? punchT / 0.18 : 0;
  S.punch += (tgt - S.punch) * Math.min(1, dt * (tgt > S.punch ? 40 : 12));
  eyeT = Math.max(0, eyeT - dt); const em = bolt.userData.mat;
  if (em && em.emissiveIntensity !== undefined) { em.userData.e0 ??= em.emissiveIntensity; em.emissiveIntensity = em.userData.e0 * (1 + eyeT * 10); }
  if (bolt.userData.fill) bolt.userData.fill.color.setHex(eyeT > 0 ? 0x9af0ff : 0xfff6ee);
}
function updateGun(dt) {
  updatePunch(dt);
  const p = player;
  const gv = ents.glove;
  if (gv && !gv.taken) {
    gv.m.position.y = gv.y + Math.sin(G.t * 3) * 0.12; gv.m.rotation.y += dt * 2;
    if (G.state === 'play' && Math.abs(p.x - gv.x) < 0.8 && gv.y > p.y - 0.4 && gv.y < p.y + P.PH + 0.6) {
      gv.taken = true; gv.m.visible = false; save.gun = true; store(); G.gun = true; G.ch = 3; $('bF').classList.remove('hidden'); updateCharges();
      sfx.cage(); for (let i = 0; i < 18; i++) spark(gv.x, gv.y, 1.3); toast('⚡ Şimşek eldiveni! Mavi tuşla şimşek fırlat');
    }
  }
  if (!G.gun) { input.fire = false; return; }
  const before = Math.floor(G.ch);
  G.ch = Math.min(3, G.ch + dt * 0.5); G.cd = Math.max(0, G.cd - dt);
  if (input.fire) {
    input.fire = false;
    if (G.state === 'play' && G.cd <= 0 && G.ch < 1) { // şarj yok: kol uzanır, sönük kıvılcım
      G.cd = 0.3; punch(); sfx.empty(); for (let i = 0; i < 3; i++) spark(p.x + p.face * 0.7, p.y + 0.8, 0.2);
    } else if (G.state === 'play' && G.ch >= 1 && G.cd <= 0) {
      G.ch -= 1; G.cd = 0.3; punch(true);
      const m = add(new THREE.Group()); const fb = makeSprite('fireball', 0.62, 512 / 173); fb.geometry = fb.geometry.clone(); fb.geometry.translate(-0.62 * 512 / 173 * 0.36, -0.31, 0); fb.material = fb.material.clone(); fb.material.alphaTest = 0.08; fb.material.depthWrite = false; m.add(fb); m.scale.x = p.face; m.userData.fb = fb; toActor(m);
      m.position.set(p.x + p.face * 0.78, p.y + 0.82, 0.35);
      ents.shots.push({ m, x: m.position.x, y: m.position.y, vx: p.face * 11, t: 0 });
      sfx.shot(); vibrate(20); shake = Math.max(shake, 0.12); for (let i = 0; i < 8; i++) spark(m.position.x, m.position.y, 0.7);
      if (p.ground) p.vx -= p.face * 1.6; // geri tepme
    }
  }
  if (Math.floor(G.ch) !== before) updateCharges();
  for (let i = ents.shots.length - 1; i >= 0; i--) {
    const s = ents.shots[i]; s.t += dt; s.x += s.vx * dt; s.m.position.x = s.x; const fl = 1 + Math.sin(s.t * 40) * 0.08; s.m.userData.fb.scale.set(fl, 1 + Math.sin(s.t * 33) * 0.06, 1); s.m.position.y = s.y + Math.sin(s.t * 25) * 0.03;
    if (Math.random() < 0.5) spark(s.x - Math.sign(s.vx) * 0.9, s.y + (Math.random() - 0.5) * 0.3, 0.25);
    let hit = s.t > 1.3 || L.solid(Math.floor(s.x), Math.floor(s.y));
    if (!hit) for (const e of ents.enemies) {
      if (!e.alive || Math.abs(e.x - s.x) > e.w / 2 + 0.15 || s.y < e.y - 0.1 || s.y > e.y + e.h + 0.35) continue;
      hit = true;
      if (e.type === 'kirpi' && !(e.curled > 0)) { e.curled = 2.2; sfx.bump(); burst(e.x, e.y + 0.5, 0x8af0ff, 8); toast(e.look === 'salyangoz' ? 'Kabuk çatladı! Üstüne zıpla' : 'Kirpi top oldu! Bir daha vur'); }
      else { e.alive = false; sfx.stomp(); vibrate(25); burst(e.x, e.y + 0.5, 0x8af0ff, 14); dropCoins(e.x, e.y + 0.6, 1); }
      break;
    }
    const b = ents.boss;
    if (!hit && b && !b.dead && b.st !== 'wait' && Math.abs(b.x - s.x) < b.w / 2 && s.y > b.y && s.y < b.y + b.h) { hit = true; if (!G.bossTip) { G.bossTip = true; toast(b.kind === 'kral' ? 'Şimşek krala işlemiyor! Spor toplarını vur, yorulunca kafasına zıpla' : 'Şimşek işlemiyor! Duvara çarptırıp üstüne zıpla'); } }
    if (hit) { for (let k = 0; k < 14; k++) spark(s.x, s.y, 1.1); burst(s.x, s.y, 0x7ae8ff, 8); levelRoot.remove(s.m); ents.shots.splice(i, 1); }
  }
}

// ---------- Boss: Dev Paslı Böcek ----------
function setupBoss() {
  if (LEVELS[G.n - 1].bossKind === 'kral') return setupKral();
  const B = L.boss;
  const m = add(new THREE.Group()); const body = cloneM('bocek'); body.scale.setScalar(3.0); m.add(body); const walker = makeWalker(body, 'bocek'); toActor(m);
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
  if (b.kind === 'kral') return updateKral(dt);
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
    b.dir = p.x < b.x ? -1 : 1; b.vx = b.dir * (1.25 + (3 - b.hp) * 0.4);
    if (b.t > 2.2 - (3 - b.hp) * 0.4) { b.st = 'prep'; b.t = 0; }
  } else if (b.st === 'prep') { b.vx = 0; b.m.position.x = b.x + Math.sin(b.t * 60) * 0.06; if (b.t > 0.65) { b.st = 'charge'; b.t = 0; b.vx = b.dir * (6.5 + (3 - b.hp) * 0.8); sfx.spring(); } }
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
// ---------- Boss: Mantar Kral ----------
// Yürür; uzaktaysa bağırıp spor topları atar (şimşek topları patlatır); yakındaysa yumruk kombosuyla yere vurur
// (yerdeysen can gider, zıpla!). Vuruştan sonra yorulur: o sırada kafasına zıpla. 3 can.
function setupKral() {
  const B = L.boss;
  const m = add(new THREE.Group()); const body = cloneM('kral'); m.add(body); toActor(m);
  body.traverse((o) => { if (o.isMesh && o.material) o.material = o.material.clone(); });
  const rig = kralRig(body);
  const stars = add(new THREE.Group()); for (let i = 0; i < 4; i++) { const st = makeSprite('star', 0.4, ASPECT.star); st.position.set(Math.cos(i * 1.57) * 0.9, 0, Math.sin(i * 1.57) * 0.9); stars.add(st); } stars.visible = false;
  const walls = [B.x0 - 1, B.x1];
  const wallM = walls.map((wx) => { const g = add(new THREE.Group()); for (let i = 0; i < 6; i++) { const c = makeSprite('crate', 1.02, ASPECT.crate); c.position.set(0.5, i, 0.3); g.add(c); } g.position.set(wx, -8, 0); return g; });
  const ring = add(new THREE.Mesh(new THREE.RingGeometry(0.2, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0xb8ff4a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }))); ring.rotation.x = -Math.PI / 2; toActor(ring);
  ents.boss = { ...B, kind: 'kral', m, body, rig, stars, ring, x: B.x1 - 4, y: B.y, vx: 0, dir: -1, hp: 3, st: 'wait', t: 0, w: 2.3, h: 2.9, wallX: walls, wallM, wallsUp: false, flash: 0, dead: false, fired: 0, slammed: false, tipPunch: false };
  const base = L.solid;
  L.solid = (x, y) => (ents.boss && ents.boss.wallsUp && ents.boss.wallX.includes(x) && y < 14) || base(x, y);
}
function throwSpore(b) {
  const p = player, fromX = b.x + b.dir * 0.8, fromY = b.y + 2.4;
  for (let i = 0; i < 3; i++) {
    const T = 0.9 + i * 0.25, tx = p.x + (i - 1) * 1.6, vx = (tx - fromX) / T, vy = ((p.y + 0.3 - fromY) + 0.5 * 16 * T * T) / T;
    const m = add(makeSprite('w2/sporeball', 1.0, 256 / 198)); m.geometry = m.geometry.clone(); m.geometry.translate(0, -0.5, 0); toActor(m);
    m.position.set(fromX, fromY, 0.5); ents.sballs.push({ m, x: fromX, y: fromY, vx, vy, t: -i * 0.12 });
  }
}
function updateSballs(dt) {
  const p = player;
  for (let i = ents.sballs.length - 1; i >= 0; i--) {
    const s = ents.sballs[i]; s.t += dt; if (s.t < 0) { s.m.visible = false; continue; } s.m.visible = true;
    s.vy -= 16 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.m.position.set(s.x, s.y, 0.5); s.m.rotation.z += dt * 5; s.m.scale.x = s.vx < 0 ? 1 : -1;
    let pop = L.solid(Math.floor(s.x), Math.floor(s.y - 0.3)) || s.y < -3 || s.t > 4;
    for (const sh of ents.shots) if (Math.abs(sh.x - s.x) < 0.7 && Math.abs(sh.y - s.y) < 0.7) { pop = true; sh.t = 99; }
    if (!pop && G.state === 'play' && Math.abs(p.x - s.x) < 0.6 && s.y > p.y - 0.2 && s.y < p.y + P.PH + 0.3) { pop = true; hurt(s.x); }
    if (pop) { burst(s.x, s.y, 0xb8ff4a, 10); levelRoot.remove(s.m); ents.sballs.splice(i, 1); }
  }
}
function updateKral(dt) {
  const b = ents.boss, p = player; b.t += dt;
  updateSballs(dt);
  for (const g of b.wallM) g.position.y += ((b.wallsUp ? b.y : b.y - 8) - g.position.y) * Math.min(1, dt * 6);
  if (b.dead) {
    b.m.rotation.z += dt * 2.5; b.m.position.y += dt * (3 - b.t * 6); b.m.scale.setScalar(Math.max(0.01, 1 - b.t * 0.6));
    if (b.t > 1.6 && b.m.visible) { b.m.visible = false; landShip(); }
    return;
  }
  const toward = () => { b.dir = p.x < b.x ? -1 : 1; };
  const go = (st) => { b.st = st; b.t = 0; };
  if (b.st === 'wait') { if (p.x > b.x0 + 2) { b.wallsUp = true; go('roar'); sfx.bump(); toast('⚠️ Mantar Kral! Yumruktan sonra yorulur: kafasına zıpla!'); } }
  else if (b.st === 'roar') { toward(); b.vx = 0; if (b.t > 1.8) { go('walk'); } }
  else if (b.st === 'walk') {
    toward(); b.vx = b.dir * (1.3 + (3 - b.hp) * 0.35);
    if (b.t > 2.4 - (3 - b.hp) * 0.4) { b.vx = 0; if (Math.abs(p.x - b.x) < 4.5) { go('punch'); b.slammed = false; if (!b.tipPunch) { b.tipPunch = true; toast('👊 Yere vuracak: zıpla!'); } } else { go('shout'); b.fired = 0; } }
  } else if (b.st === 'shout') {
    b.vx = 0; toward();
    if (b.fired === 0 && b.t > 0.7) { b.fired = 1; throwSpore(b); sfx.shot(); }
    if (b.hp < 3 && b.fired === 1 && b.t > 1.5) { b.fired = 2; throwSpore(b); sfx.shot(); }
    if (b.t > (b.hp < 3 ? 2.3 : 1.7)) go('walk');
  } else if (b.st === 'punch') {
    b.vx = 0;
    const tSlam = 1.1; b.ring.material.opacity = b.t < tSlam ? 0.25 + Math.sin(b.t * 20) * 0.15 : Math.max(0, 0.8 - (b.t - tSlam) * 2);
    const rr = b.t < tSlam ? 1 : 1 + (b.t - tSlam) * 18; b.ring.scale.setScalar(rr); b.ring.position.set(b.x, b.y + 0.05, 0.6);
    if (!b.slammed && b.t > tSlam) { b.slammed = true; sfx.stomp(); vibrate(80); shake = 0.5; dust(b.x - 1, b.y, 10); dust(b.x + 1, b.y, 10); if (G.state === 'play' && p.ground && Math.abs(p.x - b.x) < 7) hurt(b.x); }
    if (b.t > 2.2) { go('tired'); b.ring.material.opacity = 0; }
  } else if (b.st === 'tired') {
    b.vx = 0; b.stars.visible = true; b.stars.rotation.y += dt * 6;
    if (b.t > 2.8) { b.stars.visible = false; go('walk'); }
  } else if (b.st === 'hit') { b.vx = 0; if (b.t > 1.4) { go('walk'); } }
  b.x = Math.max(b.x0 + b.w / 2, Math.min(b.x1 - b.w / 2, b.x + b.vx * dt));
  b.m.position.set(b.x, b.y, 0);
  const tr = (b.dir > 0 ? -0.5 : Math.PI + 0.5); b.m.rotation.y += (tr - b.m.rotation.y) * Math.min(1, dt * 6);
  b.m.rotation.z = 0; b.rig.update(dt, b.st, b.t, b.vx);
  b.stars.position.set(b.x, b.y + b.h + 0.5, 0);
  b.flash = Math.max(0, b.flash - dt); b.body.visible = b.flash <= 0 || Math.floor(b.flash * 20) % 2 === 0;
  if (G.state !== 'play' || b.st === 'wait') return;
  if (Math.abs(p.x - b.x) < (P.PW + b.w) / 2 - 0.1 && p.y < b.y + b.h && p.y + P.PH > b.y + 0.1) {
    const top = p.vy < -1 && p.y > b.y + b.h * 0.6;
    if (top && b.st === 'tired') {
      b.hp--; b.flash = 0.8; b.stars.visible = false; go('hit');
      p.vy = P.STOMP_HOLD; p.noCut = true; p.vx = (p.x < b.x ? -1 : 1) * 5;
      sfx.stomp(); vibrate(70); burst(b.x, b.y + b.h, 0xb8ff4a, 18); updateHud();
      if (b.hp <= 0) { b.dead = true; b.t = 0; b.wallsUp = false; for (const s2 of ents.sballs) levelRoot.remove(s2.m); ents.sballs = []; sfx.cage(); toast('💥 Mantar Kral yenildi!'); shake = 0.6; }
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
const SIGN_TIP = { move: '◀ ▶ tuşlarıyla yürü', jump: 'Sarı tuş: zıpla! Basılı tutarsan daha yükseğe', stomp: 'Böceklerin üstüne zıpla, ez!', spike: 'Kirpinin üstüne zıplama, üstünden atla!', spring: 'Mantara bas, yükseğe fırla!', bounce: 'Renkli mantarlar: pembe az, turkuaz orta, altın çok zıplatır!', spore: 'Spor bulutuna gir: yukarı süzülürsün! Sonra yönünü seç', snail: 'Salyangozun kabuğu sert: önce şimşekle vur, sonra üstüne zıpla!', thorn: 'Dikenli çalılara değme!', bridge: 'İp köprüler sağlam, rahat geç', crate: 'Sandığın üstüne zıpla ya da alttan kafa at: altın çıkar!', raft: 'Sal gidip gelir: üstüne atla, taşısın', gun: 'Parlayan küreyi al: şimşek eldiveni!' };
function updateItems(dt) {
  const p = player;
  for (const c of ents.coins) {
    if (c.taken) { if (c.m.visible) { c.k += dt; c.m.position.y += dt * 5; c.m.scale.setScalar(Math.max(0, 1 - c.k * 3)); if (c.k > 0.35) c.m.visible = false; } continue; }
    c.m.userData.face.scale.x = Math.max(0.1, Math.abs(Math.cos(G.t * 2.6 + c.ph))); c.m.position.y = c.y + Math.sin(G.t * 3 + c.ph) * 0.05;
    if (coinHit(p, c)) { c.taken = true; c.k = 0; G.coins++; sfx.coin(); updateHud(); }
  }
  for (let i = ents.flying.length - 1; i >= 0; i--) { const f = ents.flying[i]; f.t += dt; if (f.t < 0) continue; f.v.y -= 22 * dt; f.m.position.addScaledVector(f.v, dt); f.m.userData.face.scale.x = Math.abs(Math.cos(f.t * 12)); if (f.t > 0.55) { levelRoot.remove(f.m); ents.flying.splice(i, 1); G.coins++; sfx.coin(); updateHud(); } }
  for (const s of ents.springs) {
    s.t = Math.min(1, s.t + dt * 4);
    const k = 1 - Math.sin(s.t * Math.PI) * 0.35; s.m.userData.spr.scale.set(1 + (1 - k) * 0.5, k, 1);
  }
  for (const s of ents.spores) {
    const U = s.m.userData; U.col.material.opacity = 0.65 + Math.sin(G.t * 3) * 0.12; U.cloud.scale.set(1 + Math.sin(G.t * 2) * 0.03, 1 + Math.cos(G.t * 2.3) * 0.04, 1);
    for (const d of U.dots) { d.position.y += d.userData.v * dt * (p.inSpore ? 1.6 : 1); if (d.position.y > U.h) d.position.y -= U.h; d.material.opacity = Math.min(1, (U.h - d.position.y) * 0.8, d.position.y * 2); }
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
      c.t += dt; const U = c.m.userData, t = c.t;
      // 0–0,3 kilit titrer; sonra düşer ve döner; 0,3–0,75 kapı menteşeden açılır; 0,8+ hayvan zıplayıp dışarı çıkar
      if (t < 0.3) { U.lock.rotation.z = Math.sin(t * 60) * 0.25; }
      else if (U.lock.visible) { const q = t - 0.3; U.lock.position.set(U.lock0.x + q * 1.2, U.lock0.y + q * 2.5 - q * q * 14, U.lock0.z + q * 0.5); U.lock.rotation.z = -q * 9; if (U.lock.position.y < -1.5) U.lock.visible = false; }
      const dq = Math.min(1, Math.max(0, (t - 0.3) / 0.45)); U.hinge.rotation.y = -(1 - Math.pow(1 - dq, 3)) * 1.0 + (dq >= 1 ? Math.sin((t - 0.75) * 14) * 0.06 * Math.max(0, 1 - (t - 0.75) * 3) : 0);
      const a = c.animal;
      if (t < 0.8) { a.position.y = 0.3 + Math.abs(Math.sin(t * 12)) * 0.12; }
      else if (t < 1.6) { const q = (t - 0.8) / 0.8; a.position.set(q * 0.4, 0.3 + Math.abs(Math.sin(q * Math.PI * 2)) * 0.7, q * 1.4); a.rotation.y = 0.2; }
      else { a.position.y += dt * (c.kind === 'kus' ? 3.5 : 0); if (c.kind !== 'kus') a.position.y = 0.3 + Math.abs(Math.sin(t * 9)) * 0.35; a.position.x += dt * 3.5; a.position.z = 1.4; a.rotation.y = Math.PI / 2 - 0.4; if (t > 3.6) { a.scale.multiplyScalar(1 - dt * 3); } if (t > 4.4) a.visible = false; }
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
    const U = e.m.userData; U.swirl.rotation.z -= dt * (G.state === 'win' ? 2 + G.end * 9 : 1.6); U.glow.material.opacity = 0.3 + Math.sin(G.t * 3) * 0.08;
    if (G.state === 'play' && p.x > e.x - 0.4 && Math.abs(p.y - e.y) < 3) win();
    if (G.state === 'win') teleportFx(e, dt);
  }
}
function openCage(c) {
  c.open = true; c.t = 0;
  G.cages++; updateHud(); sfx.cage(); vibrate(50);
  burst(c.x + 0.6, c.y + 0.9, 0xffd23a, 10);
  const names = { kus: 'Mavi Kuş', tilki: 'Tilki', maymun: 'Maymun', sincap: 'Sincap', tavsan: 'Tavşan', geyik: 'Geyik Yavrusu' };
  toast(`🐾 ${names[THEME.animal?.[c.kind] || c.kind] || 'Dostun'} kurtarıldı! ${G.cages}/${ents.cages.length}`);
}

// ---------- Işınlanma ----------
function teleportFx(e, dt) {
  if (!TPV) { // portala atla, girdaba çekil
    const t = G.end, U = e.m.userData, cx = e.px, cy = e.y + U.cy;
    if (t < 0.25) { bolt.position.x += (cx - 0.9 - bolt.position.x) * Math.min(1, dt * 8); bolt.rotation.y += (Math.PI / 2 - bolt.rotation.y) * Math.min(1, dt * 10); }
    else if (t < 1.05) {
      const q = (t - 0.25) / 0.8, sx = e.sx ?? (e.sx = bolt.position.x), sy = e.sy ?? (e.sy = bolt.position.y);
      bolt.position.x = sx + (cx - sx) * q; bolt.position.y = sy + (cy - 0.5 - sy) * q + Math.sin(q * Math.PI) * 0.8; bolt.position.z = -0.3 * q;
      bolt.rotation.z = 0; bolt.scale.setScalar(BOLT_S * Math.max(0.01, 1 - q * q)); if (q > 0.97) bolt.visible = false;
      if (Math.random() < 0.6) spark(cx + (Math.random() - 0.5) * 1.6, cy + (Math.random() - 0.5) * 1.6, 0.3);
    } else if (!e.flashed) { e.flashed = true; bolt.visible = false; for (let i = 0; i < 24; i++) spark(cx + (Math.random() - 0.5) * 0.6, cy + (Math.random() - 0.5) * 0.6, 1.4); sfx.checkpoint(); }
    U.glow.material.opacity = 0.35 + (t > 0.9 && t < 1.5 ? Math.sin((t - 0.9) / 0.6 * Math.PI) * 0.6 : 0); U.glow.scale.setScalar(1 + (t > 0.9 && t < 1.5 ? Math.sin((t - 0.9) / 0.6 * Math.PI) * 0.4 : 0));
    return;
  }
  if (TPV) { if (!e.fx) { e.fx = makeTeleport(TPV, levelRoot, e.x, e.y); bolt.position.x = e.x; bolt.position.y = e.y; } updateTeleport(e.fx, bolt, BOLT_S, dt, spark); return; }
  const t = G.end, B = e.beam;
  B.beam.material.opacity = Math.min(0.85, t * 2.2) * (t > 1.35 ? Math.max(0, 1 - (t - 1.35) * 3) : 1);
  B.rings.forEach((r, i) => { const k = (t * 0.9 + i / 3) % 1; r.position.y = 0.15 + k * 3.4; r.scale.setScalar(1 - k * 0.35); r.material.opacity = (1 - k) * Math.min(1, t * 3) * (t > 1.35 ? 0 : 0.9); });
  bolt.position.x += (e.x - bolt.position.x) * Math.min(1, dt * 5);
  if (t < 0.35) { bolt.position.y = e.y + t * 0.6; }
  else if (t < 1.1) { // Bolt incelip uzar ve ışığa dönüşür
    const k = (t - 0.35) / 0.75; bolt.position.y = e.y + 0.2 + k * 1.6;
    bolt.scale.set(BOLT_S * (1 - k), BOLT_S * (1 + k * 0.8), BOLT_S * (1 - k)); bolt.visible = k < 0.98;
    if (Math.random() < 0.7) spark(e.x + (Math.random() - 0.5) * 0.6, bolt.position.y + Math.random() * 1.2);
  } else if (!B.flashed) { B.flashed = true; bolt.visible = false; for (let i = 0; i < 26; i++) spark(e.x + (Math.random() - 0.5) * 1.2, e.y + 1.5 + Math.random() * 1.5, 1.6); sfx.checkpoint(); }
  B.flash.material.opacity = t > 1.0 && t < 1.6 ? Math.sin((t - 1.0) / 0.6 * Math.PI) * 0.9 : 0; B.flash.scale.setScalar(2 + (t - 1) * 4);
}
const sparkGeo = new THREE.SphereGeometry(0.06, 6, 4); sparkGeo.userData.shared = true;
const sparkMat = new THREE.MeshBasicMaterial({ color: 0x9af6ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
function spark(x, y, k = 1) { const m = add(new THREE.Mesh(sparkGeo, sparkMat)); m.position.set(x, y, 0.5); ents.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 1.5 * k, (1.5 + Math.random() * 2.5) * k, 0), t: 0, spark: true }); }

// ---------- Parçacıklar ----------
const partGeo = new THREE.SphereGeometry(0.07, 6, 4); partGeo.userData.shared = true;
function burst(x, y, color, n) {
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) { const m = add(new THREE.Mesh(partGeo, mat)); m.position.set(x, y, 0.3); ents.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 3), t: 0 }); }
}
function updateParts(dt) {
  for (let i = ents.parts.length - 1; i >= 0; i--) {
    const q = ents.parts[i]; q.t += dt; q.v.y -= (q.dust ? 1 : q.spark ? -1.5 : 14) * dt; if (q.dust) q.v.x *= 1 - dt * 3;
    q.m.position.addScaledVector(q.v, dt); q.m.scale.setScalar(Math.max(0, 1 - q.t * 1.4));
    if (q.t > 0.7) { levelRoot.remove(q.m); ents.parts.splice(i, 1); }
  }
}

// ---------- Kamera ----------
const cam = { x: 0, y: 0, look: 0, dirT: 0, dir: 1 }; let camSnap = true, camBase = 2, shake = 0;
function updateCamera(dt) {
  const p = player; if (!p) return;
  // önden bakma: Bolt aynı yöne 0,4 sn yürüyünce yavaşça kayar; kısa ters basışlarda kamera kıpırdamaz
  const md = Math.abs(p.vx) > 1 ? Math.sign(p.vx) : 0;
  if (md && md !== cam.dir) { cam.dirT += dt; if (cam.dirT > 0.4) { cam.dir = md; cam.dirT = 0; } } else cam.dirT = 0;
  cam.look += (cam.dir * 1.6 - cam.look) * Math.min(1, dt * 1.3);
  let tx = Math.max(7, Math.min(L.w - 7, p.x + cam.look));
  const b = ents.boss; if (b && b.wallsUp) tx = (b.x0 + b.x1) / 2; // boss savaşında arena sabit
  // dikey: yerdeyken basılan yüksekliğe oturur; havada yalnızca çok yükselince/düşünce takip eder
  if (p.ground || p.y < camBase - 1.2 || p.y > camBase + 1.6) camBase += (p.y - (p.ground ? 0 : 1.2) - camBase) * Math.min(1, dt * (p.ground ? 3 : 2.2));
  const ty = camBase + 1.6;
  if (camSnap) { camBase = p.y; cam.look = cam.dir * 1.6; tx = Math.max(7, Math.min(L.w - 7, p.x + cam.look)); cam.x = tx; cam.y = camBase + 1.6; camSnap = false; }
  cam.x += (tx - cam.x) * Math.min(1, dt * 3.2); cam.y += (ty - cam.y) * Math.min(1, dt * 2.6);
  shake = Math.max(0, shake - dt); const sx = shake ? (Math.random() - 0.5) * shake * 0.5 : 0, sy = shake ? (Math.random() - 0.5) * shake * 0.5 : 0;
  const dist = b && b.wallsUp ? 13.5 : 11.2;
  camera.position.set(cam.x + sx, cam.y + 0.1 + sy, dist); camera.lookAt(cam.x + sx, cam.y - 0.15 + sy, 0);
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
  save.unlocked = Math.max(save.unlocked, Math.min(40, G.n + 1)); store();
  setTimeout(() => {
    const last = G.n === 20 || G.n === 40;
    $('endTitle').textContent = G.n === 20 ? 'Yeşil Vadi Kurtarıldı!' : G.n === 40 ? 'Mantar Ormanı Kurtarıldı!' : 'Bölüm Tamam!';
    $('endStars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= s ? 'on' : ''}">★</span>`).join('');
    $('endInfo').innerHTML = `<img class="ci" src="props/coin_ui.webp" alt=""> ${G.coins}/${G.coinsTotal} &nbsp; 🐾 ${G.cages}/${ents.cages.length} &nbsp; <img class="ci ${G.star ? '' : 'dim'}" src="props/star.webp" alt=""><small>⭐ Bitir ✔ • ⭐ Bütün hayvanlar ${G.cages >= ents.cages.length ? '✔' : '✘'} • ⭐ Altın: ${G.coins}/${Math.ceil(G.coinsTotal * 0.8)} gerekli ${G.coins >= Math.ceil(G.coinsTotal * 0.8) ? '✔' : '✘'}</small><small>(${G.coinsTotal} altının ${ents.crates.length * 3} tanesi sandıklardan çıkar)</small>${G.n === 20 ? '<small>🍄 Yeni dünya açıldı: Mantar Ormanı!</small>' : G.n === 40 ? '<small>🚀 Sıradaki dünya: Güneş Kanyonu — yakında!</small>' : ''}`;
    $('next').classList.toggle('hidden', G.n === 40);
    showScreen('end');
  }, G.n === 20 || G.n === 40 ? 4200 : 1900);
}
function lose() {
  G.state = 'lose'; sfx.lose(); player.lastAnim = ''; anim.play('fall', { once: true, fade: 0.15 }); bolt.visible = true;
  setTimeout(() => {
    $('endTitle').textContent = 'Canın Bitti';
    $('endStars').innerHTML = '';
    $('endInfo').innerHTML = worldOf(G.n) === 2 ? 'Mantarcıkların üstüne zıpla; salyangozu önce şimşekle vur!' : 'Böceklerin üstüne zıpla, kirpiden ve dikenlerden uzak dur!';
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
let mapWorld = 1;
function renderMap(w = null) {
  if (w) mapWorld = w; else mapWorld = G.n && L ? worldOf(G.n) : Math.min(2, worldOf(save.unlocked));
  const o = (mapWorld - 1) * 20, best = (n) => save.best[n] || {};
  const ns = Array.from({ length: 20 }, (_, i) => o + i + 1);
  const totalStars = ns.reduce((a, n) => a + (best(n).stars || 0), 0), crystals = ns.filter((n) => best(n).star).length;
  $('mapTitle').textContent = mapWorld === 2 ? '🍄 Mantar Ormanı' : '🌿 Yeşil Vadi';
  $('mapInfo').innerHTML = `⭐ ${totalStars}/60 &nbsp; <img class="ci" src="props/star.webp" alt=""> ${crystals}/20`;
  $('w1').classList.toggle('on', mapWorld === 1); $('w2').classList.toggle('on', mapWorld === 2); $('w2').classList.toggle('lock', save.unlocked < 21);
  $('levels').classList.toggle('w2', mapWorld === 2);
  $('levels').innerHTML = ns.map((n) => {
    const d = LEVELS[n - 1], b = best(n), lock = n > save.unlocked;
    return `<button class="lv ${lock ? 'lock' : ''} ${d.boss ? 'boss' : ''}" data-lv="${n}" ${lock ? 'disabled' : ''}><b>${lock ? '🔒' : d.boss ? '👑' : n - o}</b><small>${d.name}</small><span class="st">${[1, 2, 3].map((k) => `<i class="${k <= (b.stars || 0) ? 'on' : ''}">★</i>`).join('')}${b.star ? '<img src="props/star.webp" alt="">' : ''}</span></button>`;
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
  btn('bF', () => { input.fire = true; }, () => {});
  const K = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
  window.addEventListener('keydown', (e) => { if (K[e.key]) input[K[e.key]] = true; if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && !e.repeat) { input.jump = true; input.jumpPressed = true; } if ((e.key === 'f' || e.key === 'x') && !e.repeat) input.fire = true; unlockAudio(); });
  window.addEventListener('keyup', (e) => { if (K[e.key]) input[K[e.key]] = false; if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') input.jump = false; });
  const click = (id, f) => $(id).addEventListener('click', () => { unlockAudio(); f(); });
  click('play', () => renderMap());
  click('mapBack', () => showScreen('menu'));
  click('w1', () => renderMap(1));
  click('w2', () => { if (save.unlocked >= 21) renderMap(2); else toast('🔒 Önce Yeşil Vadi\'yi kurtar'); });
  $('levels').addEventListener('click', (e) => { const b = e.target.closest('[data-lv]'); if (b && !b.disabled) { unlockAudio(); loadLevel(+b.dataset.lv); } });
  click('pause', () => { if (G.state === 'play') { G.state = 'pause'; showScreen('paused'); } });
  click('resume', () => { G.state = 'play'; showScreen(null); });
  click('restart', () => loadLevel(G.n));
  click('toMap', () => renderMap());
  click('again', () => loadLevel(G.n));
  click('next', () => loadLevel(Math.min(40, G.n + 1)));
  click('endMap', () => renderMap());
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') { G.state = 'pause'; showScreen('paused'); } });
}

// ---------- Geliştirici modu (#dev): çarpışma kutuları, devriyeler, altın alanları, zıplama rotası ----------
const DEV = { on: /dev/.test(location.hash), g: null };
const devMat = (c) => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true });
function devBox(g, x0, y0, x1, y1, c) { const p = [x0, y0, 0.9, x1, y0, 0.9, x1, y0, 0.9, x1, y1, 0.9, x1, y1, 0.9, x0, y1, 0.9, x0, y1, 0.9, x0, y0, 0.9]; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); const l = new THREE.LineSegments(geo, devMat(c)); l.renderOrder = 99; g.add(l); }
function devLine(g, pts, c) { const geo = new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => new THREE.Vector3(x, y, 0.9))); const l = new THREE.Line(geo, devMat(c)); l.renderOrder = 99; g.add(l); }
function updateDev() {
  if (DEV.g) { scene.remove(DEV.g); DEV.g.traverse((o) => o.geometry?.dispose()); DEV.g = null; }
  if (!DEV.on || !L || !player) return;
  const g = DEV.g = new THREE.Group(); toActor(g); scene.add(g); const p = player;
  devBox(g, p.x - P.PW / 2, p.y, p.x + P.PW / 2, p.y + P.PH, 0x00ff66);
  for (const e of ents.enemies) if (e.alive) { devBox(g, e.x - e.w / 2, e.y, e.x + e.w / 2, e.y + e.h, 0xff3333); devLine(g, [[e.x0, e.y + 0.05], [e.x1, e.y + 0.05]], 0xffaa00); }
  for (const c of ents.coins) if (!c.taken && Math.abs(c.x - p.x) < 12) devBox(g, c.x - P.COIN_X - P.PW / 2, c.y - P.PH - P.COIN_UP, c.x + P.COIN_X + P.PW / 2, c.y + P.COIN_DOWN, 0xffee00);
  for (const t of L.thorns) devBox(g, t.x0 + 0.15, t.y, t.x1 - 0.15, t.y + 0.55, 0xff00ff);
  // zıplama rotası: kısa ve uzun zıplama (şu anki konum ve yönden)
  for (const [hold, col] of [[0.05, 0x66ccff], [9, 0x0066ff]]) {
    const q = { ...p, ground: true, coyote: 0.1, buffer: 0, vx: p.face * P.RUN, vy: 0 }; const inp = { left: p.face < 0, right: p.face > 0, jump: true, jumpPressed: true }; const pts = [[q.x, q.y]];
    for (let t = 0; t < 2; t += 1 / 60) { inp.jump = t < hold; stepPlayer(L, q, inp, 1 / 60); pts.push([q.x, q.y]); if (t > 0.1 && q.ground) break; }
    devLine(g, pts, col);
  }
}
const PH_C = P.PH + 0.4;
{ let taps = 0, tt = 0; document.getElementById('coins').parentElement.addEventListener('pointerdown', () => { const now = performance.now(); taps = now - tt < 600 ? taps + 1 : 1; tt = now; if (taps >= 5) { taps = 0; if (!DEV.on) { DEV.on = true; addDevBtn(); save.unlocked = 40; store(); } else DEV.show = !DEV.show; toast(DEV.show ? 'Geliştirici modu açık' : 'Geliştirici modu kapalı'); } }); }
function addDevBtn() { const b = document.createElement('button'); b.textContent = 'DEV'; b.style.cssText = 'position:fixed;top:60px;right:14px;z-index:9;padding:6px 10px;border-radius:10px;border:0;background:#ff0;font-weight:800'; b.onclick = () => { DEV.show = !DEV.show; }; DEV.show = true; document.body.appendChild(b); }
if (DEV.on) addDevBtn();

// ---------- Döngü ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30) * (window.__ts || 1);
  G.t += dt; G.inv = Math.max(0, G.inv - dt);
  if (L && (G.state === 'play' || G.state === 'win' || G.state === 'lose')) {
    updateRafts(L, G.t, dt);
    if (AUTO) autopilot();
    if (G.state === 'play') updatePlayer(dt);
    else if (G.state === 'win') G.end += dt;
    if (DEV.on) { const sh = DEV.show; DEV.on = sh; updateDev(); DEV.on = true; if (!sh && DEV.g) { scene.remove(DEV.g); DEV.g = null; } }
    updateGun(dt); updateEnemies(dt); updateBoss(dt); updateShip(dt); updateItems(dt); updateParts(dt); updateCamera(dt);
    anim.update(dt);
  } else if (G.state === 'menu') { menuCam(dt); }
  renderer.clear();
  camera.layers.set(0); renderer.render(scene, camera);
  renderer.clearDepth(); const bg = scene.background; scene.background = null;
  camera.layers.set(ACTOR); renderer.render(scene, camera); scene.background = bg;
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

window.KB2 = { tpTest(v, t) { const e = { x: L.end.x, y: L.end.y }; if (!window.__fx || window.__fx.kind !== v) { window.__fx = makeTeleport(v, levelRoot, e.x, e.y); bolt.position.set(e.x, e.y, 0); bolt.scale.setScalar(BOLT_S); bolt.visible = true; bolt.rotation.set(0, 0.8, 0); } const fx = window.__fx; while (fx.t < t) { updateTeleport(fx, bolt, BOLT_S, 1 / 60, spark); updateParts(1 / 60); } }, get anim() { return anim; }, G, input, ents, get L() { return L; }, get player() { return player; }, load: loadLevel, save, tp: (x) => { player.x = x; player.y = L.cols[Math.floor(x)] + 0.05; player.vx = player.vy = 0; camSnap = true; } };

(async function boot() {
  bindControls();
  await Promise.all([loadRobotModel(), ...Object.keys(SPEC).map(loadModel)]);
  setWorldTheme(1);
  // menü arka planı için 1. bölümün dünyasını kur
  clearLevel(); seed(1); L = buildLevel(1); buildWorld(levelRoot, L); L = null;
  renderer.compile(scene, camera);
  $('splash').classList.add('hide');
  const m = location.hash.match(/lv=(\d+)/);
  if (m) loadLevel(+m[1]); else { G.state = 'menu'; showScreen('menu'); }
  frame();
})();
