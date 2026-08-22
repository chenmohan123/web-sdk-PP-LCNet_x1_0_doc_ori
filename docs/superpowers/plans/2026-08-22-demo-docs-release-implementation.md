# PP-LCNet Demo, Documentation, and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the published PP-LCNet orientation SDK's Demo, bilingual documentation, React example, and GitHub release metadata to the approved public-ready design.

**Architecture:** Keep the main Demo as Vite + native TypeScript. Extract a typed in-memory translation table and render helpers from the current single HTML template, then reuse the existing SDK lifecycle for explicit WASM/WebGPU inference. Add React only as an independent consumer example, and keep release metadata/doc parity checks in repository scripts.

**Tech Stack:** TypeScript, Vite, Playwright, React 19, pnpm, GitHub CLI, npm Trusted Publishing.

---

### Task 1: Add typed Demo localization and version metadata

**Files:**
- Create: `apps/demo/src/i18n/types.ts`
- Create: `apps/demo/src/i18n/zh-CN.ts`
- Create: `apps/demo/src/i18n/en.ts`
- Create: `apps/demo/src/i18n/index.ts`
- Create: `apps/demo/src/vite-env.d.ts`
- Modify: `apps/demo/vite.config.ts`
- Modify: `apps/demo/src/main.ts`
- Test: `apps/demo/tests/demo.spec.ts`

- [ ] **Step 1: Write the failing localization assertions**

Add a Playwright test that loads `/`, asserts visible Chinese labels `选择图片`, `模型`, and `耗时`, asserts `window.location.reload()` restores Chinese after clicking `English`, and asserts the visible version text matches `SDK v0.1.1`.

```ts
test("starts in Chinese and resets to Chinese after reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "选择图片" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Choose image" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "选择图片" })).toBeVisible();
  await expect(page.getByText("SDK v0.1.1")).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @pplcnet/demo test -- demo.spec.ts`

Expected: FAIL because the current Demo has English-only inline text, no language button, and no SDK version element.

- [ ] **Step 3: Implement the translation contract and Vite version injection**

Define a `Language = "zh-CN" | "en"` union and a `DemoCopy` interface containing all visible labels, status messages, button text, preview labels, result/model/timing labels, and error prefixes. Export `zhCN` and `en` objects with identical keys. Export `createCopy(language)` from `i18n/index.ts`, with `zh-CN` as the initial value and no storage side effects.

Read `packages/sdk/package.json` in `apps/demo/vite.config.ts` using `readFileSync(new URL("../../packages/sdk/package.json", import.meta.url), "utf8")`, define `__SDK_VERSION__`, and declare it in `vite-env.d.ts`. Replace hard-coded visible strings in `main.ts` with `copy` lookups and add a topbar language toggle whose click handler rerenders copy without reloading detector/file state.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm --filter @pplcnet/demo test -- demo.spec.ts`

Expected: PASS for Chinese default, in-memory English switch, reload reset, and `SDK v0.1.1` display.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/src apps/demo/vite.config.ts apps/demo/tests/demo.spec.ts
git commit -m "feat(demo): add bilingual copy and sdk version"
```

### Task 2: Refactor Demo markup for the approved A layout

**Files:**
- Create: `apps/demo/src/render.ts`
- Modify: `apps/demo/src/main.ts`
- Modify: `apps/demo/index.html`
- Test: `apps/demo/tests/demo.spec.ts`

- [ ] **Step 1: Write failing structure and empty-state tests**

Add assertions for a topbar GitHub link, `data-testid="sdk-version"`, a single visible `选择图片` button, a hidden `#file` input, a two-column desktop workspace, and no `img[src=""]` before a file is selected.

```ts
test("uses a clean empty preview and one image action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori",
  );
  await expect(page.locator("#file")).toBeHidden();
  await expect(page.getByRole("button", { name: "选择图片" })).toBeVisible();
  await expect(page.locator('img[src=""]')).toHaveCount(0);
  await expect(page.getByTestId("original-empty")).toBeVisible();
  await expect(page.getByTestId("corrected-empty")).toBeVisible();
});
```

