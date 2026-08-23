# Orientation Demo Samples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four offline demo sample buttons that cover 0°, 90°, 180°, and 270° document orientations using one official PaddleOCR image plus clearly labeled derived rotations.

**Architecture:** Store the source and derived JPEGs under `apps/demo/public/samples/`, with a typed manifest that contains expected angle, source kind, source URL, and SHA-256. Render the manifest as a bilingual sample document grid below the Original and Corrected previews inside the result panel; selecting a sample creates a `File` and routes through the existing file-selection path, so previews, EXIF handling, detection, and timings remain unchanged.

**Tech Stack:** TypeScript, Vite static assets, browser `fetch`, Canvas/Blob `File` flow, Vitest/Node contract tests, Playwright.

---

### Task 1: Add verified orientation fixtures and attribution

**Files:**
- Create: `apps/demo/public/samples/orientation-180.jpg`
- Create: `apps/demo/public/samples/orientation-0.jpg`
- Create: `apps/demo/public/samples/orientation-90.jpg`
- Create: `apps/demo/public/samples/orientation-270.jpg`
- Create: `apps/demo/src/samples.ts`
- Create: `THIRD_PARTY_NOTICES.md`
- Test: `scripts/check-orientation-samples.test.mjs`

- [x] **Step 1: Download and hash the official source image**

Run:

```powershell
Invoke-WebRequest -Uri "https://paddle-model-ecology.bj.bcebos.com/paddlex/imgs/demo_image/img_rot180_demo.jpg" -OutFile apps/demo/public/samples/orientation-180.jpg
Get-FileHash apps/demo/public/samples/orientation-180.jpg -Algorithm SHA256
```

Expected: a 94,278-byte JPEG whose hash is recorded in the manifest and notice.

- [x] **Step 2: Generate derived fixtures**

Use a deterministic image rotation script with the source file as input. Save the upright 0° variant and clockwise 90°/270° variants as separate JPEGs. Do not overwrite the official source; record each output hash.

- [x] **Step 3: Write the sample manifest and notices**

`apps/demo/src/samples.ts` exports four entries with `id`, `filename`, `expectedOrientation`, `label`, `kind`, `sourceUrl`, and `sha256`; `kind` is `official` only for 180° and `derived` for the other three. `THIRD_PARTY_NOTICES.md` identifies PaddleOCR, the source documentation commit, URL, Apache-2.0 license, and the fact that three files are deterministic rotations.

- [x] **Step 4: Add the failing manifest contract test**

The test reads the four files and manifest, asserting exactly four unique files, all expected angles, non-zero bytes, and SHA-256 equality. Run:

```powershell
node --test scripts/check-orientation-samples.test.mjs
```

Expected initially: FAIL because the manifest and generated files are not complete.

- [x] **Step 5: Run the contract test after fixture implementation**

Expected: PASS with four sample entries and matching hashes.

### Task 2: Add bilingual sample picker to the Demo

**Files:**
- Modify: `apps/demo/src/i18n/types.ts`
- Modify: `apps/demo/src/i18n/zh-CN.ts`
- Modify: `apps/demo/src/i18n/en.ts`
- Modify: `apps/demo/src/render.ts`
- Modify: `apps/demo/src/main.ts`
- Modify: `apps/demo/src/styles.css`

- [x] **Step 1: Extend `DemoCopy` with sample labels**

Add copy fields for the sample section, official/derived labels, and expected-angle text in both languages.

- [x] **Step 2: Render sample buttons from the manifest**

Add a `section` below the preview grid with `aria-label="Sample documents"`, four buttons, thumbnail `<img>` elements, a localized name, source-kind label, and expected angle. Buttons use `data-sample-id` and remain keyboard accessible.

- [x] **Step 3: Route sample selection through the existing file path**

Add `loadSelectedFile(file: File): void` in `main.ts`; both the native input `change` event and sample-button click call it. Sample clicks fetch the same-origin asset, create a typed `File`, update the selected-file text and Original preview, revoke previous object URLs, clear stale results, and enable the existing detection button. Fetch failures are shown through the existing localized error status.

- [x] **Step 4: Style the sample document grid responsively**

Use a compact four-column grid on desktop and horizontal overflow-free wrapping/stacking on mobile. Keep thumbnail dimensions stable and avoid nested cards or broken-image states.

### Task 3: Add regression coverage and release documentation

**Files:**
- Modify: `apps/demo/tests/demo.spec.ts`
- Modify: `scripts/check-doc-parity.test.mjs`
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `CHANGELOG.md`

- [x] **Step 1: Add Demo tests**

Cover four visible sample buttons, selecting one enabling detection and updating the original preview, language switching, no broken image sources, and no horizontal overflow at desktop and Pixel 5 widths.

- [x] **Step 2: Add documentation links and attribution**

Document that the sample document grid is for orientation testing, identify the official 180° source and derived variants, and link the third-party notice in both Chinese-first and English documentation.

- [x] **Step 3: Run focused tests**

```powershell
node --test scripts/check-orientation-samples.test.mjs
pnpm --filter @pplcnet/demo test
```

Expected: all focused tests pass.

### Task 4: Verify and commit

- [x] **Step 1: Run the full repository verification**

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
node scripts/verify-model.mjs
node --test scripts/check-doc-parity.test.mjs scripts/check-orientation-samples.test.mjs scripts/verify-release.mjs
node scripts/verify-package-assets.mjs
```

- [x] **Step 2: Inspect the final diff and status**

Run `git diff --check` and `git status --short --branch`; only sample assets, Demo/docs/tests, and the new notices/manifest should be changed.

- [x] **Step 3: Commit**

```powershell
git add apps/demo/public/samples apps/demo/src apps/demo/tests scripts README.md README.en.md CHANGELOG.md THIRD_PARTY_NOTICES.md docs/superpowers
git commit -m "feat(demo): add orientation sample images"
```
