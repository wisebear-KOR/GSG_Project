// 연출 도우미. 모든 대기는 wait()를 거치므로 빨리 감기(motion.skip)로 한 번에 건너뛸 수 있다.
import { tileCenter } from './board.js';

// 연출 설정: 기본은 화려하게. 줄이기를 고르면 브라우저에 저장한다.
// (OS의 '애니메이션 줄이기' 설정을 따르지 않는 이유: 연출이 게임의 핵심이라 기본값으로 켜 두고 직접 끌 수 있게 한다)
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

export const wait = (ms) => new Promise((r) => setTimeout(r, motion.skip ? 0 : motion.reduced ? ms * 0.4 : ms));
const DIE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}
const remove = (el, ms) => setTimeout(() => el.remove(), ms);

// 칸에서 떠오르는 글자 (+2 🌾 등)
export function floatText(svg, tile, text, kind = 'good', offset = 0) {
  if (motion.skip) return;
  const c = tileCenter(tile);
  const t = svgEl('text', { x: c.x, y: c.y - 6 + offset, class: `float ${kind}` }, text);
  svg.append(t);
  t.animate([
    { transform: 'translateY(8px) scale(.6)', opacity: 0 },
    { transform: 'translateY(-6px) scale(1.15)', opacity: 1, offset: 0.25 },
    { transform: 'translateY(-44px) scale(1)', opacity: 0 },
  ], { duration: 1300, easing: 'ease-out', fill: 'forwards' });
  remove(t, 1400);
}

// 칸에서 퍼지는 고리
export function ring(svg, tile, color = '#ffd76a', big = false) {
  if (motion.skip) return;
  const c = tileCenter(tile);
  const r = svgEl('circle', { cx: c.x, cy: c.y, r: 10, class: 'ring', stroke: color });
  svg.append(r);
  r.animate([{ r: 10, opacity: 1, strokeWidth: 6 }, { r: big ? 90 : 55, opacity: 0, strokeWidth: 1 }],
    { duration: big ? 900 : 700, easing: 'ease-out', fill: 'forwards' });
  remove(r, 1000);
}

// 칸 위로 솟아오르는 아이콘 (건설)
export function rise(svg, tile, icon) {
  if (motion.skip) return;
  const c = tileCenter(tile);
  const t = svgEl('text', { x: c.x, y: c.y + 4, class: 'icon big' }, icon);
  svg.append(t);
  t.animate([
    { transform: 'translateY(30px) scale(.2)', opacity: 0 },
    { transform: 'translateY(-10px) scale(1.5)', opacity: 1, offset: 0.6 },
    { transform: 'translateY(0) scale(1.2)', opacity: 0 },
  ], { duration: 1000, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'forwards' });
  remove(t, 1100);
}

// 흔들기 (공격당한 보드)
export function shake(el, strength = 6) {
  if (motion.skip) return;
  el.animate([0, 1, 2, 3, 4, 5, 6].map((i) => ({ transform: `translate(${i % 2 ? strength : -strength}px, ${i % 3 ? -2 : 2}px)` }))
    .concat([{ transform: 'none' }]), { duration: 420 });
}

// 화면 섬광
export function flash(host, color = '#fffbe8', ms = 500) {
  if (motion.skip) return;
  const f = document.createElement('div');
  f.className = 'flash';
  f.style.background = color;
  host.append(f);
  f.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  remove(f, ms + 50);
}

// 번개: 위에서 칸까지 지그재그
export function lightning(svg, host, tile) {
  if (motion.skip) return;
  const c = tileCenter(tile);
  let x = c.x + (Math.random() - 0.5) * 40;
  const pts = [[x, -10]];
  for (let y = 0; y < c.y; y += 28) { x += (Math.random() - 0.5) * 36; pts.push([x, y]); }
  pts.push([c.x, c.y]);
  const p = svgEl('polyline', { points: pts.map((q) => q.join(',')).join(' '), class: 'bolt' });
  svg.append(p);
  p.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0 }], { duration: 650, fill: 'forwards' });
  remove(p, 700);
  flash(host, '#fffbe8', 450);
  shake(svg, 8);
  ring(svg, tile, '#fff27a', true);
}

