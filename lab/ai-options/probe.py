# 판정기 비교: 같은 정답(석판 출력)으로 "일마다 하라/하지 마라/말 없음" 12개 + 교리 4지선다를 배운다.
#   python probe.py f08.npz [f4b.npz ...]   (특징 파일이 없으면 글자 n-gram 판정기만)
# 평가 (미리 정한 규칙 — 결과를 보고 바꾸지 않는다):
#   1) 석판 문장 블록 5겹 (섞지 않음: 앞 묶음으로 배워 뒤 묶음 — 새 평가자의 새 말투를 흉내)
#      통과 = tablet-cases 판정 그대로 (want 모두, avoid 없음)
#   2) 석판 문장 전부로 배워 은유 세트 20에서 — 의도(기대 하나 이상, 회피 없음), 교리
#   고르기: argmax가 '하라'인 일 = 명령, '하지 마라' = 금지. 명령이 없으면 P(하라) 1위가 0.25 이상일 때 그 하나
import json, sys, os, time
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer

here = os.path.dirname(os.path.abspath(__file__))
cases = json.load(open(os.path.join(here, 'cases.json'), encoding='utf-8'))
scen = json.load(open(os.path.join(here, 'scenario.json'), encoding='utf-8'))
KINDS = ['gather:food', 'gather:wood', 'gather:stone', 'gather:faith', 'build:village', 'build:wall', 'build:temple', 'build:cathedral', 'pray', 'explore', 'preach', 'attack']
CLS = {'none': 0, 'do': 1, 'dont': 2}
DOC = {'peace': 0, 'war': 1, 'abundance': 2, 'wisdom': 3}
Y = np.array([[CLS[c['say'][k]] for k in KINDS] for c in cases])
D = np.array([DOC.get(c['doctrine'], -1) if c['doctrine'] else -1 for c in cases])
N = len(cases)

def fit_heads(X, Y, D, C):
    heads = []
    for j in range(len(KINDS)):
        ys = Y[:, j]
        if len(set(ys)) == 1: heads.append(('const', int(ys[0]))); continue
        m = LogisticRegression(C=C, max_iter=3000, class_weight='balanced'); m.fit(X, ys); heads.append(('lr', m))
    ok = D >= 0
    dm = LogisticRegression(C=C, max_iter=3000); dm.fit(X[ok], D[ok])
    return heads, dm

def predict(heads, dm, X):
    P = np.zeros((X.shape[0], len(KINDS), 3))
    for j, (t, m) in enumerate(heads):
        if t == 'const': P[:, j, m] = 1; continue
        pr = m.predict_proba(X)
        for ci, c in enumerate(m.classes_): P[:, j, c] = pr[:, ci]
    return P, dm.predict(X)

def decode(p):
    cls = p.argmax(1)
    do = [KINDS[j] for j in range(len(KINDS)) if cls[j] == 1]
    dont = [KINDS[j] for j in range(len(KINDS)) if cls[j] == 2]
    if not do:
        j = int(p[:, 1].argmax())
        if p[j, 1] >= 0.25 and KINDS[j] not in dont: do = [KINDS[j]]
    return do, dont

def passes(c, do, dont):
    for w in c['want']:
        if w.startswith('forbid:'):
            if w[7:] not in dont: return False
        elif w == 'gather:any':
            if not any(k.startswith('gather:') for k in do): return False
        elif w not in do: return False
    return not any(a in do for a in c['avoid'])

