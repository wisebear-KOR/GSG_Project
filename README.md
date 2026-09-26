# GSG Project

Chrome 내장 AI(Prompt API, Gemma 4)로 신도들에게 계시를 내리는 보드게임풍 턴제 전략 게임 (개발 중).

## 현재 상태

- [`game/index.html`](game/index.html): 게임 — 튜토리얼(3×3, 5장, 안내자 NPC)과 본 게임(맵 크기·난이도·시드 선택, 사막이 있는 무작위 맵). `?ai=tablet`이면 LLM 없이 석판 해석기
- [`check.html`](check.html): 브라우저가 내장 모델을 제어할 수 있는지 점검하는 페이지
- [`lab/interpret.html`](lab/interpret.html): 계시를 해석해 가능한 행동 목록에서 행동을 고르는 대사제 LLM 실험 페이지
- [`docs/DESIGN.md`](docs/DESIGN.md): 기획 문서
- [`docs/EXPERIMENTS.md`](docs/EXPERIMENTS.md): 해석기 프롬프트 실험 기록
- [`docs/PLAYTEST-2026-09-27.md`](docs/PLAYTEST-2026-09-27.md): LLM 모드 4판 플레이테스트 보고서

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
