import { DocOrientationError } from "../errors";
import type { DecodableImage, OrientationAngle } from "../types";
import { decodeImage } from "./decode";

export async function rotate(
  image: DecodableImage,
  angle: OrientationAngle,
  options: { type?: string; quality?: number } = {},
): Promise<Blob> {
  const raster = await decodeImage(image);
  const swapped = angle === 90 || angle === 270;
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(
          swapped ? raster.height : raster.width,
          swapped ? raster.width : raster.height,
        )
      : (() => {
          if (typeof document === "undefined")
            throw new DocOrientationError(
              "IMAGE_INVALID",
              "No canvas implementation is available",
            );
          const value = document.createElement("canvas");
          value.width = swapped ? raster.height : raster.width;
          value.height = swapped ? raster.width : raster.height;
          return value;
        })();
  const context = canvas.getContext("2d");
  if (context === null)
    throw new DocOrientationError(
      "IMAGE_INVALID",
      "Unable to create a 2D canvas context",
    );
  const source =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(raster.width, raster.height)
      : document.createElement("canvas");
  source.width = raster.width;
  source.height = raster.height;
  const sourceContext = source.getContext("2d");
  if (sourceContext === null)
    throw new DocOrientationError(
      "IMAGE_INVALID",
      "Unable to create a 2D canvas context",
    );
  const pixels = sourceContext.createImageData(raster.width, raster.height);
  pixels.data.set(raster.data);
  sourceContext.putImageData(pixels, 0, 0);
  if (angle === 90) {
    context.translate(canvas.width, 0);
    context.rotate(Math.PI / 2);
  } else if (angle === 180) {
    context.translate(canvas.width, canvas.height);
    context.rotate(Math.PI);
  } else if (angle === 270) {
    context.translate(0, canvas.height);
    context.rotate(-Math.PI / 2);
  }
  context.drawImage(source, 0, 0);
  const encodeOptions =
    options.quality === undefined
      ? { type: options.type ?? "image/png" }
      : { type: options.type ?? "image/png", quality: options.quality };
  if ("convertToBlob" in canvas) return canvas.convertToBlob(encodeOptions);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new DocOrientationError(
                "IMAGE_INVALID",
                "Unable to encode rotated image",
              ),
            ),
      options.type ?? "image/png",
      options.quality,
    ),
  );
}
