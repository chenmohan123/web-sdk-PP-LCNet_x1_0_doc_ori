import type { Backend, ModelManifest, NormalizedRaster } from "../types";
import type { OrtRunResult } from "../runtime/ort-session";
export type WorkerMessage =
  | {
      readonly type: "init";
      readonly requestId: number;
      readonly model: ArrayBuffer;
      readonly manifest: ModelManifest;
      readonly backend: Backend;
    }
  | {
      readonly type: "detect";
      readonly requestId: number;
      readonly raster: NormalizedRaster;
    }
  | { readonly type: "dispose"; readonly requestId: number };
export type WorkerResponse =
  | {
      readonly type: "ready";
      readonly requestId: number;
      readonly sessionCreateMs: number;
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
