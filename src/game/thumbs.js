// Küçük 3D resimler (dünya simgeleri, kostüm robotları, boss) — tek bir gizli çizici ile üretilir ve önbelleğe alınır
import * as THREE from 'three';
import { makeRobot, setRobotFace, makeKey, makeTile, makeEnemy, makeStrongTile, makePortalTile, makeBridgeTile, makeArrowTile, makeBoss, makeMaterials, THEMES, SKINS } from './models.js';

let R = null;
const cache = new Map();
function renderer() {
  if (R) return R;
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  return R;
}
function shot(obj, { w = 192, h = 192, dist = 2.4, y = 0.6, look = 0.5, rotY = -0.4, el = 0.35 } = {}) {
  const r = renderer();
  r.setPixelRatio(1); r.setSize(w, h, false);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xd8d0ff, 0x302060, 1.3));
  const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(-2, 4, 5); sc.add(d);
  const r1 = new THREE.PointLight(0x3fe2ff, 14, 6); r1.position.set(1.5, 1.2, -1); sc.add(r1);
  obj.rotation.y = rotY; sc.add(obj);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
  cam.position.set(0, y + Math.sin(el) * dist, Math.cos(el) * dist); cam.lookAt(0, look, 0);
  r.render(sc, cam);
  const url = r.domElement.toDataURL('image/png');
  sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  return url;
}
const memo = (k, f) => { if (!cache.has(k)) { try { cache.set(k, f()); } catch { cache.set(k, ''); } } return cache.get(k); };
const grp = (...xs) => { const g = new THREE.Group(); xs.forEach(([o, p]) => { o.position.set(...p); g.add(o); }); return g; };

export function skinImg(skin, big = false) {
  return memo('skin:' + skin.id + big, () => {
    const r = makeRobot(skin); setRobotFace(r, big ? 'happy' : 'idle');
    if (big) { r.userData.armR.rotation.z = -1.9; return shot(r, { w: 360, h: 360, dist: 3.1, y: 0.3, look: 0.6, el: 0.1, rotY: -0.5 }); }
    return shot(r, { w: 148, h: 168, dist: 2.6, y: 0.2, look: 0.62, el: 0.12 });
  });
}
export function boltHead(skin = SKINS[0]) {
  return memo('head:' + skin.id, () => { const r = makeRobot(skin); setRobotFace(r, 'happy'); return shot(r, { w: 128, h: 128, dist: 1.5, look: 0.78, y: 0.55, el: 0.05 }); });
}
export function bossImg() { return memo('boss', () => shot(makeBoss(10), { w: 192, h: 192, dist: 6.5, look: 1.2, el: 0.2 })); }

export function worldIcon(w) {
  return memo('world:' + w, () => {
    const M = makeMaterials(THEMES[1]);
    switch (w) {
      case 1: return shot(grp([makeTile(M, false, 1), [0, 0, 0]], [makeRobot(SKINS[0]), [0, 0.18, 0]]), { dist: 2.8, look: 0.5 });
      case 2: return shot(grp([makeTile(M, false, 2), [0, 0, 0]], [makeKey(), [0, 0.8, 0]]), { dist: 2.4, look: 0.55 });
      case 3: return shot(grp([makeTile(M, true, 1), [0, 0, 0]], [makeTile(M, true, 2), [0.95, 0, 0]], [makeTile(M, true, 3), [-0.95, 0, 0]]), { dist: 3.4, look: 0.1, el: 0.6 });
      case 4: return shot(grp([makeTile(M, false, 1), [0, 0, 0]], [makeEnemy('patrol'), [0, 0.18, 0]]), { dist: 2.3, look: 0.45 });
      case 5: return shot(grp([makeStrongTile(M), [0, 0, 0]], [makeStrongTile(M), [0.95, 0, 0]]), { dist: 2.8, look: 0.1, el: 0.6, rotY: -0.2 });
      case 6: return shot(grp([makePortalTile(M, 0xff4ae0), [0, 0, 0]]), { dist: 2.0, look: 0.1, el: 0.8 });
      case 7: return shot(grp([makeTile(M, false, 1), [0, 0, 0]], [makeEnemy('chaser'), [0, 0.18, 0]]), { dist: 2.2, look: 0.45 });
      case 8: return shot(grp([makeBridgeTile(), [0, 0, 0]], [makeBridgeTile(), [0.95, 0, 0]]), { dist: 2.8, look: 0.1, el: 0.6, rotY: -0.3 });
      case 9: return shot(grp([makeArrowTile(M, 'right'), [0, 0, 0]], [makeArrowTile(M, 'right'), [0.95, 0, 0]]), { dist: 2.7, look: 0.1, el: 0.75, rotY: 0 });
      default: return shot(grp([makeBoss(10), [0, 0, 0]]), { dist: 6.5, look: 1.2, el: 0.2 });
    }
  });
}