- [ ] **Step 2: Run the structure test and verify it fails**

Run: `pnpm --filter @pplcnet/demo test -- demo.spec.ts`

Expected: FAIL because the current markup exposes the native input and always renders two empty `<img>` elements.

- [ ] **Step 3: Implement render helpers and event-safe DOM**

Move static markup generation into `render.ts` with semantic regions: `.topbar`, `.control-band`, `.status-line`, `.workspace-grid`, `.result-panel`, and `.details-panel`. Use a `<label class="file-button">` with visible button text and an absolutely positioned `#file` input with `opacity: 0`, `width/height: 1px`, and accessible label text. Render empty preview `<div data-testid="original-empty">` and `<div data-testid="corrected-empty">`; create `<img>` only when an object URL exists. Keep IDs `backend`, `file`, `run`, `status`, `result`, `model`, and `timing` for existing tests and integrations.

Add the GitHub anchor, language buttons, SDK version, model info, result info, and timing info to the top-level render. Re-render labels and empty-state text on language switch while preserving selected file, backend, detector, result, and object URLs.

- [ ] **Step 4: Run structure tests and build**

Run: `pnpm --filter @pplcnet/demo test -- demo.spec.ts && pnpm --filter @pplcnet/demo build`

Expected: PASS and a production build with the new topbar/workspace markup.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/src apps/demo/index.html apps/demo/tests/demo.spec.ts
git commit -m "feat(demo): adopt doclayout-style workspace layout"
```

### Task 3: Implement preview lifecycle, explicit backend controls, and responsive styles

**Files:**
- Modify: `apps/demo/src/main.ts`
- Modify: `apps/demo/src/styles.css`
- Modify: `apps/demo/tests/demo.spec.ts`

- [ ] **Step 1: Write failing lifecycle and responsive tests**

Extend Playwright coverage to set a PNG file, assert the original preview becomes an image and corrected remains an empty state before detection, click detection, assert corrected preview appears, assert `#model` contains name/size/parameters, assert `#timing` contains `Manifest`, `Load total`, and `Inference`, and check `document.documentElement.scrollWidth <= window.innerWidth` at desktop and Pixel 5 viewports.

- [ ] **Step 2: Run the tests and verify the new assertions fail**

Run: `pnpm --filter @pplcnet/demo test -- demo.spec.ts`

Expected: FAIL for the corrected empty-state transition, hidden input workflow, and responsive layout until lifecycle code and styles are updated.

- [ ] **Step 3: Implement lifecycle cleanup and A-variant CSS**

On file change, revoke the previous original/corrected URLs, clear result/model/timing markup, create only the original URL, show file name and dimensions, and reset status. On backend change, dispose the detector and clear timing/result state without choosing another backend. In `runDetection`, guard against duplicate clicks, dispose before creating a detector, pass only the selected `Backend`, render progress text through the active translation, and revoke the corrected URL on errors. In a `beforeunload` listener, dispose the detector and both object URLs.

Style the page using the approved A layout: small title (`clamp(18px, 3vw, 30px)`), version text beside it, GitHub/language controls on the right, a bordered control band, a left preview panel and right details panel, neutral empty-state blocks, and no broken-image placeholder. Use `grid-template-columns: minmax(0, 1fr) 360px` above 900px, stack below 900px, and make controls full-width below 560px. Keep only WASM and WebGPU options and use stable `min-height` values for buttons, selects, previews, and metric rows.

- [ ] **Step 4: Run browser tests and inspect both viewports**

Run: `pnpm --filter @pplcnet/demo test`

Expected: PASS on desktop and Pixel 5; no horizontal overflow, overlap, or empty `<img>` elements.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/src apps/demo/tests/demo.spec.ts
git commit -m "fix(demo): clean preview states and responsive controls"
```

### Task 4: Complete bilingual README and package README

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `packages/sdk/README.md`
- Modify: `CHANGELOG.md`
- Modify: `scripts/check-doc-parity.test.mjs`

- [ ] **Step 1: Write the documentation contract assertions**

Extend `check-doc-parity.test.mjs` to require the online Demo URL, GitHub URL, `README.en.md` link, Chinese README headings, English README headings, npm install command, both backend snippets, EXIF Orientation 1-8 behavior, custom `{ manifest, data }`, Worker usage, React example path, and the native WeChat limitation.

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node --test scripts/check-doc-parity.test.mjs`

