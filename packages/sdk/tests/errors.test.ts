import { describe, expect, it } from "vitest";
import {
  DocOrientationError,
  type DocOrientationErrorCode,
} from "../src/errors";

describe("DocOrientationError", () => {
  it("exposes a stable code and readonly details", () => {
    const details = { stage: "manifest", field: "sha256" } as const;
    const error = new DocOrientationError(
      "MANIFEST_INVALID",
      "Manifest is invalid",
      details,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DocOrientationError");
    expect(error.code).toBe("MANIFEST_INVALID");
    expect(error.details).toEqual(details);
    expect(error.message).toBe("Manifest is invalid");
  });

  it("contains all approved error codes", () => {
    const codes: readonly DocOrientationErrorCode[] = [
      "CAPABILITY_UNSUPPORTED",
      "MANIFEST_INVALID",
      "MODEL_DOWNLOAD_FAILED",
      "MODEL_INTEGRITY_FAILED",
      "MODEL_INCOMPATIBLE",
      "IMAGE_INVALID",
      "SESSION_CREATE_FAILED",
      "INFERENCE_FAILED",
      "OUT_OF_MEMORY",
      "ABORTED",
    ];
    expect(codes).toHaveLength(10);
  });
});
