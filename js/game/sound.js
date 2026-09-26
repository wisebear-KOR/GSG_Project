// Web Audio로 합성하는 효과음과 배경음악. 파일 없이 동작한다.
// 구조: 각 소리 → (효과음 버스 | 음악 버스) → 마스터 → 컴프레서 → 출력
//                 └→ 잔향(합성 임펄스 응답) → 마스터
// 브라우저는 사용자 입력 뒤에만 오디오를 허락하므로, unlockAudio() 전에는 아무것도 만들지 않는다.

const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 무시 */ } },
};
let sfxOn = store.get('gsg.sound', 'on') !== 'off';
let musicOnFlag = store.get('gsg.music', 'on') !== 'off';
let unlocked = false;
let ctx = null;
let bus = null;

export const soundOn = () => sfxOn;
export const musicOn = () => musicOnFlag;
export function setSound(on) { sfxOn = on; store.set('gsg.sound', on ? 'on' : 'off'); if (bus) ramp(bus.sfx.gain, on ? 0.9 : 0, 0.15); }
export function setMusic(on) {
  musicOnFlag = on; store.set('gsg.music', on ? 'on' : 'off');
  if (!bus) return;
  ramp(bus.music.gain, on ? MUSIC_LEVEL : 0, 0.8);
  if (on) music.start(); else music.stop();
}

const MUSIC_LEVEL = 0.32;
const ramp = (param, v, secs) => { const t = ctx.currentTime; param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(v, t + secs); };

function impulse(seconds = 3.2, decay = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.25;
  const master = ctx.createGain(); master.gain.value = 0.85;
  const reverb = ctx.createConvolver(); reverb.buffer = impulse();
  const wet = ctx.createGain(); wet.gain.value = 0.42;
  const sfx = ctx.createGain(); sfx.gain.value = sfxOn ? 0.9 : 0;
  const musicG = ctx.createGain(); musicG.gain.value = 0;
  sfx.connect(master); musicG.connect(master);
  reverb.connect(wet).connect(master);
  master.connect(comp).connect(ctx.destination);
  bus = { master, reverb, sfx, music: musicG };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  return true;
}

export function unlockAudio() {
  if (unlocked) { if (ctx?.state === 'suspended') ctx.resume(); return; }
  unlocked = true;
  if (!build()) return;
  if (musicOnFlag) { ramp(bus.music.gain, MUSIC_LEVEL, 2.5); music.start(); }
}
for (const type of ['pointerdown', 'keydown']) addEventListener(type, unlockAudio, { once: true, capture: true });

const ready = () => unlocked && ctx && ctx.state !== 'closed';
const now = () => ctx.currentTime;

// ---------- 악기 ----------
// 출력: dest(버스)와 잔향으로 보낼 양(send)
function out(node, dest, send = 0) {
  node.connect(dest);
  if (send > 0) { const s = ctx.createGain(); s.gain.value = send; node.connect(s).connect(bus.reverb); }
}
function env(g, t, a, peak, d, sus = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + d);
}

// 하프·류트처럼 뜯는 소리
function pluck(freq, t, { dest, gain = 0.2, dur = 1.6, bright = 3200, send = 0.35 } = {}) {
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(bright, t); f.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 300), t + dur * 0.6);
  for (const [mult, type, lvl] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq * mult;
    const og = ctx.createGain(); og.gain.value = lvl;
    o.connect(og).connect(f); o.start(t); o.stop(t + dur + 0.1);
  }
  f.connect(g); env(g, t, 0.004, gain, dur);
  out(g, dest, send);
}

// 종: 비정수배 배음
function bell(freq, t, { dest, gain = 0.14, dur = 3, send = 0.5 } = {}) {
  const g = ctx.createGain(); g.gain.value = 1;
  [[1, 1, 1], [2.76, 0.5, 0.6], [5.4, 0.28, 0.4], [8.93, 0.14, 0.25], [0.5, 0.3, 1.2]].forEach(([r, lvl, dk]) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * r;
    const og = ctx.createGain(); env(og, t, 0.003, gain * lvl, dur * dk);
    o.connect(og).connect(g); o.start(t); o.stop(t + dur * dk + 0.1);
  });
  out(g, dest, send);
}

