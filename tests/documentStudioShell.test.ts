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
  applyMenuEscape,
  CLOSED_MENU_STATE,
  collectMenuActionIds,
  DOCUMENT_MENU_BAR,
  menuCatalogText,
  nextOpenMenu,
  nextOpenSubmenu,
  OMITTED_FUTURE_ACTIONS,
  placeFloatingSubmenu,
  setOpenSubmenu,
} from "../app/tools/document-studio/utils/documentMenus";
import {
  dispatchDocumentMenuAction,
  lineHeightFromMenuAction,
  type DocumentMenuHandlers,
} from "../app/tools/document-studio/utils/documentMenuActions";

function mockHandlers(extra: Partial<DocumentMenuHandlers> = {}): DocumentMenuHandlers & { calls: string[] } {
  const calls: string[] = [];
  const track = (name: string) => () => {
    calls.push(name);
  };
  return {
    calls,
    newDocument: track("new"),
    openLibrary: track("open"),
    upload: track("upload"),
    downloadTxt: track("txt"),
    downloadDocx: track("docx"),
    downloadPdf: track("pdf"),
    print: track("print"),
    openPageSetup: track("pageSetup"),
    find: track("find"),
    toggleOutline: track("outline"),
    toggleQuality: track("quality"),
    toggleGlossary: track("glossary"),
    toggleSettings: track("settings"),
    toggleFullscreen: track("fullscreen"),
    setViewMode: (mode) => {
      calls.push(`view:${mode}`);
    },
    setZoom: (zoom) => {
      calls.push(`zoom:${zoom}`);
    },
    toggleRuler: track("ruler"),
    setRulerUnit: (unit) => {
      calls.push(`unit:${unit}`);
    },
    loadExample: track("example"),
    promptLink: track("link"),
    setDir: (dir) => {
      calls.push(`dir:${dir}`);
    },
    standardize: track("standardize"),
    audit: track("audit"),
    showStats: track("stats"),
    startDictation: track("dictation"),
    openHelp: (mode) => {
      calls.push(`help:${mode}`);
    },
    ...extra,
  };
}

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

  it("opens only one top-level menu at a time", () => {
    let state = nextOpenMenu(CLOSED_MENU_STATE, "file");
    expect(state).toEqual({ menuId: "file", submenuId: null });
    state = nextOpenMenu(state, "edit");
    expect(state.menuId).toBe("edit");
    expect(state.submenuId).toBeNull();
    state = nextOpenMenu(state, "edit");
    expect(state).toEqual(CLOSED_MENU_STATE);
  });

  it("closes on Escape, submenu first", () => {
    let state = setOpenSubmenu(nextOpenMenu(CLOSED_MENU_STATE, "format"), "format.text");
    state = applyMenuEscape(state);
    expect(state).toEqual({ menuId: "format", submenuId: null });
    state = applyMenuEscape(state);
    expect(state).toEqual(CLOSED_MENU_STATE);
  });

  it("toggles one submenu inside the open menu", () => {
    const open = nextOpenMenu(CLOSED_MENU_STATE, "file");
    const download = nextOpenSubmenu(open, "file.download");
    expect(download.submenuId).toBe("file.download");
    expect(nextOpenSubmenu(download, "file.download").submenuId).toBeNull();
  });

  it("wires File / Edit / View / Insert / Tools / Help to real handlers", () => {
    const h = mockHandlers();
    dispatchDocumentMenuAction("file.new", null, h);
    dispatchDocumentMenuAction("file.open", null, h);
    dispatchDocumentMenuAction("file.upload", null, h);
    dispatchDocumentMenuAction("file.downloadTxt", null, h);
    dispatchDocumentMenuAction("file.downloadDocx", null, h);
    dispatchDocumentMenuAction("file.downloadPdf", null, h);
    dispatchDocumentMenuAction("file.print", null, h);
    dispatchDocumentMenuAction("edit.find", null, h);
    dispatchDocumentMenuAction("view.outline", null, h);
    dispatchDocumentMenuAction("view.pages", null, h);
    dispatchDocumentMenuAction("view.pageless", null, h);
    dispatchDocumentMenuAction("view.settings", null, h);
    dispatchDocumentMenuAction("view.fullscreen", null, h);
    dispatchDocumentMenuAction("insert.link", null, h);
    dispatchDocumentMenuAction("insert.example", null, h);
    dispatchDocumentMenuAction("tools.standardize", null, h);
    dispatchDocumentMenuAction("tools.audit", null, h);
    dispatchDocumentMenuAction("tools.stats", null, h);
    dispatchDocumentMenuAction("tools.dictation", null, h);
    dispatchDocumentMenuAction("help.rtl", null, h);
    expect(h.calls).toEqual([
      "new",
      "open",
      "upload",
      "txt",
      "docx",
      "pdf",
      "print",
      "find",
      "outline",
      "view:pages",
      "view:pageless",
      "settings",
      "fullscreen",
      "link",
      "example",
      "standardize",
      "audit",
      "stats",
      "dictation",
      "help:rtl",
    ]);
  });

  it("wires Format commands through documentCommands", () => {
    const calls: string[] = [];
    const chain: {
      focus: () => typeof chain;
      toggleBold: () => typeof chain;
      setTextAlign: (align: string) => typeof chain;
      setHeading: (opts: { level: number }) => typeof chain;
      updateAttributes: (node: string, attrs: { lineHeight: number | null }) => typeof chain;
      run: () => boolean;
    } = {
      focus: () => chain,
      toggleBold: () => {
        calls.push("bold");
        return chain;
      },
      setTextAlign: (align) => {
        calls.push(`align:${align}`);
        return chain;
      },
      setHeading: (opts) => {
        calls.push(`h${opts.level}`);
        return chain;
      },
      updateAttributes: (_node, attrs) => {
        calls.push(`lh:${attrs.lineHeight}`);
        return chain;
      },
      run: () => true,
    };
    const editor = { chain: () => chain, isActive: () => false } as never;
    const h = mockHandlers();
    dispatchDocumentMenuAction("format.bold", editor, h);
    dispatchDocumentMenuAction("format.alignCenter", editor, h);
    dispatchDocumentMenuAction("format.style.heading-1", editor, h);
    dispatchDocumentMenuAction("format.lh.1.5", editor, h);
    dispatchDocumentMenuAction("format.rtl", editor, h);
    expect(calls).toEqual(["bold", "align:center", "h1", "lh:1.5"]);
    expect(h.calls).toEqual(["dir:rtl"]);
  });

  it("parses line-spacing menu ids", () => {
    expect(lineHeightFromMenuAction("format.lh.default")).toBeNull();
    expect(lineHeightFromMenuAction("format.lh.1.15")).toBe(1.15);
    expect(lineHeightFromMenuAction("format.bold")).toBeUndefined();
  });

  it("wires only real actions and omits future cloud/table/image/print items", () => {
    const ids = allMenuActionIds();
    expect(ids).toContain("file.print");
    expect(ids).toContain("view.ruler");
    expect(ids).toContain("view.zoom.100");
    expect(ids).toContain("tools.standardize");
    expect(ids).toContain("edit.find");
    expect(ids).toContain("insert.link");
    expect(ids).toContain("format.style.title");
    expect(ids).toContain("tools.stats");
    expect(ids).not.toContain("share" as never);
    const blob = menuCatalogText();
    for (const future of OMITTED_FUTURE_ACTIONS) {
      expect(blob.includes(future)).toBe(false);
    }
  });

  it("keeps Insert limited to currently implemented actions", () => {
    const insert = DOCUMENT_MENU_BAR.find((m) => m.id === "insert");
    expect(collectMenuActionIds(insert?.items ?? [])).toEqual(["insert.link", "insert.example"]);
  });

  it("groups Format into real submenus", () => {
    const format = DOCUMENT_MENU_BAR.find((m) => m.id === "format");
    const subIds = (format?.items ?? [])
      .filter((item) => item.type === "submenu")
      .map((item) => item.id);
    expect(subIds).toEqual(["format.text", "format.style", "format.align", "format.lists", "format.spacing"]);
  });

  it("places nested submenus beside the parent and flips when space is tight", () => {
    const room = placeFloatingSubmenu({
      triggerRect: { top: 80, left: 40, right: 288, bottom: 104 },
      parentRect: { left: 40, right: 288 },
      viewportWidth: 1200,
      viewportHeight: 800,
      isUr: false,
    });
    expect(room.left).toBe(288);
    const flip = placeFloatingSubmenu({
      triggerRect: { top: 80, left: 980, right: 1228, bottom: 104 },
      parentRect: { left: 980, right: 1228 },
      viewportWidth: 1280,
      viewportHeight: 800,
      isUr: false,
    });
    expect(flip.left).toBe(980 - 184);
  });
});
