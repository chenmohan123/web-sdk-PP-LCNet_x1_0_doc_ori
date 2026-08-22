import { DocOrientationError } from "./errors";
import type { ModelManifest, NormalizedRaster } from "./types";

export interface PreprocessedTensor {
  readonly data: Float32Array;
  readonly dims: readonly [number, number, number, number];
  readonly originalSize: { readonly width: number; readonly height: number };
  readonly normalizedSize: { readonly width: number; readonly height: number };
}

function sample(raster: NormalizedRaster, x: number, y: number, channel: number): number {
  const x0 = Math.max(0, Math.min(raster.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(raster.height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(raster.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(raster.height - 1, y0 + 1));
  const dx = x - x0;
  const dy = y - y0;
  const get = (px: number, py: number): number => raster.data[(py * raster.width + px) * 4 + channel] ?? 0;
  const top = get(x0, y0) * (1 - dx) + get(x1, y0) * dx;
  const bottom = get(x0, y1) * (1 - dx) + get(x1, y1) * dx;
  return top * (1 - dy) + bottom * dy;
}

export function preprocessRaster(raster: NormalizedRaster, manifest: ModelManifest): PreprocessedTensor {
  if (raster.width <= 0 || raster.height <= 0 || raster.data.length !== raster.width * raster.height * 4) {
    throw new DocOrientationError("IMAGE_INVALID", "Image raster dimensions or pixel data are invalid");
  }
  const shortSide = Math.min(raster.width, raster.height);
  const scale = manifest.preprocessing.resizeShort / shortSide;
  const resizedWidth = Math.max(1, Math.round(raster.width * scale));
  const resizedHeight = Math.max(1, Math.round(raster.height * scale));
  const cropSize = manifest.preprocessing.cropSize;
  if (resizedWidth < cropSize || resizedHeight < cropSize) throw new DocOrientationError("IMAGE_INVALID", "Image is too small after resize");
  const left = (resizedWidth - cropSize) / 2;
  const top = (resizedHeight - cropSize) / 2;
  const data = new Float32Array(3 * cropSize * cropSize);
  const plane = cropSize * cropSize;
  for (let y = 0; y < cropSize; y += 1) {
    for (let x = 0; x < cropSize; x += 1) {
      const sourceX = (left + x + 0.5) / scale - 0.5;
      const sourceY = (top + y + 0.5) / scale - 0.5;
      for (let channel = 0; channel < 3; channel += 1) {
        const value = sample(raster, sourceX, sourceY, channel) * manifest.preprocessing.rescaleFactor;
        data[channel * plane + y * cropSize + x] = (value - manifest.preprocessing.imageMean[channel]!) / manifest.preprocessing.imageStd[channel]!;
      }
    }
  }
  return { data, dims: [1, 3, cropSize, cropSize], originalSize: { width: raster.originalWidth, height: raster.originalHeight }, normalizedSize: { width: raster.width, height: raster.height } };
}
