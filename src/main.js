// Kaptan Bolt 2 — Yeşil Vadi deneme bölümü (2.5D platform)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { loadRobotModel } from './game/robotModel.js';
import { makeRobot, SKINS } from './game/robot.js';
import { buildLevel } from './level.js';
import { buildWorld, backdrop, makeCoin, makeCage, CAGE_W, CAGE_H, makeSpring, makeFlag, waveFlag } from './world.js';
import { sfx, unlockAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7cc8ff);
scene.fog = new THREE.Fog(0xbfe6ff, 30, 95);
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 400);

// ışıklar: gökyüzü + sıcak güneş (gölge oyuncuyu takip eder)
scene.add(new THREE.HemisphereLight(0xdff3ff, 0x5a7a3a, 1.55));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
sun.position.set(8, 16, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -8, near: 1, far: 60 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
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
// fit: hedef boy (y) ya da genişlik; yaw: modelin önünü +X'e (sağa) çevirmek için
const SPEC = {
  bocek: { size: 1.25, fit: 'w', yaw: Math.PI / 2 },
  kirpi: { size: 1.3, fit: 'w', yaw: Math.PI / 2 },
  kus: { size: 0.9, fit: 'h', yaw: 0.35 },
  tilki: { size: 0.95, fit: 'h', yaw: 0.35 + Math.PI / 4 },
  maymun: { size: 1.0, fit: 'h', yaw: 0.35 },
};
function loadModel(n) {
  return new Promise((ok) => gl.load(`models/${n}.glb`, (g) => {
    const sp = SPEC[n], m = g.scene, wrap = new THREE.Group();
    m.rotation.y = sp.yaw; wrap.add(m); wrap.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(wrap), sz = b.getSize(new THREE.Vector3());
    const s = sp.size / (sp.fit === 'h' ? sz.y : Math.max(sz.x, sz.z));
    wrap.scale.setScalar(s); const c = b.getCenter(new THREE.Vector3());
    wrap.position.set(-c.x * s, -b.min.y * s, -c.z * s);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.roughness = Math.max(0.45, o.material.roughness ?? 0.6); } });
    const holder = new THREE.Group(); holder.add(wrap); MODELS[n] = holder; ok();
  }, undefined, () => ok()));
}
const cloneM = (n) => (MODELS[n] ? MODELS[n].clone(true) : new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff00ff })));

// ---------- Oyun durumu ----------
const G = { t: 0, state: 'load', coins: 0, coinsTotal: 0, cages: 0, hearts: 3, cp: null, inv: 0, won: false };
let L, player, bolt, anim;
const ents = { coins: [], enemies: [], cages: [], springs: [], flags: [], parts: [] };

// Fizik sabitleri
// Fizik (birim = kare). Hedef his: çevik koşu, hızlı çıkış, tepede kısa asılı kalma, hızlı düşüş.
const RUN = 8.4, ACC = 75, AIR_ACC = 48, FRICT = 70, TURN = 2.2;           // TURN: ters yöne dönerken ekstra fren
const G_UP = 50, G_DOWN = 82, G_APEX = 0.55, MAXFALL = 24;               // çıkış/düşüş yerçekimi, tepe yumuşatma
const JUMP = Math.sqrt(2 * G_UP * 3.75);                                 // tuşu tutunca 3.75 kare
const SPRING = Math.sqrt(2 * G_UP * 9.2), STOMP = Math.sqrt(2 * G_UP * 2.2), STOMP_HOLD = Math.sqrt(2 * G_UP * 4.2);
const PW = 0.62, PH = 1.22; // oyuncu kutusu (yarı genişlik değil, tam)

const BOLT_S = 1.12 * 1.2;
const input = { left: false, right: false, jump: false, jumpPressed: false };

