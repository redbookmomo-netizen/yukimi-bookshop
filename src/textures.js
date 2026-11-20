import * as THREE from 'three';

export const SERIF =
  '"Hiragino Mincho ProN","Songti SC","STSong","Noto Serif CJK SC","Noto Serif CJK JP","Source Han Serif SC","Yu Mincho",serif';

export function rng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function noise(g, w, h, amt, seed = 7) {
  const r = rng(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

/* ---------- wood ---------- */
export function woodTexture({ w = 512, h = 512, base = '#6b4a2e', planks = 4, seed = 1, repeat = [1, 1], seams = true, grainAlpha = 0.32 } = {}) {
  const [c, g] = mk(w, h);
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const ph = h / planks;
  for (let p = 0; p < planks; p++) {
    const y0 = p * ph;
    g.save();
    g.beginPath(); g.rect(0, y0, w, ph); g.clip();
    const v = r();
    g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.04 + r() * 0.14})` : `rgba(255,225,180,${0.03 + r() * 0.08})`;
    g.fillRect(0, y0, w, ph);
    for (let i = 0; i < 46; i++) {
      const yy = y0 + r() * ph;
      const amp = 1 + r() * 4, fr = 0.004 + r() * 0.02, ph2 = r() * 10;
      g.strokeStyle = `rgba(30,16,6,${grainAlpha * (0.25 + r() * 0.75)})`;
      g.lineWidth = 0.5 + r() * 1.6;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = yy + Math.sin(x * fr + ph2) * amp + Math.sin(x * fr * 3.1 + ph2) * amp * 0.3;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    if (r() < 0.45) {
      const kx = r() * w, ky = y0 + ph * (0.3 + r() * 0.4);
      for (let k = 0; k < 6; k++) {
        g.strokeStyle = `rgba(35,18,8,${0.35 - k * 0.04})`;
        g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(kx, ky, 4 + k * 5, 2 + k * 2.2, 0, 0, Math.PI * 2); g.stroke();
      }
    }
    g.restore();
    if (seams) {
      g.fillStyle = 'rgba(15,8,3,0.65)';
      g.fillRect(0, y0, w, 2);
      const sx = r() * w;
      g.fillRect(sx, y0, 2, ph);
    }
  }
  noise(g, w, h, 14, seed + 3);
  return toTex(c, { repeat });
}

/* ---------- plaster (土壁) ---------- */
export function plasterTexture({ base = '#d6c6a4', seed = 11, repeat = [1, 1] } = {}) {
  const w = 512, h = 512;
  const [c, g] = mk(w, h);
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    const x = r() * w, y = r() * h, rad = 20 + r() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const a = 0.03 + r() * 0.05;
    gr.addColorStop(0, r() < 0.5 ? `rgba(90,60,30,${a})` : `rgba(255,245,220,${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 520; i++) {
    const x = r() * w, y = r() * h, l = 3 + r() * 9, a = r() * Math.PI;
    g.strokeStyle = r() < 0.6 ? `rgba(150,110,50,${0.25 + r() * 0.3})` : `rgba(80,55,30,${0.2 + r() * 0.2})`;
    g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  noise(g, w, h, 22, seed);
  return toTex(c, { repeat });
}

export function stoneTexture({ seed = 5, repeat = [1, 1] } = {}) {
  const w = 256, h = 256;
  const [c, g] = mk(w, h);
  g.fillStyle = '#6d6a64'; g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '20,20,20' : '230,225,215'},${r() * 0.18})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
  noise(g, w, h, 30, seed);
  return toTex(c, { repeat });
}

export function snowTexture({ seed = 3, repeat = [1, 1] } = {}) {
  const w = 512, h = 512;
  const [c, g] = mk(w, h);
  g.fillStyle = '#e9eef6'; g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 60; i++) {
    const x = r() * w, y = r() * h, rad = 30 + r() * 120;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(150,170,205,${0.05 + r() * 0.08})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.9})`;
    g.fillRect(r() * w, r() * h, 1, 1);
  }
  noise(g, w, h, 10, seed);
  return toTex(c, { repeat });
}

/* ---------- washi / lantern paper ---------- */
export function washiTexture({ base = '#f3e6c8', ribs = 0, text = '', textColor = '#a3241b', seed = 9 } = {}) {
  const w = 512, h = 256;
  const [c, g] = mk(w, h);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 400; i++) {
    g.strokeStyle = `rgba(160,120,60,${0.06 + r() * 0.12})`;
    g.lineWidth = 0.6;
    const x = r() * w, y = r() * h;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + r() * 10, y + r() * 10, x + r() * 20 - 10, y + r() * 20 - 10); g.stroke();
  }
  if (ribs) {
    for (let i = 1; i < ribs; i++) {
      const y = (i / ribs) * h;
      g.fillStyle = 'rgba(110,70,30,0.22)';
      g.fillRect(0, y - 1, w, 2);
    }
  }
  if (text) {
    g.fillStyle = textColor;
    g.font = `bold 92px ${SERIF}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // two copies around the sphere
    const chars = [...text];
    for (const cx of [w * 0.25, w * 0.75]) {
      chars.forEach((ch, i) => {
        g.fillText(ch, cx, h / 2 + (i - (chars.length - 1) / 2) * 92);
      });
    }
  }
  return toTex(c);
}

