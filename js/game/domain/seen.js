// @ts-check
// 누가 볼 수 있나: 정보 객체의 경로마다 플레이어만 / 대사제도를 정한다 (docs/redesign/INFO.md의 분류표).
// 가장 긴 앞부분이 맞는 줄을 따르고, 표에 없는 경로는 플레이어만 본다.
// △: 아직 정하지 않은 것 — 정할 때까지 플레이어만

/** @typedef {import('./types').Seen} Seen */

/** @type {Record<string, Seen>} */
export const SEEN = {
  setup: 'player',
  turn: 'player', // △ 장 번호·막
  'event.now': 'priest',
  'event.quote': 'priest',
  'event.next': 'player',
  'event.choice': 'player',
  'event.picked': 'player',
  'event.options': 'player',
  'event.fortune': 'player',
  board: 'priest',
  'board.tiles.site': 'player',
  'board.tiles.legend': 'player',
  'board.tiles.activity': 'player',
  'board.tiles.yield': 'player',
  'board.tiles.value': 'player',
  'board.tiles.marks': 'player', // △ 믿음의 표식
  us: 'player',
  'us.actions': 'priest',
  'us.legalKinds': 'priest',
  'us.lessons': 'priest',
  'us.short': 'byDifficulty', // △ 모자란 것 (제안: 쉬움·보통은 대사제도)
  enemy: 'priest',
  'enemy.lawCard': 'afterReveal',
  'enemy.reacted': 'player',
  'enemy.leader': 'player',
  words: 'player',
  'words.revelations': 'priest',
  // 'words.lastOrders' △ 지난 장에 한 일 — 플레이어만 (words를 따른다)
  costs: 'player',
  preview: 'player',
};

/** @param {string} path @returns {Seen} */
export function seenOf(path) {
  for (let p = path; p; p = p.includes('.') ? p.slice(0, p.lastIndexOf('.')) : '') if (SEEN[p]) return SEEN[p];
  return 'player';
}

/**
 * 보는 이에 맞춰 거른 정보 객체. 플레이어는 정보 객체를 모두 본다 (못 보는 것은 처음부터 넣지 않았다).
 * @param {import('./types').GameInfo} info
 * @param {import('./types').Viewer} viewer
 * @param {import('./types').ViewOptions} opts
 * @returns {import('./types').InfoView}
 */
export function view(info, viewer, { difficulty, revealed }) {
  if (viewer === 'player') return structuredClone(info);
  /** @param {Seen} s */
  const ok = (s) => s === 'priest' || (s === 'byDifficulty' && difficulty !== 'hard') || (s === 'afterReveal' && revealed);
  /** @param {any} v @param {string} path @returns {any} 지울 것이면 undefined */
  const walk = (v, path) => {
    if (Array.isArray(v)) {
      if (!v.length || typeof v[0] !== 'object' || v[0] === null) return ok(seenOf(path)) ? [...v] : undefined;
      const items = v.map((x) => walk(x, path)).filter((x) => x !== undefined);
      return items.length ? items : undefined;
    }
    if (v && typeof v === 'object') {
      /** @type {Record<string, any>} */
      const out = {};
      for (const [k, x] of Object.entries(v)) { const r = walk(x, `${path}.${k}`); if (r !== undefined) out[k] = r; }
      return Object.keys(out).length ? out : undefined;
    }
    return ok(seenOf(path)) ? v : undefined;
  };
  /** @type {Record<string, any>} */
  const out = {};
  for (const [k, x] of Object.entries(info)) { const r = walk(x, k); if (r !== undefined) out[k] = r; }
  return out;
}