function setupLevel() {
  L = buildLevel();
  buildWorld(scene, L);
  backdrop(scene, L.w);
  for (const c of L.coins) { const m = makeCoin(); m.position.set(c.x, c.y, 0); scene.add(m); ents.coins.push({ ...c, m, taken: false, ph: Math.random() * 6 }); }
  G.coinsTotal = L.coins.length;
  for (const e of L.enemies) {
    const m = cloneM(e.type); const holder = new THREE.Group(); holder.add(m); scene.add(holder);
    const gy = L.cols[Math.floor(e.x)];
    ents.enemies.push({ type: e.type, x: e.x, y: gy, vx: e.type === 'kirpi' ? -1.1 : -1.5, w: e.type === 'kirpi' ? 1.1 : 1.05, h: e.type === 'kirpi' ? 0.95 : 0.8, m: holder, alive: true, squash: 0, ph: Math.random() * 6 });
  }
  for (const c of L.cages) {
    const g = makeCage(); g.position.set(c.x, c.y, 0); scene.add(g);
    const a = cloneM(c.animal); a.position.set(0, 0.5, 0.05); a.scale.multiplyScalar(1.15); g.add(a);
    ents.cages.push({ x: c.x, y: c.y, animalKind: c.animal, m: g, animal: a, open: false, t: 0 });
  }
  for (const s of L.springs) { const m = makeSpring(); m.position.set(s.x, s.y, 0); scene.add(m); ents.springs.push({ ...s, m, t: 1 }); }
  for (const cp of L.checkpoints) { const m = makeFlag(false); m.position.set(cp.x + 0.5, L.cols[cp.x], -0.6); scene.add(m); ents.flags.push({ x: cp.x + 0.5, m, on: false, big: false }); }
  const ef = makeFlag(true); ef.position.set(L.end.x, L.cols[Math.floor(L.end.x)], -0.4); scene.add(ef); ents.flags.push({ x: L.end.x, m: ef, end: true });

  bolt = makeRobot(SKINS[1]); // kaptan şapkalı Bolt
  bolt.scale.setScalar(BOLT_S);
  bolt.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  if (bolt.userData.fill) bolt.userData.fill.intensity = 0.8;
  scene.add(bolt);
  anim = bolt.userData.anim;
  player = { x: L.start.x, y: L.start.y, vx: 0, vy: 0, ground: false, face: 1, coyote: 0, buffer: 0, lastAnim: '' };
  G.cp = { x: L.start.x, y: L.start.y };
  updateHud();
}

// ---------- Çarpışma ----------
const solidAt = (x, y) => L.solid(Math.floor(x), Math.floor(y));
function moveX(o, dx, w, h) {
  o.x += dx;
  const y0 = o.y + 0.02, y1 = o.y + h - 0.02;
  if (dx > 0) { const xr = o.x + w / 2; for (let y = Math.floor(y0); y <= Math.floor(y1); y++) if (L.solid(Math.floor(xr), y)) { o.x = Math.floor(xr) - w / 2 - 0.001; return true; } }
  else if (dx < 0) { const xl = o.x - w / 2; for (let y = Math.floor(y0); y <= Math.floor(y1); y++) if (L.solid(Math.floor(xl), y)) { o.x = Math.floor(xl) + 1 + w / 2 + 0.001; return true; } }
  return false;
}
function moveY(o, dy, w, h) {
  o.y += dy;
  const x0 = o.x - w / 2 + 0.03, x1 = o.x + w / 2 - 0.03;
  if (dy < 0) { for (let x = Math.floor(x0); x <= Math.floor(x1); x++) if (L.solid(x, Math.floor(o.y))) { o.y = Math.floor(o.y) + 1; return 'down'; } }
  else if (dy > 0) { const yt = o.y + h; for (let x = Math.floor(x0); x <= Math.floor(x1); x++) if (L.solid(x, Math.floor(yt))) { o.y = Math.floor(yt) - h - 0.001; return 'up'; } }
  return null;
}

// ---------- Oyuncu ----------
function playAnim(name, opts) { if (player.lastAnim === name) return; player.lastAnim = name; anim.play(name, opts); }
function hurt(fromX) {
  if (G.inv > 0 || G.state !== 'play') return;
  G.hearts--; G.inv = 1.6; sfx.hurt(); vibrate(60);
  player.vx = (player.x < fromX ? -1 : 1) * 7; player.vy = 9; player.ground = false;
  updateHud();
  if (G.hearts <= 0) lose();
}
function fallDeath() {
  if (G.state !== 'play') return;
  G.hearts--; sfx.hurt(); vibrate(80); updateHud();
  if (G.hearts <= 0) return lose();
  respawn();
}
function respawn() { player.x = G.cp.x; player.y = G.cp.y + 0.2; player.vx = player.vy = 0; G.inv = 1.4; camSnap = true; }

