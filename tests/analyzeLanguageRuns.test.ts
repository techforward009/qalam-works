import { describe, expect, it } from "vitest";
import {
  analyzeDocumentRuns,
  analyzeScriptRuns,
  countLatinIntrusions,
  latinIntrusionRuns,
} from "../app/utils/quality/analyzeLanguageRuns";
import { checkTextQuality } from "../app/utils/quality/checkTextQuality";
import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import { buildDocumentHealthReport } from "../app/tools/document-studio/utils/buildDocumentHealthReport";
import { generateDocumentSuggestions } from "../app/tools/document-studio/utils/generateDocumentSuggestions";
import { createDocumentAnalysisContext, type DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}

describe("LI-1 run-level script analysis", () => {
  it("classifies a pure Urdu paragraph as Arabic runs with no Latin issue", () => {
    const text = "یہ ایک صاف ستھرا جملہ ہے۔";
    const runs = analyzeScriptRuns(text);
    expect(runs.some((run) => run.kind === "latin")).toBe(false);
    expect(runs.some((run) => run.kind === "arabic")).toBe(true);
    expect(countLatinIntrusions(text)).toBe(0);
  });

  it("classifies a pure English paragraph as Latin runs with no Arabic-context issue", () => {
    const text = "Draft notes: Review spacing and punctuation.";
    const analysis = analyzeDocumentRuns([text]);
    expect(analysis.paragraphs[0].context).toBe("latin");
    expect(latinIntrusionRuns(analysis)).toHaveLength(0);
    expect(checkTextQuality(text, "auto").textQuality.mixedScript).toBe(0);
  });

  it("treats Document Studio as one meaningful Latin run", () => {
    const text = "یہ Document Studio بہت مفید ہے";
    const latin = analyzeScriptRuns(text).filter((run) => run.kind === "latin");
    expect(latin).toHaveLength(1);
    expect(latin[0].text).toBe("Document Studio");
    expect(countLatinIntrusions(text)).toBe(1);
  });

  it("keeps original offsets aligned with source text", () => {
    const text = "یہ Document Studio ہے";
    const latin = analyzeScriptRuns(text).find((run) => run.kind === "latin");
    expect(latin).toBeTruthy();
    expect(text.slice(latin!.start, latin!.end)).toBe(latin!.text);
    expect(latin!.text).toBe("Document Studio");
    expect(text.slice(0, latin!.start)).toContain("یہ");
  });

  it("does not split Qalam Works into unrelated one-word detections", () => {
    const latin = analyzeScriptRuns("Qalam Works PDF").filter((run) => run.kind === "latin");
    expect(latin.map((run) => run.text.trim())).toEqual(["Qalam Works"]);
  });
});
