/** @vitest-environment happy-dom */
import {
  WRITER_DRAFT_KEY,
  loadWriterDraft,
  saveWriterDraft,
  clearWriterDraft,
  isWriterDraftV1,
} from "../app/tools/roman-urdu-writer/utils/writerDraft";

describe("writerDraft", () => {
  beforeEach(() => localStorage.clear());

  test("roundtrip exact text with spaces and newlines", () => {
    saveWriterDraft({
      romanInput: "a  b\nc",
      urduInput: "ا  ب\nج",
      mode: "urdu",
    });
    const d = loadWriterDraft()!;
    expect(d.romanInput).toBe("a  b\nc");
    expect(d.urduInput).toBe("ا  ب\nج");
    expect(d.mode).toBe("urdu");
  });

  test("invalid JSON ignored", () => {
    localStorage.setItem(WRITER_DRAFT_KEY, "{bad");
    expect(loadWriterDraft()).toBeNull();
  });

  test("unsupported version ignored", () => {
    localStorage.setItem(
      WRITER_DRAFT_KEY,
      JSON.stringify({ version: 99, romanInput: "x", urduInput: "y", mode: "roman" }),
    );
    expect(loadWriterDraft()).toBeNull();
  });

  test("clear removes entry", () => {
    saveWriterDraft({ romanInput: "x", urduInput: "", mode: "roman" });
    clearWriterDraft();
    expect(loadWriterDraft()).toBeNull();
  });

  test("isWriterDraftV1", () => {
    expect(
      isWriterDraftV1({ version: 1, romanInput: "", urduInput: "", mode: "roman" }),
    ).toBe(true);
    expect(
      isWriterDraftV1({ version: 2, romanInput: "", urduInput: "", mode: "roman" }),
    ).toBe(false);
  });
});
