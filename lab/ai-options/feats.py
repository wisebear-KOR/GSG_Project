# 얼린 백본의 은닉 상태 뽑기: 석판 문장 + 은유 세트를 한 줄씩 넣고 층마다 평균·마지막 토큰을 저장한다.
#   python feats.py <hf 모델 이름> <출력.npz>
import json, sys, time, os
import numpy as np, torch
from transformers import AutoTokenizer, AutoModelForCausalLM

name, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
cases = json.load(open(os.path.join(here, 'cases.json'), encoding='utf-8'))
scen = json.load(open(os.path.join(here, 'scenario.json'), encoding='utf-8'))
# 문맥이 있는 은유("때가 되었다")는 사건을 앞에 붙인다. 석판 문장은 사건 없이
def frame(text, event=None):
    return (f'사건: {event}\n' if event else '') + f'신의 계시: "{text}"\n대사제가 해석한다:'
texts = [frame(c['text']) for c in cases] + [frame(s['text'], s.get('eventText')) for s in scen]

torch.set_num_threads(8)
tok = AutoTokenizer.from_pretrained(name)
dtype = torch.bfloat16 if len(sys.argv) > 3 and sys.argv[3] == 'bf16' else torch.float32
model = AutoModelForCausalLM.from_pretrained(name, dtype=dtype)
model.eval()
L = model.config.get_text_config().num_hidden_layers if hasattr(model.config, 'get_text_config') else model.config.num_hidden_layers
layers = sorted(set([L // 4, L // 2, (3 * L) // 4, L]))
mean = {l: [] for l in layers}; last = {l: [] for l in layers}
t0 = time.time()
with torch.no_grad():
    for i, t in enumerate(texts):
        ids = tok(t, return_tensors='pt')
        o = model(**ids, output_hidden_states=True)
        for l in layers:
            h = o.hidden_states[l][0].float()
            mean[l].append(h.mean(0).numpy()); last[l].append(h[-1].numpy())
        if i % 200 == 0: print(i, f'{time.time() - t0:.0f}s', flush=True)
np.savez_compressed(out, layers=np.array(layers), n_cases=len(cases), **{f'mean{l}': np.stack(mean[l]) for l in layers}, **{f'last{l}': np.stack(last[l]) for l in layers})
print('done', len(texts), f'{time.time() - t0:.0f}s', 'layers', layers, 'per text', f'{(time.time() - t0) / len(texts):.3f}s')
