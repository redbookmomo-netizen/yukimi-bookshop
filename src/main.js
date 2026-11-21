import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Reader } from './reader.js';
import * as A from './audio.js';
import { makeFillerBook, FEATURED } from './books.js';

const $ = (s) => document.querySelector(s);
const PI = Math.PI;
const EYE = 1.55;
const REACH = 2.15;
const RADIUS = 0.28;
const isTouch = matchMedia('(pointer: coarse)').matches;

const canvas = $('#c');
// ?aa=0 / ?pr=1 let slow devices (or video capture) trade quality for speed
const QS = new URLSearchParams(location.search);
const NORENDER = QS.has('norender'); // logic-only runs for scripted captures
const REC = QS.has('rec');
if (REC) {
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}#tourBtn,#btnTour{display:none!important}';
  document.head.appendChild(st);
}
const renderer = new THREE.WebGLRenderer({ canvas, antialias: QS.get('aa') !== '0', preserveDrawingBuffer: REC, powerPreference: 'high-performance' });
renderer.setPixelRatio(QS.has('pr') ? clampPR(+QS.get('pr')) : Math.min(window.devicePixelRatio || 1, 2.5));
function clampPR(v) { return Number.isFinite(v) && v > 0 ? Math.min(v, 3) : 1; }
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.03, 220);
camera.rotation.order = 'YXZ';

const S = {
  phase: 'loading',
  pos: new THREE.Vector3(0, 1.6, 6.4),
  yaw: 0, pitch: 0.06, vyaw: 0, vpitch: 0,
  inside: 0,
  walk: null, turn: null,
  reading: false,
  keys: {}, hold: 0,
  bob: 0, stepAcc: 0,
};
let W = null;
let reader = null;
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let lastT = performance.now();
let time = 0;

/* ---------------- helpers ---------------- */
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => t.classList.remove('show'), ms);
}

function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 74 : w / h < 1.2 ? 68 : 60;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', fitCamera);

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (b - a) % (PI * 2); if (d > PI) d -= PI * 2; if (d < -PI) d += PI * 2; return d; };

/* ---------------- collision & paths ---------------- */
function blocked(x, z, r = RADIUS) {
  const b = W.bounds;
  if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return true;
  for (const o of W.obstacles) if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return true;
  return false;
}

function findFree(x, z) {
  if (!blocked(x, z)) return new THREE.Vector2(x, z);
  for (let r = 0.1; r < 3; r += 0.1) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * PI * 2;
      const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
      if (!blocked(nx, nz)) return new THREE.Vector2(nx, nz);
    }
  }
  return new THREE.Vector2(S.pos.x, S.pos.z);
}

function lineClear(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.ceil(d / 0.07);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (blocked(lerp(a.x, b.x, t), lerp(a.y, b.y, t), RADIUS - 0.02)) return false;
  }
  return true;
}

function findPath(start, goal) {
  if (lineClear(start, goal)) return [goal];
  const C = 0.2, b = W.bounds;
  const nx = Math.ceil((b.x1 - b.x0) / C) + 1, nz = Math.ceil((b.z1 - b.z0) / C) + 1;
  const cx = (x) => clamp(Math.round((x - b.x0) / C), 0, nx - 1), cz = (z) => clamp(Math.round((z - b.z0) / C), 0, nz - 1);
  const wx = (i) => b.x0 + i * C, wz = (j) => b.z0 + j * C;
  const free = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) free[i + j * nx] = blocked(wx(i), wz(j)) ? 0 : 1;
  const si = cx(start.x), sj = cz(start.y), gi = cx(goal.x), gj = cz(goal.y);
  const N = nx * nz, g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open = [si + sj * nx]; g[open[0]] = 0;
  const h = (id) => Math.hypot((id % nx) - gi, Math.floor(id / nx) - gj);
  const goalId = gi + gj * nx;
  let found = false, guard = 0;
  while (open.length && guard++ < 20000) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (g[open[k]] + h(open[k]) < g[open[bi]] + h(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === goalId) { found = true; break; }
    closed[cur] = 1;
    const ci = cur % nx, cj = Math.floor(cur / nx);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
      const id = ni + nj * nx;
      if (closed[id] || (!free[id] && id !== goalId)) continue;
      const ng = g[cur] + (di && dj ? 1.414 : 1);
      if (ng < g[id]) { g[id] = ng; came[id] = cur; if (!open.includes(id)) open.push(id); }
    }
  }
  if (!found) return [goal];
  const pts = [];
  for (let id = goalId; id !== -1 && id !== si + sj * nx; id = came[id]) pts.unshift(new THREE.Vector2(wx(id % nx), wz(Math.floor(id / nx))));
  pts[pts.length - 1] = goal.clone();
  // string pulling
  const out = [];
  let from = start.clone(), k = 0;
  while (k < pts.length) {
    let far = k;
    for (let m = pts.length - 1; m > k; m--) if (lineClear(from, pts[m])) { far = m; break; }
    out.push(pts[far]); from = pts[far]; k = far + 1;
  }
  return out;
}

