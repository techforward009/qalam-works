/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CrescentVisibilityContent from "../app/tools/crescent-visibility/CrescentVisibilityContent";

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

describe("crescent visibility dashboard", () => {
  afterEach(() => { locale.language = "en"; locations.forEach((location, index) => { location.prediction.criterion.qualifies = index === 0; }); yallopLocations.forEach((location, index) => { location.prediction.criterion.visibilityClass = index === 0 ? "A" : "C"; location.prediction.acceptedByPolicy = index === 0; }); Object.assign(yallopClassCounts, { A: 1, B: 0, C: 7, D: 0, E: 0, F: 0 }); });
  it("presents national science without a public city selector", () => {
    render(<CrescentVisibilityContent />);
    expect(screen.getByRole("heading", { name: "Pakistan Crescent Visibility" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to Date Studio/i }).getAttribute("href")).toBe("/tools/date-converter#date-studio");
    expect(screen.getByText("National scientific and official outlook")).toBeTruthy();
    expect(screen.getAllByText("1 of 8 prescribed national observation locations meet the scientific crescent-visibility criterion.").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Pakistan national scientific criterion" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "International crescent-visibility model" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 of 8 reference locations have favorable visibility conditions.").length).toBeGreaterThan(0);
    expect(screen.getByText("Pakistan official Hijri date unavailable")).toBeTruthy();
    expect(screen.getByText("Official historical decision")).toBeTruthy();
    expect(screen.queryByText(/Pakistan-wide crescent visibility map is temporarily unavailable/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Karachi" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Islamabad" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Other cities" })).toBeNull();
    expect(screen.queryByText("Selected location details")).toBeNull();
    expect(screen.queryByText(/Calculated Hijri date/)).toBeNull();
    expect(screen.queryByLabelText("Pakistan-wide scientific visibility map")).toBeNull();
    expect(screen.queryByText(/winner|accuracy|correct method|wrong method/i)).toBeNull();
  });

  it("keeps diagnostics in scientific details and national Urdu wording", () => {
    locale.language = "ur";
    render(<CrescentVisibilityContent />);
    expect(screen.getByRole("heading", { name: "پاکستان میں رؤیتِ ہلال" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /ڈیٹ اسٹوڈیو پر واپس/ }).getAttribute("href")).toBe("/tools/date-converter#date-studio");
    expect(screen.getByText("قومی سائنسی اور سرکاری جائزہ")).toBeTruthy();
    expect(screen.getAllByText("8 میں سے 1 مقررہ قومی مشاہداتی مقامات رؤیتِ ہلال کے سائنسی معیار پر پورا اترتے ہیں۔").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "پاکستانی قومی سائنسی معیار" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "بین الاقوامی طور پر معروف سائنسی ماڈل" }).length).toBeGreaterThan(0);
    const details = screen.getByText("مزید سائنسی تفصیلات").closest("details");
    expect(details?.open).toBe(false);
    fireEvent.click(screen.getByText("مزید سائنسی تفصیلات"));
    expect(details?.open).toBe(true);
    for (const name of ["گلگت", "پشاور", "اسلام آباد", "لاہور", "مظفرآباد", "کوئٹہ", "کراچی", "جیوانی"]) expect(screen.getByText(name)).toBeTruthy();
    locale.language = "en";
  });

  it("renders readable Pakistan and Yallop diagnostic badges with formatted scientific values", () => {
    render(<CrescentVisibilityContent />);
    fireEvent.click(screen.getByText("Scientific details"));
    expect(screen.getAllByText("Pass").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fail").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Class A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Class C").length).toBeGreaterThan(0);
    expect(screen.getAllByText("(q = +2.495)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("(q = -0.123)").length).toBeGreaterThan(0);
    for (const label of ["Altitude", "Crescent width", "Illumination", "Elongation", "Lag"]) expect(screen.getAllByText(label).length).toBe(8);
    expect(screen.getByTestId("scientific-location-grid").className).toContain("md:grid-cols-2");
  });

  it("offers accessible conservative Yallop class help without claiming official status", () => {
    render(<CrescentVisibilityContent />);
    const help = screen.getByRole("button", { name: "About the Yallop model" });
    expect(help.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(help);
    expect(help.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/It is not an official moon-sighting declaration/)).toBeTruthy();
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

  it("shows the verified official Rabi al-Thani date without a calculated fallback", async () => {
    const authority = await import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate");
    vi.mocked(authority.resolvePakistanOfficialHijriDate).mockReturnValue({ hijri: { year: 1448, month: 4, day: 1 }, authority: "official", anchorId: "pk-1448-rabi-al-thani-2026-09-14", providerId: "pk-ministry-religious-affairs-central-ruet-e-hilal", providerLabel: { en: "Pakistan Ministry of Religious Affairs / Central Ruet-e-Hilal Committee", ur: "وزارتِ مذہبی امور پاکستان / مرکزی رویتِ ہلال کمیٹی" }, sourceUrl: "https://example.invalid", sourceReference: "Test", verificationStatus: "verified" });
    render(<CrescentVisibilityContent />);
    expect(screen.getByText("Pakistan official Hijri date")).toBeTruthy();
    expect(screen.getAllByText("1 Rabi al-Thani 1448 AH").length).toBeGreaterThan(0);
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
    expect(screen.getByRole("heading", { name: "Official Pakistan moon-sighting decision" })).toBeTruthy();
    expect(screen.getByText("Crescent not sighted.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Change date"), { target: { value: "2026-09-13" } });
    expect(screen.queryByRole("heading", { name: "Official Pakistan moon-sighting decision" })).toBeNull();
    vi.mocked(decision.resolvePakistanOfficialSightingDecisionForEvening).mockReturnValue(null);
  });
});
