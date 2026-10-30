import { expect, test } from "vitest";
import priorActions from "./fixtures/qalam-menu-working-actions.json";
import { allMenuActionIds, DOCUMENT_MENU_BAR, MENU_WIDTHS, type MenuNode } from "../app/tools/document-studio/utils/documentMenus";

test("Phase 1 preserves every existing Qalam working command ID", () => {
  expect([...new Set(allMenuActionIds())].sort()).toEqual([...priorActions, "window.page", "file.close", "file.exit"].sort());
});

test("main labels/order and reference popup widths remain explicit", () => {
  expect(DOCUMENT_MENU_BAR.map(menu => menu.labelEn)).toEqual(["File", "Edit", "View", "Format", "Insert", "Utilities", "Window", "Help"]);
  expect(MENU_WIDTHS).toEqual({ file: 250, edit: 244, view: 202, format: 263, insert: 225, tools: 243, window: 197, help: 168 });
});

test("Place is non-dispatchable, and removed Insert entries remain accessible elsewhere", () => {
  const file = DOCUMENT_MENU_BAR.find(menu => menu.id === "file")!;
  expect(file.items.find(item => "id" in item && item.id === "file.place")?.type).toBe("unavailable");
  const insert = DOCUMENT_MENU_BAR.find(menu => menu.id === "insert")!;
  expect(insert.items.some(item => "id" in item && ["insert.link", "insert.example"].includes(item.id))).toBe(false);
  expect(allMenuActionIds()).toEqual(expect.arrayContaining(["insert.link", "insert.example", "insert.image"]));
});

test("Qalam-only commands have a separate non-interactive section in every menu", () => {
  for (const menu of DOCUMENT_MENU_BAR) {
    const index = menu.items.findIndex(item => item.type === "section");
    expect(index, menu.labelEn).toBeGreaterThan(0);
    expect(menu.items[index - 1].type, menu.labelEn).toBe("separator");
  }
});

test("reference dialogs remain unavailable rather than aliases for unrelated commands", () => {
  const format = DOCUMENT_MENU_BAR.find(menu => menu.id === "format")!;
  for (const id of ["text.wrap", "text.tableFormat", "text.styles", "text.colors"]) {
    expect(format.items.find(item => "id" in item && item.id === id)?.type).toBe("unavailable");
  }
  const actionNodes = (items: MenuNode[]): string[] => items.flatMap(item => item.type === "action" ? [item.id] : item.type === "submenu" ? actionNodes(item.items) : []);
  expect(actionNodes(format.items)).toEqual(expect.arrayContaining(["format.image.wrap", "table.addRowAfter"]));
});
