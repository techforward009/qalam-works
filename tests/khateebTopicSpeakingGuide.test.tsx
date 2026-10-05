// @vitest-environment happy-dom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import TopicSpeakingGuide from "../app/tools/khateeb-studio/TopicSpeakingGuide";
import { TOPIC_PREPS, type TopicPrep } from "../app/tools/khateeb-studio/engine/topicPrep";
import { buildTopicSpeakingGuideText, topicGuideMinutes, topicGuideSections, topicGuideSourceLeads, speakingGuideCoverage } from "../app/tools/khateeb-studio/engine/topicSpeakingGuide";
import { evidenceForTopic } from "../app/tools/khateeb-studio/engine/speakerTopicIndex";
import { quranLocationsFromReference, quranTranslationFor } from "../app/tools/khateeb-studio/engine/quranTranslationProvider";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import type { SpeakingGuideMode } from "../app/tools/khateeb-studio/engine/deathSpeakingGuide";
const languageState = vi.hoisted(() => ({ language: "ur" }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => languageState }));
vi.mock("../app/tools/khateeb-studio/KhateebScriptText", () => ({ default: ({ text }: { text: string }) => <span>{text}</span> }));
afterEach(cleanup);
function Guide({ topic }: { topic: TopicPrep }) {
  const [mode, setMode] = useState<SpeakingGuideMode>("detailed");
  return <TopicSpeakingGuide topic={topic} duration={45} mode={mode} onModeChange={setMode} />;
}
test("all thirteen topics and all sixty-one angles have separate editorial material", () => {
  const coverage = speakingGuideCoverage();
  expect(coverage).toHaveLength(13);
  expect(coverage.reduce((sum, row) => sum + row.sections, 0)).toBe(61);
  for (const row of coverage) expect(row.sections).toBe(row.angles);
  const points = TOPIC_PREPS.flatMap(topic => topicGuideSections(topic).map(section => section.point.ur));
  expect(new Set(points).size).toBe(points.length);
});
for (const topic of TOPIC_PREPS) describe(topic.id, () => {
  test("all original angles have bilingual substance and unique navigation ids", () => {
    const sections = topicGuideSections(topic);
    if (topic.id !== "death-akhirah") expect(sections.map(section => section.heading.ur)).toEqual(topic.anglesUr);
    expect(sections).toHaveLength(topic.anglesUr.length);
    for (const lead of topicGuideSourceLeads(topic, "ur")) expect(lead.label + lead.detail).not.toMatch(/[A-Za-z]{2,}/);
    expect(new Set(sections.map(section => section.id)).size).toBe(sections.length);
    for (const section of sections) for (const locale of ["ur", "en"] as const) {
      for (const field of ["point", "explanation", "example", "question", "action", "transition", "delivery"] as const) expect(section[field][locale].trim().length).toBeGreaterThan(12);
      expect(section.explanation[locale].length).toBeGreaterThan(140);
      expect(section.example[locale]).not.toEqual(section.point[locale]);
      expect(section.delivery[locale].split(/\s+/).length).toBeGreaterThanOrEqual(35);
      expect(section.delivery[locale]).not.toMatch(/(?:واضح کریں|پیش کریں|سامع کو|سامعین کو|Explain to the audience|Tell listeners)/);
    }
  });
  test.each([20, 30, 45] as const)("allocates %s minutes across every section", duration => {
    const minutes = topicGuideMinutes(topic, duration);
    expect(minutes).toHaveLength(topicGuideSections(topic).length + 2);
    expect(minutes.every(value => Number.isInteger(value) && value > 0)).toBe(true);
    expect(minutes.reduce((sum, value) => sum + value, 0)).toBe(duration);
  });
  test.each(["ur", "en"] as const)("copies selected detail, full original verses, translations and evidence in %s", locale => {
    const records = evidenceForTopic(topic.id);
    const full = buildTopicSpeakingGuideText(topic, locale, 45, "detailed", records);
    const brief = buildTopicSpeakingGuideText(topic, locale, 45, "brief", records);
    for (const section of topicGuideSections(topic)) {
      expect(full).toContain(section.example[locale]); expect(brief).not.toContain(section.example[locale]);
      expect(full).toContain(section.delivery[locale]); expect(brief).not.toContain(section.delivery[locale]);
      expect(full).toContain(section.action[locale]); expect(brief).toContain(section.action[locale]);
    }
    for (const anchor of topic.quran) for (const location of quranLocationsFromReference(anchor.ref)) {
      const arabic = ahmedgrafQuranReference.getAyah(location.surah, location.ayah)?.text;
      const translation = quranTranslationFor(location.surah, location.ayah, locale);
      expect(arabic).toBeTruthy(); expect(translation).toBeTruthy();
      expect(full).toContain(arabic!); expect(brief).toContain(arabic!);
      expect(full).toContain(translation!); expect(brief).toContain(translation!);
    }
    for (const record of records) { expect(full).toContain(locale === "ur" ? record.sourceLabelUr : record.sourceLabelEn); expect(brief).toContain(locale === "ur" ? record.summaryUr : record.summaryEn); }
    expect(full).toContain(locale === "ur" ? "فرضی" : "hypothetical");
    expect(full).toContain(locale === "ur" ? "تدوین" : "editorial");
  });
  test.each(["ur", "en"] as const)("opens all angles and switches detail accessibly in %s", locale => {
    languageState.language = locale;
    const { container } = render(<Guide topic={topic} />);
    expect(container.querySelectorAll("article")).toHaveLength(topic.anglesUr.length);
    const section = topicGuideSections(topic)[0];
    expect(screen.getByText(section.example[locale], { exact: false })).toBeTruthy();
    expect(screen.getByText(section.delivery[locale])).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: locale === "ur" ? "مختصر نکات" : "Brief points" }));
    expect(screen.queryByText(section.example[locale], { exact: false })).toBeNull();
    expect(screen.queryByText(section.delivery[locale])).toBeNull();
    expect(screen.getByText(section.action[locale], { exact: false })).toBeTruthy();
    expect(container.querySelector("section")?.getAttribute("dir")).toBe(locale === "ur" ? "rtl" : "ltr");
    fireEvent.click(screen.getByRole("button", { name: locale === "ur" ? "تفصیلی وضاحت" : "Detailed explanation" }));
    expect(screen.getByText(section.example[locale], { exact: false })).toBeTruthy();
    if (topic.id !== "death-akhirah") for (const link of container.querySelectorAll('nav a')) expect(container.querySelector(link.getAttribute('href')!)).toBeTruthy();
  });
});
