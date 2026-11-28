// İskeletli düşmanlar (Meshy Smart Rig) için kodla bacak animasyonu: bacak kökleri sırayla
// öne savrulur ve havaya kalkar (böcek: üçlü yürüyüş, kirpi: çapraz tırıs). Gövde hafifçe yalpalar.
import * as THREE from 'three';

export const RIGS = {
  bocek: { stride: 9, swing: 0.32, lift: 0.34, body: 'Bone_000', fwd: 1,
    legs: [['Bone_032', -1, 0], ['Bone_006', -1, Math.PI], ['Bone_027', -1, 0], ['Bone_037', 1, Math.PI], ['Bone_022', 1, 0], ['Bone_011', 1, Math.PI], ['Bone_042', 1, 0]],
    jaw: [['Bone_013', 0.25], ['Bone_015', -0.25], ['Bone_017', -0.25]] },
  kirpi: { stride: 8, swing: 0.42, lift: 0.3, body: 'Bone_000', fwd: 1,
    legs: [['Bone_006', -1, 0], ['Bone_019', 1, 0], ['Bone_009', 1, Math.PI], ['Bone_016', -1, Math.PI]],
    spikes: 'Bone_011', head: 'Bone_001' },
};
const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), ax = new THREE.Vector3();

/** model: SkeletonUtils ile kopyalanmış sahne. frame: modelin kendi ekseni (gltf sahnesi) */
/** Mantarcık: iskeletin dinlenme duruşu kullanılır (Meshy'nin yürüyüşü gövdeyi sarkıtıyor);
 *  kodla hoplayarak yürür: her adımda zıplar, inişte basılır, bacaklar ve kollar sallanır. */
function hopper(model) {
  const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name.replace('mixamorig', '').replace(':', '')] = o; });
  const scene = model.children[0]?.children[0] || model;
  const rest = new Map(); for (const b of Object.values(bones)) rest.set(b, b.quaternion.clone());
  const X = new THREE.Vector3(1, 0, 0);
  const rot = (b, ang) => { if (!b || !ang) return; scene.getWorldQuaternion(qa); ax.copy(X).applyQuaternion(qa); b.parent.getWorldQuaternion(qb); ax.applyQuaternion(qb.invert()).normalize(); qa.setFromAxisAngle(ax, ang); b.quaternion.premultiply(qa); };
  let ph = 0;
  return {
    update(dt, speed, t) {
      for (const [b, q] of rest) b.quaternion.copy(q);
      const k = Math.min(1, Math.abs(speed) / 0.8);
      ph += dt * (k > 0 ? 7.5 : 2.5);
      const s = Math.sin(ph), hop = Math.abs(s);
      model.position.y = hop * 0.22 * k;
      const land = Math.max(0, 1 - hop * 3) * k; // yere değdiği an basılır
      model.scale.set(1 + land * 0.12, 1 - land * 0.16 + hop * 0.05 * k, 1 + land * 0.12);
      model.updateMatrixWorld(true);
      rot(bones.LeftUpLeg, s * 0.5 * k); rot(bones.RightUpLeg, -s * 0.5 * k);
      rot(bones.LeftArm, -s * 0.45 * k + Math.sin(t * 3) * 0.05); rot(bones.RightArm, s * 0.45 * k - Math.sin(t * 3) * 0.05);
      rot(bones.Head, Math.sin(ph * 2) * 0.05 * k);
    },
  };
}
/** Salyangoz: iskelet yok; kayarken uzayıp kısalır, durunca yavaşça nefes alır */
function slider(model) {
  let ph = 0;
  return {
    update(dt, speed, t) {
      const k = Math.min(1, Math.abs(speed) / 0.5); ph += dt * (2 + 5 * k);
      const w = Math.sin(ph);
      model.scale.set(1 + w * 0.07 * k + Math.sin(t * 2) * 0.01, 1 - w * 0.045 * k + Math.sin(t * 2) * 0.015, 1);
    },
  };
}
export function makeWalker(model, kind) {
  if (kind === 'mantarcik') return hopper(model);
  if (kind === 'salyangoz') return slider(model);
  const spec = RIGS[kind]; if (!spec) return null;
  const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const frame = Object.values(bones)[0]?.parent?.parent || model; // SmartRigArmature
  const rest = new Map(); for (const b of Object.values(bones)) rest.set(b, b.quaternion.clone());
  const legs = spec.legs.map(([n, side, ph]) => ({ b: bones[n], side, ph })).filter((l) => l.b);
  // dünya eksenini kemiğin ebeveyn uzayına çevirip öne çarparak döndür
  const rot = (b, axisModel, ang) => {
    if (!b || !ang) return;
    frame.getWorldQuaternion(qa); ax.copy(axisModel).applyQuaternion(qa);
    b.parent.getWorldQuaternion(qb); ax.applyQuaternion(qb.invert()).normalize();
    qa.setFromAxisAngle(ax, ang); b.quaternion.premultiply(qa);
  };
  let ph = 0;
  return {
    /** speed: kare/sn (0 = dur), t: zaman */
    update(dt, speed, t) {
      for (const [b, q] of rest) b.quaternion.copy(q);
      ph += dt * Math.abs(speed) * spec.stride;
      const k = Math.min(1, Math.abs(speed) / 1.2); // dururken bacaklar sakinleşir
      model.updateMatrixWorld(true);
      for (const l of legs) {
        const p = ph + l.ph;
        rot(l.b, Y, l.side * spec.fwd * Math.sin(p) * spec.swing * k);
        rot(l.b, Z, l.side * Math.max(0, Math.cos(p)) * spec.lift * k);
      }
      const body = bones[spec.body];
      rot(body, Z, Math.sin(ph * 2) * 0.035 * k + Math.sin(t * 2) * 0.015);
      if (spec.jaw) for (const [n, a] of spec.jaw) rot(bones[n], Y, Math.sin(t * 9) * a * 0.4);
      if (spec.spikes) rot(bones[spec.spikes], new THREE.Vector3(1, 0, 0), Math.sin(t * 30) * 0.02 + Math.sin(ph * 2) * 0.04 * k);
      if (spec.head) rot(bones[spec.head], new THREE.Vector3(1, 0, 0), Math.sin(ph * 2) * 0.06 * k);
    },
  };
}
