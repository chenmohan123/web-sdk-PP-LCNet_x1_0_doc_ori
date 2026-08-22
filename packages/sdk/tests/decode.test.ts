import { describe, expect, it } from "vitest";
import { decodeImage, type DecodeEnvironment } from "../src/image/decode";

describe("decodeImage", () => {
  it("falls back to an HTML image when createImageBitmap is unavailable", async () => {
    let revoked: string | undefined;
    let assigned: string | undefined;
    const image = {
      width: 2,
      height: 3,
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
    } as unknown as HTMLImageElement;
    Object.defineProperty(image, "src", {
      set(value: string) {
        assigned = value;
        queueMicrotask(() =>
          (image.onload as unknown as (() => void) | null)?.(),
        );
      },
    });
    const createCanvas: NonNullable<DecodeEnvironment["createCanvas"]> = ((
      width: number,
      height: number,
    ) => ({
      width,
      height,
      getContext: () => ({
        drawImage: () => undefined,
        getImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
      }),
    })) as unknown as NonNullable<DecodeEnvironment["createCanvas"]>;

    const raster = await decodeImage(new Blob([new Uint8Array([1, 2, 3])]), {
      createImage: () => image,
      createObjectURL: () => "blob:test",
      revokeObjectURL: (url) => {
        revoked = url;
      },
      createCanvas,
    });

    expect(assigned).toBe("blob:test");
    expect(revoked).toBe("blob:test");
    expect(raster.width).toBe(2);
    expect(raster.height).toBe(3);
  });
});
