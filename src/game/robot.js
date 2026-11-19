// Kaptan Bolt robotu: yuvarlak kask kafa, kafaya oturan siyah yüz camı, uzun parlayan gözler,
// ışıklı kulaklar, parmaklı yumruklar ve geniş çizmeler. Simgedeki karakterle aynı tasarım.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hasRobotModel, cloneRobotModel, makeAnimator, MODEL_HEIGHT } from './robotModel.js';

export const SKINS = [
  { id: 'klasik', name: 'Klasik Bolt', stars: 0, body: 0xe4e6ee, joint: 0x17181f, eye: 0x2ee8ff, hat: false },
  { id: 'kaptan', name: 'Kaptan Şapkası', stars: 0, body: 0xe4e6ee, joint: 0x17181f, eye: 0x2ee8ff, cap: 0x1d2a6b, band: 0xffc531 },
  { id: 'altin', name: 'Altın Kaptan', stars: 30, body: 0xffd77a, joint: 0x4a300c, eye: 0x52f4ff, cap: 0x7a1a1a, band: 0xffffff, metal: true },
  { id: 'korsan', name: 'Korsan', stars: 60, body: 0xe9e1cf, joint: 0x2e2116, eye: 0xffd54a, cap: 0x1a1a1a, band: 0xd02a2a, patch: true },
  { id: 'ninja', name: 'Ninja', stars: 100, body: 0x34384a, joint: 0x0e0f14, eye: 0xff4a5a, cap: 0xd0182a, band: 0x1a1c24, headband: true },
  { id: 'buz', name: 'Buz Kristali', stars: 150, body: 0xdaf4ff, joint: 0x1f4f80, eye: 0x3affff, cap: 0x3a8ad0, band: 0xffffff },
  { id: 'lav', name: 'Lav Robotu', stars: 220, body: 0x4a3030, joint: 0x1a0a08, eye: 0xffa01a, cap: 0xff5a1a, band: 0xffcf3a },
  { id: 'neon', name: 'Neon', stars: 300, body: 0x2a1a50, joint: 0x0a0618, eye: 0x3affe0, cap: 0xff3ae0, band: 0x3affe0 },
  { id: 'kral', name: 'Kral Bolt', stars: 400, body: 0xffffff, joint: 0x5a1aa0, eye: 0x7affb0, cap: 0x6a1ab0, band: 0xffd54a, metal: true, crown: true },
  { id: 'pro', name: 'Pro Kaptan', stars: 0, pro: true, body: 0x23232c, joint: 0xffcf3a, eye: 0xffe14a, cap: 0xffcf3a, band: 0x1c1c24, metal: true },
];

// Göz parlaklığı (ton eşlemede rengin solmaması için 1'in altında)
const EYE_K = new THREE.Color(1.5, 1.5, 1.5); // 1'in üstü: bloom ile parlar, ACES'te doygun kalır
// Kafa elipsoidi (yarı eksenler)
const A = 0.4, B = 0.33, C = 0.35;

