import { describe, expect, test } from "vitest";
import { PUBLIC_BLOB_FONT_FAMILIES, PUBLIC_BLOB_FONT_FILES, publicBlobFontUrl, isApprovedPublicBlobFontUrl } from "../app/tools/document-studio/utils/publicBlobFontCatalog";

describe("Document Studio public Blob font catalogue", () => {
  test("resolves the owner-supplied Blob URL and rejects non-approved names", () => {
    const url = publicBlobFontUrl("AdobeArabic-Regular.woff2");
    expect(url).toBe("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/AdobeArabic-Regular.woff2");
    expect(isApprovedPublicBlobFontUrl(url)).toBe(true);
    expect(publicBlobFontUrl("MehrNastaliqWeb.woff2")).toBe(
      "https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/MehrNastaliqWeb.woff2",
    );
    expect(isApprovedPublicBlobFontUrl("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/MehrNastaliqWeb.woff2")).toBe(false);
    expect(isApprovedPublicBlobFontUrl("https://evil.invalid/AdobeArabic-Regular.woff2")).toBe(false);
  });

  test("contains 16 catalogued assets including Mehr and legacy Faiz, organized into 14 font families", () => {
    expect(PUBLIC_BLOB_FONT_FILES).toHaveLength(16);
    expect(PUBLIC_BLOB_FONT_FAMILIES).toHaveLength(14);
    expect(new Set(PUBLIC_BLOB_FONT_FILES).size).toBe(16);
  });

  test("maps all six uploaded catalogued originals and keeps missing fonts on legacy names", () => {
    const recovered=[
      "Gulzar-Regular.woff2",
      "NafeesNastaleeq-v1.02.woff2","Sahel.woff2",
      "ScheherazadeNew-Medium.woff2","jameel-noori-nastaleeq-400.woff2",
      "muhammadi-quranic-400.woff2",
    ];
    for (const name of recovered) {
      const url=publicBlobFontUrl(name);
      expect(url).toBe("https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/"+name);
      expect(isApprovedPublicBlobFontUrl(url)).toBe(true);
      expect(isApprovedPublicBlobFontUrl("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/"+name)).toBe(false);
    }
    expect(publicBlobFontUrl("AdobeArabic-Regular.woff2"))
      .toBe("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/AdobeArabic-Regular.woff2");
    expect(PUBLIC_BLOB_FONT_FILES).toContain("NafeesNastaleeq-v1.02.woff2");
    expect(PUBLIC_BLOB_FONT_FILES).not.toContain("NafeesNastaleeq.woff2");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font=>font.id==="faiz-lahori")?.regular)
      .toBe("Faiz-Lahori-Web.woff2");
  });

  test("serves Mehr Nastaliq Web from the Cloudflare Worker, not Vercel Blob", () => {
    expect(PUBLIC_BLOB_FONT_FILES).toContain("MehrNastaliqWeb.woff2");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "mehr-nastaliq-web")?.label).toBe("Mehr Nastaliq Web");
    const url = publicBlobFontUrl("MehrNastaliqWeb.woff2");
    expect(url).toContain("qalam-fonts-private-mirror.techforward009.workers.dev");
    expect(url).not.toContain("blob.vercel-storage.com");
  });

  test("maps existing Jameel and Sahel faces rather than duplicating families", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "jameel-noori-nastaleeq")?.existingStudioId).toBe("jameel-noori-nastaleeq");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "sahel")?.existingStudioId).toBe("sahel");
  });

  test("preserves regular and bold assets for both Arabic families", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "adobe-arabic")?.bold).toBe("AdobeArabic-Bold.woff2");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "traditional-arabic")?.bold).toBe("TraditionalArabic-Bold.woff2");
  });
});
