/** Approved public Blob font assets. The owner supplied the Blob origin and AdobeArabic-Regular URL. All filenames are exact matches to the store inventory; Mehr Nastaliq is intentionally excluded. */
export interface PublicBlobFontFamily {
  id: string;
  label: string;
  regular: string;
  bold?: string;
  script: "urdu" | "arabic" | "persian" | "quran";
  existingStudioId?: string;
}

export const PUBLIC_BLOB_FONT_FAMILIES: readonly PublicBlobFontFamily[] = [
  { id: "adobe-arabic", label: "Adobe Arabic", regular: "AdobeArabic-Regular.woff2", bold: "AdobeArabic-Bold.woff2", script: "arabic" },
  { id: "alvi-nastaleeq", label: "Alvi Nastaleeq", regular: "Alvi_Nastaleeq.woff2", script: "urdu" },
  { id: "digital-khatt-indo-pak", label: "Digital Khatt Indo-Pak", regular: "DigitalKhattIndoPakRegular.woff2", script: "quran" },
  // Keep the legacy file available for documents saved with Faiz; hide it from the picker.
  { id: "faiz-lahori", label: "Faiz Lahori Nastaleeq", regular: "Faiz-Lahori-Web.woff2", script: "urdu" },
  { id: "gulzar", label: "Gulzar", regular: "Gulzar-Regular.woff2", script: "urdu" },
  { id: "nafees-nastaleeq", label: "Nafees Nastaleeq", regular: "NafeesNastaleeq.woff2", script: "urdu" },
  { id: "sahel", label: "Sahel", regular: "Sahel.woff2", script: "persian", existingStudioId: "sahel" },
  { id: "scheherazade-new", label: "Scheherazade New", regular: "ScheherazadeNew-Medium.woff2", script: "arabic" },
  { id: "traditional-arabic", label: "Traditional Arabic", regular: "TraditionalArabic.woff2", bold: "TraditionalArabic-Bold.woff2", script: "arabic" },
  { id: "al-majeed-quranic", label: "Al Majeed Quranic", regular: "al-majeed-quranic-400.woff2", script: "quran" },
  { id: "al-qalam-quran-majeed", label: "Al Qalam Quran Majeed", regular: "al-qalam-quran-majeed-web-regular.woff2", script: "quran" },
  { id: "asif-quranic", label: "Asif Quranic", regular: "asif-quranic-400.woff2", script: "quran" },
  { id: "jameel-noori-nastaleeq", label: "Jameel Noori Nastaleeq", regular: "jameel-noori-nastaleeq-400.woff2", script: "urdu", existingStudioId: "jameel-noori-nastaleeq" },
  { id: "muhammadi-quranic", label: "Muhammadi Quranic", regular: "muhammadi-quranic-400.woff2", script: "quran" },
] as const;

export const PUBLIC_BLOB_FONT_FILES: readonly string[] =
  PUBLIC_BLOB_FONT_FAMILIES.flatMap(font => font.bold ? [font.regular, font.bold] : [font.regular]);

export function getPublicBlobFontFamily(id: string): PublicBlobFontFamily | undefined {
  return PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === id);
}

/** Origin matches the public Vercel Blob URL supplied by the owner. */
export const PUBLIC_BLOB_FONT_BASE_URL = "https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com";

/** Resolve only catalogued filenames; never accept arbitrary paths/hosts. */
export function publicBlobFontUrl(filename: string): string {
  if (!PUBLIC_BLOB_FONT_FILES.includes(filename)) {
    throw new Error("Unapproved Document Studio font asset");
  }
  return `${PUBLIC_BLOB_FONT_BASE_URL}/${encodeURIComponent(filename)}`;
}

export function isApprovedPublicBlobFontUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin === PUBLIC_BLOB_FONT_BASE_URL
      && parsed.search === ""
      && parsed.hash === ""
      && PUBLIC_BLOB_FONT_FILES.includes(decodeURIComponent(parsed.pathname.slice(1)));
  } catch {
    return false;
  }
}
