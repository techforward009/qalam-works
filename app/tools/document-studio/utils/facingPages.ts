import {PluginKey} from "@tiptap/pm/state";
import type {DecorationSet} from "@tiptap/pm/view";
export const facingKey=new PluginKey<DecorationSet>("qalam-facing-projection");
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
 if (!pageProjection(root)) return requestAnimationFrame(read);
 const id = nextRead--; pendingReads.set(id, read);
 const queue = frameQueues.get(root);
 if (queue) queue.push(id);
 else {
  const batch = [id]; frameQueues.set(root, batch);
  requestAnimationFrame(() => {
   frameQueues.delete(root);
   withCanonicalPages(root, () => {
    for (const key of batch) { const run = pendingReads.get(key); pendingReads.delete(key); run?.(); }
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
