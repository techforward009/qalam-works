// @vitest-environment happy-dom
import {describe,it,expect,vi} from 'vitest';
import {facingSlot,facingExtent,facingPadding,projectPoint,unprojectPoint,setPageProjection,requestCanonicalFrame,cancelCanonicalFrame,withCanonicalHit,adjacentVisualPosition} from '../app/tools/document-studio/utils/facingPages';
import {parseStoredViewMode} from '../app/tools/document-studio/utils/documentView';
import {paginationGeometryFromLayout} from '../app/tools/document-studio/extensions/QalamPagination';
import {resolvePageLayout} from '../app/tools/document-studio/utils/pageLayout';
const g={width:210*96/25.4,height:297*96/25.4,gap:12,count:5};
describe('view-only RTL facing slots',()=>{
 it('centres 1 alone, then 2 right/3 left and 4 right/5 left',()=>{
  const slots=Array.from({length:5},(_,i)=>facingSlot(i,g));
  expect(slots[0].x).toBe(slots[2].x+g.width/2);expect(slots[1].x-slots[2].x).toBeCloseTo(g.width);
  expect(slots[1].y).toBe(slots[2].y);expect(slots[3].y).toBe(slots[4].y);expect(slots[3].x).toBe(slots[1].x);
  expect(slots[1].y).toBeGreaterThan(slots[0].y);
 });
 it.each([.5,1,2])('scales the one-seventh-width pasteboard at zoom %s',zoom=>{
  expect(facingPadding(g.width)*zoom).toBeCloseTo(30*96/25.4*zoom);
  expect(facingExtent(g).width*zoom).toBeCloseTo((2*g.width+2*g.width/7)*zoom);
 });
 it('round trips content points without changing their canonical page',()=>{
  for(let page=0;page<5;page++){const point={x:50,y:page*(g.height+g.gap)+100};const view=projectPoint(point.x,point.y,g);const back=unprojectPoint(view.x,view.y,g);expect(back.x).toBeCloseTo(point.x);expect(back.y).toBeCloseTo(point.y);expect(back.page).toBe(page);}
 });
 it('stores facing as a view preference, leaving pagination geometry unchanged',()=>{
  expect(parseStoredViewMode('facing')).toBe('facing');const layout=resolvePageLayout({size:'a4',orientation:'portrait',marginPreset:'normal'});
  const before=JSON.stringify(layout);paginationGeometryFromLayout(layout,'rtl',true);expect(JSON.stringify(layout)).toBe(before);
 });
});

it('strips facing projection from the print clone without losing source text',async()=>{
 const {stripViewOnlyPagination}=await import('../app/tools/document-studio/utils/documentView');
 const clone=document.createElement('div');clone.innerHTML='<div class="ProseMirror" data-studio-facing-editor><p><span data-facing-projected style="position:relative;left:900px;top:-2200px;--qalam-facing-ink-offset:2px">اردو متن</span></p></div>';
 stripViewOnlyPagination(clone);expect(clone.textContent).toBe('اردو متن');expect(clone.querySelector('[data-facing-projected]')).toBeNull();expect(clone.querySelector('span')!.style.left).toBe('');expect(clone.querySelector('span')!.style.top).toBe('2px');
});

it('shares one canonical measurement scope per animation frame and cancels stale readers',()=>{
 const root=document.createElement('div'),frames:FrameRequestCallback[]=[],read=vi.fn();
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});
 try{
  setPageProjection(root,g);
  requestCanonicalFrame(root,()=>{expect(root.hasAttribute('data-studio-canonical-measure')).toBe(true);read();});
  const cancelled=requestCanonicalFrame(root,()=>{throw new Error('stale reader');});cancelCanonicalFrame(cancelled);
  requestCanonicalFrame(root,read);expect(frames).toHaveLength(1);frames[0](0);
  expect(read).toHaveBeenCalledTimes(2);expect(root.hasAttribute('data-studio-canonical-measure')).toBe(false);
 }finally{setPageProjection(root,null);vi.unstubAllGlobals();}
});

it('makes source text visible only for hit-testing and restores it after nested readers',()=>{
 const root=document.createElement('div');
 withCanonicalHit(root,()=>{expect(root.hasAttribute('data-studio-canonical-hit')).toBe(true);withCanonicalHit(root,()=>{});expect(root.hasAttribute('data-studio-canonical-hit')).toBe(true);});
 expect(root.hasAttribute('data-studio-canonical-hit')).toBe(false);
});

it('finds precisely the adjacent visual line, including hard breaks and page gaps',()=>{
 const tops=[0,0,0,24,24,24,1200,1200,1200];
 expect(adjacentVisualPosition(0,8,1,1,p=>tops[p],12)).toBe(3);
 expect(adjacentVisualPosition(0,8,4,1,p=>tops[p],12)).toBe(6);
 expect(adjacentVisualPosition(0,8,7,-1,p=>tops[p],12)).toBe(5);
 expect(adjacentVisualPosition(0,8,3,-1,p=>tops[p],12)).toBe(2);
 expect(adjacentVisualPosition(0,8,0,-1,p=>tops[p],12)).toBeNull();
 expect(adjacentVisualPosition(0,8,8,1,p=>tops[p],12)).toBeNull();
});
