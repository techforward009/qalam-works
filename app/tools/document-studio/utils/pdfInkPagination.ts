import type { Page } from "puppeteer-core";

export interface InkLine {
  block: number; heading: boolean; baseline: number; offset: number;
  frameTop: number; frameBottom: number; frameLeft: number; frameRight: number;
  inkTop: number; inkBottom: number; inkLeft: number; inkRight: number;
  metricTop: number; metricBottom: number;
  boxTop?: number; boxBottom?: number;
  horizontalShift?: number;
  blank?: boolean;
  text?: string;
}
export interface InkPlacement { page: number; baseline: number }
export const PDF_MEASUREMENT_LIMITS = { visualLines: 300, stagingHeight: 40_000 } as const;

export function assertPdfMeasurementLimits(visualLines: number, stagingHeight: number): void {
  if (visualLines > PDF_MEASUREMENT_LIMITS.visualLines) throw new Error(`PDF measurement exceeds the supported ${PDF_MEASUREMENT_LIMITS.visualLines} visual-line limit; export blocked`);
  if (stagingHeight > PDF_MEASUREMENT_LIMITS.stagingHeight) throw new Error(`PDF measurement exceeds the supported ${PDF_MEASUREMENT_LIMITS.stagingHeight}px staging limit; export blocked`);
}

/** Keep baseline distances unchanged within a page; break only between whole ink extents. */
export function placeInkLines(lines: InkLine[], height: number): InkPlacement[] {
  const edgeGuard = 1;
  let page = 0, shift = 0;
  return lines.map((line, index) => {
    const relativeTop = Math.min(line.inkTop, line.boxTop ?? line.inkTop);
    const relativeBottom = Math.max(line.inkBottom, line.boxBottom ?? line.inkBottom);
    const top = line.baseline + relativeTop, bottom = line.baseline + relativeBottom;
    if (relativeBottom - relativeTop > height - edgeGuard * 2) throw new Error("PDF visual line is taller than the configured printable page; export blocked");
    if (index === 0 && top < edgeGuard) shift = edgeGuard - top;
    let end = index;
    while (end + 1 < lines.length && lines[end + 1].block === line.block) end++;
    if (line.heading && end + 1 < lines.length) end++;
    const groupBottom = lines[end].baseline + Math.max(lines[end].inkBottom, lines[end].boxBottom ?? lines[end].inkBottom);
    const keep = (index === 0 || lines[index - 1].block !== line.block) && groupBottom - top <= height / 3;
    if (index > 0 && (bottom + shift > height - edgeGuard || (keep && groupBottom + shift > height - edgeGuard))) { page++; shift = -top + edgeGuard; }
    return { page, baseline: line.baseline + shift };
  });
}

