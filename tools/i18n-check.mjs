// 언어팩 점검: node tools/i18n-check.mjs
//  1) js/game 아래 코드(주석 제외)에 남은 한글 문자열을 찾는다 (언어팩 폴더는 제외)
//  2) 한국어팩을 기준으로 다른 언어팩의 빠진 키·남는 키를 보여준다
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const gameDir = join(root, 'js', 'game');
const HANGUL = /[가-힣]/;

// 주석을 지운다 (문자열·템플릿·정규식 안의 //는 건드리지 않는다)
function stripComments(src) {
  let out = '', i = 0, q = null, depth = [];
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (q) {
      out += c;
      if (c === '\\') { out += n ?? ''; i += 2; continue; }
      if (q === '`' && c === '$' && n === '{') { depth.push('`'); q = null; out += n; i += 2; continue; }
      if (c === q) q = null;
      i++; continue;
    }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '}' && depth.length) { q = depth.pop(); out += c; i++; continue; }
    if (c === '{' && depth.length) depth.push(null);
    if (c === '/' && /[=(,:;!&|?{}[\n]\s*$/.test(out.slice(-20))) {
      // 정규식 리터럴
      out += c; i++;
      let cls = false;
      while (i < src.length) { const d = src[i]; out += d; i++; if (d === '\\') { out += src[i]; i++; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === 'i18n' ? [] : walk(p)) : p.endsWith('.js') ? [p] : []; });
}

let left = 0;
for (const file of walk(gameDir)) {
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  const hits = lines.map((l, i) => [i + 1, l]).filter(([, l]) => HANGUL.test(l));
  if (hits.length) {
    console.log(`\n${relative(root, file)} — 한글 ${hits.length}줄`);
    for (const [n, l] of hits.slice(0, process.argv.includes('--all') ? 1e9 : 8)) console.log(`  ${n}: ${l.trim().slice(0, 110)}`);
    left += hits.length;
  }
}
console.log(`\n코드에 남은 한글: ${left}줄`);

const packs = readdirSync(join(gameDir, 'i18n')).filter((f) => f.endsWith('.js'));
const load = async (f) => (await import(pathToFileURL(join(gameDir, 'i18n', f)).href)).default;
const ko = await load('ko.js');
console.log(`한국어팩 키: ${Object.keys(ko).length}개`);
for (const f of packs.filter((x) => x !== 'ko.js')) {
  const p = await load(f);
  const miss = Object.keys(ko).filter((k) => !(k in p));
  const extra = Object.keys(p).filter((k) => !(k in ko));
  console.log(`${f}: 빠진 키 ${miss.length} · 남는 키 ${extra.length}`);
  if (process.argv.includes('--keys')) { if (miss.length) console.log('  빠짐:', miss.join(', ')); if (extra.length) console.log('  남음:', extra.join(', ')); }
}
