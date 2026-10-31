/** Screen-only paint snapshots. SVG text uses the same loaded face/shaping and
 * baseline as the source range; clipping preserves joins in partly selected words. */
export interface OutlineFragment {
 text:string;x:number;y:number;xScale:number;rtl:boolean;font:string;features:string;kerning:string;letterSpacing:string;wordSpacing:string;rendering:string;
 clip:{left:number;top:number;width:number;height:number};
}
export function selectedOutlineFragments(root:HTMLElement,range:Range,clip:DOMRect,scale:number):{fragments:OutlineFragment[];onlyOutlined:boolean}{
 const fragments:OutlineFragment[]=[];let onlyOutlined=true,canvas:CanvasRenderingContext2D|null|undefined;
 const common=range.commonAncestorContainer,walker=document.createTreeWalker(common,NodeFilter.SHOW_TEXT);
 const visit=(node:Node)=>{
  const text=node as Text;if(!range.intersectsNode(text))return;
  const start=range.startContainer===text?range.startOffset:0,end=range.endContainer===text?range.endOffset:text.length;
  if(end<=start||!text.data.slice(start,end).trim())return;
  const owner=text.parentElement!;
  if(!owner.closest('[data-text-outline="true"]')){onlyOutlined=false;return;}
  const selected=document.createRange();selected.setStart(text,start);selected.setEnd(text,end);
  const visible=[...selected.getClientRects()].filter(r=>r.height>0&&r.width>0&&r.bottom>clip.top&&r.top<clip.bottom&&r.right>clip.left&&r.left<clip.right);
  if(!visible.length)return;
  canvas??=document.createElement('canvas').getContext('2d');if(!canvas)return;
  const style=getComputedStyle(owner);canvas.font=style.font;const ascent=canvas.measureText('اM').fontBoundingBoxAscent*scale;
  let from=start,to=end;while(from>0&&/\S/u.test(text.data[from-1]))from--;while(to<text.length&&/\S/u.test(text.data[to]))to++;
  const lines:{from:number;to:number;top:number}[]=[],probe=document.createRange();
  for(let i=from;i<to;){const next=i+((text.data.codePointAt(i)??0)>0xffff?2:1);probe.setStart(text,i);probe.setEnd(text,next);const rect=probe.getBoundingClientRect(),last=lines[lines.length-1];if(last&&Math.abs(last.top-rect.top)<=scale)last.to=next;else lines.push({from:i,to:next,top:rect.top});i=next;}
  const factor=Number(owner.closest('[data-studio-latin-scale]')?.getAttribute('data-studio-latin-scale'))||1;
  for(const line of lines){probe.setStart(text,line.from);probe.setEnd(text,line.to);const bounds=probe.getBoundingClientRect();
   for(const rect of visible){if(Math.abs(rect.top-line.top)>scale)continue;const pad=.75*scale,left=Math.max(clip.left,rect.left-pad),top=Math.max(clip.top,rect.top-pad),right=Math.min(clip.right,rect.right+pad),bottom=Math.min(clip.bottom,rect.bottom+pad);if(right<=left||bottom<=top)continue;
    fragments.push({text:text.data.slice(line.from,line.to),x:style.direction==='rtl'?bounds.right:bounds.left,y:bounds.top+ascent,xScale:factor,rtl:style.direction==='rtl',font:style.font,features:style.fontFeatureSettings,kerning:style.fontKerning,letterSpacing:style.letterSpacing,wordSpacing:style.wordSpacing,rendering:style.textRendering,clip:{left,top,width:right-left,height:bottom-top}});
   }
  }
 };
 if(common.nodeType===Node.TEXT_NODE)visit(common);else for(let node=walker.nextNode();node;node=walker.nextNode())visit(node);
 return{fragments,onlyOutlined:onlyOutlined&&fragments.length>0};
}
