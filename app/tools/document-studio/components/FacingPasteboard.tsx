"use client";
import {StudioScreenOverlay} from './StudioScreenOverlay';
import {facingSlot,facingRow,facingPadding,type PageProjection} from '../utils/facingPages';
/** Unscaled border ink and readable folios around scaled, physical page slots. */
export function FacingPasteboard({geometry:g,zoom,firstPage}:{geometry:PageProjection;zoom:number;firstPage:number}){
 return <StudioScreenOverlay zoom={zoom} zIndex={4}>{({x,y})=><>
  {Array.from({length:facingRow(g.count-1)+1},(_,row)=>{const pad=facingPadding(g.width),top=row*(g.height+2*pad+g.gap),width=(row===0?g.width:2*g.width)+2*pad;return <div key={`row-${row}`} data-studio-facing-row={row+1} style={{position:'absolute',left:x(0),top:y(top),width:x(width)-x(0),height:y(top+g.height+2*pad)-y(top),borderLeft:'1px solid #000',borderRight:'1px solid #000',borderTop:'1px solid #c0c0c0',borderBottom:'1px solid #c0c0c0'}}/>;})}
  {Array.from({length:g.count},(_,page)=>{const p=facingSlot(page,g);return <div key={page} data-studio-facing-page-number={page+1} style={{position:'absolute',left:x(p.x),top:y(p.y+g.height)+12,width:x(p.x+g.width)-x(p.x),textAlign:'center',fontFamily:'Tahoma, Arial, sans-serif',fontSize:12,color:'#000'}}>{firstPage+page}</div>;})}
 </>}</StudioScreenOverlay>;
}
