import { describe, expect, it, vi } from "vitest";
import { rotate } from "../src/image/rotate";

class FakeCanvas {
  static instances: FakeCanvas[] = [];
  width: number;
  height: number;
  private readonly context = {
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    drawImage: vi.fn(),
    getImageData: (x: number, y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
  };

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    FakeCanvas.instances.push(this);
  }

  getContext() {
    return this.context;
  }

  convertToBlob() {
    return Promise.resolve(new Blob(["png"], { type: "image/png" }));
  }
}

describe("rotate", () => {
  it("swaps output dimensions for quarter turns", async () => {
    vi.stubGlobal("OffscreenCanvas", FakeCanvas);
    FakeCanvas.instances = [];
    try {
      const input = { width: 2, height: 3 } as ImageBitmap;
      await rotate(input, 90);
      expect(FakeCanvas.instances[1]).toMatchObject({ width: 3, height: 2 });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
