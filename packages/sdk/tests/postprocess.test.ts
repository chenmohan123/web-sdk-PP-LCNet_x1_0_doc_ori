import { describe, expect, it } from "vitest";
import { postprocessLogits } from "../src/postprocess";
import type { ModelManifest } from "../src/types";

const manifest = {
  labels: ["0", "90", "180", "270"],
} as unknown as ModelManifest;

describe("postprocessLogits", () => {
  it("returns stable probabilities and correction angles", () => {
    const upright = postprocessLogits([1000, 0, -1000, -2000], manifest);
    expect(upright).toMatchObject({ orientation: 0, correctionAngle: 0 });
    expect(upright.score).toBeCloseTo(1);
    expect(postprocessLogits([0, 10, 0, 0], manifest)).toMatchObject({
      orientation: 90,
      correctionAngle: 270,
    });
    expect(postprocessLogits([0, 0, 10, 0], manifest)).toMatchObject({
      orientation: 180,
      correctionAngle: 180,
    });
    expect(postprocessLogits([0, 0, 0, 10], manifest)).toMatchObject({
      orientation: 270,
      correctionAngle: 90,
    });
  });
});
