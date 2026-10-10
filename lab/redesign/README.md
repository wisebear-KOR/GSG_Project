# 재설계 실험 자산

[docs/redesign/](../../docs/redesign/README.md)의 1단계(규칙 실험)에서 다시 쓰려고 옮겨 둔 것들이다.
원본은 2026-10-03 세션의 임시 폴더에 있었고, 그 세션의 실험 작업 트리(`34f4cbd` 기준)에 커밋 없이 들어 있었다.

| 파일 | 내용 |
|---|---|
| `connection-variants.patch` | 그 작업 트리의 `git diff 34f4cbd` (engine.js · interpreter.js · tools/tests/lib.mjs). 변형 넷이 `process.env`로 켜진다 |
| `var58.py`, `var58b.py` | 위 패치를 만든 파이썬 패치 스크립트 (연결 규칙과 율법파 배치 / 자리 신탁) |
| `mini.mjs` | 작은 벤치: 정책 × 설정 승률, 숙련 봇의 대차·접전 비율 (HANDOFF 부록 A와 같다) |
| `results/conn58.txt`, `results/conn59.txt` | 연결 실험 원자료 (HANDOFF §4.1의 표) |
| `eval-prompts/A.md`, `B.md`, `C.md` | 독립 평가자 셋(설계자·리뷰어·분석가)의 프롬프트 (19차). 안의 임시 폴더 경로와 `evalNN-X` 폴더 이름은 쓸 때마다 바꾼다 |

## 패치의 변형

| 켜는 법 | 하는 일 |
|---|---|
| `GSG_V=conn` | 연결 규칙: 수도에서 제 건물로 이어진 마을만 센다 (`linkedTiles`, `villageCount`). 율법파는 제 건물 곁에 짓는다 |
| `GSG_V=conn,cdef` | 석판의 마을 기본 배치를 "이어지는 칸 먼저"로 |
| `POSBEST=1` | 자리 신탁: 마을은 이어지는 칸에, 공격은 율법파 마을을 가장 많이 끊는 칸에 (배치 실력의 상한) |
| `RANDTILE=1` | 시킨 일마다 같은 종류의 다른 합법 칸으로 무작위로 옮긴다 (칸 고르기가 얼마나 중요한가) |

## 쓰는 법

HANDOFF §6의 방식 그대로 한다. main을 건드리지 않고 사본 작업 트리를 만든 뒤 패치를 얹어 잰다.

```bash
git worktree add <scratch>/wt 34f4cbd
git -C <scratch>/wt apply <이 폴더>/connection-variants.patch
WTURL=file:///<scratch>/wt/tools/tests/ GSG_V=conn POLS=smart,planner CFGS=5nF,5hV N=40 node <이 폴더>/mini.mjs
```

N=40×5설정이면 정책당 200판, 표준오차 ~3.5점. 차이가 5점 안이면 잡음으로 본다.
