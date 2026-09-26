// 연출 도우미. 모든 대기는 wait()를 거치므로 빨리 감기(motion.skip)로 건너뛸 수 있다.
import { tileCenter, tileToHost } from './board.js';
import { sfx } from './sound.js';

// 연출 설정: 기본은 화려하게. 줄이기를 고르면 브라우저에 저장한다.
// (OS의 '애니메이션 줄이기'를 따르지 않는 이유: 연출이 게임의 핵심이라 기본으로 켜 두고 직접 끌 수 있게 한다)
function loadReduced() {
  try { return localStorage.getItem('gsg.motion') === 'reduced'; } catch { return false; }
}
export const motion = { skip: false, reduced: loadReduced() };
export function setReduced(on) {
  motion.reduced = on;
  document.body.classList.toggle('reduce-motion', on);
  try { localStorage.setItem('gsg.motion', on ? 'reduced' : 'full'); } catch { /* 저장 못 해도 이번 판은 적용 */ }
}
document.body.classList.toggle('reduce-motion', motion.reduced);

const off = () => motion.skip || motion.reduced;
export const wait = (ms) => new Promise((r) => setTimeout(r, motion.skip ? 0 : motion.reduced ? ms * 0.35 : ms));
const NS = 'http://www.w3.org/2000/svg';
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const EASE_BACK = 'cubic-bezier(.34,1.56,.64,1)';

function svgEl(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}
const later = (fn, ms) => setTimeout(fn, ms);
const stage = () => document.getElementById('stage');
const div = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };
const centerOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

// ---------- 보드 위 ----------
export function floatText(svg, tile, text, kind = 'good', offset = 0) {
  if (motion.skip) return;
  const c = tileCenter(tile);
  const t = svgEl('text', { x: c.x, y: c.y - 8 + offset, class: `float ${kind}` }, text);
  svg.append(t);
  t.animate([
    { transform: 'translateY(10px) scale(.5)', opacity: 0 },
    { transform: 'translateY(-4px) scale(1.18)', opacity: 1, offset: 0.22 },
    { transform: 'translateY(-10px) scale(1)', opacity: 1, offset: 0.6 },
    { transform: 'translateY(-40px) scale(.96)', opacity: 0 },
  ], { duration: 1500, easing: EASE_OUT, fill: 'forwards' });
  later(() => t.remove(), 1600);
}

export function ring(svg, tile, color = '#ffd76a', big = false) {
  if (off()) return;
  const c = tileCenter(tile);
  for (let i = 0; i < 2; i++) {
    const r = svgEl('circle', { cx: c.x, cy: c.y, r: 8, class: 'ring', stroke: color });
    svg.append(r);
    r.animate([{ r: 8, opacity: 0.95, strokeWidth: 5 }, { r: big ? 96 : 58, opacity: 0, strokeWidth: 0.5 }],
      { duration: big ? 1000 : 800, delay: i * 140, easing: EASE_OUT, fill: 'forwards' });
    later(() => r.remove(), 1300);
  }
}

// 건물이 튀어 오르며 세워진다
export function rise(svg, tile, symbol) {
  if (off()) return;
  const c = tileCenter(tile);
  const u = svgEl('use', { href: `#${symbol}`, x: c.x - 34, y: c.y - 36, width: 68, height: 68, class: 'rise' });
  svg.append(u);
  u.animate([
    { transform: 'translateY(28px) scale(.2)', opacity: 0 },
    { transform: 'translateY(-14px) scale(1.25)', opacity: 1, offset: 0.55 },
    { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.8 },
    { transform: 'translateY(0) scale(1)', opacity: 0 },
  ], { duration: 1100, easing: EASE_OUT, fill: 'forwards' });
  later(() => u.remove(), 1200);
  dust(tileToHost(svg, null, tile));
}

