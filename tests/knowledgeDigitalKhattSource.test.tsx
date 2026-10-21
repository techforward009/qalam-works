// @vitest-environment happy-dom
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import corpus from "../public/quran/indopak-digital-khatt.json";
import manifest from "../public/quran/indopak-digital-khatt-manifest.json";
import { digitalKhattKnowledgeAyahs, DIGITAL_KHATT_KNOWLEDGE_SHA256 } from "../app/lib/knowledge/digitalKhattKnowledge";
import { completeQuranTranslationFor } from "../app/lib/knowledge/completeQuranTranslations";
import { quranTranslationFor as khateebTranslationFor } from "../app/tools/khateeb-studio/engine/quranTranslationProvider";
import { retrieveKnowledge } from "../app/lib/knowledge/retrieval";
import BookPassageText from "../app/tools/khateeb-studio/BookPassageText";

afterEach(cleanup);

describe("Ask the books Quran — Digital Khatt source and matching script", () => {
 it("preserves the published translator's childhood meaning and exact typography in both source stores", () => {
   const reader = completeQuranTranslationFor(17, 24, "ur");
   const khateeb = khateebTranslationFor(17, 24, "ur");
   expect(reader).toBe(khateeb);
   expect(reader).toContain("ان پر رحم فرما جس طرح انہوں نے مجھے بچپن میں");
   expect(reader).not.toContain("پچپن");
   expect(reader).not.toContain("فرماجس");
   expect(completeQuranTranslationFor(17, 24, "en")).toContain("small [child]");
 });
 it("uses precisely the unchanged shipped Digital Khatt corpus and its verified SHA-256", () => {
   const actual = createHash("sha256").update(readFileSync("public/quran/indopak-digital-khatt.json")).digest("hex");
   expect(actual).toBe(manifest.textSha256);
   expect(DIGITAL_KHATT_KNOWLEDGE_SHA256).toBe(actual);
   const ayahs = digitalKhattKnowledgeAyahs("ur");
   expect(ayahs).toHaveLength(6236);
   expect(ayahs.every(a => a.edition === "digital-khatt")).toBe(true);
   const verse = ayahs.find(a => a.surah === 17 && a.ayah === 23);
   expect(verse?.text).toBe(corpus["17"].find(a => a.verse === 23)?.text);
   expect(verse?.suppliedTranslation?.text).toBe(completeQuranTranslationFor(17, 23, "ur"));
   expect(verse?.suppliedTranslation?.translator).toContain("محسن علی نجفی");
 });
 it("never attaches the basmala-numbered translation to the Digital Khatt Fatihah verse", () => {
   const ayahs = digitalKhattKnowledgeAyahs("ur");
   const fatihah = ayahs.filter(a => a.surah === 1);
   expect(fatihah).toHaveLength(7);
   expect(fatihah[0].text).toBe(corpus["1"][0].text);
   expect(fatihah[0].text).toContain("اَلْحَمْدُ");
   expect(fatihah.every(a => a.suppliedTranslation === undefined)).toBe(true);
   expect(completeQuranTranslationFor(1, 1, "ur")).toContain("بنام");
 });
 it("preserves provenance through source retrieval, attribution, exact text and source hash", () => {
   const ayah = digitalKhattKnowledgeAyahs("ur").find(a=>a.surah===17&&a.ayah===23)!;
   const result = retrieveKnowledge({ question: "والدین کا احترام", scope: "quran", locale: "ur",
      records: [], sources: [], quran: [ayah], quranSha256: DIGITAL_KHATT_KNOWLEDGE_SHA256 });
   expect(result.status).toBe("evidence");
   const first = result.passages[0];
   expect(first.quranLocation).toEqual({surah:17,ayah:23});
   expect(first.quranEdition).toBe("digital-khatt");
   expect(first.text).toBe(ayah.text);
   expect(first.sourceSha256).toBe(DIGITAL_KHATT_KNOWLEDGE_SHA256);
   expect(first.suppliedTranslation?.text).toBe(completeQuranTranslationFor(17,23,"ur"));
 });
 it("renders Digital Khatt Quran without routing its glyphs to Muhammadi", () => {
   const ayah = digitalKhattKnowledgeAyahs("ur").find(a => a.surah === 17 && a.ayah === 23)!;
   const { container } = render(<BookPassageText language="ar" quran digitalKhatt text={ayah.text} />);
   expect(container.textContent).toBe(ayah.text);
   expect(container.querySelector(".qalam-knowledge-digital-khatt-quran")).not.toBeNull();
   expect(container.querySelector(".khateeb-muhammadi-quranic")).toBeNull();
   expect(container.querySelector(".khateeb-book-digital-khatt")).not.toBeNull();
   const component = readFileSync("app/components/knowledge/KnowledgeAssistant.tsx","utf8");
   expect(component).toContain("/fonts/DigitalKhattIndoPak.woff2");
   expect(component).toContain("digitalKhatt={p.quranEdition === \"digital-khatt\"}");
   expect(component).toContain("/quran/indopak-digital-khatt/");
   const api = readFileSync("app/api/knowledge/ask/route.ts","utf8");
   expect(api).not.toContain("ahmedgrafQuranReference");
   expect(api).toContain("digitalKhattKnowledgeAyahs");
 });
});
