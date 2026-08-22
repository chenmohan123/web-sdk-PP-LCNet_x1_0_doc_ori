# PP-LCNet Document Orientation SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an Apache-2.0 browser SDK and demo for PaddlePaddle `PP-LCNet_x1_0_doc_ori` with strict WASM/WebGPU selection, EXIF-normalized image input, single/batch orientation inference, an independent rotate utility, and a GitHub Pages-hosted default model.

**Architecture:** Create an independent pnpm workspace modeled on `web-sdk-PP-DocLayoutV3`. The SDK package separates manifest/model loading, image decoding and EXIF normalization, preprocessing, ORT sessions, Worker transport, and detector orchestration. The demo consumes the built package and the static model directory is deployed separately from the npm JavaScript bundle.

**Tech Stack:** TypeScript, pnpm, ONNX Runtime Web, tsup, Vitest, Playwright, Vite, React, GitHub Actions, GitHub Pages, npm.

---

### Task 1: Scaffold the independent workspace

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- Create: `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, `.nvmrc`
- Create: `packages/sdk/package.json`, `packages/sdk/tsconfig.json`, `packages/sdk/tsup.config.ts`
- Create: `packages/sdk/src/index.ts`, `packages/sdk/tests/package-smoke.test.ts`
- Create: `apps/demo/package.json`, `apps/demo/index.html`, `apps/demo/vite.config.ts`, `apps/demo/tsconfig.json`
- Create: `models/v1.0.0/.gitkeep`, `scripts/.gitkeep`

- [ ] **Step 1: Write the failing package smoke test**

```ts
import { describe, expect, it } from "vitest";
import { createDocOrientation } from "../src/index";

