export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function readExifOrientation(
  data: ArrayBuffer | Uint8Array,
): ExifOrientation {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return 1;
    const marker = view.getUint8(offset + 1);
    offset += 2;
    if (marker === 0xda || marker === 0xd9) break;
    const length = view.getUint16(offset, false);
    if (length < 2 || offset + length > view.byteLength) return 1;
    if (marker === 0xe1 && length >= 10) {
      const start = offset + 2;
      if (
        view.getUint32(start, false) !== 0x45786966 ||
        view.getUint16(start + 4, false) !== 0
      )
        return 1;
      const tiff = start + 6;
      const endian = view.getUint16(tiff, false);
      const little = endian === 0x4949;
      if (!little && endian !== 0x4d4d) return 1;
      if (view.getUint16(tiff + 2, little) !== 0x2a) return 1;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      if (ifd < tiff || ifd + 2 > view.byteLength) return 1;
      const count = view.getUint16(ifd, little);
      for (let index = 0; index < count; index += 1) {
        const entry = ifd + 2 + index * 12;
        if (entry + 12 > view.byteLength) return 1;
        if (view.getUint16(entry, little) !== 0x0112) continue;
        if (
          view.getUint16(entry + 2, little) !== 3 ||
          view.getUint32(entry + 4, little) < 1
        )
          return 1;
        const value = view.getUint16(entry + 8, little);
        return value >= 1 && value <= 8 ? (value as ExifOrientation) : 1;
      }
      return 1;
    }
    offset += length;
  }
  return 1;
}

export function exifCanvasTransform(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  orientation: ExifOrientation,
  width: number,
  height: number,
): { width: number; height: number } {
  switch (orientation) {
    case 2:
      context.translate(width, 0);
      context.scale(-1, 1);
      break;
    case 3:
      context.translate(width, height);
      context.rotate(Math.PI);
      break;
    case 4:
      context.translate(0, height);
      context.scale(1, -1);
      break;
    case 5:
      context.rotate(Math.PI / 2);
      context.scale(1, -1);
      break;
    case 6:
      context.translate(height, 0);
      context.rotate(Math.PI / 2);
      break;
    case 7:
      context.translate(height, 0);
      context.rotate(Math.PI / 2);
      context.scale(-1, 1);
      break;
    case 8:
      context.translate(0, width);
      context.rotate(-Math.PI / 2);
      break;
    default:
      break;
  }
  return orientation >= 5
    ? { width: height, height: width }
    : { width, height };
}
