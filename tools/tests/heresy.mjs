import { E, I, doSpeak, doAccept, mulberry32, pick, REVELATIONS } from './lib.mjs';
let heresy = 0, zeroFaithUpkeep = 0, rounds = 0, attackForbidden = 0, attackLegalRounds = 0;
for (let g = 0; g < 300; g++) {
  const rng = mulberry32(g);
  const s = E.createState({ size: pick(rng, [5, 6, 7]), difficulty: pick(rng, ['easy', 'normal', 'hard']), seed: g * 7 + 1 });
  while (!s.winner) {
    E.startRound(s);
    if (E.legalActions(s, 'player').some((a) => a.type === 'attack')) {
      attackLegalRounds++;
      const r = I.interpretWithTablet(s, '두려워하지 말고 쳐라');
      if (r.forbidden.some((a) => a.type === 'attack')) attackForbidden++;
    }
    // long revelations (cost no longer grows with length — this now checks faith upkeep under ordinary play)
    doAccept(s, doSpeak(s, pick(rng, REVELATIONS.filter((t) => t.length > 30))));
    rounds++;
    if (s.log.some((l) => l.round === s.round && /신앙이 바닥나/.test(l.text))) heresy++;
    if (s.sides.player.faith === 0) zeroFaithUpkeep++;
  }
}
console.log({ rounds, heresyLogs: heresy, roundsEndingAtFaith0: zeroFaithUpkeep, attackLegalRounds, '"두려워하지 말고 쳐라" forbids attack': attackForbidden });