Expected: FAIL because the current READMEs are English-minimal and do not link the React example or bilingual entry points.

- [ ] **Step 3: Rewrite README content with Chinese first**

Make `README.md` start with Chinese title, badges/links, install snippet, online Demo link, GitHub link, feature summary, backend selection, model/EXIF behavior, API quick start, custom model, Worker, React/CDN/Vite/WeChat example links, compatibility/privacy notes, and a `## English` language switch linking to `README.en.md`. Make `README.en.md` the complete English equivalent with a Chinese link at the top. Put the same Chinese-first summary and `## English` section in `packages/sdk/README.md`, because npm renders that file directly.

Update `CHANGELOG.md` with `0.1.1` notes covering the bundled official model, strict WASM/WebGPU selection, EXIF normalization, timing metadata, bilingual Demo, clean previews, React example, and documentation/release metadata.

- [ ] **Step 4: Run docs contract and formatting checks**

Run: `node --test scripts/check-doc-parity.test.mjs && pnpm exec prettier --check README.md README.en.md packages/sdk/README.md CHANGELOG.md scripts/check-doc-parity.test.mjs`

Expected: PASS with Chinese content first and no contradictory backend or WeChat claims.

- [ ] **Step 5: Commit**

```bash
git add README.md README.en.md packages/sdk/README.md CHANGELOG.md scripts/check-doc-parity.test.mjs
git commit -m "docs: add bilingual npm and repository guides"
```

### Task 5: Mirror missing English docs and cross-link the documentation tree

**Files:**
- Create: `docs/en/compatibility.md`
- Create: `docs/en/models.md`
- Create: `docs/en/performance.md`
- Create: `docs/en/troubleshooting.md`
- Modify: `docs/en/quick-start.md`, `docs/en/api.md`, `docs/en/custom-models.md`, `docs/en/exif.md`
- Modify: all files under `docs/zh-CN/`

- [ ] **Step 1: Add parity checks for language pairs**

Require each Chinese doc to link its English counterpart and each English doc to link the Chinese counterpart. Require both trees to mention HTTPS/CORS, explicit WASM/WebGPU selection, EXIF assumptions, Worker limitations, and the online Demo.

- [ ] **Step 2: Run the parity check and verify it fails**

Run: `node --test scripts/check-doc-parity.test.mjs`

Expected: FAIL because the English tree lacks the Chinese tree's compatibility, model, performance, and troubleshooting pages.

- [ ] **Step 3: Write the English counterparts and links**

Translate the existing `docs/zh-CN` contracts without changing API names or behavior. Add a language switch at the top and bottom of every page. Document that Blob/File JPEG inputs are normalized from EXIF Orientation 1-8 exactly once; Canvas/ImageBitmap inputs are already decoded/oriented; `backend` accepts only `wasm` or `webgpu`; WebGPU failures are surfaced rather than silently falling back; and native WeChat mini-program pages are unsupported while H5/web-view pages are supported.

- [ ] **Step 4: Run parity and link checks**

Run: `node --test scripts/check-doc-parity.test.mjs && pnpm exec prettier --check docs/en docs/zh-CN`

Expected: PASS with matching language links and equivalent public contracts.

- [ ] **Step 5: Commit**

```bash
git add docs/en docs/zh-CN scripts/check-doc-parity.test.mjs
git commit -m "docs: mirror Chinese and English API guides"
```

### Task 6: Add a complete React example

**Files:**
- Create: `examples/react/package.json`
- Create: `examples/react/index.html`
- Create: `examples/react/tsconfig.json`
- Create: `examples/react/vite.config.ts`
- Create: `examples/react/src/main.tsx`
- Create: `examples/react/src/App.tsx`
- Create: `examples/react/src/styles.css`
- Create: `examples/react/README.md`
- Modify: `pnpm-workspace.yaml` only if the example is added to the workspace

