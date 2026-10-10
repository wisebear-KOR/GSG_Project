// 실험 데이터 만들기: 석판 시험 문장(1372)과 은유 세트(lab/scenario.js 채점 20)를 일의 종류 12가지 정답으로.
//   node data.mjs → cases.json (석판 문장: 석판 출력 = 정답), scenario.json (은유 세트: 사람이 적은 기대·회피), tablet-scenario.json
import fs from 'node:fs';
const W = new URL('../../', import.meta.url).href; // 저장소 루트
const E = await import(W + 'js/game/engine.js');
const I = await import(W + 'js/game/interpreter.js');
const { KINDS, kindOf } = await import(W + 'js/game/domain/index.js');
const { SAMPLE_SETS } = await import(W + 'lab/scenario.js');

// tablet-cases.mjs의 CASES를 꺼낸다 (모듈이 내보내지 않으므로 글에서 잘라 평가)
const src = fs.readFileSync(new URL('tools/tests/tablet-cases.mjs', W), 'utf8');
const start = src.indexOf('const CASES = [');
let depth = 0, end = -1;
for (let i = src.indexOf('[', start); i < src.length; i++) { if (src[i] === '[') depth++; else if (src[i] === ']') { depth--; if (!depth) { end = i + 1; break; } } }
const CASES = (0, eval)(src.slice(src.indexOf('[', start), end));

// tablet-cases와 같은 상태: 튜토리얼 3×3 1장
const fresh = () => { const s = E.createState({ mode: 'tutorial' }); E.startRound(s); return s; };
const base = fresh();
const label = (r) => {
  const say = Object.fromEntries(KINDS.map((k) => [k, 'none']));
  for (const a of r.orders) say[kindOf(a)] = 'do';
  for (const a of r.forbidden) say[kindOf(a)] = 'dont';
  return say;
};
const DOC = { peace: 0, war: 1, abundance: 2, wisdom: 3 };
const cases = CASES.map(([text, want, avoid], i) => {
  const r = I.interpretWithTablet(base, text);
  return { i, text, want, avoid, say: label(r), doctrine: r.doctrine ?? null };
});
fs.writeFileSync(new URL('./cases.json', import.meta.url), JSON.stringify(cases));

// 은유 세트: 시나리오 행동 → 게임의 일의 종류 (B1 밭 → 식량, B3 제단 → 신전 또는 기도, R1 쉼 → 기도)
const MAP = { G1: ['gather:wood'], G2: ['gather:food'], G3: ['gather:food'], G4: ['gather:stone'], P1: ['pray'], B1: ['gather:food'], B2: ['build:wall'],
  B3: ['build:temple', 'pray'], R1: ['pray'], M1: ['preach'], M2: ['preach'], W1: ['attack'], W2: ['attack'], E1: ['explore'] };
const EVENT_TEXT = { threat: '율법파 신도들이 국경에 모여들고 있다', drought: '가뭄이 들었다', prophet: '떠돌이 예언자가 나타났다' };
const scen = Object.entries(SAMPLE_SETS).flatMap(([set, list]) => list.filter((s) => !s.observe).map((s) => ({
  set, text: s.text, event: s.event ?? null, eventText: EVENT_TEXT[s.event] ?? null,
  expect: [...new Set(s.expect.flatMap((id) => MAP[id]))], avoid: [...new Set(s.avoid.flatMap((id) => MAP[id]))],
  doctrine: s.doctrine == null ? null : [s.doctrine].flat(),
})));
fs.writeFileSync(new URL('./scenario.json', import.meta.url), JSON.stringify(scen));

// 석판이 은유 세트에서 하는 것: 알아들은 일(orders) 가운데 기대가 하나라도 있고 회피가 없으면 맞음
const ts = scen.map((s) => {
  const r = I.interpretWithTablet(base, s.text);
  const got = [...new Set(r.orders.map(kindOf))];
  const ok = (s.expect.length === 0 || s.expect.some((k) => got.includes(k))) && !s.avoid.some((k) => got.includes(k));
  return { text: s.text, set: s.set, got, forbid: r.forbidden.map(kindOf), doctrine: r.doctrine, ok, docOk: s.doctrine ? s.doctrine.includes(r.doctrine) : null, silent: !got.length };
});
fs.writeFileSync(new URL('./tablet-scenario.json', import.meta.url), JSON.stringify(ts, null, 1));
const n = (f) => ts.filter(f).length;
console.log(`cases ${cases.length}, kinds/label do ${cases.reduce((a, c) => a + Object.values(c.say).filter((v) => v === 'do').length, 0)}, dont ${cases.reduce((a, c) => a + Object.values(c.say).filter((v) => v === 'dont').length, 0)}, no doctrine ${cases.filter((c) => !c.doctrine).length}`);
console.log(`tablet on scenario: intent ${n((x) => x.ok)}/${ts.length} (basic ${n((x) => x.ok && x.set === 'basic')}/10, hard ${n((x) => x.ok && x.set === 'hard')}/10), silent ${n((x) => x.silent)}, doctrine ${n((x) => x.docOk)}/${n((x) => x.docOk !== null)}`);
for (const x of ts) console.log(`${x.ok ? 'O' : 'X'} ${x.text} → ${x.got.join(',') || '-'}${x.forbid.length ? ` ⊘${x.forbid.join(',')}` : ''} [${x.doctrine}]`);
