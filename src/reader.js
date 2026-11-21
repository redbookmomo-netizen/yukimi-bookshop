import { illustration, snowflakeSVG } from './illust.js';
import * as A from './audio.js';

const REF_PW = 360;          // 排版基准页宽（px），显示时按比例缩放
const ASPECT = 0.68;         // 页宽 / 页高
const PUNCT = '，。、；：！？」』）”’…—·,.!?;:)';
const FLIP_MS = 820;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Reader {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector('.stage');
    this.ind = root.querySelector('.r-ind');
    this.hint = root.querySelector('.r-hint');
    this.cache = new Map();
    this.isOpen = false;
    this.cur = 0;
    this.leaves = [];
    this.timers = [];
    this.hintShown = false;

    // measurer for pagination
    this.measure = document.createElement('div');
    this.measure.className = 'measure';
    this.measure.innerHTML = `<div class="book-sizer" style="--pw:${REF_PW}px"><div class="face paper"><div class="pg"><div class="pg-head">x</div><div class="pg-body"></div><div class="pg-num">1</div></div></div></div>`;
    document.body.appendChild(this.measure);
    this.mBody = this.measure.querySelector('.pg-body');

    root.querySelector('.r-close').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    let sx = 0, sy = 0, st = 0;
    this.stage.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); });
    this.stage.addEventListener('pointerup', (e) => {
      if (!this.isOpen) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && performance.now() - st < 700) {
        dx < 0 ? this.next() : this.prev();
        return;
      }
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
      const r = this.bookEl.getBoundingClientRect();
      let split;
      if (this.mode === 'double') {
        split = r.left + r.width / 2;
        if (this.cur === 0) split = r.left + r.width * 0.5 - this.pw * 0.25; // closed: most of the cover means "open"
      } else split = r.left + r.width * 0.33;
      e.clientX >= split ? this.next() : this.prev();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this.next(); }
      else if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'Escape') this.close();
    });
    window.addEventListener('resize', () => { if (this.isOpen) this.relayout(); });
  }

  /* ---------------- content → faces ---------------- */
  paginateProse(heading, text) {
    const body = this.mBody;
    const paras = text.split('\n').map((s) => s.trim()).filter(Boolean);
    const pages = [];
    let first = true;
    const start = () => {
      body.innerHTML = '';
      if (first && heading) body.insertAdjacentHTML('beforeend', `<h3>${esc(heading)}</h3>`);
      first = false;
    };
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    start();
    for (const para of paras) {
      let txt = para, cont = false, guard = 0;
      while (txt && guard++ < 50) {
        const p = document.createElement('p');
        if (cont) p.className = 'cont';
        p.textContent = txt;
        body.appendChild(p);
        if (fits()) break;
        let lo = 0, hi = txt.length;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          p.textContent = txt.slice(0, mid);
          if (fits()) lo = mid; else hi = mid - 1;
        }
        let k = lo;
        while (k > 1 && k < txt.length && PUNCT.includes(txt[k])) k--;
        const alone = body.children.length === 1 || (body.children.length === 2 && body.firstChild.tagName === 'H3');
        if (k < 6 && !alone) {
          body.removeChild(p);
        } else {
          k = Math.max(k, 1);
          p.textContent = txt.slice(0, k);
          txt = txt.slice(k);
          cont = true;
        }
        pages.push(body.innerHTML);
        start();
      }
    }
    if (body.textContent.trim()) pages.push(body.innerHTML);
    return pages;
  }

  vpoem(pg) {
    const n = pg.lines.length;
    const maxLen = Math.max(...pg.lines.map((l) => [...l].length));
    let size = pg.prose ? 4.0 : Math.min(5.6, 72 / (n * 1.95), 104 / maxLen);
    const title = pg.title ? `<div class="vp-title">${esc(pg.title)}</div>` : '';
    const au = pg.author ? `<div class="vp-author">${esc(pg.author)}</div>` : '';
    const art = pg.art ? `<div class="vp-art">${illustration(pg.art)}</div>` : '';
    return `${art}<div class="vpoem vert ${pg.prose ? 'prose' : ''}" style="--fs:${size.toFixed(2)}">${title}${au}<div class="vp-lines">${pg.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div></div>`;
  }

  buildContent(book) {
    if (this.cache.has(book.id)) return this.cache.get(book.id);
    const pages = []; // {html, cls, head}
    for (const pg of book.pages) {
      switch (pg.type) {
        case 'prose':
          this.paginateProse(pg.heading, pg.text).forEach((h) => pages.push({ html: h }));
          break;
        case 'entry':
          this.paginateProse(pg.head, pg.text).forEach((h) => pages.push({ html: `<div class="entry">${h}</div>` }));
          break;
        case 'vpoem':
          pages.push({ html: this.vpoem(pg), cls: 'vpage' });
          break;
        case 'haiku':
          pages.push({ cls: 'vpage', html: `<div class="haiku vert">${pg.items.map((it) => `<div class="hk"><p class="hk-zh">${esc(it.zh)}</p><p class="hk-jp">${esc(it.jp)}</p><p class="hk-au">${esc(it.au)}</p></div>`).join('')}</div>` });
          break;
        case 'tanka':
          pages.push({ cls: 'vpage', html: `<div class="tanka vert">${pg.items.map((it) => `<div class="tk">${it.zh.map((l, i) => `<p class="tk-zh" style="padding-inline-start:${i * 1.2}em">${esc(l)}</p>`).join('')}<p class="tk-jp">${esc(it.jp)}</p></div>`).join('')}</div>` });
          break;
        case 'illust':
          pages.push({ cls: 'illpage', html: `<div class="illwrap">${illustration(pg.art)}<div class="cap">${esc(pg.caption || '')}</div></div>` });
          break;
        case 'flake':
          pages.push({ cls: 'illpage', html: `<div class="illwrap flakewrap">${snowflakeSVG(pg.seed, pg.kind)}<h4>${esc(pg.name)}</h4><p class="flake-t">${esc(pg.text)}</p></div>` });
          break;
        case 'sign':
          pages.push({ html: `<div class="signoff"><div class="vert sig">${esc(pg.text)}</div><div class="seal big">雪見<br>堂印</div></div>` });
          break;
        case 'found':
          pages.push({ cls: 'foundpage', html: foundHTML(pg) });
          break;
        default:
          break;
      }
    }
    this.cache.set(book.id, pages);
    return pages;
  }

  buildFaces(book) {
    const content = this.buildContent(book);
    const faces = [];
    faces.push({ cls: 'cover', html: coverHTML(book) });
    faces.push({ cls: 'endpaper', html: endpaperHTML(book, true) });
    faces.push({ cls: 'paper', html: titleHTML(book) });
    content.forEach((p, i) => faces.push({ cls: 'paper ' + (p.cls || ''), html: pageWrap(book, p.html, i + 1) }));
    faces.push({ cls: 'paper', html: colophonHTML(book) });
    // keep the back cover on the back side of the last leaf in two-page mode
    if ((faces.length + 2) % 2 === 1) faces.push({ cls: 'paper', html: '<div class="blank-mark">雪</div>' });
    faces.push({ cls: 'endpaper', html: endpaperHTML(book, false) });
    faces.push({ cls: 'cover back', html: backCoverHTML(book) });
    return faces;
  }

  /* ---------------- layout ---------------- */
  computeSize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const mode = vw / vh > 1.1 && vw >= 680 ? 'double' : 'single';
    const availW = vw - (mode === 'double' ? 80 : 28);
    const availH = vh - 130;
    const pw = mode === 'double' ? Math.min(availW / 2, availH * ASPECT) : Math.min(availW, availH * ASPECT);
    return { mode, pw: Math.floor(Math.max(200, pw)) };
  }

  build(keepFace = 0) {
    const { mode, pw } = this.computeSize();
    this.mode = mode; this.pw = pw;
    this.timers.forEach(clearTimeout); this.timers = [];
    const F = this.faces;
    const leaves = [];
    if (mode === 'double') {
      for (let k = 0; k < F.length / 2; k++) leaves.push([F[2 * k], F[2 * k + 1]]);
    } else {
      F.forEach((f, i) => leaves.push([f, i === 0 ? { cls: 'cover inner', html: '' } : { cls: 'paper backside', html: '' }]));
    }
    this.N = leaves.length;
    const el = document.createElement('div');
    el.className = `book ${mode}`;
    el.style.setProperty('--pw', pw + 'px');
    el.style.setProperty('--u', (pw / 100) + 'px');
    el.innerHTML = leaves.map(([a, b], k) => `<div class="leaf ${k === 0 ? 'hard' : ''} ${k === leaves.length - 1 ? 'hard last' : ''}"><div class="face front ${a.cls}">${a.html}</div><div class="face back ${b.cls}">${b.html}</div></div>`).join('');
    this.stage.innerHTML = '';
    this.stage.appendChild(el);
    this.bookEl = el;
    this.leaves = [...el.children];
    // map keepFace → cur
    if (mode === 'double') this.cur = Math.min(this.N, Math.ceil(keepFace / 2));
    else this.cur = Math.min(this.N - 1, keepFace);
    this.layout(true);
  }

  relayout() {
    const face = this.mode === 'double' ? Math.max(0, this.cur * 2 - 1) : this.cur;
    const { mode, pw } = this.computeSize();
    if (mode === this.mode && Math.abs(pw - this.pw) < 2) return;
    this.build(face);
  }

  nearCur(k) {
    // Only keep leaves immediately adjacent to the current spread in the render tree;
    // display:none on buried leaves prevents iOS WebKit from allocating 40+ Retina 3D CALayers (~280MB Jetsam crash).
    const lo = this.mode === 'double' ? this.cur - 2 : this.cur - 1;
    const hi = this.cur + 1;
    return k >= lo && k <= hi;
  }

  layout(instant = false, changed = -1) {
    const N = this.N;
    this.leaves.forEach((lf, k) => {
      const active = this.nearCur(k) || k === changed || lf.classList.contains('turning');
      if (!active) {
        if (lf.style.display !== 'none') lf.style.display = 'none';
        return;
      }
      const wasNone = lf.style.display === 'none';
      if (wasNone) lf.style.display = '';
      const flipped = k < this.cur;
      const snap = instant || (wasNone && k !== changed);
      if (snap) lf.style.transition = 'none';
      lf.style.transform = flipped ? 'rotateY(-180deg)' : 'rotateY(0deg)';
      if (k === changed) {
        lf.style.zIndex = N + 10;
        lf.classList.add('turning');
        lf.style.visibility = 'visible';
        const tm = setTimeout(() => {
          lf.style.zIndex = flipped ? k + 1 : N - k;
          lf.classList.remove('turning');
          if (this.mode === 'single' && k < this.cur) lf.style.visibility = 'hidden';
          if (!this.nearCur(k)) lf.style.display = 'none';
        }, FLIP_MS);
        this.timers.push(tm);
      } else if (!lf.classList.contains('turning')) {
        lf.style.zIndex = flipped ? k + 1 : N - k;
        if (this.mode === 'single') lf.style.visibility = flipped ? 'hidden' : 'visible';
      }
      if (snap) { void lf.offsetWidth; lf.style.transition = ''; }
    });
    let tx = 0;
    if (this.mode === 'double') {
      if (this.cur === 0) tx = -this.pw / 2;
      else if (this.cur === N) tx = this.pw / 2;
    }
    this.bookEl.style.transform = `translateX(${tx}px)`;
    this.updateIndicator();
  }

  updateIndicator() {
    const total = this.faces.length;
    let label;
    if (this.mode === 'double') {
      if (this.cur === 0) label = '封面';
      else if (this.cur === this.N) label = '封底';
      else label = `${this.cur * 2} – ${this.cur * 2 + 1} / ${total}`;
    } else {
      label = this.cur === 0 ? '封面' : this.cur === this.N - 1 ? '封底' : `${this.cur + 1} / ${total}`;
    }
    this.ind.textContent = label;
  }

  next() {
    const max = this.mode === 'double' ? this.N : this.N - 1;
    if (this.cur >= max) { this.bump(); return; }
    const k = this.cur;
    this.cur++;
    this.layout(false, k);
    A.pageFlip();
    this.hideHint();
  }

  prev() {
    if (this.cur <= 0) { this.bump(); return; }
    this.cur--;
    this.layout(false, this.cur);
    A.pageFlip();
    this.hideHint();
  }

  bump() {
    this.bookEl.classList.remove('bump'); void this.bookEl.offsetWidth; this.bookEl.classList.add('bump');
  }

  hideHint() { this.hint.classList.remove('show'); }

  open(book, onClose) {
    this.book = book;
    this.onClose = onClose;
    this.faces = this.buildFaces(book);
    this.root.classList.add('open');
    this.root.style.setProperty('--book', book.color);
    this.isOpen = true;
    this.build(0);
    this.root.querySelector('.r-title').textContent = `《${book.title}》 ${book.author || ''}`;
    this.bookEl.classList.add('enter');
    requestAnimationFrame(() => requestAnimationFrame(() => this.bookEl.classList.remove('enter')));
    // the cover swings open by itself
    this.timers.push(setTimeout(() => { if (this.isOpen && this.cur === 0) { this.cur = 1; this.layout(false, 0); A.pageFlip(); } }, 650));
    if (!this.hintShown) {
      this.hintShown = true;
      this.hint.classList.add('show');
      this.timers.push(setTimeout(() => this.hideHint(), 4200));
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove('open');
    this.timers.forEach(clearTimeout); this.timers = [];
    A.bookClose();
    setTimeout(() => { if (!this.isOpen) { this.stage.innerHTML = ''; this.leaves = []; this.bookEl = null; } }, 380);
    if (this.onClose) this.onClose();
  }
}

