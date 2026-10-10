# 브라우저 Kev

결정형 모델 Kev-0.8B를 ONNX로 바꿔 브라우저(onnxruntime-web, WebGPU)에서 돌린다. 판정 헤드는 JS로 셈한다.
결과와 판단은 [docs/redesign/INTERPRETER.md §9](../../docs/redesign/INTERPRETER.md)에 있다.

| 파일 | 하는 일 |
|---|---|
| `kev.js` | 브라우저 쪽: 토크나이저, Kev 입력 꼴(`render`, `encode`, 줄 나누기), 세 방식(`rows`·`batch`·`prefix`)의 실행, 판정 헤드 |
| `../kev-web.html` | 시험 페이지: 불러오기, 정확도 대조, 토크나이저 대조, 속도 |
| `convert/export_kev.py` | 변환: 참조 ONNX의 가중치 자리에 Kev 가중치(바탕 + LoRA 병합)를 넣고, 출력층을 떼고 은닉 상태를 낸다. 판정 헤드는 `head_*.bin`, `head.json`으로 |
| `convert/quantize_kev.py` | 양자화: `<src> <dst> [block] [bits] [ops]` (투영은 MatMulNBits, 임베딩은 GatherBlockQuantized) |
| `convert/parity.py` | 대조: 변환한 ONNX(onnxruntime CPU)와 PyTorch Kev가 같은 확률을 내는지. 브라우저 대조용 `reference.json`을 쓴다 |
| `convert/gen_requests.mjs` | 대조용 요청: `lab/decide` 실험 세트 48건(선택형 질문 3개) + 1단계 크기 요청 하나 → `requests.json` |
| `model/` | 모델 파일 (git에 넣지 않는다 — `.gitignore`) |

## 변환 절차

작업 폴더 하나에서 한다. 필요한 것: Kev 저장소(`KEV_REPO`, 기본 `../kev`)와 그 파이썬 환경(torch CPU, transformers 5.x, peft, onnx, onnxruntime, onnx_ir).

1. 참조 그래프를 받는다 — [onnx-community/Qwen3.5-0.8B-Text-ONNX](https://huggingface.co/onnx-community/Qwen3.5-0.8B-Text-ONNX)의 `onnx/model.onnx`(+`_data`, `_data_1`), `onnx/model_fp16.onnx`(+`_data`), 그리고 `model.safetensors` (가중치마다 어떤 꼴로 들어가는지 배우는 데 쓴다).
2. `python export_kev.py` → `out/kev08.onnx`(fp32), `out/kev08_fp16.onnx`, `out/head*`. 320개 가중치가 전치·1+w·그대로·−exp 넷으로 모두 대응한다.
3. `node gen_requests.mjs` 후 `python parity.py out/kev08.onnx` → PyTorch와 대조, `out/reference.json`.
4. `python quantize_kev.py out/kev08_fp16.onnx out/kev08_q8f16.onnx 32 8 MatMul` 등으로 양자화.
5. `out/`의 모델·헤드와 Kev의 `tokenizer.json`·`tokenizer_config.json`, `requests.json`, `reference.json`을 `model/`에 두고 `lab/kev-web.html`을 연다.

학습한 Kev(같은 바탕 Qwen3.5-0.8B-Base)라면 `export_kev.py`의 체크포인트 이름만 바꾸면 된다.
