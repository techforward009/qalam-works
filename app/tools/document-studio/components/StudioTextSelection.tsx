"use client";
import {pageProjection,projectPoint,withCanonicalPages} from "../utils/facingPages";

import { FORMATTING_TARGET_CHANGE, isFormattingSurface, readFormattingTarget } from "../utils/formattingSafety";
import { AllSelection, TextSelection } from "@tiptap/pm/state";
import { useEffect, useLayoutEffect, useState, useId } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { selectedLineBoxes, type TextLineBox } from "../utils/textLineBoxes";

import {selectedOutlineFragments,outlineSelectionBands, selectionFrameBounds,type OutlineFragment} from "../utils/outlineSelection";
import {SELECTED_OUTLINE_STROKE_PT} from "../utils/inpageToolbar";
const EMPTY_OUTLINES:OutlineFragment[]=[];
const EMPTY_BOXES: TextLineBox[] = [];

/** Native textarea selection is retained; only the main editor uses custom paint. */
export function StudioTextSelection({ editor, zoom, revision="" }: { editor: Editor | null; zoom: number;revision?:string }) {
  const [boxes, setBoxes] = useState<TextLineBox[]>(EMPTY_BOXES);
  const outlineId=useId().replace(/:/g,"");
  const [outlines,setOutlines]=useState<OutlineFragment[]>(EMPTY_OUTLINES);
  const [onlyOutlined,setOnlyOutlined]=useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    const scroller = root.closest<HTMLElement>("[data-studio-scroller]");
    const layerHost = scroller?.querySelector<HTMLElement>("[data-studio-selection-host]") ?? null;
    setHost(layerHost);
    const scope = root.closest<HTMLElement>("[data-studio-root]");
    let dismissed = false;
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        let next = EMPTY_BOXES,nextOutlines=EMPTY_OUTLINES,allOutline=false;
        const selection = editor.state.selection;
        const target = readFormattingTarget(root);
        const active = document.activeElement;
        const visibleTarget = !dismissed && (target ? target.owner === "story" : editor.isFocused) && (root.contains(active) || isFormattingSurface(active));
        try {
        if (layerHost && scroller && !editor.isDestroyed && visibleTarget && (selection instanceof TextSelection || selection instanceof AllSelection) && !selection.empty) {
          const clip = scroller.getBoundingClientRect(), origin = layerHost.getBoundingClientRect();
          const hostScale = origin.width / parseFloat(getComputedStyle(layerHost).width) || 1;
          const projection=pageProjection(root);
          let outlineRange:Range;
          const canonical=withCanonicalPages(root,()=>{
            // Rebuild from the current model on every paint. Native selection
            // can belong to a toolbar input while the formatting range is valid.
            const from=editor.view.domAtPos(selection.from,1),to=editor.view.domAtPos(selection.to,-1);
            const range=document.createRange();range.setStart(from.node,from.offset);range.setEnd(to.node,to.offset);outlineRange=range;
            return selectedLineBoxes(root,range,projection?new DOMRect(-1e7,-1e7,2e7,2e7):clip);
          });
          const outlined=selectedOutlineFragments(root,outlineRange!,clip,hostScale);
          allOutline=outlined.onlyOutlined;
          nextOutlines=outlined.fragments.map(f=>({...f,x:(f.x-origin.left)/hostScale,y:(f.y-origin.top)/hostScale,line:(f.line-origin.top)/hostScale,box:{left:(f.box.left-origin.left)/hostScale,top:(f.box.top-origin.top)/hostScale,width:f.box.width/hostScale,height:f.box.height/hostScale},frame:f.frame?{left:(f.frame.left-origin.left)/hostScale,top:(f.frame.top-origin.top)/hostScale,width:f.frame.width/hostScale,height:f.frame.height/hostScale}:undefined,clip:{left:(f.clip.left-origin.left)/hostScale,top:(f.clip.top-origin.top)/hostScale,width:f.clip.width/hostScale,height:f.clip.height/hostScale}}));
          const rootBox=root.getBoundingClientRect(),frames=selectionFrameBounds(root);
          next = canonical.map(box=>{if(!projection)return box;const p=projectPoint((box.left-rootBox.left)/hostScale,(box.top-rootBox.top)/hostScale,projection);return {...box,left:rootBox.left+p.x*hostScale,top:rootBox.top+p.y*hostScale};}).map(box => {
            const middle=box.top+box.height/2, frame=frames.find(f=>middle>=f.top&&middle<=f.top+f.height&&box.left+box.width/2>=f.left&&box.left+box.width/2<=f.left+f.width)??frames.reduce<(typeof frames)[number]|undefined>((best,f)=>!best||Math.abs(middle-f.top-f.height/2)<Math.abs(middle-best.top-best.height/2)?f:best,undefined);
            const left = Math.max(box.left, clip.left,frame?.left??-Infinity), top = Math.max(box.top, clip.top,frame?.top??-Infinity);
            return { left: (left - origin.left)/hostScale, top: (top - origin.top)/hostScale, width: Math.max(0, Math.min(box.left + box.width, clip.right,frame?frame.left+frame.width:Infinity) - left)/hostScale, height: Math.max(0, Math.min(box.top + box.height, clip.bottom,frame?frame.top+frame.height:Infinity) - top)/hostScale };
          }).filter(box => box.width > 0 && box.height > 0);
        }
        } catch { next = EMPTY_BOXES; nextOutlines=EMPTY_OUTLINES; allOutline=false; }
        // If measurement fails or no selection is painted, keep native highlighting.
        setBoxes(prev => prev.length || next.length ? next : prev);
        setOutlines(prev=>prev.length||nextOutlines.length?nextOutlines:prev);setOnlyOutlined(allOutline);
      });
    };
    const pointer = (event: PointerEvent) => {
      const target=event.target instanceof Element?event.target:null;
      if (root.contains(target)) dismissed=false;
      else if (!isFormattingSurface(target)) dismissed=true;
      update();
    };
    const key = (event: KeyboardEvent) => {
      if (root.contains(event.target as Node)) { dismissed=event.key==="Escape"; update(); }
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", key, true);
    document.addEventListener("focusin", update);
    scope?.addEventListener(FORMATTING_TARGET_CHANGE, update);
    document.addEventListener("selectionchange", update);
    scroller?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    editor.on("transaction", update);
    editor.on("blur", update);
    const observer = new ResizeObserver(update);
    observer.observe(root);
    document.fonts.addEventListener("loadingdone", update);
    update();
    return () => {
      cancelAnimationFrame(raf); observer.disconnect();
      root.removeAttribute("data-studio-selection-painted");
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("focusin", update);
      scope?.removeEventListener(FORMATTING_TARGET_CHANGE, update);
      document.removeEventListener("selectionchange", update);
      scroller?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.fonts.removeEventListener("loadingdone", update);
      editor.off("transaction", update); editor.off("blur", update);
    };
  }, [editor, zoom,revision]);
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const root = editor.view.dom;
    root.toggleAttribute("data-studio-selection-painted", Boolean(host && boxes.length));
    return () => root.removeAttribute("data-studio-selection-painted");
  }, [editor, host, boxes]);
  if (!host || !boxes.length) return null;
  const outlineBands=outlineSelectionBands(outlines);
  // Paint a translucent highlight between effect backgrounds (0) and story ink (2).
  // Difference blending needs an opaque backdrop; effects require a transparent story.
  return createPortal(<><div aria-hidden="true" data-studio-selection-layer className="studio-no-print" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
    {!onlyOutlined&&boxes.map((box, index) => <div key={index} data-studio-line-selection style={{ position: "absolute", ...box, background: "rgba(80, 145, 255, 0.35)" }} />)}
    {outlineBands.map((box,index)=><div key={`outline-${index}`} data-studio-outline-background data-studio-line-selection={onlyOutlined?true:undefined} style={{position:"absolute",...box,background:"#000"}}/>)}
  </div>
  {outlines.length?<svg data-studio-outline-selection aria-hidden="true" className="studio-no-print" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible",pointerEvents:"none",userSelect:"none",zIndex:3}}>
   {outlines.map((f,index)=><g key={index} clipPath={`url(#${outlineId}-${index})`}>
    <defs><clipPath id={`${outlineId}-${index}`} clipPathUnits="userSpaceOnUse"><rect x={f.clip.left} y={f.clip.top} width={f.clip.width} height={f.clip.height}/></clipPath></defs>
    <text fill="none" stroke="#fff" strokeWidth={`${SELECTED_OUTLINE_STROKE_PT}pt`} transform={`translate(${f.x} ${f.y}) scale(${f.xScale} 1)`} textAnchor="start" style={{font:f.font,fontFeatureSettings:f.features,fontKerning:f.kerning as "auto",letterSpacing:f.letterSpacing,wordSpacing:f.wordSpacing,textRendering:f.rendering as "auto",direction:f.rtl?"rtl":"ltr",unicodeBidi:"plaintext"}}>{f.text}</text>
   </g>)}
  </svg>:null}</>, host);
}
