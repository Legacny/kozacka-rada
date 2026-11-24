'use strict';
/* Звуки ради — синтез у браузері (Web Audio), без жодних аудіофайлів.
   Грають тільки на екрані проектора. */

const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let enabled = false;
  let volume = +(localStorage.getItem('kr_vol') ?? 0.7);
  const loops = {};

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  const now = () => ctx.currentTime;
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function osc(type, freq, t, a, peak, dec, dest = master) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    env(g, t, a, peak, dec);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + a + dec + 0.05);
    return o;
  }
  function noise(t, dur, { type = 'lowpass', freq = 1000, q = 1, peak = 0.3, a = 0.005, dest = master } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, a, peak, dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random()); s.stop(t + a + dur + 0.05);
    return { s, f, g };
  }

  // ---------------------------------------------------------------- звуки
  // Дзвін ради: неперіодичні обертони, як у церковного дзвона
  function bell(base = 220, t = now(), level = 0.25) {
    [[1, 1], [2, 0.6], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]].forEach(([r, l], i) =>
      osc('sine', base * r, t, 0.004, level * l, 3.2 - i * 0.45));
    osc('sine', base * 0.5, t, 0.01, level * 0.5, 4);
  }
  // Гонг ночі: низький, з биттям
  function gong(t = now()) {
    osc('sine', 98, t, 0.02, 0.35, 5);
    osc('sine', 99.6, t, 0.02, 0.25, 5);
    osc('sine', 98 * 2.4, t, 0.01, 0.12, 3);
    noise(t, 0.6, { freq: 400, peak: 0.08 });
  }
  // Литаври: удар із падінням висоти
  function timpani(t = now(), base = 92, level = 0.6) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(base * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(base, t + 0.08);
    env(g, t, 0.004, level, 1.6);
    o.connect(g).connect(master); o.start(t); o.stop(t + 1.8);
    noise(t, 0.25, { freq: 300, peak: level * 0.5 });
  }
  // Барабанний дріб (висунення)
  function drumroll(dur = 1.6, t = now()) {
    const n = Math.floor(dur / 0.055);
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.055 + Math.random() * 0.01;
      noise(tt, 0.06, { type: 'bandpass', freq: 220, q: 1.2, peak: 0.08 + 0.25 * (i / n) });
    }
    timpani(t + dur, 110, 0.45);
  }
  // Стук печаткою об стіл (голос)
  function knock(t = now(), yes = true) {
    osc('sine', yes ? 170 : 130, t, 0.002, 0.35, 0.12);
    noise(t, 0.04, { type: 'bandpass', freq: yes ? 1800 : 1200, q: 2, peak: 0.25 });
  }
  // Цокання годинника (останні секунди)
  function tick(t = now(), hi = false) {
    osc('square', hi ? 1500 : 1100, t, 0.001, 0.06, 0.04);
  }
  // Сурми перемоги (фанфара)
  function fanfare(t = now()) {
    const out = ctx.createBiquadFilter(); out.type = 'lowpass'; out.frequency.value = 2200; out.connect(master);
    const notes = [[392, 0, 0.18], [392, 0.2, 0.18], [523, 0.4, 0.5], [659, 0.95, 0.25], [587, 1.2, 0.25], [784, 1.45, 1.4]];
    notes.forEach(([f, dt, len]) => {
      osc('sawtooth', f, t + dt, 0.03, 0.12, len, out);
      osc('sawtooth', f * 1.005, t + dt, 0.03, 0.08, len, out);
    });
    [523, 659, 784].forEach((f) => osc('triangle', f / 2, t + 1.45, 0.05, 0.1, 2.2, out));
    timpani(t + 1.45, 98, 0.5);
    bell(330, t + 1.5, 0.15);
  }
  // Поразка: глухий удар і тиша
  function doom(t = now()) {
    timpani(t, 70, 0.7);
    osc('sawtooth', 55, t, 0.3, 0.06, 3.5);
    osc('sine', 82, t + 0.6, 0.2, 0.15, 3);
  }

  // ---------------------------------------------------------------- фонові петлі
  function startLoop(name) {
    if (loops[name] || !ctx) return;
    const bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(master);
    bus.gain.exponentialRampToValueAtTime(1, now() + 2);
    const timers = [];
    const nodes = [];
    if (name === 'night') {
      // вітер
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = 0.05;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 250;
      lfo.connect(lg).connect(f.frequency);
      s.connect(f).connect(g).connect(bus); s.start(); lfo.start();
      nodes.push(s, lfo);
      // цвіркуни
      const chirp = () => {
        const t = now(); const f0 = 4200 + Math.random() * 500;
        for (let i = 0; i < 3; i++) osc('sine', f0, t + i * 0.05, 0.004, 0.025, 0.03, bus);
      };
      timers.push(setInterval(() => { if (Math.random() < 0.7) chirp(); }, 700));
      // далека сова
      timers.push(setInterval(() => {
        if (Math.random() < 0.35) { const t = now(); osc('sine', 420, t, 0.05, 0.05, 0.35, bus); osc('sine', 380, t + 0.45, 0.05, 0.05, 0.6, bus); }
      }, 9000));
    }
    if (name === 'fire') {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 350;
      const g = ctx.createGain(); g.gain.value = 0.12;
      s.connect(f).connect(g).connect(bus); s.start(); nodes.push(s);
      timers.push(setInterval(() => {
        const t = now();
        for (let i = 0; i < 1 + Math.random() * 3; i++)
          noise(t + Math.random() * 0.2, 0.02 + Math.random() * 0.03, { type: 'highpass', freq: 1500 + Math.random() * 3000, peak: 0.05 + Math.random() * 0.15, dest: bus });
      }, 140));
    }
    if (name === 'day') {
      // тихий гомін ради: м'який шум і подих
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6;
      const g = ctx.createGain(); g.gain.value = 0.018;
      s.connect(f).connect(g).connect(bus); s.start(); nodes.push(s);
    }
    loops[name] = { bus, timers, nodes };
  }
  function stopLoop(name) {
    const l = loops[name]; if (!l) return;
    l.timers.forEach(clearInterval);
    l.bus.gain.cancelScheduledValues(now());
    l.bus.gain.setValueAtTime(Math.max(l.bus.gain.value, 0.0001), now());
    l.bus.gain.exponentialRampToValueAtTime(0.0001, now() + 1.5);
    setTimeout(() => { l.nodes.forEach((n) => { try { n.stop(); } catch { /* */ } }); l.bus.disconnect(); }, 1700);
    delete loops[name];
  }
  const stopAll = () => Object.keys(loops).forEach(stopLoop);

  // ---------------------------------------------------------------- події гри
  let prev = null;
  let lastTick = null;

  function onState(S) {
    const p = prev; prev = S;
    if (!enabled || !ctx) return;
    const ph = S.phase, was = p?.phase;
    // фонові петлі за фазою
    if (ph === 'night') { stopLoop('day'); startLoop('night'); } else stopLoop('night');
    if (['day', 'defense', 'vote'].includes(ph)) startLoop('day'); else stopLoop('day');
    if (ph === 'end' && S.winner === 'evil') startLoop('fire'); else stopLoop('fire');

    if (was && was !== ph) {
      if (ph === 'roles') bell(196);
      else if (ph === 'night') gong();
      else if (ph === 'morning') {
        bell(262); bell(262, now() + 0.9, 0.18);
        if (S.announcement?.deaths?.length) timpani(now() + 2.2);
      } else if (ph === 'day' && was === 'morning') bell(330, now(), 0.15);
      else if (ph === 'defense') drumroll(1.4);
      else if (ph === 'verdict') {
        if (S.announcement?.eliminated) { timpani(); timpani(now() + 0.35, 80); }
        else knock(now(), false);
      } else if (ph === 'end') (S.winner === 'good' ? fanfare : doom)();
    }
    // голоси
    if (ph === 'vote' && p && p.phase === 'vote') {
      const before = Object.keys(p.votes || {}).length, after = Object.keys(S.votes || {}).length;
      if (after > before) {
        const newIds = Object.keys(S.votes).filter((k) => !(k in (p.votes || {})));
        newIds.slice(0, 4).forEach((k, i) => knock(now() + i * 0.09, S.votes[k] !== '__none'));
      }
    }
  }

  // Цокання останніх 5 секунд (викликається з таймера ~4 рази/с)
  function onTimer(S, left) {
    if (!enabled || !ctx || !S?.deadline) return;
    if (!['night', 'day', 'defense', 'vote'].includes(S.phase)) return;
    if (left > 0 && left <= 5 && lastTick !== `${S.deadline}:${left}`) {
      lastTick = `${S.deadline}:${left}`;
      tick(now(), left <= 2);
    }
  }

  function setEnabled(v) {
    enabled = v;
    localStorage.setItem('kr_sound', v ? '1' : '0');
    if (v) { init(); bell(262, now(), 0.15); } else stopAll();
  }
  function setVolume(v) {
    volume = v; localStorage.setItem('kr_vol', String(v));
    if (master) master.gain.setTargetAtTime(v, now(), 0.05);
  }

  return {
    onState, onTimer, setEnabled, setVolume,
    get enabled() { return enabled; }, get volume() { return volume; },
    wanted: () => localStorage.getItem('kr_sound') !== '0',
    test: { bell, gong, timpani, drumroll, knock, tick, fanfare, doom },
  };
})();
