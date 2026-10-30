/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CrescentVisibilityContent from "../app/tools/crescent-visibility/CrescentVisibilityContent";
import { getPakistanThirtyDayMonthOutlook } from "../app/tools/crescent-visibility/utils/pakistanThirtyDayMonthOutlook";

const locale = vi.hoisted(() => ({ language: "en" }));
const observer = (id: string, name: string) => ({ id, name, latitudeDeg: 25, longitudeDeg: 67, elevationMeters: 0, timezone: "Asia/Karachi" });
const locations = ["Gilgit", "Peshawar", "Islamabad", "Lahore", "Muzaffarabad", "Quetta", "Karachi", "Jiwani"].map((name, index) => ({ observer: observer(name.toLowerCase(), name), prediction: { status: "evaluated", criterion: { qualifies: index === 0, altitudeDeg: 8.12, widthArcMin: 0.456, illuminationPercent: 0.8, elongationDeg: 9.11, lagMinutes: 42.3 } } }));
const yallopLocations = locations.map(({ observer }, index) => ({ observer, prediction: { status: "evaluated", criterion: { visibilityClass: index === 0 ? "A" : "C", q: index === 0 ? 2.4952 : -0.1234 }, acceptedByPolicy: index === 0 } }));
const yallopClassCounts = { A: 1, B: 0, C: 7, D: 0, E: 0, F: 0 };

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children?: ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: locale.language }) }));
vi.mock("../app/tools/date-converter/utils/pakistan-crescent/nationalPrediction", () => ({ evaluatePakistanNationalCrescentPrediction: vi.fn(() => ({ locations, qualifies: true })) }));
vi.mock("../app/tools/date-converter/utils/yallop/nationalReferencePrediction", () => ({ evaluateYallopNationalReferencePrediction: vi.fn(() => ({ locations: yallopLocations, anyAcceptedByPolicy: true, classCounts: yallopClassCounts })) }));
vi.mock("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate", () => ({ resolvePakistanOfficialHijriDate: vi.fn(() => null) }));
vi.mock("../app/tools/date-converter/utils/hijri-authority/resolveOfficialSightingDecision", () => ({ resolvePakistanOfficialSightingDecisionForEvening: vi.fn(() => null) }));
vi.mock("../app/tools/crescent-visibility/utils/upcomingCrescentEvenings", () => ({
  getUpcomingPakistanCrescentEvenings: vi.fn(() => [
    { dateIso: "2026-11-10", evening: { year: 2026, month: 11, day: 10 }, targetHijriYear: 1448, targetHijriMonth: 6, dateSource: "official" },
    { dateIso: "2026-12-10", evening: { year: 2026, month: 12, day: 10 }, targetHijriYear: 1448, targetHijriMonth: 7, dateSource: "scientific" },
  ]),
}));