// --- Ortak dokular (bir kez üretilir) ---
let ENV = null, GLOW = null;
const eyeTex = new Map();
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Parlak yüzeylere yansıma veren yumuşak stüdyo ışığı */
function envMap() {
  if (ENV) return ENV;
  ENV = canvasTex(256, 128, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, '#ffffff'); v.addColorStop(0.22, '#e6e8ff'); v.addColorStop(0.45, '#6a62b0'); v.addColorStop(0.6, '#4a4290'); v.addColorStop(1, '#2a2458');
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    const s = g.createRadialGradient(w * 0.3, h * 0.28, 0, w * 0.3, h * 0.28, w * 0.12);
    s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    const c = g.createRadialGradient(w * 0.8, h * 0.5, 0, w * 0.8, h * 0.5, w * 0.16);
    c.addColorStop(0, 'rgba(80,230,255,0.9)'); c.addColorStop(1, 'rgba(80,230,255,0)'); g.fillStyle = c; g.fillRect(0, 0, w, h);
  });
  ENV.mapping = THREE.EquirectangularReflectionMapping;
  return ENV;
}
function glowTex() {
  if (GLOW) return GLOW;
  GLOW = canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  return GLOW;
}
/** Göz dokusu: ortası beyazımsı, kenarı göz renginde */
function eyeTexture(hex) {
  if (eyeTex.has(hex)) return eyeTex.get(hex);
  const col = new THREE.Color(hex), css = `#${col.getHexString()}`;
  const light = `#${col.clone().lerp(new THREE.Color(0xffffff), 0.12).getHexString()}`;
  const t = canvasTex(64, 64, (g, w) => {
    const r = g.createRadialGradient(w * 0.46, w * 0.42, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, light); r.addColorStop(0.45, css); r.addColorStop(1, css);
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  eyeTex.set(hex, t); return t;
}

// --- Kafa yüzeyine oturan parçalar (cam, gözler, göz bandı) ---
/** Elipsoid üstündeki (x,y) noktasını yüzeye taşır, dışarı doğru 'off' kadar kaldırır */
function onHead(x, y, off) {
  const z = C * Math.sqrt(Math.max(0.0001, 1 - (x / A) ** 2 - (y / B) ** 2));
  const n = new THREE.Vector3(x / (A * A), y / (B * B), z / (C * C)).normalize();
  return new THREE.Vector3(x, y, z).addScaledVector(n, off);
}
/**
 * Kafaya yapışık eğri yama. Sınır: süper elips (n), üst kenar 'flare' kadar geniş.
 * Köşeler merkeze göre tutulur; böylece yama kendi merkezinde ölçeklenebilir (göz ifadeleri).
 */
function headPatch(cx, cy, hw, hh, off, { n = 2, flare = 0, rings = 14, segs = 64 } = {}) {
  const center = onHead(cx, cy, off);
  const pos = [], uv = [], idx = [];
  pos.push(0, 0, 0); uv.push(0.5, 0.5);
  for (let r = 1; r <= rings; r++) {
    const k = r / rings;
    for (let s = 0; s < segs; s++) {
      const t = (s / segs) * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
      const ex = Math.sign(c) * Math.abs(c) ** (2 / n), ey = Math.sign(si) * Math.abs(si) ** (2 / n);
      const x = cx + hw * ex * k * (1 + flare * ey), y = cy + hh * ey * k;
      const p = onHead(x, y, off).sub(center);
      pos.push(p.x, p.y, p.z); uv.push(0.5 + 0.5 * ex * k, 0.5 + 0.5 * ey * k);
    }
  }
  for (let s = 0; s < segs; s++) idx.push(0, 1 + s, 1 + ((s + 1) % segs));
  for (let r = 1; r < rings; r++) {
    const a = 1 + (r - 1) * segs, b = 1 + r * segs;
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs;
      idx.push(a + s, b + s, b + s1, a + s, b + s1, a + s1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return { geo: g, center };
}
/** Kafa yüzeyinde ince oluk çizgisi (kask panelleri) */
function headSeam(points, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => onHead(x, y, 0.0015)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.003, 6, false), mat);
}

const mesh = (g, m, p = [0, 0, 0], cast = true) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.castShadow = cast; o.receiveShadow = true; return o; };

/** Kostüm aksesuarları (şapka, taç, kafa bandı, göz bandı): kafa merkezli gruba eklenir */
function addAccessories(skin, head) {
  if (skin.hat !== false && skin.cap && !skin.headband) {
    const capM = new THREE.MeshStandardMaterial({ color: skin.cap, roughness: 0.5 });
    const bandM = new THREE.MeshStandardMaterial({ color: skin.band, metalness: 0.6, roughness: 0.3, emissive: skin.band, emissiveIntensity: 0.15 });
    const cap = new THREE.Group(); cap.position.set(0, 0.29, -0.03); cap.rotation.x = -0.1; cap.scale.setScalar(1.05); head.add(cap);
    if (skin.crown) {
      cap.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 6, 1, true), bandM, [0, 0.03, 0]));
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cap.add(mesh(new THREE.ConeGeometry(0.035, 0.08, 4), bandM, [Math.sin(a) * 0.2, 0.11, Math.cos(a) * 0.2])); }
      cap.add(mesh(new THREE.OctahedronGeometry(0.04), capM, [0, 0.03, 0.215]));
    } else {
      cap.add(mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.12, 32), capM, [0, 0.04, 0]));
      cap.add(mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.04, 32), bandM, [0, -0.01, 0]));
      const brim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 24, 1, false, -Math.PI / 2, Math.PI), capM, [0, -0.03, 0.08]); brim.scale.z = 1.2; cap.add(brim);
      cap.add(mesh(new THREE.OctahedronGeometry(0.045), bandM, [0, 0.04, 0.23]));
    }
  }
  if (skin.headband) {
    const bm = new THREE.MeshStandardMaterial({ color: skin.cap, roughness: 0.55 });
    const y = 0.17, k = Math.sqrt(1 - (y / B) ** 2);
    const band = mesh(new THREE.TorusGeometry(1, 0.075, 10, 64), bm, [0, y, 0]); band.rotation.x = Math.PI / 2; band.scale.set(A * k + 0.012, C * k + 0.012, 0.4); head.add(band);
    for (const r of [0.5, 0.15]) { const t = mesh(new RoundedBoxGeometry(0.05, 0.2, 0.015, 2, 0.007), bm, [0.06, y - 0.08, -C * k - 0.02]); t.rotation.set(0.2, 0, r); head.add(t); }
  }
  if (skin.patch) {
    const pm = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.6 });
    const p = headPatch(0.108, -0.02, 0.07, 0.095, 0.014, { n: 2.4 });
    head.add(mesh(p.geo, pm, p.center.toArray(), false));
    const strap = []; for (let i = 0; i <= 16; i++) { const x = -0.38 + (0.76 * i) / 16; strap.push([x, -0.02 + 0.2 * (0.38 - Math.abs(x - 0.108)) * (x > 0.108 ? -0.6 : 0.9) * 0.5]); }
    const s = headSeam(strap, pm); s.geometry.dispose(); s.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strap.map(([x, y]) => onHead(x, y, 0.012))), 48, 0.009, 6, false); head.add(s);
  }

}

