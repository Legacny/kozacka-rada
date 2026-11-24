'use strict';
/* Козацька рада: Зрада в Чигирині — клієнт */

const ROLES = {
  traitor: {
    name: 'Зрадник', icon: '🗡️', team: 'evil', teamName: 'Вороже зло · таємний союзник Порти',
    quote: 'Колись ти присягав козацькій раді. Але золото Стамбула виявилось переконливішим за честь. Тепер ти — очі й вуха Порти серед старшини.',
    rules: ['Знаєш спільників і Перевертня з першого ходу.', 'Вночі разом зі спільниками обираєте одну жертву.', 'Вдень відводь підозри, але не захищай своїх надто очевидно.', 'Мета: зло ≥ живих мирних.'],
    night: 'Оберіть жертву разом зі спільниками',
  },
  werewolf: {
    name: 'Перевертень', icon: '🦊', team: 'evil', teamName: 'Вороже зло · незалежний убивця',
    quote: 'Ти знаєш справжнє обличчя кожного зрадника, але не підкоряєшся нікому. Писар ніколи не знайде тебе: для нього ти — чистий козак.',
    rules: ['Знаєш усіх Зрадників.', 'Вночі сам обираєш ВЛАСНУ жертву.', 'Писар завжди бачить тебе «чистим».', 'Вдень поводься як Старшина. Перемагаєш зі Зрадниками.'],
    night: 'Обери власну жертву',
  },
  kharakternyk: {
    name: 'Характерник', icon: '⚔️', team: 'good', teamName: 'Мирна сторона · козак-вігілант',
    quote: 'Кажуть, характерники бачать зраду в чужих очах ще до того, як та встигне вдарити. Ти маєш право на одну страту — лише одну.',
    rules: ['Щоночі прокидаєшся.', 'РАЗ ЗА ГРУ можеш усунути будь-кого без голосування.', 'Не готовий — пропусти. Пропускати можна скільки завгодно.', 'Ти — єдиний шанс проти Перевертня.'],
    night: 'Удар раз за гру: обери ціль або пропусти',
  },
  healer: {
    name: 'Знахар', icon: '🌿', team: 'good', teamName: 'Мирна сторона · козацький цілитель',
    quote: 'Кожна ніч може стати чиєюсь останньою — але не якщо ти вибереш правильно. Твоя сила — захист.',
    rules: ['Вночі захищаєш одного гравця від будь-якого удару.', 'Себе — можна, але не дві ночі поспіль.', 'Результат дізнаєшся вранці разом з усіма.'],
    night: 'Кого захистити цієї ночі?',
  },
  jura: {
    name: 'Джура', icon: '🏹', team: 'good', teamName: 'Мирна сторона · козацький розвідник',
    quote: 'У раді стіни мають вуха. Одна заблокована дія може врятувати ніч — або провалити всю гру.',
    rules: ['Вночі блокуєш дію одного гравця.', 'Заблокував Зрадника чи Перевертня — їхня жертва виживає.', 'Не знаєш ролі цілі — дієш на здогад.'],
    night: 'Чию нічну дію заблокувати?',
  },
  scribe: {
    name: 'Писар', icon: '📜', team: 'good', teamName: 'Мирна сторона · генеральний писар',
    quote: 'Перо — твоя зброя, архіви — твоя фортеця. Але одне ім\'я назавжди залишиться чистим — навіть якщо ця чистота брехня.',
    rules: ['Щоночі обираєш: 🔍 перевірити одного (👍 зрадник / 👎 чистий) АБО ⛓️ арештувати.', 'Арешт — РАЗ ЗА ГРУ і лише того, хто показав 👍.', 'Перевертень ЗАВЖДИ «чистий».', 'Позначки 👍/👎 бачиш біля гравців. Не відкривайся зарано.'],
    night: 'Чиє ім\'я перевірити в архівах?',
  },
  elder: {
    name: 'Старшина', icon: '🛡️', team: 'good', teamName: 'Мирна сторона · кістяк ради',
    quote: 'У тебе немає таємних карт. Але є найважливіше: розум, слово і право голосу. Один голос може вирішити все.',
    rules: ['Нічних дій не маєш.', 'Вдень слухай, шукай суперечності, аргументуй.', 'Хто кого захищав — часто видає союзників зла.'],
    night: 'Кому з ради ти довіряєш найбільше?',
  },
};
const WATCH_NIGHT = 'Кому з ради ти довіряєш найбільше?';
const PHASES = {
  lobby: 'Збір ради', roles: 'Роздача ролей', night: 'Ніч', morning: 'Світанок',
  day: 'Рада', defense: 'Захист', vote: 'Голосування', verdict: 'Вирок', end: 'Фінал',
};
const COMP_ORDER = ['traitor', 'werewolf', 'kharakternyk', 'healer', 'jura', 'scribe', 'elder'];

const $ = (s) => document.querySelector(s);
const app = $('#app');
const isScreen = location.pathname.startsWith('/screen');
const params = new URLSearchParams(location.search);

let ws = null;
let S = null;
let clockOffset = 0;
let session = load();
const ui = { sheet: null, flipped: false, selected: null, annSeen: null, narrow: innerWidth < 640 };

function load() { try { return JSON.parse(localStorage.getItem('kr_session')); } catch { return null; } }
function save(v) { session = v; v ? localStorage.setItem('kr_session', JSON.stringify(v)) : localStorage.removeItem('kr_session'); }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const P = (id) => S?.players.find((p) => p.id === id);
const pname = (id) => esc(P(id)?.name ?? '—');