// 흙먼지
function dust(at) {
  if (off()) return;
  for (let i = 0; i < 12; i++) {
    const p = div('dust');
    p.style.left = `${at.x}px`; p.style.top = `${at.y + 18}px`;
    stage().append(p);
    const a = Math.PI + Math.random() * Math.PI;
    const d = 20 + Math.random() * 34;
    p.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0.8 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d * 0.5}px)) scale(1.6)`, opacity: 0 }],
    { duration: 700 + Math.random() * 300, easing: EASE_OUT, fill: 'forwards' });
    later(() => p.remove(), 1100);
  }
}

export function shake(el, strength = 7) {
  if (off()) return;
  const k = [];
  for (let i = 0; i < 8; i++) k.push({ transform: `translate(${(Math.random() - 0.5) * strength * 2}px, ${(Math.random() - 0.5) * strength}px) rotate(${(Math.random() - 0.5) * 0.6}deg)` });
  k.push({ transform: 'none' });
  el.animate(k, { duration: 460, easing: 'linear' });
}

export function flash(color = 'rgba(255,248,220,.9)', ms = 500) {
  if (off()) return;
  const f = div('flash');
  f.style.background = color;
  stage().append(f);
  f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  later(() => f.remove(), ms + 50);
}

export function lightning(svg, tile) {
  if (off()) { sfx.thunder(); return; }
  const c = tileCenter(tile);
  const make = (spread, width) => {
    let x = c.x + (Math.random() - 0.5) * 60;
    const pts = [[x, -20]];
    for (let y = 0; y < c.y - 10; y += 20) { x += (Math.random() - 0.5) * spread; pts.push([x, y]); }
    pts.push([c.x, c.y]);
    const p = svgEl('polyline', { points: pts.map((q) => q.join(',')).join(' '), class: 'bolt', 'stroke-width': width });
    svg.append(p);
    p.animate([{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 0.2, offset: 0.3 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }],
      { duration: 700, fill: 'forwards' });
    later(() => p.remove(), 750);
  };
  make(40, 5); make(60, 2);
  sfx.thunder();
  flash('rgba(255,252,230,.95)', 520);
  shake(svg.closest('.board-frame') ?? svg, 10);
  ring(svg, tile, '#fff27a', true);
  sparks(tileToHost(svg, null, tile), 24, ['#fff6b0', '#ffe066', '#ffffff']);
}

export function rain(host) {
  sfx.rain();
  if (off()) return;
  const r = host.getBoundingClientRect();
  for (let i = 0; i < 110; i++) {
    const d = div('raindrop');
    d.style.left = `${r.left + Math.random() * r.width}px`;
    d.style.top = `${r.top - 30}px`;
    stage().append(d);
    d.animate([{ transform: 'translate(0,0) rotate(12deg)', opacity: 0.9 }, { transform: `translate(-${r.height * 0.2}px, ${r.height + 40}px) rotate(12deg)`, opacity: 0.4 }],
      { duration: 550 + Math.random() * 350, delay: Math.random() * 1100, easing: 'linear', fill: 'forwards' });
    later(() => d.remove(), 2200);
  }
}

// 반짝이는 불꽃 입자 (화면 좌표)
export function sparks(at, n = 18, colors = ['#ffe28a', '#ffc94a', '#fff7d6']) {
  if (off()) return;
  for (let i = 0; i < n; i++) {
    const s = div('spark');
    s.style.left = `${at.x}px`; s.style.top = `${at.y}px`;
    s.style.background = colors[i % colors.length];
    stage().append(s);
    const a = Math.random() * Math.PI * 2;
    const d = 30 + Math.random() * 90;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 30}px)) scale(.2)`, opacity: 0 },
    ], { duration: 800 + Math.random() * 600, easing: EASE_OUT, fill: 'forwards' });
    later(() => s.remove(), 1500);
  }
}

