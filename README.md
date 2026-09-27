# 말씀이 있으라 — Let There Be

> 프로젝트 코드명 GSG. **모든 문서는 [docs/README.md](docs/README.md)** — 게임 명세(`docs/spec/`), Godot 이식 가이드(`docs/godot/`), 이식용 자료(`docs/export/`). 제목을 정한 이유는 [docs/naming.md](docs/naming.md), 번역은 [docs/i18n.md](docs/i18n.md).

Chrome 내장 AI(Prompt API, Gemma 4)로 신도들에게 계시를 내리는 보드게임풍 턴제 전략 게임.

**플레이:** https://wisebear-kor.github.io/GSG_Project/game/

## 게임

너는 말로만 세상을 움직이는 신이다. 매 장 한 줄의 계시를 적으면 대사제(내장 LLM)가 그 뜻을 헤아려 신도들을 움직이고, 율법대로만 사는 율법파와 겨룬다.

- **말이 규칙이 된다:** 말투(축복·저주·비유), 이름 붙이기, 예언 봉인, 청원 응답, 서원, 인용과 성언, 영원한 계명, 말한 대로 내리는 기적. 계시 속 낱말이 어떤 일을 불렀는지 보드까지 빛줄기로 잇는다.
- **읽을 수 있는 적:** 판마다 다른 율법파 지도자, 칸 단위로 미리 보이는 율법파의 뜻, 지난 장 계시에 맞서 고르는 율법 카드, 율법 석판 경쟁.
- **판마다 다른 이야기:** 시드 기반 무작위 맵(사막·오아시스·채석장·발견지·전생의 유적), 두 갈래 사건, 세 막, 심판의 기준, 소명, 분열의 예언자, 성인과 전설이 된 땅.
- **판 밖에 남는 것:** 이어하기, 서고와 도감, 성서(업적), 정경, 경외와 은사, 오늘의 계시, 시련 다섯과 이번 주의 시련, 승천, 도전 링크와 시편 복사.
- 튜토리얼(3×3, 안내자 사관 세라), 빠른 판(4×4 · 8장), 규칙서, 설정(볼륨·연출·진영 무늬·글자 크기·기록 내보내기).
- 내장 AI가 없으면 석판(키워드) 해석기로 끝까지 플레이할 수 있다.

설계 과정은 [`docs/tickets`](docs/tickets/README.md): 다섯 관점의 아이디어 101개를 티켓으로 만들고, 웨이브마다 밸런스·플레이어 경험·기술 설계 검토와 코드 리뷰·퍼징을 거쳐 구현했다.

## 현재 상태

- [`game/index.html`](game/index.html): 게임. `?ai=tablet`이면 LLM 없이 석판 해석기, `?seed=&size=&diff=&target=`은 도전 링크
- [`check.html`](check.html): 브라우저가 내장 모델을 제어할 수 있는지 점검하는 페이지
- [`lab/interpret.html`](lab/interpret.html): 계시를 해석해 가능한 행동 목록에서 행동을 고르는 대사제 LLM 실험 페이지
- [`docs/README.md`](docs/README.md): 문서 목차 (명세 01~07, Godot 이식 가이드, 이식용 JSON·골든 테스트·SVG)
- [`docs/DESIGN.md`](docs/DESIGN.md): 첫 기획 문서 (지금 규칙은 `docs/spec/02-rules.md`)
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
