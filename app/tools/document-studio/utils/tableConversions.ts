import type { JSONContent } from "@tiptap/core";
import type { Fragment } from "@tiptap/pm/model";
import type { RulerUnit } from "./documentView";

export type TextTableMode = "tabs" | "paragraph";

export function parseTableColumnWidth(value: string, unit: RulerUnit): number | null {
  if (/^auto$/i.test(value.trim())) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(cm|in|mm|pt|px)?$/i);
  if (!match) throw new Error("Enter a positive column width or Auto.");
  const size = Number(match[1]), type = (match[2]?.toLowerCase() || unit);
  const factor: Record<string, number> = { cm: 96 / 2.54, in: 96, mm: 96 / 25.4, pt: 96 / 72, px: 1 };
  const px = size * factor[type];
  if (!Number.isFinite(px) || px < 8 || px > 2000) throw new Error("Column width must be between 8 and 2000 pixels.");
  return Math.round(px);
}

export function createTableContent(rows: number, cols: number, widthPx: number | null, dir?: "rtl" | "ltr"): JSONContent {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 100 || cols > 50)
    throw new Error("Rows or columns are outside the supported range.");
  return { type: "table", content: Array.from({ length: rows }, () => ({
    type: "tableRow", content: Array.from({ length: cols }, () => ({
      type: "tableCell", ...(widthPx === null ? {} : { attrs: { colwidth: [widthPx] } }),
      content: [{ type: "paragraph", ...(dir ? { attrs: { dir, directionMode: "manual" } } : {}) }],
    })),
  })) };
}

export function convertSelectionToTable(fragment: Fragment, mode: TextTableMode): JSONContent {
  const paragraphs: JSONContent[] = [];
  fragment.descendants(node => {
    if (node.type.name === "paragraph" || /^heading$/.test(node.type.name)) {
      paragraphs.push(node.toJSON() as JSONContent);
      return false;
    }
    return true;
  });
  if (!paragraphs.length) throw new Error("Select text before converting it into a table.");
  const rows = paragraphs.map(paragraph => {
    if (mode === "paragraph") return [paragraph];
    const cells: JSONContent[][] = [[]];
    for (const item of paragraph.content || []) {
      if (item.type !== "text" || !item.text?.includes("\t")) {
        cells[cells.length - 1].push(item);
        continue;
      }
      item.text.split("\t").forEach((segment, index) => {
        if (index) cells.push([]);
        if (segment) cells[cells.length - 1].push({ ...item, text: segment });
      });
    }
    return cells.map(content => ({ type: "paragraph", ...(paragraph.attrs ? { attrs: paragraph.attrs } : {}), ...(content.length ? { content } : {}) }));
  });
  const width = Math.max(...rows.map(row => row.length));
  return { type: "table", content: rows.map(cells => ({
    type: "tableRow", content: Array.from({ length: width }, (_, i) => ({
      type: "tableCell", content: [cells[i] ?? { type: "paragraph", ...(paragraphs[0].attrs ? { attrs: paragraphs[0].attrs } : {}) }],
    })),
  })) };
}
