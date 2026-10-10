// @ts-check
// 자원 묶음: 식량·나무·돌·신앙 네 칸. 게임의 모든 자원 셈(비용, 수입, 유지, 미리보기, 결산)은 이 꼴로 한다.
// 엔진의 진영 상태는 자원을 신도·신전과 함께 낱칸으로 들고 있으므로, 거기서 네 칸만 떼어 낼 때도 Res.of를 쓴다.

/** @typedef {import('./types').Resources} Resources */
/** @typedef {import('./types').ResourceKey} ResourceKey */

/** 자원의 이름(키), 늘 이 순서로 @type {ResourceKey[]} */
export const RES_KEYS = ['food', 'wood', 'stone', 'faith'];

/** @type {import('./types').ResourceOps} */
export const Res = {
  zero: () => ({ food: 0, wood: 0, stone: 0, faith: 0 }),
  of: (p) => ({ food: p?.food ?? 0, wood: p?.wood ?? 0, stone: p?.stone ?? 0, faith: p?.faith ?? 0 }),
  equal: (a, b) => RES_KEYS.every((k) => a[k] === b[k]),
  add: (a, b) => ({ food: a.food + b.food, wood: a.wood + b.wood, stone: a.stone + b.stone, faith: a.faith + b.faith }),
  sub: (a, b) => ({ food: a.food - b.food, wood: a.wood - b.wood, stone: a.stone - b.stone, faith: a.faith - b.faith }),
  scale: (a, n) => ({ food: a.food * n, wood: a.wood * n, stone: a.stone * n, faith: a.faith * n }),
  // 비용에 적힌 칸만 본다 (적히지 않은 칸은 묻지 않는다)
  canPay: (have, cost) => RES_KEYS.every((k) => cost[k] == null || /** @type {number} */ (have[k]) >= /** @type {number} */ (cost[k])),
  pay: (have, cost) => { for (const k of RES_KEYS) if (cost[k] != null) have[k] -= /** @type {number} */ (cost[k]); },
  short: (have, need) => ({
    food: Math.max(0, need.food - have.food), wood: Math.max(0, need.wood - have.wood),
    stone: Math.max(0, need.stone - have.stone), faith: Math.max(0, need.faith - have.faith),
  }),
  floor: (a, min) => ({ food: Math.max(min, a.food), wood: Math.max(min, a.wood), stone: Math.max(min, a.stone), faith: Math.max(min, a.faith) }),
  render: (a, labels) => RES_KEYS.map((k) => `${labels[k]} ${a[k]}`).join(', '),
};
