import { expect, test, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { NextRequest } from "next/server";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";

test("downloaded Digital Khatt ligatures and punctuation never embed Noto Naskh", async () => {
  const text = "لَا لا فِی فی قُلِ اللّٰھُمَّ ، لَا لا فِی قُلِ اللّٰھُمَّ۔ ".repeat(3);
  const doc = { type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [
    { type: "text", text, marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak", fontSize: "24pt" } }] },
  ] }] };
  let pdfLines: string[] = [];
  const launch = puppeteer.launch.bind(puppeteer);
  const spy = vi.spyOn(puppeteer, "launch").mockImplementation(async options => {
    const browser = await launch(options), newPage = browser.newPage.bind(browser);
    vi.spyOn(browser, "newPage").mockImplementation(async () => {
      const page = await newPage(), print = page.pdf.bind(page);
      vi.spyOn(page, "pdf").mockImplementation(async options => {
        pdfLines = await page.$$eval("[data-pdf-ink-line]", lines => lines.map(line => line.textContent ?? ""));
        return print(options);
      });
      return page;
    });
    return browser;
  });
  const response = await POST(new NextRequest("http://localhost/api/export-pdf", {
    method: "POST", body: JSON.stringify({ doc, dir: "rtl", settings: defaultDocumentSettings() }),
  })).finally(() => spy.mockRestore());
  expect(response.status, response.status === 200 ? "PDF exported" : await response.text()).toBe(200);
  const dir = mkdtempSync(join(tmpdir(), "qalam-dk-export-")), pdf = join(dir, "download.pdf");
  writeFileSync(pdf, Buffer.from(await response.arrayBuffer()));
  writeFileSync(join(dir, "source.json"), JSON.stringify({ doc, dir: "rtl", settings: defaultDocumentSettings(), pdfLines }));
  console.info("Digital Khatt export evidence:", dir);
  const fonts = execFileSync("pdffonts", [pdf], { encoding: "utf8" });
  expect(fonts).toMatch(/DigitalKhattIndoPakQalam-Regular/);
  expect(fonts).not.toMatch(/NotoNaskh/i);
  // Recorded from the unchanged editor at 24pt, A4 / 25.4mm margins.
  // Preserve both wrap positions, not just the number of lines.
  expect(pdfLines.map(line => line.trim())).toEqual([
    "لَا لا فِی فی قُلِ اللّٰھُمَّ ، لَا لا فِی قُلِ اللّٰھُمَّ۔ لَا لا فِی فی قُلِ اللّٰھُمَّ ،",
    "لَا لا فِی قُلِ اللّٰھُمَّ۔ لَا لا فِی فی قُلِ اللّٰھُمَّ ، لَا لا فِی قُلِ اللّٰھُمَّ۔",
  ]);
}, 60000);
