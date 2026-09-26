// 시드 기반 무작위 맵 생성
// - 양쪽이 공평하도록 점대칭: (r, c)와 (rows-1-r, cols-1-c)는 같은 지형
// - 두 수도는 가운데 쪽으로 한 칸 들여 놓아 중반에 반드시 만나게 한다
// - 사막: 전체의 10% 이하, 수도 옆에는 없고, 두 칸 넘게 뭉치지 않는다
// - 각 수도 2칸 안에는 평원(또는 강), 숲, 산이 적어도 하나씩 있다
// - 가운데에는 서로 탐내는 성스러운 언덕

const WEIGHTS = [['plain', 30], ['forest', 24], ['mountain', 16], ['river', 13], ['desert', 10], ['hill', 4]];
const ROWS = 'ABCDEFGHI';

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 육각 좌표 도우미 (engine.js와 같은 규칙)
const DIRS = { even: [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]], odd: [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] };
const cube = (r, c) => { const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; };
const dist = (a, b) => { const [ax, ay, az] = cube(a.r, a.c); const [bx, by, bz] = cube(b.r, b.c); return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz)); };

export function capitalsFor(rows, cols) {
  return { player: { r: rows - 1, c: 1 }, enemy: { r: 0, c: cols - 2 } };
}

export function generateMap({ rows, cols, seed }) {
  const rnd = mulberry32(seed);
  const total = WEIGHTS.reduce((s, [, w]) => s + w, 0);
  const pick = () => { let x = rnd() * total; for (const [t, w] of WEIGHTS) { if ((x -= w) < 0) return t; } return 'plain'; };
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  const mirror = (r, c) => ({ r: rows - 1 - r, c: cols - 1 - c });
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c });
  const set = (r, c, t) => { grid[r][c] = t; const m = mirror(r, c); grid[m.r][m.c] = t; };
  const neighborsOf = (r, c) => (r % 2 ? DIRS.odd : DIRS.even).map(([dr, dc]) => ({ r: r + dr, c: c + dc }))
    .filter((p) => p.r >= 0 && p.r < rows && p.c >= 0 && p.c < cols);

  // 1) 무작위로 채우고 (점대칭이므로 절반만 뽑는다)
  for (const { r, c } of cells) if (grid[r][c] === null) set(r, c, pick());

  // 2) 비슷한 지형끼리 뭉치도록 한 번 다듬는다 (사막·언덕은 번지지 않는다)
  for (const { r, c } of cells) {
    if (rnd() > 0.45) continue;
    const counts = {};
    for (const n of neighborsOf(r, c)) { const t = grid[n.r][n.c]; if (t !== 'desert' && t !== 'hill') counts[t] = (counts[t] ?? 0) + 1; }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 3 && grid[r][c] !== 'desert') set(r, c, best[0]);
  }

  // 2-1) 한 지형이 맵을 뒤덮지 않게 상한을 둔다 (다듬기가 산맥 하나로 뭉쳐 버리는 시드가 있었다)
  const LIMIT = { plain: 0.4, forest: 0.34, mountain: 0.26, river: 0.22 };
  const countOf = (t) => cells.filter((p) => grid[p.r][p.c] === t).length;
  const rarest = (except) => Object.keys(LIMIT).filter((t) => t !== except).sort((a, b) => countOf(a) / LIMIT[a] - countOf(b) / LIMIT[b])[0];
  const capTerrain = (movable) => {
    for (let guard = 0; guard < rows * cols; guard++) {
      const over = Object.keys(LIMIT).find((t) => countOf(t) > Math.ceil(rows * cols * LIMIT[t]));
      if (!over) return;
      const pool = cells.filter((p) => grid[p.r][p.c] === over && movable(p));
      if (!pool.length) return;
      const p = pool[Math.floor(rnd() * pool.length)];
      set(p.r, p.c, rarest(over));
    }
  };
  capTerrain(() => true);

  const caps = capitalsFor(rows, cols);
  set(caps.player.r, caps.player.c, 'plain');

  // 3) 가운데 성지
  const mid = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
  set(mid.r, mid.c, 'hill');

  // 4) 사막 정리: 수도 1칸 안 금지, 세 칸 이상 뭉침 금지, 전체 10% 이하
  // 홀수 행 밀림 때문에 점대칭이 육각 거리를 정확히 보존하지 않으므로, 칸과 그 대칭 칸을 모두 검사한다
  const fix = ['plain', 'forest', 'mountain', 'river'];
  const nearCap = (p, d) => [p, mirror(p.r, p.c)].some((q) => dist(q, caps.player) <= d || dist(q, caps.enemy) <= d);
  for (const p of cells) if (grid[p.r][p.c] === 'desert' && nearCap(p, 1)) set(p.r, p.c, fix[Math.floor(rnd() * fix.length)]);
  for (const p of cells) {
    if (grid[p.r][p.c] !== 'desert') continue;
    const clustered = [p, mirror(p.r, p.c)].some((q) => neighborsOf(q.r, q.c).filter((n) => grid[n.r][n.c] === 'desert').length >= 2);
    if (clustered) set(p.r, p.c, rarest('desert'));
  }
  const deserts = () => cells.filter((p) => grid[p.r][p.c] === 'desert');
  const maxDesert = Math.floor(rows * cols * 0.1);
  while (deserts().length > maxDesert) { const d = deserts()[Math.floor(rnd() * deserts().length)]; set(d.r, d.c, rarest('desert')); }

  // 5) 두 수도 각각 2칸 안의 필수 자원 보장
  const need = [['plain', 'river'], ['forest'], ['mountain']];
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const cap of [caps.player, caps.enemy]) {
      const near = cells.filter((p) => dist(p, cap) <= 2 && !(p.r === cap.r && p.c === cap.c) && !(p.r === mid.r && p.c === mid.c));
      for (const kinds of need) {
        if (near.some((p) => kinds.includes(grid[p.r][p.c]))) continue;
        // 사막 → 흔한 지형(같은 종류가 2칸 이상 있는 것) 순으로 바꿀 칸을 고른다
        const count = (t) => near.filter((q) => grid[q.r][q.c] === t).length;
        const spot = near.find((p) => grid[p.r][p.c] === 'desert')
          ?? [...near].sort((a, b) => count(grid[b.r][b.c]) - count(grid[a.r][a.c]))[0];
        set(spot.r, spot.c, kinds[0]);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // 사막이 하나도 없는 맵에는 가운데 지대에 한 쌍을 둔다 (수도 2칸 안은 제외해 자원 보장을 깨지 않는다)
  if (rows * cols >= 25 && deserts().length === 0) {
    const cand = cells.filter((p) => !nearCap(p, 2) && grid[p.r][p.c] !== 'hill');
    if (cand.length) { const d = cand[Math.floor(rnd() * cand.length)]; set(d.r, d.c, 'desert'); }
  }

  // 수도 주변을 건드리지 않고 한 번 더 상한을 맞춘다
  capTerrain((p) => !nearCap(p, 2) && !(p.r === mid.r && p.c === mid.c) && grid[p.r][p.c] !== 'desert');

  // 6) 수도 표시
  const out = grid.map((row) => [...row]);
  out[caps.player.r][caps.player.c] = 'P';
  out[caps.enemy.r][caps.enemy.c] = 'E';
  return out;
}

// 발견지 자리: 점대칭 쌍, 수도에서 2칸 넘게, 가운데 성지 제외. 지형 난수와 따로 굴려 기존 맵이 바뀌지 않게 한다
export function placeSites({ rows, cols, seed, map }) {
  const rnd = mulberry32(seed ^ 0x2f6b1a3d);
  const caps = capitalsFor(rows, cols);
  const mid = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
  const mirror = (p) => ({ r: rows - 1 - p.r, c: cols - 1 - p.c });
  const ok = (p) => [p, mirror(p)].every((q) => dist(q, caps.player) > 2 && dist(q, caps.enemy) > 1 && !(q.r === mid.r && q.c === mid.c) && !['P', 'E'].includes(map[q.r][q.c]));
  const cands = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (ok({ r, c }) && (r < rows - 1 - r || (r === rows - 1 - r && c < cols - 1 - c))) cands.push({ r, c });
  const kinds = ['nomads', 'altar', 'spring', 'bones'];
  const pairs = rows * cols >= 36 ? 2 : 1;
  const out = [];
  for (let i = 0; i < pairs && cands.length; i++) {
    const p = cands.splice(Math.floor(rnd() * cands.length), 1)[0];
    const kind = kinds.splice(Math.floor(rnd() * kinds.length), 1)[0];
    out.push({ ...p, kind }, { ...mirror(p), kind });
  }
  return out;
}

export const tileLabel = (r, c) => `${ROWS[r]}${c + 1}`;

// 맵 통계 (밸런스 확인용)
export function mapStats(map) {
  const counts = {};
  for (const row of map) for (const t of row) counts[t] = (counts[t] ?? 0) + 1;
  return counts;
}