// ---------- 토큰이 칸에서 매트로 날아간다 ----------
export async function flyTokens(from, toEl, iconId, count = 1) {
  if (!toEl) return;
  if (off()) { pulse(toEl); return; }
  const to = centerOf(toEl);
  const n = Math.min(count, 4);
  for (let i = 0; i < n; i++) {
    const tk = div('token', `<svg><use href="#${iconId}"/></svg>`);
    tk.style.left = `${from.x}px`; tk.style.top = `${from.y}px`;
    stage().append(tk);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lift = -80 - Math.abs(dx) * 0.15;
    const jitter = (i - n / 2) * 14;
    tk.animate([
      { transform: `translate(-50%,-50%) translate(0,0) scale(.3)`, opacity: 0 },
      { transform: `translate(-50%,-50%) translate(${jitter}px,-18px) scale(1.15)`, opacity: 1, offset: 0.15 },
      { transform: `translate(-50%,-50%) translate(${dx * 0.5 + jitter}px, ${dy * 0.5 + lift}px) scale(1)`, offset: 0.55 },
      { transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(.55)`, opacity: 0.95 },
    ], { duration: 900, delay: i * 110, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' });
    later(() => { tk.remove(); pulse(toEl); sfx.coin(i); }, 900 + i * 110);
  }
  await wait(900 + (n - 1) * 110);
}

export function pulse(el) {
  el?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)', filter: 'brightness(1.4)' }, { transform: 'scale(1)' }],
    { duration: 420, easing: EASE_BACK });
}

// ---------- 장 제목 ----------
export async function chapter(host, title, sub) {
  sfx.chapter();
  if (off()) return;
  const o = div('chapter-overlay', `
    <div class="chapter">
      <div class="orn">❦</div>
      <div class="t"></div>
      <div class="rule"></div>
      <div class="s"></div>
    </div>`);
  o.querySelector('.t').textContent = title;
  o.querySelector('.s').textContent = sub;
  host.append(o);
  o.animate([{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 2300, fill: 'forwards' });
  o.querySelector('.t').animate([{ clipPath: 'inset(0 100% 0 0)', filter: 'blur(4px)' }, { clipPath: 'inset(0 0 0 0)', filter: 'blur(0)' }],
    { duration: 900, delay: 150, easing: EASE_OUT, fill: 'both' });
  o.querySelector('.rule').animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 800, delay: 450, easing: EASE_OUT, fill: 'both' });
  o.querySelector('.s').animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 800, easing: EASE_OUT, fill: 'both' });
  o.querySelector('.orn').animate([{ opacity: 0, transform: 'scale(.4) rotate(-40deg)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: EASE_BACK, fill: 'both' });
  await wait(2300);
  o.remove();
}

// ---------- 3D 주사위 ----------
const FACE_ROT = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACES = [['front', 1], ['back', 6], ['right', 3], ['left', 4], ['top', 2], ['bottom', 5]];
const dieHTML = (side) => `<div class="die3d ${side}"><div class="cube">${FACES.map(([f, v]) =>
  `<div class="dface ${f}">${Array.from({ length: 9 }, (_, i) => `<i${PIPS[v].includes(i + 1) ? ' class="on"' : ''}></i>`).join('')}</div>`).join('')}</div></div>`;

export async function rollDice(host, d, { leftLabel, rightLabel, leftSide, rightSide, winText, loseText }) {
  if (motion.skip) return;
  const o = div('dice-overlay', `
    <div class="dice-panel">
      <div class="dice-row">
        <div class="dcol"><div class="dlabel"></div>${dieHTML(leftSide)}<div class="dtotal"></div></div>
        <div class="vs">대</div>
        <div class="dcol"><div class="dlabel"></div>${dieHTML(rightSide)}<div class="dtotal"></div></div>
      </div>
      <div class="dresult"></div>
    </div>`);
  const cols = o.querySelectorAll('.dcol');
  cols[0].querySelector('.dlabel').textContent = leftLabel;
  cols[1].querySelector('.dlabel').textContent = rightLabel;
  host.append(o);
  o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
  o.querySelector('.dice-panel').animate([{ transform: 'translateY(20px) scale(.92)' }, { transform: 'none' }], { duration: 350, easing: EASE_BACK });
  sfx.dice();
  const dur = motion.reduced ? 300 : 1300;
  [[d.attacker, 0], [d.defender, 1]].forEach(([v, i]) => {
    const cube = cols[i].querySelector('.cube');
    const [rx, ry] = FACE_ROT[v];
    const spinX = 720 + (i ? 360 : 0);
    const spinY = 1080 - (i ? 360 : 0);
    cube.animate([
      { transform: `translateZ(-38px) rotateX(${rx + spinX + 40}deg) rotateY(${ry + spinY + 70}deg)` },
      { transform: `translateZ(-38px) rotateX(${rx - 12}deg) rotateY(${ry + 14}deg)`, offset: 0.82 },
      { transform: `translateZ(-38px) rotateX(${rx}deg) rotateY(${ry}deg)` },
    ], { duration: dur, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
    cols[i].querySelector('.die3d').animate([
      { transform: 'translateY(-70px)' }, { transform: 'translateY(0)', offset: 0.45 },
      { transform: 'translateY(-18px)', offset: 0.62 }, { transform: 'translateY(0)', offset: 0.78 }, { transform: 'translateY(0)' },
    ], { duration: dur, easing: 'ease-in' });
  });
  await wait(dur + 100);
  const show = (el, base, bonus) => { el.innerHTML = bonus ? `${base}<small> + ${bonus}</small> = <b>${base + bonus}</b>` : `<b>${base}</b>`; };
  show(cols[0].querySelector('.dtotal'), d.attacker, d.attackerBonus);
  show(cols[1].querySelector('.dtotal'), d.defender, d.defenderBonus);
  const res = o.querySelector('.dresult');
  res.textContent = d.win ? winText : loseText;
  res.className = `dresult ${d.win ? 'win' : 'lose'}`;
  cols[d.win ? 0 : 1].classList.add('winner');
  res.animate([{ transform: 'scale(2.2)', opacity: 0, letterSpacing: '.4em' }, { transform: 'scale(1)', opacity: 1, letterSpacing: '.08em' }],
    { duration: 450, easing: EASE_BACK, fill: 'forwards' });
  (d.win ? sfx.chime : sfx.fail)();
  await wait(1250);
  o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
  await wait(250);
  o.remove();
}

// ---------- 글 ----------
export async function typewriter(el, text, cps = 38) {
  if (off()) { el.textContent = text; return; }
  el.textContent = '';
  el.classList.add('typing');
  for (const ch of text) {
    if (motion.skip) break;
    el.textContent += ch;
    if (ch.trim()) sfx.type();
    await new Promise((r) => setTimeout(r, ch === ',' || ch === '.' || ch === '!' ? 260 : 1000 / cps));
  }
  el.textContent = text;
  el.classList.remove('typing');
}

// 계시: 밀랍 인장이 찍히고, 글이 빛이 되어 떠올라 보드에 빛기둥으로 내린다
export async function castRevelation(scrollEl, sealEl, boardEl, text) {
  if (off()) { sfx.seal(); return; }
  const sr = scrollEl.getBoundingClientRect();
  // 1) 인장
  const seal = div('seal-stamp', '<svg viewBox="0 0 24 24"><use href="#i-faith"/></svg>');
  const sc = centerOf(sealEl);
  seal.style.left = `${sc.x}px`; seal.style.top = `${sc.y}px`;
  stage().append(seal);
  const target = { x: sr.right - 60, y: sr.bottom - 36 };
  // 애니메이션의 finished는 탭이 가려지면 멈추므로 타이머로 기다린다
  seal.animate([
    { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
    { transform: `translate(calc(-50% + ${(target.x - sc.x) / 2}px), calc(-50% + ${(target.y - sc.y) / 2 - 60}px)) scale(2.4)`, offset: 0.55 },
    { transform: `translate(calc(-50% + ${target.x - sc.x}px), calc(-50% + ${target.y - sc.y}px)) scale(1)` },
  ], { duration: 520, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
  await wait(520);
  sfx.seal();
  shake(scrollEl.closest('.altar') ?? scrollEl, 5);
  sparks(target, 14, ['#ff6b4a', '#c0392b', '#ffd0a0']);
  // 2) 글자가 빛으로 떠오른다
  const words = div('cast-words');
  words.textContent = text.length > 30 ? `${text.slice(0, 30)}…` : text;
  words.style.left = `${sr.left + sr.width / 2}px`;
  words.style.top = `${sr.top + sr.height / 2}px`;
  stage().append(words);
  const br = boardEl.getBoundingClientRect();
  sfx.whoosh();
  words.animate([
    { transform: 'translate(-50%,-50%) scale(1)', opacity: 0, filter: 'blur(2px)' },
    { transform: 'translate(-50%,-50%) translateY(-20px) scale(1.1)', opacity: 1, filter: 'blur(0)', offset: 0.25 },
    { transform: `translate(-50%,-50%) translate(${br.left + br.width / 2 - (sr.left + sr.width / 2)}px, ${br.top + br.height * 0.1 - (sr.top + sr.height / 2)}px) scale(.5)`, opacity: 0, filter: 'blur(3px)' },
  ], { duration: 1000, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
  later(() => { words.remove(); seal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }); later(() => seal.remove(), 450); }, 1000);
  await wait(750);
  // 3) 빛기둥
  const beam = div('beam');
  beam.style.left = `${br.left + br.width / 2}px`;
  beam.style.top = `${br.top - 40}px`;
  beam.style.height = `${br.height + 60}px`;
  stage().append(beam);
  sfx.holy();
  beam.animate([
    { transform: 'translateX(-50%) scaleX(.1)', opacity: 0 },
    { transform: 'translateX(-50%) scaleX(1)', opacity: 1, offset: 0.3 },
    { transform: 'translateX(-50%) scaleX(1.6)', opacity: 0 },
  ], { duration: 1200, easing: EASE_OUT, fill: 'forwards' });
  later(() => beam.remove(), 1250);
  sparks({ x: br.left + br.width / 2, y: br.top + br.height / 2 }, 30);
  await wait(700);
}

// ---------- 승패 ----------
export function endScreen(won, title, sub, onAgain) {
  (won ? sfx.win : sfx.lose)();
  const o = div(`endscreen ${won ? 'win' : 'lose'}`, `
    ${won ? '<div class="rays"></div>' : ''}
    <div class="end-box">
      <div class="end-orn">${won ? '✦' : '✝'}</div>
      <div class="end-title"></div>
      <div class="end-sub"></div>
      <div class="end-actions"><button class="btn-primary again">다시 하기</button><button class="btn-ghost close">보드 보기</button></div>
    </div>`);
  o.querySelector('.end-title').textContent = title;
  o.querySelector('.end-sub').textContent = sub;
  o.querySelector('.again').onclick = () => { o.remove(); onAgain(); };
  o.querySelector('.close').onclick = () => o.remove();
  document.body.append(o);
  o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: won ? 700 : 1600, fill: 'forwards' });
  o.querySelector('.end-title').animate([{ transform: 'scale(.4)', opacity: 0, letterSpacing: '.6em' }, { transform: 'scale(1)', opacity: 1, letterSpacing: '.12em' }],
    { duration: 1200, easing: EASE_OUT, fill: 'forwards' });
  if (motion.reduced) return;
  const colors = won ? ['#ffe28a', '#ffc94a', '#fff7d6', '#9cc0ff'] : ['#6b645c', '#4a443e', '#8a8176'];
  for (let i = 0; i < (won ? 90 : 60); i++) {
    const c = div(won ? 'confetti' : 'ash');
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    document.body.append(c);
    c.animate([{ transform: 'translateY(-5vh) rotate(0)' }, { transform: `translate(${(Math.random() - 0.5) * 20}vw, 110vh) rotate(${Math.random() * 900 - 450}deg)` }],
      { duration: (won ? 2600 : 5000) + Math.random() * 2600, delay: Math.random() * 1600, easing: won ? 'cubic-bezier(.3,.1,.6,1)' : 'linear', fill: 'forwards' });
    later(() => c.remove(), 9000);
  }
}

// ---------- 배경: 촛불 아래 떠다니는 먼지 ----------
export function ambient(canvas) {
  const ctx = canvas.getContext('2d');
  const motes = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, v: 0.00012 + Math.random() * 0.00035, p: Math.random() * 6.28 }));
  const resize = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
  resize();
  addEventListener('resize', resize);
  const draw = (t) => {
    if (!motion.reduced) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of motes) {
        m.y -= m.v;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        const x = (m.x + Math.sin(t / 3000 + m.p) * 0.01) * canvas.width;
        const y = m.y * canvas.height;
        const a = 0.25 + 0.25 * Math.sin(t / 900 + m.p);
        ctx.fillStyle = `rgba(255, 214, 150, ${a})`;
        ctx.beginPath(); ctx.arc(x, y, m.r * devicePixelRatio, 0, 6.283); ctx.fill();
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

// ---------- 미플이 매트에서 칸으로 날아간다 ----------
// items: [{ from: {x,y}, to: {x,y}, side }] (화면 좌표). onLand(i): 착지할 때마다 호출
export async function flyMeeples(items, onLand) {
  if (!items.length) return;
  if (off()) { items.forEach((_, i) => onLand?.(i)); return; }
  const DUR = 720;
  const GAP = 170;
  items.forEach((it, i) => {
    const m = div(`fly-meeple ${it.side}`, `<svg viewBox="-14 -16 28 30"><use href="#s-meeple" x="-14" y="-16" width="28" height="30" fill="url(#g-meeple-${it.side})" stroke="rgba(0,0,0,.55)" stroke-width="1.1"/></svg>`);
    m.style.left = `${it.from.x}px`; m.style.top = `${it.from.y}px`;
    m.style.opacity = '0';
    stage().append(m);
    const dx = it.to.x - it.from.x;
    const dy = it.to.y - it.from.y;
    const lift = -110 - Math.abs(dx) * 0.12;
    later(() => { sfx.lift(); }, i * GAP);
    m.animate([
      { transform: 'translate(-50%,-50%) translate(0,0) scale(.8) rotate(0deg)', opacity: 1 },
      { transform: `translate(-50%,-50%) translate(${dx * 0.18}px, -34px) scale(1.25) rotate(${dx > 0 ? 10 : -10}deg)`, opacity: 1, offset: 0.2 },
      { transform: `translate(-50%,-50%) translate(${dx * 0.55}px, ${dy * 0.55 + lift}px) scale(1.45) rotate(${dx > 0 ? 18 : -18}deg)`, offset: 0.55 },
      { transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(1.05, .9) rotate(0deg)`, offset: 0.92 },
      { transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(1) rotate(0deg)`, opacity: 1 },
    ], { duration: DUR, delay: i * GAP, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
    later(() => {
      m.remove();
      sfx.drop();
      puff(it.to);
      onLand?.(i);
    }, DUR + i * GAP);
  });
  await wait(DUR + (items.length - 1) * GAP + 80);
}

function puff(at) {
  if (off()) return;
  for (let i = 0; i < 8; i++) {
    const p = div('dust');
    p.style.left = `${at.x}px`; p.style.top = `${at.y + 12}px`;
    stage().append(p);
    const a = Math.PI + (i / 7) * Math.PI;
    p.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0.7 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * 22}px), calc(-50% + ${Math.sin(a) * 8}px)) scale(1.3)`, opacity: 0 }],
    { duration: 520, easing: EASE_OUT, fill: 'forwards' });
    later(() => p.remove(), 600);
  }
}

