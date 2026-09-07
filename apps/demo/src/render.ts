import type { DemoCopy } from "./i18n";
import { MODEL_SOURCE_OPTIONS } from "./model-sources";
import { orientationSamples, sampleUrl } from "./samples";

const repositoryUrl = "https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori";

export function renderShell(copy: DemoCopy, sdkVersion: string): string {
  const sourceOptions = MODEL_SOURCE_OPTIONS.map(
    (option) =>
      `<option value="${option.key}"${option.available ? "" : " disabled"} title="${option.disabledReason?.zh ?? ""}">${option.label.zh}${option.available ? "" : ` (${copy.unavailable})`}</option>`,
  ).join("");
  const sourceLimitations = MODEL_SOURCE_OPTIONS.filter((option) => !option.available)
    .map((option) => `${option.label.zh}: ${option.disabledReason?.zh ?? copy.unavailable}`)
    .join(" ");
  const sampleButtons = orientationSamples
    .map(
      (sample) => `<button class="sample-button" type="button" data-sample-id="${sample.id}" aria-label="${sample.label.zh}, ${copy.expectedOrientation}: ${sample.expectedOrientation}°">
  <img src="${sampleUrl(sample)}" alt="" loading="lazy" />
  <span class="sample-copy"><strong class="sample-name">${sample.label.zh}</strong><span class="sample-meta"><span class="sample-kind">${sample.kind === "official" ? copy.officialSample : copy.derivedSample}</span><span class="sample-angle">${copy.expectedOrientation}: ${sample.expectedOrientation}°</span></span></span>
</button>`,
    )
    .join("");
  return `<main class="demo-shell">
  <header class="topbar">
    <div class="brand-block">
      <span class="brand-mark" aria-hidden="true">ORI</span>
      <div class="brand-copy">
        <h1 id="title">${copy.title}</h1>
        <div class="brand-meta"><span data-testid="sdk-version" class="version">SDK v${sdkVersion}</span><p id="eyebrow" class="eyebrow">${copy.eyebrow}</p></div>
        <p id="description" class="visually-hidden">${copy.description}</p>
      </div>
    </div>
    <nav class="top-actions" aria-label="Demo links">
      <a class="text-button repository-link" href="${repositoryUrl}" target="_blank" rel="noreferrer">${copy.github}</a>
      <div class="language-switch" role="group" aria-label="Language">
        <button id="language-zh" class="language-button" type="button" aria-pressed="true">${copy.chinese}</button>
        <button id="language-en" class="language-button" type="button" aria-pressed="false">${copy.english}</button>
      </div>
    </nav>
  </header>

  <section class="workspace-grid">
  <aside class="control-band" aria-label="Controls">
    <div class="control-group"><label id="model-source-label" class="control-label" for="model-source">${copy.modelRepository}</label><select id="model-source" aria-describedby="model-source-limitations">${sourceOptions}</select><small id="model-source-limitations" class="model-source-limitations" data-testid="model-source-limitations">${sourceLimitations}</small></div>
    <label class="control-group" for="backend"><span id="backend-label" class="control-label">${copy.backend}</span><select id="backend"><option value="wasm">${copy.wasmCpu}</option><option value="webgpu">${copy.webgpuGpu}</option></select></label>
    <button id="choose-image" class="secondary-button" type="button">${copy.chooseImage}</button>
    <input id="file" hidden type="file" accept="image/*" />
    <button id="run" class="primary-button" type="button" disabled>${copy.run}</button>
    <p id="selected-file" class="file-meta" aria-live="polite"></p>
    <p id="status" class="status-line" role="status" data-state="idle">${copy.statusChoose}</p>
  </aside>

    <section class="result-panel" aria-labelledby="preview-heading">
      <div class="panel-heading"><h2 id="preview-heading">${copy.preview}</h2></div>
      <div class="images">
        <figure><figcaption id="original-label">${copy.original}</figcaption><div id="original-preview" class="preview-frame"><div data-testid="original-empty" class="empty-state">${copy.emptyOriginal}</div></div></figure>
        <figure><figcaption id="corrected-label">${copy.corrected}</figcaption><div id="corrected-preview" class="preview-frame"><div data-testid="corrected-empty" class="empty-state">${copy.emptyCorrected}</div></div></figure>
      </div>
      <section id="samples-section" class="samples-section" aria-labelledby="samples-heading">
        <div class="samples-heading"><div><h2 id="samples-heading">${copy.samples}</h2><p id="samples-description">${copy.samplesDescription}</p></div></div>
        <div class="sample-grid">${sampleButtons}</div>
        <a id="sample-attribution" class="sample-attribution" hidden target="_blank" rel="noreferrer"></a>
      </section>
    </section>
    <aside class="details-panel">
      <section class="detail-section"><h2 id="result-heading">${copy.result}</h2><dl id="result"></dl></section>
      <section class="detail-section"><h2 id="model-heading">${copy.model}</h2><dl id="model"></dl></section>
      <section class="detail-section"><h2 id="timing-heading">${copy.timing}</h2><dl id="timing"></dl></section>
    </aside>
  </section>
</main>`;
}