function updatePlayer(dt) {
  const p = player;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const acc = p.ground ? ACC : AIR_ACC;
  if (dir) {
    const turning = p.vx * dir < 0;
    p.vx += dir * acc * (turning ? TURN : 1) * dt; p.vx = Math.max(-RUN, Math.min(RUN, p.vx)); p.face = dir;
  } else { const f = (p.ground ? FRICT : FRICT * 0.35) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
  // zıplama: kenardan düştükten sonra 0,1 sn tolerans + erken basışı 0,13 sn hatırla
  p.coyote = p.ground ? 0.1 : p.coyote - dt;
  p.buffer = input.jumpPressed ? 0.13 : p.buffer - dt; input.jumpPressed = false;
  if (p.buffer > 0 && p.coyote > 0) { p.vy = JUMP; p.ground = false; p.coyote = 0; p.buffer = 0; p.cut = false; p.squash = -0.18; sfx.jump(); dust(p.x, p.y, 5); }
  // tuş erken bırakılırsa kısa zıpla (bir kez, yumuşak)
  if (!input.jump && !p.noCut && !p.cut && p.vy > 0) { p.vy *= 0.5; p.cut = true; }
  if (p.vy <= 0) p.noCut = false;
  let g = p.vy > 0 ? G_UP : G_DOWN;
  if (Math.abs(p.vy) < 2.2 && input.jump && !p.ground) g *= G_APEX; // tepede kısa asılı kalma
  p.vy = Math.max(-MAXFALL, p.vy - g * dt);
  moveX(p, p.vx * dt, PW, PH) && (p.vx = 0);
  const vyBefore = p.vy;
  const hit = moveY(p, p.vy * dt, PW, PH);
  if (hit === 'down') { if (!p.ground) { if (vyBefore < -8) { sfx.land(); dust(p.x, p.y, 6); } p.squash = Math.min(0.28, -vyBefore / 70); } p.ground = true; p.vy = 0; }
  else { if (hit === 'up') { p.vy = Math.min(0, p.vy); sfx.bump(); } p.ground = false; }
  if (p.y < -4) fallDeath();
  p.squash = (p.squash || 0) * Math.max(0, 1 - dt * 12);

  // görünüm
  bolt.position.set(p.x, p.y, 0);
  const sq = p.squash || 0; bolt.scale.set(BOLT_S * (1 + sq * 0.6), BOLT_S * (1 - sq), BOLT_S * (1 + sq * 0.6));
  const targetRot = p.face > 0 ? Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.35; // kameraya hafif dönük
  bolt.rotation.y += (targetRot - bolt.rotation.y) * Math.min(1, dt * 14);
  if (G.state === 'win') return;
  if (!p.ground) playAnim('jump', { once: true, fade: 0.08 });
  else if (Math.abs(p.vx) > 0.4) { playAnim('walk', { fade: 0.12, speed: 2 }); anim.play('walk', { speed: 1.1 + Math.abs(p.vx) / RUN * 1.6 }); }
  else playAnim('idle', { fade: 0.2 });
  bolt.visible = G.inv <= 0 || Math.floor(G.t * 16) % 2 === 0;
}

// ---------- Düşmanlar ----------
function updateEnemies(dt) {
  for (const e of ents.enemies) {
    if (!e.alive) { e.squash += dt; e.m.scale.y = Math.max(0.05, 1 - e.squash * 6); e.m.position.y -= dt * (e.squash > 0.3 ? 4 : 0); if (e.squash > 1) e.m.visible = false; continue; }
    // yürü; duvar ya da uçurum kenarında dön
    const nx = e.x + e.vx * dt, front = nx + Math.sign(e.vx) * e.w / 2;
    if (L.solid(Math.floor(front), Math.floor(e.y + 0.3)) || !L.solid(Math.floor(front), Math.floor(e.y - 0.5))) e.vx = -e.vx; else e.x = nx;
    e.ph += dt * Math.abs(e.vx) * 6;
    e.m.position.set(e.x, e.y + Math.abs(Math.sin(e.ph)) * 0.06, 0);
    e.m.rotation.y = e.vx > 0 ? 0 : Math.PI; e.m.rotation.z = Math.sin(e.ph) * 0.04;
    // oyuncuyla temas
    const p = player;
    if (G.state !== 'play' || Math.abs(p.x - e.x) > (PW + e.w) / 2 - 0.08 || p.y > e.y + e.h || p.y + PH < e.y + 0.1) continue;
    const stomp = p.vy < -1 && p.y > e.y + e.h * 0.45;
    if (stomp && e.type === 'bocek') { e.alive = false; p.vy = input.jump ? STOMP_HOLD : STOMP; p.noCut = true; sfx.stomp(); vibrate(30); burst(e.x, e.y + 0.5, 0xffa040, 10); }
    else if (stomp && e.type === 'kirpi') { p.vy = STOMP; hurt(e.x); }
    else hurt(e.x);
  }
}

// ---------- Para, kafes, mantar, bayrak ----------
function updateItems(dt) {
  const p = player;
  for (const c of ents.coins) {
    if (c.taken) { if (c.m.visible) { c.k += dt; c.m.position.y += dt * 5; c.m.scale.setScalar(Math.max(0, 1 - c.k * 3)); if (c.k > 0.35) c.m.visible = false; } continue; }
    c.m.rotation.y = G.t * 3 + c.ph; c.m.position.y = c.y + Math.sin(G.t * 3 + c.ph) * 0.05;
    if (Math.abs(p.x - c.x) < PW / 2 + 0.38 && c.y > p.y - 0.4 && c.y < p.y + PH + 0.4) { c.taken = true; c.k = 0; G.coins++; sfx.coin(); updateHud(); }
  }
  for (const s of ents.springs) {
    s.t = Math.min(1, s.t + dt * 4);
    const k = 1 - Math.sin(s.t * Math.PI) * 0.35; s.m.userData.cap.position.y = 0.5 * k; s.m.userData.coil.scale.y = k;
    if (p.vy <= 0 && Math.abs(p.x - s.x) < 0.75 && p.y >= s.y - 0.05 && p.y < s.y + 0.9) { p.vy = SPRING; p.noCut = true; p.ground = false; s.t = 0; sfx.spring(); vibrate(20); }
  }
  for (const c of ents.cages) {
    if (!c.open) {
      c.animal.rotation.y = Math.sin(G.t * 2 + c.x) * 0.4; c.animal.position.y = 0.5 + Math.abs(Math.sin(G.t * 4 + c.x)) * 0.05;
      if (Math.abs(p.x - c.x) < 1.0 && p.y > c.y - 1.2 && p.y < c.y + 3.2) openCage(c);
    } else {
      c.t += dt;
      for (const b of c.pieces) { b.position.addScaledVector(b.userData.v, dt); b.userData.v.y -= 14 * dt; b.rotation.z += b.userData.spin * dt; b.material.opacity = Math.max(0, 1 - c.t * 0.7); }
      // hayvan sevinçle zıplar, sonra uçarak / koşarak gider
      const a = c.animal;
      if (c.t < 1.2) { a.position.y = 0.5 + Math.abs(Math.sin(c.t * 9)) * 0.6; a.rotation.y = c.t * 6; }
      else { a.position.y += dt * (c.animalKind === 'kus' ? 3 : 0.3); a.position.x += dt * 3; a.rotation.y = 0.35; a.scale.multiplyScalar(1 - dt * 0.6); if (c.t > 3.5) a.visible = false; }
      if (c.t > 1.6) for (const b of c.pieces) b.visible = false;
    }
  }
  for (const f of ents.flags) {
    waveFlag(f.m, G.t + f.x);
    if (f.end) { if (!G.won && p.x > f.x - 0.3) win(f); continue; }
    if (!f.on && p.x > f.x - 0.5) {
      f.on = true; G.cp = { x: f.x, y: L.cols[Math.floor(f.x)] + 0.1 }; sfx.checkpoint(); toast('✔ Kontrol noktası');
      f.m.userData.cloth.material.color.setScalar(1); f.rise = 0;
    }
    if (f.on && f.rise < 1) { f.rise = Math.min(1, f.rise + dt * 1.5); f.m.userData.cloth.position.y = 0.9 + (2.2 - 0.9) * f.rise; }
  }
}
function openCage(c) {
  c.open = true; c.t = 0;
  G.cages++; updateHud(); sfx.cage(); vibrate(50);
  // kafes resmi 4x4 parçaya bölünüp dağılır
  for (const sp of c.m.userData.sprites) sp.visible = false; c.pieces = [];
  const N = 4, pw = CAGE_W / N, ph = CAGE_H / N;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const geo = new THREE.PlaneGeometry(pw, ph); const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / N, (j + uv.getY(k)) / N);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: c.m.userData.tex, transparent: true, alphaTest: 0.2, toneMapped: false, side: THREE.DoubleSide }));
    m.position.set(-CAGE_W / 2 + (i + 0.5) * pw, -0.12 + (j + 0.5) * ph, 0.55);
    m.userData.v = new THREE.Vector3((i - 1.5) * 1.6 + (Math.random() - 0.5) * 2, 3 + j * 1.2 + Math.random() * 3, 1.5 + Math.random() * 2);
    m.userData.spin = (Math.random() - 0.5) * 10;
    c.m.add(m); c.pieces.push(m);
  }
  burst(c.x, c.y + 0.8, 0xffe070, 18);
  const names = { kus: 'Mavi Kuş', tilki: 'Tilki', maymun: 'Maymun' };
  toast(`🐾 ${names[c.animalKind] || 'Dostun'} kurtarıldı! ${G.cages}/${ents.cages.length}`);
}

