"""Логіка гри «Козацька рада: Зрада в Чигирині».

Сервер — ведучий. Модуль не знає про мережу: тільки стан партії,
дії гравців і перехід між фазами. Час — через self.clock (для тестів).
"""
import random
import secrets
import time
from collections import Counter

MIN_PLAYERS = 8
MAX_PLAYERS = 14

ROLE_NAMES = {
    'traitor': 'Зрадник',
    'werewolf': 'Перевертень',
    'kharakternyk': 'Характерник',
    'healer': 'Знахар',
    'jura': 'Джура',
    'scribe': 'Писар',
    'elder': 'Старшина',
}
EVIL = {'traitor', 'werewolf'}

# Склад за кількістю гравців (довідник v7; 11 — додано: як 12, але на 1 Старшину менше)
COMPOSITION = {
    8:  dict(traitor=2, werewolf=0, kharakternyk=1, healer=1, jura=0, scribe=1, elder=3),
    9:  dict(traitor=2, werewolf=0, kharakternyk=1, healer=1, jura=0, scribe=1, elder=4),
    10: dict(traitor=2, werewolf=0, kharakternyk=1, healer=1, jura=0, scribe=1, elder=5),
    11: dict(traitor=2, werewolf=1, kharakternyk=1, healer=1, jura=1, scribe=1, elder=4),
    12: dict(traitor=2, werewolf=1, kharakternyk=1, healer=1, jura=1, scribe=1, elder=5),
    13: dict(traitor=2, werewolf=1, kharakternyk=1, healer=1, jura=1, scribe=1, elder=6),
    14: dict(traitor=3, werewolf=1, kharakternyk=1, healer=1, jura=1, scribe=1, elder=6),
}

DEFAULT_SETTINGS = dict(
    roles=30,      # знайомство з роллю
    night=45,      # ніч
    morning=10,    # оголошення ранку
    day=300,       # обговорення
    defense=40,    # захист — на КОЖНОГО кандидата
    vote=30,       # голосування
    verdict=8,     # оголошення вироку
    table='oval',  # форма столу: oval / round / long
    cloth='red',   # сукно: red / green / oak
)
TABLE_SHAPES = ('oval', 'round', 'long')
CLOTHS = ('red', 'green', 'oak')
AVATAR_KEYS = ('head', 'face', 'extra', 'hair', 'coat', 'skin', 'accent')

BOT_NAMES = ['Остап', 'Тарас', 'Андрій', 'Мирон', 'Богдан', 'Семен', 'Іван', 'Петро',
             'Данило', 'Яким', 'Северин', 'Лука', 'Гнат', 'Максим']


class GameError(Exception):
    pass


class Player:
    def __init__(self, name, bot=False):
        self.id = secrets.token_hex(4)
        self.token = secrets.token_urlsafe(16)
        self.name = name
        self.bot = bot
        self.role = None
        self.alive = True
        self.revealed = False      # роль відкрита (усунений радою)
        self.connected = bot
        self.avatar = None         # зовнішність (клієнт малює; None — випадкова за id)

    @property
    def evil(self):
        return self.role in EVIL


