// 3D sahne: zindan, tahta, robot, animasyonlar ve kamera
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { THEMES, makeMaterials, makeTile, makePit, makeKey, makeDoor, makeRobot, setRobotFace } from './models.js';
import { tween, ease, updateTweens, clearTweens, wait } from './tween.js';
import { HOLE, ICE } from '../logic/rules.js';

const DIR_ANGLE = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };
const DIR_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = 'high';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.safe = { top: 200, bottom: 140 };
    this.paused = false;
    this.clock = new THREE.Clock();
    this._setupLights();
    this.setQuality('high');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    const loop = (now) => { requestAnimationFrame(loop); if (!this.paused) this._frame(now); };
    requestAnimationFrame(loop);
  }

  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(dpr, q === 'high' ? 2 : 1.5));
    this.renderer.shadowMap.enabled = true;
    if (q === 'high') {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.8);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    } else { this.composer = null; }
    this.resize();
  }

  _setupLights() {
    this.hemi = new THREE.HemisphereLight(0x9d8cff, 0x140c30, 0.9); this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xdfe8ff, 1.6);
    sun.position.set(-3, 9, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun); this.sun = sun;
    this.under = new THREE.PointLight(0x3fe2ff, 12, 9); this.under.position.set(0, -1.2, 1); this.scene.add(this.under);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.W = w; this.H = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.composer) { this.composer.setSize(w, h); this.bloom.resolution.set(w / 2, h / 2); }
    if (this.board) this.fitCamera();
  }

  setSafe(top, bottom) { this.safe = { top, bottom }; if (this.board) this.fitCamera(); }

  // ---------- Tema ve arka plan ----------
  setTheme(world) {
    const th = THEMES[world] || THEMES[1];
    this.th = th; this.world = world;
    this.M = makeMaterials(th);
    this.scene.background = new THREE.Color(th.bg);
    this.scene.fog = new THREE.Fog(th.fog, 22, 45);
    this.hemi.color.set(th.hemi);
  }

  _buildBackdrop(w, h) {
    const M = this.M, th = this.th, g = new THREE.Group();
    const pw = w + 0.5, pd = h + 0.5, bz = -h / 2 - 2.6;
    const rnd = mulberry(w * 31 + h * 7 + this.world);
    // platform ve uçurum
    g.add(mesh(new RoundedBoxGeometry(pw, 0.5, pd, 4, 0.15), M.rock, [0, -0.35, 0]));
    for (let i = 0; i < 14; i++) {
      const bw = 0.5 + rnd() * 0.6, bh = 1 + rnd() * 1.6;
      const b = mesh(new THREE.BoxGeometry(bw, bh, 0.6), i % 2 ? M.rock : M.rock2, [-pw / 2 + 0.3 + (i * (pw - 0.6)) / 13, -0.6 - bh / 2, pd / 2 - 0.2 - rnd() * 0.3]);
      b.rotation.y = (rnd() - 0.5) * 0.3; g.add(b);
    }
    // yan sütunlar, meşaleler, kristaller
    this.flames = [];
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 9; i++) g.add(mesh(new RoundedBoxGeometry(1.3, 0.62, 1.1, 2, 0.06), i % 2 ? M.rock2 : M.rock, [sx * (pw / 2 + 0.9) + (i % 2) * 0.08 * sx, -1 + i * 0.66, bz + 1]));
      const f = mesh(new THREE.SphereGeometry(0.13, 16, 16), M.flame, [sx * (pw / 2 + 0.25), 2.3, bz + 1.6], false); f.scale.y = 1.6; g.add(f);
      const tl = new THREE.PointLight(th.torch, 14, 6); tl.position.set(sx * (pw / 2 + 0.1), 2.3, bz + 1.9); g.add(tl);
      this.flames.push({ f, tl, seed: rnd() * 10 });
      for (let k = 0; k < 3; k++) {
        const cr = mesh(new THREE.OctahedronGeometry(0.18 + k * 0.08), M.crystal, [sx * (pw / 2 + 0.1 + k * 0.3), -0.3 + k * 0.1, pd / 2 - 0.1 - k * 0.4]);
        cr.scale.y = 2; cr.rotation.z = sx * 0.3 * (k + 1); g.add(cr);
      }
    }
    for (let i = -3; i <= 3; i++) {
      g.add(mesh(new THREE.TorusGeometry(0.7, 0.16, 8, 20, Math.PI), M.rock2, [i * 1.9, 1.4, bz - 2.5]));
      g.add(mesh(new THREE.BoxGeometry(0.3, 2, 0.3), M.rock2, [i * 1.9 - 0.7, 0.4, bz - 2.5]));
      g.add(mesh(new THREE.BoxGeometry(0.3, 2, 0.3), M.rock2, [i * 1.9 + 0.7, 0.4, bz - 2.5]));
    }
    g.add(mesh(new THREE.PlaneGeometry(40, 16), M.wall, [0, 2, bz - 3], false));
    // süzülen parçacıklar (buz dünyasında kar)
    const pa = [];
    for (let i = 0; i < 140; i++) pa.push((rnd() - 0.5) * 10, rnd() * 6 - 1.5, (rnd() - 0.5) * 10);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3));
    this.particles = new THREE.Points(pg, new THREE.PointsMaterial({ color: th.particle, size: this.world === 3 ? 0.07 : 0.045, transparent: true, opacity: 0.85 }));
    g.add(this.particles);
    return g;
  }

  // ---------- Bölüm kurulumu ----------
  build(board, state) {
    clearTweens();
    this.root.clear();
    this.board = board;
    this.hintMesh = null;
    const { w, h } = board;
    this.root.add(this._buildBackdrop(w, h));
    this.tiles = new Map(); this.keys = new Map();
    for (let i = 0; i < board.cells.length; i++) {
      const p = this.cellPos(i);
      if (board.cells[i] === HOLE) { const pit = makePit(this.M); pit.position.copy(p); this.root.add(pit); continue; }
      const pit = makePit(this.M); pit.position.copy(p); this.root.add(pit);
      if (state.collapsed[i]) continue;
      const t = makeTile(this.M, board.cells[i] === ICE, i * 7 + 3);
      t.position.copy(p); this.root.add(t); this.tiles.set(i, t);
    }
    board.keys.forEach((ci, k) => {
      if (state.keysTaken[k]) return;
      const key = makeKey(); key.position.copy(this.cellPos(ci)).add(new THREE.Vector3(0, 0.8, 0));
      key.userData.phase = k * 1.3; this.root.add(key); this.keys.set(k, key);
    });
    this.door = makeDoor(); this.door.position.copy(this.cellPos(board.door)).add(new THREE.Vector3(0, 0.18, -0.12));
    this.root.add(this.door);
    this._setDoorOpen(state.keysTaken.every(Boolean), false);
    this.robot = makeRobot(); this.robot.position.copy(this.cellPos(state.pos)).add(new THREE.Vector3(0, 0.18, 0));
    this.robot.userData.turn.rotation.y = 0;
    this.root.add(this.robot);
    this.mood = 'idle'; setRobotFace(this.robot, 'idle');
    this.fitCamera();
  }

  cellPos(i) {
    const b = this.board, x = i % b.w, y = Math.floor(i / b.w);
    return new THREE.Vector3(x - (b.w - 1) / 2, 0, y - (b.h - 1) / 2);
  }

  fitCamera() {
    const b = this.board, cam = this.camera;
    const tall = (this.H - this.safe.top - this.safe.bottom) / this.W > 1.25;
    const el = THREE.MathUtils.degToRad(this.menuMode ? 38 : tall ? 56 : 50);
    const pts = [];
    const hx = b.w / 2 + 0.25, hz = b.h / 2 + 0.25;
    for (const x of [-hx, hx]) { pts.push(new THREE.Vector3(x, -0.6, hz), new THREE.Vector3(x, 0.2, -hz), new THREE.Vector3(x, 1.25, -hz + 0.5), new THREE.Vector3(x, -0.4, -hz)); }
    const availW = this.W - 24, availH = this.H - this.safe.top - this.safe.bottom;
    cam.clearViewOffset();
    const place = (d) => { cam.position.set(0, d * Math.sin(el), d * Math.cos(el)); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); };
    const box = () => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) { const v = p.clone().project(cam); const sx = (v.x + 1) / 2 * this.W, sy = (1 - v.y) / 2 * this.H; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
      return { x0, x1, y0, y1 };
    };
    let lo = 2, hi = 60;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2; place(mid); const bb = box();
      if (bb.x1 - bb.x0 <= availW && bb.y1 - bb.y0 <= availH) hi = mid; else lo = mid;
    }
    place(hi);
    const bb = box();
    const offY = (bb.y0 + bb.y1) / 2 - (this.safe.top + (this.H - this.safe.bottom)) / 2;
    cam.setViewOffset(this.W, this.H, 0, offY, this.W, this.H);
    cam.updateProjectionMatrix();
  }

  // ---------- Animasyonlar ----------
  async play(events) {
    for (const e of events) {
      if (e.t === 'collapse') this._collapse(e.cell);
      else if (e.t === 'step') await this._step(e);
      else if (e.t === 'key') this._takeKey(e.index);
      else if (e.t === 'doorOpen') this._setDoorOpen(true, true);
      else if (e.t === 'win') await this._winAnim();
      else if (e.t === 'stuck') await this._stuckAnim();
    }
  }

  face(dir) {
    const turn = this.robot.userData.turn;
    const from = turn.rotation.y; let to = DIR_ANGLE[dir];
    while (to - from > Math.PI) to -= 2 * Math.PI;
    while (to - from < -Math.PI) to += 2 * Math.PI;
    return tween(90, (t) => { turn.rotation.y = from + (to - from) * t; }, ease.outQuad);
  }

  async _step({ from, to, slide }) {
    const a = this.cellPos(from), b = this.cellPos(to);
    const dir = b.x > a.x ? 'right' : b.x < a.x ? 'left' : b.z > a.z ? 'down' : 'up';
    if (!slide) this.face(dir);
    const r = this.robot, U = r.userData;
    if (this.onSound) this.onSound(slide ? 'slide' : 'step');
    this.mood = 'move';
    await tween(slide ? 110 : 170, (t) => {
      r.position.x = a.x + (b.x - a.x) * t; r.position.z = a.z + (b.z - a.z) * t;
      r.position.y = 0.18 + (slide ? 0 : Math.sin(Math.PI * t) * 0.28);
      const sw = slide ? 0 : Math.sin(t * Math.PI * 2) * 0.6;
      U.legL.rotation.x = sw; U.legR.rotation.x = -sw; U.armL.rotation.x = -sw; U.armR.rotation.x = sw;
      U.body.rotation.x = slide ? -0.18 : 0;
    }, slide ? ease.linear : ease.inOutQuad);
    U.body.rotation.x = 0; U.legL.rotation.x = U.legR.rotation.x = U.armL.rotation.x = U.armR.rotation.x = 0;
    this.mood = 'idle';
  }

  bump(dir) {
    const r = this.robot; if (!r) return;
    this.face(dir);
    const [dx, dz] = DIR_VEC[dir];
    const base = r.position.clone();
    return tween(140, (t) => { const k = Math.sin(Math.PI * t) * 0.12; r.position.x = base.x + dx * k; r.position.z = base.z + dz * k; });
  }

  _collapse(cell) {
    const t = this.tiles.get(cell); if (!t) return;
    this.tiles.delete(cell);
    if (this.onSound) this.onSound('collapse');
    const body = t.userData.body;
    const mat = body.material.clone(); mat.transparent = true; body.material = mat;
    t.children.forEach((c) => { if (c !== body && c.material) { c.material = c.material.clone(); c.material.transparent = true; } });
    const base = t.position.clone();
    // parçalar
    const shards = [];
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.3, 0.4, 2, 0.05), mat);
      s.position.set(base.x + (k % 2 ? 0.21 : -0.21), 0, base.z + (k > 1 ? 0.21 : -0.21)); s.visible = false; s.castShadow = true;
      this.root.add(s); shards.push(s);
    }
    tween(120, (u) => { t.position.x = base.x + Math.sin(u * 40) * 0.04; t.position.y = -u * 0.05; }).then(() => {
      t.visible = false; shards.forEach((s) => (s.visible = true));
      const spin = shards.map(() => [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4]);
      return tween(650, (u) => {
        shards.forEach((s, k) => {
          s.position.y = -u * u * 3.2;
          s.position.x += (s.position.x - base.x) * 0.02;
          s.position.z += (s.position.z - base.z) * 0.02;
          s.rotation.x = spin[k][0] * u; s.rotation.z = spin[k][1] * u;
        });
        mat.opacity = 1 - u;
      }, ease.linear);
    }).then(() => { shards.forEach((s) => this.root.remove(s)); this.root.remove(t); });
  }

  _takeKey(k) {
    const key = this.keys.get(k); if (!key) return;
    this.keys.delete(k);
    if (this.onSound) this.onSound('key');
    const y0 = key.position.y;
    key.userData.taken = true;
    tween(450, (t) => {
      key.position.y = y0 + t * 1.2; key.userData.inner.rotation.y = t * 12;
      key.scale.setScalar(1 + Math.sin(Math.PI * t) * 0.5 - t * 0.9);
      key.userData.glow.intensity = 3 + t * 10;
    }, ease.outQuad).then(() => this.root.remove(key));
    this._burst(key.position.clone(), 0xffd54a);
  }

  _setDoorOpen(open, animate) {
    const U = this.door.userData;
    this.doorOpen = open;
    if (!animate) {
      U.portalMat.color.set(open ? 0x7ff6ff : 0xb35cff); U.light.color.set(open ? 0x5ff3ff : 0xb060ff);
      U.lock.visible = !open; return;
    }
    if (this.onSound) this.onSound('door');
    const c0 = new THREE.Color(0xb35cff), c1 = new THREE.Color(0x7ff6ff);
    tween(700, (t) => {
      U.portalMat.color.copy(c0).lerp(c1, t); U.light.color.copy(new THREE.Color(0xb060ff)).lerp(new THREE.Color(0x5ff3ff), t);
      U.light.intensity = 8 + Math.sin(Math.PI * t) * 25;
      U.lockMat.opacity = 1 - t; U.lock.scale.setScalar(1 + t * 0.8);
      U.ring.material.opacity = (1 - t) * 0.9; U.ring.scale.setScalar(1 + t * 3);
    }, ease.outQuad).then(() => { U.lock.visible = false; });
  }

  async _winAnim() {
    this.mood = 'happy'; setRobotFace(this.robot, 'happy');
    const r = this.robot, d = this.door.position;
    await tween(380, (t) => { r.position.y = 0.18 + Math.sin(Math.PI * t) * 0.6; r.userData.turn.rotation.y += 0.25; }, ease.linear);
    this._burst(d.clone().add(new THREE.Vector3(0, 0.6, 0)), 0x7ff6ff);
    await tween(380, (t) => { r.scale.setScalar(1.2 * (1 - t)); r.position.y = 0.18 + t * 0.5; }, ease.inQuad);
  }

  async _stuckAnim() {
    this.mood = 'sad'; setRobotFace(this.robot, 'sad');
    const h = this.robot.userData.head;
    await tween(600, (t) => { h.rotation.y = Math.sin(t * Math.PI * 4) * 0.35 * (1 - t); h.rotation.z = -0.15 * t; });
  }

  _burst(pos, color) {
    const n = 24, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { arr.set([pos.x, pos.y, pos.z], i * 3); vel.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3)); }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.09, transparent: true });
    const p = new THREE.Points(geo, mat); this.root.add(p);
    tween(700, (t) => {
      for (let i = 0; i < n; i++) { arr[i * 3] = pos.x + vel[i].x * t; arr[i * 3 + 1] = pos.y + vel[i].y * t - 3 * t * t; arr[i * 3 + 2] = pos.z + vel[i].z * t; }
      geo.attributes.position.needsUpdate = true; mat.opacity = 1 - t;
    }).then(() => this.root.remove(p));
  }

  showHint(dir) {
    this.clearHint();
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.95, depthTest: false });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.42), mat); shaft.position.z = 0.15; g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 3), mat); head.rotation.x = Math.PI / 2; head.position.z = 0.48; g.add(head);
    g.rotation.y = DIR_ANGLE[dir];
    const [dx, dz] = DIR_VEC[dir];
    g.position.copy(this.robot.position).add(new THREE.Vector3(dx * 0.35, 0, dz * 0.35)).setY(0.3);
    g.scale.setScalar(1.3);
    g.userData = { dir };
    g.renderOrder = 10; g.children.forEach((c) => (c.renderOrder = 10));
    this.root.add(g); this.hintMesh = g;
    this.face(dir);
  }
  clearHint() { if (this.hintMesh) { this.root.remove(this.hintMesh); this.hintMesh = null; } }

  // ---------- Kare döngüsü ----------
  _frame(now) {
    updateTweens(now);
    const t = this.clock.getElapsedTime();
    if (this.keys) for (const key of this.keys.values()) {
      if (key.userData.taken) continue;
      key.userData.inner.rotation.y = t * 1.6 + key.userData.phase;
      key.userData.inner.position.y = Math.sin(t * 2.2 + key.userData.phase) * 0.06;
    }
    if (this.robot && this.mood !== 'move') {
      const U = this.robot.userData;
      U.body.position.y = Math.sin(t * 2.4) * 0.015;
      const blink = (t % 3.4) < 0.12 ? 0.1 : 1;
      if (this.mood === 'idle') { U.eyeL.scale.y = U.eyeR.scale.y = blink; }
      if (this.menuMode) { U.armR.rotation.z = -0.25 - Math.max(0, Math.sin(t * 3)) * 1.6; U.turn.rotation.y = Math.sin(t * 0.6) * 0.4; }
    }
    if (this.flames) for (const f of this.flames) { const k = 1 + Math.sin(t * 9 + f.seed) * 0.08 + Math.sin(t * 23 + f.seed) * 0.05; f.f.scale.set(k, 1.6 * k, k); f.tl.intensity = 14 * k; }
    if (this.particles) { this.particles.rotation.y = t * 0.03; this.particles.position.y = this.world === 3 ? -((t * 0.25) % 2) + 1 : Math.sin(t * 0.3) * 0.2; }
    if (this.hintMesh) { const k = (Math.sin(t * 6) + 1) / 2; this.hintMesh.children.forEach((c) => (c.material.opacity = 0.5 + k * 0.5)); }
    if (this.door && this.doorOpen) this.door.userData.light.intensity = 9 + Math.sin(t * 3) * 2;
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}

function mesh(g, m, p = [0, 0, 0], cast = true) { const o = new THREE.Mesh(g, m); o.position.set(...p); o.castShadow = cast; o.receiveShadow = true; return o; }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
