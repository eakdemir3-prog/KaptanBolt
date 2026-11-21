// 3D sahne: zindan, tahta, robot, animasyonlar ve kamera
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { makeDecor } from './decor.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { THEMES, PORTAL_COLORS, makeMaterials, makeTile, makeStrongTile, makePortalTile, makePit, makeKey, makeDoor, makeRobot, setRobotFace, makeEnemy, makeBoss, makeBridgeTile, makeBridgeGhost, makeButtonTile, makeArrowTile, makeLift, makeShip, makeCrate, makeColorKey, makeGate, makeGear, makeLabel, drawTimer, makeZzz, makeDangerMark, SKINS } from './models.js';
import { tween, ease, updateTweens, clearTweens, wait } from './tween.js';
import { HOLE, ICE, STRONG, BRIDGE, BUTTON, ARROW_DIR, doorOpen, gnawerNext, laserCells, floorOf, floorCount, isLift, floorStartRow } from '../logic/rules.js';

const DIR_ANGLE = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };
const DIR_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const FLOOR_Y = 14;
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
    this.base = new THREE.Group(); this.scene.add(this.base); this.root = this.base; this.floorG = [this.base]; this.floor = 0;
    this.safe = { top: 200, bottom: 140 };
    this.bonusCell = -1;
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
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.35, 0.93);
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
    this.scene.add(sun); this.scene.add(sun.target); this.sun = sun;
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
    const dec = makeDecor(this.world, pw, pd, bz, rnd, M.rock2); g.add(dec.group); this.decorAnim = dec.anim;
    return g;
  }

  // ---------- Bölüm kurulumu ----------
  build(board, state) {
    clearTweens();
    this.base.clear();
    this.board = board; this.state = state;
    this.hintMesh = null;
    const { w, h } = board;
    // iki katlı bölüm: her kat kendi grubunda; 2. kat FLOOR_Y yukarıda, asansörler tam üst üste
    this.floorG = [new THREE.Group()]; this.base.add(this.floorG[0]);
    if (board.floors) {
      // her kat bir öncekinin FLOOR_Y üstünde; asansör çiftleri tam üst üste gelecek şekilde kaydırılır
      const pairs = board.liftPairs;
      for (let f = 1; f < floorCount(board); f++) {
        const g = new THREE.Group(); this.floorG.push(g); this.base.add(g);
        const pr = pairs[f - 1];
        const lo = pr.find((i) => floorOf(board, i) === f - 1), hi = pr.find((i) => floorOf(board, i) === f);
        const pa = this.cellPos(lo).add(this.floorG[f - 1].position), pb = this.cellPos(hi);
        g.position.set(pa.x - pb.x, FLOOR_Y * f, pa.z - pb.z);
      }
    }
    // 2. kat taşları biraz farklı renkte: yeni kata çıkıldığı belli olsun
    const M1 = this.M, W1 = this.world, TH1 = this.th;
    const MF = [M1], FT = board.floorThemes;
    for (let f = 1; f < this.floorG.length; f++) {
      if (FT) { MF.push(makeMaterials(THEMES[FT[f]] || TH1)); continue; }
      const m = { ...M1, tile: M1.tile.clone(), side: M1.side.clone() }; m.tile.color.offsetHSL(0.06 * f, 0.05, 0.09); m.side.color.offsetHSL(0.06 * f, 0, 0.06); MF.push(m);
    }
    if (FT) MF[0] = makeMaterials(THEMES[FT[0]] || TH1);
    const useFloor = (f) => { this.root = this.floorG[f]; this.M = MF[f]; if (FT) { this.world = FT[f]; this.th = THEMES[FT[f]] || TH1; } };
    const onFloor = (i) => useFloor(floorOf(board, i));
    for (let f = 0; f < this.floorG.length; f++) { useFloor(f); this.root.add(this._buildBackdrop(w, this.floorH(f))); }
    this.tiles = new Map(); this.keys = new Map(); this.portals = []; this.bridges = []; this.button = null; this.arrowTiles = []; this.zzz = []; this.dangerMarks = [];
    const pairId = new Map(); let pc = 0;
    for (let i = 0; i < board.cells.length; i++) if (board.portal[i] > i) pairId.set(i, pc++);
    for (let i = 0; i < board.cells.length; i++) {
      const p = this.cellPos(i);
      if (board.floors && this.floorRow(i) < 0) continue; // katlar arası ayırıcı satırlar
      onFloor(i);
      if (board.cells[i] === HOLE) { const pit = makePit(this.M); pit.position.copy(p); this.root.add(pit); continue; }
      const pit = makePit(this.M); pit.position.copy(p); this.root.add(pit);
      if (state.collapsed[i]) continue;
      let t;
      if (board.cells[i] === BRIDGE) {
        if (!state.pressed) { const gh = makeBridgeGhost(); gh.position.copy(p); this.root.add(gh); this.bridges.push({ i, ghost: gh }); continue; }
        t = makeBridgeTile();
      } else if (board.cells[i] === BUTTON) { t = makeButtonTile(this.M); this.button = t; if (state.pressed) this._pressButton(false); }
      else if (ARROW_DIR[board.cells[i]]) { t = makeArrowTile(this.M, ARROW_DIR[board.cells[i]]); this.arrowTiles.push(t); }
      else if (board.cells[i] === STRONG) { t = makeStrongTile(this.M); t.userData.cracks.visible = !!state.hits[i]; }
      else if (board.floors && isLift(board, i)) { t = makeLift(floorOf(board, i) < floorOf(board, board.portal[i]) ? 'up' : 'down'); }
      else if (board.portal[i] >= 0) { t = makePortalTile(this.M, PORTAL_COLORS[pairId.get(Math.min(i, board.portal[i])) % 4]); this.portals.push(t); }
      else t = makeTile(this.M, board.cells[i] === ICE, i * 7 + 3);
      t.position.copy(p); this.root.add(t); this.tiles.set(i, t);
    }
    // düşmanlar ve boss
    this.lasers = [];
    this.enemyMeshes = state.enemies.map((e) => {
      if (!e.alive) return null;
      onFloor(e.pos);
      const m = makeEnemy(e.type); m.position.copy(this.cellPos(e.pos)).add(new THREE.Vector3(0, 0.18, 0));
      m.userData.turn.rotation.y = DIR_ANGLE[e.dir] ?? 0; m.userData.type = e.type; m.userData.phase = Math.random() * 6;
      this.root.add(m);
      if (e.type === 'patrol' || e.type === 'gnawer') { const a = makeArrow(e.type === 'gnawer' ? 0x9aff3a : 0xffd23a); m.userData.arrow = a; this.root.add(a); this._placeArrow(m, e); }
      if (e.type === 'sentry') m.userData.beams = [];
      if (state.moves === 0) { const z = makeZzz(); z.position.copy(m.position).add(new THREE.Vector3(0.15, 0.95, 0)); this.root.add(z); this.zzz.push(z); }
      return m;
    });
    this.bossMesh = null;
    if (state.boss && state.boss.alive) {
      onFloor(state.boss.pos); const bm = makeBoss(this.world); bm.position.copy(this._bossPos(state.boss.pos)); this.root.add(bm); this.bossMesh = bm;
      if (state.moves === 0) { const z = makeZzz(); z.scale.setScalar(0.8); z.position.copy(bm.position).add(new THREE.Vector3(0.4, 2.5, 0)); this.root.add(z); this.zzz.push(z); }
    }
    board.keys.forEach((ci, k) => {
      if (state.keysTaken[k]) return;
      onFloor(ci);
      const key = makeKey(); key.position.copy(this.cellPos(ci)).add(new THREE.Vector3(0, 0.8, 0));
      key.userData.phase = k * 1.3; this.root.add(key); this.keys.set(k, key);
    });
    // kutular, doldurulmuş çukurlar, renkli anahtar/bariyer, zamanlı taşlar, gizli dişli
    this.boxMeshes = []; this.fillMeshes = new Map(); this.ckeys = new Map(); this.gates = new Map(); this.timers = new Map(); this.gearMesh = null;
    (state.box || []).forEach((p, bi) => { if (p < 0) return; onFloor(p); const c = makeCrate(); c.position.copy(this.cellPos(p)).setY(0.18); this.root.add(c); this.boxMeshes[bi] = c; });
    if (state.fill) state.fill.forEach((f, i) => { if (!f) return; onFloor(i); const c = makeCrate(); c.position.copy(this.cellPos(i)).setY(0.18 - 0.62); this.root.add(c); this.fillMeshes.set(i, c); });
    for (let i = 0; i < board.cells.length; i++) {
      const ck = board.ckey[i], gt = board.gate[i];
      if (ck && !(state.cks & ck)) { onFloor(i); const k = makeColorKey(ck); k.position.copy(this.cellPos(i)).add(new THREE.Vector3(0, 0.8, 0)); k.userData.phase = i; this.root.add(k); this.ckeys.set(i, k); }
      if (gt && !(state.cks & gt) && !state.collapsed[i]) { onFloor(i); const g = makeGate(gt); g.position.copy(this.cellPos(i)); this.root.add(g); this.gates.set(i, g); }
    }
    for (const [c, n] of board.timed || []) {
      if (state.collapsed[c] || !this.tiles.has(c)) continue;
      const lb = makeLabel(); lb.position.set(0, 0.2, 0); this.tiles.get(c).add(lb);
      this.timers.set(c, { lb, n }); drawTimer(lb, n - state.moves);
    }
    if (board.gear >= 0 && !state.gear && this.tiles.has(board.gear)) { onFloor(board.gear); const g = makeGear(); g.position.copy(this.cellPos(board.gear)).add(new THREE.Vector3(0, 0.7, 0)); this.root.add(g); this.gearMesh = g; }
    // bonus altın
    this.bonusMesh = null;
    if (this.bonusCell >= 0 && this.tiles.has(this.bonusCell)) {
      onFloor(this.bonusCell);
      const c = makeBonusCoin(); c.position.copy(this.cellPos(this.bonusCell)).add(new THREE.Vector3(0, 0.62, 0)); this.root.add(c); this.bonusMesh = c;
    }
    onFloor(board.door);
    this.door = makeDoor(); this.door.position.copy(this.cellPos(board.door)).add(new THREE.Vector3(0, 0.18, -0.12));
    this.root.add(this.door);
    this._setDoorOpen(doorOpen(state), false);
    onFloor(state.pos); this.M = M1; if (FT) { this.world = W1; this.th = TH1; } this.floor = this.shownFloor = floorOf(board, state.pos); this._syncFloor();
    this.robot = makeRobot(this.skin || SKINS[0]);
    if (!this.robot.userData.glb) this.robot.userData.head.rotation.x = -0.42; // üstten bakan kamerada yüz görünsün
    this._pendingFrozen = (state.frozen || 0) > 0; this.robot.position.copy(this.cellPos(state.pos)).add(new THREE.Vector3(0, 0.18, 0));
    this.robot.userData.turn.rotation.y = 0;
    this.root.add(this.robot);
    this.mood = 'idle'; setRobotFace(this.robot, 'idle');
    this.fitCamera();
    this.setFrozen(this._pendingFrozen);
  }

  cellPos(i) {
    const b = this.board, x = i % b.w, y = Math.floor(i / b.w);
    if (!b.floors) return new THREE.Vector3(x - (b.w - 1) / 2, 0, y - (b.h - 1) / 2);
    const f = floorOf(b, i), hf = this.floorH(f), ly = y - this.floorStart(f);
    return new THREE.Vector3(x - (b.w - 1) / 2, 0, ly - (hf - 1) / 2); // katın kendi grubuna göre
  }
  floorStart(f) { const b = this.board; return b.fh ? floorStartRow(b, f) : 0; }
  floorH(f) { const b = this.board; return b.fh ? b.fh[f] : b.h; }
  /** -1: ayırıcı satır */
  floorRow(i) {
    const b = this.board, y = Math.floor(i / b.w);
    for (let f = 0; f < floorCount(b); f++) { const st = this.floorStart(f), hf = this.floorH(f); if (y >= st && y < st + hf) return y - st; }
    return -1;
  }
  /** Robotun bulunduğu kat görünür, öbürü gizli; ışıklar o kata kayar */
  _syncFloor() {
    this.floorG.forEach((g, f) => (g.visible = f === this.floor));
    const FT = this.board && this.board.floorThemes;
    if (FT && THEMES[FT[this.floor]]) { const th = THEMES[FT[this.floor]]; this.scene.background = new THREE.Color(th.bg); this.scene.fog = new THREE.Fog(th.fog, 22, 45); this.hemi.color.set(th.hemi); }
    this.root = this.floorG[this.floor] || this.base;
    const o = this.root.position;
    if (this.sun) { this.sun.position.set(-3 + o.x, 9 + o.y, 5 + o.z); this.sun.target.position.copy(o); this.sun.target.updateMatrixWorld(); }
    if (this.under) this.under.position.set(o.x, o.y - 1.2, o.z + 1);
  }

  fitCamera() {
    const b = this.board, cam = this.camera;
    const tall = (this.H - this.safe.top - this.safe.bottom) / this.W > 1.25;
    const el = THREE.MathUtils.degToRad(this.menuMode ? 38 : tall ? 56 : 50);
    const pts = [];
    const hx = b.w / 2 + 0.25, hz = this.floorH(this.floor) / 2 + 0.25;
    const C = (this.floorG[this.floor] || this.base).position.clone();
    for (const x of [-hx, hx]) { pts.push(new THREE.Vector3(x, -0.6, hz), new THREE.Vector3(x, 0.2, -hz), new THREE.Vector3(x, 1.25, -hz + 0.5), new THREE.Vector3(x, -0.4, -hz)); }
    const availW = this.W - 24, availH = this.H - this.safe.top - this.safe.bottom;
    cam.clearViewOffset();
    for (const p of pts) p.add(C);
    const place = (d) => { cam.position.set(C.x, C.y + d * Math.sin(el), C.z + d * Math.cos(el)); cam.lookAt(C); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); };
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
  async play(events, state) {
    this.state = state;
    const group = [];
    const flush = async () => { if (group.length) { await Promise.all(group.splice(0)); } };
    for (const e of events) {
      const enemyEv = ['enemyMove', 'enemyFall', 'enemyWait', 'bossMove', 'bossFall', 'bossWait', 'bossCharge', 'laser', 'laserCharge'].includes(e.t);
      if (enemyEv) { group.push(this._enemyEvent(e)); continue; }
      await flush();
      if (e.t === 'collapse') this._collapse(e.cell);
      else if (e.t === 'crack') this._crack(e.cell);
      else if (e.t === 'teleport') await this._teleport(e);
      else if (e.t === 'caught') await this._caughtAnim();
      else if (e.t === 'bridgeOpen') this._openBridges();
      else if (e.t === 'wake') this._wake();
      else if (e.t === 'frozen') this.setFrozen(e.left > 0);
      else if (e.t === 'step') await this._step(e);
      else if (e.t === 'key') this._takeKey(e.index);
      else if (e.t === 'doorOpen') this._setDoorOpen(true, true);
      else if (e.t === 'win') await this._winAnim();
      else if (e.t === 'stuck') await this._stuckAnim();
      else if (e.t === 'squash') await this._squash(e);
      else if (e.t === 'push') this._push(e);
      else if (e.t === 'unfill') this._unfill(e.cell);
      else if (e.t === 'ckey') this._takeColorKey(e);
      else if (e.t === 'gear') this._takeGear();
    }
    await flush();
    if (state) this.enemyMeshes.forEach((m, k) => { if (m && m.userData.arrow) this._placeArrow(m, state.enemies[k]); });
  }

  _bossPos(pos) {
    const a = this.cellPos(pos), b = this.cellPos(pos + this.board.w + 1);
    return a.add(b).multiplyScalar(0.5).setY(0.18);
  }
  _placeArrow(m, e) {
    const a = m.userData.arrow; if (!a) return;
    if (!e.alive) { a.visible = false; return; }
    // devriyenin bir sonraki adımı (önü kapalıysa geri döner)
    const st = this.state, b = this.board;
    if (e.type === 'gnawer') {
      const nx = st ? gnawerNext(st, e) : { d: e.dir };
      if (!nx) { a.visible = false; return; }
      const [gx, gz] = DIR_VEC[nx.d];
      a.visible = true; a.rotation.y = DIR_ANGLE[nx.d];
      a.position.copy(this.cellPos(e.pos)).add(new THREE.Vector3(gx * 0.55, 0.2, gz * 0.55));
      return;
    }
    let d = e.dir;
    const free = (dir) => { const [dx, dz] = DIR_VEC[dir]; const x = e.pos % b.w + dx, y = Math.floor(e.pos / b.w) + dz; if (x < 0 || y < 0 || x >= b.w || y >= b.h) return false; const n = y * b.w + x; return b.cells[n] !== HOLE && !(st && st.collapsed[n]) && n !== b.door; };
    const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (!free(d)) d = free(OPP[d]) ? OPP[d] : null;
    if (!d) { a.visible = false; return; }
    const [dx, dz] = DIR_VEC[d];
    a.visible = true; a.rotation.y = DIR_ANGLE[d];
    a.position.copy(this.cellPos(e.pos)).add(new THREE.Vector3(dx * 0.55, 0.2, dz * 0.55));
  }

  async _enemyEvent(e) {
    if (e.t === 'laserCharge') return this._laserCharge(e);
    if (e.t === 'laser') return this._laserFire(e);
    if (e.t === 'bossCharge') {
      const bm = this.bossMesh; if (!bm) return;
      const U = bm.userData;
      return tween(260, (t) => { U.body.scale.y = 1 - Math.sin(Math.PI * t) * 0.08; U.light.intensity = (bm.userData.glb ? 2.5 : 10) + Math.sin(Math.PI * t) * (bm.userData.glb ? 10 : 25); });
    }
    if (e.t === 'enemyWait' || e.t === 'bossWait') return wait(120);
    const isBoss = e.id === 'boss';
    const m = isBoss ? this.bossMesh : this.enemyMeshes[e.id];
    if (!m) return;
    const U = m.userData;
    const a = m.position.clone();
    const b = isBoss ? this._bossPos(e.to) : this.cellPos(e.to).setY(0.18);
    const turn = U.turn; const r0 = turn.rotation.y; let r1 = DIR_ANGLE[e.dir];
    while (r1 - r0 > Math.PI) r1 -= 2 * Math.PI; while (r1 - r0 < -Math.PI) r1 += 2 * Math.PI;
    await tween(isBoss ? 260 : 190, (t) => {
      m.position.x = a.x + (b.x - a.x) * t; m.position.z = a.z + (b.z - a.z) * t;
      m.position.y = 0.18 + Math.sin(Math.PI * t) * (isBoss ? 0.35 : 0.18);
      turn.rotation.y = r0 + (r1 - r0) * Math.min(1, t * 2);
    }, ease.inOutQuad);
    if (isBoss) { this.shake(0.12, 220); if (this.onSound) this.onSound('stomp'); }
    if (e.t === 'enemyFall' || e.t === 'bossFall') {
      if (this.onSound) this.onSound(isBoss ? 'bossFall' : 'enemyFall');
      if (U.arrow) U.arrow.visible = false;
      this._burst(b.clone().add(new THREE.Vector3(0, 0.4, 0)), isBoss ? 0xff4a2a : 0xffd54a);
      await tween(isBoss ? 900 : 600, (t) => { m.position.y = 0.18 - t * t * (isBoss ? 5 : 4); m.rotation.z = t * (isBoss ? 1.2 : 3); m.scale.setScalar((isBoss ? 1 : 1) * (1 - t * 0.6)); }, ease.linear);
      if (isBoss) this.shake(0.3, 500);
      m?.removeFromParent();
      if (isBoss) this.bossMesh = null; else this.enemyMeshes[e.id] = null;
    }
  }

  /** Nöbetçi ateşe hazırlanıyor: ışın yolu kırmızı yanıp söner */
  _laserCharge(e) {
    this._clearLaser(e.id);
    const m = this.enemyMeshes[e.id]; if (!m || !e.cells.length) return wait(80);
    const g = this._beam(m, e.cells, 0.05, 0xff3ad8, 0.7); g.userData.blink = true;
    // yerde kırmızı uyarı şeritleri: bir sonraki hamlede ışın buradan geçecek
    const warn = new THREE.Group();
    const wm = new THREE.MeshBasicMaterial({ color: 0xff2a4a, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
    for (const c of e.cells) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), wm); q.rotation.x = -Math.PI / 2; q.position.copy(this.cellPos(c)).setY(0.215); warn.add(q); }
    warn.userData.blink = true; this.root.add(warn);
    this.lasers.push({ id: e.id, g }, { id: e.id, g: warn });
    if (this.onSound) this.onSound('wake');
    return tween(200, (t) => { m.userData.body.scale.setScalar(1 + Math.sin(Math.PI * t) * 0.08); });
  }
  /** Nöbetçi ateş eder: kalın, parlak ışın */
  async _laserFire(e) {
    this._clearLaser(e.id);
    const m = this.enemyMeshes[e.id]; if (!m || !e.cells.length) return;
    if (this.onSound) this.onSound('crack');
    const g = this._beam(m, e.cells, 0.17, 0xff6ae8, 1);
    const glowL = new THREE.PointLight(0xff3ad8, 6, 3); glowL.position.copy(this.cellPos(e.cells[Math.floor(e.cells.length / 2)])).setY(0.6); this.root.add(glowL);
    this.shake(0.04, 160);
    await tween(380, (t) => { g.children[0].scale.x = g.children[0].scale.z = 1 + Math.sin(Math.PI * t) * 0.6; g.children[0].material.opacity = 1 - t * t; glowL.intensity = 6 * (1 - t); });
    g?.removeFromParent(); glowL?.removeFromParent();
  }
  _beam(m, cells, r, color, opacity) {
    const a = m.position.clone().setY(0.62), b = this.cellPos(cells[cells.length - 1]).setY(0.62);
    const dir = b.clone().sub(a); const len = dir.length() + 0.45; dir.normalize();
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
    cyl.position.y = len / 2; g.add(cyl);
    g.position.copy(a); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.renderOrder = 6; this.root.add(g);
    return g;
  }
  _clearLaser(id) { this.lasers = this.lasers.filter((l) => { if (l.id === id) { l.g?.removeFromParent(); return false; } return true; }); }
  /** Robot böceğin üstüne bastı: böcek ezilir */
  async _squash(e) {
    const m = this.enemyMeshes[e.id]; if (!m) return;
    this.enemyMeshes[e.id] = null;
    if (m.userData.arrow) m.userData.arrow?.removeFromParent();
    if (this.onSound) this.onSound('enemyFall');
    this._burst(m.position.clone().setY(0.4), 0x9aff3a, 30);
    await tween(260, (t) => { m.scale.set(1 + t * 0.5, 1 - t * 0.9, 1 + t * 0.5); });
    m?.removeFromParent();
  }

  _pressButton(animate = true) {
    const b = this.button; if (!b) return;
    const cap = b.userData.cap;
    b.userData.capMat.color.set(0x3aff7a); b.userData.capMat.emissive.set(0x1ac04a);
    if (!animate) { cap.position.y = 0.22; return; }
    tween(150, (t) => { cap.position.y = 0.27 - t * 0.05; });
  }
  _openBridges() {
    this._pressButton(true);
    if (this.onSound) this.onSound('bridge');
    this.bridges.forEach(({ i, ghost }, k) => {
      ghost?.removeFromParent();
      const t = makeBridgeTile(); const p = this.cellPos(i); t.position.copy(p).setY(-1.2); t.rotation.z = 0.5;
      this.root.add(t); this.tiles.set(i, t);
      wait(k * 90).then(() => tween(420, (u) => { t.position.y = -1.2 + u * 1.2; t.rotation.z = 0.5 * (1 - u); }, ease.outBack));
    });
    this.bridges = [];
  }
  _wake() {
    for (const z of this.zzz) { const y0 = z.position.y; tween(350, (t) => { z.position.y = y0 + t * 0.6; z.material.opacity = 1 - t; }).then(() => z?.removeFromParent()); }
    this.zzz = [];
    if (this.onSound) this.onSound('wake');
  }
  /** Dondur gücü: düşmanlar buz mavisi parlar */
  setFrozen(on) {
    const list = [...(this.enemyMeshes || []), this.bossMesh].filter(Boolean);
    for (const m of list) m.traverse((o) => {
      if (!o.material || !o.material.emissive) return;
      if (o.userData.em0 === undefined) { o.userData.em0 = o.material.emissive.getHex(); o.userData.ei0 = o.material.emissiveIntensity; o.userData.emap = o.material.emissiveMap; }
      if (on) { o.material.emissive.set(0x3a9aff); o.material.emissiveIntensity = 0.55; o.material.emissiveMap = null; } else { o.material.emissive.setHex(o.userData.em0); o.material.emissiveIntensity = o.userData.ei0; o.material.emissiveMap = o.userData.emap; }
      o.material.needsUpdate = true;
    });
    this.frozenOn = on;
  }
  /** Yol Haritası gücü: sonraki hamlelerin okları */
  showPath(steps) {
    this.clearHint();
    const g = new THREE.Group();
    steps.forEach(({ from, dir }, k) => {
      const a = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: k === 0 ? 0xffd54a : 0xffe9a0, transparent: true, opacity: 0.95 - k * 0.2, depthTest: false });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.4), mat); shaft.position.z = 0.15; a.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.26, 3), mat); head.rotation.x = Math.PI / 2; head.position.z = 0.45; a.add(head);
      a.rotation.y = DIR_ANGLE[dir]; a.position.copy(this.cellPos(from)).setY(0.3); a.renderOrder = 10; a.children.forEach((c) => (c.renderOrder = 10));
      g.add(a);
    });
    this.root.add(g); this.hintMesh = g;
    if (steps[0]) this.face(steps[0].dir);
  }
  setDanger(cells) {
    for (const d of this.dangerMarks) d?.removeFromParent();
    const b = this.board;
    this.dangerMarks = cells.map((i) => { const m = makeDangerMark(); m.position.copy(this.cellPos(i)).setY(0.2); (b && b.floors ? this.floorG[floorOf(b, i)] : this.root).add(m); return m; });
  }
  setSkin(skin) {
    this.skin = skin;
    if (!this.robot) return;
    const r = makeRobot(skin); r.position.copy(this.robot.position); r.userData.turn.rotation.y = this.robot.userData.turn.rotation.y; if (!r.userData.glb) r.userData.head.rotation.x = -0.42;
    this.robot?.removeFromParent(); this.robot = r; this.root.add(r);
  }

  shake(amp, ms) {
    const cam = this.camera, base = cam.position.clone();
    return tween(ms, (t) => { const k = amp * (1 - t); cam.position.set(base.x + (Math.random() - 0.5) * k, base.y + (Math.random() - 0.5) * k, base.z); }).then(() => cam.position.copy(base));
  }

  _crack(cell) {
    const t = this.tiles.get(cell); if (!t) return;
    if (this.onSound) this.onSound('crack');
    const base = t.position.clone();
    tween(160, (u) => { t.position.x = base.x + Math.sin(u * 50) * 0.03; }).then(() => { t.position.copy(base); });
    if (t.userData.cracks) t.userData.cracks.visible = true;
  }

  async _teleport({ from, to }) {
    if (this.board.floors && isLift(this.board, from)) return this._liftRide(from, to);
    const r = this.robot, U = r.userData;
    if (this.onSound) this.onSound('teleport');
    this._burst(this.cellPos(from).setY(0.6), 0xff6ae8);
    await tween(200, (t) => { r.scale.setScalar(1.2 * (1 - t)); U.turn.rotation.y += 0.4; });
    r.position.copy(this.cellPos(to)).setY(0.18);
    this._burst(this.cellPos(to).setY(0.6), 0x6affe0);
    await tween(220, (t) => { r.scale.setScalar(1.2 * t); }, ease.outBack);
  }

  /** Asansör: kabin yerinde durur; eski kat aşağı kayıp kaybolur, yeni kat yukarıdan inip kabinin hizasına oturur.
   *  Asansör üst katta da aynı karede olduğundan kabin ekranda hiç yer değiştirmez. */
  async _liftRide(from, to) {
    const b = this.board, r = this.robot, A = floorOf(b, from), B = floorOf(b, to);
    const cap = this._liftCap || null; this._liftCap = null;
    const arrive = this.tiles.get(to);
    const gA = this.floorG[A], gB = this.floorG[B];
    const up = B > A ? 1 : -1, D = 8, D2 = 2.4;
    if (this.onSound) this.onSound('lift');
    const lamp = cap && cap.userData.lamp, glass = cap && cap.userData.glass;
    await tween(260, (t) => { if (lamp) lamp.scale.setScalar(1 + Math.sin(t * Math.PI) * 1.4); if (glass) glass.material.opacity = 0.16 + t * 0.22; });
    // kabin ve robot dünyada sabit kalır (yeni katın asansör karesiyle aynı yerde)
    this.base.attach(r); if (cap) this.base.attach(cap);
    const yA = gA.position.y, yB = gB.position.y;
    const rel = (o) => o.position.y - yA;
    const rR = rel(r), rC = cap ? rel(cap) : 0;
    // hız çizgileri: kabinin çevresinde aşağı akan ince ışıklar (yükseliş hissi)
    const streaks = new THREE.Group(), cpos = (cap || r).position;
    const sm = new THREE.MeshBasicMaterial({ color: 0x9ef3ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let k = 0; k < 14; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5 + Math.random() * 0.6, 0.025), sm);
      const a = Math.random() * Math.PI * 2, rr = 0.55 + Math.random() * 0.35;
      m.position.set(cpos.x + Math.cos(a) * rr, Math.random() * 3 - 0.5, cpos.z + Math.sin(a) * rr);
      m.userData.v = 4 + Math.random() * 3; streaks.add(m);
    }
    this.base.add(streaks); streaks.position.y = yA;
    let last = 0;
    const flow = (t, k) => { const dt = (t - last) * 1.6; last = t; for (const m of streaks.children) { m.position.y -= up * m.userData.v * dt; if (m.position.y < -0.8) m.position.y += 3.4; if (m.position.y > 2.6) m.position.y -= 3.4; } sm.opacity = 0.7 * k; };
    // 1) eski kat aşağı kayar (yukarı çıkıyorsak), hafif kararır
    gB.visible = false; if (arrive) arrive.visible = false;
    await tween(620, (t) => {
      gA.position.y = yA - up * D * t * t;
      flow(t, Math.min(1, t * 3));
      this.renderer.domElement.style.filter = `brightness(${1 - t * 0.35})`;
    }, ease.linear);
    gA.visible = false; gA.position.y = yA;
    // kabin ve robot yeni katın koordinatına geçer (ekranda aynı yer: kamera da aynı oranda kayar)
    const cam = this.camera, dY = yB - yA;
    cam.position.y += dY; streaks.position.y += dY;
    r.position.y = yB + rR; if (cap) cap.position.y = yB + rC;
    this.floor = B;
    last = 0; gB.visible = true; gB.position.y = yB + up * D2;
    // 2) yeni kat yukarıdan iner ve kabinin hizasında yumuşakça durur
    await tween(680, (t) => {
      const e = 1 - Math.pow(1 - t, 3);
      gB.position.y = yB + up * D2 * (1 - e);
      flow(t, 1 - t);
      this.renderer.domElement.style.filter = `brightness(${0.65 + 0.35 * t})`;
    }, ease.linear);
    this.renderer.domElement.style.filter = '';
    gB.position.y = yB; streaks.removeFromParent(); sm.dispose();
    if (cap) cap.removeFromParent();
    if (arrive) arrive.visible = true;
    this._syncFloor();
    this.root.attach(r); r.position.copy(this.cellPos(to)).setY(0.18);
    this.fitCamera();
    this._ring(this.cellPos(to).setY(0.22), 0x5ae6ff);
    this.shownFloor = B; if (this.onFloor) this.onFloor(B);
    if (lamp) await tween(220, (t) => { const al = arrive && arrive.userData.lamp; if (al) al.scale.setScalar(1 + Math.sin(t * Math.PI) * 1.2); });
  }

  async _caughtAnim() {
    this.mood = 'sad'; setRobotFace(this.robot, 'sad');
    if (this.onSound) this.onSound('caught');
    this.shake(0.15, 300);
    const r = this.robot;
    if (r.userData.anim) { clearTimeout(this._idleT); r.userData.anim.play('fall', { once: true, fade: 0.1, speed: 1.6 }); await new Promise((ok) => setTimeout(ok, 1300)); return; }
    await tween(450, (t) => { r.scale.set(1.2 * (1 + t * 0.3), 1.2 * (1 - t * 0.7), 1.2 * (1 + t * 0.3)); });
  }

  face(dir) {
    const turn = this.robot.userData.turn;
    const from = turn.rotation.y; let to = DIR_ANGLE[dir];
    while (to - from > Math.PI) to -= 2 * Math.PI;
    while (to - from < -Math.PI) to += 2 * Math.PI;
    return tween(90, (t) => { turn.rotation.y = from + (to - from) * t; }, ease.outQuad);
  }

  async _step({ from, to, slide, jump }) {
    const a = this.cellPos(from), b = this.cellPos(to);
    const dir = b.x > a.x ? 'right' : b.x < a.x ? 'left' : b.z > a.z ? 'down' : 'up';
    if (!slide) this.face(dir);
    const r = this.robot, U = r.userData;
    this._lastMoveT = 1e9;
    if (this.onSound) this.onSound(slide ? 'slide' : 'step');
    this.mood = 'move';
    const A = U.anim;
    if (A) { clearTimeout(this._idleT); if (jump) A.play('jump', { once: true, fade: 0.08, speed: 4.2 }); else if (!slide) A.play('walk', { fade: 0.12, speed: 2.4 }); }
    await tween(slide ? 110 : jump ? 320 : 170, (t) => {
      r.position.x = a.x + (b.x - a.x) * t; r.position.z = a.z + (b.z - a.z) * t;
      r.position.y = 0.18 + (slide ? 0 : Math.sin(Math.PI * t) * (jump ? 0.9 : A ? 0.1 : 0.28));
      const sw = slide ? 0 : Math.sin(t * Math.PI * 2) * 0.6;
      U.legL.rotation.x = sw; U.legR.rotation.x = -sw; U.armL.rotation.x = -sw; U.armR.rotation.x = sw;
      U.body.rotation.x = slide ? -0.18 : 0;
    }, slide ? ease.linear : ease.inOutQuad);
    U.body.rotation.x = 0; U.legL.rotation.x = U.legR.rotation.x = U.armL.rotation.x = U.armR.rotation.x = 0;
    this.mood = 'idle'; this._lastMoveT = this.clock.getElapsedTime();
    if (A) this._idleT = setTimeout(() => { if (this.robot === r && this.mood === 'idle') A.play('idle', { fade: 0.25 }); }, 140);
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
    if (this.board.floors && isLift(this.board, cell) && this.state && this.board.portal[cell] === this.state.pos) { this.tiles.delete(cell); this._liftCap = t; return; } // asansör kabini robotla birlikte kalkar
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
      this._dust(base.clone().setY(0.1), this.th ? this.th.side : 0x0e7aa0);
      this.shake(0.035, 140);
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
    }).then(() => { shards.forEach((s) => s?.removeFromParent()); t?.removeFromParent(); });
  }

  /** Kutu itildi: kayar; çukura giderse düşer ve çukuru doldurur */
  async _push(e) {
    const c = this.boxMeshes[e.box]; if (!c) return;
    const a = c.position.clone(), b = this.cellPos(e.to).setY(0.18);
    if (this.onSound) this.onSound('slide');
    await tween(170, (t) => c.position.lerpVectors(a, b, t), ease.outQuad);
    if (!e.sink) return;
    this.boxMeshes[e.box] = null; this.fillMeshes.set(e.to, c);
    if (this.onSound) this.onSound('stomp');
    await tween(260, (t) => { c.position.y = 0.18 - 0.62 * t * t; c.rotation.z = Math.sin(t * Math.PI) * 0.08; }, ease.linear);
    c.rotation.z = 0;
    this._dust(c.position.clone().setY(0.2), 0xc89a60);
  }
  /** Doldurulmuş çukurdan geçildi: kutu aşağı düşüp kaybolur */
  _unfill(cell) {
    const c = this.fillMeshes.get(cell); if (!c) return;
    this.fillMeshes.delete(cell);
    if (this.onSound) this.onSound('collapse');
    tween(600, (t) => { c.position.y = 0.18 - 0.62 - t * t * 4; c.rotation.x = t * 0.8; }, ease.linear).then(() => c.removeFromParent());
  }
  _takeColorKey(e) {
    const k = this.ckeys.get(e.cell);
    if (k) {
      this.ckeys.delete(e.cell);
      if (this.onSound) this.onSound('key');
      const y0 = k.position.y;
      tween(450, (t) => { k.position.y = y0 + t * 1.2; k.userData.inner.rotation.y = t * 12; k.scale.setScalar(1 + Math.sin(Math.PI * t) * 0.5 - t * 0.9); }, ease.outQuad).then(() => k.removeFromParent());
      this._ring(k.position.clone().setY(0.25), k.userData.glow.color.getHex());
    }
    // aynı renkteki bariyerler kapanır (perde söner, direkler yere iner)
    for (const [i, g] of [...this.gates]) {
      if (this.board.gate[i] !== e.color) continue;
      this.gates.delete(i);
      tween(500, (t) => { g.userData.fm.opacity = 0.4 * (1 - t); g.userData.light.intensity = 1.6 * (1 - t); g.position.y = -t * 1.1; }, ease.inQuad).then(() => g.removeFromParent());
    }
    if (this.onSound) this.onSound('bridge');
  }
  _takeGear() {
    const g = this.gearMesh; if (!g) return;
    this.gearMesh = null;
    if (this.onSound) this.onSound('coin');
    const y0 = g.position.y;
    tween(700, (t) => { g.position.y = y0 + t * 1.6; g.userData.inner.rotation.z = t * 14; g.scale.setScalar(1 + Math.sin(Math.PI * t) * 0.6 - t * 0.9); }, ease.outQuad).then(() => g.removeFromParent());
    this._burst(g.position.clone(), 0x7ad8ff, 40);
    if (this.onGear) this.onGear();
  }
  /** Karanlık bölüm: ms sonra sadece robotun çevresi (2 kare) görünür */
  startDark(ms) { this._darkT = performance.now() + ms; }
  _fog(dt) {
    const b = this.board; if (!b || !this.state) return;
    const darkNow = b.dark || (b.darkFloors && b.darkFloors.includes(this.floor));
    if (!darkNow) { if (this._fogged) { this._fogged = false; for (const t of this.tiles.values()) { t.scale.setScalar(1); t.visible = true; t.userData._fs = 1; } } return; }
    if (performance.now() < (this._darkT || 0)) return;
    this._fogged = true;
    const st = this.state, w = b.w, px = st.pos % w, py = Math.floor(st.pos / w);
    const vis = (i) => Math.abs(i % w - px) + Math.abs(Math.floor(i / w) - py) <= 2;
    const k = Math.min(1, dt * 8);
    const fade = (o, on) => { if (!o) return; const tgt = on ? 1 : 0.001; const sc = o.userData._fs ?? 1; const nv = sc + (tgt - sc) * k; o.userData._fs = nv; o.scale.setScalar(nv); o.visible = nv > 0.02; };
    for (const [i, t] of this.tiles) fade(t, vis(i));
    if (this.keys) b.keys.forEach((c, kk) => fade(this.keys.get(kk), vis(c)));
    for (const [i, o] of this.ckeys || []) fade(o, vis(i));
    for (const [i, o] of this.gates || []) fade(o, vis(i));
    (st.box || []).forEach((p, bi) => { if (p >= 0) fade(this.boxMeshes[bi], vis(p)); });
    if (this.gearMesh) fade(this.gearMesh, vis(b.gear));
    if (this.bonusMesh) fade(this.bonusMesh, vis(this.bonusCell));
  }
  /** Zamanlı taş sayaçları */
  updateTimers(moves) {
    if (!this.timers) return;
    for (const [c, t] of this.timers) { if (!this.tiles.has(c)) { this.timers.delete(c); continue; } drawTimer(t.lb, t.n - moves); }
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
      key.userData.glow.intensity = 2 + t * 4;
    }, ease.outQuad).then(() => key?.removeFromParent());
    this._burst(key.position.clone(), 0xffd54a, 40);
    this._ring(key.position.clone().setY(0.25), 0xffd54a);
  }

  takeBonus() {
    const c = this.bonusMesh; if (!c) return;
    this.bonusMesh = null; this.bonusCell = -1;
    if (this.onSound) this.onSound('key');
    const y0 = c.position.y;
    this._burst(c.position.clone(), 0xffd54a, 30);
    tween(500, (t) => { c.position.y = y0 + t * 1.4; c.rotation.y += 0.5; c.scale.setScalar(1 - t * 0.8); }, ease.outQuad).then(() => c?.removeFromParent());
  }

  /** Kilitli kapı sayacı: kapının üstünde "12/24" (yeterince taş çökünce kaybolur) */
  updateLock(n, lock) {
    if (!this.door) return;
    let sp = this.door.userData.lockSprite;
    if (!lock || n >= lock) { if (sp && sp.visible) { sp.visible = false; this._ring(this.door.position.clone().setY(0.3), 0x5ae6ff); } else if (sp) sp.visible = false; return; }
    if (!sp) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      sp.scale.set(0.9, 0.34, 1); sp.position.set(0, 1.95, 0); sp.renderOrder = 10;
      sp.userData = { cv, tex, last: '' };
      this.door.add(sp); this.door.userData.lockSprite = sp;
    }
    sp.visible = true;
    const txt = `${n}/${lock}`;
    if (sp.userData.last === txt) return;
    sp.userData.last = txt;
    const { cv, tex } = sp.userData, g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(14,10,40,.85)'; g.strokeStyle = '#b35cff'; g.lineWidth = 6;
    g.beginPath(); g.roundRect(6, 6, cv.width - 12, cv.height - 12, 40); g.fill(); g.stroke();
    // ilerleme çubuğu
    g.fillStyle = 'rgba(90,230,255,.25)'; g.beginPath(); g.roundRect(14, 14, (cv.width - 28) * Math.min(1, n / lock), cv.height - 28, 32); g.fill();
    g.fillStyle = '#ffffff'; g.font = 'bold 50px Poppins, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('🔒 ' + txt, cv.width / 2, cv.height / 2 + 3);
    tex.needsUpdate = true;
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
      U.light.intensity = 5 + Math.sin(Math.PI * t) * 10;
      U.lockMat.opacity = 1 - t; U.lock.scale.setScalar(1 + t * 0.8);
      U.ring.material.opacity = (1 - t) * 0.9; U.ring.scale.setScalar(1 + t * 3);
    }, ease.outQuad).then(() => { U.lock.visible = false; });
  }

  async _winAnim() {
    this.mood = 'happy'; setRobotFace(this.robot, 'happy');
    const r = this.robot, d = this.door.position;
    this._confetti(r.position.clone().setY(1.2));
    if (r.userData.anim) { clearTimeout(this._idleT); r.userData.anim.play('cheer', { once: true, fade: 0.15, speed: 1.6 }); await new Promise((ok) => setTimeout(ok, 800)); }
    await tween(380, (t) => { r.position.y = 0.18 + Math.sin(Math.PI * t) * 0.6; r.userData.turn.rotation.y += 0.25; }, ease.linear);
    this._burst(d.clone().add(new THREE.Vector3(0, 0.6, 0)), 0x7ff6ff, 36);
    this._ring(d.clone().setY(0.25), 0x7ff6ff);
    await tween(300, (t) => { r.scale.setScalar(1.2 * (1 - t)); r.position.y = 0.18 + t * 0.5; }, ease.inQuad);
  }

  async _stuckAnim() {
    this.mood = 'sad'; setRobotFace(this.robot, 'sad');
    if (this.robot.userData.anim) { clearTimeout(this._idleT); const ms = this.robot.userData.anim.play('stomp', { once: true, fade: 0.15, speed: 1.1 }); await new Promise((ok) => setTimeout(ok, Math.min(ms, 1300))); return; }
    const h = this.robot.userData.head;
    await tween(600, (t) => { h.rotation.y = Math.sin(t * Math.PI * 4) * 0.35 * (1 - t); h.rotation.z = -0.15 * t; });
  }

  /** Kare çökünce yayılan toz bulutu */
  _dust(pos, color) {
    const n = 18, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; arr.set([pos.x, pos.y, pos.z], i * 3); vel.push([Math.cos(a) * (0.6 + Math.random() * 0.5), 0.3 + Math.random() * 0.5, Math.sin(a) * (0.6 + Math.random() * 0.5)]); }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5), size: 0.32, map: softDot(), transparent: true, opacity: 0.85, depthWrite: false });
    const p = new THREE.Points(geo, mat); this.root.add(p);
    tween(650, (t) => {
      const e = 1 - (1 - t) * (1 - t);
      for (let i = 0; i < n; i++) { arr[i * 3] = pos.x + vel[i][0] * e * 0.7; arr[i * 3 + 1] = pos.y + vel[i][1] * e * 0.5; arr[i * 3 + 2] = pos.z + vel[i][2] * e * 0.7; }
      geo.attributes.position.needsUpdate = true; mat.opacity = 0.85 * (1 - t); mat.size = 0.32 + t * 0.25;
    }).then(() => p?.removeFromParent());
  }

  /** Yerde genişleyen ışık halkası */
  _ring(pos, color) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 48), mat); m.rotation.x = -Math.PI / 2; m.position.copy(pos); this.root.add(m);
    tween(700, (t) => { m.scale.setScalar(1 + t * 1.6); mat.opacity = 0.9 * (1 - t); }, ease.outQuad).then(() => m?.removeFromParent());
  }

  /** Kazanınca renkli konfeti */
  _confetti(pos) {
    const cols = [0xffd54a, 0x5ff3ff, 0xff5ad8, 0x8aff6a, 0xffffff], parts = [];
    const geo = new THREE.PlaneGeometry(0.07, 0.11);
    for (let i = 0; i < 46; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, transparent: true }));
      m.position.copy(pos); this.root.add(m);
      parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3.2, 2.5 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4), r: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12) });
    }
    tween(1500, (t) => {
      for (const p of parts) {
        p.m.position.set(pos.x + p.v.x * t, pos.y + p.v.y * t - 4.2 * t * t, pos.z + p.v.z * t);
        p.m.rotation.set(p.r.x * t, p.r.y * t, p.r.z * t); p.m.material.opacity = t > 0.7 ? (1 - t) / 0.3 : 1;
      }
    }, ease.linear).then(() => parts.forEach((p) => p.m?.removeFromParent()));
  }

  _burst(pos, color, n = 24) {
    const geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { arr.set([pos.x, pos.y, pos.z], i * 3); vel.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3)); }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.2, map: softDot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = new THREE.Points(geo, mat); this.root.add(p);
    tween(700, (t) => {
      for (let i = 0; i < n; i++) { arr[i * 3] = pos.x + vel[i].x * t; arr[i * 3 + 1] = pos.y + vel[i].y * t - 3 * t * t; arr[i * 3 + 2] = pos.z + vel[i].z * t; }
      geo.attributes.position.needsUpdate = true; mat.opacity = 1 - t;
    }).then(() => p?.removeFromParent());
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
  /** Uygulama açılışı: Şimşek gemisi düşer, parlama, taşlar yukarıdan yerine oturur, kapı/anahtar belirir, Bolt atlar.
   *  skipIntro() ile her an sona atlanır. */
  async playIntro({ onImpact, onBoard } = {}) {
    if (!this.board || !this.robot) return;
    this.introRunning = true; this._skip = false;
    const tiles = [...this.tiles.entries()], keys = this.keys ? [...this.keys.values()] : [], door = this.door, r = this.robot;
    const hidden = [...tiles.map(([, t]) => t), ...keys, door, r].filter(Boolean);
    const base = new Map(hidden.map((o) => [o, { p: o.position.clone(), s: o.scale.clone() }]));
    hidden.forEach((o) => (o.visible = false));
    const ship = makeShip(); this.base.add(ship);
    const trail = new THREE.Group(); this.base.add(trail);
    const tm = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const tg = new THREE.SphereGeometry(0.09, 8, 6);
    const puffs = Array.from({ length: 26 }, () => { const m = new THREE.Mesh(tg, tm.clone()); m.visible = false; trail.add(m); return m; });
    let pi = 0;
    const finish = () => {
      ship.removeFromParent(); trail.removeFromParent();
      for (const o of hidden) { const b = base.get(o); o.position.copy(b.p); o.scale.copy(b.s); o.visible = true; o.rotation.z = 0; }
      this.introRunning = false;
    };
    this._introFinish = finish;
    const T = (ms, fn, e) => (this._skip ? (fn(1, 1), Promise.resolve()) : tween(ms, fn, e));
    // 1) gemi yıldızların arasından alevli bir izle düşer
    const from = new THREE.Vector3(-6.5, 7.5, -8), to = new THREE.Vector3(0.3, 0.35, -0.2);
    const dir = to.clone().sub(from).normalize();
    ship.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    await wait(250);
    let last = 0;
    await T(1150, (t) => {
      const e = t * t * (1.4 - 0.4 * t);
      ship.position.lerpVectors(from, to, e);
      ship.rotation.y += 0.0; ship.userData.flame.scale.set(1 + Math.random() * 0.25, 1 + Math.random() * 0.5 + t, 1 + Math.random() * 0.25);
      if (t - last > 0.035) { last = t; const m = puffs[pi++ % puffs.length]; m.visible = true; m.position.copy(ship.position).addScaledVector(dir, -0.75); m.scale.setScalar(1); m.material.opacity = 0.8; }
      for (const m of puffs) if (m.visible) { m.scale.multiplyScalar(1.045); m.material.opacity *= 0.93; }
    }, ease.linear);
    // 2) çarpma: parlama, halka, toz, sarsıntı
    ship.removeFromParent();
    if (onImpact) onImpact();
    if (!this._skip) { this._ring(to.clone().setY(0.25), 0xffb040); this._ring(to.clone().setY(0.3), 0x5ae6ff); this._dust(to.clone().setY(0.2), 0xffb040); this.shake(0.16, 380); }
    await T(250, (t) => { for (const m of puffs) m.material.opacity *= 0.85; });
    trail.removeFromParent();
    // 3) taşlar merkezden dışa doğru sırayla yukarıdan düşüp yerine oturur
    const c = new THREE.Vector3();
    const order = tiles.map(([i, t]) => ({ t, d: base.get(t).p.distanceTo(c) })).sort((a, b) => a.d - b.d);
    const maxD = Math.max(...order.map((o) => o.d), 1);
    order.forEach(({ t }) => { t.visible = true; t.position.y = base.get(t).p.y + 4; });
    const landed = new Set();
    await T(1050, (tt) => {
      for (const { t, d } of order) {
        const st = (d / maxD) * 0.55, k = Math.min(1, Math.max(0, (tt - st) / 0.45));
        const b = base.get(t).p;
        t.position.y = b.y + 4 * (1 - ease.outBack(k));
        if (k >= 1 && !landed.has(t)) { landed.add(t); t.position.y = b.y; }
      }
    }, ease.linear);
    for (const { t } of order) t.position.y = base.get(t).p.y;
    if (onBoard) onBoard();
    // 4) kapı ve anahtar parlayarak belirir
    const pops = [door, ...keys].filter(Boolean);
    pops.forEach((o) => { o.visible = true; o.scale.setScalar(0.001); });
    if (!this._skip) for (const o of pops) this._ring(o.position.clone().setY(0.25), 0xffd23a);
    await T(380, (t) => { for (const o of pops) { const b = base.get(o).s; o.scale.copy(b).multiplyScalar(Math.max(0.001, ease.outBack(t))); } });
    // 5) Bolt yukarıdan atlar; indiği taş hafifçe sallanır ama çökmez
    r.visible = true;
    if (!this._skip) {
      await this.greet();
      const under = this.tiles.get(this.state && this.state.pos);
      if (under) { const y0 = base.get(under) ? base.get(under).p.y : under.position.y; await tween(300, (t) => { under.position.y = y0 - Math.sin(t * Math.PI) * 0.08; under.rotation.z = Math.sin(t * Math.PI * 4) * 0.03 * (1 - t); }); }
    }
    finish();
  }
  skipIntro() { if (!this.introRunning) return; this._skip = true; clearTweens(); }

  /** Açılışta robot yukarıdan zıplayıp tahtaya iner */
  async greet() {
    const r = this.robot; if (!r) return;
    const y0 = r.position.y, s0 = r.scale.clone();
    const A = r.userData.anim; if (A) A.play('jump', { once: true, fade: 0.1, speed: 1.2 });
    r.position.y = y0 + 4; r.visible = true;
    await tween(620, (t) => { r.position.y = y0 + 4 * (1 - t) * (1 - t); }, ease.inQuad);
    r.position.y = y0;
    this._dust(r.position.clone().setY(0.2));
    this._ring && this._ring(r.position.clone().setY(0.22), 0x5ae6ff);
    await tween(260, (t) => { const k = Math.sin(t * Math.PI); r.scale.set(s0.x * (1 + k * 0.08), s0.y * (1 - k * 0.1), s0.z * (1 + k * 0.08)); });
    r.scale.copy(s0);
  }
  clearHint() { if (this.hintMesh) { this.hintMesh?.removeFromParent(); this.hintMesh = null; } }

  // ---------- Kare döngüsü ----------
  _frame(now) {
    updateTweens(now);
    const t = this.clock.getElapsedTime();
    const dt = Math.min(0.1, t - (this._lastT ?? t)); this._lastT = t;
    this._fog(dt);
    if (this.robot && this.robot.userData.anim) {
      const A = this.robot.userData.anim;
      // menüde: bekleme duruşu, birkaç saniyede bir el sallar
      if (this.menuMode && this.mood === 'idle' && !this.introRunning) {
        this._waveT = (this._waveT ?? 2.5) - dt;
        if (this._waveT <= 0 && A.current() !== 'wave') { const ms = A.play('wave', { once: true, fade: 0.3 }); this._waveT = 6 + ms / 1000; this._waveEnd = t + ms / 1000 - 0.3; }
        else if (A.current() === 'wave' && t > (this._waveEnd || 0)) A.play('idle', { fade: 0.4 });
        else if (!A.current() || (A.current() !== 'wave' && A.current() !== 'idle')) A.play('idle', { fade: 0.3 });
      } else if (!this.menuMode && A.current() === 'wave') A.play('idle', { fade: 0.3 });
      A.update(dt);
    }
    if (this.keys) for (const key of this.keys.values()) {
      if (key.userData.taken) continue;
      key.userData.inner.rotation.y = t * 1.6 + key.userData.phase;
      key.userData.inner.position.y = Math.sin(t * 2.2 + key.userData.phase) * 0.06;
    }
    if (this.robot) {
      const U = this.robot.userData;
      if (U.fill) U.fill.intensity += ((this.menuMode ? 9 : 4) - U.fill.intensity) * 0.2;
      if (U.anim) U.anim.st.headUp += ((this.menuMode || this.mood === 'happy' || this.mood === 'sad' ? 0 : 0.42) - U.anim.st.headUp) * Math.min(1, dt * 6);
      // dururken yüzünü yavaşça kameraya çevir (ipucu oku yokken)
      if (!this.menuMode && this.mood === 'idle' && !this.hintMesh && t - (this._lastMoveT || 0) > 0.7) {
        let a = U.turn.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); U.turn.rotation.y = a + (0 - a) * Math.min(1, dt * 4);
      }
    }
    if (this.robot && this.mood !== 'move') {
      const U = this.robot.userData;
      U.body.position.y = Math.sin(t * 2.4) * 0.015;
      const blink = (t % 3.4) < 0.12 ? 0.1 : 1;
      if (this.mood === 'idle') { U.eyeL.scale.y = U.eyeR.scale.y = blink; }
      if (this.menuMode) { if (!U.anim) U.armR.rotation.z = 0.18 + Math.max(0, Math.sin(t * 3)) * 2.2; U.turn.rotation.y = Math.sin(t * 0.5) * 0.1; /* hafif salınım: fazla dönünce bacaklar üst üste biniyor */ }
    }
    if (this.decorAnim) for (const f of this.decorAnim) f(t);
    if (this.ckeys) for (const k of this.ckeys.values()) { k.userData.inner.rotation.y = t * 1.6 + k.userData.phase; k.position.y = 0.8 + Math.sin(t * 2.2 + k.userData.phase) * 0.06; }
    if (this.gates) for (const g of this.gates.values()) g.userData.fm.opacity = 0.32 + Math.sin(t * 5) * 0.1;
    if (this.gearMesh) { this.gearMesh.userData.inner.rotation.z = t * 1.8; this.gearMesh.position.y = 0.7 + Math.sin(t * 2.4) * 0.06; }
    if (this.bonusMesh) { this.bonusMesh.rotation.y = t * 2.4; this.bonusMesh.position.y = 0.62 + Math.sin(t * 2.6) * 0.05; }
    if (this.flames) for (const f of this.flames) { const k = 1 + Math.sin(t * 9 + f.seed) * 0.08 + Math.sin(t * 23 + f.seed) * 0.05; f.f.scale.set(k, 1.6 * k, k); f.tl.intensity = 14 * k; }
    if (this.particles) { this.particles.rotation.y = t * 0.03; this.particles.position.y = this.world === 3 ? -((t * 0.25) % 2) + 1 : Math.sin(t * 0.3) * 0.2; }
    if (this.portals) for (const p of this.portals) if (p.userData.swirl) p.userData.swirl.rotation.y = -t * 2.5;
    if (this.enemyMeshes) for (const m of this.enemyMeshes) if (m) { m.userData.body.position.y = m.userData.type === 'sentry' ? 0 : m.userData.type === 'chaser' && m.userData.glb ? 0.04 + Math.sin(t * 3 + m.userData.phase) * 0.06 : Math.sin(t * 4 + m.userData.phase) * 0.03; if (m.userData.siren) m.userData.siren.scale.setScalar(0.8 + Math.abs(Math.sin(t * 6)) * 0.5); if (m.userData.arrow && m.userData.arrow.visible) m.userData.arrow.children[0].material.opacity = 0.5 + Math.abs(Math.sin(t * 4)) * 0.5; }
    if (this.lasers) for (const l of this.lasers) if (l.g.userData.blink) l.g.children[0].material.opacity = 0.25 + Math.abs(Math.sin(t * 9)) * 0.55;
    if (this.bossMesh) { const U = this.bossMesh.userData; U.head.rotation.y = Math.sin(t * 0.9) * 0.15; U.body.position.y = Math.sin(t * 1.8) * 0.03; U.eyes.forEach((e) => (e.scale.y = 1 + Math.abs(Math.sin(t * 3)) * 0.4)); }
    if (this.dangerMarks && this.dangerMarks.length) { const k = 0.55 + Math.abs(Math.sin(t * 5)) * 0.4; for (const d of this.dangerMarks) d.userData.mat.opacity = k; }
    if (this.zzz) for (const z of this.zzz) z.material.rotation = Math.sin(t * 2) * 0.15;
    if (this.arrowTiles) for (const a of this.arrowTiles) a.userData.arrowMat.opacity = 0.6 + Math.abs(Math.sin(t * 4)) * 0.4;
    if (this.hintMesh) { const k = (Math.sin(t * 6) + 1) / 2; this.hintMesh.traverse((c) => { if (c.material) c.material.opacity = 0.5 + k * 0.5; }); }
    if (this.door && this.doorOpen) this.door.userData.light.intensity = 4.5 + Math.sin(t * 3) * 1;
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}

let _dot = null;
/** Yumuşak kenarlı yuvarlak parçacık dokusu */
function softDot() {
  if (_dot) return _dot;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); _dot = new THREE.CanvasTexture(c); return _dot;
}
/** Bonus altın: dönen büyük para */
function makeBonusCoin() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffcf3a, emissive: 0xc07a00, emissiveIntensity: 0.45, metalness: 0.75, roughness: 0.25 });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32), m); c.rotation.x = Math.PI / 2; c.castShadow = true; g.add(c);
  const star = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 5), new THREE.MeshStandardMaterial({ color: 0xfff1a0, emissive: 0xffd54a, emissiveIntensity: 0.6 })); star.rotation.x = Math.PI / 2; g.add(star);
  return g;
}
function makeArrow(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 3), mat); head.rotation.x = Math.PI / 2; g.add(head);
  g.scale.set(1.2, 0.4, 1.2);
  return g;
}
function mesh(g, m, p = [0, 0, 0], cast = true) { const o = new THREE.Mesh(g, m); o.position.set(...p); o.castShadow = cast; o.receiveShadow = true; return o; }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
