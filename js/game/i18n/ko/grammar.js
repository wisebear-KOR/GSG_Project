// 한국어 문법 도우미: 받침에 맞는 조사를 붙인다. "우리 마을(D2)"처럼 괄호 앞 글자를 기준으로 한다
export const batchim = (w) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
export function josa(name, withBatchim, without) {
  const base = name.replace(/\([^)]*\)$/, '');
  const code = base.charCodeAt(base.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 ? code % 28 !== 0 : true;
  return name + (has ? withBatchim : without);
}
