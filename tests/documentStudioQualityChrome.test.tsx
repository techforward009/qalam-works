/** @vitest-environment happy-dom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SuggestionsPanel } from "../app/tools/document-studio/components/SuggestionsPanel";
import { QualityAuditPanel } from "../app/tools/document-studio/components/QualityAuditPanel";
import { DocumentStatsBar } from "../app/tools/document-studio/components/DocumentStatsBar";
import type { DocumentSuggestion } from "../app/tools/document-studio/utils/generateDocumentSuggestions";
import type { QualityAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import type { DocumentStats } from "../app/tools/document-studio/utils/buildDocumentStats";
import type { DocumentHealthReport } from "../app/tools/document-studio/utils/buildDocumentHealthReport";

afterEach(() => {
  cleanup();
});

const ARABIC = /[\u0600-\u06FF]/;

const suggestion: DocumentSuggestion = {
  type: "spacing.double",
  category: "spacing",
  severity: "high",
  originalText: "  ",
  suggestedText: " ",
  explanation: "Collapse repeated spaces",
  contextBefore: "Hello",
  contextAfter: "world",
};

const emptyCounts = {
  mixedScript: 0,
  punctuation: 1,
  spacing: 0,
  longParagraphs: 0,
  repeatedWords: 0,
  mixedUrduArabicForms: 0,
  headingHierarchy: 0,
  emptyParagraphs: 0,
  spaceBeforePunctuation: 0,
  tatweelCount: 0,
  inconsistentPunctuationStyle: 0,
};

const report: QualityAuditReport = {
  score: 90,
  totalIssues: 1,
  counts: emptyCounts,
  recommendations: [
    {
      id: "punct",
      type: "punctuation",
      titleUrdu: "رموز",
      titleEnglish: "Punctuation spacing",
      descriptionUrdu: "تفصیل",
      descriptionEnglish: "Review punctuation spacing.",
    },
  ],
  readiness: {
    typography: "ok",
    unicodeConsistency: "needs_review",
    structure: "ok",
    rtlLtr: "ok",
  },
};

const stats: DocumentStats = {
  wordCount: 12,
  characterCount: 40,
  paragraphCount: 2,
  language: {
    dominant: "arabic-script",
    arabicScriptPercent: 80,
    latinPercent: 20,
    arabicScriptChars: 20,
    latinChars: 5,
  },
  numerals: { isMixed: false, western: 0, arabicIndic: 0, urduIndic: 0 },
};

const health: DocumentHealthReport = {
  unicodeConsistency: "ok",
  numeralConsistency: "ok",
  paragraphStructure: "needs_review",
  headingHierarchy: "ok",
  typographyIssueCount: 1,
  languageDistribution: { arabicScriptPercent: 80, latinPercent: 20, dominant: "arabic-script" },
};

describe("Quality/Suggestions chrome language", () => {
  it("keeps English UI chrome free of Urdu labels", () => {
    render(
      <SuggestionsPanel
        pending={[suggestion]}
        accepted={[]}
        ignored={[]}
        onAccept={vi.fn()}
        onIgnore={vi.fn()}
        onApplyAccepted={vi.fn()}
        onAcceptCategory={vi.fn()}
        onIgnoreCategory={vi.fn()}
        isUr={false}
      />,
    );
    const root = document.querySelector("[data-studio-suggestions]");
    expect(screen.getByText("Suggestions")).toBeTruthy();
    expect(screen.getAllByText("Error").length).toBeGreaterThan(0);
    expect(screen.queryByText(/تجاویز/)).toBeNull();
    expect(screen.queryByText(/Suggestions\)/)).toBeNull();
    expect(root?.textContent).not.toMatch(ARABIC);

    cleanup();
    render(<QualityAuditPanel report={report} isUr={false} />);
    const audit = document.querySelector("[data-studio-audit]");
    expect(screen.getByText("Typography")).toBeTruthy();
    expect(screen.getByText("Publishing readiness")).toBeTruthy();
    expect(audit?.textContent).not.toMatch(ARABIC);

    cleanup();
    render(<DocumentStatsBar stats={stats} health={health} isUr={false} />);
    const statsRoot = document.querySelector("[data-studio-stats]");
    expect(screen.getByText(/Arabic-script/)).toBeTruthy();
    expect(statsRoot?.textContent).not.toMatch(ARABIC);
  });

  it("renders Urdu chrome when site language is Urdu", () => {
    render(
      <SuggestionsPanel
        pending={[suggestion]}
        accepted={[]}
        ignored={[]}
        onAccept={vi.fn()}
        onIgnore={vi.fn()}
        onApplyAccepted={vi.fn()}
        onAcceptCategory={vi.fn()}
        onIgnoreCategory={vi.fn()}
        isUr={true}
      />,
    );
    expect(screen.getByText("تجاویز")).toBeTruthy();
    expect(screen.getAllByText("خرابی").length).toBeGreaterThan(0);
    expect(screen.queryByText("Suggestions")).toBeNull();

    cleanup();
    render(<QualityAuditPanel report={null} isUr={true} />);
    expect(screen.getByText(/کوالٹی آڈٹ/)).toBeTruthy();
  });

  it("renders mixed-script explanations in site language only", () => {
    const mixed: DocumentSuggestion = {
      type: "unicode-mixed-script-advisory",
      category: "typography",
      severity: "low",
      originalText: "Document",
      suggestedText: "Document",
      explanation: "Latin letters appear inside Urdu/Arabic text. This may be intentional.",
      contextBefore: "یہ ",
      contextAfter: " ہے",
    };
    render(
      <SuggestionsPanel
        pending={[mixed]}
        accepted={[]}
        ignored={[]}
        onAccept={vi.fn()}
        onIgnore={vi.fn()}
        onApplyAccepted={vi.fn()}
        onAcceptCategory={vi.fn()}
        onIgnoreCategory={vi.fn()}
        isUr={false}
      />,
    );
    expect(screen.getByText(/Latin letters appear/i)).toBeTruthy();
    expect(screen.queryByText(/لاطینی/)).toBeNull();

    cleanup();
    render(
      <SuggestionsPanel
        pending={[mixed]}
        accepted={[]}
        ignored={[]}
        onAccept={vi.fn()}
        onIgnore={vi.fn()}
        onApplyAccepted={vi.fn()}
        onAcceptCategory={vi.fn()}
        onIgnoreCategory={vi.fn()}
        isUr={true}
      />,
    );
    expect(screen.getByText(/لاطینی حروف/)).toBeTruthy();
    expect(screen.queryByText(/Latin letters appear/i)).toBeNull();
  });
});
