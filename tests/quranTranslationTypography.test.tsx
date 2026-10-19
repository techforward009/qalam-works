// @vitest-environment happy-dom
import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import QuranTranslationPage from "../app/quran/QuranTranslationPage";

const state = vi.hoisted(() => ({ language: "ur", saved: [] as string[], preference: "mohsin-najfi" }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => state }));
vi.mock("../app/quran/reader/translationCorpus", () => ({
  QURAN_READER_TRANSLATION_SOURCES: {
    ur: { translatorUr: "علامہ شیخ محسن علی نجفی" },
    en: { translatorEn: "Ali Quli Qara'i" },
  },
  storedQuranUrduTranslator: () => state.preference,
  saveQuranUrduTranslator: (value: string) => { state.saved.push(value); },
  translationRowsForAyahs: async (ayahs: readonly unknown[]) => [
    { ayah: ayahs[0], text: "Translation sample" },
  ],
}));

beforeEach(() => {
  state.preference = "mohsin-najfi";
  state.saved = [];
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
  expect(area.style.fontFamily.includes("Mehr Nastaliq Web")).toBe(language === "ur");
  expect(text.closest("article")?.getAttribute("dir")).toBe(language === "ur" ? "rtl" : "ltr");
  const label = screen.getByText(language === "ur" ? "سورة الفاتحة، آیت ١" : "Surah 1, Ayah 1");
  if (language === "ur") {
    expect(label.className).toContain("text-[14px]");
    expect(label.style.fontFamily).toContain("Amiri");
    expect(label.style.fontFamily).not.toContain("Mehr Nastaliq Web");
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

test("renders a compact Mehr Nastaliq Web translator chooser with a separate prominent heading", async () => {
  state.language = "ur";
  render(<QuranTranslationPage ayahs={[{ id: "1:1", surah: 1, ayah: 1, text: "test" }]} selectedSurah={1} selectedAyah={1} scale={1} />);
  await screen.findByText("Translation sample");
  const picker = document.querySelector("[data-quran-translator-picker]") as HTMLDivElement;
  expect(picker.style.fontFamily).toContain("Mehr Nastaliq Web");
  expect(picker.querySelector("select")).toBeNull(); // no oversized Android native picker
  const heading = screen.getByText("مترجم منتخب کریں");
  expect(heading.closest("button")).toBeNull();
  const trigger = screen.getByRole("button", { name: /مترجم منتخب کریں/ });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  const options = within(screen.getByRole("listbox")).getAllByRole("option");
  expect(options.map(option => option.textContent?.trim())).toEqual([
    "علامہ شیخ محسن علی نجفی", "علامہ سید صفدر حسین نجفی (تفسیر نمونہ)",
  ]);
  expect(options[0].getAttribute("aria-selected")).toBe("true");
  expect(options[1].getAttribute("aria-selected")).toBe("false");
  fireEvent.click(options[1]);
  expect(state.saved).toEqual(["safdar-najfi"]);
  expect(screen.getByText("ترجمہ: علامہ سید صفدر حسین نجفی (تفسیر نمونہ)")).toBeTruthy();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("keyboard navigation and Escape close the translator list; English has no picker", async () => {
  state.language = "ur";
  const ayahs = [{ id: "1:1", surah: 1, ayah: 1, text: "test" }];
  const { rerender } = render(<QuranTranslationPage ayahs={ayahs} selectedSurah={1} selectedAyah={1} scale={1} />);
  await screen.findByText("Translation sample");
  const trigger = screen.getByRole("button", { name: /مترجم منتخب کریں/ });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const options = within(screen.getByRole("listbox")).getAllByRole("option");
  expect(document.activeElement).toBe(options[0]);
  fireEvent.keyDown(options[0], { key: "ArrowDown" });
  expect(document.activeElement).toBe(options[1]);
  fireEvent.keyDown(options[1], { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  state.language = "en";
  rerender(<QuranTranslationPage ayahs={ayahs} selectedSurah={1} selectedAyah={1} scale={1} />);
  expect(screen.queryByRole("button", { name: /مترجم منتخب کریں/ })).toBeNull();
});
