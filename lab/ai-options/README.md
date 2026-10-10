# 결정형 AI 방법 견주기 — 실험 스크립트

결과와 해석: [docs/redesign/AI-OPTIONS.md](../../docs/redesign/AI-OPTIONS.md) (상태 길이 측정은 [KEV.md §2](../../docs/redesign/KEV.md)).
만든 자료(`*.json`, `*.npz`, `old/`)는 이 폴더에 생기고 git에 넣지 않는다.

**준비**

- Node (게임 엔진·석판을 그대로 import한다).
- Python: `torch`, `transformers` 5 이상(Qwen3.5), `scikit-learn`, `numpy`.
- 모델: Hugging Face 캐시의 `Qwen/Qwen3.5-0.8B-Base`, `Qwen/Qwen3.5-4B-Base`. 스냅숏 폴더 경로를 넘긴다 (오프라인으로 저장소 이름을 주면 실패할 수 있다).

**순서**

```bash
node --no-warnings lab/ai-options/data.mjs
```

```bash
python lab/ai-options/feats.py <Qwen3.5-0.8B-Base 스냅숏 폴더> f08.npz
```

```bash
python lab/ai-options/feats.py <Qwen3.5-4B-Base 스냅숏 폴더> f4b.npz bf16
```

```bash
python lab/ai-options/probe.py f08.npz f4b.npz
```

| 파일 | 하는 일 | 걸린 시간 (Ryzen 7 9700X CPU) |
|---|---|---|
| `data.mjs` | 석판 시험 문장 1372 → 일의 종류 정답 `cases.json`, 은유 세트 `scenario.json`, 석판의 은유 점수 `tablet-scenario.json` | 수 초 |
| `feats.py` | 얼린 Qwen3.5의 층별 평균·마지막 토큰 특징. 4B는 `bf16` (메모리) | 0.8B 6분, 4B 21분 |
| `probe.py` | 판정기 머리(일마다 3지선다 + 교리)·글자 n-gram: 블록 5겹과 은유 세트 | 10~20분 |
| `oldtablet.mjs` | 옛 커밋의 석판을 돌린다: `git archive <커밋> js \| tar -x -C old/<커밋>` 뒤 `node oldtablet.mjs file:///…/old/<커밋>/ <시작> <끝> > old/out-<시작>.json` | 수 초 |
| `batches.py` | 묶음마다 "그 전까지만 아는" 학습형 vs 석판 첫 측정(주석 값) | 수 분 |
| `hybrid_batches.py` | 묶음마다 그때의 석판 · 학습형 · 섞기 H1~H5 (`old/out-*.json` 필요 — 커밋은 AI-OPTIONS §3.2와 아래 표) | 수 분 |
| `hybrid.py` | 은유 세트에서 섞기 | 1분 |
| `synth.mjs` → `negaug.py` | 합성 금지 문장 400과 보강 효과 (`negaug.py`는 0.8B 스냅숏 경로를 받는다) | 수 분 |
| `measure-state.mjs` | 대사제의 눈을 Kev 상태 꼴로 펼친 길이·후보 칸 수 (`node measure-state.mjs out.jsonl`, 토큰은 Kev 토크나이저로 따로 센다) | 수 초 |

**옛 석판 커밋** (묶음을 더한 커밋의 부모): `3092cf1` [125,254) · `9b43bbf` [254,550) · `5f1297d` [550,700) · `8ba0ef8` [743,965) · `63a63bb` [1247,1278) · `a65443b` [1278,1295) · `53ddafe` [1295,1304) · `a429341` [1304,1315) · `1c81cd4` [1315,1326).
