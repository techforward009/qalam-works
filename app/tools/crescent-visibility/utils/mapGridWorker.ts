/// <reference lib="webworker" />
import { runMapGrid, type MapGridResult, type VisibilityMapMethod } from "./mapGridRunner";
import type { PakistanGridPoint } from "./pakistanMapGrid";

type Request = { type: "calculate"; jobId: string; method: VisibilityMapMethod; date: { year: number; month: number; day: number }; points: PakistanGridPoint[] } | { type: "cancel"; jobId: string };
const controllers = new Map<string, AbortController>();

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  if (data.type === "cancel") { controllers.get(data.jobId)?.abort(); return; }
  const controller = new AbortController(); controllers.set(data.jobId, controller);
  try {
    const results = await runMapGrid(data.method, data.date, data.points, { signal: controller.signal });
    if (!controller.signal.aborted) self.postMessage({ type: "complete", jobId: data.jobId, results: results satisfies MapGridResult[] });
  } catch (error) {
    if (!controller.signal.aborted) self.postMessage({ type: "error", jobId: data.jobId, message: error instanceof Error ? error.message : "Map calculation failed" });
  } finally { controllers.delete(data.jobId); }
};