- [ ] **Step 1: Write the example build contract**

Add a repository test that asserts these files exist, `package.json` has `dev` and `build` scripts, the dependency is `web-sdk-pp-lcnet-x1-0-doc-ori`, and `App.tsx` contains both `wasm` and `webgpu` options, `rotate`, `detect`, `loadTimings`, and `dispose`.

- [ ] **Step 2: Run the example contract and verify it fails**

Run: `node --test examples/tests/react-example.test.mjs`

Expected: FAIL because `examples/react` does not exist.

- [ ] **Step 3: Implement the React workflow**

Use React 19 + Vite + TypeScript. `App.tsx` keeps detector, selected file, backend, original/corrected object URLs, result, status, and error in state/refs. Render a hidden file input behind a `选择图片` button, a `WASM / CPU` and `WebGPU / GPU` select, a detection button, clean empty states, original/corrected previews, model metadata, and load/inference timings. Dispose the detector and revoke URLs in `useEffect` cleanup. Use the SDK `rotate(file, result.correctionAngle)` rather than browser EXIF behavior.

- [ ] **Step 4: Build the example**

Run: `pnpm --dir examples/react install && pnpm --dir examples/react run build`

Expected: TypeScript and Vite build succeed and emit `examples/react/dist/index.html` with bundled app assets.

- [ ] **Step 5: Commit**

```bash
git add examples/react examples/tests/react-example.test.mjs
git commit -m "feat(examples): add React orientation demo"
```

### Task 7: Align integration examples and release metadata

**Files:**
- Create: `examples/cdn/README.md`
- Create: `examples/vite/README.md`
- Create: `examples/wechat-web-view/README.md`
- Modify: `examples/cdn/index.html`
- Modify: `examples/vite/main.ts`
- Modify: `examples/wechat-web-view/index.html`
- Modify: `scripts/verify-release.mjs`

- [ ] **Step 1: Add example metadata assertions**

Require each example README to contain install/run instructions, online Demo link, backend selection semantics, and the WeChat README to explicitly say H5/web-view supported and native mini-program inference unsupported. Require `verify-release.mjs` to check package version `0.1.1`, Apache-2.0, public access, homepage URL, and `CHANGELOG.md` entry.

- [ ] **Step 2: Run the checks and verify they fail**

Run: `node --test scripts/verify-release.mjs`

Expected: FAIL until the example READMEs and changelog/version assertions are present.

- [ ] **Step 3: Update examples without expanding backend scope**

Give CDN and web-view examples a styled single “Choose image” button with a hidden file input, keep explicit `{ backend: "wasm" }`, and show a clear error when initialization fails. Update the Vite example to export a reusable `detectSelectedFile(file, backend = "wasm")` helper with detector disposal in `finally`. Document that WebGPU is opt-in and requires HTTPS plus browser support.

- [ ] **Step 4: Run example and release checks**

Run: `node --test scripts/verify-release.mjs && pnpm exec prettier --check examples scripts/verify-release.mjs`

Expected: PASS with all example links and release metadata validated.

- [ ] **Step 5: Commit**

```bash
git add examples scripts/verify-release.mjs
git commit -m "docs: complete integration examples and release checks"
```

### Task 8: Run the complete verification gate and inspect visual output

**Files:**
- Modify only files required by failed checks.

- [ ] **Step 1: Run static and unit checks**

Run: `pnpm typecheck && pnpm lint && pnpm test && node --test scripts/check-doc-parity.test.mjs scripts/verify-release.mjs`

Expected: all commands exit 0.

- [ ] **Step 2: Run Demo and example builds/tests**

Run: `pnpm --filter @pplcnet/demo test && pnpm build && pnpm --dir examples/react run build`

Expected: desktop/mobile Playwright tests pass, workspace builds pass, and React emits a production build.

- [ ] **Step 3: Run package verification**

Run: `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori build && node scripts/verify-package-assets.mjs && pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori pack --pack-destination work/npm-packages`

