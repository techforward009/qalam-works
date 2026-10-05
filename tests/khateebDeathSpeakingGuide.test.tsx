// @vitest-environment happy-dom
import React, { useState } from "react";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import DeathSpeakingGuide from "../app/tools/khateeb-studio/DeathSpeakingGuide";
import { DEATH_SPEAKING_GUIDE, buildDeathSpeakingGuideText, deathGuideMinutes, type SpeakingGuideMode } from "../app/tools/khateeb-studio/engine/deathSpeakingGuide";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { quranTranslationFor } from "../app/tools/khateeb-studio/engine/quranTranslationProvider";
const state = vi.hoisted(() => ({ language: "ur" }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => state }));
vi.mock("../app/tools/khateeb-studio/KhateebScriptText", () => ({ default: ({ text }: { text: string }) => <span>{text}</span> }));
afterEach(cleanup);
function Guide() {
  const [mode, setMode] = useState<SpeakingGuideMode>("detailed");
  return <DeathSpeakingGuide duration={45} mode={mode} onModeChange={setMode} />;
}
describe("Death / Hereafter speaking guide", () => {
  test.each([20, 30, 45] as const)("allocates %s minutes across opening, four angles and closing", duration => {
    const minutes = deathGuideMinutes(duration);
    expect(minutes).toHaveLength(6);
    expect(minutes.every(value => value > 0)).toBe(true);
    expect(minutes.reduce((sum, value) => sum + value, 0)).toBe(duration);
  });
  test.each(["ur", "en"] as const)("retains complete source verses, attributed translations and labeled editorial layers in %s", locale => {
    const detailed = buildDeathSpeakingGuideText(locale, 45, "detailed");
    const brief = buildDeathSpeakingGuideText(locale, 45, "brief");
    for (const section of DEATH_SPEAKING_GUIDE) {
      expect(detailed).toContain(section.explanation[locale][0]);
      expect(detailed).toContain(section.example[locale]);
      expect(detailed).toContain(section.transition[locale]);
      expect(brief).not.toContain(section.example[locale]);
      for (const location of section.verses) {
        const arabic = ahmedgrafQuranReference.getAyah(location.surah, location.ayah)!.text;
        const translation = quranTranslationFor(location.surah, location.ayah, locale)!;
        expect(translation).toBeTruthy();
        expect(detailed).toContain(arabic);
        expect(brief).toContain(arabic);
        expect(detailed).toContain(translation);
        expect(brief).toContain(translation);
      }
    }
    expect(detailed).toContain(locale === "ur" ? "علامہ شیخ محسن علی نجفی" : "Ali Quli Qara'i");
    expect(detailed).toContain(locale === "ur" ? "فرضی روزمرہ مثال" : "Hypothetical everyday example");
  });
  test.each(["ur", "en"])("switches detail accessibly while retaining practical points and source translations in %s", language => {
    state.language = language;
    render(<Guide />);
    const brief = screen.getByRole("button", { name: language === "ur" ? "مختصر نکات" : "Brief points" });
    const detailed = screen.getByRole("button", { name: language === "ur" ? "تفصیلی وضاحت" : "Detailed explanation" });
    expect(detailed.getAttribute("aria-pressed")).toBe("true");
    const paragraph = DEATH_SPEAKING_GUIDE[0].explanation[language === "ur" ? "ur" : "en"][0];
    expect(screen.getByText(paragraph)).toBeTruthy();
    fireEvent.click(brief);
    expect(brief.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText(paragraph)).toBeNull();
    expect(screen.getByText(DEATH_SPEAKING_GUIDE[0].action[language === "ur" ? "ur" : "en"])).toBeTruthy();
    expect(screen.getAllByText(quranTranslationFor(3, 185, language === "ur" ? "ur" : "en")!).length).toBeGreaterThan(0);
    fireEvent.click(detailed);
    expect(screen.getByText(paragraph)).toBeTruthy();
  });
  test("integrates selected-mode copying, removes repeated selected-topic headers and labels outline honestly", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio.match(/آپ کا منتخب موضوع/g)).toHaveLength(1);
    expect(studio).toContain("deathGuideText || topicDossierText || topicPreparationText");
    expect(studio).not.toContain("منٹ کی مکمل تیاری دیکھیں");
  });
});
