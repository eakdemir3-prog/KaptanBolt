// Yeşil Vadi görselleri: çimenli toprak blokları, yüzen kayalar, çalılar, çiçekler, arka plan katmanları,
// kafes, bayraklar, para ve zıplatan mantar. Hepsi koddan modellenir (karakterler hariç).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const DEPTH = 3.2; // zeminin derinliği (z yönünde)
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

const M = {};
function mats() {
  if (M.dirt) return M;
  M.dirt = new THREE.MeshStandardMaterial({ map: dirtTex(), roughness: 0.95 });
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

/** Bir sıra toprak blok: x0..x1 genişlik, yükseklik h (zemin y=0'dan başlar, aşağısı derin) */
function groundRun(x0, w, h) {
  const g = new THREE.Group();
  const deep = h + 6; // ekranın altına kadar uzansın
  const geo = new RoundedBoxGeometry(w, deep, DEPTH, 3, 0.16);
  const box = new THREE.Mesh(geo, M.dirt.clone()); box.material.map = M.dirt.map.clone(); box.material.map.repeat.set(w / 2.2, deep / 2.2); box.material.map.needsUpdate = true;
  box.position.set(x0 + w / 2, h - deep / 2, 0); box.receiveShadow = true; g.add(box);
  // çimen başlığı: hafif taşan, yuvarlak
  const cap = new THREE.Mesh(new RoundedBoxGeometry(w + 0.22, 0.34, DEPTH + 0.22, 3, 0.13), M.grass); cap.position.set(x0 + w / 2, h - 0.08, 0); cap.receiveShadow = true; g.add(cap);
  // ön kenardan sarkan çimen saçakları
  const fr = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 5), M.grass);
  const n = Math.round(w * 3.2), fringe = new THREE.InstancedMesh(fr.geometry, M.grass, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { o.position.set(x0 + 0.05 + (i + R() * 0.6) * (w - 0.1) / n, h - 0.3 - R() * 0.08, DEPTH / 2 + 0.1); o.rotation.set(Math.PI, 0, (R() - 0.5) * 0.5); o.scale.setScalar(0.7 + R() * 0.6); o.updateMatrix(); fringe.setMatrixAt(i, o.matrix); }
  g.add(fringe);
  return g;
}

/** Yüzen kaya platformu (üst yüzey y+1) */
function floatRock(x, y, w) {
  const g = new THREE.Group();
  const cx = x + w / 2;
  const top = new THREE.Mesh(new RoundedBoxGeometry(w + 0.2, 0.36, 2.4, 3, 0.14), M.grass); top.position.set(cx, y + 0.9, 0); top.castShadow = top.receiveShadow = true; g.add(top);
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, 0.8, 2.2, 3, 0.25), M.rock); body.position.set(cx, y + 0.45, 0); body.castShadow = body.receiveShadow = true; g.add(body);
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w * 0.45, 1.4), 1.3, 7), M.rock); bottom.position.set(cx, y - 0.45, 0); bottom.rotation.x = Math.PI; bottom.scale.z = 0.8; bottom.castShadow = true; g.add(bottom);
  for (let i = 0; i < w; i++) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6 + R() * 0.9, 5), M.leaf3); v.position.set(x + 0.4 + i, y + 0.3 - R() * 0.4, 1.12); g.add(v); }
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
  const mid = layer('bg/vadi-orta.webp', -26, 18, -4.5, { alpha: true, aspect: 1532 / 941, order: 2, tint: 0xe8f4e0, fill: 0x2c7a2c });
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
      if (R() < 0.22) root.add(bush(i + 0.5, h, -1.1 - R() * 0.4, 0.7 + R() * 0.5));
      if (R() < 0.35) root.add(flower(i + R(), h, -0.9 + R() * 0.3));
      if (R() < 0.3) root.add(flower(i + R(), h, 1.1 + R() * 0.3));
    }
    x = e + 1;
  }
  for (const p of L.plats) root.add(floatRock(p.x, p.y, p.w));
  // ön kenarda küçük çimen tutamları
  const blade = new THREE.ConeGeometry(0.05, 0.32, 3);
  const pts = []; for (let i = 0; i < L.w; i += 0.18) if (L.cols[Math.floor(i)] > 0) pts.push([i + R() * 0.1, L.cols[Math.floor(i)], 1.15 + R() * 0.45]);
  const im = new THREE.InstancedMesh(blade, M.blade, pts.length); const o = new THREE.Object3D();
  pts.forEach(([a, b, c], k) => { o.position.set(a, b + 0.12, c); o.rotation.set((R() - 0.5) * 0.5, R() * 3, (R() - 0.5) * 0.5); o.scale.setScalar(0.7 + R() * 0.8); o.updateMatrix(); im.setMatrixAt(k, o.matrix); });
  root.add(im);
  return root;
}

// ---------- Oyun nesneleri ----------
export function makeCoin() {
  mats();
  const g = new THREE.Group();
  const c = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 28), M.gold); c.rotation.x = Math.PI / 2; g.add(c);
  const s = mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 24), M.gold, 0, 0, 0.045, false); g.add(s);
  return g;
}

/** Kafes: taban, yuvarlak kubbe, parmaklıklar ve asma kilit. bars dizisi kırılırken dağılır */
export function makeCage() {
  mats();
  const g = new THREE.Group(); const bars = [];
  const base = mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.14, 24), M.iron, 0, 0.07, 0); g.add(base);
  const dome = mesh(new THREE.SphereGeometry(0.72, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.iron, 0, 1.25, 0); dome.scale.y = 0.45; g.add(dome); bars.push(dome);
  const ring = mesh(new THREE.TorusGeometry(0.71, 0.035, 8, 32), M.rust, 0, 1.25, 0); ring.rotation.x = Math.PI / 2; g.add(ring); bars.push(ring);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const b = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.15, 6), M.rust, Math.cos(a) * 0.7, 0.68, Math.sin(a) * 0.7); g.add(b); bars.push(b);
  }
  const hook = mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), M.iron, 0, 1.62, 0); g.add(hook); bars.push(hook);
  const lock = new THREE.Group(); lock.position.set(0, 0.6, 0.74);
  lock.add(mesh(new RoundedBoxGeometry(0.22, 0.2, 0.08, 2, 0.03), M.gold));
  const sh = mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 14, Math.PI), M.iron, 0, 0.1, 0); lock.add(sh);
  g.add(lock); bars.push(lock);
  g.userData.bars = bars;
  return g;
}

/** Zıplatan mantar: pembe benekli şapka, yaylı sap */
export function makeSpring() {
  mats();
  const g = new THREE.Group();
  const coil = new THREE.Group(); g.add(coil);
  for (let i = 0; i < 4; i++) { const t = mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 18), M.iron, 0, 0.12 + i * 0.1, 0); t.rotation.x = Math.PI / 2; coil.add(t); }
  const capM = new THREE.MeshStandardMaterial({ color: 0xff5aa8, roughness: 0.45, emissive: 0x6a1040, emissiveIntensity: 0.35 });
  const cap = mesh(new THREE.SphereGeometry(0.62, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, 0.5, 0); cap.scale.y = 0.6; g.add(cap);
  for (let i = 0; i < 7; i++) { const a = R() * Math.PI * 2, r = 0.15 + R() * 0.35; const d = mesh(new THREE.SphereGeometry(0.07, 8, 6), M.white, Math.cos(a) * r, 0.5 + 0.36 * Math.sqrt(1 - (r / 0.62) ** 2), Math.sin(a) * r, false); d.scale.y = 0.4; g.add(d); }
  g.userData.cap = cap; g.userData.coil = coil;
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
