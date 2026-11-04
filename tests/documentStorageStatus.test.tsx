/** @vitest-environment happy-dom */

import { render, cleanup, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DocumentTopBar from "../app/tools/document-studio/components/DocumentTopBar";
import DocumentStatusBar from "../app/tools/document-studio/components/DocumentStatusBar";
import type { DocumentLibrary } from "../app/tools/document-studio/utils/documentLibrary";
import type { SaveStatus } from "../app/tools/document-studio/utils/documentShell";

afterEach(cleanup);

function renderStatus(storageDurability: DocumentLibrary["durability"], saveStatus: SaveStatus = "saved", isUr = false, online = true) {
  const shared = { storageDurability, saveStatus, isUr, online };
  return render(<>
    <DocumentTopBar {...shared} title="Draft" onTitleChange={() => {}} onTitleCommit={() => {}}
      isImporting={false} onNewDocument={() => {}} onUploadClick={() => {}} onStandardize={() => {}} onAudit={() => {}} />
    <DocumentStatusBar {...shared} dir="rtl" stats={null} />
  </>);
}

describe("Document Studio storage status", () => {
  it.each(["idle", "saving", "saved"] as const)("shows temporary storage in both indicators for memory %s", (status) => {
    renderStatus("memory", status);
    expect(screen.getAllByText("Temporary · This session only")).toHaveLength(2);
    expect(screen.queryByText("Saved")).toBeNull();
    expect(document.querySelector('[data-studio-save-status="saved"]')).toBeNull();
    expect(screen.getAllByRole("status").map((node) => node.textContent).join(" ")).toContain("Keep this tab open and download/export your document.");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows natural Urdu warning and temporary status even while offline", () => {
    renderStatus("memory", "saved", true, false);
    expect(screen.getAllByText("عارضی · صرف اس سیشن میں")).toHaveLength(2);
    expect(screen.getAllByRole("status").map((node) => node.textContent).join(" ")).toContain("یہ ٹیب کھلا رکھیں");
    expect(screen.queryByText("محفوظ")).toBeNull();
  });

  it("keeps storage errors visible alongside the fallback warning", () => {
    renderStatus("memory", "error");
    expect(screen.getAllByText("Couldn’t save locally")).toHaveLength(2);
    expect(screen.getAllByRole("status").map((node) => node.textContent).join(" ")).toContain("Browser storage is unavailable.");
  });

  it.each([
    ["saved", true, false, "Saved"],
    ["saving", true, false, "Saving…"],
    ["saved", false, false, "Offline · Saved locally"],
    ["saved", true, true, "محفوظ"],
    ["error", true, false, "Couldn’t save locally"],
  ] as const)("preserves persistent %s status (online=%s, Urdu=%s)", (status, online, isUr, label) => {
    renderStatus("persistent", status, isUr, online);
    expect(screen.getAllByText(label)).toHaveLength(2);
    const panel = screen.getByRole("status");
    expect(panel.textContent).toBe(label);
    expect(panel.getAttribute("data-studio-status-panel")).toBe("left");
    expect(panel.style.color).toBe("#000");
    expect(panel.style.fontSize).toBe("11px");
    expect(panel.style.fontFamily).toContain("Tahoma");
  });
});

describe("Document Studio keyboard status panel", () => {
  it("shows the selected keyboard name in its own panel next to the save status", () => {
    render(<DocumentStatusBar isUr={false} dir="rtl" stats={null} saveStatus="saved" storageDurability="persistent" online keyboardName="InPage Phonetic" />);
    const panel = document.querySelector<HTMLElement>("[data-studio-keyboard-status]");
    expect(panel?.textContent).toBe("InPage Phonetic");
    expect(panel?.title).toBe("Keyboard: InPage Phonetic");
    expect(panel?.previousElementSibling?.getAttribute("data-studio-status-panel")).toBe("left");
  });
  it("omits the panel without a keyboard name", () => {
    render(<DocumentStatusBar isUr={false} dir="rtl" stats={null} saveStatus="saved" storageDurability="persistent" online />);
    expect(document.querySelector("[data-studio-keyboard-status]")).toBeNull();
  });
});

describe("Document Studio status bar lock indicators and widths", () => {
  function fire(type: string, numLock: boolean) {
    const ev = new KeyboardEvent(type, { bubbles: true });
    Object.defineProperty(ev, "getModifierState", { value: (k: string) => k === "NumLock" && numLock });
    act(() => { document.body.dispatchEvent(ev); });
  }
  it("shows NUM by default and follows the real Num Lock state, keeping the panel", () => {
    render(<DocumentStatusBar isUr={false} dir="rtl" stats={null} saveStatus="saved" storageDurability="persistent" online keyboardName="Persian (Monotype)" />);
    const panel = document.querySelector("[data-studio-num-lock]") as HTMLElement;
    expect(panel.textContent).toBe("NUM");
    fire("keydown", false);
    expect(panel.textContent).toBe("");
    expect(document.querySelector("[data-studio-num-lock]")).toBe(panel);
    expect(panel.getAttribute("data-studio-num-lock-on")).toBe("false");
    fire("keyup", true);
    expect(panel.textContent).toBe("NUM");
    const mouse = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(mouse, "getModifierState", { value: () => false });
    act(() => { document.body.dispatchEvent(mouse); });
    expect(panel.textContent).toBe("");
  });
  it("uses a narrow centered Saved panel and a wider centered keyboard panel", () => {
    render(<DocumentStatusBar isUr={false} dir="rtl" stats={null} saveStatus="saved" storageDurability="persistent" online keyboardName="Persian (Monotype)" />);
    const save = document.querySelector('[data-studio-status-panel="left"]') as HTMLElement;
    const kb = document.querySelector("[data-studio-keyboard-status]") as HTMLElement;
    expect(save.style.width).toBe("80px");
    expect(save.style.textAlign).toBe("center");
    expect(kb.style.width).toBe("150px");
    expect(kb.style.textAlign).toBe("center");
  });
});
