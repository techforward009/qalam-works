import { describe, expect, test, beforeEach, afterEach } from "vitest";
import {
  HANDOFF_FORMAT,
  HANDOFF_VERSION,
  consumeHandoff,
  isValidHandoff,
  writeHandoff,
} from "../app/tools/translation-studio/utils/translationHandoff";
import {
  DOCUMENT_STUDIO_ROUTE,
  WRITER_HANDOFF_STORAGE_KEY,
  buildWriterHandoff,
  formatActiveTextForWhatsApp,
  handoffBlocksToText,
  writeWriterHandoff,
} from "../app/tools/roman-urdu-writer/utils/writerExport";

function makeStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

beforeEach(() => {
  (globalThis as Record<string, unknown>).sessionStorage = makeStorageMock();
  (globalThis as Record<string, unknown>).localStorage = makeStorageMock();
});
afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("buildWriterHandoff", () => {
  test("reuses canonical format, version, and reconstructs exact text", () => {
    const text = "آج  office!\n\nxyzblarg  5pm";
    const h = buildWriterHandoff(text);
    expect(h.format).toBe(HANDOFF_FORMAT);
    expect(h.version).toBe(HANDOFF_VERSION);
    expect(isValidHandoff(h)).toBe(true);
    expect(handoffBlocksToText(h)).toBe(text);
    expect(h.blocks[0].id).toMatch(/^urdu-writer-/);
    expect(h.targetLanguage).toBe("ur");
  });

  test("preserves punctuation, spaces, English, passthrough, line breaks", () => {
    const text = "hello  world!\nwww.qalam.works\n03001234567";
    expect(handoffBlocksToText(buildWriterHandoff(text))).toBe(text);
  });
});

describe("writeWriterHandoff", () => {
  test("uses canonical sessionStorage key", () => {
    expect(writeWriterHandoff("آج")).toBe(true);
    expect(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)).toBeTruthy();
    const parsed = JSON.parse(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)!);
    expect(parsed.format).toBe(HANDOFF_FORMAT);
  });

  test("does not write WhatsApp-formatted text", () => {
    const text = "آج office میں";
    writeWriterHandoff(text);
    const parsed = JSON.parse(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)!);
    expect(handoffBlocksToText(parsed)).toBe(text);
    expect(handoffBlocksToText(parsed)).not.toBe(formatActiveTextForWhatsApp(text));
  });

  test("consumeHandoff is one-time", () => {
    writeWriterHandoff("ترجمہ");
    const first = consumeHandoff();
    expect(first).not.toBeNull();
    expect(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)).toBeNull();
    expect(consumeHandoff()).toBeNull();
  });

  test("write failure returns false", () => {
    sessionStorage.setItem = () => { throw new Error("quota"); };
    expect(writeWriterHandoff("آج")).toBe(false);
  });

  test("route is existing Document Studio path", () => {
    expect(DOCUMENT_STUDIO_ROUTE).toBe("/tools/document-studio");
  });

  test("does not touch localStorage draft", () => {
    localStorage.setItem("qalam-document-studio-draft", "KEEP");
    writeWriterHandoff("آج");
    expect(localStorage.getItem("qalam-document-studio-draft")).toBe("KEEP");
  });
});

describe("writeHandoff reuse", () => {
  test("Writer payload is accepted by the same writeHandoff/isValidHandoff", () => {
    const h = buildWriterHandoff("علی کتاب");
    expect(writeHandoff(h)).toBe(true);
    expect(isValidHandoff(JSON.parse(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)!))).toBe(true);
  });
});
