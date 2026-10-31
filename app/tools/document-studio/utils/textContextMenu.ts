import type {DocumentZoom} from './documentView';
export const TEXT_CONTEXT_ITEMS = [
 {id:'zoom',label:'Zoom',submenu:true},{id:'sep1',separator:true},
 {id:'import',label:'Import…'},{id:'sep2',separator:true},
 {id:'selectAll',label:'Select All'},{id:'cut',label:'Cut'},{id:'copy',label:'Copy'},
 {id:'clear',label:'Clear'},{id:'paste',label:'Paste'},{id:'sep3',separator:true},
 {id:'character',label:'Character…'},{id:'paragraph',label:'Paragraph…'},{id:'sep4',separator:true},
 {id:'textToTable',label:'Text To Table…'},
] as const;
/** Keep the reference order while hiding actions without an actual range. */
export function textContextItems(hasSelection:boolean) {
 return TEXT_CONTEXT_ITEMS.filter(item=>hasSelection||!['cut','copy','clear'].includes(item.id)).map(item=>item.id==='textToTable'?{...item,label:hasSelection?'Text To Table…':'Table…'}:item);
}
export const CONTEXT_ZOOMS:ReadonlyArray<{label:string;value:DocumentZoom}>=[
 {label:'50%',value:50},{label:'75%',value:75},{label:'100%',value:100},{label:'200%',value:200},{label:'300%',value:300},{label:'Fit width',value:'fit-width'},{label:'Fit page',value:'fit-page'},
];
export function textContextDisabled(id:string,hasSelection:boolean):boolean {
 return id==='textToTable'||(!hasSelection&&['cut','copy','clear'].includes(id));
}
export function contextMenuPosition(x:number,y:number,width:number,height:number,viewportWidth:number,viewportHeight:number){
 return {left:Math.max(4,Math.min(x,viewportWidth-width-4)),top:Math.max(4,Math.min(y,viewportHeight-height-4))};
}
