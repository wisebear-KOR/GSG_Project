// @ts-check
// 일의 종류: 거두기 넷 · 짓기 넷 · 기도 · 탐험 · 선교 · 공격 — 12가지. 엔진의 행동(칸에 묶인 것)을 칸 없이 가리킬 때 쓴다.

/** @typedef {import('./types').ActionKind} ActionKind */
/** @typedef {import('./types').ActionType} ActionType */
/** @typedef {import('./types').ResourceKey} ResourceKey */
/** @typedef {import('./types').BuildKind} BuildKind */

/** 12가지, 늘 이 순서로 @type {ActionKind[]} */
export const KINDS = [
  'gather:food', 'gather:wood', 'gather:stone', 'gather:faith',
  'build:village', 'build:wall', 'build:temple', 'build:cathedral',
  'pray', 'explore', 'preach', 'attack',
];

/**
 * 행동(또는 그 모양을 가진 것)의 일의 종류
 * @param {{ type: string, gather?: string | null, build?: string | null }} a
 * @returns {ActionKind}
 */
export const kindOf = (a) => /** @type {ActionKind} */ (a.type === 'gather' ? `gather:${a.gather}` : a.type === 'build' ? `build:${a.build}` : a.type);

/**
 * 일의 종류를 엔진의 행동 모양으로 편다
 * @param {ActionKind} kind
 * @returns {{ type: ActionType, gather?: ResourceKey, build?: BuildKind }}
 */
export function kindParts(kind) {
  const [type, x] = /** @type {[ActionType, string | undefined]} */ (kind.split(':'));
  if (type === 'gather') return { type, gather: /** @type {ResourceKey} */ (x) };
  if (type === 'build') return { type, build: /** @type {BuildKind} */ (x) };
  return { type };
}

/**
 * 행동 key 'type:tile:gather|build' → { kind, tile }
 * @param {string} key
 * @returns {{ kind: ActionKind, tile: string }}
 */
export function fromKey(key) {
  const [type, tile, x] = key.split(':');
  return { kind: kindOf({ type, gather: x, build: x }), tile };
}

/** 수도·건물 안에서 하는 일 (칸을 차지하지 않는다: 막지도 막히지도 않는다) @param {{ type: string, build?: string | null }} a */
export const isHomeAct = (a) => a.type === 'pray' || (a.type === 'build' && ['temple', 'cathedral', 'wall'].includes(/** @type {string} */ (a.build)));
