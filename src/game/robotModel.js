// Kaptan Bolt'un 3D modeli: public/models/robot.glb (uygulamaya gömülü, çevrimdışı).
// Model bir kez yüklenir; her robot bu şablonun kopyasıdır. Kostümler gölgelendirici ile boyanır:
// beyaz gövde -> kostüm rengi, siyah eklemler -> eklem rengi, turkuaz ışıklar -> göz rengi.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

export const STANCE = 0.22; // kalça açısı (radyan, ~9°)
export const MODEL_HEIGHT = 1.1;    // robotun kendi boyu; robot kökü 1.2 ölçekli (oyunda ~1.32 birim)
let template = null, clips = {};

export function loadRobotModel() {
  return new Promise((resolve) => {
    const url = new URL('models/robot.glb', document.baseURI).href;
    new GLTFLoader().load(url, (gltf) => {
      const g = gltf.scene;
      g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
      const s = MODEL_HEIGHT / size.y;
      g.scale.setScalar(s);
      const c = box.getCenter(new THREE.Vector3());
      g.position.set(-c.x * s, -box.min.y * s, -c.z * s);  // ayak tabanı yerde, ortası merkezde
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      template = g;
      for (const c of gltf.animations) clips[c.name] = c;
      resolve(true);
    }, undefined, (e) => { console.warn('robot.glb yüklenemedi', e); resolve(false); });
  });
}
export const hasRobotModel = () => !!template;

