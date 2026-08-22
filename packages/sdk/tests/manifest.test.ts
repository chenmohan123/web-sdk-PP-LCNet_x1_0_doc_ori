import { describe, expect, it } from "vitest";
import { parseModelManifest } from "../src/model/manifest";
import { DocOrientationError } from "../src/errors";

const officialManifest = {
  schemaVersion: 1,
  model: {
    id: "PP-LCNet_x1_0_doc_ori",
    version: "1.0.0",
    architecture: "PP-LCNet_x1_0",
    modelType: "doc_img_orientation_classification",
    parameterCount: 1_687_613,
  },
  input: { name: "x", dtype: "float32", shape: ["batch", 3, 224, 224] },
  output: { name: "fetch_name_0", dtype: "float32", shape: ["batch", 4] },
  labels: ["0", "90", "180", "270"],
  maxBatchSize: 8,
  preprocessing: {
    resizeShort: 256,
    cropSize: 224,
    rescaleFactor: 1 / 255,
    imageMean: [0.485, 0.456, 0.406],
    imageStd: [0.229, 0.224, 0.225],
  },
  variant: {
    id: "official-fp32",
    bytes: 6_788_069,
    opset: 7,
    sha256: "af9a0a4f317ff0709ce752067807f819cb15d883f8ecad89f28df1c6ee2d9c92",
    url: "./inference.onnx",
  },
  source: {
    name: "PaddlePaddle/PP-LCNet_x1_0_doc_ori_onnx",
    url: "https://huggingface.co/PaddlePaddle/PP-LCNet_x1_0_doc_ori_onnx",
    license: "Apache-2.0",
    files: { model: "inference.onnx" },
  },
} as const;

function expectInvalid(mutator: (manifest: Record<string, unknown>) => void): void {
  const candidate = structuredClone(officialManifest) as unknown as Record<string, unknown>;
  mutator(candidate);
  expect(() => parseModelManifest(candidate)).toThrowError(DocOrientationError);
  try {
    parseModelManifest(candidate);
  } catch (error) {
    expect(error).toMatchObject({ code: "MANIFEST_INVALID" });
  }
}

describe("parseModelManifest", () => {
  it("accepts the official singular input/output manifest contract", () => {
    const parsed = parseModelManifest(officialManifest);
    expect(parsed).toEqual(officialManifest);
    expect(parsed.input.shape).toEqual(["batch", 3, 224, 224]);
    expect(parsed.output.shape).toEqual(["batch", 4]);
    expect(parsed.maxBatchSize).toBe(8);
  });

  it("rejects missing SHA-256 integrity metadata", () => {
    expectInvalid((manifest) => {
      delete (manifest.variant as Record<string, unknown>).sha256;
    });
  });

  it("rejects non-float32 input tensors", () => {
    expectInvalid((manifest) => {
      (manifest.input as Record<string, unknown>).dtype = "float16";
    });
  });

  it("rejects wrong spatial input dimensions", () => {
    expectInvalid((manifest) => {
      (manifest.input as Record<string, unknown>).shape = ["batch", 3, 256, 256];
    });
  });

  it("rejects labels that do not match output class count", () => {
    expectInvalid((manifest) => {
      (manifest.labels as unknown[]).pop();
    });
  });

  it("rejects invalid maxBatchSize values", () => {
    expectInvalid((manifest) => {
      manifest.maxBatchSize = 0;
    });
    expectInvalid((manifest) => {
      manifest.maxBatchSize = 1.5;
    });
  });
});
