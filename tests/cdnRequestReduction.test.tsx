import { describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import DatePage, { generateMetadata, generateStaticParams, revalidate } from "../app/date/[date]/page";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/app/components/date-studio/DateProfileClient", () => ({ DateProfileClient: () => null }));
vi.mock("@/app/components/date-studio/DateProfileCard", () => ({ DateProfileCard: () => null }));
vi.mock("@/app/components/date-studio/DateStudioNav", () => ({ DateStudioNav: () => null }));
vi.mock("@/app/tools/date-converter/utils/dateProfile", () => import("../app/tools/date-converter/utils/dateProfile"));
vi.mock("@/app/tools/date-converter/utils/dateEvents", () => import("../app/tools/date-converter/utils/dateEvents"));
vi.mock("@/app/tools/date-converter/utils/dateEngine", () => import("../app/tools/date-converter/utils/dateEngine"));

describe("bounded and shared-cacheable date pages", () => {
  it.each(["0001-01-01", "9999-12-31", "1899-12-31", "2101-01-01", "2026-02-30",
    "2026-10-23.5", "02026-10-23", "0002026-10-23", "2026-0x0A-23", "2026-1e1-23", "1900-1-1"])("rejects %s before generating content", async date => {
    await expect(DatePage({ params: Promise.resolve({date}) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it.each(["1900-01-01", "2026-10-23", "2100-12-31"])("renders %s", async date => {
    expect(await DatePage({params:Promise.resolve({date})})).toBeTruthy();
  });
  it("uses daily on-demand ISR and nofollow metadata", async () => {
    expect(revalidate).toBe(86400);
    expect(await generateStaticParams()).toEqual([]);
    expect(await generateMetadata({params:Promise.resolve({date:"2026-10-23"})})).toMatchObject({robots:{index:true,follow:false}});
  });
  it("disallows crawler date walks while keeping the discovery sitemap", () => {
    expect(robots().rules).toMatchObject({allow:"/",disallow:["/api/","/tools/research-studio","/date/"]});
    const urls=sitemap().map(item=>item.url);
    expect(urls).not.toContain("https://www.qalamworks.com/today");
    expect(urls).toContain(`https://www.qalamworks.com/calendar/${new Date().getFullYear()}`);
  });
  it("sets long-lived public cache headers for fonts and Quran assets", async () => {
    const headers=await nextConfig.headers!();
    expect(headers.find(rule=>rule.source==="/fonts/:path*")?.headers).toContainEqual({key:"Cache-Control",value:"public, max-age=31536000, immutable"});
    expect(headers.find(rule=>rule.source==="/quran/:path*.json")?.headers).toContainEqual({key:"Cache-Control",value:"public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"});
  });
});