/* ---------------- walking ---------------- */
const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 40), new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -PI / 2;

function walkTo(x, z, look = null) {
  const goal = findFree(x, z);
  const path = findPath(new THREE.Vector2(S.pos.x, S.pos.z), goal);
  S.walk = { path, i: 0, look, speed: 0 };
  S.turn = null;
  marker.position.set(goal.x, 0.01, goal.y);
  marker.material.opacity = 0.9;
  marker.scale.setScalar(1);
}

function faceDirOf(rec) {
  if (rec.book && rec.book.place.at === 'table') return new THREE.Vector3(0, 0, 1);
  if (rec.book && rec.book.place.at === 'counter') return new THREE.Vector3(-1, 0, 0);
  const n = rec.normal.clone(); n.y = 0;
  if (n.lengthSq() < 0.01) n.set(0, 0, 1);
  return n.normalize();
}

function walkToRec(rec) {
  const n = faceDirOf(rec);
  const tx = rec.pos.x + n.x * 0.95, tz = rec.pos.z + n.z * 0.95;
  walkTo(tx, tz, rec.pos.clone());
}

function lookAtPoint(p, dur = 0.7) {
  const dx = p.x - S.pos.x, dz = p.z - S.pos.z, dy = p.y - EYE;
  const yaw = Math.atan2(-dx, -dz);
  const pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -1.1, 1.1);
  S.turn = { y0: S.yaw, y1: S.yaw + angDiff(S.yaw, yaw), p0: S.pitch, p1: pitch, t: 0, dur };
}

function stepSound() {
  if (S.pos.z > 0.1) A.snowStep(); else A.footstep();
}

function updateWalk(dt) {
  // keyboard / hold-buttons
  let f = 0, s = 0;
  if (S.keys.KeyW || S.keys.ArrowUp) f += 1;
  if (S.keys.KeyS || S.keys.ArrowDown) f -= 1;
  if (S.keys.KeyA) s -= 1;
  if (S.keys.KeyD) s += 1;
  if (S.keys.ArrowLeft) S.yaw += 1.8 * dt;
  if (S.keys.ArrowRight) S.yaw -= 1.8 * dt;
  f += S.hold;
  let moved = 0;
  if (f || s) {
    S.walk = null;
    const sp = 1.7 * dt;
    const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
    const dx = (fx * f + -fz * s) * sp, dz = (fz * f + fx * s) * sp;
    const ox = S.pos.x, oz = S.pos.z;
    if (!blocked(S.pos.x + dx, S.pos.z)) S.pos.x += dx;
    if (!blocked(S.pos.x, S.pos.z + dz)) S.pos.z += dz;
    moved = Math.hypot(S.pos.x - ox, S.pos.z - oz);
  } else if (S.walk) {
    const w = S.walk;
    const tgt = w.path[w.i];
    const dx = tgt.x - S.pos.x, dz = tgt.y - S.pos.z;
    const d = Math.hypot(dx, dz);
    const remaining = d + w.path.slice(w.i + 1).reduce((acc, p, k, arr) => acc + (k === 0 ? p.distanceTo(tgt) : p.distanceTo(arr[k - 1])), 0);
    w.speed = Math.min(1.75, w.speed + dt * 3.5, 0.35 + remaining * 1.6);
    const st = Math.min(d, w.speed * dt);
    if (d > 1e-4) { S.pos.x += (dx / d) * st; S.pos.z += (dz / d) * st; }
    moved = st;
    // gently face the way we walk, or the book we walk to
    if (w.look) {
      const ly = Math.atan2(-(w.look.x - S.pos.x), -(w.look.z - S.pos.z));
      if (remaining < 1.6) S.yaw += angDiff(S.yaw, ly) * Math.min(1, dt * 3);
      else if (d > 0.3) S.yaw += angDiff(S.yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 2.2);
    } else if (remaining > 1.2 && d > 0.3) {
      S.yaw += angDiff(S.yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 1.6);
    }
    if (d < 0.02) {
      w.i++;
      if (w.i >= w.path.length) {
        if (w.look) lookAtPoint(w.look, 0.6);
        S.walk = null;
        if (w.onArrive) w.onArrive();
        else if (w.look) toast(w.arriveMsg || '就在眼前了，轻点它翻开', 1800);
      }
    }
  }
  if (moved) {
    S.stepAcc += moved; S.bob += moved * 5.5;
    if (S.stepAcc > 0.62) { S.stepAcc = 0; stepSound(); }
  }
  if (S.turn) {
    const t = S.turn; t.t += dt / t.dur;
    const k = ease(Math.min(1, t.t));
    S.yaw = lerp(t.y0, t.y1, k); S.pitch = lerp(t.p0, t.p1, k);
    if (t.t >= 1) S.turn = null;
  }
  marker.material.opacity = Math.max(0, marker.material.opacity - dt * (S.walk ? 0.4 : 2));
  marker.scale.setScalar(1 + (0.9 - marker.material.opacity) * 0.6);
}

