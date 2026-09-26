// Web Audio로 합성하는 효과음. 파일 없이 동작하고, 첫 클릭 뒤에 소리가 난다.
let ctx = null;
let master = null;
let enabled = (() => { try { return localStorage.getItem('gsg.sound') !== 'off'; } catch { return true; } })();

export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on;
  try { localStorage.setItem('gsg.sound', on ? 'on' : 'off'); } catch { /* 무시 */ }
}

function ac() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// 브라우저는 사용자 입력 뒤에만 소리를 허락한다
addEventListener('pointerdown', () => ac(), { once: true });

function tone(freq, { type = 'sine', dur = 0.3, gain = 0.25, at = 0, slide = null, attack = 0.005 } = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({ dur = 0.2, gain = 0.2, at = 0, freq = 1200, q = 1, type = 'bandpass', sweep = null } = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + at;
  const len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  click: () => tone(900, { type: 'triangle', dur: 0.06, gain: 0.08 }),
  page: () => noise({ dur: 0.35, gain: 0.12, freq: 2500, sweep: 700, q: 0.6 }),
  whoosh: () => noise({ dur: 0.7, gain: 0.16, freq: 300, sweep: 3200, q: 0.8 }),
  seal: () => { tone(120, { type: 'sine', dur: 0.35, gain: 0.5, slide: 55 }); noise({ dur: 0.12, gain: 0.25, freq: 600, q: 0.7 }); },
  chime: () => [0, 0.09, 0.18].forEach((at, i) => tone([784, 988, 1319][i], { dur: 1.4, gain: 0.12, at, attack: 0.01 })),
  holy: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { dur: 2.2, gain: 0.07, at: i * 0.05, attack: 0.25 })),
  coin: (i = 0) => tone(1400 + i * 120, { type: 'triangle', dur: 0.18, gain: 0.09, slide: 1900 + i * 120 }),
  drop: () => { tone(260, { type: 'triangle', dur: 0.09, gain: 0.12, slide: 140 }); noise({ dur: 0.05, gain: 0.08, freq: 1800 }); },
  dice: () => { for (let i = 0; i < 9; i++) noise({ dur: 0.04, gain: 0.18 * (1 - i / 11), at: i * 0.07 + Math.random() * 0.03, freq: 2200 + Math.random() * 1500, q: 3 }); },
  hit: () => { tone(90, { type: 'sawtooth', dur: 0.4, gain: 0.25, slide: 40 }); noise({ dur: 0.3, gain: 0.3, freq: 500, sweep: 120, q: 0.6 }); },
  fail: () => tone(220, { type: 'square', dur: 0.25, gain: 0.05, slide: 150 }),
  build: () => [0, 0.08, 0.16].forEach((at) => noise({ dur: 0.07, gain: 0.2, at, freq: 900, q: 2 })),
  thunder: () => { noise({ dur: 1.6, gain: 0.5, freq: 180, sweep: 60, q: 0.5, type: 'lowpass' }); noise({ dur: 0.15, gain: 0.35, freq: 3000 }); },
  rain: () => noise({ dur: 1.8, gain: 0.08, freq: 5000, q: 0.3, type: 'highpass' }),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { dur: 1.6, gain: 0.1, at: i * 0.12, type: 'triangle', attack: 0.02 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, { dur: 1.4, gain: 0.1, at: i * 0.28, type: 'sine', attack: 0.05 })),
};
