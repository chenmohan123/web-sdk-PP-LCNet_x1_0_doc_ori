import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import {
  createDocOrientation,
  DocOrientationError,
  rotate,
  type Backend,
  type DocOrientationDetector,
  type OrientationResult,
} from "web-sdk-pp-lcnet-x1-0-doc-ori";

const githubUrl =
  "https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori";

function formatMs(value: number): string {
  return `${value.toFixed(1)} ms`;
}

export function App(): ReactElement {
  const detector = useRef<DocOrientationDetector | undefined>(undefined);
  const [backend, setBackend] = useState<Backend>("wasm");
  const [file, setFile] = useState<File>();
  const [originalUrl, setOriginalUrl] = useState<string>();
  const [correctedUrl, setCorrectedUrl] = useState<string>();
  const correctedUrlRef = useRef<string | undefined>(undefined);
  const [result, setResult] = useState<OrientationResult>();
  const [status, setStatus] = useState("请选择图片");
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setOriginalUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => {
      void detector.current?.dispose();
      if (correctedUrlRef.current) URL.revokeObjectURL(correctedUrlRef.current);
    };
  }, []);

  const clearCorrected = (): void => {
    if (correctedUrlRef.current) URL.revokeObjectURL(correctedUrlRef.current);
    correctedUrlRef.current = undefined;
    setCorrectedUrl(undefined);
  };

  const setCorrected = (blob: Blob): void => {
    clearCorrected();
    const url = URL.createObjectURL(blob);
    correctedUrlRef.current = url;
    setCorrectedUrl(url);
  };

  const selectImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextFile = event.target.files?.[0];
    setFile(nextFile);
    clearCorrected();
    setResult(undefined);
    setError(undefined);
    setStatus(nextFile ? "图片已准备好，可以检测" : "请选择图片");
  };

  const detect = async (): Promise<void> => {
    if (!file) return;
    setError(undefined);
    setStatus("正在加载模型并检测…");
    try {
      await detector.current?.dispose();
      detector.current = await createDocOrientation({
        backend,
        onProgress: (event) => setStatus(`${event.stage}…`),
      });
      const nextResult = await detector.current.detect(file);
      setResult(nextResult);
      const corrected = await rotate(file, nextResult.correctionAngle);
      setCorrected(corrected);
      setStatus("检测完成");
    } catch (caught) {
      setError(
        caught instanceof DocOrientationError
          ? `${caught.code}: ${caught.message}`
          : caught instanceof Error
            ? caught.message
            : String(caught),
      );
      setStatus("检测失败");
    }
  };

  return (
    <main className="react-demo">
      <header className="topbar">
        <div>
          <p className="eyebrow">REACT EXAMPLE</p>
          <h1>PP-LCNet document orientation</h1>
          <p className="muted">React + ONNX Runtime Web，中文默认。</p>
        </div>
        <a href={githubUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </header>
      <section className="controls">
        <label>
          推理后端
          <select
            value={backend}
            onChange={(event) => setBackend(event.target.value as Backend)}
          >
            <option value="wasm">WASM / CPU</option>
            <option value="webgpu">WebGPU / GPU</option>
          </select>
        </label>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/*"
          onChange={selectImage}
        />
        <button type="button" onClick={() => inputRef.current?.click()}>
          选择图片
        </button>
        <button type="button" disabled={!file} onClick={() => void detect()}>
          加载模型并检测
        </button>
      </section>
      <p className="status" role="status">
        {status}
      </p>
      {error && <p className="error">{error}</p>}
      <section className="workspace">
        <div className="preview-grid">
          <figure>
            <figcaption>Original</figcaption>
            <div className="preview">
              {originalUrl ? (
                <img src={originalUrl} alt="Original" />
              ) : (
                <span>选择图片后显示原图</span>
              )}
            </div>
          </figure>
          <figure>
            <figcaption>Corrected</figcaption>
            <div className="preview">
              {correctedUrl ? (
                <img src={correctedUrl} alt="Corrected" />
              ) : (
                <span>检测完成后显示校正图</span>
              )}
            </div>
          </figure>
        </div>
        <aside className="details">
          <h2>结果</h2>
          <dl>
            <div>
              <dt>方向</dt>
              <dd>{result ? `${result.orientation}°` : "-"}</dd>
            </div>
            <div>
              <dt>置信度</dt>
              <dd>{result ? `${(result.score * 100).toFixed(2)}%` : "-"}</dd>
            </div>
            <div>
              <dt>校正角度</dt>
              <dd>{result ? `${result.correctionAngle}°` : "-"}</dd>
            </div>
          </dl>
          <h2>模型与耗时</h2>
          <dl>
            <div>
              <dt>模型</dt>
              <dd>{result?.model.id ?? "-"}</dd>
            </div>
            <div>
              <dt>大小</dt>
              <dd>
                {result
                  ? `${(result.model.bytes / 1024 / 1024).toFixed(2)} MB`
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>参数量</dt>
              <dd>{result?.model.parameterCount.toLocaleString() ?? "-"}</dd>
            </div>
            <div>
              <dt>加载总计</dt>
              <dd>
                {detector.current
                  ? formatMs(detector.current.loadTimings.totalMs)
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>推理</dt>
              <dd>{result ? formatMs(result.timings.inferenceMs) : "-"}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
