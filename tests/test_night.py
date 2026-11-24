"""Перевірка нічних ролей. Запуск: python tests/test_night.py"""
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from game import Room  # noqa: E402

ORDER = ['traitor', 'traitor', 'traitor', 'werewolf', 'kharakternyk', 'healer', 'jura', 'scribe',
         'elder', 'elder', 'elder', 'elder', 'elder', 'elder']


def setup(bots=False):
    room = Room('T', rng=random.Random(3))
    host = room.add_player('Г')
    for i in range(13):
        room.add_player(f'П{i}', bot=bots)
    room.start(host.id)
    ps = list(room.players.values())
    for p, r in zip(ps, ORDER):        # фіксовані ролі
        p.role = r
    room.timeout()                     # ролі → ніч
    assert room.phase == 'night'
    R = {}
    for p in ps:
        R.setdefault(p.role, []).append(p)
    return room, ps, R


def night(room, picks):
    for pid, t in picks.items():
        room.night_pick(pid, t)
        room.night_submit(pid)
    room.timeout()                     # ніч → ранок
    return room.announcement['deaths']


def notes(room, p):
    return [n['text'] for n in room.private.get(p.id, [])]


def test_scribe_sees_traitor():
    room, ps, R = setup()
    sc, t = R['scribe'][0], R['traitor'][0]
    night(room, {sc.id: t.id})
    assert room.view(sc.id)['me']['checks'] == {t.id: 'traitor'}
    assert any('ЗРАДНИК' in x for x in notes(room, sc))
    print('✓ Писар бачить зрадника (checks + запис)')


def test_scribe_werewolf_clean():
    room, ps, R = setup()
    sc, w = R['scribe'][0], R['werewolf'][0]
    night(room, {sc.id: w.id})
    assert room.view(sc.id)['me']['checks'] == {w.id: 'clean'}
    print('✓ Перевертень для Писаря — «чистий»')


def test_checks_private():
    room, ps, R = setup()
    sc, t, el = R['scribe'][0], R['traitor'][0], R['elder'][0]
    night(room, {sc.id: t.id})
    assert 'checks' not in room.view(el.id)['me'] and 'checks' not in room.view(None)
    print('✓ результати Писаря бачить лише Писар')


def test_healer_saves():
    room, ps, R = setup()
    victim = R['elder'][0]
    picks = {t.id: victim.id for t in R['traitor']}
    picks[R['healer'][0].id] = victim.id
    assert night(room, picks) == [] and victim.alive
    print('✓ Знахар рятує жертву зрадників')


def test_jura_blocks_traitors_and_notes():
    room, ps, R = setup()
    victim, j = R['elder'][0], R['jura'][0]
    picks = {t.id: victim.id for t in R['traitor']}
    picks[j.id] = R['traitor'][1].id
    assert night(room, picks) == [] and victim.alive
    assert any('блокував' in x for x in notes(room, j))
    print('✓ Джура блокує зрадників і отримує запис')


def test_two_deaths():
    room, ps, R = setup()
    a, b = R['elder'][0], R['elder'][1]
    picks = {t.id: a.id for t in R['traitor']}
    picks[R['werewolf'][0].id] = b.id
    assert sorted(night(room, picks)) == sorted([a.name, b.name])
    print('✓ зрадники і Перевертень — дві смерті')


def test_human_traitor_beats_bots():
    room, ps, R = setup(bots=True)
    human = next(p for p in R['traitor'] if not p.bot)
    room.run_bots()                    # боти-спільники вже обрали навмання
    for role in ('healer', 'jura', 'kharakternyk'):   # щоб не заважали перевірці
        room.actions[R[role][0].id] = None
    target = next(p for p in R['elder'] if p.alive and p.id not in room.actions.values())
    night(room, {human.id: target.id})
    assert not target.alive, 'вибір людини проігноровано'
    print('✓ вибір зрадника-людини важливіший за ботів')


def test_kharakternyk_one_shot():
    room, ps, R = setup()
    k, a = R['kharakternyk'][0], R['elder'][2]
    night(room, {k.id: a.id})
    assert not a.alive and room.shot_used
    room.timeout(); room.timeout()     # ранок → день → (без кандидатів) ніч
    assert room.phase == 'night' and room.night_kind(k) == 'watch'
    print('✓ Характерник: один удар, далі лише спостерігає')


def test_scribe_arrest():
    room, ps, R = setup()
    sc, t = R['scribe'][0], R['traitor'][0]
    # до перевірки арешт недоступний
    try:
        room.night_pick(sc.id, None, 'arrest')
        raise AssertionError('арешт без перевірки')
    except Exception as e:
        assert 'перевіреного' in str(e)
    night(room, {sc.id: t.id})                         # ніч 1: перевірка → 👍
    room.timeout(); room.timeout()                     # ранок → день → ніч
    assert room.view(sc.id)['me']['night']['canArrest']
    room.night_pick(sc.id, None, 'arrest')
    # арештувати можна лише перевіреного зрадника
    other = R['elder'][3]
    try:
        room.night_pick(sc.id, other.id)
        raise AssertionError('арешт неперевіреного')
    except Exception:
        pass
    deaths = night(room, {sc.id: t.id})
    assert t.name in deaths and room.arrest_used
    room.timeout(); room.timeout()
    assert not room.view(sc.id)['me']['night']['canArrest']
    print('✓ Писар: арешт лише перевіреного 👍, раз за гру')


def test_arrest_blocked_not_spent():
    room, ps, R = setup()
    sc, t, j = R['scribe'][0], R['traitor'][0], R['jura'][0]
    night(room, {sc.id: t.id})
    room.timeout(); room.timeout()
    room.night_pick(sc.id, None, 'arrest')
    deaths = night(room, {sc.id: t.id, j.id: sc.id})
    assert t.name not in deaths and not room.arrest_used
    print('✓ заблокований арешт не витрачається')


def test_check_mode_default_each_night():
    room, ps, R = setup()
    sc, t = R['scribe'][0], R['traitor'][0]
    night(room, {sc.id: t.id})
    room.timeout(); room.timeout()
    assert room.view(sc.id)['me']['night']['mode'] == 'check'
    print('✓ кожної ночі Писар за замовчуванням перевіряє')


if __name__ == '__main__':
    for f in [test_scribe_arrest, test_arrest_blocked_not_spent, test_check_mode_default_each_night,test_scribe_sees_traitor, test_scribe_werewolf_clean, test_checks_private, test_healer_saves,
              test_jura_blocks_traitors_and_notes, test_two_deaths, test_human_traitor_beats_bots,
              test_kharakternyk_one_shot]:
        f()
    print('OK')
