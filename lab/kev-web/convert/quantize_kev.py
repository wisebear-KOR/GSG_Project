"""Kev ONNX -> 4-bit weights (MatMulNBits for the projections, GatherBlockQuantized for the embedding).
usage: python quantize_kev.py <src.onnx> <dst.onnx> [block=32] [bits=4] [ops=MatMul,Gather]
"""
import os, sys
import onnx
from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer, DefaultWeightOnlyQuantConfig

src, dst = sys.argv[1], sys.argv[2]
block = int(sys.argv[3]) if len(sys.argv) > 3 else 32
bits = int(sys.argv[4]) if len(sys.argv) > 4 else 4
ops = tuple(sys.argv[5].split(',')) if len(sys.argv) > 5 else ('MatMul', 'Gather')
model = onnx.load(src)
cfg = DefaultWeightOnlyQuantConfig(block_size=block, is_symmetric=True, accuracy_level=4, bits=bits,
                                   op_types_to_quantize=ops, quant_axes=tuple((o, 0 if o == "MatMul" else 1) for o in ops))
q = MatMulNBitsQuantizer(model, block_size=block, is_symmetric=True, accuracy_level=4, algo_config=cfg)
q.process()
onnx.save_model(q.model.model, dst, save_as_external_data=True, all_tensors_to_one_file=True,
                location=os.path.basename(dst) + "_data", size_threshold=1024)
from collections import Counter
print(Counter(n.op_type for n in q.model.model.graph.node if n.op_type in ("MatMul", "MatMulNBits", "Gather", "GatherBlockQuantized")))
print("data", os.path.getsize(dst + "_data") / 1e6, "MB")
