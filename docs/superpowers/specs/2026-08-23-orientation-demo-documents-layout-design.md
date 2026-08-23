# Orientation Demo Document Samples Layout

## Goal

Make the orientation demo present its four local orientation fixtures as "sample documents" below the Original and Corrected previews, matching the compact document-tool layout used by the PP-DocLayoutV3 demo.

## Design

- Move the existing sample section into the left `result-panel`, immediately after the two preview figures.
- Keep the section at the preview column width so its four cards span exactly the combined Original + Corrected area, without becoming a full-page row outside the workspace.
- Use a four-column grid on wide screens, two columns below 900px, and one column below 560px. Preserve stable thumbnails and keyboard-accessible buttons.
- Rename visible Chinese/English copy from sample images to sample documents, including the loading and ready status messages. Keep the sample manifest, source attribution, language switching, and file-selection behavior unchanged.

## Validation

- Playwright asserts the section appears after the preview figures and is named "示例文档" / "Sample documents".
- Playwright asserts four sample buttons, sample loading behavior, language switching, and no viewport overflow at mobile width.
- Run Demo typecheck, lint, tests, build, and the repository verification command.
