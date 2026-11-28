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
/** Mantar Kral: Meshy animasyonları gövdeyi çömeltip sarkıtıyor; dinlenme duruşu + kodla hareket.
 *  durum: walk (yürür), shout (kollar yukarı titrer), punch (kollar başın üstüne kalkar, 1,1 sn'de yere iner),
 *  tired (sendeler, kollar sarkar), hit (geriye savrulur). */
export function kralRig(model) {
  const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name.replace('mixamorig', '').replace(':', '')] = o; });
  const scene = model.children[0]?.children[0] || model;
  const rest = new Map(); for (const b of Object.values(bones)) rest.set(b, b.quaternion.clone());
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const rot = (b, axis, ang) => { if (!b || !ang) return; scene.getWorldQuaternion(qa); ax.copy(AX[axis]).applyQuaternion(qa); b.parent.getWorldQuaternion(qb); ax.applyQuaternion(qb.invert()).normalize(); qa.setFromAxisAngle(ax, ang); b.quaternion.premultiply(qa); };
  let ph = 0;
  const B = bones, sm = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  return {
    update(dt, st, t, speed) {
      for (const [b, q] of rest) b.quaternion.copy(q);
      model.position.y = 0; model.updateMatrixWorld(true);
      const k = Math.min(1, Math.abs(speed) / 0.8);
      if (st === 'walk' || st === 'roar' || st === 'wait') {
        ph += dt * (2 + 5.5 * k); const s = Math.sin(ph);
        model.position.y = Math.abs(Math.cos(ph)) * 0.08 * k;
        rot(B.LeftUpLeg, 'x', -s * 0.45 * k); rot(B.RightUpLeg, 'x', s * 0.45 * k);
        rot(B.LeftLeg, 'x', Math.max(0, s) * 0.5 * k); rot(B.RightLeg, 'x', Math.max(0, -s) * 0.5 * k);
        rot(B.LeftArm, 'x', s * 0.35 * k); rot(B.RightArm, 'x', -s * 0.35 * k);
        rot(B.Spine, 'z', Math.sin(ph) * 0.04 * k + Math.sin(t * 1.5) * 0.02);
      } else if (st === 'shout') {
        const up = sm(0, 1, t / 0.4), sh = Math.sin(t * 28) * 0.08 * up;
        rot(B.LeftArm, 'z', 1.1 * up + sh); rot(B.RightArm, 'z', -1.1 * up - sh);
        rot(B.LeftForeArm, 'z', 0.6 * up); rot(B.RightForeArm, 'z', -0.6 * up);
        rot(B.Spine, 'x', -0.12 * up); rot(B.Head, 'x', -0.15 * up + sh * 0.5);
      } else if (st === 'punch') {
        // 0–0,8 kalkış, 0,8–1,1 tepede titreme, 1,1–1,3 iniş, sonra yerde kalır
        const lift = t < 1.1 ? sm(0, 1, t / 0.7) : sm(1, 0, (t - 1.1) / 0.15);
        const slam = t >= 1.1 ? sm(0, 1, (t - 1.1) / 0.15) : 0, tr = t > 0.75 && t < 1.1 ? Math.sin(t * 50) * 0.05 : 0;
        rot(B.LeftArm, 'x', -2.6 * lift - 0.9 * slam + tr); rot(B.RightArm, 'x', -2.6 * lift - 0.9 * slam - tr);
        rot(B.LeftForeArm, 'x', -0.5 * lift); rot(B.RightForeArm, 'x', -0.5 * lift);
        rot(B.Spine, 'x', 0.15 * lift - 0.3 * slam);
        rot(B.LeftUpLeg, 'x', -0.35 * slam); rot(B.RightUpLeg, 'x', -0.35 * slam); rot(B.LeftLeg, 'x', 0.6 * slam); rot(B.RightLeg, 'x', 0.6 * slam);
        model.position.y = -0.18 * slam + 0.1 * lift;
      } else if (st === 'crouch' || st === 'land') {
        const c = st === 'crouch' ? sm(0, 1, t / 0.4) : sm(1, 0, t / 0.5);
        rot(B.LeftUpLeg, 'x', -0.6 * c); rot(B.RightUpLeg, 'x', -0.6 * c); rot(B.LeftLeg, 'x', 1.0 * c); rot(B.RightLeg, 'x', 1.0 * c);
        rot(B.LeftArm, 'x', 0.5 * c); rot(B.RightArm, 'x', 0.5 * c); rot(B.Spine, 'x', 0.15 * c);
        model.position.y = -0.3 * c + (st === 'crouch' ? Math.sin(t * 40) * 0.02 : 0);
      } else if (st === 'leap') {
        rot(B.LeftUpLeg, 'x', -0.7); rot(B.RightUpLeg, 'x', -0.4); rot(B.LeftLeg, 'x', 0.9); rot(B.RightLeg, 'x', 0.6);
        rot(B.LeftArm, 'z', 1.3); rot(B.RightArm, 'z', -1.3);
      } else if (st === 'tired') {
        const sw = Math.sin(t * 3);
        rot(B.Spine, 'z', sw * 0.08); rot(B.Spine, 'x', 0.12); rot(B.Head, 'x', 0.18); rot(B.Head, 'z', sw * 0.1);
        rot(B.LeftArm, 'z', -0.1 + sw * 0.08); rot(B.RightArm, 'z', 0.1 + sw * 0.08);
      } else if (st === 'hit') {
        const b2 = Math.sin(Math.min(1, t / 0.5) * Math.PI) ;
        rot(B.Spine, 'x', -0.35 * b2); rot(B.Head, 'x', -0.3 * b2);
        rot(B.LeftArm, 'z', 0.9 * b2 + Math.sin(t * 20) * 0.1 * b2); rot(B.RightArm, 'z', -0.9 * b2 - Math.sin(t * 20) * 0.1 * b2);
      }
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
/** Akrepler (Meshy Smart Rig, kemik adları rastgele): bacak zincirleri kendiliğinden bulunur.
 *  Kuyruk = ucu en yüksekte olan zincir; kıskaçlar = en önde (z) iki zincir; gerisi bacak (çapraz adım). */
function arthropod(model) {
  const bones = []; model.traverse((o) => { if (o.isBone) bones.push(o); });
  if (!bones.length) return null;
  const frame = bones[0].parent || model; model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(frame.matrixWorld).invert(), loc = (b) => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).applyMatrix4(inv);
  const kids = (b) => b.children.filter((c) => c.isBone);
  const chains = [];
  for (const j of bones) { const ks = kids(j); if (ks.length < 2) continue;
    for (const c of ks) { let n = 1, e = c; while (kids(e).length === 1) { e = kids(e)[0]; n++; } if (n >= 3 && kids(e).length === 0) chains.push({ root: c, tip: e, n }); } }
  if (!chains.length) return null;
  for (const c of chains) { c.r = loc(c.root); c.t = loc(c.tip); }
  const tail = chains.reduce((a, b) => (b.t.y > a.t.y ? b : a));
  const rest = chains.filter((c) => c !== tail).sort((a, b) => b.t.z - a.t.z);
  const claws = rest.slice(0, 2), legs = rest.slice(2).sort((a, b) => a.r.z - b.r.z);
  legs.forEach((l, i) => { l.side = Math.sign(l.r.x) || 1; l.ph = ((Math.floor(i / 2) + (l.side > 0 ? 1 : 0)) % 2) * Math.PI; });
  const tailBones = []; { let e = tail.root; tailBones.push(e); while (kids(e).length === 1) { e = kids(e)[0]; tailBones.push(e); } }
  const restQ = new Map(bones.map((b) => [b, b.quaternion.clone()]));
  const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0);
  const rot = (b, axisModel, ang) => { if (!b || !ang) return; frame.getWorldQuaternion(qa); ax.copy(axisModel).applyQuaternion(qa); b.parent.getWorldQuaternion(qb); ax.applyQuaternion(qb.invert()).normalize(); qa.setFromAxisAngle(ax, ang); b.quaternion.premultiply(qa); };
  let ph = 0;
  return {
    sting: 0, // 0..1: kuyruk öne doğru vurur
    update(dt, speed, t) {
      for (const [b, q] of restQ) b.quaternion.copy(q);
      const k = Math.min(1, Math.abs(speed) / 1.0); ph += dt * (2 + 9 * k);
      model.updateMatrixWorld(true);
      for (const l of legs) { const p = ph + l.ph; rot(l.root, Y, l.side * Math.sin(p) * 0.35 * k); rot(l.root, Z, -l.side * Math.max(0, Math.cos(p)) * 0.3 * k); }
      claws.forEach((c, i) => rot(c.root, Y, (i ? 1 : -1) * (Math.sin(t * 4 + i) * 0.12 + 0.05)));
      const st = this.sting; tailBones.forEach((b, i) => { if (i > 4) return; rot(b, X, Math.sin(t * 2.2 - i * 0.5) * 0.06 + st * 0.22); });
    },
  };
}
export function makeWalker(model, kind) {
  if (kind === 'akrep' || kind === 'devakrep') return arthropod(model);
  if (kind === 'mantarcik' || kind === 'yeti' || kind === 'asker') return hopper(model);
  if (['salyangoz', 'buzbocek', 'lavsalyangoz', 'kristalorumcek', 'kostebek'].includes(kind)) return slider(model);
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
