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
export function makeRobot() {
  const M = {
    white: std(0xf3f6ff, { roughness: 0.3 }), grey: std(0xcfd8e8, { roughness: 0.4 }), visor: std(0x10162e, { roughness: 0.15, metalness: 0.3 }),
    eye: new THREE.MeshBasicMaterial({ color: 0x6ff6ff }), dark: std(0x39425e), bag: std(0xb5733b, { roughness: 0.7 }), bag2: std(0x7d4a20),
    cap: std(0x1d2a6b, { roughness: 0.5 }), capBand: std(0xffc531, { metalness: 0.6, roughness: 0.3, emissive: 0x6a4300, emissiveIntensity: 0.4 }),
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
  root.userData = { body, turn, head, eyeL, eyeR, legL, legR, armL, armR, eyeMat: M.eye };
  return root;
}

export function setRobotFace(robot, face) {
  const { eyeL, eyeR, eyeMat } = robot.userData;
  if (face === 'happy') { eyeL.scale.set(1.2, 0.45, 1); eyeR.scale.set(1.2, 0.45, 1); eyeL.position.y = eyeR.position.y = 0.03; eyeMat.color.set(0x6ff6ff); }
  else if (face === 'sad') { eyeL.scale.set(1, 0.4, 1); eyeR.scale.set(1, 0.4, 1); eyeL.position.y = eyeR.position.y = -0.03; eyeMat.color.set(0x7fa8ff); }
  else { eyeL.scale.set(1, 1, 1); eyeR.scale.set(1, 1, 1); eyeL.position.y = eyeR.position.y = 0.01; eyeMat.color.set(0x6ff6ff); }
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

export function makeBoss(world) {
  const M = {
    body: std(0x2a2f45, { roughness: 0.35, metalness: 0.55 }),
    plate: std(0x4a516e, { roughness: 0.3, metalness: 0.7 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
    horn: std(0xffc531, { metalness: 0.8, roughness: 0.25, emissive: 0x6a3a00, emissiveIntensity: 0.5 }),
    dark: std(0x10121c),
  };
  const root = new THREE.Group(), body = new THREE.Group(), turn = new THREE.Group();
  root.add(turn); turn.add(body);
  for (const sx of [-1, 1]) body.add(mesh(new RoundedBoxGeometry(0.42, 0.5, 0.5, 3, 0.1), M.dark, [sx * 0.42, 0.25, 0]));
  body.add(mesh(new RoundedBoxGeometry(1.5, 0.9, 1.2, 5, 0.25), M.body, [0, 0.95, 0]));
  body.add(mesh(new RoundedBoxGeometry(1.1, 0.5, 0.1, 3, 0.08), M.plate, [0, 1.0, 0.6]));
  const head = new THREE.Group(); head.position.y = 1.65; body.add(head);
  head.add(mesh(new RoundedBoxGeometry(1.1, 0.6, 0.9, 5, 0.2), M.body));
  head.add(mesh(new RoundedBoxGeometry(0.86, 0.26, 0.08, 3, 0.08), M.dark, [0, 0.02, 0.44]));
  const eyes = [];
  for (const sx of [-1, 1]) { const e = mesh(new THREE.BoxGeometry(0.22, 0.09, 0.03), M.eye, [sx * 0.2, 0.02, 0.49], false); e.rotation.z = sx * -0.25; head.add(e); eyes.push(e); }
  for (const sx of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.1, 0.42, 10), M.horn, [sx * 0.42, 0.42, 0]); h.rotation.z = sx * -0.5; head.add(h); }
  for (const sx of [-1, 1]) { const arm = mesh(new RoundedBoxGeometry(0.3, 0.75, 0.36, 3, 0.1), M.plate, [sx * 0.95, 0.85, 0.05]); arm.rotation.z = sx * 0.15; body.add(arm); }
  const l = new THREE.PointLight(0xff3a2a, 10, 4); l.position.set(0, 1.7, 1.2); root.add(l);
  root.userData = { body, turn, head, eyes, eyeMat: M.eye, light: l };
  return root;
}
