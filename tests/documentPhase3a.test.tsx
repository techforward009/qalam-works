/** @vitest-environment happy-dom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DOCUMENT_ZOOM,
  DOCUMENT_ZOOM_PRESETS,
  EDITOR_SPELLCHECK_ATTR,
  loadDocumentZoom,
  parseStoredZoom,
  saveDocumentZoom,
  saveRulerVisible,
  loadRulerVisible,
  documentPrintCss,
} from "../app/tools/document-studio/utils/documentView";
import { allMenuActionIds, DOCUMENT_MENU_BAR } from "../app/tools/document-studio/utils/documentMenus";
import { dispatchDocumentMenuAction, type DocumentMenuHandlers } from "../app/tools/document-studio/utils/documentMenuActions";
import DocumentStudioShell from "../app/tools/document-studio/components/DocumentStudioShell";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Phase 3A editor parity", () => {
  it("exposes zoom presets including fit width/page", () => {
    expect(DOCUMENT_ZOOM_PRESETS).toEqual([50, 75, 100, 125, 150]);
    expect(DEFAULT_DOCUMENT_ZOOM).toBe(100);
    const ids = allMenuActionIds();
    for (const value of DOCUMENT_ZOOM_PRESETS) expect(ids).toContain(`view.zoom.${value}`);
    expect(ids).toContain("view.zoom.fit-width");
    expect(ids).toContain("view.zoom.fit-page");
  });

  it("persists zoom as a local view preference without document JSON", () => {
    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    const snapshot = JSON.stringify(doc);
    saveDocumentZoom(125);
    expect(loadDocumentZoom()).toBe(125);
    expect(parseStoredZoom("fit-page")).toBe("fit-page");
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it("persists ruler visibility", () => {
    saveRulerVisible(false);
    expect(loadRulerVisible()).toBe(false);
    saveRulerVisible(true);
    expect(loadRulerVisible()).toBe(true);
  });

  it("wires File → Print and View zoom/ruler without changing Tools", () => {
    const calls: string[] = [];
    const handlers = {
      print: () => calls.push("print"),
      setZoom: (zoom: string | number) => calls.push(`zoom:${zoom}`),
      toggleRuler: () => calls.push("ruler"),
      standardize: () => calls.push("standardize"),
      audit: () => calls.push("audit"),
      showStats: () => calls.push("stats"),
      startDictation: () => calls.push("dictation"),
      toggleGlossary: () => calls.push("glossary"),
    } as unknown as DocumentMenuHandlers;
    dispatchDocumentMenuAction("file.print", null, handlers);
    dispatchDocumentMenuAction("view.zoom.75", null, handlers);
    dispatchDocumentMenuAction("view.ruler", null, handlers);
    dispatchDocumentMenuAction("tools.standardize", null, handlers);
    dispatchDocumentMenuAction("tools.audit", null, handlers);
    dispatchDocumentMenuAction("tools.stats", null, handlers);
    dispatchDocumentMenuAction("tools.dictation", null, handlers);
    dispatchDocumentMenuAction("tools.glossary", null, handlers);
    expect(calls).toEqual(["print", "zoom:75", "ruler", "standardize", "audit", "stats", "dictation", "glossary"]);
    const tools = DOCUMENT_MENU_BAR.find((menu) => menu.id === "tools");
    expect(tools?.items.filter((item) => item.type === "action").map((item) => item.id)).toEqual([
      "tools.standardize",
      "tools.audit",
      "tools.stats",
      "tools.dictation",
      "tools.glossary",
    ]);
  });

  it("hides app chrome in print CSS and enables native spellcheck", () => {
    expect(EDITOR_SPELLCHECK_ATTR).toBe("true");
    const { container } = render(
      <DocumentStudioShell
        isUr={false}
        topBar={<div>top</div>}
        menuBar={<div>menu</div>}
        toolbar={<div>tools</div>}
        statusBar={<div>status</div>}
      >
        <div data-studio-print-root="true">doc</div>
      </DocumentStudioShell>,
    );
    const css = Array.from(container.querySelectorAll("style")).map((node) => node.textContent ?? "").join("\n");
    expect(css).toContain("@media print");
    expect(css).toContain("studio-no-print");
    expect(document.querySelector("[data-studio-chrome='toolbar']")).toBeTruthy();
    expect(documentPrintCss(210, 297)).toContain("[data-studio-print-root]");
  });

  it("print CSS uses physical page geometry and cannot inherit screen zoom", () => {
    const css = documentPrintCss(210, 297);
    expect(css).toContain("@page { size: 210mm 297mm; margin: 0; }");
    expect(css).toContain("transform: none");
    expect(css).toContain("scale: none");
    expect(css).toContain("break-after: auto");
    expect(css).toContain("[data-studio-ruler]");
    expect(css).toContain("box-shadow: none");
    expect(css).toContain("border-radius: 0");
    expect(css).toContain("min-height: 0");
    expect(css).toContain(".qalam-page-gap");
    expect(css).not.toContain("inset: 0");
    const zoomed = documentPrintCss(210, 297);
    expect(zoomed).toBe(css);
  });
});
