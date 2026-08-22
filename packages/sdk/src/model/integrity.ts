import { DocOrientationError } from "../errors";
import type { ModelVariant } from "../types";

export async function verifyModelIntegrity(data: ArrayBuffer, variant: ModelVariant): Promise<void> {
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (data.byteLength !== variant.bytes || digest !== variant.sha256.toLowerCase()) throw new DocOrientationError("MODEL_INTEGRITY_FAILED", "Model integrity verification failed", { expectedBytes: variant.bytes, actualBytes: data.byteLength, expectedSha256: variant.sha256, actualSha256: digest });
}