// ---------- Parçacıklar ----------
const partGeo = new THREE.SphereGeometry(0.07, 6, 4);
function burst(x, y, color, n) {
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(partGeo, mat); m.position.set(x, y, 0.3); scene.add(m); ents.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 3), t: 0 }); }
}
const dustGeo = new THREE.SphereGeometry(0.12, 8, 6), dustMat = new THREE.MeshBasicMaterial({ color: 0xf3ead2, transparent: true, opacity: 0.8 });
function dust(x, y, n) {
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(dustGeo, dustMat); m.position.set(x + (Math.random() - 0.5) * 0.5, y + 0.08, 0.4 + Math.random() * 0.3); scene.add(m); ents.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3.5, 0.6 + Math.random() * 1.2, 0), t: 0, dust: true }); }
}
function updateParts(dt) {
  for (let i = ents.parts.length - 1; i >= 0; i--) {
    const q = ents.parts[i]; q.t += dt; q.v.y -= (q.dust ? 1 : 14) * dt; if (q.dust) q.v.x *= 1 - dt * 3; q.m.position.addScaledVector(q.v, dt); q.m.scale.setScalar(Math.max(0, 1 - q.t * 1.4));
    if (q.t > 0.7) { scene.remove(q.m); ents.parts.splice(i, 1); }
  }
}

