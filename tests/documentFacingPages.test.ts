// @vitest-environment happy-dom
import {describe,it,expect,vi} from 'vitest';
import {facingSlot,facingExtent,facingPadding,projectPoint,unprojectPoint,setPageProjection,requestCanonicalFrame,cancelCanonicalFrame,withCanonicalHit,adjacentVisualPosition,keepFacingInputPaint,facingLineTop,facingArrowKey,createFacingArrowTracking} from '../app/tools/document-studio/utils/facingPages';
import {parseStoredViewMode} from '../app/tools/document-studio/utils/documentView';
import {paginationGeometryFromLayout} from '../app/tools/document-studio/extensions/QalamPagination';
import {resolvePageLayout} from '../app/tools/document-studio/utils/pageLayout';
import {Schema} from '@tiptap/pm/model';
import {EditorState,TextSelection} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
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

it('paints a split input paragraph synchronously without replacing its selection',()=>{
 const schema=new Schema({nodes:{doc:{content:'paragraph+'},paragraph:{content:'text*'},text:{}}});
 const doc=schema.node('doc',null,[schema.node('paragraph',null,schema.text('پہلی عبارت'))]);
 const state=EditorState.create({doc,selection:TextSelection.create(doc,doc.content.size-1)});
 const attrs={'data-facing-projected':'true','data-facing-block':'true',style:'position:relative;left:510px;top:113px'};
 const old=DecorationSet.create(doc,[Decoration.node(0,doc.content.size,attrs,{paint:JSON.stringify(attrs)})]);
 const tr=state.tr.split(state.selection.head),next=state.apply(tr),mapped=old.map(tr.mapping,tr.doc),head=next.selection.$head;
 expect(head.parent.content.size).toBe(0);
 const result=keepFacingInputPaint(old,mapped,next,state,attrs),input=result.find(head.before(),head.after()).find(d=>d.from===head.before()&&d.to===head.after());
 expect(JSON.parse(input!.spec.paint)).toMatchObject({...attrs,'data-facing-input':'true'});
 expect(next.selection.eq(tr.selection)).toBe(true);
});
it.each([.5,1,2])('resolves a text line after the pagination gap at zoom %s',scale=>{
 const geometry={pageHeightPx:1122,gapPx:12,marginTopPx:48,marginBottomPx:48},origin=30;
 const top=facingLineTop(origin+1056*scale,origin+1181*scale,origin+1208*scale,26.4*scale,origin,scale,geometry);
 expect(top).toBeCloseTo(origin+1182*scale);
 const ordinary=origin+500*scale;
 expect(facingLineTop(ordinary,ordinary,ordinary+27*scale,26.4*scale,origin,scale,geometry)).toBe(ordinary);
});

it('inherits input paint from the selected block, not a neighbour touching its boundary',()=>{
 const schema=new Schema({nodes:{doc:{content:'paragraph+'},paragraph:{content:'text*'},text:{}}}),p=schema.node('paragraph',null,schema.text('عبارت'));
 const doc=schema.node('doc',null,[p,p]),state=EditorState.create({doc,selection:TextSelection.create(doc,doc.content.size-1)});
 const first={'data-facing-projected':'true','data-facing-block':'true',style:'position:relative;left:500px;top:113px'},second={...first,style:'position:relative;left:900px;top:339px'};
 const old=DecorationSet.create(doc,[Decoration.node(0,p.nodeSize,first,{paint:JSON.stringify(first)}),Decoration.node(p.nodeSize,doc.content.size,second,{paint:JSON.stringify(second)})]);
 const tr=state.tr.split(state.selection.head),next=state.apply(tr),head=next.selection.$head,result=keepFacingInputPaint(old,old.map(tr.mapping,tr.doc),next,state,first);
 expect(JSON.parse(result.find(head.before(),head.after()).find(d=>d.from===head.before()&&d.to===head.after())!.spec.paint).style).toBe(second.style);
});

it('drops arrow affinity on newer edits and direct selections, retaining it only for paint metadata',()=>{
 const schema=new Schema({nodes:{doc:{content:'paragraph+'},paragraph:{content:'text*'},text:{}}}),doc=schema.node('doc',null,[schema.node('paragraph',null,schema.text('عبارت'))]);
 const original=EditorState.create({doc,plugins:[createFacingArrowTracking()]}),arrow=original.apply(original.tr.setSelection(TextSelection.create(doc,1)).setMeta(facingArrowKey,{head:1,page:1}));
 expect(facingArrowKey.getState(arrow)).toEqual({head:1,page:1});
 expect(facingArrowKey.getState(arrow.apply(arrow.tr.setMeta('paint-only',true)))).toEqual({head:1,page:1});
 expect(facingArrowKey.getState(arrow.apply(arrow.tr.insertText('ا')))).toBeNull();
 expect(facingArrowKey.getState(arrow.apply(arrow.tr.setSelection(TextSelection.create(doc,1))))).toBeNull();
});
