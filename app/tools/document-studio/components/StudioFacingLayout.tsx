"use client";
import {useLayoutEffect,useRef} from 'react';
import type {Editor} from '@tiptap/react';
import {Plugin,TextSelection} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
import {getQalamPaginationState} from "../extensions/QalamPagination";
import {renderedLineBoxTop} from "../utils/textLineBoxes";
import {firstLineKey} from '../extensions/FirstLineLayout';
import {facingKey,facingSlot,pageProjection,setPageProjection,withCanonicalPages,type PageProjection} from '../utils/facingPages';
/** Real editor DOM is painted in rows; no second editor, cloned text, or saved
 * page nodes. Offset measurements and the original pagination remain linear. */
export function StudioFacingLayout({editor,geometry,zoom}:{editor:Editor|null;geometry:PageProjection|null;zoom:number}){
 const scheduleRef=useRef<()=>void>(()=>{});
 useLayoutEffect(()=>{
  if(!editor||!geometry)return;const root=editor.view.dom;
  setPageProjection(root,geometry);root.setAttribute('data-studio-facing-editor','true');
  const original=editor.view.posAtCoords.bind(editor.view);
  editor.view.posAtCoords=point=>root.hasAttribute("data-studio-canonical-measure")?original(point):withCanonicalPages(root,()=>original(canonicalClientPointFor(point)));
  const canonicalClientPointFor=(point:{left:number;top:number})=>{
   // Calculate before entering the measurement scope.
   const rect=root.getBoundingClientRect(),scale=rect.width/geometry.width;
   const g=pageProjection(root)??geometry,pad=g.width/7,row=Math.max(0,Math.floor((point.top-rect.top)/scale/(g.height+2*pad+g.gap)));
   const page=Math.min(g.count-1,row===0?0:row*2-((point.left-rect.left)/scale>=pad+g.width?1:0)),slot=facingSlot(page,g);
   return {left:rect.left+Math.max(0,Math.min(g.width,(point.left-rect.left)/scale-slot.x))*scale,top:rect.top+(Math.max(0,Math.min(g.height,(point.top-rect.top)/scale-slot.y))+page*(g.height+g.gap))*scale};
  };
  editor.registerPlugin(new Plugin<DecorationSet>({
   key:facingKey,state:{init:()=>DecorationSet.empty,apply:(tr,old)=>tr.getMeta(facingKey)??old.map(tr.mapping,tr.doc)},
   props:{decorations:state=>facingKey.getState(state),handleKeyDown(view,event){
    if(!['ArrowUp','ArrowDown'].includes(event.key)||event.ctrlKey||event.metaKey||event.altKey)return false;
    const hit=withCanonicalPages(root,()=>{
     const c=view.coordsAtPos(view.state.selection.head),dom=view.domAtPos(view.state.selection.head).node,owner=(dom.nodeType===Node.TEXT_NODE?dom.parentElement:dom) as HTMLElement;
     const rect=root.getBoundingClientRect(),scale=rect.width/geometry.width,block=owner.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6')??root,leading=parseFloat(getComputedStyle(block).lineHeight)*scale;
     const step=Number.isFinite(leading)?leading:Math.max(12,c.bottom-c.top),line=renderedLineBoxTop(owner,{top:c.top,height:c.bottom-c.top},step,scale),direction=event.key==='ArrowDown'?1:-1;
     let y=line+step/2+direction*step;
     const g=getQalamPaginationState({state:view.state})?.geometry;
     if(g){const stride=(g.pageHeightPx+g.gapPx)*scale,page=Math.max(0,Math.floor((line-rect.top)/stride)),start=rect.top+page*stride+g.marginTopPx*scale,end=rect.top+page*stride+(g.pageHeightPx-g.marginBottomPx)*scale;
      if(y>end)y=rect.top+(page+1)*stride+g.marginTopPx*scale+step/2;
      if(y<start&&page>0)y=rect.top+(page-1)*stride+(g.pageHeightPx-g.marginBottomPx)*scale-step/2;
     }
     return original({left:c.left,top:y});
    });
    if(!hit)return false;view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,event.shiftKey?view.state.selection.anchor:hit.pos,hit.pos)));return true;
   }},
   view(view){let frame=0,strutFrame=0,dead=false,last='';
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(dead)return;
     const geometry=pageProjection(root);if(!geometry)return;
     const decorations:Decoration[]=[],signature:string[]=[],visible=new Set<number>();
     withCanonicalPages(root,()=>{
      const rect=root.getBoundingClientRect(),scale=rect.width/geometry.width,stride=geometry.height+geometry.gap,runs=firstLineKey.getState(view.state)?.runs??[];
      const pageAt=(pos:number)=>{const c=view.coordsAtPos(pos);return Math.max(0,Math.min(geometry.count-1,Math.floor(((c.top+c.bottom)/2-rect.top)/scale/stride)));};
      const clip=root.closest('[data-studio-scroller]')!.getBoundingClientRect();
      for(let page=0;page<geometry.count;page++){const slot=facingSlot(page,geometry),top=rect.top+slot.y*scale;if(top+geometry.height*scale>=clip.top-100&&top<=clip.bottom+100)visible.add(page);}
      visible.add(pageAt(view.state.selection.head));
      view.state.doc.descendants((node,pos)=>{
       if(node.type.name==='blockquote'){
        const element=view.nodeDOM(pos) as HTMLElement|null;
        if(element){const bounds=element.getBoundingClientRect(),style=getComputedStyle(element),border=parseFloat(style.borderInlineStartWidth)||3,rtl=style.direction==='rtl';
         for(const page of visible){const slot=facingSlot(page,geometry),start=Math.max((bounds.top-rect.top)/scale,page*stride),end=Math.min((bounds.bottom-rect.top)/scale,page*stride+geometry.height);if(end<=start)continue;
          const left=(rtl?bounds.right-rect.left:bounds.left-rect.left)/scale+(rtl?-border:0)+slot.x,top=start+slot.y-page*stride;
          decorations.push(Decoration.widget(pos+1,()=>{const bar=document.createElement('span');bar.setAttribute('data-facing-quote','');bar.setAttribute('aria-hidden','true');bar.style.cssText=`position:absolute;pointer-events:none;left:${left}px;top:${top}px;width:${border}px;height:${end-start}px;background:${style.getPropertyValue('--qalam-quote-border')||'#d97706'}`;return bar;},{ignoreSelection:true,key:`quote-${pos}-${page}-${top}-${end-start}`}));signature.push(`quote:${pos}:${page}:${top}:${end-start}`);
         }
        }
       }
       if(node.isAtom&&!node.isInline){
        const element=view.nodeDOM(pos) as HTMLElement|null;if(!element)return false;
        const box=element.getBoundingClientRect(),page=Math.max(0,Math.min(geometry.count-1,Math.floor((box.top-rect.top)/scale/stride)));
        if(visible.has(page)){const slot=facingSlot(page,geometry);decorations.push(Decoration.node(pos,pos+node.nodeSize,{'data-facing-projected':'true',style:`position:relative;left:${slot.x}px;top:${slot.y-page*stride}px`}));signature.push(`atom:${pos}:${page}`);}return false;
       }
       if(!node.isTextblock)return;
       const block=view.nodeDOM(pos) as HTMLElement|null;if(!block)return false;
       const box=block.getBoundingClientRect(),first=Math.floor((box.top-rect.top)/scale/stride),lastPage=Math.floor((box.bottom-rect.top)/scale/stride);
       const pages=[...visible].filter(page=>page>=first&&page<=lastPage).sort((a,b)=>a-b);
       if(!pages.length)return false;
       const from=pos+1,end=from+node.content.size;
       // Move whole blocks whenever possible, retaining paragraph backgrounds,
       // borders and native hit boxes. Only a block spanning sheets needs runs.
       if(first===lastPage&&visible.has(first)){
        const slot=facingSlot(first,geometry);
        decorations.push(Decoration.node(pos,pos+node.nodeSize,{'data-facing-projected':'true','data-facing-block':'true',style:`position:relative;left:${slot.x}px;top:${slot.y-first*stride}px`}));signature.push(`${pos}:block:${first}:${node.nodeSize}`);
        for(const run of runs)if(run.block===pos&&!run.empty&&run.to>run.from){
         decorations.push(Decoration.inline(run.from,run.to,{'data-facing-projected':'true','data-studio-line-box-top':String(run.lineBoxTop??''),'data-studio-line-selection-offset':String(run.selectionOffset??0),style:`position:relative;left:0;top:${run.offset}px;--qalam-facing-ink-offset:${run.offset}px`}));signature.push(`ink:${run.from}:${run.to}:${run.offset}:${run.lineBoxTop}`);
        }
        return false;
       }
       if(from===end){const page=pageAt(from);if(!visible.has(page))return false;const slot=facingSlot(page,geometry);decorations.push(Decoration.node(pos,pos+node.nodeSize,{'data-facing-projected':'true',style:`position:relative;left:${slot.x}px;top:${slot.y-page*stride}px`}));signature.push(`${pos}:empty:${page}`);return false;}
       for(const page of pages){
        let lo=from,hi=end;
        while(lo<hi){const mid=(lo+hi)>>>1;if(pageAt(mid)<page)lo=mid+1;else hi=mid;}
        const start=lo;if(start===end||pageAt(start)!==page)continue;
        lo=start+1;hi=end;
        while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(pageAt(mid-1)===page)lo=mid;else hi=mid-1;}
        const stop=Math.max(start+1,lo),slot=facingSlot(page,geometry),cuts=new Set([start,stop]);
        for(const run of runs)if(run.from<stop&&run.to>start){cuts.add(Math.max(start,run.from));cuts.add(Math.min(stop,run.to));}
        const points=[...cuts].sort((a,b)=>a-b);
        for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],run=runs.find(r=>a>=r.from&&b<=r.to),offset=run?.offset??0;
         const attrs:Record<string,string>={'data-facing-projected':'true',style:`position:relative;left:${slot.x}px;top:${slot.y-page*stride+offset}px;--qalam-facing-ink-offset:${offset}px`};
         if(run){attrs['data-studio-line-box-top']=String(run.lineBoxTop??'');attrs['data-studio-line-selection-offset']=String(run.selectionOffset??0);}
         decorations.push(Decoration.inline(a,b,attrs));signature.push(`${a}:${b}:${page}:${offset}:${run?.lineBoxTop}:${run?.selectionOffset}`);
        }
       }
       return false;
      });

     });
     const next=signature.join('|');if(next!==last){last=next;view.dispatch(view.state.tr.setMeta(facingKey,DecorationSet.create(view.state.doc,decorations)).setMeta('addToHistory',false));}
     cancelAnimationFrame(strutFrame);strutFrame=requestAnimationFrame(()=>{
      if(dead)return;const g=pageProjection(root);if(!g)return;
      const changes:{strut:HTMLElement;x:number;y:number;project:boolean}[]=[];
      withCanonicalPages(root,()=>{
       const rect=root.getBoundingClientRect(),scale=rect.width/g.width,stride=g.height+g.gap,blocks=new Map<HTMLElement,{first:number;last:number}>();
       for(const strut of root.querySelectorAll<HTMLElement>('[data-studio-empty-line-strut]')){
        const block=strut.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6');if(!block)continue;
        let bounds=blocks.get(block);if(!bounds){const b=block.getBoundingClientRect();bounds={first:Math.floor((b.top-rect.top)/scale/stride),last:Math.floor((b.bottom-rect.top)/scale/stride)};blocks.set(block,bounds);}
        if(bounds.first===bounds.last){if(strut.hasAttribute('data-facing-projected'))changes.push({strut,x:0,y:0,project:false});continue;}
        const at=strut.getBoundingClientRect(),page=Math.max(0,Math.min(g.count-1,Math.floor((at.top-rect.top)/scale/stride)));if(!visible.has(page))continue;
        const slot=facingSlot(page,g);let x=slot.x,y=slot.y-page*stride;
        for(let parent=strut.parentElement;parent&&parent!==root;parent=parent.parentElement)if(parent.hasAttribute('data-facing-projected')){x-=parseFloat(parent.style.left)||0;y-=parseFloat(parent.style.top)||0;}
        changes.push({strut,x,y,project:true});
       }
      });
      // Widgets are view-owned and ignore DOM mutations. Read all geometry
      // before writing, avoiding a layout read/write loop on long hard-break runs.
      for(const {strut,x,y,project} of changes){if(project){strut.setAttribute('data-facing-projected','true');strut.style.position='relative';strut.style.left=`${x}px`;strut.style.top=`${y}px`;}else{strut.removeAttribute('data-facing-projected');strut.style.removeProperty('left');strut.style.removeProperty('top');strut.style.removeProperty('position');}}
     });
    });};
    scheduleRef.current=schedule;
    const scroller=root.closest('[data-studio-scroller]');scroller?.addEventListener('scroll',schedule,{passive:true});
    const observer=new ResizeObserver(schedule);observer.observe(root);if(scroller)observer.observe(scroller);document.fonts.addEventListener('loadingdone',schedule);schedule();
    return {update:(view,previous)=>{if(view.state.doc!==previous.doc){last="";schedule();}else if(view.state.selection.head!==previous.selection.head||firstLineKey.getState(view.state)?.runs!==firstLineKey.getState(previous)?.runs)schedule();},destroy(){dead=true;scheduleRef.current=()=>{};scroller?.removeEventListener('scroll',schedule);cancelAnimationFrame(frame);cancelAnimationFrame(strutFrame);observer.disconnect();document.fonts.removeEventListener('loadingdone',schedule);}};
   }
  }));
  return()=>{for(const strut of root.querySelectorAll<HTMLElement>('[data-studio-empty-line-strut]')){strut.removeAttribute('data-facing-projected');strut.style.removeProperty('left');strut.style.removeProperty('top');strut.style.removeProperty('position');}setPageProjection(root,null);root.removeAttribute('data-studio-facing-editor');if(!editor.isDestroyed){editor.view.posAtCoords=original;editor.unregisterPlugin(facingKey);}};
 },[editor,geometry?.width,geometry?.height,geometry?.gap]);
 useLayoutEffect(()=>{if(editor&&geometry){setPageProjection(editor.view.dom,geometry);scheduleRef.current();}},[editor,geometry?.width,geometry?.height,geometry?.gap,geometry?.count,zoom]);
 return null;
}
