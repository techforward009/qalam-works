/** @vitest-environment happy-dom */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import sitemap from "../app/sitemap";

const locale = vi.hoisted(() => ({ language: "en" as "en" | "ur" }));

vi.mock("../app/lib/language-context", () => ({
  useLanguage: () => ({
    language: locale.language,
    dir: locale.language === "ur" ? "rtl" : "ltr",
    setLanguage: vi.fn(),
  }),
}));
vi.mock("../app/lib/analytics", () => ({
  trackEvent: vi.fn(),
  trackToolOpenOnce: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children?: ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/tools/roman-urdu-to-urdu",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../app/tools/document-studio/components/DocumentStudioEditor", () => ({
  default: () => <div data-testid="document-studio-editor" />,
}));

afterEach(() => {
  locale.language = "en";
  cleanup();
});

const WWW = "https://www.qalamworks.com";
const root = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

const PAGES = [
  {
    slug: "urdu-text-to-pdf",
    file: "app/tools/urdu-text-to-pdf/page.tsx",
    content: "app/tools/urdu-text-to-pdf/UrduTextToPdfContent.tsx",
    title: "Urdu Text to PDF Converter Online | Qalam Works",
    description:
      "Write or paste Urdu text, format it with RTL and Nastaliq support, and download a clean PDF. اردو متن سے خوب صورت PDF بنائیں۔",
    reuse: 'from "../document-studio/DocumentStudioContent"',
    embed: "<DocumentStudioContent hideHeading />",
  },
  {
    slug: "roman-urdu-to-urdu",
    file: "app/tools/roman-urdu-to-urdu/page.tsx",
    content: "app/tools/roman-urdu-to-urdu/RomanUrduToUrduContent.tsx",
    title: "Roman Urdu to Urdu Converter Online | Qalam Works",
    description:
      "Convert Roman Urdu into Urdu script, review uncertain words, and copy or continue editing the result. رومن اردو کو اردو رسم الخط میں تبدیل کریں۔",
    reuse: 'from "../roman-urdu-writer/RomanUrduWriterClient"',
    embed: "<RomanUrduWriterClient hideHeading />",
  },
  {
    slug: "hijri-to-gregorian",
    file: "app/tools/hijri-to-gregorian/page.tsx",
    content: "app/tools/hijri-to-gregorian/HijriToGregorianContent.tsx",
    title: "Hijri to Gregorian Date Converter | Qalam Works",
    description:
      "Convert a Hijri date to its Gregorian equivalent with weekday and date details. ہجری تاریخ کو عیسوی تاریخ میں تبدیل کریں۔",
    reuse: 'from "../date-converter/DateConverterContent"',
    embed: '<DateConverterContent initialMode="convert" initialCalendar="hijri" hideHeading />',
  },
] as const;

describe("search-intent tool pages — metadata and discovery", () => {
  it.each(PAGES)("$slug exposes the required metadata and www canonical", (page) => {
    const src = read(page.file);
    expect(src).toContain(`title: "${page.title}"`);
    expect(src).toContain(`"${page.description}"`);
    expect(src).toContain(`canonical: "/tools/${page.slug}"`);
    expect(new URL(`/tools/${page.slug}`, WWW).href).toBe(`${WWW}/tools/${page.slug}`);
    expect(src).not.toMatch(/https:\/\/(?!www\.)qalamworks\.com/);
    expect(src).not.toMatch(/FAQPage|application\/ld\+json|noindex/);
  });

  it("lists all three www URLs in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const page of PAGES) {
      expect(urls).toContain(`${WWW}/tools/${page.slug}`);
    }
    expect(urls.every((url) => url.startsWith(`${WWW}/`) || url === WWW)).toBe(true);
  });

  it.each(PAGES)("$slug reuses the existing tool instead of cloning it", (page) => {
    const src = read(page.content);
    expect(src).toContain(page.reuse);
    expect(src).toContain(page.embed);
    expect(src).not.toMatch(/engineV2|engineV3|dateEngine|pdfInkPagination/);
  });

  it("keeps DateConverterContent default Gregorian on the existing date-converter route", () => {
    const page = read("app/tools/date-converter/page.tsx");
    const content = read("app/tools/date-converter/DateConverterContent.tsx");
    expect(page).toContain("<DateConverterContent initialMode={initialMode} />");
    expect(page).not.toMatch(/initialCalendar/);
    expect(content).toMatch(/initialCalendar = "gregorian"/);
  });

  it("initializes the Hijri SEO page with Hijri source calendar in convert mode", () => {
    const src = read("app/tools/hijri-to-gregorian/HijriToGregorianContent.tsx");
    expect(src).toContain('initialMode="convert"');
    expect(src).toContain('initialCalendar="hijri"');
  });

  it("keeps the existing Document Studio route heading and does not add a second H1 on the PDF SEO page", () => {
    const studioPage = read("app/tools/document-studio/page.tsx");
    const studio = read("app/tools/document-studio/DocumentStudioContent.tsx");
    const pdf = read("app/tools/urdu-text-to-pdf/UrduTextToPdfContent.tsx");
    const layout = read("app/tools/SearchIntentToolLayout.tsx");

    expect(studioPage).toContain("<DocumentStudioContent />");
    expect(studioPage).not.toMatch(/hideHeading/);
    expect(studio).toMatch(/<h1 className="sr-only">/);
    expect(studio).toContain("Document Studio");
    expect(pdf).toContain("<DocumentStudioContent hideHeading />");
    expect(pdf).not.toMatch(/<h1/);
    expect((layout.match(/<h1/g) ?? []).length).toBe(1);
  });

  it("is reachable from /tools and is not cloned into Header, Footer, or TOOL_CATALOG", () => {
    const tools = read("app/tools/AllToolsContent.tsx");
    const header = read("app/components/Header.tsx");
    const footer = read("app/components/Footer.tsx");
    const catalog = read("app/lib/toolCatalog.ts");

    for (const page of PAGES) {
      expect(tools).toContain(`/tools/${page.slug}`);
      expect(header).not.toContain(`/tools/${page.slug}`);
      expect(footer).not.toContain(`/tools/${page.slug}`);
      expect(catalog).not.toContain(`/tools/${page.slug}`);
    }
  });

  it("does not change existing tool canonicals", () => {
    expect(read("app/tools/document-studio/page.tsx")).toContain('canonical: "/tools/document-studio"');
    expect(read("app/tools/roman-urdu-writer/page.tsx")).toContain('canonical: "/tools/roman-urdu-writer"');
    expect(read("app/tools/date-converter/page.tsx")).toContain('canonical: "/tools/date-converter"');
  });
});

