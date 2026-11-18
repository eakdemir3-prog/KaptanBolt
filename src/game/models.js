// 3D modeller: Kaptan Bolt robotu, anahtar, kapı, kareler. Hepsi basit geometrilerden üretilir.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const THEMES = {
  1: { name: 'Taş Zindan', bg: 0x110c30, fog: 0x140e38, wall: 0x1a1448, rock: 0x221c55, rock2: 0x2e2770,
       tile: 0x34d6f2, tileEm: 0x0a6f93, side: 0x0e7aa0, torch: 0xb05cff, flame: 0xe2a6ff, crystal: 0xb47cff, crystalEm: 0x8a3dff, particle: 0x5ff3ff, hemi: 0x9d8cff },
  2: { name: 'Anahtar Mahzeni', bg: 0x1a0f22, fog: 0x22121e, wall: 0x2a1726, rock: 0x3a2233, rock2: 0x4a2c3c,
       tile: 0x3fdcd0, tileEm: 0x0b6f6a, side: 0x0f7a72, torch: 0xff9a2e, flame: 0xffd27a, crystal: 0xffc14a, crystalEm: 0xff8a00, particle: 0xffd56a, hemi: 0xffb98a },
  3: { name: 'Buz Mağarası', bg: 0x07142e, fog: 0x0b1d3d, wall: 0x0f2650, rock: 0x173263, rock2: 0x1f3f78,
       tile: 0x3fc4f5, tileEm: 0x0a5f93, side: 0x0e6aa0, torch: 0x7fe8ff, flame: 0xe8fbff, crystal: 0x9fe6ff, crystalEm: 0x3fb8ff, particle: 0xffffff, hemi: 0xa8d8ff },
  4: { name: 'Devriye Fabrikası', bg: 0x1c0d12, fog: 0x24111a, wall: 0x2b1520, rock: 0x3a1f2a, rock2: 0x4a2633,
       tile: 0x36d0e8, tileEm: 0x0a6f88, side: 0x0e7090, torch: 0xff4a3a, flame: 0xffb0a0, crystal: 0xff5a4a, crystalEm: 0xd01e10, particle: 0xff9a6a, hemi: 0xff9a9a },
  5: { name: 'Yosunlu Kale', bg: 0x0c1a12, fog: 0x10241a, wall: 0x14281c, rock: 0x1e3a28, rock2: 0x284a33,
       tile: 0x3ee0c0, tileEm: 0x0a7060, side: 0x0e7a68, torch: 0x8aff5a, flame: 0xd8ffb8, crystal: 0x7aff8a, crystalEm: 0x1fc040, particle: 0xb8ff9a, hemi: 0xb8ffc8 },
  6: { name: 'Işınlanma Labı', bg: 0x170a2a, fog: 0x1e0e36, wall: 0x241142, rock: 0x2e1856, rock2: 0x3a1f6a,
       tile: 0x46d8ff, tileEm: 0x0a6aa0, side: 0x0e6ab0, torch: 0xff4ae0, flame: 0xffb8f4, crystal: 0xff6ae8, crystalEm: 0xc01ab8, particle: 0xff9af0, hemi: 0xe8a8ff },
  7: { name: 'Takipçi İni', bg: 0x150808, fog: 0x1f0c0c, wall: 0x241010, rock: 0x341616, rock2: 0x441c1c,
       tile: 0x34ccdc, tileEm: 0x0a6070, side: 0x0e6878, torch: 0xff7a1a, flame: 0xffc890, crystal: 0xff8a2a, crystalEm: 0xd04a00, particle: 0xffa860, hemi: 0xffb08a },
};
THEMES[8] = { name: 'Köprü Ustası', bg: 0x1a1208, fog: 0x22180c, wall: 0x2a1e10, rock: 0x3a2a18, rock2: 0x4a3620,
  tile: 0x3fd6e6, tileEm: 0x0a6a80, side: 0x0e7088, torch: 0xffa83a, flame: 0xffe0a0, crystal: 0xffb04a, crystalEm: 0xd07000, particle: 0xffc87a, hemi: 0xffd0a0 };
