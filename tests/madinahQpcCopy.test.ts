import { describe, expect, it, vi } from "vitest";
import {
  loadQpcHafsPage,
  qpcHafsTextForPage,
  qpcHafsTextForVerseKeys,
  verseKeyFromLocation,
} from "../app/quran/madinah/qpcHafsCopy";

describe("Madinah QPC Hafs copy", () => {
  const verses = [
    { verse_key: "1:1", text_qpc_hafs: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ ١" },
    { verse_key: "1:2", text_qpc_hafs: "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ ٢" },
    { verse_key: "1:3", text_qpc_hafs: "ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ ٣" },
  ] as const;

  it("maps word locations to verse keys", () => {
    expect(verseKeyFromLocation("1:2:4")).toBe("1:2");
    expect(verseKeyFromLocation("bad")).toBeNull();
  });

  it("copies QPC Hafs text without AhmedGraf pause markers", () => {
    expect(qpcHafsTextForPage(verses)).toBe(
      "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ ١\nٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ ٢\nٱلرَّحۡمَٰنِ ٱلرَّحِيمِ ٣",
    );
    expect(qpcHafsTextForVerseKeys(verses, new Set(["1:2"]))).toBe(
      "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ ٢",
    );
    expect(qpcHafsTextForPage(verses)).not.toContain("۝۰");
  });

  it("loads one pinned page endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => verses,
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await loadQpcHafsPage(99991);
    expect(result).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("quran-nur-desktop"),
      { cache: "force-cache" },
    );
    vi.unstubAllGlobals();
  });
});
