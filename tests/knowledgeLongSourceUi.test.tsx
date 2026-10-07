// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import KnowledgeAssistant from "../app/components/knowledge/KnowledgeAssistant";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

for (const changed of [false, true]) it(`verifies every paragraph when opening a continued hadith: ${changed ? "rejects changed continuation" : "opens intact source"}`, async () => {
  const paragraphs = [{ id: "chapter:p1", text: "4- أصل الحديث" }, { id: "chapter:p2", text: "وهذه تتمة الحديث الأصلية" }];
  const passage = { id: "continued", collection: "kafi", language: "ar", text: paragraphs.map(p => p.text).join("\n"), referenceUr: "الکافی، حدیث 4", referenceEn: "Al-Kafi, Hadith 4", sourceSha256: "a".repeat(64), translator: null, recordId: "chapter", sourceId: "kafi-v6-ar", paragraphId: "chapter:p1", excerpt: { recordSha256: "b".repeat(64), paragraphs } };
  const original = { source: { sha256: passage.sourceSha256 }, record: { textSha256: "b".repeat(64), paragraphs: changed ? [paragraphs[0], { ...paragraphs[1], text: "changed" }] : paragraphs } };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ question: "فضل الولد", status: "evidence", passages: [passage], availableCollections: ["kafi"], expandedTerms: [] }) }).mockResolvedValueOnce({ ok: true, json: async () => original }));
  render(<KnowledgeAssistant locale="ur" />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "فضل الولد" } });
  fireEvent.click(screen.getByRole("button", { name: "سوال کے مصادر تلاش کریں" }));
  fireEvent.click(await screen.findByRole("button", { name: "اصل ماخذ اور سیاق دیکھیں" }));
  if (changed) expect((await screen.findByRole("alert")).textContent).toContain("اصل عبارت کی تصدیق نہیں ہوسکی");
  else expect((await screen.findByRole("dialog")).textContent).toContain(paragraphs[1].text);
});

for (const locale of ["ur", "en"] as const) it(`keeps oversized source text available with an accurate ${locale} summary status`, async () => {
  const text = locale === "ur" ? "یہ صبر کے بارے میں فراہم کردہ اصل متن ہے۔ ".repeat(500) : "This is the complete supplied passage about patience. ".repeat(500);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    question: "patience", status: "evidence", method: "lexical-bm25-topic-expansion", expandedTerms: [], availableCollections: ["nahj"],
    passages: [{ id: "long-source", collection: "nahj", language: locale, text, referenceUr: "نہج البلاغہ، خطبہ 1", referenceEn: "Nahj al-Balagha, Sermon 1", sourceSha256: "a".repeat(64), translator: null }],
    research: { status: "evidence-too-large", claims: [] },
  }) }));
  render(<KnowledgeAssistant locale={locale} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "patience" } });
  fireEvent.click(screen.getByRole("button", { name: locale === "ur" ? "سوال کے مصادر تلاش کریں" : "Find sources for this question" }));
  const status = await screen.findByTestId("knowledge-summary-status");
  expect(status.textContent).toContain(locale === "ur" ? "خودکار خلاصے کی حد" : "exceed the automatic summary limit");
  expect(document.querySelector("article")?.textContent).toContain(text);
  expect(screen.queryByTestId("knowledge-research-summary")).toBeNull();
  expect(screen.getByTestId("knowledge-assistant").getAttribute("dir")).toBe(locale === "ur" ? "rtl" : "ltr");
});