THEMES[9] = { name: 'Ok Labirenti', bg: 0x0a1a1a, fog: 0x0e2424, wall: 0x102c2c, rock: 0x173a3a, rock2: 0x1f4a48,
  tile: 0x46e0f0, tileEm: 0x0a6a7a, side: 0x0e7080, torch: 0xffe14a, flame: 0xfff4b8, crystal: 0xffe14a, crystalEm: 0xc0a000, particle: 0xfff08a, hemi: 0xd8ffe8 };
THEMES[10] = { name: 'Son Kale', bg: 0x14060e, fog: 0x1c0a14, wall: 0x240c18, rock: 0x341222, rock2: 0x46182c,
  tile: 0x3ad2ec, tileEm: 0x0a6488, side: 0x0e6c90, torch: 0xffcf3a, flame: 0xfff0b0, crystal: 0xffcf3a, crystalEm: 0xff6a00, particle: 0xffd56a, hemi: 0xffc0c0 };
export const PORTAL_COLORS = [0xff4ae0, 0x4affb0, 0xffd54a, 0x4a9aff];

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
const mesh = (g, m, p = [0, 0, 0], cast = true) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.castShadow = cast; o.receiveShadow = true; return o; };

export function makeMaterials(th) {
  return {
    tile: std(th.tile, { emissive: th.tileEm, emissiveIntensity: 0.28, roughness: 0.45 }),
    side: std(th.side, { emissive: th.tileEm, emissiveIntensity: 0.3 }),
    ice: std(0xeefcff, { emissive: 0x7fd6ff, emissiveIntensity: 0.14, roughness: 0.1, metalness: 0.15 }),
    rock: std(th.rock, { roughness: 0.9 }), rock2: std(th.rock2, { roughness: 0.85 }),
    wall: std(th.wall, { roughness: 1 }),
    pit: std(0x04020c, { roughness: 1 }),
    crystal: std(th.crystal, { emissive: th.crystalEm, emissiveIntensity: 1.1, roughness: 0.2 }),
    flame: new THREE.MeshBasicMaterial({ color: th.flame }),
    crack: new THREE.MeshBasicMaterial({ color: th.side, transparent: true, opacity: 0.55 }),
    strong: std(0x7d8a9e, { roughness: 0.75, emissive: 0x1a2a3a, emissiveIntensity: 0.3 }),
  };
}

