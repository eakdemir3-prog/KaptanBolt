// Yeşil Vadi görselleri: çimenli toprak blokları, yüzen kayalar, çalılar, çiçekler, arka plan katmanları,
// kafes, bayraklar, para ve zıplatan mantar. Hepsi koddan modellenir (karakterler hariç).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const DEPTH = 2.4; // zeminin derinliği (z yönünde)
export function seed(n) { rnd = 12345 + n * 7919; }
let rnd = 12345; const R = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Toprak dokusu: sıcak kahve, içinde yuvarlak taşlar ve kökler */
function dirtTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a5672f'); gr.addColorStop(1, '#7b4720'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + R() * 60},${30 + R() * 30},10,${0.08 + R() * 0.1})`; g.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 4); }
    for (let i = 0; i < 14; i++) { // taşlar
      const x = R() * w, y = R() * h, r = 7 + R() * 13;
      g.fillStyle = 'rgba(70,40,18,0.55)'; g.beginPath(); g.ellipse(x + 2, y + 3, r, r * 0.75, 0, 0, 7); g.fill();
      const sg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); sg.addColorStop(0, '#d9b48a'); sg.addColorStop(1, '#9a7350');
      g.fillStyle = sg; g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(60,30,10,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) { g.beginPath(); let x = R() * w, y = R() * h * 0.4; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 40; y += 18 + R() * 20; g.lineTo(x, y); } g.stroke(); }
  });
}
function grassTex() {
  return canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fe35a'); gr.addColorStop(1, '#4cb33a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = R() < 0.5 ? 'rgba(40,120,30,0.25)' : 'rgba(200,255,150,0.25)'; g.fillRect(R() * w, R() * h, 2, 5 + R() * 6); }
  });
}
function rockTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8d8578'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) { const v = 100 + R() * 70; g.fillStyle = `rgba(${v},${v - 6},${v - 14},0.35)`; g.fillRect(R() * w, R() * h, 3 + R() * 6, 3 + R() * 6); }
    g.strokeStyle = 'rgba(50,45,40,0.45)'; g.lineWidth = 2;
    for (let i = 0; i < 10; i++) { g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (R() - 0.5) * 50; y += (R() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(90,150,60,0.45)'; g.beginPath(); g.arc(R() * w, R() * h * 0.35, 4 + R() * 10, 0, 7); g.fill(); }
  });
}

const TL = new THREE.TextureLoader();
const TEX = {};
function tex(name, setup) {
  if (TEX[name]) return TEX[name];
  const t = TL.load(`props/${name}.webp`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (setup) setup(t);
  return (TEX[name] = t);
}
// Zemin dokusu (1024x682): üst %15 düz çimen, %15-20 sarkan yapraklar, altı toprak ve taş
const GROUND_TW = 3.6, GROUND_TH = GROUND_TW * 682 / 1024;
const spriteMat = (name) => new THREE.MeshBasicMaterial({ map: tex(name), transparent: true, alphaTest: 0.35, depthWrite: true, toneMapped: false, side: THREE.DoubleSide });
const SPR = {};
function sprite(name, h, aspect) {
  const geo = new THREE.PlaneGeometry(h * aspect, h); geo.translate(0, h / 2, 0);
  const m = new THREE.Mesh(geo, SPR[name] || (SPR[name] = spriteMat(name)));
  return m;
}
const BUSH = [[1, 679 / 275], [2, 562 / 384], [3, 628 / 384]];
const FLOWER_A = [273 / 200, 275 / 200, 264 / 200, 265 / 200, 258 / 200, 260 / 200];

const M = {};
function mats() {
  if (M.dirt) return M;
  M.dirt = new THREE.MeshStandardMaterial({ map: dirtTex(), roughness: 0.95 });
  M.lip = tex('ground', (t) => { t.wrapS = THREE.RepeatWrapping; });
  M.soil = tex('ground', (t) => { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.MirroredRepeatWrapping; });
  M.soilColor = new THREE.MeshStandardMaterial({ color: 0x9a4a1c, roughness: 0.95 });
  M.underside = new THREE.MeshStandardMaterial({ color: 0xb8622a, roughness: 0.95, emissive: 0x4a1e08, emissiveIntensity: 0.5 });
  M.top = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#86c602'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = R() < 0.5 ? 'rgba(60,140,0,0.35)' : 'rgba(190,240,60,0.35)'; g.beginPath(); g.ellipse(R() * w, R() * h, 2 + R() * 4, 1 + R() * 2, R() * 3, 0, 7); g.fill(); } }), roughness: 0.85 });
  M.grass = new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 0.8 });
  M.rock = new THREE.MeshStandardMaterial({ map: rockTex(), roughness: 0.9 });
  M.leaf = new THREE.MeshStandardMaterial({ color: 0x46b53a, roughness: 0.75 });
  M.leaf2 = new THREE.MeshStandardMaterial({ color: 0x6fd24a, roughness: 0.75 });
  M.leaf3 = new THREE.MeshStandardMaterial({ color: 0x2e9442, roughness: 0.8 });
  M.trunk = new THREE.MeshStandardMaterial({ color: 0x8a5228, roughness: 0.9 });
  M.blade = new THREE.MeshStandardMaterial({ color: 0x5fc842, roughness: 0.7, side: THREE.DoubleSide });
  M.gold = new THREE.MeshStandardMaterial({ color: 0xffc928, metalness: 0.55, roughness: 0.28, emissive: 0x7a4a00, emissiveIntensity: 0.55 });
  M.iron = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, metalness: 0.7, roughness: 0.45 });
  M.rust = new THREE.MeshStandardMaterial({ color: 0xa8532a, metalness: 0.4, roughness: 0.6 });
  M.white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 });
  return M;
}
const mesh = (geo, mat, x = 0, y = 0, z = 0, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; };