/* ---------------- door & entering ---------------- */
let enterT = -1;
const enterCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.6, 6.4),
  new THREE.Vector3(0.25, 1.6, 3.4),
  new THREE.Vector3(0.44, 1.58, 1.2),
  new THREE.Vector3(0.44, 1.56, -0.1),
  new THREE.Vector3(0.38, EYE, -0.85),
]);

function enterShop() {
  if (S.phase !== 'outside') return;
  A.initAudio();
  S.phase = 'entering';
  enterT = 0;
  $('#intro').classList.add('hide');
  S.enterYaw0 = S.yaw; S.enterPitch0 = S.pitch;
  A.doorSlide(1.0);
  setTimeout(() => A.chime(3), 380);
}

function updateEntering(dt) {
  enterT += dt;
  const t = enterT;
  // door
  const dk = clamp(t / 1.0, 0, 1);
  const closeK = clamp((t - 3.9) / 1.0, 0, 1);
  const open = ease(dk) * (1 - ease(closeK));
  W.door.right.position.x = lerp(W.door.closedX, W.door.openX, open);
  if (t - dt < 3.9 && t >= 3.9) { A.doorSlide(0.9); setTimeout(() => A.chime(1), 700); }
  // camera
  const ck = clamp((t - 0.45) / 3.1, 0, 1);
  const p = enterCurve.getPoint(ease(ck));
  const prevZ = S.pos.z;
  S.pos.copy(p);
  S.stepAcc += Math.abs(prevZ - p.z);
  if (S.stepAcc > 0.62 && ck > 0 && ck < 1) { S.stepAcc = 0; stepSound(); }
  S.yaw = lerp(S.enterYaw0, 0, ease(clamp(t / 1.2, 0, 1)));
  S.pitch = lerp(S.enterPitch0, -0.12, ease(clamp((t - 2.2) / 1.6, 0, 1)));
  // noren lift as we pass
  W.norenLift = Math.max(0, 1 - Math.abs(p.z - 0.25) / 0.9) * 1.3;
  S.inside = clamp((1.2 - p.z) / 2.0, 0, 1);
  A.setAmbience(S.inside);
  if (t > 4.9) {
    S.phase = 'inside';
    W.norenLift = 0;
    $('#hud').classList.add('show');
    toast('欢迎光临 · 雪見堂', 2200);
    setTimeout(() => {
      $('#tips').classList.add('show');
      setTimeout(() => $('#tips').classList.remove('show'), 7000);
    }, 2300);
  }
}

/* ---------------- leaving ---------------- */
let leaveT = -1;
const DOOR_SPOT = new THREE.Vector2(0.38, -0.85);
const leaveCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.38, EYE, -0.85),
  new THREE.Vector3(0.44, 1.56, -0.1),
  new THREE.Vector3(0.44, 1.58, 1.2),
  new THREE.Vector3(0.22, 1.6, 3.6),
  new THREE.Vector3(0, 1.6, 6.4),
]);

function leaveShop() {
  if (S.phase !== 'inside' || S.reading) return;
  S.turn = null;
  if (Math.hypot(S.pos.x - DOOR_SPOT.x, S.pos.z - DOOR_SPOT.y) > 0.12) {
    walkTo(DOOR_SPOT.x, DOOR_SPOT.y);
    S.walk.onArrive = leaveShop;
    toast('往门口走……', 1200);
    return;
  }
  A.initAudio();
  S.walk = null;
  S.phase = 'leaving';
  leaveT = 0;
  S.leaveYaw0 = S.yaw; S.leavePitch0 = S.pitch;
  $('#hud').classList.remove('show');
  $('#tips').classList.remove('show');
  A.doorSlide(1.0);
  setTimeout(() => A.chime(2), 380);
  toast('谢谢光临 · 雪夜路滑，慢走', 2800);
}

function updateLeaving(dt) {
  leaveT += dt;
  const t = leaveT;
  // door: open, then close behind us
  const open = ease(clamp(t / 1.0, 0, 1)) * (1 - ease(clamp((t - 3.1) / 1.0, 0, 1)));
  W.door.right.position.x = lerp(W.door.closedX, W.door.openX, open);
  if (t - dt < 3.1 && t >= 3.1) { A.doorSlide(0.9); setTimeout(() => A.chime(1), 700); }
  // walk out
  const ck = clamp((t - 0.55) / 4.0, 0, 1);
  const p = leaveCurve.getPoint(ease(ck));
  const prev = S.pos.clone();
  S.pos.copy(p);
  S.stepAcc += prev.distanceTo(p);
  if (S.stepAcc > 0.62 && ck > 0 && ck < 1) { S.stepAcc = 0; stepSound(); }
  // face the street, then turn around to look back at the shop
  const yOut = S.leaveYaw0 + angDiff(S.leaveYaw0, PI);
  const yawA = lerp(S.leaveYaw0, yOut, ease(clamp(t / 1.1, 0, 1)));
  S.yaw = lerp(yawA, yOut + PI, ease(clamp((t - 3.5) / 2.2, 0, 1)));
  S.pitch = lerp(S.leavePitch0, 0.02, ease(clamp(t / 1.2, 0, 1)));
  S.pitch = lerp(S.pitch, 0.06, ease(clamp((t - 3.5) / 2.2, 0, 1)));
  W.norenLift = Math.max(0, 1 - Math.abs(p.z - 0.25) / 0.9) * 1.3;
  S.inside = clamp((1.2 - p.z) / 2.0, 0, 1);
  A.setAmbience(S.inside);
  if (t > 6.0) {
    S.phase = 'outside';
    S.yaw = angDiff(0, S.yaw); S.vyaw = S.vpitch = 0;
    W.norenLift = 0;
    $('#enterBtn').textContent = '再次推门';
    $('#intro').classList.remove('hide');
    $('#intro').classList.add('show');
  }
}

