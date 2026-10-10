// 도메인 정보 객체를 Kev 상태 꼴로 펼쳤을 때의 길이, 1단계 질문 수, 2단계 칸 후보 수를 판을 돌리며 잰다.
// 결과: kev-measure.jsonl (상태 글 표본) + 요약 JSON (stdout)
import fs from 'node:fs';
const W = new URL('../../', import.meta.url).href; // 저장소 루트
const { E, mulberry32, pick, REVELATIONS, doSpeak, doAccept } = await import(W + 'tools/tests/lib.mjs');
const { gameInfo, view, kindOf, KINDS } = await import(W + 'js/game/domain/index.js');

// kev/api.py render 그대로 (lab/kev-web/kev.js)
const pyStr = (v) => (typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v));
function render(v, indent = 0) {
  const pad = '  '.repeat(indent);
  if (v === null || v === undefined) return '';
  if (typeof v !== 'object') return pyStr(v);
  if (Array.isArray(v)) return v.map((x) => `${pad}- ${render(x, indent + 1).trimStart()}`).join('\n');
  return Object.entries(v).map(([k, x]) => (x !== null && typeof x === 'object' ? `${pad}${k}:\n${render(x, indent + 1)}` : `${pad}${k}: ${render(x)}`)).join('\n');
}

const CFGS = [{ size: 4, difficulty: 'easy', veteran: true }, { size: 5, difficulty: 'normal', veteran: true }, { size: 6, difficulty: 'hard', veteran: true }, { size: 7, difficulty: 'normal', veteran: true }];
const out = fs.createWriteStream(process.argv[2]);
const stat = { states: 0, legalKinds: [], tileKinds: [], candidates: {}, maxCand: 0, bySize: {} };
for (let g = 0; g < 48; g++) {
  const cfg = { ...CFGS[g % CFGS.length], seed: 300 + g * 101 };
  const s = E.createState(cfg); const rng = mulberry32(g + 3);
  for (let r = 0; r < s.maxRounds && !s.winner; r++) {
    E.startRound(s);
    const info = gameInfo(s);
    const pv = view(info, 'priest', { difficulty: cfg.difficulty, revealed: false });
    const { board, ...noBoard } = pv;
    // 2단계 상태 초안: 판에서 "이름이 붙은 사실"만 (주인 있는 칸, 성지, 붙인 이름) — 빈 땅은 뺀다
    const facts = (board?.tiles ?? []).filter((t) => t.owner || t.holy || t.name);
    const legal = E.legalActions(s, 'player');
    const tileKinds = KINDS.filter((k) => !['pray', 'build:temple', 'build:cathedral'].includes(k));
    for (const k of tileKinds) {
      const n = new Set(legal.filter((a) => kindOf(a) === k).map((a) => a.tile)).size;
      if (!n) continue;
      (stat.candidates[k] ??= []).push(n);
      stat.maxCand = Math.max(stat.maxCand, n);
    }
    stat.states += 1;
    stat.legalKinds.push(info.us.legalKinds.length);
    out.write(JSON.stringify({ size: cfg.size, round: s.round, s1: render(noBoard), s1min: render({ event: pv.event?.now?.name, enemy: { intents: pv.enemy?.intents, guard: pv.enemy?.guard, pop: pv.enemy?.pop, villages: pv.enemy?.villages, capitalHp: pv.enemy?.capitalHp }, words: pv.words, us: { actions: pv.us?.actions, legalKinds: pv.us?.legalKinds, short: pv.us?.short } }), s2: render({ tiles: facts, intents: pv.enemy?.intents }), full: render(pv) }) + '\n');
    doAccept(s, doSpeak(s, pick(rng, REVELATIONS.slice(2, 48))));
  }
}
out.end();
const q = (xs, p) => { const a = [...xs].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
console.log(JSON.stringify({
  states: stat.states,
  legalKinds: { median: q(stat.legalKinds, 0.5), max: Math.max(...stat.legalKinds) },
  candidates: Object.fromEntries(Object.entries(stat.candidates).map(([k, v]) => [k, { median: q(v, 0.5), p90: q(v, 0.9), max: Math.max(...v) }])),
  maxCand: stat.maxCand,
}, null, 1));
