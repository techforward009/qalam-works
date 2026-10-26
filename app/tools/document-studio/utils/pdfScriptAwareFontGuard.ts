import type { Page } from "puppeteer-core";
import cmapValues from "./digitalKhattCmap.json";
import naskhCmapValues from "./naskhCmap.json";
import { guardPdfUrduFonts } from "./pdfUrduFontGuard";

const SELECTOR = '[data-pdf-font="Digital Khatt Indo-Pak"]';
const digital = (name: string) => /digitalkhatt/i.test(name.replace(/[^a-z0-9]/gi, ""));
const naskh = (name: string) => /notonaskharabic/i.test(name.replace(/[^a-z0-9]/gi, ""));
const cp = (n: number) => "U+" + n.toString(16).toUpperCase().padStart(4, "0");
export interface PdfFontDiagnostic {
  root: number;
  part: number;
  kind: string;
  codepoints: string[];
  actualFaces: { familyName: string; glyphCount: number }[];
  accepted: boolean;
}
/** Preserve Unicode and native shaping; permit only the editor's bundled Naskh
 * for graphemes the Digital Khatt cmap cannot cover. Verify actual painted faces.
 */
export async function guardScriptAwarePdfFonts(page: Page, expectedRuns: string[]) {
  const segmented = await page.evaluate(({ query, digitalValues, naskhValues }) => {
    const cmap = new Set(digitalValues), naskh = new Set(naskhValues);
    const roots = Array.from(document.querySelectorAll<HTMLElement>(query));
    for (const root of roots) {
      if (root.parentElement?.closest(query)) throw Error("Ambiguous nested Digital Khatt root; export blocked");
    }
    const records: { root: number; part: number; kind: string; text: string }[] = [];
    const originals: string[] = [];
    const unsupported = new Set<number>();
    const graphemes = new Intl.Segmenter("ar", { granularity: "grapheme" });
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
        const parts: { kind: string; text: string }[] = [];
        for (const { segment, index } of graphemes.segment(value)) {
          const verifiedPeriod = segment === "." && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]$/u.test(value.slice(0, index)) &&
            (index + 1 === value.length || /\s/u.test(value[index + 1]));
          let fallback = false;
          for (const char of segment) {
            const n = char.codePointAt(0)!;
            // Preserve the existing verified ASCII-period exception.
            if ([9, 10, 13].includes(n) || verifiedPeriod) continue;
            if (!cmap.has(n)) {
              if (naskh.has(n)) fallback = true;
              else unsupported.add(n);
            }
          }
          const kind = verifiedPeriod ? "verified-period" : fallback ? "naskh-fallback" : "protected";
          const previous = parts.at(-1);
          if (previous?.kind === kind && kind !== "verified-period") previous.text += segment;
          else parts.push({ kind, text: segment });
        }
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          const el = document.createElement("span");
          el.dataset.pdfSafePart = String(nextId++);
          el.dataset.pdfSafeKind = part.kind;
          el.textContent = part.text;
          if (part.kind === "verified-period") el.style.fontFamily = '"Liberation Serif"';
          // Keep the inherited Digital/Naskh stack on every inline fragment:
          // do not force a combining mark into a detached glyph/font run.
          frag.appendChild(el);
        }
        node.replaceWith(frag);
      }
      if ((root.textContent ?? "") !== before) throw Error("PDF Unicode modified during segmentation; export blocked");
      root.querySelectorAll<HTMLElement>("[data-pdf-safe-part]").forEach((el, part) => records.push({
        root: rootIndex, part, kind: el.dataset.pdfSafeKind ?? "", text: el.textContent ?? "",
      }));
    });
    return { originals, records, unsupported: [...unsupported].sort((a, b) => a - b) };
  }, { query: SELECTOR, digitalValues: cmapValues, naskhValues: naskhCmapValues });
  if (segmented.originals.length !== expectedRuns.length ||
      segmented.originals.some((text, index) => text !== expectedRuns[index])) {
    throw Error("Digital Khatt source/HTML/Chromium codepoints differ; export blocked");
  }
  if (segmented.unsupported.length) {
    throw Error("Unsupported by Digital Khatt and Noto Naskh Arabic: " + segmented.unsupported.map(cp).join(", ") + "; export blocked");
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
      const fallback = part.kind === "naskh-fallback";
      const invisible = /^[\s\p{Default_Ignorable_Code_Point}]*$/u.test(part.text);
      const accepted = part.kind === "verified-period"
        ? used.length === 1 && used[0].familyName === "Liberation Serif"
        : used.length === 0 ? invisible : fallback
        ? used.every(face => digital(face.familyName) || naskh(face.familyName)) && used.some(face => naskh(face.familyName))
        : used.every(face => digital(face.familyName));
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
  // The general Urdu-font policy remains responsible for non-Digital runs.
  await page.$$eval(SELECTOR, nodes => nodes.forEach(node => node.removeAttribute("data-pdf-urdu")));
  try {
    const old = await guardPdfUrduFonts(page);
    return { fallbackRuns: old.fallbackRuns,
      actualFamilies: [...new Set([...old.actualFamilies, ...diagnostics.flatMap(part => part.actualFaces.map(face => face.familyName))])],
      diagnostics };
  } finally {
    await page.$$eval("[data-pdf-safe-root]", nodes =>
      nodes.forEach(node => node.setAttribute("data-pdf-urdu", "true")));
  }
}
