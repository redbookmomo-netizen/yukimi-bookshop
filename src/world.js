import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { FEATURED, BOOK_COLORS } from './books.js';

const PI = Math.PI;

export function buildWorld() {
  const scene = new THREE.Scene();
  const W = {
    scene, interact: [], featuredRecs: [], obstacles: [], updaters: [],
    bounds: { x0: -3.3, x1: 3.3, z0: -11.25, z1: -0.5 },
  };
  const R = T.rng(20261120);

  /* ---------------- materials ---------------- */
  const shelfMat = new THREE.MeshLambertMaterial({ map: T.woodTexture({ base: '#4a2c19', planks: 2, seams: false, seed: 4 }) });
  const darkWood = new THREE.MeshLambertMaterial({ map: T.woodTexture({ base: '#2f1c10', planks: 1, seams: false, seed: 2 }) });
  const floorMat = new THREE.MeshLambertMaterial({ map: T.woodTexture({ base: '#6a4428', planks: 6, seed: 8, repeat: [2, 3] }) });
  const plasterMat = new THREE.MeshLambertMaterial({ map: T.plasterTexture({ repeat: [2, 1] }) });
  const plasterShapeMat = new THREE.MeshLambertMaterial({ map: T.plasterTexture({ repeat: [0.3, 0.3], seed: 12 }) });
  const ceilMat = new THREE.MeshLambertMaterial({ map: T.woodTexture({ base: '#3e2918', planks: 10, seed: 6, repeat: [1, 2] }) });
  const facadeTex = T.woodTexture({ base: '#2b1d14', planks: 10, seed: 12, repeat: [0.4, 0.4] });
  const facadeMat = new THREE.MeshLambertMaterial({ map: facadeTex });
  const sidingMat = new THREE.MeshLambertMaterial({ map: T.woodTexture({ base: '#241912', planks: 10, seed: 13, repeat: [3, 2] }) });
  const snowTex = T.snowTexture({ repeat: [8, 4] });
  const snowMat = new THREE.MeshLambertMaterial({ map: snowTex });
  const snowWhite = new THREE.MeshLambertMaterial({ color: '#eef2f8' });
  const roofMat = new THREE.MeshLambertMaterial({ color: '#33353b' });
  const glowWarm = T.glowTexture();
  const glowCool = T.glowTexture('rgba(220,235,255,1)', 'rgba(150,180,230,0.3)');

  const box = (w, h, d, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const glow = (tex, size, x, y, z, opacity = 0.5, parent = scene) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
    s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); return s;
  };

  /* ---------------- sky ---------------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.MeshBasicMaterial({ map: T.skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);
  {
    const n = 420, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = R() * PI * 2, ph = 0.15 + R() * 1.25;
      pos[i * 3] = Math.cos(th) * Math.cos(ph) * 85; pos[i * 3 + 1] = Math.sin(ph) * 85; pos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 85;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#cfd8ff', size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7, depthWrite: false })));
    const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: '#f4efe0', fog: false }));
    moon.position.set(-16, 24, -46); moon.lookAt(0, 1.6, 6); scene.add(moon);
    glow(glowCool, 16, -16, 24, -45.8, 0.45);
  }

  /* ---------------- lights ---------------- */
  const hemi = new THREE.HemisphereLight('#9fb0d8', '#2a2018', 0.55); scene.add(hemi);
  const moonLight = new THREE.DirectionalLight('#9db4e8', 0.9); moonLight.position.set(-6, 14, 10); scene.add(moonLight);
  W.lights = { hemi, moonLight };

  /* ---------------- interior shell ---------------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 12), floorMat);
  floor.rotation.x = -PI / 2; floor.position.set(0, 0, -6); scene.add(floor);
  floor.userData.type = 'floor'; W.interact.push(floor);
  const doma = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.7), new THREE.MeshLambertMaterial({ map: T.stoneTexture({ repeat: [6, 1] }) }));
  doma.rotation.x = -PI / 2; doma.position.set(0, 0.003, -0.35); scene.add(doma);
  doma.userData.type = 'floor'; W.interact.push(doma);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8, 12), ceilMat);
  ceil.rotation.x = PI / 2; ceil.position.set(0, 3.2, -6); scene.add(ceil);
  for (let z = -1.5; z > -12; z -= 2.5) box(8, 0.16, 0.18, darkWood, 0, 3.12, z);

  const wallL = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.2), plasterMat);
  wallL.rotation.y = PI / 2; wallL.position.set(-4, 1.6, -6); scene.add(wallL);
  const wallR = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.2), plasterMat);
  wallR.rotation.y = -PI / 2; wallR.position.set(4, 1.6, -6); scene.add(wallR);
  W.interact.push(wallL, wallR);
  for (const x of [-3.92, 3.92]) for (const z of [-0.08, -6.1, -11.92]) box(0.16, 3.2, 0.16, darkWood, x, 1.6, z);

  // back wall with round window (丸窓)
  {
    const sh = new THREE.Shape();
    sh.moveTo(-4, 0); sh.lineTo(4, 0); sh.lineTo(4, 3.2); sh.lineTo(-4, 3.2); sh.lineTo(-4, 0);
    const hole = new THREE.Path(); hole.absarc(0, 1.65, 0.7, 0, PI * 2, true); sh.holes.push(hole);
    const g = new THREE.ShapeGeometry(sh, 48);
    const m = new THREE.Mesh(g, plasterShapeMat); m.position.z = -12; scene.add(m);
    W.interact.push(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 10, 64), darkWood);
    ring.position.set(0, 1.65, -11.98); scene.add(ring);
    for (const x of [-0.28, 0, 0.28]) {
      const len = 2 * Math.sqrt(0.7 * 0.7 - x * x);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 6), new THREE.MeshLambertMaterial({ color: '#7d6a3e' }));
      bar.position.set(x, 1.65, -12); scene.add(bar);
    }
    // stand + vase with plum branch under the window
    box(0.9, 0.42, 0.34, darkWood, 0, 0.21, -11.8);
    const vase = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0.01], [0.09, 0.08], [0.07, 0.18], [0.035, 0.24], [0.045, 0.27]].map(([x, y]) => new THREE.Vector2(x, y)), 16), new THREE.MeshStandardMaterial({ color: '#2d4b5e', roughness: 0.35 }));
    vase.position.set(0.18, 0.42, -11.8); scene.add(vase);
    branch(scene, new THREE.Vector3(0.18, 0.66, -11.8), 3, 0.42, 0.008, R, 0.5);
    W.obstacles.push({ x0: -0.5, x1: 0.5, z0: -12, z1: -11.55 });
  }

  // front wall (interior plaster + exterior clapboard façade)
  {
    const frontShape = (top) => {
      const s = new THREE.Shape();
      s.moveTo(-4, 0); s.lineTo(-0.95, 0); s.lineTo(-0.95, 2.3); s.lineTo(0.95, 2.3); s.lineTo(0.95, 0); s.lineTo(4, 0); s.lineTo(4, top); s.lineTo(-4, top); s.lineTo(-4, 0);
      for (const [x0, x1] of [[-3.3, -1.5], [1.5, 3.3]]) {
        const h = new THREE.Path(); h.moveTo(x0, 0.85); h.lineTo(x0, 2.15); h.lineTo(x1, 2.15); h.lineTo(x1, 0.85); h.lineTo(x0, 0.85); s.holes.push(h);
      }
      return new THREE.ShapeGeometry(s);
    };
    const inner = new THREE.Mesh(frontShape(3.2), plasterShapeMat);
    inner.rotation.y = PI; inner.position.z = -0.01; scene.add(inner);
    const outer = new THREE.Mesh(frontShape(5.6), facadeMat);
    outer.position.z = 0.01; scene.add(outer);
    W.interact.push(inner, outer);
    // window lattices (格子) and sills
    const latMat = new THREE.MeshLambertMaterial({ color: '#3b2516' });
    const glass = new THREE.MeshBasicMaterial({ color: '#c8d8ea', transparent: true, opacity: 0.08, depthWrite: false });
    for (const [x0, x1] of [[-3.3, -1.5], [1.5, 3.3]]) {
      const cx = (x0 + x1) / 2, w = x1 - x0;
      for (let x = x0 + 0.06; x < x1 - 0.03; x += 0.075) box(0.022, 1.3, 0.03, latMat, x, 1.5, 0.05);
      box(w + 0.1, 0.06, 0.08, latMat, cx, 2.18, 0.04); box(w + 0.1, 0.06, 0.08, latMat, cx, 0.82, 0.04);
      box(w + 0.12, 0.05, 0.2, darkWood, cx, 0.8, 0.1); box(w + 0.1, 0.05, 0.18, snowWhite, cx, 0.84, 0.11);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.3), glass); gl.position.set(cx, 1.5, 0); scene.add(gl);
      // inner frame
      box(w + 0.08, 0.06, 0.06, darkWood, cx, 2.18, -0.04); box(w + 0.08, 0.06, 0.14, darkWood, cx, 0.82, -0.07);
    }
    // door frame
    box(0.1, 2.4, 0.18, darkWood, -1.0, 1.2, 0); box(0.1, 2.4, 0.18, darkWood, 1.0, 1.2, 0);
    box(2.1, 0.14, 0.2, darkWood, 0, 2.37, 0);
    box(2.0, 0.03, 0.2, new THREE.MeshLambertMaterial({ color: '#1c120b' }), 0, 0.012, 0);
  }

  // sliding lattice-glass doors
  {
    const mkPanel = (x, z) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const fm = new THREE.MeshLambertMaterial({ color: '#5a3a22', map: shelfMat.map });
      const pw = 0.94, ph = 2.28;
      box(0.05, ph, 0.04, fm, -pw / 2 + 0.025, ph / 2, 0, g); box(0.05, ph, 0.04, fm, pw / 2 - 0.025, ph / 2, 0, g);
      box(pw, 0.06, 0.04, fm, 0, ph - 0.03, 0, g); box(pw, 0.5, 0.035, fm, 0, 0.25, 0, g);
      box(pw, 0.04, 0.04, fm, 0, 0.52, 0, g);
      for (let i = 1; i < 4; i++) box(0.018, ph - 0.58, 0.03, fm, -pw / 2 + (pw / 4) * i, 0.52 + (ph - 0.58) / 2, 0, g);
      for (let j = 1; j < 5; j++) box(pw, 0.018, 0.03, fm, 0, 0.52 + ((ph - 0.58) / 5) * j, 0, g);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.08, ph - 0.6), new THREE.MeshBasicMaterial({ color: '#d8e4f0', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
      gl.position.set(0, 0.52 + (ph - 0.58) / 2, 0); g.add(gl);
      g.traverse((o) => { if (o.isMesh) { o.userData.type = 'door'; W.interact.push(o); } });
      scene.add(g); return g;
    };
    const left = mkPanel(-0.46, 0.035);
    const right = mkPanel(0.46, -0.035);
    W.door = { left, right, closedX: 0.46, openX: -0.42 };
  }

  /* ---------------- exterior ---------------- */
  {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), snowMat);
    ground.rotation.x = -PI / 2; ground.position.set(0, -0.005, 17); scene.add(ground);
    ground.userData.type = 'ground'; W.interact.push(ground);
    const track = new THREE.MeshBasicMaterial({ color: '#8d9ab3', transparent: true, opacity: 0.25, depthWrite: false });
    for (const z of [7.6, 9.2]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(70, 0.35), track); t.rotation.x = -PI / 2; t.position.set(0, 0.002, z); scene.add(t); }
    // footprints to the door
    const fp = new THREE.MeshBasicMaterial({ color: '#7f93b3', transparent: true, opacity: 0.45, depthWrite: false });
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), fp);
      s.scale.set(1, 1.9, 1); s.rotation.x = -PI / 2;
      const z = 0.6 + i * 0.42;
      s.position.set(0.32 + (i % 2 ? 0.12 : -0.12) + Math.sin(i * 0.4) * 0.15, 0.003, z); scene.add(s);
    }
    // snow banks
    for (const [x, len] of [[-2.55, 2.4], [2.55, 2.4], [-8, 7], [8, 7]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, PI * 2, 0, PI / 2), snowWhite);
      b.scale.set(len / 2, 0.22, 0.32); b.position.set(x, -0.02, 0.3);
      scene.add(b);
    }
    // eave over the door & windows
    const eave = new THREE.Group(); eave.position.set(0, 2.62, 0); eave.rotation.x = 0.32; scene.add(eave);
    box(7.8, 0.08, 1.0, roofMat, 0, 0, 0.56, eave);
    for (let x = -3.85; x <= 3.85; x += 0.22) box(0.06, 0.05, 1.0, new THREE.MeshLambertMaterial({ color: '#25272c' }), x, 0.06, 0.58, eave);
    box(7.9, 0.12, 0.95, snowWhite, 0, 0.13, 0.56, eave);
    box(7.9, 0.1, 0.12, darkWood, 0, -0.06, 1.0, eave);
    // icicles
    for (let x = -3.7; x <= 3.7; x += 0.17 + R() * 0.25) {
      const ic = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08 + R() * 0.22, 5), new THREE.MeshStandardMaterial({ color: '#dfeaf7', roughness: 0.1, transparent: true, opacity: 0.85 }));
      ic.rotation.x = PI; ic.position.set(x, 2.62 - 0.33 - 0.06, 0.95 + 0.04); scene.add(ic);
    }
    // signboard
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshLambertMaterial({ map: T.signboardTexture(), emissive: '#ffffff', emissiveIntensity: 0.12 }));
    sign.material.emissiveMap = sign.material.map;
    sign.position.set(0, 3.55, 0.06); scene.add(sign);
    box(3.0, 0.08, 0.14, darkWood, 0, 3.94, 0.07); box(3.0, 0.06, 0.16, snowWhite, 0, 3.99, 0.08);
    // 2F window
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), new THREE.MeshBasicMaterial({ map: T.windowGlowTexture(3), color: '#9c7a55' }));
    w2.position.set(0, 4.6, 0.03); scene.add(w2);
    box(2.6, 0.06, 0.2, darkWood, 0, 4.17, 0.08); box(2.6, 0.05, 0.2, snowWhite, 0, 4.21, 0.09);
    // main roof
    const roof = new THREE.Group(); roof.position.set(0, 5.55, 0); roof.rotation.x = 0.42; scene.add(roof);
    box(8.4, 0.12, 1.6, roofMat, 0, 0, 0.6, roof); box(8.5, 0.24, 1.6, snowWhite, 0, 0.17, 0.58, roof);
    // lanterns (提灯)
    const lanTex = T.washiTexture({ base: '#f2dfb4', ribs: 12, text: '古書', textColor: '#a3241b', seed: 21 });
    for (const x of [-1.32, 1.32]) {
      const lg = new THREE.Group(); lg.position.set(x, 2.02, 0.55); scene.add(lg);
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshLambertMaterial({ map: lanTex, emissive: '#ffcf88', emissiveMap: lanTex, emissiveIntensity: 1.1 }));
      body.scale.set(0.17, 0.25, 0.17); lg.add(body);
      box(0.18, 0.04, 0.18, new THREE.MeshLambertMaterial({ color: '#111' }), 0, 0.25, 0, lg).geometry = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16);
      box(0.18, 0.04, 0.18, new THREE.MeshLambertMaterial({ color: '#111' }), 0, -0.25, 0, lg).geometry = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16);
      glow(glowWarm, 1.5, 0, 0, 0, 0.55, lg);
      W.updaters.push((t) => { lg.rotation.z = Math.sin(t * 0.9 + x) * 0.04; });
    }
    const doorLight = new THREE.PointLight('#ffc27a', 7, 14, 2); doorLight.position.set(0, 2.05, 0.95); scene.add(doorLight);
    // noren
    const nt = T.norenTexture();
    W.noren = [];
    for (let i = 0; i < 3; i++) {
      const tex = nt.clone(); tex.repeat.set(1 / 3, 1); tex.offset.set(i / 3, 0); tex.needsUpdate = true;
      const pivot = new THREE.Group(); pivot.position.set(-0.62 + i * 0.62, 2.28, 0.13); scene.add(pivot);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.78), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
      m.position.y = -0.39; pivot.add(m);
      m.userData.type = 'door'; W.interact.push(m);
      W.noren.push(pivot);
    }
    box(2.0, 0.035, 0.035, new THREE.MeshLambertMaterial({ color: '#8a6a40' }), 0, 2.29, 0.13);

    // neighbouring houses
    for (const side of [-1, 1]) {
      const cx = side * 8.2;
      const h = new THREE.Mesh(new THREE.BoxGeometry(8, 5.2, 10), [sidingMat, sidingMat, roofMat, roofMat, sidingMat, sidingMat]);
      h.position.set(cx, 2.6, -5.3); scene.add(h);
      const rf = new THREE.Group(); rf.position.set(cx, 5.2, -0.3); rf.rotation.x = 0.4; scene.add(rf);
      box(8.2, 0.1, 1.4, roofMat, 0, 0, 0.5, rf); box(8.3, 0.22, 1.4, snowWhite, 0, 0.14, 0.48, rf);
      const ev = new THREE.Group(); ev.position.set(cx, 2.55, -0.3); ev.rotation.x = 0.32; scene.add(ev);
      box(8.0, 0.07, 0.9, roofMat, 0, 0, 0.42, ev); box(8.0, 0.1, 0.86, snowWhite, 0, 0.1, 0.4, ev);
      for (let k = 0; k < 2; k++) {
        const lit = R() < 0.7;
        const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshBasicMaterial({ map: T.windowGlowTexture(side * 10 + k), color: lit ? '#c99a62' : '#2a2a35' }));
        wm.position.set(cx + (k ? 2 : -1.8) * side, 1.6, -0.28); scene.add(wm);
        const wm2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ map: T.windowGlowTexture(side * 20 + k), color: R() < 0.5 ? '#8f6c48' : '#25252e' }));
        wm2.position.set(cx + (k ? 2 : -1.8) * side, 4.0, -0.28); scene.add(wm2);
      }
    }
    // houses across the street
    for (let i = -3; i <= 3; i++) {
      const hh = 3.8 + R() * 1.8;
      const hb = new THREE.Mesh(new THREE.BoxGeometry(5.6, hh, 4), sidingMat);
      hb.position.set(i * 6, hh / 2, 17); scene.add(hb);
      box(5.9, 0.25, 4.4, snowWhite, i * 6, hh + 0.1, 17);
      if (R() < 0.7) {
        const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshBasicMaterial({ map: T.windowGlowTexture(i + 40), color: '#b98c58' }));
        wm.position.set(i * 6 + (R() - 0.5) * 2, 1.7, 14.98); wm.rotation.y = PI; scene.add(wm);
      }
    }
    // street lamp
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 8), new THREE.MeshLambertMaterial({ color: '#2a2a2e' }));
    pole.position.set(5.2, 2, 2.4); scene.add(pole);
    box(0.7, 0.05, 0.05, new THREE.MeshLambertMaterial({ color: '#2a2a2e' }), 4.9, 3.9, 2.4);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff4d8' }));
    bulb.position.set(4.6, 3.78, 2.4); scene.add(bulb);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.14, 16, 1, true), new THREE.MeshLambertMaterial({ color: '#30343a', side: THREE.DoubleSide }));
    shade.position.set(4.6, 3.88, 2.4); scene.add(shade);
    glow(glowWarm, 2.6, 4.6, 3.75, 2.4, 0.5);
    const lampLight = new THREE.PointLight('#ffe2b0', 9, 16, 2); lampLight.position.set(4.6, 3.6, 2.4); scene.add(lampLight);
  }

  /* ---------------- garden behind the round window ---------------- */
  {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), snowMat);
    g.rotation.x = -PI / 2; g.position.set(0, 0, -16); scene.add(g);
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), sidingMat); fence.position.set(0, 1.1, -18.5); scene.add(fence);
    box(10, 0.1, 0.2, snowWhite, 0, 2.22, -18.5);
    for (const x of [-5, 5]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.2), sidingMat); s.rotation.y = x < 0 ? PI / 2 : -PI / 2; s.position.set(x, 1.1, -16); scene.add(s); }
    // plum tree
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#2a1d16' });
    const blossoms = [];
    const grow = (p, dir, len, rad, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.7, rad, len, 6), trunkMat);
      c.position.copy(p).lerp(end, 0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); scene.add(c);
      if (dir.y > 0.2 && rad > 0.02) { const sn = new THREE.Mesh(new THREE.BoxGeometry(rad * 1.6, 0.03, len * 0.9), snowWhite); sn.position.copy(c.position).add(new THREE.Vector3(0, rad, 0)); sn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); scene.add(sn); }
      if (depth <= 0) { for (let i = 0; i < 6; i++) blossoms.push(end.clone().add(new THREE.Vector3((R() - 0.5) * 0.3, (R() - 0.5) * 0.2, (R() - 0.5) * 0.3))); return; }
      const n = 2 + (R() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const nd = dir.clone().add(new THREE.Vector3((R() - 0.5) * 1.4, (R() - 0.2) * 0.8, (R() - 0.5) * 1.0)).normalize();
        grow(end, nd, len * (0.62 + R() * 0.2), rad * 0.62, depth - 1);
        for (let k = 0; k < 2; k++) blossoms.push(p.clone().lerp(end, R()).add(new THREE.Vector3((R() - 0.5) * 0.12, 0.03, (R() - 0.5) * 0.12)));
      }
    };
    grow(new THREE.Vector3(-0.9, 0, -14.6), new THREE.Vector3(0.25, 1, 0.1).normalize(), 1.1, 0.11, 4);
    const bl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshLambertMaterial({ color: '#d2334a', emissive: '#5a0d18' }), blossoms.length);
    const mm = new THREE.Matrix4();
    blossoms.forEach((p, i) => { mm.makeTranslation(p.x, p.y, p.z); bl.setMatrixAt(i, mm); });
    scene.add(bl);
    // stone lantern (石灯笼)
    const stone = new THREE.MeshLambertMaterial({ color: '#7a7c80' });
    const tl = new THREE.Group(); tl.position.set(1.15, 0, -13.7); scene.add(tl);
    const add = (geo, y, mat = stone) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; tl.add(m); return m; };
    add(new THREE.CylinderGeometry(0.26, 0.3, 0.14, 6), 0.07);
    add(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8), 0.44);
    add(new THREE.CylinderGeometry(0.2, 0.16, 0.1, 6), 0.79);
    add(new THREE.BoxGeometry(0.24, 0.22, 0.24), 0.95);
    add(new THREE.BoxGeometry(0.14, 0.12, 0.25), 0.95, new THREE.MeshBasicMaterial({ color: '#ffcf80' }));
    add(new THREE.ConeGeometry(0.36, 0.22, 6), 1.17);
    add(new THREE.ConeGeometry(0.34, 0.12, 6), 1.25, snowWhite);
    add(new THREE.SphereGeometry(0.05, 8, 6), 1.33);
    glow(glowWarm, 0.9, 0, 0.95, 0.15, 0.55, tl);
  }

  /* ---------------- shelves & books ---------------- */
  const spineTex = [0, 1, 2, 3].map((v) => T.spineVariant(v, 5));
  const pagesTex = T.pagesTexture();
  const coverMatI = new THREE.MeshLambertMaterial({ color: '#d0d0d0' });
  const pagesMatI = new THREE.MeshLambertMaterial({ map: pagesTex });
  pagesMatI.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', ''); };
  pagesMatI.customProgramCacheKey = () => 'pages-no-instance-color';
  const spineMats = spineTex.map((t) => new THREE.MeshLambertMaterial({ map: t }));
  const buckets = [[], [], [], []];
  let seedCounter = 1;

  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3();

  function makeRec(world, sx, sy, sz) {
    const pos = new THREE.Vector3().setFromMatrixPosition(world);
    const normal = new THREE.Vector3().setFromMatrixColumn(world, 2).normalize();
    return { matrix: world.clone(), pos, normal, size: new THREE.Vector3(sx, sy, sz) };
  }

  function addBook(world, sx, sy, sz, colorHex) {
    const c = new THREE.Color(colorHex);
    c.offsetHSL((R() - 0.5) * 0.02, (R() - 0.5) * 0.12, (R() - 0.5) * 0.1);
    const v = Math.floor(R() * 4);
    const rec = makeRec(world, sx, sy, sz);
    rec.seed = seedCounter++;
    rec.color = '#' + c.getHexString();
    buckets[v].push({ world: world.clone(), color: c, rec });
    return rec;
  }

  const localToWorld = (group, cx, cy, cz, sx, sy, sz, rollZ = 0, yaw = 0) => {
    tmpE.set(0, yaw, rollZ); tmpQ.setFromEuler(tmpE);
    tmpM.compose(tmpP.set(cx, cy, cz), tmpQ, tmpS.set(sx, sy, sz));
    return new THREE.Matrix4().multiplyMatrices(group.matrixWorld, tmpM);
  };

  const pickColor = () => BOOK_COLORS[Math.floor(R() * BOOK_COLORS.length)];

  const featuredMeshes = [];
  function makeFeaturedMesh(fb, world, sx, sy, sz) {
    const coverTex = T.coverTexture(fb);
    const spine = T.featuredSpine(fb);
    const coverMat = new THREE.MeshLambertMaterial({ map: coverTex });
    const backMat = new THREE.MeshLambertMaterial({ color: fb.color });
    const pages = new THREE.MeshLambertMaterial({ map: pagesTex });
    const spineMat = new THREE.MeshLambertMaterial({ map: spine, emissive: '#ffffff', emissiveMap: spine, emissiveIntensity: 0.0 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [backMat, coverMat, pages, pages, spineMat, pages]);
    world.decompose(m.position, m.quaternion, m.scale);
    m.scale.set(sx, sy, sz);
    scene.add(m);
    const rec = makeRec(world, sx, sy, sz);
    rec.book = fb; rec.mesh = m; rec.index = -1; rec.color = fb.color; rec.featured = true;
    rec.spineMat = spineMat;
    m.userData = { type: 'book', rec };
    W.interact.push(m);
    W.featuredRecs.push(rec);
    featuredMeshes.push(m);
    return rec;
  }

  function popCard(group, fb, cx, y, front) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.094), new THREE.MeshLambertMaterial({ map: T.popCardTexture(fb.pop || fb.title), emissive: '#ffffff', emissiveIntensity: 0.15 }));
    m.material.emissiveMap = m.material.map;
    m.position.set(cx, y - 0.05, front + 0.006); m.rotation.x = -0.12;
    group.add(m);
  }

  function shelfUnit({ key, x, z, yaw, length, height, depth, rows }) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g);
    const parts = [];
    const t = 0.03;
    const addB = (w, h, d, px, py, pz) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(px, py, pz); parts.push(b); };
    addB(t, height, depth, -length / 2 + t / 2, height / 2, depth / 2);
    addB(t, height, depth, length / 2 - t / 2, height / 2, depth / 2);
    addB(length + 0.06, 0.06, depth + 0.05, 0, height + 0.03, depth / 2 + 0.01);
    addB(length, 0.1, depth, 0, 0.05, depth / 2);
    addB(length, height, 0.015, 0, height / 2, 0.0075);
    const nb = Math.max(1, Math.round(length / 0.95));
    const bw = length / nb;
    for (let i = 1; i < nb; i++) addB(0.025, height - 0.1, depth - 0.01, -length / 2 + i * bw, 0.05 + (height - 0.1) / 2, depth / 2);
    const rh = (height - 0.1) / rows;
    for (let r = 0; r < rows; r++) addB(length - 2 * t, 0.022, depth - 0.005, 0, 0.1 + r * rh + 0.011, depth / 2);
    const mesh = new THREE.Mesh(mergeGeometries(parts), shelfMat);
    g.add(mesh);
    mesh.userData.type = 'block';
    W.interact.push(mesh);
    g.updateMatrixWorld(true);
    for (let b = 0; b < nb; b++) for (let r = 0; r < rows; r++) {
      const slot = {
        key, bay: b, row: r, group: g,
        x0: -length / 2 + b * bw + (b === 0 ? t : 0.0125) + 0.004,
        x1: -length / 2 + (b + 1) * bw - (b === nb - 1 ? t : 0.0125) - 0.004,
        y: 0.1 + r * rh + 0.022, h: rh - 0.022 - 0.02, depth: depth - 0.015,
      };
      fillSlot(slot);
    }
    return g;
  }

  function fillSlot(slot) {
    const feats = FEATURED.filter((b) => b.place.at === slot.key && b.place.bay === slot.bay && b.place.row === slot.row);
    const span = slot.x1 - slot.x0;
    const featAt = feats.length ? slot.x0 + span * (0.35 + R() * 0.3) : Infinity;
    let fi = 0;
    let x = slot.x0;
    let guard = 0;
    while (guard++ < 200) {
      if (fi < feats.length && x >= featAt) {
        const fb = feats[fi++];
        const w = 0.046, h = Math.min(slot.h * 0.94, 0.29), d = Math.min(slot.depth, 0.21);
        if (x + w > slot.x1) break;
        const cz = slot.depth - d / 2 + 0.03;
        makeFeaturedMesh(fb, localToWorld(slot.group, x + w / 2, slot.y + h / 2, cz, 1, 1, 1), w, h, d);
        popCard(slot.group, fb, x + w / 2, slot.y - 0.022, slot.depth + 0.01);
        x += w + 0.004;
        continue;
      }
      const room = slot.x1 - x;
      if (R() < 0.03 && room > 0.3) {
        const L = 0.19 + R() * 0.06; const n = 2 + Math.floor(R() * 5); let yy = slot.y;
        for (let i = 0; i < n; i++) {
          const th = 0.022 + R() * 0.025, dd = Math.min(slot.depth, 0.13 + R() * 0.06);
          if (yy + th > slot.y + slot.h) break;
          const sx = L * (0.85 + R() * 0.15);
          addBook(localToWorld(slot.group, x + L / 2 + (R() - 0.5) * 0.015, yy + th / 2, slot.depth - dd / 2 - 0.01, 1, 1, 1, 0, (R() - 0.5) * 0.1).multiply(new THREE.Matrix4().makeScale(sx, th, dd)), sx, th, dd, pickColor());
          yy += th;
        }
        x += L + 0.012; continue;
      }
      if (R() < 0.03 && room > 0.15 && x > slot.x0 + 0.05) {
        const gap = 0.03 + R() * 0.05;
        const w = 0.022 + R() * 0.03, h = slot.h * (0.65 + R() * 0.3), d = Math.min(slot.depth, 0.12 + h * 0.4);
        const a = Math.asin(Math.min(0.5, (gap * 0.95) / h));
        const xr = x + gap + w;
        const cx = xr - (w / 2) * Math.cos(a) - (h / 2) * Math.sin(a);
        const cy = slot.y - (w / 2) * Math.sin(a) + (h / 2) * Math.cos(a);
        addBook(localToWorld(slot.group, cx, cy, slot.depth - d / 2 - 0.008, 1, 1, 1, a).multiply(new THREE.Matrix4().makeScale(w, h, d)), w, h, d, pickColor());
        x = xr + 0.002; continue;
      }
      const w = 0.02 + Math.pow(R(), 2) * 0.05;
      const h = slot.h * (0.6 + R() * 0.36);
      const d = Math.min(slot.depth, 0.11 + h * 0.4 + R() * 0.03);
      if (x + w > slot.x1) break;
      addBook(localToWorld(slot.group, x + w / 2, slot.y + h / 2, slot.depth - d / 2 - 0.004 - R() * 0.012, w, h, d), w, h, d, pickColor());
      x += w + (R() < 0.1 ? 0.003 : 0.0006);
    }
  }

  shelfUnit({ key: 'L1', x: -4, z: -3.6, yaw: PI / 2, length: 4.8, height: 2.7, depth: 0.38, rows: 7 });
  shelfUnit({ key: 'L2', x: -4, z: -8.6, yaw: PI / 2, length: 4.8, height: 2.7, depth: 0.38, rows: 7 });
  shelfUnit({ key: 'R1', x: 4, z: -3.6, yaw: -PI / 2, length: 4.8, height: 2.7, depth: 0.38, rows: 7 });
  shelfUnit({ key: 'R2', x: 4, z: -7.4, yaw: -PI / 2, length: 2.4, height: 2.7, depth: 0.38, rows: 7 });
  shelfUnit({ key: 'R3', x: 4, z: -10.3, yaw: -PI / 2, length: 2.6, height: 2.7, depth: 0.38, rows: 7 });
  shelfUnit({ key: 'B', x: -2.45, z: -12, yaw: 0, length: 2.5, height: 2.7, depth: 0.38, rows: 7 });
  shelfUnit({ key: 'B2', x: 2.5, z: -12, yaw: 0, length: 2.5, height: 2.7, depth: 0.38, rows: 7 });
  shelfUnit({ key: 'CL', x: -0.005, z: -5.5, yaw: -PI / 2, length: 4, height: 1.75, depth: 0.27, rows: 4 });
  shelfUnit({ key: 'CR', x: 0.005, z: -5.5, yaw: PI / 2, length: 4, height: 1.75, depth: 0.27, rows: 4 });
  W.obstacles.push({ x0: -0.32, x1: 0.32, z0: -7.55, z1: -3.45 });

  // display table (平台) near the entrance
  {
    const tg = new THREE.Group(); tg.position.set(0, 0, -2.3); scene.add(tg);
    const top = box(1.7, 0.06, 0.86, shelfMat, 0, 0.75, 0, tg);
    top.userData.type = 'block'; W.interact.push(top);
    for (const [x, z] of [[-0.78, -0.36], [0.78, -0.36], [-0.78, 0.36], [0.78, 0.36]]) box(0.06, 0.72, 0.06, darkWood, x, 0.36, z, tg);
    box(1.6, 0.04, 0.76, darkWood, 0, 0.18, 0, tg);
    tg.updateMatrixWorld(true);
    const tableFeat = FEATURED.filter((b) => b.place.at === 'table');
    const xs = [0, -0.52, 0.52];
    tableFeat.forEach((fb) => {
      const sx = xs[fb.place.slot];
      const w = 0.032, h = 0.27, d = 0.195;
      // stand
      const st = box(0.16, 0.2, 0.012, darkWood, sx, 0.78 + 0.1, -0.02, tg); st.rotation.x = -0.32;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.24, PI / 2, 0, 'XYZ'));
      const local = new THREE.Matrix4().compose(new THREE.Vector3(sx, 0.78 + h / 2 * Math.cos(0.24) + 0.005, 0.06), q, new THREE.Vector3(1, 1, 1));
      const world = new THREE.Matrix4().multiplyMatrices(tg.matrixWorld, local);
      makeFeaturedMesh(fb, world, w, h, d);
    });
    // stacks of books lying flat
    for (const [x, z] of [[-0.6, -0.26], [-0.2, -0.28], [0.24, -0.26], [0.62, -0.27], [-0.74, 0.22], [0.74, 0.22]]) {
      let yy = 0.78; const n = 2 + Math.floor(R() * 4);
      for (let i = 0; i < n; i++) {
        const th = 0.025 + R() * 0.03, L = 0.2 + R() * 0.06, dd = 0.14 + R() * 0.04;
        const local = new THREE.Matrix4().compose(new THREE.Vector3(x + (R() - 0.5) * 0.02, yy + th / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (R() - 0.5) * 0.25 + (x < 0 ? 0 : PI), 0)), new THREE.Vector3(L, th, dd));
        addBook(new THREE.Matrix4().multiplyMatrices(tg.matrixWorld, local), L, th, dd, pickColor());
        yy += th;
      }
    }
    W.obstacles.push({ x0: -0.88, x1: 0.88, z0: -2.76, z1: -1.84 });
  }

  // floor piles (積ん読)
  for (const [x, z, rot] of [[-3.45, -6.1, 0], [3.45, -6.1, PI], [-3.45, -1.0, 0], [3.45, -8.8, PI], [-1.0, -11.5, PI / 2]]) {
    let yy = 0; const n = 6 + Math.floor(R() * 8);
    for (let i = 0; i < n; i++) {
      const th = 0.03 + R() * 0.035, L = 0.2 + R() * 0.08, dd = 0.15 + R() * 0.05;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x + (R() - 0.5) * 0.03, yy + th / 2, z + (R() - 0.5) * 0.03), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot + PI / 2 + (R() - 0.5) * 0.3, 0)), new THREE.Vector3(L, th, dd));
      addBook(m, L, th, dd, pickColor());
      yy += th;
    }
  }

  // ladder
  {
    const lg = new THREE.Group(); lg.position.set(-3.28, 0, -7.4); lg.rotation.z = 0.13; scene.add(lg);
    const lm = new THREE.MeshLambertMaterial({ color: '#7a5634', map: shelfMat.map });
    box(0.045, 2.8, 0.05, lm, 0, 1.4, -0.22, lg); box(0.045, 2.8, 0.05, lm, 0, 1.4, 0.22, lg);
    for (let y = 0.3; y < 2.7; y += 0.32) box(0.035, 0.035, 0.44, lm, 0, y, 0, lg);
  }

  // counter (帳場)
  {
    const cg = new THREE.Group(); cg.position.set(3.0, 0, -9.95); scene.add(cg);
    const body = box(0.6, 0.8, 2.1, shelfMat, 0, 0.4, 0, cg); body.userData.type = 'block'; W.interact.push(body);
    const top = box(0.7, 0.04, 2.2, darkWood, 0, 0.82, 0, cg); top.userData.type = 'block'; W.interact.push(top);
    // desk lamp
    const lamp = new THREE.Group(); lamp.position.set(0.12, 0.84, -0.75); cg.add(lamp);
    const brass = new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.7, roughness: 0.35 });
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.025, 16), brass); lamp.add(lb);
    const ls = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8), brass); ls.position.y = 0.18; lamp.add(ls);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.12, 20, 1, true), new THREE.MeshLambertMaterial({ color: '#2f5b3e', side: THREE.DoubleSide, emissive: '#3a2a10' }));
    shade.position.y = 0.38; lamp.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff1c8' })); bulb.position.y = 0.35; lamp.add(bulb);
    const ll = new THREE.PointLight('#ffd9a0', 2.2, 5, 2); ll.position.set(3.12, 1.15, -10.7); scene.add(ll);
    // tea cup & tray
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.06, 16), new THREE.MeshStandardMaterial({ color: '#d9d2c2', roughness: 0.4 }));
    cup.position.set(-0.12, 0.87, -0.42); cg.add(cup);
    // a few books on the counter
    cg.updateMatrixWorld(true);
    let yy = 0.84;
    for (let i = 0; i < 4; i++) {
      const th = 0.03 + R() * 0.02, L = 0.22, dd = 0.16;
      const local = new THREE.Matrix4().compose(new THREE.Vector3(0.1, yy + th / 2, 0.75), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (R() - 0.5) * 0.3, 0)), new THREE.Vector3(L, th, dd));
      addBook(new THREE.Matrix4().multiplyMatrices(cg.matrixWorld, local), L, th, dd, pickColor());
      yy += th;
    }
    // 店主手记, lying flat with cover up
    const fb = FEATURED.find((b) => b.place.at === 'counter');
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.35, -PI / 2, 'YXZ'));
    const local = new THREE.Matrix4().compose(new THREE.Vector3(-0.1, 0.84 + 0.018, 0.05), q, new THREE.Vector3(1, 1, 1));
    makeFeaturedMesh(fb, new THREE.Matrix4().multiplyMatrices(cg.matrixWorld, local), 0.035, 0.25, 0.18);
    W.obstacles.push({ x0: 2.58, x1: 4, z0: -11.6, z1: -8.8 });

    // the cat — 墨丸
    const cat = new THREE.Group(); cat.position.set(3.0, 0.84, -9.35); cat.rotation.y = -0.6; scene.add(cat);
    const fur = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.8 });
    const bodyM = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), fur); bodyM.scale.set(0.2, 0.09, 0.14); bodyM.position.y = 0.08; cat.add(bodyM);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), fur); head.position.set(-0.17, 0.08, 0.05); head.scale.set(1, 0.9, 1); cat.add(head);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.05, 4), fur); earL.position.set(-0.19, 0.145, 0.02); earL.rotation.z = 0.3; cat.add(earL);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.05, 4), fur); earR.position.set(-0.17, 0.14, 0.09); earR.rotation.set(0.35, 0, 0.2); cat.add(earR);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 24, PI * 1.1), fur); tail.rotation.x = PI / 2; tail.position.set(0, 0.03, 0); tail.rotation.z = 0.9; cat.add(tail);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#d8c070' });
    for (const z of [0.025, 0.08]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.018), eyeMat); e.position.set(-0.232, 0.09, z); e.rotation.y = 0.2; cat.add(e); }
    cat.traverse((o) => { if (o.isMesh) { o.userData.type = 'cat'; W.interact.push(o); } });
    W.cat = { group: cat, body: bodyM, earL, earR, tail, wake: 0 };
  }

  // kerosene stove + kettle
  {
    const sg = new THREE.Group(); sg.position.set(1.6, 0, -10.6); scene.add(sg);
    const metal = new THREE.MeshStandardMaterial({ color: '#4b5a52', metalness: 0.5, roughness: 0.5 });
    const chrome = new THREE.MeshStandardMaterial({ color: '#b9b9b9', metalness: 0.9, roughness: 0.25 });
    const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; sg.add(m); return m; };
    add(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 24), metal, 0.05);
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 24), chrome, 0.26);
    const fire = add(new THREE.CylinderGeometry(0.172, 0.172, 0.1, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ff8a3a', side: THREE.DoubleSide }), 0.28);
    add(new THREE.CylinderGeometry(0.19, 0.17, 0.06, 24), metal, 0.45);
    const kettle = new THREE.Group(); kettle.position.y = 0.48; sg.add(kettle);
    const iron = new THREE.MeshStandardMaterial({ color: '#1e1c1a', metalness: 0.6, roughness: 0.6 });
    const kb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), iron); kb.scale.y = 0.75; kb.position.y = 0.09; kettle.add(kb);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.14, 8), iron); sp.position.set(0.14, 0.13, 0); sp.rotation.z = -0.9; kettle.add(sp);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 16, PI), iron); hd.position.y = 0.17; kettle.add(hd);
    const fireLight = new THREE.PointLight('#ff9a4a', 3.2, 6, 2); fireLight.position.set(1.6, 0.4, -10.3); scene.add(fireLight);
    const fg = glow(glowWarm, 0.8, 0, 0.28, 0.12, 0.5, sg);
    // steam
    const steamTex = T.flakeTexture();
    const puffs = [];
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
      s.userData.t = i / 10; sg.add(s); puffs.push(s);
    }
    W.updaters.push((t, dt) => {
      const f = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.08;
      fireLight.intensity = 3.2 * f; fg.material.opacity = 0.45 * f;
      fire.material.color.setHSL(0.06, 1, 0.55 + Math.sin(t * 9) * 0.04);
      for (const s of puffs) {
        s.userData.t = (s.userData.t + dt * 0.25) % 1;
        const k = s.userData.t;
        s.position.set(0.22 + k * 0.12 + Math.sin(t * 2 + k * 6) * 0.03, 0.66 + k * 0.55, Math.cos(t * 1.7 + k * 5) * 0.03);
        const sc = 0.05 + k * 0.22; s.scale.set(sc, sc, 1);
        s.material.opacity = Math.sin(k * PI) * 0.22;
      }
    });
    W.obstacles.push({ x0: 1.3, x1: 1.9, z0: -10.95, z1: -10.25 });
  }

  // hanging paper lanterns inside
  {
    const lt = T.washiTexture({ base: '#f6ead0', ribs: 14, seed: 33 });
    const capMat = new THREE.MeshLambertMaterial({ color: '#1a1410' });
    W.lanterns = [];
    for (const z of [-2.3, -5.5, -9.4]) {
      const y = z === -5.5 ? 2.55 : 2.45;
      const g = new THREE.Group(); g.position.set(0, 3.2, z); scene.add(g);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 3.2 - y - 0.3, 4), capMat); cord.position.y = -(3.2 - y - 0.3) / 2; g.add(cord);
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshLambertMaterial({ map: lt, emissive: '#ffd59a', emissiveMap: lt, emissiveIntensity: 1.25 }));
      body.scale.set(0.22, 0.3, 0.22); body.position.y = y - 3.2; g.add(body);
      const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), capMat); c1.position.y = y - 3.2 + 0.3; g.add(c1);
      const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), capMat); c2.position.y = y - 3.2 - 0.3; g.add(c2);
      glow(glowWarm, 1.8, 0, y - 3.2, 0, 0.32, g);
      const pl = new THREE.PointLight('#ffcf8f', 9, 14, 1.7); pl.position.set(0, y - 0.05, z); scene.add(pl);
      W.updaters.push((t) => { g.rotation.z = Math.sin(t * 0.6 + z) * 0.012; g.rotation.x = Math.cos(t * 0.5 + z) * 0.01; });
      W.lanterns.push(pl);
    }
  }

  // wall clock above the door (inside)
  {
    const [c, g] = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; return [cv, cv.getContext('2d')]; })();
    g.fillStyle = '#efe4c8'; g.beginPath(); g.arc(128, 128, 124, 0, PI * 2); g.fill();
    g.strokeStyle = '#3a2614'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#2a1d12'; g.font = `bold 26px ${T.SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const kanji = ['十二', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一'];
    kanji.forEach((k, i) => { const a = (i / 12) * PI * 2 - PI / 2; g.fillText(k, 128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const cg = new THREE.Group(); cg.position.set(0, 2.78, -0.04); cg.rotation.y = PI; scene.add(cg);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32), darkWood); rim.rotation.x = PI / 2; cg.add(rim);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32), new THREE.MeshLambertMaterial({ map: tex })); face.position.z = 0.027; cg.add(face);
    const handMat = new THREE.MeshBasicMaterial({ color: '#1a120a' });
    const hh = new THREE.Group(); hh.position.z = 0.03; cg.add(hh);
    const mh = new THREE.Group(); mh.position.z = 0.032; cg.add(mh);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.003), handMat); h1.position.y = 0.04; hh.add(h1);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.14, 0.003), handMat); h2.position.y = 0.065; mh.add(h2);
    W.updaters.push(() => {
      const d = new Date();
      const m = d.getMinutes() + d.getSeconds() / 60, h = (d.getHours() % 12) + m / 60;
      mh.rotation.z = -(m / 60) * PI * 2; hh.rotation.z = -(h / 12) * PI * 2;
    });
  }

  /* ---------------- instanced books ---------------- */
  W.bookMeshes = [];
  buckets.forEach((list, v) => {
    if (!list.length) return;
    const mats = [coverMatI, coverMatI, pagesMatI, pagesMatI, spineMats[v], pagesMatI];
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats, list.length);
    const recs = [];
    list.forEach((b, i) => {
      im.setMatrixAt(i, b.world); im.setColorAt(i, b.color);
      b.rec.mesh = im; b.rec.index = i; recs.push(b.rec);
    });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.userData = { type: 'books', recs };
    scene.add(im); W.interact.push(im); W.bookMeshes.push(im);
  });
  W.bookCount = seedCounter - 1 + W.featuredRecs.length;

  /* ---------------- snow ---------------- */
  const flake = T.flakeTexture();
  const mkSnow = (n, x0, x1, y0, y1, z0, z1, size) => {
    const pos = new Float32Array(n * 3), vel = new Float32Array(n), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 1] = y0 + Math.random() * (y1 - y0); pos[i * 3 + 2] = z0 + Math.random() * (z1 - z0);
      vel[i] = 0.35 + Math.random() * 0.5; ph[i] = Math.random() * 10;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: flake, size, transparent: true, depthWrite: false, opacity: 0.95, color: '#ffffff' }));
    p.frustumCulled = false;
    scene.add(p);
    W.updaters.push((t, dt) => {
      for (let i = 0; i < n; i++) {
        let y = pos[i * 3 + 1] - vel[i] * dt;
        pos[i * 3] += Math.sin(t * 0.8 + ph[i]) * 0.25 * dt + 0.08 * dt;
        if (y < y0) { y = y1; pos[i * 3] = x0 + Math.random() * (x1 - x0); }
        if (pos[i * 3] > x1) pos[i * 3] = x0;
        pos[i * 3 + 1] = y;
      }
      g.attributes.position.needsUpdate = true;
    });
  };
  mkSnow(2200, -16, 16, 0, 9, 0.25, 22, 0.07);
  mkSnow(380, -4.8, 4.8, 0, 4.5, -18.3, -12.3, 0.05);

  // noren sway
  W.norenLift = 0;
  W.updaters.push((t) => {
    W.noren.forEach((p, i) => {
      p.rotation.x = -(Math.sin(t * 1.1 + i) * 0.04 + 0.02) - W.norenLift * (i === 2 ? 1.25 : i === 1 ? 0.7 : 0.35);
    });
  });

  // cat breathing
  W.updaters.push((t, dt) => {
    const c = W.cat;
    const br = Math.sin(t * 1.6) * 0.5 + 0.5;
    c.body.scale.y = 0.09 + br * 0.006;
    c.wake = Math.max(0, c.wake - dt);
    const tw = c.wake > 0 ? Math.sin(t * 22) * 0.25 * Math.min(1, c.wake) : 0;
    c.earL.rotation.x = tw; c.earR.rotation.x = 0.35 - tw;
    c.tail.rotation.z = 0.9 + (c.wake > 0 ? Math.sin(t * 4) * 0.25 : Math.sin(t * 0.7) * 0.05);
  });

  W.update = (t, dt) => { for (const u of W.updaters) u(t, dt); };
  return W;
}

function branch(scene, p, depth, len, rad, R, spread) {
  const mat = new THREE.MeshLambertMaterial({ color: '#2a1d16' });
  const red = new THREE.MeshLambertMaterial({ color: '#c42c40', emissive: '#3a0610' });
  const go = (p0, dir, l, r, d) => {
    const end = p0.clone().addScaledVector(dir, l);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, l, 5), mat);
    c.position.copy(p0).lerp(end, 0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); scene.add(c);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), red);
      b.position.copy(p0).lerp(end, 0.3 + R() * 0.7).add(new THREE.Vector3((R() - 0.5) * 0.03, 0, (R() - 0.5) * 0.03)); scene.add(b);
    }
    if (d <= 0) return;
    for (let i = 0; i < 2; i++) {
      const nd = dir.clone().add(new THREE.Vector3((R() - 0.5) * spread * 2, 0.1, (R() - 0.5) * spread)).normalize();
      go(end, nd, l * 0.7, r * 0.7, d - 1);
    }
  };
  go(p, new THREE.Vector3(0.15, 1, 0).normalize(), len, rad, depth);
}