/** Ön yüze boyalı zemin dokusu giydirilmiş bant: üstte çimen saçağı, altta toprak (x0'a göre kesintisiz) */
function soilFace(x0, w, yTop, hgt, z, lip = true) {
  const g = new THREE.Group();
  if (lip) {
    const lh = Math.min(GROUND_TH, hgt), k = lh / GROUND_TH; // kısa bantta dokunun sadece üst kısmı
    const t = M.lip.clone(); t.needsUpdate = true; t.repeat.set(w / GROUND_TW, k); t.offset.set(x0 / GROUND_TW, 1 - k);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, lh), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    m.position.set(x0 + w / 2, yTop - lh / 2, z); m.receiveShadow = true; g.add(m);
  }
  const rest = hgt - (lip ? GROUND_TH : 0);
  if (rest > 0.01) { // altı: dokunun toprak kısmı aynalı tekrar
    const t = M.soil.clone(); t.needsUpdate = true; t.repeat.set(w / GROUND_TW, rest / (GROUND_TH * 0.75)); t.offset.set(x0 / GROUND_TW + 0.37, 0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, rest), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    m.position.set(x0 + w / 2, yTop - (lip ? GROUND_TH : 0) - rest / 2, z); m.receiveShadow = true; g.add(m);
  }
  return g;
}
/** Bir sıra zemin: üst çimen yüzeyi, boyalı ön yüz, toprak yanlar */
function groundRun(x0, w, h) {
  const g = new THREE.Group();
  const deep = h + 8;
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, deep, DEPTH), [M.soilColor, M.soilColor, M.top, M.soilColor, M.soilColor, M.soilColor]);
  box.position.set(x0 + w / 2, h - deep / 2, 0); box.receiveShadow = true; g.add(box);
  g.add(soilFace(x0, w, h + 0.02, deep, DEPTH / 2 + 0.005));
  // yan yüzler (boşluk kenarı): toprak dokusu
  for (const sx of [x0, x0 + w]) {
    const t = M.lip.clone(); t.needsUpdate = true; t.repeat.set(DEPTH / GROUND_TW, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, GROUND_TH), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    m.position.set(sx + (sx === x0 ? -0.005 : 0.005), h + 0.02 - GROUND_TH / 2, 0); m.rotation.y = sx === x0 ? -Math.PI / 2 : Math.PI / 2; g.add(m);
  }
  return g;
}

