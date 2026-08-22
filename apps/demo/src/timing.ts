export interface DemoLoadTimings {
  readonly manifestMs: number;
  readonly downloadMs: number;
  readonly sessionMs: number;
  readonly totalMs: number;
  readonly source: string;
}

export function formatLoadTimings(
  timings: DemoLoadTimings,
): Record<string, string> {
  return {
    Manifest: `${timings.manifestMs.toFixed(1)} ms`,
    Model: `${timings.downloadMs.toFixed(1)} ms`,
    Session: `${timings.sessionMs.toFixed(1)} ms`,
    "Load total": `${timings.totalMs.toFixed(1)} ms`,
    Source: timings.source,
  };
}
