"use client";
import {useLayoutEffect,useState,type CSSProperties,type ReactNode} from 'react';
import {useMovableStudioDialog} from './useMovableStudioDialog';

// Geometry measured from the owner's original 388x179 / 349x283 PNGs.
export const classicFont='11px Arial, sans-serif';
export const at=(left:number,top:number,width?:number,height?:number):CSSProperties=>({position:'absolute',left,top,...(width===undefined?{}:{width}),...(height===undefined?{}:{height}),boxSizing:'border-box'});
export const classicField:CSSProperties={font:classicFont,lineHeight:'14px',color:'#000',background:'#fff',border:'1px solid #a6a6a6',borderBottomColor:'#fff',borderRightColor:'#fff',boxShadow:'inset 1px 1px #6a6a6a,inset -1px -1px #e3e3e3',padding:'1px 3px',margin:0,minWidth:0,outline:0,borderRadius:0};
export const classicButton:CSSProperties={font:classicFont,lineHeight:'15px',color:'#000',background:'#f5f5f5',border:'1px solid #9e9e9e',borderBottomColor:'#6a6a6a',borderRightColor:'#6a6a6a',boxShadow:'inset 1px 1px #fff,inset -1px -1px #a6a6a6',padding:0,margin:0,borderRadius:0};
export function useInPage2009Dialog<T extends HTMLElement>(width:number,height:number,inset=16){
 const drag=useMovableStudioDialog<T>(),[scale,setScale]=useState(1),[snap,setSnap]=useState({x:0,y:0});
 useLayoutEffect(()=>{const resize=()=>setScale(Math.min(1,(window.innerWidth-inset)/width,(window.innerHeight-inset)/height));resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[width,height,inset]);
 useLayoutEffect(()=>{const align=()=>{const node=drag.dialogRef.current,r=node?.getBoundingClientRect();if(!node||!r)return;const matrix=getComputedStyle(node).transform.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number);const x=r.left-(matrix?.[4]??0)+drag.offset.x,y=r.top-(matrix?.[5]??0)+drag.offset.y;const next={x:Math.round(x)-x,y:Math.round(y)-y};setSnap(old=>old.x===next.x&&old.y===next.y?old:next);};align();window.addEventListener('resize',align);return()=>window.removeEventListener('resize',align);},[scale,drag.offset.x,drag.offset.y]);
 return {...drag,style:{position:'relative',width,minWidth:width,height,boxSizing:'border-box',padding:0,border:0,borderRadius:'5px 5px 0 0',background:'#f5f5f5',color:'#000',font:classicFont,lineHeight:'13px',justifySelf:'center',transform:`translate(${drag.offset.x+snap.x}px,${drag.offset.y+snap.y}px) scale(${scale})`} as CSSProperties};
}
export function ClassicTitle({title,onClose,handleProps,closeTabIndex=-1}:{title:string;onClose:()=>void;closeTabIndex?:number;handleProps:ReturnType<typeof useMovableStudioDialog>['handleProps']}){
 return <><style>{`
 [data-inpage2009-dialog] input[type=number]{appearance:textfield;-moz-appearance:textfield}
 [data-inpage2009-dialog] input::-webkit-inner-spin-button,[data-inpage2009-dialog] input::-webkit-outer-spin-button{appearance:none;margin:0}
 [data-inpage2009-dialog] select:focus{background:#3096fa!important;color:white!important}
 [data-inpage2009-dialog] select option{color:black;background:white}
 [data-inpage2009-dialog] input[type=checkbox],[data-inpage2009-dialog] input[type=radio]{appearance:none;box-sizing:border-box;margin:0;flex-shrink:0;border:1px solid #a6a6a6;background:white;box-shadow:inset 1px 1px #6a6a6a;vertical-align:middle}
 [data-inpage2009-dialog] input[type=checkbox]{width:13px;height:13px}
 [data-inpage2009-dialog] input[type=radio]{width:12px;height:12px;border-radius:50%}
 [data-inpage2009-dialog] input[type=radio]:checked{background:radial-gradient(circle,#000 0 2px,#fff 2.5px)}
 [data-inpage2009-dialog] input[type=checkbox]:checked{background:white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 6l3 3 5-6' fill='none' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E") center/11px 11px no-repeat}
 [data-inpage2009-dialog] input[type=checkbox]:indeterminate{background:linear-gradient(#000,#000) center/7px 2px no-repeat white}
 [data-inpage2009-dialog] input:disabled{background:#eee;border-color:#bbb;box-shadow:inset 1px 1px #ccc}
 `}</style>
 <div aria-hidden style={{...at(0,0),right:0,bottom:0,pointerEvents:'none',border:'1px solid #7a7a79',borderRadius:'5px 5px 0 0',boxShadow:'inset 3px 0 #f6f5f4,inset -3px -2px #f6f5f4'}}/>
 <div {...handleProps} style={{...handleProps.style,...at(1,1),right:1,height:28,background:'linear-gradient(#d9d6d3,#d8d5d2)',borderRadius:'4px 4px 0 0'}}>
  <svg aria-hidden width="13" height="21" viewBox="0 0 13 21" style={at(8,3)}><path d="M4 2h6l-1 9c-1 4-4 4-5 0z" fill="#eee" stroke="#888"/><path d="M4 7h5l-1 4H5z" fill="#ad1820"/><path d="M6 14v4m-3 1h7" stroke="#777"/></svg>
  <span style={{position:'absolute',left:24,right:46,top:7,textAlign:'center',font:'bold 12px Arial,sans-serif',lineHeight:'16px',color:'#2e3436',pointerEvents:'none'}}>{title}</span>
  <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" style={{position:'absolute',right:31,top:8,pointerEvents:'none'}}><path d="M3 7l3-3 3 3" stroke="#2e3436" strokeWidth="2" fill="none"/></svg>
 </div>
 <button type="button" aria-label="Close" tabIndex={closeTabIndex} onClick={onClose} style={{position:'absolute',right:6,top:6,width:16,height:18,border:0,background:'transparent',padding:0}}><svg aria-hidden width="12" height="12" viewBox="0 0 12 12"><path d="m3 3 6 6m0-6-6 6" stroke="#2e3436" strokeWidth="2"/></svg></button>
 </>;
}
export function ClassicGroup({name,box,children}:{name:string;box:number[];children?:ReactNode}){
 return <fieldset role="group" data-classic-group={name} style={{...at(...box as [number,number,number,number]),padding:0,margin:0,border:0,minWidth:0}}>
  <div aria-hidden style={{position:'absolute',inset:0,border:'1px solid #a6a6a6',borderRightColor:'#fff',borderBottomColor:'#fff',boxShadow:'inset -1px -1px #a6a6a6,inset 1px 1px #fff',pointerEvents:'none'}}/>
  <legend style={{...at(6,-7),padding:'0 2px',margin:0,background:'#f5f5f5',font:classicFont,lineHeight:'13px',whiteSpace:'nowrap'}}>{name}</legend>{children}
 </fieldset>;
}
export function ClassicSelect({box,children,...props}:React.SelectHTMLAttributes<HTMLSelectElement>&{box:number[];children:ReactNode}){
 return <><select {...props} style={{...classicField,...at(...box as [number,number,number,number]),appearance:'none',paddingRight:19}}>{children}</select><span aria-hidden style={{...at(box[0]+box[2]-18,box[1]+2,16,box[3]-4),background:'#f5f5f5',borderLeft:'1px solid #a6a6a6',pointerEvents:'none'}}><svg width="14" height="14" viewBox="0 0 14 14"><path d="m3 5 4 4 4-4" stroke="black" strokeWidth="1.5" fill="none"/></svg></span></>;
}
export function ClassicSpinner({label,box,value,onChange,min,max,step=1,unit='',onBlur}:{label:string;box:number[];value:string;onChange:(value:string)=>void;min:number;max:number;step?:number;unit?:string;onBlur?:()=>void}){
 const current=parseFloat(value),increment=(delta:number)=>{const n=Math.max(min,Math.min(max,Number(((Number.isFinite(current)?current:min)+delta*step).toFixed(2))));onChange(`${n}${unit}`);};
 return <><input id={`inpage-spinner-${label.toLowerCase()}`} aria-label={label} type={unit?'text':'number'} role="spinbutton" aria-valuemin={min} aria-valuemax={max} aria-valuenow={Number.isFinite(current)?current:undefined} min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)} onBlur={onBlur} onKeyDown={e=>{if(unit&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();increment(e.key==='ArrowUp'?1:-1);}}} style={{...classicField,...at(...box as [number,number,number,number]),paddingRight:16}}/>
 {[1,-1].map((delta,i)=><button key={delta} type="button" tabIndex={-1} aria-label={`${delta===1?'Increase':'Decrease'} ${label}`} onMouseDown={e=>e.preventDefault()} onClick={()=>increment(delta)} style={{...at(box[0]+box[2]-15,box[1]+2+i*8,12,8),border:'1px solid #b0b0b0',borderRadius:2,background:'#fdfdfd',padding:0,lineHeight:0}}><svg width="9" height="4" viewBox="0 0 9 4"><path d={delta===1?'m1 3 3-2 3 2':'m1 1 3 2 3-2'} stroke="#888" fill="none"/></svg></button>)}
 </>;
}
