// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import { AllSelection } from "@tiptap/pm/state";
import puppeteer from "puppeteer-core";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { QalamTableFormatAttributes } from "../app/tools/document-studio/utils/tableFormatAttributes";
import { QalamTableStableDirection } from "../app/tools/document-studio/utils/tableStableDirection";
import { QalamTableColumnResizing, getHandle } from "../app/tools/document-studio/utils/tableColumnResizing";
import { LatinScriptRuns } from "../app/tools/document-studio/extensions/LatinScriptRuns";
import { createTableContent } from "../app/tools/document-studio/utils/tableConversions";
import * as tableFormatModule from "../app/tools/document-studio/utils/tableFormat";
import { getTableFormat, applyTableFormat } from "../app/tools/document-studio/utils/tableFormat";
import { tableLayoutCommand } from "../app/tools/document-studio/utils/tableOperations";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";

const CHROME_PATH = existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : "/usr/bin/chromium";

function extractCanvasStyles(): string {
  const src = readFileSync(
    join(process.cwd(), "app/tools/document-studio/components/DocumentCanvas.tsx"),
    "utf8",
  );
  const marker = "<style jsx global>{`";
  const start = src.indexOf(marker);
  const end = src.indexOf("`}</style>", start);
  const raw = start >= 0 && end > start ? src.slice(start + marker.length, end) : "";
  expect(raw.length).toBeGreaterThan(1000);
  return raw.replace(/\$\{[^}]+\}/g, "top");
}

function createUrduTableDoc(
  rows: string[][],
  colWidths?: number[] | null,
  tableWidthPx?: number | null,
  indentMm = 0,
) {
  return {
    type: "doc",
    content: [
      {
        type: "table",
        attrs: {
          dir: "rtl",
          tableFlow: "rtl",
          tableAlignment: "right",
          tableIndentMm: indentMm,
          tableFormatWidthPx: tableWidthPx ?? null,
        },
        content: rows.map((row) => ({
          type: "tableRow",
          content: row.map((text, colIdx) => ({
            type: "tableCell",
            attrs: {
              colwidth: colWidths ? [colWidths[colIdx]] : null,
            },
            content: [
              {
                type: "paragraph",
                attrs: { dir: "rtl" },
                ...(text ? { content: [{ type: "text", text }] } : {}),
              },
            ],
          })),
        })),
      },
    ],
  };
}

