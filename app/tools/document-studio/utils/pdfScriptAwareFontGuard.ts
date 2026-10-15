import type { Page } from "puppeteer-core";
import cmapValues from "./digitalKhattCmap.json";
import { guardPdfUrduFonts } from "./pdfUrduFontGuard";

const cmap = new Set<number>(cmapValues);
const SELECTOR = '[data-pdf-font="Digital Khatt Indo-Pak"][data-pdf-urdu="true"]';
const digital = (name: string) => /digitalkhatt/i.test(name.replace(/[^a-z0-9]/gi, ""));
const arabic = (n: number) =>
  (n >= 0x600 && n <= 0x6ff) || (n >= 0x750 && n <= 0x77f) ||
  (n >= 0x8a0 && n <= 0x8ff) || (n >= 0xfb50 && n <= 0xfdff) ||
  (n >= 0xfe70 && n <= 0xfeff) || (n >= 0x10e60 && n <= 0x10e7f) ||
  (n >= 0x1ee00 && n <= 0x1eeff);
const cp = (n: number) => "U+" + n.toString(16).toUpperCase().padStart(4, "0");
export interface PdfFontDiagnostic {
  root: number;
  part: number;
  kind: string;
  codepoints: string[];
  actualFaces: { familyName: string; glyphCount: number }[];
  accepted: boolean;
}
/** Strict painted-font guard for all marked Digital Khatt runs.
 * Never imported by DOCX, editor, or browser Print paths.
 * Explicit contextual U+002E exception, never a blanket punctuation fallback.
 */
export async function guardScriptAwarePdfFonts(page: Page, expectedRuns: string[]) {
  const segmented = await page.evaluate((query) => {
    const roots = Array.from(document.querySelectorAll<HTMLElement>(query));
    for (const root of roots) {
      if (root.parentElement?.closest(query)) throw Error("Ambiguous nested Digital Khatt root; export blocked");
    }
    const records: { root: number; part: number; kind: string; text: string }[] = [];
    const originals: string[] = [];
    roots.forEach((root, rootIndex) => {
      root.dataset.pdfSafeRoot = String(rootIndex);
      const before = root.textContent ?? "";
      originals.push(before);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      let nextId = 0;
      for (const node of nodes) {
        const value = node.nodeValue ?? "";
        if (!value) continue;
        const frag = document.createDocumentFragment();
        let cursor = 0;
        for (const match of value.matchAll(/\./g)) {
          const i = match.index;
          if (i > cursor) {
            const el = document.createElement("span");
            el.dataset.pdfSafePart = String(nextId++);
            el.dataset.pdfSafeKind = "protected";
            el.textContent = value.slice(cursor, i);
            frag.appendChild(el);
          }
          const preceding = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]$/u.test(value.slice(0, i));
          const next = value.slice(i + 1, i + 2);
          const verified = preceding && (!next || /\s/u.test(next));
          const el = document.createElement("span");
          el.dataset.pdfSafePart = String(nextId++);
          el.dataset.pdfSafeKind = verified ? "verified-period" : "unverified-period";
          el.textContent = ".";
          if (verified) el.style.fontFamily = '"Liberation Serif"';
          frag.appendChild(el);
          cursor = i + 1;
        }
        if (cursor < value.length) {
          const el = document.createElement("span");
          el.dataset.pdfSafePart = String(nextId++);
          el.dataset.pdfSafeKind = "protected";
          el.textContent = value.slice(cursor);
          frag.appendChild(el);
        }
        node.replaceWith(frag);
      }
      if ((root.textContent ?? "") !== before) throw Error("PDF Unicode modified during segmentation; export blocked");
      root.querySelectorAll<HTMLElement>("[data-pdf-safe-part]").forEach((el, part) => records.push({
        root: rootIndex, part, kind: el.dataset.pdfSafeKind ?? "", text: el.textContent ?? "",
      }));
    });
    return { originals, records };
  }, SELECTOR);
  if (segmented.originals.length !== expectedRuns.length ||
      segmented.originals.some((text, index) => text !== expectedRuns[index])) {
    throw Error("Digital Khatt source/HTML/Chromium codepoints differ; export blocked");
  }
  for (const part of segmented.records) {
    if (part.kind === "unverified-period") throw Error("Unverified U+002E context; export blocked");
    for (const ch of part.text) {
      const n = ch.codePointAt(0)!;
      if (arabic(n) && !cmap.has(n)) {
        throw Error("Unsupported protected Arabic/Quranic " + cp(n) + " at run " + part.root + ":" + part.part + "; export blocked");
      }
      if ([0x200c, 0x200d, 0x061c, 0x200e, 0x200f].includes(n)) {
        throw Error("Unverified Arabic joining/bidi control " + cp(n) + "; export blocked");
      }
    }
  }
  const diagnostics: PdfFontDiagnostic[] = [];
  const session = await page.createCDPSession();
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    for (const part of segmented.records) {
      const query = '[data-pdf-safe-root="' + part.root + '"] [data-pdf-safe-part="' + part.part + '"]';
      const documentNode = (await session.send("DOM.getDocument")).root;
      const { nodeId } = await session.send("DOM.querySelector", { nodeId: documentNode.nodeId, selector: query });
      if (!nodeId) throw Error("Missing protected Digital Khatt glyph node " + query + "; export blocked");
      let { fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      if (!fonts.some(face => face.glyphCount > 0) && part.text.trim()) {
        await page.evaluate(async selector => {
          const el = document.querySelector<HTMLElement>(selector);
          if (!el) throw Error("Missing protected font node; export blocked");
          el.scrollIntoView({ block: "center", inline: "nearest" });
          el.getBoundingClientRect();
          await document.fonts.ready;
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        }, query);
        ({ fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId }));
      }
      const used = fonts.filter(face => face.glyphCount > 0);
      const accepted = part.kind === "verified-period" && part.text === "."
        ? used.length === 1 && used[0].familyName === "Liberation Serif"
        : part.kind === "protected" &&
          ((used.length === 0 && !part.text.trim()) || (used.length > 0 && used.every(face => digital(face.familyName))));
      diagnostics.push({ root: part.root, part: part.part, kind: part.kind,
        codepoints: [...new Set(Array.from(part.text, ch => cp(ch.codePointAt(0)!)))],
        actualFaces: used.map(face => ({ familyName: face.familyName, glyphCount: face.glyphCount })),
        accepted });
      if (!accepted) throw Error("Unexpected glyph fallback at run " + part.root + ":" + part.part +
        "; faces=" + used.map(face => face.familyName).join(",") + "; export blocked");
    }
  } finally {
    await session.detach();
  }
  // Existing Urdu fallback policy is untouched for every non-Digital run.
  await page.$$eval(SELECTOR, nodes => nodes.forEach(node => node.removeAttribute("data-pdf-urdu")));
  try {
    const old = await guardPdfUrduFonts(page);
    return { fallbackRuns: old.fallbackRuns,
      actualFamilies: [...new Set([...old.actualFamilies, ...(segmented.originals.length ? ["DigitalKhatt IndoPak"] : [])])],
      diagnostics };
  } finally {
    await page.$$eval("[data-pdf-safe-root]", nodes =>
      nodes.forEach(node => node.setAttribute("data-pdf-urdu", "true")));
  }
}
