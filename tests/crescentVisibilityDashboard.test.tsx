/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CrescentVisibilityContent from "../app/tools/crescent-visibility/CrescentVisibilityContent";

const locale = vi.hoisted(() => ({ language: "en" }));
const observer = (id: string, name: string) => ({ id, name, latitudeDeg: 25, longitudeDeg: 67, elevationMeters: 0, timezone: "Asia/Karachi" });
const locations = ["Gilgit", "Peshawar", "Islamabad", "Lahore", "Muzaffarabad", "Quetta", "Karachi", "Jiwani"].map((name, index) => ({ observer: observer(name.toLowerCase(), name), prediction: { status: "evaluated", criterion: { qualifies: index === 0 } } }));
const yallopLocations = locations.map(({ observer }, index) => ({ observer, prediction: { status: "evaluated", criterion: { visibilityClass: index === 0 ? "A" : "C", q: 0.3 }, acceptedByPolicy: index === 0 } }));

vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: locale.language }) }));
vi.mock("../app/tools/date-converter/utils/pakistan-crescent/nationalPrediction", () => ({ evaluatePakistanNationalCrescentPrediction: vi.fn(() => ({ locations, qualifies: true })) }));
vi.mock("../app/tools/date-converter/utils/yallop/nationalReferencePrediction", () => ({ evaluateYallopNationalReferencePrediction: vi.fn(() => ({ locations: yallopLocations, anyAcceptedByPolicy: true, classCounts: { A: 1, B: 0, C: 7, D: 0, E: 0, F: 0 } })) }));
vi.mock("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate", () => ({ resolvePakistanOfficialHijriDate: vi.fn(() => null) }));
vi.mock("../app/tools/date-converter/utils/hijri-authority/resolveOfficialSightingDecision", () => ({ resolvePakistanOfficialSightingDecisionForEvening: vi.fn(() => null) }));

describe("crescent visibility dashboard", () => {
  afterEach(() => { locale.language = "en"; });
  it("presents national science without a public city selector", () => {
    render(<CrescentVisibilityContent />);
    expect(screen.getByRole("heading", { name: "Pakistan national crescent visibility outlook" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pakistan-wide context" })).toBeTruthy();
    expect(screen.getByText("At least one of Pakistan's prescribed national observation locations meets the scientific crescent-visibility criterion.")).toBeTruthy();
    expect(screen.getByText("Yallop comparison across national reference locations")).toBeTruthy();
    expect(screen.getByText("At least one national reference location reaches the current Qalam Yallop A/B policy.")).toBeTruthy();
    expect(screen.getByText("Pakistan official Hijri date unavailable")).toBeTruthy();
    expect(screen.getByText("The final official declaration may be based on credible accepted sighting testimony from any location in Pakistan.")).toBeTruthy();
    expect(screen.getByText("Official historical decision")).toBeTruthy();
    expect(screen.getByText("The Pakistan-wide crescent visibility map is temporarily unavailable while its geographic base map is being reviewed.")).toBeTruthy();
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
    expect(screen.getByRole("heading", { name: "پاکستان میں رؤیتِ ہلال کا قومی جائزہ" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "پاکستان بھر کا تناظر" })).toBeTruthy();
    expect(screen.getByText("پاکستان کے مقررہ قومی مشاہداتی مقامات میں کم از کم ایک مقام رؤیتِ ہلال کے سائنسی معیار پر پورا اترتا ہے۔")).toBeTruthy();
    expect(screen.getByText("قومی حوالہ جاتی مقامات پر یالوپ تقابل")).toBeTruthy();
    const details = screen.getByText("مزید سائنسی تفصیلات").closest("details");
    expect(details?.open).toBe(false);
    fireEvent.click(screen.getByText("مزید سائنسی تفصیلات"));
    expect(details?.open).toBe(true);
    expect(screen.getByText("Jiwani")).toBeTruthy();
    locale.language = "en";
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
});
