export const DOC_ORIENTATION_ERROR_CODES = [
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
] as const;

export type DocOrientationErrorCode = (typeof DOC_ORIENTATION_ERROR_CODES)[number];

export type DocOrientationErrorDetails = Readonly<Record<string, unknown>>;

export class DocOrientationError extends Error {
  readonly code: DocOrientationErrorCode;
  readonly details: DocOrientationErrorDetails;

  constructor(code: DocOrientationErrorCode, message: string, details: DocOrientationErrorDetails = {}) {
    super(message);
    this.name = "DocOrientationError";
    this.code = code;
    this.details = details;
  }
}
