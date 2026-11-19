// Dünya süsleri: tahtanın iki yanına ve arkasına temaya uygun dekorlar.
// Hareketli olanlar `anim` listesine eklenir (stage her karede çağırır).
import * as THREE from 'three';

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const glow = (c, k = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
function mesh(g, m, p = [0, 0, 0], cast = true) { const o = new THREE.Mesh(g, m); o.position.set(...p); o.castShadow = cast; o.receiveShadow = true; return o; }

/**
 * @param world dünya no (1-10)
 * @param pw,pd platform genişliği/derinliği; bz arka duvar z'si
 * @returns { group, anim: [(t)=>void] }
 */
export function makeDecor(world, pw, pd, bz, rnd, rockMat) {
  const g = new THREE.Group(), anim = [];
  const side = (fn) => { for (const sx of [-1, 1]) fn(sx); };
  // Kamera tahtayı ekran genişliğine sığdırır; yanlar görünmez. Süsler tahtanın ön ve arka
  // köşelerindeki taş çıkıntılara konur (ekranda tahtanın hemen altı ve üstü).
  const X = (sx, k = 0) => sx * (pw / 2 - 0.45 + k * 0.4);
  const zb = -pd / 2 - 0.55, zf = pd / 2 + 0.5;
  const zs = [zb, zf, zf];
  const ledge = rockMat;
  side((sx) => { for (const z of [zb, zf]) g.add(mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.5, 7), ledge, [X(sx), -0.62, z])); });

  if (world === 1) { // Taş Zindan: zincirler ve fıçılar
    const iron = std(0x6a6f8a, { metalness: 0.7, roughness: 0.35 });
    side((sx) => {
      const ch = new THREE.Group(); ch.position.set(X(sx, -0.2), 3.2, bz + 1.4);
      for (let i = 0; i < 9; i++) { const l = mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 12), iron, [0, -i * 0.15, 0]); l.rotation.y = i % 2 ? Math.PI / 2 : 0; ch.add(l); }
      g.add(ch); anim.push((t) => { ch.rotation.z = Math.sin(t * 0.9 + sx) * 0.06; });
      const wood = std(0x6b4423, { roughness: 0.8 }), band = std(0x3a3f55, { metalness: 0.6 });
      const b = mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.6, 16), wood, [X(sx, 0.1), -0.1, zs[2] - 0.3]); g.add(b);
      for (const y of [-0.2, 0.2]) g.add(mesh(new THREE.TorusGeometry(0.27, 0.02, 6, 20), band, [X(sx, 0.1), -0.1 + y, zs[2] - 0.3]).rotateX(Math.PI / 2));
    });
  } else if (world === 2) { // Anahtar Mahzeni: hazine sandıkları ve altın yığınları
    const wood = std(0x7a3e1a, { roughness: 0.7 }), gold = glow(0xffc33a, 0.35);
    side((sx) => {
      const c = new THREE.Group(); c.position.set(X(sx, 0.05), -0.05, zs[1]); c.rotation.y = -sx * 0.5;
      c.add(mesh(new THREE.BoxGeometry(0.6, 0.36, 0.4), wood));
      const lid = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16, 1, false, 0, Math.PI), wood, [0, 0.18, 0]); lid.rotation.z = Math.PI / 2; c.add(lid);
      c.add(mesh(new THREE.BoxGeometry(0.62, 0.05, 0.42), gold, [0, 0.05, 0], false));
      g.add(c);
      for (let i = 0; i < 9; i++) { const coin = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), gold, [X(sx, -0.1) + (rnd() - 0.5) * 0.5, -0.32 + i * 0.012, zs[2] - 0.2 + (rnd() - 0.5) * 0.4]); coin.rotation.set(rnd(), 0, rnd()); g.add(coin); }
    });
  } else if (world === 3) { // Buz Mağarası: buz sarkıtları ve kar tümsekleri
    const ice = std(0xcff4ff, { roughness: 0.15, metalness: 0.1, emissive: 0x3fb8ff, emissiveIntensity: 0.25, transparent: true, opacity: 0.9 });
    const snow = std(0xeef8ff, { roughness: 0.9 });
    for (let i = -4; i <= 4; i++) { const h = 0.4 + rnd() * 0.7; const c = mesh(new THREE.ConeGeometry(0.1 + rnd() * 0.06, h, 8), ice, [i * 0.9 + rnd() * 0.3, 3.4 - h / 2, bz + 1.2]); c.rotation.x = Math.PI; g.add(c); }
    side((sx) => {
      for (const z of zs) { const m = mesh(new THREE.SphereGeometry(0.35 + rnd() * 0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), snow, [X(sx, rnd() * 0.3), -0.38, z]); m.scale.y = 0.5; g.add(m); }
      const cr = mesh(new THREE.OctahedronGeometry(0.25), ice, [X(sx, -0.1), 0.1, zs[0]]); cr.scale.y = 2.2; g.add(cr);
    });
  } else if (world === 4) { // Devriye Fabrikası: dönen çarklar ve borular
    const metal = std(0x8a7f86, { metalness: 0.75, roughness: 0.35 }), pipe = std(0x5a3a3e, { metalness: 0.5 }), warn = glow(0xff4a3a, 1.2);
    side((sx) => {
      for (const [z, r, y] of [[zs[0], 0.45, 0.5], [zs[1] + 0.3, 0.3, 0.05]]) {
        const gear = new THREE.Group(); gear.position.set(X(sx, 0.15), y, z); gear.rotation.y = Math.PI / 2;
        gear.add(mesh(new THREE.CylinderGeometry(r, r, 0.12, 20), metal).rotateX(Math.PI / 2));
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; const tth = mesh(new THREE.BoxGeometry(0.1, 0.14, 0.12), metal, [Math.cos(a) * (r + 0.05), Math.sin(a) * (r + 0.05), 0]); tth.rotation.z = a; gear.add(tth); }
        gear.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12), warn, [0, 0, 0], false).rotateX(Math.PI / 2));
        g.add(gear); const sp = (r > 0.4 ? 0.6 : -1) * sx; anim.push((t) => { gear.rotation.x = t * sp; });
      }
      const p = mesh(new THREE.CylinderGeometry(0.09, 0.09, 4, 12), pipe, [X(sx, 0.55), 1.2, zs[2] - 0.2]); g.add(p);
      const lamp = mesh(new THREE.SphereGeometry(0.07, 10, 10), warn, [X(sx, 0.55), 2.4, zs[2] - 0.05], false); g.add(lamp);
      anim.push((t) => { lamp.material.emissiveIntensity = 0.4 + Math.max(0, Math.sin(t * 5)) * 1.4; });
    });
  } else if (world === 5) { // Yosunlu Kale: çalılar ve sarmaşıklar
    const leaf = std(0x2f9a4a, { roughness: 0.8 }), leaf2 = std(0x4ac060, { roughness: 0.8 }), flower = glow(0xfff07a, 0.6);
    side((sx) => {
      for (const z of zs) {
        const b = new THREE.Group(); b.position.set(X(sx, rnd() * 0.25), -0.25, z);
        for (let k = 0; k < 5; k++) b.add(mesh(new THREE.SphereGeometry(0.16 + rnd() * 0.1, 10, 8), k % 2 ? leaf : leaf2, [(rnd() - 0.5) * 0.4, rnd() * 0.25, (rnd() - 0.5) * 0.35]));
        b.add(mesh(new THREE.SphereGeometry(0.045, 8, 8), flower, [0.05, 0.32, 0.12], false));
        g.add(b); const ph = rnd() * 6; anim.push((t) => { b.rotation.z = Math.sin(t * 1.2 + ph) * 0.04; });
      }
      for (let i = 0; i < 6; i++) g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), leaf, [X(sx, -0.35), 2.8 - i * 0.28, bz + 1.6 + Math.sin(i) * 0.1]));
    });
  } else if (world === 6) { // Işınlanma Labı: dönen enerji halkaları
    const ring = glow(0xff6ae8, 1.3), base = std(0x3a2a5a, { metalness: 0.6 }), core = glow(0x6affe0, 1.6);
    side((sx) => {
      const pod = new THREE.Group(); pod.position.set(X(sx, 0.1), -0.2, zs[1]);
      pod.add(mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.2, 18), base));
      pod.add(mesh(new THREE.SphereGeometry(0.11, 14, 12), core, [0, 0.55, 0], false));
      const r1 = mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 32), ring, [0, 0.55, 0], false), r2 = r1.clone(); r2.scale.setScalar(0.75);
      pod.add(r1, r2); g.add(pod);
      anim.push((t) => { r1.rotation.x = t * 1.4; r1.rotation.y = t * 0.7; r2.rotation.y = -t * 1.8; r2.rotation.z = t; pod.children[1].position.y = 0.55 + Math.sin(t * 2.4) * 0.05; });
    });
  } else if (world === 7) { // Takipçi İni: sarkıtlar ve karanlıkta parlayan gözler
    const rock = std(0x3a1a18, { roughness: 0.9 }), eye = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
    side((sx) => {
      for (const z of zs) { const h = 0.6 + rnd() * 0.6; g.add(mesh(new THREE.ConeGeometry(0.16, h, 7), rock, [X(sx, rnd() * 0.3), -0.4 + h / 2, z])); }
      const eyes = new THREE.Group(); eyes.position.set(X(sx, -0.1), 1.5, bz + 1.5);
      eyes.add(mesh(new THREE.SphereGeometry(0.04, 8, 8), eye, [-0.07, 0, 0], false), mesh(new THREE.SphereGeometry(0.04, 8, 8), eye, [0.07, 0, 0], false));
      g.add(eyes); const ph = rnd() * 9; anim.push((t) => { const b = ((t + ph) % 4) < 0.15 ? 0.1 : 1; eyes.scale.y = b; });
    });
  } else if (world === 8) { // Köprü Ustası: halatlı ahşap direkler ve kalas yığını
    const wood = std(0x8a5a2a, { roughness: 0.8 }), rope = std(0xd8b878, { roughness: 0.9 });
    side((sx) => {
      for (const z of [zb, zf]) {
        const x0 = X(sx, -0.6), x1 = X(sx, 0.4);
        for (const x of [x0, x1]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 10), wood, [x, -0.05, z]));
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0, 0.32, z), new THREE.Vector3((x0 + x1) / 2, 0.12, z), new THREE.Vector3(x1, 0.32, z));
        g.add(mesh(new THREE.TubeGeometry(curve, 16, 0.022, 6), rope));
      }
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(0.6, 0.06, 0.16), wood, [X(sx, -0.1), -0.33 + i * 0.07, zf + 0.15 + i * 0.03]).rotateY(rnd() * 0.6));
    });
  } else if (world === 9) { // Ok Labirenti: parlayan ok tabelaları
    const post = std(0x2a4a48), sign = glow(0xffe14a, 0.9);
    side((sx) => {
      for (const z of [zs[0], zs[2] - 0.2]) {
        const s = new THREE.Group(); s.position.set(X(sx, 0.05), 0, z);
        s.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), post, [0, 0, 0]));
        const ar = mesh(new THREE.ConeGeometry(0.16, 0.3, 3), sign, [0, 0.55, 0], false); ar.rotation.z = (rnd() > 0.5 ? 1 : -1) * Math.PI / 2; s.add(ar);
        g.add(s); const ph = rnd() * 6; anim.push((t) => { ar.material.emissiveIntensity = 0.5 + Math.abs(Math.sin(t * 3 + ph)) * 0.8; });
      }
    });
  } else if (world === 10) { // Son Kale: sancaklar ve altın taç heykelleri
    const cloth = std(0x9a1a3a, { roughness: 0.8, side: THREE.DoubleSide }), gold = glow(0xffcf3a, 0.4), pole = std(0x3a2a2a);
    side((sx) => {
      const b = new THREE.Group(); b.position.set(X(sx, -0.15), 1.8, bz + 1.6);
      b.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), pole, [0, 0.4, 0]).rotateZ(Math.PI / 2));
      const fl = mesh(new THREE.PlaneGeometry(0.9, 1.4, 4, 8), cloth, [0, -0.35, 0.01], false); b.add(fl);
      b.add(mesh(new THREE.OctahedronGeometry(0.12), gold, [0, -0.2, 0.04], false));
      g.add(b); const pos = fl.geometry.attributes.position, base = pos.array.slice();
      anim.push((t) => { for (let i = 0; i < pos.count; i++) pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 2 + base[i * 3 + 1] * 3 + sx) * 0.05 * (0.7 - base[i * 3 + 1]); pos.needsUpdate = true; });
      const st = new THREE.Group(); st.position.set(X(sx, 0.1), -0.3, zs[2] - 0.2);
      st.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 8), pole, [0, 0, 0]));
      const cr = mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 6, 1, true), gold, [0, 0.34, 0]); st.add(cr);
      g.add(st); anim.push((t) => { cr.rotation.y = t * 0.8; });
    });
  }
  return { group: g, anim };
}
