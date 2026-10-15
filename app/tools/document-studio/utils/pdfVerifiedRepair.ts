import type { Browser } from "puppeteer-core";
import type { DocNode, Direction } from "./extractPlainText";
import type { DocumentStudioSettings } from "./documentSettings";
import { fontsForDocument } from "./pdfDocumentFonts";
import { buildPdfHtml } from "./buildPdfHtml";
import type { PdfExportProblem } from "./pdfExportDiagnostics";

/** Candidate evidence is sourced from Chromium's actual painted glyph families.
 * Never accept a theoretical cmap check, CSS declaration or document.fonts.check alone.
 */
export async function verifyPdfRepairCandidates(
  browser: Browser, doc: DocNode, issues: PdfExportProblem[],
  dir: Direction, typography: DocumentStudioSettings["typography"]
): Promise<void> {
  const distinct = new Map<string, PdfExportProblem[]>();
  for (const issue of issues) {
    if (!issue.source || issue.selectedFont !== "Digital Khatt Indo-Pak" ||
      !["UNSUPPORTED_GLYPH", "INVALID_CONTROL", "FONT_FALLBACK"].includes(issue.code)) continue;
    const key = issue.source.path.join(".");
    const bucket = distinct.get(key) ?? [];
    bucket.push(issue);
    distinct.set(key, bucket);
  }
  for (const bucket of [...distinct.values()].slice(0, 6)) {
    const path = bucket[0].source!.path;
    let node: DocNode | undefined = doc;
    for (const index of path) node = node?.content?.[index];
    if (node?.type !== "text" || !node.text || node.text.length > 4000) continue;
    // Never recommend changing formatting to conceal an unverified joiner/control.
    if ([...node.text].some(ch => [0x200C,0x200D,0x061C,0x200E,0x200F].includes(ch.codePointAt(0)!))) continue;
    for (const candidate of ["Amiri", "Noto Naskh Arabic"]) {
      let page: Awaited<ReturnType<Browser["newPage"]>> | undefined;
      try {
        const sample: DocNode = {type:"doc",content:[{type:"paragraph",attrs:{dir:"rtl"},content:[
          {type:"text",text:node.text,marks:[{type:"textStyle",attrs:{fontFamily:candidate}}]}
        ]}]};
        const loaded = await fontsForDocument(sample,dir,typography);
        if (!loaded.fonts.faces.some(face => face.familyName === candidate && face.complete)) continue;
        const {html} = buildPdfHtml(sample,dir,loaded.fonts,typography);
        page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on("request", req => req.url().startsWith("data:") ? req.continue() : req.abort());
        await page.setContent(html, {waitUntil:"load"});
        await page.evaluate(async () => { await document.fonts.ready; });
        const session = await page.createCDPSession();
        try {
          await session.send("DOM.enable"); await session.send("CSS.enable");
          const root = (await session.send("DOM.getDocument")).root;
          const found = await session.send("DOM.querySelector",{nodeId:root.nodeId,selector: candidate === "Amiri" ? "span.qf-amiri" : "span.qf-noto-naskh"});
          if (!found.nodeId) continue;
          const {fonts} = await session.send("CSS.getPlatformFontsForNode",{nodeId:found.nodeId});
          const painted = fonts.filter(face => face.glyphCount > 0);
          const visible = await page.evaluate(selector => {
            const el = document.querySelector(selector);
            return !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
          },candidate === "Amiri" ? "span.qf-amiri" : "span.qf-noto-naskh");
          if (visible && painted.length === 1 && painted[0].familyName === candidate) {
            bucket.forEach(issue => { issue.verifiedReplacement = candidate; });
            break;
          }
        } finally { await session.detach(); }
      } catch {
        // A candidate is never advertised without affirmative Chromium evidence.
      } finally {
        if (page) await page.close();
      }
    }
  }
}
