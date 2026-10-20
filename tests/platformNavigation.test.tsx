// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Header from "../app/components/Header";
import Footer from "../app/components/Footer";
import AllToolsContent from "../app/tools/AllToolsContent";
import Home from "../app/page";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { TOOL_CATALOG, TOOL_GROUPS, ALL_TOOLS_GROUPS, toolsInGroup } from "../app/lib/toolCatalog";

const locale = vi.hoisted(() => ({ language: "en" as "en" | "ur" }));
vi.mock("../app/lib/language-context", () => ({
  useLanguage: () => ({ language: locale.language, dir: locale.language === "ur" ? "rtl" : "ltr", setLanguage: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("../app/lib/analytics", () => ({ trackEvent: vi.fn() }));
afterEach(() => { cleanup(); locale.language = "en"; });

const routes = (container: HTMLElement) => [...container.querySelectorAll("a")].map(link => link.getAttribute("href"));
const privateRoute = "/tools/research-studio";
const footerOnly = "/tools/khateeb-studio";

describe("Urdu-first public discovery", () => {
  it("groups every public catalog entry once, with private tools excluded", () => {
    const grouped = ALL_TOOLS_GROUPS.flatMap(toolsInGroup);
    expect(new Set(grouped.map(tool => tool.id)).size).toBe(TOOL_CATALOG.length - 1);
    expect(grouped).toHaveLength(TOOL_CATALOG.length - 1);
    expect(grouped.map(tool => tool.route)).not.toContain(privateRoute);
    expect(grouped.map(tool => tool.route)).not.toContain(footerOnly);
    expect(TOOL_GROUPS.map(group => group.name.en)).toEqual([
      "Write", "Fix Text", "Dates", "More",
    ]);
    expect(sitemap().map(entry => entry.url)).not.toContain(`https://www.qalamworks.com${privateRoute}`);
    expect(sitemap().map(entry => entry.url)).not.toContain(`https://www.qalamworks.com${footerOnly}`);
    const menu = TOOL_GROUPS.flatMap(toolsInGroup);
    expect(new Set(menu.map(tool => tool.route)).size).toBe(menu.length);
    expect(menu.filter(tool=>tool.route==="/tools")).toHaveLength(1);
    for (const id of ["roman_converter", "date_finder", "hijri_converter", "urdu_unicode_standardizer"]) {
      expect(menu.some(tool=>tool.id===id)).toBe(false);
      expect(grouped.some(tool=>tool.id===id)).toBe(true);
    }
    expect(toolsInGroup(ALL_TOOLS_GROUPS.find(group => group.id === "write")!).map(tool => tool.id)).toContain("roman_converter");
    expect(toolsInGroup(ALL_TOOLS_GROUPS.find(group => group.id === "tools")!).map(tool => tool.id)).not.toContain("roman_converter");
    expect(grouped.filter(tool => tool.route === "/tools/document-studio")).toHaveLength(1);
    expect(robots().rules).toMatchObject({ disallow: privateRoute });
  });

  it.each(["en", "ur"] as const)("keeps the same groups and route availability in %s", language => {
    locale.language = language;
    const header = render(<Header />);
    const primary = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(primary.getAllByRole("button").map(button => button.textContent)).toEqual(TOOL_GROUPS.map(group => group.name[language]));
    for (const group of TOOL_GROUPS) {
      fireEvent.click(primary.getByRole("button", { name: group.name[language] }));
      for (const tool of toolsInGroup(group)) {
        expect(primary.getByRole("link", { name: tool.name[language] }).getAttribute("href")).toBe(tool.route);
      }
      expect(routes(header.container)).not.toContain(privateRoute);
      expect(routes(header.container)).not.toContain(footerOnly);
    }
    header.unmount();

    const footer = render(<Footer />);
    expect(screen.getAllByRole("heading").map(heading => heading.textContent)).toEqual(TOOL_GROUPS.map(group => group.name[language]));
    expect(routes(footer.container).filter(route => route === footerOnly)).toHaveLength(1);
    expect(routes(footer.container)).not.toContain(privateRoute);
    const brand = footer.container.querySelector("footer > div > div")!;
    expect(brand.getAttribute("dir")).toBe(language === "ur" ? "rtl" : "ltr");
    expect(brand.classList.contains("text-start")).toBe(true);
    footer.unmount();

    const tools = render(<AllToolsContent />);
    expect(screen.getAllByRole("heading", { level: 2 }).map(heading => heading.textContent)).toEqual(TOOL_GROUPS.map(group => group.name[language]));
    for (const tool of TOOL_CATALOG.filter(tool => tool.id !== "all_tools")) expect(routes(tools.container)).toContain(tool.route);
    expect(routes(tools.container)).not.toContain(footerOnly);
    expect(routes(tools.container)).not.toContain(privateRoute);
  });

  it.each(["en", "ur"] as const)("leads the homepage with goals and all nine general audiences in %s", language => {
    locale.language = language;
    const home = render(<Home />);
    const links = routes(home.container);
    expect(links).not.toContain(privateRoute);
    expect(links).not.toContain(footerOnly);
    const sections = [...home.container.querySelectorAll("section")];
    expect(sections[1].querySelectorAll("a")).toHaveLength(6);
    expect(sections[2].id).toBe("who-its-for");
    expect(sections[2].querySelectorAll("li")).toHaveLength(9);
    expect(sections[0].textContent).not.toMatch(/Qur’an|قرآن/);
    const also = screen.getByRole("heading", { name: language === "ur" ? "قلم ورکس پر یہ بھی دستیاب ہے" : "Also on Qalam Works" }).closest("section")!;
    expect(routes(also)).toEqual(["/quran", "/tools/crescent-visibility"]);
    expect(sections.indexOf(also)).toBe(sections.length - 2);
  });
});