/** Yüzen kaya platformu (üst yüzey y+1) */
function floatRock(x, y, w) {
  const g = new THREE.Group();
  const cx = x + w / 2;
  const top = new THREE.Mesh(new RoundedBoxGeometry(w + 0.2, 0.36, 2.0, 3, 0.14), M.top); top.position.set(cx, y + 0.9, 0); top.castShadow = top.receiveShadow = true; g.add(top);
  const body = new THREE.Mesh(new RoundedBoxGeometry(w + 0.1, 1.0, 1.9, 3, 0.35), M.underside); body.position.set(cx, y + 0.5, 0); body.castShadow = true; g.add(body);
  g.add(soilFace(x - 0.1, w + 0.2, y + 1.06, 1.12, 1.0));
  // alttan sarkan sarmaşık
  const nv = Math.max(1, Math.round(w / 2.5));
  for (let i = 0; i < nv; i++) { const hh = 1.1 + R() * 0.6; const v = sprite('vines', hh, 209 / 352); v.position.set(x + (i + 0.5) * w / nv + (R() - 0.5) * 0.4, y + 0.25 - hh, 0.85); g.add(v); }
  if (w >= 2) for (let i = 0; i < 2; i++) { const k = Math.floor(R() * 6); const f = sprite(`flower${k + 1}`, 0.4, FLOWER_A[k]); f.position.set(x + 0.4 + R() * (w - 0.8), y + 1.05, -0.5); g.add(f); }
  return g;
}

function bush(x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  const geo = new THREE.IcosahedronGeometry(0.5, 2);
  [[0, 0.35, 0, 1, M.leaf], [-0.45, 0.25, 0.05, 0.75, M.leaf2], [0.45, 0.25, -0.05, 0.8, M.leaf3], [0.1, 0.6, -0.1, 0.7, M.leaf2]].forEach(([a, b, c, k, m]) => { const p = mesh(geo, m, a, b, c); p.scale.set(k, k * 0.85, k); g.add(p); });
  return g;
}
function flower(x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), M.leaf3, 0, 0.15, 0, false));
  const cols = [0xff5a8a, 0xffd23a, 0xffffff, 0xb07aff];
  const pm = new THREE.MeshStandardMaterial({ color: cols[Math.floor(R() * cols.length)], roughness: 0.6 });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const p = mesh(new THREE.SphereGeometry(0.06, 8, 6), pm, Math.cos(a) * 0.07, 0.32, Math.sin(a) * 0.07, false); p.scale.y = 0.5; g.add(p); }
  g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffb020 }), 0, 0.33, 0, false));
  return g;
}
/** Arka plandaki 3D ağaç (yaprak kümesi + eğri gövde) */
function tree(x, y, z, s = 1, palm = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 3.2, 8, 4); const p = trunkGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setX(i, p.getX(i) + Math.sin((yy + 1.6) * 0.8) * 0.18); }
  trunkGeo.computeVertexNormals();
  g.add(mesh(trunkGeo, M.trunk, 0, 1.6, 0));
  if (palm) {
    const leafGeo = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let i = 0; i < 7; i++) { const l = mesh(leafGeo, i % 2 ? M.leaf2 : M.leaf, 0, 3.25, 0); l.scale.set(0.35, 0.12, 1.5); l.rotation.set(0.55, (i / 7) * Math.PI * 2, 0); l.position.add(new THREE.Vector3(Math.sin((i / 7) * Math.PI * 2) * 0.6, -0.15, Math.cos((i / 7) * Math.PI * 2) * 0.6)); g.add(l); }
  } else {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    [[0, 3.6, 0, 1.25, M.leaf], [-0.9, 3.2, 0.2, 0.9, M.leaf2], [0.95, 3.25, -0.1, 0.95, M.leaf3], [0.2, 4.3, -0.2, 0.85, M.leaf2], [-0.3, 3.0, 0.7, 0.7, M.leaf]].forEach(([a, b, c, k, m]) => { const q = mesh(geo, m, a, b, c); q.scale.setScalar(k); g.add(q); });
  }
  return g;
}

/** Arka plan katmanları: resimler yatayda tekrar eder; derinlik farkı kendiliğinden parallax verir */
export function backdrop(scene, levelW) {
  const L = new THREE.TextureLoader();
  const layer = (url, z, height, yBottom, opts = {}) => {
    const t = L.load(url); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
    const aspect = opts.aspect || 1.63;
    const tileW = height * aspect, width = levelW + 400;
    t.repeat.set(width / tileW, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: t, transparent: !!opts.alpha, depthWrite: !opts.alpha, fog: false, toneMapped: false, color: opts.tint || 0xffffff }));
    m.position.set(levelW / 2, yBottom + height / 2, z); m.renderOrder = -10 + (opts.order || 0); scene.add(m);
    if (opts.fill) { // katmanın altını aynı renkle doldur (alttan gökyüzü görünmesin)
      const f = new THREE.Mesh(new THREE.PlaneGeometry(width, 60), new THREE.MeshBasicMaterial({ color: opts.fill, fog: false, toneMapped: false }));
      f.position.set(levelW / 2, yBottom - 30 + height * 0.04, z - 0.01); f.renderOrder = m.renderOrder - 0.5; scene.add(f);
    }
    return m;
  };
  const sky = layer('bg/vadi-gok.webp', -120, 120, -20, { aspect: 1672 / 941 });
  const far = layer('bg/vadi-uzak.webp', -70, 46, -14, { alpha: true, aspect: 1532 / 941, order: 1, tint: 0xf4fbff, fill: 0x3f8f73 });
  const mid = layer('bg/vadi-orta.webp', -26, 21, -9, { alpha: true, aspect: 1532 / 941, order: 2, tint: 0xe8f4e0, fill: 0x3a7330 });
  return { sky, far, mid };
}

