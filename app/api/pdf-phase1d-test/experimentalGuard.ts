import type { Page } from "puppeteer-core";
import {guardPdfUrduFonts} from "../../tools/document-studio/utils/pdfUrduFontGuard";

/** Phase 1D laboratory-only. Never import from production routes. */
export async function experimentalScriptAwareGuard(page: Page) {
  const diagnostic: Array<Record<string,unknown>>=[];
  // Only traverse explicitly marked Digital Khatt runs. No broad punctuation exception.
  const segmentation=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll<HTMLElement>('[data-pdf-font="Digital Khatt Indo-Pak"][data-pdf-urdu="true"]')];
    const records:Array<{node:number,part:number,text:string,kind:string,path:string}>=[];
    for(let n=0;n<nodes.length;n++){
      const el=nodes[n];const originalText=el.textContent||"";const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      const all:Text[]=[];while(walker.nextNode())all.push(walker.currentNode as Text);
      let count=0;
      for(const node of all){
        const content=node.nodeValue||"";
        if(!content)continue;
        const fragment=document.createDocumentFragment();
        let match:RegExpExecArray|null;
        const regex=/\./g;let cursor=0;
        while((match=regex.exec(content))){
          if(match.index>cursor){const part=document.createElement("span");part.dataset.phase1dPart=String(count++);part.dataset.phase1dKind="protected";part.textContent=content.slice(cursor,match.index);fragment.append(part)}
          const prev=content.slice(0,match.index).match(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])$/u);
          const next=content.slice(match.index+1,match.index+2);
          const verified=Boolean(prev)&&(!next||/\s/u.test(next));
          const p=document.createElement("span");p.dataset.phase1dPart=String(count++);
          p.dataset.phase1dKind=verified?"verified-period":"unverified-period";
          p.textContent=".";p.style.fontFamily='"Liberation Serif"';fragment.append(p);
          cursor=match.index+1;
        }
        if(cursor<content.length){const part=document.createElement("span");part.dataset.phase1dPart=String(count++);part.dataset.phase1dKind="protected";part.textContent=content.slice(cursor);fragment.append(part)}
        node.replaceWith(fragment);
      }
      if(el.textContent!==originalText)throw Error("Phase1D Unicode preservation failed; export blocked");
      const parts=el.querySelectorAll<HTMLElement>("[data-phase1d-part]");
      parts.forEach((p,i)=>records.push({node:n,part:i,text:p.textContent||"",kind:p.dataset.phase1dKind||"",path:'[data-pdf-font="Digital Khatt Indo-Pak"][data-pdf-urdu="true"]'}));
    }
    return {count:nodes.length,records};
  });
  const session=await page.createCDPSession();
  try{
    await session.send("DOM.enable");await session.send("CSS.enable");
    const root=(await session.send("DOM.getDocument")).root;
    for(const r of segmentation.records){
      const selector='[data-pdf-font="Digital Khatt Indo-Pak"][data-pdf-urdu="true"] [data-phase1d-part="'+r.part+'"]';
      const {nodeId}=await session.send("DOM.querySelector",{nodeId:root.nodeId,selector});
      if(!nodeId)throw Error("Phase1D font validation: missing node; export blocked");
      const {fonts}=await session.send("CSS.getPlatformFontsForNode",{nodeId});
      const painted=fonts.filter(f=>f.glyphCount>0);
      const isDigital=(name:string)=>/digitalkhatt/i.test(name.replace(/[^a-z0-9]/gi,""));
      const protectedScript=[...r.text].some(char=>{const n=char.codePointAt(0)!;return n>=0x600&&n<=0x6ff||n>=0x750&&n<=0x77f||n>=0x8a0&&n<=0x8ff||n>=0xfb50&&n<=0xfdff||n>=0xfe70&&n<=0xfeff||n===0x200c||n===0x200d||n===0x61c;});
      const accepted=r.kind==="verified-period"&&r.text==="."
        ?painted.length===1&&painted[0].familyName==="Liberation Serif"
        :r.kind==="protected"&&(!painted.length&&!r.text.trim()?true:painted.length>0&&painted.every(f=>isDigital(f.familyName)));
      diagnostic.push({node:r.node,part:r.part,kind:r.kind,text:r.text.slice(0,40),codepoints:[...new Set([...r.text].map(c=>"U+"+c.codePointAt(0)!.toString(16).toUpperCase().padStart(4,"0")))],expected:"Digital Khatt Indo-Pak",painted,protectedScript,accepted});
      if(!accepted)throw Error("Phase1D font validation: "+r.kind+" unexpected fallback at "+selector+"; export blocked");
    }
  }finally{await session.detach()}
  // The production guard is preserved for all other marked runs. Digital
  // spans are already validated with stricter per-part CDP inspection above.
  await page.$$eval('[data-pdf-font="Digital Khatt Indo-Pak"][data-pdf-urdu="true"]',els=>els.forEach(el=>el.setAttribute("data-phase1d-verified","true")));
  await page.$$eval('[data-phase1d-verified="true"]',els=>els.forEach(el=>el.removeAttribute("data-pdf-urdu")));
  try{
    const other=await guardPdfUrduFonts(page);
    return {fallbackRuns:other.fallbackRuns,actualFamilies:[...new Set([...other.actualFamilies,"DigitalKhatt IndoPak"])],diagnostic};
  }finally{
    await page.$$eval('[data-phase1d-verified="true"]',els=>els.forEach(el=>{el.setAttribute("data-pdf-urdu","true");el.removeAttribute("data-phase1d-verified")}));
  }
}