/* ---------------- atmosphere ---------------- */
const fogOut = new THREE.Color('#1b2440'), fogIn = new THREE.Color('#2a1c12');
const hemiOut = new THREE.Color('#8fa3d0'), hemiIn = new THREE.Color('#d0a77c');
function updateAtmos() {
  const k = S.inside;
  if (W.gardenGroup) W.gardenGroup.visible = k > 0.02;
  if (W.frontSnow) W.frontSnow.visible = S.pos.z > -0.35 || Math.cos(S.yaw) < 0.42;
  if (W.lights.lampLight) W.lights.lampLight.visible = k < 0.96 || Math.cos(S.yaw) < 0.2;
  W.scene.fog.color.copy(fogOut).lerp(fogIn, k);
  W.scene.fog.near = lerp(9, 7, k); W.scene.fog.far = lerp(55, 38, k);
  W.lights.hemi.color.copy(hemiOut).lerp(hemiIn, k);
  W.lights.hemi.intensity = lerp(0.6, 0.42, k);
  W.lights.moonLight.intensity = lerp(0.95, 0.22, k);
  renderer.toneMappingExposure = lerp(1.25, 1.15, k);
}

/* ---------------- picking ---------------- */
function pick(x, y) {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  ray.far = 40;
  const hits = ray.intersectObjects(W.interact, false);
  for (const h of hits) {
    const ud = h.object.userData || {};
    if (ud.type === 'books') {
      const rec = ud.recs[h.instanceId];
      if (rec && !rec.hidden) return { kind: 'book', rec, hit: h };
      continue;
    }
    if (ud.type === 'book') return { kind: 'book', rec: ud.rec, hit: h };
    if (ud.type) return { kind: ud.type, hit: h };
    return { kind: 'block', hit: h };
  }
  return null;
}

function onTap(x, y) {
  if (S.phase === 'outside') {
    const p = pick(x, y);
    if (p && (p.kind === 'door')) enterShop();
    else { toast('轻触店门，推门而入', 1600); $('#enterBtn').classList.add('pulse'); }
    return;
  }
  if (S.phase !== 'inside' || S.reading) return;
  const p = pick(x, y);
  if (!p) return;
  if (p.kind === 'book') {
    const d = camera.position.distanceTo(p.rec.pos);
    if (d <= REACH) openBook(p.rec);
    else { walkToRec(p.rec); toast('走过去看看……', 1200); }
    return;
  }
  if (p.kind === 'door') { leaveShop(); return; }
  if (p.kind === 'cat') {
    const d = camera.position.distanceTo(p.hit.point);
    if (d < 2.6) {
      petStroke(x, y, 1);
      toast(['墨丸打着呼噜，眯起一只眼看了看你', '墨丸把尾巴绕得更紧了一点', '墨丸：喵。（继续睡）'][Math.floor(Math.random() * 3)]);
    } else { walkTo(2.2, -9.4, p.hit.point.clone()); S.walk.arriveMsg = '墨丸就在眼前，用手指在它背上摸一摸'; }
    return;
  }
  if (p.kind === 'floor') { walkTo(p.hit.point.x, p.hit.point.z); return; }
  // walls / shelves / table: walk to a spot in front of it
  const n = p.hit.face ? p.hit.face.normal.clone().transformDirection(p.hit.object.matrixWorld) : new THREE.Vector3();
  n.y = 0; if (n.lengthSq() < 0.01) n.set(camera.position.x - p.hit.point.x, 0, camera.position.z - p.hit.point.z);
  n.normalize();
  const d = Math.hypot(p.hit.point.x - S.pos.x, p.hit.point.z - S.pos.z);
  if (d > 1.2) walkTo(p.hit.point.x + n.x * 0.9, p.hit.point.z + n.z * 0.9, p.hit.point.y > 0.3 ? p.hit.point.clone() : null);
}