function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('show'), 3200);
}

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onopen = () => {
    $('.conn')?.remove();
    if (isScreen) {
      const r = params.get('room');
      if (r) send({ type: 'screen', room: r }); else render();
    } else if (session) {
      send({ type: 'join', room: session.room, token: session.token });
    } else render();
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === 'joined') save({ room: m.room, token: m.token });
    else if (m.type === 'state') {
      const prevPhase = S?.phase;
      S = m.state;
      clockOffset = S.now - Date.now();
      if (isScreen) SFX.onState(S);
      if (prevPhase !== S.phase) { ui.selected = null; ui.noteOpen = false; if (S.phase === 'roles') { ui.sheet = 'role'; ui.flipped = false; } }
      if (S.me && S.phase === 'lobby' && !ui.avatarSent && !P(S.me.id)?.avatar) {
        ui.avatarSent = true;
        setAvatar(AVATAR.norm(JSON.parse(localStorage.getItem('kr_avatar') || 'null'), Math.random() * 1e9));
      }
      render();
    } else if (m.type === 'left') { save(null); S = null; render(); }
    else if (m.type === 'error') {
      toast(m.message);
      if (/не знайдено/.test(m.message) && !S) { save(null); render(); }
    }
  };
  ws.onclose = () => {
    if (!$('.conn')) document.body.insertAdjacentHTML('beforeend', '<div class="conn">Зв\'язок втрачено… перепідключення</div>');
    setTimeout(connect, 1500);
  };
}

/* ------------------------------------------------------------------ рендер */
function render() {
  document.body.classList.toggle('night', S?.phase === 'night');
  document.body.classList.toggle('screen-mode', isScreen);
  document.body.classList.toggle('end-evil', S?.phase === 'end' && S?.winner === 'evil');
  if (isScreen) return renderScreen();
  if (!S || !S.me) return renderHome();
  if (S.phase === 'lobby') return renderLobby();
  if (S.phase === 'end') return renderEnd();
  renderGame();
}

function renderHome() {
  const code = params.get('room') || '';
  app.innerHTML = `
  <div class="home">
    <div class="crest">⚜️</div>
    <h1 class="title">Козацька рада</h1>
    <div class="sub">Зрада в Чигирині · 1678</div>
    <div class="parchment legend">
      Чигирин під облогою. Серед старшини є ті, хто вже продався Порті.
      Гетьман дав раді одне завдання: <b>знайти зрадників до світанку</b> — словом, аргументом і голосуванням.
    </div>
    <label for="nm">Твоє козацьке ім'я</label>
    <input id="nm" maxlength="20" autocomplete="off" placeholder="Напр., Остап" value="${esc(localStorage.getItem('kr_name') || '')}">
    ${code ? '' : `<div style="margin-top:14px"><button class="btn gold wide" id="create">Скликати нову раду</button></div>
    <div class="divider">— або приєднатись —</div>`}
    <label for="code">Код ради</label>
    <input id="code" maxlength="4" autocomplete="off" placeholder="ABCD" style="text-transform:uppercase;letter-spacing:6px" value="${esc(code)}">
    <div style="margin-top:12px"><button class="btn wide" id="join">Приєднатися</button></div>
    <p class="muted small" style="text-align:center;margin-top:22px">Екран для проектора: <a style="color:var(--gold)" href="#" id="scr">відкрити</a></p>
  </div>`;
  const nm = () => { const v = $('#nm').value.trim(); if (!v) { toast('Введи ім\'я'); return null; } localStorage.setItem('kr_name', v); return v; };
  $('#create')?.addEventListener('click', () => { const n = nm(); if (n) send({ type: 'create', name: n }); });
  $('#join').addEventListener('click', () => {
    const n = nm(); const c = $('#code').value.trim().toUpperCase();
    if (!n) return; if (c.length !== 4) return toast('Код — 4 літери');
    send({ type: 'join', room: c, name: n });
  });
  $('#scr').addEventListener('click', (e) => {
    e.preventDefault();
    const c = $('#code').value.trim().toUpperCase();
    if (c.length !== 4) return toast('Спершу введи код ради');
    location.href = `/screen?room=${c}`;
  });
}

function compChips(comp) {
  if (!comp) return '<span class="muted small">Склад з’явиться від 8 гравців</span>';
  return COMP_ORDER.filter((r) => comp[r]).map((r) =>
    `<span class="chip ${ROLES[r].team}">${ROLES[r].icon} ${ROLES[r].name} × ${comp[r]}</span>`).join('');
}

