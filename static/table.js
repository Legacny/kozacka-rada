'use strict';
/* Стіл козацької ради: геометрія місць і SVG-сцена (килим, дубовий стіл, сукно, свічки). */

const TABLE = (() => {
  const SHAPES = {
    round: { W: 1100, H: 1100, kind: 'ellipse', rx: 330, ry: 330, ring: [455, 455] },
    oval:  { W: 1600, H: 1100, kind: 'ellipse', rx: 520, ry: 270, ring: [665, 415] },
    long:  { W: 2100, H: 1050, kind: 'rect', w: 1380, h: 360, r: 70 },
  };
  const NAMES = { oval: 'Овальний', round: 'Круглий', long: 'Довгий (трапезний)' };
  const CLOTHS = { red: 'Червоне сукно', green: 'Зелене сукно', oak: 'Голий дуб' };
  const SEAT_CAP = 190;

  // Геометрія в потрібній орієнтації (portrait = повернута на 90°)
  function geom(shape, portrait) {
    const s = SHAPES[shape] || SHAPES.oval;
    const g = { ...s };
    if (portrait && s.W !== s.H) {
      g.W = s.H; g.H = s.W;
      if (s.kind === 'ellipse') { g.rx = s.ry; g.ry = s.rx; g.ring = [s.ring[1], s.ring[0]]; }
      else { g.w = s.h; g.h = s.w; }
    }
    g.portrait = portrait && s.W !== s.H;
    g.shape = shape in SHAPES ? shape : 'oval';
    return g;
  }

  function ellipseSeats(g, n) {
    const [rx, ry] = g.ring; const cx = g.W / 2, cy = g.H / 2;
    const N = 720, pts = [], cum = [0];
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
      if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const L = cum[N]; const out = []; let j = 0;
    for (let k = 0; k < n; k++) {
      const target = (L * k) / n;
      while (cum[j + 1] < target) j++;
      out.push({ x: pts[j][0], y: pts[j][1] });
    }
    return out;
  }

  function longSeats(g, n) {
    const cx = g.W / 2, cy = g.H / 2;
    const sideA = Math.ceil((n - 2) / 2), sideB = n - 2 - sideA;
    const gap = 130;
    const out = [];
    if (!g.portrait) {
      const x0 = cx - g.w / 2, len = g.w;
      const yTop = cy - g.h / 2 - gap, yBot = cy + g.h / 2 + gap;
      out.push({ x: x0 - gap - 10, y: cy });
      for (let i = 0; i < sideA; i++) out.push({ x: x0 + (len * (i + 0.5)) / sideA, y: yTop });
      out.push({ x: x0 + len + gap + 10, y: cy });
      for (let i = sideB - 1; i >= 0; i--) out.push({ x: x0 + (len * (i + 0.5)) / sideB, y: yBot });
    } else {
      const y0 = cy - g.h / 2, len = g.h;
      const xL = cx - g.w / 2 - gap, xR = cx + g.w / 2 + gap;
      out.push({ x: cx, y: y0 - gap - 10 });
      for (let i = 0; i < sideA; i++) out.push({ x: xR, y: y0 + (len * (i + 0.5)) / sideA });
      out.push({ x: cx, y: y0 + len + gap + 10 });
      for (let i = sideB - 1; i >= 0; i--) out.push({ x: xL, y: y0 + (len * (i + 0.5)) / sideB });
    }
    return out;
  }

  // Місця: координати у % від сцени + розмір місця у % ширини
  function seats(g, n) {
    if (!n) return [];
    const pts = g.kind === 'ellipse' ? ellipseSeats(g, n) : longSeats(g, n);
    let minD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      // фігура з табличкою вища за ширину (~1.3), тож вертикальна відстань «коштує» більше
      if (pts.length > 1) minD = Math.min(minD, Math.hypot(p.x - q.x, (p.y - q.y) / 1.3));
    }
    const size = Math.min(SEAT_CAP, minD * 0.92);
    return pts.map((p) => ({ left: (p.x / g.W) * 100, top: (p.y / g.H) * 100, w: (size / g.W) * 100, z: Math.round(p.y) }));
  }

  function shapePath(g, grow, dy = 0) {
    const cx = g.W / 2, cy = g.H / 2 + dy;
    if (g.kind === 'ellipse') return `<ellipse cx="${cx}" cy="${cy}" rx="${g.rx + grow}" ry="${g.ry + grow}"`;
    const w = g.w + grow * 2, h = g.h + grow * 2;
    return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${Math.max(0, g.r + grow * 0.6)}"`;
  }

  const candle = (x, h) => `
    <rect x="${x - 7}" y="${-h}" width="14" height="${h}" rx="3" fill="#efe3c2"/>
    <path d="M${x - 7} ${-h + 6} q4 6 0 12" stroke="#d8c99f" stroke-width="2" fill="none"/>
    <path class="flame" d="M${x} ${-h - 26} c-8 10 -9 18 0 24 c9 -6 8 -14 0 -24z" fill="#ffb347"/>
    <path class="flame" d="M${x} ${-h - 16} c-4 6 -4 10 0 13 c4 -3 4 -7 0 -13z" fill="#fff1b8"/>`;

  function props(g) {
    const s = g.shape === 'round' ? 0.8 : g.portrait ? 0.78 : 0.95;
    const rot = g.portrait ? 90 : 0;
    const far = g.shape === 'round' ? 165 : 215;
    return `<g transform="translate(${g.W / 2} ${g.H / 2}) rotate(${rot}) scale(${s})">
      <!-- свічник -->
      <g transform="translate(${-far} 0) rotate(${-rot})">
        <circle class="glow" r="150" fill="url(#candleGlow)"/>
        <ellipse cx="0" cy="8" rx="46" ry="16" fill="#8a6d22"/><ellipse cx="0" cy="4" rx="40" ry="12" fill="#C9A23F"/>
        ${candle(-22, 46)}${candle(0, 64)}${candle(22, 40)}
      </g>
      <!-- каламар і перо -->
      <g transform="translate(${far} 0) rotate(${-rot})">
        <circle class="glow" r="90" fill="url(#candleGlow)" opacity=".5"/>
        <path d="M-22 -6 h44 l6 34 h-56z" fill="#1d1410"/><ellipse cx="0" cy="-6" rx="22" ry="6" fill="#000"/>
        <path d="M-2 -8 C-14 -50 0 -80 34 -96 C22 -70 18 -46 0 -8z" fill="#f4ecdb" stroke="#CDB88A" stroke-width="2"/>
      </g>
      <!-- булава -->
      <g transform="translate(0 -118) rotate(-6)">
        <rect x="-110" y="-7" width="150" height="14" rx="6" fill="#6b4a2a"/>
        <rect x="-118" y="-9" width="14" height="18" rx="3" fill="#C9A23F"/><rect x="28" y="-9" width="12" height="18" rx="3" fill="#C9A23F"/>
        <circle cx="66" cy="0" r="28" fill="#C9A23F" stroke="#8a6d22" stroke-width="3"/>
        <g fill="#8E1F1F"><circle cx="58" cy="-10" r="5"/><circle cx="74" cy="8" r="5"/><circle cx="56" cy="12" r="4"/><circle cx="78" cy="-12" r="4"/></g>
      </g>
      <!-- сувої -->
      <g transform="translate(-40 112) rotate(-6)">
        <rect x="-70" y="-12" width="140" height="24" rx="12" fill="#EADBB8"/>
        <circle cx="-70" cy="0" r="12" fill="#CDB88A"/><circle cx="70" cy="0" r="12" fill="#CDB88A"/>
        <path d="M-10 12 l-6 28 l10 -8 l8 10 l2 -30z" fill="#8E1F1F"/><circle cx="-6" cy="12" r="10" fill="#8E1F1F"/>
      </g>
      <g transform="translate(96 126) rotate(14)">
        <rect x="-42" y="-10" width="84" height="20" rx="10" fill="#e3d1a6"/>
        <circle cx="-42" cy="0" r="10" fill="#c3ac7b"/><circle cx="42" cy="0" r="10" fill="#c3ac7b"/>
      </g>
    </g>`;
  }

  function svg(g, cloth = 'red') {
    const clothFill = cloth === 'green' ? 'url(#clothGreen)' : cloth === 'oak' ? 'url(#oakTop)' : 'url(#clothRed)';
    return `<svg class="table-svg" viewBox="0 0 ${g.W} ${g.H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="kilim" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="#3d0f0f"/>
          <path d="M40 4 L76 40 L40 76 L4 40Z" fill="#5c1717"/>
          <path d="M40 22 L58 40 L40 58 L22 40Z" fill="#b5761e"/>
          <path d="M40 33 L47 40 L40 47 L33 40Z" fill="#1d1410"/>
          <path d="M0 0 L8 0 L0 8Z M80 0 L72 0 L80 8Z M0 80 L8 80 L0 72Z M80 80 L72 80 L80 72Z" fill="#b5761e"/>
        </pattern>
        <radialGradient id="clothRed" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#b3262a"/><stop offset=".7" stop-color="#7d1418"/><stop offset="1" stop-color="#4e0b0e"/></radialGradient>
        <radialGradient id="clothGreen" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#3f7a46"/><stop offset=".7" stop-color="#26502c"/><stop offset="1" stop-color="#16321b"/></radialGradient>
        <linearGradient id="oakTop" x1="0" x2="1" y1="0" y2=".2"><stop offset="0" stop-color="#7a5232"/><stop offset=".5" stop-color="#946640"/><stop offset="1" stop-color="#6d4829"/></linearGradient>
        <linearGradient id="oakRim" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6b4426"/><stop offset=".5" stop-color="#3d2413"/><stop offset="1" stop-color="#24140a"/></linearGradient>
        <radialGradient id="candleGlow"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
        <radialGradient id="pool" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".22"/><stop offset=".6" stop-color="#ffcf8a" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <rect width="${g.W}" height="${g.H}" fill="url(#pool)"/>
      ${shapePath(g, 250)} fill="url(#kilim)" stroke="#b5761e" stroke-width="10" opacity=".9"/>
      ${shapePath(g, 222)} fill="none" stroke="#1d1410" stroke-width="6" stroke-dasharray="18 10"/>
      ${shapePath(g, 40, 34)} fill="#000" opacity=".55" filter="url(#soft)"/>
      ${shapePath(g, 40)} fill="url(#oakRim)"/>
      ${shapePath(g, 34)} fill="none" stroke="#8a5a34" stroke-width="3"/>
      ${shapePath(g, 0)} fill="${clothFill}"/>
      ${cloth === 'oak'
        ? `${shapePath(g, -6)} fill="none" stroke="#5a3a20" stroke-width="3"/>`
        : `${shapePath(g, -24)} fill="none" stroke="#C9A23F" stroke-width="5" stroke-dasharray="26 8 4 8" opacity=".75"/>`}
      ${props(g)}
      ${shapePath(g, 256)} class="night-tint" fill="#0b1633"/>
    </svg>`;
  }

  return { geom, seats, svg, NAMES, CLOTHS };
})();
