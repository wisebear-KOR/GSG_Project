// 언어팩: 화면·기록·데이터에 나오는 모든 글은 여기서 꺼낸다.
//   t('ui.round', { n: 3 })  → 값이 문자열이면 {n} 자리를 채우고, 함수면 vars를 넘겨 부른다.
// 언어는 모듈이 읽힐 때 한 번 정해진다 (localStorage 'gsg.lang' → 브라우저 언어 → 한국어).
// 바꾸려면 setLang()으로 저장하고 페이지를 다시 읽는다. 빠진 키는 한국어로 채운다.
import ko from './i18n/ko.js';

// 배포되는 언어 목록 (새 언어팩을 만들면 여기에 이름을 더한다)
export const LOCALES = { ko: '한국어' };

function wanted() {
  let saved = null;
  try { saved = globalThis.localStorage?.getItem('gsg.lang'); } catch { /* 저장소를 못 쓰는 환경 */ }
  if (saved && LOCALES[saved]) return saved;
  const nav = (globalThis.navigator?.language ?? 'ko').slice(0, 2).toLowerCase();
  return LOCALES[nav] ? nav : 'ko';
}

let pack = ko;
let code = 'ko';
const want = wanted();
if (want !== 'ko') {
  try {
    pack = { ...ko, ...(await import(`./i18n/${want}.js`)).default };
    code = want;
  } catch (e) {
    console.warn(`[i18n] could not load locale '${want}', falling back to ko`, e);
  }
}

export const lang = code;
const missing = new Set();

export function t(key, vars) {
  const v = pack[key];
  if (v === undefined) {
    if (!missing.has(key)) { missing.add(key); console.warn(`[i18n] missing key: ${key}`); }
    return key;
  }
  if (typeof v === 'function') return v(vars ?? {});
  if (!vars || typeof v !== 'string') return v;
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

// 키가 있는지 (선택적인 글에)
export const has = (key) => pack[key] !== undefined;

export function setLang(next) {
  try { globalThis.localStorage?.setItem('gsg.lang', next); } catch { /* 무시 */ }
}