describe("package entry", () => {
  it("exports the detector factory", () => {
    expect(createDocOrientation).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test`

Expected: FAIL because the package entry and workspace metadata do not exist.

- [ ] **Step 3: Add the workspace and minimal package entry**

Set the root package name to `web-sdk-pp-lcnet-x1-0-doc-ori-workspace`, package manager to `pnpm@11.16.0`, Node requirement to `>=22`, and workspace globs to `packages/*` and `apps/*`. Set the SDK package name to `web-sdk-pp-lcnet-x1-0-doc-ori`, version `0.1.0`, module output `dist/index.js`, types `dist/index.d.ts`, and scripts `build`, `test`, `typecheck`, and `lint`. Export a temporary `createDocOrientation` function that throws `new Error("not implemented")` until Task 9 replaces it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm install --lockfile-only && pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test`

Expected: PASS with one package-entry test.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json vitest.config.ts playwright.config.ts eslint.config.mjs .prettierrc.json .gitignore .nvmrc packages apps models scripts
git commit -m "build: scaffold PP-LCNet orientation workspace"
```

### Task 2: Import and verify the official ONNX model

**Files:**

- Create: `models/v1.0.0/inference.onnx`
- Create: `models/v1.0.0/manifest.json`, `models/v1.0.0/README.md`
- Create: `scripts/generate-manifest.mjs`, `scripts/verify-model.mjs`, `scripts/model-contract.test.mjs`
- Create: `models/v1.0.0/model-source.json`

- [ ] **Step 1: Write the failing model contract test**

Assert that `manifest.json` declares `PP-LCNet_x1_0_doc_ori`, labels `['0','90','180','270']`, input spatial dimensions `224`, `maxBatchSize` `8`, a 32-byte SHA-256, and an ONNX byte size matching `inference.onnx`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/model-contract.test.mjs`

Expected: FAIL because the model asset and manifest are absent.

- [ ] **Step 3: Download and inspect the official asset**

Download `https://huggingface.co/PaddlePaddle/PP-LCNet_x1_0_doc_ori_onnx/resolve/main/inference.onnx` into `models/v1.0.0/inference.onnx`. Use the bundled Python environment and ONNX inspection tools to record graph input/output names, shapes, opset, initializer parameter count, byte size, and SHA-256. Record the source commit and Apache-2.0 attribution in `model-source.json` and `README.md`.

- [ ] **Step 4: Implement manifest generation and verification**

`generate-manifest.mjs` reads the ONNX graph metadata and emits the manifest with preprocessing, labels, model metadata, URL relative to GitHub Pages, byte size, and SHA-256. `verify-model.mjs` exits non-zero when the file size or digest differs from the manifest.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test scripts/model-contract.test.mjs && node scripts/verify-model.mjs`

Expected: PASS and a digest verification line for `models/v1.0.0/inference.onnx`.

- [ ] **Step 6: Commit**

```bash
git add models scripts
git commit -m "feat: add official PP-LCNet ONNX model manifest"
```

### Task 3: Define public types, errors, and manifest validation

**Files:**

- Create: `packages/sdk/src/types.ts`, `packages/sdk/src/errors.ts`, `packages/sdk/src/model/manifest.ts`
- Create: `packages/sdk/tests/manifest.test.ts`, `packages/sdk/tests/errors.test.ts`
- Modify: `packages/sdk/src/index.ts`

- [ ] **Step 1: Write failing manifest and error tests**

Cover valid official manifests, rejection of missing SHA-256, non-float32 input, wrong spatial dimensions, labels not matching output class count, invalid `maxBatchSize`, and stable `DocOrientationError` codes/details.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- manifest.test.ts errors.test.ts`

Expected: FAIL because the types, parser, and error class do not exist.

- [ ] **Step 3: Implement the minimal contract**

Define `OrientationAngle`, `Backend`, `DecodableImage`, `NormalizedRaster`, `ModelManifest`, `ModelVariant`, `DocOrientationModelInfo`, `DocOrientationRuntimeInfo`, `LoadTimings`, `OrientationResult`, `OrientationBatchResult`, and the public options from the approved design. Implement `parseModelManifest` with finite-number, shape, label, URL, integrity, and preprocessing checks. Implement `DocOrientationError` with the ten approved codes and readonly `details`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- manifest.test.ts errors.test.ts`

Expected: PASS with all invalid manifests rejected for the expected code.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src packages/sdk/tests
git commit -m "feat: define orientation SDK contracts"
```

### Task 4: Implement EXIF normalization and image rotation

**Files:**

- Create: `packages/sdk/src/image/exif.ts`, `packages/sdk/src/image/decode.ts`, `packages/sdk/src/image/rotate.ts`
- Create: `packages/sdk/tests/exif.test.ts`, `packages/sdk/tests/image-decode.test.ts`, `packages/sdk/tests/rotate.test.ts`
- Modify: `packages/sdk/src/index.ts`

- [ ] **Step 1: Write failing EXIF tests**

Generate minimal JPEG APP1 fixtures for Orientation values 1 through 8 and assert the parser returns each value, malformed APP1 returns 1, and non-JPEG input returns 1. Add a mocked canvas/ImageBitmap decode test that asserts `imageOrientation: "none"` is passed and the bitmap is closed.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- exif.test.ts image-decode.test.ts rotate.test.ts`

Expected: FAIL because EXIF parsing and image utilities do not exist.

- [ ] **Step 3: Implement deterministic pixel normalization**

Parse only JPEG SOI, APP1 Exif, TIFF endian markers, IFD0 tag `0x0112`, and valid SHORT values. Decode Blob/File with `createImageBitmap` and `{ imageOrientation: "none" }`; draw through a canvas with the exact 8 EXIF transforms, swapping output width/height for orientations 5-8. Treat malformed metadata as orientation 1. Ensure abort signals are checked before and after decode and every owned bitmap is closed.

- [ ] **Step 4: Implement `rotate()`**

Decode through the same normalized raster path, apply a clockwise 0/90/180/270 transform, and call `canvas.toBlob` with `image/png` by default. Reject unsupported angles, missing canvas APIs, and zero-size rasters with `IMAGE_INVALID`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- exif.test.ts image-decode.test.ts rotate.test.ts`

Expected: PASS, including all eight EXIF transforms and bitmap cleanup.

- [ ] **Step 6: Commit**

```bash
git add packages/sdk/src/image packages/sdk/src/index.ts packages/sdk/tests
git commit -m "feat: normalize EXIF images and add rotate utility"
```

### Task 5: Implement official preprocessing and postprocessing

**Files:**

- Create: `packages/sdk/src/preprocess.ts`, `packages/sdk/src/postprocess.ts`
- Create: `packages/sdk/tests/preprocess.test.ts`, `packages/sdk/tests/postprocess.test.ts`
- Create: `packages/sdk/tests/fixtures/preprocess-reference.json`
- Modify: `packages/sdk/src/index.ts`

- [ ] **Step 1: Write failing tensor and result tests**

Assert the official 224x224 tensor shape, channel order, scale and mean/std values at sampled pixels. Assert stable softmax for large logits, complete probability output, top-1 label mapping, and correction mapping `0 -> 0`, `90 -> 270`, `180 -> 180`, `270 -> 90`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- preprocess.test.ts postprocess.test.ts`

Expected: FAIL because preprocessing and postprocessing are not implemented.

- [ ] **Step 3: Implement the tensor pipeline**

Resize the raster with an explicit canvas resize, center crop to 224, read RGB values in row-major order, write NCHW float32 planes, multiply by `1/255`, and apply `(channel - mean) / std`. Return original and normalized dimensions. Postprocess only the manifest output tensor, validate `[N,4]`, use max-subtraction before exponentiation, and return typed orientation data.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- preprocess.test.ts postprocess.test.ts`

Expected: PASS with exact sampled tensor values and angle mappings.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/preprocess.ts packages/sdk/src/postprocess.ts packages/sdk/tests
git commit -m "feat: add PP-LCNet preprocessing and orientation postprocess"
```

### Task 6: Add strict ONNX Runtime Web sessions and capability probing

**Files:**

- Create: `packages/sdk/src/runtime/capabilities.ts`, `packages/sdk/src/runtime/ort-session.ts`
- Create: `packages/sdk/tests/runtime-capabilities.test.ts`, `packages/sdk/tests/ort-session.test.ts`
- Modify: `packages/sdk/package.json`, `packages/sdk/src/index.ts`

- [ ] **Step 1: Write failing runtime tests**

Use an injected ORT-like module to assert WASM uses `executionProviders: ['wasm']`, WebGPU uses `[{ name: 'webgpu', preferredLayout: 'NCHW' }]`, no provider fallback occurs, abort sets `terminate`, tensor outputs are copied and disposed, and unavailable WebGPU throws `CAPABILITY_UNSUPPORTED`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- runtime-capabilities.test.ts ort-session.test.ts`

Expected: FAIL because runtime modules and the ONNX Runtime dependency are absent.

- [ ] **Step 3: Implement provider-specific sessions**

Add `onnxruntime-web` as a runtime dependency. Configure WASM paths, SIMD, and a bounded thread count only for WASM. Dynamically import `onnxruntime-web` for WASM and `onnxruntime-web/webgpu` for WebGPU. Probe `navigator.gpu`, secure context, WASM SIMD, threads, Worker, and OffscreenCanvas. Map session and inference failures to stable SDK errors without trying another provider.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- runtime-capabilities.test.ts ort-session.test.ts`

Expected: PASS with strict provider assertions and clean tensor disposal.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/runtime packages/sdk/tests packages/sdk/package.json packages/sdk/src/index.ts
git commit -m "feat: add strict WASM and WebGPU ORT sessions"
```

### Task 7: Implement model download, integrity, and IndexedDB cache

**Files:**

- Create: `packages/sdk/src/model/download.ts`, `packages/sdk/src/model/integrity.ts`, `packages/sdk/src/model/model-manager.ts`
- Create: `packages/sdk/src/cache/cache-storage.ts`, `packages/sdk/src/cache/memory-cache.ts`, `packages/sdk/src/cache/indexeddb-cache.ts`
- Create: `packages/sdk/tests/model-manager.test.ts`, `packages/sdk/tests/integrity.test.ts`, `packages/sdk/tests/cache.test.ts`

- [ ] **Step 1: Write failing cache and model tests**

Cover network download progress, SHA-256 mismatch, cache hit without refetch, cache disabled behavior, abort during download, and clearing/listing entries.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- model-manager.test.ts integrity.test.ts cache.test.ts`

Expected: FAIL because model management and cache adapters do not exist.

- [ ] **Step 3: Implement model management**

Key entries by manifest model ID/version/variant/digest. Store `ArrayBuffer` and metadata in IndexedDB when available, use a memory adapter for tests and unavailable storage, stream `Response.body` for progress, verify `crypto.subtle.digest('SHA-256')`, and return load timing fields for source `network`, `cache`, or `memory`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- model-manager.test.ts integrity.test.ts cache.test.ts`

Expected: PASS with no network request on a valid cache hit and deterministic integrity failures.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/model packages/sdk/src/cache packages/sdk/tests
git commit -m "feat: add model integrity and browser cache"
```

### Task 8: Add Worker transport and batch execution

**Files:**

- Create: `packages/sdk/src/worker/protocol.ts`, `packages/sdk/src/worker/inference.worker.ts`, `packages/sdk/src/worker/worker-bridge.ts`
- Create: `packages/sdk/tests/worker-bridge.test.ts`, `packages/sdk/tests/batch.test.ts`

- [ ] **Step 1: Write failing Worker and batch tests**

Assert transferable RGBA buffers, request ordering, progress events, abort messages, disposal, main-thread fallback when Worker/OffscreenCanvas are absent, and batch splitting at `maxBatchSize` while preserving input order.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- worker-bridge.test.ts batch.test.ts`

Expected: FAIL because the worker protocol and batch executor do not exist.

- [ ] **Step 3: Implement the bridge and batch coordinator**

Define init/detect/abort/dispose messages carrying manifest, model bytes, provider, and normalized rasters. Transfer model bytes and RGBA buffers, serialize SDK errors, and return per-request timings. Add a chunk coordinator that runs `[N,3,224,224]` tensors up to manifest `maxBatchSize`, concatenates logits, and maps each row to the corresponding input.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- worker-bridge.test.ts batch.test.ts`

Expected: PASS with deterministic order and abort behavior.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/worker packages/sdk/tests
git commit -m "feat: add worker transport and batched inference"
```

### Task 9: Implement the detector factory and public lifecycle

**Files:**

- Create: `packages/sdk/src/detector.ts`
- Create: `packages/sdk/tests/detector.test.ts`, `packages/sdk/tests/package-smoke.test.ts`
- Modify: `packages/sdk/src/index.ts`

- [ ] **Step 1: Write failing detector tests**

Use injected dependencies to assert the initialization order, default model URL, default WASM backend, explicit WebGPU selection, model metadata, load timings, EXIF metadata in results, single detection, batch detection, cache methods, disposal, and rejection after disposal.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- detector.test.ts package-smoke.test.ts`

Expected: FAIL because the detector factory is not implemented.

- [ ] **Step 3: Implement `createDocOrientation` and detector methods**

Use the default manifest URL `https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/models/v1.0.0/manifest.json`. Parse string manifests with `fetch`, accept validated manifest objects, load the model through the manager, create the selected executor, and expose readonly runtime/model/timing metadata. Serialize calls through a queue, check abort signals, decode and preprocess images, call the executor, and calculate aggregate batch timings.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- detector.test.ts package-smoke.test.ts`

Expected: PASS for all lifecycle and result assertions.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/detector.ts packages/sdk/src/index.ts packages/sdk/tests
git commit -m "feat: expose document orientation detector API"
```

### Task 10: Build the SDK and add package-level integration checks

**Files:**

- Modify: `packages/sdk/tsup.config.ts`, `packages/sdk/package.json`, `packages/sdk/api-extractor.json`
- Create: `packages/sdk/tests/build-smoke.test.ts`, `packages/sdk/README.md`

- [ ] **Step 1: Write the failing build smoke test**

Assert that `dist/index.js`, `dist/browser-global.js`, `dist/inference.worker.js`, and `dist/index.d.ts` exist after build and that the browser-global bundle exposes `createDocOrientation` and `rotate`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori build && pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- build-smoke.test.ts`

Expected: FAIL because the tsup entries and build configuration are incomplete.

- [ ] **Step 3: Configure ESM, IIFE, Worker, and declarations**

Configure tsup entries for `src/index.ts`, `src/browser-global.ts`, and `src/worker/inference.worker.ts`, externalize ONNX Runtime, emit sourcemaps and declarations, and define a compile-time module URL for the Worker constructor. Add package `exports` for `.`, `./browser-global`, and `./package.json`.

- [ ] **Step 4: Run the build and smoke test**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori build && pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori test -- build-smoke.test.ts`

Expected: PASS with all four artifacts present.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk
git commit -m "build: publish ESM and browser-global SDK bundles"
```

### Task 11: Implement the responsive demo

**Files:**

- Create: `apps/demo/src/main.tsx`, `apps/demo/src/App.tsx`, `apps/demo/src/styles.css`, `apps/demo/src/types.ts`
- Create: `apps/demo/public/samples/upright.jpg`, `apps/demo/public/samples/rotated.jpg`
- Create: `apps/demo/tests/demo.spec.ts`

- [ ] **Step 1: Write the failing browser workflow test**

Assert that the page shows the WASM default, exposes a WebGPU option, accepts a selected image, displays orientation/score, shows model name/size/parameter count, shows load and inference timings, renders original and corrected previews, and has no horizontal overflow at 375px, 768px, and 1440px widths.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter demo test`

Expected: FAIL because the demo page is not implemented.

- [ ] **Step 3: Implement the demo workflow**

Use explicit backend segmented controls, an image file input, a load button, progress/status text, a result preview canvas, a corrected preview created through `rotate()`, and detail sections for model metadata and timings. Keep the SDK instance alive until backend/model changes or page unload, dispose it on replacement, and render structured errors without hiding the selected backend.

- [ ] **Step 4: Run browser tests and build**

Run: `pnpm --filter demo test && pnpm --filter demo build`

Expected: PASS and a production `apps/demo/dist` containing the demo, Worker, and ONNX Runtime assets.

- [ ] **Step 5: Commit**

```bash
git add apps/demo
git commit -m "feat: add orientation detection demo"
```

### Task 12: Write user documentation and examples

**Files:**

- Create: `README.md`, `README.en.md`, `docs/zh-CN/quick-start.md`, `docs/zh-CN/api.md`, `docs/zh-CN/models.md`, `docs/zh-CN/custom-models.md`, `docs/zh-CN/exif.md`, `docs/zh-CN/compatibility.md`, `docs/zh-CN/performance.md`, `docs/zh-CN/troubleshooting.md`
- Create: `docs/en/quick-start.md`, `docs/en/api.md`, `examples/cdn/index.html`, `examples/vite/main.ts`, `examples/wechat-web-view/index.html`
- Create: `LICENSE`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`
- Create: `scripts/check-doc-parity.test.mjs`

- [ ] **Step 1: Write the documentation contract test**

Assert that every public export appears in API docs, README examples use `backend: "wasm"` or `backend: "webgpu"`, the default manifest URL is documented, EXIF normalization and Canvas/ImageBitmap assumptions are documented, and the WeChat native limitation is stated.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/check-doc-parity.test.mjs`

Expected: FAIL because the documentation files do not exist.

- [ ] **Step 3: Write the docs and examples**

Document npm and CDN installation, model loading progress, WASM/WebGPU selection, single and batch APIs, `rotate()`, custom manifests, CORS/HTTPS, cache clearing, performance expectations, WebGPU failure behavior, EXIF normalization, H5 and `web-view` integration, and privacy. Include complete runnable snippets for ESM and browser-global usage.

- [ ] **Step 4: Run the contract test**

Run: `node --test scripts/check-doc-parity.test.mjs`

Expected: PASS with no undocumented public entry points or contradictory backend instructions.

- [ ] **Step 5: Commit**

```bash
git add README.md README.en.md docs examples LICENSE THIRD_PARTY_NOTICES.md CHANGELOG.md scripts/check-doc-parity.test.mjs
git commit -m "docs: document orientation SDK and integrations"
```

### Task 13: Add CI, GitHub Pages, and npm release workflows

**Files:**

- Create: `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `.github/workflows/release.yml`
- Create: `.github/dependabot.yml`, `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`
- Modify: `package.json`, `scripts/verify-release.mjs`

- [ ] **Step 1: Write the failing release contract test**

Assert that CI runs format check, docs check, model verification, lint, typecheck, tests, build, and browser tests; release workflow requires npm trusted publishing or `NPM_TOKEN`; Pages workflow uploads `apps/demo/dist` plus `models`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/verify-release.mjs`

Expected: FAIL because workflow files and release checks are absent.

- [ ] **Step 3: Implement workflows and release checks**

Use Node 22 and pnpm 11, cache the pnpm store, run model SHA verification before tests, deploy the demo/model directory to GitHub Pages on the default branch, and publish `packages/sdk` on tags after the full verification job passes. Keep npm credentials in GitHub Actions secrets and never commit them.

- [ ] **Step 4: Run release checks locally**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && node scripts/verify-model.mjs && node --test scripts/verify-release.mjs`

Expected: PASS with no missing workflow contracts or model integrity errors.

- [ ] **Step 5: Commit**

```bash
git add .github package.json scripts/verify-release.mjs
git commit -m "ci: add verification, Pages, and npm release workflows"
```

### Task 14: Run the full verification gate and prepare the public repository

**Files:**

- Modify only files required by verification failures.

- [ ] **Step 1: Run the complete verification command**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:browser && node scripts/verify-model.mjs && node --test scripts/check-doc-parity.test.mjs scripts/verify-release.mjs`

Expected: all commands exit 0; browser tests pass at desktop and mobile viewports; model SHA and docs contracts pass.

- [ ] **Step 2: Inspect the final Git diff and package contents**

Run: `git status --short; git diff --stat HEAD~1; pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori pack --pack-destination work/npm-packages`

Confirm the npm tarball excludes `inference.onnx`, includes ESM/IIFE/Worker/types, and includes the README and license.

- [ ] **Step 3: Commit any verification-only fixes**

```bash
git add .
git commit -m "chore: finalize PP-LCNet orientation SDK release"
```

- [ ] **Step 4: Create/push the public GitHub repository and publish**

Create the public repository `chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori`, set the remote, push the default branch, enable Pages from the Actions deployment, configure npm trusted publishing or `NPM_TOKEN`, and publish the first package version only after the full verification command succeeds.

## Self-Review

- Spec coverage: architecture, explicit providers, EXIF normalization, model manifest, single/batch inference, rotate utility, Worker fallback, demo metrics, testing, documentation, Apache-2.0 licensing, Pages model hosting, and npm release are covered by Tasks 1-14.
- Placeholder scan: no `TBD`, `TODO`, `implement later`, or `fill in details` directive is used.
- Type consistency: public names are `createDocOrientation`, `DocOrientationDetector`, `OrientationResult`, `OrientationBatchResult`, `OrientationAngle`, `Backend`, `ModelManifest`, `DecodableImage`, and `DocOrientationError`; later tasks use these same names.
- Scope check: all tasks belong to the independent SDK and its release surface; no changes to the existing PP-DocLayoutV3 repository are required.