/* ---------- spine variants (grayscale, tinted by instance colour) ---------- */
export function spineVariant(v, seed = 1) {
  const w = 64, h = 256;
  const [c, g] = mk(w, h);
  const r = rng(seed * 31 + v);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
  // rounded spine shading
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.35)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.12)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.05)');
  gr.addColorStop(1, 'rgba(0,0,0,0.4)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const marks = (x0, y0, x1, y1, col) => {
    g.fillStyle = col;
    let y = y0;
    while (y < y1) {
      const sz = 5 + r() * 3;
      g.fillRect(x0 + (x1 - x0) / 2 - sz / 2, y, sz, sz * (0.6 + r() * 0.5));
      y += sz + 3;
      if (r() < 0.12) y += 8;
    }
  };
  if (v === 0) {
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillRect(0, 14, w, 3); g.fillRect(0, 21, w, 1.5);
    g.fillRect(0, h - 17, w, 3); g.fillRect(0, h - 22, w, 1.5);
    marks(20, 40, 44, 150, 'rgba(255,250,235,0.8)');
  } else if (v === 1) {
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.fillRect(12, 22, 40, 120);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.strokeRect(14, 24, 36, 116);
    marks(16, 32, 48, 132, 'rgba(25,20,15,0.75)');
  } else if (v === 2) {
    for (let i = 0; i < 4; i++) {
      const y = 20 + i * 58;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y + 3, w, 4);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, y, w, 3);
    }
    g.fillStyle = 'rgba(20,10,5,0.55)'; g.fillRect(8, 82, 48, 40);
    marks(18, 86, 46, 118, 'rgba(255,240,200,0.85)');
  } else {
    for (let y = 0; y < h; y += 3) {
      g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; g.fillRect(0, y, w, 1);
    }
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillRect(0, h * 0.72, w, 26);
    marks(22, 30, 42, 120, 'rgba(255,255,255,0.7)');
  }
  noise(g, w, h, 18, seed + v);
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function pagesTexture() {
  const w = 64, h = 64;
  const [c, g] = mk(w, h);
  g.fillStyle = '#c9b996'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    g.fillStyle = `rgba(110,80,45,${0.12 + Math.random() * 0.14})`;
    g.fillRect(0, y, w, 1);
  }
  return toTex(c);
}

/* ---------- vertical text helper ---------- */
function vtext(g, text, cx, y0, size, gap = 1.08) {
  const chars = [...text];
  g.textAlign = 'center'; g.textBaseline = 'middle';
  chars.forEach((ch, i) => {
    const y = y0 + i * size * gap + size / 2;
    if ('「」『』（）()—…ー'.includes(ch)) {
      g.save(); g.translate(cx, y); g.rotate(Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
    } else g.fillText(ch, cx, y);
  });
  return chars.length * size * gap;
}

export function featuredSpine(book) {
  const w = 128, h = 576;
  const [c, g] = mk(w, h);
  g.fillStyle = book.color; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(0, y, w, 1);
  }
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.45)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.12)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.03)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const ink = book.ink || '#e7c77a';
  g.fillStyle = ink;
  g.fillRect(0, 26, w, 5); g.fillRect(0, 38, w, 2);
  g.fillRect(0, h - 31, w, 5); g.fillRect(0, h - 40, w, 2);
  const title = book.spineTitle || book.title;
  const n = [...title].length;
  const size = Math.min(56, 360 / n);
  if (book.slip) {
    const sh = n * size * 1.1 + 30;
    g.fillStyle = '#efe6cf'; g.fillRect(22, 62, w - 44, sh);
    g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 2; g.strokeRect(26, 66, w - 52, sh - 8);
    g.fillStyle = '#231a12';
  }
  g.font = `bold ${size}px ${SERIF}`;
  vtext(g, title, w / 2, 76, size, 1.1);
  g.fillStyle = book.slip ? ink : ink;
  g.font = `${22}px ${SERIF}`;
  vtext(g, book.authorShort || '', w / 2, h - 190, 22, 1.15);
  // shop mark
  g.strokeStyle = ink; g.lineWidth = 2;
  g.beginPath(); g.arc(w / 2, h - 70, 14, 0, Math.PI * 2); g.stroke();
  g.font = `bold 16px ${SERIF}`; g.fillText('雪', w / 2, h - 69);
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function coverTexture(book) {
  const w = 360, h = 512;
  const [c, g] = mk(w, h);
  g.fillStyle = book.color; g.fillRect(0, 0, w, h);
  // cloth weave
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`; g.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(x, 0, 1, h); }
  // pattern
  g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1.5;
  for (let y = 0; y < h + 30; y += 26) for (let x = (y / 26) % 2 ? 13 : 0; x < w + 30; x += 26) {
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(x, y, k * 5, Math.PI, 0); g.stroke(); }
  }
  // binding stitches (和装本) on the right edge
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(w - 30, 0, 30, h);
  g.fillStyle = 'rgba(240,230,210,0.85)';
  [0.12, 0.37, 0.63, 0.88].forEach((p) => { g.fillRect(w - 20, h * p - 2, 20, 4); g.beginPath(); g.arc(w - 18, h * p, 3, 0, 7); g.fill(); });
  // title slip
  const title = book.title;
  const n = [...title].length;
  const size = Math.min(40, 330 / n);
  const sh = n * size * 1.1 + 34;
  g.fillStyle = '#f1e8d2'; g.fillRect(24, 26, 70, sh);
  g.strokeStyle = 'rgba(80,50,20,0.55)'; g.lineWidth = 2; g.strokeRect(29, 31, 60, sh - 10);
  g.fillStyle = '#1f1610'; g.font = `bold ${size}px ${SERIF}`;
  vtext(g, title, 59, 42, size, 1.1);
  g.fillStyle = book.ink || '#e7c77a';
  g.font = `20px ${SERIF}`;
  vtext(g, book.author || '', 120, 44, 20, 1.15);
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------- signage ---------- */
export function signboardTexture() {
  const w = 1024, h = 256;
  const [c, g] = mk(w, h);
  const wood = woodTexture({ w: 1024, h: 256, base: '#3b2416', planks: 1, seams: false, seed: 42 }).image;
  g.drawImage(wood, 0, 0);
  g.strokeStyle = '#1b0f08'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  g.strokeStyle = 'rgba(214,176,98,0.6)'; g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold 150px ${SERIF}`;
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText('雪 見 堂', w / 2 + 4, h / 2 + 6);
  g.fillStyle = '#ead7a6'; g.fillText('雪 見 堂', w / 2, h / 2 + 2);
  g.font = `bold 40px ${SERIF}`;
  g.fillStyle = '#ead7a6';
  vtext(g, '古書', 90, 70, 46);
  vtext(g, '買取', w - 90, 70, 46);
  return toTex(c);
}

