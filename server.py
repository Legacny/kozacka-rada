"""Сервер «Козацької ради». Запуск: python server.py  (порт 8000 або змінна PORT)."""
import asyncio
import json
import os
import socket
import time
import random
from pathlib import Path

from aiohttp import web, WSMsgType

from game import Room, GameError

STATIC = Path(__file__).parent / 'static'
ROOMS: dict[str, Room] = {}
CONNS: dict[web.WebSocketResponse, tuple] = {}   # ws -> (код кімнати, id гравця | None для проектора)
TIMERS: dict[str, asyncio.Task] = {}
CODE_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'


def new_code():
    while True:
        code = ''.join(random.choice(CODE_LETTERS) for _ in range(4))
        if code not in ROOMS:
            return code


async def broadcast(room):
    for ws, (code, pid) in list(CONNS.items()):
        if code == room.code and not ws.closed:
            try:
                await ws.send_json({'type': 'state', 'state': room.view(pid)})
            except Exception:
                pass


def schedule(room):
    old = TIMERS.get(room.code)
    if old and not old.done():
        if getattr(old, 'deadline', None) == room.deadline:
            return
        old.cancel()
    TIMERS.pop(room.code, None)
    if not room.deadline:
        return

    async def waiter(dl):
        await asyncio.sleep(max(0.0, dl - time.time()))
        if room.deadline == dl and ROOMS.get(room.code) is room:
            TIMERS.pop(room.code, None)
            room.timeout()
            await after_change(room)

    task = asyncio.create_task(waiter(room.deadline))
    task.deadline = room.deadline
    TIMERS[room.code] = task


async def after_change(room):
    room.last_active = time.time()
    try:
        room.run_bots()
    except GameError:
        pass
    schedule(room)
    await broadcast(room)


async def send(ws, **data):
    await ws.send_json(data)


async def handle(ws, data):
    t = data.get('type')

    if t == 'create':
        room = Room(new_code())
        ROOMS[room.code] = room
        p = room.add_player(data.get('name'))
        p.connected = True
        CONNS[ws] = (room.code, p.id)
        await send(ws, type='joined', room=room.code, token=p.token, pid=p.id)
        await after_change(room)
        return

    if t in ('join', 'screen'):
        code = (data.get('room') or '').strip().upper()
        room = ROOMS.get(code)
        if not room:
            raise GameError('Раду з таким кодом не знайдено')
        if t == 'screen':
            CONNS[ws] = (code, None)
            await send(ws, type='screen', room=code)
            await send(ws, type='state', state=room.view(None))
            return
        token = data.get('token')
        p = next((q for q in room.players.values() if token and q.token == token), None)
        if not p:
            p = room.add_player(data.get('name'))
        CONNS[ws] = (code, p.id)
        room.set_connected(p.id, True)
        await send(ws, type='joined', room=code, token=p.token, pid=p.id)
        await after_change(room)
        return

    code, pid = CONNS.get(ws, (None, None))
    room = ROOMS.get(code)
    if not room or not pid:
        raise GameError('Спершу приєднайся до ради')

    if t == 'leave':
        if room.phase == 'lobby' and pid != room.host:
            room.players.pop(pid, None)
        CONNS[ws] = (None, None)
        await send(ws, type='left')
        await after_change(room)
        return

    actions = {
        'start': lambda: room.start(pid),
        'add_bots': lambda: room.add_bots(pid),
        'kick': lambda: room.kick(pid, data.get('target')),
        'settings': lambda: room.update_settings(pid, data.get('values') or {}),
        'avatar': lambda: room.set_avatar(pid, data.get('avatar')),
        'ready': lambda: room.set_ready(pid),
        'pick': lambda: room.night_pick(pid, data.get('target'), data.get('mode')),
        'submit': lambda: room.night_submit(pid),
        'nominate': lambda: room.nominate(pid, data.get('target')),
        'end_defense': lambda: room.end_defense(pid),
        'vote': lambda: room.vote(pid, data.get('target')),
        'to_vote': lambda: room.to_vote(pid),
        'skip': lambda: room.skip(pid),
        'restart': lambda: room.restart(pid),
    }
    fn = actions.get(t)
    if not fn:
        raise GameError('Невідома дія')
    fn()
    await after_change(room)


async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=20)
    await ws.prepare(request)
    CONNS[ws] = (None, None)
    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            try:
                data = json.loads(msg.data)
                await handle(ws, data)
            except GameError as e:
                await send(ws, type='error', message=str(e))
            except (ValueError, KeyError, TypeError):
                await send(ws, type='error', message='Некоректний запит')
    finally:
        code, pid = CONNS.pop(ws, (None, None))
        room = ROOMS.get(code)
        if room and pid and not any(c == (code, pid) for c in CONNS.values()):
            room.set_connected(pid, False)
            await after_change(room)
    return ws


async def cleanup():
    while True:
        await asyncio.sleep(600)
        now = time.time()
        for code, room in list(ROOMS.items()):
            active = any(c[0] == code for c in CONNS.values())
            if not active and now - room.last_active > 3 * 3600:
                ROOMS.pop(code, None)
                t = TIMERS.pop(code, None)
                if t:
                    t.cancel()


async def index(request):
    return web.FileResponse(STATIC / 'index.html', headers={'Cache-Control': 'no-cache'})


async def on_startup(app):
    app['cleanup'] = asyncio.create_task(cleanup())


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return '127.0.0.1'


def make_app():
    app = web.Application()
    app.router.add_get('/', index)
    app.router.add_get('/screen', index)
    app.router.add_get('/ws', ws_handler)
    app.router.add_static('/static', STATIC)
    app.on_startup.append(on_startup)
    return app


if __name__ == '__main__':
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass
    port = int(os.environ.get('PORT', 8000))
    print('=' * 52)
    print('  КОЗАЦЬКА РАДА — сервер запущено')
    print(f'  На цьому ноутбуці:   http://localhost:{port}')
    print(f'  У тій самій Wi-Fi:   http://{lan_ip()}:{port}')
    print('  Зупинити: Ctrl+C')
    print('=' * 52)
    web.run_app(make_app(), port=port, print=None)