// 비
export function rain(host, ms = 1600) {
  if (motion.skip) return;
  const w = host.clientWidth;
  for (let i = 0; i < 70; i++) {
    const d = document.createElement('div');
    d.className = 'raindrop';
    d.style.left = `${Math.random() * w}px`;
    host.append(d);
    d.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${host.clientHeight + 40}px)` }],
      { duration: 500 + Math.random() * 400, delay: Math.random() * ms * 0.6, easing: 'linear', fill: 'forwards' });
    remove(d, ms + 600);
  }
}

// 반짝이 (풍요, 보물)
export function sparkles(host, emoji = '✨', n = 16, at = null) {
  if (motion.skip) return;
  const w = host.clientWidth;
  const h = host.clientHeight;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.textContent = emoji;
    const x0 = at ? at.x : w / 2;
    const y0 = at ? at.y : h / 2;
    s.style.left = `${x0}px`;
    s.style.top = `${y0}px`;
    host.append(s);
    const ang = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 110;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1.1)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 500, easing: 'ease-out', fill: 'forwards' });
    remove(s, 1500);
  }
}

// 장 배너 ("제 3장")
export async function chapter(host, title, sub) {
  if (motion.skip) return;
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = '<div class="veil"></div><div class="chapter"><div class="t"></div><div class="s"></div></div>';
  o.querySelector('.t').textContent = title;
  o.querySelector('.s').textContent = sub;
  host.append(o);
  o.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1700, fill: 'forwards' });
  o.querySelector('.chapter').animate([{ transform: 'scale(.7)', letterSpacing: '0' }, { transform: 'scale(1)', letterSpacing: '.12em' }],
    { duration: 1700, easing: 'cubic-bezier(.2,1,.3,1)' });
  await wait(1700);
  o.remove();
}

// 주사위 굴림. result: { attacker, attackerBonus, defender, defenderBonus, win }
export async function rollDice(host, d, { leftLabel, rightLabel, leftSide, rightSide, winText, loseText }) {
  if (motion.skip) return;
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `
    <div>
      <div class="dice-box">
        <div class="die-col"><div class="die ${leftSide}">⚀</div><div class="die-label"></div><div class="die-total"></div></div>
        <div class="vs">VS</div>
        <div class="die-col"><div class="die ${rightSide}">⚀</div><div class="die-label"></div><div class="die-total"></div></div>
      </div>
      <div class="dice-result"></div>
    </div>`;
  const [l, r] = o.querySelectorAll('.die-col');
  l.querySelector('.die-label').textContent = leftLabel;
  r.querySelector('.die-label').textContent = rightLabel;
  host.append(o);
  o.animate([{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 200, fill: 'forwards' });
  const dice = o.querySelectorAll('.die');
  const spin = setInterval(() => dice.forEach((x) => { x.textContent = DIE[Math.floor(Math.random() * 6)]; }), 70);
  dice.forEach((x) => x.animate([{ transform: 'rotate(0) translateY(0)' }, { transform: 'rotate(360deg) translateY(-18px)' }, { transform: 'rotate(720deg) translateY(0)' }],
    { duration: 800, easing: 'ease-out' }));
  await wait(800);
  clearInterval(spin);
  dice[0].textContent = DIE[d.attacker - 1];
  dice[1].textContent = DIE[d.defender - 1];
  l.querySelector('.die-total').textContent = d.attackerBonus ? `${d.attacker} + ${d.attackerBonus}` : `${d.attacker}`;
  r.querySelector('.die-total').textContent = d.defenderBonus ? `${d.defender} + ${d.defenderBonus}` : `${d.defender}`;
  const res = o.querySelector('.dice-result');
  res.textContent = d.win ? winText : loseText;
  res.className = `dice-result ${d.win ? 'win' : 'lose'}`;
  res.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1 }, { transform: 'scale(1)' }], { duration: 400, fill: 'forwards' });
  await wait(1000);
  o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
  await wait(250);
  o.remove();
}

// 타자기 효과
export async function typewriter(el, text, cps = 40) {
  if (motion.skip || motion.reduced) { el.textContent = text; return; }
  el.textContent = '';
  for (const ch of text) {
    if (motion.skip) { el.textContent = text; return; }
    el.textContent += ch;
    await new Promise((r) => setTimeout(r, 1000 / cps));
  }
}

// 계시 글자가 입력칸에서 떠올라 보드로 날아간다
export async function castRevelation(fromEl, boardHost, text) {
  if (motion.skip || motion.reduced) return;
  const a = fromEl.getBoundingClientRect();
  const b = boardHost.getBoundingClientRect();
  const s = document.createElement('div');
  s.className = 'cast';
  s.textContent = text.length > 24 ? `${text.slice(0, 24)}…` : text;
  s.style.left = `${a.left + 12}px`;
  s.style.top = `${a.top + 8}px`;
  document.body.append(s);
  const dx = b.left + b.width / 2 - (a.left + 12) - s.offsetWidth / 2;
  const dy = b.top + b.height / 2 - (a.top + 8);
  s.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 0 },
    { transform: 'translate(0,-30px) scale(1.15)', opacity: 1, offset: 0.25 },
    { transform: `translate(${dx}px, ${dy}px) scale(.4)`, opacity: 0 },
  ], { duration: 1200, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  const glow = document.createElement('div');
  glow.className = 'board-glow';
  boardHost.append(glow);
  glow.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1500, fill: 'forwards' });
  await wait(1100);
  remove(s, 200);
  remove(glow, 500);
}

// 승패 화면
export function endScreen(won, title, sub, onAgain) {
  const o = document.createElement('div');
  o.className = `endscreen ${won ? 'win' : 'lose'}`;
  o.innerHTML = `${won ? '<div class="rays"></div>' : ''}<div class="box"><div class="t"></div><div class="s"></div><button>다시 하기</button> <button class="ghost close">보드 보기</button></div>`;
  o.querySelector('.t').textContent = title;
  o.querySelector('.s').textContent = sub;
  o.querySelector('button').onclick = () => { o.remove(); onAgain(); };
  o.querySelector('.close').onclick = () => o.remove();
  document.body.append(o);
  o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: won ? 600 : 1400, fill: 'forwards' });
  o.querySelector('.t').animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1 }, { transform: 'scale(1)' }],
    { duration: 900, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'forwards' });
  if (won && !motion.reduced) {
    const bits = ['🎉', '✨', '🕊️', '🌾', '⭐', '🎊'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.textContent = bits[i % bits.length];
      c.style.left = `${Math.random() * 100}vw`;
      document.body.append(c);
      c.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(110vh) rotate(${Math.random() * 720 - 360}deg)` }],
        { duration: 2500 + Math.random() * 2500, delay: Math.random() * 1500, easing: 'ease-in', fill: 'forwards' });
      remove(c, 6500);
    }
  }
}