/* ---------------- face templates ---------------- */
function pageWrap(book, inner, n) {
  return `<div class="pg"><div class="pg-head">${esc(book.title)}</div><div class="pg-body">${inner}</div><div class="pg-num">${n}</div></div>`;
}

function vchars(s) { return esc(s); }

function coverHTML(b) {
  return `<div class="cv" style="--c:${b.color};--ink:${b.ink || '#e8d6a6'}">
    <div class="cv-stitch"><i></i><i></i><i></i><i></i></div>
    <div class="cv-slip"><span class="vert">${vchars(b.title)}</span></div>
    <div class="cv-author vert">${esc(b.author || '')}</div>
    <div class="cv-mark">雪</div>
  </div>`;
}

function backCoverHTML(b) {
  const price = b.price || [300, 500, 800][b.title.length % 3];
  return `<div class="cv back" style="--c:${b.color};--ink:${b.ink || '#e8d6a6'}">
    <div class="price-tag"><b>雪見堂</b><span>古書</span><em>¥ ${price}</em></div>
  </div>`;
}

function endpaperHTML(b, front) {
  const price = b.price || [300, 500, 800][b.title.length % 3];
  return `<div class="ep">${front ? `<div class="pencil">¥${price}</div><div class="sticker"><b>雪見堂</b><span>古書 · 買取</span><span>坂道尽头 十七番</span></div>` : `<div class="ep-note">读完了，请放回原处。</div>`}</div>`;
}

