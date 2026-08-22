import { DocOrientationError } from "../errors";
import type { DecodableImage, NormalizedRaster } from "../types";
import {
  exifCanvasTransform,
  readExifOrientation,
  type ExifOrientation,
} from "./exif";

export interface DecodeEnvironment {
  readonly createImageBitmap?: (
    source: ImageBitmapSource,
    options?: ImageBitmapOptions,
  ) => Promise<ImageBitmap>;
  readonly createImage?: () => HTMLImageElement;
  readonly createObjectURL?: (blob: Blob) => string;
  readonly createCanvas?: (
    width: number,
    height: number,
  ) => HTMLCanvasElement | OffscreenCanvas;
  readonly revokeObjectURL?: (url: string) => void;
}

function createCanvas(
  width: number,
  height: number,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined")
    return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new DocOrientationError(
    "IMAGE_INVALID",
    "No canvas implementation is available",
  );
}

function contextOf(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null)
    throw new DocOrientationError(
      "IMAGE_INVALID",
      "Unable to create a 2D canvas context",
    );
  return context;
}

function readRaster(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  originalWidth: number,
  originalHeight: number,
  exifOrientation: ExifOrientation,
): NormalizedRaster {
  const image = contextOf(canvas).getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return {
    data: new Uint8ClampedArray(image.data),
    width: canvas.width,
    height: canvas.height,
    originalWidth,
    originalHeight,
    exifOrientation,
  };
}

export async function decodeImage(
  input: DecodableImage,
  environment: DecodeEnvironment = {},
): Promise<NormalizedRaster> {
  const isBlob = input instanceof Blob;
  const orientation = isBlob
    ? readExifOrientation(await input.arrayBuffer())
    : 1;
  let bitmap: ImageBitmap | undefined;
  let objectUrl: string | undefined;
  try {
    let source: ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;
    let transformOrientation = orientation;
    if (isBlob) {
      const createBitmap =
        environment.createImageBitmap ?? globalThis.createImageBitmap;
      if (typeof createBitmap === "function") {
        bitmap = await createBitmap(input, { imageOrientation: "none" });
        source = bitmap;
      } else {
        const createImage =
          environment.createImage ??
          (typeof Image === "function" ? () => new Image() : undefined);
        const createObjectURL =
          environment.createObjectURL ??
          (typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
            ? (blob: Blob) => URL.createObjectURL(blob)
            : undefined);
        if (createImage === undefined || createObjectURL === undefined)
          throw new DocOrientationError(
            "IMAGE_INVALID",
            "ImageBitmap and HTML image decoding are unavailable",
          );
        const image = createImage();
        objectUrl = createObjectURL(input);
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("HTML image decoding failed"));
          image.src = objectUrl!;
        });
        source = image;
        // HTMLImageElement decoding may already apply EXIF orientation.
        transformOrientation = 1;
      }
    } else source = input;
    if (source.width <= 0 || source.height <= 0)
      throw new DocOrientationError(
        "IMAGE_INVALID",
        "Image has invalid dimensions",
      );
    const output =
      transformOrientation >= 5
        ? { width: source.height, height: source.width }
        : { width: source.width, height: source.height };
    const canvas = (environment.createCanvas ?? createCanvas)(
      output.width,
      output.height,
    );
    const context = contextOf(canvas);
    exifCanvasTransform(
      context,
      transformOrientation,
      source.width,
      source.height,
    );
    context.drawImage(source, 0, 0);
    return readRaster(canvas, source.width, source.height, orientation);
  } catch (error) {
    if (error instanceof DocOrientationError) throw error;
    throw new DocOrientationError("IMAGE_INVALID", "Unable to decode image", {
      cause: error,
    });
  } finally {
    bitmap?.close();
    if (objectUrl !== undefined) {
      const revokeObjectURL =
        environment.revokeObjectURL ??
        (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function"
          ? (url: string) => URL.revokeObjectURL(url)
          : undefined);
      revokeObjectURL?.(objectUrl);
    }
  }
}
