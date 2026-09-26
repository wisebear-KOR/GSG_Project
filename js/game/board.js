// 육각 보드 SVG 렌더링: 금테 액자 속 양피지 지도 위에 입체 타일을 올린다
const R = 48;                       // 육각 반지름
const W = Math.sqrt(3) * R;         // 육각 가로
const PAD = 34;                     // 액자 안쪽 여백
const NS = 'http://www.w3.org/2000/svg';
// 보드 크기는 맵(행·열 수)에 따라 정해진다
const sizeOf = (rows, cols) => ({ width: W * (cols + 0.5) + PAD * 2, height: 1.5 * R * (rows - 1) + 2 * R + PAD * 2 });

const center = (t) => ({ x: PAD + W / 2 + W * (t.c + 0.5 * (t.r & 1)), y: PAD + R + 1.5 * R * t.r });
export const tileCenter = center;

const hexPoints = ({ x, y }, r = R) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (60 * i - 30);
  return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

// 칸 중심을 기준 요소의 픽셀 좌표로 바꾼다 (HTML 연출용). host가 없으면 화면 좌표
export function tileToHost(svg, host, tile) {
  const c = center(tile);
  const m = svg.getScreenCTM();
  const hr = host ? host.getBoundingClientRect() : { left: 0, top: 0 };
  return { x: m.a * c.x + m.e - hr.left, y: m.d * c.y + m.f - hr.top };
}

// 미플이 놓이는 자리 (칸 안에서 진영별로 좌우)
const markerPos = (t, side) => { const c = center(t); return { x: c.x + (side === 'player' ? -R * 0.46 : R * 0.46), y: c.y - R * 0.3 }; };

// 미플 자리의 화면 좌표 (날아가는 연출의 목적지)
export function markerToScreen(svg, tile, side) {
  const p = markerPos(tile, side);
  const m = svg.getScreenCTM();
  return { x: m.a * p.x + m.e, y: m.d * p.y + m.f };
}

function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}
const use = (id, x, y, size, attrs = {}) => el('use', { href: `#${id}`, x: x - size / 2, y: y - size / 2, width: size, height: size, ...attrs });

function frame(svg, WIDTH, HEIGHT) {
  const g = el('g', { class: 'frame' });
  g.append(el('rect', { x: 2, y: 2, width: WIDTH - 4, height: HEIGHT - 4, rx: 22, fill: 'url(#g-wood)', stroke: 'url(#g-gold)', 'stroke-width': 4 }));
  g.append(el('rect', { x: 14, y: 14, width: WIDTH - 28, height: HEIGHT - 28, rx: 14, class: 'parchment' }));
  g.append(el('rect', { x: 14, y: 14, width: WIDTH - 28, height: HEIGHT - 28, rx: 14, fill: '#000', filter: 'url(#f-paper)', opacity: 0.9 }));
  g.append(el('rect', { x: 20, y: 20, width: WIDTH - 40, height: HEIGHT - 40, rx: 10, fill: 'none', stroke: '#8a6420', 'stroke-opacity': 0.55, 'stroke-width': 1.2 }));
  // 나침반 장식
  const rose = el('g', { class: 'rose', transform: `translate(${WIDTH - 52} ${HEIGHT - 50})` });
  rose.append(el('circle', { r: 20, fill: 'none', stroke: '#8a6420', 'stroke-opacity': 0.5 }));
  rose.append(el('path', { d: 'M0-24 4-4 0 0-4-4zM0 24 4 4 0 0-4 4z', fill: '#8a6420', 'fill-opacity': 0.55 }));
  rose.append(el('path', { d: 'M-24 0-4-4 0 0-4 4zM24 0 4-4 0 0 4 4z', fill: '#8a6420', 'fill-opacity': 0.3 }));
  rose.append(el('text', { y: -27, class: 'rose-n' }, '北'));
  g.append(rose);
  svg.append(g);
}

// markers: [{ tile, side, label, dim, drop, delay }]
const INTENT_ICON = { attack: 'd-war', preach: 'd-peace', build: 'i-house', gather: 'i-food', pray: 'i-temple' };