function renderLobby() {
  const me = S.me; const host = me.isHost; const n = S.players.length;
  const link = `${location.origin}/?room=${S.code}`;
  const opt = (vals, cur, fmt) => vals.map((v) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${fmt(v)}</option>`).join('');
  app.innerHTML = `
  <div class="lobby">
    <div class="code-box">
      <div class="muted">Код ради</div>
      <div class="code">${S.code}</div>
      <div class="linkline">${esc(link)}</div>
    </div>
    ${sceneHTML({ lobby: true })}
    ${avatarEditorHTML()}
    <div class="parchment" style="margin-top:14px">
      <h3>Старшина в зборі: ${n} / 14</h3>
      <ul class="plist">
        ${S.players.map((p, i) => `<li class="${p.connected ? '' : 'off'}">
          <span>${i + 1}.</span><span class="nm">${esc(p.name)}${p.id === S.host ? ' 👑' : ''}${p.id === me.id ? ' (ти)' : ''}</span>
          ${host && p.id !== me.id ? `<button class="x" data-kick="${p.id}" aria-label="Вигнати ${esc(p.name)}">✕</button>` : ''}
        </li>`).join('')}
      </ul>
      <div class="small"><b>Склад на ${n} гравців:</b></div>
      <div class="chips">${compChips(S.composition)}</div>
      ${host ? `
      <div class="settings">
        <div><label for="sday">Рада (день)</label><select id="sday">${opt([180, 300, 420, 600], S.settings.day, (v) => `${v / 60} хв`)}</select></div>
        <div><label for="snight">Ніч</label><select id="snight">${opt([30, 45, 60, 90], S.settings.night, (v) => `${v} с`)}</select></div>
        <div><label for="stable">Стіл</label><select id="stable">${opt(Object.keys(TABLE.NAMES), S.settings.table, (v) => TABLE.NAMES[v])}</select></div>
        <div><label for="scloth">Сукно</label><select id="scloth">${opt(Object.keys(TABLE.CLOTHS), S.settings.cloth, (v) => TABLE.CLOTHS[v])}</select></div>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn ghost" id="bots" style="color:var(--ink);border-color:var(--ink)" ${n >= 14 ? 'disabled' : ''}>🤖 Додати ботів (тест)</button>
        <button class="btn gold" id="start" ${n < 8 ? 'disabled' : ''}>Почати раду</button>
      </div>
      ${n < 8 ? `<p class="small muted">Потрібно щонайменше 8 гравців. Найкраще — 14.</p>` : ''}`
      : `<p class="status-line">Чекаємо, поки господар почне раду…</p>`}
    </div>
    <div class="row" style="margin-top:14px">
      <button class="btn ghost" id="leave">Вийти</button>
    </div>
  </div>`;
  app.querySelectorAll('[data-kick]').forEach((b) => b.addEventListener('click', () => send({ type: 'kick', target: b.dataset.kick })));
  $('#bots')?.addEventListener('click', () => send({ type: 'add_bots' }));
  $('#start')?.addEventListener('click', () => send({ type: 'start' }));
  $('#sday')?.addEventListener('change', (e) => send({ type: 'settings', values: { day: +e.target.value } }));
  $('#snight')?.addEventListener('change', (e) => send({ type: 'settings', values: { night: +e.target.value } }));
  $('#stable')?.addEventListener('change', (e) => send({ type: 'settings', values: { table: e.target.value } }));
  $('#scloth')?.addEventListener('change', (e) => send({ type: 'settings', values: { cloth: e.target.value } }));
  bindAvatarEditor();
  $('#leave').addEventListener('click', () => { send({ type: 'leave' }); save(null); S = null; render(); });
}

/* ---------- ігровий екран ---------- */
function promptText() {
  const me = S.me; const ph = S.phase;
  if (ph === 'roles') return 'Таємно переглянь свою роль і запам’ятай її';
  if (!me.alive && ph !== 'verdict' && ph !== 'morning') return '👻 Ти привид. Спостерігай мовчки — правда відкриється у фіналі';
  if (ph === 'night') {
    const n = me.night;
    if (!n) return 'Чигирин спить…';
    if (n.submitted) return '🌙 Вибір зроблено. Чекай на світанок…';
    if (n.kind === 'scribe' && n.mode === 'arrest') return '⛓️ Кого з викритих зрадників арештувати?';
    return n.kind === 'watch' ? WATCH_NIGHT : ROLES[n.kind].night;
  }
  if (ph === 'morning') return 'Світанок над Чигирином';
  if (ph === 'day') {
    if (ui.selected) return `Висунути ${pname(ui.selected)}?`;
    if (S.nominatedBy.includes(me.id)) return 'Твій кандидат висунутий. Обговорюйте!';
    return 'Обговорюйте! Торкнись гравця, щоб висунути кандидата';
  }
  if (ph === 'defense') return S.nominee === me.id ? 'Твоє слово! Переконай раду' : `Слово має ${pname(S.nominee)} — слухайте`;
  if (ph === 'vote') {
    const v = S.votes?.[me.id];
    if (v) return v === NOBODY ? 'Твій голос: нікого не виганяти. Можна змінити' : `Твій голос: ${pname(v)}. Можна змінити`;
    return 'Голосуй! Торкнись кандидата — хто набере найбільше, той вибуває';
  }
  if (ph === 'verdict') return 'Рада вирішила';
  return '';
}

function tileClass(p) {
  const me = S.me; const c = ['tile'];
  if (p.id === me?.id) c.push('me');
  if (!p.alive) c.push('dead');
  if (!p.connected && !p.bot) c.push('off');
  if (me?.allies?.some((a) => a.id === p.id)) c.push('ally');
  if (isCandidate(p.id) && ['day', 'defense', 'vote', 'verdict'].includes(S.phase)) c.push('candidate');
  if (S.nominee === p.id && S.phase === 'defense') c.push('nominee');
  const sel = S.phase === 'night' ? me?.night?.pick : S.phase === 'vote' ? S.votes?.[me?.id] : ui.selected;
  if (sel === p.id) c.push('selected');
  if (S.votes && p.id in S.votes) c.push('voted');
  if (canSelect(p)) c.push('selectable');
  return c.join(' ');
}

function canSelect(p) {
  const me = S.me; if (!me || !me.alive) return false;
  if (S.phase === 'night') return !!me.night && !me.night.submitted && me.night.targets.includes(p.id);
  if (S.phase === 'day') return p.alive && p.id !== me.id && !isCandidate(p.id) && !S.nominatedBy.includes(me.id);
  if (S.phase === 'vote') return isCandidate(p.id);
  return false;
}

const NOBODY = '__none';
const isCandidate = (id) => (S.candidates || []).some((c) => c.id === id);

function voteBadge(p) {
  if (S.tally && isCandidate(p.id)) return `✋ ${S.tally[p.id] || 0}`;
  if (isCandidate(p.id)) return '⚖️ кандидат';
  if (S.votes && p.id in S.votes) return '✓';
  return '';
}

function badge(p) {
  const me = S.me;
  const vb = ['day', 'defense', 'vote', 'verdict'].includes(S.phase) ? voteBadge(p) : '';
  if (vb) return vb;
  if (p.role) return `${ROLES[p.role].icon} ${ROLES[p.role].name}`;
  if (!p.alive) return '👻';
  if (me?.night?.teamPicks && Object.values(me.night.teamPicks).includes(p.id)) return '🗡️ ціль спільника';
  if (p.id === me?.id) return 'ти';
  return '';
}

function screenBadge(p) {
  const vb = ['day', 'defense', 'vote', 'verdict'].includes(S.phase) ? voteBadge(p) : '';
  if (vb) return vb;
  if (p.role) return `${ROLES[p.role].icon} ${ROLES[p.role].name}`;
  return '';
}

function tallyHTML() {
  if (!S.tally) return '';
  const rows = (S.candidates || []).map((c) => [pname(c.id), S.tally[c.id] || 0]);
  rows.push(['Нікого', S.tally[NOBODY] || 0]);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const voted = Object.keys(S.votes || {}).length;
  const alive = S.players.filter((p) => p.alive).length;
  return `<div class="tally-list">${rows.sort((a, b) => b[1] - a[1]).map(([n, v]) =>
    `<div class="trow"><span class="tn">${n}</span><span class="tbar"><i style="width:${(v / max) * 100}%"></i></span><b>${v}</b></div>`).join('')}
    <div class="small muted">Проголосували ${voted} з ${alive}</div></div>`;
}

/* Сцена: стіл ради з людьми на кріслах */
function sceneHTML({ forScreen = false, lobby = false } = {}) {
  const portrait = !forScreen && innerWidth < 700;
  const g = TABLE.geom(S.settings.table, portrait);
  const pos = TABLE.seats(g, S.players.length);
  const sleep = S.phase === 'night';
  const seats = S.players.map((p, i) => {
    const s = pos[i];
    const sel = !forScreen && !lobby && canSelect(p);
    let cls = lobby ? `seat${p.id === S.me?.id ? ' me' : ''}${p.connected || p.bot ? '' : ' off'}` : tileClass(p).replace(/^tile/, 'seat');
    if (forScreen) cls = cls.replace(/ (me|ally|selected|selectable)\b/g, '');
    const av = AVATAR.svg(AVATAR.norm(p.avatar, p.id), { sleep });
    const b = forScreen ? screenBadge(p) : lobby ? '' : badge(p);
    return `<button class="${cls}" style="left:${s.left}%;top:${s.top}%;width:${s.w}%;z-index:${s.z}" data-pid="${p.id}" ${sel ? '' : 'disabled'} aria-label="${esc(p.name)}">
      <span class="chair">${AVATAR.CHAIR}</span><span class="fig">${av}</span>
      ${p.alive ? '' : '<span class="ghost-mark">👻</span>'}
      ${!forScreen && !lobby && S.me?.checks?.[p.id] ? (S.me.checks[p.id] === 'traitor'
        ? '<span class="check-mark bad" title="Перевірка Писаря: зрадник">👍</span>'
        : '<span class="check-mark good" title="Перевірка Писаря: чистий">👎</span>') : ''}
      <span class="plate">${esc(p.name)}</span>${b ? `<span class="badge">${b}</span>` : ''}
    </button>`;
  }).join('');
  const center = lobby ? `<b>${S.code}</b><span>код ради</span>` : centerHTML();
  const maxW = forScreen ? `max-width:calc(84vh * ${g.W / g.H});` : '';
  return `<div class="scene-wrap ${g.portrait ? 'portrait' : ''}"><div class="scene shape-${g.shape}" style="aspect-ratio:${g.W}/${g.H};${maxW}">
    ${TABLE.svg(g, S.settings.cloth)}${seats}<div class="table-plate">${center}</div></div></div>`;
}

function centerHTML() {
  const ph = S.phase;
  if (ph === 'defense' && S.nominee) {
    const i = S.candidates.findIndex((c) => c.id === S.nominee);
    return `<span>слово має (${i + 1}/${S.candidates.length})</span><b>${pname(S.nominee)}</b>`;
  }
  if (ph === 'vote' && S.tally) {
    const voted = Object.keys(S.votes || {}).length;
    const alive = S.players.filter((p) => p.alive).length;
    return `<b>Голосування</b><span>проголосували ${voted}/${alive}</span>`;
  }
  if (ph === 'day' && S.candidates?.length) {
    return `<b>Рада ${S.round}</b><span>кандидатів: ${S.candidates.length}</span>`;
  }
  const alive = S.players.filter((p) => p.alive).length;
  return `<b>${PHASES[ph]}${S.round ? ' ' + S.round : ''}</b><span>живих: ${alive}</span>`;
}

/* Редактор зовнішності */
function myAvatar() {
  const p = P(S.me.id);
  return AVATAR.norm(p?.avatar || JSON.parse(localStorage.getItem('kr_avatar') || 'null'), S.me.id);
}
function setAvatar(a) {
  localStorage.setItem('kr_avatar', JSON.stringify(a));
  send({ type: 'avatar', avatar: a });
}
function avatarEditorHTML() {
  const a = myAvatar(); const O = AVATAR.OPTS;
  const sel = (k, label) => `<div><label for="av-${k}">${label}</label><select id="av-${k}" data-av="${k}">
    ${O[k].map(([v, l]) => `<option value="${v}" ${a[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
  const sw = (k, label) => `<div class="sw-row"><span>${label}</span>${O[k].map((c) =>
    `<button class="sw ${a[k] === c ? 'on' : ''}" style="background:${c}" data-sw="${k}" data-v="${c}" aria-label="${label} ${c}"></button>`).join('')}</div>`;
  return `<div class="parchment av-editor">
    <h3>Твоя зовнішність за столом</h3>
    <div class="av-row">
      <div class="av-preview"><span class="chair">${AVATAR.CHAIR}</span><span class="fig">${AVATAR.svg(a)}</span></div>
      <div class="av-controls">
        ${sel('head', 'Голова')}${sel('face', 'Вуса / борода')}${sel('extra', 'Прикраса')}
      </div>
    </div>
    ${sw('hair', 'Волосся')}${sw('coat', 'Жупан')}${sw('skin', 'Обличчя')}${sw('accent', 'Шлик, хустка, стрічки')}
    <button class="btn ghost" id="av-rand" style="color:var(--ink);border-color:var(--ink);margin-top:8px">🎲 Випадково</button>
  </div>`;
}
function bindAvatarEditor() {
  app.querySelectorAll('[data-av]').forEach((s) => s.addEventListener('change', () => setAvatar({ ...myAvatar(), [s.dataset.av]: s.value })));
  app.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => setAvatar({ ...myAvatar(), [b.dataset.sw]: b.dataset.v })));
  $('#av-rand')?.addEventListener('click', () => setAvatar(AVATAR.random()));
}

/* Таємна звістка після ночі (Писар, Знахар, Характерник): згорнута, щоб сусід не підглянув */
function privateNoteHTML() {
  const fresh = (S.me.notes || []).filter((n) => n.round === S.round);
  if (!fresh.length || !['day', 'defense', 'vote'].includes(S.phase)) return '';
  return ui.noteOpen
    ? `<button class="private-note" data-act="note">📜 <b>Лише для тебе (ніч ${S.round}):</b><br>${fresh.map((n) => esc(n.text)).join('<br>')}<br><span class="small muted">Торкнись, щоб сховати</span></button>`
    : `<button class="private-note" data-act="note">📜 <b>Таємна звістка для тебе</b> — торкнись, щоб прочитати</button>`;
}

function actionsHTML() {
  const me = S.me; const ph = S.phase;
  if (ph === 'roles') return `<div class="row"><button class="btn gold" data-act="role">🎴 Моя роль</button><button class="btn" data-act="ready" ${me.ready ? 'disabled' : ''}>${me.ready ? 'Готовий ✓' : 'Готовий'}</button></div>`;
  const note = privateNoteHTML();
  if (!me.alive) return note;
  if (note) return note + actionsMain(me, ph);
  return actionsMain(me, ph);
}

function actionsMain(me, ph) {
  if (ph === 'night' && me.night) {
    const n = me.night;
    if (n.submitted) return `<div class="status-line muted">Решта ради ще вирішує…</div>`;
    const arrest = n.mode === 'arrest';
    const pick = n.pick ? `${arrest ? 'Арештувати' : 'Обрано'}: <b>${pname(n.pick)}</b>` : 'Торкнись гравця';
    const skipLbl = n.kind === 'kharakternyk' ? 'Стиснути кулак (пропуск)' : 'Пропустити';
    // Писар: перемикач «перевірити / арештувати» (арешт — раз за гру, лише перевіреного 👍)
    const modes = n.kind === 'scribe' ? `<div class="mode-switch" role="radiogroup" aria-label="Дія Писаря">
        <button class="btn ${arrest ? 'ghost' : 'on'}" role="radio" aria-checked="${!arrest}" data-act="mode-check">🔍 Перевірити</button>
        <button class="btn ${arrest ? 'red on' : 'ghost'}" role="radio" aria-checked="${arrest}" data-act="mode-arrest" ${n.canArrest ? '' : 'disabled'}>⛓️ Арештувати</button>
      </div>${n.canArrest ? '' : `<div class="small muted" style="text-align:center">${S.me.arrestUsed ? 'Арешт уже використано.' : 'Арешт відкриється, коли знайдеш 👍 зрадника.'}</div>`}` : '';
    return `${modes}<div class="status-line">${pick}</div>
      <div class="row"><button class="btn ghost" data-act="skip-night">${skipLbl}</button>
      <button class="btn gold" data-act="submit" ${n.pick ? '' : 'disabled'}>Підтвердити</button></div>`;
  }
  const cands = S.candidates?.length
    ? `<div class="status-line small">Кандидати: ${S.candidates.map((c) => `<b>${pname(c.id)}</b> <span class="muted">(висунув ${pname(c.by)})</span>`).join(', ')}</div>` : '';
  if (ph === 'day') {
    const host = me.isHost ? `<button class="btn gold" data-act="to-vote">${S.candidates.length ? 'До захисту й голосування' : 'Завершити раду (нікого)'}</button>` : '';
    if (ui.selected) return `${cands}<div class="row"><button class="btn ghost" data-act="unselect">Скасувати</button><button class="btn red" data-act="nominate">Висунути</button></div>`;
    return `${cands}${host ? `<div class="row">${host}</div>` : ''}`;
  }
  if (ph === 'defense') return `${cands}${S.nominee === me.id ? '<button class="btn gold wide" data-act="end-defense">Я закінчив захист</button>' : ''}`;
  if (ph === 'vote') {
    const v = S.votes?.[me.id];
    return `${tallyHTML()}<button class="btn ghost wide ${v === NOBODY ? 'on' : ''}" data-act="vote-none">🤝 Нікого не виганяти</button>`;
  }
  return '';
}

function renderGame() {
  ui.narrow = innerWidth < 700;
  const me = S.me;
  app.innerHTML = `
  <div class="game">
    <header class="top">
      <span class="crest" aria-hidden="true">⚜️</span>
      <div class="ph"><b>${PHASES[S.phase]}${S.round ? ' · ' + S.round : ''}</b><span class="timer" data-timer></span></div>
      ${me.isHost ? '<button class="icon-btn" data-act="skipphase" title="Пропустити фазу" aria-label="Пропустити фазу">⏭</button>' : '<span style="width:48px"></span>'}
    </header>
    <div class="prompt">${promptText()}</div>
    <div class="board">
      <div class="table-col">${sceneHTML()}</div>
      <aside class="side-log parchment">${logHTML()}</aside>
    </div>
    <footer class="foot">
    <div class="actions">${actionsHTML()}</div>
    <nav class="bottom">
      <button class="round-btn" data-act="role"><span>🎴</span><span>Моя роль</span></button>
      <button class="round-btn" data-act="log"><span>📜</span><span>Літопис</span></button>
      <button class="round-btn" data-act="rules"><span>?</span><span>Правила</span></button>
    </nav>
    </footer>
    ${overlayHTML()}
  </div>`;
  bindGame();
  tick();
}

function overlayHTML() {
  const ann = S.announcement;
  if (ann && (S.phase === 'morning' || S.phase === 'verdict') && !ui.sheet) {
    let head, body, seal;
    if (ann.kind === 'morning') {
      head = `Світанок ${ann.round}`;
      body = ann.deaths.length
        ? `Цієї ночі знайдено з підозрілим листом:<br><b>${ann.deaths.map(esc).join(', ')}</b>`
        : 'Ніч минула спокійно. Усі живі.';
      seal = ann.deaths.length ? '✉️' : '☀️';
    } else if (ann.eliminated) {
      head = 'Вирок ради';
      body = `Найбільше голосів (${ann.votes}) набрав:<br><b>${esc(ann.name)}</b>
        <div class="ann-art ${ROLES[ann.role].team}">${ART[ann.role]}</div>Роль: <b>${ROLES[ann.role].name}</b>`;
      seal = '⚖️';
    } else {
      head = 'Вирок ради';
      body = ann.reason === 'tie'
        ? `Голоси розділились порівну (${ann.votes} : ${ann.votes})<br><b>${[...ann.names.map(esc), ...(ann.names.length < 2 ? ['«нікого»'] : [])].join(' і ')}</b><br>Ніхто не усунутий.`
        : 'Рада вирішила нікого не виганяти.';
      seal = '🤝';
    }
    return `<div class="overlay center"><div class="sheet parchment gramota">
      <div class="head">${head}</div><div class="body">${body}</div><div class="seal-sm">${seal}</div>
      <div class="timer" data-timer style="color:var(--ink);margin-top:10px"></div></div></div>`;
  }
  if (ui.sheet === 'role') return `<div class="overlay" data-close><div class="sheet" style="background:transparent;padding:16px 0 24px">${roleCardHTML()}
    <div style="text-align:center;margin-top:12px"><button class="btn ghost" data-act="close-sheet">Сховати</button></div></div></div>`;
  if (ui.sheet === 'log') return `<div class="overlay" data-close><div class="sheet parchment"><button class="close" data-act="close-sheet" aria-label="Закрити">✕</button>${logHTML()}</div></div>`;
  if (ui.sheet === 'rules') return `<div class="overlay" data-close><div class="sheet parchment"><button class="close" data-act="close-sheet" aria-label="Закрити">✕</button>${rulesHTML()}</div></div>`;
  return '';
}

function roleCardHTML() {
  const me = S.me; const r = ROLES[me.role];
  if (!r) return '';
  const allies = me.allies?.length ? `<div class="notes"><b>Твої спільники:</b> ${me.allies.map((a) => `${ROLES[a.role].icon} ${esc(a.name)}${a.alive ? '' : ' (👻)'}`).join(', ')}</div>` : '';
  const shot = me.role === 'kharakternyk' ? `<div class="notes">${me.shotUsed ? '⚔️ Удар уже використано.' : '⚔️ Удар ще не використано.'}</div>` : '';
  const notes = me.notes?.length ? `<div class="notes"><b>Твої записи:</b><br>${me.notes.map((n) => `Ніч ${n.round}: ${esc(n.text)}`).join('<br>')}</div>` : '';
  return `<div class="card-scene" data-act="flip">
    <div class="card ${ui.flipped ? 'flipped' : ''}">
      <div class="face back-side"><div class="seal">⚜️</div><div class="title" style="font-size:22px">Таємна грамота</div><div>Торкнись, щоб прочитати.<br>Ніхто не має бачити!</div></div>
      <div class="face front ${r.team} ${me.role}">
        <div class="role-art">${ART[me.role]}</div>
        <h2 class="role-name">${r.name}</h2>
        <div class="role-team ${r.team}">${r.teamName}</div>
        <div class="quote">«${r.quote}»</div>
        <ul class="rules">${r.rules.map((x) => `<li>${x}</li>`).join('')}</ul>
        ${allies}${shot}${notes}
        ${me.alive ? '' : `<div class="ann-art" style="background:linear-gradient(#1B2640,#0F1626)">${ART.ghost}</div><div class="notes">👻 Ти вибув із ради. Спостерігай мовчки — правда відкриється у фіналі.</div>`}
      </div>
    </div></div>`;
}

function logHTML() {
  const items = S.log.slice().reverse().map((l) => `<li class="${l.kind}">${esc(l.text)}</li>`).join('');
  return `<h3>📜 Літопис ради</h3><ul class="log">${items || '<li>Поки що тиша…</li>'}</ul>`;
}

function rulesHTML() {
  return `<h3>Правила ради</h3>
  <p><b>Мета мирних:</b> усунути всіх Зрадників і Перевертня. <b>Мета зла:</b> щоб зла стало стільки ж, скільки мирних.</p>
  <p><b>Ніч:</b> кожен обирає гравця (так ніхто не здогадається, хто має роль). Зрадники разом обирають жертву, Перевертень — свою, Характерник може вдарити раз за гру, Джура блокує дію, Знахар захищає, Писар перевіряє.</p>
  <p><b>День:</b> обговорюйте вголос. Кожен живий може висунути одного кандидата. Коли час сплине, кожен кандидат має слово на захист, потім відкрите голосування: кожен голосує за одного кандидата або «нікого».</p>
  <p><b>Вирок:</b> хто набрав <b>найбільше</b> голосів — одразу вибуває і відкриває роль (не треба 50%+1). Нічия на першому місці або перемога «нікого» — ніхто не вибуває. Якщо лідера вже не наздогнати, голосування закінчується одразу.</p>
  <h3>Ролі</h3>
  ${COMP_ORDER.map((k) => `<p><b>${ROLES[k].icon} ${ROLES[k].name}</b> — ${ROLES[k].rules.join(' ')}</p>`).join('')}
  <p><b>👻 Привид</b> — вибулий гравець: мовчки спостерігає, не голосує.</p>`;
}

function bindGame() {
  app.querySelectorAll('.seat[data-pid]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.pid;
    if (S.phase === 'night') send({ type: 'pick', target: S.me.night.pick === id ? null : id });
    else if (S.phase === 'day') { ui.selected = ui.selected === id ? null : id; render(); }
    else if (S.phase === 'vote') send({ type: 'vote', target: id });
  }));
  app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const a = b.dataset.act;
    if (a === 'role') { ui.sheet = 'role'; ui.flipped = false; render(); }
    else if (a === 'log' || a === 'rules') { ui.sheet = a; render(); }
    else if (a === 'close-sheet') { ui.sheet = null; ui.flipped = false; render(); }
    else if (a === 'flip') { ui.flipped = !ui.flipped; b.querySelector('.card').classList.toggle('flipped', ui.flipped); }
    else if (a === 'ready') { send({ type: 'ready' }); ui.sheet = null; }
    else if (a === 'submit') send({ type: 'submit' });
    else if (a === 'skip-night') { send({ type: 'pick', target: null }); send({ type: 'submit' }); }
    else if (a === 'unselect') { ui.selected = null; render(); }
    else if (a === 'nominate') { send({ type: 'nominate', target: ui.selected }); ui.selected = null; }
    else if (a === 'end-defense') send({ type: 'end_defense' });
    else if (a === 'note') { ui.noteOpen = !ui.noteOpen; render(); }
    else if (a === 'mode-check') send({ type: 'pick', target: null, mode: 'check' });
    else if (a === 'mode-arrest') send({ type: 'pick', target: null, mode: 'arrest' });
    else if (a === 'vote-none') send({ type: 'vote', target: null });
    else if (a === 'to-vote') send({ type: 'to_vote' });
    else if (a === 'skipphase') send({ type: 'skip' });
    else if (a === 'restart') send({ type: 'restart' });
  }));
  app.querySelectorAll('.overlay[data-close]').forEach((o) => o.addEventListener('click', (e) => {
    if (e.target === o) { ui.sheet = null; ui.flipped = false; render(); }
  }));
}

/* ---------- фінал ---------- */
function revealHTML() {
  return `<div class="reveal-grid">${S.players.map((p, i) => {
    const r = ROLES[p.role];
    return `<div class="reveal ${r.team} ${p.alive ? '' : 'dead'}" style="animation-delay:${i * 120}ms">
      <div class="ic ${r.team}">${ART[p.role]}</div><div class="nm">${esc(p.name)}</div><div class="small">${r.name}${p.alive ? '' : ' · 👻'}</div></div>`;
  }).join('')}</div>`;
}

function chronicleHTML() {
  const sec = (S.secretLog || []).map((s) => `<li><b>Ніч ${s.round}</b>${s.lines.map((l) => `<div class="secret">${esc(l)}</div>`).join('')}</li>`).join('');
  return `<h3>🕯️ Таємний літопис ночей</h3><ul class="log">${sec}</ul>`;
}

function renderEnd() {
  const good = S.winner === 'good';
  app.innerHTML = `
  <div class="end">
    <div class="winner">
      <div style="font-size:60px">${good ? '🏰' : '🔥'}</div>
      <h1 class="title">${good ? 'Чигирин встояв!' : 'Чигирин впав…'}</h1>
      <p class="sub" style="font-family:var(--font-serif);font-size:19px">${good ? 'Усіх зрадників викрито. Перемога мирної сторони.' : 'Зрада перемогла. Перемога Зрадників і Перевертня.'}</p>
    </div>
    ${revealHTML()}
    <div class="parchment" style="margin-top:18px">${chronicleHTML()}</div>
    <div class="parchment" style="margin-top:14px">${logHTML()}</div>
    <div class="row" style="margin-top:16px">
      ${S.me?.isHost ? '<button class="btn gold" data-act="restart">Нова рада з тими ж гравцями</button>' : '<p class="status-line">Господар може почати нову раду</p>'}
    </div>
  </div>`;
  bindGame();
}

/* ---------- проектор ---------- */
function renderScreen() {
  if (!S) {
    app.innerHTML = `<div class="home"><h1 class="title">Екран ради</h1>
      <label for="code">Код ради</label><input id="code" maxlength="4" style="text-transform:uppercase;letter-spacing:6px">
      <div style="margin-top:12px"><button class="btn wide" id="go">Показати</button></div></div>`;
    $('#go').addEventListener('click', () => { location.href = `/screen?room=${$('#code').value.trim().toUpperCase()}`; });
    return;
  }
  if (S.phase === 'lobby') {
    app.innerHTML = `<div class="screen" style="grid-template-columns:1fr"><div class="join-big">
      <h1 class="title" style="font-size:64px">Козацька рада</h1>
      <p style="font-size:28px">Зайди з телефона: <b style="color:var(--gold)">${esc(location.host)}</b> і введи код</p>
      <div class="code-box"><div class="code">${S.code}</div></div>
      <p style="font-size:28px">Старшина в зборі: ${S.players.length} / 14</p>
      <div class="chips" style="justify-content:center;font-size:24px">${S.players.map((p) => `<span class="chip">${esc(p.name)}</span>`).join('')}</div>
    </div></div>`;
    return;
  }
  if (S.phase === 'end') {
    app.innerHTML = `<div class="end" style="max-width:1400px"><div class="winner"><h1 class="title" style="font-size:72px">${S.winner === 'good' ? '🏰 Чигирин встояв!' : '🔥 Чигирин впав…'}</h1></div>
      ${revealHTML()}<div class="parchment" style="margin-top:18px">${chronicleHTML()}</div></div>`;
    return;
  }
  const ann = S.announcement;
  let annHTML = '';
  if (ann && (S.phase === 'morning' || S.phase === 'verdict')) {
    if (ann.kind === 'morning') annHTML = ann.deaths.length ? `✉️ Знайдено з підозрілим листом: <b>${ann.deaths.map(esc).join(', ')}</b>` : '☀️ Ніч минула спокійно';
    else annHTML = ann.eliminated ? `⚖️ Рада усунула <b>${esc(ann.name)}</b> (${ann.votes} голосів) — ${ROLES[ann.role].icon} ${ROLES[ann.role].name}`
      : ann.reason === 'tie' ? `🤝 Голоси розділились (${ann.votes} : ${ann.votes}) — ніхто не вибуває` : '🤝 Рада вирішила нікого не виганяти';
  }
  app.innerHTML = `<div class="screen">
    <div>${sceneHTML({ forScreen: true })}</div>
    <div class="panel">
      <div class="phase-big">${PHASES[S.phase]} ${S.round || ''}</div>
      <span class="timer" data-timer></span>
      ${annHTML ? `<div class="parchment gramota"><div class="body">${annHTML}</div></div>` : ''}
      ${S.phase === 'vote' || S.phase === 'verdict' ? `<div class="parchment">${tallyHTML()}</div>` : ''}
      ${['day', 'defense'].includes(S.phase) && S.candidates?.length ? `<div class="parchment"><b>Кандидати:</b> ${S.candidates.map((c) => pname(c.id)).join(', ')}</div>` : ''}
      <div class="parchment" style="flex:1;overflow:auto;max-height:50vh">${logHTML()}</div>
      <div class="muted" style="text-align:center">Код ради: <b>${S.code}</b></div>
    </div></div>`;
  tick();
}

/* ---------- таймер ---------- */
function tick() {
  const els = document.querySelectorAll('[data-timer]');
  if (!S?.deadline) { els.forEach((e) => { e.textContent = ''; }); return; }
  const left = Math.max(0, Math.ceil((S.deadline - (Date.now() + clockOffset)) / 1000));
  if (isScreen) SFX.onTimer(S, left);
  const txt = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  els.forEach((e) => { e.textContent = txt; e.classList.toggle('hot', left <= 10); });
}
setInterval(tick, 250);
addEventListener('resize', () => { const n = innerWidth < 700; if (n !== ui.narrow && S && !isScreen) { ui.narrow = n; render(); } });

/* ---------- панель звуку (лише проектор) ---------- */
function soundPanel() {
  const el = document.createElement('div');
  el.className = 'sound-panel';
  document.body.appendChild(el);
  const draw = () => {
    el.innerHTML = SFX.enabled
      ? `<button class="icon-btn" id="snd-t" title="Вимкнути звук" aria-label="Вимкнути звук">🔊</button>
         <input type="range" id="snd-v" min="0" max="1" step="0.05" value="${SFX.volume}" aria-label="Гучність">`
      : `<button class="btn gold" id="snd-t">🔈 Увімкнути звук ради</button>`;
    el.querySelector('#snd-t').addEventListener('click', () => { SFX.setEnabled(!SFX.enabled); if (S) SFX.onState(S); draw(); });
    el.querySelector('#snd-v')?.addEventListener('input', (e) => SFX.setVolume(+e.target.value));
  };
  draw();
}
if (isScreen) soundPanel();

connect();
