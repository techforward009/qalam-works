import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { surahBanner } from "../app/quran/indopak-digital-khatt/surahBanner";

const read = (name: string) => readFileSync(name, "utf8");
const conventional = read("app/quran/QuranReader.tsx");
const digital = read("app/quran/indopak-digital-khatt/DigitalKhattReader.tsx");
const styles = read("app/globals.css");
const digitalCss = read("app/quran/indopak-digital-khatt/reader.module.css");
const translation = read("app/quran/QuranTranslationPage.tsx");
const transliteration = read("app/quran/QuranTransliterationPage.tsx");
const tafsir = read("app/quran/QuranTafsirPage.tsx");

describe("Quran Reader typography and layout acceptance contracts", () => {
  it("preserves both underlying Surah numbers and safely isolates their parentheses in RTL", () => {
    for (const number of [1, 2, 19, 63, 96, 114]) {
      const banner = surahBanner(number);
      expect(banner.name).toContain("سُوْرَةُ");
      expect(banner.surahNumber.length).toBeGreaterThan(0);
      expect(banner.revealed.length).toBeGreaterThan(0);
    }
    expect(conventional).toContain('<bdi dir="ltr" className="quran-banner-number">({banner.surahNumber})</bdi>');
    expect(conventional).toContain('<bdi dir="ltr" className="quran-banner-number">({banner.revealed})</bdi>');
    expect(digital).toContain('<bdi dir="ltr" className={styles.bannerNumber}>({banner?.surahNumber})</bdi>');
    expect(digital).toContain('<bdi dir="ltr" className={styles.bannerNumber}>({banner?.revealed})</bdi>');
    expect(digital).toContain("{banner?.ayatCount}");
    expect(conventional).toContain("{banner.ayatCount}");
  });

  it("centers all Surah header items without baseline positioning", () => {
    expect(styles).toMatch(/\.quran-surah-header\s*\{[^}]*align-items:\s*center/s);
    expect(styles).toMatch(/\.quran-surah-header\s*>\s*\*\s*\{[^}]*align-self:\s*center/s);
    expect(styles).toMatch(/\.quran-surah-place\s*\{[^}]*align-self:\s*center/s);
    expect(styles).toMatch(/\.quran-surah-count\s*\{[^}]*align-items:\s*center/s);
    expect(digitalCss).toMatch(/\.surahHeader\s*\{[^}]*align-items:\s*center/s);
    expect(digitalCss).toMatch(/\.surahHeader\s*>\s*\*\s*\{[^}]*align-self:\s*center/s);
    expect(digitalCss).toMatch(/\.surahCount\s*\{[^}]*align-items:\s*center/s);
    expect(styles).toContain("font-size: 18px");
    expect(styles).toContain("font-size: 15px");
  });

  it("uses a paper-light Quran surface in dark mode while keeping real text and ayah identifiers", () => {
    expect(styles).toMatch(/\.quran-reader-paper\s*\{[^}]*color-scheme:\s*light/s);
    expect(styles).toContain(".quran-reader-paper .quran-translation-text");
    expect(styles).toContain(".quran-reader-paper .quran-translation-label");
    for (const source of [translation, transliteration, tafsir]) {
      expect(source).toContain("quran-reader-paper");
    }
    expect(translation).toContain("translation-ayah-");
    expect(translation).toContain("scrollIntoView");
    expect(translation).toContain("quran-translation-card");
    expect(translation).not.toContain('dark:bg-[#151a16]');
    expect(translation).not.toContain('dark:bg-[#293126]');
    expect(translation).not.toContain("const isActive =");
    expect(transliteration).not.toContain("const active =");
    expect(conventional).toContain('className="quran-ayah inline"');
  });

  it("locks existing Alvi for Tafsir Urdu and Amiri for vowelled Arabic, no new asset", () => {
    expect(tafsir).toContain('fontFamily: \'"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif\'');
    expect(tafsir).toContain('data-tafsir-arabic="true"');
    expect(tafsir).toContain('var(--font-amiri), "Amiri"');
    expect(tafsir).not.toContain("Preview Urdu font:");
    expect(styles).toContain("Alvi_Nastaleeq.woff2");
  });
});
