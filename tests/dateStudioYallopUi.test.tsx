/** @vitest-environment happy-dom */

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DateConverterContent from "../app/tools/date-converter/DateConverterContent";
import { YallopIntegration, type DateStudioMethod } from "../app/tools/date-converter/components/YallopIntegration";
import { observerLocalMidnightUtc, type DateStudioYallopPrediction } from "../app/tools/date-converter/utils/yallop/dateStudioPrediction";
import { yallopObserver } from "../app/tools/date-converter/utils/yallop/observerLocations";
import { convert } from "../app/tools/date-converter/utils/dateEngine";

const adapter = vi.hoisted(() => ({ predict: vi.fn() }));

vi.mock("../app/tools/date-converter/utils/yallop/dateStudioPrediction", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/tools/date-converter/utils/yallop/dateStudioPrediction")>();
  return { ...actual, evaluateDateStudioYallopPrediction: adapter.predict };
});

vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: "en", dir: "ltr", setLanguage: vi.fn() }) }));
vi.mock("../app/lib/analytics", () => ({ trackEvent: vi.fn(), trackToolOpenOnce: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));

afterEach(cleanup);

function evaluated(observerId: string, localDate: string): DateStudioYallopPrediction {
  const observer = yallopObserver(observerId)!;
  return {
    status: "evaluated", observerLocalDate: localDate, evaluationWindowStartUtc: `${localDate}T00:00:00.000Z`,
    snapshot: { observer, conjunctionUtc: "2024-03-10T00:00:00.000Z", sunsetUtc: "2024-03-11T13:00:00.000Z", moonsetUtc: "2024-03-11T14:00:00.000Z", bestTimeUtc: "2024-03-11T13:26:40.000Z", arclDeg: 12, arcvDeg: 6, dazDeg: 3, moonGeocentricAltitudeDeg: 5, horizontalParallaxDeg: 1 },
    criterion: { arclDeg: 12, arcvDeg: 6, moonGeocentricAltitudeDeg: 5, horizontalParallaxDeg: 1, semidiameterDeg: 0.27, topocentricSemidiameterDeg: 0.28, widthArcMin: 0.4, q: 0.321, visibilityClass: "A" }, acceptedByPolicy: true,
    provenance: { method: "yallop", algorithm: "BD-Yallop-NAO-TN69", algorithmVersion: "phase-1.0.0", astronomyProvider: "Astronomy Engine", astronomyProviderVersion: "2.1.19", policyId: "yallop-naked-eye-ab-v1", observer, conjunctionUtc: "2024-03-10T00:00:00.000Z", sunsetUtc: "2024-03-11T13:00:00.000Z", moonsetUtc: "2024-03-11T14:00:00.000Z", bestTimeUtc: "2024-03-11T13:26:40.000Z", arclDeg: 12, arcvDeg: 6, widthArcMin: 0.4, q: 0.321, visibilityClass: "A", sourceType: "astronomical-prediction" },
  };
}

function Harness({ lang = "en", predict }: { lang?: "en" | "ur"; predict?: any }) {
  const [method, setMethod] = useState<DateStudioMethod>("qalam");
  const [observer, setObserver] = useState("karachi");
  const [date, setDate] = useState({ year: 2024, month: 3, day: 11 });
  const defaultPredict = (value: typeof date, place: NonNullable<ReturnType<typeof yallopObserver>>) => evaluated(place.id, `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`);
  return <><button onClick={() => setDate({ year: 2024, month: 4, day: 8 })}>change date</button><YallopIntegration lang={lang} method={method} onMethodChange={setMethod} observerId={observer} onObserverChange={setObserver} gregorian={date} predict={predict ?? defaultPredict} /></>;
}

describe("Date Studio Yallop integration", () => {
  it("DateConverterContent defaults to Current Qalam Method", () => {
    render(<DateConverterContent />);
    expect((screen.getByLabelText("Calculation method") as HTMLSelectElement).value).toBe("qalam");
  });

  it("passes DateConverterContent's deterministic converted Gregorian date to the prediction adapter", () => {
    adapter.predict.mockImplementation((value, place) => evaluated(place.id, `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`));
    const { container } = render(<DateConverterContent />);
    fireEvent.click(screen.getByText("Hijri"));
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: "1" } });
    fireEvent.change(container.querySelectorAll("select")[1], { target: { value: "9" } });
    fireEvent.change(numbers[1], { target: { value: "1445" } });
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect(adapter.predict).toHaveBeenLastCalledWith({ year: 2024, month: 3, day: 10 }, expect.objectContaining({ id: "karachi" }));
  });

  it("is opt-in and renders class, q, accurate policy wording, and disclaimer", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect((screen.getByLabelText("Observer location") as HTMLSelectElement).value).toBe("karachi");
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("0.321")).toBeTruthy();
    expect(screen.getByText("Next-day month-start policy")).toBeTruthy();
    expect(screen.getByText("This evening qualifies for next-day month start under current Qalam v1 policy")).toBeTruthy();
    expect(screen.getByText("Astronomical crescent-visibility prediction; not an official moon-sighting declaration.")).toBeTruthy();
  });

  it("recalculates using the selected observer and changed converted date", () => {
    const predict = vi.fn((value, place) => evaluated(place.id, `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`));
    render(<Harness predict={predict} />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect(predict).toHaveBeenLastCalledWith({ year: 2024, month: 3, day: 11 }, expect.objectContaining({ id: "karachi" }));
    fireEvent.change(screen.getByLabelText("Observer location"), { target: { value: "lahore" } });
    expect(predict).toHaveBeenLastCalledWith({ year: 2024, month: 3, day: 11 }, expect.objectContaining({ id: "lahore" }));
    fireEvent.click(screen.getByText("change date"));
    expect(predict).toHaveBeenLastCalledWith({ year: 2024, month: 4, day: 8 }, expect.objectContaining({ id: "lahore" }));
    expect(screen.getByText("2024-04-08")).toBeTruthy();
  });

  it("hides Yallop on return to Qalam without mutating deterministic conversion", () => {
    render(<Harness />);
    const before = convert("gregorian", { year: 2024, month: 3, day: 10 });
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "qalam" } });
    expect(screen.queryByLabelText("Observer location")).toBeNull();
    expect(convert("gregorian", { year: 2024, month: 3, day: 10 })).toEqual(before);
  });

  it("shows disclaimer for a non-evaluated outcome", () => {
    const predict = vi.fn((_: unknown, observer: NonNullable<ReturnType<typeof yallopObserver>>) => ({ status: "no-sunset" as const, observer, detail: "No sunset", observerLocalDate: "2024-03-11", evaluationWindowStartUtc: "2024-03-10T19:00:00.000Z" }));
    render(<Harness predict={predict} />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect(screen.getByText("A Yallop prediction is unavailable for this evaluation evening.")).toBeTruthy();
    expect(screen.getByText("Astronomical crescent-visibility prediction; not an official moon-sighting declaration.")).toBeTruthy();
  });

  it("uses Urdu RTL and English LTR", () => {
    const { container, rerender } = render(<Harness lang="ur" />);
    expect(container.querySelector('section[dir="rtl"]')).toBeTruthy();
    rerender(<Harness lang="en" />);
    expect(container.querySelector('section[dir="ltr"]')).toBeTruthy();
  });

  it("localizes observer display names without changing prediction identity", () => {
    const predict = vi.fn((value, place) => evaluated(place.id, `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`));
    const { rerender } = render(<Harness lang="ur" predict={predict} />);
    fireEvent.change(screen.getByLabelText("حساب کا طریقہ"), { target: { value: "yallop" } });
    expect(screen.getAllByText("کراچی")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("مقامِ مشاہدہ"), { target: { value: "lahore" } });
    expect(screen.getAllByText("لاہور")).toHaveLength(2);
    expect(predict).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ id: "lahore", name: "Lahore" }));
    rerender(<Harness lang="en" predict={predict} />);
    expect(screen.getAllByText("Lahore")).toHaveLength(2);
  });

  it("keeps scientific values and renders readable localized provenance", () => {
    const { rerender } = render(<Harness lang="en" />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("0.321")).toBeTruthy();
    expect(screen.getByText("Yallop Crescent Visibility — NAO Technical Note 69")).toBeTruthy();
    rerender(<Harness lang="ur" />);
    expect(screen.getByText("یالوپ رؤیتِ ہلال — این اے او ٹیکنیکل نوٹ 69")).toBeTruthy();
  });

  it("updates language direction and evaluated policy content without a stale result", () => {
    const { container, rerender } = render(<Harness lang="en" />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect(screen.getByText("This evening qualifies for next-day month start under current Qalam v1 policy")).toBeTruthy();
    rerender(<Harness lang="ur" />);
    expect(container.querySelector('section[dir="rtl"]')).toBeTruthy();
    expect(screen.getByText("یہ شام موجودہ قلم v1 پالیسی کے تحت اگلے دن کے آغازِ ماہ کے لیے موزوں ہے")).toBeTruthy();
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("uses the observer IANA timezone for local civil-date boundaries", () => {
    expect(observerLocalMidnightUtc({ year: 2024, month: 3, day: 11 }, "Asia/Karachi")).toBe("2024-03-10T19:00:00.000Z");
    expect(observerLocalMidnightUtc({ year: 2024, month: 3, day: 10 }, "America/New_York")).toBe("2024-03-10T05:00:00.000Z");
    expect(observerLocalMidnightUtc({ year: 2024, month: 3, day: 11 }, "UTC")).toBe("2024-03-11T00:00:00.000Z");
  });
});
