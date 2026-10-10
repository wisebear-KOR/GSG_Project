"""Patched Kev-0.8B ONNX (onnxruntime CPU) vs Kev torch: same encodings, same probabilities?
Also writes out/reference.json (Python encodings + probabilities) for the browser harness.

usage: python parity.py [model=out/kev08.onnx] [n=all]
"""
import json, os, sys, time
import numpy as np
import onnxruntime as ort

# 작업 폴더(참조 ONNX·safetensors·requests.json이 있는 곳)에서 실행한다. Kev 저장소는 KEV_REPO (기본 ../kev)
HERE = os.getcwd()
sys.path.insert(0, os.environ.get("KEV_REPO", os.path.join(HERE, "..", "kev")))
from kev.checkpoint import Checkpoint, resolve_run  # noqa: E402
from kev.api import SystemOneRequest, to_record  # noqa: E402
from kev.model import rows_of  # noqa: E402

MODEL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out", "kev08.onnx")
N = int(sys.argv[2]) if len(sys.argv) > 2 else None
head = {k: np.fromfile(os.path.join(HERE, "out", f"head_{k}.bin"), dtype=np.float32) for k in ("q_w", "q_b", "k_w", "k_b")}
hj = json.load(open(os.path.join(HERE, "out", "head.json")))
D, DP, T, SCALE = hj["d"], hj["dp"], hj["temperature"], hj["scale"]
qw, kw = head["q_w"].reshape(DP, D), head["k_w"].reshape(DP, D)

sess = ort.InferenceSession(MODEL, providers=["CPUExecutionProvider"])
ins = {i.name: i for i in sess.get_inputs()}
fp16 = "float16" in sess.get_outputs()[0].type
HID = sess.get_outputs()[0].name


def feeds(ids):
    f = {"input_ids": np.array([ids], dtype=np.int64), "attention_mask": np.ones((1, len(ids)), dtype=np.int64)}
    for name, i in ins.items():
        if name in f: continue
        shape = [1 if d == "batch_size" else 0 if isinstance(d, str) else d for d in i.shape]
        f[name] = np.zeros(shape, dtype=np.float16 if "float16" in i.type else np.float32)
    return f


def onnx_probs(enc):
    s_ids, _, rows = rows_of(enc)
    out = []
    for r in rows:
        ids = list(s_ids) + list(r["ids"])
        h = sess.run([HID], feeds(ids))[0][0].astype(np.float32)
        hd = h[len(s_ids) + r["decide"]]
        ho = h[[len(s_ids) + o for o in r["opts"]]]
        z = ((ho @ kw.T + head["k_b"]) @ (qw @ hd + head["q_b"])) * SCALE / T
        e = np.exp(z - z.max())
        out.append(e / e.sum())
    return out


tok, km = Checkpoint(resolve_run("jaredpalmer/kev-0.8b")).load("cpu")
reqs = json.load(open(os.path.join(HERE, "requests.json"), encoding="utf-8"))
if N: reqs = reqs[:N] + [r for r in reqs if r["key"] == "stage1"]
ref, worst, flips, total, times = [], 0.0, 0, 0, []
for r in reqs:
    rec, meta = to_record(SystemOneRequest(state=r["state"], questions=r["questions"]))
    enc = km.encode(tok, rec)
    t0 = time.time(); po = onnx_probs(enc); times.append(time.time() - t0)
    pt = [p.numpy().astype(np.float64) for p in km.probs(enc)]
    for m, a, b in zip(meta, po, pt):
        worst = max(worst, float(np.abs(a - b).max())); total += 1
        flips += int(np.argmax(a) != np.argmax(b))
    s_ids, _, rows = rows_of(enc)
    ref.append({"key": r["key"], "state_ids": list(map(int, s_ids)),
                "rows": [{"ids": list(map(int, x["ids"])), "decide": x["decide"], "opts": x["opts"]} for x in rows],
                "keys": [m["keys"] for m in meta], "qids": [m["id"] for m in meta],
                "torch": [p.tolist() for p in pt], "onnx": [p.tolist() for p in po]})
    print(f"{r['key']:14s} rows {len(rows):2d} tokens {len(s_ids) + sum(len(x['ids']) for x in rows):5d}  onnx {times[-1]*1000:7.0f} ms  maxdiff {max(float(np.abs(a-b).max()) for a, b in zip(po, pt)):.5f}")
print(f"\n{os.path.basename(MODEL)}: {total} questions, max |dp| {worst:.5f}, argmax flips {flips}, mean {np.mean(times)*1000:.0f} ms/request (CPU)")
json.dump(ref, open(os.path.join(HERE, "out", "reference.json"), "w"))