export function renderBoard(svg, state, { markers = [], highlight = [], hints = [], intents = [], onTileClick, selectable = [], focus = null } = {}) {
  const { width, height } = sizeOf(state.rows ?? 5, state.cols ?? 5);
  svg.setAttribute('viewBox', `0 0 ${width.toFixed(0)} ${height.toFixed(0)}`);
  svg.replaceChildren();
  frame(svg, width, height);

  const tiles = el('g', { class: 'tiles' });
  for (const t of state.tiles) {
    const c = center(t);
    const hidden = !t.revealed;
    const terr = hidden ? 'fog' : t.terrain;
    const g = el('g', { class: `tile tile-${terr}${selectable.includes(t.id) ? ' selectable' : ''}${focus === t.id ? ' focused' : ''}`, 'data-id': t.id });
    g.append(el('polygon', { points: hexPoints({ x: c.x, y: c.y + 3 }), class: 'hex-base' }));
    g.append(el('polygon', { points: hexPoints(c), fill: `url(#g-${terr})`, class: 'hex' }));
    g.append(el('polygon', { points: hexPoints(c), fill: `url(#p-${terr})` }));
    if (t.owner && !hidden) g.append(el('polygon', { points: hexPoints(c), fill: `url(#g-own-${t.owner})` }));
    g.append(el('polygon', { points: hexPoints(c), fill: 'url(#g-bevel)', class: 'hex-bevel' }));
    g.append(el('polygon', { points: hexPoints(c), class: 'hex-edge' }));
    if (t.owner && !hidden) g.append(el('polygon', { points: hexPoints(c, R - 5), class: `own-line own-${t.owner}` }));
    if (t.wall && !hidden) g.append(el('polygon', { points: hexPoints(c, R - 9), class: 'wall-ring' }));

    if (hidden) {
      g.append(use('s-fog', c.x, c.y, 58, { class: 'glyph fog-glyph' }));
    } else if (t.building === 'capital') {
      g.append(use(`s-${t.terrain}`, c.x, c.y + 14, 34, { opacity: 0.35 }));
      g.append(use(t.owner === 'player' ? 's-temple' : 's-tower', c.x, c.y - 2, 64, { class: 'glyph building' }));
    } else if (t.building === 'village') {
      g.append(use(`s-${t.terrain}`, c.x - 12, c.y + 10, 32, { opacity: 0.55 }));
      g.append(use('s-village', c.x + 4, c.y - 2, 50, { class: 'glyph building' }));
    } else {
      g.append(use(`s-${t.terrain}`, c.x, c.y - 2, 60, { class: 'glyph' }));
    }
    g.append(el('text', { x: c.x, y: c.y + R * 0.74, class: 'coord' }, t.id));
    if (state.names?.[t.id] && !hidden) g.append(el('text', { x: c.x, y: c.y - R * 0.52, class: 'tile-name' }, state.names[t.id]));
    if (t.faithMarks && !hidden) {
      // 믿음의 표식: 테두리의 절반(1/2)만큼 상대 색으로 물든다
      g.append(el('polygon', { points: hexPoints(c, R - 5), class: `faith-mark fm-${t.faithMarks.side}`, pathLength: 12, 'stroke-dasharray': `${6 * t.faithMarks.n} 12` }));
    }
    const intent = intents.find((i) => i.tile === t.id);
    if (intent) {
      g.append(el('polygon', { points: hexPoints(c, R - 4), class: `intent-ring it-${intent.type}` }));
      const b = el('g', { class: `intent-badge it-${intent.type}` });
      b.append(el('circle', { cx: c.x - R * 0.5, cy: c.y - R * 0.55, r: 11 }));
      b.append(use(INTENT_ICON[intent.type] ?? 'd-war', c.x - R * 0.5, c.y - R * 0.55, 15));
      g.append(b);
    }
    if (hints.includes(t.id)) g.append(el('polygon', { points: hexPoints(c, R - 3), class: 'hint-ring' }));
    if (highlight.includes(t.id)) g.append(el('polygon', { points: hexPoints(c, R - 2), class: 'hl-ring' }));
    if (selectable.includes(t.id)) g.append(el('polygon', { points: hexPoints(c, R - 2), class: 'sel-ring' }));
    if (onTileClick) g.addEventListener('click', () => onTileClick(t.id));
    tiles.append(g);
  }
  svg.append(tiles);

  const pieces = el('g', { class: 'pieces' });
  for (const m of markers) {
    const t = state.tileAt[m.tile];
    if (m.side === 'enemy' && !t.revealed) continue; // 안개 속 율법파는 보이지 않는다
    const { x, y } = markerPos(t, m.side);
    const g = el('g', { class: `meeple ${m.side}${m.dim ? ' dim' : ''}${m.drop ? ' drop' : ''}${m.incoming ? ' incoming' : ''}`, 'data-tile': m.tile, 'data-side': m.side });
    if (m.drop) g.style.animationDelay = `${(m.delay ?? 0) * 150}ms`;
    g.append(el('ellipse', { cx: x, cy: y + 13, rx: 10, ry: 3.2, class: 'meeple-shadow' }));
    g.append(use('s-meeple', x, y, 30, { fill: `url(#g-meeple-${m.side})`, class: 'meeple-body' }));
    if (m.label) {
      g.append(el('circle', { cx: x + 10, cy: y - 12, r: 7, class: 'meeple-badge' }));
      g.append(el('text', { x: x + 10, y: y - 8.8, class: 'meeple-num' }, m.label));
    }
    pieces.append(g);
  }
  svg.append(pieces);
}