// --- Kareler ---
const tileGeo = new RoundedBoxGeometry(0.9, 0.36, 0.9, 4, 0.08);
const crackGeo = new THREE.PlaneGeometry(0.5, 0.02);
export function makeTile(M, ice, seed) {
  const g = new THREE.Group();
  const body = mesh(tileGeo, ice ? M.ice : M.tile);
  g.add(body);
  if (!ice) {
    const n = 1 + (seed % 2);
    for (let k = 0; k < n; k++) {
      const c = new THREE.Mesh(crackGeo, M.crack);
      c.rotation.x = -Math.PI / 2; c.rotation.z = ((seed * 37 + k * 71) % 180) * Math.PI / 180;
      c.position.set(((seed * 13 + k * 29) % 30) / 100 - 0.15, 0.181, ((seed * 17 + k * 41) % 30) / 100 - 0.15);
      g.add(c);
    }
  } else {
    const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    shine.rotation.x = -Math.PI / 2; shine.rotation.z = Math.PI / 4; shine.position.set(-0.08, 0.182, -0.08);
    g.add(shine);
    const shine2 = shine.clone(); shine2.scale.set(0.5, 1, 1); shine2.position.set(0.14, 0.182, 0.1); g.add(shine2);
  }
  g.userData.body = body;
  return g;
}
const strongGeo = new RoundedBoxGeometry(0.9, 0.42, 0.9, 4, 0.06);
export function makeStrongTile(M) {
  const g = new THREE.Group();
  const body = mesh(strongGeo, M.strong, [0, 0.03, 0]);
  g.add(body);
  const band = new THREE.MeshStandardMaterial({ color: 0x9aa4b8, metalness: 0.8, roughness: 0.3 });
  for (const z of [-0.25, 0.25]) g.add(mesh(new THREE.BoxGeometry(0.92, 0.06, 0.08), band, [0, 0.2, z], false));
  for (const x of [-0.3, 0.3]) for (const z of [-0.25, 0.25]) g.add(mesh(new THREE.SphereGeometry(0.035, 8, 8), band, [x, 0.24, z], false));
  const cracks = new THREE.Group(); cracks.visible = false; g.add(cracks);
  const cm = new THREE.MeshBasicMaterial({ color: 0x1a1a2a });
  for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.035), cm); c.rotation.x = -Math.PI / 2; c.rotation.z = k * 0.9 + 0.3; c.position.set((k % 2 ? 0.1 : -0.1), 0.245, (k > 1 ? 0.1 : -0.1)); cracks.add(c); }
  g.userData = { body, cracks };
  return g;
}
export function makePortalTile(M, color) {
  const g = makeTile(M, false, 1);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 36), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; g.add(ring);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })); core.rotation.x = -Math.PI / 2; core.position.y = 0.19; g.add(core);
  const swirl = new THREE.Group(); swirl.position.y = 0.195; g.add(swirl);
  for (let k = 0; k < 3; k++) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 16, Math.PI * 0.8), ringMat); a.rotation.x = -Math.PI / 2; a.rotation.z = (k * Math.PI * 2) / 3; swirl.add(a); }
  const l = new THREE.PointLight(color, 3, 1.6); l.position.y = 0.5; g.add(l);
  g.userData.swirl = swirl; g.userData.portal = true;
  return g;
}
const wood = () => std(0xa8743f, { roughness: 0.8 });
export function makeBridgeTile() {
  const g = new THREE.Group(), m = wood(), dark = std(0x6a4320, { roughness: 0.9 });
  const body = mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), dark, [0, 0.06, 0]); g.add(body);
  for (let k = 0; k < 4; k++) g.add(mesh(new RoundedBoxGeometry(0.88, 0.1, 0.2, 2, 0.03), m, [0, 0.15, -0.33 + k * 0.22]));
  for (const x of [-0.36, 0.36]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), dark, [x, 0.21, 0]));
  g.userData = { body };
  return g;
}
export function makeBridgeGhost() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.35, depthWrite: false });
  for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.12), mat); p.rotation.x = -Math.PI / 2; p.position.set(0, -0.06, -0.33 + k * 0.22); g.add(p); }
  return g;
}
export function makeButtonTile(M) {
  const g = makeTile(M, false, 2);
  const base = mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 28), std(0x3a3f55, { metalness: 0.6, roughness: 0.3 }), [0, 0.2, 0]); g.add(base);
  const capMat = std(0xff3a4a, { emissive: 0xff1a2a, emissiveIntensity: 0.6, roughness: 0.3 });
  const cap = mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 28), capMat, [0, 0.27, 0]); g.add(cap);
  g.userData.cap = cap; g.userData.capMat = capMat;
  return g;
}
export function makeArrowTile(M, dir) {
  const g = makeTile(M, false, 3);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.95 });
  const ar = new THREE.Group(); ar.position.y = 0.185;
  for (let k = 0; k < 2; k++) {
    const sh = new THREE.Shape(); sh.moveTo(-0.22, -0.08); sh.lineTo(0, 0.12); sh.lineTo(0.22, -0.08); sh.lineTo(0.22, -0.18); sh.lineTo(0, 0.02); sh.lineTo(-0.22, -0.18);
    const c = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat); c.rotation.x = -Math.PI / 2; c.position.z = 0.1 - k * 0.2; ar.add(c);
  }
  ar.rotation.y = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[dir];
  g.add(ar); g.userData.arrow = ar; g.userData.arrowMat = mat;
  return g;
}
export function makePit(M) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.86, 0.02, 0.86), M.pit, [0, -0.09, 0], false));
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.025, 0.12), M.rock2); rim.position.set(0, -0.085, -0.37); g.add(rim);
  return g;
}

