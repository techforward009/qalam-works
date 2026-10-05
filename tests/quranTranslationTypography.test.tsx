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
  expect(area.style.fontSize).toBe(language === "ur" ? "20px" : "17px");
  expect(area.style.lineHeight).toBe(language === "ur" ? "2.3" : "2");
  expect(area.style.fontFamily.includes("Qalam Quran Jameel")).toBe(language === "ur");
  expect(text.closest("article")?.getAttribute("dir")).toBe(language === "ur" ? "rtl" : "ltr");
});
