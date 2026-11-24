"""Прогін багатьох партій ботами: перевіряє, що гра завжди завершується
і правила не ламаються. Запуск: python tests/sim.py"""
import os
import random
import sys
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from game import Room, COMPOSITION, EVIL  # noqa: E402


class Clock:
    t = 1000.0

    def __call__(self):
        return self.t


def play(n, seed):
    rng = random.Random(seed)
    clock = Clock()
    room = Room('TEST', clock=clock, rng=rng)
    host = room.add_player('Господар')
    for i in range(n - 1):
        room.add_player(f'Бот{i}', bot=True)
    host_p = room.players[host.id]
    host_p.bot = True  # господар теж грає як бот
    room.start(host.id)
    roles = Counter(p.role for p in room.players.values())
    assert roles == Counter({k: v for k, v in COMPOSITION[n].items() if v}), roles
    steps = 0
    while room.phase != 'end':
        steps += 1
        assert steps < 2000, 'гра не завершилась'
        room.run_bots()
        if room.phase == 'day' and rng.random() < 0.7:
            alive = room.alive()
            free = [p for p in alive if p.id not in room.nominated_by]
            taken = {c['id'] for c in room.candidates}
            if free and len(room.candidates) < 3:
                a = rng.choice(free)
                opts = [p for p in alive if p.id != a.id and p.id not in taken]
                if opts:
                    room.nominate(a.id, rng.choice(opts).id)
                    continue
        if room.phase == 'defense' and rng.random() < 0.5:
            room.end_defense(room.nominee)
            continue
        clock.t += 1
        room.timeout()
        # інваріанти
        alive = room.alive()
        evil = sum(p.role in EVIL for p in alive)
        if room.phase not in ('end', 'verdict', 'morning'):
            assert evil > 0 and evil < len(alive) - evil, 'мала бути перемога'
    return room.winner, room.round


if __name__ == '__main__':
    for n in range(8, 15):
        res = Counter()
        rounds = []
        for s in range(400):
            w, r = play(n, s * 31 + n)
            res[w] += 1
            rounds.append(r)
        print(f'{n:2} гравців: мирні {res["good"]:3}  зло {res["evil"]:3}  '
              f'середньо ночей {sum(rounds)/len(rounds):.1f}')
    print('OK')
