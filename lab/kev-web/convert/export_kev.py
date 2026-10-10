"""Kev-0.8B -> ONNX by patching onnx-community/Qwen3.5-0.8B-Text-ONNX.

1. Learn how each ONNX initializer is derived from the HF weight (identity / transpose / 1+w / -exp(w)) by comparing the
   reference ONNX (Qwen3.5-0.8B instruct) with the same model's safetensors.
2. Load Kev-0.8B (Qwen3.5-0.8B-Base + LoRA merged by kev.checkpoint) and write its weights through the same transforms.
3. Drop the lm_head (logits) and expose the final-norm output as `hidden_states` (what Kev's pointer head reads).
4. Save fp32 and fp16 graphs + the pointer head (q, k, temperature) for JS.

usage: python export_kev.py   (run in this folder; needs kev repo at ../kev)
"""
import json, os, sys
import numpy as np
import onnx
import torch
from onnx import helper, numpy_helper, TensorProto
from safetensors.torch import load_file

# 작업 폴더(참조 ONNX·safetensors·requests.json이 있는 곳)에서 실행한다. Kev 저장소는 KEV_REPO (기본 ../kev)
HERE = os.getcwd()
sys.path.insert(0, os.environ.get("KEV_REPO", os.path.join(HERE, "..", "kev")))
from kev.checkpoint import Checkpoint, resolve_run  # noqa: E402

OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
HIDDEN = "/model/layers.24/final_norm_layernorm/output_0"


def hf_name(n):
    n = n.replace(".gdn.", ".linear_attn.").replace(".attn.", ".self_attn.")
    n = n.replace(".MatMul.weight", ".weight").replace(".weight_3d", ".weight").replace(".layernorm.weight", ".weight")
    n = n.replace("A_neg_exp", "A_log")
    return "model.norm.weight" if n == "model.layers.24.final_norm_layernorm.weight" else n


TRANSFORMS = {
    "id": lambda w: w,
    "T": lambda w: w.T,
    "plus1": lambda w: 1.0 + w,
    "negexp": lambda w: -np.exp(w),
}


def is_weight(name):
    return name.startswith("model.") and not name.startswith("/")


def learn(ref_onnx, ref_st):
    """-> {onnx initializer name: (hf name, transform)}"""
    ref = {k.removeprefix("model.language_model.").removeprefix("model."): v for k, v in load_file(ref_st).items()}
    m = onnx.load(ref_onnx)
    plan, bad = {}, []
    for init in m.graph.initializer:
        if not is_weight(init.name):
            continue
        h = hf_name(init.name).removeprefix("model.")
        if h not in ref:
            bad.append((init.name, "no hf key " + h)); continue
        w = ref[h].float().numpy(); o = numpy_helper.to_array(init).astype(np.float32)
        hit = None
        for t, f in TRANSFORMS.items():
            x = f(w)
            if x.shape == o.shape and np.allclose(x, o, rtol=1e-2, atol=1e-3):
                hit = t; break
        if hit is None:
            bad.append((init.name, f"no transform: hf {tuple(w.shape)} onnx {tuple(o.shape)}"))
        else:
            plan[init.name] = (h, hit)
    return plan, bad


def kev_weights():
    ck = Checkpoint(resolve_run("jaredpalmer/kev-0.8b"))
    tok, km = ck.load("cpu")
    sd = {k: v.detach().float().numpy() for k, v in km.lm.state_dict().items()}
    head = {"q_w": km.head.q.weight, "q_b": km.head.q.bias, "k_w": km.head.k.weight, "k_b": km.head.k.bias}
    head = {k: v.detach().float().numpy() for k, v in head.items()}
    return tok, km, sd, head, float(km.head.temperature), float(km.head.scale)


def patch(src, dst, plan, sd, dtype):
    m = onnx.load(src)
    g = m.graph
    done = 0
    for i, init in enumerate(g.initializer):
        if init.name not in plan:
            continue
        h, t = plan[init.name]
        # keep each initializer's own type (an fp16 graph may keep some weights in fp32)
        w = TRANSFORMS[t](sd[h]).astype(helper.tensor_dtype_to_np_dtype(init.data_type))
        new = numpy_helper.from_array(np.ascontiguousarray(w), init.name)
        g.initializer[i].CopyFrom(new)
        done += 1
    # drop the lm_head: remove the nodes after the final norm and the logits output, expose hidden_states
    drop = {n.name for n in g.node if n.name.startswith("/lm_head/")}
    keep = [n for n in g.node if n.name not in drop]
    del g.node[:]
    g.node.extend(keep)
    outs = [o for o in g.output if o.name != "logits"]
    del g.output[:]
    g.output.extend(outs)
    elem = TensorProto.FLOAT16 if dtype == "fp16" else TensorProto.FLOAT
    g.output.insert(0, helper.make_tensor_value_info(HIDDEN, elem, ["batch_size", "sequence_length", 1024]))
    ins = [x for x in g.input if x.name != "num_logits_to_keep"]
    del g.input[:]
    g.input.extend(ins)
    base = os.path.basename(dst)
    onnx.save_model(m, dst, save_as_external_data=True, all_tensors_to_one_file=True, location=base + "_data", size_threshold=1024)
    return done


if __name__ == "__main__":
    plan, bad = learn(os.path.join(HERE, "model.onnx"), os.path.join(HERE, "model.safetensors"))
    print("mapped", len(plan), "unmapped", len(bad))
    for b in bad[:20]:
        print("  ", b)
    from collections import Counter
    print("transforms", Counter(t for _, t in plan.values()))
    json.dump(plan, open(os.path.join(OUT, "plan.json"), "w"), indent=1)
    if bad:
        sys.exit("stop: unmapped weights")
    tok, km, sd, head, temp, scale = kev_weights()
    missing = [h for h, _ in plan.values() if h not in sd]
    print("kev keys missing", missing[:10])
    if missing:
        sys.exit("stop: kev keys missing")
    print("fp32 patched", patch(os.path.join(HERE, "model.onnx"), os.path.join(OUT, "kev08.onnx"), plan, sd, "fp32"))
    print("fp16 patched", patch(os.path.join(HERE, "model_fp16.onnx"), os.path.join(OUT, "kev08_fp16.onnx"), plan, sd, "fp16"))
    for k, v in head.items():
        v.astype(np.float32).tofile(os.path.join(OUT, f"head_{k}.bin"))
    json.dump({"temperature": temp, "scale": scale, "dp": int(head["q_w"].shape[0]), "d": int(head["q_w"].shape[1])},
              open(os.path.join(OUT, "head.json"), "w"))
    print("head", {k: v.shape for k, v in head.items()}, "T", temp, "scale", scale)