describe("search-intent tool pages — rendered headings and calendar defaults", () => {
  it("existing Document Studio route still exposes the sr-only Document Studio H1", async () => {
    const DocumentStudioContent = (await import("../app/tools/document-studio/DocumentStudioContent")).default;
    render(<DocumentStudioContent />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Document Studio");
    expect(heading.className).toContain("sr-only");
    expect(screen.getByTestId("document-studio-editor")).toBeTruthy();
  });

  it("Urdu text to PDF page reuses Document Studio with exactly one visible search-intent H1", async () => {
    const UrduTextToPdfContent = (await import("../app/tools/urdu-text-to-pdf/UrduTextToPdfContent")).default;
    render(<UrduTextToPdfContent />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Urdu Text to PDF Converter");
    expect(headings[0].className).not.toMatch(/sr-only/);
    expect(screen.getByTestId("document-studio-editor")).toBeTruthy();
    expect(screen.getByRole("link", { name: /professional document formatting/i }).getAttribute("href")).toBe("/services");
  });

  it("switches the PDF SEO H1 to Urdu when the site language is Urdu", async () => {
    locale.language = "ur";
    const UrduTextToPdfContent = (await import("../app/tools/urdu-text-to-pdf/UrduTextToPdfContent")).default;
    render(<UrduTextToPdfContent />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("اردو متن سے PDF بنائیں");
  });

  it("Roman Urdu SEO page reuses the writer with a single search-intent H1", async () => {
    const RomanUrduToUrduContent = (await import("../app/tools/roman-urdu-to-urdu/RomanUrduToUrduContent")).default;
    render(<RomanUrduToUrduContent />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Roman Urdu to Urdu Converter");
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("link", { name: /continue in document studio/i }).getAttribute("href")).toBe("/tools/document-studio");
  });

  it("DateConverterContent remains Gregorian on the existing page and Hijri on the SEO page", async () => {
    const DateConverterContent = (await import("../app/tools/date-converter/DateConverterContent")).default;
    const HijriToGregorianContent = (await import("../app/tools/hijri-to-gregorian/HijriToGregorianContent")).default;

    const existing = render(<DateConverterContent />);
    expect(screen.getByPlaceholderText("2026")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Date Studio");
    existing.unmount();

    render(<HijriToGregorianContent />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Hijri to Gregorian Date Converter");
    expect(screen.getByPlaceholderText("1447")).toBeTruthy();
    expect(screen.queryByPlaceholderText("2026")).toBeNull();
    expect(screen.getByRole("link", { name: "Date Converter" }).getAttribute("href")).toBe("/tools/date-converter");
    expect(screen.getByRole("link", { name: "Calendar Maker" }).getAttribute("href")).toBe("/tools/calendar-maker");
  });
});
