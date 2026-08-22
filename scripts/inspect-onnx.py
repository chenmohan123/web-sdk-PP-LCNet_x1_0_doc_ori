import json
import sys

import onnx
from onnx import numpy_helper

model = onnx.load(sys.argv[1])

def shape(value_info):
    return [dim.dim_value if dim.dim_value else dim.dim_param for dim in value_info.type.tensor_type.shape.dim]

def dtype(value_info):
    return "float32" if value_info.type.tensor_type.elem_type == onnx.TensorProto.FLOAT else str(value_info.type.tensor_type.elem_type)

constants = [numpy_helper.to_array(attribute.t) for node in model.graph.node for attribute in node.attribute if attribute.type == onnx.AttributeProto.TENSOR]
parameter_count = sum(tensor.size for tensor in model.graph.initializer) + sum(tensor.size for tensor in constants)
opset = next((item.version for item in model.opset_import if item.domain == ""), 0)
print(json.dumps({
    "input": {"name": model.graph.input[0].name, "dtype": dtype(model.graph.input[0]), "shape": shape(model.graph.input[0])},
    "output": {"name": model.graph.output[0].name, "dtype": dtype(model.graph.output[0]), "shape": shape(model.graph.output[0])},
    "opset": opset,
    "parameterCount": parameter_count,
}))