/** robot.glb modeliyle robot: gövde tek parça, oyundaki dönüş/zıplama/sallanma aynı */
function makeModelRobot(skin) {
  const root = new THREE.Group(), turn = new THREE.Group(), body = new THREE.Group(), wrap = new THREE.Group();
  root.add(turn); turn.add(body); body.add(wrap);
  const { model, mat } = cloneRobotModel(skin);
  wrap.add(model);
  // kafa: modelin üst kısmı; aksesuarlar buraya takılır
  // kafa kemiğine bağlı grup: aksesuarlar kafayla birlikte hareket eder
  const head = new THREE.Group();
  let headBone = null; model.traverse((o) => { if (o.isBone && /Head$/.test(o.name)) headBone = o; });
  wrap.add(head); head.position.set(0, MODEL_HEIGHT - 0.26, 0); head.scale.setScalar(0.78);
  addAccessories(skin, head);
  const dummy = () => { const o = new THREE.Group(); o.userData.y0 = 0; o.userData.hand = new THREE.Group(); body.add(o); return o; };
  const anim = makeAnimator(model);
  root.scale.setScalar(1.2);
  root.userData = { body, turn, head: wrap, eyeL: dummy(), eyeR: dummy(), legL: dummy(), legR: dummy(), armL: dummy(), armR: dummy(), eyeMat: mat, eyeColor: skin.eye, glb: true, mat, anim, headBone, headGroup: head };
  if (headBone) { // aksesuarları kafa kemiğine taşı (kemik ölçeğini dengele)
    model.updateMatrixWorld(true); wrap.updateMatrixWorld(true);
    headBone.attach(head);
  }
  return root;
}