// --- Anahtar ---
const gold = () => std(0xffc531, { metalness: 0.85, roughness: 0.22, emissive: 0xff9d00, emissiveIntensity: 0.55 });
export function makeKey() {
  const g = new THREE.Group(), m = gold();
  const inner = new THREE.Group();
  inner.add(mesh(new THREE.TorusGeometry(0.13, 0.05, 16, 32), m, [0, 0.18, 0]));
  inner.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 12), m, [0, -0.08, 0]));
  inner.add(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), m, [0.07, -0.17, 0]));
  inner.add(mesh(new THREE.BoxGeometry(0.08, 0.05, 0.05), m, [0.06, -0.25, 0]));
  inner.rotation.z = 0.25; inner.scale.setScalar(1.35);
  g.add(inner);
  const glow = new THREE.PointLight(0xffc040, 3, 2); glow.position.y = 0.1; g.add(glow);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = -0.6; g.add(sh);
  g.userData = { inner, glow, shadow: sh, mat: m };
  return g;
}

// --- Kapı ---
export function makeDoor() {
  const g = new THREE.Group();
  const stone = std(0x8a77cc, { roughness: 0.7 }), stone2 = std(0x5a4aa0);
  const ph = 1.0;
  g.add(mesh(new THREE.BoxGeometry(0.18, ph, 0.3), stone, [-0.38, ph / 2, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.18, ph, 0.3), stone, [0.38, ph / 2, 0]));
  const arch = mesh(new THREE.TorusGeometry(0.38, 0.1, 10, 24, Math.PI), stone, [0, ph, 0]); arch.scale.z = 1.5; g.add(arch);
  for (let i = 0; i < 5; i++) { const a = (i / 4) * Math.PI; const b = mesh(new THREE.BoxGeometry(0.05, 0.06, 0.32), stone2, [Math.cos(a) * 0.38, ph + Math.sin(a) * 0.38, 0]); b.rotation.z = a; g.add(b); }
  const sh = new THREE.Shape(); sh.moveTo(-0.29, 0); sh.lineTo(-0.29, ph); sh.absarc(0, ph, 0.29, Math.PI, 0, true); sh.lineTo(0.29, 0); sh.lineTo(-0.29, 0);
  const portalMat = new THREE.MeshBasicMaterial({ color: 0xb35cff });
  const portal = mesh(new THREE.ShapeGeometry(sh), portalMat, [0, 0, 0.02], false); g.add(portal);
  const lockMat = new THREE.MeshBasicMaterial({ color: 0xfbe6ff, transparent: true });
  const lock = new THREE.Group();
  lock.add(mesh(new THREE.CircleGeometry(0.07, 20), lockMat, [0, 0.62, 0.03], false));
  const kh = new THREE.Shape(); kh.moveTo(-0.04, 0); kh.lineTo(0.04, 0); kh.lineTo(0.06, -0.2); kh.lineTo(-0.06, -0.2);
  lock.add(mesh(new THREE.ShapeGeometry(kh), lockMat, [0, 0.6, 0.03], false));
  g.add(lock);
  g.add(mesh(new THREE.BoxGeometry(0.98, 0.08, 0.4), stone2, [0, 0.04, 0]));
  const light = new THREE.PointLight(0xb060ff, 8, 3.2); light.position.set(0, 0.75, 0.5); g.add(light);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  ring.position.set(0, 0.55, 0.04); g.add(ring);
  g.userData = { portalMat, lock, lockMat, light, ring };
  return g;
}

