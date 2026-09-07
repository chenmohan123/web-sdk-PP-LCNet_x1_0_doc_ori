import type { Backend, DocOrientationRuntimeInfo, ModelManifest, CreateDocOrientationOptions } from "../types";
import type { OrtRunResult } from "../runtime/ort-session";
export type WorkerMessage =
  | {
      readonly type: "init";
      readonly requestId: number;
      readonly model: ArrayBuffer;
      readonly manifest: ModelManifest;
      readonly backend: Backend;
      readonly wasm?: NonNullable<CreateDocOrientationOptions["ort"]>["wasm"];
    }
  | {
      readonly type: "run";
      readonly requestId: number;
      readonly data: Float32Array;
      readonly dims: readonly number[];
    }
  | {
      readonly type: "abort";
      readonly requestId: number;
      readonly targetRequestId: number;
      readonly reason?: unknown;
    }
  | { readonly type: "dispose"; readonly requestId: number };
export type WorkerResponse =
  | {
      readonly type: "ready";
      readonly requestId: number;
      readonly sessionCreateMs: number;
      readonly runtime: DocOrientationRuntimeInfo;
    }
  | {
      readonly type: "result";
      readonly requestId: number;
      readonly result: OrtRunResult;
    }
  | {
      readonly type: "error";
      readonly requestId: number;
      readonly message: string;
      readonly code: string;
    };
