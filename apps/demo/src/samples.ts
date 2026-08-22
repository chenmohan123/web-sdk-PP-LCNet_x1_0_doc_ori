import sampleData from "./samples.json";

export type OrientationAngle = 0 | 90 | 180 | 270;
export type OrientationSampleKind = "official" | "derived";

export interface OrientationSample {
  readonly id: string;
  readonly filename: string;
  readonly expectedOrientation: OrientationAngle;
  readonly label: Readonly<{ en: string; zh: string }>;
  readonly kind: OrientationSampleKind;
  readonly mimeType: string;
  readonly sourceUrl: string;
  readonly sourceCommit: string;
  readonly sha256: string;
}

export const orientationSamples = sampleData as readonly OrientationSample[];

export function sampleUrl(sample: OrientationSample): string {
  const baseUrl = (import.meta.env as unknown as { BASE_URL: string }).BASE_URL;
  return `${baseUrl}samples/${sample.filename}`;
}

export async function fetchSampleFile(sample: OrientationSample): Promise<File> {
  const response = await fetch(sampleUrl(sample));
  if (!response.ok) throw new Error(`Unable to load sample ${sample.filename}`);
  return new File([await response.blob()], sample.filename, { type: sample.mimeType });
}
