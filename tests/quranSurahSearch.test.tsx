// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import SurahSelector from "../app/quran/reader/SurahSelector";
import { findSurahNumbers, SURAH_ENGLISH_NAMES } from "../app/quran/reader/surahSearch";
import { SURAH_NAMES } from "../app/quran/reader/metadata";

afterEach(cleanup);

function renderSelector(language: "en" | "ur", onChange = vi.fn()) {
  render(<SurahSelector label={language === "ur" ? "سورۃ" : "Surah"} value={1} onChange={onChange} language={language} />);
  return {
    onChange,
    search: screen.getByRole("combobox", { name: language === "ur" ? "سورت تلاش کریں" : "Search Surahs" }),
    select: screen.getByRole("combobox", { name: language === "ur" ? "سورۃ" : "Surah" }) as HTMLSelectElement,
  };
}

describe("Surah search", () => {
  it("keeps the 114 English aliases aligned and unique against the authoritative Arabic list", () => {
    expect(SURAH_ENGLISH_NAMES).toHaveLength(SURAH_NAMES.length);
    expect(new Set(SURAH_ENGLISH_NAMES.map((name) => name.toLowerCase())).size).toBe(114);
    expect(findSurahNumbers("AL-FATI")).toContain(1);
    expect(findSurahNumbers("baqar")).toContain(2);
    expect(findSurahNumbers("Al-Ahqaf")).toEqual([46]);
  });

  it("renders English-only selector copy and English Surah names in English mode", () => {
    const { select } = renderSelector("en");
    expect(select.options[0].textContent).toBe("1. Al-Fatihah");
    expect(screen.getByPlaceholderText("Search by name or number")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    expect(screen.queryByText("سورت تلاش کریں")).toBeNull();
    expect(screen.queryByText("سورت منتخب کریں")).toBeNull();
    expect(select.textContent).not.toContain("الفاتحة");
  });

  it("renders Urdu-only selector copy and Arabic Surah names in Urdu mode", () => {
    const { select } = renderSelector("ur");
    expect(select.options[0].textContent).toBe("1. الفاتحة");
    expect(screen.getByPlaceholderText("نام یا نمبر لکھیں")).toBeTruthy();
    expect(screen.queryByText("Search Surahs")).toBeNull();
    expect(screen.queryByText("Select a Surah")).toBeNull();
    expect(select.textContent).not.toContain("Al-Fatihah");
  });

  it.each([
    ["احقاف", "ur"],
    ["Al-Ahqaf", "en"],
    ["46", "en"],
  ] as const)("navigates to Surah 46 with Enter for query %s", (query, language) => {
    const { onChange, search } = renderSelector(language);
    fireEvent.change(search, { target: { value: query } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(46);
    expect((search as HTMLInputElement).value).toBe("");
  });

  it("uses the first match on Enter and lets arrows choose another matching Surah", () => {
    const { onChange, search } = renderSelector("en");
    fireEvent.change(search, { target: { value: "saff" } });
    expect(findSurahNumbers("saff")).toEqual([37, 61]);
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(37);

    cleanup();
    const nextChange = vi.fn();
    const next = renderSelector("en", nextChange);
    fireEvent.change(next.search, { target: { value: "saff" } });
    fireEvent.keyDown(next.search, { key: "ArrowDown" });
    expect(next.search.getAttribute("aria-activedescendant")).toContain("option-37");
    fireEvent.keyDown(next.search, { key: "ArrowDown" });
    expect(next.search.getAttribute("aria-activedescendant")).toContain("option-61");
    fireEvent.keyDown(next.search, { key: "ArrowUp" });
    expect(next.search.getAttribute("aria-activedescendant")).toContain("option-37");
    fireEvent.keyDown(next.search, { key: "ArrowDown" });
    fireEvent.keyDown(next.search, { key: "Enter" });
    expect(nextChange).toHaveBeenCalledWith(61);
  });

  it("does not navigate on empty Enter; Escape closes suggestions then clears the query", () => {
    const { onChange, search } = renderSelector("en");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(search, { target: { value: "Al-Ahqaf" } });
    expect(search.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search.getAttribute("aria-expanded")).toBe("false");
    expect((search as HTMLInputElement).value).toBe("Al-Ahqaf");
    fireEvent.keyDown(search, { key: "Escape" });
    expect((search as HTMLInputElement).value).toBe("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports mouse selection and clears the search afterward", () => {
    const { onChange, search } = renderSelector("ur");
    fireEvent.change(search, { target: { value: "احقاف" } });
    const listbox = screen.getByRole("listbox");
    fireEvent.click(within(listbox).getByRole("option", { name: "46. الأحقاف" }));
    expect(onChange).toHaveBeenCalledWith(46);
    expect((search as HTMLInputElement).value).toBe("");
  });

  it("reports localized no-results and clearing restores all 114 Surahs", () => {
    const { search, select } = renderSelector("ur");
    fireEvent.change(search, { target: { value: "zzz-no-surah" } });
    expect(screen.getByRole("status").textContent).toBe("کوئی سورت نہیں ملی۔");
    fireEvent.change(search, { target: { value: "احقاف" } });
    fireEvent.click(screen.getByRole("button", { name: "تلاش صاف کریں" }));
    expect((search as HTMLInputElement).value).toBe("");
    expect(select.options).toHaveLength(114);
  });

  it("uses unique accessible input, list, and select IDs across instances", () => {
    render(
      <>
        <SurahSelector label="Surah one" value={1} onChange={vi.fn()} language="en" />
        <SurahSelector label="Surah two" value={2} onChange={vi.fn()} language="en" />
      </>,
    );
    const inputs = screen.getAllByRole("combobox", { name: "Search Surahs" });
    const selects = [screen.getByRole("combobox", { name: "Surah one" }), screen.getByRole("combobox", { name: "Surah two" })];
    const ids = [...inputs, ...selects].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(Boolean)).toBe(true);
    fireEvent.change(inputs[0], { target: { value: "Al-Ahqaf" } });
    fireEvent.change(inputs[1], { target: { value: "Al-Ahqaf" } });
    const lists = screen.getAllByRole("listbox");
    expect(new Set(lists.map((list) => list.id)).size).toBe(2);
    expect(inputs[0].getAttribute("aria-controls")).toBe(lists[0].id);
    expect(inputs[1].getAttribute("aria-controls")).toBe(lists[1].id);
  });

  it("keeps all three reader integrations on the shared selector and their existing first-ayah navigation", () => {
    const quran = readFileSync("app/quran/QuranReader.tsx", "utf8");
    const digital = readFileSync("app/quran/indopak-digital-khatt/DigitalKhattReader.tsx", "utf8");
    const madinah = readFileSync("app/quran/madinah/MadinahReader.tsx", "utf8");
    expect(quran).toContain("<SurahSelector");
    expect(quran).toContain("go({ surah: value, ayah: 1 })");
    expect(digital).toContain("<SurahSelector");
    expect(digital).toContain("navigate(nextSurah, 1)");
    expect(madinah).toContain("<SurahSelector");
    expect(madinah).toContain("navigate(nextSurah,1)");
  });
});
