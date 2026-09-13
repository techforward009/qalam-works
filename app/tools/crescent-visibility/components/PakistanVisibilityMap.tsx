"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DateParts } from "../../date-converter/utils/dateEngine";
import type { OfficialHijriMonthAnchor } from "../../date-converter/utils/hijri-authority/types";
import type { YallopObserver } from "../../date-converter/utils/yallop/types";
import { NationalEvidencePanel } from "./NationalEvidencePanel";
import { pakistanColor, VisibilityMapLegend, yallopColor } from "./VisibilityMapLegend";
import { runMapGrid, type MapGridResult, type VisibilityMapMethod } from "../utils/mapGridRunner";
import { PAKISTAN_BOUNDARY_RING, PAKISTAN_BOUNDS } from "../utils/pakistanBoundary";
import { createPakistanMapGrid, mapGridCacheKey } from "../utils/pakistanMapGrid";

const WIDTH = 640, HEIGHT = 430, PAD = 20;
const x = (longitude: number) => PAD + ((longitude - PAKISTAN_BOUNDS.minLongitude) / (PAKISTAN_BOUNDS.maxLongitude - PAKISTAN_BOUNDS.minLongitude)) * (WIDTH - PAD * 2);
const y = (latitude: number) => HEIGHT - PAD - ((latitude - PAKISTAN_BOUNDS.minLatitude) / (PAKISTAN_BOUNDS.maxLatitude - PAKISTAN_BOUNDS.minLatitude)) * (HEIGHT - PAD * 2);
const boundaryPath = `M ${PAKISTAN_BOUNDARY_RING.map(([longitude, latitude]) => `${x(longitude).toFixed(1)} ${y(latitude).toFixed(1)}`).join(" L ")} Z`;

