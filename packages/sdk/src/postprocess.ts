import { DocOrientationError } from "./errors";
import type { ModelManifest, OrientationAngle } from "./types";

export interface OrientationPostprocessResult {
  readonly orientation: OrientationAngle;
  readonly correctionAngle: OrientationAngle;
  readonly label: string;
  readonly score: number;
  readonly probabilities: Readonly<Record<string, number>>;
}

export function postprocessLogits(
  logits: Float32Array | readonly number[],
  manifest: ModelManifest,
  offset = 0,
): OrientationPostprocessResult {
  if (logits.length - offset < manifest.labels.length)
    throw new DocOrientationError(
      "INFERENCE_FAILED",
      "Model output does not contain four logits",
    );
  let max = -Infinity;
  for (let index = 0; index < manifest.labels.length; index += 1)
    max = Math.max(max, logits[offset + index] ?? -Infinity);
  const values = manifest.labels.map((_, index) =>
    Math.exp((logits[offset + index] ?? -Infinity) - max),
  );
  const denominator = values.reduce((sum, value) => sum + value, 0);
  const probabilities: Record<string, number> = {};
  let bestIndex = 0;
  for (let index = 0; index < values.length; index += 1) {
    const probability = values[index]! / denominator;
    probabilities[manifest.labels[index]!] = probability;
    if (probability > values[bestIndex]! / denominator) bestIndex = index;
  }
  const orientation = Number(manifest.labels[bestIndex]) as OrientationAngle;
  return {
    orientation,
    correctionAngle: ((360 - orientation) % 360) as OrientationAngle,
    label: manifest.labels[bestIndex]!,
    score: probabilities[manifest.labels[bestIndex]!]!,
    probabilities,
  };
}
