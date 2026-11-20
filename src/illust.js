// 水墨风插图（内联 SVG）。滤镜 #ink / #inkSoft 在 template.html 中统一定义。
const INK = '#2b2622';
const W = (a) => `rgba(43,38,34,${a})`;
const RED = '#b5332a';

function svg(body, vb = '0 0 300 300') {
  return `<svg class="ill" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function snowDots(n, seed, x0 = 0, y0 = 0, x1 = 300, y1 = 300, col = W(0.35)) {
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  let out = '';
  for (let i = 0; i < n; i++) out += `<circle cx="${(x0 + r() * (x1 - x0)).toFixed(1)}" cy="${(y0 + r() * (y1 - y0)).toFixed(1)}" r="${(0.8 + r() * 2).toFixed(1)}" fill="${col}"/>`;
  return out;
}

const ARTS = {
  cat: () => svg(`
    <g filter="url(#ink)">
      <rect x="62" y="178" width="176" height="62" rx="10" fill="${RED}" opacity="0.75"/>
      <path d="M70 182 L230 182" stroke="#e8c27a" stroke-width="3" opacity="0.7"/>
      <ellipse cx="150" cy="176" rx="74" ry="40" fill="${INK}"/>
      <circle cx="92" cy="160" r="30" fill="${INK}"/>
      <path d="M70 146 L74 116 L94 136 Z" fill="${INK}"/>
      <path d="M100 134 L114 110 L120 140 Z" fill="${INK}"/>
      <path d="M220 178 C 240 200, 200 222, 140 214 C 110 210, 96 200, 100 192" stroke="${INK}" stroke-width="13" fill="none" stroke-linecap="round"/>
      <path d="M80 162 q6 4 12 0 M98 160 q6 4 12 0" stroke="#d9c79c" stroke-width="2" fill="none"/>
    </g>
    <text x="196" y="118" font-size="20" fill="${W(0.55)}" font-style="italic">z z z</text>
  `),
  cat2: () => svg(`
    <circle cx="200" cy="80" r="38" fill="none" stroke="${W(0.35)}" stroke-width="2"/>
    <circle cx="200" cy="80" r="36" fill="${W(0.06)}"/>
    <g filter="url(#ink)">
      <path d="M150 250 C 100 250, 96 200, 110 170 C 118 150, 130 140, 150 140 C 170 140, 182 150, 190 170 C 204 200, 200 250, 150 250 Z" fill="${INK}"/>
      <circle cx="150" cy="122" r="30" fill="${INK}"/>
      <path d="M124 108 L126 78 L146 98 Z M176 108 L174 78 L154 98 Z" fill="${INK}"/>
      <path d="M190 236 C 230 236, 240 200, 222 186" stroke="${INK}" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M136 120 l10 0 M154 120 l10 0" stroke="#e4cf8d" stroke-width="3" stroke-linecap="round"/>
    </g>
    <path d="M40 252 L260 252" stroke="${W(0.4)}" stroke-width="2"/>
  `),
  fox: () => svg(`
    <path d="M0 230 C 80 214, 200 240, 300 222 L300 300 L0 300 Z" fill="${W(0.06)}"/>
    <g filter="url(#ink)">
      <path d="M232 230 L232 60" stroke="${INK}" stroke-width="7"/>
      <path d="M232 80 L196 104 M232 80 L268 104 M232 118 L186 148 M232 118 L278 148 M232 160 L178 196 M232 160 L286 196" stroke="${INK}" stroke-width="4"/>
      <path d="M190 100 q20 -8 40 -4 M272 102 q-20 -8 -40 -4 M182 144 q24 -8 48 -2 M182 192 q26 -10 50 -4" stroke="${W(0.15)}" stroke-width="6" fill="none"/>
      <path d="M82 206 C 92 186, 130 182, 146 196 C 150 200, 150 210, 140 214 C 120 220, 96 220, 82 206 Z" fill="#b6652d" opacity="0.85"/>
      <path d="M82 206 C 60 210, 40 196, 46 178 C 56 190, 70 194, 84 196 Z" fill="#b6652d" opacity="0.8"/>
      <path d="M46 178 l-4 -6 l8 2 Z" fill="#f2ead8"/>
      <circle cx="150" cy="190" r="13" fill="#b6652d" opacity="0.9"/>
      <path d="M144 180 L146 166 L154 178 Z M154 180 L160 168 L162 182 Z" fill="${INK}"/>
      <circle cx="154" cy="190" r="1.8" fill="${INK}"/>
      <path d="M96 216 l-4 10 M128 216 l4 10" stroke="${INK}" stroke-width="3"/>
    </g>
    ${snowDots(60, 7, 0, 0, 300, 230)}
    <path d="M190 120 q-4 30 -2 60 M200 112 q-2 30 2 70" stroke="${W(0.25)}" stroke-width="1.5" stroke-dasharray="2 5" fill="none"/>
  `),
  shoplight: () => svg(`
    <rect x="0" y="0" width="300" height="300" fill="${W(0.82)}"/>
    <rect x="96" y="70" width="108" height="170" fill="#2a2420"/>
    <rect x="146" y="70" width="8" height="170" fill="#f6dc9a"/>
    <path d="M146 240 L154 240 L210 300 L120 300 Z" fill="#f6dc9a" opacity="0.85"/>
    <path d="M110 40 C 110 20, 190 20, 190 40 L210 46 L90 46 Z" fill="#111"/>
    <rect x="128" y="18" width="44" height="10" fill="#111"/>
    <g filter="url(#ink)">
      <path d="M126 272 C 128 262, 140 258, 146 264 L146 280 C 136 284, 128 282, 126 272 Z" fill="#c07a40"/>
      <path d="M126 272 C 110 274, 104 268, 108 260" stroke="#c07a40" stroke-width="7" fill="none" stroke-linecap="round"/>
    </g>
    ${snowDots(80, 13, 0, 0, 300, 300, 'rgba(255,255,255,0.7)')}
  `),
  moonfox: () => svg(`
    <circle cx="210" cy="78" r="44" fill="#f4ecd8" stroke="${W(0.3)}" stroke-width="2"/>
    <circle cx="210" cy="78" r="56" fill="none" stroke="${W(0.08)}" stroke-width="12"/>
    <path d="M0 220 C 100 206, 200 230, 300 214" stroke="${W(0.3)}" stroke-width="2" fill="none"/>
    <g filter="url(#ink)" fill="${INK}">
      <path d="M90 204 C 96 190, 126 188, 136 198 C 140 204, 134 210, 124 212 C 108 214, 94 212, 90 204 Z"/>
      <path d="M90 204 C 72 206, 60 196, 64 184 C 70 194, 80 198, 92 198 Z"/>
      <circle cx="140" cy="194" r="9"/><path d="M136 188 L138 178 L144 188 Z M142 188 L148 180 L148 190 Z"/>
      <path d="M150 210 C 154 202, 170 200, 176 206 C 178 210, 174 214, 168 214 C 160 216, 152 214, 150 210 Z"/>
      <path d="M150 210 C 140 211, 134 206, 136 200 C 140 205, 145 207, 151 206 Z"/>
      <circle cx="179" cy="204" r="6"/><path d="M176 200 L177 193 L181 200 Z M180 200 L184 194 L184 201 Z"/>
    </g>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${40 - i * 8 + 200 - i * 26}" cy="${222 + (i % 2) * 6}" rx="3" ry="2" fill="#5a7ea8" opacity="0.5"/>`).join('')}
    ${snowDots(30, 5, 0, 0, 300, 200)}
  `),
  snowwoman: () => svg(`
    <rect x="0" y="0" width="300" height="300" fill="${W(0.08)}"/>
    <rect x="18" y="60" width="90" height="190" fill="${W(0.75)}"/>
    <g filter="url(#inkSoft)">
      <path d="M190 60 C 176 60, 170 76, 172 90 C 160 110, 150 200, 140 262 L 240 262 C 230 200, 220 110, 208 90 C 210 76, 204 60, 190 60 Z" fill="#fbfaf6" stroke="${W(0.25)}" stroke-width="1.5"/>
      <path d="M176 70 C 170 100, 168 150, 160 200" stroke="${INK}" stroke-width="5" fill="none" opacity="0.85"/>
      <path d="M204 70 C 214 110, 222 170, 236 230" stroke="${INK}" stroke-width="4" fill="none" opacity="0.6"/>
    </g>
    ${Array.from({ length: 60 }, (_, i) => { const x = (i * 53) % 300, y = (i * 97) % 300; return `<path d="M${x} ${y} l18 9" stroke="${W(0.28)}" stroke-width="1.4"/>`; }).join('')}
  `),
  spider: () => svg(`
    <rect x="0" y="210" width="300" height="90" fill="${W(0.85)}"/>
    <path d="M0 300 L30 240 L50 270 L80 220 L100 260 L130 230 L150 270 L180 236 L210 268 L240 228 L270 262 L300 238 L300 300 Z" fill="#110e0c"/>
    <g filter="url(#ink)">
      <path d="M150 52 C 130 40, 124 20, 150 6 C 176 20, 170 40, 150 52 Z" fill="#f7f3ea" stroke="${W(0.4)}" stroke-width="2"/>
      <path d="M150 52 C 120 50, 100 34, 104 16 C 126 22, 140 36, 150 52 Z M150 52 C 180 50, 200 34, 196 16 C 174 22, 160 36, 150 52 Z" fill="#f7f3ea" stroke="${W(0.4)}" stroke-width="2"/>
      <ellipse cx="96" cy="58" rx="48" ry="10" fill="#4f7a55" opacity="0.7"/>
      <ellipse cx="214" cy="60" rx="40" ry="9" fill="#4f7a55" opacity="0.6"/>
    </g>
    <path d="M150 54 L150 236" stroke="#c9d3df" stroke-width="1.2"/>
    <circle cx="150" cy="150" r="4" fill="${INK}"/>
    <path d="M146 148 l-6 -4 M146 152 l-6 4 M154 148 l6 -4 M154 152 l6 4" stroke="${INK}" stroke-width="1"/>
  `),
  rain: () => svg(`
    ${Array.from({ length: 70 }, (_, i) => { const x = (i * 37) % 320 - 10, y = (i * 71) % 300; return `<path d="M${x} ${y} l-8 22" stroke="${W(0.3)}" stroke-width="1.3"/>`; }).join('')}
    <g filter="url(#ink)">
      <path d="M220 250 L224 120" stroke="${INK}" stroke-width="7"/>
      <path d="M180 130 C 200 100, 250 100, 268 128 C 240 120, 206 120, 180 130 Z M170 170 C 200 140, 260 140, 280 168 C 250 160, 200 160, 170 170 Z" fill="${INK}" opacity="0.85"/>
      <path d="M80 160 L130 160 L105 140 Z" fill="#8a6a3a"/>
      <path d="M105 160 L100 214 L94 250 M105 196 L116 250 M100 180 L84 200" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M84 176 L128 176 L120 214 L90 214 Z" fill="#7a6a54" opacity="0.6"/>
    </g>
    <path d="M0 252 L300 252" stroke="${W(0.4)}" stroke-width="2"/>
  `),
  river: () => svg(`
    <path d="M0 120 L40 70 L70 100 L110 40 L160 110 L200 60 L250 120 L300 80" stroke="${W(0.45)}" stroke-width="2" fill="none"/>
    <path d="M0 120 L40 70 L70 100 L110 40 L160 110 L200 60 L250 120 L300 80 L300 130 L0 130 Z" fill="${W(0.06)}"/>
    <path d="M30 190 L270 190 M60 214 L240 214 M100 236 L200 236" stroke="${W(0.15)}" stroke-width="1.5"/>
    <g filter="url(#ink)">
      <path d="M110 196 Q150 210 200 196 L190 204 Q150 214 118 204 Z" fill="${INK}"/>
      <path d="M150 180 L136 192 L164 192 Z" fill="#7d6a4c"/>
      <path d="M150 190 L150 198" stroke="${INK}" stroke-width="5"/>
      <path d="M156 188 L214 150" stroke="${INK}" stroke-width="1.5"/>
      <path d="M214 150 L214 206" stroke="${W(0.4)}" stroke-width="0.8"/>
    </g>
    ${snowDots(70, 29, 0, 0, 300, 280)}
  `),
  lake: () => svg(`
    <rect x="0" y="0" width="300" height="300" fill="#fbf8f1"/>
    <path d="M30 150 L190 146" stroke="${W(0.5)}" stroke-width="1.2"/>
    <circle cx="214" cy="140" r="3" fill="${INK}"/>
    <path d="M150 196 q8 4 16 0" stroke="${INK}" stroke-width="2.2" fill="none"/>
    <circle cx="156" cy="193" r="0.9" fill="${INK}"/><circle cx="160" cy="193" r="0.9" fill="${INK}"/>
    ${snowDots(16, 41, 0, 0, 300, 300, W(0.12))}
  `),
  stream: () => svg(`
    ${Array.from({ length: 9 }, (_, i) => `<path d="M-10 ${60 + i * 22} C 60 ${40 + i * 22}, 120 ${90 + i * 22}, 180 ${62 + i * 22} S 280 ${70 + i * 22}, 320 ${56 + i * 22}" stroke="${W(0.16 + (i % 3) * 0.08)}" stroke-width="${1.5 + (i % 2)}" fill="none"/>`).join('')}
    ${[[60, 110, 7], [74, 118, 4], [180, 150, 9], [196, 160, 5], [120, 210, 6], [240, 96, 4], [230, 230, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${W(0.4)}" stroke-width="1.2"/>`).join('')}
  `),
  letter: () => svg(`
    <g filter="url(#ink)">
      <path d="M60 110 L230 90 L246 210 L76 230 Z" fill="#fbf7ec" stroke="${W(0.45)}" stroke-width="1.5"/>
      <path d="M60 110 L156 168 L230 90" stroke="${W(0.3)}" stroke-width="1.5" fill="none"/>
      <path d="M200 70 C 220 90, 240 120, 270 130" stroke="${INK}" stroke-width="4" fill="none"/>
      <path d="M232 104 L256 92" stroke="${INK}" stroke-width="3"/>
    </g>
    ${[[214, 84], [246, 118], [262, 128], [254, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${RED}" opacity="0.85"/>`).join('')}
    ${snowDots(40, 17)}
  `),
  bamboo: () => svg(`
    <defs><radialGradient id="bglow"><stop offset="0" stop-color="#ffe9a6" stop-opacity="1"/><stop offset="1" stop-color="#ffe9a6" stop-opacity="0"/></radialGradient></defs>
    <circle cx="150" cy="230" r="60" fill="url(#bglow)"/>
    <g filter="url(#ink)">
      ${[[70, 9, 0.8], [150, 12, 1], [220, 8, 0.6], [110, 6, 0.45], [262, 7, 0.5]].map(([x, w, o]) => `<path d="M${x} 300 L${x} 0" stroke="${W(o)}" stroke-width="${w}"/>${[60, 130, 200, 260].map((y) => `<path d="M${x - w / 2 - 2} ${y} L${x + w / 2 + 2} ${y}" stroke="#fbf8f0" stroke-width="2"/>`).join('')}`).join('')}
      <path d="M150 90 C 180 80, 210 84, 236 70 M150 160 C 120 150, 96 156, 70 140" stroke="${W(0.6)}" stroke-width="2" fill="none"/>
      <path d="M236 70 l18 -10 l-6 14 Z M70 140 l-18 -6 l12 12 Z" fill="${W(0.6)}"/>
    </g>
    <ellipse cx="150" cy="236" rx="5" ry="8" fill="#fff6d5"/>
  `),
};

export function illustration(name) {
  return (ARTS[name] || ARTS.stream)();
}

/* ---------- 雪花生成 ---------- */
export function snowflakeSVG(seed, kind) {
  let s = seed * 7919 + 13;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const col = '#35567a';
  let arm = '';
  const L = 120;
  if (kind === 'dendrite' || kind === 'fern') {
    arm += `<path d="M0 0 L0 ${-L}" stroke-width="4"/>`;
    const n = kind === 'fern' ? 9 : 5;
    for (let i = 1; i <= n; i++) {
      const y = -L * (i / (n + 1)) - 6;
      const len = (kind === 'fern' ? 26 : 36) * (1 - i / (n + 2)) + r() * 8;
      arm += `<path d="M0 ${y} L${len * 0.86} ${y - len * 0.5} M0 ${y} L${-len * 0.86} ${y - len * 0.5}" stroke-width="2.4"/>`;
      if (kind === 'fern') {
        for (let k = 1; k < 3; k++) {
          const px = len * 0.86 * (k / 3), py = y - len * 0.5 * (k / 3);
          arm += `<path d="M${px} ${py} l${6} ${-10} M${-px} ${py} l${-6} ${-10}" stroke-width="1.4"/>`;
        }
      }
    }
  } else if (kind === 'plate') {
    arm += `<path d="M0 0 L0 ${-L * 0.9}" stroke-width="2.4"/>`;
    for (let i = 1; i <= 3; i++) {
      const y = -L * 0.9 * (i / 3.4);
      const w = L * 0.9 * (i / 3.4) * 0.577;
      arm += `<path d="M${-w} ${y} L${w} ${y}" stroke-width="1.6"/>`;
    }
    arm += `<path d="M${-L * 0.52} ${-L * 0.9} L${L * 0.52} ${-L * 0.9}" stroke-width="3"/>`;
  } else if (kind === 'hex') {
    arm += `<path d="M${-L * 0.46} ${-L * 0.8} L${L * 0.46} ${-L * 0.8}" stroke-width="3"/>`;
    arm += `<path d="M${-L * 0.32} ${-L * 0.56} L${L * 0.32} ${-L * 0.56}" stroke-width="1.2"/>`;
    arm += `<path d="M0 0 L0 ${-L * 0.3}" stroke-width="1.2"/>`;
  } else {
    arm += `<path d="M-10 0 L-12 ${-L * 0.7} L12 ${-L * 0.7} L10 0" stroke-width="2"/>`;
    arm += `<path d="M0 ${-L * 0.7} L-22 ${-L * 0.82} L-16 ${-L} L16 ${-L} L22 ${-L * 0.82} Z" stroke-width="2.4"/>`;
    arm += `<path d="M0 -10 L0 ${-L * 0.95}" stroke-width="1"/>`;
  }
  let body = '';
  for (let i = 0; i < 6; i++) body += `<g transform="rotate(${i * 60})">${arm}</g>`;
  return `<svg class="ill flake" viewBox="-150 -150 300 300" xmlns="http://www.w3.org/2000/svg">
    <circle r="140" fill="rgba(53,86,122,0.05)"/>
    <g stroke="${col}" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}
    <circle r="${kind === 'hex' ? 8 : 10}" stroke-width="2"/></g></svg>`;
}