/** Runs in Chromium. Clone the already wrapped lines, retaining their inline ancestors. */
export async function collectInkLines(limits = { visualLines: 300, stagingHeight: 40_000 }): Promise<InkLine[]> {
  await document.fonts.ready;
  const context = document.createElement("canvas").getContext("2d")!;
  const textNodes = (root: Node): Text[] => {
    const result: Text[] = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) result.push(node as Text);
    return result;
  };
  const baseline = (node: Text, start: number, end: number) => {
    const style = getComputedStyle(node.parentElement!);
    context.font = style.font;
    context.direction = style.direction as CanvasDirection;
    const range = document.createRange(); range.setStart(node, start); range.setEnd(node, end);
    return range.getBoundingClientRect().top + context.measureText(node.data.slice(start, end)).fontBoundingBoxAscent;
  };
  const blockSelector = "p,h1,h2,h3,h4,li";
  const documentText = (root: Node) => textNodes(root)
    .filter(node => Boolean(node.parentElement?.closest(blockSelector)))
    .map(node => node.data)
    .join("");
  const snapshots: Array<{ element: HTMLElement; baseline: number; block: number; heading: boolean; left: number; width: number; fontHeight: number; inkAscent: number; inkDescent: number; blank?: boolean }> = [];
  const origin = document.body.getBoundingClientRect();
  const quotes = Array.from(document.querySelectorAll("blockquote"));
  const sourceLists = Array.from(document.querySelectorAll<HTMLElement>("ul,ol"));
  const sourceListItems = Array.from(document.querySelectorAll<HTMLElement>("li"));
  const originalText = documentText(document.body);
  for (const [blockIndex, block] of Array.from(document.querySelectorAll<HTMLElement>(blockSelector)).entries()) {
    const nodes = textNodes(block).filter(node => node.parentElement!.closest(blockSelector) === block);
    const rect = block.getBoundingClientRect(), style = getComputedStyle(block);
    const source = block.cloneNode(true) as HTMLElement;
    const listPath: Array<{ list: number; item: number; tag: "UL" | "OL"; start: number; value: number }> = [];
    let ancestor: HTMLElement | null = block.tagName === "LI" ? block : block.parentElement;
    while (ancestor) {
      if (ancestor.tagName === "LI") {
        const list = ancestor.parentElement;
        if (list && (list.tagName === "UL" || list.tagName === "OL")) {
          const siblings = Array.from(list.children).filter(child => child.tagName === "LI");
          const start = Number(list.getAttribute("start") ?? 1);
          listPath.unshift({ list: sourceLists.indexOf(list), item: sourceListItems.indexOf(ancestor), tag: list.tagName as "UL" | "OL", start, value: Number(ancestor.getAttribute("value") ?? start + siblings.indexOf(ancestor)) });
        }
      }
      ancestor = ancestor.parentElement;
    }
    if (listPath.length) source.dataset.pdfListPath = JSON.stringify(listPath);
    // Child blocks are captured in their own source order. Removing them from
    // this clone prevents a parent list item from duplicating or reordering
    // nested lists and later paragraphs.
    source.querySelectorAll(blockSelector).forEach(child => child.remove());
    if (!nodes.some(node => node.data.trim())) {
      context.font = style.font;
      const metric = context.measureText(" ");
      const lineHeight = parseFloat(style.lineHeight) || rect.height || metric.fontBoundingBoxAscent + metric.fontBoundingBoxDescent;
      source.replaceChildren();
      source.dataset.pdfBlankParagraph = "true";
      source.append(document.createElement("br"));
      source.querySelector("br")!.dataset.pdfPreservedBreak = "blank-paragraph";
      source.style.cssText += `;position:absolute;display:block;margin:0;padding:0;border:0;width:${rect.width}px;height:${lineHeight}px;white-space:nowrap;`;
      snapshots.push({ element: source, baseline: rect.top + metric.fontBoundingBoxAscent, block: blockIndex, heading: false, left: rect.left - origin.left, width: rect.width, fontHeight: lineHeight, inkAscent: 0, inkDescent: 0, blank: true });
      continue;
    }
    const groups: Array<{ start: number; end: number; baseline: number }> = [];
    let offset = 0, fontHeight = 0, inkAscent = 0, inkDescent = 0;
    let pendingWhitespaceStart: number | null = null;
    for (const node of nodes) {
      const runStyle = getComputedStyle(node.parentElement!);
      context.font = runStyle.font;
      context.direction = runStyle.direction as CanvasDirection;
      const font = context.measureText(node.data);
      fontHeight = Math.max(fontHeight, font.fontBoundingBoxAscent + font.fontBoundingBoxDescent);
      inkAscent = Math.max(inkAscent, font.actualBoundingBoxAscent);
      inkDescent = Math.max(inkDescent, font.actualBoundingBoxDescent);
      for (let i = 0; i < node.length;) {
        const next = i + ((node.data.codePointAt(i) ?? 0) > 0xffff ? 2 : 1), y = baseline(node, i, next);
        if (/^\s$/u.test(node.data.slice(i, next))) {
          const previous = groups.at(-1);
          if (previous) previous.end = offset + next;
          else if (pendingWhitespaceStart === null) pendingWhitespaceStart = offset + i;
          i = next;
          continue;
        }
        const group = groups.at(-1);
        if (!group || Math.abs(group.baseline - y) > 1) {
          groups.push({ start: pendingWhitespaceStart ?? offset + i, end: offset + next, baseline: y });
          pendingWhitespaceStart = null;
        }
        else group.end = offset + next;
        i = next;
      }
      offset += node.length;
    }
    for (const [index, group] of groups.entries()) {
      const element = source.cloneNode(true) as HTMLElement, cloned = textNodes(element);
      const locate = (position: number): [Text, number] => {
        for (const node of cloned) { if (position <= node.length) return [node, position]; position -= node.length; }
        return [cloned[cloned.length - 1], cloned[cloned.length - 1].length];
      };
      const [endNode, endOffset] = locate(group.end);
      const after = document.createRange(); after.selectNodeContents(element); after.setStart(endNode, endOffset); after.deleteContents();
      const [startNode, startOffset] = locate(group.start);
      const before = document.createRange(); before.selectNodeContents(element); before.setEnd(startNode, startOffset); before.deleteContents();
      element.querySelectorAll("br").forEach(br => {
        const marker = document.createElement("span");
        marker.dataset.pdfPreservedBreak = "hard-break";
        marker.style.display = "none";
        br.replaceWith(marker);
      });
      for (const property of ["font-family", "font-size", "font-weight", "font-style", "line-height", "color", "direction", "text-align", "letter-spacing", "word-spacing", "text-decoration"]) element.style.setProperty(property, style.getPropertyValue(property));
      element.style.cssText += `;position:absolute;display:block;margin:0;padding:0;border:0;width:${rect.width}px;white-space:nowrap;`;
      element.style.textIndent = index === 0 ? style.textIndent : "0px";
      if (style.textAlign === "justify" && index < groups.length - 1) element.style.textAlignLast = "justify";
      const quote = block.closest("blockquote");
      if (quote) {
        const q = quote.getBoundingClientRect(), qs = getComputedStyle(quote);
        element.dataset.pdfQuote = JSON.stringify({ id: quotes.indexOf(quote), left: q.left - origin.left, width: q.width, top: q.top, bottom: q.bottom, border: qs.borderInlineStart, direction: qs.direction });
      }
      const listItem = block.tagName === "LI" ? block : block.closest("li");
      const firstListBlock = listItem === block || listItem?.querySelector(blockSelector) === block;
      if (listItem && firstListBlock) {
        element.style.display = index === 0 ? "list-item" : "block";
        const listStyle = getComputedStyle(listItem).listStyleType;
        element.style.listStyleType = listStyle;
        const list = listItem.parentElement;
        if (list?.tagName === "OL") element.setAttribute("value", String(Number(list.getAttribute("start") ?? 1) + Array.from(list.children).indexOf(listItem)));
      }
      snapshots.push({ element, baseline: group.baseline, block: blockIndex, heading: /^H[1-4]$/.test(block.tagName), left: rect.left - origin.left, width: rect.width, fontHeight, inkAscent, inkDescent });
    }
  }
  const stage = document.createElement("div"); stage.dataset.pdfInkStage = "true";
  // Leave measured horizontal bleed visible to the screenshot. The body keeps
  // its printable width; only the off-page measurement canvas is wider.
  const horizontalOverscan = 64;
  stage.dataset.pdfInkHorizontalOverscan = String(horizontalOverscan);
  // Use a layout offset. A relative `left` moves the stage's painted box but
  // leaves the coordinate system of its absolutely positioned children at
  // the unshifted containing-block origin, understating their ink x bounds.
  stage.style.cssText = `position:relative;margin-left:${horizontalOverscan}px;display:flow-root;width:${origin.width + horizontalOverscan * 2}px;`;
  document.body.replaceChildren(stage);
  stage.dataset.pdfInkHorizontalOffset = String(stage.getBoundingClientRect().left);
  const lines: InkLine[] = []; let cursor = 0;
  const measurementGap = 64;
  const maxVisualLines = limits.visualLines, maxStagingHeight = limits.stagingHeight;
  for (const [index, item] of snapshots.entries()) {
    if (index >= maxVisualLines) throw new Error(`PDF measurement exceeds the supported ${maxVisualLines} visual-line limit; export blocked`);
    const element = item.element; element.dataset.pdfInkLine = String(index);
    element.dataset.pdfSourceBlock = String(item.block);
    // Move the complete line inward while rasterizing. Chromium clips glyph
    // overhang when a shaped run is painted directly on a layout boundary,
    // even if the surrounding screenshot viewport has spare pixels.
    element.style.left = `${item.left + horizontalOverscan}px`; element.style.top = `${cursor + item.fontHeight}px`; stage.append(element);
    const first = textNodes(element).find(node => node.length);
    const measuredBaseline = first ? baseline(first, 0, (first.data.codePointAt(0) ?? 0) > 0xffff ? 2 : 1) : parseFloat(element.style.top) + item.fontHeight;
    const elementBounds = element.getBoundingClientRect();
    const frameBottom = Math.ceil(Math.max(measuredBaseline + item.fontHeight, elementBounds.bottom));
    lines.push({ block: item.block, heading: item.heading, baseline: item.baseline, offset: measuredBaseline - parseFloat(element.style.top), frameTop: cursor, frameBottom, frameLeft: item.left, frameRight: item.left + item.width, inkTop: 0, inkBottom: 0, inkLeft: Infinity, inkRight: -Infinity, metricTop: measuredBaseline - item.inkAscent, metricBottom: measuredBaseline + item.inkDescent, boxTop: elementBounds.top - measuredBaseline, boxBottom: elementBounds.bottom - measuredBaseline, blank: item.blank, text: element.textContent ?? "" });
    element.dataset.pdfMeasureBaseline = String(measuredBaseline); cursor = frameBottom + Math.max(measurementGap, Math.ceil(item.fontHeight));
    if (cursor > maxStagingHeight) throw new Error(`PDF measurement exceeds the supported ${maxStagingHeight}px staging limit; export blocked`);
  }
  stage.style.height = `${cursor}px`;
  if (documentText(stage) !== originalText) {
    const actual = documentText(stage);
    const mismatch = [...originalText].findIndex((char, index) => char !== actual[index]);
    throw new Error(`PDF line capture changed document text order, punctuation, or whitespace; export blocked (${originalText.length}/${actual.length}, mismatch ${mismatch})`);
  }
  const measurement = document.createElement("style"); measurement.id = "pdf-ink-measure-style";
  measurement.textContent = "body{background:white!important}[data-pdf-ink-stage] *{color:black!important;background:transparent!important;border-color:transparent!important;text-shadow:none!important}[data-pdf-ink-stage] [style*=background]{background:black!important}";
  document.head.append(measurement); return lines;
}