def evaluate(name, Xc, Xs, C):
    t0 = time.time()
    # 1) 블록 5겹
    folds = np.array_split(np.arange(N), 5)
    passed = 0; exact = 0; dd = {'do_tp': 0, 'do_fp': 0, 'do_fn': 0, 'dont_tp': 0, 'dont_fp': 0, 'dont_fn': 0}; doc_ok = 0; doc_n = 0
    for f in folds:
        tr = np.setdiff1d(np.arange(N), f)
        sc = StandardScaler().fit(Xc[tr]) if not hasattr(Xc, 'tocsr') else None
        T = (lambda Z: sc.transform(Z)) if sc else (lambda Z: Z)
        heads, dm = fit_heads(T(Xc[tr]), Y[tr], D[tr], C)
        P, dp = predict(heads, dm, T(Xc[f]))
        for i, idx in enumerate(f):
            do, dont = decode(P[i]); c = cases[idx]
            passed += passes(c, do, dont)
            truth_do = {k for k in KINDS if c['say'][k] == 'do'}; truth_dont = {k for k in KINDS if c['say'][k] == 'dont'}
            exact += set(do) == truth_do and set(dont) == truth_dont
            dd['do_tp'] += len(truth_do & set(do)); dd['do_fp'] += len(set(do) - truth_do); dd['do_fn'] += len(truth_do - set(do))
            dd['dont_tp'] += len(truth_dont & set(dont)); dd['dont_fp'] += len(set(dont) - truth_dont); dd['dont_fn'] += len(truth_dont - set(dont))
            if D[idx] >= 0: doc_n += 1; doc_ok += int(dp[i] == D[idx])
    # 2) 은유 세트
    sc = StandardScaler().fit(Xc) if not hasattr(Xc, 'tocsr') else None
    T = (lambda Z: sc.transform(Z)) if sc else (lambda Z: Z)
    heads, dm = fit_heads(T(Xc), Y, D, C)
    P, dp = predict(heads, dm, T(Xs))
    s_ok = 0; s_basic = 0; s_hard = 0; s_doc = 0; s_docn = 0; detail = []
    inv = {v: k for k, v in DOC.items()}
    for i, s in enumerate(scen):
        do, dont = decode(P[i])
        ok = (not s['expect'] or any(k in do for k in s['expect'])) and not any(k in do for k in s['avoid'])
        s_ok += ok; s_basic += ok and s['set'] == 'basic'; s_hard += ok and s['set'] == 'hard'
        if s['doctrine']: s_docn += 1; s_doc += inv[int(dp[i])] in s['doctrine']
        detail.append(f"{'O' if ok else 'X'} {s['text'][:24]} → {','.join(do) or '-'}{' ⊘' + ','.join(dont) if dont else ''} [{inv[int(dp[i])]}]")
    pr = lambda tp, fp: tp / max(1, tp + fp)
    return {
        'name': name, 'C': C,
        'cv_pass': passed / N, 'cv_exact': exact / N,
        'do_P': pr(dd['do_tp'], dd['do_fp']), 'do_R': pr(dd['do_tp'], dd['do_fn']),
        'dont_P': pr(dd['dont_tp'], dd['dont_fp']), 'dont_R': pr(dd['dont_tp'], dd['dont_fn']),
        'cv_doc': doc_ok / max(1, doc_n),
        'scen': f'{s_ok}/20 (기본 {s_basic}/10, 심화 {s_hard}/10)', 'scen_n': s_ok, 'scen_doc': f'{s_doc}/{s_docn}',
        'secs': round(time.time() - t0, 1), 'detail': detail,
    }

if __name__ == '__main__':
    results = []
    # 글자 n-gram (모델 없음)
    texts_c = [c['text'] for c in cases]; texts_s = [s['text'] if not s.get('eventText') else s['eventText'] + ' ' + s['text'] for s in scen]
    vec = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=1, sublinear_tf=True).fit(texts_c)
    for C in [1.0, 10.0]:
        results.append(evaluate(f'char-ngram', vec.transform(texts_c), vec.transform(texts_s), C))
    # 얼린 백본
    for path in sys.argv[1:]:
        z = np.load(os.path.join(here, path))
        nc = int(z['n_cases'])
        for l in z['layers']:
            for pool in ['mean', 'last']:
                X = z[f'{pool}{l}']
                for C in [0.05, 0.5]:
                    results.append(evaluate(f'{path[:-4]}:{pool}{l}', X[:nc], X[nc:], C))
                    r = results[-1]; print(f"{r['name']:16s} C={C:<5} pass {r['cv_pass']:.3f} exact {r['cv_exact']:.3f} do P/R {r['do_P']:.2f}/{r['do_R']:.2f} dont P/R {r['dont_P']:.2f}/{r['dont_R']:.2f} doc {r['cv_doc']:.2f} | 은유 {r['scen']} 교리 {r['scen_doc']}", flush=True)

    json.dump(results, open(os.path.join(here, 'probe-results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\n== 요약 (블록 5겹 통과율 순) ==')
    for r in sorted(results, key=lambda r: -r['cv_pass']):
        print(f"{r['name']:16s} C={r['C']:<5} pass {r['cv_pass']:.3f} exact {r['cv_exact']:.3f} dont R {r['dont_R']:.2f} doc {r['cv_doc']:.2f} | 은유 {r['scen']} 교리 {r['scen_doc']}")
    best = max(results, key=lambda r: r['cv_pass'])
    print('\n== 5겹 1위의 은유 세트 ==', best['name'], best['C'])
    print('\n'.join(best['detail']))
