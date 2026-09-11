/** @vitest-environment happy-dom */

import { render, cleanup, screen } from "@testing-library/react";
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
    expect(screen.getByRole("status").textContent).toContain("Keep this tab open and download/export your document.");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows natural Urdu warning and temporary status even while offline", () => {
    renderStatus("memory", "saved", true, false);
    expect(screen.getAllByText("عارضی · صرف اس سیشن میں")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toContain("یہ ٹیب کھلا رکھیں");
    expect(screen.queryByText("محفوظ")).toBeNull();
  });

  it("keeps storage errors visible alongside the fallback warning", () => {
    renderStatus("memory", "error");
    expect(screen.getAllByText("Couldn’t save locally")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toContain("Browser storage is unavailable.");
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
    expect(screen.queryByRole("status")).toBeNull();
  });
});
