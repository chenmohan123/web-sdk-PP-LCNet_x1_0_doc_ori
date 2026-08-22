import { describe, expect, it } from "vitest";
import { preprocessRaster } from "../src/preprocess";
import type { ModelManifest, NormalizedRaster } from "../src/types";

const manifest = { preprocessing: { resizeShort: 256, cropSize: 224, rescaleFactor: 1 / 255, imageMean: [0, 0, 0], imageStd: [1, 1, 1] } } as unknown as ModelManifest;

describe("preprocessRaster", () => {
  it("produces NCHW 224x224 data and preserves source dimensions", () => {
    const data = new Uint8ClampedArray(3 * 2 * 4);
    for (let index = 0; index < data.length; index += 4) { data[index] = 255; data[index + 3] = 255; }
    const raster: NormalizedRaster = { data, width: 3, height: 2, originalWidth: 3, originalHeight: 2, exifOrientation: 1 };
    const result = preprocessRaster(raster, manifest);
    expect(result.dims).toEqual([1, 3, 224, 224]);
    expect(result.data).toHaveLength(3 * 224 * 224);
    expect(result.originalSize).toEqual({ width: 3, height: 2 });
  });
});