export function norenTexture() {
  const w = 768, h = 384;
  const [c, g] = mk(w, h);
  g.fillStyle = '#1d2f4f'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(120,150,200,${Math.random() * 0.05})`; g.fillRect(x, 0, 1, h); }
  // 雪輪 emblem
  const cx = w / 2, cy = h * 0.42, R = 92;
  g.strokeStyle = '#efe9dc'; g.lineWidth = 10;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2, a1 = ((i + 1) / 6) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    g.arc(cx + Math.cos(am) * R * 0.86, cy + Math.sin(am) * R * 0.86, R * 0.5, am - 1.05, am + 1.05);
  }
  g.stroke();
  g.fillStyle = '#efe9dc'; g.font = `bold 92px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('本', cx, cy + 4);
  g.font = `bold 56px ${SERIF}`;
  g.fillText('古 書  雪 見 堂', cx, h * 0.84);
  return toTex(c);
}

export function popCardTexture(text) {
  const w = 160, h = 200;
  const [c, g] = mk(w, h);
  g.fillStyle = '#f6edd6'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b5332a'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#b5332a'; g.font = `bold 30px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('店主推荐', w / 2, 36);
  g.fillStyle = '#2a2018'; g.font = `22px ${SERIF}`;
  const chars = [...text];
  const perLine = 6;
  for (let i = 0; i * perLine < chars.length && i < 4; i++) {
    g.fillText(chars.slice(i * perLine, (i + 1) * perLine).join(''), w / 2, 82 + i * 30);
  }
  g.strokeStyle = 'rgba(181,51,42,0.6)'; g.lineWidth = 2;
  g.beginPath(); g.arc(w - 34, h - 34, 16, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#b5332a'; g.font = `bold 18px ${SERIF}`; g.fillText('雪', w - 34, h - 33);
  return toTex(c);
}

export function skyTexture() {
  const [c, g] = mk(16, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#02040b');
  gr.addColorStop(0.35, '#08122a');
  gr.addColorStop(0.5, '#1b2747');
  gr.addColorStop(0.56, '#2a3352');
  gr.addColorStop(1, '#0d1222');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function glowTexture(inner = 'rgba(255,220,160,1)', mid = 'rgba(255,170,90,0.35)') {
  const [c, g] = mk(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.25, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function flakeTexture() {
  const [c, g] = mk(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function windowGlowTexture(seed = 1) {
  const [c, g] = mk(128, 128);
  const r = rng(seed);
  g.fillStyle = r() < 0.5 ? '#f1c27a' : '#e8a95e'; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 80, 10, 64, 64, 100);
  gr.addColorStop(0, 'rgba(255,240,200,0.6)'); gr.addColorStop(1, 'rgba(90,40,10,0.6)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#2a1a0e';
  for (let i = 0; i <= 4; i++) g.fillRect(i * 31, 0, 4, 128);
  for (let i = 0; i <= 3; i++) g.fillRect(0, i * 41, 128, 4);
  if (r() < 0.5) { g.fillStyle = 'rgba(40,20,10,0.5)'; g.beginPath(); g.ellipse(40 + r() * 50, 90, 14, 30, 0, 0, 7); g.fill(); }
  return toTex(c);
}
