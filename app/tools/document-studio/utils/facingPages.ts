import {Plugin,PluginKey} from "@tiptap/pm/state";
import {Decoration,DecorationSet,type EditorView} from "@tiptap/pm/view";
import type {EditorState} from "@tiptap/pm/state";
export const facingKey=new PluginKey<DecorationSet>("qalam-facing-projection");
export interface FacingArrowAnchor {head:number;page:number;lineTop?:number}
export const facingArrowKey=new PluginKey<FacingArrowAnchor|null>('qalam-facing-arrow-anchor');
export function createFacingArrowTracking(){return new Plugin<FacingArrowAnchor|null>({key:facingArrowKey,state:{init:()=>null,apply:(tr,old)=>tr.getMeta(facingArrowKey)??(tr.docChanged||tr.selectionSet?null:old)}});}
/** A non-collapsed character range cannot resolve onto the other side of a
 * soft-wrap/pagination gap, unlike a collapsed native caret at the same pos. */
export function facingTextRect(view:EditorView,pos:number):DOMRect|null {
 const resolved=view.state.doc.resolve(pos),from=resolved.nodeAfter?.isText?pos:resolved.nodeBefore?.isText?pos-1:null;
 if(from===null)return null;const a=view.domAtPos(from),b=view.domAtPos(from+1),range=document.createRange();range.setStart(a.node,a.offset);range.setEnd(b.node,b.offset);
 const rects=[...range.getClientRects()].filter(r=>r.height>0);return rects[rects.length-1]??null;
}
const facingFontOffsets=new Map<string,number>();
/** CSS inline metrics, measured outside the editor so pagination floats and
 * projected spans cannot change the glyph-to-line-box offset. Cached per font. */
export function facingTextLineTop(view:EditorView,pos:number,rect:DOMRect,leading:number,scale:number):number {
 const resolved=view.state.doc.resolve(pos),from=resolved.nodeAfter?.isText?pos:Math.max(resolved.start(),pos-1),leaf=view.nodeDOM(from),owner=leaf?.nodeType===Node.TEXT_NODE?leaf.parentElement:leaf as HTMLElement|null;
 if(!owner)return rect.top;const style=getComputedStyle(owner),text=view.state.doc.textBetween(from,Math.min(resolved.end(),from+1))||'ا',key=`${style.font}|${leading}|${text}`;
 let offset=facingFontOffsets.get(key);
 if(offset===undefined){
  const probe=document.createElement('div');probe.style.cssText='position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;margin:0;padding:0;border:0;white-space:pre;width:max-content';probe.style.font=style.font;probe.style.lineHeight=`${leading}px`;probe.style.fontFeatureSettings=style.fontFeatureSettings;probe.textContent=text;document.body.append(probe);
  try{const range=document.createRange();range.selectNodeContents(probe);offset=range.getBoundingClientRect().top-probe.getBoundingClientRect().top;}finally{probe.remove();}
  if(facingFontOffsets.size>256)facingFontOffsets.clear();facingFontOffsets.set(key,offset);
 }
 return rect.top-offset*scale;
}
/** View-only page coordinates. Pagination always uses the original vertical strip. */
export interface PageProjection {width:number;height:number;gap:number;count:number}
export function facingPadding(width:number){return width/7;}
export function facingRow(page:number){return page===0?0:Math.floor((page+1)/2);}
export function facingSlot(page:number,g:PageProjection){const pad=facingPadding(g.width);return {x:pad+(page===0?g.width/2:page%2===1?g.width:0),y:pad+facingRow(page)*(g.height+2*pad+g.gap)};}
export function facingExtent(g:PageProjection){const rows=facingRow(Math.max(0,g.count-1))+1,pad=facingPadding(g.width);return {width:2*g.width+2*pad,height:rows*(g.height+2*pad+g.gap)-g.gap};}
export function projectPoint(x:number,y:number,g:PageProjection){const page=Math.max(0,Math.min(g.count-1,Math.floor((y+.01)/(g.height+g.gap)))),slot=facingSlot(page,g);return {x:x+slot.x,y:y-page*(g.height+g.gap)+slot.y,page};}
export function unprojectPoint(x:number,y:number,g:PageProjection){const pad=facingPadding(g.width),row=Math.max(0,Math.floor(y/(g.height+2*pad+g.gap)));let page=row===0?0:row*2-(x>=pad+g.width?1:0);page=Math.min(g.count-1,page);const slot=facingSlot(page,g);return {x:Math.max(0,Math.min(g.width,x-slot.x)),y:Math.max(0,Math.min(g.height,y-slot.y))+page*(g.height+g.gap),page};}
const projections=new WeakMap<HTMLElement,PageProjection>();
export function pageProjection(root:HTMLElement){return projections.get(root);}
export function setPageProjection(root:HTMLElement,g:PageProjection|null){if(g)projections.set(root,g);else projections.delete(root);}
/** Layout readers must see the unchanged, canonical flow. All projection paint
 * is relative positioning, so disabling it synchronously never changes wrapping. */