// 합창 "아—": 톱니파 → 모음 필터 2개 + 비브라토
function choir(freqs, t, { dest, gain = 0.06, dur = 2.5, attack = 0.5, send = 0.6, vowel = [760, 1150] } = {}) {
  const g = ctx.createGain(); env(g, t, attack, gain, dur, gain * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur + 0.8);
  const mix = ctx.createGain(); mix.gain.value = 1;
  for (const fq of vowel) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 6; mix.connect(bp).connect(g); }
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.value = 4;
  lfo.connect(lg); lfo.start(t); lfo.stop(t + attack + dur + 1);
  for (const fq of freqs) {
    for (const det of [-6, 5]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; o.detune.value = det;
      lg.connect(o.frequency); o.connect(mix); o.start(t); o.stop(t + attack + dur + 1);
    }
  }
  out(g, dest, send);
}

// 금관: 필터가 열리는 톱니파
function brass(freq, t, { dest, gain = 0.09, dur = 0.8, send = 0.35 } = {}) {
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(freq * 6, t + 0.08); f.frequency.exponentialRampToValueAtTime(freq * 2.5, t + dur);
  const g = ctx.createGain(); env(g, t, 0.04, gain, dur, gain * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
  for (const det of [-8, 0, 7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 0.5); }
  f.connect(g); out(g, dest, send);
}

// 부드러운 패드
function pad(freqs, t, { dest, gain = 0.05, dur = 4, attack = 1.4, send = 0.5, cutoff = 900 } = {}) {
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.7;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15; const lg = ctx.createGain(); lg.gain.value = cutoff * 0.35;
  lfo.connect(lg).connect(f.frequency); lfo.start(t); lfo.stop(t + dur + attack + 2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + attack);
  for (const fq of freqs) for (const [type, det] of [['sawtooth', -7], ['triangle', 6]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = fq; o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + dur + attack + 0.2);
  }
  f.connect(g); out(g, dest, send);
}

// 피리: 비브라토 있는 사인 + 숨소리
function flute(freq, t, { dest, gain = 0.07, dur = 0.8, send = 0.55 } = {}) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5; const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(freq * 0.012, t + dur * 0.6);
  lfo.connect(lg).connect(o.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.08);
  g.gain.setValueAtTime(gain, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g); lfo.start(t); o.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  noise({ dest, t, dur: dur * 0.9, gain: gain * 0.12, freq: freq * 2, q: 2 });
  out(g, dest, send);
}

function noise({ dest, t, dur = 0.2, gain = 0.2, freq = 1200, q = 1, type = 'bandpass', sweep = null, send = 0, attack = 0.002 }) {
  const len = Math.max(1, Math.ceil(ctx.sampleRate * (dur + 0.05)));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = ctx.createGain(); env(g, t, attack, gain, dur);
  src.connect(f).connect(g); out(g, dest, send);
  src.start(t); src.stop(t + dur + 0.05);
}

function thud(t, { dest, freq = 110, end = 45, gain = 0.5, dur = 0.45, send = 0.2 } = {}) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(end, t + dur);
  const g = ctx.createGain(); env(g, t, 0.003, gain, dur);
  o.connect(g); out(g, dest, send); o.start(t); o.stop(t + dur + 0.05);
}

// 나무끼리 부딪는 소리
function clack(t, { dest, gain = 0.25, freq = 1400, send = 0.15 } = {}) {
  noise({ dest, t, dur: 0.05, gain, freq, q: 9, send });
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 0.45, t); o.frequency.exponentialRampToValueAtTime(freq * 0.3, t + 0.06);
  const g = ctx.createGain(); env(g, t, 0.002, gain * 0.6, 0.07); o.connect(g); out(g, dest, send); o.start(t); o.stop(t + 0.1);
}

// 금속 부딪는 소리 (칼)
function clash(t, { dest, gain = 0.3 } = {}) {
  noise({ dest, t, dur: 0.35, gain, freq: 4200, q: 12, send: 0.5 });
  [1780, 2530, 3310].forEach((fq, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fq;
    const g = ctx.createGain(); env(g, t, 0.002, gain * (0.35 - i * 0.08), 0.9 - i * 0.2);
    o.connect(g); out(g, dest, 0.5); o.start(t); o.stop(t + 1);
  });
}

// ---------- 음 높이 ----------
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI → Hz
// D 도리안: D E F G A B C
const DORIAN = [62, 64, 65, 67, 69, 71, 72];

