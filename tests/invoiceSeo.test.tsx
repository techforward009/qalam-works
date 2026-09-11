import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import InvoiceGeneratorPage, { metadata } from "../app/tools/invoice-generator/page";
import * as languageContext from "../app/lib/language-context";
import { translations } from "../app/lib/translations";

function renderPage() {
  return renderToStaticMarkup(<languageContext.LanguageProvider><InvoiceGeneratorPage /></languageContext.LanguageProvider>);
}

afterEach(() => vi.restoreAllMocks());

describe("Invoice Generator on-page SEO", () => {
  it("targets Pakistan and Urdu in metadata without meta keywords", () => {
    expect(metadata.title).toBe("Free Invoice Generator Pakistan | انوائس جنریٹر | Qalam Works");
    for (const term of ["free", "Pakistan", "PKR", "Urdu", "English", "PDF", "No sign-up"]) {
      expect(metadata.description).toContain(term);
    }
    expect(metadata).not.toHaveProperty("keywords");
  });

  it("keeps the relative canonical and resolves it using the actual root www metadataBase", () => {
    const root = readFileSync(resolve(__dirname, "../app/layout.tsx"), "utf8");
    const base = root.match(/metadataBase: new URL\("([^"]+)"\)/)?.[1];
    expect(base).toBe("https://www.qalamworks.com");
    expect(metadata.alternates?.canonical).toBe("/tools/invoice-generator");
    expect(new URL(String(metadata.alternates?.canonical), base).href).toBe("https://www.qalamworks.com/tools/invoice-generator");
  });

  it("server-renders the English H1 and visible Urdu copy before the real generator", () => {
    const html = renderPage();
    expect(html).toMatch(/<main[^>]*dir="ltr"[^>]*lang="en"/);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Free Invoice Generator for Pakistan<\/h1>/);
    expect(html).toContain('<span lang="ur" dir="rtl" class="font-naskh">انوائس جنریٹر</span>');
    const heroEnd = html.indexOf("</section>");
    expect(html.slice(0, heroEnd)).not.toMatch(/sr-only|display:\s*none|\bhidden\b/);
    const preview = html.indexOf('data-invoice-preview-well="true"');
    expect(preview).toBeGreaterThan(heroEnd);
    expect(preview).toBeLessThan(html.indexOf('id="invoice-use-cases"'));
    expect(html).toContain("PKR");
    expect(html).toContain("PDF");
  });

  it("renders useful sections, exactly three steps and all seven visible FAQs", () => {
    const html = renderPage();
    for (const heading of ["Free Invoice Generator for Pakistan", "What you can include", "How to create an invoice", "اردو انوائس جنریٹر"]) {
      expect(html).toMatch(new RegExp(`<h2[^>]*>${heading}</h2>`));
    }
    const steps = html.match(/<ol[^>]*>([\s\S]*?)<\/ol>/)?.[1];
    expect(steps?.match(/<li\b/g)).toHaveLength(3);
    expect(translations.en.invoiceTool.faqs).toHaveLength(7);
    for (const faq of translations.en.invoiceTool.faqs) {
      expect(html).toContain(faq.question);
      expect(html).toContain(faq.answer);
    }
  });

  it("preserves Urdu RTL, localized H1, landing copy and FAQs", () => {
    vi.spyOn(languageContext, "useLanguage").mockReturnValue({ language: "ur", dir: "rtl", setLanguage: vi.fn() });
    const html = renderPage();
    expect(html).toMatch(/<main[^>]*dir="rtl"[^>]*lang="ur"/);
    expect(html).toMatch(/<h1[^>]*>مفت انوائس جنریٹر — پاکستان<\/h1>/);
    expect(html).toContain('lang="ur" dir="rtl" class="font-naskh"');
    expect(html).toContain('<bdi dir="ltr">PKR</bdi>');
    expect(html).not.toContain("Also available in Urdu");
    for (const faq of translations.ur.invoiceTool.faqs) {
      expect(html).toContain(faq.question);
      expect(html).toContain(faq.answer);
    }
  });

  it("server-renders accurate WebApplication JSON-LD with no fabricated endorsement fields", () => {
    const html = renderPage();
    const json = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    expect(json).toBeDefined();
    const schema = JSON.parse(json!);
    expect(schema).toEqual({
      "@context": "https://schema.org", "@type": "WebApplication",
      name: "Qalam Works Invoice Generator",
      url: "https://www.qalamworks.com/tools/invoice-generator",
      applicationCategory: "BusinessApplication", operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      inLanguage: ["en", "ur"], description: expect.stringContaining("Preview and download as PDF"),
    });
    expect(json).not.toMatch(/"(?:aggregateRating|reviews?|rating|awards?|userCount|interactionStatistic)"\s*:/i);
  });

  it.each(["en", "ur"] as const)("avoids unsupported compliance or popularity claims in %s copy", language => {
    const copy = JSON.stringify(translations[language].invoiceTool);
    expect(copy).not.toMatch(/FBR|GST|government.approv|tax.filing|e-invoicing|guaranteed.ranking|millions.of.users|سرکاری منظوری|ایف بی آر|ٹیکس فائلنگ/i);
  });
});
