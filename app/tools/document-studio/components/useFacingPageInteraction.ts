"use client";
import {useEffect} from 'react';
import type {Editor} from '@tiptap/react';
import {TextSelection} from '@tiptap/pm/state';
import {canonicalClientPoint,pageProjection,unprojectPoint,facingSlot,withCanonicalPages} from '../utils/facingPages';
/** Map page-space pointer selection to the single canonical ProseMirror document. */
export function useFacingPageInteraction(editor:Editor|null,enabled:boolean){
 useEffect(()=>{
  if(!editor||!enabled)return;const root=editor.view.dom,host=root.closest<HTMLElement>('[data-studio-pages-stack]');if(!host)return;
  let anchor:number|null=null,pointer:number|null=null;
  const hit=(event:{clientX:number;clientY:number})=>{
   const g=pageProjection(root);if(!g)return null;const rect=root.getBoundingClientRect(),scale=rect.width/g.width;
   const local={x:(event.clientX-rect.left)/scale,y:(event.clientY-rect.top)/scale},p=unprojectPoint(local.x,local.y,g),slot=facingSlot(p.page,g);
   if(local.x<slot.x||local.x>slot.x+g.width||local.y<slot.y||local.y>slot.y+g.height)return null;
   const point=canonicalClientPoint(root,{left:event.clientX,top:event.clientY});
   return withCanonicalPages(root,()=>editor.view.posAtCoords(point));
  };
  const down=(event:PointerEvent)=>{
   if(event.button!==0 || root.closest('[data-studio-print-root]')?.getAttribute('data-studio-tool')!=='text')return;
   if((event.target as Element).closest('textarea,input,button,img,[data-studio-frame]'))return;
   const point=hit(event);if(!point){if(root.contains(event.target as Node)){event.preventDefault();event.stopPropagation();}return;}event.preventDefault();event.stopPropagation();
   anchor=event.shiftKey?editor.state.selection.anchor:point.pos;pointer=event.pointerId;
   editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc,anchor,point.pos)));editor.view.focus();host.setPointerCapture(pointer);
  };
  const move=(event:PointerEvent)=>{if(anchor===null||pointer!==event.pointerId)return;const point=hit(event);if(point){event.preventDefault();editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc,anchor,point.pos)));}};
  const up=()=>{anchor=null;if(pointer!==null&&host.hasPointerCapture(pointer))host.releasePointerCapture(pointer);pointer=null;};
  const context=(event:MouseEvent)=>{if(root.closest("[data-studio-print-root]")?.getAttribute("data-studio-tool")!=="text"||(event.target as Element).closest("textarea,input,button,img,[data-studio-frame]"))return;if(!hit(event)){if(root.contains(event.target as Node))event.stopPropagation();return;}if(root.contains(event.target as Node))return;event.preventDefault();root.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:event.clientX,clientY:event.clientY}));};
  const word=(event:MouseEvent)=>{if(root.closest("[data-studio-print-root]")?.getAttribute("data-studio-tool")!=="text"||(event.target as Element).closest("textarea,input,button,img,[data-studio-frame]"))return;const point=hit(event);if(!point)return;event.preventDefault();const at=editor.state.doc.resolve(point.pos),text=at.parent.textBetween(0,at.parent.content.size,'\uFFFC','\uFFFC');let from=at.parentOffset,to=from;const letter=(char:string)=>/[\p{L}\p{M}\p{N}_]/u.test(char);while(from>0&&letter(text[from-1]))from--;while(to<text.length&&letter(text[to]))to++;editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc,at.start()+from,at.start()+to)));};
  host.addEventListener('dblclick',word,true);
  host.addEventListener('pointerdown',down,true);host.addEventListener('pointermove',move,true);host.addEventListener('pointerup',up,true);host.addEventListener('pointercancel',up,true);host.addEventListener('contextmenu',context,true);
  return()=>{host.removeEventListener('pointerdown',down,true);host.removeEventListener('pointermove',move,true);host.removeEventListener('pointerup',up,true);host.removeEventListener('pointercancel',up,true);host.removeEventListener('contextmenu',context,true);host.removeEventListener('dblclick',word,true);};
 },[editor,enabled]);
}