/* ---------------- hover (desktop) ---------------- */
const hl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffcf7a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
hl.visible = false;
let hoverAt = 0;
function hover(x, y) {
  if (S.phase !== 'inside' || S.reading) { hl.visible = false; return; }
  const p = pick(x, y);
  if (p && p.kind === 'book') {
    const near = camera.position.distanceTo(p.rec.pos) <= REACH;
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    p.rec.matrix.decompose(pos, q, sc);
    hl.position.copy(pos); hl.quaternion.copy(q);
    hl.scale.copy(p.rec.size).multiplyScalar(1.06).addScalar(0.004);
    hl.material.opacity = near ? 0.28 : 0.1;
    hl.visible = true;
    canvas.style.cursor = near ? 'pointer' : 'zoom-in';
  } else {
    hl.visible = false;
    canvas.style.cursor = p && p.kind === 'floor' ? 'crosshair' : p && p.kind === 'cat' ? 'pointer' : 'grab';
  }
}

/* ---------------- opening books ---------------- */
let flyer = null;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function hideRec(rec, hide) {
  rec.hidden = hide;
  if (rec.featured) { rec.mesh.visible = !hide; return; }
  rec.mesh.setMatrixAt(rec.index, hide ? ZERO : rec.matrix);
  rec.mesh.instanceMatrix.needsUpdate = true;
}

function openBook(rec) {
  if (S.reading) return;
  S.reading = true; S.walk = null;
  hl.visible = false;
  A.bookOpen();
  const book = rec.book || (rec.data ||= makeFillerBook(rec.seed, rec.color));
  // flying book
  let mats;
  if (rec.featured) mats = rec.mesh.material;
  else {
    const c = new THREE.MeshLambertMaterial({ color: rec.color });
    const pg = new THREE.MeshLambertMaterial({ color: '#efe3c4' });
    mats = [c, c, pg, pg, c, pg];
  }
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats);
  const p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(), s0 = new THREE.Vector3();
  rec.matrix.decompose(p0, q0, s0);
  s0.copy(rec.size);
  m.position.copy(p0); m.quaternion.copy(q0); m.scale.copy(s0);
  W.scene.add(m);
  hideRec(rec, true);
  flyer = { m, rec, p0, q0, s0, t: 0, dir: 1, done: false };
  setTimeout(() => {
    reader.open(book, () => closeBook());
    $('#hud').classList.add('dim');
  }, 430);
}

function flyerTarget() {
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const p = camera.position.clone().addScaledVector(fwd, 0.42).addScaledVector(up, -0.01);
  const q = camera.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI / 2));
  return { p, q, s: new THREE.Vector3(0.035, 0.26, 0.19) };
}

function updateFlyer(dt) {
  if (!flyer) return;
  flyer.t = clamp(flyer.t + (dt / 0.5) * flyer.dir, 0, 1);
  const k = ease(flyer.t);
  const T = flyerTarget();
  flyer.m.position.lerpVectors(flyer.p0, T.p, k);
  flyer.m.position.y += Math.sin(k * PI) * 0.08;
  flyer.m.quaternion.slerpQuaternions(flyer.q0, T.q, k);
  flyer.m.scale.lerpVectors(flyer.s0, T.s, k);
  if (flyer.dir < 0 && flyer.t <= 0) {
    hideRec(flyer.rec, false);
    W.scene.remove(flyer.m);
    flyer.m.geometry.dispose();
    flyer = null;
    S.reading = false;
  }
}

function closeBook() {
  $('#hud').classList.remove('dim');
  if (flyer) flyer.dir = -1;
  else S.reading = false;
}

/* ---------------- proximity labels ---------------- */
const tagPool = [];
function updateTags() {
  const box = $('#tags');
  if (S.phase !== 'inside' || S.reading) { tagPool.forEach((t) => (t.style.opacity = 0)); return; }
  const cands = [];
  for (const rec of W.featuredRecs) {
    if (rec.hidden) continue;
    const d = camera.position.distanceTo(rec.pos);
    if (d > 3.4) continue;
    const top = rec.pos.clone(); top.y += (rec.book.place.at === 'counter' ? 0.06 : rec.size.y / 2 + 0.03);
    const v = top.clone().project(camera);
    if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) continue;
    // must be facing us a little
    const toCam = camera.position.clone().sub(rec.pos).normalize();
    if (faceDirOf(rec).dot(toCam) < -0.1) continue;
    cands.push({ rec, d, v });
  }
  cands.sort((a, b) => a.d - b.d);
  for (let i = 0; i < 4; i++) {
    let t = tagPool[i];
    if (!t) { t = document.createElement('div'); t.className = 'tag'; box.appendChild(t); tagPool.push(t); }
    const c = cands[i];
    if (!c) { t.style.opacity = 0; continue; }
    const near = c.d <= REACH;
    const txt = `《${c.rec.book.title}》${near ? '<em>轻点翻开</em>' : ''}`;
    if (t.dataset.txt !== txt) { t.innerHTML = txt; t.dataset.txt = txt; }
    t.style.opacity = 1;
    t.classList.toggle('near', near);
    t.style.transform = `translate(${((c.v.x + 1) / 2) * window.innerWidth}px, ${((1 - c.v.y) / 2) * window.innerHeight}px) translate(-50%, -100%)`;
  }
  for (const rec of W.featuredRecs) {
    const d = camera.position.distanceTo(rec.pos);
    rec.spineMat.emissiveIntensity = d <= REACH ? 0.12 + Math.sin(time * 3) * 0.06 : 0;
  }
}

