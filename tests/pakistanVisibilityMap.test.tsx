/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createPakistanGridObserver } from "../app/tools/date-converter/utils/map-observers/createPakistanGridObserver";
import { runMapGrid } from "../app/tools/crescent-visibility/utils/mapGridRunner";
import { isInsidePakistanBoundary } from "../app/tools/crescent-visibility/utils/pakistanBoundary";
import { createPakistanMapGrid, mapGridCacheKey } from "../app/tools/crescent-visibility/utils/pakistanMapGrid";

const date = { year: 2026, month: 8, day: 13 };
const points = createPakistanMapGrid();

const adapters = {
  yallop: vi.fn((receivedDate: typeof date, observer: ReturnType<typeof createPakistanGridObserver>) => ({ status: "evaluated" as const, observerLocalDate: "2026-08-13", evaluationWindowStartUtc: "2026-08-12T19:00:00.000Z", snapshot: { observer }, criterion: { visibilityClass: "A" as const, q: 0.1 }, acceptedByPolicy: true, provenance: {} })),
  pakistan: vi.fn((receivedDate: typeof date, observer: ReturnType<typeof createPakistanGridObserver>) => ({ status: "evaluated" as const, observerLocalDate: "2026-08-13", evaluationWindowStartUtc: "2026-08-12T19:00:00.000Z", snapshot: { observer }, criterion: { qualifies: true }, provenance: {} })),
};

describe("Pakistan visibility map grid", () => {
  it("is deterministic, masked, and gives stable identifiers", () => {
    const again = createPakistanMapGrid();
    expect(points).toEqual(again);
    expect(points.length).toBeGreaterThan(50);
    expect(points.every(point => isInsidePakistanBoundary(point.latitudeDeg, point.longitudeDeg))).toBe(true);
    expect(new Set(points.map(point => point.id)).size).toBe(points.length);
    expect(isInsidePakistanBoundary(20, 80)).toBe(false);
  });

  it("runs Yallop only and passes the selected Gregorian date unchanged", async () => {
    const results = await runMapGrid("yallop", date, points.slice(0, 2), { adapters: adapters as any, chunkSize: 1 });
    expect(adapters.yallop).toHaveBeenCalledTimes(2); expect(adapters.pakistan).not.toHaveBeenCalled();
    expect(adapters.yallop.mock.calls[0][0]).toEqual(date);
    expect(results.every(result => result.visibilityClass === "A" && result.criterionSatisfied === undefined)).toBe(true);
  });

  it("runs the Pakistan criterion only, with no combined score", async () => {
    adapters.yallop.mockClear(); adapters.pakistan.mockClear();
    const results = await runMapGrid("pakistan-5year", date, points.slice(0, 2), { adapters: adapters as any, chunkSize: 1 });
    expect(adapters.pakistan).toHaveBeenCalledTimes(2); expect(adapters.yallop).not.toHaveBeenCalled();
    expect(results.every(result => result.criterionSatisfied === true && result.visibilityClass === undefined)).toBe(true);
  });

  it("separates cache entries by method, selected date, grid and boundary versions", () => {
    expect(mapGridCacheKey("yallop", date)).not.toBe(mapGridCacheKey("pakistan-5year", date));
    expect(mapGridCacheKey("yallop", date)).not.toBe(mapGridCacheKey("yallop", { ...date, day: 14 }));
    expect(mapGridCacheKey("yallop", date)).toContain("pakistan-grid-0.75deg-v1");
    expect(mapGridCacheKey("yallop", date)).toContain("natural-earth-110m-pakistan-v1");
  });

  it("honours cancellation between grid chunks", async () => {
    const controller = new AbortController();
    const cancellingAdapters = { ...adapters, yallop: vi.fn((receivedDate, observer) => { controller.abort(); return adapters.yallop(receivedDate, observer); }) };
    await expect(runMapGrid("yallop", date, points.slice(0, 3), { adapters: cancellingAdapters as any, chunkSize: 1, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });
});

const locale = vi.hoisted(() => ({ language: "en" as "en" | "ur" }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: locale.language }) }));
vi.mock("../app/tools/date-converter/utils/yallop/dateStudioPrediction", () => ({ evaluateDateStudioYallopPrediction: vi.fn((_: unknown, observer: any) => ({ status: "evaluated", observerLocalDate: "2026-08-13", snapshot: { observer }, criterion: { visibilityClass: "A", q: 0.3 }, acceptedByPolicy: true, provenance: {} })) }));
vi.mock("../app/tools/date-converter/utils/pakistan-crescent/dateStudioPrediction", () => ({ evaluateDateStudioPakistanCrescentPrediction: vi.fn((_: unknown, observer: any) => ({ status: "evaluated", observerLocalDate: "2026-08-13", snapshot: { observer }, criterion: { qualifies: true }, provenance: {} })) }));

