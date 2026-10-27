"use client";
import {useEffect,useRef,useState} from 'react';
import type {Editor} from '@tiptap/react';
import {createPortal} from 'react-dom';
import {studioOverlayRoot} from '../utils/inpageToolbar';
import {listEditorFonts} from '../utils/fontRegistry';
import {resolveActiveToolbarFormatting} from '../utils/activeToolbarFormatting';
import {applyFontFamily,applyFontSize} from '../utils/documentCommands';
import {resolveFontSizePt,type DocumentStudioSettings} from '../utils/documentSettings';
/** A dialog entry to the same character commands used by the ribbon. */
export function StudioCharacterDialog({editor,settings,onClose}:{editor:Editor;settings:DocumentStudioSettings;onClose:()=>void}){
 const active=resolveActiveToolbarFormatting(editor,settings),[family,setFamily]=useState(active.fontFamily),[size,setSize]=useState(String(active.fontSizePt??settings.typography.bodyFontSizePt));
 const form=useRef<HTMLFormElement>(null);const close=()=>{onClose();editor.view.focus();};
 useEffect(()=>{form.current?.querySelector('select')?.focus();},[]);
 return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-4" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const items=[...form.current!.querySelectorAll<HTMLElement>('select,input,button')],first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}}>
  <form ref={form} role="dialog" aria-modal="true" aria-label="Character" dir="ltr" className="w-full max-w-sm border border-gray-500 bg-white p-4 text-sm text-black shadow-lg" onSubmit={event=>{event.preventDefault();const pt=resolveFontSizePt(size);if(pt===null)return;applyFontFamily(editor,family);applyFontSize(editor,String(pt));close();}}>
   <h2 className="mb-3 font-semibold">Character</h2>
   <label className="mb-3 block">Font<select className="mt-1 block w-full border px-2 py-1" value={family} onChange={event=>setFamily(event.target.value)}>{!listEditorFonts().some(font=>font.editorFamily===family)?<option value={family}>{family}</option>:null}{listEditorFonts().map(font=><option key={font.id} value={font.editorFamily}>{font.label}</option>)}</select></label>
   <label className="block">Size (pt)<input className="mt-1 block w-full border px-2 py-1" type="number" min="6" max="96" step=".5" value={size} onChange={event=>setSize(event.target.value)}/></label>
   <div className="mt-4 flex justify-end gap-2"><button type="button" className="border px-3 py-1" onClick={close}>Cancel</button><button type="submit" className="border px-3 py-1">Apply</button></div>
  </form>
 </div>,studioOverlayRoot());
}
