// 결정론 검사: 같은 시드 → 같은 사건·율법 순서 (플레이와 무관), 저장/복원 후 결과 동일
import * as E from '../../js/game/engine.js';
import { interpretWithTablet } from '../../js/game/interpreter.js';

function play(cfg, revs, saveAt = -1) {
  let s = E.createState(cfg);
  const seq = [];
  for (let r = 0; r < s.maxRounds && !s.winner; r++) {
    E.startRound(s);
    if (r === saveAt) s = E.hydrateState(JSON.parse(JSON.stringify(E.serializeState(s))));
    seq.push(`${s.event.id}/${s.lawCard.id}`);
    const res = interpretWithTablet(s, revs[r % revs.length]);
    const keys = res.forbidden.map((a) => a.key);
    const { accepted } = E.validateOrders(s, 'player', res.orders, keys, res.doctrine);
    const auto = E.autoFill(s, 'player', accepted, keys);
    E.resolveRound(s, [...accepted, ...auto], E.planEnemy(s));
  }
  return { seq: seq.join(' '), end: `${s.winner} ${s.winReason} r${s.round}` };
}
for (const diff of ['easy', 'normal', 'hard']) {
  const cfg = { size: 5, difficulty: diff, seed: 4242 };
  const a = play(cfg, ['강물이 너희를 먹이리라', '이웃에게 전하라']);
  const b = play(cfg, ['숲을 베어 마을을 세워라', '분노하라 쳐라']);
  const c = play(cfg, ['강물이 너희를 먹이리라', '이웃에게 전하라'], 3);
  const n = Math.min(a.seq.split(' ').length, b.seq.split(' ').length);
  // 사건 덱은 어느 난이도든 플레이와 무관하다. 율법 카드는 쉬움만 — 보통·어려움은 지난 계시를 듣고 맞서는 카드를 고른다(설계, 02 §4.3)
  const part = (x, i) => x.split(' ').slice(0, n).map((p) => p.split('/')[i]).join();
  const events = part(a.seq, 0) === part(b.seq, 0);
  const laws = diff !== 'easy' || part(a.seq, 1) === part(b.seq, 1);
  console.log(diff, 'decks-independent-of-play:', events && laws, '| save/restore identical:', a.seq === c.seq && a.end === c.end, '|', a.end);
}
const size = JSON.stringify(E.serializeState((() => { const s = E.createState({ size: 7, seed: 9 }); return s; })())).length;
console.log('fresh save bytes (7x7):', size);
