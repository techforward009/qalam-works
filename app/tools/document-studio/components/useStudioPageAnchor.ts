"use client";
import {useLayoutEffect,type RefObject} from 'react';
import type {Editor} from '@tiptap/react';
import type {DocumentViewMode} from '../utils/documentView';
export interface StudioPageAnchor {page:number;fraction:number;version:number}
/** Preserve the visible sheet even with Arrow active (there is no caret then). */
export function useStudioPageAnchor(editor:Editor|null,scroller:RefObject<HTMLDivElement|null>,mode:DocumentViewMode,anchor?:StudioPageAnchor|null){
 useLayoutEffect(()=>{
  if(!editor||mode==='pageless'||anchor?.page===0)return;let frame=0,cancelled=false;
  const follow=(remaining:number)=>{frame=requestAnimationFrame(()=>{if(cancelled||editor.isDestroyed)return;if(remaining){follow(remaining-1);return;}
   const root=scroller.current;if(!root)return;
   const papers=root.querySelectorAll<HTMLElement>('[data-studio-page-paper]');
   const page=Math.max(1,Math.min(papers.length,anchor?.page??1)),paper=papers[page-1];if(!paper)return;
   const bounds=paper.getBoundingClientRect(),viewport=root.getBoundingClientRect();
   if(anchor&&anchor.fraction>=0)root.scrollTop+=bounds.top+anchor.fraction*bounds.height-viewport.top;
   else {const row=mode==='facing'?root.querySelector<HTMLElement>(`[data-studio-facing-row="${page===1?1:Math.floor(page/2)+1}"]`):paper;
    const y=row?.getBoundingClientRect().top??bounds.top;root.scrollTop+=y-viewport.top-(mode==='pages'&&page===1?24*Number(root.closest('[data-studio-zoom-factor]')?.getAttribute('data-studio-zoom-factor')??1):0);
   }
   // Keep the active caret visible only if it belongs to the sheet being kept;
   // an offscreen stored selection must not pull an Arrow view to another page.
   const c=root.querySelector<HTMLElement>('[data-studio-caret]')?.getBoundingClientRect(),p=paper.getBoundingClientRect(),v=root.getBoundingClientRect();
   if(c&&c.top>=p.top&&c.bottom<=p.bottom&&c.left>=p.left&&c.right<=p.right){
    if(c.top<v.top)root.scrollTop+=c.top-v.top-16;else if(c.bottom>v.bottom)root.scrollTop+=c.bottom-v.bottom+16;
    if(c.left<v.left)root.scrollLeft+=c.left-v.left-12;else if(c.right>v.right)root.scrollLeft+=c.right-v.right+12;
   }
  });};follow(4);return()=>{cancelled=true;cancelAnimationFrame(frame);};
 },[editor,scroller,mode,anchor?.version]);
}
