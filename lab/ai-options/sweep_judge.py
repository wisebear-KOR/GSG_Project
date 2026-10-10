# 판정기 설정 고르기: 글자 조각 길이 · 낱말 특징 · 규제(C)를 바꿔 두 기준으로 잰다 (가장 좋은 것을 train_judge.py에 옮긴다)
#   기준 1: 평가 전용 은유 116 (words-eval.json, 엄격) — 학습: 석판 정답 + 합성 금지 + words-train
#   기준 2: 석판 문장 블록 5겹 통과 (앞 묶음으로 배워 뒤 묶음) — 학습: 각 겹의 앞 묶음 + 합성 + words-train
#   python lab/ai-options/sweep_judge.py
import json, os
import numpy as np
from scipy.sparse import hstack
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer

here = os.path.dirname(os.path.abspath(__file__))
KINDS = ['gather:food', 'gather:wood', 'gather:stone', 'gather:faith', 'build:village', 'build:wall', 'build:temple', 'build:cathedral', 'pray', 'explore', 'preach', 'attack']
CLS = {'none': 0, 'do': 1, 'dont': 2}
rows = json.load(open(os.path.join(here, 'cases.json'), encoding='utf-8'))
syn = json.load(open(os.path.join(here, 'synth.json'), encoding='utf-8'))
wtr = json.load(open(os.path.join(here, 'words-train.json'), encoding='utf-8'))['rows']
wev = json.load(open(os.path.join(here, 'words-eval.json'), encoding='utf-8'))['rows']
said = lambda do, dont: {k: 'do' if k in do else 'dont' if k in dont else 'none' for k in KINDS}
lab = lambda say: [CLS[say[k]] for k in KINDS]
extra = [(r['text'], lab(r['say'])) for r in syn] + [(w[0], lab(said(w[1], w[2]))) for w in wtr]

def feats(cfg, fit_texts):
    vs = [TfidfVectorizer(analyzer='char_wb', ngram_range=cfg['ng'], sublinear_tf=True, min_df=2).fit(fit_texts)]
    if cfg.get('words'): vs.append(TfidfVectorizer(analyzer='word', token_pattern=r'[^\s,.!?]+', sublinear_tf=True, min_df=1).fit(fit_texts))
    return lambda T: hstack([v.transform(T) for v in vs]).tocsr()

def fit(cfg, texts, Y):
    f = feats(cfg, texts); X = f(texts); heads = []
    for j in range(len(KINDS)):
        ys = Y[:, j]
        if len(set(ys)) == 1: heads.append(('c', int(ys[0]))); continue
        heads.append(('m', LogisticRegression(C=cfg['C'], max_iter=5000, class_weight='balanced').fit(X, ys)))
    return f, heads

def decode(f, heads, texts):
    X = f(texts); out = []
    P = []
    for t, m in heads:
        if t == 'c': p = np.zeros((X.shape[0], 3)); p[:, m] = 1
        else:
            pr = m.predict_proba(X); p = np.zeros((X.shape[0], 3))
            for ci, c in enumerate(m.classes_): p[:, c] = pr[:, ci]
        P.append(p)
    P = np.stack(P, 1)  # n × kinds × 3
    for p in P:
        cls = p.argmax(1)
        do = [KINDS[j] for j in range(len(KINDS)) if cls[j] == 1]
        dont = [KINDS[j] for j in range(len(KINDS)) if cls[j] == 2]
        if not do:
            j = int(p[:, 1].argmax())
            if p[j, 1] >= 0.25 and KINDS[j] not in dont: do = [KINDS[j]]
        out.append((do, dont))
    return out

def passes(c, do, dont):
    for w in c['want']:
        if w.startswith('forbid:'):
            if w[7:] not in dont: return False
        elif w == 'gather:any':
            if not any(k.startswith('gather:') for k in do): return False
        elif w not in do: return False
    return not any(a in do for a in c['avoid'])

CFGS = [
    {'ng': (1, 3), 'C': 10.0}, {'ng': (1, 3), 'C': 3.0}, {'ng': (1, 3), 'C': 30.0},
    {'ng': (1, 4), 'C': 10.0}, {'ng': (2, 4), 'C': 10.0},
    {'ng': (1, 3), 'C': 10.0, 'words': True}, {'ng': (1, 4), 'C': 10.0, 'words': True},
]
N = len(rows)
for cfg in CFGS:
    # 기준 1
    texts = [r['text'] for r in rows] + [e[0] for e in extra]
    Y = np.array([lab(r['say']) for r in rows] + [e[1] for e in extra])
    f, heads = fit(cfg, texts, Y)
    ev = decode(f, heads, [w[0] for w in wev])
    strict = sum(all(k in do for k in w[1]) and all(k in dont for k in w[2]) and not any(k in do for k in w[2]) for w, (do, dont) in zip(wev, ev))
    loose = sum((not w[1] or any(k in do for k in w[1])) and not any(k in do for k in w[2]) for w, (do, dont) in zip(wev, ev))
    # 기준 2: 블록 5겹
    passed = 0
    for fold in np.array_split(np.arange(N), 5):
        tr = np.setdiff1d(np.arange(N), fold)
        tt = [rows[i]['text'] for i in tr] + [e[0] for e in extra]
        YY = np.array([lab(rows[i]['say']) for i in tr] + [e[1] for e in extra])
        f2, h2 = fit(cfg, tt, YY)
        for i, (do, dont) in zip(fold, decode(f2, h2, [rows[i]['text'] for i in fold])): passed += passes(rows[i], do, dont)
    print(f"{str(cfg):55s} 평가 116: 엄격 {strict} 느슨 {loose} | 5겹 통과 {passed / N:.3f}", flush=True)
