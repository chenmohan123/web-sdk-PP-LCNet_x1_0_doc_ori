import { DocOrientationError } from "../errors";
import type { ModelManifest } from "../types";

const EXPECTED_LABELS = ["0", "90", "180", "270"] as const;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function invalid(field: string, message: string): never {
  throw new DocOrientationError("MANIFEST_INVALID", message, { field });
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalid(field, `${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    return invalid(field, `${field} must be a non-empty string`);
  return value;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return invalid(field, `${field} must be finite`);
  return value;
}

function positiveInteger(value: unknown, field: string): number {
  const number = finiteNumber(value, field);
  if (!Number.isInteger(number) || number <= 0)
    return invalid(field, `${field} must be a positive integer`);
  return number;
}

function tuple(value: unknown, field: string, length: number): unknown[] {
  if (!Array.isArray(value) || value.length !== length)
    return invalid(field, `${field} must contain ${length} values`);
  return value;
}

function validateUrl(value: unknown, field: string): string {
  const url = string(value, field);
  try {
    new URL(url, "https://manifest.invalid/");
  } catch {
    return invalid(field, `${field} must be a valid URL`);
  }
  return url;
}

export function parseModelManifest(value: unknown): ModelManifest {
  const manifest = object(value, "manifest");
  if (manifest.schemaVersion !== 1)
    invalid("schemaVersion", "Unsupported manifest schemaVersion");

  const model = object(manifest.model, "model");
  const parameterCount = positiveInteger(
    model.parameterCount,
    "model.parameterCount",
  );
  const modelValue = {
    id: string(model.id, "model.id"),
    version: string(model.version, "model.version"),
    architecture: string(model.architecture, "model.architecture"),
    modelType: string(model.modelType, "model.modelType"),
    parameterCount,
  };

  const input = object(manifest.input, "input");
  if (input.dtype !== "float32")
    invalid("input.dtype", "input.dtype must be float32");
  if (string(input.name, "input.name") === "")
    invalid("input.name", "input.name must be non-empty");
  const inputShape = tuple(input.shape, "input.shape", 4);
  if (
    inputShape[0] !== "batch" ||
    inputShape[1] !== 3 ||
    inputShape[2] !== 224 ||
    inputShape[3] !== 224
  ) {
    invalid("input.shape", "input.shape must be [batch, 3, 224, 224]");
  }

  const output = object(manifest.output, "output");
  if (output.dtype !== "float32")
    invalid("output.dtype", "output.dtype must be float32");
  string(output.name, "output.name");
  const outputShape = tuple(output.shape, "output.shape", 2);
  if (outputShape[0] !== "batch" || outputShape[1] !== 4)
    invalid("output.shape", "output.shape must be [batch, 4]");

  const labels = tuple(manifest.labels, "labels", 4);
  if (!labels.every((label, index) => label === EXPECTED_LABELS[index])) {
    invalid(
      "labels",
      "labels must be ['0', '90', '180', '270'] in output order",
    );
  }

  const preprocessing = object(manifest.preprocessing, "preprocessing");
  if (preprocessing.resizeShort !== 256)
    invalid("preprocessing.resizeShort", "resizeShort must be 256");
  if (preprocessing.cropSize !== 224)
    invalid("preprocessing.cropSize", "cropSize must be 224");
  const rescaleFactor = finiteNumber(
    preprocessing.rescaleFactor,
    "preprocessing.rescaleFactor",
  );
  if (Math.abs(rescaleFactor - 1 / 255) > Number.EPSILON * 4)
    invalid("preprocessing.rescaleFactor", "rescaleFactor must be 1/255");
  const imageMean = tuple(
    preprocessing.imageMean,
    "preprocessing.imageMean",
    3,
  ).map((entry, index) =>
    finiteNumber(entry, `preprocessing.imageMean[${index}]`),
  );
  const imageStd = tuple(
    preprocessing.imageStd,
    "preprocessing.imageStd",
    3,
  ).map((entry, index) => {
    const value = finiteNumber(entry, `preprocessing.imageStd[${index}]`);
    if (value <= 0)
      invalid(
        `preprocessing.imageStd[${index}]`,
        "imageStd values must be positive",
      );
    return value;
  });

  const variant = object(manifest.variant, "variant");
  const sha256 = string(variant.sha256, "variant.sha256");
  if (!SHA256_PATTERN.test(sha256))
    invalid(
      "variant.sha256",
      "variant.sha256 must be a 64-character hexadecimal digest",
    );
  const variantValue = {
    id: string(variant.id, "variant.id"),
    bytes: positiveInteger(variant.bytes, "variant.bytes"),
    opset: positiveInteger(variant.opset, "variant.opset"),
    sha256: sha256.toLowerCase(),
    url: validateUrl(variant.url, "variant.url"),
  };

  const source = object(manifest.source, "source");
  const files = object(source.files, "source.files");
  const sourceFiles: Record<string, string> = {};
  for (const [name, file] of Object.entries(files))
    sourceFiles[string(name, "source.files key")] = string(
      file,
      `source.files.${name}`,
    );

  return {
    schemaVersion: 1,
    model: modelValue,
    input: {
      name: string(input.name, "input.name"),
      dtype: "float32",
      shape: ["batch", 3, 224, 224],
    },
    output: {
      name: string(output.name, "output.name"),
      dtype: "float32",
      shape: ["batch", 4],
    },
    labels: ["0", "90", "180", "270"],
    maxBatchSize: positiveInteger(manifest.maxBatchSize, "maxBatchSize"),
    preprocessing: {
      resizeShort: 256,
      cropSize: 224,
      rescaleFactor,
      imageMean: imageMean as [number, number, number],
      imageStd: imageStd as [number, number, number],
    },
    variant: variantValue,
    source: {
      name: string(source.name, "source.name"),
      url: validateUrl(source.url, "source.url"),
      license: string(source.license, "source.license"),
      files: sourceFiles,
    },
  };
}
