'use strict';
/* Власні SVG-ілюстрації ролей «Козацької ради». Палітра — зі скілу дизайну. */

const ART = (() => {
  const C = {
    ink: '#2A1E14', parch: '#EADBB8', parchD: '#CDB88A', gold: '#C9A23F', goldD: '#8a6d22',
    red: '#8E1F1F', blue: '#2F5B8C', sage: '#5E7A4A', ember: '#E0702A', skin: '#D9B58C', skinD: '#b8916a',
    night: '#0F1626',
  };
  const defs = (id) => `<defs>
    <radialGradient id="glow${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
    <linearGradient id="steel${id}" x1="0" x2="1"><stop offset="0" stop-color="#e9eef2"/><stop offset="1" stop-color="#8d99a3"/></linearGradient>
  </defs>`;

  // Голова козака: чуб-оселедець, брови, вуса
  function head({ x = 100, y = 70, s = 1, mustache = true, eyes = C.ink, young = false } = {}) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <ellipse cx="-22" cy="2" rx="4" ry="7" fill="${C.skinD}"/><ellipse cx="22" cy="2" rx="4" ry="7" fill="${C.skinD}"/>
      <ellipse cx="0" cy="0" rx="22" ry="${young ? 24 : 26}" fill="${C.skin}"/>
      <path d="M-4 -24 C-2 -42 18 -46 22 -34 C24 -27 15 -24 12 -30" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>
      <path d="M-13 -7 l9 -2 M4 -9 l9 2" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="-8" cy="-1" r="2.4" fill="${eyes}"/><circle cx="8" cy="-1" r="2.4" fill="${eyes}"/>
      <path d="M0 1 q4 7 0 10" stroke="${C.skinD}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      ${mustache ? `<path d="M0 12 C-8 8 -17 11 -22 29 C-15 19 -8 17 0 16 C8 17 15 19 22 29 C17 11 8 8 0 12Z" fill="${C.ink}"/>`
                 : `<path d="M-6 15 q6 4 12 0" stroke="${C.skinD}" stroke-width="2" fill="none" stroke-linecap="round"/>`}
    </g>`;
  }
  // Плечі в жупані
  const body = (fill, trim = C.gold) => `
    <path d="M48 150 C52 116 72 100 100 100 C128 100 148 116 152 150Z" fill="${fill}"/>
    <path d="M100 100 L92 150 M100 100 L108 150" stroke="${trim}" stroke-width="2.5" opacity=".8"/>
    <path d="M86 102 Q100 112 114 102" fill="none" stroke="${trim}" stroke-width="3"/>`;

  const svg = (id, inner) => `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${defs(id)}${inner}</svg>`;

  return {
    traitor: svg('t', `
      <path d="M160 18a24 24 0 1 0 9 44a19 19 0 1 1 -9 -44z" fill="${C.gold}" opacity=".35"/>
      <circle cx="40" cy="30" r="1.5" fill="${C.parch}" opacity=".6"/><circle cx="58" cy="16" r="1" fill="${C.parch}" opacity=".6"/>
      <path d="M100 16c-24 0-36 19-36 40 0 8 2 15 5 20L48 150h104L131 76c3-5 5-12 5-20 0-21-12-40-36-40z" fill="#120a08"/>
      <ellipse cx="100" cy="58" rx="18" ry="21" fill="#2b1712"/>
      <circle cx="92" cy="57" r="2.6" fill="${C.ember}"/><circle cx="108" cy="57" r="2.6" fill="${C.ember}"/>
      <path d="M90 72 q10 5 20 0" stroke="${C.ember}" stroke-width="1.5" fill="none" opacity=".7"/>
      <g transform="rotate(-14 130 112)">
        <rect x="106" y="96" width="48" height="32" rx="2" fill="${C.parch}"/>
        <path d="M106 96l24 17 24-17" fill="none" stroke="${C.parchD}" stroke-width="2"/>
        <circle cx="130" cy="113" r="7" fill="${C.red}"/><path d="M126 113h8M130 109v8" stroke="#5a1010" stroke-width="1.5"/>
      </g>
      <g fill="${C.gold}" stroke="${C.goldD}" stroke-width="1.5">
        <ellipse cx="58" cy="138" rx="13" ry="5"/><ellipse cx="58" cy="132" rx="13" ry="5"/><ellipse cx="58" cy="126" rx="13" ry="5"/>
        <ellipse cx="80" cy="141" rx="13" ry="5"/>
      </g>`),

    werewolf: svg('w', `
      <circle cx="100" cy="78" r="56" fill="${C.gold}" opacity=".18"/>
      ${body(C.red)}
      <g>
        <path d="M100 30 A40 44 0 0 0 100 118 Z" fill="${C.skin}"/>
        <path d="M100 30 C88 24 72 30 66 44" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>
        <path d="M78 66 l10 -2" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="84" cy="72" r="2.6" fill="${C.ink}"/>
        <path d="M100 98 C92 94 84 98 80 112 C86 104 92 102 100 102Z" fill="${C.ink}"/>
      </g>
      <g>
        <path d="M100 30 L118 36 L144 8 L142 52 C146 62 146 76 140 88 L100 118 Z" fill="${C.ember}"/>
        <path d="M120 38 L138 18 L136 46Z" fill="#7a2f0f"/>
        <path d="M100 86 L140 88 L100 118 Z" fill="${C.parch}"/>
        <path d="M108 70 L130 66 L112 76Z" fill="${C.ink}"/><circle cx="118" cy="70" r="2" fill="${C.gold}"/>
        <circle cx="101" cy="98" r="4" fill="${C.ink}"/>
      </g>
      <path d="M100 26 V122" stroke="${C.gold}" stroke-width="2" stroke-dasharray="4 4"/>`),

    kharakternyk: svg('k', `
      <circle cx="100" cy="70" r="60" fill="url(#glowk)" opacity=".35"/>
      <path d="M58 120 C56 84 62 46 80 8" fill="none" stroke="url(#steelk)" stroke-width="7" stroke-linecap="round"/>
      <path d="M48 118 h22" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/>
      <path d="M59 120 v24" stroke="${C.goldD}" stroke-width="9" stroke-linecap="round"/>
      ${body(C.red)}
      ${head({ eyes: C.gold })}
      <circle cx="92" cy="69" r="6" fill="url(#glowk)"/><circle cx="108" cy="69" r="6" fill="url(#glowk)"/>
      <path d="M108 88 L138 96" stroke="#5a3a1e" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M136 90 h10 v10 a5 5 0 0 1 -10 0z" fill="#5a3a1e"/>
      <path d="M141 86 c-6 -8 6 -12 0 -20 c-6 -8 6 -12 0 -20" fill="none" stroke="${C.parch}" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>`),

    healer: svg('h', `
      <circle cx="148" cy="44" r="40" fill="url(#glowh)" opacity=".6"/>
      <rect x="141" y="58" width="14" height="60" rx="3" fill="${C.parch}"/>
      <path d="M148 58 v-6" stroke="${C.ink}" stroke-width="2"/>
      <path d="M148 30 c-7 9 -7 16 0 22 c7 -6 7 -13 0 -22z" fill="${C.ember}"/><path d="M148 38 c-3 5 -3 8 0 12 c3 -4 3 -7 0 -12z" fill="#ffe08a"/>
      <ellipse cx="148" cy="120" rx="18" ry="5" fill="${C.goldD}"/>
      <path d="M78 70 C60 74 56 96 60 118 C64 136 76 142 90 142 C104 142 116 136 120 118 C124 96 120 74 102 70 L102 58 L78 58Z" fill="#9c5a32"/>
      <path d="M76 56 h28 v6 h-28z" fill="#7a4424"/>
      <path d="M64 100 h52" stroke="${C.parch}" stroke-width="3" opacity=".5"/>
      <path d="M70 108 q6 -6 12 0 t12 0 t12 0 t12 0" fill="none" stroke="${C.parch}" stroke-width="2" opacity=".5"/>
      <g stroke="${C.sage}" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M90 58 C88 40 80 26 66 16"/><path d="M92 58 C94 38 102 24 116 14"/><path d="M90 58 C90 40 90 26 92 10"/>
      </g>
      <g fill="${C.sage}">
        <ellipse cx="72" cy="22" rx="8" ry="4" transform="rotate(35 72 22)"/><ellipse cx="80" cy="34" rx="8" ry="4" transform="rotate(50 80 34)"/>
        <ellipse cx="110" cy="20" rx="8" ry="4" transform="rotate(-35 110 20)"/><ellipse cx="102" cy="32" rx="8" ry="4" transform="rotate(-50 102 32)"/>
        <ellipse cx="92" cy="14" rx="4" ry="8"/><ellipse cx="86" cy="30" rx="3.5" ry="7" transform="rotate(-15 86 30)"/>
      </g>
      <g fill="#c58cc9"><circle cx="66" cy="16" r="3"/><circle cx="116" cy="14" r="3"/><circle cx="92" cy="8" r="3"/></g>`),

    jura: svg('j', `
      <path d="M150 36 C186 70 178 122 140 146" fill="none" stroke="#7a4a24" stroke-width="6" stroke-linecap="round"/>
      <path d="M150 36 L140 146" stroke="${C.parchD}" stroke-width="1.5"/>
      <g stroke="#7a4a24" stroke-width="3"><path d="M44 60 L60 150"/><path d="M52 58 L66 150"/></g>
      <path d="M40 56 l8 -10 l4 12z M48 54 l8 -10 l4 12z" fill="${C.red}"/>
      ${body(C.blue, C.parch)}
      ${head({ mustache: false, young: true, s: 0.95 })}
      <g>
        <path d="M84 150 C82 128 88 112 98 104" fill="none" stroke="${C.blue}" stroke-width="14" stroke-linecap="round"/>
        <ellipse cx="99" cy="98" rx="7" ry="8" fill="${C.skin}"/>
        <rect x="96.5" y="76" width="5" height="22" rx="2.5" fill="${C.skin}" stroke="${C.skinD}" stroke-width="1"/>
      </g>`),

    scribe: svg('s', `
      <path d="M30 40 h120 a10 10 0 0 1 0 20 h-4 v62 a10 10 0 0 1 -10 10 h-110 a10 10 0 0 1 0 -20 h4 v-62 a10 10 0 0 1 0 -20z" fill="${C.parch}" stroke="${C.parchD}" stroke-width="2"/>
      <path d="M30 40 a10 10 0 0 0 0 20 h10 M136 132 a10 10 0 0 0 0 -20" fill="none" stroke="${C.parchD}" stroke-width="2"/>
      <g stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" opacity=".7">
        <path d="M48 70 h72"/><path d="M48 80 h80"/><path d="M48 90 h64"/><path d="M48 100 h76"/>
      </g>
      <path d="M48 112 q8 -8 16 0 t16 0" fill="none" stroke="${C.ink}" stroke-width="2" opacity=".7"/>
      <circle cx="112" cy="116" r="10" fill="${C.red}"/><path d="M106 116h12M112 110v12" stroke="#5a1010" stroke-width="2"/>
      <path d="M118 124 l-4 14 l6 -6 l4 8 l2 -14z" fill="${C.red}"/>
      <path d="M150 70 h22 l4 30 h-30z" fill="${C.ink}"/><ellipse cx="161" cy="70" rx="11" ry="3" fill="#000"/>
      <path d="M158 72 C150 40 164 16 192 4 C182 24 178 44 160 72z" fill="#f4ecdb" stroke="${C.parchD}" stroke-width="1.5"/>
      <path d="M160 72 C166 50 176 28 190 8" stroke="${C.parchD}" stroke-width="1.5" fill="none"/>`),

    elder: svg('e', `
      <path d="M30 20 h50 v70 l-25 -12 l-25 12z" fill="${C.blue}"/><path d="M30 20 h50" stroke="${C.gold}" stroke-width="4"/>
      <path d="M55 36 l5 10 h11 l-9 7 l3 11 l-10 -6 l-10 6 l3 -11 l-9 -7 h11z" fill="${C.gold}"/>
      <path d="M120 20 h50 v70 l-25 -12 l-25 12z" fill="${C.red}"/><path d="M120 20 h50" stroke="${C.gold}" stroke-width="4"/>
      <path d="M145 36 v28 M131 50 h28" stroke="${C.gold}" stroke-width="5"/>
      <rect x="96" y="58" width="8" height="88" rx="3" fill="#6b4a2a"/>
      <rect x="94" y="126" width="12" height="8" rx="2" fill="${C.gold}"/><rect x="94" y="62" width="12" height="6" rx="2" fill="${C.gold}"/>
      <g fill="${C.gold}" stroke="${C.goldD}" stroke-width="1.5">
        <path d="M100 12 L112 22 L112 50 L100 60 L88 50 L88 22Z"/>
        <path d="M100 14 L124 28 L112 36Z"/><path d="M100 14 L76 28 L88 36Z"/>
        <path d="M100 58 L124 44 L112 36Z"/><path d="M100 58 L76 44 L88 36Z"/>
      </g>
      <circle cx="100" cy="36" r="5" fill="${C.red}"/>`),

    ghost: svg('g', `
      <path d="M0 150 V118 L24 112 V86 h10 v-8 h8 v8 h10 V112 L80 104 V70 l14 -22 l14 22 V104 L130 108 V84 h10 v-8 h8 v8 h10 V112 L184 106 L200 112 V150Z" fill="${C.night}" opacity=".85"/>
      <path d="M100 18 C72 18 60 40 60 66 V128 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 V66 C140 40 128 18 100 18Z" fill="#c7d0db" opacity=".75"/>
      <ellipse cx="88" cy="62" rx="6" ry="9" fill="${C.night}"/><ellipse cx="112" cy="62" rx="6" ry="9" fill="${C.night}"/>
      <ellipse cx="100" cy="86" rx="6" ry="8" fill="${C.night}" opacity=".7"/>`),
  };
})();