export function PakistanVisibilityMap({ date, selectedObserver, decision, lang }: { date: DateParts; selectedObserver: YallopObserver; decision: OfficialHijriMonthAnchor | null; lang: "en" | "ur" }) {
  const ur = lang === "ur";
  const [method, setMethod] = useState<VisibilityMapMethod>("yallop");
  const [resultState, setResultState] = useState<{ key: string; results: MapGridResult[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const cache = useRef(new Map<string, MapGridResult[]>());
  const grid = useMemo(() => createPakistanMapGrid(), []);
  const cacheKey = mapGridCacheKey(method, date);

  useEffect(() => {
    const cached = cache.current.get(cacheKey);
    if (cached) { setResultState({ key: cacheKey, results: cached }); setLoading(false); return; }
    let live = true; setLoading(true);
    const finish = (items: MapGridResult[]) => { if (live) { cache.current.set(cacheKey, items); setResultState({ key: cacheKey, results: items }); setLoading(false); } };
    const WorkerConstructor = typeof Worker === "undefined" ? undefined : Worker;
    if (!WorkerConstructor) {
      const controller = new AbortController();
      runMapGrid(method, date, grid, { signal: controller.signal }).then(finish).catch(() => live && setLoading(false));
      return () => { live = false; controller.abort(); };
    }
    const worker = new WorkerConstructor(new URL("../utils/mapGridWorker.ts", import.meta.url), { type: "module" });
    const jobId = cacheKey;
    worker.onmessage = ({ data }) => { if (data.type === "complete" && data.jobId === jobId) finish(data.results); if (data.type === "error" && data.jobId === jobId && live) setLoading(false); };
    worker.postMessage({ type: "calculate", jobId, method, date, points: grid });
    return () => { live = false; worker.postMessage({ type: "cancel", jobId }); worker.terminate(); };
  }, [cacheKey, date, grid, method]);

  // A result belongs only to the exact date/method/grid/boundary request that
  // produced it. Never recolor or relabel an old request while a new one loads.
  const visibleResults = resultState?.key === cacheKey ? resultState.results : [];

  const selectedX = x(selectedObserver.longitudeDeg), selectedY = y(selectedObserver.latitudeDeg);
  return <section className="mt-4 rounded-2xl border p-4" aria-label={ur ? "پاکستان بھر میں سائنسی رؤیت نقشہ" : "Pakistan-wide scientific visibility map"}>
    <h2 className="font-bold">{ur ? "پاکستان بھر میں سائنسی رؤیت نقشہ" : "Pakistan-wide scientific visibility map"}</h2>
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" aria-pressed={method === "yallop"} onClick={() => setMethod("yallop")} className={`rounded-lg px-3 py-2 ${method === "yallop" ? "bg-[#1A3A2A] text-white" : "border"}`}>{ur ? "یالوپ" : "Yallop"}</button><button type="button" aria-pressed={method === "pakistan-5year"} onClick={() => setMethod("pakistan-5year")} className={`rounded-lg px-3 py-2 ${method === "pakistan-5year" ? "bg-[#1A3A2A] text-white" : "border"}`}>{ur ? "پاکستان پانچ سالہ معیار" : "Pakistan 5-Year Criterion"}</button></div>
    <VisibilityMapLegend method={method} ur={ur} />
    <p className="mt-3 rounded-lg bg-[#F7F5EF] p-3 text-sm dark:bg-[#162a1e]">{ur ? "یہ نقشہ سائنسی رؤیت کی پیش گوئی دکھاتا ہے۔ حتمی سرکاری اعلان پاکستان کے کسی بھی مقام سے موصول ہونے والی معتبر شہادت کی بنیاد پر ہوسکتا ہے۔" : "This map shows a scientific crescent-visibility prediction. The final official declaration may be based on credible accepted sighting testimony from any location in Pakistan."}</p>
    {loading && <p className="mt-3 text-sm" role="status">{ur ? "پاکستان بھر میں رؤیت کا حساب لگایا جا رہا ہے…" : "Calculating visibility across Pakistan…"}</p>}
    <svg className="mt-3 h-auto w-full" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ur ? "صرف پاکستان کی حد کے اندر حساب شدہ سائنسی گرڈ مقامات" : "Scientifically calculated grid points inside the Pakistan boundary only"}>
      <defs><clipPath id="pakistan-map-clip"><path d={boundaryPath} /></clipPath></defs><path d={boundaryPath} fill="#edf4ee" stroke="#1A3A2A" strokeWidth="2" />
      <g clipPath="url(#pakistan-map-clip)">{visibleResults.map(point => { const color = method === "yallop" ? yallopColor(point.visibilityClass) : pakistanColor(point.criterionSatisfied); const label = method === "yallop" ? `Yallop Class ${point.visibilityClass ?? "not evaluated"}` : point.criterionSatisfied ? "Pakistan criterion satisfied" : "Pakistan criterion not satisfied"; return <circle key={point.id} cx={x(point.longitudeDeg)} cy={y(point.latitudeDeg)} r="7" fill={color} stroke="white" strokeWidth="1.5" aria-label={`${point.latitudeDeg}, ${point.longitudeDeg}: ${label}`}><title>{label}</title></circle>; })}</g>
      <g aria-label={ur ? "منتخب مبصر" : "Selected observer"}><circle cx={selectedX} cy={selectedY} r="6" fill="white" stroke="#111827" strokeWidth="3" /><text x={selectedX + 8} y={selectedY - 8} className="fill-current text-[12px] font-bold">{ur ? "منتخب مبصر" : "Selected observer"}</text></g>
    </svg>
    <p className="text-xs text-muted-foreground">{ur ? `${grid.length} حقیقی گرڈ مقامات؛ زمینی بلندی کے بجائے 0 میٹر حوالہ بلندی استعمال ہوتی ہے۔` : `${grid.length} actual grid locations; 0 m reference elevation is used rather than terrain-specific heights.`}</p>
    <NationalEvidencePanel decision={decision} lang={lang} />
  </section>;
}
