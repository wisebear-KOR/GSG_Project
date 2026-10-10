# 판정기(글자 n-gram + 선형 머리) 학습과 내보내기 — 게임이 싣는 js/game/ai/judge-weights.js를 만든다.
#   node --no-warnings lab/ai-options/data.mjs && node --no-warnings lab/ai-options/synth.mjs
#   python lab/ai-options/train_judge.py
# 정답: 석판 시험 문장 1372(석판 출력) + 합성 금지 문장 400. 머리: 일 12가지마다 하라/하지 마라/말 없음 + 교리 4.
# 내보내는 꼴: 어휘(글자 1~3 조각, 두 문장 이상에 나온 것), idf(float32), 머리마다 int8 가중치와 배율·절편.
# 같이 내보내는 judge-parity.json으로 JS 추론이 파이썬과 같은지 tools/tests/judge.mjs가 본다.
import json, os, base64, sys
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(here, '..', '..'))
KINDS = ['gather:food', 'gather:wood', 'gather:stone', 'gather:faith', 'build:village', 'build:wall', 'build:temple', 'build:cathedral', 'pray', 'explore', 'preach', 'attack']
CLS = {'none': 0, 'do': 1, 'dont': 2}
DOCS = ['peace', 'war', 'abundance', 'wisdom']
C = 10.0

rows = json.load(open(os.path.join(here, 'cases.json'), encoding='utf-8'))
syn = json.load(open(os.path.join(here, 'synth.json'), encoding='utf-8'))
# 은유·간접 명령 문장 (Claude가 정답을 붙였다). 평가 전용 words-eval.json은 쓰지 않는다
words = json.load(open(os.path.join(here, 'words-train.json'), encoding='utf-8'))['rows']
said = lambda do, dont: {k: 'do' if k in do else 'dont' if k in dont else 'none' for k in KINDS}
data = [(r['text'], r['say'], r['doctrine']) for r in rows] + [(r['text'], r['say'], r['doctrine']) for r in syn] + [(w[0], said(w[1], w[2]), w[3]) for w in words]
texts = [d[0] for d in data]
Y = np.array([[CLS[d[1][k]] for k in KINDS] for d in data])
D = np.array([DOCS.index(d[2]) if d[2] in DOCS else -1 for d in data])

vec = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), sublinear_tf=True, min_df=2).fit(texts)
X = vec.transform(texts)
vocab = sorted(vec.vocabulary_.items(), key=lambda kv: kv[1])
F = len(vocab)

def q8(W):
    # 머리마다 배율 하나: |w| 최대가 127이 되게
    s = float(np.abs(W).max()) / 127 if np.abs(W).max() > 0 else 1.0
    return base64.b64encode(np.clip(np.round(W / s), -127, 127).astype(np.int8).tobytes()).decode(), s

heads = []
for j, k in enumerate(KINDS):
    ys = Y[:, j]
    present = sorted(set(ys.tolist()))
    if len(present) == 1:
        heads.append({'kind': k, 'const': present[0]}); continue
    m = LogisticRegression(C=C, max_iter=5000, class_weight='balanced').fit(X, ys)
    W = m.coef_; b = m.intercept_
    if W.shape[0] == 1:  # 두 갈래: z1 = w·x + b, z0 = 0
        W = np.vstack([np.zeros_like(W[0]), W[0]]); b = np.array([0.0, b[0]])
    w, s = q8(W.astype(np.float32))  # [클래스, 특징]
    heads.append({'kind': k, 'classes': [int(c) for c in m.classes_], 'w': w, 'scale': s, 'b': [float(x) for x in b]})
ok = D >= 0
dm = LogisticRegression(C=C, max_iter=5000).fit(X[ok], D[ok])
dw, ds = q8(dm.coef_.astype(np.float32))
doctrine = {'classes': [DOCS[c] for c in dm.classes_], 'w': dw, 'scale': ds, 'b': [float(x) for x in dm.intercept_]}

out = {
    'version': 1, 'kinds': KINDS, 'ngram': [1, 3], 'features': F,
    'vocab': '\u0001'.join(t for t, _ in vocab),
    'idf': base64.b64encode(vec.idf_.astype(np.float32).tobytes()).decode(),
    'heads': heads, 'doctrine': doctrine,
}
js = f'// 판정기 가중치 — lab/ai-options/train_judge.py가 만든다 (손으로 고치지 않는다). 석판 시험 문장 {len(rows)} + 합성 금지 {len(syn)} + 은유 {len(words)}로 배웠다\n'
js += 'export default ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
dest = os.path.join(root, 'js', 'game', 'ai', 'judge-weights.js')
os.makedirs(os.path.dirname(dest), exist_ok=True)
open(dest, 'w', encoding='utf-8', newline='\n').write(js)

# 같은 수의 비교용: 양자화한 가중치로 셈한 확률 (JS가 같아야 한다)
def deq(h):
    W = np.frombuffer(base64.b64decode(h['w']), dtype=np.int8).astype(np.float64).reshape(len(h['b']), F) * h['scale']
    return W, np.array(h['b'])
def softmax(z): z = z - z.max(); e = np.exp(z); return e / e.sum()
parity = []
for i in list(range(0, len(rows), 7)) + list(range(len(rows), len(data), 13)):
    x = X[i].toarray()[0]
    say = {}
    for h in heads:
        if 'const' in h: say[h['kind']] = [1.0 if c == h['const'] else 0.0 for c in range(3)]; continue
        W, b = deq(h); p = softmax(W @ x + b); full = [0.0, 0.0, 0.0]
        for ci, c in enumerate(h['classes']): full[c] = float(p[ci])
        say[h['kind']] = full
    W, b = deq(doctrine); pd = softmax(W @ x + b)
    parity.append({'text': texts[i], 'say': say, 'doctrine': {doctrine['classes'][ci]: float(pd[ci]) for ci in range(len(pd))}})
json.dump(parity, open(os.path.join(here, 'judge-parity.json'), 'w', encoding='utf-8'), ensure_ascii=False)

# 배운 문장 안에서 석판과 얼마나 같나 (tablet-cases 판정 기준은 JS 쪽 tools/tests/judge.mjs에서)
P = {}
agree = 0
for i in range(len(rows)):
    x = X[i].toarray()[0]
    same = True
    for j, h in enumerate(heads):
        if 'const' in h: pred = h['const']
        else:
            W, b = deq(h); p = softmax(W @ x + b); pred = h['classes'][int(p.argmax())]
        if pred != Y[i, j]: same = False
    agree += same
size = os.path.getsize(dest)
print(f'features {F}, heads {len(heads)}, file {size / 1024:.0f} KB, in-sample exact agreement with tablet {agree}/{len(rows)}')
