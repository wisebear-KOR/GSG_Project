# 규칙(석판) vs 학습형, 같은 조건: 새 문장 묶음이 들어올 때 "그 전 묶음까지만 아는" 상태에서 처음 푼 정확도.
# 석판의 첫 측정은 tablet-cases.mjs 주석·tools/tests/README.md에 남은 값. 학습형은 그 묶음 이전 문장(석판 출력 = 정답)만으로 배운다.
#   python batches.py f08.npz [f4b.npz]
import json, sys, os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from probe import cases, Y, D, fit_heads, predict, decode, passes  # noqa (probe.py의 평가를 import 시 돌리지 않도록 아래에서 막는다)

# (시작, 끝, 이름, 석판 첫 측정) — 끝은 다음 묶음 시작
B = [
    (125, 155, '묶음 4', 0.77), (155, 195, '묶음 5 (은유 섞음)', 0.68), (195, 254, '묶음 6 (어휘를 안 본 에이전트)', 0.90),
    (254, 326, '평가자 A', 0.66), (326, 417, '평가자 B', 0.73), (417, 474, '평가자 C', 0.50), (474, 550, '묶음 7', 0.75),
    (550, 617, '3차 A', 0.90), (617, 700, '3차 B', 0.81), (743, 812, '4차 A', 0.86), (812, 965, '4차 B', 0.79),
    (1011, 1137, '5차 B', 0.87),
    # 깨뜨리려고 쓴 문장 (README: 그때 석판으로는 n/m)
    (1247, 1278, '12차', 2 / 31), (1278, 1295, '13차', 2 / 17), (1295, 1304, '14차', 3 / 9), (1304, 1315, '15차', 0 / 11), (1315, 1326, '16차', 2 / 11),
]
here = os.path.dirname(os.path.abspath(__file__))
texts = [c['text'] for c in cases]

def run(name, feat):
    rows = []
    for s, e, bn, tab in B:
        tr = np.arange(s); te = np.arange(s, e)
        Xtr, Xte = feat(tr, te)
        heads, dm = fit_heads(Xtr, Y[tr], D[tr], C)
        P, _ = predict(heads, dm, Xte)
        ok = sum(passes(cases[i], *decode(P[k])) for k, i in enumerate(te))
        rows.append((bn, e - s, tab, ok / (e - s)))
    return rows

def chars(tr, te):
    v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), sublinear_tf=True).fit([texts[i] for i in tr])
    return v.transform([texts[i] for i in tr]), v.transform([texts[i] for i in te])

def dense(X):
    def f(tr, te):
        sc = StandardScaler().fit(X[tr]); return sc.transform(X[tr]), sc.transform(X[te])
    return f

methods = []
C = 10.0; methods.append(('글자 n-gram', run('chars', chars)))
for path in sys.argv[1:]:
    z = np.load(os.path.join(here, path)); nc = int(z['n_cases'])
    C = 0.05
    for key in ['mean6', 'mean12', 'last24'] if 'f08' in path else ['mean' + str(int(z['layers'][0])), 'mean' + str(int(z['layers'][1])), 'last' + str(int(z['layers'][-1]))]:
        methods.append((f'{path[:-4]}:{key}', run(key, dense(z[key][:nc]))))

print(f"{'묶음':28s} {'n':>4s} {'석판 첫 측정':>10s} " + ' '.join(f'{m:>14s}' for m, _ in methods))
for bi, (s, e, bn, tab) in enumerate(B):
    print(f"{bn:28s} {e - s:4d} {tab:10.0%} " + ' '.join(f'{r[bi][3]:14.0%}' for _, r in methods))
def wavg(rows, sel, col):
    w = [r[1] for r in rows if sel(r[0])]; v = [r[col] * r[1] for r in rows if sel(r[0])]
    return sum(v) / sum(w)
plain = lambda bn: not bn.endswith('차') or bn.startswith(('3차', '4차', '5차'))
adv = lambda bn: not plain(bn)
r0 = methods[0][1]
print(f"\n{'평이한 새 문장 (가중 평균)':28s} {'':4s} {wavg(r0, plain, 2):10.0%} " + ' '.join(f'{wavg(r, plain, 3):14.0%}' for _, r in methods))
print(f"{'깨뜨리려 쓴 문장 (가중 평균)':28s} {'':4s} {wavg(r0, adv, 2):10.0%} " + ' '.join(f'{wavg(r, adv, 3):14.0%}' for _, r in methods))
json.dump({'batches': B, 'methods': methods}, open(os.path.join(here, 'batches-results.json'), 'w', encoding='utf-8'), ensure_ascii=False)
