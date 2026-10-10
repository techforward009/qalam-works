import { describe, expect, test } from "vitest";
import { PUBLIC_BLOB_FONT_FAMILIES, PUBLIC_BLOB_FONT_FILES, publicBlobFontUrl, isApprovedPublicBlobFontUrl } from "../app/tools/document-studio/utils/publicBlobFontCatalog";

describe("Document Studio public Blob font catalogue", () => {
  test("resolves the owner-supplied Blob URL and rejects non-approved names", () => {
    const url = publicBlobFontUrl("AdobeArabic-Regular.woff2");
    expect(url).toBe("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/AdobeArabic-Regular.woff2");
    expect(isApprovedPublicBlobFontUrl(url)).toBe(true);
    expect(() => publicBlobFontUrl("MehrNastaliqWeb.woff2")).toThrow();
    expect(isApprovedPublicBlobFontUrl("https://evil.invalid/AdobeArabic-Regular.woff2")).toBe(false);
  });

  test("contains 16 Blob assets including legacy Faiz, organized into 14 font families", () => {
    expect(PUBLIC_BLOB_FONT_FILES).toHaveLength(16);
    expect(PUBLIC_BLOB_FONT_FAMILIES).toHaveLength(14);
    expect(new Set(PUBLIC_BLOB_FONT_FILES).size).toBe(16);
  });

  test("maps Gulzar to the user-supplied Vercel Blob font and retains Faiz only for legacy documents", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "gulzar")?.regular).toBe("Gulzar-Regular.woff2");
    expect(publicBlobFontUrl("Gulzar-Regular.woff2")).toBe("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/Gulzar-Regular.woff2");
    expect(PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === "faiz-lahori")?.regular).toBe("Faiz-Lahori-Web.woff2");
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
