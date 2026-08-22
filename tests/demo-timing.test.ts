import { describe, expect, it } from "vitest";
import { formatLoadTimings } from "../apps/demo/src/timing";

describe("formatLoadTimings", () => {
  it("keeps model loading separate from inference timing", () => {
    expect(
      formatLoadTimings({
        manifestMs: 1.234,
        downloadMs: 12.345,
        sessionMs: 3.456,
        totalMs: 17.035,
        source: "cache",
      }),
    ).toEqual({
      Manifest: "1.2 ms",
      Model: "12.3 ms",
      Session: "3.5 ms",
      "Load total": "17.0 ms",
      Source: "cache",
    });
  });
});