// ---------- Kamera ----------
const cam = { x: 0, y: 0 }; let camSnap = true, camBase = 2;
function updateCamera(dt) {
  const lookAhead = player.face * 2.2 + player.vx * 0.12;
  const tx = Math.max(6, Math.min(L.w - 6, player.x + lookAhead));
  // dikey: yerdeyken oyuncunun yüksekliğine otur, havadayken sadece çok yükselince/düşünce takip et
  if (player.ground || player.y < camBase - 1.5 || player.y > camBase + 3.2) camBase += (player.y - camBase) * Math.min(1, dt * (player.ground ? 4 : 6));
  const ty = camBase + 1.7;
  if (camSnap) { camBase = player.y; cam.x = tx; cam.y = camBase + 1.7; camSnap = false; }
  cam.x += (tx - cam.x) * Math.min(1, dt * 4.5); cam.y += (ty - cam.y) * Math.min(1, dt * 2.4);
  camera.position.set(cam.x, cam.y + 0.35, 10.4); camera.lookAt(cam.x, cam.y - 0.15, 0);
  sun.position.set(cam.x + 7, 17, 10); sun.target.position.set(cam.x, 0, 0);
}

// ---------- Bitiş / kayıp ----------
function stars() { return 1 + (G.cages === ents.cages.length ? 1 : 0) + (G.coins >= Math.ceil(G.coinsTotal * 0.8) ? 1 : 0); }
function win(f) {
  G.won = true; G.state = 'win'; sfx.win(); vibrate(120);
  player.vx = 0; player.lastAnim = ''; anim.play('cheer', { fade: 0.2 }); bolt.rotation.y = 0;
  burst(f.x, 4, 0xffd23a, 30);
  setTimeout(() => {
    const s = stars();
    $('endTitle').textContent = 'Bölüm Tamam!';
    $('endStars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= s ? 'on' : ''}">★</span>`).join('');
    $('endInfo').innerHTML = `🪙 ${G.coins}/${G.coinsTotal} &nbsp; 🐾 ${G.cages}/${ents.cages.length}<small>⭐ Bitir • ⭐ Tüm hayvanları kurtar • ⭐ Paraların %80'ini topla</small>`;
    $('end').classList.remove('hidden');
  }, 1800);
}
function lose() {
  G.state = 'lose'; sfx.lose();
  setTimeout(() => {
    $('endTitle').textContent = 'Canın Bitti';
    $('endStars').innerHTML = '';
    $('endInfo').innerHTML = `Paslı yaratıklara dikkat! Kirpinin üstüne zıplama, böceklerin üstüne zıpla.`;
    $('end').classList.remove('hidden');
  }, 800);
}

// ---------- Arayüz ----------
function updateHud() {
  $('hearts').innerHTML = [0, 1, 2].map((i) => `<i class="${i < G.hearts ? '' : 'off'}">❤</i>`).join('');
  $('coins').textContent = G.coins;
  $('cages').textContent = `${G.cages}/${ents.cages.length || 3}`;
}
let toastT = 0;
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 1800); }
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* yok */ } }

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
  $('again').addEventListener('click', () => location.reload());
  $('pause').addEventListener('click', () => { if (G.state === 'play') { G.state = 'pause'; $('paused').classList.remove('hidden'); } });
  $('resume').addEventListener('click', () => { G.state = 'play'; $('paused').classList.add('hidden'); });
  $('restart').addEventListener('click', () => location.reload());
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') { G.state = 'pause'; $('paused').classList.remove('hidden'); } });
}

