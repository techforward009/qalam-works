import {hardBreakLineTop} from "./hardBreakLineGrid";
export interface TextLineBox { left: number; top: number; width: number; height: number }
export interface LineRect extends TextLineBox { fontTop: number; fontBottom: number; selectionTop?:number; selectionBottom?:number }

/** One sort and one grouping pass: all runs on a visual line share its box. */
export function groupVisualLineRects(rects: LineRect[]): TextLineBox[] {
  rects.sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: { rects: LineRect[]; top: number; bottom: number; fontTop: number; fontBottom: number; selectionTop:number; selectionBottom:number }[] = [];
  for (const rect of rects) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.top - rect.top) <= 1) {
      line.rects.push(rect);
      const height = Math.max(line.bottom - line.top, rect.height);
      line.top = Math.min(line.top, rect.top);
      line.bottom = line.top + height;
      line.fontTop = Math.min(line.fontTop, rect.fontTop);
      line.fontBottom = Math.max(line.fontBottom, rect.fontBottom);
      line.selectionTop = Math.min(line.selectionTop,rect.selectionTop ?? rect.top);
      line.selectionBottom = Math.max(line.selectionBottom,rect.selectionBottom ?? rect.top+rect.height);
    } else lines.push({ rects: [rect], top: rect.top, bottom: rect.top + rect.height, fontTop: rect.fontTop, fontBottom: rect.fontBottom, selectionTop:rect.selectionTop ?? rect.top, selectionBottom:rect.selectionBottom ?? rect.top+rect.height });
  }
  const boxes: TextLineBox[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const top=Math.min(line.top,line.selectionTop),bottom=Math.max(line.bottom,line.selectionBottom);
    for (const rect of line.rects) boxes.push({ left: rect.left, top, width: rect.width, height: Math.max(0, bottom - top) });
  }
  return boxes;
}

/** Native text rects describe font metrics; CSS distributes half-leading on either side. */
export function lineBoxTop(glyphTop: number, glyphHeight: number, leading: number, blockTop?: number, scale = 1): number {
  const top = glyphTop - (leading - glyphHeight) / 2;
  if (blockTop === undefined || !(leading > 0)) return top;
  // Browser font metrics are integer-rounded independently of fractional pt
  // leading. Snap that small error to the block's real line grid (not its ink).
  const grid = blockTop + Math.round((top-blockTop)/leading)*leading;
  return Math.abs(grid-top) <= 2*scale ? grid : top;
}

let measurementContext: CanvasRenderingContext2D | null | undefined;
/** Read the baseline grid, not glyph overflow or an inline run's zero-height strut. */
function baselineOffset(owner:HTMLElement,scale:number):number { return -(Number(owner.closest("[data-baseline]")?.getAttribute("data-baseline"))||0)*96/72*scale; }
export function renderedLineBoxTop(owner: HTMLElement, rect: Pick<DOMRect,"top"|"height">, leading: number, scale: number, ignoreBaselineShift=false): number {
  const root=owner.closest<HTMLElement>(".ProseMirror");
  const hardBreakTop=root?hardBreakLineTop(root,owner,rect,leading,scale):undefined;if(hardBreakTop!==undefined)return hardBreakTop;
  const block=owner.closest<HTMLElement>("p,h1,h2,h3,h4,h5,h6") ?? owner;
  const bounds=block.getBoundingClientRect();
  const context=measurementContext ?? (measurementContext=document.createElement("canvas").getContext("2d"));
  if(!context) return lineBoxTop(rect.top,rect.height,leading,bounds.top,scale);
  const ascent=(element:HTMLElement)=>{context.font=getComputedStyle(element).font;return context.measureText("اM").fontBoundingBoxAscent*scale;};
  const paint=(element:HTMLElement)=>{if(element.closest("[data-studio-canonical-measure]"))return 0;const run=element.closest<HTMLElement>("[data-studio-line-run]");return run ? (parseFloat(run.style.top)||0)*scale : 0;};
  const baseline=rect.top+ascent(owner)-paint(owner)-(ignoreBaselineShift?baselineOffset(owner,scale):0);
  const firstText=(element:HTMLElement)=>document.createTreeWalker(element,NodeFilter.SHOW_TEXT).nextNode();
  const anchors=[block,...block.querySelectorAll<HTMLElement>("[data-studio-line-selection-offset]")];
  let origin: {baseline:number;top:number} | null=null;
  for(const anchor of anchors){
    const text=firstText(anchor);if(!text?.textContent)continue;
    const range=document.createRange();range.setStart(text,0);range.setEnd(text,1);
    const first=range.getBoundingClientRect(),parent=text.parentElement!;
    const start=first.top+ascent(parent)-paint(parent)-(ignoreBaselineShift?baselineOffset(parent,scale):0);
    const absolute=anchor.dataset.studioLineBoxTop;
    const top=anchor===block ? bounds.top : absolute ? (block.closest(".ProseMirror")?.getBoundingClientRect().top ?? bounds.top)+Number(absolute)*scale : first.top+parseFloat(anchor.dataset.studioLineSelectionOffset??"0")*scale-(ignoreBaselineShift?baselineOffset(parent,scale):0);
    if(start<=baseline+1 && (!origin || start>=origin.baseline))origin={baseline:start,top};
  }
  if(!origin) return lineBoxTop(rect.top,rect.height,leading,bounds.top,scale);
  return origin.top+Math.round((baseline-origin.baseline)/leading)*leading;
}