// ---------- Düşman modelleri (models/*.glb) ----------
// boy: oyundaki hedef boyut; yaw: modelin önünü +Z'ye çevirmek için dönüş; lift: yerden yükseklik
const ENEMY_SPEC = {
  devriye: { fit: 'width', size: 0.88, yaw: Math.PI / 2 },
  takipci: { fit: 'height', size: 0.8, lift: 0.12 },
  nobetci: { fit: 'height', size: 1.08 },
  bocek: { fit: 'width', size: 0.86 },
  boss: { fit: 'width', size: 1.75 },
};
const enemyTpl = {};
export function loadEnemyModels() {
  const L = new GLTFLoader();
  return Promise.all(Object.entries(ENEMY_SPEC).map(([n, sp]) => new Promise((ok) => {
    L.load(new URL(`models/${n}.glb`, document.baseURI).href, (gltf) => {
      const g = gltf.scene; const wrap = new THREE.Group();
      g.rotation.y = sp.yaw || 0; wrap.add(g); wrap.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(wrap), sz = box.getSize(new THREE.Vector3());
      const s = sp.size / (sp.fit === 'height' ? sz.y : Math.max(sz.x, sz.z));
      wrap.scale.setScalar(s);
      const c = box.getCenter(new THREE.Vector3());
      wrap.position.set(-c.x * s, -box.min.y * s + (sp.lift || 0), -c.z * s);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material.emissiveIntensity = 1.4; } });
      const holder = new THREE.Group(); holder.add(wrap);
      enemyTpl[n] = holder; ok();
    }, undefined, () => ok());
  })));
}
export const hasEnemyModel = (n) => !!enemyTpl[n];
/** Düşman modelinin kopyası (malzemeler ayrı: dondurma ve boss renklendirme için) */
export function cloneEnemyModel(n, tint) {
  const m = enemyTpl[n].clone(true);
  m.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (tint != null) {
      const u = { uTint: { value: new THREE.Color(tint) } };
      o.material.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, u);
        // mor zırhı dünya rengine boya (altın ve kırmızı ışıklar kalır)
        sh.fragmentShader = 'uniform vec3 uTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
{ vec3 c = diffuseColor.rgb; float purple = clamp((min(c.r, c.b) - c.g) * 6.0, 0.0, 1.0) * (1.0 - clamp((c.r - c.b) * 4.0, 0.0, 1.0));
  float lum = max(c.r, max(c.g, c.b)); diffuseColor.rgb = mix(c, uTint * (lum / 0.45), purple); }`);
      };
      o.material.customProgramCacheKey = () => 'bossTint';
    }
  });
  return m;
}

const TINT_GLSL = `
#include <map_fragment>
{
  vec3 c = diffuseColor.rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float white = smoothstep(0.07, 0.18, lum) * (1.0 - smoothstep(0.1, 0.25, sat));
  float dark = (1.0 - smoothstep(0.015, 0.06, lum)) * (1.0 - smoothstep(0.05, 0.15, sat));
  float cyan = clamp((min(c.g, c.b) - c.r) * 2.5, 0.0, 1.0);
  c = mix(c, uBody * (0.78 + 0.22 * clamp(lum / 0.55, 0.0, 1.4)), white * uTint);
  c = mix(c, uJoint * (0.35 + lum * 12.0), dark * uTint);
  c = mix(c, uEye * max(c.g, c.b), cyan * uTint);
  diffuseColor.rgb = c;
}`;

/** Şablonun kostüme göre boyanmış bir kopyası. Dönen nesne: { model, mat } */
export function cloneRobotModel(skin) {
  const model = skeletonClone(template);
  const custom = skin.id !== 'klasik' && skin.id !== 'kaptan';
  let mat = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material.clone();
    m.roughness = skin.metal ? 0.35 : 0.55; o.frustumCulled = false; m.metalness = skin.metal ? 0.45 : 0.0;
    m.emissive = new THREE.Color(skin.eye); m.emissiveIntensity = 1.1;
    if (custom) {
      const u = { uBody: { value: new THREE.Color(skin.body) }, uJoint: { value: new THREE.Color(skin.joint) }, uEye: { value: new THREE.Color(skin.eye) }, uTint: { value: 1 } };
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, u);
        sh.fragmentShader = 'uniform vec3 uBody; uniform vec3 uJoint; uniform vec3 uEye; uniform float uTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', TINT_GLSL);
      };
      m.customProgramCacheKey = () => 'robotTint';
    }
    o.material = m; mat = m;
  });
  return { model, mat };
}

/** Robotun animasyon kontrolcüsü: idle, walk, jump, cheer, wave, fall, stomp */
export function makeAnimator(model) {
  const mixer = new THREE.AnimationMixer(model);
  const acts = {};
  for (const [n, c] of Object.entries(clips)) acts[n] = mixer.clipAction(c);
  let cur = null;
  /** Hareketi başlat; once: bir kez oynar ve son karede kalır. Süreyi (ms) döndürür */
  const play = (name, { once = false, fade = 0.2, speed = 1 } = {}) => {
    const a = acts[name]; if (!a) return 0;
    if (cur === a && !once) { a.timeScale = speed; return 0; }
    a.reset(); a.timeScale = speed; a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once;
    a.enabled = true; a.setEffectiveWeight(1);
    if (cur && cur !== a) a.crossFadeFrom(cur, fade, false); else a.fadeIn(fade);
    a.play(); cur = a;
    return (a.getClip().duration / speed) * 1000;
  };
  // Ayak duruşu: hareketler insan oranına göre; kalın bacaklı robotta çizmeler birleşmesin diye
  // kalçaları her karede biraz dışa aç, ayak tabanını yere paralel tut
  const bone = (n) => { let b = null; model.traverse((o) => { if (o.isBone && o.name.endsWith(n)) b = o; }); return b; };
  const legs = [[bone('LeftUpLeg'), bone('LeftFoot'), 1], [bone('RightUpLeg'), bone('RightFoot'), -1]].filter((l) => l[0] && l[1]);
  const qz = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1), ax = new THREE.Vector3();
  const spread = () => {
    for (const [up, foot, sx] of legs) {
      foot.updateWorldMatrix(true, false); foot.getWorldQuaternion(qa);
      // ileri ekseni (modelin +Z'si) kalçanın üst kemiğinin ebeveyn uzayına çevir, o eksende dışa aç
      model.getWorldQuaternion(qb); ax.copy(Z).applyQuaternion(qb);
      up.parent.getWorldQuaternion(qb); ax.applyQuaternion(qb.invert()).normalize();
      qz.setFromAxisAngle(ax, sx * STANCE); up.quaternion.premultiply(qz);
      up.updateMatrixWorld(true);
      foot.parent.getWorldQuaternion(qb); foot.quaternion.copy(qb.invert().multiply(qa));
    }
  };
  // Kafa eğimi: üstten bakan oyun kamerasında yüz görünsün diye kafa hafifçe yukarı bakar
  const head = bone('Head'), X = new THREE.Vector3(1, 0, 0);
  const st = { headUp: 0 };
  const tilt = () => {
    if (!head || !st.headUp) return;
    model.getWorldQuaternion(qb); ax.copy(X).applyQuaternion(qb);
    head.parent.getWorldQuaternion(qb); ax.applyQuaternion(qb.invert()).normalize();
    qz.setFromAxisAngle(ax, -st.headUp); head.quaternion.premultiply(qz);
  };
  const update = (dt) => { mixer.update(dt); spread(); tilt(); };
  play('idle', { fade: 0 }); update(0.4);
  return { mixer, update, play, st, has: (n) => !!acts[n], current: () => (cur ? cur.getClip().name : null) };
}
