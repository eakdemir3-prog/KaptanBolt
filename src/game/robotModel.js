// Kaptan Bolt'un 3D modeli: public/models/robot.glb (uygulamaya gömülü, çevrimdışı).
// Model bir kez yüklenir; her robot bu şablonun kopyasıdır. Kostümler gölgelendirici ile boyanır:
// beyaz gövde -> kostüm rengi, siyah eklemler -> eklem rengi, turkuaz ışıklar -> göz rengi.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const MODEL_HEIGHT = 1.32;   // oyundaki boy (kare = 1 birim)
let template = null;

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
      resolve(true);
    }, undefined, (e) => { console.warn('robot.glb yüklenemedi', e); resolve(false); });
  });
}
export const hasRobotModel = () => !!template;

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
  const model = template.clone(true);
  const custom = skin.id !== 'klasik' && skin.id !== 'kaptan';
  let mat = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material.clone();
    m.roughness = skin.metal ? 0.35 : 0.55; m.metalness = skin.metal ? 0.45 : 0.0;
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
