'use strict';
/* Аватари гравців: козаки й козачки за столом ради. Власні SVG. */

const AVATAR = (() => {
  const OPTS = {
    head: [['oseledets', 'Оселедець'], ['shapka', 'Шапка зі шликом'], ['hair', 'Чуприна'],
           ['khustka', 'Хустка'], ['vinok', 'Вінок'], ['kosa', 'Коса']],
    face: [['none', 'Без вусів'], ['vusa', 'Вуса'], ['vusa_long', 'Довгі вуса'], ['boroda', 'Борода']],
    extra: [['none', 'Нічого'], ['serezhka', 'Сережка'], ['lyulka', 'Люлька']],
    hair: ['#1d1410', '#4a2e1a', '#8b5a2b', '#d4a95a', '#a33b1f', '#9a9a9a'],
    coat: ['#8E1F1F', '#2F5B8C', '#3f6b3a', '#5b2a5e', '#b5761e', '#1f5f5f', '#3a3a3a'],
    skin: ['#f0c9a0', '#d9b58c', '#b8875e', '#8a5a3b'],
    accent: ['#C9A23F', '#c0392b', '#2F5B8C', '#5E7A4A', '#e8e0d0'],
  };
  const KEYS = Object.keys(OPTS);

  function hash(str) {
    let h = 2166136261;
    for (const c of String(str)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const val = (o) => (Array.isArray(o) ? o[0] : o);

  function random(seed = Math.random() * 1e9) {
    const r = rng(typeof seed === 'number' ? seed : hash(seed));
    const pick = (arr) => val(arr[Math.floor(r() * arr.length)]);
    const a = {};
    for (const k of KEYS) a[k] = pick(OPTS[k]);
    if (['khustka', 'vinok', 'kosa'].includes(a.head)) a.face = 'none';
    return a;
  }

  // Нормалізує те, що прийшло з сервера / localStorage
  function norm(a, seed) {
    const base = random(seed || 'x');
    if (!a || typeof a !== 'object') return base;
    const out = {};
    for (const k of KEYS) {
      const allowed = OPTS[k].map(val);
      out[k] = allowed.includes(a[k]) ? a[k] : base[k];
    }
    return out;
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
    return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  function svg(a, { sleep = false } = {}) {
    const sk = a.skin, skD = shade(a.skin, 0.8), hc = a.hair, coat = a.coat, acc = a.accent;
    const fem = ['khustka', 'vinok', 'kosa'].includes(a.head);
    let back = '', top = '', front = '';

    // ---- волосся / головні убори
    if (a.head === 'vinok') {
      back += `<path d="M34 40 L26 104 L32 104 L39 46Z" fill="${acc}"/><path d="M66 40 L74 104 L68 104 L61 46Z" fill="#c0392b"/>`;
      back += `<path d="M32 46 C27 70 29 92 35 100 L65 100 C71 92 73 70 68 46Z" fill="${hc}"/>`;
    }
    if (a.head === 'kosa') {
      back += `<path d="M32 46 C30 60 32 70 36 76 L64 76 C68 70 70 60 68 46Z" fill="${hc}"/>`;
    }
    if (a.head === 'khustka') {
      back += `<path d="M29 50 C27 22 73 22 71 50 C71 64 64 72 50 72 C36 72 29 64 29 50Z" fill="${acc}"/>`;
    }

    if (a.head === 'oseledets') {
      top += `<path d="M48 28 C47 12 66 7 71 17 C74 24 64 28 61 22" fill="none" stroke="${hc}" stroke-width="5.5" stroke-linecap="round"/>`;
    } else if (a.head === 'shapka') {
      top += `<path d="M34 34 C35 12 64 8 69 24 C78 28 83 40 76 50 L70 34Z" fill="${acc}"/>`;
      top += `<path d="M30 40 C30 25 70 25 70 40 C70 45 30 45 30 40Z" fill="#3a2a1e"/>`;
      top += `<path d="M34 34 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="#5a4330" stroke-width="2"/>`;
    } else if (a.head === 'hair') {
      top += `<path d="M32 46 C29 24 71 24 68 46 C66 36 60 31 54 33 C48 29 40 32 32 46Z" fill="${hc}"/>`;
    } else if (a.head === 'khustka') {
      top += `<path d="M32 42 C35 28 65 28 68 42 C60 36 40 36 32 42Z" fill="${acc}"/>`;
      top += `<g fill="#fff" opacity=".6"><circle cx="40" cy="34" r="1.5"/><circle cx="50" cy="31" r="1.5"/><circle cx="60" cy="34" r="1.5"/></g>`;
      top += `<path d="M44 70 L50 78 L56 70Z" fill="${shade(acc, 0.8)}"/>`;
    } else if (a.head === 'vinok' || a.head === 'kosa') {
      top += `<path d="M33 46 C32 26 68 26 67 46 C63 35 56 32 50 33 C44 32 37 35 33 46Z" fill="${hc}"/>`;
      top += `<path d="M50 30 V40" stroke="${shade(hc, 0.75)}" stroke-width="1.5"/>`;
    }
    if (a.head === 'vinok') {
      const fl = [['#c0392b', 34, 32], ['#f1c40f', 41, 26], ['#2F5B8C', 50, 24], ['#c0392b', 59, 26], ['#f1c40f', 66, 32]];
      top += `<path d="M32 34 C38 22 62 22 68 34" fill="none" stroke="#3f6b3a" stroke-width="4"/>`;
      top += fl.map(([c, x, y]) => `<circle cx="${x}" cy="${y}" r="4.8" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.6" fill="#fff3c4"/>`).join('');
    }
    if (a.head === 'kosa') {
      const pts = [[64, 66], [66, 74], [67, 82], [68, 90], [68, 98]];
      front += pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="5.5" fill="${hc}" stroke="${shade(hc, 0.7)}" stroke-width="1"/>`).join('');
      front += `<path d="M62 102 l6 -4 l6 4 l-6 4z" fill="${acc}"/>`;
    }

    // ---- обличчя
    const eyes = sleep
      ? `<path d="M40 48 q3.5 2.5 7 0 M53 48 q3.5 2.5 7 0" stroke="#2A1E14" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<circle cx="43.5" cy="47.5" r="2.2" fill="#2A1E14"/><circle cx="56.5" cy="47.5" r="2.2" fill="#2A1E14"/>`;
    const brows = `<path d="M39 42.5 l8 -1.5 M53 41 l8 1.5" stroke="${fem ? shade(hc, 0.9) : hc}" stroke-width="${fem ? 1.6 : 2.4}" stroke-linecap="round"/>`;
    let mouth = `<path d="M46 61 q4 2.5 8 0" stroke="${shade(sk, 0.62)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    let fh = '';
    if (a.face === 'vusa') fh = `<path d="M50 57.5 C45 55 39 57 36 63 C41 60.5 45 60 50 60.5 C55 60 59 60.5 64 63 C61 57 55 55 50 57.5Z" fill="${hc}"/>`;
    if (a.face === 'vusa_long') fh = `<path d="M50 57.5 C44 54 36 56 33 74 C37 66 43 61.5 50 60.5 C57 61.5 63 66 67 74 C64 56 56 54 50 57.5Z" fill="${hc}"/>`;
    if (a.face === 'boroda') {
      fh = `<path d="M33 50 C33 73 41 81 50 81 C59 81 67 73 67 50 C63 61 57 63 50 63 C43 63 37 61 33 50Z" fill="${hc}"/>`
         + `<path d="M50 57.5 C45 55 39 57 37 62 C42 60.5 46 60 50 60.5 C54 60 58 60.5 63 62 C61 57 55 55 50 57.5Z" fill="${shade(hc, 0.85)}"/>`;
      mouth = '';
    }
    if (a.face !== 'none' && a.face !== 'boroda') mouth = '';
    const blush = fem ? `<circle cx="39" cy="55" r="3.5" fill="#e8846b" opacity=".35"/><circle cx="61" cy="55" r="3.5" fill="#e8846b" opacity=".35"/>` : '';

    let extra = '';
    if (a.extra === 'serezhka') extra = `<circle cx="33" cy="55" r="2.8" fill="none" stroke="#C9A23F" stroke-width="1.8"/>`;
    if (a.extra === 'lyulka') extra = `<path d="M55 62 L70 68" stroke="#5a3a1e" stroke-width="2.6" stroke-linecap="round"/><path d="M68 62 h8 v8 a4 4 0 0 1 -8 0z" fill="#5a3a1e"/>`;

    return `<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${back}
      <path d="M8 110 C10 86 27 76 50 76 C73 76 90 86 92 110Z" fill="${coat}"/>
      <path d="M50 80 L45 110 M50 80 L55 110" stroke="#C9A23F" stroke-width="2" opacity=".85"/>
      <path d="M40 77 L50 93 L60 77Z" fill="#f3ead6"/>
      <path d="M42.5 79 l7.5 11.5 l7.5 -11.5" stroke="#8E1F1F" stroke-width="1.8" stroke-dasharray="2 1.6" fill="none"/>
      <rect x="43" y="62" width="14" height="17" rx="5" fill="${skD}"/>
      <ellipse cx="33" cy="49" rx="3.5" ry="6" fill="${skD}"/><ellipse cx="67" cy="49" rx="3.5" ry="6" fill="${skD}"/>
      <ellipse cx="50" cy="47" rx="17" ry="20" fill="${sk}"/>
      ${blush}${top}${brows}${eyes}
      <path d="M50 49 q3 5.5 0 8" stroke="${skD}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      ${mouth}${fh}${extra}${front}
    </svg>`;
  }

  const CHAIR = `<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 108 V40 C12 10 88 10 88 40 V108Z" fill="#4a2c18" stroke="#24140a" stroke-width="3"/>
    <path d="M20 104 V42 C20 20 80 20 80 42 V104Z" fill="#6e1a1a"/>
    <path d="M26 16 Q50 -4 74 16" stroke="#C9A23F" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="7" r="4" fill="#C9A23F"/>
    <g fill="#C9A23F">${[28, 38, 50, 62, 72].map((x, i) => `<circle cx="${x}" cy="${[30, 24, 22, 24, 30][i]}" r="1.8"/>`).join('')}</g>
  </svg>`;

  return { OPTS, random, norm, svg, CHAIR };
})();
