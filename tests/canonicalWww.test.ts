import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import sitemap from "../app/sitemap";
import robots from "../app/robots";

const WWW = "https://www.qalamworks.com";
const NON_WWW = /https:\/\/(?!www\.)qalamworks\.com/;

function source(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("canonical www origin", () => {
  test("metadataBase is https://www.qalamworks.com", () => {
    expect(source("app/layout.tsx")).toContain('metadataBase: new URL("https://www.qalamworks.com")');
  });

  test("root canonical uses www", () => {
    expect(source("app/layout.tsx")).toContain('canonical: "https://www.qalamworks.com"');
  });

  test("root OpenGraph URL uses www", () => {
    expect(source("app/layout.tsx")).toContain('url: "https://www.qalamworks.com"');
  });

  test("invoice-generator canonical is relative and resolves to www", () => {
    const src = source("app/tools/invoice-generator/page.tsx");
    expect(src).toContain('canonical: "/tools/invoice-generator"');
    const resolved = new URL("/tools/invoice-generator", WWW).href;
    expect(resolved).toBe(`${WWW}/tools/invoice-generator`);
  });

  test("sitemap contains www invoice-generator URL and no non-www host", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${WWW}/tools/invoice-generator`);
    expect(urls.every((url) => url.startsWith(`${WWW}/`) || url === WWW)).toBe(true);
    expect(urls.some((url) => NON_WWW.test(url))).toBe(false);
  });

  test("robots sitemap URL uses www", () => {
    expect(robots().sitemap).toBe(`${WWW}/sitemap.xml`);
  });

  test("crawler metadata sources do not declare non-www origin", () => {
    const files = [
      "app/layout.tsx",
      "app/sitemap.ts",
      "app/robots.ts",
      "app/about/page.tsx",
      "app/contact/page.tsx",
      "app/privacy/page.tsx",
      "app/terms/page.tsx",
      "app/services/page.tsx",
      "app/tools/invoice-generator/page.tsx",
    ];
    for (const file of files) {
      expect(source(file), file).not.toMatch(NON_WWW);
    }
  });
});
