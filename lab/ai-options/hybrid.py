# 섞어 쓰기: 은유 세트 20에서 석판만 / 학습형만 / 석판 먼저(못 알아들으면 학습형) / 학습형 + 석판 금지
# 학습형은 석판 문장 전부(석판 출력 = 정답)로 배운다. 특징 설정은 미리 정한 둘: 5겹 1위(mean 낮은 층)와 last 마지막 층
#   python hybrid.py f08.npz:mean6 f08:last24 ...
import json, sys, os
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from probe import cases, scen, Y, D, KINDS, fit_heads, predict, decode

here = os.path.dirname(os.path.abspath(__file__))
tab = json.load(open(os.path.join(here, 'tablet-scenario.json'), encoding='utf-8'))
INV = ['peace', 'war', 'abundance', 'wisdom']
ok = lambda s, do: (not s['expect'] or any(k in do for k in s['expect'])) and not any(k in do for k in s['avoid'])

def learned(spec):
    if spec == 'chars':
        v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), sublinear_tf=True).fit([c['text'] for c in cases])
        Xc = v.transform([c['text'] for c in cases]); Xs = v.transform([(s['eventText'] + ' ' if s.get('eventText') else '') + s['text'] for s in scen]); C = 10.0
    else:
        path, key = spec.split(':'); z = np.load(os.path.join(here, path)); nc = int(z['n_cases'])
        sc = StandardScaler().fit(z[key][:nc]); Xc = sc.transform(z[key][:nc]); Xs = sc.transform(z[key][nc:]); C = 0.05
    heads, dm = fit_heads(Xc, Y, D, C)
    P, dp = predict(heads, dm, Xs)
    return P, dp

for spec in sys.argv[1:]:
    P, dp = learned(spec)
    res = {'석판만': 0, '학습형만': 0, '석판 먼저 → 학습형': 0, '학습형 + 석판 금지': 0}
    conf = []
    for i, s in enumerate(scen):
        do, dont = decode(P[i]); t = tab[i]
        res['석판만'] += t['ok']
        res['학습형만'] += ok(s, do)
        res['석판 먼저 → 학습형'] += ok(s, t['got'] if t['got'] else do)
        res['학습형 + 석판 금지'] += ok(s, [k for k in do if k not in t['forbid']])
        conf.append((float(P[i][:, 1].max()), ok(s, do)))
    hi = [c for c in conf if c[0] >= 0.6]; lo = [c for c in conf if c[0] < 0.6]
    print(f"{spec:14s} " + ' | '.join(f'{k} {v}/20' for k, v in res.items()) + f" | 확신 ≥0.6: {sum(c[1] for c in hi)}/{len(hi)}, <0.6: {sum(c[1] for c in lo)}/{len(lo)}")
