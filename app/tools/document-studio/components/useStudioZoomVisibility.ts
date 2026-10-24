"use client";
import {useLayoutEffect,useRef,type RefObject} from "react";
import type {Editor} from "@tiptap/react";

/** Read final transformed coordinates after zoom and the page-start paint pass.
 * If a selection is taller/wider than the viewport, retain its active end. */
export function useStudioZoomVisibility(editor:Editor|null,scale:number,scroller:RefObject<HTMLDivElement|null>){
 const previous=useRef(scale);
 useLayoutEffect(()=>{
  if(previous.current===scale)return;previous.current=scale;
  if(!editor)return;
  let frame=0,cancelled=false;
  const follow=(remaining:number)=>{frame=requestAnimationFrame(()=>{
   if(cancelled||editor.isDestroyed)return;if(remaining){follow(remaining-1);return;}
   const root=scroller.current;if(!root)return;
   const view=root.getBoundingClientRect(),selection=editor.state.selection;
   const caret=selection.empty?root.querySelector('[data-studio-caret]')?.getBoundingClientRect():null;
   const head=caret??editor.view.coordsAtPos(selection.head);
   const anchor=editor.view.coordsAtPos(selection.anchor);
   const union={left:Math.min(head.left,anchor.left),right:Math.max(head.right,anchor.right),top:Math.min(head.top,anchor.top),bottom:Math.max(head.bottom,anchor.bottom)};
   const box=!selection.empty&&union.right-union.left<root.clientWidth-24&&union.bottom-union.top<root.clientHeight-24?union:head;
   const top=view.top+root.clientTop,left=view.left+root.clientLeft,bottom=top+root.clientHeight,right=left+root.clientWidth;
   if(box.top<top+12)root.scrollTop+=box.top-top-12;else if(box.bottom>bottom-12)root.scrollTop+=box.bottom-bottom+12;
   if(box.left<left+12)root.scrollLeft+=box.left-left-12;else if(box.right>right-12)root.scrollLeft+=box.right-right+12;
  });};follow(3);
  return()=>{cancelled=true;cancelAnimationFrame(frame);};
 },[editor,scale,scroller]);
}
