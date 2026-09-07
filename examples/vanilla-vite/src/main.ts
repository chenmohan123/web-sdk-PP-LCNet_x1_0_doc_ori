import {
  createDocOrientation,
  DocOrientationError,
  type Backend,
  type DocOrientationDetector,
} from "web-sdk-pp-lcnet-x1-0-doc-ori";

const image = document.querySelector<HTMLInputElement>("#image")!;
const backend = document.querySelector<HTMLSelectElement>("#backend")!;
const detectButton = document.querySelector<HTMLButtonElement>("#detect")!;
const cancelButton = document.querySelector<HTMLButtonElement>("#cancel")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const output = document.querySelector<HTMLPreElement>("#output")!;
let activeController: AbortController | undefined;

image.addEventListener("change", () => {
  output.textContent = "";
  status.textContent = image.files?.[0] ? "图片已准备好" : "请选择图片";
  detectButton.disabled = !image.files?.[0];
});
cancelButton.addEventListener("click", () => activeController?.abort());
window.addEventListener("pagehide", () => activeController?.abort());
detectButton.addEventListener("click", () => {
  void detect();
});

async function detect(): Promise<void> {
  const file = image.files?.[0];
  if (!file || activeController) return;
  const controller = new AbortController();
  activeController = controller;
  image.disabled = backend.disabled = detectButton.disabled = true;
  cancelButton.disabled = false;
  output.textContent = "";
  status.textContent = "正在加载模型";
  let detector: DocOrientationDetector | undefined;
  try {
    detector = await createDocOrientation({
      backend: backend.value as Backend,
      model:
        "https://modelscope.cn/models/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori/resolve/master/manifest.json?v=1.0.0",
      signal: controller.signal,
      onProgress: (event) => {
        if (!controller.signal.aborted)
          status.textContent = `模型加载：${event.stage}`;
      },
    });
    if (controller.signal.aborted)
      throw new DOMException("已取消", "AbortError");
    status.textContent = "正在检测";
    const result = await detector.detect(file, { signal: controller.signal });
    if (controller.signal.aborted)
      throw new DOMException("已取消", "AbortError");
    output.textContent = JSON.stringify(
      { ...result, loadTimings: detector.loadTimings },
      null,
      2,
    );
    status.textContent = "检测完成";
  } catch (error) {
    if (controller.signal.aborted) status.textContent = "已取消";
    else {
      status.textContent = "检测失败";
      output.textContent =
        error instanceof DocOrientationError
          ? `${error.code}: ${error.message}`
          : String(error);
    }
  } finally {
    try {
      await detector?.dispose();
    } catch (error) {
      status.textContent = "资源释放失败";
      output.textContent = String(error);
    }
    activeController = undefined;
    image.disabled = backend.disabled = false;
    detectButton.disabled = !image.files?.[0];
    cancelButton.disabled = true;
  }
}
