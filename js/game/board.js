// 육각 보드 SVG 렌더링
import { TERRAIN } from './data.js';

const R = 46;                       // 육각 반지름
const W = Math.sqrt(3) * R;         // 육각 가로
const NS = 'http://www.w3.org/2000/svg';

const center = (t) => ({ x: W / 2 + 8 + W * (t.c + 0.5 * (t.r & 1)), y: R + 8 + 1.5 * R * t.r });
const hexPoints = ({ x, y }) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (60 * i - 30);
  return `${(x + R * Math.cos(a)).toFixed(1)},${(y + R * Math.sin(a)).toFixed(1)}`;
}).join(' ');

function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

// markers: [{ tile, side, label, dim }] — 이번 라운드에 놓인 미플
export function renderBoard(svg, state, { markers = [], highlight = [], onTileClick, selectable = [] } = {}) {
  const cols = 5;
  const rows = 5;
  svg.setAttribute('viewBox', `0 0 ${(W * (cols + 0.5) + 16).toFixed(0)} ${(1.5 * R * (rows - 1) + 2 * R + 16).toFixed(0)}`);
  svg.replaceChildren();

  for (const t of state.tiles) {
    const c = center(t);
    const g = el('g', { class: 'tile', 'data-id': t.id });
    const hidden = !t.revealed;
    const cls = ['hex', hidden ? 'fog' : `t-${t.terrain}`];
    if (t.owner && !hidden) cls.push(`own-${t.owner}`);
    if (highlight.includes(t.id)) cls.push('hl');
    if (selectable.includes(t.id)) cls.push('selectable');
    g.append(el('polygon', { points: hexPoints(c), class: cls.join(' ') }));
    if (t.wall && !hidden) g.append(el('polygon', { points: hexPoints(c), class: `wall own-${t.owner}`, transform: `translate(${c.x} ${c.y}) scale(0.84) translate(${-c.x} ${-c.y})` }));

    if (hidden) {
      g.append(el('text', { x: c.x, y: c.y + 6, class: 'fog-mark' }, '?'));
    } else {
      const icon = t.building === 'capital' ? (t.owner === 'player' ? '⛪' : '🏛️')
        : t.building === 'village' ? '🏠' : TERRAIN[t.terrain].icon;
      g.append(el('text', { x: c.x, y: c.y + 2, class: t.building ? 'icon big' : 'icon' }, icon));
    }
    g.append(el('text', { x: c.x, y: c.y + R * 0.66, class: 'coord' }, t.id));

    if (onTileClick) {
      g.style.cursor = selectable.length && !selectable.includes(t.id) ? 'default' : 'pointer';
      g.addEventListener('click', () => onTileClick(t.id));
    }
    svg.append(g);
  }

  // 미플: 칸마다 진영별로 위치를 나눠 겹치지 않게 놓는다
  for (const m of markers) {
    const t = state.tileAt[m.tile];
    if (m.side === 'enemy' && !t.revealed) continue; // 안개 속 율법파는 보이지 않는다
    const c = center(t);
    const dx = m.side === 'player' ? -R * 0.42 : R * 0.42;
    const g = el('g', { class: `meeple ${m.side}${m.dim ? ' dim' : ''}` });
    const x = c.x + dx;
    const y = c.y - R * 0.38;
    // 머리 + 몸통 형태의 미플
    g.append(el('circle', { cx: x, cy: y - 7, r: 5.5 }));
    g.append(el('path', { d: `M${x - 9},${y + 9} Q${x - 9},${y - 2} ${x},${y - 2} Q${x + 9},${y - 2} ${x + 9},${y + 9} Z` }));
    if (m.label) g.append(el('text', { x, y: y + 7, class: 'meeple-label' }, m.label));
    svg.append(g);
  }
}
