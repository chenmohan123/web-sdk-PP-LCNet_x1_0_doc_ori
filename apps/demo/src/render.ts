import type { DemoCopy } from "./i18n";

const repositoryUrl = "https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori";

export function renderShell(copy: DemoCopy, sdkVersion: string): string {
  return `<main class="demo-shell">
  <header class="topbar">
    <div class="brand-block">
      <p id="eyebrow" class="eyebrow">${copy.eyebrow}</p>
      <h1 id="title">${copy.title}</h1>
      <p id="description" class="description">${copy.description}</p>
      <span data-testid="sdk-version" class="version">SDK v${sdkVersion}</span>
    </div>
    <nav class="top-actions" aria-label="Demo links">
      <a class="text-button repository-link" href="${repositoryUrl}" target="_blank" rel="noreferrer">${copy.github}</a>
      <div class="language-switch" role="group" aria-label="Language">
        <button id="language-zh" class="language-button" type="button">${copy.chinese}</button>
        <button id="language-en" class="language-button" type="button">${copy.english}</button>
      </div>
    </nav>
  </header>

  <section class="control-band" aria-label="Controls">
    <label class="control-group" for="backend"><span id="backend-label" class="control-label">${copy.backend}</span><select id="backend"><option value="wasm">${copy.wasmCpu}</option><option value="webgpu">${copy.webgpuGpu}</option></select></label>
    <button id="choose-image" class="secondary-button" type="button">${copy.chooseImage}</button>
    <input id="file" hidden type="file" accept="image/*" />
    <button id="run" class="primary-button" type="button" disabled>${copy.run}</button>
    <p id="selected-file" class="file-meta" aria-live="polite"></p>
  </section>

  <p id="status" class="status-line" role="status">${copy.statusChoose}</p>

  <section class="workspace-grid">
    <section class="result-panel" aria-labelledby="preview-heading">
      <div class="panel-heading"><h2 id="preview-heading">${copy.preview}</h2></div>
      <div class="images">
        <figure><figcaption id="original-label">${copy.original}</figcaption><div id="original-preview" class="preview-frame"><div data-testid="original-empty" class="empty-state">${copy.emptyOriginal}</div></div></figure>
        <figure><figcaption id="corrected-label">${copy.corrected}</figcaption><div id="corrected-preview" class="preview-frame"><div data-testid="corrected-empty" class="empty-state">${copy.emptyCorrected}</div></div></figure>
      </div>
    </section>
    <aside class="details-panel">
      <section class="detail-section"><h2 id="result-heading">${copy.result}</h2><dl id="result"></dl></section>
      <section class="detail-section"><h2 id="model-heading">${copy.model}</h2><dl id="model"></dl></section>
      <section class="detail-section"><h2 id="timing-heading">${copy.timing}</h2><dl id="timing"></dl></section>
    </aside>
  </section>
</main>`;
}
