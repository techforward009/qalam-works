import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MadinahPage from "../app/quran/madinah/[surah]/[ayah]/page";
import HijriYearPage from "../app/hijri/[year]/page";
import HijriMonthPage from "../app/hijri/[year]/[month]/page";
import { DateStudioRouteNav } from "../app/components/date-studio/DateStudioRouteNav";

vi.mock("@/app/tools/date-converter/utils/dateEngine", () => import("../app/tools/date-converter/utils/dateEngine"));
vi.mock("@/app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth", () => import("../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriMonth"));
vi.mock("@/app/components/date-studio/DateStudioRouteNav", () => import("../app/components/date-studio/DateStudioRouteNav"));
vi.mock("@/app/components/date-studio/HijriYearDashboard", () => ({ HijriYearDashboard: () => null }));
vi.mock("@/app/components/date-studio/HijriMonthCalendar", () => ({ HijriMonthCalendar: () => null }));
vi.mock("@/app/lib/language-context", () => ({ useLanguage: () => ({ language: "en", dir: "ltr" }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("../app/quran/madinah/MadinahReader", () => ({ default: () => null }));
vi.mock("../app/components/date-studio/HijriYearDashboard", () => ({ HijriYearDashboard: () => null }));
vi.mock("../app/components/date-studio/HijriMonthCalendar", () => ({ HijriMonthCalendar: () => null }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: "en", dir: "ltr" }) }));

describe("Madinah cached route validation", () => {
  it.each([["0", "1"], ["115", "1"], ["1", "0"], ["1", "8"], ["2", "287"], ["114", "7"], ["1.5", "1"], ["1", "1.5"], ["junk", "1"], ["1", "junk"]])("rejects %s/%s", async (surah, ayah) => {
    await expect(MadinahPage({ params: Promise.resolve({ surah, ayah }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it.each([["1", "7"], ["2", "286"], ["114", "6"]])("renders the valid boundary %s/%s", async (surah, ayah) => {
    const page = await MadinahPage({ params: Promise.resolve({ surah, ayah }) });
    expect(page.props).toMatchObject({ surah: Number(surah), ayah: Number(ayah) });
  });
});

describe("Hijri cached route boundaries", () => {
  it.each(["1316", "1501", "0", "1447.5", "junk"])("rejects year %s on both routes", async year => {
    await expect(HijriYearPage({ params: Promise.resolve({ year }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(HijriMonthPage({ params: Promise.resolve({ year, month: "1" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it.each(["0", "13", "1.5", "junk"])("still rejects invalid month %s", async month => {
    await expect(HijriMonthPage({ params: Promise.resolve({ year: "1447", month }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it.each([
    ["1317", undefined, "/hijri/1318"],
    ["1500", "/hijri/1499", undefined],
    ["1447", "/hijri/1446", "/hijri/1448"],
  ])("limits year navigation for %s", async (year, previousHref, nextHref) => {
    const page = await HijriYearPage({ params: Promise.resolve({ year: year! }) });
    const nav = page.props.children[0];
    expect(nav.props).toMatchObject({ previousHref, nextHref });
    const html = renderToStaticMarkup(<DateStudioRouteNav {...nav.props} />);
    expect(html.includes(">Previous</a>")).toBe(Boolean(previousHref));
    expect(html.includes(">Next</a>")).toBe(Boolean(nextHref));
  });
  it.each([
    ["1317", "1", undefined, "/hijri/1317/2"],
    ["1317", "2", "/hijri/1317/1", "/hijri/1317/3"],
    ["1500", "11", "/hijri/1500/10", "/hijri/1500/12"],
    ["1500", "12", "/hijri/1500/11", undefined],
    ["1447", "12", "/hijri/1447/11", "/hijri/1448/1"],
  ])("limits month navigation for %s/%s", async (year, month, previousHref, nextHref) => {
    const page = await HijriMonthPage({ params: Promise.resolve({ year: year!, month: month! }) });
    const nav = page.props.children[0];
    expect(nav.props).toMatchObject({ previousHref, nextHref });
    const html = renderToStaticMarkup(<DateStudioRouteNav {...nav.props} />);
    expect(html.includes(">Previous</a>")).toBe(Boolean(previousHref));
    expect(html.includes(">Next</a>")).toBe(Boolean(nextHref));
  });
});
