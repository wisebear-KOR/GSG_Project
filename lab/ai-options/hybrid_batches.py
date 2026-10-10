# 그때의 석판 + 학습형 섞기, 묶음마다 (학습형은 그 묶음 이전 문장만으로 배운다)
# 섞는 규칙 (미리 정함):
#   H1 석판 먼저: 석판이 아무것도 못 알아들으면(명령·금지 모두 없음) 학습형
#   H2 학습형 먼저: 학습형의 하라 1위 확률이 0.5 미만이면 석판 (석판도 못 알아들으면 학습형)
#   H3 일치 우선: 학습형 1위 명령이 석판 명령에 있으면 석판, 아니면 학습형 확신 ≥ 0.6이면 학습형, 아니면 석판(침묵이면 학습형)
#   python hybrid_batches.py f08.npz:last24 [f4b.npz:last32 ...]
import json, sys, os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from probe import cases, Y, D, KINDS, fit_heads, predict, decode, passes

here = os.path.dirname(os.path.abspath(__file__))
# (시작, 끝, 이름, 석판 출력 파일의 시작)
B = [(125, 155, '묶음 4', 125), (155, 195, '묶음 5', 125), (195, 254, '묶음 6', 125), (254, 326, '평가자 A', 254), (326, 417, '평가자 B', 254),
     (417, 474, '평가자 C', 254), (474, 550, '묶음 7', 254), (550, 617, '3차 A', 550), (617, 700, '3차 B', 550), (743, 812, '4차 A', 743), (812, 965, '4차 B', 743),
     (1247, 1278, '12차', 1247), (1278, 1295, '13차', 1278), (1295, 1304, '14차', 1295), (1304, 1315, '15차', 1304), (1315, 1326, '16차', 1315)]
old = {}
for f in set(b[3] for b in B):
    for r in json.load(open(os.path.join(here, 'old', f'out-{f}.json'), encoding='utf-8')): old[r['i']] = r
texts = [c['text'] for c in cases]

def feats(spec):
    if spec == 'chars':
        def f(tr, te):
            v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), sublinear_tf=True).fit([texts[i] for i in tr])
            return v.transform([texts[i] for i in tr]), v.transform([texts[i] for i in te])
        return f, 10.0
    path, key = spec.split(':'); z = np.load(os.path.join(here, path)); X = z[key][:int(z['n_cases'])]
    def f(tr, te):
        sc = StandardScaler().fit(X[tr]); return sc.transform(X[tr]), sc.transform(X[te])
    return f, 0.05

def run(spec):
    feat, C = feats(spec)
    rows = []
    for s, e, bn, _ in B:
        tr = np.arange(s); te = np.arange(s, e)
        Xtr, Xte = feat(tr, te)
        heads, dm = fit_heads(Xtr, Y[tr], D[tr], C)
        P, _ = predict(heads, dm, Xte)
        cnt = {'석판': 0, '학습형': 0, 'H1': 0, 'H2': 0, 'H3': 0, 'H4': 0, 'H5': 0, 'H6': 0, 'H7': 0}
        for k, i in enumerate(te):
            c = cases[i]; t = old[i]; do, dont = decode(P[k]); conf = float(P[k][:, 1].max())
            top = KINDS[int(P[k][:, 1].argmax())]
            silent = not t['do'] and not t['dont']
            cnt['석판'] += passes(c, t['do'], t['dont'])
            cnt['학습형'] += passes(c, do, dont)
            cnt['H1'] += passes(c, *(((do, dont)) if silent else (t['do'], t['dont'])))
            cnt['H2'] += passes(c, *((do, dont) if conf >= 0.5 or silent else (t['do'], t['dont'])))
            h3 = (t['do'], t['dont']) if (not silent and top in t['do']) else (do, dont) if (conf >= 0.6 or silent) else (t['do'], t['dont'])
            cnt['H3'] += passes(c, *h3)
            # H4: 명령은 학습형(석판이 금한 것은 뺀다), 금지는 둘의 합 · H5: 명령은 학습형(석판 금지 뺌), 금지는 석판만
            cnt['H4'] += passes(c, [k for k in do if k not in t['dont']], sorted(set(dont) | set(t['dont'])))
            cnt['H5'] += passes(c, [k for k in do if k not in t['dont']], t['dont'])
            # H6: 석판 먼저 — 석판이 침묵하거나, 학습형이 아주 확신(≥ 0.8)하면서 석판과 겹치는 명령이 없을 때만 학습형
            # H7: H6과 같되 문턱 0.6
            for name, th in [('H6', 0.8), ('H7', 0.6)]:
                use = silent or (conf >= th and not set(do) & set(t['do']))
                cnt[name] += passes(c, *((do, dont) if use else (t['do'], t['dont'])))
        rows.append((bn, e - s, cnt))
    return rows

for spec in sys.argv[1:]:
    rows = run(spec)
    print(f'\n== {spec} ==')
    print(f"{'묶음':10s} {'n':>4s} " + ' '.join(f'{k:>6s}' for k in rows[0][2]))
    for bn, n, c in rows: print(f"{bn:10s} {n:4d} " + ' '.join(f'{v / n:6.0%}' for v in c.values()))
    for name, sel in [('평이한 새 문장', lambda bn: not bn[0].isdigit() or bn.startswith(('3차', '4차'))), ('깨뜨리려 쓴 문장', lambda bn: bn[0].isdigit() and not bn.startswith(('3차', '4차')))]:
        sub = [r for r in rows if sel(r[0])]; n = sum(r[1] for r in sub)
        print(f"{name:10s} {n:4d} " + ' '.join(f'{sum(r[2][k] for r in sub) / n:6.0%}' for k in rows[0][2]))