export function withCanonicalPages<T>(root:HTMLElement,read:()=>T):T {
 const active=projections.has(root)&&!root.hasAttribute('data-studio-canonical-measure');
 if(active)root.setAttribute('data-studio-canonical-measure','');
 try{return read();}finally{if(active)root.removeAttribute('data-studio-canonical-measure');}
}
/** Only browser hit-testing needs hidden source paragraphs to be visible.
 * Geometry/range reads work while hidden; flipping every paragraph on each
 * keystroke needlessly repaints a long document. */
export function withCanonicalHit<T>(root:HTMLElement,read:()=>T):T {
 const active=!root.hasAttribute('data-studio-canonical-hit');
 if(active)root.setAttribute('data-studio-canonical-hit','');
 try{return read();}finally{if(active)root.removeAttribute('data-studio-canonical-hit');}
}
export function canonicalClientPoint(root:HTMLElement,point:{left:number;top:number}){
 const g=projections.get(root);if(!g||root.hasAttribute('data-studio-canonical-measure'))return point;
 const rect=root.getBoundingClientRect(),scale=rect.width/g.width,p=unprojectPoint((point.left-rect.left)/scale,(point.top-rect.top)/scale,g);
 return {left:rect.left+p.x*scale,top:rect.top+p.y*scale};
}

// Pagination, first-line paint and facing projection share a single canonical
// read phase per frame. A nested read reuses the scope instead of toggling all
// projected text between every reader. Single-page scheduling is unchanged.
let nextRead = -1;
const pendingReads = new Map<number, () => void>();
const frameQueues = new WeakMap<HTMLElement, number[]>();
export function requestCanonicalFrame(root: HTMLElement, read: () => void): number {
 const run = () => { try { read(); } catch (error) { console.error("Studio layout reader failed:", error); } };
 if (!pageProjection(root)) return requestAnimationFrame(run);
 const id = nextRead--; pendingReads.set(id, run);
 const queue = frameQueues.get(root);
 if (queue) queue.push(id);
 else {
  const batch = [id]; frameQueues.set(root, batch);
  requestAnimationFrame(() => {
   frameQueues.delete(root);
   withCanonicalPages(root, () => {
    for (const key of batch) { const run = pendingReads.get(key); try { run?.(); } finally { pendingReads.delete(key); } }
   });
  });
 }
 return id;
}
export function cancelCanonicalFrame(id: number) {
 if (id < 0) pendingReads.delete(id); else cancelAnimationFrame(id);
}

/** Find the next actual visual line within a text block, without browser hit
 * testing (which cannot hit canonical text outside the viewport). */
export function adjacentVisualPosition(from:number,to:number,head:number,direction:1|-1,lineAt:(pos:number)=>number,tolerance:number):number|null {
 const current=lineAt(head);
 if(direction>0){
  let lo=head+1,hi=to;if(lo>hi||lineAt(hi)<=current+tolerance)return null;
  while(lo<hi){const mid=(lo+hi)>>>1;if(lineAt(mid)>current+tolerance)hi=mid;else lo=mid+1;}return lo;
 }
 let lo=from,hi=head-1;if(lo>hi||lineAt(lo)>=current-tolerance)return null;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(lineAt(mid)<current-tolerance)lo=mid;else hi=mid-1;}return lo;
}

