import { describe, expect, test } from "vitest";
import { VERIFIED_HADITH_CORPUS, verifiedHadithForDossierText } from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";
import { hadithTranslationFields, validateHadithTranslation } from "../app/tools/khateeb-studio/engine/hadithTranslation";
import { VERIFIED_LIVE_TOPIC_HADITHS, verifiedLiveHadithEvidenceForQuery } from "../app/tools/khateeb-studio/engine/verifiedLiveTopicHadiths";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";
import { buildGroundedFullSermon, buildGroundedFullSermonText } from "../app/tools/khateeb-studio/engine/groundedFullSermon";
import { buildLiveResearchPack } from "../app/tools/khateeb-studio/engine/liveResearchPack";
import { buildGroundedSermonBlueprintText } from "../app/tools/khateeb-studio/engine/groundedSermonBlueprint";
import { buildDossierText, getTopicDossier } from "../app/tools/khateeb-studio/engine/topicDossier";

describe("Hadith translations", () => {
  test("covers every verified dossier and live narration in both languages", () => {
    const verified = VERIFIED_HADITH_CORPUS.filter(record => record.status === "verified");
    expect(verified).toHaveLength(35);
    expect(VERIFIED_LIVE_TOPIC_HADITHS).toHaveLength(5);
    for (const record of [...verified, ...VERIFIED_LIVE_TOPIC_HADITHS]) {
      const checked = { ...record, status: "verified" };
      expect(validateHadithTranslation(checked), record.id).toEqual([]);
      const fields = hadithTranslationFields(checked);
      expect(fields.translationUr?.trim(), record.id).toBeTruthy();
      expect(fields.translationEn?.trim(), record.id).toBeTruthy();
      expect(fields.translationStatus).toBe("editorial");
    }
  });

  test("does not expose translations for pending, stale or incomplete records", () => {
    const record = VERIFIED_HADITH_CORPUS[0];
    for (const changed of [
      { ...record, status: "pending-verification" },
      { ...record, status: "rejected" },
      { ...record, exactArabic: `${record.exactArabic} changed` },
      { ...record, translationEn: "" },
      { ...record, translationStatus: undefined },
      { ...record, translationSourceLabelEn: "" },
    ]) {
      expect(validateHadithTranslation(changed).length).toBeGreaterThan(0);
      expect(hadithTranslationFields(changed)).toEqual({});
    }
    const pending = VERIFIED_HADITH_CORPUS.find(row => row.status === "pending-verification")!;
    expect(hadithTranslationFields(pending)).toEqual({});
    expect(verifiedHadithForDossierText(pending.dossierPrimaryTextId)).toBeNull();
  });

  test("research delivers translations separately from explanatory text", () => {
    const research = researchKhateebTopic({ query: "صبر", maxEvidence: 100 });
    const narrations = research.evidence.filter(row => row.kind === "hadith" && row.status === "verified");
    expect(narrations.length).toBeGreaterThan(0);
    for (const row of narrations) {
      expect(row.translationUr).toBeTruthy();
      expect(row.translationEn).toBeTruthy();
      expect(row.translationUr).not.toBe(row.detailUr);
    }
    const live = verifiedLiveHadithEvidenceForQuery("رزق");
    expect(live).toHaveLength(5);
    expect(verifiedLiveHadithEvidenceForQuery("halal earning")).toHaveLength(5);
    for (const row of live) {
      expect(row.translationUr).toBeTruthy();
      expect(row.translationEn).toBeTruthy();
    }
  });

  test.each(["ur", "en"] as const)("copied dossiers and live blueprints retain translations in %s", locale => {
    const record = VERIFIED_HADITH_CORPUS[0];
    const dossierText = buildDossierText(getTopicDossier("sabr")!, locale);
    expect(dossierText).toContain(locale === "ur" ? record.translationUr! : record.translationEn!);
    const research = researchKhateebTopic({ query: "رزق", locale });
    const pack = buildLiveResearchPack(research, 30);
    expect(pack.ready).toBe(true);
    const text = buildGroundedSermonBlueprintText(pack, locale);
    for (const row of pack.evidence.filter(row => row.kind === "hadith")) {
      expect(text).toContain(locale === "ur" ? row.translationUr! : row.translationEn!);
    }
    expect(text).toContain(locale === "ur" ? "قلم ورکس — تدوینی ترجمہ" : "Qalam Works — editorial translation");
  });

  test.each(["ur", "en"] as const)("copied sermons retain translation, attribution and commentary in %s", locale => {
    const sermon = buildGroundedFullSermon("sabr", 30, locale)!;
    expect(sermon.ready).toBe(true);
    const text = buildGroundedFullSermonText(sermon, locale);
    for (const block of sermon.blocks.filter(row => row.kind === "hadith")) {
      const translation = locale === "ur" ? block.translationUr : block.translationEn;
      expect(translation).toBeTruthy();
      expect(text).toContain(translation!);
      expect(text.indexOf(translation!)).toBeGreaterThan(text.indexOf(block.arabic!));
      expect(text.indexOf(locale === "ur" ? block.bodyUr : block.bodyEn)).toBeGreaterThan(text.indexOf(translation!));
    }
    expect(text).toContain(locale === "ur" ? "قلم ورکس — تدوینی ترجمہ" : "Qalam Works — editorial translation");
    expect(text).toContain(locale === "ur" ? "خطیبانہ ربط/تشریح:" : "Pulpit link / commentary:");
  });
});
