// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SurahSelector from "../app/quran/reader/SurahSelector";
import { findSurahNumbers, SURAH_ENGLISH_NAMES } from "../app/quran/reader/surahSearch";
import { SURAH_NAMES } from "../app/quran/reader/metadata";

afterEach(cleanup);

describe("Surah search", () => {
  it("keeps English aliases aligned to the authoritative Arabic Surah order", () => {
    expect(SURAH_ENGLISH_NAMES).toHaveLength(SURAH_NAMES.length);
    expect(findSurahNumbers("AL-FATI")).toContain(1);
    expect(findSurahNumbers("baqar")).toContain(2);
  });

  it("matches Urdu names and Arabic, Urdu and Latin digits", () => {
    expect(findSurahNumbers("الفاتحہ")).toContain(1);
    expect(findSurahNumbers("۲")).toEqual([2]);
    expect(findSurahNumbers("2")).toEqual([2]);
    expect(findSurahNumbers("114")).toEqual([114]);
  });

  it("filters immediately, navigates to the selected number and clears back to all Surahs", () => {
    const onChange = vi.fn();
    render(<SurahSelector label="Surah" value={1} onChange={onChange} language="en" />);
    const search = screen.getByRole("searchbox", { name: /Search Surahs/ });
    fireEvent.change(search, { target: { value: "baqar" } });
    const select = screen.getByRole("combobox", { name: "Surah" }) as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual(["", "2"]);
    fireEvent.click(screen.getByRole("button", { name: /Clear search/ }));
    expect((search as HTMLInputElement).value).toBe("");
    expect(select.options).toHaveLength(114);
    fireEvent.change(search, { target: { value: "baqar" } });
    fireEvent.change(select, { target: { value: "2" } });
    expect(onChange).toHaveBeenCalledWith(2);
    expect((search as HTMLInputElement).value).toBe("");
    expect(select.options).toHaveLength(114);
  });

  it("sets RTL for Urdu interface text and reports no matches", () => {
    render(<SurahSelector label="سورۃ" value={1} onChange={vi.fn()} language="ur" />);
    const search = screen.getByRole("searchbox", { name: /Search Surahs/ });
    fireEvent.change(search, { target: { value: "zzz-no-surah" } });
    expect(search.getAttribute("dir")).toBe("auto");
    expect(search.closest("[lang=ur]")?.getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("status").textContent).toContain("کوئی سورت نہیں ملی");
  });
});
