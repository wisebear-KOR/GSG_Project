# 합성 금지 문장(synth.json)을 더하면 금지를 더 잘 배우나 — 블록 5겹(진짜 문장만 평가)과 은유 세트
#   python negaug.py <모델 스냅숏 경로>   (synth 특징을 뽑아 fsynth.npz로 두고 재사용)
import json, sys, os
import numpy as np, torch
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from probe import cases, scen, Y, D, KINDS, CLS, DOC, fit_heads, predict, decode, passes

here = os.path.dirname(os.path.abspath(__file__))
syn = json.load(open(os.path.join(here, 'synth.json'), encoding='utf-8'))
Ys = np.array([[CLS[c['say'][k]] for k in KINDS] for c in syn]); Ds = np.array([DOC.get(c['doctrine'], -1) if c['doctrine'] else -1 for c in syn])
fs = os.path.join(here, 'fsynth.npz')
if not os.path.exists(fs):
    from transformers import AutoTokenizer, AutoModelForCausalLM
    torch.set_num_threads(8)
    tok = AutoTokenizer.from_pretrained(sys.argv[1]); m = AutoModelForCausalLM.from_pretrained(sys.argv[1], dtype=torch.float32).eval()
    out = []
    with torch.no_grad():
        for c in syn:
            o = m(**tok(f'신의 계시: "{c["text"]}"\n대사제가 해석한다:', return_tensors='pt'), output_hidden_states=True)
            out.append(o.hidden_states[24][0][-1].float().numpy())
    np.savez_compressed(fs, last24=np.stack(out))
Xsyn = np.load(fs)['last24']
z = np.load(os.path.join(here, 'f08.npz')); nc = int(z['n_cases']); Xc = z['last24'][:nc]; Xs = z['last24'][nc:]
N = len(cases)

def cv(aug, kind):
    folds = np.array_split(np.arange(N), 5); passed = 0; tp = fp = fn = 0
    for f in folds:
        tr = np.setdiff1d(np.arange(N), f)
        if kind == 'chars':
            txt = [cases[i]['text'] for i in tr] + ([c['text'] for c in syn] if aug else [])
            v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), sublinear_tf=True).fit(txt)
            Xtr = v.transform(txt); Xte = v.transform([cases[i]['text'] for i in f]); C = 10.0
        else:
            A = np.vstack([Xc[tr], Xsyn]) if aug else Xc[tr]
            sc = StandardScaler().fit(A); Xtr = sc.transform(A); Xte = sc.transform(Xc[f]); C = 0.05
        Ytr = np.vstack([Y[tr], Ys]) if aug else Y[tr]; Dtr = np.concatenate([D[tr], Ds]) if aug else D[tr]
        heads, dm = fit_heads(Xtr, Ytr, Dtr, C); P, _ = predict(heads, dm, Xte)
        for k, i in enumerate(f):
            do, dont = decode(P[k]); c = cases[i]; passed += passes(c, do, dont)
            t = {x for x in KINDS if c['say'][x] == 'dont'}; tp += len(t & set(dont)); fp += len(set(dont) - t); fn += len(t - set(dont))
    return passed / N, tp / max(1, tp + fp), tp / max(1, tp + fn)

for kind in ['chars', 'f08:last24']:
    for aug in [False, True]:
        p, P_, R_ = cv(aug, kind)
        print(f'{kind:11s} 합성 {"O" if aug else "X"}: 5겹 통과 {p:.3f} · 금지 정밀 {P_:.2f} 재현 {R_:.2f}', flush=True)
