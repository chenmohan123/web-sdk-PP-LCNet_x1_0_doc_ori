import { describe, expect, it } from "vitest";

import {
  createDocOrientation,
  DEFAULT_MANIFEST_URL,
  DEFAULT_WORKER_URL,
} from "../src/index";

describe("package entry", () => {
  it("exports the detector factory", () => {
    expect(createDocOrientation).toBeTypeOf("function");
    expect(DEFAULT_MANIFEST_URL).toContain("models/manifest.json");
    expect(DEFAULT_WORKER_URL).toContain("inference.worker.js");
  });
});
