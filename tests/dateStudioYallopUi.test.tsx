/** @vitest-environment happy-dom */

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DateConverterContent from "../app/tools/date-converter/DateConverterContent";
import { YallopIntegration, type DateStudioMethod } from "../app/tools/date-converter/components/YallopIntegration";
import { observerLocalMidnightUtc, type DateStudioYallopPrediction } from "../app/tools/date-converter/utils/yallop/dateStudioPrediction";
import { yallopObserver } from "../app/tools/date-converter/utils/yallop/observerLocations";
import { convert } from "../app/tools/date-converter/utils/dateEngine";
import { interpretDateStudioMonthStart } from "../app/tools/date-converter/utils/yallop/dateStudioMonthStart";
import type { ResolvedHijriDate } from "../app/tools/date-converter/utils/hijri-authority/types";

const adapter = vi.hoisted(() => ({ predict: vi.fn() }));
const locale = vi.hoisted(() => ({ language: "en" as "en" | "ur" }));
const authority = vi.hoisted(() => ({ value: undefined as any }));

vi.mock("../app/tools/date-converter/utils/yallop/dateStudioPrediction", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/tools/date-converter/utils/yallop/dateStudioPrediction")>();
  return { ...actual, evaluateDateStudioYallopPrediction: adapter.predict };
});
vi.mock("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate")>();
  return { ...actual, resolvePakistanOfficialHijriDate: (gregorian: any) => authority.value === undefined ? actual.resolvePakistanOfficialHijriDate(gregorian) : authority.value };
});

vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: locale.language, dir: locale.language === "ur" ? "rtl" : "ltr", setLanguage: vi.fn() }) }));
vi.mock("../app/lib/analytics", () => ({ trackEvent: vi.fn(), trackToolOpenOnce: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));

afterEach(() => { locale.language = "en"; authority.value = undefined; cleanup(); });

function evaluated(observerId: string, localDate: string): DateStudioYallopPrediction {
  const observer = yallopObserver(observerId)!;
  return {
    status: "evaluated", observerLocalDate: localDate, evaluationWindowStartUtc: `${localDate}T00:00:00.000Z`,
    snapshot: { observer, conjunctionUtc: "2024-03-10T00:00:00.000Z", sunsetUtc: "2024-03-11T13:00:00.000Z", moonsetUtc: "2024-03-11T14:00:00.000Z", bestTimeUtc: "2024-03-11T13:26:40.000Z", arclDeg: 12, arcvDeg: 6, dazDeg: 3, moonGeocentricAltitudeDeg: 5, horizontalParallaxDeg: 1 },
    criterion: { arclDeg: 12, arcvDeg: 6, moonGeocentricAltitudeDeg: 5, horizontalParallaxDeg: 1, semidiameterDeg: 0.27, topocentricSemidiameterDeg: 0.28, widthArcMin: 0.4, q: 0.321, visibilityClass: "A" }, acceptedByPolicy: true,
    provenance: { method: "yallop", algorithm: "BD-Yallop-NAO-TN69", algorithmVersion: "phase-1.0.0", astronomyProvider: "Astronomy Engine", astronomyProviderVersion: "2.1.19", policyId: "yallop-naked-eye-ab-v1", observer, conjunctionUtc: "2024-03-10T00:00:00.000Z", sunsetUtc: "2024-03-11T13:00:00.000Z", moonsetUtc: "2024-03-11T14:00:00.000Z", bestTimeUtc: "2024-03-11T13:26:40.000Z", arclDeg: 12, arcvDeg: 6, widthArcMin: 0.4, q: 0.321, visibilityClass: "A", sourceType: "astronomical-prediction" },
  };
}

function officialContext(day: number, authority: "official" | "reported-official" = "official"): ResolvedHijriDate {
  return {
    hijri: { year: 1448, month: 3, day }, authority, anchorId: "test-anchor", providerId: "test-provider",
    providerLabel: { en: "Central Ruet-e-Hilal Committee", ur: "مرکزی رویتِ ہلال کمیٹی" }, sourceUrl: "https://example.invalid", sourceReference: "Test", verificationStatus: authority === "official" ? "verified" : "reported",
  };
}

function Harness({ lang = "en", predict, pakistanPredict, hijriDay = 29, hijriDayAuthority = "qalam-tabular", authorityContext }: { lang?: "en" | "ur"; predict?: any; pakistanPredict?: any; hijriDay?: number; hijriDayAuthority?: "official" | "reported-official" | "observed" | "qalam-tabular"; authorityContext?: ResolvedHijriDate | null }) {
  const [method, setMethod] = useState<DateStudioMethod>("qalam");
  const [observer, setObserver] = useState("karachi");
  const [date, setDate] = useState({ year: 2024, month: 3, day: 11 });
  const defaultPredict = (value: typeof date, place: NonNullable<ReturnType<typeof yallopObserver>>) => evaluated(place.id, `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`);
  return <><button onClick={() => setDate({ year: 2024, month: 4, day: 8 })}>change date</button><YallopIntegration lang={lang} method={method} onMethodChange={setMethod} observerId={observer} onObserverChange={setObserver} gregorian={date} hijriDay={hijriDay} hijriDayAuthority={hijriDayAuthority} authorityContext={authorityContext} predict={predict ?? defaultPredict} pakistanPredict={pakistanPredict} /></>;
}

function pakistanPrediction(illuminationPercent: number, elongationDeg: number) {
  const observer = yallopObserver("karachi")!;
  const illuminationOrElongationPasses = illuminationPercent >= 0.8 || elongationDeg >= 9;
  return { status: "evaluated", observerLocalDate: "2024-03-11", evaluationWindowStartUtc: "2024-03-10T19:00:00.000Z", snapshot: { observer, sunsetUtc: "2024-03-11T13:00:00.000Z", moonsetUtc: "2024-03-11T14:00:00.000Z", altitudeDeg: 7, widthArcMin: 0.2, illuminationPercent, elongationDeg, lagMinutes: 60 }, criterion: { altitudeDeg: 7, widthArcMin: 0.2, illuminationPercent, elongationDeg, lagMinutes: 60, altitudePasses: true, widthPasses: true, illuminationOrElongationPasses, lagPasses: true, qualifies: illuminationOrElongationPasses }, provenance: { method: "Pakistan 5-Year Calendar Criterion", criterionId: "test", criterionVersion: "test", astronomyProvider: "Astronomy Engine", sourceUrl: "https://example.invalid", sourceType: "astronomical-prediction", altitudeConvention: "test", crescentWidthConvention: "test", evaluationInstant: "local sunset", illuminationConvention: "test" } } as const;
}

describe("Date Studio Yallop integration", () => {
  it.each([
    [0.8, 8.9, "≥ 0.8% · Pass", "≥ 9° · Fail", "illumination ≥ 0.8% OR elongation ≥ 9° · Pass"],
    [0.7, 9, "≥ 0.8% · Fail", "≥ 9° · Pass", "illumination ≥ 0.8% OR elongation ≥ 9° · Pass"],
    [0.7, 8.9, "≥ 0.8% · Fail", "≥ 9° · Fail", "illumination ≥ 0.8% OR elongation ≥ 9° · Fail"],
  ])("renders deterministic Pakistan illumination/elongation OR states", (illumination, elongation, illuminationState, elongationState, combinedState) => {
    render(<Harness pakistanPredict={() => pakistanPrediction(illumination, elongation)} />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "pakistan-5year" } });
    expect(screen.getByText(illuminationState)).toBeTruthy();
    expect(screen.getByText(elongationState)).toBeTruthy();
    expect(screen.getByText(combinedState)).toBeTruthy();
  });
  it("renders the independent Pakistan five-year criterion with localized selected observers", () => {
    const { rerender } = render(<Harness />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "pakistan-5year" } });
    expect(screen.getByText("Crescent conditions", { exact: false })).toBeTruthy();
    expect(screen.getByText("Moon altitude")).toBeTruthy();
    expect(screen.getByText("Scientific crescent-visibility calculation; not an official moon-sighting declaration.")).toBeTruthy();
    rerender(<Harness lang="ur" />);
    fireEvent.change(screen.getByLabelText("حساب کا طریقہ"), { target: { value: "pakistan-5year" } });
    expect(screen.getAllByText("پاکستان پانچ سالہ قمری تقویم معیار").length).toBeGreaterThan(1);
    expect(screen.getAllByText("کراچی").length).toBeGreaterThan(1);
  });
  it.each([
    [29, true, "day29_qualifies"], [29, false, "day29_does_not_qualify"],
    [30, true, "day30_forced_next_month"], [30, false, "day30_forced_next_month"],
    [15, true, "not_month_boundary"],
  ] as const)("interprets Hijri day %s independently of Yallop science", (day, accepted, expected) => {
    expect(interpretDateStudioMonthStart(day, accepted, "official")).toMatchObject({ state: expected, authority: "official" });
  });
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

  it("passes the resolved official day-30 context to Date Studio without changing the conversion", () => {
    adapter.predict.mockImplementation((value, place) => evaluated(place.id, `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`));
    const { container } = render(<DateConverterContent />);
    fireEvent.click(screen.getByText("Hijri"));
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: "1" } });
    fireEvent.change(container.querySelectorAll("select")[1], { target: { value: "4" } });
    fireEvent.change(numbers[1], { target: { value: "1448" } });
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });

    expect(adapter.predict).toHaveBeenLastCalledWith({ year: 2026, month: 9, day: 13 }, expect.objectContaining({ id: "karachi" }));
    expect(screen.getByText("Current lunar situation")).toBeTruthy();
    expect(screen.getByText("Pakistan official Hijri date")).toBeTruthy();
    expect(screen.getByText("30 Rabi al-Awwal 1448 AH")).toBeTruthy();
    expect(screen.getByText("Today is the 30th day of the current Hijri month. Therefore, tomorrow is necessarily the first day of the next Hijri month.")).toBeTruthy();
  });

  it("makes a valid Pakistan official date primary without rendering a competing tabular date", () => {
    adapter.predict.mockImplementation((value, place) => evaluated(place.id, `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`));
    const deterministic = convert("gregorian", { year: 2026, month: 9, day: 13 });
    expect(deterministic.hijri).toEqual({ year: 1448, month: 4, day: 1 });
    const { container } = render(<DateConverterContent />);
    fireEvent.click(screen.getAllByText("Gregorian").find(element => element.tagName === "BUTTON")!);
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: "13" } });
    fireEvent.change(container.querySelectorAll("select")[1], { target: { value: "9" } });
    fireEvent.change(numbers[1], { target: { value: "2026" } });

    expect(screen.getByText("Pakistan official Hijri date")).toBeTruthy();
    expect(screen.getByText("30 Rabi al-Awwal 1448 AH")).toBeTruthy();
    expect(screen.queryByText("Qalam calculated Hijri date")).toBeNull();
    expect(screen.queryByText("1 Rabi al-Thani 1448 AH")).toBeNull();
    expect(deterministic).toEqual(convert("gregorian", { year: 2026, month: 9, day: 13 }));
  });

  it("keeps the deterministic Hijri date primary when no Pakistan authority is available", () => {
    const { container } = render(<DateConverterContent />);
    fireEvent.click(screen.getAllByText("Gregorian").find(element => element.tagName === "BUTTON")!);
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: "1" } });
    fireEvent.change(container.querySelectorAll("select")[1], { target: { value: "1" } });
    fireEvent.change(numbers[1], { target: { value: "2027" } });

    expect(screen.queryByText("Pakistan official Hijri date")).toBeNull();
    expect(screen.getByText("Calculated Hijri date")).toBeTruthy();
  });

  it("uses the official Urdu label without rendering a competing calculated date", () => {
    locale.language = "ur";
    const { container } = render(<DateConverterContent />);
    fireEvent.click(screen.getAllByText("عیسوی").find(element => element.tagName === "BUTTON")!);
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: "13" } });
    fireEvent.change(container.querySelectorAll("select")[1], { target: { value: "9" } });
    fireEvent.change(numbers[1], { target: { value: "2026" } });

    expect(screen.getByText("پاکستان کی سرکاری ہجری تاریخ")).toBeTruthy();
    expect(screen.queryByText("قلم کی حسابی ہجری تاریخ")).toBeNull();
  });

  it("uses the calculated Urdu label when Pakistan authority is unavailable", () => {
    locale.language = "ur";
    const { container } = render(<DateConverterContent />);
    fireEvent.click(screen.getAllByText("عیسوی").find(element => element.tagName === "BUTTON")!);
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: "1" } });
    fireEvent.change(container.querySelectorAll("select")[1], { target: { value: "1" } });
    fireEvent.change(numbers[1], { target: { value: "2027" } });

    expect(screen.getByText("حسابی ہجری تاریخ")).toBeTruthy();
    expect(screen.queryByText("پاکستان کی سرکاری ہجری تاریخ")).toBeNull();
  });

  it("keeps reported-official authority distinct without rendering the tabular date", () => {
    authority.value = officialContext(30, "reported-official");
    const { container } = render(<DateConverterContent />);
    fireEvent.click(screen.getAllByText("Gregorian").find(element => element.tagName === "BUTTON")!);
    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: "14" } });
    fireEvent.change(container.querySelectorAll("select")[1], { target: { value: "9" } });
    fireEvent.change(numbers[1], { target: { value: "2026" } });

    expect(screen.getByText("Reported official Pakistan Hijri date")).toBeTruthy();
    expect(screen.queryByText("Pakistan official Hijri date")).toBeNull();
    expect(screen.queryByText("Qalam calculated Hijri date")).toBeNull();
  });

  it("is opt-in and presents an independent astronomical result when no official date exists", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect((screen.getByLabelText("Observer location") as HTMLSelectElement).value).toBe("karachi");
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("0.321")).toBeTruthy();
    expect(screen.getByText("Astronomical visibility")).toBeTruthy();
    expect(screen.getByText("Crescent visibility conditions are favorable this evening.")).toBeTruthy();
    expect(screen.queryByText("Yallop policy result")).toBeNull();
    expect(screen.queryByText("Next-day month-start policy")).toBeNull();
    expect(screen.getByText("Astronomical crescent-visibility prediction; not an official moon-sighting declaration.")).toBeTruthy();
  });

  it("keeps accepted and rejected Yallop visibility visible without inferring official authority", () => {
    const rejected = vi.fn((value, place) => ({ ...evaluated(place.id, `${value.year}-03-11`), acceptedByPolicy: false }));
    const { rerender } = render(<Harness hijriDay={1} />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect(screen.getByText("Crescent visibility conditions are favorable this evening.")).toBeTruthy();
    expect(screen.queryByText("Pakistan official Hijri date")).toBeNull();

    rerender(<Harness predict={rejected} hijriDay={15} />);
    expect(screen.getByText("Crescent visibility conditions do not qualify for next-day month start under the current Qalam Yallop policy.")).toBeTruthy();
    expect(screen.queryByText("Pakistan official Hijri date")).toBeNull();
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

  it("uses conditional day-29 wording and never states that tomorrow definitely starts the month", () => {
    render(<Harness hijriDay={29} hijriDayAuthority="official" authorityContext={officialContext(29)} />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect(screen.getByText("Current lunar situation")).toBeTruthy();
    expect(screen.getByText("Crescent visibility conditions are favorable this evening in Karachi.")).toBeTruthy();
    expect(screen.getByText("According to the current Qalam Yallop policy, tomorrow may begin the new Hijri month, subject to the official moon-sighting decision.")).toBeTruthy();
    expect(screen.queryByText(/tomorrow is necessarily the first day/i)).toBeNull();
    const disclaimer = screen.getByText("Astronomical crescent-visibility prediction; not an official moon-sighting declaration.");
    const scientificDetails = screen.getByText("Scientific details");
    expect(disclaimer.compareDocumentPosition(scientificDetails) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText("Astronomical crescent-visibility prediction; not an official moon-sighting declaration.")).toHaveLength(1);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("keeps the official day-30 calendar conclusion independent from rejected Yallop visibility", () => {
    const rejected = vi.fn((value, place) => ({ ...evaluated(place.id, `${value.year}-03-11`), acceptedByPolicy: false }));
    render(<Harness predict={rejected} hijriDay={30} hijriDayAuthority="official" authorityContext={officialContext(30)} />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    const visibility = screen.getByText("Astronomical visibility");
    const consequence = screen.getByText("Today is the 30th day of the current Hijri month. Therefore, tomorrow is necessarily the first day of the next Hijri month.");
    const disclaimer = screen.getByText("Astronomical crescent-visibility prediction; not an official moon-sighting declaration.");
    const scientificDetails = screen.getByText("Scientific details");
    expect(visibility.compareDocumentPosition(consequence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(consequence.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disclaimer.compareDocumentPosition(scientificDetails) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText("Crescent visibility conditions do not qualify for next-day month start under the current Qalam Yallop policy.")).toHaveLength(1);
    expect(screen.getAllByText("Today is the 30th day of the current Hijri month. Therefore, tomorrow is necessarily the first day of the next Hijri month.")).toHaveLength(1);
  });

  it("does not show a calendar outlook away from an official month boundary", () => {
    render(<Harness hijriDay={15} />);
    fireEvent.change(screen.getByLabelText("Calculation method"), { target: { value: "yallop" } });
    expect(screen.queryByText("Month-start outlook")).toBeNull();
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("0.321")).toBeTruthy();
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
    expect(screen.getByText("Crescent visibility conditions are favorable this evening.")).toBeTruthy();
    rerender(<Harness lang="ur" />);
    expect(container.querySelector('section[dir="rtl"]')).toBeTruthy();
    expect(screen.getByText("آج شام ہلال کی رؤیت کے حالات موافق ہیں۔")).toBeTruthy();
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("keeps authority explicit for future official or observed Hijri-day providers", () => {
    expect(interpretDateStudioMonthStart(30, false, "official")).toEqual({ state: "day30_forced_next_month", authority: "official" });
    expect(interpretDateStudioMonthStart(29, true, "observed")).toEqual({ state: "day29_qualifies", authority: "observed" });
  });

  it("uses the official day-30 calendar interpretation independently of Yallop acceptance", () => {
    expect(interpretDateStudioMonthStart(30, true, "official")).toEqual({ state: "day30_forced_next_month", authority: "official" });
    expect(interpretDateStudioMonthStart(30, false, "official")).toEqual({ state: "day30_forced_next_month", authority: "official" });
  });

  it("uses Urdu day-29 wording that remains conditional on the official decision", () => {
    render(<Harness lang="ur" hijriDay={29} hijriDayAuthority="official" authorityContext={officialContext(29)} />);
    fireEvent.change(screen.getByLabelText("حساب کا طریقہ"), { target: { value: "yallop" } });
    expect(screen.getByText("موجودہ قلم یالوپ پالیسی کے مطابق کل نئے قمری مہینے کا آغاز ہو سکتا ہے، تاہم سرکاری آغاز مرکزی رویتِ ہلال کمیٹی کے فیصلے پر منحصر ہوگا۔")).toBeTruthy();
  });

  it("uses the observer IANA timezone for local civil-date boundaries", () => {
    expect(observerLocalMidnightUtc({ year: 2024, month: 3, day: 11 }, "Asia/Karachi")).toBe("2024-03-10T19:00:00.000Z");
    expect(observerLocalMidnightUtc({ year: 2024, month: 3, day: 10 }, "America/New_York")).toBe("2024-03-10T05:00:00.000Z");
    expect(observerLocalMidnightUtc({ year: 2024, month: 3, day: 11 }, "UTC")).toBe("2024-03-11T00:00:00.000Z");
  });
});
