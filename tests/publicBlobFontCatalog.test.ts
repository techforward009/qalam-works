import { describe, expect, test } from "vitest";
import { PUBLIC_BLOB_FONT_FAMILIES, PUBLIC_BLOB_FONT_FILES, publicBlobFontUrl, isApprovedPublicBlobFontUrl } from "../app/tools/document-studio/utils/publicBlobFontCatalog";

describe("Document Studio public Blob font catalogue", () => {
  test("resolves the owner-supplied Worker URL and rejects removed names", () => {
    expect(() => publicBlobFontUrl("asif-quranic-400.woff2")).toThrow("Unapproved Document Studio font asset");
    expect(() => publicBlobFontUrl("al-qalam-quran-majeed-web-regular.woff2")).toThrow("Unapproved Document Studio font asset");
    expect(publicBlobFontUrl("MehrNastaliqWeb.woff2")).toBe("/fonts/MehrNastaliqWeb.woff2");
    expect(isApprovedPublicBlobFontUrl("/fonts/MehrNastaliqWeb.woff2")).toBe(true);
    expect(isApprovedPublicBlobFontUrl("https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/MehrNastaliqWeb.woff2")).toBe(false);
    expect(isApprovedPublicBlobFontUrl("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/MehrNastaliqWeb.woff2")).toBe(false);
    expect(isApprovedPublicBlobFontUrl("https://evil.invalid/asif-quranic-400.woff2")).toBe(false);
    expect(() => publicBlobFontUrl("AdobeArabic-Regular.woff2")).toThrow("Unapproved Document Studio font asset");
    expect(() => publicBlobFontUrl("Faiz-Lahori-Web.woff2")).toThrow("Unapproved Document Studio font asset");
    expect(() => publicBlobFontUrl("TraditionalArabic.woff2")).toThrow("Unapproved Document Studio font asset");
    expect(() => publicBlobFontUrl("al-majeed-quranic-400.woff2")).toThrow("Unapproved Document Studio font asset");
  });

  test("contains 10 catalogued assets including Mehr, organized into 10 font families", () => {
    expect(PUBLIC_BLOB_FONT_FILES).toHaveLength(10);
    expect(PUBLIC_BLOB_FONT_FAMILIES).toHaveLength(10);
    expect(new Set(PUBLIC_BLOB_FONT_FILES).size).toBe(10);
    for (const removed of [
      "AdobeArabic-Regular.woff2",
      "AdobeArabic-Bold.woff2",
      "TraditionalArabic.woff2",
      "TraditionalArabic-Bold.woff2",
      "Faiz-Lahori-Web.woff2",
      "al-majeed-quranic-400.woff2",
      "asif-quranic-400.woff2",
      "al-qalam-quran-majeed-web-regular.woff2",
    ]) {
      expect(PUBLIC_BLOB_FONT_FILES).not.toContain(removed);
    }
  });

  test("maps all six uploaded catalogued originals and keeps missing fonts on legacy names", () => {
    const recovered=[
      "Gulzar-Regular.woff2",
      "Sahel.woff2",
      "ScheherazadeNew-Medium.woff2","jameel-noori-nastaleeq-400.woff2",
      "muhammadi-quranic-400.woff2",
      "AlFars9Badr.woff2",
      "BNazanin.woff2",
    ];
    for (const name of recovered) {
      const url=publicBlobFontUrl(name);
      expect(url).toBe("https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/"+name);
      expect(isApprovedPublicBlobFontUrl(url)).toBe(true);
      expect(isApprovedPublicBlobFontUrl("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/"+name)).toBe(false);
    }
    expect(PUBLIC_BLOB_FONT_FILES).toContain("NafeesNastaleeq-v1.02.woff2");
    expect(publicBlobFontUrl("NafeesNastaleeq-v1.02.woff2")).toBe("/fonts/NafeesNastaleeq-v1.02.woff2");
    expect(isApprovedPublicBlobFontUrl("https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/NafeesNastaleeq-v1.02.woff2")).toBe(false);
    expect(PUBLIC_BLOB_FONT_FILES).not.toContain("NafeesNastaleeq.woff2");
    expect(PUBLIC_BLOB_FONT_FILES).not.toContain("asif-quranic-400.woff2");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "faiz-lahori")).toBeUndefined();
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "asif-quranic")).toBeUndefined();
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "al-qalam-quran-majeed")).toBeUndefined();
  });

  test("serves Mehr Nastaliq Web from the site until it is uploaded to the font Worker", () => {
    expect(PUBLIC_BLOB_FONT_FILES).toContain("MehrNastaliqWeb.woff2");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "mehr-nastaliq-web")?.label).toBe("Mehr Nastaliq Web");
    const url = publicBlobFontUrl("MehrNastaliqWeb.woff2");
    expect(url).toBe("/fonts/MehrNastaliqWeb.woff2");
    expect(url).not.toContain("qalam-fonts-private-mirror.techforward009.workers.dev");
    expect(url).not.toContain("blob.vercel-storage.com");
  });

  test("maps existing Jameel and Sahel faces rather than duplicating families", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "jameel-noori-nastaleeq")?.existingStudioId).toBe("jameel-noori-nastaleeq");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "sahel")?.existingStudioId).toBe("sahel");
  });

  test("does not catalogue the unlicensed Arabic or Faiz files", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "adobe-arabic")).toBeUndefined();
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "traditional-arabic")).toBeUndefined();
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "al-majeed-quranic")).toBeUndefined();
  });
});