describe("Qalam Page InPage screen table parity", () => {
  it("1. draws single 0.5pt screen lines (inner and outer equal thickness) while keeping all 4 sides of a blue cell and PDF 0.5pt SVG output unchanged", async () => {
    const urduRows = [
      ["اردو متن", "پاکستان", "لاہور"],
      ["کراچی", "اسلام آباد", "پشاور"],
      ["کوئٹہ", "ملتان", "فیصل آباد"],
    ];
    const editor = new Editor({
      extensions: [
        ...createDocumentStudioExtensions(),
        QalamTableStableDirection,
        QalamTableFormatAttributes,
      ],
      content: createUrduTableDoc(urduRows, [140, 140, 140], 420),
    });

    const tableEl = editor.view.dom.querySelector("table.qalam-document-table") as HTMLTableElement;
    expect(tableEl.style.borderCollapse).toBe("collapse");

    // Place caret in middle cell (1,1) ("اسلام آباد") and colour only that cell blue (#0000ff) at 0.5pt
    const cellPositions: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "tableCell") cellPositions.push(pos);
    });
    editor.commands.setTextSelection(cellPositions[4] + 2);
    const fmt = getTableFormat(editor);
    expect(
      applyTableFormat(editor, {
        ...fmt,
        borderColor: "#0000ff",
        borderStyle: "solid",
        borderWidthPt: 0.5,
      }),
    ).toBe(true);

    // PDF path must remain unchanged (24 single 0.5pt SVG rects, 4 blue on middle cell)
    const pdfOut = buildPdfHtml(editor.getJSON() as never, "rtl", { faces: [] }).html;
    const pdfTable = pdfOut.match(/<table class="qalam-document-table"[\s\S]*?<\/table>/)?.[0] ?? "";
    const svgRects = [...pdfTable.matchAll(/<rect\b([^>]*)\/?>/g)].map((m) => m[1]);
    expect(svgRects).toHaveLength(24);
    expect(svgRects.filter((r) => r.includes('fill="#0000ff"'))).toHaveLength(4);

    // Render live editor DOM in real Chromium and scan pixel thickness & colour of every horizontal and vertical line
    const canvasCss = extractCanvasStyles();
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 700, height: 400, deviceScaleFactor: 1 });
      await page.setContent(
        `<!doctype html><html><head><style>
          body { margin: 24px; background: #ffffff; }
          ${canvasCss}
        </style></head><body>
          <div class="qalam-editor-content"><div class="ProseMirror" dir="rtl">${editor.view.dom.innerHTML}</div></div>
        </body></html>`,
        { waitUntil: "load" },
      );

      // Replace text with <br> first so pixel scan strictly measures table borders without collapsing rows
      await page.evaluate(() => {
        document.querySelectorAll("td p").forEach((p) => {
          p.innerHTML = "<br>";
        });
      });

      const box = await page.$eval("table.qalam-document-table", (el) => {
        const r = el.getBoundingClientRect();
        const c11 = (el as HTMLTableElement).rows[1].cells[1].getBoundingClientRect();
        const r0 = (el as HTMLTableElement).rows[0].cells[0].getBoundingClientRect();
        return {
          left: Math.floor(r.left) - 4,
          top: Math.floor(r.top) - 4,
          width: Math.ceil(r.width) + 8,
          height: Math.ceil(r.height) + 8,
          midRowY: Math.round((c11.top + c11.bottom) / 2),
          topRowY: Math.round((r0.top + r0.bottom) / 2),
          midColX: Math.round((c11.left + c11.right) / 2),
          rightColX: Math.round((r0.left + r0.right) / 2),
        };
      });
      const shot = await page.screenshot({
        clip: { x: box.left, y: box.top, width: box.width, height: box.height },
        encoding: "base64",
      });
      const scans = await page.evaluate(
        async ({ b64, box }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, img.width, img.height).data;
          const classifyPixel = (x: number, y: number): "W" | "B" | "K" => {
            const idx = (y * img.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            if (r > 245 && g > 245 && b > 245) return "W";
            if (b > r + 40 && b > 100) return "B";
            return "K";
          };
          const scanRunsH = (absY: number) => {
            const y = absY - box.top;
            const runs: { kind: "B" | "K"; width: number }[] = [];
            let x = 0;
            while (x < img.width) {
              const c = classifyPixel(x, y);
              if (c !== "W") {
                let end = x;
                while (end < img.width && classifyPixel(end, y) !== "W") end++;
                let hasBlue = false;
                for (let k = x; k < end; k++) if (classifyPixel(k, y) === "B") hasBlue = true;
                runs.push({ kind: hasBlue ? "B" : "K", width: end - x });
                x = end;
              } else x++;
            }
            return runs;
          };
          const scanRunsV = (absX: number) => {
            const x = absX - box.left;
            const runs: { kind: "B" | "K"; width: number }[] = [];
            let y = 0;
            while (y < img.height) {
              const c = classifyPixel(x, y);
              if (c !== "W") {
                let end = y;
                while (end < img.height && classifyPixel(x, end) !== "W") end++;
                let hasBlue = false;
                for (let k = y; k < end; k++) if (classifyPixel(x, k) === "B") hasBlue = true;
                runs.push({ kind: hasBlue ? "B" : "K", width: end - y });
                y = end;
              } else y++;
            }
            return runs;
          };
          return {
            topRowH: scanRunsH(box.topRowY),
            midRowH: scanRunsH(box.midRowY),
            midColV: scanRunsV(box.midColX),
          };
        },
        { b64: shot, box },
      );

      // Top row horizontal scan: 4 black lines, each 1px (outer + inner equal thickness!)
      expect(scans.topRowH).toEqual([
        { kind: "K", width: 1 },
        { kind: "K", width: 1 },
        { kind: "K", width: 1 },
        { kind: "K", width: 1 },
      ]);
      // Middle row horizontal scan through blue cell (1,1): outer black, BOTH inner vertical borders of (1,1) blue, outer black — each 1px!
      expect(scans.midRowH).toEqual([
        { kind: "K", width: 1 },
        { kind: "B", width: 1 },
        { kind: "B", width: 1 },
        { kind: "K", width: 1 },
      ]);
      // Middle column vertical scan through blue cell (1,1): outer top black, BOTH inner horizontal borders of (1,1) blue, outer bottom black — each 1px!
      expect(scans.midColV).toEqual([
        { kind: "K", width: 1 },
        { kind: "B", width: 1 },
        { kind: "B", width: 1 },
        { kind: "K", width: 1 },
      ]);
    } finally {
      await browser.close();
      editor.destroy();
    }
  }, 30000);

  it("2. renders selected cells with a translucent fill only and no extra inner outline box", async () => {
    const canvasCss = extractCanvasStyles();
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(
        `<!doctype html><html><head><style>${canvasCss}</style></head><body>
          <div class="qalam-editor-content">
            <div class="ProseMirror" dir="rtl">
              <table class="qalam-document-table" dir="rtl">
                <tr><td class="selectedCell"><p dir="rtl">اردو متن</p></td><td><p dir="rtl">پاکستان</p></td></tr>
              </table>
            </div>
          </div>
        </body></html>`,
        { waitUntil: "load" },
      );
      const pseudo = await page.$eval("td.selectedCell", (el) => {
        const s = getComputedStyle(el, "::after");
        return {
          backgroundColor: s.backgroundColor,
          outlineStyle: s.outlineStyle,
          outlineWidth: s.outlineWidth,
        };
      });
      expect(pseudo.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(pseudo.outlineStyle).toBe("none");
      expect(pseudo.outlineWidth).toBe("0px");
    } finally {
      await browser.close();
    }
  }, 20000);

  it("3. keeps table row height completely unchanged when typing Space after Urdu text or in an empty cell", async () => {
    const fontB64 = readFileSync(
      join(process.cwd(), "public/fonts/MehrNastaliqWeb.woff2"),
    ).toString("base64");
    const canvasCss = extractCanvasStyles();

    const editor = new Editor({
      extensions: [
        ...createDocumentStudioExtensions(),
        QalamTableStableDirection,
        QalamTableFormatAttributes,
        LatinScriptRuns,
      ],
      content: createUrduTableDoc(
        [
          ["اردو متن", "پاکستان"],
          ["", "لاہور"],
        ],
        [200, 200],
        400,
      ),
    });

    const htmlWithoutSpace = editor.view.dom.innerHTML;
    // Place caret at end of first cell ("اردو متن") and insert a trailing space
    let firstCellEnd = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "tableCell" && firstCellEnd === 0) {
        firstCellEnd = pos + node.nodeSize - 2;
      }
    });
    editor.commands.setTextSelection(firstCellEnd);
    editor.commands.insertContent(" ");
    const htmlWithTrailingSpace = editor.view.dom.innerHTML;
    expect(htmlWithTrailingSpace).toContain("data-studio-preserved-space");

    // Delete the trailing space (Backspace)
    editor.commands.deleteRange({ from: firstCellEnd, to: firstCellEnd + 1 });
    const htmlAfterBackspace = editor.view.dom.innerHTML;

    // Type Space in empty cell (row 1, col 0)
    const cellPositions: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "tableCell") cellPositions.push(pos);
    });
    editor.commands.setTextSelection(cellPositions[2] + 2);
    editor.commands.insertContent(" ");
    const htmlEmptyPlusSpace = editor.view.dom.innerHTML;

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });
      await page.setContent(
        `<!doctype html><html><head><style>
          @font-face {
            font-family: "Mehr Nastaliq Web";
            src: url(data:font/woff2;base64,${fontB64}) format("woff2");
          }
          :root {
            --qalam-rtl-font: "Mehr Nastaliq Web";
            --qalam-ltr-font: Arial, sans-serif;
            --qalam-body-size: 12pt;
            --qalam-line-height: 19.8pt;
          }
          ${canvasCss}
          .qalam-editor-content .ProseMirror p {
            font-size: 12pt;
            line-height: 19.8pt;
          }
        </style></head><body>
          <div class="qalam-editor-content">
            <div id="s1" class="ProseMirror" dir="rtl">${htmlWithoutSpace}</div>
            <div id="s2" class="ProseMirror" dir="rtl">${htmlWithTrailingSpace}</div>
            <div id="s3" class="ProseMirror" dir="rtl">${htmlAfterBackspace}</div>
            <div id="s4" class="ProseMirror" dir="rtl">${htmlEmptyPlusSpace}</div>
          </div>
        </body></html>`,
        { waitUntil: "load" },
      );
      await page.evaluate(() => document.fonts.ready);

      const heights = await page.evaluate(() => ({
        row0BeforeSpace: document.querySelector("#s1 table tr:nth-child(1)")!.getBoundingClientRect().height,
        row0AfterSpace: document.querySelector("#s2 table tr:nth-child(1)")!.getBoundingClientRect().height,
        row0AfterBackspace: document.querySelector("#s3 table tr:nth-child(1)")!.getBoundingClientRect().height,
        row1BeforeSpace: document.querySelector("#s1 table tr:nth-child(2)")!.getBoundingClientRect().height,
        row1AfterSpace: document.querySelector("#s4 table tr:nth-child(2)")!.getBoundingClientRect().height,
      }));

      expect(heights.row0AfterSpace).toBe(heights.row0BeforeSpace);
      expect(heights.row0AfterBackspace).toBe(heights.row0BeforeSpace);
      expect(heights.row1AfterSpace).toBe(heights.row1BeforeSpace);
    } finally {
      await browser.close();
      editor.destroy();
    }
  }, 30000);

  it("4. shows col-resize cursor across ±5px grab zone on all column lines (including both outer lines) without stealing normal clicks inside cells", () => {
    const editor = new Editor({
      extensions: [
        ...createDocumentStudioExtensions(),
        QalamTableStableDirection,
        QalamTableFormatAttributes,
        QalamTableColumnResizing,
      ],
      content: createUrduTableDoc([["اردو متن", "پاکستان", "لاہور"]], null, null),
    });
    document.body.appendChild(editor.view.dom);

    const table = editor.view.dom.querySelector("table.qalam-document-table") as HTMLTableElement;
    table.style.direction = "rtl";
    const row = table.rows[0];
    const [td0, td1, td2] = Array.from(row.cells);

    const rectOf = (left: number, right: number) =>
      ({ left, right, top: 20, bottom: 80, width: right - left, height: 60, x: left, y: 20, toJSON: () => {} }) as DOMRect;
    table.getBoundingClientRect = () => rectOf(100, 550);
    row.getBoundingClientRect = () => rectOf(100, 550);
    td0.getBoundingClientRect = () => rectOf(400, 550); // col 0 (RTL right): 400..550
    td1.getBoundingClientRect = () => rectOf(250, 400); // col 1: 250..400
    td2.getBoundingClientRect = () => rectOf(100, 250); // col 2 (RTL left): 100..250

    // Grab zone is ±5px on all 4 lines (550, 400, 250, 100), including outside both outer edges (555 and 95)
    expect(getHandle({ target: editor.view.dom, clientX: 554, clientY: 50 } as any)?.lineIndex).toBe(0);
    expect(getHandle({ target: editor.view.dom, clientX: 545, clientY: 50 } as any)?.lineIndex).toBe(0);
    expect(getHandle({ target: td0, clientX: 405, clientY: 50 } as any)?.lineIndex).toBe(1);
    expect(getHandle({ target: td1, clientX: 395, clientY: 50 } as any)?.lineIndex).toBe(1);
    expect(getHandle({ target: td1, clientX: 255, clientY: 50 } as any)?.lineIndex).toBe(2);
    expect(getHandle({ target: td2, clientX: 245, clientY: 50 } as any)?.lineIndex).toBe(2);
    expect(getHandle({ target: td2, clientX: 105, clientY: 50 } as any)?.lineIndex).toBe(3);
    expect(getHandle({ target: editor.view.dom, clientX: 96, clientY: 50 } as any)?.lineIndex).toBe(3);

    // 6..8px inside cell text must NOT be captured by resize handle
    expect(getHandle({ target: td0, clientX: 543, clientY: 50 } as any)).toBeNull();
    expect(getHandle({ target: td0, clientX: 407, clientY: 50 } as any)).toBeNull();
    expect(getHandle({ target: td2, clientX: 107, clientY: 50 } as any)).toBeNull();

    // Hovering outside table on ProseMirror margin over outer-right (+4px) and outer-left (-4px) sets col-resize on view.dom AND table
    editor.view.dom.dispatchEvent(new PointerEvent("pointermove", { clientX: 554, clientY: 50, bubbles: true }));
    expect(editor.view.dom.dataset.tableResizeHover).toBe("true");
    expect(editor.view.dom.style.cursor).toBe("col-resize");
    expect(table.dataset.tableResizeHover).toBe("true");

    editor.view.dom.dispatchEvent(new PointerEvent("pointermove", { clientX: 96, clientY: 50, bubbles: true }));
    expect(editor.view.dom.dataset.tableResizeHover).toBe("true");
    expect(editor.view.dom.style.cursor).toBe("col-resize");

    // Moving into cell interior clears col-resize cursor
    td1.dispatchEvent(new PointerEvent("pointermove", { clientX: 325, clientY: 50, bubbles: true }));
    expect(editor.view.dom.dataset.tableResizeHover).toBeUndefined();
    expect(editor.view.dom.style.cursor).toBe("");

    // Stationary click near border (dx = 0) must NOT convert Auto colwidth (null) into fixed px
    td0.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 402, clientY: 50, bubbles: true }));
    document.dispatchEvent(new PointerEvent("pointerup", { button: 0, clientX: 402, clientY: 50, bubbles: true }));
    const autoCell = (editor.getJSON() as any).content[0].content[0].content[0];
    expect(autoCell.attrs.colwidth).toBeNull();

    editor.view.dom.remove();
    editor.destroy();
  });

  it("5. handles Ctrl+A (AllSelection) before Table Format without freezing or throwing and applies to the whole table", () => {
    const hasTableForFormat = (tableFormatModule as Record<string, unknown>).hasTableForFormat as
      | ((ed: Editor) => boolean)
      | undefined;
    expect(typeof hasTableForFormat).toBe("function");

    // Case A: Document with Urdu paragraphs + 3x3 Urdu table + AllSelection (Ctrl+A)
    const docWithStoryAndTable = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "اردو متن کا آغاز" }] },
        createUrduTableDoc(
          [
            ["اردو متن", "پاکستان", "لاہور"],
            ["کراچی", "ملتان", "کوئٹہ"],
          ],
          [150, 150, 150],
          450,
        ).content[0],
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "پاکستان زندہ باد" }] },
      ],
    };
    const editor = new Editor({
      extensions: [
        ...createDocumentStudioExtensions(),
        QalamTableStableDirection,
        QalamTableFormatAttributes,
      ],
      content: docWithStoryAndTable,
    });

    // Simulate Ctrl+A -> AllSelection
    editor.commands.selectAll();
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    expect(hasTableForFormat!(editor)).toBe(true);

    const initialJson = editor.getJSON();
    const values = getTableFormat(editor);
    expect(values.flow).toBe("rtl");

    expect(
      applyTableFormat(editor, {
        ...values,
        fill: "#ffff00",
        borderColor: "#0000ff",
        borderStyle: "solid",
        borderWidthPt: 1,
      }),
    ).toBe(true);

    const after = editor.getJSON() as any;
    // Surrounding Urdu story paragraphs stay untouched
    expect(after.content[0].content[0].text).toBe("اردو متن کا آغاز");
    expect(after.content[2].content[0].text).toBe("پاکستان زندہ باد");
    // Whole table (all 6 cells across both rows) received the format
    for (const row of after.content[1].content) {
      for (const cell of row.content) {
        expect(cell.attrs.tableFill).toBe("#ffff00");
        expect(cell.attrs.tableBorderColor).toBe("#0000ff");
        expect(cell.attrs.tableBorderStyle).toBe("solid");
        expect(cell.attrs.tableBorderWidthPt).toBe(1);
      }
    }

    // Single undo restores initial state
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialJson);
    editor.destroy();
  });

  it("6. keeps exact remaining column widths and RTL right edge when deleting any column, and preserves widths when inserting a column that fits", () => {
    const editor = new Editor({
      extensions: [
        ...createDocumentStudioExtensions(),
        QalamTableStableDirection,
        QalamTableFormatAttributes,
        QalamTableColumnResizing,
      ],
      content: createUrduTableDoc(
        [
          ["اردو متن", "پاکستان", "لاہور"],
          ["کراچی", "ملتان", "کوئٹہ"],
        ],
        [160, 140, 120],
        420,
        6,
      ),
    });

    const getCellPositions = () => {
      const positions: number[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "tableCell") positions.push(pos);
      });
      return positions;
    };
    const getWidthsAndTable = () => {
      const table = (editor.getJSON() as any).content[0];
      const widths = table.content[0].content.map((c: any) => c.attrs.colwidth?.[0]);
      return { widths, attrs: table.attrs };
    };

    // A) Place caret in leftmost RTL column (col 2, width 120px) and delete column
    editor.commands.setTextSelection(getCellPositions()[2] + 2);
    expect(tableLayoutCommand(editor, "column", "before", "delete")).toBe(true);

    const afterDeleteLast = getWidthsAndTable();
    expect(afterDeleteLast.widths).toEqual([160, 140]);
    expect(afterDeleteLast.attrs.tableFormatWidthPx).toBe(300);
    expect(afterDeleteLast.attrs.tableAlignment).toBe("right");
    expect(afterDeleteLast.attrs.tableIndentMm).toBe(6);

    // Single-step undo restores 3 columns [160, 140, 120] and total width 420
    expect(editor.commands.undo()).toBe(true);
    expect(getWidthsAndTable().widths).toEqual([160, 140, 120]);
    expect(getWidthsAndTable().attrs.tableFormatWidthPx).toBe(420);

    // B) Place caret in middle column (col 1, width 140px) and delete column
    editor.commands.setTextSelection(getCellPositions()[1] + 2);
    expect(tableLayoutCommand(editor, "column", "before", "delete")).toBe(true);
    expect(getWidthsAndTable().widths).toEqual([160, 120]);
    expect(getWidthsAndTable().attrs.tableFormatWidthPx).toBe(280);
    expect(editor.commands.undo()).toBe(true);

    // C) Insert column after middle column (col 1, width 140px) when it fits on page:
    // existing columns stay [160, 140, 120] unsqueezed -> [160, 140, 140, 120], total 560
    editor.commands.setTextSelection(getCellPositions()[1] + 2);
    expect(tableLayoutCommand(editor, "column", "after", "insert")).toBe(true);
    expect(getWidthsAndTable().widths).toEqual([160, 140, 140, 120]);
    expect(getWidthsAndTable().attrs.tableFormatWidthPx).toBe(560);
    expect(editor.commands.undo()).toBe(true);

    // D) Insert column when desired total exceeds printable container width (e.g. 500px):
    // squeezes proportionally to fit 500px without overflowing printable area
    Object.defineProperty(editor.view.dom, "clientWidth", { value: 500, configurable: true });
    editor.commands.setTextSelection(getCellPositions()[1] + 2);
    expect(tableLayoutCommand(editor, "column", "after", "insert")).toBe(true);
    const squeezed = getWidthsAndTable();
    expect(squeezed.widths).toHaveLength(4);
    expect(squeezed.widths.reduce((a: number, b: number) => a + b, 0)).toBeLessThanOrEqual(500);
    expect(squeezed.attrs.tableFormatWidthPx).toBeLessThanOrEqual(500);

    editor.destroy();

    // E) Auto-width RTL Urdu table (colwidth: null) whose DOM columns render at [230, 230, 230]:
    // deleting leftmost RTL column keeps [230, 230] and narrows table to 460px instead of widening to 345px each
    const autoEditor = new Editor({
      extensions: [
        ...createDocumentStudioExtensions(),
        QalamTableStableDirection,
        QalamTableFormatAttributes,
        QalamTableColumnResizing,
      ],
      content: createUrduTableDoc([["اردو متن", "پاکستان", "لاہور"]], null, null),
    });
    const autoTable = autoEditor.view.dom.querySelector("table.qalam-document-table") as HTMLTableElement;
    Array.from(autoTable.rows[0].cells).forEach((td) => {
      td.getBoundingClientRect = () =>
        ({ left: 0, right: 230, top: 0, bottom: 40, width: 230, height: 40, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    });
    const autoCells: number[] = [];
    autoEditor.state.doc.descendants((node, pos) => {
      if (node.type.name === "tableCell") autoCells.push(pos);
    });
    autoEditor.commands.setTextSelection(autoCells[2] + 2);
    expect(tableLayoutCommand(autoEditor, "column", "before", "delete")).toBe(true);
    const autoAfter = (autoEditor.getJSON() as any).content[0];
    expect(autoAfter.content[0].content.map((c: any) => c.attrs.colwidth?.[0])).toEqual([230, 230]);
    expect(autoAfter.attrs.tableFormatWidthPx).toBe(460);
    autoEditor.destroy();
  });
});
