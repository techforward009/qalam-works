/**
 * richClipboardToText — focused unit tests
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import {
  htmlToPlainText,
  hasMeaningfulHtml,
} from "../app/tools/whatsapp-rtl-formatter/utils/richClipboardToText";

describe("hasMeaningfulHtml", () => {
  it("returns false for empty string", () => {
    expect(hasMeaningfulHtml("")).toBe(false);
  });
  it("returns false for plain text", () => {
    expect(hasMeaningfulHtml("مختصر جواب")).toBe(false);
  });
  it("returns true for HTML with <strong>", () => {
    expect(hasMeaningfulHtml("<strong>متن</strong>")).toBe(true);
  });
  it("returns true for HTML with <ul>", () => {
    expect(hasMeaningfulHtml("<ul><li>item</li></ul>")).toBe(true);
  });
});

describe("htmlToPlainText", () => {
  // 1. <strong> → **text**
  it("<strong>مختصر جواب:</strong> → **مختصر جواب:**", () => {
    const result = htmlToPlainText("<strong>مختصر جواب:</strong>");
    expect(result).toBe("**مختصر جواب:**");
  });

  it("<b>bold</b> → **bold**", () => {
    const result = htmlToPlainText("<b>bold</b>");
    expect(result).toBe("**bold**");
  });

  // 2. <ul> with 2 <li> → two bullet lines
  it("<ul><li>...</li><li>...</li></ul> → two '- ' bullet lines", () => {
    const html = "<ul><li>حقِ وراثت کا قیام</li><li>بچوں کا حق</li></ul>";
    const result = htmlToPlainText(html);
    expect(result).toContain("- حقِ وراثت کا قیام");
    expect(result).toContain("- بچوں کا حق");
    expect(result).not.toContain("* ");
  });

  // 3. <ol> with 2 items → numbered list
  it("<ol><li>...</li><li>...</li></ol> → 1. / 2. lines", () => {
    const html = "<ol><li>پہلا</li><li>دوسرا</li></ol>";
    const result = htmlToPlainText(html);
    expect(result).toContain("1. پہلا");
    expect(result).toContain("2. دوسرا");
  });

  // 4. bold inside bullet
  it("<li><strong>حقِ وراثت کا قیام:</strong> متن</li> → - **حقِ وراثت کا قیام:** متن", () => {
    const html = "<ul><li><strong>حقِ وراثت کا قیام:</strong> متن</li></ul>";
    const result = htmlToPlainText(html);
    expect(result).toContain("- **حقِ وراثت کا قیام:** متن");
  });

  // 5. paragraphs + blank separation
  it("<p> tags produce paragraph breaks", () => {
    const html = "<p>پہلا پیرا</p><p>دوسرا پیرا</p>";
    const result = htmlToPlainText(html)!;
    const lines = result.split("\n");
    expect(lines).toContain("پہلا پیرا");
    expect(lines).toContain("دوسرا پیرا");
    // Blank line between paragraphs
    const idx1 = lines.indexOf("پہلا پیرا");
    const idx2 = lines.indexOf("دوسرا پیرا");
    expect(idx2).toBeGreaterThan(idx1 + 1);
    expect(lines[idx1 + 1]).toBe("");
  });

  // 6. 1/4, URLs, Urdu text unchanged
  it("fractions, URLs, and Urdu text pass through unchanged", () => {
    const html = "<p>نصف (1/4) والدین https://example.com</p>";
    const result = htmlToPlainText(html);
    expect(result).toContain("1/4");
    expect(result).toContain("https://example.com");
    expect(result).toContain("والدین");
  });

  // 7. plain text fallback — hasMeaningfulHtml gate
  it("plain text input returns null (caller falls back to browser paste)", () => {
    expect(htmlToPlainText("مختصر جواب: متن")).toBeNull();
  });

  it("returns null for empty HTML", () => {
    expect(htmlToPlainText("")).toBeNull();
  });

  // 8. scripts and styles contribute no visible output
  it("script and style tags are stripped", () => {
    const html =
      '<script>alert("xss")</script><style>.x{}</style><strong>محفوظ</strong>';
    const result = htmlToPlainText(html)!;
    expect(result).not.toContain("alert");
    expect(result).not.toContain(".x{}");
    expect(result).toBe("**محفوظ**");
  });

  // Extra: <em> / <i>
  it("<em>italic</em> → _italic_", () => {
    expect(htmlToPlainText("<em>italic</em>")).toBe("_italic_");
  });

  it("<i>italic</i> → _italic_", () => {
    expect(htmlToPlainText("<i>italic</i>")).toBe("_italic_");
  });

  // Extra: <s>/<del>
  it("<del>strike</del> → ~strike~", () => {
    expect(htmlToPlainText("<del>strike</del>")).toBe("~strike~");
  });

  // Extra: full fiqhi-style HTML → expected textual output
  it("full ChatGPT-style HTML → plain text with ** and - bullets", () => {
    const html = [
      "<p><strong>تفصیلی احکام:</strong></p>",
      "<ul>",
      "<li><strong>حقِ وراثت کا قیام:</strong> والدین کی وفات</li>",
      "<li><strong>بچوں کا حق:</strong> مرحومہ بہن</li>",
      "</ul>",
    ].join("");
    const result = htmlToPlainText(html)!;
    expect(result).toContain("**تفصیلی احکام:**");
    expect(result).toContain("- **حقِ وراثت کا قیام:** والدین کی وفات");
    expect(result).toContain("- **بچوں کا حق:** مرحومہ بہن");
  });

  // Idempotence guard: htmlToPlainText output contains no HTML tags
  it("output never contains HTML tags", () => {
    const html = "<p><strong>متن</strong></p><ul><li>item</li></ul>";
    const result = htmlToPlainText(html)!;
    expect(result).not.toMatch(/<[a-z]/i);
  });
});

// ── List spacing: tight vs loose ─────────────────────────────────────────────

describe("list spacing — tight vs loose", () => {
  // 1. Tight UL stays single-spaced
  it("tight UL: plain-text <li> items → single newline between bullets", () => {
    const html = "<ul><li>پہلا</li><li>دوسرا</li><li>تیسرا</li></ul>";
    const result = htmlToPlainText(html)!;
    const lines = result.split("\n").filter(l => l.trim() !== "");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("- پہلا");
    expect(lines[1]).toBe("- دوسرا");
    expect(lines[2]).toBe("- تیسرا");
    // No blank line between items
    expect(result).not.toMatch(/- پہلا\n\n/);
  });

  // 2. Loose UL with <p> items preserves blank lines
  it("loose UL: <li><p>…</p></li> items → blank line between bullets", () => {
    const html = "<ul><li><p>پہلا</p></li><li><p>دوسرا</p></li></ul>";
    const result = htmlToPlainText(html)!;
    expect(result).toContain("- پہلا");
    expect(result).toContain("- دوسرا");
    // Blank line between the two bullets
    expect(result).toMatch(/- پہلا\n\n- دوسرا/);
  });

  // 3. Tight OL stays single-spaced
  it("tight OL: plain-text <li> items → single newline between items", () => {
    const html = "<ol><li>پہلا</li><li>دوسرا</li></ol>";
    const result = htmlToPlainText(html)!;
    const lines = result.split("\n").filter(l => l.trim() !== "");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("1. پہلا");
    expect(lines[1]).toBe("2. دوسرا");
    expect(result).not.toMatch(/1\. پہلا\n\n/);
  });

  // 4. Loose OL preserves blank lines
  it("loose OL: <li><p>…</p></li> items → blank line between items", () => {
    const html = "<ol><li><p>پہلا</p></li><li><p>دوسرا</p></li></ol>";
    const result = htmlToPlainText(html)!;
    expect(result).toMatch(/1\. پہلا\n\n2\. دوسرا/);
  });

  // 5. Bold inside loose bullet remains intact
  it("bold content inside loose <li><p> remains **wrapped**", () => {
    const html = [
      "<ul>",
      "<li><p><strong>حقِ وراثت کا قیام:</strong> والدین کی وفات</p></li>",
      "<li><p><strong>بچوں کا حق:</strong> مرحومہ بہن</p></li>",
      "</ul>",
    ].join("");
    const result = htmlToPlainText(html)!;
    expect(result).toContain("- **حقِ وراثت کا قیام:** والدین کی وفات");
    expect(result).toContain("- **بچوں کا حق:** مرحومہ بہن");
    // Blank line between loose items
    expect(result).toMatch(/\*\* والدین کی وفات\n\n- \*\*/);
  });
});
