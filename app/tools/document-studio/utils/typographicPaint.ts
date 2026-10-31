import type {TypographicPreferences} from './typographicPreferences';
export interface TypographicPaintJob {node:Text;from:number;to:number;style:string;kind:'first'|'subsequent'|'latin'}
/** Shared DOM measurement in editor and PDF, after the authored fonts load.
 * Whole Arabic runs retain shaping; only whitespace ranges get split further. */
export function collectTypographicPaint(root:HTMLElement,prefs:TypographicPreferences,pdf=false):TypographicPaintJob[]{
 const jobs:TypographicPaintJob[]=[],canvas=document.createElement('canvas').getContext('2d');if(!canvas)return jobs;
 for(const block of root.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6')){
  if(block.closest('[data-pdf-frame-source]'))continue;
  const rtl=getComputedStyle(block).direction==='rtl';
  const nodes:{node:Text;offset:number}[]=[],walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let text='';
  for(let n=walker.nextNode();n;n=walker.nextNode()){nodes.push({node:n as Text,offset:text.length});text+=n.textContent??'';}
  const latin=new Array<boolean>(text.length).fill(false);
  for(let i=0;i<text.length;i++)if(/\p{Script=Latin}/u.test(text[i])){latin[i]=true;for(let j=i+1;j<text.length&&/[\p{Script=Latin}\p{N}\s.,:;!?'"()/_+%=@#&-]/u.test(text[j])&&!/\p{Script_Extensions=Arabic}/u.test(text[j]);j++)latin[j]=true;}
  const ranges:{from:number;to:number;kind:"first"|"subsequent";delta:number}[]=[];
  if(prefs.firstSpaceWidth>0)for(let start=0;start<text.length;){if(latin[start]){start++;continue;}let end=start+1;while(end<text.length&&!latin[end])end++;const part=text.slice(start,end),first=part.search(/\p{Script_Extensions=Arabic}/u);let last=part.length-1;while(last>=0&&!/\p{Script_Extensions=Arabic}/u.test(part[last]))last--;if(first>=0&&/ /.test(part.slice(first,last+1)))ranges.push({from:start+first,to:start+last+1,kind:"first",delta:prefs.firstSpaceWidth/100});start=end;}
  if(prefs.subsequentSpaceWidth!==100)for(const match of text.matchAll(/ {2,}/g)){
   const from=match.index!,to=from+match[0].length;let left=from-1,right=to;
   while(left>=0&&/[\p{M}\p{P}]/u.test(text[left]))left--;while(right<text.length&&/[\p{M}\p{P}]/u.test(text[right]))right++;
   if(left>=0&&/\p{Script_Extensions=Arabic}/u.test(text[left])&&(right===text.length||/\p{Script_Extensions=Arabic}/u.test(text[right])))ranges.push({from:from+1,to,kind:"subsequent",delta:prefs.subsequentSpaceWidth/100-1});
  }
  for(const {node,offset} of nodes){
   const owner=node.parentElement!,style=getComputedStyle(owner);canvas.font=style.font;const advance=canvas.measureText(' ').width;
   const tracking=Number(owner.closest('[data-tracking]')?.getAttribute('data-tracking'))||0,base=tracking/100*parseFloat(style.fontSize);
   if(pdf&&rtl&&prefs.reduceLatinFontsize>0)for(let i=0;i<node.length;){
    if(!latin[offset+i]&&!/[0-9]/.test(node.data[i])){i++;continue;}const from=i;while(i<node.length&&(latin[offset+i]||/[0-9]/.test(node.data[i])))i++;
    jobs.push({node,from,to:i,kind:'latin',style:`font-size:${parseFloat(style.fontSize)*(1-prefs.reduceLatinFontsize/100)}px`});
   }
   for(const range of ranges){const from=Math.max(0,range.from-offset),to=Math.min(node.length,range.to-offset);if(to>from)jobs.push({node,from,to,kind:range.kind,style:`word-spacing:${base+advance*range.delta}px`});}
  }
 }
 return jobs;
}