export async function paginatePdfInk(page: Page, widthMm: number, heightMm: number): Promise<{ lines: number; pages: number; stagingHeight: number; screenshots: number; measurementMs: number }> {
  const measurementStarted = Date.now();
  const width = widthMm * 96 / 25.4, height = heightMm * 96 / 25.4;
  const horizontalOverscan = 64;
  await page.setViewport({ width: Math.ceil(width) + horizontalOverscan * 4, height: 900, deviceScaleFactor: 2 });
  await page.emulateMediaType("print");
  await page.evaluate(({ w, overscan }) => {
    // Fix only the CSS wrapping viewport. Glyph overhang is measured later on
    // the wider staging surface and must not narrow unrelated blocks.
    document.body.style.width = `${w}px`;
    document.body.style.marginLeft = "0px";
    document.body.dataset.pdfInkHorizontalOverscan = String(overscan);
    // Reserve only the loaded face's measured terminal overhang inside each
    // source block. This can rewrap that block, but cannot narrow neighbors.
    const canvas = document.createElement("canvas").getContext("2d")!;
    const blockSelector = "p,h1,h2,h3,h4,li";
    for (const block of document.querySelectorAll<HTMLElement>(blockSelector)) {
      let leftInset = 0, rightInset = 0;
      let needsEmergencyWrap = false;
      const blockWidth = block.getBoundingClientRect().width;
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement, text = node.nodeValue ?? "";
        if (!parent || !text.trim() || parent.closest(blockSelector) !== block) continue;
        const style = getComputedStyle(parent);
        canvas.font = style.font;
        canvas.direction = style.direction as CanvasDirection;
        canvas.textAlign = "start";
        for (const sample of text.split(/\s+/u).filter(Boolean)) {
          const metric = canvas.measureText(sample);
          if (canvas.direction === "rtl") {
            leftInset = Math.max(leftInset, Math.ceil(metric.actualBoundingBoxLeft - metric.width) + 1);
            rightInset = Math.max(rightInset, Math.ceil(metric.actualBoundingBoxRight) + 1);
          } else {
            leftInset = Math.max(leftInset, Math.ceil(metric.actualBoundingBoxLeft) + 1);
            rightInset = Math.max(rightInset, Math.ceil(metric.actualBoundingBoxRight - metric.width) + 1);
          }
          const inkSpan = canvas.direction === "rtl"
            ? metric.actualBoundingBoxLeft + metric.actualBoundingBoxRight
            : metric.actualBoundingBoxRight + metric.actualBoundingBoxLeft;
          if ([...sample].length <= 64 && inkSpan > blockWidth - 2) needsEmergencyWrap = true;
        }
      }
      if (leftInset || rightInset) {
        const style = getComputedStyle(block);
        block.style.boxSizing = "border-box";
        block.style.paddingLeft = `${parseFloat(style.paddingLeft) + leftInset}px`;
        block.style.paddingRight = `${parseFloat(style.paddingRight) + rightInset}px`;
        block.dataset.pdfLocalInkInsets = JSON.stringify({ left: leftInset, right: rightInset });
      }
      if (needsEmergencyWrap) {
        block.style.overflowWrap = "anywhere";
        block.dataset.pdfEmergencyWrap = "true";
      }
    }
  }, { w: width, overscan: horizontalOverscan });
  const lines = await page.evaluate(collectInkLines, PDF_MEASUREMENT_LIMITS), total = lines.at(-1)?.frameBottom ?? 0;
  const stageOffset = await page.$eval("[data-pdf-ink-stage]", element => Number((element as HTMLElement).dataset.pdfInkHorizontalOffset));
  // Non-finite numbers do not survive the browser's JSON result serialization.
  lines.forEach(line => { line.inkTop = Infinity; line.inkBottom = -Infinity; line.inkLeft = Infinity; line.inkRight = -Infinity; });
  let screenshotCount = 0;
  for (let top = 0; top < total; top += 1024) {
    screenshotCount++;
    const h = Math.min(1024, total - top);
    const png = Buffer.from(await page.screenshot({ type: "png", clip: { x: 0, y: top, width: Math.ceil(width) + horizontalOverscan * 4, height: h }, captureBeyondViewport: true })).toString("base64");
    const bands = await page.evaluate(async ({ png, top, h, lines }) => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data, scale = canvas.height / h;
      return lines.map(line => {
        let min: number | null = null, max: number | null = null;
        let left: number | null = null, right: number | null = null;
        for (let y = Math.max(0, Math.floor((line.frameTop - top) * scale)); y < Math.min(canvas.height, Math.ceil((line.frameBottom - top) * scale)); y++) {
          for (let x = 0; x < canvas.width; x++) {
            const at = (y * canvas.width + x) * 4;
            if (pixels[at] < 250 || pixels[at + 1] < 250 || pixels[at + 2] < 250) {
              min = Math.min(min ?? Infinity, top + y / scale);
              max = Math.max(max ?? -Infinity, top + (y + 1) / scale);
              left = Math.min(left ?? Infinity, x / scale);
              right = Math.max(right ?? -Infinity, (x + 1) / scale);
            }
          }
        }
        return { min, max, left, right };
      });
    }, { png, top, h, lines });
    bands.forEach((band, i) => {
      if (band.min !== null && band.max !== null) {
        lines[i].inkTop = Math.min(lines[i].inkTop, band.min);
        lines[i].inkBottom = Math.max(lines[i].inkBottom, band.max);
        lines[i].inkLeft = Math.min(lines[i].inkLeft, band.left! - stageOffset - horizontalOverscan);
        lines[i].inkRight = Math.max(lines[i].inkRight, band.right! - stageOffset - horizontalOverscan);
      }
    });
  }
  const baselines = await page.$$eval("[data-pdf-ink-line]", elements => elements.map(element => Number((element as HTMLElement).dataset.pdfMeasureBaseline)));
  lines.forEach((line, i) => {
    // Empty/transparent runs have no raster pixels. Their actual glyph outline
    // bounds, measured from the same loaded face, preserve the safety contract.
    if (!Number.isFinite(line.inkTop) || !Number.isFinite(line.inkBottom)) {
      line.inkTop = line.metricTop;
      line.inkBottom = line.metricBottom;
      line.inkLeft = line.frameLeft;
      line.inkRight = line.frameRight;
    }
    if (line.blank) {
      line.inkLeft = line.frameLeft;
      line.inkRight = line.frameLeft;
    }
    if (line.inkTop <= line.frameTop || line.inkBottom >= line.frameBottom) throw new Error(`PDF glyph ink could not be bounded safely for line ${i}: ${line.inkTop}..${line.inkBottom} in ${line.frameTop}..${line.frameBottom}; export blocked`);
    line.inkTop -= baselines[i]; line.inkBottom -= baselines[i];
    const edgeGuard = 1;
    if (line.inkRight - line.inkLeft > width - edgeGuard * 2) throw new Error(`PDF glyph ink cannot fit the printable horizontal boundary for line ${i} (${JSON.stringify(line.text)}): ${line.inkLeft}..${line.inkRight} in 0..${width}; export blocked`);
    line.horizontalShift = line.inkRight > width - edgeGuard
      ? width - edgeGuard - line.inkRight
      : line.inkLeft < edgeGuard ? edgeGuard - line.inkLeft : 0;
    if (line.inkLeft + line.horizontalShift < edgeGuard || line.inkRight + line.horizontalShift > width - edgeGuard) {
      throw new Error(`PDF glyph ink crosses the printable horizontal boundary for line ${i}: ${line.inkLeft}..${line.inkRight} in 0..${width}; export blocked`);
    }
  });
  const placements = placeInkLines(lines, height);
  await page.evaluate(({ lines, placements, height }) => {
    document.getElementById("pdf-ink-measure-style")?.remove();
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-pdf-ink-line]")); document.body.replaceChildren();
    document.body.style.position = "";
    document.body.style.left = "";
    document.body.style.top = "";
    document.body.style.marginLeft = "0px";
    const pages: HTMLElement[] = [];
    const quoteSegments = new Map<string, HTMLElement>();
    const semanticLists = new Map<string, HTMLElement>();
    const semanticItems = new Map<string, HTMLElement>();
    for (const [index, element] of elements.entries()) {
      const placement = placements[index];
      while (pages.length <= placement.page) {
        const sheet = document.createElement("section"); sheet.dataset.pdfInkPage = String(pages.length + 1);
        // Only Puppeteer owns paper geometry. These anchors impose page breaks,
        // without a second rounded paper height or any overflow clipping.
        sheet.style.cssText = `position:relative;width:100%;height:${height}px;box-sizing:border-box;break-after:page;`;
        document.body.append(sheet); pages.push(sheet);
      }
      element.style.top = `${placement.baseline - lines[index].offset}px`;
      const horizontalShift = lines[index].horizontalShift ?? 0;
      element.style.left = `${lines[index].frameLeft}px`;
      element.style.width = `${lines[index].frameRight - lines[index].frameLeft}px`;
      element.style.transform = horizontalShift === 0 ? "none" : `translateX(${horizontalShift}px)`;
      const path = element.dataset.pdfListPath ? JSON.parse(element.dataset.pdfListPath) as Array<{ list:number;item:number;tag:"UL"|"OL";start:number;value:number }> : [];
      let semanticParent: HTMLElement = pages[placement.page];
      let prefix = `${placement.page}`;
      for (const entry of path) {
        const listKey = `${prefix}:l${entry.list}`;
        let list = semanticLists.get(listKey);
        if (!list) {
          list = document.createElement(entry.tag.toLowerCase());
          list.dataset.pdfListId = String(entry.list);
          if (entry.tag === "OL") list.setAttribute("start", String(entry.start));
          list.style.display = "contents";
          semanticParent.append(list);
          semanticLists.set(listKey, list);
        }
        const itemKey = `${listKey}:i${entry.item}`;
        let item = semanticItems.get(itemKey);
        if (!item) {
          item = document.createElement("li");
          item.dataset.pdfListItemId = String(entry.item);
          item.setAttribute("value", String(entry.value));
          item.style.display = "contents";
          list.append(item);
          semanticItems.set(itemKey, item);
        }
        semanticParent = item;
        prefix = itemKey;
      }
      semanticParent.append(element);
      element.dataset.pdfInkBounds = JSON.stringify({
        top: placement.baseline + lines[index].inkTop,
        bottom: placement.baseline + lines[index].inkBottom,
        left: lines[index].inkLeft + horizontalShift,
        right: lines[index].inkRight + horizontalShift,
        horizontalShift,
      });
      if (element.dataset.pdfQuote) {
        const quote = JSON.parse(element.dataset.pdfQuote), key = `${placement.page}:${quote.id}`;
        if (!quoteSegments.has(key)) {
          const border = document.createElement("div"), shift = placement.baseline - lines[index].baseline;
          const top = Math.max(0, quote.top + shift), bottom = Math.min(height, quote.bottom + shift);
          // Keep the existing rule wholly inside the printable box. A rule
          // centered exactly on the boundary is half-clipped by Poppler.
          const borderInset = 1;
          const left = quote.left + (quote.direction === "ltr" ? borderInset : 0);
          border.style.cssText = `position:absolute;left:${left}px;width:${Math.max(0, quote.width - borderInset)}px;top:${top}px;height:${Math.max(0, bottom - top)}px;box-sizing:border-box;direction:${quote.direction};border-inline-start:${quote.border}`;
          pages[placement.page].prepend(border); quoteSegments.set(key, border);
        }
      }
    }
    pages.at(-1)?.style.setProperty("break-after", "auto");
  }, { lines, placements, height });
  return { lines: lines.length, pages: (placements.at(-1)?.page ?? 0) + 1, stagingHeight: total, screenshots: screenshotCount, measurementMs: Date.now() - measurementStarted };
}
