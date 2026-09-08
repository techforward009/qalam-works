import { describe, expect, it } from "vitest";
import {
  defaultDocumentTitle,
  sanitizeDocumentTitle,
  TITLE_MAX_LENGTH,
} from "../app/tools/document-studio/utils/documentTitle";
import {
  describeDocumentLanguage,
  describeSaveStatus,
  isFindOpenShortcut,
  toggleLeftPanel,
  toggleRightPanel,
} from "../app/tools/document-studio/utils/documentShell";
import {
  allMenuActionIds,
  DOCUMENT_MENU_BAR,
  OMITTED_FUTURE_ACTIONS,
} from "../app/tools/document-studio/utils/documentMenus";

describe("documentTitle", () => {
  it("sanitizes whitespace, newlines, and length", () => {
    expect(sanitizeDocumentTitle("  Hello\nWorld\t ")).toBe("Hello World");
    expect(sanitizeDocumentTitle("a".repeat(TITLE_MAX_LENGTH + 40)).length).toBe(TITLE_MAX_LENGTH);
    expect(sanitizeDocumentTitle(null)).toBe("");
  });

  it("returns bilingual defaults without requiring schema changes", () => {
    expect(defaultDocumentTitle(false)).toBe("Untitled document");
    expect(defaultDocumentTitle(true)).toBe("بلا عنوان دستاویز");
  });
});

describe("document shell helpers", () => {
  it("toggles left and right panels independently", () => {
    expect(toggleLeftPanel("none", "outline")).toBe("outline");
    expect(toggleLeftPanel("outline", "outline")).toBe("none");
    expect(toggleRightPanel("none", "quality")).toBe("quality");
    expect(toggleRightPanel("quality", "glossary")).toBe("glossary");
    expect(toggleRightPanel("glossary", "glossary")).toBe("none");
  });

  it("describes real save/offline states only", () => {
    expect(describeSaveStatus({ saveStatus: "saving", online: true, isUr: false }).label).toBe("Saving…");
    expect(describeSaveStatus({ saveStatus: "saved", online: true, isUr: false }).label).toBe("Saved");
    expect(describeSaveStatus({ saveStatus: "saved", online: false, isUr: false }).tone).toBe("offline");
    expect(describeSaveStatus({ saveStatus: "error", online: true, isUr: false }).tone).toBe("error");
    expect(describeSaveStatus({ saveStatus: "idle", online: true, isUr: false }).label).toBe("");
  });

  it("detects Ctrl/Cmd+F without Alt", () => {
    expect(isFindOpenShortcut({ key: "f", ctrlKey: true, metaKey: false, altKey: false })).toBe(true);
    expect(isFindOpenShortcut({ key: "F", ctrlKey: false, metaKey: true, altKey: false })).toBe(true);
    expect(isFindOpenShortcut({ key: "f", ctrlKey: true, metaKey: false, altKey: true })).toBe(false);
    expect(isFindOpenShortcut({ key: "s", ctrlKey: true, metaKey: false, altKey: false })).toBe(false);
  });

  it("labels document language from live stats", () => {
    expect(describeDocumentLanguage({ dominant: "arabic-script", isUr: false })).toBe("Arabic-script");
    expect(describeDocumentLanguage({ dominant: "mixed", isUr: true })).toBe("مخلوط");
  });
});

describe("document menus", () => {
  it("exposes File Edit View Insert Format Tools Help", () => {
    expect(DOCUMENT_MENU_BAR.map((m) => m.id)).toEqual([
      "file",
      "edit",
      "view",
      "insert",
      "format",
      "tools",
      "help",
    ]);
  });

  it("wires only real actions and omits future cloud/table/image items", () => {
    const ids = allMenuActionIds();
    expect(ids).toContain("file.downloadPdf");
    expect(ids).toContain("tools.standardize");
    expect(ids).toContain("edit.find");
    expect(ids).toContain("insert.link");
    expect(ids).not.toContain("share" as never);
    const blob = JSON.stringify(DOCUMENT_MENU_BAR).toLowerCase();
    for (const future of OMITTED_FUTURE_ACTIONS) {
      expect(blob.includes(future)).toBe(false);
    }
  });

  it("keeps Insert limited to currently implemented actions", () => {
    const insert = DOCUMENT_MENU_BAR.find((m) => m.id === "insert");
    const actions = (insert?.items ?? [])
      .filter((item) => item.type === "action")
      .map((item) => item.id);
    expect(actions).toEqual(["insert.link", "insert.example"]);
  });
});
