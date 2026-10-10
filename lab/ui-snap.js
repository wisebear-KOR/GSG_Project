// 화면 대조 도구: 정해진 판을 저장해 불러온 뒤, 말하기 → 확인 → 결산 단계마다 패널의 HTML을 떠서
// 고치기 전(base)과 고친 뒤(new)를 견준다. 리팩터링이 화면을 바꾸지 않았는지 보는 데 쓴다.
//
// 브라우저 콘솔에서 (정적 서버의 아무 쪽에서):
//   const S = await import('/lab/ui-snap.js'); await S.prepare('s5n-r6', 'base')   → 게임 화면으로 넘어간다
// 넘어간 게임 화면에서:
//   const S = await import('/lab/ui-snap.js'); await S.run()                       → 떠서 저장 (new면 base와 견준 결과)
// 결과는 이 브라우저의 localStorage 'snap.<mode>.<이름>'에 남는다.
// 사관의 과제 진행(localStorage 'gsg.onboard')은 판을 거듭하며 넘어가고, 과제를 마치면 매트를 한 번 더 그린다
// (교리 보석의 '새로' 표시가 달라진다). base를 뜬 순서대로 돌리고, 첫 장면 전에 같은 값으로 맞춘다.

const PANELS = ['matPlayer', 'matEnemy', 'law', 'season', 'track', 'altar', 'board', 'subtitle'];
const REV_POOL = 48;

// 이름 → 판 설정, 미리 돌릴 장 수, 계시 고르기 시드, 확인 단계에서 내릴 계시
export const SCENARIOS = {
  's5n-r1': { cfg: { size: 5, difficulty: 'normal', seed: 11 }, rounds: 0, revSeed: 1, text: '강에서 물고기를 잡고 숲의 나무를 베어라' },
  's5n-r6': { cfg: { size: 5, difficulty: 'normal', seed: 31, veteran: true }, rounds: 5, revSeed: 3, text: '율법파의 약한 마을을 쳐라, 그리고 기도하라' },
  's6h-r8': { cfg: { size: 6, difficulty: 'hard', seed: 77, veteran: true }, rounds: 7, revSeed: 5, text: '이웃에게 사랑을 전하고 성벽을 쌓아라' },
  's4e-r3': { cfg: { size: 4, difficulty: 'easy', seed: 5, veteran: true, unlock: 2 }, rounds: 2, revSeed: 7, text: '마을을 넓히고 돌을 캐라' },
  's7n-r9': { cfg: { size: 7, difficulty: 'normal', seed: 99, veteran: true }, rounds: 8, revSeed: 9, text: '숲을 베지 마라, 들판에서 곡식을 거두라' },
};

