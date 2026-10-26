"use client";
import {useLayoutEffect,useRef,type RefObject} from "react";
import type {Editor} from "@tiptap/react";

/** Read final transformed coordinates after zoom and the page-start paint pass.
 * If a selection is taller/wider than the viewport, retain its active end. */
export function useStudioZoomVisibility(editor:Editor|null,scale:number,scroller:RefObject<HTMLDivElement|null>,revision=""){
 const previous=useRef(revision==="facing"?"":`${scale}:${revision}`),previousView=useRef(revision);
 useLayoutEffect(()=>{
  const oldView=previousView.current,changedView=oldView!==revision;previousView.current=revision;
  const next=`${scale}:${revision}`;if(previous.current===next)return;previous.current=next;
  if(changedView&&oldView!=="pageless"&&revision!=="pageless"&&revision!=="facing")return; // The page-anchor hook owns switches between paper views, including Arrow mode.
  if(!editor)return;
  let frame=0,cancelled=false;
  const follow=(remaining:number)=>{frame=requestAnimationFrame(()=>{
   if(cancelled||editor.isDestroyed)return;if(remaining){follow(remaining-1);return;}
   const root=scroller.current;if(!root)return;
   // Start with a centred spread, then pan only if the active caret needs it.
   // In particular, page one already fits at 200% on a 1920px viewport.
   if(revision==="facing")root.scrollLeft=(root.scrollWidth-root.clientWidth)/2;
   const view=root.getBoundingClientRect(),selection=editor.state.selection;
   const caret=selection.empty?root.querySelector('[data-studio-caret]')?.getBoundingClientRect():null;
   if(revision==="facing"&&(!editor.isFocused||(selection.empty&&!caret)))return;
   const head=caret??editor.view.coordsAtPos(selection.head);
   const anchor=editor.view.coordsAtPos(selection.anchor);
   const union={left:Math.min(head.left,anchor.left),right:Math.max(head.right,anchor.right),top:Math.min(head.top,anchor.top),bottom:Math.max(head.bottom,anchor.bottom)};
   const box=!selection.empty&&union.right-union.left<root.clientWidth-24&&union.bottom-union.top<root.clientHeight-24?union:head;
   const top=view.top+root.clientTop,left=view.left+root.clientLeft,bottom=top+root.clientHeight,right=left+root.clientWidth;
   if(box.top<top+12)root.scrollTop+=box.top-top-12;else if(box.bottom>bottom-12)root.scrollTop+=box.bottom-bottom+12;
   const inset=revision==="facing"?1:12;
   if(box.left<left+inset)root.scrollLeft+=box.left-left-inset;else if(box.right>right-inset)root.scrollLeft+=box.right-right+inset;
  });};follow(3);
  return()=>{cancelled=true;cancelAnimationFrame(frame);};
 },[editor,scale,scroller,revision]);
}