// --- Kaptan Bolt ---
export const SKINS = [
  { id: 'klasik', name: 'Klasik Kaptan', stars: 0, body: 0xf3f6ff, grey: 0xcfd8e8, cap: 0x1d2a6b, band: 0xffc531, eye: 0x6ff6ff, bag: 0xb5733b },
  { id: 'altin', name: 'Altın Kaptan', stars: 30, body: 0xffe08a, grey: 0xe8b84a, cap: 0x7a1a1a, band: 0xffffff, eye: 0x6ff6ff, bag: 0x8a5a2a, metal: true },
  { id: 'korsan', name: 'Korsan', stars: 60, body: 0xe8e2d4, grey: 0x9a8a70, cap: 0x1a1a1a, band: 0xd02a2a, eye: 0xffd54a, bag: 0x6a3a1a },
  { id: 'ninja', name: 'Ninja', stars: 100, body: 0x2a2d3a, grey: 0x1a1c24, cap: 0xc0182a, band: 0x1a1c24, eye: 0xff4a5a, bag: 0x3a3d4a },
  { id: 'buz', name: 'Buz Kristali', stars: 150, body: 0xd8f4ff, grey: 0x9ad8f4, cap: 0x3a8ad0, band: 0xffffff, eye: 0x3affff, bag: 0x6ab8e0 },
  { id: 'lav', name: 'Lav Robotu', stars: 220, body: 0x3a2a2a, grey: 0x5a3a2a, cap: 0xff5a1a, band: 0xffcf3a, eye: 0xffa01a, bag: 0x8a2a10 },
  { id: 'neon', name: 'Neon', stars: 300, body: 0x1a1030, grey: 0x2a1a4a, cap: 0xff3ae0, band: 0x3affe0, eye: 0x3affe0, bag: 0x5a2ab0 },
  { id: 'kral', name: 'Kral Bolt', stars: 400, body: 0xffffff, grey: 0xffd54a, cap: 0x6a1ab0, band: 0xffd54a, eye: 0x7affb0, bag: 0xd02a6a, metal: true },
];
export function makeRobot(skin = SKINS[0]) {
  const met = skin.metal ? { metalness: 0.6, roughness: 0.25 } : { roughness: 0.3 };
  const M = {
    white: std(skin.body, met), grey: std(skin.grey, { roughness: 0.4 }), visor: std(0x10162e, { roughness: 0.15, metalness: 0.3 }),
    eye: new THREE.MeshBasicMaterial({ color: skin.eye }), dark: std(0x39425e), bag: std(skin.bag, { roughness: 0.7 }), bag2: std(0x3a2a1a),
    cap: std(skin.cap, { roughness: 0.5 }), capBand: std(skin.band, { metalness: 0.6, roughness: 0.3, emissive: skin.band, emissiveIntensity: 0.15 }),
  };
  const root = new THREE.Group();      // konum
  const body = new THREE.Group();      // zıplama/sallanma
  const turn = new THREE.Group();      // yön
  root.add(turn); turn.add(body);
  body.add(mesh(new RoundedBoxGeometry(0.3, 0.34, 0.2, 3, 0.06), M.bag, [0, 0.42, -0.2]));
  body.add(mesh(new THREE.BoxGeometry(0.24, 0.08, 0.06), M.bag2, [0, 0.36, -0.31]));
  const legL = mesh(new THREE.CapsuleGeometry(0.065, 0.08, 6, 12), M.dark, [-0.09, 0.1, 0]);
  const legR = mesh(new THREE.CapsuleGeometry(0.065, 0.08, 6, 12), M.dark, [0.09, 0.1, 0]);
  body.add(legL, legR);
  body.add(mesh(new RoundedBoxGeometry(0.38, 0.32, 0.3, 4, 0.11), M.white, [0, 0.36, 0]));
  body.add(mesh(new RoundedBoxGeometry(0.18, 0.08, 0.02, 2, 0.02), M.visor, [0, 0.38, 0.155]));
  const armL = mesh(new THREE.CapsuleGeometry(0.05, 0.14, 6, 12), M.grey, [-0.24, 0.36, 0]); armL.rotation.z = 0.25;
  const armR = mesh(new THREE.CapsuleGeometry(0.05, 0.14, 6, 12), M.grey, [0.24, 0.36, 0]); armR.rotation.z = -0.25;
  body.add(armL, armR);
  const head = new THREE.Group(); head.position.y = 0.76; body.add(head);
  head.add(mesh(new RoundedBoxGeometry(0.58, 0.46, 0.48, 5, 0.19), M.white));
  head.add(mesh(new RoundedBoxGeometry(0.44, 0.28, 0.06, 4, 0.1), M.visor, [0, 0, 0.22]));
  const eyeGeo = new THREE.CapsuleGeometry(0.04, 0.07, 6, 12);
  const eyeL = mesh(eyeGeo, M.eye, [-0.09, 0.01, 0.26], false), eyeR = mesh(eyeGeo, M.eye, [0.09, 0.01, 0.26], false);
  head.add(eyeL, eyeR);
  for (const sx of [-1, 1]) {
    const e0 = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 20), M.visor, [sx * 0.3, 0, 0]); e0.rotation.z = Math.PI / 2; head.add(e0);
    const e1 = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 20), M.eye, [sx * 0.31, 0, 0], false); e1.rotation.z = Math.PI / 2; head.add(e1);
  }
  // Kaptan şapkası
  const cap = new THREE.Group(); cap.position.set(0, 0.24, -0.02); cap.rotation.x = -0.12; head.add(cap);
  cap.add(mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.12, 24), M.cap, [0, 0.04, 0]));
  cap.add(mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.04, 24), M.capBand, [0, -0.01, 0]));
  const brim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 24, 1, false, -Math.PI / 2, Math.PI), M.cap, [0, -0.03, 0.08]); brim.scale.z = 1.2; cap.add(brim);
  cap.add(mesh(new THREE.OctahedronGeometry(0.045), M.capBand, [0, 0.04, 0.23]));
  const ant = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), M.grey, [0.16, 0.38, -0.05]); head.add(ant);
  const antTip = mesh(new THREE.SphereGeometry(0.045, 16, 16), M.eye, [0.16, 0.47, -0.05], false); head.add(antTip);
  const light = new THREE.PointLight(0x6ff6ff, 1.4, 1.3); light.position.set(0, 0.8, 0.5); root.add(light);
  root.scale.setScalar(1.2);
  root.userData = { body, turn, head, eyeL, eyeR, legL, legR, armL, armR, eyeMat: M.eye, eyeColor: skin.eye };
  return root;
}

