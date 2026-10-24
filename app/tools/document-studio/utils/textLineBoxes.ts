export interface TextLineBox { left: number; top: number; width: number; height: number }
export interface LineRect extends TextLineBox { fontTop: number; fontBottom: number }

/** One sort and one grouping pass: all runs on a visual line share its box. */
export function groupVisualLineRects(rects: LineRect[]): TextLineBox[] {
  rects.sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: { rects: LineRect[]; top: number; bottom: number; fontTop: number; fontBottom: number }[] = [];
  for (const rect of rects) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.top - rect.top) <= 1) {
      line.rects.push(rect);
      const height = Math.max(line.bottom - line.top, rect.height);
      line.top = Math.min(line.top, rect.top);
      line.bottom = line.top + height;
      line.fontTop = Math.min(line.fontTop, rect.fontTop);
      line.fontBottom = Math.max(line.fontBottom, rect.fontBottom);
    } else lines.push({ rects: [rect], top: rect.top, bottom: rect.top + rect.height, fontTop: rect.fontTop, fontBottom: rect.fontBottom });
  }
  const boxes: TextLineBox[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bottom = line.bottom;
    for (const rect of line.rects) boxes.push({ left: rect.left, top: line.top, width: rect.width, height: Math.max(0, bottom - line.top) });
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
export function renderedLineBoxTop(owner: HTMLElement, rect: Pick<DOMRect,"top"|"height">, leading: number, scale: number): number {
  const block=owner.closest<HTMLElement>("p,h1,h2,h3,h4,h5,h6") ?? owner;
  const bounds=block.getBoundingClientRect();
  const context=measurementContext ?? (measurementContext=document.createElement("canvas").getContext("2d"));
  if(!context) return lineBoxTop(rect.top,rect.height,leading,bounds.top,scale);
  const ascent=(element:HTMLElement)=>{context.font=getComputedStyle(element).font;return context.measureText("اM").fontBoundingBoxAscent*scale;};
  const paint=(element:HTMLElement)=>{const run=element.closest<HTMLElement>("[data-studio-line-run]");return run ? (parseFloat(run.style.top)||0)*scale : 0;};
  const baseline=rect.top+ascent(owner)-paint(owner);
  const firstText=(element:HTMLElement)=>document.createTreeWalker(element,NodeFilter.SHOW_TEXT).nextNode();
  const anchors=[block,...block.querySelectorAll<HTMLElement>("[data-studio-line-selection-offset]")];
  let origin: {baseline:number;top:number} | null=null;
  for(const anchor of anchors){
    const text=firstText(anchor);if(!text?.textContent)continue;
    const range=document.createRange();range.setStart(text,0);range.setEnd(text,1);
    const first=range.getBoundingClientRect(),parent=text.parentElement!;
    const start=first.top+ascent(parent)-paint(parent);
    const absolute=anchor.dataset.studioLineBoxTop;
    const top=anchor===block ? bounds.top : absolute ? (block.closest(".ProseMirror")?.getBoundingClientRect().top ?? bounds.top)+Number(absolute)*scale : first.top+parseFloat(anchor.dataset.studioLineSelectionOffset??"0")*scale;
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

/** Visit only the selected subtree, and discard offscreen rects before grouping. */
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
    const painted = text.parentElement!.closest("[data-studio-line-selection-offset]");
    const nativeRects = [...range.getClientRects()];
    const block = text.parentElement!.closest<HTMLElement>("p,h1,h2,h3,h4,h5,h6") ?? root;
    const blockStyle = getComputedStyle(block), blockBounds=block.getBoundingClientRect();
    for (const [index,rect] of nativeRects.entries()) {
      if (rect.width < 0.1 || rect.height < 1 || (clip && (rect.bottom <= clip.top || rect.top >= clip.bottom || rect.right <= clip.left || rect.left >= clip.right))) continue;
      const height = Number.isFinite(leading) ? leading * scale : rect.height;
      const absolute=painted?.getAttribute("data-studio-line-box-top");
      const top = absolute ? root.getBoundingClientRect().top+Number(absolute)*scale : renderedLineBoxTop(text.parentElement!,rect,height,scale);
      const reachesStart = start === 0 || index > 0;
      const right = reachesStart && blockStyle.direction === "rtl" ? blockBounds.right - parseFloat(blockStyle.paddingRight || "0") * scale : rect.right;
      const left = reachesStart && blockStyle.direction !== "rtl" ? blockBounds.left + parseFloat(blockStyle.paddingLeft || "0") * scale : rect.left;
      rects.push({ left, top, width: right-left, height, fontTop: rect.top, fontBottom: rect.bottom });
    }
  };
  if (common.nodeType === Node.TEXT_NODE) visit(common);
  else for (let node = walker.nextNode(); node; node = walker.nextNode()) visit(node);
  const boxes = groupVisualLineRects(rects);
  // Merge all selected runs of a line to a single solid band. A completely
  // selected line reaches its start guide, including the whitespace beside ink.
  const merged: TextLineBox[] = [];
  for (const box of boxes) {
    const last = merged[merged.length-1];
    if (last && Math.abs(last.top-box.top)<1) { const end=Math.max(last.left+last.width,box.left+box.width); last.left=Math.min(last.left,box.left); last.width=end-last.left; }
    else merged.push({...box});
  }
  return merged;
}
