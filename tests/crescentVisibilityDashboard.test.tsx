/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CrescentVisibilityContent from "../app/tools/crescent-visibility/CrescentVisibilityContent";

const locale = vi.hoisted(() => ({ language: "en" }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: locale.language }) }));
vi.mock("../app/tools/date-converter/utils/yallop/dateStudioPrediction", () => ({ evaluateDateStudioYallopPrediction: vi.fn((_: unknown, observer: any) => ({ status:"evaluated", observerLocalDate:"2026-08-13", snapshot:{ observer, bestTimeUtc:"2026-08-13T14:00:00.000Z" }, criterion:{ visibilityClass:"A", q:0.3 }, acceptedByPolicy:true })) }));
vi.mock("../app/tools/date-converter/utils/pakistan-crescent/dateStudioPrediction", () => ({ evaluateDateStudioPakistanCrescentPrediction: vi.fn((_: unknown, observer: any) => ({ status:"evaluated", observerLocalDate:"2026-08-13", snapshot:{ observer, altitudeDeg:7, widthArcMin:.2, illuminationPercent:1, elongationDeg:10, lagMinutes:40, sunsetUtc:"2026-08-13T13:00:00.000Z" }, criterion:{ qualifies:true } })) }));
vi.mock("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate", () => ({ resolvePakistanOfficialHijriDate: vi.fn(() => null) }));
vi.mock("../app/tools/date-converter/utils/hijri-authority/resolveOfficialSightingDecision", () => ({ resolvePakistanOfficialSightingDecisionForEvening: vi.fn(() => null) }));

describe("crescent visibility dashboard", () => {
  it("shows quick cities, city-specific local science, and the national declaration note", () => {
    render(<CrescentVisibilityContent />);
    expect(screen.getByRole("button", { name:"Karachi" })).toBeTruthy(); expect(screen.getByRole("button", { name:"Islamabad" })).toBeTruthy();
    expect(screen.getByText(/For Karachi, both scientific methods/)).toBeTruthy();
    expect(screen.getByText("The final official declaration may be based on credible accepted sighting testimony from any location in Pakistan.")).toBeTruthy();
    expect(screen.getByText("Yallop Crescent Visibility")).toBeTruthy(); expect(screen.getByText("Pakistan 5-Year Calendar Criterion")).toBeTruthy(); expect(screen.getByText("Official historical decision")).toBeTruthy();
    expect(screen.queryByText(/winner|accuracy|correct method|wrong method/i)).toBeNull();
  });
  it("keeps Urdu local wording", () => { locale.language="ur"; render(<CrescentVisibilityContent />); expect(screen.getByText(/کراچی میں دونوں سائنسی طریقوں/)).toBeTruthy(); expect(screen.getAllByText(/حتمی سرکاری اعلان پاکستان کے کسی بھی مقام/).length).toBeGreaterThan(0); locale.language="en"; });

  it.each(["1899-12-31", "2101-01-01", "", "2026-02-30"])("rejects invalid date %s without retaining scientific output", async value => {
    const { evaluateDateStudioYallopPrediction } = await import("../app/tools/date-converter/utils/yallop/dateStudioPrediction");
    const { evaluateDateStudioPakistanCrescentPrediction } = await import("../app/tools/date-converter/utils/pakistan-crescent/dateStudioPrediction");
    const { resolvePakistanOfficialHijriDate } = await import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate");
    const { resolvePakistanOfficialSightingDecisionForEvening } = await import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialSightingDecision");
    const view = render(<CrescentVisibilityContent />);
    await waitFor(() => expect(evaluateDateStudioYallopPrediction).toHaveBeenCalled());
    vi.mocked(evaluateDateStudioYallopPrediction).mockClear(); vi.mocked(evaluateDateStudioPakistanCrescentPrediction).mockClear(); vi.mocked(resolvePakistanOfficialHijriDate).mockClear(); vi.mocked(resolvePakistanOfficialSightingDecisionForEvening).mockClear();
    fireEvent.change(screen.getByLabelText("Change date"), { target: { value } });
    expect(screen.getByRole("alert").textContent).toBe("Please select a Gregorian date between 1900 and 2100.");
    expect(evaluateDateStudioYallopPrediction).not.toHaveBeenCalled(); expect(evaluateDateStudioPakistanCrescentPrediction).not.toHaveBeenCalled(); expect(resolvePakistanOfficialHijriDate).not.toHaveBeenCalled(); expect(resolvePakistanOfficialSightingDecisionForEvening).not.toHaveBeenCalled();
    expect(view.container.querySelectorAll("circle[aria-label]")).toHaveLength(0);
  });

  it.each(["1900-01-01", "2100-12-31"])("accepts supported boundary date %s", value => {
    render(<CrescentVisibilityContent />); const input = screen.getByLabelText("Change date") as HTMLInputElement;
    expect(input.min).toBe("1900-01-01"); expect(input.max).toBe("2100-12-31"); fireEvent.change(input, { target: { value } });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
