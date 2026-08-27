export type ModelSourceKey = "default" | "huggingface" | "modelscope";

export interface ModelSourceOption {
  readonly available: boolean;
  readonly disabledReason?: Readonly<{ en: string; zh: string }>;
  readonly key: ModelSourceKey;
  readonly label: Readonly<{ en: string; zh: string }>;
  readonly manifestUrl?: string;
}

export const DEFAULT_MODEL_SOURCE: ModelSourceKey = "default";

export const MODEL_SOURCE_OPTIONS: readonly ModelSourceOption[] = [
  {
    available: true,
    key: "default",
    label: { en: "SDK default", zh: "SDK 默认" }
  },
  {
    available: true,
    key: "huggingface",
    label: { en: "Hugging Face", zh: "Hugging Face" },
    manifestUrl: "https://huggingface.co/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori/resolve/5665496d5026b0b4f435a1c3040ef8fb7bb44402/1.0.0/manifest.json"
  },
  {
    available: true,
    key: "modelscope",
    label: { en: "ModelScope", zh: "ModelScope" },
    manifestUrl: "https://modelscope.cn/models/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori/resolve/v1.0.0/1.0.0/manifest.json"
  }
] as const;

export function selectionToModel(source: ModelSourceKey): string | undefined {
  return MODEL_SOURCE_OPTIONS.find((option) => option.key === source)?.manifestUrl;
}