// ---------- 효과음 ----------
const S = () => bus.sfx;
let lastType = 0;
export const sfx = {
  click: () => { if (!ready()) return; clack(now(), { dest: S(), gain: 0.12, freq: 2400 }); },
  hover: () => { if (!ready()) return; noise({ dest: S(), t: now(), dur: 0.03, gain: 0.03, freq: 5000, q: 4 }); },
  type: () => {
    if (!ready() || now() - lastType < 0.045) return;
    lastType = now();
    noise({ dest: S(), t: now(), dur: 0.025, gain: 0.035 + Math.random() * 0.02, freq: 3500 + Math.random() * 2000, q: 3 });
  },
  page: () => { if (!ready()) return; const t = now(); noise({ dest: S(), t, dur: 0.45, gain: 0.14, freq: 1800, sweep: 5200, q: 0.7, attack: 0.08, send: 0.2 }); clack(t + 0.38, { dest: S(), gain: 0.08, freq: 900 }); },
  deal: () => { if (!ready()) return; const t = now(); noise({ dest: S(), t, dur: 0.28, gain: 0.12, freq: 2500, sweep: 900, q: 0.8, attack: 0.03 }); clack(t + 0.25, { dest: S(), gain: 0.14, freq: 1100 }); },
  whoosh: () => { if (!ready()) return; noise({ dest: S(), t: now(), dur: 0.8, gain: 0.18, freq: 250, sweep: 4200, q: 0.9, attack: 0.25, send: 0.4 }); },
  seal: () => {
    if (!ready()) return; const t = now();
    noise({ dest: S(), t, dur: 0.18, gain: 0.3, freq: 380, q: 0.8, type: 'lowpass', send: 0.3 });
    thud(t, { dest: S(), freq: 140, end: 48, gain: 0.7, dur: 0.5, send: 0.5 });
    clack(t + 0.01, { dest: S(), gain: 0.2, freq: 700 });
  },
  holy: () => {
    if (!ready()) return; const t = now();
    choir([NOTE(62), NOTE(69), NOTE(74), NOTE(78)], t, { dest: S(), gain: 0.045, dur: 1.6, attack: 0.35 });
    [86, 90, 93, 98].forEach((n, i) => bell(NOTE(n), t + 0.12 + i * 0.09, { dest: S(), gain: 0.05, dur: 2.4 }));
    noise({ dest: S(), t, dur: 1.4, gain: 0.05, freq: 7000, sweep: 12000, q: 1, type: 'highpass', attack: 0.4, send: 0.8 });
  },
  chime: () => { if (!ready()) return; const t = now(); [81, 86, 88].forEach((n, i) => bell(NOTE(n), t + i * 0.08, { dest: S(), gain: 0.08, dur: 2 })); },
  coin: (i = 0) => {
    if (!ready()) return; const t = now();
    bell(NOTE(91 + (i % 4) * 2), t, { dest: S(), gain: 0.06, dur: 0.9, send: 0.25 });
    clack(t, { dest: S(), gain: 0.08, freq: 3200 });
  },
  drop: () => { if (!ready()) return; const t = now(); clack(t, { dest: S(), gain: 0.22, freq: 1100 + Math.random() * 300 }); clack(t + 0.07, { dest: S(), gain: 0.07, freq: 1300 }); },
  lift: () => { if (!ready()) return; noise({ dest: S(), t: now(), dur: 0.18, gain: 0.07, freq: 1200, sweep: 3000, q: 1.5, attack: 0.05 }); },
  dice: () => {
    if (!ready()) return; const t = now();
    let at = 0; let gap = 0.05;
    for (let i = 0; i < 12; i++) { clack(t + at, { dest: S(), gain: 0.22 * (1 - i / 14), freq: 1500 + Math.random() * 1400 }); at += gap; gap *= 1.16; }
    thud(t + at, { dest: S(), freq: 220, end: 150, gain: 0.15, dur: 0.12 });
  },
  hit: () => {
    if (!ready()) return; const t = now();
    clash(t, { dest: S(), gain: 0.3 });
    thud(t, { dest: S(), freq: 90, end: 38, gain: 0.8, dur: 0.7, send: 0.5 });
    noise({ dest: S(), t, dur: 0.5, gain: 0.25, freq: 600, sweep: 120, q: 0.6, send: 0.4 });
  },
  shield: () => { if (!ready()) return; const t = now(); thud(t, { dest: S(), freq: 200, end: 90, gain: 0.4, dur: 0.25 }); clack(t, { dest: S(), gain: 0.25, freq: 800 }); },
  fail: () => { if (!ready()) return; const t = now(); pluck(NOTE(57), t, { dest: S(), gain: 0.12, dur: 0.6, bright: 900 }); pluck(NOTE(56), t + 0.14, { dest: S(), gain: 0.1, dur: 0.9, bright: 700 }); },
  build: () => { if (!ready()) return; const t = now(); [0, 0.16, 0.32].forEach((d) => { clack(t + d, { dest: S(), gain: 0.28, freq: 900 }); thud(t + d, { dest: S(), freq: 160, end: 90, gain: 0.2, dur: 0.12 }); }); bell(NOTE(84), t + 0.5, { dest: S(), gain: 0.06, dur: 1.5 }); },
  thunder: () => {
    if (!ready()) return; const t = now();
    noise({ dest: S(), t, dur: 0.12, gain: 0.5, freq: 3000, q: 0.5, type: 'highpass', send: 0.6 });
    noise({ dest: S(), t: t + 0.05, dur: 2.4, gain: 0.55, freq: 220, sweep: 50, q: 0.4, type: 'lowpass', attack: 0.05, send: 0.7 });
    thud(t + 0.05, { dest: S(), freq: 70, end: 30, gain: 0.7, dur: 1.4, send: 0.5 });
  },
  rain: () => { if (!ready()) return; const t = now(); noise({ dest: S(), t, dur: 2.4, gain: 0.1, freq: 6000, q: 0.3, type: 'highpass', attack: 0.4, send: 0.3 }); for (let i = 0; i < 18; i++) clack(t + Math.random() * 2, { dest: S(), gain: 0.03, freq: 4000 + Math.random() * 2000 }); },
  birth: () => { if (!ready()) return; const t = now(); [62, 66, 69, 74, 78].forEach((n, i) => pluck(NOTE(n + 12), t + i * 0.07, { dest: S(), gain: 0.08, dur: 1.4 })); },
  loss: () => { if (!ready()) return; bell(NOTE(45), now(), { dest: S(), gain: 0.14, dur: 3.5, send: 0.7 }); },
  chapter: () => {
    if (!ready()) return; const t = now();
    bell(NOTE(38), t, { dest: S(), gain: 0.2, dur: 4.5, send: 0.8 });
    DORIAN.forEach((n, i) => pluck(NOTE(n + 12), t + 0.3 + i * 0.06, { dest: S(), gain: 0.05, dur: 1.6 }));
    choir([NOTE(50), NOTE(57), NOTE(62)], t + 0.2, { dest: S(), gain: 0.03, dur: 1.8, attack: 0.6 });
  },
  preach: () => { if (!ready()) return; choir([NOTE(62), NOTE(66), NOTE(69), NOTE(74)], now(), { dest: S(), gain: 0.05, dur: 1.2, attack: 0.2, vowel: [650, 1080] }); },
  win: () => {
    if (!ready()) return; const t = now();
    [[62, 66, 69], [67, 71, 74], [69, 73, 76], [74, 78, 81, 86]].forEach((chord, i) => chord.forEach((n) => brass(NOTE(n), t + i * 0.42, { dest: S(), gain: 0.05, dur: i === 3 ? 2.2 : 0.38 })));
    [0, 0.42, 0.84, 1.26, 1.4].forEach((d) => thud(t + d, { dest: S(), freq: 100, end: 50, gain: 0.45, dur: 0.4, send: 0.4 }));
    choir([NOTE(62), NOTE(69), NOTE(74), NOTE(78)], t + 1.26, { dest: S(), gain: 0.05, dur: 2.6, attack: 0.3 });
    [86, 90, 93, 98, 102].forEach((n, i) => bell(NOTE(n), t + 1.3 + i * 0.1, { dest: S(), gain: 0.05, dur: 2.5 }));
  },
  lose: () => {
    if (!ready()) return; const t = now();
    choir([NOTE(50), NOTE(53), NOTE(57)], t, { dest: S(), gain: 0.05, dur: 3.2, attack: 0.8, vowel: [500, 900] });
    [57, 55, 53, 50].forEach((n, i) => pluck(NOTE(n), t + i * 0.55, { dest: S(), gain: 0.12, dur: 2, bright: 1200 }));
    bell(NOTE(38), t + 2.2, { dest: S(), gain: 0.18, dur: 5, send: 0.9 });
  },
};

