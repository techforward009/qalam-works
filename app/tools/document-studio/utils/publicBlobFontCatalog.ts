/** Approved public font assets. Mehr Nastaliq Web is served by the Cloudflare font Worker, never Vercel Blob. */
export interface PublicBlobFontFamily {
  id: string;
  label: string;
  regular: string;
  bold?: string;
  script: "urdu" | "arabic" | "persian" | "quran";
  existingStudioId?: string;
}

export const PUBLIC_BLOB_FONT_FAMILIES: readonly PublicBlobFontFamily[] = [
  { id: "digital-khatt-indo-pak", label: "Digital Khatt Indo-Pak", regular: "DigitalKhattIndoPakRegular.woff2", script: "quran" },
  { id: "gulzar", label: "Gulzar", regular: "Gulzar-Regular.woff2", script: "urdu" },
  { id: "nafees-nastaleeq", label: "Nafees Nastaleeq", regular: "NafeesNastaleeq-v1.02.woff2", script: "urdu" },
  { id: "sahel", label: "Sahel", regular: "Sahel.woff2", script: "persian", existingStudioId: "sahel" },
  { id: "scheherazade-new", label: "Scheherazade New", regular: "ScheherazadeNew-Medium.woff2", script: "arabic" },
  { id: "jameel-noori-nastaleeq", label: "Jameel Noori Nastaleeq", regular: "jameel-noori-nastaleeq-400.woff2", script: "urdu", existingStudioId: "jameel-noori-nastaleeq" },
  { id: "mehr-nastaliq-web", label: "Mehr Nastaliq Web", regular: "MehrNastaliqWeb.woff2", script: "urdu" },
  { id: "muhammadi-quranic", label: "Muhammadi Quranic", regular: "muhammadi-quranic-400.woff2", script: "quran" },
] as const;

export const PUBLIC_BLOB_FONT_FILES: readonly string[] =
  PUBLIC_BLOB_FONT_FAMILIES.flatMap(font => font.bold ? [font.regular, font.bold] : [font.regular]);

export function getPublicBlobFontFamily(id: string): PublicBlobFontFamily | undefined {
  return PUBLIC_BLOB_FONT_FAMILIES.find(font => font.id === id);
}

/** Owner-authorized originals uploaded to private R2, exposed only through the independent Worker. Unavailable original assets remain on legacy URLs, never substituted. */
export const PUBLIC_BLOB_FONT_BASE_URL = "https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com";
export const QALAM_OFL_FONT_MIRROR_BASE_URL =
  "https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts";
const LOCALLY_HOSTED_FONT_FILES = new Set(["DigitalKhattIndoPakRegular.woff2"]);
const R2_MIRRORED_FONT_FILES = new Set([
  "Gulzar-Regular.woff2",
  "NafeesNastaleeq-v1.02.woff2",
  "Sahel.woff2",
  "ScheherazadeNew-Medium.woff2",
  "jameel-noori-nastaleeq-400.woff2",
  "MehrNastaliqWeb.woff2",
  "muhammadi-quranic-400.woff2",
]);
/** Resolve only catalogued filenames; never accept arbitrary paths/hosts. */
export function publicBlobFontUrl(filename: string): string {
  if (!PUBLIC_BLOB_FONT_FILES.includes(filename)) {
    throw new Error("Unapproved Document Studio font asset");
  }
  if (LOCALLY_HOSTED_FONT_FILES.has(filename)) return `/fonts/${encodeURIComponent(filename)}`;
  const origin = R2_MIRRORED_FONT_FILES.has(filename)
    ? QALAM_OFL_FONT_MIRROR_BASE_URL
    : PUBLIC_BLOB_FONT_BASE_URL;
  return `${origin}/${encodeURIComponent(filename)}`;
}
export function isApprovedPublicBlobFontUrl(url: string): boolean {
  try {
    const parsed = new URL(url, "https://qalam.local");
    if (parsed.search !== "" || parsed.hash !== "" || parsed.username || parsed.password) return false;
    const filename = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    const expected = publicBlobFontUrl(filename);
    return PUBLIC_BLOB_FONT_FILES.includes(filename) &&
      (expected.startsWith("/") ? url === expected : parsed.href === expected);
  } catch {
    return false;
  }
}
