import { describe, expect, it } from "vitest";
import { readExifOrientation } from "../src/image/exif";

function fixture(orientation: number, little = true): Uint8Array {
  const bytes = new Uint8Array(40);
  const view = new DataView(bytes.buffer);
  bytes.set([0xff, 0xd8, 0xff, 0xe1], 0);
  view.setUint16(4, 34, false);
  bytes.set([0x45, 0x78, 0x69, 0x66, 0, 0], 6);
  view.setUint16(12, little ? 0x4949 : 0x4d4d, false);
  view.setUint16(14, 0x2a, little);
  view.setUint32(16, 8, little);
  view.setUint16(20, 1, little);
  view.setUint16(22, 0x0112, little);
  view.setUint16(24, 3, little);
  view.setUint32(26, 1, little);
  view.setUint16(30, orientation, little);
  return bytes;
}

describe("readExifOrientation", () => {
  it("reads all eight little-endian orientation values", () => {
    for (let orientation = 1; orientation <= 8; orientation += 1)
      expect(readExifOrientation(fixture(orientation))).toBe(orientation);
  });

  it("reads big-endian TIFF metadata and defaults malformed data to 1", () => {
    expect(readExifOrientation(fixture(6, false))).toBe(6);
    expect(
      readExifOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 1])),
    ).toBe(1);
    expect(readExifOrientation(new Uint8Array([1, 2, 3]))).toBe(1);
  });
});
