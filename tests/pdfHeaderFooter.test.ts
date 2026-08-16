// Batch 16C — pure template unit tests (no Chromium required)
import { buildPdfHeaderTemplate, buildPdfFooterTemplate } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

const emptyDoc: DocNode = { type: "doc", content: [] };
const docWithH1: DocNode = {
  type: "doc",
  content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "My Report Title" }] }],
};

function s(overrides: Partial<ReturnType<typeof defaultDocumentSettings>["headerFooter"]>) {
  const base = defaultDocumentSettings();
  return { ...base, headerFooter: { ...base.headerFooter, ...overrides } };
}

describe("buildPdfHeaderTemplate", () => {
  test("disabled: returns empty div", () => {
    expect(buildPdfHeaderTemplate(s({ headerEnabled: false }), docWithH1)).toBe("<div></div>");
  });

  test("auto-title: uses derived H1", () => {
    const html = buildPdfHeaderTemplate(s({ headerEnabled: true, headerMode: "auto-title" }), docWithH1);
    expect(html).toContain("My Report Title");
    expect(html).not.toContain("<script");
  });

  test("auto-title: falls back to Qalam Works when no H1", () => {
    const html = buildPdfHeaderTemplate(s({ headerEnabled: true, headerMode: "auto-title" }), emptyDoc);
    expect(html).toContain("Qalam Works");
  });

  test("custom header: renders escaped custom text", () => {
    const html = buildPdfHeaderTemplate(s({ headerEnabled: true, headerMode: "custom", headerText: "My <Report>" }), emptyDoc);
    expect(html).toContain("My &lt;Report&gt;");
    expect(html).not.toContain("<Report>");
  });

  test("custom header with & and quotes: escaped correctly", () => {
    const html = buildPdfHeaderTemplate(s({ headerEnabled: true, headerMode: "custom", headerText: 'A & B "test"' }), emptyDoc);
    expect(html).toContain("A &amp; B &quot;test&quot;");
  });

  test("Latin text: dir=ltr", () => {
    const html = buildPdfHeaderTemplate(s({ headerEnabled: true, headerMode: "custom", headerText: "Report" }), emptyDoc);
    expect(html).toContain('dir="ltr"');
  });

  test("RTL text: dir=auto", () => {
    const html = buildPdfHeaderTemplate(s({ headerEnabled: true, headerMode: "custom", headerText: "تجربہ" }), emptyDoc);
    expect(html).toContain('dir="auto"');
  });
});

describe("buildPdfFooterTemplate", () => {
  test("disabled: returns empty div", () => {
    expect(buildPdfFooterTemplate(s({ footerEnabled: false }))).toBe("<div></div>");
  });

  test("enabled, no text, no numbers: empty div", () => {
    expect(buildPdfFooterTemplate(s({ footerEnabled: true, footerText: "", pageNumbers: "none" }))).toBe("<div></div>");
  });

  test("text only: shows escaped text, no page spans", () => {
    const html = buildPdfFooterTemplate(s({ footerEnabled: true, footerText: "Confidential", pageNumbers: "none" }));
    expect(html).toContain("Confidential");
    expect(html).not.toContain("pageNumber");
  });

  test("current page only: shows pageNumber span", () => {
    const html = buildPdfFooterTemplate(s({ footerEnabled: true, footerText: "", pageNumbers: "current" }));
    expect(html).toContain('class="pageNumber"');
    expect(html).not.toContain("totalPages");
  });

  test("current/total: shows both spans", () => {
    const html = buildPdfFooterTemplate(s({ footerEnabled: true, footerText: "", pageNumbers: "current-total" }));
    expect(html).toContain('class="pageNumber"');
    expect(html).toContain("totalPages");
  });

  test("text + current/total: both visible in same template", () => {
    const html = buildPdfFooterTemplate(
      s({ footerEnabled: true, footerText: "Confidential", pageNumbers: "current-total" })
    );
    expect(html).toContain("Confidential");
    expect(html).toContain("pageNumber");
    expect(html).toContain("totalPages");
  });

  test("footer text with HTML chars: escaped", () => {
    const html = buildPdfFooterTemplate(s({ footerEnabled: true, footerText: "<b>secret</b>", pageNumbers: "none" }));
    expect(html).toContain("&lt;b&gt;secret&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });
});