/** Splitting a paragraph drops its node decoration. Never leave the new input
 * paragraph hidden until a frame: Chrome can relocate its native selection to
 * the previous visible paragraph before the next zero-delay input arrives.
 * This changes paint only; it never restores/captures a selection. */
export function keepFacingInputPaint(old:DecorationSet,mapped:DecorationSet,state:EditorState,previous:EditorState,fallback:Record<string,string>):DecorationSet {
 const head=state.selection.$head;if(!head.depth||!head.parent.isTextblock)return mapped;
 const from=head.before(),to=head.after(),inside=mapped.find(from,to);
 const attrs=(dec:ReturnType<DecorationSet['find']>[number])=>dec.spec.paint?JSON.parse(dec.spec.paint) as Record<string,string>:null;
 if(inside.some(d=>d.from===from&&d.to===to&&attrs(d)?.['data-facing-block']))return mapped;
 // A paragraph split over sheets already has independently positioned runs.
 // Their inclusive edges keep newly typed characters visible without moving
 // the parent twice. A whole-block run (left:0) still needs its parent offset.
 const positionedRuns=inside.filter(d=>{const a=attrs(d);return a&&!a['data-facing-block']&&!/left:0(?:px)?;/.test(a.style??'');});
 if(positionedRuns.length){
  if(positionedRuns.some(d=>d.from<=head.pos&&d.to>=head.pos))return mapped;
  const prior=previous.selection.$head,source=old.find(Math.max(0,prior.pos-1),Math.min(previous.doc.content.size,prior.pos+1)).find(d=>attrs(d));
  const tail={...fallback,...(source?attrs(source):null),'data-facing-projected':'true','data-facing-input':'true'};delete (tail as Record<string,string>)['data-facing-block'];
  const start=Math.max(head.start(),head.pos-1),end=Math.min(head.end(),head.pos+1);
  return start<end?mapped.add(state.doc,[Decoration.inline(start,end,tail,{paint:JSON.stringify(tail),inclusiveStart:true,inclusiveEnd:true})]):mapped;
 }
 const prior=previous.selection.$head;
 const candidates=old.find(prior.depth?prior.before():0,prior.depth?prior.after():previous.doc.content.size);
 const source=candidates.find(d=>d.from===(prior.depth?prior.before():0)&&d.to===(prior.depth?prior.after():previous.doc.content.size)&&attrs(d)?.['data-facing-block'])??candidates.find(d=>d.from<=prior.pos&&d.to>=prior.pos&&attrs(d));
 const before=source?attrs(source):null;
 const input={...fallback,...before,'data-facing-projected':'true','data-facing-block':'true','data-facing-input':'true'};
 return mapped.add(state.doc,[Decoration.node(from,to,input,{paint:JSON.stringify(input)})]);
}

/** A block can start before its first line when a pagination float precedes
 * the text. Keep that line on the text's page, not in the prior sheet's margin. */
export function facingLineTop(top:number,anchorTop:number,anchorBottom:number,leading:number,origin:number,scale:number,g:{pageHeightPx:number;gapPx:number;marginTopPx:number;marginBottomPx:number},pageHint?:number,lineHint?:number):number {
 const stride=g.pageHeightPx+g.gapPx,page=pageHint??Math.max(0,Math.floor(((anchorTop+anchorBottom)/2-origin)/scale/stride));
 const start=origin+(page*stride+g.marginTopPx)*scale,end=origin+(page*stride+g.pageHeightPx-g.marginBottomPx)*scale;
 if(top>=start-1&&top+leading<=end+1&&(lineHint===undefined||Math.abs(top-lineHint)<leading/2))return top;
 const line=lineHint??anchorTop-(leading-(anchorBottom-anchorTop))/2;
 return Math.max(start,Math.min(line,end-leading));
}
