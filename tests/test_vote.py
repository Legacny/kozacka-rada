"""Перевірка голосування за правилами мафії. Запуск: python tests/test_vote.py"""
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from game import Room  # noqa: E402


def setup(n=14):
    room = Room('T', rng=random.Random(1))
    host = room.add_player('Г')
    for i in range(n - 1):
        room.add_player(f'П{i}')
    room.start(host.id)
    room.timeout()      # ролі → ніч
    room.actions = {}   # тиха ніч
    room.timeout()      # ніч → ранок (нікого не вбито)
    room.timeout()      # ранок → день
    assert room.phase == 'day', room.phase
    ps = list(room.players.values())
    return room, ps


def to_vote(room):
    room.timeout()                       # день → захист першого
    while room.phase == 'defense':
        room.timeout()
    assert room.phase == 'vote', room.phase


def test_plurality_not_majority():
    room, ps = setup()
    room.nominate(ps[0].id, ps[1].id)
    room.nominate(ps[2].id, ps[3].id)
    room.nominate(ps[4].id, ps[5].id)
    to_vote(room)
    # 14 живих: 5 за ps1, 4 за ps3, 3 за ps5, 2 «нікого» → ps1 вилітає без 50%+1
    plan = [ps[1].id] * 5 + [ps[3].id] * 4 + [ps[5].id] * 3 + [None] * 2
    for p, t in zip(ps, plan):
        if room.phase == 'vote':
            room.vote(p.id, t)
    assert room.phase == 'verdict'
    assert room.announcement['eliminated'] and not ps[1].alive, room.announcement
    print('✓ більшість голосів (5 з 14) — усунуто')


def test_tie():
    room, ps = setup()
    room.nominate(ps[0].id, ps[1].id)
    room.nominate(ps[2].id, ps[3].id)
    to_vote(room)
    plan = [ps[1].id] * 6 + [ps[3].id] * 6 + [None] * 2
    for p, t in zip(ps, plan):
        if room.phase == 'vote':
            room.vote(p.id, t)
    assert room.phase == 'verdict' and not room.announcement['eliminated']
    assert room.announcement['reason'] == 'tie' and ps[1].alive and ps[3].alive
    print('✓ нічия 6:6 — ніхто не вибуває')


def test_nobody_wins():
    room, ps = setup()
    room.nominate(ps[0].id, ps[1].id)
    to_vote(room)
    plan = [None] * 8 + [ps[1].id] * 6
    for p, t in zip(ps, plan):
        if room.phase == 'vote':
            room.vote(p.id, t)
    assert not room.announcement['eliminated'] and room.announcement['reason'] == 'nobody'
    print('✓ «нікого» набрало більше — ніхто не вибуває')


def test_early_finish():
    room, ps = setup()
    room.nominate(ps[0].id, ps[1].id)
    room.nominate(ps[2].id, ps[3].id)
    to_vote(room)
    # 8 голосів за ps1 при 14 живих: решта 6 вже не наздожене → кінець одразу
    for p in ps[:8]:
        room.vote(p.id, ps[1].id)
    assert room.phase == 'verdict' and not ps[1].alive
    print('✓ лідера не наздогнати — голосування закінчилось одразу (8 з 14)')


def test_no_candidates():
    room, ps = setup()
    room.timeout()
    assert room.phase == 'night'
    print('✓ без кандидатів — одразу ніч')


def test_one_nomination_per_player():
    room, ps = setup()
    room.nominate(ps[0].id, ps[1].id)
    try:
        room.nominate(ps[0].id, ps[2].id)
        raise AssertionError('дозволило двічі')
    except Exception as e:
        assert 'вже' in str(e)
    print('✓ один гравець висуває лише раз на день')


if __name__ == '__main__':
    for f in [test_plurality_not_majority, test_tie, test_nobody_wins, test_early_finish,
              test_no_candidates, test_one_nomination_per_player]:
        f()
    print('OK')