// ---------- 카메라: 칸으로 다가가고 주변을 어둡게 ----------
export function focusTile(frameEl, svg, tile) {
  if (!tile || motion.reduced) { unfocus(frameEl); return; }
  const p = tileToHost(svg, frameEl, tile);
  const r = frameEl.getBoundingClientRect();
  // 화면 가장자리 칸도 너무 쏠리지 않게 원점을 가운데 쪽으로 당긴다
  const ox = r.width / 2 + (p.x - r.width / 2) * 0.85;
  const oy = r.height / 2 + (p.y - r.height / 2) * 0.85;
  svg.style.transformOrigin = `${ox}px ${oy}px`;
  svg.style.transform = 'scale(1.22)';
  frameEl.classList.add('spot');
}
export function unfocus(frameEl) {
  const svg = frameEl.querySelector('#board');
  if (svg) svg.style.transform = '';
  frameEl.classList.remove('spot');
}

// ---------- 행동 띠 ----------
export async function actionBanner(frameEl, { side, icon, title, detail }) {
  if (motion.skip) return;
  frameEl.querySelector('.action-banner')?.remove();
  const b = div(`action-banner ${side}`, `
    <span class="ab-ico"><svg viewBox="0 0 24 24"><use href="#${icon}"/></svg></span>
    <span class="ab-text"><b></b><small></small></span>`);
  b.querySelector('b').textContent = title;
  b.querySelector('small').textContent = detail;
  frameEl.append(b);
  b.animate([
    { transform: 'translate(-50%, -24px) scale(.94)', opacity: 0 },
    { transform: 'translate(-50%, 0) scale(1)', opacity: 1 },
  ], { duration: 380, easing: EASE_BACK, fill: 'forwards' });
}
export function clearBanner(frameEl) {
  const b = frameEl.querySelector('.action-banner');
  if (!b) return;
  b.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%, -10px)' }], { duration: 250, fill: 'forwards' });
  later(() => b.remove(), 260);
}

// ---------- 숫자가 굴러 올라간다 ----------
export function countUp(el, from, to, ms = 650) {
  if (off() || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - (1 - k) ** 3;
    el.textContent = Math.round(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- 카드 기울이기 (커서를 따라 3D로 기운다) ----------
export function attachTilt(el, max = 12) {
  if (el.dataset.tilt) return;
  el.dataset.tilt = '1';
  el.addEventListener('pointermove', (e) => {
    if (motion.reduced) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * max * 2}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * max * 2}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  });
  el.addEventListener('pointerleave', () => {
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
  });
  el.addEventListener('pointerenter', () => sfx.hover());
}