export function makeRobot(skin = SKINS[0]) {
  if (hasRobotModel()) return makeModelRobot(skin);
  const env = envMap();
  const metal = !!skin.metal;
  const M = {
    white: new THREE.MeshPhysicalMaterial({ color: skin.body, roughness: metal ? 0.28 : 0.42, metalness: metal ? 0.5 : 0, clearcoat: 0.35, clearcoatRoughness: 0.35, envMap: env, envMapIntensity: metal ? 0.6 : 0.22 }),
    seam: new THREE.MeshStandardMaterial({ color: new THREE.Color(skin.body).multiplyScalar(0.8), roughness: 0.6 }),
    joint: new THREE.MeshPhysicalMaterial({ color: skin.joint, roughness: 0.3, metalness: 0.2, clearcoat: 0.5, envMap: env, envMapIntensity: 0.3 }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x020205, roughness: 0.12, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.15, envMap: env, envMapIntensity: 0.35 }),
    eye: new THREE.MeshBasicMaterial({ color: EYE_K, map: eyeTexture(skin.eye), toneMapped: false }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(skin.eye).multiplyScalar(2.0), toneMapped: false }),
    halo: new THREE.SpriteMaterial({ map: glowTex(), color: skin.eye, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  };
  const halo = (sx, sy, p, parent) => { const s = new THREE.Sprite(M.halo); s.scale.set(sx, sy, 1); s.position.copy(p); s.renderOrder = 2; parent.add(s); return s; };

  const root = new THREE.Group(), turn = new THREE.Group(), body = new THREE.Group();
  root.add(turn); turn.add(body);

  // --- Bacaklar: siyah kalça, geniş ağızlı beyaz çizme ---
  const bootGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.0, -0.258), new THREE.Vector2(0.098, -0.258), new THREE.Vector2(0.11, -0.252), new THREE.Vector2(0.112, -0.235), new THREE.Vector2(0.102, -0.205),
    new THREE.Vector2(0.086, -0.15), new THREE.Vector2(0.074, -0.09), new THREE.Vector2(0.064, -0.05), new THREE.Vector2(0.0, -0.05),
  ], 40);
  const leg = (sx) => {
    const g = new THREE.Group(); g.position.set(sx * 0.085, 0.29, 0);
    g.add(mesh(new THREE.SphereGeometry(0.056, 20, 14), M.joint));
    g.add(mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.06, 18), M.joint, [0, -0.05, 0]));
    const boot = mesh(bootGeo, M.white, [0, 0, 0.004]); boot.scale.z = 1.08; g.add(boot);
    g.add(mesh(new THREE.CylinderGeometry(0.094, 0.094, 0.012, 32), M.joint, [0, -0.255, 0.004]));
    body.add(g); return g;
  };
  const legL = leg(-1), legR = leg(1);

  // --- Gövde: çan biçimli, göğüste parlayan panel ---
  const torsoGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.12, 0.0), new THREE.Vector2(0.152, 0.02), new THREE.Vector2(0.168, 0.07),
    new THREE.Vector2(0.168, 0.13), new THREE.Vector2(0.155, 0.19), new THREE.Vector2(0.125, 0.235), new THREE.Vector2(0.08, 0.258), new THREE.Vector2(0.0, 0.262),
  ], 48);
  const torso = mesh(torsoGeo, M.white, [0, 0.335, 0]); torso.scale.z = 0.82; body.add(torso);
  const waist = mesh(new THREE.TorusGeometry(0.128, 0.026, 12, 40), M.joint, [0, 0.338, 0]); waist.rotation.x = Math.PI / 2; waist.scale.y = 0.82; body.add(waist);
  body.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 28), M.joint, [0, 0.31, 0]));
  const panelFrame = mesh(new RoundedBoxGeometry(0.098, 0.066, 0.03, 2, 0.012), M.joint, [0.045, 0.46, 0.128]); panelFrame.rotation.y = 0.22; body.add(panelFrame);
  const panel = mesh(new RoundedBoxGeometry(0.08, 0.048, 0.02, 2, 0.01), M.glow, [0.047, 0.46, 0.138], false); panel.rotation.y = 0.22; body.add(panel);
  halo(0.16, 0.12, new THREE.Vector3(0.05, 0.46, 0.16), body);
  body.add(mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.07, 24), M.joint, [0, 0.62, 0]));

  // --- Kollar: omuzdan döner. +z sağ kolu kaldırır, -z sol kolu ---
  const fist = (sx) => {
    const f = new THREE.Group();
    f.add(mesh(new RoundedBoxGeometry(0.1, 0.09, 0.095, 3, 0.036), M.white, [0, 0, 0]));
    for (let k = 0; k < 4; k++) {
      const fg = mesh(new THREE.CapsuleGeometry(0.02, 0.034, 6, 10), M.white, [-0.033 + k * 0.022, -0.035, 0.035]);
      fg.rotation.x = Math.PI / 2; f.add(fg);
    }
    const th = mesh(new THREE.CapsuleGeometry(0.019, 0.04, 6, 10), M.white, [-sx * 0.05, 0.005, 0.03]); th.rotation.z = 0.5 * sx; th.rotation.x = 0.4; f.add(th);
    return f;
  };
  const arm = (sx) => {
    const g = new THREE.Group(); g.position.set(sx * 0.2, 0.545, 0);
    g.add(mesh(new THREE.SphereGeometry(0.052, 18, 14), M.joint));
    g.add(mesh(new THREE.CapsuleGeometry(0.043, 0.035, 6, 14), M.white, [sx * 0.008, -0.065, 0]));
    g.add(mesh(new THREE.SphereGeometry(0.04, 14, 10), M.joint, [sx * 0.012, -0.112, 0]));
    g.add(mesh(new THREE.CapsuleGeometry(0.05, 0.03, 6, 14), M.white, [sx * 0.016, -0.158, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.022, 18), M.joint, [sx * 0.019, -0.2, 0]));
    const f = fist(sx); f.position.set(sx * 0.022, -0.25, 0.006); g.add(f);
    g.rotation.z = sx * 0.16; body.add(g); g.userData.hand = f; return g;
  };
  const armL = arm(-1), armR = arm(1);

  // --- Kafa ---
  const head = new THREE.Group(); head.position.y = 0.955; head.rotation.x = -0.22; body.add(head);
  const shell = mesh(new THREE.SphereGeometry(1, 64, 48), M.white); shell.scale.set(A, B, C); head.add(shell);
  // kask panel çizgileri
  const arc = []; for (let i = 0; i <= 16; i++) { const x = -0.33 + (0.66 * i) / 16; arc.push([x, 0.215 - 0.12 * (x / 0.33) ** 2]); }
  head.add(headSeam(arc, M.seam));
  // yüz camı
  const vis = headPatch(0, -0.035, 0.292, 0.188, 0.004, { n: 3.4, flare: 0.07, rings: 18, segs: 96 });
  const visor = mesh(vis.geo, M.visor, vis.center.toArray()); head.add(visor);
  // camdaki yumuşak parlama
  const shine = headPatch(-0.12, 0.08, 0.09, 0.035, 0.007, { n: 2 });
  head.add(mesh(shine.geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.09, depthWrite: false }), shine.center.toArray(), false));
  // gözler
  const eye = (x) => {
    const p = headPatch(x, -0.02, 0.047, 0.078, 0.01, { n: 2, rings: 8, segs: 40 });
    const e = mesh(p.geo, M.eye, p.center.toArray(), false); e.userData.y0 = p.center.y; head.add(e);
    halo(0.15, 0.2, p.center.clone().add(new THREE.Vector3(0, 0, 0.02)), head);
    return e;
  };
  const eyeL = eye(-0.108), eyeR = eye(0.108);
  // kulaklar: beyaz kapak, siyah halka, ışıklı halka
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(sx * 0.392, -0.02, 0); ear.rotation.z = Math.PI / 2; head.add(ear);
    ear.add(mesh(new THREE.CylinderGeometry(0.108, 0.112, 0.07, 36), M.white, [0, 0, 0]));
    const r1 = mesh(new THREE.TorusGeometry(0.08, 0.014, 12, 40), M.joint, [0, -sx * 0.036, 0]); r1.rotation.x = Math.PI / 2; ear.add(r1);
    const r2 = mesh(new THREE.TorusGeometry(0.058, 0.012, 12, 40), M.glow, [0, -sx * 0.038, 0], false); r2.rotation.x = Math.PI / 2; ear.add(r2);
    ear.add(mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.02, 28), M.joint, [0, -sx * 0.03, 0]));
    halo(0.14, 0.14, new THREE.Vector3(sx * 0.44, -0.02, 0), head);
  }

  addAccessories(skin, head);
  root.scale.setScalar(1.18);
  root.userData = { body, turn, head, eyeL, eyeR, legL, legR, armL, armR, eyeMat: M.eye, eyeColor: skin.eye, eyeTexColor: skin.eye };
  return root;
}

/** Yüz ifadeleri: gözler uzun oval; mutluyken hafif basık ve yukarıda, üzgünken yassı ve aşağıda */
export function setRobotFace(robot, face) {
  const { eyeL, eyeR, eyeMat } = robot.userData;
  if (robot.userData.glb) {
    // gözler dokuda: ifadeyi parıltının gücü ve rengiyle ver
    const m = robot.userData.mat;
    if (face === 'happy') { m.emissive.set(robot.userData.eyeColor); m.emissiveIntensity = 1.7; }
    else if (face === 'sad') { m.emissive.set(0x5a7aff); m.emissiveIntensity = 0.7; }
    else { m.emissive.set(robot.userData.eyeColor); m.emissiveIntensity = 1.1; }
    return;
  }
  const set = (sx, sy, dy) => { for (const e of [eyeL, eyeR]) { e.scale.set(sx, sy, 1); e.position.y = e.userData.y0 + dy; } };
  if (face === 'happy') { set(1.05, 0.82, 0.012); eyeMat.color.set(EYE_K); }
  else if (face === 'sad') { set(1.0, 0.42, -0.03); eyeMat.color.setRGB(1.0, 1.1, 1.6); }
  else { set(1, 1, 0); eyeMat.color.set(EYE_K); }
}
