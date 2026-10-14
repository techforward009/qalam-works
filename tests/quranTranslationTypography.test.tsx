// @vitest-environment happy-dom
import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import QuranTranslationPage from "../app/quran/QuranTranslationPage";

const state = vi.hoisted(() => ({ language: "ur" }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => state }));
vi.mock("../app/quran/reader/translationCorpus", () => ({
  QURAN_READER_TRANSLATION_SOURCES: {
    ur: { translatorUr: "علامہ شیخ محسن علی نجفی" },
    en: { translatorEn: "Ali Quli Qara'i" },
  },
  translationRowsForAyahs: async (ayahs: readonly unknown[]) => [
    { ayah: ayahs[0], text: "Translation sample" },
  ],
}));

beforeEach(() => {
  vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test.each(["ur", "en"])("applies readable translation typography and direction in %s", async language => {
  state.language = language;
  render(<QuranTranslationPage ayahs={[{ id: "1:1", surah: 1, ayah: 1, text: "test" }]} selectedSurah={1} selectedAyah={1} scale={1} />);
  const text = await screen.findByText("Translation sample");
  const area = text.parentElement!.parentElement!.parentElement!;
  expect(area.style.fontSize).toBe(language === "ur" ? "22px" : "17px");
  expect(area.style.lineHeight).toBe(language === "ur" ? "2.3" : "2");
  expect(area.style.fontFamily.includes("Qalam Quran Jameel")).toBe(language === "ur");
  expect(text.closest("article")?.getAttribute("dir")).toBe(language === "ur" ? "rtl" : "ltr");
  const label = screen.getByText(language === "ur" ? "سورة الفاتحة، آیت ١" : "Surah 1, Ayah 1");
  if (language === "ur") {
    expect(label.className).toContain("text-[14px]");
    expect(label.style.fontFamily).toContain("Amiri");
    expect(label.style.fontFamily).not.toContain("Qalam Quran Jameel");
    expect(screen.getByText("ترجمۂ قرآن").style.fontFamily).toContain("Gulzar");
    expect(screen.getByText("ترجمہ: علامہ شیخ محسن علی نجفی").style.fontFamily).toContain("Gulzar");
  } else {
    expect(label.className).toContain("text-[12px]");
    expect(label.style.fontFamily).toBe("");
    expect(screen.getByText("Qur'an Translation").style.fontFamily).toBe("");
  }
});

test("scales 22px Urdu translation with reader selection without shrinking the 14px verse label", async () => {
  state.language = "ur";
  render(<QuranTranslationPage ayahs={[{ id: "1:1", surah: 1, ayah: 1, text: "test" }]} selectedSurah={1} selectedAyah={1} scale={0.85} />);
  const translation = await screen.findByText("Translation sample");
  expect(translation.parentElement!.parentElement!.parentElement!.style.fontSize).toBe("19px");
  expect(screen.getByText("سورة الفاتحة، آیت ١").className).toContain("text-[14px]");
});
