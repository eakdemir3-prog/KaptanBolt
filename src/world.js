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
/** Dünya teması: doku ve arka plan dosyaları (ilk kurulumdan önce seçilir) */
export const THEMES = {
  1: { n: 1, name: 'Yeşil Vadi', ground: 'props/ground.webp', soil: 'soil', bg: 'vadi', far: [0xf4fbff, 0x3f8f73], mid: [0xe8f4e0, 0x3a7330], fog: 0xbfe6ff, hemi: [0xe6f6ff, 0x7a8a4a, 1.9], sun: [0xfff1d6, 2.1] },
  2: { n: 2, name: 'Mantar Ormanı', ground: 'props/w2/ground.webp', soil: 'w2/soil', bg: 'mantar',
    spr: { bush1: ['w2/bush1', 400 / 293], bush2: ['w2/bush2', 400 / 278], bush3: ['w2/bush3', 400 / 285], flower1: ['w2/flower1', 400 / 315], flower2: ['w2/flower2', 394 / 239], flower3: ['w2/flower3', 400 / 210], flower4: ['w2/flower1', 400 / 315], flower5: ['w2/flower2', 394 / 239], flower6: ['w2/flower3', 400 / 210], stump: ['w2/stump', 350 / 283], rocks: ['w2/rocks', 400 / 245], log: ['w2/log', 1024 / 270], mushrooms: ['w2/flower3', 400 / 210], vines: ['w2/vines', 126 / 800], sign: ['w2/sign', 355 / 400] }, far: [0xffffff, 0x5a4f86], mid: [0xffffff, 0x1f5a4a], fog: 0xb9a3e0, enemy: { bocek: 'mantarcik', kirpi: 'salyangoz' }, animal: { kus: 'sincap', tilki: 'tavsan', maymun: 'geyik' }, hemi: [0xe4d8ff, 0x5a4a7a, 1.85], sun: [0xffe6f2, 1.9] },
};
export let THEME = THEMES[1];
/** Dünya değişince zemin dokuları yeniden yüklenir (süs resimleri adlarıyla önbellekte kalır). Değiştiyse true. */
export function applyTheme(n) {
  const T = THEMES[n] || THEMES[1]; if (T === THEME) return false;
  THEME = T; TALL = DIRT = SOIL = LIP = null; delete M.cap; delete M.side; delete M.soilM; delete M.lipM;
  return true;
}
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
  const o = THEME.spr?.[name]; if (o) { name = o[0]; aspect = o[1]; if (name === 'w2/vines') h *= 1.6; }
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
// ---------- Zemin: kavisli kenarlı, önü baştan sona boyalı doku ----------
// Uzun doku: üstte senin zemin resmin (çimen saçağı + toprak), altına resmin toprak kısmı aynalanarak eklenir
const TALL_H = GROUND_TW * 2;           // 1024x2048 kanvas = 3.6 x 7.2 kare
let TALL = null, DIRT = null;
function tallTextures() {
  if (TALL) return;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 2048;
  const d = document.createElement('canvas'); d.width = 512; d.height = 512;
  TALL = new THREE.CanvasTexture(c); TALL.colorSpace = THREE.SRGBColorSpace; TALL.wrapS = THREE.RepeatWrapping; TALL.anisotropy = 8;
  DIRT = new THREE.CanvasTexture(d); DIRT.colorSpace = THREE.SRGBColorSpace; DIRT.wrapS = DIRT.wrapT = THREE.MirroredRepeatWrapping; DIRT.anisotropy = 4;
  const g = c.getContext('2d'); g.fillStyle = '#9a4a1c'; g.fillRect(0, 0, 1024, 2048);
  const tt = TALL, dd = DIRT;
  new THREE.ImageLoader().load(THEME.ground, (img) => {
    g.drawImage(img, 0, 0, 1024, 682);
    // toprak kısmı (çimen ve kökler hariç) aşağıya aynalı kopyalanır
    const sy = 230, sh = 682 - sy; let y = 682, flip = true;
    while (y < 2048) { g.save(); if (flip) { g.translate(0, y + sh); g.scale(1, -1); g.drawImage(img, 0, sy, 1024, sh, 0, 0, 1024, sh); } else g.drawImage(img, 0, sy, 1024, sh, 0, y, 1024, sh); g.restore(); y += sh; flip = !flip; }
    tt.needsUpdate = true;
    d.getContext('2d').drawImage(img, 0, 300, 512, 300, 0, 0, 512, 512); dd.needsUpdate = true;
  });
}
const capMat = () => M.cap || (M.cap = new THREE.MeshStandardMaterial({ map: TALL, roughness: 0.92 }));
const sideMat = () => M.side || (M.side = new THREE.MeshStandardMaterial({ map: DIRT, roughness: 0.95, color: 0xd8c0b0 }));
/** Dış hattı verilen şekli z ekseninde kalınlaştırır; ön/arka yüze dünya koordinatlı uzun doku, yanlara toprak */
function soilBlock(shape, top, depth) {
  tallTextures();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, -0.13, -depth / 2); // pah payı: blok üstü çimen yüzeyinin altında kalsın
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const cap = geo.groups[0];
  for (let i = cap.start; i < cap.start + cap.count; i++) {
    const vi = geo.index ? geo.index.getX(i) : i;
    uv.setXY(vi, pos.getX(vi) / GROUND_TW, 1 - (top - 0.1 - pos.getY(vi)) / TALL_H);
  }
  const side = geo.groups[1];
  for (let i = side.start; i < side.start + side.count; i++) { const vi = geo.index ? geo.index.getX(i) : i; uv.setXY(vi, (pos.getX(vi) + pos.getZ(vi)) / 3, pos.getY(vi) / 3); }
  uv.needsUpdate = true;
  const m = new THREE.Mesh(geo, [capMat(), sideMat()]); m.receiveShadow = true;
  return m;
}
// Kesintisiz zemin: boşluklar arasındaki tüm basamaklar TEK parça. Toprak dünya koordinatıyla döşenir
// (basamak sınırında dikiş olmaz); çimen saçağı her düzlüğün üstüne ayrı şerit olarak, alta doğru kaybolarak eklenir.
let SOIL = null, LIP = null;
const SOIL_H = GROUND_TH * 452 / 682, LIP_H = GROUND_TH * 300 / 682;
function soilTextures() {
  if (SOIL) return;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 452;
  const l = document.createElement('canvas'); l.width = 1024; l.height = 300;
  SOIL = tex(THEME.soil, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }); // dikişsiz derin toprak
  LIP = new THREE.CanvasTexture(l); LIP.colorSpace = THREE.SRGBColorSpace; LIP.wrapS = THREE.RepeatWrapping; LIP.anisotropy = 8;
  c.getContext('2d').fillStyle = '#9a4a1c'; c.getContext('2d').fillRect(0, 0, 1024, 452);
  const lp = LIP;
  new THREE.ImageLoader().load(THEME.ground, (img) => {
    const g = l.getContext('2d'); g.drawImage(img, 0, 0, 1024, 300, 0, 0, 1024, 300);
    const d = g.getImageData(0, 0, 1024, 300); // alt 80 piksel saydamlaşarak toprağa karışır
    for (let y = 220; y < 300; y++) { const a = Math.round(255 * (1 - (y - 220) / 80)); for (let x = 0; x < 1024; x++) d.data[(y * 1024 + x) * 4 + 3] = a; }
    g.putImageData(d, 0, 0); lp.needsUpdate = true;
  });
}
function terrainRegion(L, xs, xe) {
  soilTextures();
  const g = new THREE.Group();
  const h = (x) => L.cols[x], bot = -8, r = 0.3, D = DEPTH - 0.28;
  const s = new THREE.Shape();
  // sol kenar (boşluğa bakan kavisli yamaç)
  let H = h(xs);
  s.moveTo(xs + 0.25, bot);
  s.bezierCurveTo(xs - 0.05, bot + 3, xs + 0.18, H - 2.4, xs - 0.06, H - 1.1);
  s.quadraticCurveTo(xs - 0.14, H - 0.45, xs, H - r); s.quadraticCurveTo(xs + 0.02, H, xs + r, H);
  // üst hat: basamaklarda yuvarlak dış köşeler
  for (let x = xs + 1; x <= xe; x++) {
    const nh = h(x); if (nh === H) continue;
    if (nh > H) { s.lineTo(x, H); s.lineTo(x, nh - r); s.quadraticCurveTo(x, nh, x + r, nh); }
    else { s.lineTo(x - r, H); s.quadraticCurveTo(x, H, x, H - r); s.lineTo(x, nh); }
    H = nh;
  }
  const Rr = xe + 1;
  s.lineTo(Rr - r, H); s.quadraticCurveTo(Rr - 0.02, H, Rr, H - r);
  s.quadraticCurveTo(Rr + 0.14, H - 0.45, Rr + 0.06, H - 1.1); s.bezierCurveTo(Rr - 0.18, H - 2.4, Rr + 0.05, bot + 3, Rr - 0.25, bot);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, -0.13, -D / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const ST = 4.2; // bir toprak karosu 4,2 kare
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / ST, pos.getY(i) / ST);
  const side = geo.groups[1];
  for (let i = side.start; i < side.start + side.count; i++) { const vi = geo.index ? geo.index.getX(i) : i; uv.setXY(vi, (pos.getX(vi) + pos.getZ(vi)) / ST, pos.getY(vi) / ST); }
  uv.needsUpdate = true;
  const soilM = M.soilM || (M.soilM = new THREE.MeshStandardMaterial({ map: SOIL, roughness: 0.95 }));
  const m = new THREE.Mesh(geo, [soilM, soilM]); m.receiveShadow = true; g.add(m);
  // her düzlük: üst çimen yüzeyi + öndeki çimen saçağı şeridi
  const front = D / 2 + 0.14 + 0.006;
  const lipM = M.lipM || (M.lipM = new THREE.MeshStandardMaterial({ map: LIP, transparent: true, roughness: 0.9, depthWrite: false }));
  let x = xs;
  while (x <= xe) {
    const hh = h(x); let e = x; while (e + 1 <= xe && h(e + 1) === hh) e++;
    const leftOut = x === xs || h(x - 1) < hh, rightOut = e === xe || h(e + 1) < hh;
    const x0 = x - (leftOut ? 0.1 : 0), x1 = e + 1 + (rightOut ? 0.1 : 0);
    // çimen saçağı: dış köşeleri yuvarlak şerit
    const ls = new THREE.Shape(), top = hh - 0.01, b0 = top - LIP_H;
    ls.moveTo(x0, b0); ls.lineTo(x1, b0);
    if (rightOut) { ls.lineTo(x1, top - r); ls.quadraticCurveTo(x1, top, x1 - r, top); } else ls.lineTo(x1, top);
    if (leftOut) { ls.lineTo(x0 + r, top); ls.quadraticCurveTo(x0, top, x0, top - r); } else ls.lineTo(x0, top);
    ls.closePath();
    const lg = new THREE.ShapeGeometry(ls, 8), lp = lg.attributes.position, lu = lg.attributes.uv;
    for (let i = 0; i < lu.count; i++) lu.setXY(i, lp.getX(i) / GROUND_TW, 1 - (top - lp.getY(i)) / LIP_H);
    const lip = new THREE.Mesh(lg, lipM); lip.position.z = front; lip.renderOrder = 1; lip.receiveShadow = true; g.add(lip);
    const w = e - x + 1;
    const tb = new THREE.Mesh(new RoundedBoxGeometry(w + (leftOut ? 0.2 : 0.02) + (rightOut ? 0.2 : 0.02), 0.3, DEPTH + 0.06, 3, 0.12), M.top);
    tb.position.set(x + w / 2 + (rightOut ? 0.09 : 0) - (leftOut ? 0.09 : 0), hh - 0.13, 0.03); tb.receiveShadow = true; g.add(tb);
    x = e + 1;
  }
  return g;
}
/** Yüzen ada: düz üst, yuvarlak köşeler, alttan kavisli çanak; önü aynı boyalı doku */
function floatRock(x, y, w) {
  const g = new THREE.Group();
  const top = y + 1, L = x - 0.08, Rr = x + w + 0.08, r = 0.28, belly = Math.min(1.5, 0.7 + w * 0.22);
  const s = new THREE.Shape();
  s.moveTo(L + r, top);
  s.lineTo(Rr - r, top); s.quadraticCurveTo(Rr, top, Rr, top - r);
  s.quadraticCurveTo(Rr + 0.08, top - 0.7, Rr - 0.25, top - 1.0);
  s.bezierCurveTo(Rr - w * 0.25, top - 1.0 - belly * 0.6, x + w * 0.62, top - 1.0 - belly, x + w * 0.5, top - 1.0 - belly);
  s.bezierCurveTo(x + w * 0.38, top - 1.0 - belly, L + w * 0.25, top - 1.0 - belly * 0.6, L + 0.25, top - 1.0);
  s.quadraticCurveTo(L - 0.08, top - 0.7, L, top - r); s.quadraticCurveTo(L, top, L + r, top);
  g.add(soilBlock(s, top, 1.7));
  const t = new THREE.Mesh(new RoundedBoxGeometry(w + 0.3, 0.28, 2.04, 3, 0.12), M.top); t.position.set(x + w / 2, top - 0.12, 0.02); t.receiveShadow = true; g.add(t);
  const nv = Math.max(1, Math.round(w / 2.5));
  for (let i = 0; i < nv; i++) { const hh = 1.0 + R() * 0.6; const v = sprite('vines', hh, 209 / 352); v.position.set(x + (i + 0.5) * w / nv + (R() - 0.5) * 0.4, top - 0.9 - hh * 0.75, 1.0); g.add(v); }
  if (w >= 2) for (let i = 0; i < 2; i++) { const k = Math.floor(R() * 6); const f = sprite(`flower${k + 1}`, 0.4, FLOWER_A[k]); f.position.set(x + 0.4 + R() * (w - 0.8), top - 0.02, -0.45); g.add(f); }
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
export function backdrop(scene0, levelW) {
  const scene = new THREE.Group(); scene0.add(scene);
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
  const T = THEME;
  const sky = layer(`bg/${T.bg}-gok.webp`, -120, 120, -20, { aspect: 1672 / 941 });
  const far = layer(`bg/${T.bg}-uzak.webp`, -70, 46, -14, { alpha: true, aspect: 1532 / 941, order: 1, tint: T.far[0], fill: T.far[1] });
  const mid = layer(`bg/${T.bg}-orta.webp`, -26, 21, -9, { alpha: true, aspect: 1532 / 941, order: 2, tint: T.mid[0], fill: T.mid[1] });
  return { sky, far, mid, group: scene };
}

export function buildWorld(scene, L) {
  mats();
  const root = new THREE.Group(); scene.add(root);
  // zemin sıraları
  // boşluklar arasındaki her kara parçası tek gövde
  for (let x = 0; x < L.w; x++) {
    if (!L.cols[x]) continue;
    let e = x; while (e + 1 < L.w && L.cols[e + 1]) e++;
    root.add(terrainRegion(L, x, e)); x = e;
  }
  let x = 0;
  while (x < L.w) {
    const h = L.cols[x]; if (!h) { x++; continue; }
    let e = x; while (e + 1 < L.w && L.cols[e + 1] === h) e++;
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
const BOUNCE_A = { 1: 512 / 354, 2: 512 / 373, 3: 512 / 403 };
export function makeSpring(kind = null) {
  mats();
  const g = new THREE.Group();
  const sp = THEME.n === 2 ? sprite(`w2/bounce${kind || 2}`, 0.95 + (kind === 3 ? 0.12 : 0), BOUNCE_A[kind || 2]) : sprite('spring', 1.05, 400 / 345);
  sp.position.z = 0.3; g.add(sp); g.userData.spr = sp; return g;
}
/** Spor bulutu: altta bulut resmi, üstünde yukarı akan parıltılı ışık sütunu */
export function makeSpore(w, h) {
  mats();
  const g = new THREE.Group();
  const cw = w * 1.25, cloud = sprite('w2/spore', cw * 473 / 768, 768 / 473); cloud.material = cloud.material.clone(); cloud.material.alphaTest = 0.02; cloud.material.depthWrite = false; cloud.material.opacity = 0.9;
  cloud.position.set(w / 2, -0.55, 0.5); cloud.renderOrder = 2; g.add(cloud);
  const grad = canvasTex(16, 128, (c, W, H) => { const r = c.createLinearGradient(0, 0, 0, H); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.25, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0.55)'); c.fillStyle = r; c.fillRect(0, 0, W, H); const s = c.createLinearGradient(0, 0, W, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(0.5, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = s; c.fillRect(0, 0, W, H); }, false);
  const col = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: grad, color: 0x9afff0, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  col.position.set(w / 2, h / 2, 0.45); g.add(col);
  const dots = [];
  for (let i = 0; i < Math.round(w * h * 0.9); i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.05 + R() * 0.05, 8), new THREE.MeshBasicMaterial({ map: glowTex(), color: R() < 0.5 ? 0x9affea : 0xd9a8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); d.scale.setScalar(2.2); d.position.set(R() * w, R() * h, 0.6 + R() * 0.3); d.userData.v = 0.8 + R() * 1.4; g.add(d); dots.push(d); }
  g.userData = { dots, h, w, cloud, col };
  return g;
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
/** Işınlanma: alttan yukarı saydamlaşan ince mavi ışık, yukarı akan halkalar ve parlama */
export function makeBeam() {
  const g = new THREE.Group();
  const grad = canvasTex(4, 128, (c, w, h) => { const r = c.createLinearGradient(0, 0, 0, h); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.55, 'rgba(255,255,255,0.35)'); r.addColorStop(0.92, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,1)'); c.fillStyle = r; c.fillRect(0, 0, w, h); }, false);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 5, 28, 1, true), new THREE.MeshBasicMaterial({ map: grad, color: 0x6fe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.position.y = 2.5; g.add(beam);
  const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: 0xbaf6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); r.rotation.x = Math.PI / 2; g.add(r); return r; });
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xcff8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  flash.position.set(0, 2.2, 0.6); g.add(flash);
  return { g, beam, rings, flash, flashed: false };
}
/** Bölüm sonu portalı: taş-turkuaz çerçeve (resim) + arkasında dönen girdap (aynı resimden kesilmiş) */
export function makePortal() {
  mats();
  const g = new THREE.Group(), H = 3.1, W = H * 1309 / 1176, R = 0.2536 * W * 1.04, cy = (1 - 0.5621) * H;
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex('portal_frame'), transparent: true, alphaTest: 0.25, toneMapped: false }));
  const SINK = 0.27; // resmin altındaki boş pay: taş taban çimene otursun
  frame.geometry.translate(0, H / 2 - SINK, 0); frame.position.z = -0.6; g.add(frame);
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({ map: tex('portal_swirl'), transparent: true, toneMapped: false, depthWrite: false }));
  swirl.position.set(0, cy - SINK, -0.65); g.add(swirl);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(R * 1.9, 32), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0x7a6aff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.position.set(0, cy - SINK, -0.7); g.add(glow);
  g.userData = { frame, swirl, glow, cy: cy - SINK, R };
  return g;
}
/** Parçalı kafes (resim): gövde (arka parmaklıklar görünür), menteşeli kapı, altın kilit */
export function makeCage2D() {
  mats();
  const H = 2.0, k = H / 708, g = new THREE.Group();
  const pl = (name, w, h, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * k, h * k), mat || new THREE.MeshBasicMaterial({ map: tex(name), transparent: true, alphaTest: 0.3, toneMapped: false, side: THREE.DoubleSide })); return m; };
  const body = pl('cage_body', 755, 708); body.geometry.translate(0, 708 * k / 2, 0); body.position.set(0, -0.06, -0.1); g.add(body);
  // kalınlık: gövde resmi arkaya doğru koyulaşan katmanlarla tekrarlanır (yandan bakınca tahta kalınlığı görünür)
  for (let i = 1; i <= 7; i++) { const l = pl('cage_body', 755, 708, new THREE.MeshBasicMaterial({ map: tex('cage_body'), transparent: true, alphaTest: 0.3, toneMapped: false, color: new THREE.Color().setScalar(0.62 - i * 0.03) })); l.geometry.translate(0, 708 * k / 2, 0); l.position.set(0, -0.06, -0.1 - i * 0.035); g.add(l); }
  // kapı: menteşe (sol kenar) etrafında döner
  const hinge = new THREE.Group(); const dw = 518 * k, dh = 472 * k;
  // kapı gövdeye yakın (paralaks kaymasın); çerçevesinin ortası açıklığın ortasına (menteşe payı 31 px)
  hinge.position.set(-(31 + (518 - 31) / 2) * k, -0.06 + (302 - 236) * k, 0.1); g.add(hinge);
  // kapı: önü ve arkası resim, kenarları tahta (kağıt gibi ince görünmesin)
  const T = 0.11, dtex = tex('cage_door');
  const face = new THREE.MeshBasicMaterial({ map: dtex, transparent: true, alphaTest: 0.3, toneMapped: false });
  const door = new THREE.Group(); hinge.add(door);
  for (let i = 0; i <= 5; i++) { const l = pl('cage_door', 518, 472, i === 0 || i === 5 ? face : new THREE.MeshBasicMaterial({ map: dtex, transparent: true, alphaTest: 0.3, toneMapped: false, color: 0x8a5a30 })); l.geometry.translate(dw / 2, dh / 2, 0); l.position.z = T / 2 - (i / 5) * T; door.add(l); }
  const lock = pl('cage_lock', 211, 289); lock.scale.setScalar(0.62); lock.position.set(hinge.position.x + dw - 0.1, hinge.position.y + dh * 0.45, 0.14); g.add(lock);
  g.userData = { body, hinge, door, lock, lock0: lock.position.clone() };
  return g;
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
