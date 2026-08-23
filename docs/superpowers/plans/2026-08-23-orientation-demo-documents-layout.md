# Orientation Demo Document Samples Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the four orientation fixtures below the Original/Corrected previews and rename the section to sample documents in both languages.

**Architecture:** Keep the existing manifest and sample click flow. Change only the render location, localized copy, preview-column styling, and browser regression assertions so the sample grid is owned by the result panel rather than the page-level control band.

**Tech Stack:** TypeScript, Vite, CSS Grid, Playwright.

---

### Task 1: Lock the requested layout with a failing browser test

**Files:**
- Modify: `apps/demo/tests/demo.spec.ts`

- [x] **Step 1: Add assertions for section placement and renamed copy**

Update the sample test to locate `#samples-heading` as `示例文档`, assert `#samples-section` follows `.images` in the result panel, and expect `示例文档已准备好，可以检测。` after selecting the official sample. Update the English assertion to `Sample documents`.

- [x] **Step 2: Run the focused test before production changes**

Run `pnpm --filter @pplcnet/demo test -- --grep "sample"`.

Expected result: FAIL because the current section is outside `.result-panel` and the current copy still says `示例图片` / `Sample images`.

### Task 2: Move and rename the sample section

**Files:**
- Modify: `apps/demo/src/render.ts`
- Modify: `apps/demo/src/i18n/zh-CN.ts`
- Modify: `apps/demo/src/i18n/en.ts`

- [x] **Step 1: Render the section after the preview grid**

Give the section `id="samples-section"`, remove the page-level instance before the status line, and render the same sample heading, four buttons, and attribution link after `</div>` for `.images` inside `.result-panel`.

- [x] **Step 2: Rename user-facing copy**

Use `示例文档` / `Sample documents` for the heading, document-focused descriptions, and `示例文档正在加载…` / `Sample document ready for detection.` status text. Keep the data attributes and sample labels stable so existing selection logic remains unchanged.

### Task 3: Style the preview-owned sample grid

**Files:**
- Modify: `apps/demo/src/styles.css`

- [x] **Step 1: Make the section span the preview column**

Remove its page-level bottom divider treatment, add a top divider and spacing appropriate for the result panel, and retain the four-column grid. Keep the existing 2-column and 1-column breakpoints and stable thumbnail dimensions.

- [x] **Step 2: Run the focused test after implementation**

Run `pnpm --filter @pplcnet/demo test -- --grep "sample|layout"` and expect all matching tests to pass.

### Task 4: Verify and publish

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `CHANGELOG.md`

- [x] **Step 1: Update documentation terminology**

Change references to the Demo sample image strip to sample document section while preserving the official-source and derived-rotation explanation.

- [x] **Step 2: Run verification**

Run `pnpm --filter @pplcnet/demo typecheck`, `pnpm --filter @pplcnet/demo lint`, `pnpm --filter @pplcnet/demo test`, `pnpm verify`, and `git diff --check`.

- [x] **Step 3: Commit, push, and open a PR**

Commit with `feat(demo): place orientation samples under previews`, push `codex/pp-lcnet-orientation` with tracking, and open a Draft PR targeting `main` after verifying the worktree and remote target.
