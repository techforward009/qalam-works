import {renderedLineBoxTop,type TextLineBox} from "./textLineBoxes";
/** Screen-only paint snapshots. SVG text uses the same loaded face/shaping and
 * baseline as the source range; clipping preserves joins in partly selected words. */
export interface OutlineBandPiece {block:number;group:number;line:number;clip:TextLineBox;box:TextLineBox;frame?:TextLineBox}
export interface OutlineFragment extends OutlineBandPiece {
 text:string;x:number;y:number;xScale:number;rtl:boolean;font:string;features:string;kerning:string;letterSpacing:string;wordSpacing:string;rendering:string;
 clip:{left:number;top:number;width:number;height:number};
}
export function selectionFrameBounds(root:HTMLElement):TextLineBox[]{
 return [...root.closest('[data-studio-scroller]')?.querySelectorAll<HTMLElement>('[data-studio-margin-guide]')??[]].map(guide=>{
  const top=guide.querySelector('[data-studio-margin-line="top"]')!.getBoundingClientRect(),bottom=guide.querySelector('[data-studio-margin-line="bottom"]')!.getBoundingClientRect(),left=guide.querySelector('[data-studio-margin-line="left"]')!.getBoundingClientRect(),right=guide.querySelector('[data-studio-margin-line="right"]')!.getBoundingClientRect();
  return {left:left.right,top:top.bottom,width:Math.max(0,right.left-left.right),height:Math.max(0,bottom.top-top.bottom)};
 });
}
export function selectedOutlineFragments(root:HTMLElement,range:Range,clip:DOMRect,scale:number):{fragments:OutlineFragment[];onlyOutlined:boolean}{
 const fragments:OutlineFragment[]=[];let onlyOutlined=true,group=0,canvas:CanvasRenderingContext2D|null|undefined;
 const blocks=new Map<HTMLElement,number>();
 const frames=selectionFrameBounds(root);
 const common=range.commonAncestorContainer,walker=document.createTreeWalker(common,NodeFilter.SHOW_TEXT);
 const visit=(node:Node)=>{
  const text=node as Text;if(!range.intersectsNode(text))return;
  const start=range.startContainer===text?range.startOffset:0,end=range.endContainer===text?range.endOffset:text.length;
  if(end<=start||!text.data.slice(start,end).trim())return;
  const owner=text.parentElement!;
  if(!owner.closest('[data-text-outline="true"]')){onlyOutlined=false;group++;return;}
  const selected=document.createRange();selected.setStart(text,start);selected.setEnd(text,end);
  const visible=[...selected.getClientRects()].filter(r=>r.height>0&&r.width>0&&r.bottom>clip.top&&r.top<clip.bottom&&r.right>clip.left&&r.left<clip.right);
  if(!visible.length)return;
  canvas??=document.createElement('canvas').getContext('2d');if(!canvas)return;
  const style=getComputedStyle(owner);canvas.font=style.font;const ascent=canvas.measureText(text.data.slice(start,end)).fontBoundingBoxAscent*scale;
  const block=owner.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6')??root;if(!blocks.has(block))blocks.set(block,blocks.size);
  const leading=parseFloat(getComputedStyle(block).lineHeight)*scale;
  let from=start,to=end;while(from>0&&/\S/u.test(text.data[from-1]))from--;while(to<text.length&&/\S/u.test(text.data[to]))to++;
  const lines:{from:number;to:number;top:number}[]=[],probe=document.createRange();
  for(let i=from;i<to;){const next=i+((text.data.codePointAt(i)??0)>0xffff?2:1);probe.setStart(text,i);probe.setEnd(text,next);const rect=probe.getBoundingClientRect(),last=lines[lines.length-1];if(last&&Math.abs(last.top-rect.top)<=scale)last.to=next;else lines.push({from:i,to:next,top:rect.top});i=next;}
  const factor=Number(owner.closest('[data-studio-latin-scale]')?.getAttribute('data-studio-latin-scale'))||1;
  for(const line of lines){probe.setStart(text,line.from);probe.setEnd(text,line.to);const bounds=probe.getBoundingClientRect();
   for(const rect of visible){if(Math.abs(rect.top-line.top)>scale)continue;const pad=.75*scale,left=Math.max(clip.left,rect.left-pad),top=Math.max(clip.top,rect.top-pad),right=Math.min(clip.right,rect.right+pad),bottom=Math.min(clip.bottom,rect.bottom+pad);if(right<=left||bottom<=top)continue;
    const boxTop=renderedLineBoxTop(owner,bounds,leading,scale,true),baseline=bounds.top+ascent;
    const frame=frames.find(f=>(bounds.left+bounds.right)/2>=f.left-1&&(bounds.left+bounds.right)/2<=f.left+f.width+1&&baseline>=f.top&&baseline<=f.top+f.height)??frames.reduce<TextLineBox|undefined>((best,f)=>{const distance=(r:TextLineBox)=>Math.max(r.top-baseline,0,baseline-r.top-r.height)+Math.max(r.left-bounds.right,0,bounds.left-r.left-r.width);return !best||distance(f)<distance(best)?f:best;},undefined);
    fragments.push({block:blocks.get(block)!,group,line:baseline+(Number(owner.closest('[data-baseline]')?.getAttribute('data-baseline'))||0)*96/72*scale,box:{left:rect.left,top:boxTop,width:rect.width,height:leading},frame,text:text.data.slice(line.from,line.to),x:style.direction==='rtl'?bounds.right:bounds.left,y:bounds.top+ascent,xScale:factor,rtl:style.direction==='rtl',font:style.font,features:style.fontFeatureSettings,kerning:style.fontKerning,letterSpacing:style.letterSpacing,wordSpacing:style.wordSpacing,rendering:style.textRendering,clip:{left,top,width:right-left,height:bottom-top}});
   }
  }
 };
 if(common.nodeType===Node.TEXT_NODE)visit(common);else for(let node=walker.nextNode();node;node=walker.nextNode())visit(node);
 return{fragments,onlyOutlined:onlyOutlined&&fragments.length>0};
}

