const QPC_HAFS_PAGE_BASE =
  "https://raw.githubusercontent.com/iredox10/quran-nur-desktop/e1c4bf0ab81d6dd55b5a91b32c489c5debd51e0f/public/data/pages";

export type QpcHafsWord = {
  location: string;
  text_qpc_hafs?: string;
};

export type QpcHafsVerse = {
  verse_key: string;
  text_qpc_hafs?: string;
  words?: QpcHafsWord[];
};

const PAGE_CACHE = new Map<number, Promise<readonly QpcHafsVerse[]>>();
const RESOLVED_PAGES = new Map<number, readonly QpcHafsVerse[]>();

function normalizeClipboardText(value: string): string {
  return value.replace(/[\u00A0\u202F]+/g, " ").trim();
}

export function verseKeyFromLocation(location: string): string | null {
  const match = location.match(/^(\d+):(\d+):\d+$/);
  return match ? match[1] + ":" + match[2] : null;
}

export function cachedQpcHafsPage(pageNumber: number): readonly QpcHafsVerse[] | null {
  return RESOLVED_PAGES.get(pageNumber) ?? null;
}

export async function loadQpcHafsPage(pageNumber: number): Promise<readonly QpcHafsVerse[]> {
  const resolved = RESOLVED_PAGES.get(pageNumber);
  if (resolved) return resolved;
  if (PAGE_CACHE.has(pageNumber)) return PAGE_CACHE.get(pageNumber)!;

  const promise = (async () => {
    const response = await fetch(QPC_HAFS_PAGE_BASE + "/" + pageNumber + ".json", { cache: "force-cache" });
    if (!response.ok) throw new Error("QPC Hafs page " + pageNumber + " could not be loaded (" + response.status + ").");
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) throw new Error("QPC Hafs page " + pageNumber + " has an invalid format.");
    const verses = payload.filter((item): item is QpcHafsVerse =>
      typeof item === "object" && item !== null && typeof item.verse_key === "string",
    );
    RESOLVED_PAGES.set(pageNumber, verses);
    return verses;
  })();

  PAGE_CACHE.set(pageNumber, promise);
  try {
    return await promise;
  } catch (error) {
    PAGE_CACHE.delete(pageNumber);
    throw error;
  }
}

export function qpcHafsTextForVerseKeys(
  verses: readonly QpcHafsVerse[],
  verseKeys: ReadonlySet<string>,
): string {
  return verses
    .filter((verse) => verseKeys.has(verse.verse_key) && typeof verse.text_qpc_hafs === "string")
    .map((verse) => normalizeClipboardText(verse.text_qpc_hafs!))
    .filter(Boolean)
    .join("\n");
}

export function qpcHafsTextForPage(verses: readonly QpcHafsVerse[]): string {
  return verses
    .map((verse) => typeof verse.text_qpc_hafs === "string" ? normalizeClipboardText(verse.text_qpc_hafs) : "")
    .filter(Boolean)
    .join("\n");
}
