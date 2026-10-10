// lab/decide/results/*.json을 모아 요약표와 사례별 결정을 마크다운으로 찍는다.
//   node lab/decide/report.mjs [모델 이름 — 사례별 표를 찍을 모델]

import { readdirSync, readFileSync } from 'node:fs';
import { summarize, details, STRATEGIES } from './core.js';

const dir = new URL('./results/', import.meta.url);
const results = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  for (const [key, byModel] of Object.entries(JSON.parse(readFileSync(new URL(f, dir), 'utf8')))) results[key] = { ...results[key], ...byModel };
}

const md = (rows) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return [`| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${cols.map((c) => String(r[c] ?? '')).join(' | ')} |`)].join('\n');
};

// 비교 기준: docs/EXPERIMENTS.md의 Chrome 내장 Gemma 4, v5 프롬프트 (계시당 3회 반복)
console.log('Gemma 4 (Prompt API, v5): 기본 의도 87% · 교리 100%, 심화 의도 93% · 교리 100%, 평균 2.3~2.5초\n');
console.log(md(summarize(results)));
const model = process.argv[2];
if (model) {
  for (const lang of ['ko', 'en']) for (const strategy of STRATEGIES) {
    console.log(`\n### ${model} · ${lang} · ${strategy}\n`);
    console.log(md(details(results, model, lang, strategy)));
  }
}