export function buildWorld(scene, L) {
  mats();
  const root = new THREE.Group(); scene.add(root);
  // zemin sıraları
  let x = 0;
  while (x < L.w) {
    const h = L.cols[x]; if (!h) { x++; continue; }
    let e = x; while (e + 1 < L.w && L.cols[e + 1] === h) e++;
    root.add(groundRun(x, e - x + 1, h));
    // üstte çalı, çiçek, çimen tutamı
    for (let i = x; i <= e; i++) {
      if (R() < 0.2) { const [k, a] = BUSH[Math.floor(R() * 3)]; const b = sprite(`bush${k}`, 0.9 + R() * 0.6, a); b.position.set(i + 0.5, h - 0.05, -0.75 - R() * 0.3); if (R() < 0.5) b.scale.x = -1; root.add(b); }
      if (R() < 0.22) { const k = Math.floor(R() * 6); const f = sprite(`flower${k + 1}`, 0.42 + R() * 0.15, FLOWER_A[k]); f.position.set(i + R(), h - 0.03, -0.35 - R() * 0.3); root.add(f); }
      if (R() < 0.1 && i > x && i < e) { const k = Math.floor(R() * 6); const f = sprite(`flower${k + 1}`, 0.36, FLOWER_A[k]); f.position.set(i + R(), h - 0.02, DEPTH / 2 - 0.15); root.add(f); }
    }
    x = e + 1;
  }
  for (const p of L.plats) root.add(floatRock(p.x, p.y, p.w));
  // arka planda süs: kütük, kayalar, devrik ağaç, mantarlar (zemin üstünde, rastgele)
  const DECO = [['stump', 1.0, 308 / 246], ['rocks', 0.8, 306 / 223], ['log', 0.75, 330 / 188], ['mushrooms', 0.7, 241 / 227]];
  for (let x2 = 3; x2 < L.w - 3; x2++) {
    const h = L.cols[x2]; if (!h || L.cols[x2 - 1] !== h || L.cols[x2 + 1] !== h || R() > 0.07) continue;
    const [k, hh, a] = DECO[Math.floor(R() * DECO.length)]; const d = sprite(k, hh * (0.85 + R() * 0.3), a); d.position.set(x2 + 0.5, h - 0.04, -0.95 - R() * 0.15); if (R() < 0.5) d.scale.x = -1; root.add(d); x2 += 4;
  }
  return root;
}

// ---------- Oyun nesneleri ----------
export function makeCoin() {
  mats();
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(0.74, 0.74 * 1080 / 1052);
  const c = new THREE.Mesh(geo, SPR.coin || (SPR.coin = new THREE.MeshBasicMaterial({ map: tex('coin'), transparent: true, alphaTest: 0.3, toneMapped: false, side: THREE.DoubleSide })));
  c.position.z = 0.2; g.add(c); g.userData.face = c;
  return g;
}

