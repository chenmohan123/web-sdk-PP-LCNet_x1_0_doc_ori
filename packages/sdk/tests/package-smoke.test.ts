import { describe, expect, it } from "vitest";

import { createDocOrientation } from "../src/index";

describe("package entry", () => {
  it("exports the detector factory", () => {
    expect(createDocOrientation).toBeTypeOf("function");
  });
});
