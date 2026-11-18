// Küçük 3D resimler (dünya simgeleri, kostüm robotları, boss) — tek bir gizli çizici ile üretilir ve önbelleğe alınır
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeRobot, setRobotFace, makeKey, makeTile, makeEnemy, makeStrongTile, makePortalTile, makeBridgeTile, makeArrowTile, makeButtonTile, makeBoss, makeMaterials, THEMES, SKINS } from './models.js';

let R = null;
const cache = new Map();
function renderer() {
  if (R) return R;
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  return R;
}
function shot(obj, { w = 192, h = 192, dist = 2.4, y = 0.6, look = 0.5, rotY = -0.4, el = 0.35, theme = null } = {}) {
  const r = renderer();
  r.setPixelRatio(1); r.setSize(w, h, false);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(theme ? theme.hemi : 0xd8d0ff, 0x302060, theme ? 1.0 : 1.3));
  const d = new THREE.DirectionalLight(0xffffff, 2.0); d.position.set(-2, 4, 5); sc.add(d);
  const r1 = new THREE.PointLight(theme ? theme.torch : 0x3fe2ff, theme ? 26 : 14, 7); r1.position.set(1.6, 1.4, -1.4); sc.add(r1);
  const r2 = new THREE.PointLight(theme ? theme.tile : 0x3fe2ff, theme ? 8 : 0, 5); r2.position.set(-1.5, 0.6, 1.2); sc.add(r2);
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
export function bossImg(w = 10) { return memo('boss' + w, () => shot(makeBoss(w), { w: 192, h: 192, dist: 6.2, look: 1.25, el: 0.18, rotY: -0.35 })); }

/** Dünya simgesi: dünyanın kendi renklerinde küçük bir sahne (2x2 taş + o dünyanın nesnesi) */
export function worldIcon(w) {
  return memo('world:' + w, () => {
    const th = THEMES[w], M = makeMaterials(th);
    const g = new THREE.Group();
    const base = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.35, 2.2, 4, 0.12), M.rock); base.position.y = -0.32; g.add(base);
    const P = [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]];
    const put = (o, x, z, y = 0) => { o.position.set(x, y, z); g.add(o); return o; };
    const tiles = (fn) => P.forEach(([x, z], i) => { const t = fn(i, x, z); if (t) put(t, x, z); });
    const robot = (x, z, rot = 0.4) => { const r = makeRobot(SKINS[0]); setRobotFace(r, 'happy'); r.scale.setScalar(0.8); r.userData.turn.rotation.y = rot; return put(r, x, z, 0.18); };
    // robot hep arka-sol köşede, dünyanın nesnesi önde: hepsi görünür
    switch (w) {
      case 1: tiles((i) => (i === 3 ? null : makeTile(M, false, i))); robot(-0.48, -0.48, 0.5); break;
      case 2: tiles((i) => makeTile(M, false, i)); robot(-0.48, -0.48, 0.5); put(makeKey(), 0.48, 0.48, 0.8); break;
      case 3: tiles((i) => makeTile(M, i !== 0, i)); robot(-0.48, -0.48, 0.9); break;
      case 4: tiles((i) => makeTile(M, false, i)); robot(-0.48, -0.48, 0.5); put(makeEnemy('patrol'), 0.48, 0.48, 0.18).userData.turn.rotation.y = -0.4; break;
      case 5: tiles((i) => (i === 0 ? makeTile(M, false, i) : makeStrongTile(M))); { const s0 = g.children.find((c) => c.userData && c.userData.cracks); if (s0) s0.userData.cracks.visible = true; } robot(-0.48, -0.48, 0.5); break;
      case 6: tiles((i) => (i === 1 || i === 2 ? makePortalTile(M, 0xff4ae0) : makeTile(M, false, i))); robot(-0.48, -0.48, 0.5); break;
      case 7: tiles((i) => (i === 1 ? null : makeTile(M, false, i))); robot(-0.48, -0.48, 0.5); put(makeEnemy('chaser'), 0.48, 0.48, 0.18).userData.turn.rotation.y = -0.8; break;
      case 8: tiles((i) => (i === 3 ? makeButtonTile(M) : i === 0 ? makeTile(M, false, i) : makeBridgeTile())); robot(-0.48, -0.48, 0.5); break;
      case 9: tiles((i) => (i === 0 ? makeTile(M, false, i) : makeArrowTile(M, i === 1 ? 'down' : 'right'))); robot(-0.48, -0.48, 0.5); break;
      default: { tiles((i) => makeTile(M, false, i)); const b = makeBoss(10); b.scale.setScalar(0.5); put(b, 0, 0, 0.18); }
    }
    return shot(g, { w: 208, h: 208, dist: 5.4, y: 0, look: 0.3, el: 0.62, rotY: -0.6, theme: th });
  });
}