// ---------- Döngü ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  G.t += dt; G.inv = Math.max(0, G.inv - dt);
  if (G.state === 'play' || G.state === 'win' || G.state === 'lose') {
    if (AUTO) autopilot();
    if (G.state === 'play') updatePlayer(dt); else { bolt.position.set(player.x, player.y, 0); }
    updateEnemies(dt); updateItems(dt); updateParts(dt); updateCamera(dt);
    anim.update(dt);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
// Otopilot: sağa koşar; duvar, boşluk, düşman ve kafes platformlarına göre zıplar (test ve tanıtım videosu için)
const AUTO_JUMP = [[60.4, 0], [64.6, 0], [101.6, 0]];
function autopilot() {
  const p = player; if (!p || G.state !== 'play') return;
  input.right = true; input.left = false;
  const ahead = (d) => Math.floor(p.x + d);
  const groundAt = (d) => { for (let y = Math.floor(p.y) - 1; y >= Math.floor(p.y) - 2; y--) if (L.solid(ahead(d), y)) return true; return false; };
  let jump = false;
  if (p.ground) {
    if (L.solid(ahead(0.9), Math.floor(p.y + 0.5))) jump = true;
    if (!groundAt(1.2)) jump = true;
    for (const e of ents.enemies) if (e.alive && e.x > p.x && e.x - p.x < (e.type === 'kirpi' ? 2.8 : 2.7) && Math.abs(e.y - p.y) < 1) jump = true;
    for (const [x, hold] of AUTO_JUMP) if (Math.abs(p.x - x) < 0.25) { jump = true; }
  }
  if (jump && !input.jump) { input.jump = true; input.jumpPressed = true; autoHold = 0.35; }
  autoHold -= 1 / 60; if (autoHold <= 0 && p.vy < 6) input.jump = false;
}
let autoHold = 0, AUTO = /auto/.test(location.hash);
window.KB2 = { G, input, ents, get L() { return L; }, get player() { return player; }, set: (o) => Object.assign(player, o) };

(async function boot() {
  bindControls();
  await Promise.all([loadRobotModel(), ...Object.keys(SPEC).map(loadModel)]);
  setupLevel();
  updateCamera(0);
  renderer.compile(scene, camera);
  $('splash').classList.add('hide');
  G.state = 'play';
  toast('Yeşil Vadi 1-1 • 3 hayvanı kurtar!');
  frame();
})();