class Room:
    def __init__(self, code, clock=time.time, rng=None):
        self.code = code
        self.clock = clock
        self.rng = rng or random.Random()
        self.players = {}          # id -> Player, порядок = місця в колі
        self.host = None
        self.settings = dict(DEFAULT_SETTINGS)
        self.phase = 'lobby'
        self.deadline = None
        self.round = 0
        self.last_active = clock()
        self._reset_game()

    # ------------------------------------------------------------ службове
    def _reset_game(self):
        self.round = 0
        self.actions = {}          # нічні вибори: id -> id цілі або None
        self.submitted = set()
        self.ready = set()
        self.last_heal = None
        self.shot_used = False
        self.nominee = None
        self.votes = {}
        self.candidates = []
        self.nominated_by = set()
        self.defense_idx = 0
        self.log = []              # публічний літопис
        self.secret_log = []       # відкривається у фіналі
        self.private = {}          # id -> [нотатки лише для гравця]
        self.scribe_checks = {}    # id перевіреного -> 'traitor' | 'clean'
        self.scribe_mode = 'check' # цієї ночі: 'check' | 'arrest'
        self.arrest_used = False   # арешт Писаря — раз за гру
        self.announcement = None
        self.winner = None
        self.after_verdict = None

    def _set_phase(self, phase, seconds=None):
        self.phase = phase
        self.deadline = self.clock() + seconds if seconds else None

    def _p(self, pid):
        p = self.players.get(pid)
        if not p:
            raise GameError('Гравця не знайдено')
        return p

    def _require_host(self, pid):
        if pid != self.host:
            raise GameError('Це може зробити лише господар ради')

    def alive(self):
        return [p for p in self.players.values() if p.alive]

    def _note(self, pid, text):
        self.private.setdefault(pid, []).append(dict(round=self.round, text=text))

    def _log(self, text, kind='info'):
        self.log.append(dict(round=self.round, phase=self.phase, text=text, kind=kind))

    def _name(self, pid):
        p = self.players.get(pid)
        return p.name if p else '—'

    # ------------------------------------------------------------ лобі
    def add_player(self, name, bot=False):
        if self.phase != 'lobby':
            raise GameError('Рада вже почалась')
        if len(self.players) >= MAX_PLAYERS:
            raise GameError(f'Рада повна ({MAX_PLAYERS} гравців)')
        name = (name or '').strip()[:20]
        if not name:
            raise GameError("Введи козацьке ім'я")
        taken = {p.name.lower() for p in self.players.values()}
        base, n = name, 2
        while name.lower() in taken:
            name = f'{base} {n}'
            n += 1
        p = Player(name, bot=bot)
        self.players[p.id] = p
        if self.host is None and not bot:
            self.host = p.id
        return p

    def add_bots(self, pid):
        self._require_host(pid)
        free = [n for n in BOT_NAMES if n.lower() not in {p.name.lower() for p in self.players.values()}]
        while len(self.players) < MAX_PLAYERS:
            self.add_player(f'🤖 {free.pop(0) if free else "Бот"}', bot=True)

    def kick(self, pid, target):
        self._require_host(pid)
        if self.phase != 'lobby':
            raise GameError('Вигнати можна лише до початку')
        if target == self.host:
            raise GameError('Не можна вигнати себе')
        self.players.pop(target, None)

    def update_settings(self, pid, values):
        self._require_host(pid)
        if self.phase != 'lobby':
            raise GameError('Налаштування — лише до початку')
        limits = dict(roles=(10, 120), night=(20, 180), day=(60, 900), defense=(20, 180), vote=(15, 90))
        for k, (lo, hi) in limits.items():
            if k in values:
                self.settings[k] = max(lo, min(hi, int(values[k])))
        if values.get('table') in TABLE_SHAPES:
            self.settings['table'] = values['table']
        if values.get('cloth') in CLOTHS:
            self.settings['cloth'] = values['cloth']

    def set_avatar(self, pid, data):
        if self.phase != 'lobby':
            raise GameError('Зовнішність змінюється лише до початку ради')
        if not isinstance(data, dict):
            raise GameError('Некоректна зовнішність')
        clean = {}
        for k in AVATAR_KEYS:
            v = data.get(k)
            if isinstance(v, str) and 0 < len(v) <= 16 and all(c.isalnum() or c in '#_' for c in v):
                clean[k] = v
        self._p(pid).avatar = clean

    def set_connected(self, pid, value):
        p = self.players.get(pid)
        if not p:
            return
        p.connected = value
        if not value and pid == self.host:
            nxt = next((q for q in self.players.values() if q.connected and not q.bot), None)
            if nxt:
                self.host = nxt.id
        if value and (self.host is None or not self.players[self.host].connected):
            self.host = pid

    def start(self, pid):
        self._require_host(pid)
        if self.phase != 'lobby':
            raise GameError('Рада вже почалась')
        n = len(self.players)
        if n < MIN_PLAYERS:
            raise GameError(f'Потрібно щонайменше {MIN_PLAYERS} гравців (зараз {n})')
        roles = [r for r, c in COMPOSITION[n].items() for _ in range(c)]
        self.rng.shuffle(roles)
        for p, r in zip(self.players.values(), roles):
            p.role, p.alive, p.revealed = r, True, False
        self._log('Гетьман скликав раду. Серед старшини — зрадники.', 'start')
        self._set_phase('roles', self.settings['roles'])

    def set_ready(self, pid):
        if self.phase != 'roles':
            return
        self.ready.add(pid)
        if all(p.id in self.ready or p.bot for p in self.players.values()):
            self._begin_night()

    # ------------------------------------------------------------ ніч
    def night_kind(self, p):
        if not p.alive:
            return None
        if p.role == 'kharakternyk' and self.shot_used:
            return 'watch'
        if p.role == 'elder':
            return 'watch'
        return p.role

    def valid_targets(self, p):
        kind = self.night_kind(p)
        if not kind:
            return []
        out = []
        for q in self.alive():
            if q.id == p.id and not (kind == 'healer' and self.last_heal != p.id):
                continue
            if kind in ('traitor', 'werewolf') and q.evil:
                continue
            out.append(q.id)
        return out

    def _begin_night(self):
        self.round += 1
        self.actions, self.submitted = {}, set()
        self.announcement = None
        self.nominee = None
        self.votes = {}
        self.candidates = []
        self.nominated_by = set()
        self.scribe_mode = 'check'
        self._set_phase('night', self.settings['night'])
        self._log(f'Ніч {self.round}. Чигирин засинає…', 'night')

    def arrest_targets(self, p):
        """Писар може арештувати раз за гру — лише того, хто показав «👍 зрадник»."""
        if p.role != 'scribe' or not p.alive or self.arrest_used:
            return []
        return [pid for pid, r in self.scribe_checks.items()
                if r == 'traitor' and self.players[pid].alive]

    def night_pick(self, pid, target, mode=None):
        if self.phase != 'night':
            raise GameError('Зараз не ніч')
        p = self._p(pid)
        if pid in self.submitted:
            raise GameError('Вибір уже зроблено')
        if mode is not None and p.role == 'scribe':
            if mode == 'arrest' and not self.arrest_targets(p):
                raise GameError('Арештувати можна лише перевіреного зрадника, раз за гру')
            if mode in ('check', 'arrest') and mode != self.scribe_mode:
                self.scribe_mode = mode
                self.actions[pid] = None
        allowed = (self.arrest_targets(p) if p.role == 'scribe' and self.scribe_mode == 'arrest'
                   else self.valid_targets(p))
        if target is not None and target not in allowed:
            raise GameError('Цього гравця обрати не можна')
        self.actions[pid] = target

    def night_submit(self, pid, target='__keep'):
        if target != '__keep':
            self.night_pick(pid, target)
        if self.phase != 'night':
            raise GameError('Зараз не ніч')
        p = self._p(pid)
        if not p.alive:
            raise GameError('Привиди не діють уночі')
        self.actions.setdefault(pid, None)
        self.submitted.add(pid)
        # Ніч не закінчується раніше таймера — інакше легко вирахувати ролі.

    def _traitor_target(self, blocked):
        traitors = [p for p in self.alive() if p.role == 'traitor']
        if not traitors or any(t.id == blocked for t in traitors):
            return None
        # Вибір живих людей важливіший за вибір ботів (боти лише для тренування)
        humans = [t for t in traitors if not t.bot and self.actions.get(t.id)]
        pool = humans or traitors
        picks = [self.actions.get(t.id) for t in pool]
        picks = [x for x in picks if x and self.players[x].alive]
        if not picks:
            return None
        cnt = Counter(picks)
        top = max(cnt.values())
        tied = [x for x in picks if cnt[x] == top]   # порядок місць = порядок першого вибору
        return self.rng.choice(sorted(set(tied)))

    def _resolve_night(self):
        by_role = {}
        for p in self.alive():
            by_role.setdefault(p.role, []).append(p)

        def one(role):
            lst = by_role.get(role)
            return lst[0] if lst else None

        jura, healer, scribe = one('jura'), one('healer'), one('scribe')
        wolf, kh = one('werewolf'), one('kharakternyk')

        blocked = self.actions.get(jura.id) if jura else None
        secret = []
        if blocked:
            secret.append(f'Джура {jura.name} заблокував {self._name(blocked)}.')
            self._note(jura.id, f'Ти блокував нічну дію: {self._name(blocked)}.')

        t_target = self._traitor_target(blocked)
        traitors_alive = by_role.get('traitor', [])
        if traitors_alive:
            if any(t.id == blocked for t in traitors_alive):
                secret.append('Зрадників заблоковано — їхній удар зірвався.')
            elif t_target:
                secret.append(f'Зрадники обрали {self._name(t_target)}.')
                for t in traitors_alive:
                    self._note(t.id, f'Спільна ціль зрадників: {self._name(t_target)}.')

        w_target = None
        if wolf:
            if wolf.id == blocked:
                secret.append('Перевертня заблоковано.')
            else:
                w_target = self.actions.get(wolf.id)
                if w_target:
                    secret.append(f'Перевертень обрав {self._name(w_target)}.')
                    self._note(wolf.id, f'Твоя ціль: {self._name(w_target)}.')

        k_target = None
        if kh and not self.shot_used:
            if kh.id == blocked:
                if self.actions.get(kh.id):
                    secret.append('Характерника заблоковано — удар не відбувся (не витрачено).')
            else:
                k_target = self.actions.get(kh.id)
                if k_target:
                    self.shot_used = True
                    secret.append(f'Характерник ударив {self._name(k_target)}.')
                    self._note(kh.id, f'Ти використав свій удар: {self._name(k_target)}.')

        heal = None
        if healer:
            if healer.id == blocked:
                secret.append('Знахаря заблоковано.')
                self._note(healer.id, 'Цієї ночі ти не зміг нікого захистити.')
                self.last_heal = None
            else:
                heal = self.actions.get(healer.id)
                self.last_heal = heal
                if heal:
                    secret.append(f'Знахар захищав {self._name(heal)}.')
                    self._note(healer.id, f'Ти захищав {self._name(heal)}.')

        a_target = None
        if scribe:
            target = self.actions.get(scribe.id)
            arrest = self.scribe_mode == 'arrest'
            if scribe.id == blocked:
                if target:
                    self._note(scribe.id, 'Архіви були зачинені — ' +
                               ('арешт зірвався (не витрачено).' if arrest else 'перевірка не вдалась.'))
                    if arrest:
                        secret.append('Писаря заблоковано — арешт зірвався.')
            elif target and arrest:
                a_target = target
                self.arrest_used = True
                self._note(scribe.id, f'Ти наказав арештувати {self._name(target)}.')
                secret.append(f'Писар заарештував {self._name(target)}.')
            elif target:
                # Перевертень для Писаря завжди «чистий»
                bad = self.players[target].role == 'traitor'
                verdict = '👍 ЗРАДНИК' if bad else '👎 чистий'
                self.scribe_checks[target] = 'traitor' if bad else 'clean'
                self._note(scribe.id, f'Перевірка: {self._name(target)} — {verdict}.')
                secret.append(f'Писар перевірив {self._name(target)}: {verdict}.')

        attacks = [x for x in (t_target, w_target, k_target, a_target) if x]
        deaths = []
        for x in dict.fromkeys(attacks):          # одна ціль = одна смерть
            if x == heal:
                secret.append(f'{self._name(x)} врятовано Знахарем!')
                continue
            if self.players[x].alive:
                deaths.append(x)
        for x in deaths:
            self.players[x].alive = False

        self.secret_log.append(dict(round=self.round, lines=secret or ['Ніч минула без дій.']))
        names = [self._name(x) for x in deaths]
        self.announcement = dict(kind='morning', round=self.round, deaths=names)
        self._set_phase('morning', self.settings['morning'])
        if names:
            self._log(f'Світанок {self.round}: знайдено з підозрілим листом — {", ".join(names)}.', 'death')
        else:
            self._log(f'Світанок {self.round}: ніч минула спокійно.', 'calm')
        self._check_win()

    # ------------------------------------------------------------ день
    # Як у класичній мафії: вдень збираємо кандидатів, кожен кандидат має слово
    # на захист, потім кожен живий голосує за ОДНОГО кандидата (або «нікого»).
    # Хто набрав найбільше голосів — усунутий одразу, без порогу 50%+1.
    # Нічия на першому місці або перемога «нікого» — ніхто не вибуває.
    NOBODY = '__none'

    def _begin_day(self):
        self.candidates = []           # [{id, by}] у порядку висунення
        self.nominated_by = set()      # хто вже висував сьогодні
        self.defense_idx = 0
        self.nominee = None
        self.votes = {}
        self.announcement = None
        self._set_phase('day', self.settings['day'])

    def nominate(self, pid, target):
        if self.phase != 'day':
            raise GameError('Висувати можна лише під час обговорення')
        p, t = self._p(pid), self._p(target)
        if not p.alive:
            raise GameError('Привиди не висувають')
        if not t.alive or t.id == p.id:
            raise GameError('Цього гравця висунути не можна')
        if pid in self.nominated_by:
            raise GameError('Сьогодні ти вже висунув кандидата')
        if any(c['id'] == t.id for c in self.candidates):
            raise GameError('Його вже висунули')
        self.candidates.append(dict(id=t.id, by=p.id))
        self.nominated_by.add(pid)
        self._log(f'{p.name} висуває {t.name}.', 'nominate')

    def to_vote(self, pid):
        """Господар завершує обговорення достроково."""
        self._require_host(pid)
        if self.phase != 'day':
            raise GameError('Зараз не обговорення')
        self._end_discussion()

    def _end_discussion(self):
        if not self.candidates:
            self._log('Ніхто не висунутий — рада розходиться.', 'info')
            self._begin_night()
            return
        self.defense_idx = 0
        self._start_defense()

    def _start_defense(self):
        self.nominee = self.candidates[self.defense_idx]['id']
        self._set_phase('defense', self.settings['defense'])

    def end_defense(self, pid):
        if self.phase != 'defense':
            raise GameError('Зараз не захист')
        if pid not in (self.nominee, self.host):
            raise GameError('Завершити захист може лише висунутий')
        self._next_defense()

    def _next_defense(self):
        self.defense_idx += 1
        if self.defense_idx < len(self.candidates):
            self._start_defense()
        else:
            self._begin_vote()

    def _begin_vote(self):
        self.nominee = None
        self.votes = {}
        self._set_phase('vote', self.settings['vote'])

    def vote(self, pid, target):
        if self.phase != 'vote':
            raise GameError('Зараз не голосування')
        p = self._p(pid)
        if not p.alive:
            raise GameError('Привиди не голосують')
        if target is None:
            target = self.NOBODY
        if target != self.NOBODY and not any(c['id'] == target for c in self.candidates):
            raise GameError('Голосувати можна лише за висунутих')
        self.votes[pid] = target
        if self._vote_decided():
            self._resolve_vote()

    def tally(self):
        cnt = Counter(self.votes.values())
        out = {c['id']: cnt.get(c['id'], 0) for c in self.candidates}
        out[self.NOBODY] = cnt.get(self.NOBODY, 0)
        return out

    def _vote_decided(self):
        """Усі проголосували, або лідера вже ніхто не наздожене."""
        voters = self.alive()
        left = sum(1 for q in voters if q.id not in self.votes)
        if left == 0:
            return True
        counts = sorted(self.tally().values(), reverse=True)
        second = counts[1] if len(counts) > 1 else 0
        return counts[0] - second > left

    def _resolve_vote(self):
        t = self.tally()
        top = max(t.values())
        leaders = [k for k, v in t.items() if v == top]
        if top > 0 and len(leaders) == 1 and leaders[0] != self.NOBODY:
            p = self.players[leaders[0]]
            p.alive, p.revealed = False, True
            self.announcement = dict(kind='verdict', eliminated=True, name=p.name, role=p.role, votes=top)
            self._log(f'Рада усунула гравця {p.name} ({top} голосів). Роль: {ROLE_NAMES[p.role]}.', 'verdict')
            self._check_win()
        else:
            tie = len(leaders) > 1
            reason = 'tie' if tie else 'nobody'
            names = [self._name(x) for x in leaders if x != self.NOBODY]
            self.announcement = dict(kind='verdict', eliminated=False, reason=reason, names=names, votes=top)
            if tie:
                self._log(f'Голоси розділились ({top} : {top}) — ніхто не усунутий.', 'acquit')
            else:
                self._log('Рада вирішила нікого не виганяти.', 'acquit')
        self._set_phase('verdict', self.settings['verdict'])

    # ------------------------------------------------------------ перемога
    def _check_win(self):
        alive = self.alive()
        evil = sum(1 for p in alive if p.evil)
        good = len(alive) - evil
        if evil == 0:
            self.winner = 'good'
        elif evil >= good:
            self.winner = 'evil'

    def _end(self):
        self._set_phase('end')
        if self.winner == 'good':
            self._log('Усіх зрадників викрито. Чигирин встояв!', 'win')
        else:
            self._log('Зрада перемогла. Чигирин впав.', 'lose')

    # ------------------------------------------------------------ таймер
    def timeout(self):
        """Викликається сервером, коли сплив час фази (або господар пропустив)."""
        ph = self.phase
        if ph == 'roles':
            self._begin_night()
        elif ph == 'night':
            self._resolve_night()
        elif ph == 'morning':
            self._end() if self.winner else self._begin_day()
        elif ph == 'day':
            self._end_discussion()
        elif ph == 'defense':
            self._next_defense()
        elif ph == 'vote':
            self._resolve_vote()
        elif ph == 'verdict':
            self._end() if self.winner else self._begin_night()

    def skip(self, pid):
        self._require_host(pid)
        if self.phase in ('lobby', 'end'):
            raise GameError('Нема чого пропускати')
        self.timeout()

    def restart(self, pid):
        self._require_host(pid)
        if self.phase != 'end':
            raise GameError('Нову раду можна почати після фіналу')
        for p in self.players.values():
            p.role, p.alive, p.revealed = None, True, False
        self._reset_game()
        self._set_phase('lobby')

    # ------------------------------------------------------------ боти (для тестів)
    def run_bots(self):
        bots = [p for p in self.players.values() if p.bot and p.alive]
        if self.phase == 'night':
            for b in bots:
                if b.id in self.submitted:
                    continue
                targets = self.valid_targets(b)
                choice = None
                if b.role == 'traitor':
                    mates = [self.actions.get(t.id) for t in self.alive()
                             if t.role == 'traitor' and t.id != b.id and self.actions.get(t.id)]
                    choice = mates[0] if mates else None
                if b.role == 'scribe' and self.arrest_targets(b) and self.rng.random() < 0.5:
                    self.night_pick(b.id, None, 'arrest')
                    choice = self.rng.choice(self.arrest_targets(b))
                if choice is None and targets:
                    if b.role == 'kharakternyk' and self.rng.random() < 0.6:
                        choice = None
                    else:
                        choice = self.rng.choice(targets)
                self.night_pick(b.id, choice)
                self.night_submit(b.id)
        elif self.phase == 'day' and len(self.candidates) < 2:
            free = [b for b in bots if b.id not in self.nominated_by]
            taken = {c['id'] for c in self.candidates}
            if free:
                b = self.rng.choice(free)
                opts = [p for p in self.alive() if p.id != b.id and p.id not in taken]
                if opts:
                    self.nominate(b.id, self.rng.choice(opts).id)
        elif self.phase == 'vote':
            options = [c['id'] for c in self.candidates] + [self.NOBODY]
            for b in bots:
                if b.id not in self.votes and self.phase == 'vote':
                    mine = [o for o in options if o != b.id] or [self.NOBODY]
                    self.vote(b.id, self.rng.choice(mine))

    # ------------------------------------------------------------ вигляд для клієнта
    def view(self, pid=None):
        end = self.phase == 'end'
        players = []
        for p in self.players.values():
            d = dict(id=p.id, name=p.name, alive=p.alive, bot=p.bot,
                     connected=p.connected, avatar=p.avatar)
            if (p.revealed or end) and p.role:
                d['role'] = p.role
            players.append(d)
        v = dict(
            code=self.code, phase=self.phase, round=self.round,
            deadline=int(self.deadline * 1000) if self.deadline else None,
            now=int(self.clock() * 1000),
            players=players, host=self.host, settings=self.settings,
            log=self.log[-60:], announcement=self.announcement, winner=self.winner,
            nominee=self.nominee,
            candidates=self.candidates,
            nominatedBy=list(self.nominated_by),
            tally=self.tally() if self.phase in ('vote', 'verdict') else None,
            composition=COMPOSITION.get(len(self.players)),
            submittedCount=len(self.submitted) if self.phase == 'night' else None,
        )
        if self.phase in ('vote', 'verdict'):
            v['votes'] = self.votes        # голосування відкрите, як підняття рук
        if end:
            v['secretLog'] = self.secret_log
        me = self.players.get(pid)
        if me:
            m = dict(id=me.id, name=me.name, alive=me.alive, isHost=(me.id == self.host),
                     notes=self.private.get(me.id, []))
            if self.phase != 'lobby':
                m['role'] = me.role
                m['ready'] = me.id in self.ready
                if me.evil:
                    m['allies'] = [dict(id=q.id, name=q.name, role=q.role, alive=q.alive)
                                   for q in self.players.values() if q.evil and q.id != me.id]
                if me.role == 'kharakternyk':
                    m['shotUsed'] = self.shot_used
                if me.role == 'healer':
                    m['lastHeal'] = self.last_heal
                if me.role == 'scribe':
                    m['checks'] = self.scribe_checks
                    m['arrestUsed'] = self.arrest_used
            if self.phase == 'night' and me.alive:
                at = self.arrest_targets(me)
                arrest = me.role == 'scribe' and self.scribe_mode == 'arrest'
                n = dict(kind=self.night_kind(me),
                         targets=at if arrest else self.valid_targets(me),
                         mode=self.scribe_mode if me.role == 'scribe' else None,
                         canArrest=bool(at),
                         pick=self.actions.get(me.id), submitted=me.id in self.submitted)
                if me.role == 'traitor':
                    n['teamPicks'] = {q.id: self.actions.get(q.id) for q in self.alive()
                                      if q.role == 'traitor' and q.id != me.id}
                m['night'] = n
            v['me'] = m
        return v
