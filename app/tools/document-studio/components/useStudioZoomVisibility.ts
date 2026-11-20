"use client";
import {useLayoutEffect,useRef,type RefObject} from "react";
import type {Editor} from "@tiptap/react";

function alignSelectedFrames(root: HTMLDivElement, selectedIds: readonly string[], facing: boolean): boolean {
 if(selectedIds.length===0)return false;
 const wanted=new Set(selectedIds);
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const node of root.querySelectorAll<HTMLElement>("[data-studio-frame-id]")){
  const id=node.getAttribute("data-studio-frame-id");
  if(!id||!wanted.has(id)||!node.isConnected)continue;
  const rect=node.getBoundingClientRect();
  if(rect.width<=0&&rect.height<=0)continue;
  left=Math.min(left,rect.left);
  top=Math.min(top,rect.top);
  right=Math.max(right,rect.right);
  bottom=Math.max(bottom,rect.bottom);
 }
 if(!Number.isFinite(left))return false;
 const view=root.getBoundingClientRect();
 const inset=facing?1:12;
 const vLeft=view.left+root.clientLeft+inset,vRight=view.left+root.clientLeft+root.clientWidth-inset;
 const vTop=view.top+root.clientTop+12,vBottom=view.top+root.clientTop+root.clientHeight-12;
 if(top<vTop)root.scrollTop+=top-vTop;
 else if(bottom>vBottom)root.scrollTop+=Math.min(top-vTop,bottom-vBottom);
 if(left<vLeft)root.scrollLeft+=left-vLeft;
 else if(right>vRight)root.scrollLeft+=Math.min(left-vLeft,right-vRight);
 return true;
}

/** Read final transformed coordinates after zoom and the page-start paint pass.
 * If a selection is taller/wider than the viewport, retain its active end. */
export function useStudioZoomVisibility(editor:Editor|null,scale:number,scroller:RefObject<HTMLDivElement|null>,revision="",selectedFrameIds:readonly string[]=[]){
 const previous=useRef(revision==="facing"?"":`${scale}:${revision}`),previousView=useRef(revision);
 const selectedRef=useRef(selectedFrameIds);
 selectedRef.current=selectedFrameIds;
 useLayoutEffect(()=>{
  const oldView=previousView.current,changedView=oldView!==revision;previousView.current=revision;
  const next=`${scale}:${revision}`;if(previous.current===next)return;previous.current=next;
  if(changedView&&oldView!=="pageless"&&revision!=="pageless"&&revision!=="facing")return; // The page-anchor hook owns switches between paper views, including Arrow mode.
  const immediateRoot=scroller.current;
  if(revision!=="facing"&&immediateRoot&&selectedRef.current.length>0){
   alignSelectedFrames(immediateRoot,selectedRef.current,false);
  }
  if(!editor&&selectedRef.current.length===0)return;
  let frame=0,cancelled=false;
  const follow=(remaining:number)=>{frame=requestAnimationFrame(()=>{
   if(cancelled||(editor&&editor.isDestroyed))return;if(remaining){follow(remaining-1);return;}
   const root=scroller.current;if(!root)return;
   // Start with a centred spread, then pan only if the active caret needs it.
   // In particular, page one already fits at 200% on a 1920px viewport.
   if(revision==="facing"&&selectedRef.current.length===0)root.scrollLeft=(root.scrollWidth-root.clientWidth)/2;
   if(selectedRef.current.length>0&&alignSelectedFrames(root,selectedRef.current,revision==="facing"))return;
   if(!editor)return;
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