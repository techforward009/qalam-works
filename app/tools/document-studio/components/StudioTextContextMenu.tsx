"use client";
import {useEffect,useImperativeHandle,useLayoutEffect,useRef,useState,type Ref} from 'react';
import {createPortal} from 'react-dom';
import {studioOverlayRoot} from '../utils/inpageToolbar';
import type {Editor} from '@tiptap/react';
import type {SelectionBookmark} from '@tiptap/pm/state';
import type {DocumentZoom} from '../utils/documentView';
import {plainTextToDocNodeWithDir} from '../utils/plainTextToDocNode';
import {textContextItems,CONTEXT_ZOOMS,textContextDisabled,contextMenuPosition} from '../utils/textContextMenu';

const itemStyle:React.CSSProperties={height:20,minHeight:20,width:'100%',padding:'0 20px',textAlign:'left',fontFamily:'Tahoma, MS Sans Serif, sans-serif',fontSize:11,color:'#000',whiteSpace:'nowrap'};
function enabledItems(menu:HTMLElement|null){return menu?[...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')]:[];}
export type StudioTextActions = { run: (id: "cut" | "copy" | "paste" | "clear") => void };
export function StudioTextContextMenu({editor,onZoom,onImport,onCharacter,onParagraph,actionRef}:{editor:Editor|null;onZoom:(zoom:DocumentZoom)=>void;onImport:()=>void;onCharacter:()=>void;onParagraph:()=>void;actionRef?:Ref<StudioTextActions>}){
 const [menu,setMenu]=useState<{x:number;y:number;hasSelection:boolean}|null>(null),[zoom,setZoom]=useState(false),[message,setMessage]=useState<string|null>(null);
 const root=useRef<HTMLDivElement>(null),submenu=useRef<HTMLDivElement>(null),zoomTrigger=useRef<HTMLButtonElement>(null),bookmark=useRef<SelectionBookmark|null>(null);
 const [position,setPosition]=useState({left:0,top:0}),[subPosition,setSubPosition]=useState({left:0,top:0});
 const restore=()=>{if(!editor||editor.isDestroyed)return;try{if(bookmark.current)editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));editor.view.focus();}catch{/* document replaced while the menu was open */}};
 const close=(focus=false)=>{setMenu(null);setZoom(false);if(focus)restore();};
 useEffect(()=>{
  if(!editor)return;
  const open=(event:MouseEvent)=>{
   const target=event.target instanceof Element?event.target:null;
   if(!target||!editor.view.dom.contains(target)||target.closest('img,[data-resize-container],[data-studio-frame]')){close();return;}
   event.preventDefault();
   if(editor.state.selection.empty){const hit=editor.view.posAtCoords({left:event.clientX,top:event.clientY});if(hit)editor.commands.setTextSelection(hit.pos);}
   bookmark.current=editor.state.selection.getBookmark();
   setMenu({x:event.clientX,y:event.clientY,hasSelection:!editor.state.selection.empty});setZoom(false);
  };
  document.addEventListener('contextmenu',open);return()=>document.removeEventListener('contextmenu',open);
 },[editor]);
 useEffect(()=>{
  if(!menu)return;
  const outside=(event:Event)=>{if(event.target instanceof Node&&(root.current?.contains(event.target)||submenu.current?.contains(event.target)))return;close();};
  const resize=()=>close();document.addEventListener('pointerdown',outside,true);document.addEventListener('scroll',outside,true);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('scroll',outside,true);window.removeEventListener('resize',resize);};
 },[menu]);
 useLayoutEffect(()=>{
  if(!menu||!root.current)return;setPosition(contextMenuPosition(menu.x,menu.y,root.current.offsetWidth,root.current.offsetHeight,window.innerWidth,window.innerHeight));enabledItems(root.current)[0]?.focus({preventScroll:true});
 },[menu]);
 useLayoutEffect(()=>{
  if(!zoom||!zoomTrigger.current||!submenu.current)return;
  const rect=zoomTrigger.current.getBoundingClientRect(),width=submenu.current.offsetWidth;
  const x=rect.right+width+4<=window.innerWidth?rect.right:rect.left-width;
  setSubPosition(contextMenuPosition(x,rect.top,width,submenu.current.offsetHeight,window.innerWidth,window.innerHeight));
 },[zoom,position]);
 const key=(event:React.KeyboardEvent,sub=false)=>{
  const items=enabledItems(sub?submenu.current:root.current),index=items.indexOf(document.activeElement as HTMLButtonElement);
  if(['ArrowDown','ArrowUp','Home','End','Escape','ArrowLeft','ArrowRight','Tab'].includes(event.key))event.preventDefault();
  if(event.key==='ArrowDown')items[(index+1)%items.length]?.focus({preventScroll:true});
  else if(event.key==='ArrowUp')items[index<=0?items.length-1:index-1]?.focus({preventScroll:true});
  else if(event.key==='Home')items[0]?.focus({preventScroll:true});else if(event.key==='End')items.at(-1)?.focus({preventScroll:true});
  else if(event.key==='Escape'||event.key==='ArrowLeft'){if(sub||zoom){setZoom(false);zoomTrigger.current?.focus({preventScroll:true});}else close(true);}
  else if(event.key==='ArrowRight'&&!sub&&document.activeElement===zoomTrigger.current){setZoom(true);requestAnimationFrame(()=>enabledItems(submenu.current)[0]?.focus());}
  else if(event.key==='Tab')close(true);
 };
 const action=async(id:string)=>{
  if(!editor)return;close(true);
  if(id==='import'){onImport();return;}if(id==='character'){onCharacter();return;}if(id==='paragraph'){onParagraph();return;}
  if(id==='selectAll'){editor.commands.selectAll();return;}if(id==='clear'){editor.commands.deleteSelection();return;}
  const doc=editor.state.doc,selection=editor.state.selection,selected=doc.textBetween(selection.from,selection.to,'\n');
  try{
   if(id==='paste'){
    if(!navigator.clipboard?.readText)throw new Error('clipboard unavailable');
    const text=await navigator.clipboard.readText();if(editor.isDestroyed)return;
    if(editor.state.doc!==doc){setMessage('The document changed. Select the insertion point and try again.');return;}
    restore();if(text)editor.commands.insertContent(plainTextToDocNodeWithDir(text,selection.$from.parent.attrs.dir==='ltr'?'ltr':'rtl').content??[]);
   }else{
    if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(selected);
    if(id==='cut'&&!editor.isDestroyed){if(editor.state.doc!==doc){setMessage('The document changed. Nothing was cut.');return;}restore();editor.commands.deleteSelection();}
   }
  }catch{setMessage(id==='paste'?'Clipboard access was denied or is unavailable. Close this message and use Ctrl+V to paste.':`Clipboard access was denied or is unavailable. Nothing was ${id==='cut'?'cut':'copied'}. Close this message and use ${id==='cut'?'Ctrl+X':'Ctrl+C'}.`);}
 };
 // The top menu uses these same clipboard actions and permission feedback,
 // taking the current selection rather than an old context-menu bookmark.
 useImperativeHandle(actionRef,()=>({run(id){bookmark.current=editor?.state.selection.getBookmark()??null;void action(id);}}));
 return <>
  {menu?createPortal(<>
   <div ref={root} role="menu" aria-label="Text context menu" data-studio-text-menu dir="ltr" className="fixed z-[110] border border-[#808080] bg-[#f0f0f0] py-1 shadow-md" style={{...position,width:200,maxWidth:'calc(100vw - 8px)',maxHeight:'calc(100vh - 8px)',overflowY:'auto'}} onKeyDown={event=>key(event)} onPointerDown={event=>event.preventDefault()}>
    {textContextItems(menu.hasSelection).map(item=>'separator'in item?<div key={item.id} role="separator" className="my-[3px] border-t border-[#808080]"/>:item.id==='zoom'?<button ref={zoomTrigger} key={item.id} type="button" role="menuitem" aria-haspopup="menu" aria-expanded={zoom} style={itemStyle} className="flex items-center justify-between hover:bg-[#d6dff2] focus:bg-[#d6dff2]" onPointerEnter={()=>setZoom(true)} onClick={()=>{setZoom(true);requestAnimationFrame(()=>enabledItems(submenu.current)[0]?.focus());}}>Zoom<span aria-hidden>▸</span></button>:<button key={item.id} type="button" role="menuitem" disabled={textContextDisabled(item.id,menu.hasSelection)} aria-disabled={textContextDisabled(item.id,menu.hasSelection)||undefined} style={{...itemStyle,color:textContextDisabled(item.id,menu.hasSelection)?'#808080':'#000'}} className="block enabled:hover:bg-[#d6dff2] enabled:focus:bg-[#d6dff2]" onPointerEnter={()=>setZoom(false)} onClick={()=>void action(item.id)}>{item.label}</button>)}
   </div>
   {zoom?<div ref={submenu} role="menu" aria-label="Zoom" data-studio-context-zoom dir="ltr" className="fixed z-[111] border border-[#808080] bg-[#f0f0f0] py-1 shadow-md" style={{...subPosition,width:150,maxWidth:'calc(100vw - 8px)',maxHeight:'calc(100vh - 8px)',overflowY:'auto'}} onKeyDown={event=>key(event,true)} onPointerDown={event=>event.preventDefault()}>
    {CONTEXT_ZOOMS.map(item=><button key={item.label} type="button" role="menuitem" style={itemStyle} className="block hover:bg-[#d6dff2] focus:bg-[#d6dff2]" onClick={()=>{close(true);onZoom(item.value);}}>{item.label}</button>)}
   </div>:null}
  </>,studioOverlayRoot()):null}
  {message?createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[150] grid place-items-center bg-black/30 p-4" onKeyDown={event=>{if(event.key==='Escape'){setMessage(null);restore();}}}><div role="alertdialog" aria-modal="true" aria-label="Clipboard access" dir="ltr" className="max-w-sm border bg-white p-4 text-sm text-black"><p>{message}</p><button autoFocus className="mt-3 border px-3 py-1" onClick={()=>{setMessage(null);restore();}}>Close</button></div></div>,studioOverlayRoot()):null}
 </>;
}