export async function prepare(name, mode = 'new') {
  const sc = SCENARIOS[name];
  const { E, mulberry32, pick, REVELATIONS, doSpeak, doAccept } = await import('/tools/tests/lib.mjs');
  const meta = await import('/js/game/meta.js');
  const s = E.createState(sc.cfg);
  const rng = mulberry32(sc.revSeed);
  for (let r = 0; r < sc.rounds && !s.winner; r++) { E.startRound(s); doAccept(s, doSpeak(s, pick(rng, REVELATIONS.slice(2, REV_POOL)))); }
  if (s.winner) throw new Error(`${name}: 판이 끝났다 (${s.winReason})`);
  E.startRound(s);
  meta.saveGame(s, 'speak');
  localStorage.setItem('gsg.motion', 'reduced');
  localStorage.setItem('gsg.speed', JSON.stringify('instant'));
  localStorage.setItem('gsg.suggest', 'false');
  sessionStorage.setItem('snap', JSON.stringify({ name, mode }));
  // 쪽 HTML이 캐시돼 있으면 옛 import map(옛 모듈)으로 뜬다 — 주소를 바꿔 새로 받는다
  location.href = `/game/index.html?play&ai=tablet&snap=${Date.now()}`;
  return `prepared ${name} (${mode}) at round ${s.round}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(cond, ms = 20000) {
  const t0 = performance.now();
  while (!cond()) { if (performance.now() - t0 > ms) throw new Error('timeout'); await sleep(100); }
  await sleep(600);
}
// 화면 배치에 따라 흔들리는 위치값(장 트랙의 선공 표식 left 등)은 지운다.
// 사관의 과제(판을 거듭하며 넘어가는 메타 진행)와 지도자·대사제의 말풍선(시간차로 붙는다)도 뺀다
const norm = (html) => html
  ?.replace(/style="(left|top): [\d.]+px;"/g, 'style="$1:*"')
  .replace(/<div class="task-ribbon">.*?<\/div>/g, '')
  .replace(/<div class="leader-say [^"]*"><b>.*?<\/b>.*?<\/div>/g, '') ?? null;
const panels = () => Object.fromEntries(PANELS.map((id) => [id, norm(document.getElementById(id)?.innerHTML)]));

// 칸마다 마우스를 올려 툴팁을 뜬다
function tips() {
  const out = {};
  const tip = document.getElementById('tileTip');
  for (const g of document.querySelectorAll('#board .tile')) {
    const r = g.getBoundingClientRect();
    g.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    out[g.dataset.id] = tip.innerHTML;
  }
  return out;
}

export async function run() {
  const { name, mode } = JSON.parse(sessionStorage.getItem('snap') ?? '{}');
  const sc = SCENARIOS[name];
  // 화면은 같아도 그린 뒤에 던진 오류(연출·저장이 멈춘다)는 따로 잡는다
  const errors = [];
  const onErr = (e) => errors.push(String(e.reason?.stack ?? e.reason ?? e.error?.stack ?? e.message).split('\n').slice(0, 3).join(' | '));
  addEventListener('error', onErr);
  addEventListener('unhandledrejection', onErr);
  await until(() => document.querySelector('.seal-btn') && !document.querySelector('.seal-btn').disabled);
  const snap = { speak: { ...panels(), tips: tips() } };
  const ta = document.querySelector('.scroll textarea');
  ta.value = sc.text; ta.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(300);
  snap.typing = { altar: document.getElementById('altar').innerHTML, board: document.getElementById('board').innerHTML };
  document.querySelector('.seal-btn').click();
  await until(() => document.querySelector('.accept') && !document.querySelector('.accept').disabled);
  snap.confirm = { ...panels(), tips: tips() };
  document.querySelector('.accept').click();
  await until(() => document.querySelector('.next'), 60000);
  snap.resolved = panels();
  await sleep(1500);
  removeEventListener('error', onErr);
  removeEventListener('unhandledrejection', onErr);
  localStorage.setItem(`snap.${mode}.${name}`, JSON.stringify(snap));
  const err = errors.length ? `\n오류 ${errors.length}건:\n${errors.join('\n')}` : '';
  return (mode === 'new' ? compare(name) : `saved base ${name}`) + err;
}

// base와 new를 견준다: 다른 패널마다 처음 갈라지는 자리 앞뒤를 보인다
export function compare(name) {
  const a = JSON.parse(localStorage.getItem(`snap.base.${name}`) ?? 'null');
  const b = JSON.parse(localStorage.getItem(`snap.new.${name}`) ?? 'null');
  if (!a || !b) return `${name}: base 또는 new가 없다`;
  // 저장된 base도 같은 규칙으로 다시 고른다 (규칙을 나중에 늘렸을 때)
  const n2 = (v) => (typeof v === 'string' ? norm(v) : v);
  const diffs = [];
  for (const step of Object.keys(a)) {
    for (const key of Object.keys(a[step])) {
      const x = a[step][key]; const y = b[step]?.[key];
      if (key === 'tips') {
        for (const id of Object.keys(x)) if (x[id] !== y?.[id]) diffs.push(`${step}.tips.${id}: ${cut(x[id], y?.[id])}`);
      } else if (n2(x) !== n2(y)) diffs.push(`${step}.${key}: ${cut(n2(x), n2(y))}`);
    }
  }
  return diffs.length ? `${name}: ${diffs.length}곳 다름\n${diffs.slice(0, 12).join('\n')}` : `${name}: 같음`;
}
function cut(x, y) {
  x = String(x); y = String(y);
  let i = 0; while (i < x.length && x[i] === y[i]) i++;
  return `@${i} base「${x.slice(Math.max(0, i - 60), i + 80)}」 new「${y.slice(Math.max(0, i - 60), i + 80)}」`;
}
