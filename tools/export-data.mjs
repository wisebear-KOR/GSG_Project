// Godot 이식용 데이터 내보내기: node tools/export-data.mjs
//   docs/export/data.json     — js/game/data.js의 모든 내보내기 (글은 한국어 언어팩에서 풀어 넣은 값)
//   docs/export/i18n-ko.json  — 한국어 언어팩 전체 (ko.js가 합치는 ko/*.js를 병합한 평평한 키 → 값)
// JSON에 없는 값은 버리지 않고 원문으로 남긴다 (이식하는 사람이 논리를 볼 수 있게):
//   함수   → { "$fn": "<소스 원문>" }
//   정규식 → { "$re": "<source>", "flags": "<flags>" }
// 같은 코드에서 두 번 돌리면 바이트 단위로 같은 파일이 나온다 (시각·난수를 넣지 않는다).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const outDir = join(root, 'docs', 'export');

// 브라우저 저장소 대신 (i18n.js가 언어를 고를 때 읽는다. Node 26은 진짜 localStorage에 닿으면 경고를 낸다)
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem() {} }, configurable: true, writable: true });

const load = (p) => import(pathToFileURL(join(root, p)).href);
const data = await load('js/game/data.js');
const ko = (await load('js/game/i18n/ko.js')).default;
const { lang } = await load('js/game/i18n.js');
if (lang !== 'ko') throw new Error(`expected the Korean pack, got '${lang}'`);

// 줄바꿈을 \n으로 맞춘다 (Windows에서 CRLF로 체크아웃해도 같은 결과)
const src = (s) => String(s).replace(/\r\n?/g, '\n');

// JS 값 → JSON 값. 함수·정규식은 표식 객체로, undefined는 객체에서 빼고 배열에서는 null로
function toJSON(v, path) {
  if (typeof v === 'function') return { $fn: src(v.toString()) };
  if (v instanceof RegExp) return { $re: v.source, flags: v.flags };
  if (Array.isArray(v)) return v.map((x, i) => toJSON(x, `${path}[${i}]`) ?? null);
  if (v && typeof v === 'object') {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) throw new Error(`unsupported object at ${path}: ${proto?.constructor?.name}`);
    const o = {};
    for (const [k, x] of Object.entries(v)) { const j = toJSON(x, `${path}.${k}`); if (j !== undefined) o[k] = j; }
    return o;
  }
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`non-finite number at ${path}`);
  if (typeof v === 'bigint' || typeof v === 'symbol') throw new Error(`unsupported ${typeof v} at ${path}`);
  return v; // string | number | boolean | null | undefined
}

// ---------- data.json ----------
// 모듈 네임스페이스의 키는 이름순이다 (결정론적)
const exportsOut = {
  $meta: {
    source: 'js/game/data.js',
    generator: 'tools/export-data.mjs',
    lang,
    ruleset: data.RULESET,
    // (표식 키 이름을 그대로 쓰면 이 설명 자체가 표식으로 읽히므로 글로만 적는다)
    conventions: [
      'A function value is written as an object whose only key is "$fn" (its JS source text). Port the logic by hand; see docs/spec/03-data.md.',
      'A RegExp value is written as an object with keys "$re" (source) and "flags".',
    ],
    // 문자열이지만 정규식 원본(kw.* 키에서 온 값)인 칸: new RegExp(값)으로 만들어 계시 원문에 test한다
    regexStringFields: ['DILEMMAS[].choice[].tags', 'MIRA.choice[].tags', 'COMMANDMENTS.*.re'],
    // 문자열 포함(includes)으로만 비교하는 낱말 (kw.* 키에서 온 값)
    plainWordFields: ['SACRED_WORDS[].word'],
  },
};
for (const [name, value] of Object.entries(data)) exportsOut[name] = toJSON(value, name);

// ---------- i18n-ko.json ----------
// 언어팩 값: 문자열 · 문자열 배열 · (kw.nameable 같은) 작은 객체 · 함수. 키 순서는 ko.js가 합친 순서 그대로
const packOut = {};
for (const [key, value] of Object.entries(ko)) packOut[key] = toJSON(value, key);

mkdirSync(outDir, { recursive: true });
const write = (file, obj) => {
  const path = join(outDir, file);
  const text = `${JSON.stringify(obj, null, 2)}\n`;
  writeFileSync(path, text);
  return { path: relative(root, path).replaceAll('\\', '/'), bytes: Buffer.byteLength(text) };
};

const count = (obj) => {
  const c = { string: 0, array: 0, object: 0, fn: 0, other: 0 };
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') c.string++;
    else if (Array.isArray(v)) c.array++;
    else if (v && typeof v === 'object' && '$fn' in v) c.fn++;
    else if (v && typeof v === 'object') c.object++;
    else c.other++;
  }
  return c;
};

const a = write('data.json', exportsOut);
const b = write('i18n-ko.json', packOut);
console.log(`${a.path}: ${Object.keys(exportsOut).length - 1} exports, ${a.bytes} bytes`);
console.log(`${b.path}: ${Object.keys(packOut).length} keys ${JSON.stringify(count(packOut))}, ${b.bytes} bytes`);
