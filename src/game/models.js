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
};

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
