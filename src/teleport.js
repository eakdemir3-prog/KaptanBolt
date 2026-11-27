// Bölüm sonu ışınlanma seçenekleri (önizleme: #tp=1..5). Her biri t (sn) ile ilerler, ~1,6 sn'de biter.
import * as THREE from 'three';

const addM = (fx) => (m) => { m.traverse((c) => c.layers.set(1)); fx.g.add(m); return m; };
const glowMat = (color, op = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
function boltPath(h, seg = 9, jag = 0.45) { const pts = []; for (let i = 0; i <= seg; i++) pts.push(new THREE.Vector3(i && i < seg ? (Math.random() - 0.5) * jag : 0, h * (1 - i / seg), 0)); return pts; }
function lightning(h, w, color) { const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(boltPath(h), false, 'catmullrom', 0.1), 40, w, 6, false); return new THREE.Mesh(geo, glowMat(color)); }

// Girdap gölgelendiricisi: dönen spiral, parlak kenar, ortası derin
function swirlMat(c1, c2, c3) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending,
    uniforms: { t: { value: 0 }, o: { value: 1 }, c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) }, c3: { value: new THREE.Color(c3) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float t, o; uniform vec3 c1, c2, c3; varying vec2 vUv;
      void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float sw = sin(a * 3.0 + r * 9.0 - t * 6.0) * 0.5 + 0.5;
        float sw2 = sin(a * 5.0 - r * 14.0 - t * 9.0) * 0.5 + 0.5;
        vec3 col = mix(c3, c2, smoothstep(0.0, 0.9, r));
        col = mix(col, c1, pow(sw * sw2, 2.0) * smoothstep(0.1, 0.8, r));
        col += c1 * smoothstep(0.78, 0.97, r) * 1.4;              // parlak kenar
        col += vec3(1.0) * pow(max(0.0, 1.0 - r * 3.5), 2.0) * 0.6; // ortada parlak nokta
        float alpha = smoothstep(1.0, 0.94, r) * o;
        gl_FragColor = vec4(col, alpha); }` });
}

export function makeTeleport(kind, scene, x, y) {
  const fx = { kind, g: new THREE.Group(), t: 0, parts: [] }; fx.g.position.set(x, y, 0.3); scene.add(fx.g);
  const A = addM(fx); fx.A = A;
  if (kind === 1) { // Şimşek çarpması
    fx.bolts = [lightning(9, 0.11, 0xffffff), lightning(9, 0.3, 0x4ad8ff), lightning(9, 0.07, 0xd8faff)].map(A); fx.bolts[2].position.x = 0.4; fx.bolts.forEach((b) => { b.visible = false; });
    fx.ring = A(new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 40), glowMat(0x9af6ff, 0))); fx.ring.rotation.x = -Math.PI / 2; fx.ring.position.y = 0.05;
    fx.flash = A(new THREE.Mesh(new THREE.PlaneGeometry(60, 40), glowMat(0xffffff, 0))); fx.flash.position.set(0, 4, 2);
  } else if (kind >= 6) { // yeni portallar: 6 oval girdap, 7 taş kemerli, 8 yerde açılan
    const ground = kind === 8;
    const pal = kind === 7 ? [0xaef8ff, 0x1a9ad8, 0x061a3a] : [0xd8a8ff, 0x3ac8ff, 0x10063a];
    fx.mat = swirlMat(...pal);
    fx.disc = A(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fx.mat));
    fx.glow = A(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: glowTexP(), color: pal[1], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    if (ground) { fx.disc.rotation.x = -Math.PI / 2 + 0.35; fx.disc.position.set(0, 0.06, 0); fx.base = new THREE.Vector3(0.95, 0.95, 1); fx.glow.position.set(0, 0.8, -0.2); }
    else { fx.disc.position.set(1.6, 1.25, -0.15); fx.base = new THREE.Vector3(0.78, 1.2, 1); fx.glow.position.set(1.6, 1.25, -0.2); }
    fx.disc.scale.set(0.001, 0.001, 1);
    if (kind === 7) { // taş kemer: kayalar halka şeklinde
      fx.arch = new THREE.Group(); fx.arch.position.copy(fx.disc.position);
      const rock = new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.9, flatShading: true });
      for (let i = 0; i < 11; i++) { const a = -0.25 + (i / 10) * (Math.PI + 0.5); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26 + Math.random() * 0.08, 0), rock); m.position.set(Math.cos(a) * 0.9, Math.sin(a) * 1.35 - 0.05, 0.05); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); m.castShadow = true; fx.arch.add(m); }
      fx.arch.position.y -= 0.0; A(fx.arch); fx.arch.scale.setScalar(0.001);
      fx.base.set(0.8, 1.25, 1);
    }
    fx.sucked = []; const sg = new THREE.SphereGeometry(0.05, 6, 4);
    for (let i = 0; i < 40; i++) { const m = A(new THREE.Mesh(sg, glowMat(i % 2 ? pal[0] : pal[1]))); m.userData.a = Math.random() * 6.28; m.userData.r = 1.2 + Math.random() * 0.8; m.userData.k = Math.random(); m.visible = false; fx.sucked.push(m); }
  } else if (kind === 2) { // Portal halkası
    fx.ring = A(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 12, 60), glowMat(0x6ae8ff)));
    fx.disc = A(new THREE.Mesh(new THREE.CircleGeometry(0.98, 48), new THREE.MeshBasicMaterial({ color: 0x14246a, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false })));
    fx.swirl = A(new THREE.Mesh(new THREE.RingGeometry(0.25, 0.9, 48, 1, 0, Math.PI * 1.2), glowMat(0x3ac8ff, 0.7))); fx.swirl2 = A(new THREE.Mesh(new THREE.RingGeometry(0.1, 0.6, 48, 1, Math.PI, Math.PI * 1.1), glowMat(0x9a6aff, 0.6))); fx.swirl2.position.set(1.4, 1.05, -0.08); fx.swirl2.scale.setScalar(0.01);
    for (const m of [fx.ring, fx.disc, fx.swirl]) m.position.set(1.4, 1.05, -0.1);
    fx.ring.scale.setScalar(0.01); fx.disc.scale.setScalar(0.01); fx.swirl.scale.setScalar(0.01);
  } else if (kind === 3) { // Kuyruklu yıldız gibi göğe fırlama
    fx.orb = A(new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), glowMat(0xe8fcff))); fx.orb.visible = false;
    fx.halo = A(new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), glowMat(0x4ad8ff, 0.5))); fx.halo.visible = false;
    fx.trail = [];
  } else if (kind === 4) { // Parçalara ayrılıp küreye emilme
    fx.cubes = []; const geo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    for (let i = 0; i < 70; i++) { const c = A(new THREE.Mesh(geo, glowMat(i % 3 ? 0xdff8ff : 0x5ae0ff))); c.visible = false; c.userData.p = new THREE.Vector3((Math.random() - 0.5) * 0.7, 0.1 + Math.random() * 1.4, (Math.random() - 0.5) * 0.4); c.userData.d = Math.random() * 0.35; fx.cubes.push(c); }
  } else if (kind === 5) { // Kıvılcım hortumu
    fx.sp = []; const geo = new THREE.SphereGeometry(0.07, 8, 6);
    for (let i = 0; i < 90; i++) { const m = A(new THREE.Mesh(geo, glowMat(i % 2 ? 0xaaf6ff : 0x3ac8ff))); m.userData.a = Math.random() * Math.PI * 2; m.userData.h = Math.random(); m.userData.s = 0.8 + Math.random() * 0.6; fx.sp.push(m); }
    fx.col = A(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 4, 32, 1, true), glowMat(0x4ad8ff, 0))); fx.col.position.y = 2;
  }
  return fx;
}

/** Bolt'u ve efekti t anına göre güncelle. B = Bolt'un temel ölçeği, orb = direk küresinin yüksekliği */
export function updateTeleport(fx, bolt, B, dt, spark) {
  const t = (fx.t += dt), x = fx.g.position.x, y = fx.g.position.y;
  if (fx.kind === 1) {
    const on = t > 0.45 && t < 0.95;
    fx.bolts.forEach((b, i) => { b.visible = on && Math.floor(t * 30 + i) % 3 !== 0; if (on && Math.random() < 0.3) { b.geometry.dispose(); b.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(boltPath(9), false), 40, [0.11, 0.3, 0.07][i], 6, false); } });
    fx.flash.material.opacity = t > 0.45 && t < 0.75 ? 0.35 * (1 - (t - 0.45) / 0.3) : 0;
    if (t < 0.45) { bolt.position.y = y + Math.abs(Math.sin(t * 30)) * 0.04; bolt.rotation.z = Math.sin(t * 50) * 0.05; }
    else if (!fx.gone) { fx.gone = true; bolt.visible = false; for (let i = 0; i < 30; i++) spark(x + (Math.random() - 0.5) * 1.4, y + Math.random() * 1.5, 1.8); }
    const k = Math.max(0, t - 0.5); fx.ring.material.opacity = k > 0 ? Math.max(0, 0.9 - k * 1.2) : 0; fx.ring.scale.setScalar(1 + k * 6);
  } else if (fx.kind >= 6) {
    const open = Math.min(1, t / 0.35), close = t > 1.35 ? Math.max(0.001, 1 - (t - 1.35) * 3.5) : 1;
    const e = 1 - Math.pow(1 - open, 3), k = e * close * (1 + Math.sin(t * 7) * 0.03);
    fx.disc.scale.set(fx.base.x * k + 0.001, fx.base.y * k + 0.001, 1); fx.mat.uniforms.t.value = t; fx.glow.material.opacity = 0.55 * k;
    if (fx.arch) fx.arch.scale.setScalar(Math.max(0.001, Math.min(1, t / 0.25)) * (t > 1.45 ? Math.max(0.001, 1 - (t - 1.45) * 4) : 1));
    const c = fx.disc.position;
    fx.sucked.forEach((m) => { m.visible = t > 0.2 && t < 1.4; const kk = (m.userData.k + t * 0.9) % 1; const r = m.userData.r * (1 - kk); m.userData.a += dt * 5; m.position.set(c.x + Math.cos(m.userData.a) * r * (fx.kind === 8 ? 1 : 0.7), c.y + Math.sin(m.userData.a) * r * (fx.kind === 8 ? 0.35 : 1), c.z + 0.1); m.scale.setScalar(1 - kk * 0.7); });
    if (fx.kind === 8) { // Bolt dönerek portala gömülür
      if (t > 0.35 && t < 1.2) { const q = (t - 0.35) / 0.85; bolt.position.y = y - q * q * 1.6; bolt.rotation.y += dt * (4 + q * 14); bolt.scale.setScalar(B * Math.max(0.01, 1 - q * 0.6)); if (q > 0.95) bolt.visible = false; }
      else if (t >= 1.2) bolt.visible = false;
    } else { // Bolt koşup portala atlar, içine çekilip küçülür
      if (t > 0.3 && t < 1.15) { const q = (t - 0.3) / 0.85; bolt.rotation.y = Math.PI / 2; bolt.position.x = x + q * (c.x); bolt.position.y = y + Math.sin(q * Math.PI) * 0.9 + q * 0.6; bolt.scale.setScalar(B * Math.max(0.01, 1 - q * q)); bolt.rotation.z = -q * 2.5; if (q > 0.97) bolt.visible = false; }
      else if (t >= 1.15) bolt.visible = false;
    }
  } else if (fx.kind === 2) {
    const o = Math.min(1, t / 0.4), c = t > 1.3 ? Math.max(0.01, 1 - (t - 1.3) * 3) : 1;
    for (const m of [fx.ring, fx.disc, fx.swirl, fx.swirl2]) m.scale.setScalar(Math.max(0.01, o * c));
    fx.swirl.rotation.z -= dt * 8; fx.swirl2.rotation.z -= dt * 12; fx.ring.scale.y *= 1 + Math.sin(t * 9) * 0.03;
    if (t > 0.35 && t < 1.15) { const k = (t - 0.35) / 0.8; bolt.position.x = x + k * 1.4; bolt.scale.setScalar(B * Math.max(0.01, 1 - k)); bolt.rotation.y = Math.PI / 2; if (Math.random() < 0.5) spark(x + 1.4, y + 1 + (Math.random() - 0.5), 0.8); }
    else if (t >= 1.15) bolt.visible = false;
  } else if (fx.kind === 3) {
    if (t < 0.4) { bolt.scale.set(B * (1 + t * 0.6), B * (1 - t * 0.8), B * (1 + t * 0.6)); }
    else {
      if (!fx.orb.visible) { fx.orb.visible = fx.halo.visible = true; bolt.visible = false; }
      const k = t - 0.4, oy = 0.7 + k * k * 10, ox = k * 1.5;
      fx.orb.position.set(ox, oy, 0); fx.halo.position.copy(fx.orb.position); fx.halo.scale.setScalar(1 + Math.sin(t * 20) * 0.15);
      for (let i = 0; i < 2; i++) spark(x + ox + (Math.random() - 0.5) * 0.3, y + oy - 0.2, 0.25);
      if (fx.trail.length < 24) { const m = fx.A(new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), glowMat(0x4ad8ff, 0.5))); fx.trail.push(m); }
      fx.trail.forEach((m, i) => { const kk = Math.max(0, k - i * 0.025); m.position.set(kk * 1.5, 0.7 + kk * kk * 10, 0); m.scale.setScalar(Math.max(0.05, 1 - i / 24)); m.material.opacity = 0.5 * (1 - i / 24); });
    }
  } else if (fx.kind === 4) {
    if (t < 0.3) bolt.position.y = y + t * 0.5;
    else {
      if (!fx.started) { fx.started = true; bolt.visible = false; fx.cubes.forEach((c) => { c.visible = true; c.position.copy(c.userData.p); c.position.y += 0.15; }); }
      const target = new THREE.Vector3(0, 2.5, -0.5);
      fx.cubes.forEach((c) => { const k = Math.min(1, Math.max(0, (t - 0.3 - c.userData.d) / 0.8)); const e = k * k; c.position.lerpVectors(c.userData.p, target, e); c.position.x += Math.sin(k * Math.PI) * (c.userData.p.x > 0 ? 0.6 : -0.6); c.rotation.set(t * 5, t * 7, 0); c.scale.setScalar(1 - e * 0.8); c.visible = k < 0.98; });
    }
  } else if (fx.kind === 5) {
    const up = Math.min(1, t / 0.5), out = t > 1.2 ? Math.max(0, 1 - (t - 1.2) * 2.5) : 1;
    fx.col.material.opacity = 0.25 * up * out;
    fx.sp.forEach((m) => { m.userData.a += dt * 7 * m.userData.s; const hh = (m.userData.h + t * 0.9 * m.userData.s) % 1; const r = 0.55 + hh * 0.35; m.position.set(Math.cos(m.userData.a) * r, hh * 3.8, Math.sin(m.userData.a) * r * 0.6); m.scale.setScalar(up * out * (1 - hh * 0.5)); });
    if (t > 0.3 && t < 1.25) { const k = (t - 0.3) / 0.95; bolt.rotation.y += dt * (6 + k * 20); bolt.position.y = y + k * k * 2.6; bolt.scale.setScalar(B * Math.max(0.01, 1 - k * k)); }
    else if (t >= 1.25) bolt.visible = false;
  }
}

let GT = null;
function glowTexP() { if (GT) return GT; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); GT = new THREE.CanvasTexture(c); return GT; }