describe("Pakistan visibility map UX", () => {
  it("offers independent layers, complete accessible legends, the national note, and an observer marker", async () => {
    const { PakistanVisibilityMap } = await import("../app/tools/crescent-visibility/components/PakistanVisibilityMap");
    const observer = createPakistanGridObserver(24.86, 67.01, "selected");
    render(<PakistanVisibilityMap date={date} selectedObserver={observer} decision={null} lang="en" />);
    expect(screen.getByRole("button", { name: "Yallop" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pakistan 5-Year Criterion" })).toBeTruthy();
    for (const id of ["A", "B", "C", "D", "E", "F"]) expect(screen.getByLabelText(new RegExp(`Class ${id}:`))).toBeTruthy();
    expect(screen.getByText(/This map shows a scientific crescent-visibility prediction/)).toBeTruthy();
    expect(screen.getByText("Selected observer")).toBeTruthy();
    expect(screen.getByText(/No reviewed official moon-sighting decision/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pakistan 5-Year Criterion" }));
    await waitFor(() => expect(screen.getByLabelText(/Pakistan 5-Year Criterion legend/)).toBeTruthy());
    expect(screen.getByText("Criterion satisfied")).toBeTruthy(); expect(screen.getByText("Criterion not satisfied")).toBeTruthy();
    expect(screen.queryByText(/officially visible|combined score/i)).toBeNull();
  });

  it("keeps the national safety note in Urdu", async () => {
    const { PakistanVisibilityMap } = await import("../app/tools/crescent-visibility/components/PakistanVisibilityMap");
    render(<PakistanVisibilityMap date={date} selectedObserver={createPakistanGridObserver(24.86, 67.01, "selected")} decision={null} lang="ur" />);
    expect(screen.getByText(/یہ نقشہ سائنسی رؤیت کی پیش گوئی دکھاتا ہے/)).toBeTruthy();
  });

  it("recalculates for the explicitly selected historical date", async () => {
    const { PakistanVisibilityMap } = await import("../app/tools/crescent-visibility/components/PakistanVisibilityMap");
    const { evaluateDateStudioYallopPrediction } = await import("../app/tools/date-converter/utils/yallop/dateStudioPrediction");
    vi.mocked(evaluateDateStudioYallopPrediction).mockClear();
    const observer = createPakistanGridObserver(24.86, 67.01, "selected");
    const view = render(<PakistanVisibilityMap date={date} selectedObserver={observer} decision={null} lang="en" />);
    await waitFor(() => expect(evaluateDateStudioYallopPrediction).toHaveBeenCalled());
    view.rerender(<PakistanVisibilityMap date={{ year: 2025, month: 3, day: 1 }} selectedObserver={observer} decision={null} lang="en" />);
    await waitFor(() => expect(vi.mocked(evaluateDateStudioYallopPrediction).mock.calls.some(([received]) => received.year === 2025 && received.month === 3 && received.day === 1)).toBe(true));
  });

  it("shows reviewed national evidence separately without an evidence location marker", async () => {
    const { PakistanVisibilityMap } = await import("../app/tools/crescent-visibility/components/PakistanVisibilityMap");
    render(<PakistanVisibilityMap date={date} selectedObserver={createPakistanGridObserver(24.86, 67.01, "selected")} lang="en" decision={{ id: "reviewed-national", jurisdiction: "PK", hijriYear: 1448, hijriMonth: 3, officialDayOneGregorian: date, coverageEndGregorian: date, authority: "official", evidenceKind: "official-declaration", verificationStatus: "verified", sightingDecision: "not-sighted", announcementGregorianDate: date, providerId: "committee", providerLabel: { en: "Committee", ur: "کمیٹی" }, sourceUrl: "", sourceReference: "Reviewed national decision", provenance: {} }} />);
    expect(screen.getByText("Official decision: crescent not sighted")).toBeTruthy();
    expect(screen.getByText(/does not alter scientific map results or infer a sighting location/)).toBeTruthy();
    expect(screen.queryByText(/official sighting marker/i)).toBeNull();
  });

  it("does not render old results during method/date switches or accept a late old worker response", async () => {
    const originalWorker = (globalThis as any).Worker;
    const workers: any[] = [];
    class FakeWorker {
      onmessage: ((event: { data: any }) => void) | null = null;
      constructor(..._: any[]) { workers.push(this); }
      postMessage() {}
      terminate() {}
      emit(data: any) { this.onmessage?.({ data }); }
    }
    (globalThis as any).Worker = FakeWorker;
    try {
      const { PakistanVisibilityMap } = await import("../app/tools/crescent-visibility/components/PakistanVisibilityMap");
      const observer = createPakistanGridObserver(24.86, 67.01, "selected");
      const view = render(<PakistanVisibilityMap date={date} selectedObserver={observer} decision={null} lang="en" />);
      act(() => workers[0].emit({ type: "complete", jobId: mapGridCacheKey("yallop", date), results: [{ ...points[0], status: "evaluated", visibilityClass: "A" }] }));
      expect(view.container.querySelectorAll("circle[aria-label]")).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: "Pakistan 5-Year Criterion" }));
      expect(view.container.querySelectorAll("circle[aria-label]")).toHaveLength(0);
      act(() => workers[0].emit({ type: "complete", jobId: mapGridCacheKey("yallop", date), results: [{ ...points[0], status: "evaluated", visibilityClass: "A" }] }));
      expect(view.container.querySelectorAll("circle[aria-label]")).toHaveLength(0);
      act(() => workers[1].emit({ type: "complete", jobId: mapGridCacheKey("pakistan-5year", date), results: [{ ...points[0], status: "evaluated", criterionSatisfied: true }] }));
      expect(view.container.querySelectorAll("circle[aria-label]")).toHaveLength(1);
      view.rerender(<PakistanVisibilityMap date={{ year: 2025, month: 3, day: 1 }} selectedObserver={observer} decision={null} lang="en" />);
      expect(view.container.querySelectorAll("circle[aria-label]")).toHaveLength(0);
    } finally { (globalThis as any).Worker = originalWorker; }
  });
});