describe("crescent visibility dashboard", () => {
  afterEach(() => { window.history.replaceState(null, "", "/tools/crescent-visibility"); });
  afterEach(() => { locale.language = "en"; locations.forEach((location, index) => { location.prediction.criterion.qualifies = index === 0; }); yallopLocations.forEach((location, index) => { location.prediction.criterion.visibilityClass = index === 0 ? "A" : "C"; location.prediction.acceptedByPolicy = index === 0; }); Object.assign(yallopClassCounts, { A: 1, B: 0, C: 7, D: 0, E: 0, F: 0 }); });
  it("explains why an unfavorable 10 November produces 12 November as the forecast month start", () => {
    const fixture = { locations: locations.map((item) => ({ ...item, prediction: { ...item.prediction, criterion: { ...item.prediction.criterion, qualifies: false } } })), qualifies: false } as never;
    const resolve = (d: {year:number;month:number;day:number}) => ({
      hijri: d.day === 10 ? {year:1448,month:5,day:29}
        : d.day === 11 ? {year:1448,month:5,day:30}
        : {year:1448,month:6,day:1},
      source: d.day===10 ? "official" as const : "scientific" as const,
    });
    const result = getPakistanThirtyDayMonthOutlook({year:2026,month:11,day:10}, fixture, null, resolve);
    expect(result?.dayThirty).toEqual({year:2026,month:11,day:11});
    expect(result?.dayOne).toEqual({year:2026,month:11,day:12});
    expect(result?.nextHijriMonth).toBe(6);
    expect(getPakistanThirtyDayMonthOutlook({year:2026,month:11,day:10}, fixture,
      {sightingDecision:"sighted"} as never, resolve)).toBeNull();
    expect(getPakistanThirtyDayMonthOutlook({year:2026,month:11,day:10}, fixture,
      null, d=>({...resolve(d),source:"tabular" as const}))).toBeNull();
  });

  it("refuses to promise a first date if the astronomical status is incomplete", () => {
    const fixture = { locations: locations.map((item, i) => i === 0
      ? {...item,prediction:{status:"no-sunset"}}
      : {...item,prediction:{ ...item.prediction, criterion:{ ...item.prediction.criterion, qualifies:false } }}), qualifies:false } as never;
    const resolve = (d: {day:number}) => ({hijri:{year:1448,month:5,day:d.day===10?29:30},source:"official" as const});
    expect(getPakistanThirtyDayMonthOutlook({year:2026,month:11,day:10},fixture,null,resolve)).toBeNull();
  });

  it("jumps to a chosen upcoming lunar month and updates the shareable selected evening", () => {
    render(<CrescentVisibilityContent />);
    const shortcuts = screen.getByTestId("upcoming-crescent-months");
    expect(shortcuts.querySelectorAll("button")).toHaveLength(2);
    const nextMonth = screen.getByTestId("upcoming-crescent-month-0");
    expect(nextMonth.getAttribute("aria-label")).toContain("Jumada al-Thani 1448");
    fireEvent.click(nextMonth);
    expect((screen.getByLabelText("Change date") as HTMLInputElement).value).toBe("2026-11-10");
    expect(window.location.search).toBe("?date=2026-11-10");
    expect(nextMonth.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("upcoming-crescent-month-1"));
    expect((screen.getByLabelText("Change date") as HTMLInputElement).value).toBe("2026-12-10");
    expect(window.location.search).toBe("?date=2026-12-10");
    expect(screen.getAllByText("10 December 2026").length).toBeGreaterThan(0);
  });

  it("opens a bookmarked observation date and retains the date picker", async () => {
    window.history.replaceState(null, "", "/tools/crescent-visibility?date=2026-12-10");
    render(<CrescentVisibilityContent />);
    await waitFor(() => expect((screen.getByLabelText("Change date") as HTMLInputElement).value).toBe("2026-12-10"));
    expect(screen.getByTestId("upcoming-crescent-month-1").getAttribute("aria-pressed")).toBe("true");
  });

  it("shows Urdu month names for the shortcut without treating predictions as official", () => {
    locale.language = "ur";
    render(<CrescentVisibilityContent />);
    expect(screen.getByText("کس مہینے کا چاند دیکھنا ہے؟")).toBeTruthy();
    expect(screen.getByRole("main").getAttribute("data-crescent-ui")).toBe("ur");
    expect(screen.getByTestId("upcoming-crescent-month-0").textContent).toContain("جمادی الثانی");
    expect(screen.getByTestId("upcoming-crescent-month-1").textContent).toContain("سائنسی حساب");
    expect(screen.queryByText(/چاند نظر آنے کی ضمانت نہیں/)).toBeNull();
  });

  it("shows a friendly national result with genuine location measurements and a clear non-official label", () => {
    render(<CrescentVisibilityContent />);
    const summary = screen.getByTestId("crescent-simple-result");
    expect((screen.getByTestId("crescent-simple-details") as HTMLDetailsElement).open).toBe(false);
    expect((screen.getByTestId("crescent-deep-details") as HTMLDetailsElement).open).toBe(false);
    expect(summary.textContent).toContain("Crescent visibility in Pakistan");
    expect(screen.getByTestId("crescent-simple-headline").textContent).toBe("The crescent may be visible");
    expect(screen.getByTestId("crescent-simple-national-count").textContent).toContain("1 of 8");
    expect(screen.getByTestId("crescent-simple-metrics").textContent).toContain("9.1");
    expect(screen.getByTestId("crescent-simple-metrics").textContent).toContain("42.3");
    expect(summary.textContent).not.toContain("official decision");
    expect(screen.getByRole("link", { name: "More details" }).getAttribute("href")).toBe("#crescent-simple-details");
    expect(screen.getByText("Detailed scientific research")).toBeTruthy();
    expect(screen.getByTestId("crescent-quick-location")).toBeTruthy();
  });

  it("switches the locally explained figures without changing the national decision", () => {
    locations[1].prediction.criterion.elongationDeg = 12.7;
    try {
      render(<CrescentVisibilityContent />);
      const choice = screen.getByTestId("crescent-quick-location") as HTMLSelectElement;
      fireEvent.change(choice, { target: { value: "peshawar" } });
      expect(choice.value).toBe("peshawar");
      expect(screen.getByTestId("crescent-simple-metrics").textContent).toContain("12.7");
      expect(screen.getByTestId("crescent-simple-national-count").textContent).toContain("1 of 8");
    } finally {
      locations[1].prediction.criterion.elongationDeg = 9.11;
    }
  });

  it("shares the real selected national result and date link without a fabricated source", async () => {
    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CrescentVisibilityContent />);
    fireEvent.change(screen.getByLabelText("Change date"), { target: { value: "2026-11-10" } });
    fireEvent.click(screen.getByTestId("crescent-share-result"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copy = String(writeText.mock.calls[0]?.[0] ?? "");
    expect(copy).toContain("2026-11-10");
    expect(copy).toContain("The crescent may be visible");
    expect(copy).not.toContain("not an official announcement");
    expect(copy).toContain("qalamworks.com/tools/crescent-visibility?date=2026-11-10");
    expect(screen.getByText("Result copied")).toBeTruthy();
  });

  it("shows three source-separated outcomes and measured scientific table", () => {
    render(<CrescentVisibilityContent />);
    const states = screen.getByTestId("crescent-three-outcomes");
    expect(states.querySelectorAll("p")).toHaveLength(2);
    expect(states.textContent).toContain("Pakistan:");
    expect(states.textContent).toContain("Second scientific check:");
    expect(states.textContent).toContain("1 of 8");
    const measures = screen.getByTestId("crescent-simple-metrics");
    expect(measures.querySelectorAll("div")).toHaveLength(4);
    expect(measures.textContent).toContain("9.1");
    expect(measures.textContent).toContain("42.3");
    expect(screen.queryByRole("link", { name: "Share feedback" })).toBeNull();
  });

  it("highlights Ramadan among live month cards without hard-coded dates", async () => {
    const module = await import("../app/tools/crescent-visibility/utils/upcomingCrescentEvenings");
    const ramadanDates = [{ dateIso: "2027-02-07", evening: { year: 2027, month: 2, day: 7 }, targetHijriYear: 1448, targetHijriMonth: 9, dateSource: "scientific" as const }];
    vi.mocked(module.getUpcomingPakistanCrescentEvenings)
      .mockReturnValueOnce(ramadanDates)
      .mockReturnValueOnce(ramadanDates)
      .mockReturnValueOnce(ramadanDates);
    render(<CrescentVisibilityContent />);
    const ramadan = screen.getByTestId("upcoming-crescent-month-0");
    expect(ramadan.textContent).toContain("Ramadan");
    expect(ramadan.textContent).toContain("7 February 2027");
    expect(ramadan.textContent).toContain("See result");
    expect(ramadan.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(ramadan);
    expect((screen.getByLabelText("Change date") as HTMLInputElement).value).toBe("2027-02-07");
  });

  it("presents national science without a public city selector", () => {
    render(<CrescentVisibilityContent />);
    expect(screen.getByRole("heading", { name: "Moon Sighting — Pakistan" })).toBeTruthy();
    fireEvent.click(screen.getByText("View the complete scientific research"));
    expect(screen.getByRole("link", { name: /Back to Date Converter/i }).getAttribute("href")).toBe("/tools/date-converter#date-studio");
    expect(screen.getByText("Scientific and astronomical outlook")).toBeTruthy();
    expect(screen.getAllByText("1 of 8 prescribed national observation locations meet the scientific crescent-visibility criterion.").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Pakistan scientific criterion" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "International astronomical model" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 of 8 reference locations have favorable visibility conditions.").length).toBeGreaterThan(0);
    expect(screen.queryByText("Pakistan official Hijri date unavailable")).toBeNull();
    expect(screen.queryByText("Official historical decision")).toBeNull();
    expect(screen.queryByText("Month-start implication")).toBeNull();
    expect(screen.queryByText(/Pakistan-wide crescent visibility map is temporarily unavailable/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Karachi" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Islamabad" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Other cities" })).toBeNull();
    expect(screen.queryByText("Selected location details")).toBeNull();
    expect(screen.queryByText(/Calculated Hijri date/)).toBeNull();
    expect(screen.queryByLabelText("Pakistan-wide scientific visibility map")).toBeNull();
    expect(screen.queryByText(/winner|accuracy|correct method|wrong method/i)).toBeNull();
  });

  it("centers Urdu introductory guidance and reference cards, removes repetitive sections and writes صفر", () => {
    locale.language = "ur";
    locations.forEach(location => { location.prediction.criterion.qualifies = false; });
    yallopLocations.forEach(location => { location.prediction.acceptedByPolicy = false; });
    render(<CrescentVisibilityContent />);
    const introduction = screen.getByText("مہینہ چنیں اور دیکھیں کہ پاکستان میں چاند نظر آنے کے کیا امکانات ہیں۔");
    expect(introduction.getAttribute("data-crescent-intro")).not.toBeNull();
    expect(introduction.className).toContain("text-center");
    const references = screen.getByTestId("crescent-three-reference-cards");
    expect(references.className).toContain("text-center");
    expect(references.textContent).toContain("کوئی مقام");
    expect(screen.getByTestId("crescent-simple-national-count").textContent).toContain("صفر");
    expect(screen.queryByText("آغازِ ماہ کا امکان")).toBeNull();
    expect(screen.queryByText("سرکاری تاریخی فیصلہ")).toBeNull();
    const text = screen.getByRole("main").textContent ?? "";
    expect(text).not.toContain("چاند نظر آنے کی ضمانت نہیں");
    expect(text).not.toContain("یہ ہمارا سائنسی اندازہ ہے؛");
    expect(text).not.toContain("۰ مقامات");
    expect(text).not.toContain("کوئی سرکاری آغازِ ماہ کا نتیجہ اخذ نہیں کیا گیا");
  });

  it("keeps diagnostics in scientific details and national Urdu wording", () => {
    locale.language = "ur";
    render(<CrescentVisibilityContent />);
    expect(screen.getByRole("heading", { name: "رؤیتِ ہلال — پاکستان" })).toBeTruthy();
    fireEvent.click(screen.getByText("مکمل سائنسی تحقیق دیکھیں"));
    expect(screen.getByRole("link", { name: /تاریخ کنورٹر پر واپس/ }).getAttribute("href")).toBe("/tools/date-converter#date-studio");
    expect(screen.getByText("سائنسی اور فلکیاتی جائزہ")).toBeTruthy();
    expect(screen.getAllByText("8 میں سے 1 مقررہ قومی مشاہداتی مقامات رؤیتِ ہلال کے سائنسی معیار پر پورا اترتے ہیں۔").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "پاکستانی سائنسی معیار" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "بین الاقوامی سائنسی ماڈل" }).length).toBeGreaterThan(0);
    const details = screen.getByText("مزید سائنسی تفصیلات").closest("details");
    expect(details?.open).toBe(false);
    fireEvent.click(screen.getByText("مزید سائنسی تفصیلات"));
    expect(details?.open).toBe(true);
    for (const name of ["گلگت", "پشاور", "اسلام آباد", "لاہور", "مظفرآباد", "کوئٹہ", "کراچی", "جیوانی"]) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    locale.language = "en";
  });

  it("renders readable Pakistan and Yallop diagnostic badges with formatted scientific values", () => {
    render(<CrescentVisibilityContent />);
    fireEvent.click(screen.getByText("View the complete scientific research"));
    fireEvent.click(screen.getByText("Scientific details"));
    expect(screen.getAllByText("Favorable conditions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unfavorable conditions").length).toBeGreaterThan(0);
    expect(screen.getByTestId("scientific-location-grid").textContent).toContain("Class A");
    expect(screen.getByTestId("scientific-location-grid").textContent).toContain("Class C");
    expect(screen.getByTestId("scientific-location-grid").textContent).toContain("q = 2.495");
    expect(screen.getByTestId("scientific-location-grid").textContent).toContain("q = -0.123");
    for (const label of ["Altitude (degrees)", "Crescent width (arcminutes)", "Illuminated fraction", "Elongation (degrees)", "Moonset lag"]) expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(8);
    expect(screen.getByTestId("scientific-location-grid").className).toContain("md:grid-cols-2");
  });

  it("offers accessible conservative Yallop class help without claiming official status", () => {
    render(<CrescentVisibilityContent />);
    const help = screen.getByRole("button", { name: "About the Yallop model" });
    expect(help.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(help);
    expect(help.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/This is an international astronomical model/)).toBeTruthy();
  });

  it("does not call science or authority resolvers for invalid dates", async () => {
    const national = await import("../app/tools/date-converter/utils/pakistan-crescent/nationalPrediction");
    const yallop = await import("../app/tools/date-converter/utils/yallop/nationalReferencePrediction");
    const authority = await import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate");
    const decision = await import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialSightingDecision");
    render(<CrescentVisibilityContent />);
    vi.mocked(national.evaluatePakistanNationalCrescentPrediction).mockClear(); vi.mocked(yallop.evaluateYallopNationalReferencePrediction).mockClear(); vi.mocked(authority.resolvePakistanOfficialHijriDate).mockClear(); vi.mocked(decision.resolvePakistanOfficialSightingDecisionForEvening).mockClear();
    fireEvent.change(screen.getByLabelText("Change date"), { target: { value: "1899-12-31" } });
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(national.evaluatePakistanNationalCrescentPrediction).not.toHaveBeenCalled(); expect(yallop.evaluateYallopNationalReferencePrediction).not.toHaveBeenCalled(); expect(authority.resolvePakistanOfficialHijriDate).not.toHaveBeenCalled(); expect(decision.resolvePakistanOfficialSightingDecisionForEvening).not.toHaveBeenCalled();
  });

  it.each(["1900-01-01", "2100-12-31"])("accepts supported boundary date %s", value => {
    render(<CrescentVisibilityContent />); const input = screen.getByLabelText("Change date") as HTMLInputElement;
    expect(input.min).toBe("1900-01-01"); expect(input.max).toBe("2100-12-31"); fireEvent.change(input, { target: { value } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("uses count-aware all, partial, and zero national summaries without changing the any-location rule", () => {
    locations.forEach(location => { location.prediction.criterion.qualifies = true; });
    yallopLocations.forEach(location => { location.prediction.criterion.visibilityClass = "A"; location.prediction.acceptedByPolicy = true; });
    Object.assign(yallopClassCounts, { A: 8, B: 0, C: 0, D: 0, E: 0, F: 0 });
    const view = render(<CrescentVisibilityContent />);
    expect(screen.getAllByText("All 8 prescribed national observation locations meet the scientific crescent-visibility criterion.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Visibility conditions are very favorable across all 8 reference locations.").length).toBeGreaterThan(0);
    view.unmount();
    locations.forEach(location => { location.prediction.criterion.qualifies = false; });
    yallopLocations.forEach(location => { location.prediction.criterion.visibilityClass = "C"; location.prediction.acceptedByPolicy = false; });
    Object.assign(yallopClassCounts, { A: 0, B: 0, C: 8, D: 0, E: 0, F: 0 });
    render(<CrescentVisibilityContent />);
    expect(screen.getAllByText("None of Pakistan's prescribed national observation locations currently meets the scientific crescent-visibility criterion.").length).toBeGreaterThan(0);
  });

  it("does not advertise day-ten waxing Moon visibility as a new crescent result", async () => {
    const authority = await import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate");
    vi.mocked(authority.resolvePakistanOfficialHijriDate).mockReturnValue({
      hijri: { year: 1447, month: 9, day: 10 }, authority: "official",
      anchorId: "pk-1447-ramadan-2026-02-19", providerId: "pk-central-ruet-e-hilal-committee",
      providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رویتِ ہلال کمیٹی" },
      sourceUrl: "https://www.radio.gov.pk/18-02-2026/moon-sighted-first-ramadan-on-thursday",
      sourceReference: "Verified", verificationStatus: "verified",
    });
    locations.forEach(location => { location.prediction.criterion.qualifies = true; });
    yallopLocations.forEach(location => { location.prediction.acceptedByPolicy = true; location.prediction.criterion.visibilityClass = "A"; });
    Object.assign(yallopClassCounts, { A: 8, B: 0, C: 0, D: 0, E: 0, F: 0 });
    render(<CrescentVisibilityContent />);
    fireEvent.change(screen.getByLabelText("Change date"), { target: { value: "2026-02-28" } });
    expect(screen.getAllByText("10 Ramadan 1447 AH").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("crescent-predicted-first-day")).toBeNull();
    expect(screen.queryByText("Very favorable ✓")).toBeNull();
    expect(screen.queryByText("Meets criterion ✓")).toBeNull();
    expect(screen.getByTestId("crescent-simple-headline").textContent).toContain("Not a new crescent evening");
    vi.mocked(authority.resolvePakistanOfficialHijriDate).mockReturnValue(null);
  });

  it("shows the verified official Rabi al-Thani date without a calculated fallback", async () => {
    const authority = await import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate");
    vi.mocked(authority.resolvePakistanOfficialHijriDate).mockReturnValue({ hijri: { year: 1448, month: 4, day: 1 }, authority: "official", anchorId: "pk-1448-rabi-al-thani-2026-09-14", providerId: "pk-ministry-religious-affairs-central-ruet-e-hilal", providerLabel: { en: "Pakistan Ministry of Religious Affairs / Central Ruet-e-Hilal Committee", ur: "وزارتِ مذہبی امور پاکستان / مرکزی رویتِ ہلال کمیٹی" }, sourceUrl: "https://example.invalid", sourceReference: "Test", verificationStatus: "verified" });
    render(<CrescentVisibilityContent />);
    expect(screen.queryByText("Pakistan official Hijri date")).toBeNull();
    expect(screen.getByTestId("crescent-science-summary")).toBeTruthy();
    expect(screen.queryByText("Pakistan official Hijri date unavailable")).toBeNull();
    expect(screen.queryByText(/Calculated Hijri date/)).toBeNull();
    vi.mocked(authority.resolvePakistanOfficialHijriDate).mockReturnValue(null);
  });

  it("shows an official banner only for an exact reviewed sighting decision", async () => {
    const decision = await import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialSightingDecision");
    const reviewedDecision = { id: "decision", sightingDecision: "not-sighted", providerLabel: { en: "Central Ruet-e-Hilal Committee", ur: "مرکزی رویتِ ہلال کمیٹی" }, sourceReference: "Reviewed source" } as never;
    vi.mocked(decision.resolvePakistanOfficialSightingDecisionForEvening).mockImplementation(date => date.day === 12 ? reviewedDecision : null);
    render(<CrescentVisibilityContent />);
    fireEvent.change(screen.getByLabelText("Change date"), { target: { value: "2026-09-12" } });
    fireEvent.click(screen.getByText("View the complete scientific research"));
    expect(screen.queryByRole("heading", { name: "Official Pakistan moon-sighting decision" })).toBeNull();
    expect(screen.getByTestId("crescent-science-summary")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Change date"), { target: { value: "2026-09-13" } });
    expect(screen.queryByRole("heading", { name: "Official Pakistan moon-sighting decision" })).toBeNull();
    vi.mocked(decision.resolvePakistanOfficialSightingDecisionForEvening).mockReturnValue(null);
  });
});
