import { describe, expect, it } from "vitest";
import { DOCUMENT_MENU_BAR, contextualInsertTableMenu, type InsertTableMode } from "../app/tools/document-studio/utils/documentMenus";
import { dispatchDocumentMenuAction, type DocumentMenuHandlers } from "../app/tools/document-studio/utils/documentMenuActions";

describe("InPage Insert table entry", () => {
  const base = DOCUMENT_MENU_BAR.find(menu => menu.id === "insert")!;
  it.each([
    ["plain", "insert.table", "Table…"],
    ["selection", "insert.textToTable", "Text To Table…"],
    ["table", "insert.tableToText", "Table To Text…"],
  ] as const)("%s: one table item with the correct action and label", (mode, id, label) => {
    const menu = contextualInsertTableMenu(base, mode as InsertTableMode);
    const tableItems = menu.items.filter(item => item.type === "action" && ["insert.table", "insert.textToTable", "insert.tableToText"].includes(item.id));
    expect(tableItems).toHaveLength(1);
    expect(tableItems[0]).toMatchObject({ id, labelEn: label, labelUr: label });
    expect(menu.items.find(item => "id" in item && item.id === "page.splitTable")).toEqual(
      base.items.find(item => "id" in item && item.id === "page.splitTable"),
    );
    expect(base.items.find(item => "id" in item && item.id === "insert.table")).toMatchObject({ labelEn: "Table…" });
  });
  it("opens the existing matching dialog handler without changing conversion code", () => {
    const called: string[] = [];
    const handlers = {
      openTableInsert: () => called.push("Insert Table"),
      textToTable: () => called.push("Text To Table"),
      tableToText: () => called.push("Table To Text"),
    } as unknown as DocumentMenuHandlers;
    dispatchDocumentMenuAction("insert.table", null, handlers);
    dispatchDocumentMenuAction("insert.textToTable", null, handlers);
    dispatchDocumentMenuAction("insert.tableToText", null, handlers);
    expect(called).toEqual(["Insert Table", "Text To Table", "Table To Text"]);
  });
});