/** One opaque band for each logical visual line; glyph/Latin metrics only grow
 * its common bounds. Normal selected text splits ownership so its blue stays. */
export function outlineSelectionBands(pieces:readonly OutlineBandPiece[]):TextLineBox[]{
 const rows:{block:number;group:number;line:number;left:number;top:number;right:number;bottom:number;frame?:TextLineBox}[]=[];
 for(const p of [...pieces].sort((a,b)=>a.block-b.block||a.group-b.group||a.line-b.line||a.clip.left-b.clip.left)){
  const left=Math.min(p.box.left,p.clip.left),top=Math.min(p.box.top,p.clip.top),right=Math.max(p.box.left+p.box.width,p.clip.left+p.clip.width),bottom=Math.max(p.box.top+p.box.height,p.clip.top+p.clip.height),last=rows[rows.length-1];
  if(last&&last.block===p.block&&last.group===p.group&&last.frame?.left===p.frame?.left&&last.frame?.top===p.frame?.top&&Math.abs(last.line-p.line)<=1.5){last.left=Math.min(last.left,left);last.top=Math.min(last.top,top);last.right=Math.max(last.right,right);last.bottom=Math.max(last.bottom,bottom);}
  else rows.push({block:p.block,group:p.group,line:p.line,left,top,right,bottom,frame:p.frame});
 }
 return rows.map(r=>{const left=Math.max(r.left,r.frame?.left??-Infinity),top=Math.max(r.top,r.frame?.top??-Infinity),right=Math.min(r.right,r.frame?r.frame.left+r.frame.width:Infinity),bottom=Math.min(r.bottom,r.frame?r.frame.top+r.frame.height:Infinity);return{left,top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};}).filter(r=>r.width>0&&r.height>0);
}