export function setRobotFace(robot, face) {
  const { eyeL, eyeR, eyeMat } = robot.userData;
  if (face === 'happy') { eyeL.scale.set(1.2, 0.45, 1); eyeR.scale.set(1.2, 0.45, 1); eyeL.position.y = eyeR.position.y = 0.03; eyeMat.color.set(robot.userData.eyeColor); }
  else if (face === 'sad') { eyeL.scale.set(1, 0.4, 1); eyeR.scale.set(1, 0.4, 1); eyeL.position.y = eyeR.position.y = -0.03; eyeMat.color.set(0x7fa8ff); }
  else { eyeL.scale.set(1, 1, 1); eyeR.scale.set(1, 1, 1); eyeL.position.y = eyeR.position.y = 0.01; eyeMat.color.set(robot.userData.eyeColor); }
}

// --- Düşman robotlar ---
export function makeEnemy(type) {
  const patrol = type === 'patrol';
  const M = {
    body: std(patrol ? 0xd8452f : 0x3a2a5a, { roughness: 0.35, metalness: 0.3 }),
    dark: std(0x1a1622, { roughness: 0.4, metalness: 0.4 }),
    eye: new THREE.MeshBasicMaterial({ color: patrol ? 0xffe14a : 0xff2a4a }),
    metal: std(0xb8c0d0, { metalness: 0.8, roughness: 0.3 }),
  };
  const root = new THREE.Group(), body = new THREE.Group(), turn = new THREE.Group();
  root.add(turn); turn.add(body);
  if (patrol) {
    body.add(mesh(new RoundedBoxGeometry(0.56, 0.42, 0.5, 4, 0.12), M.body, [0, 0.4, 0]));
    body.add(mesh(new RoundedBoxGeometry(0.46, 0.12, 0.06, 2, 0.04), M.dark, [0, 0.46, 0.25]));
    const eye = mesh(new THREE.BoxGeometry(0.14, 0.06, 0.02), M.eye, [0, 0.46, 0.285], false); body.add(eye);
    for (const sx of [-1, 1]) { const wh = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), M.dark, [sx * 0.24, 0.13, 0]); wh.rotation.z = Math.PI / 2; body.add(wh); }
    const siren = mesh(new THREE.SphereGeometry(0.07, 12, 12), M.eye, [0, 0.66, 0], false); body.add(siren);
    root.userData = { body, turn, eye, siren, eyeMat: M.eye };
  } else {
    body.add(mesh(new THREE.OctahedronGeometry(0.3, 0), M.body, [0, 0.42, 0]));
    body.add(mesh(new THREE.SphereGeometry(0.22, 20, 16), M.body, [0, 0.42, 0]));
    const eye = mesh(new THREE.SphereGeometry(0.09, 16, 12), M.eye, [0, 0.46, 0.2], false); body.add(eye);
    for (let k = 0; k < 4; k++) { const sp = mesh(new THREE.ConeGeometry(0.05, 0.22, 8), M.metal, [0, 0.42, 0]); const a = (k / 4) * Math.PI * 2; sp.position.x = Math.cos(a) * 0.26; sp.position.z = Math.sin(a) * 0.26; sp.rotation.z = -Math.cos(a) * 1.2; sp.rotation.x = Math.sin(a) * 1.2; body.add(sp); }
    for (const sx of [-1, 1]) body.add(mesh(new THREE.CapsuleGeometry(0.04, 0.16, 4, 8), M.dark, [sx * 0.12, 0.12, 0]));
    root.userData = { body, turn, eye, eyeMat: M.eye };
  }
  const l = new THREE.PointLight(patrol ? 0xffb03a : 0xff2a4a, 2, 1.4); l.position.set(0, 0.6, 0.4); root.add(l);
  return root;
}

