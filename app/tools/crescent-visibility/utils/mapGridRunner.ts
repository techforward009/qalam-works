import type { DateParts } from "../../date-converter/utils/dateEngine";
import { createPakistanGridObserver } from "../../date-converter/utils/map-observers/createPakistanGridObserver";
import { evaluateDateStudioPakistanCrescentPrediction } from "../../date-converter/utils/pakistan-crescent/dateStudioPrediction";
import { evaluateDateStudioYallopPrediction } from "../../date-converter/utils/yallop/dateStudioPrediction";
import type { YallopVisibilityClass } from "../../date-converter/utils/yallop/types";
import type { PakistanGridPoint } from "./pakistanMapGrid";

export type VisibilityMapMethod = "yallop" | "pakistan-5year";
export type MapGridResult = PakistanGridPoint & { status: string; visibilityClass?: YallopVisibilityClass; criterionSatisfied?: boolean };

export type MapGridAdapters = {
  yallop: typeof evaluateDateStudioYallopPrediction;
  pakistan: typeof evaluateDateStudioPakistanCrescentPrediction;
};

const defaultAdapters: MapGridAdapters = { yallop: evaluateDateStudioYallopPrediction, pakistan: evaluateDateStudioPakistanCrescentPrediction };

const nextTask = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Runs exactly one scientific method for each supplied grid point. */
export async function runMapGrid(
  method: VisibilityMapMethod,
  date: DateParts,
  points: readonly PakistanGridPoint[],
  options: { signal?: AbortSignal; chunkSize?: number; adapters?: MapGridAdapters } = {},
): Promise<MapGridResult[]> {
  const adapters = options.adapters ?? defaultAdapters;
  const results: MapGridResult[] = [];
  const chunkSize = options.chunkSize ?? 8;
  for (let index = 0; index < points.length; index++) {
    if (options.signal?.aborted) throw new DOMException("Map calculation cancelled", "AbortError");
    const point = points[index];
    const observer = createPakistanGridObserver(point.latitudeDeg, point.longitudeDeg, point.id);
    if (method === "yallop") {
      const prediction = adapters.yallop(date, observer);
      results.push({ ...point, status: prediction.status, visibilityClass: prediction.status === "evaluated" ? prediction.criterion.visibilityClass : undefined });
    } else {
      const prediction = adapters.pakistan(date, observer);
      results.push({ ...point, status: prediction.status, criterionSatisfied: prediction.status === "evaluated" ? prediction.criterion.qualifies : undefined });
    }
    if ((index + 1) % chunkSize === 0) await nextTask();
  }
  return results;
}
