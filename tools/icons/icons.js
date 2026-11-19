// Uygulama simgesi önerileri: oyunun gerçek 3D modelleriyle 512x512 çizim
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeRobot, setRobotFace, makeKey, makeTile, makeDoor, makeMaterials, THEMES, SKINS } from '../../src/game/models.js';

const S = 1024;
const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R.setPixelRatio(1); R.setSize(S, S, false); R.toneMapping = THREE.ACESFilmicToneMapping;
R.outputColorSpace = THREE.SRGBColorSpace;

function render(scene, cam) { R.setClearColor(0, 0); R.render(scene, cam); const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').drawImage(R.domElement, 0, 0); return c; }
function lights(sc, rim = 0x3fe2ff, hemi = 0xd8d0ff) {
  sc.add(new THREE.HemisphereLight(hemi, 0x302060, 1.3));
  const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(-2, 4, 5); sc.add(d);
  const r = new THREE.PointLight(rim, 30, 8); r.position.set(1.8, 1.6, -1.2); sc.add(r);
  const r2 = new THREE.PointLight(rim, 10, 6); r2.position.set(-1.8, 0.8, -1); sc.add(r2);
}
function cam(pos, look, fov = 30) { const c = new THREE.PerspectiveCamera(fov, 1, 0.1, 50); c.position.set(...pos); c.lookAt(...look); return c; }
function bg(ctx, inner, outer, cx = 0.5, cy = 0.42) {
  const g = ctx.createRadialGradient(S * cx, S * cy, 0, S * cx, S * cy, S * 0.78); g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
}
function glow(ctx, x, y, r, col) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); }
function stars(ctx, n = 40, seed = 3) { let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.5})`; ctx.beginPath(); ctx.arc(rnd() * S, rnd() * S, 1 + rnd() * 3, 0, 7); ctx.fill(); } }
function bolt(ctx, x, y, sc, fill, stroke) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.beginPath();
  ctx.moveTo(30, -100); ctx.lineTo(-45, 15); ctx.lineTo(0, 15); ctx.lineTo(-25, 100); ctx.lineTo(50, -20); ctx.lineTo(5, -20); ctx.closePath();
  ctx.fillStyle = fill; ctx.shadowColor = fill; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 6; ctx.strokeStyle = stroke; ctx.stroke(); ctx.restore();
}
function robot(face = 'happy', skin = SKINS[0]) { const r = makeRobot(skin); setRobotFace(r, face); return r; }

const icons = [];
// 1) Gülen Kaptan: büyük kafa, mor-mavi
{
  const sc = new THREE.Scene(); lights(sc); const r = robot(); r.rotation.y = -0.3; sc.add(r);
  const im = render(sc, cam([0, 1.1, 2.75], [0, 1.08, 0], 30));
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  bg(x, '#3b2a9e', '#0c0828'); stars(x, 30); glow(x, S * 0.5, S * 0.5, S * 0.42, 'rgba(63,226,255,.35)');
  x.drawImage(im, 0, S * 0.1); icons.push(['Gülen Kaptan', c]);
}
// 2) Kaptan ve anahtar
{
  const sc = new THREE.Scene(); lights(sc, 0xffc040); const r = robot(); r.rotation.y = -0.35; r.userData.armR.rotation.z = -2.0; sc.add(r);
  const k = makeKey(); k.scale.setScalar(1.15); k.position.set(0.5, 1.25, 0.15); k.rotation.y = -0.4; k.userData.shadow.visible = false; sc.add(k);
  const im = render(sc, cam([0.15, 1.0, 3.6], [0.1, 0.9, 0], 30));
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  bg(x, '#2a5ac8', '#0a0f33'); glow(x, S * 0.72, S * 0.3, S * 0.3, 'rgba(255,200,60,.45)'); stars(x, 24, 9);
  x.drawImage(im, 0, 0); icons.push(['Anahtarlı Kaptan', c]);
}
// 3) Çöken kare: robot bir karenin üstünde, arkadaki kare düşüyor
{
  const sc = new THREE.Scene(); lights(sc); const M = makeMaterials(THEMES[1]);
  const t0 = makeTile(M, false, 1); sc.add(t0);
  const t1 = makeTile(M, false, 2); t1.position.set(-1.05, -0.9, 0.15); t1.rotation.set(0.4, 0.3, 0.6); sc.add(t1);
  const t2 = makeTile(M, false, 3); t2.position.set(1.0, 0, 0); sc.add(t2);
  const r = robot('happy'); r.position.y = 0.12; r.rotation.y = 0.5; sc.add(r);
  const im = render(sc, cam([1.3, 2.4, 4.6], [0.0, 0.35, 0], 32));
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  bg(x, '#4a2aa8', '#0b0726', 0.5, 0.35); stars(x, 36, 5); glow(x, S * 0.45, S * 0.55, S * 0.4, 'rgba(160,90,255,.35)');
  x.drawImage(im, 0, 0); icons.push(['Çöken Kare', c]);
}
// 4) Mini bulmaca: 3x3 tahta, robot, anahtar, kapı
{
  const sc = new THREE.Scene(); lights(sc, 0xb060ff); const M = makeMaterials(THEMES[1]);
  const base = new THREE.Mesh(new RoundedBoxGeometry(3.3, 0.35, 3.3, 4, 0.14), M.rock); base.position.y = -0.33; sc.add(base);
  const holes = new Set([4, 5]);
  for (let i = 0; i < 9; i++) { if (holes.has(i)) continue; const t = makeTile(M, false, i); t.position.set((i % 3 - 1) * 1.02, 0, (Math.floor(i / 3) - 1) * 1.02); sc.add(t); }
  const r = robot(); r.position.set(-1.02, 0.12, 1.02); r.rotation.y = 0.6; r.scale.setScalar(1.25); sc.add(r);
  const k = makeKey(); k.scale.setScalar(1.3); k.position.set(1.02, 0.75, 1.02); k.userData.shadow.visible = false; sc.add(k);
  const d = makeDoor(); d.position.set(1.02, 0.08, -1.02); d.rotation.y = -0.2; sc.add(d);
  const im = render(sc, cam([2.3, 4.8, 5.3], [-0.15, 0.25, 0], 34));
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  bg(x, '#2a3aa8', '#090624'); stars(x, 30, 11);
  x.drawImage(im, 0, 0); icons.push(['Mini Bulmaca', c]);
}
// 5) Şimşek Kaptan: arkada dev şimşek, sarı-turuncu
{
  const sc = new THREE.Scene(); lights(sc, 0xffd040, 0xfff0d0); const r = robot(); r.rotation.y = -0.25; sc.add(r);
  const im = render(sc, cam([0, 0.75, 3.3], [0, 0.72, 0], 30));
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  bg(x, '#ff9a1a', '#7a1a5a', 0.5, 0.5); glow(x, S * 0.5, S * 0.45, S * 0.5, 'rgba(255,240,150,.45)');
  bolt(x, S * 0.7, S * 0.36, 3.4, '#ffe23a', '#fff7c0'); bolt(x, S * 0.27, S * 0.3, 1.6, '#ffe23a', '#fff7c0');
  x.drawImage(im, -S * 0.04, S * 0.06); icons.push(['Şimşek Kaptan', c]);
}
// 6) Kapıya koşan Kaptan
{
  const sc = new THREE.Scene(); lights(sc, 0xb060ff); const M = makeMaterials(THEMES[1]);
  const d = makeDoor(); d.scale.setScalar(1.6); d.position.set(0.35, -0.1, -0.9); sc.add(d);
  const t = makeTile(M, false, 1); t.position.set(-0.25, -0.12, 0.5); sc.add(t);
  const r = robot('happy'); r.position.set(-0.25, 0.0, 0.5); r.rotation.y = 0.35; r.userData.armR.rotation.z = -2.0; sc.add(r);
  const k = makeKey(); k.scale.setScalar(0.9); k.position.set(-0.85, 1.35, 0.45); k.userData.shadow.visible = false; sc.add(k);
  const im = render(sc, cam([0.2, 1.4, 5.3], [0.0, 0.95, 0], 32));
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  bg(x, '#5a1aa8', '#100630'); stars(x, 28, 21); glow(x, S * 0.55, S * 0.4, S * 0.38, 'rgba(200,110,255,.5)');
  x.drawImage(im, 0, 0); icons.push(['Kapıya Doğru', c]);
}
window.ICONS = icons.map(([n, c]) => [n, c.toDataURL('image/png')]);
window.DONE = true;
