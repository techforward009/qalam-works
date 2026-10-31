import type {Editor} from '@tiptap/core';
import {firstLineKey} from '../extensions/FirstLineLayout';
import {getQalamPaginationState} from '../extensions/QalamPagination';
let context:CanvasRenderingContext2D|null|undefined;
/** An initial run of empty hard-break lines precedes the first text baseline.
 * Anchor it to the measured page-start run, not the paragraph's original top.
 * Both caret and selection use this same grid. All coordinates are screen px. */
export function hardBreakLineTop(root:HTMLElement,owner:HTMLElement,rect:{top:number},leading:number,scale:number):number|undefined {
 const editor=(root as HTMLElement&{editor?:Editor}).editor,block=owner.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6');
 if(!editor||!root.contains(owner)||!block||!root.contains(block)||!Number.isFinite(leading)||leading<=0)return;
 const resolved=editor.state.doc.resolve(editor.view.posAtDOM(block,0));
 if(resolved.parent.firstChild?.type.name!=='hardBreak')return;
 let prefix=0,found=false;
 for(let i=0;i<resolved.parent.childCount;i++){const child=resolved.parent.child(i);if(child.type.name==='hardBreak')prefix+=child.nodeSize;else{found=child.isText;break;}}
 if(!prefix||!found)return;
 const geometry=getQalamPaginationState(editor)?.geometry;if(!geometry?.enabled)return;
 const origin=root.getBoundingClientRect(),firstPos=resolved.start()+prefix,page=Math.max(0,Math.floor((rect.top-origin.top)/scale/(geometry.pageHeightPx+geometry.gapPx)));
 const anchor=firstLineKey.getState(editor.state)?.runs.filter(run=>run.block===resolved.start()-1&&run.empty&&run.page===page&&run.from<=firstPos&&run.lineBoxTop!==undefined).sort((a,b)=>b.from-a.from)[0];
 if(!anchor)return;
 const start=editor.view.domAtPos(firstPos),end=editor.view.domAtPos(Math.min(editor.state.doc.content.size,firstPos+1)),range=document.createRange();range.setStart(start.node,start.offset);range.setEnd(end.node,end.offset);
 const first=range.getBoundingClientRect(),parent=(start.node.nodeType===Node.TEXT_NODE?start.node.parentElement:start.node) as HTMLElement;
 const measure=context??(context=document.createElement('canvas').getContext('2d'));
 const baseline=(node:HTMLElement,top:number)=>{if(!measure)return top;measure.font=getComputedStyle(node).font;return top+measure.measureText('اM').fontBoundingBoxAscent*scale;};
 return origin.top+anchor.lineBoxTop!*scale+(firstPos-anchor.from)*leading+Math.round((baseline(owner,rect.top)-baseline(parent,first.top))/leading)*leading;
}
