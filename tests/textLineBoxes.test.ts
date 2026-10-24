// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { groupVisualLineRects, selectedLineBoxes, lineBoxTop, beginsAtVisualLineStart } from "../app/tools/document-studio/utils/textLineBoxes";

describe("visual line selection boxes", () => {
  it("gives mixed Urdu/Latin sizes the same top and height and keeps the full line-height", () => {
    const boxes = groupVisualLineRects([
      { left: 0, top: 10, width: 80, height: 40, fontTop: 10, fontBottom: 40 },
      { left: 80, top: 10, width: 40, height: 40, fontTop: 20, fontBottom: 35 },
      { left: 0, top: 51, width: 90, height: 40, fontTop: 51, fontBottom: 81 },
    ]);
    expect(boxes.slice(0, 2).map(({top, height}) => ({top, height}))).toEqual([{top:10,height:40},{top:10,height:40}]);
    expect(boxes[2].top - boxes[0].top - boxes[0].height).toBe(1);
  });
  it("subtracts half-leading at both zoom levels", () => {
    expect(lineBoxTop(106, 28, 40)).toBe(100);
    expect(lineBoxTop(212, 56, 80)).toBe(200);
  });
  it("walks a text common ancestor directly and rejects offscreen rects", () => {
    const root = document.createElement("div"); root.style.cssText = "width:200px;line-height:20px";
    root.textContent = "abcdef"; document.body.append(root);
    const range = document.createRange(); range.setStart(root.firstChild!, 1); range.setEnd(root.firstChild!, 3);
    const original = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects");
    Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [new DOMRect(0,10,20,15), new DOMRect(0,300,20,15)] });
    try { expect(selectedLineBoxes(root, range, new DOMRect(0,0,200,100))).toHaveLength(1); }
    finally { if (original) Object.defineProperty(Range.prototype, "getClientRects", original); else delete (Range.prototype as unknown as Record<string,unknown>).getClientRects; root.remove(); }
  });
});

it.each(["rtl","ltr"])("does not extend a marked-word selection across preceding %s text",dir=>{
  const root=document.createElement("div");root.style.cssText="width:200px;line-height:20px";
  const p=document.createElement("p");p.style.cssText=`direction:${dir};line-height:20px`;
  const first=document.createTextNode(dir==="rtl"?"پہلا حصہ ":"First part "),bold=document.createElement("strong"),last=document.createTextNode(dir==="rtl"?" آخری حصہ":" last part");
  bold.textContent=dir==="rtl"?"درمیانی":"middle";p.append(first,bold,last);root.append(p);document.body.append(root);
  const original=Object.getOwnPropertyDescriptor(Range.prototype,"getClientRects");
  const bounds=()=>new DOMRect(0,100,200,20);
  root.getBoundingClientRect=bounds;p.getBoundingClientRect=bounds;
  Object.defineProperty(Range.prototype,"getClientRects",{configurable:true,value:function(this:Range){
    const node=this.startContainer;
    const x=dir==="rtl"?node===first?140:node===bold.firstChild?80:0:node===first?0:node===bold.firstChild?60:120;
    const width=node===last?80:60;return [new DOMRect(x,100,width,20)];
  }});
  try{
    const selected=document.createRange();selected.setStart(bold.firstChild!,0);selected.setEnd(last,last.length);
    const boxes=selectedLineBoxes(root,selected,new DOMRect(0,0,200,300));
    expect(boxes).toHaveLength(1);
    expect(dir==="rtl"?boxes[0].left+boxes[0].width:boxes[0].left).toBe(dir==="rtl"?140:60);
  }finally{if(original)Object.defineProperty(Range.prototype,"getClientRects",original);root.remove();}
});

it("retains guide extension for fully selected and wrapped continuation lines",()=>{
 const first={left:80,right:140,top:100},prefix=[{left:140,right:200,top:100}];
 expect(beginsAtVisualLineStart(first,[],true)).toBe(true);
 expect(beginsAtVisualLineStart(first,prefix,true)).toBe(false);
 expect(beginsAtVisualLineStart({...first,top:120},prefix,true)).toBe(true);
 expect(beginsAtVisualLineStart({left:60,right:120,top:100},[{left:0,right:60,top:100}],false)).toBe(false);
 expect(beginsAtVisualLineStart({left:60,right:120,top:120},[{left:0,right:60,top:100}],false)).toBe(true);
});
