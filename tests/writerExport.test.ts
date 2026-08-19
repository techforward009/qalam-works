import { describe, expect, test } from "vitest";
import {
  UTF8_BOM,
  WRITER_TXT_FILENAME,
  buildWriterTxtContents,
  formatActiveTextForWhatsApp,
  getActiveUrduText,
  hasExportableUrduText,
} from "../app/tools/roman-urdu-writer/utils/writerExport";
import { formatForWhatsAppRTL } from "../app/utils/whatsappRtlFormatter";

describe("getActiveUrduText", () => {
  test("Roman mode uses finalOutput, not urduInput", () => {
    expect(getActiveUrduText("roman", "آج ٹھیک", "پرانا")).toBe("آج ٹھیک");
  });

  test("Urdu mode uses urduInput, not finalOutput", () => {
    expect(getActiveUrduText("urdu", "آج ٹھیک", "دستی ترمیم")).toBe("دستی ترمیم");
  });

  test("preserves punctuation, spaces, line breaks, English, and Roman passthrough", () => {
    const t = "hello  world!\n\nxyzblarg  5pm";
    expect(getActiveUrduText("roman", t, "")).toBe(t);
    expect(getActiveUrduText("urdu", "other", t)).toBe(t);
  });
});

describe("hasExportableUrduText", () => {
  test("false for empty and whitespace-only", () => {
    expect(hasExportableUrduText("")).toBe(false);
    expect(hasExportableUrduText("   \n\t  ")).toBe(false);
  });

  test("true for real Urdu/English/passthrough", () => {
    expect(hasExportableUrduText("آج")).toBe(true);
    expect(hasExportableUrduText(" office ")).toBe(true);
  });
});

describe("TXT encoding", () => {
  test("filename is qalam-urdu-writer.txt", () => {
    expect(WRITER_TXT_FILENAME).toBe("qalam-urdu-writer.txt");
  });

  test("UTF-8 BOM is U+FEFF (EF BB BF)", () => {
    expect(UTF8_BOM).toBe("\uFEFF");
    const bytes = Buffer.from(UTF8_BOM, "utf8");
    expect([...bytes]).toEqual([0xef, 0xbb, 0xbf]);
  });

  test("TXT contents are BOM + exact text, no extra newline or mutation", () => {
    const text = "آج  theek!\nline2  xyzblarg";
    const contents = buildWriterTxtContents(text);
    expect(contents.startsWith(UTF8_BOM)).toBe(true);
    expect(contents.slice(1)).toBe(text);
    expect(contents).not.toBe(text);
  });

  test("repeated TXT build is deterministic", () => {
    const text = "کل meeting 5 بجے ہے";
    expect(buildWriterTxtContents(text)).toBe(buildWriterTxtContents(text));
  });
});

describe("downloadWriterTxt", () => {
  test("filename constant matches download contract", () => {
    expect(WRITER_TXT_FILENAME).toBe("qalam-urdu-writer.txt");
    expect(WRITER_TXT_FILENAME.endsWith(".txt")).toBe(true);
  });
});

describe("WhatsApp transport wrapper", () => {
  test("delegates to formatForWhatsAppRTL exactly", () => {
    const text = "آج office میں meeting ہے\nwww.qalam.works";
    expect(formatActiveTextForWhatsApp(text)).toBe(formatForWhatsAppRTL(text));
  });

  test("does not alter visible letters when controls are stripped", () => {
    const text = "علی کتاب۔ office 03001234567";
    const formatted = formatActiveTextForWhatsApp(text);
    const visible = formatted.replace(/[\u2066\u2067\u2069\u200E\u200F]/g, "");
    expect(visible.replace(/\n+$/g, "")).toContain("office");
    expect(visible).toContain("03001234567");
    expect(visible).toContain("علی");
  });
});

describe("no engine coupling", () => {
  test("writerExport does not import experimental engines or Studio", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(__dirname, "../app/tools/roman-urdu-writer/utils/writerExport.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/from ["'].*engineV3|from ["'].*writerEngine|from ["'].*engineV2|from ["'].*engineDirC/);
    expect(src).not.toMatch(/processText/);
    expect(src).toMatch(/whatsappRtlFormatter/);
    expect(src).toMatch(/translationHandoff/);
  });
});
