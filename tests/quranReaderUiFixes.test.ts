import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { surahBanner } from "../app/quran/indopak-digital-khatt/surahBanner";
import { displaySurahBannerName, initialQuranDisplayScale } from "../app/quran/reader/readerPresentation";

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

  it("locks Alvi body, Gulzar headings, and Scheherazade Arabic in Tafsir only", () => {
    expect(tafsir).toContain('fontFamily: \'"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif\'');
    expect(tafsir).toContain('data-tafsir-arabic="true"');
    expect(tafsir).toContain('fontFamily: \'"Qalam Tafsir Scheherazade", serif\'');
    expect(tafsir).toContain('publicBlobFontUrl("ScheherazadeNew-Medium.woff2")');
    expect(tafsir).not.toContain('data-tafsir-font-warning');
    expect(tafsir).not.toContain('var(--font-amiri), "Amiri"');
    expect(tafsir).toContain('fontFamily: \'"Gulzar", serif\'');
    expect(tafsir).toContain('data-tafsir-topic-heading="true"');
    expect(tafsir).not.toContain("Preview Urdu font:");
    expect(styles).toContain("Alvi_Nastaleeq.woff2");
    expect(styles).toMatch(/font-family:\s*"Digital Khatt Indo-Pak"/);
    expect(styles).toMatch(/font-family:\s*"Gulzar"/);
  });

  it("centers the Urdu Tafsir title and keeps source label and Nastaliq source options on one row", () => {
    expect(tafsir).toContain('data-tafsir-urdu-header="true"');
    expect(tafsir).toContain('data-tafsir-source-row="true"');
    expect(tafsir).toContain('mx-auto text-center');
    expect(tafsir).toContain('sourceMenuRef');
    expect(tafsir).toContain('fontFamily: \'"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif\'');
    expect(tafsir).toContain('fontFamily: \'"Gulzar", "Noto Nastaliq Urdu", serif\'');
    expect(tafsir).toContain('زیرِ تکمیل');
    expect(tafsir).toContain('disabled={!available}');
    expect(tafsir).toContain('اس تفسیری مضمون کے موضوعات');
    expect(tafsir).toContain('tafsir-topic-');
    expect(tafsir).toContain('بسم اللہ الرحمن الرحیم');
    expect(tafsir).not.toContain('font-naskh text-[0.78em]');
  });

  it("shares the first-verse topic count, list and anchors across Urdu and English Tafsir", () => {
    expect(tafsir).toContain('data-tafsir-topics-index={chosenLanguage}');
    expect(tafsir).toContain('remoteTopics.length > 1 ? (');
    expect(tafsir).toContain('Topics in this commentary');
    expect(tafsir).toContain('اس تفسیری مضمون کے موضوعات');
    expect(tafsir).toContain('displayTafsirHeading(tafsirDisplayTopicHeading(topic.title, topic.text), chosenLanguage)');
    expect(tafsir).toContain('href={"#tafsir-topic-" + i}');
    expect(tafsir).toContain('id={"tafsir-topic-" + i}');
    expect(tafsir).toContain('dir={ur ? "rtl" : "ltr"}');
    expect(tafsir).toContain('fontSize: language === "ur" ? "20px" : "1.12em"');
  });

  it("shows original shared commentary verse scope without presenting it as a per-ayah extract", () => {
    const route = read("app/api/quran/tafsir-namoona/route.ts");
    expect(route).toContain('indexTafsirCoverage(corpus.verses)');
    expect(route).toContain('tafsirCoverageForRefs(entryIndex.refs, coverageIndex)');
    expect(route).toContain('heading: topics[0]?.title ?? "", topics, coverage,');
    expect(tafsir).toContain('data-tafsir-verse-coverage="true"');
    expect(tafsir).toContain('data-tafsir-source-ranges="true"');
    expect(tafsir).toContain('اس تفسیر میں شامل آیات');
    expect(tafsir).toContain('Verses covered by this commentary');
    expect(tafsir).toContain('منتخب آیت: ');
    expect(tafsir).toContain('Selected verse: ');
    expect(tafsir).toContain('tafsirDisplayTopicBody(topic.title, topic.text)');
    expect(tafsir).not.toContain('خودکار آیت وار خلاصہ');
  });

  it("passes every actual printed Quran-page ayah to Tafsir instead of only the selected ayah", () => {
    expect(conventional).toContain('<QuranTafsirPage surah={surah} ayah={ayah} ayahs={ayahs} />');
    expect(tafsir).toContain('const pageVerseKeys = ayahs?.map((item) => item.surah + ":" + item.ayah).join(",") ?? ""');
    expect(tafsir).toContain('encodeURIComponent(pageVerseKeys)');
    expect(tafsir).toContain('data-tafsir-page-sections="true"');
    expect(tafsir).toContain('sections={pageSections}');
    expect(tafsir).toContain('sourceKey: string;');
    expect(tafsir).toContain('اس قرآنی صفحے کی تفسیریں');
    expect(tafsir).toContain('Commentary for this Quran page');
    expect(tafsir).toContain('data-tafsir-source-section={section.sourceKey}');
    const route = read("app/api/quran/tafsir-namoona/route.ts");
    expect(route).toContain('const pageVerseParam = query.get("verses")');
    expect(route).toContain('pageVerseKeys: pageKeys');
    expect(route).toContain('sections: [...bySource.values()]');
    expect(route).toContain('sourceKey,');
    expect(route).toContain('verseKeysOnPage: [verseKey]');
    expect(route).toContain('coverage: [...(coverageIndex.get(sourceKey) ?? [])]');
    expect(route).toContain('checkHash(file, RELEASE[language].digest)');
  });

  it("keeps Quran translation text, selector, saved translator preference, and approved fonts intact", () => {
    const translationCorpus = read("app/quran/reader/translationCorpus.ts");
    expect(translation).toContain("ترجمۂ قرآن");
    expect(translation).toContain('"ترجمہ: " +');
    expect(translation).toContain("مترجم منتخب کریں");
    expect(translation).toContain('<option value="mohsin-najfi">علامہ شیخ محسن علی نجفی</option>');
    expect(translation).toContain("storedQuranUrduTranslator()");
    expect(translation).toContain("saveQuranUrduTranslator(next)");
    expect(translation).toContain('"Gulzar", "Noto Nastaliq Urdu", serif');
    expect(translation).toContain('"Qalam Quran Jameel", "Noto Nastaliq Urdu", serif');
    expect(translationCorpus).toContain('"mohsin-najfi"');
    expect(translationCorpus).toContain('"safdar-najfi"');
  });

  it("centers Juz, page and Surah top-row items on the same vertical axis", () => {
    expect(styles).toMatch(/\.quran-page-meta\s*\{[^}]*align-items:\s*center/s);
    expect(styles).toMatch(/\.quran-page-meta-item\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center/s);
    expect(styles).toMatch(/\.quran-page-meta-item\s*\{[^}]*padding-bottom:\s*0/s);
    expect(styles).toMatch(/\.quran-surah-header\s*>\s*\*\s*\{[^}]*translateY\(0\.12em\)/s);
    expect(digitalCss).toMatch(/\.surahHeader\s*>\s*\*\s*\{[^}]*translateY\(0\.12em\)/s);
  });

  it("shows diacritic-free names for all 114 Surahs without changing metadata or Quran text", () => {
    for (let number = 1; number <= 114; number++) {
      const original = surahBanner(number).name;
      const displayed = displaySurahBannerName(original);
      expect(displayed).not.toMatch(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/u);
      expect(displayed.startsWith("سورة ")).toBe(true);
      expect(displayed.length).toBeGreaterThan(5);
      expect(surahBanner(number).name).toBe(original);
    }
    expect(displaySurahBannerName("سُوْرَةُ الْفَاتِحَةِ")).toBe("سورة الفاتحة");
    expect(conventional).toContain("displaySurahBannerName(banner.name)");
    expect(digital).toContain('displaySurahBannerName(banner?.name ?? "")');
  });

  it("chooses Small on mobile in all three editions unless user explicitly saved another size", () => {
    expect(initialQuranDisplayScale(null, true)).toBe(0.85);
    expect(initialQuranDisplayScale(null, false)).toBe(1);
    expect(initialQuranDisplayScale("", true)).toBe(0.85);
    expect(initialQuranDisplayScale("0.85", false)).toBe(0.85);
    expect(initialQuranDisplayScale("1", true)).toBe(1);
    expect(initialQuranDisplayScale("1.12", true)).toBe(1.12);
    expect(initialQuranDisplayScale("unexpected", true)).toBe(0.85);
    const madinah = read("app/quran/madinah/MadinahReader.tsx");
    for (const source of [conventional, digital, madinah]) {
      expect(source).toContain("initialQuranDisplayScale(");
      expect(source).toContain('window.matchMedia("(max-width: 639px)").matches');
    }
  });

  it("uses black for all elements in both Surah information boxes", () => {
    for (const [css, selectors] of [
      [styles, [".quran-surah-header", ".quran-surah-place,", ".quran-banner-name", ".quran-banner-number", ".quran-banner-digit"]],
      [digitalCss, [".surahHeader", ".surahPlace,", ".surahName", ".bannerNumber", ".bannerDigit"]],
    ] as const) {
      for (const selector of selectors) {
        const from = css.indexOf(selector);
        expect(from, selector).toBeGreaterThanOrEqual(0);
        expect(css.slice(from, css.indexOf("}", from))).toContain("color: #000;");
      }
    }
  });

  it("keeps original outer running-head positions and vertically centers page arrows and number", () => {
    expect(styles).toMatch(/\.quran-page-meta-juz\s*\{[^}]*justify-content:\s*flex-start/s);
    expect(styles).toMatch(/\.quran-page-meta-surah\s*\{[^}]*justify-content:\s*flex-end/s);
    expect(styles).not.toMatch(/\.quran-page-meta-item\s*>\s*\*\s*\{\s*transform:/s);
    expect(styles).toMatch(/\.quran-page-meta-page-number\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center/s);
    expect(styles).toMatch(/\.quran-page-arrow\s*\{[^}]*align-items:\s*center;[^}]*justify-content:\s*center/s);
    expect(conventional).toContain('className="quran-page-meta-page-number"');
    expect(digital).toContain('className="quran-page-meta-page-number"');
  });

  it("shows only the active interface language on larger accessible reader tabs", () => {
    for (const label of ["copy.quranTab", "copy.translationTab", "copy.transliterationTab", "copy.tafsirTab"]) {
      expect(conventional).toContain(label);
    }
    expect(conventional).toContain('] as const).filter(([value]) => language !== "ur" || value !== "transliteration").map(([value, label]) => (');
    expect(conventional).not.toContain('quran-reader-tab-alt');
    expect(styles).not.toContain('.quran-reader-tab-alt');
    expect(styles).toMatch(/\.quran-reader-tab\s*\{[^}]*font-size:\s*16px/s);
    expect(styles).toMatch(/\.quran-view-tabs\[lang="ur"\]\s+\.quran-reader-tab\s*\{[^}]*font-size:\s*18px/s);
  });

  it("hides the transliteration tab in Urdu but preserves it in English and keyboard navigation", () => {
    expect(conventional).toContain('language !== "ur" || value !== "transliteration"');
    expect(conventional).toContain('language !== "ur" || view !== "transliteration"');
    expect(conventional).toContain('const activeReaderView = language === "ur" && readerView === "transliteration" ? "quran" : readerView');
    expect(conventional).toContain('const index = views.indexOf(activeReaderView)');
    expect(conventional).toContain('aria-selected={activeReaderView === value}');
    expect(conventional).toContain('aria-labelledby={"quran-tab-" + activeReaderView}');
    expect(conventional).toContain('["tafsir", copy.tafsirTab]');
    expect(conventional).toContain('["transliteration", copy.transliterationTab]');
    expect(conventional).toContain('language === "ur" ? "قرآن، ترجمہ، تفسیر"');
    expect(conventional).toContain('onClick={() => chooseReaderView(value)}');
  });

  it("reads private v10 Urdu and English from the research store via OIDC without changing v9", () => {
    const route = read("app/api/quran/tafsir-namoona/route.ts");
    expect(route).toContain('import { getVercelOidcToken } from "@vercel/oidc"');
    expect(route).toContain('QALAM_RESEARCH_STORE_ID');
    expect(route).toContain('oidcToken, useCache: false');
    expect(route).toContain('const file = await loadResearchBlob(RELEASE[language].path)');
    expect(route).toContain('const file = await loadBlob([');
    expect(route).toContain('"qalam/tafsir-namoona/urdu-v9.json.br"');
    expect(route).toContain('checkHash(file, RELEASE[language].digest)');
  });

  it("pins the reviewed private Urdu v10 archive and matching checksum without changing English or v9 rollback", () => {
    const route = read("app/api/quran/tafsir-namoona/route.ts");
    expect(route).toContain('"qalam/tafsir-namoona/urdu-v10-reviewed-first20-20261015.json.br"');
    expect(route).toContain('"119f8e96988a317df531a21ac8f271447e7c3a856f1ab11bac57cf5fb8a45c38"');
    expect(route).toContain('"qalam/tafsir-namoona/english-v10-release-20261015.json.br"');
    expect(route).toContain('"6e08e6952e33a452f7f644c6462cdad3d8250741ef7f1445c3ae5d37becaed59"');
    expect(route).toContain('"qalam/tafsir-namoona/urdu-v9.json.br"');
    expect(route).toContain('checkHash(file, RELEASE[language].digest)');
    expect(route).toContain('const file = await loadResearchBlob(RELEASE[language].path)');
  });

  it("removes the outdated Tafsir publisher message but does not manufacture source text", () => {
    expect(tafsir).not.toContain("تفسیر نمونہ کی اشاعت ناشر کی اجازت کی تصدیق تک مؤخر ہے۔");
    expect(tafsir).toContain('remote?.status === "corpus_not_uploaded"');
    expect(tafsir).toContain('اس زبان کی تفسیر ابھی ویب سائٹ پر فعال نہیں ہوئی۔');
    expect(tafsir).toContain('remote?.status === "unicode_apk"');
    const route = read("app/api/quran/tafsir-namoona/route.ts");
    expect(route).toContain('QALAM_TAFSIR_NAMOONA_PUBLICATION_APPROVED');
    expect(route).toContain('status: "corpus_not_uploaded"');
    expect(route).toContain('status: "unicode_apk"');
  });

});
