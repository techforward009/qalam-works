import { describe, expect, test } from "vitest";
import { PUBLIC_BLOB_FONT_FAMILIES, PUBLIC_BLOB_FONT_FILES, publicBlobFontUrl, isApprovedPublicBlobFontUrl } from "../app/tools/document-studio/utils/publicBlobFontCatalog";

describe("Document Studio public Blob font catalogue", () => {
  test("unverified legacy fonts are not offered to new Document Studio users", async () => {
    const { listEditorFonts } = await import("../app/tools/document-studio/utils/fontRegistry");
    const names = new Set(listEditorFonts().map(font => font.id));
    for (const id of ["adobe-arabic", "traditional-arabic", "al-majeed-quranic", "faiz-lahori"]) {
      expect(names.has(id)).toBe(false);
    }
  });

  test("routes approved font assets away from Vercel Blob and rejects non-approved names", () => {
    const url = publicBlobFontUrl("AdobeArabic-Regular.woff2");
    expect(url).toBe("https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/AdobeArabic-Regular.woff2");
    expect(isApprovedPublicBlobFontUrl(url)).toBe(true);
    expect(() => publicBlobFontUrl("MehrNastaliqWeb.woff2")).toThrow();
    expect(isApprovedPublicBlobFontUrl("https://evil.invalid/AdobeArabic-Regular.woff2")).toBe(false);
  });

  test("contains 16 Blob assets including legacy Faiz, organized into 14 font families", () => {
    expect(PUBLIC_BLOB_FONT_FILES).toHaveLength(16);
    expect(PUBLIC_BLOB_FONT_FAMILIES).toHaveLength(14);
    expect(new Set(PUBLIC_BLOB_FONT_FILES).size).toBe(16);
  });

  test("maps all approved URLs through the independent font mirror (missing assets fail closed)", () => {
    const recovered=[
      "Alvi_Nastaleeq.woff2","Gulzar-Regular.woff2",
      "NafeesNastaleeq.woff2","Sahel.woff2",
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
      .toBe("https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/AdobeArabic-Regular.woff2");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font=>font.id==="faiz-lahori")?.regular)
      .toBe("Faiz-Lahori-Web.woff2");
  });

  test("never includes the excluded Mehr Nastaliq asset", () => {
    expect(PUBLIC_BLOB_FONT_FILES.some(file => /mehr/i.test(file))).toBe(false);
    expect(PUBLIC_BLOB_FONT_FAMILIES.some(font => /mehr/i.test(font.id))).toBe(false);
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