/** Zıplatan mantar (resim). userData.spr basılınca y ölçeğiyle ezilir */
export function makeSpring() {
  mats();
  const g = new THREE.Group(); const sp = sprite('spring', 1.05, 400 / 345); sp.position.z = 0.3; g.add(sp); g.userData.spr = sp; return g;
}
/** Şarj direği: kontrol noktası (küçük) ya da bitiş ışınlanma direği (büyük). Sönükken gri. */
export function makePost(big = false) {
  mats();
  const g = new THREE.Group(); const H = big ? 3.0 : 1.75;
  const mat = new THREE.MeshBasicMaterial({ map: tex('post'), transparent: true, alphaTest: 0.3, toneMapped: false, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(H * 196 / 420, H); geo.translate(0, H / 2, 0);
  const sp = new THREE.Mesh(geo, mat); sp.position.z = -0.5; g.add(sp);
  // kürenin ışığı (yanınca parlar)
  const glow = new THREE.Mesh(new THREE.CircleGeometry(H * 0.32, 24), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x66e8ff, toneMapped: false }));
  glow.position.set(0, H * 0.78, -0.45); glow.scale.setScalar(1.6); g.add(glow);
  g.userData = { sp, mat, glow, H, on: false };
  setPost(g, false);
  return g;
}
export function setPost(g, on) { const u = g.userData; u.on = on; u.mat.color.setScalar(on ? 1 : 0.55); u.glow.visible = on; }
let GLOW = null;
function glowTex() { return GLOW || (GLOW = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, false)); }
/** Işınlanma sütunu (bitişte) */
export function makeBeam() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x8af4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  m.geometry.translate(0, 7, 0); return m;
}
export const makeSprite = (name, h, aspect) => { mats(); return sprite(name, h, aspect); };
export const ASPECT = { heart: 236 / 212, star: 249 / 237, crate: 245 / 251, bridge: 329 / 125, raft: 333 / 187, thorns: 339 / 170, sign: 244 / 271, stump: 308 / 246, rocks: 306 / 223, log: 330 / 188, vines: 209 / 352, mushrooms: 241 / 227 };
/** Köprü: ip köprü parçaları yan yana (uçlar biraz bindirilir) */
export function makeBridge(x0, x1, y) {
  mats();
  const g = new THREE.Group(); const segW = 2.4, h = segW / ASPECT.bridge, n = Math.ceil((x1 - x0) / (segW * 0.92));
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const s = sprite('bridge', h, ASPECT.bridge); s.scale.x = (step * 1.06) / segW; s.position.set(x0 + (i + 0.5) * step, y - h * 0.62, 0.1); g.add(s); }
  return g;
}
export function makeRaft(w) { mats(); const g = new THREE.Group(); const h = w / ASPECT.raft; const s = sprite('raft', h, ASPECT.raft); s.position.set(w / 2, -h * 0.72, 0.1); g.add(s); return g; }
export function makeThorns(w) {
  mats(); const g = new THREE.Group(); const segW = 1.5, n = Math.max(1, Math.round(w / segW)), step = w / n;
  for (let i = 0; i < n; i++) { const s = sprite("thorns", segW / ASPECT.thorns * 1.35, ASPECT.thorns); s.scale.x = step / segW * 1.15; s.position.set((i + 0.5) * step, -0.06, 0.15 + (i % 2) * 0.05); g.add(s); }
  return g;
}

function flagTex(color, emblem) {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h - 18, w, 18);
    g.fillStyle = '#fff'; g.translate(w / 2, h / 2);
    if (emblem === 'gear') {
      g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 44 : 56; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
      g.fillStyle = color; g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill();
    } else { g.font = 'bold 90px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 0, 6); }
  }, false);
}
/** Bayrak direği: kontrol noktası (kırmızı, dişli) ve bitiş (büyük, altın) */
export function makeFlag(big = false) {
  mats();
  const g = new THREE.Group(); const H = big ? 5 : 2.8;
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, H, 10), M.iron, 0, H / 2, 0));
  g.add(mesh(new THREE.SphereGeometry(big ? 0.2 : 0.13, 14, 10), M.gold, 0, H + 0.05, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.25, 16), M.rock, 0, 0.12, 0));
  const fw = big ? 1.6 : 1.1, fh = big ? 1.0 : 0.7;
  const geo = new THREE.PlaneGeometry(fw, fh, 10, 4); geo.translate(fw / 2, 0, 0);
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex(big ? '#ffb020' : '#d8322a', big ? 'star' : 'gear'), side: THREE.DoubleSide, roughness: 0.8 }));
  cloth.position.set(0.05, big ? H - 0.7 : 0.9, 0); cloth.castShadow = true; g.add(cloth);
  g.userData = { cloth, base0: geo.attributes.position.array.slice(), top: H - (big ? 0.7 : 0.5), low: big ? 0.9 : 0.6, raised: big };
  if (!big) cloth.material.color.setScalar(0.55); // kontrol noktası alınana kadar soluk
  return g;
}
export function waveFlag(flag, t) {
  const c = flag.userData.cloth, p = c.geometry.attributes.position, b = flag.userData.base0;
  for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.setZ(i, Math.sin(x * 4 - t * 6) * 0.08 * x); }
  p.needsUpdate = true;
}
