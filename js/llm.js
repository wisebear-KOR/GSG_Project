// Chrome 내장 AI(Prompt API) 래퍼

export const hasLanguageModel = () => 'LanguageModel' in self;

export async function availability(languages) {
  if (!hasLanguageModel()) return 'no-api';
  try {
    return await LanguageModel.availability({
      expectedInputs: [{ type: 'text', languages }],
      expectedOutputs: [{ type: 'text', languages: [languages[0]] }],
    });
  } catch (e) {
    return `error: ${e.message}`;
  }
}

// 시스템 프롬프트만 담은 기본 세션을 만든다. 호출할 때마다 clone()해서 쓴다.
// 지정한 언어가 거부되면 언어 지정 없이 다시 시도한다.
export async function createBaseSession({ systemPrompt, languages, onProgress }) {
  const opts = {
    initialPrompts: [{ role: 'system', content: systemPrompt }],
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded));
    },
  };
  try {
    const session = await LanguageModel.create({
      ...opts,
      expectedInputs: [{ type: 'text', languages }],
      expectedOutputs: [{ type: 'text', languages: [languages[0]] }],
    });
    return { session, languageFallback: false };
  } catch (e) {
    if (e.name !== 'NotSupportedError') throw e;
    return { session: await LanguageModel.create(opts), languageFallback: true };
  }
}

// JSON 스키마로 출력을 강제하고, 스트리밍으로 받아 첫 토큰 시간까지 잰다.
export async function promptJSON(session, text, schema, signal) {
  const t0 = performance.now();
  let ttft = null;
  let raw = '';
  const stream = session.promptStreaming(text, { responseConstraint: schema, signal });
  for await (const chunk of stream) {
    ttft ??= performance.now() - t0;
    raw += chunk;
  }
  const ms = performance.now() - t0;
  let data = null;
  let error = null;
  try {
    data = JSON.parse(raw);
  } catch {
    error = 'JSON 파싱 실패';
  }
  return { raw, data, error, ms, ttft, contextUsage: session.contextUsage ?? null };
}
