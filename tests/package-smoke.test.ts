import { describe, expect, it } from "vitest";
import { createDocOrientation } from "../packages/sdk/src/index";

describe("PP-LCNet orientation SDK package", () => {
  it("exports the temporary orientation factory", () => {
    expect(() => createDocOrientation()).toThrowError("not implemented");
  });
});
