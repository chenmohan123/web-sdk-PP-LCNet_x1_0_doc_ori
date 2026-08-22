# Orientation Demo Samples Design

## Goal

Give the orientation demo representative, offline-loadable images for all four model classes: 0°, 90°, 180°, and 270°.

## Source and licensing

- Vendor the official PaddleOCR input `img_rot180_demo.jpg` from the Paddle model ecology URL.
- Record the PaddleOCR documentation commit, source URL, Apache-2.0 attribution, and SHA-256 in a repository notice and sample manifest.
- Derive the 0°, 90°, and 270° fixtures from that official source image by deterministic pixel rotation. They must be labeled as derived rotations, not independent official samples.

## Demo behavior

- Add a bilingual "示例图片 / Sample images" strip below the controls.
- Show four compact image buttons with expected direction labels and degree badges.
- Clicking a sample loads it through the same `File` path as the hidden file picker, updates the Original preview, and enables the existing detection action.
- Keep language state in memory only; refresh still returns to Chinese.
- Preserve the explicit WASM/WebGPU selector and existing result/timing panels.

## Validation

- Unit/contract coverage verifies sample manifest labels, source hash, and four unique fixture files.
- Playwright coverage verifies four visible sample buttons, sample selection enabling detection, no broken images, and no viewport overflow at desktop and mobile widths.
- Run typecheck, lint, unit tests, Demo tests, build, model verification, and package asset verification.
