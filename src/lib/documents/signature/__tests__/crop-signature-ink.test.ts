import { describe, expect, it } from "vitest";
import { inkBounds } from "@/lib/documents/signature/crop-signature-ink";

describe("inkBounds", () => {
  it("tightens to the dark strokes and ignores empty canvas", () => {
    const width = 4;
    const height = 3;
    const pixels = new Uint8ClampedArray(width * height * 4);
    pixels.fill(0);
    const at = (x: number, y: number) => (y * width + x) * 4;
    const mark = (x: number, y: number) => {
      const i = at(x, y);
      pixels[i] = 20;
      pixels[i + 1] = 20;
      pixels[i + 2] = 20;
      pixels[i + 3] = 255;
    };
    mark(1, 1);
    mark(2, 1);
    expect(inkBounds(pixels, width, height)).toEqual({
      minX: 1,
      minY: 1,
      maxX: 2,
      maxY: 1,
    });
  });
});