function elementScale(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const width = parseFloat(style.width) + (style.boxSizing === "border-box" ? 0 : parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth));
  return width > 0 ? element.getBoundingClientRect().width / width : 1;
}

interface PrefixLineRect { left: number; right: number; top: number }
/** A text-node boundary is not a visual line boundary (marks split text nodes). */
export function beginsAtVisualLineStart(rect: {left:number;right:number;top:number}, prefix: PrefixLineRect[], rtl: boolean): boolean {
  return !prefix.some(before => Math.abs(before.top-rect.top)<=1 && (rtl ? before.right>rect.right+.5 : before.left<rect.left-.5));
}
function rectLineTop(root:HTMLElement, owner:HTMLElement, rect:DOMRect, height:number, scale:number):number {
  const absolute=owner.closest("[data-studio-line-box-top]")?.getAttribute("data-studio-line-box-top");
  return absolute ? root.getBoundingClientRect().top+Number(absolute)*scale : renderedLineBoxTop(owner,rect,height,scale,true);
}

/** Walk selected text; discard offscreen selection rects before grouping. */
export function selectedLineBoxes(root: HTMLElement, selection: Range, clip = root.closest("[data-studio-scroller]")?.getBoundingClientRect()): TextLineBox[] {
  const scale = elementScale(root);
  const rects: LineRect[] = [];
  const common = selection.commonAncestorContainer;
  if (common !== root && !root.contains(common)) return [];
  const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
  const visit = (node: Node) => {
    if (!selection.intersectsNode(node)) return;
    const text = node as Text;
    const start = selection.startContainer === text ? selection.startOffset : 0;
    const end = selection.endContainer === text ? selection.endOffset : text.length;
    if (end <= start) return;
    const range = document.createRange();
    range.setStart(text, start); range.setEnd(text, end);
    const textBlock=text.parentElement!.closest<HTMLElement>("p,h1,h2,h3,h4,h5,h6") ?? root;
    const leading = parseFloat(getComputedStyle(textBlock).lineHeight);
    const nativeRects = [...range.getClientRects()];
    for (const rect of nativeRects) {
      if (rect.width < 0.1 || rect.height < 1 || (clip && (rect.bottom <= clip.top || rect.top >= clip.bottom || rect.right <= clip.left || rect.left >= clip.right))) continue;
      const height = Number.isFinite(leading) ? leading * scale : rect.height;
      const top = rectLineTop(root,text.parentElement!,rect,height,scale);
      const left = rect.left, right = rect.right;
      const shift=baselineOffset(text.parentElement!,scale);
      rects.push({ left, top, width: right-left, height, fontTop: rect.top, fontBottom: rect.bottom, ...(shift ? {selectionTop:Math.min(top,top+shift,rect.top),selectionBottom:Math.max(top+height,top+height+shift,rect.bottom)} : {}) });
    }
  };
  if (common.nodeType === Node.TEXT_NODE) visit(common);
  else for (let node = walker.nextNode(); node; node = walker.nextNode()) visit(node);
  // Empty selected paragraphs have no text-node rect; never fill their frame.
  for (const block of root.querySelectorAll<HTMLElement>("p,h1,h2,h3,h4,h5,h6")) {
    if (block.textContent?.length || !selection.intersectsNode(block)) continue;
    const bounds = block.getBoundingClientRect(), style = getComputedStyle(block);
    const height = parseFloat(style.lineHeight) * scale || bounds.height;
    const width = 2;
    const left = style.textAlign === "center" ? (bounds.left+bounds.right-width)/2 : style.textAlign === "left" || (style.textAlign !== "right" && style.direction === "ltr") ? bounds.left : bounds.right-width;
    if (clip && (bounds.top+height <= clip.top || bounds.top >= clip.bottom)) continue;
    rects.push({left,top:bounds.top,width,height,fontTop:bounds.top,fontBottom:bounds.top+height});
  }
  const boxes = groupVisualLineRects(rects);
  // Merge selected runs into one continuous band, using only their text extent.
  const merged: TextLineBox[] = [];
  for (const box of boxes) {
    const last = merged[merged.length-1];
    if (last && Math.abs(last.top-box.top)<1) { const end=Math.max(last.left+last.width,box.left+box.width); last.left=Math.min(last.left,box.left); last.width=end-last.left; }
    else merged.push({...box});
  }
  return merged;
}