Expected: model manifest/integrity checks pass, tarball contains `dist`, README, license metadata, browser-global bundle, worker, and declarations.

- [ ] **Step 4: Inspect Demo at desktop and mobile sizes**

Start `pnpm --filter @pplcnet/demo dev --host 127.0.0.1`, open the local URL in the browser, and inspect the approved A layout at approximately 1440px and 390px widths. Verify the title is small, version/GitHub/language controls do not overlap, previews have clean empty states, and the right details panel stacks below the preview on mobile.

- [ ] **Step 5: Commit verification-only fixes**

```bash
git add .
git commit -m "chore: finalize demo docs and example verification"
```

### Task 9: Configure GitHub About and create the existing-tag Release

**Files:**
- No repository file changes unless GitHub metadata verification requires documentation updates.

- [ ] **Step 1: Check remote state before external writes**

Run: `gh repo view chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori --json isPrivate,homepageUrl,description,repositoryTopics` and `gh release view v0.1.1 --repo chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori`.

Expected: repository is public; homepage/release may be missing and must be preserved if already correct.

- [ ] **Step 2: Update GitHub About metadata**

Run:

```bash
gh repo edit chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori \
  --homepage "https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/" \
  --description "Browser SDK for PaddlePaddle PP-LCNet document orientation with ONNX Runtime Web, EXIF normalization, WASM and WebGPU support." \
  --add-topic onnx --add-topic onnxruntime-web --add-topic paddlepaddle --add-topic document-orientation --add-topic webgpu
```

Expected: About shows the Pages homepage, concise description, and relevant topics.

- [ ] **Step 3: Create a Release from the existing tag when missing**

If `gh release view` reports no release, run:

```bash
gh release create v0.1.1 --repo chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori --title "v0.1.1" --notes-file CHANGELOG.md
```

Do not create or move the tag. If a release already exists, compare its notes with `CHANGELOG.md` and update only if required.

- [ ] **Step 4: Verify the public metadata**

Run: `gh repo view chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori --web` and `gh release view v0.1.1 --repo chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori`

Expected: About contains the requested Demo URL and the Release page shows version and changelog.

### Task 10: Push the implementation branch to main and verify hosted surfaces

**Files:**
- No additional files expected.

- [ ] **Step 1: Inspect branch and worktree**

Run: `git status --short --branch; git log --oneline -6`

Expected: only intentional commits are present and the branch contains all verification fixes.

- [ ] **Step 2: Push the approved branch to main**

Run: `git push origin codex/pp-lcnet-orientation:main`

Expected: GitHub Actions starts CI, Pages, and any configured deployment jobs.

- [ ] **Step 3: Verify hosted Demo and npm README**

Open [GitHub Pages](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/) and [npm](https://www.npmjs.com/package/web-sdk-pp-lcnet-x1-0-doc-ori). Confirm the Demo loads in Chinese, shows GitHub/version/language controls, and the npm page starts with Chinese content plus online Demo and English links.

- [ ] **Step 4: Report remaining external blockers**

If GitHub Actions, Pages, or npm Trusted Publishing fails, capture the exact job URL and failing step. Do not publish with a local token or bypass the workflow; fix the repository/workflow contract and rerun the relevant verification.

## Self-Review

- Spec coverage: Demo language/version/GitHub controls, clean previews, explicit backends, EXIF behavior, React example, bilingual README/docs, examples, changelog, GitHub About, existing-tag Release, and verification are covered by Tasks 1-10.
- Placeholder scan: no `TBD`, `TODO`, `implement later`, or vague “add validation” steps remain.
- Type consistency: the plan keeps existing IDs `backend`, `file`, `run`, `status`, `result`, `model`, and `timing`; SDK version is injected as `__SDK_VERSION__`; language values are `zh-CN` and `en`; backend values remain `wasm` and `webgpu`.
- Scope check: no SDK inference architecture or backend expansion is proposed; React is isolated to `examples/react` and the main Demo remains native TypeScript.