/* ---------------- petting the cat ---------------- */
let purrUntil = 0;
function petStroke(x, y, amount) {
  const c = W.cat;
  c.pet = Math.min(1.6, c.pet + 0.5 * amount);
  c.wake = Math.max(c.wake, 1.2);
  if (time > purrUntil) { A.purr(); purrUntil = time + 2.0; }
  const fx = $('#fx');
  const el = document.createElement('div');
  const isText = Math.random() < 0.3;
  el.className = isText ? 'heart purr' : 'heart';
  el.textContent = isText ? ['呼噜', '咕噜噜', '喵～'][Math.floor(Math.random() * 3)] : '♥';
  el.style.left = `${x + (Math.random() - 0.5) * 30}px`;
  el.style.top = `${y - 10}px`;
  el.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`);
  fx.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

/* ---------------- input ---------------- */
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  if (S.touring && !REC) stopTour(true);
  if (down) return;
  down = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), drag: false, pet: false, petAcc: 0, strokes: 0 };
  S.vyaw = S.vpitch = 0;
  if (S.phase === 'inside' && !S.reading) {
    const p = pick(e.clientX, e.clientY);
    if (p && p.kind === 'cat' && camera.position.distanceTo(p.hit.point) < 2.6) down.pet = true;
  }
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (down && e.pointerId === down.id) {
    const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
    down.lx = e.clientX; down.ly = e.clientY;
    if (!down.drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) { down.drag = true; canvas.style.cursor = down.pet ? 'pointer' : 'grabbing'; }
    if (down.pet) {
      down.petAcc += Math.hypot(dx, dy);
      if (down.petAcc > 38) { down.petAcc = 0; down.strokes++; petStroke(e.clientX, e.clientY, 0.6); }
      return;
    }
    if (down.drag && !S.reading && S.phase !== 'entering' && S.phase !== 'loading') {
      const k = (isTouch ? 0.0052 : 0.0042) * (camera.fov / 65);
      S.yaw += dx * k; S.pitch += dy * k;
      // fling velocity from real elapsed time, so it doesn't depend on the pointer event rate
      const now = performance.now(), dtm = Math.max(8, now - (down.lt || now - 16)) / 1000;
      down.lt = now;
      S.vyaw = lerp(S.vyaw, (dx * k) / dtm, 0.6); S.vpitch = lerp(S.vpitch, (dy * k) / dtm, 0.6);
      S.turn = null;
    }
  } else if (!isTouch) {
    const now = performance.now();
    if (now - hoverAt > 50) { hoverAt = now; hover(e.clientX, e.clientY); }
  }
});
const endPointer = (e) => {
  if (!down || e.pointerId !== down.id) return;
  const wasTap = !down.drag && performance.now() - down.t < 650;
  const petted = down.pet && down.strokes > 0;
  if (performance.now() - (down.lt || 0) > 80) { S.vyaw = 0; S.vpitch = 0; }
  down = null;
  canvas.style.cursor = '';
  if (petted) toast(['墨丸舒服得把下巴抬了起来', '墨丸的呼噜声像一只小小的暖炉', '墨丸伸了个懒腰，又往你手心里蹭了蹭'][Math.floor(Math.random() * 3)], 2400);
  else if (wasTap) { S.vyaw = S.vpitch = 0; onTap(e.clientX, e.clientY); }
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', (e) => { if (down && e.pointerId === down.id) down = null; });
canvas.addEventListener('wheel', (e) => {
  if (S.phase !== 'inside' || S.reading) return;
  e.preventDefault();
  const st = clamp(-e.deltaY * 0.004, -0.5, 0.5);
  const dx = -Math.sin(S.yaw) * st, dz = -Math.cos(S.yaw) * st;
  S.walk = null;
  if (!blocked(S.pos.x + dx, S.pos.z)) S.pos.x += dx;
  if (!blocked(S.pos.x, S.pos.z + dz)) S.pos.z += dz;
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (S.reading) return;
  S.keys[e.code] = true;
  if (S.phase === 'outside' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp')) enterShop();
});
window.addEventListener('keyup', (e) => { S.keys[e.code] = false; });
window.addEventListener('blur', () => { S.keys = {}; S.hold = 0; });

for (const [id, v] of [['#mvF', 1], ['#mvB', -1]]) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); S.hold = v; A.initAudio(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { S.hold = 0; });
}

$('#enterBtn').addEventListener('click', enterShop);
$('#tourBtn').addEventListener('click', () => startTour());
$('#btnTour').addEventListener('click', () => { if (S.touring) stopTour(true); else startTour(); });
$('#btnSound').addEventListener('click', () => {
  A.initAudio();
  A.setEnabled(!A.isEnabled());
  $('#btnSound').classList.toggle('off', !A.isEnabled());
  toast(A.isEnabled() ? '声音：开' : '声音：关', 1000);
});
$('#btnHelp').addEventListener('click', () => $('#help').classList.add('show'));
$('#help').addEventListener('click', () => $('#help').classList.remove('show'));
$('#btnGuide').addEventListener('click', () => $('#guide').classList.add('show'));
$('#guide .g-close').addEventListener('click', () => $('#guide').classList.remove('show'));
$('#guide').addEventListener('click', (e) => { if (e.target.id === 'guide') $('#guide').classList.remove('show'); });

const PLACE = { L1: '左手书架', L2: '左手里侧书架', R1: '右手书架', R2: '右手里侧书架', B: '里墙书架', CL: '中央书架 · 左面', CR: '中央书架 · 右面', table: '进门的平台', counter: '柜台上' };
function buildGuide() {
  const ul = $('#guide ul');
  ul.innerHTML = '';
  for (const fb of FEATURED) {
    const li = document.createElement('li');
    li.innerHTML = `<i style="background:${fb.color}"></i><b>《${fb.title}》</b><span>${fb.author}</span><em>${PLACE[fb.place.at] || ''}</em>`;
    li.addEventListener('click', () => {
      $('#guide').classList.remove('show');
      const rec = W.featuredRecs.find((r) => r.book === fb);
      if (rec) { walkToRec(rec); toast(`带你去找《${fb.title}》`, 1500); }
    });
    ul.appendChild(li);
  }
}

/* ---------------- loop ---------------- */
function frame() {
  const nowT = performance.now();
  const dt = Math.min(0.05, (nowT - lastT) / 1000);
  lastT = nowT;
  time += dt;
  if (S.phase === 'outside') {
    if (S.turn) {
      const t = S.turn; t.t += dt / t.dur;
      const k = ease(Math.min(1, t.t));
      S.yaw = lerp(t.y0, t.y1, k); S.pitch = lerp(t.p0, t.p1, k);
      if (t.t >= 1) S.turn = null;
    } else if (!down) {
      S.yaw += S.vyaw * dt; S.pitch += S.vpitch * dt;
      S.vyaw *= Math.pow(0.02, dt); S.vpitch *= Math.pow(0.02, dt);
    }
    S.yaw = clamp(S.yaw, -0.95, 0.95); S.pitch = clamp(S.pitch, -0.35, 0.65);
    S.pos.set(Math.sin(time * 0.3) * 0.03, 1.6 + Math.sin(time * 0.6) * 0.01, 6.4);
  } else if (S.phase === 'entering') {
    updateEntering(dt);
  } else if (S.phase === 'leaving') {
    updateLeaving(dt);
  } else if (S.phase === 'inside') {
    if (!down && !S.reading) {
      S.yaw += S.vyaw * dt; S.pitch += S.vpitch * dt;
      S.vyaw *= Math.pow(0.015, dt); S.vpitch *= Math.pow(0.015, dt);
    }
    S.pitch = clamp(S.pitch, -1.2, 1.2);
    if (!S.reading) updateWalk(dt);
  }
  camera.position.set(S.pos.x, S.pos.y + (S.phase === 'inside' ? Math.sin(S.bob) * 0.012 : 0), S.pos.z);
  camera.rotation.set(S.pitch, S.yaw, 0);
  camera.updateMatrixWorld();
  if (W) {
    W.update(time, dt);
    updateAtmos();
    updateFlyer(dt);
    updateTags();
    A.tick(dt, S.inside);
    const staticRead = REC && S.reading && reader && reader.isOpen && (!flyer || flyer.t >= 1) && !window.__forceRender;
    if (!NORENDER && !staticRead && !window.__skipRender) renderer.render(W.scene, camera); else W.scene.updateMatrixWorld();
  }
  requestAnimationFrame(frame);
}

/* ---------------- built-in 60fps auto-tour ---------------- */
let tourGen = 0;
function stopTour(msg = false) {
  if (!S.touring) return;
  tourGen++;
  S.touring = false;
  $('#btnTour')?.classList.remove('active');
  if (msg) toast('已切换为自由漫步', 1500);
}

async function startTour() {
  const my = ++tourGen;
  S.touring = true;
  A.initAudio();
  const wait = (s) => new Promise((res) => setTimeout(res, s * 1000));
  const ok = () => my === tourGen;
  const waitCond = (fn, max = 18) => new Promise((res) => {
    const t0 = performance.now();
    const ck = () => { if (!ok() || fn() || (performance.now() - t0) / 1000 > max) res(); else setTimeout(ck, 60); };
    ck();
  });
  const pan = (dyaw, dpitch, dur) => new Promise((res) => {
    S.turn = { y0: S.yaw, y1: S.yaw + dyaw, p0: S.pitch, p1: clamp(S.pitch + dpitch, -1.0, 0.8), t: 0, dur };
    setTimeout(res, dur * 1000 + 60);
  });
  const readRec = async (rec, flips = 2, gap = 1.65) => {
    if (!ok() || !rec) return;
    lookAtPoint(rec.pos, 0.75); await wait(0.8);
    if (!ok()) return;
    if (camera.position.distanceTo(rec.pos) > REACH) {
      walkToRec(rec); toast('走过去看看……', 1200);
      await waitCond(() => !S.walk && !S.turn);
      await wait(0.35);
    }
    if (!ok()) return;
    openBook(rec);
    await waitCond(() => reader.isOpen, 4);
    await wait(1.3);
    for (let i = 0; i < flips && ok(); i++) { reader.next(); await wait(gap); }
    if (!ok()) return;
    reader.close();
    await waitCond(() => !S.reading, 4);
    await wait(0.35);
  };

  $('#tourBtn')?.blur();
  if (S.reading) { reader.close(); await waitCond(() => !S.reading, 3); }
  if (S.phase === 'outside') {
    await wait(0.6); if (!ok()) return;
    await pan(-0.26, 0.02, 1.05); if (!ok()) return;
    await pan(0.26, -0.02, 0.95); if (!ok()) return;
    await wait(0.25); if (!ok()) return;
    enterShop();
    await waitCond(() => S.phase === 'inside', 10);
  }
  if (!ok()) return;
  // 1. 环顾四周
  await wait(0.4);
  await pan(1.05, 0.06, 1.4); if (!ok()) return; await wait(0.45);
  await pan(-2.1, -0.04, 2.2); if (!ok()) return; await wait(0.45);
  await pan(1.05, -0.06, 1.3); if (!ok()) return;
  // 2. 桌上的书《去买手套》
  await readRec(W.featuredRecs.find((r) => r.book.id === 'tebukuro'), 3, 1.7);
  // 3. 左墙《雪女》+ 随机普通旧书
  await readRec(W.featuredRecs.find((r) => r.book.id === 'yukionna'), 2, 1.6);
  const filler = W.bookMeshes.flatMap((bm) => bm.userData.recs).find((r) => !r.hidden && !r.featured && r.pos.x < -3.5 && Math.abs(r.pos.z + 4.3) < 0.65 && r.pos.y > 1.18 && r.pos.y < 1.52);
  if (filler) await readRec(filler, 2, 1.55);
  // 4. 里墙丸窗与暖炉
  const hojoki = W.featuredRecs.find((r) => r.book.id === 'hojoki');
  if (hojoki && ok()) { walkToRec(hojoki); await waitCond(() => !S.walk && !S.turn); await wait(0.35); }
  if (!ok()) return;
  lookAtPoint(new THREE.Vector3(0.3, 1.45, -11.8), 1.0); await wait(1.5);
  // 5. 柜台撸猫
  if (!ok()) return;
  const catPt = W.cat.body.getWorldPosition(new THREE.Vector3());
  lookAtPoint(catPt, 0.9); await wait(0.95);
  walkTo(2.2, -9.4, catPt); await waitCond(() => !S.walk && !S.turn);
  if (!ok()) return;
  lookAtPoint(catPt, 0.65); await wait(0.75);
  for (let i = 0; i < 6 && ok(); i++) {
    const v = catPt.clone().project(camera);
    const sx = ((v.x + 1) / 2) * window.innerWidth + (i % 2 ? 16 : -16);
    const sy = ((1 - v.y) / 2) * window.innerHeight;
    petStroke(sx, sy, 0.85);
    if (i === 1) toast('墨丸舒服得把下巴抬了起来', 2400);
    await wait(0.55);
  }
  await wait(1.0);
  // 6. 右侧书架《我是猫》
  await readRec(W.featuredRecs.find((r) => r.book.id === 'neko'), 2, 1.6);
  // 7. 沿右走廊绕回前门并走出书店
  if (!ok()) return;
  walkTo(2.05, -3.1, new THREE.Vector3(0.2, 1.3, 0));
  await waitCond(() => !S.walk && !S.turn);
  await wait(0.4);
  if (!ok()) return;
  leaveShop();
  await waitCond(() => S.phase === 'outside', 18);
  S.touring = false;
}

/* ---------------- boot ---------------- */
function boot() {
  fitCamera();
  W = buildWorld();
  W.scene.fog = new THREE.Fog('#1b2440', 9, 55);
  W.scene.add(marker, hl);
  reader = new Reader($('#reader'));
  buildGuide();
  $('#bookCount').textContent = W.bookCount.toLocaleString('en-US');
  camera.position.copy(S.pos);
  camera.rotation.set(S.pitch, S.yaw, 0);
  renderer.compile(W.scene, camera);
  if (!isTouch) $('#moveBtns').style.display = 'none';
  requestAnimationFrame(() => {
    S.phase = 'outside';
    $('#loading').classList.add('hide');
    $('#intro').classList.add('show');
  });
  // debug / screenshot hooks
  window.__shop = { S, W: () => W, A, enterShop, leaveShop, openBook, walkTo, walkToRec, pick, camera, reader, skipIn() { S.phase = 'inside'; S.inside = 1; S.pos.set(0.38, EYE, -0.85); S.yaw = 0; S.pitch = -0.12; W.norenLift = 0; $('#intro').classList.add('hide'); $('#hud').classList.add('show'); } };
}

requestAnimationFrame(frame);
setTimeout(boot, 60);