// ---------- 배경음악 (절차 생성) ----------
// D 도리안, 느린 6/8 느낌. 8마디 화성 진행을 반복하며 레이어를 섞는다.
// calm: 저음 지속음 + 패드 + 하프 아르페지오 + 가끔 피리 선율
// tension: calm + 북 + 낮은 맥박 + 더 촘촘한 아르페지오
const PROG = [
  [50, [62, 65, 69]], [48, [60, 64, 67]], [46, [58, 62, 65]], [48, [60, 64, 67]],
  [50, [62, 65, 69]], [53, [60, 65, 69]], [48, [60, 64, 67]], [50, [62, 65, 69]],
];
const BEAT = 60 / 72;
const BAR = BEAT * 3; // 3박 (6/8을 느리게)

export const music = (() => {
  let timer = null;
  let nextBar = 0;
  let bar = 0;
  let mood = 'calm';
  let intensity = 0; // 0 = calm, 1 = tension (서서히 따라간다)
  let target = 0;
  const M = () => bus.music;

  function scheduleBar(t) {
    const [bass, chord] = PROG[bar % PROG.length];
    intensity += (target - intensity) * 0.5;
    // 저음 지속음과 패드
    pad([NOTE(bass - 12), NOTE(bass - 5)], t, { dest: M(), gain: 0.05, dur: BAR, attack: 0.9, cutoff: 420, send: 0.3 });
    pad(chord.map(NOTE), t, { dest: M(), gain: 0.028 + intensity * 0.01, dur: BAR, attack: 1.1, cutoff: 1100 + intensity * 600, send: 0.6 });
    // 하프 아르페지오
    const tones = [...chord, chord[0] + 12, chord[1] + 12];
    const steps = intensity > 0.5 ? 12 : 6;
    for (let i = 0; i < steps; i++) {
      if (Math.random() < (intensity > 0.5 ? 0.12 : 0.22)) continue;
      const n = tones[(i * (intensity > 0.5 ? 3 : 2) + bar) % tones.length];
      pluck(NOTE(n + (i % 3 === 2 ? 12 : 0)), t + i * (BAR / steps), { dest: M(), gain: 0.05 + Math.random() * 0.02, dur: 1.8, bright: 2600, send: 0.45 });
    }
    // 피리 선율: 두 마디마다, 도리안 음계에서 짧은 동기
    if (bar % 2 === 1 && Math.random() < 0.75) {
      let deg = [0, 2, 4][Math.floor(Math.random() * 3)];
      const notes = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < notes; i++) {
        deg = Math.max(0, Math.min(DORIAN.length - 1, deg + [-1, 1, 2, -2][Math.floor(Math.random() * 4)]));
        const len = BEAT * (i === notes - 1 ? 2 : 1);
        flute(NOTE(DORIAN[deg] + 12), t + i * BEAT, { dest: M(), gain: 0.035, dur: len * 0.95 });
      }
    }
    // 긴장: 북과 낮은 맥박
    if (intensity > 0.3) {
      [0, BEAT * 1.5, BEAT * 2].forEach((d, i) => thud(t + d, { dest: M(), freq: i ? 95 : 120, end: 50, gain: (i ? 0.12 : 0.22) * intensity, dur: 0.35, send: 0.3 }));
      for (let i = 0; i < 6; i++) pluck(NOTE(bass - 12), t + i * (BAR / 6), { dest: M(), gain: 0.05 * intensity, dur: 0.35, bright: 500, send: 0.1 });
    }
    bar += 1;
  }

  function tick() {
    if (!ready()) return;
    while (nextBar < now() + 0.4) { scheduleBar(nextBar); nextBar += BAR; }
  }

  return {
    start() {
      if (!ready() || timer || !musicOnFlag) return;
      nextBar = now() + 0.2;
      timer = setInterval(tick, 120);
      tick();
    },
    stop() { clearInterval(timer); timer = null; },
    setMood(m) {
      mood = m;
      target = m === 'tension' ? 1 : 0;
      if (m === 'end') { this.stop(); if (bus) { ramp(bus.music.gain, 0, 1.2); setTimeout(() => { if (musicOnFlag && bus) ramp(bus.music.gain, MUSIC_LEVEL, 3); }, 6000); } }
    },
    get mood() { return mood; },
  };
})();