// Boss: Bolt ile aynı yumuşak, yuvarlak tarz; koyu metal gövde, altın süsler, tek geniş vizör ve kızgın kırmızı gözler
export const BOSS_COLORS = { 1: 0x5a4aa0, 2: 0x7a4a2a, 3: 0x3a7ab0, 4: 0xa03a2a, 5: 0x3a7a4a, 6: 0x8a2aa0, 7: 0x8a2a2a, 8: 0x8a5a2a, 9: 0x2a8a8a, 10: 0x4a2a5a };
export function makeBoss(world = 10) {
  const tint = BOSS_COLORS[world] || BOSS_COLORS[10];
  const M = {
    body: std(0x2b2e44, { roughness: 0.32, metalness: 0.45 }),
    accent: std(tint, { roughness: 0.35, metalness: 0.4, emissive: tint, emissiveIntensity: 0.12 }),
    gold: std(0xffc531, { metalness: 0.8, roughness: 0.25, emissive: 0x6a3a00, emissiveIntensity: 0.45 }),
    visor: std(0x0a0c18, { roughness: 0.1, metalness: 0.4 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xff3a3a }),
    dark: std(0x161827, { roughness: 0.5 }),
  };
  const root = new THREE.Group(), body = new THREE.Group(), turn = new THREE.Group();
  root.add(turn); turn.add(body);
  // ayaklar
  for (const sx of [-1, 1]) {
    body.add(mesh(new RoundedBoxGeometry(0.5, 0.42, 0.62, 4, 0.16), M.dark, [sx * 0.42, 0.21, 0.02]));
    body.add(mesh(new RoundedBoxGeometry(0.52, 0.1, 0.64, 2, 0.04), M.accent, [sx * 0.42, 0.38, 0.02]));
  }
  // gövde: büyük yuvarlak blok
  body.add(mesh(new RoundedBoxGeometry(1.45, 0.95, 1.15, 6, 0.4), M.body, [0, 0.98, 0]));
  body.add(mesh(new RoundedBoxGeometry(1.0, 0.42, 0.12, 4, 0.12), M.accent, [0, 0.95, 0.56]));
  const core = mesh(new THREE.SphereGeometry(0.13, 20, 16), M.eye, [0, 0.95, 0.63], false); body.add(core);
  // omuz zırhları ve kollar
  for (const sx of [-1, 1]) {
    body.add(mesh(new THREE.SphereGeometry(0.3, 20, 16), M.accent, [sx * 0.8, 1.28, 0]));
    const arm = mesh(new THREE.CapsuleGeometry(0.17, 0.42, 6, 14), M.dark, [sx * 0.88, 0.85, 0.08]); arm.rotation.z = sx * 0.18; body.add(arm);
    body.add(mesh(new THREE.SphereGeometry(0.21, 18, 14), M.body, [sx * 0.95, 0.55, 0.12]));
  }
  // kafa
  const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
  head.add(mesh(new RoundedBoxGeometry(1.12, 0.72, 0.95, 6, 0.3), M.body));
  head.add(mesh(new RoundedBoxGeometry(0.92, 0.34, 0.1, 4, 0.13), M.visor, [0, -0.02, 0.45]));
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = mesh(new THREE.CapsuleGeometry(0.06, 0.16, 6, 12), M.eye, [sx * 0.2, -0.01, 0.51], false);
    e.rotation.z = Math.PI / 2 + sx * 0.32; head.add(e); eyes.push(e);
  }
  // taç ve boynuzlar
  const crown = new THREE.Group(); crown.position.y = 0.4; head.add(crown);
  crown.add(mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.12, 24), M.gold));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; const sp = mesh(new THREE.ConeGeometry(0.07, 0.2, 8), M.gold, [Math.cos(a) * 0.32, 0.14, Math.sin(a) * 0.32]); crown.add(sp); }
  crown.add(mesh(new THREE.OctahedronGeometry(0.08), M.eye, [0, 0.03, 0.38], false));
  for (const sx of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.1, 0.38, 12), M.accent, [sx * 0.5, 0.36, -0.05]); h.rotation.z = sx * -0.55; head.add(h); }
  const l = new THREE.PointLight(0xff3a2a, 10, 4); l.position.set(0, 1.7, 1.2); root.add(l);
  root.userData = { body, turn, head, eyes, eyeMat: M.eye, light: l };
  return root;
}

export function makeZzz() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d'); g.font = 'bold 70px Poppins, sans-serif'; g.fillStyle = '#bff7ff'; g.strokeStyle = '#1a1250'; g.lineWidth = 8;
  g.strokeText('z', 20, 110); g.fillText('z', 20, 110); g.font = 'bold 50px Poppins, sans-serif'; g.strokeText('z', 70, 60); g.fillText('z', 70, 60);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  sp.scale.setScalar(0.45); sp.renderOrder = 20;
  return sp;
}
export function makeDangerMark() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff2a4a, transparent: true, opacity: 0.85, depthWrite: false });
  for (const r of [Math.PI / 4, -Math.PI / 4]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.12), mat); b.rotation.x = -Math.PI / 2; b.rotation.z = r; g.add(b); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.42, 32), mat); ring.rotation.x = -Math.PI / 2; g.add(ring);
  g.position.y = 0.2; g.renderOrder = 5; g.userData.mat = mat;
  return g;
}
