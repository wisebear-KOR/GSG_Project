// art.js의 SVG 심볼을 하나씩 독립된 .svg 파일로 뽑는다 (Godot은 SVG를 텍스처로 바로 가져온다)
//   node tools/export-svg.mjs  →  docs/export/svg/<심볼 id>.svg, docs/export/svg/index.html(미리보기)
// 심볼이 쓰는 그라디언트·무늬·필터는 파일마다 <defs>에 필요한 것만 넣고, 심볼 안의 <use href="#다른 심볼">은 펼친다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const { ART } = await import(new URL('../js/game/art.js', import.meta.url));
const out = join(root, 'docs', 'export', 'svg');
mkdirSync(out, { recursive: true });

// <defs> 안의 그라디언트·무늬·필터 (id → 원문)
const defs = new Map();
for (const m of ART.matchAll(/<(linearGradient|radialGradient|pattern|filter|clipPath|mask)\b[^>]*\bid="([^"]+)"[\s\S]*?<\/\1>/g)) defs.set(m[2], m[0]);
// 심볼 (id → { viewBox, body })
const symbols = new Map();
for (const m of ART.matchAll(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g)) {
  const id = /\bid="([^"]+)"/.exec(m[1])?.[1];
  const viewBox = /\bviewBox="([^"]+)"/.exec(m[1])?.[1] ?? '0 0 24 24';
  if (id) symbols.set(id, { viewBox, body: m[2].trim() });
}

// <use href="#sym" .../> 를 그 심볼의 내용으로 펼친다 (x·y·width·height가 있으면 중첩 svg로)
function expand(body, depth = 0) {
  if (depth > 4) return body;
  return body.replace(/<use\b([^>]*?)\/>/g, (all, attrs) => {
    const id = /href="#([^"]+)"/.exec(attrs)?.[1];
    const sym = id && symbols.get(id);
    if (!sym) return all;
    const pick = (k) => /\b(?:x|y|width|height|fill|stroke|stroke-width)="/.test(`${k}="`) && new RegExp(`\\b${k}="([^"]+)"`).exec(attrs)?.[1];
    const x = pick('x'), y = pick('y'), w = pick('width'), h = pick('height');
    const paint = ['fill', 'stroke', 'stroke-width'].map((k) => pick(k) ? ` ${k}="${pick(k)}"` : '').join('');
    const inner = expand(sym.body, depth + 1);
    if (w || h || x || y) return `<svg x="${x ?? 0}" y="${y ?? 0}" width="${w ?? '100%'}" height="${h ?? '100%'}" viewBox="${sym.viewBox}"${paint}>${inner}</svg>`;
    return `<g${paint}>${inner}</g>`;
  });
}

// 본문이 참조하는 url(#id)를 따라가며 필요한 defs를 모은다
function neededDefs(text) {
  const need = new Set();
  const queue = [text];
  while (queue.length) {
    const s = queue.pop();
    for (const m of s.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)) {
      const id = m[1] ?? m[2];
      if (defs.has(id) && !need.has(id)) { need.add(id); queue.push(defs.get(id)); }
    }
  }
  return [...need].map((id) => defs.get(id)).join('\n');
}

const rows = [];
for (const [id, { viewBox, body }] of symbols) {
  const inner = expand(body);
  const [, , w, h] = viewBox.split(/\s+/).map(Number);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w * 4}" height="${h * 4}">
<defs>
${neededDefs(inner)}
</defs>
${inner}
</svg>
`;
  writeFileSync(join(out, `${id}.svg`), svg);
  rows.push(id);
}

// 미리보기 페이지
// 브라우저가 필터·무늬까지 그린 PNG를 받을 수 있다 (Godot의 SVG 가져오기는 필터를 대부분 무시한다)
const html = `<!doctype html><meta charset="utf-8"><title>art.js symbols</title>
<style>body{font:13px sans-serif;background:#2a1c10;color:#eee;padding:16px}.grid{display:flex;flex-wrap:wrap;gap:12px}
figure{margin:0;width:120px;text-align:center}img{width:96px;height:96px;background:#f1e4c4;border-radius:8px;padding:6px}
a{color:#f4c24a;font-size:12px;cursor:pointer}</style>
<p>PNG는 투명 배경, 한 변 512px로 굽는다. <a id="all">전부 PNG로 받기</a> (브라우저가 여러 파일 다운로드를 허용할지 물을 수 있다)</p>
<div class="grid">
${rows.map((id) => `<figure><img src="${id}.svg" alt=""><figcaption>${id}<br><a data-id="${id}">PNG</a></figcaption></figure>`).join('\n')}
</div>
<script>
async function png(id, size = 512) {
  const img = new Image(); img.src = id + '.svg'; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = size;
  const k = size / Math.max(img.naturalWidth, img.naturalHeight);
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  c.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  const a = document.createElement('a'); a.download = id + '.png'; a.href = c.toDataURL('image/png'); a.click();
}
document.querySelectorAll('a[data-id]').forEach((a) => { a.onclick = () => png(a.dataset.id); });
document.getElementById('all').onclick = async () => { for (const a of document.querySelectorAll('a[data-id]')) { await png(a.dataset.id); await new Promise((r) => setTimeout(r, 150)); } };
</script>`;
writeFileSync(join(out, 'index.html'), html);
console.log(`${rows.length} symbols → docs/export/svg/`);
