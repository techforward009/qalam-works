import { StudioScreenOverlay } from "./StudioScreenOverlay";
import { mmToPx, type PhysicalMarginsMm } from "../utils/pageLayout";

/** One-screen-pixel rules, independent of the sheet magnification. */
export function MarginGuides({pageCount,pageWidthPx,pageHeightPx,gapPx,margins,zoom=1}:{pageCount:number;pageWidthPx:number;pageHeightPx:number;gapPx:number;margins:PhysicalMarginsMm;zoom?:number}){
 const left=mmToPx(margins.leftMm),right=pageWidthPx-mmToPx(margins.rightMm),top=mmToPx(margins.topMm),bottom=pageHeightPx-mmToPx(margins.bottomMm);
 return <StudioScreenOverlay zoom={zoom}>{({x,y,scale})=><div className="studio-no-print" data-studio-margin-guides="true" aria-hidden>
  {Array.from({length:Math.max(1,pageCount)},(_,index)=>{
   const origin=index*(pageHeightPx+gapPx),l=x(left),r=x(right),t=y(origin+top),b=y(origin+bottom);
   const horizontal=(edge:string,at:number,a:number,z:number,grey=false)=><div key={edge} {...{[grey?'data-studio-margin-edge':'data-studio-margin-line']:edge}} className="absolute" style={{left:a-x(0),top:at-y(origin),width:z-a,height:1,background:grey?'#c0c0c0':'#000'}}/>;
   const vertical=(edge:string,at:number,a:number,z:number,grey=false)=><div key={edge} {...{[grey?'data-studio-margin-edge':'data-studio-margin-line']:edge}} className="absolute" style={{left:at-x(0),top:a-y(origin),width:1,height:z-a,background:grey?'#c0c0c0':'#000'}}/>;
   return <div key={index} className="absolute" style={{left:x(0),top:y(origin),width:pageWidthPx*scale,height:pageHeightPx*scale}} data-studio-margin-guide={index+1} data-margin-top-px={String(Math.round(top))} data-margin-bottom-px={String(Math.round(pageHeightPx-bottom))} data-margin-left-px={String(Math.round(left))} data-margin-right-px={String(Math.round(pageWidthPx-right))} data-margin-cross="page">
    {horizontal('top',t,l,r)}{horizontal('bottom',b,l,r)}{vertical('left',l,t,b)}{vertical('right',r,t,b)}
    {horizontal('top-left',t,x(0),l,true)}{horizontal('top-right',t,r,x(pageWidthPx),true)}{horizontal('bottom-left',b,x(0),l,true)}{horizontal('bottom-right',b,r,x(pageWidthPx),true)}
    {vertical('left-top',l,y(origin),t,true)}{vertical('left-bottom',l,b,y(origin+pageHeightPx),true)}{vertical('right-top',r,y(origin),t,true)}{vertical('right-bottom',r,b,y(origin+pageHeightPx),true)}
   </div>;
  })}
 </div>}</StudioScreenOverlay>;
}
