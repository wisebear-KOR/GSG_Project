# GSG Project

Chrome 내장 AI(Prompt API, Gemma 4)로 LLM 사용법을 배우는 스테이지형 학습 게임.

## 현재 상태

- [`check.html`](check.html): 브라우저가 내장 모델을 제어할 수 있는지 점검하는 페이지

## 요구 사항

- 데스크톱 Chrome 148 이상 (Gemma 4: Chrome Canary + `chrome://flags` → "Gemma 4 for Built-in AI")
- 여유 저장공간 22GB, VRAM 4GB 초과 GPU 또는 RAM 16GB + 4코어 이상
- `chrome://on-device-internals`에서 모델 상태 확인

## 로컬 실행

Prompt API는 보안 컨텍스트에서만 동작하므로 `file://`이 아닌 로컬 서버로 엽니다.

```bash
npx serve .
```

## 라이선스

[MIT](LICENSE)