function titleHTML(b) {
  return `<div class="tp">
    <div class="tp-title vert">${esc(b.title)}</div>
    <div class="tp-author vert">${esc(b.author || '')}</div>
    <div class="seal">雪見堂<br>藏書</div>
  </div>`;
}

function colophonHTML(b) {
  const year = b.year ? `昭和${b.year}年 初版` : '雪见堂 藏本';
  const note = b.filler ? `定价 ${b.price ? '¥' + b.price * 2 : '—'}` : (b.id === 'shiika' ? '原文据通行本' : b.id === 'shopnote' || b.id === 'sekka' ? '店内自印 · 非卖品' : '中文为店主私译 · 原作已入公有领域');
  return `<div class="colophon">
    <div class="co-box">
      <div class="co-title">${esc(b.title)}</div>
      <div class="co-line">${esc(b.author || '')}</div>
      <div class="co-line">${year}</div>
      <div class="co-line small">${note}</div>
      <div class="seal small">雪見<br>堂印</div>
    </div>
  </div>`;
}

function foundHTML(f) {
  let vis = '';
  switch (f.kind) {
    case 'ticket': vis = `<div class="fo ticket"><b>乘 车 券</b><span>${f.text.includes('电影') ? '入场券' : '小 樽 → 札 幌'}</span><em>No. 0${Math.floor(Math.random() * 9000 + 1000)}</em></div>`; break;
    case 'leaf': vis = f.text.includes('银杏') ? `<svg class="fo leaf" viewBox="0 0 100 100"><path d="M50 92 L50 55 M50 55 C 20 55, 8 30, 14 18 C 30 26, 40 22, 50 8 C 60 22, 70 26, 86 18 C 92 30, 80 55, 50 55 Z" fill="#d9a520" stroke="#a87810" stroke-width="1.5"/></svg>` : `<svg class="fo leaf" viewBox="0 0 100 100"><path d="M50 95 L50 60 M50 60 L20 70 L28 56 L8 44 L26 40 L20 20 L38 30 L50 6 L62 30 L80 20 L74 40 L92 44 L72 56 L80 70 Z" fill="#b8321f" stroke="#8a2214" stroke-width="1.2"/><path d="M50 95 q8 -6 14 -4" stroke="#b5332a" fill="none"/></svg>`; break;
    case 'flower': vis = `<svg class="fo leaf" viewBox="0 0 100 100">${[0, 90, 180, 270].map((a) => `<ellipse cx="50" cy="32" rx="13" ry="17" transform="rotate(${a} 50 50)" fill="#5f8f4a" stroke="#3f6a32"/>`).join('')}<path d="M50 50 L54 92" stroke="#3f6a32" stroke-width="2"/></svg>`; break;
    case 'photo': vis = `<div class="fo photo"><svg viewBox="0 0 100 80"><rect width="100" height="80" fill="#7d7a74"/><rect y="52" width="100" height="28" fill="#5d5a55"/><path d="M40 52 C 36 40, 42 30, 50 30 C 58 30, 64 40, 60 52 Z M43 32 l2 -8 l5 6 M57 32 l-2 -8 l-5 6" fill="#222"/></svg></div>`; break;
    case 'letter': vis = `<div class="fo letter"><p>今天也下雪了，</p><p>你那里呢？</p></div>`; break;
    default: vis = `<div class="fo note"><p>${esc(f.text.replace(/^.*?[：:]/, '').replace(/[“”]/g, ''))}</p></div>`;
  }
  return `<div class="found"><div class="found-obj">${vis}</div><div class="found-cap">${esc(f.text)}</div><div class="found-tip">—— 夹在书页间的东西</div></div>`;
}
