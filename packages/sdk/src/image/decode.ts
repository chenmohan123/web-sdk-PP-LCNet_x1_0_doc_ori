import { DocOrientationError } from "../errors";
import type { DecodableImage, NormalizedRaster } from "../types";
import { exifCanvasTransform, readExifOrientation, type ExifOrientation } from "./exif";

export interface DecodeEnvironment {
  readonly createImageBitmap?: (source: ImageBitmapSource, options?: ImageBitmapOptions) => Promise<ImageBitmap>;
  readonly createCanvas?: (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas;
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") { const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; return canvas; }
  throw new DocOrientationError("IMAGE_INVALID", "No canvas implementation is available");
}

function contextOf(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) throw new DocOrientationError("IMAGE_INVALID", "Unable to create a 2D canvas context");
  return context as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

function readRaster(canvas: HTMLCanvasElement | OffscreenCanvas, originalWidth: number, originalHeight: number, exifOrientation: ExifOrientation): NormalizedRaster {
  const image = contextOf(canvas).getImageData(0, 0, canvas.width, canvas.height);
  return { data: new Uint8ClampedArray(image.data), width: canvas.width, height: canvas.height, originalWidth, originalHeight, exifOrientation };
}

export async function decodeImage(input: DecodableImage, environment: DecodeEnvironment = {}): Promise<NormalizedRaster> {
  const isBlob = input instanceof Blob;
  const orientation = isBlob ? readExifOrientation(await input.arrayBuffer()) : 1;
  let bitmap: ImageBitmap | undefined;
  try {
    let source: ImageBitmap | HTMLCanvasElement | OffscreenCanvas;
    if (isBlob) {
      const createBitmap = environment.createImageBitmap ?? globalThis.createImageBitmap;
      if (typeof createBitmap !== "function") throw new DocOrientationError("IMAGE_INVALID", "ImageBitmap decoding is unavailable");
      bitmap = await createBitmap(input, { imageOrientation: "none" });
      source = bitmap;
    } else source = input as ImageBitmap | HTMLCanvasElement | OffscreenCanvas;
    if (source.width <= 0 || source.height <= 0) throw new DocOrientationError("IMAGE_INVALID", "Image has invalid dimensions");
    const output = orientation >= 5 ? { width: source.height, height: source.width } : { width: source.width, height: source.height };
    const canvas = (environment.createCanvas ?? createCanvas)(output.width, output.height);
    const context = contextOf(canvas);
    exifCanvasTransform(context, orientation, source.width, source.height);
    context.drawImage(source, 0, 0);
    return readRaster(canvas, source.width, source.height, orientation);
  } catch (error) {
    if (error instanceof DocOrientationError) throw error;
    throw new DocOrientationError("IMAGE_INVALID", "Unable to decode image", { cause: error });
  } finally { bitmap?.close(); }
}
