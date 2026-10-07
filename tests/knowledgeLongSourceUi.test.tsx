// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import KnowledgeAssistant from "../app/components/knowledge/KnowledgeAssistant";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
